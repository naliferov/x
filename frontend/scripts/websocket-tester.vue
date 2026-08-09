<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import LogPanel from './lib/LogPanel.vue'

const url = ref(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`)
const message = ref('')
const status = ref('idle')
const panel = ref<InstanceType<typeof LogPanel>>()
const logLine = (text: string, dir = 'sys') => panel.value?.push(text, dir)

let socket: WebSocket | null = null

const disconnect = () => {
  if (socket) {
    try {
      socket.close()
    } catch {}
    socket = null
  }
}

const connect = () => {
  disconnect()
  status.value = 'connecting'
  logLine(`connecting → ${url.value}`, 'sys')
  try {
    socket = new WebSocket(url.value)
  } catch (err: any) {
    status.value = 'error'
    logLine(`bad URL: ${err.message}`, 'sys')
    return
  }
  socket.onopen = () => {
    status.value = 'open'
    logLine('open ✅', 'sys')
  }
  socket.onmessage = (event) => {
    const data =
      typeof event.data === 'string'
        ? event.data
        : `[binary ${event.data.size ?? event.data.byteLength ?? '?'} bytes]`
    logLine(data, 'down')
  }
  socket.onerror = () => {
    status.value = 'error'
    logLine('error ❌ (see devtools Network/Console)', 'sys')
  }
  socket.onclose = (event) => {
    status.value = 'closed'
    logLine(
      `closed 🔌 code=${event.code}${event.reason ? ' reason=' + event.reason : ''}`,
      'sys',
    )
  }
}

const send = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    logLine('not connected — hit Connect first', 'sys')
    return
  }
  if (!message.value) return
  socket.send(message.value)
  logLine(message.value, 'up')
  message.value = ''
}

onUnmounted(disconnect)
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-3">
    <div class="flex items-center gap-2">
      <input v-model="url" name="ws-url" class="input input-sm input-bordered flex-1 font-mono" placeholder="ws://host/path" @keydown.enter="connect" />
      <button class="btn btn-sm" @click="connect">Connect</button>
      <button class="btn btn-sm" @click="disconnect">Disconnect</button>
      <span class="text-sm opacity-60">{{ status }}</span>
    </div>
    <div class="flex items-center gap-2">
      <input v-model="message" name="ws-message" class="input input-sm input-bordered flex-1" placeholder="message to send" @keydown.enter="send" />
      <button class="btn btn-sm" @click="send">Send</button>
      <button class="btn btn-sm" @click="panel!.clear()">Clear</button>
    </div>
    <LogPanel ref="panel" height="320px" />
  </div>
</template>
