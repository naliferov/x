import http from 'node:http'
import { writeFile, unlink } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const x = {
  http,
  port: process.env.PORT || 3000,
  origin: 'http://localhost:5173',
  dataDir: fileURLToPath(new URL('./frontend/data', import.meta.url)),
  dataFormats: ['md', 'txt', 'json'],
}

x.json = (res, status, body) =>
  res
    .writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': x.origin,
    })
    .end(JSON.stringify(body))

x.body = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

x.read = async (req) => JSON.parse(await x.body(req))

// ?name=<name>&ext=<md|txt|json> addresses frontend/data/<name>.<ext>: docs from the editor, collage
// layouts, vlang sources. The name is confined to data/ so a crafted name can't escape the folder.
// Answers 400 itself and returns null when the name or ext is bad.
x.dataFile = (res, params) => {
  const name = params.get('name') ?? ''
  const ext = params.get('ext') ?? ''
  const file = resolve(x.dataDir, `${name}.${ext}`)
  if (!x.dataFormats.includes(ext)) {
    x.json(res, 400, { error: 'bad ext' })
    return null
  }
  if (!name || name.includes('/') || name.includes('\\') || !file.startsWith(x.dataDir + sep)) {
    x.json(res, 400, { error: 'bad name' })
    return null
  }
  return file
}

x.save = async (req, res, params) => {
  const file = x.dataFile(res, params)
  if (file) {
    await writeFile(file, await x.body(req))
    x.json(res, 200, { ok: true })
  }
}

x.delete = async (res, params) => {
  const file = x.dataFile(res, params)
  if (file) {
    await unlink(file)
    x.json(res, 200, { ok: true })
  }
}

x.handle = async (req, res) => {
  res.on('error', () => {})
  try {
    if (req.method !== 'POST') {
      x.json(res, 405, { error: 'post only' })
      return
    }
    // A POST with a text body needs no preflight, so any open site can send one here; CORS only hides
    // the reply from it. Refuse a foreign Origin before doing anything; curl sends none.
    if (req.headers.origin && req.headers.origin !== x.origin) {
      x.json(res, 403, { error: 'foreign origin' })
      return
    }
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/__save') {
      await x.save(req, res, url.searchParams)
      return
    }
    if (url.pathname === '/__delete') {
      await x.delete(res, url.searchParams)
      return
    }
    x.json(res, 200, await x.read(req))
  } catch (err) {
    x.json(res, err instanceof SyntaxError ? 400 : 500, { error: err.message })
  }
}

x.server = x.http
  .createServer(x.handle)
  .listen(x.port, 'localhost', () => console.log(`http://localhost:${x.port}`))

process.on('SIGINT', () => x.server.close(() => process.exit(0)))
