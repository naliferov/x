#!/usr/bin/env node
// One-off: mirror the full history of a chat into projects/metapractise.txt, resumable.
// Reads the checkpoint from projects/metapractise.state.json (falls back to LAST_ID below),
// walks messages oldest->newest via iterMessages(reverse), appends in chunks, checkpoints
// after every chunk. Gentle pacing (waitTime between internal requests + jitter); gramjs
// auto-sleeps on FLOOD_WAIT below floodSleepThreshold. Text only — no media downloads.
//
//   node extract-history.js            # run until caught up
//   node extract-history.js --max 5000 # cap this run
import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(import.meta.dirname, '.env') })
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'

const CHAT = '-1001207021584' // Сообщество - Метапрактика Осознанности
const REPO = path.join(import.meta.dirname, '../..')
const OUT = path.join(REPO, 'projects/metapractise.txt')
const CHUNK = 200 // messages per append
const WAIT_TIME = 3 // seconds gramjs sleeps between internal getHistory requests

const maxArg = process.argv.indexOf('--max')
const maxThisRun = maxArg === -1 ? Infinity : Number(process.argv[maxArg + 1])

// The txt file IS the state. Resume point = the newest "#<id>" actually in the file
// (tail scan — survives a stale header after a hard kill), cross-checked with the
// header's "LAST EXTRACTED ID" line; the header is rewritten when a run ends.
const resumeId = () => {
  const size = fs.statSync(OUT).size
  const fd = fs.openSync(OUT, 'r')
  const tailLen = Math.min(size, 256 * 1024)
  const tail = Buffer.alloc(tailLen)
  fs.readSync(fd, tail, 0, tailLen, size - tailLen)
  fs.closeSync(fd)
  const tailIds = [...tail.toString('utf8').matchAll(/^#(\d+) {2}\d{4}-/gm)].map((match) =>
    Number(match[1]),
  )
  const header = fs
    .readFileSync(OUT, 'utf8')
    .slice(0, 2000)
    .match(/LAST EXTRACTED ID: (\d+)/)
  const last = Math.max(tailIds.at(-1) ?? 0, header ? Number(header[1]) : 0)
  if (!last) {
    throw new Error('could not find a resume id in metapractise.txt (no #id lines, no header)')
  }
  return last
}

const state = { lastId: resumeId(), extracted: 0 }
console.error(`resuming after id ${state.lastId}`)

const apiId = Number(process.env.TG_API_ID)
const apiHash = process.env.TG_API_HASH
const sessionStr = process.env.TG_SESSION
if (!apiId || !apiHash || !sessionStr) {
  console.error('missing TG_API_ID / TG_API_HASH / TG_SESSION in .env')
  process.exit(1)
}

const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
  connectionRetries: 5,
  floodSleepThreshold: 300, // auto-sleep on FLOOD_WAIT up to 5 min; longer aborts (state is safe)
})

const kyivTime = (date) => {
  // message.date is unix seconds; file format is "YYYY-MM-DD HH:MM" Kyiv local
  const formatted = new Date(date * 1000).toLocaleString('sv-SE', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  return formatted.replace(',', '')
}

const senderLabel = (msg) => {
  if (msg.className === 'MessageService') {
    return 'id:service'
  }
  const sender = msg.sender
  if (sender?.username) {
    return '@' + sender.username
  }
  const name = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ').trim()
  if (name) {
    return name
  }
  const raw = msg.fromId?.userId ?? msg.fromId?.channelId ?? msg.senderId
  return raw ? `id:${raw}` : 'id:unknown'
}

const formatMessage = (msg) => {
  const reply = msg.replyTo?.replyToMsgId ? ` ↳${msg.replyTo.replyToMsgId}` : ''
  const text = (msg.message ?? '').trim() || '[no text / service]'
  return `#${msg.id}  ${kyivTime(msg.date)}  ${senderLabel(msg)}${reply}\n${text}\n`
}

const flush = (buffer) => {
  if (!buffer.length) {
    return
  }
  fs.appendFileSync(OUT, '\n' + buffer.map(formatMessage).join('\n'))
  state.lastId = buffer[buffer.length - 1].id
  state.extracted += buffer.length
  buffer.length = 0
}

// Rewrite the header's resume pointer + date when a run ends (the appended #id lines are
// the real state; this just keeps the human-readable header honest).
const updateHeader = () => {
  const content = fs.readFileSync(OUT, 'utf8')
  fs.writeFileSync(
    OUT,
    content
      .replace(/LAST EXTRACTED ID: \d+/, `LAST EXTRACTED ID: ${state.lastId}`)
      .replace(
        /# extracted_at: [^\n]+/,
        `# extracted_at: ${new Date().toISOString().slice(0, 10)}`,
      ),
  )
}

const startedAt = Date.now()
await client.connect()
const entity = await client.getEntity(CHAT)
console.error(`connected; extracting "${entity.title}" from id > ${state.lastId}`)

let count = 0
const buffer = []
try {
  for await (const msg of client.iterMessages(entity, {
    reverse: true,
    minId: state.lastId,
    waitTime: WAIT_TIME,
  })) {
    buffer.push(msg)
    count++
    if (buffer.length >= CHUNK) {
      flush(buffer)
      // small extra jitter between chunks so the cadence isn't perfectly regular
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500))
    }
    if (count % 1000 === 0) {
      const minutes = ((Date.now() - startedAt) / 60000).toFixed(1)
      console.error(`${count} msgs this run · at id ${msg.id} · ${minutes} min`)
    }
    if (count >= maxThisRun) {
      console.error(`--max ${maxThisRun} reached, stopping (resume by rerunning)`)
      break
    }
  }
  flush(buffer)
  updateHeader()
  console.error(`DONE: ${count} msgs this run, last id ${state.lastId}`)
} catch (err) {
  flush(buffer) // keep everything already fetched; the appended #id lines carry the state
  updateHeader()
  console.error(`aborted after ${count} msgs at id ${state.lastId}: ${err.message}`)
  console.error('rerun to resume (resume point is read from the txt itself)')
  process.exitCode = 1
} finally {
  await client.disconnect()
}
