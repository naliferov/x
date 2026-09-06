<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LogPanel from './lib/LogPanel.vue'

const wsUrl = ref(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`)
const token = ref('') // room token — sent as the WS subprotocol; the server refuses a connection without one
const peerName = ref('')
const msgText = ref('')
const status = ref('idle')
const log = ref<InstanceType<typeof LogPanel>>()
const downloads = ref<{ name: string; url: string; size: number }[]>([])
// socket/peer callbacks can fire after unmount (teardown closes them → close events arrive
// when the panel ref is already gone) — log through this null-safe helper, never log.value!
const logLine = (text: string, dir = 'sys') => log.value?.push(text, dir)

let ws: WebSocket | null = null
let pc: RTCPeerConnection | null = null
let channel: RTCDataChannel | null = null
let pendingIce: RTCIceCandidateInit[] = []

const wsSend = (obj: unknown) => ws!.send(JSON.stringify(obj))
const signal = (to: string, data: unknown) => wsSend({ type: 'message', to, data })

// candidates can arrive while setRemoteDescription is still awaiting
const drainIce = async () => {
  for (const candidate of pendingIce.splice(0)) {
    await pc!.addIceCandidate(candidate)
  }
}

const connectWs = () => {
  ws?.close()
  ws = new WebSocket(wsUrl.value, token.value.trim() ? [token.value.trim()] : undefined)
  ws.onopen = () => {
    status.value = 'ws open'
    logLine('ws open')
  }
  ws.onclose = (event) => {
    status.value = 'ws closed'
    // 1006 on a cross-origin url usually means the SameSite=Lax session cookie
    // wasn't sent → 401 on the upgrade; run this on the target origin instead
    logLine(
      `ws closed (code ${event.code})${event.code === 1006 ? ' — rejected: missing/invalid token, or cross-origin cookie/auth' : ''}`,
    )
  }
  ws.onerror = () => logLine('ws error')
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.type === 'welcome') {
      logLine(`you are "${message.name}" · peers: ${message.clients.join(', ') || '(none yet)'}`)
    } else if (message.type === 'join') {
      logLine(`join: ${message.name}`)
    } else if (message.type === 'leave') {
      logLine(`leave: ${message.name}`)
    } else if (message.type === 'message') {
      onSignal(message.from, message.data).catch((err) => logLine(`signal error: ${err.message}`))
    } else if (message.type === 'error') {
      logLine(`exchange error: ${message.error} (${message.to ?? ''})`)
    }
  }
}

const createPeer = (peer: string) => {
  const conn = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  conn.onicecandidate = (event) => {
    if (event.candidate) {
      logLine(
        `ice out: ${event.candidate.type} ${event.candidate.protocol} ${event.candidate.address}`,
      )
      signal(peer, { kind: 'ice', candidate: event.candidate })
    } else {
      logLine('ice gathering done')
    }
  }
  conn.onicecandidateerror = (event: any) =>
    logLine(`ice gather error ${event.errorCode}: ${event.errorText} (${event.url})`)
  conn.oniceconnectionstatechange = () => logLine(`ice: ${conn.iceConnectionState}`)
  conn.ondatachannel = (event) => {
    channel = wireChannel(event.channel)
  }
  conn.onconnectionstatechange = () => logLine(`p2p: ${conn.connectionState}`)
  return conn
}

const call = async () => {
  const peer = peerName.value.trim()
  if (!peer) {
    logLine('enter a peer name first')
    return
  }

  pc?.close()
  pendingIce = []

  pc = createPeer(peer)
  channel = wireChannel(pc.createDataChannel('data'))
  await pc.setLocalDescription(await pc.createOffer())
  signal(peer, { kind: 'offer', sdp: pc.localDescription })
  logLine(`calling ${peer}…`, 'up')
}

const onSignal = async (from: string, data: any) => {
  if (data.kind === 'offer') {
    peerName.value = from
    pc?.close()
    pendingIce = []
    pc = createPeer(from)
    await pc.setRemoteDescription(data.sdp)
    await drainIce()
    await pc.setLocalDescription(await pc.createAnswer())
    signal(from, { kind: 'answer', sdp: pc.localDescription })
    logLine(`answered call from ${from}`, 'down')
  } else if (data.kind === 'answer') {
    await pc!.setRemoteDescription(data.sdp)
    await drainIce()
  } else if (data.kind === 'ice') {
    logLine(`ice in: ${data.candidate.candidate?.split(' typ ')[1] ?? '?'}`)
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(data.candidate)
    } else {
      pendingIce.push(data.candidate)
    }
  }
}

const wireChannel = (ch: RTCDataChannel) => {
  let incoming: { name: string; size: number; chunks: ArrayBuffer[] } | null = null
  ch.binaryType = 'arraybuffer'
  ch.onopen = () => {
    status.value = 'p2p open'
    logLine('datachannel open — messages now go peer-to-peer, not through the server')
  }
  ch.onclose = () => {
    status.value = 'p2p closed'
    logLine('datachannel closed')
  }
  ch.onmessage = (event) => {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data)
      if (message.kind === 'text') {
        logLine(message.text, 'down')
      } else if (message.kind === 'file-start') {
        incoming = { name: message.name, size: message.size, chunks: [] }
        logLine(`receiving ${message.name} (${message.size} bytes)…`, 'down')
      } else if (message.kind === 'file-end') {
        offerDownload(incoming)
        incoming = null
      }
    } else if (incoming) {
      incoming.chunks.push(event.data)
    }
  }
  return ch
}

const sendText = () => {
  const text = msgText.value
  if (channel?.readyState !== 'open') {
    logLine('no open datachannel — connect ws and call a peer first')
    return
  }
  if (!text) {
    return
  }
  channel.send(JSON.stringify({ kind: 'text', text }))
  logLine(text, 'up')
  msgText.value = ''
}

const pickFile = () => {
  const inp = document.createElement('input')
  inp.type = 'file'
  inp.onchange = () => inp.files![0] && sendFile(inp.files![0])
  inp.click()
}

const CHUNK = 16384 // safe cross-browser SCTP message size
const sendFile = async (file: File) => {
  if (channel?.readyState !== 'open') {
    logLine('no open datachannel')
    return
  }
  channel.send(JSON.stringify({ kind: 'file-start', name: file.name, size: file.size }))
  const buf = await file.arrayBuffer()
  for (let off = 0; off < buf.byteLength; off += CHUNK) {
    while (channel.bufferedAmount > 1_048_576) {
      await new Promise((resolve) => setTimeout(resolve, 50)) // backpressure: don't flood the channel
    }
    channel.send(buf.slice(off, off + CHUNK))
  }
  channel.send(JSON.stringify({ kind: 'file-end' }))
  logLine(`sent ${file.name} (${file.size} bytes)`, 'up')
}

const offerDownload = (file: { name: string; chunks: ArrayBuffer[] } | null) => {
  if (!file) {
    return
  }
  const blob = new Blob(file.chunks)
  downloads.value.push({ name: file.name, url: URL.createObjectURL(blob), size: blob.size })
  logLine(`received ${file.name} (${blob.size} bytes)`, 'down')
}

onUnmounted(() => {
  channel?.close()
  pc?.close()
  ws?.close()
})

// auto-connect once mounted (the log panel ref exists from here on)
onMounted(connectWs)
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-3">
    <div class="flex items-center gap-2">
      <input
        v-model="wsUrl"
        name="ws-url"
        class="input input-sm input-bordered flex-1 font-mono"
        placeholder="wss://host/api/ws"
        @keydown.enter="connectWs"
      />
      <input
        v-model="token"
        name="room-token"
        class="input input-sm input-bordered w-36 font-mono"
        placeholder="room token"
        @keydown.enter="connectWs"
      />
      <button class="btn btn-sm" @click="connectWs">connect ws</button>
      <span class="text-sm opacity-60">{{ status }}</span>
    </div>
    <div class="flex items-center gap-2">
      <input
        v-model="peerName"
        name="peer-name"
        class="input input-sm input-bordered flex-1"
        placeholder="peer name (see welcome/join in log)"
      />
      <button class="btn btn-sm" @click="call">call</button>
    </div>
    <div class="flex items-center gap-2">
      <input
        v-model="msgText"
        name="msg-text"
        class="input input-sm input-bordered flex-1"
        placeholder="text message"
        @keydown.enter="sendText"
      />
      <button class="btn btn-sm" @click="sendText">send</button>
      <button class="btn btn-sm" @click="pickFile">send file</button>
    </div>
    <div v-for="d in downloads" :key="d.url">
      <a :href="d.url" :download="d.name" class="link link-primary"
        >⬇ {{ d.name }} ({{ d.size }} bytes)</a
      >
    </div>
    <LogPanel ref="log" height="280px" />
  </div>
</template>
