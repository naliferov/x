import type { Server, IncomingMessage } from 'node:http'
import { WebSocketServer } from 'ws'
import { uniqueName } from './lib/nameGenerator.ts'

const HEARTBEAT_MS = 30_000

const rooms = new Map()

// The room a client belongs to, from its connect token. First present wins; none -> undefined
// (a connection without a token is refused — there is no default room).
const channelOf = (req: IncomingMessage) => {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim() || undefined
  const query = new URL(req.url ?? '', 'http://x').searchParams.get('channel') || undefined
  return first(req.headers['sec-websocket-protocol']) || query
}

const send = (socket, message) => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

// Tell every client in `channel` except `selfName` (used for join/leave presence).
const announce = (channel, selfName, message) => {
  const room = rooms.get(channel)
  if (!room) {
    return
  }
  for (const [name, socket] of room) {
    if (name !== selfName) {
      send(socket, message)
    }
  }
}

const handleMessage = (socket, raw) => {
  let message
  try {
    message = JSON.parse(raw)
  } catch {
    return // the exchange ignores non-JSON frames
  }
  if (message.type === 'message') {
    const target = rooms.get(socket.channel)?.get(message.to)
    if (!target) {
      send(socket, { type: 'error', error: 'no such client', to: message.to })
      return
    }
    send(target, { type: 'message', from: socket.name, data: message.data })
    return
  }
  send(socket, { type: 'error', error: 'unknown type', received: message.type })
}

export const attachWsServer = (server: Server) => {
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => protocols.values().next().value ?? false,
  })

  server.on('upgrade', (req, socket, head) => {
    const path = req.url.split('?')[0]
    if (path !== '/api/ws') {
      socket.destroy() // not our endpoint, and there's no other upgrade handler — drop it
      return
    }
    const channel = channelOf(req)
    if (!channel) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n') // no room token -> refuse (no default room)
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, (ws: any) => {
      ws.channel = channel
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws: any) => {
    // ws gets ad-hoc fields (channel, name, isAlive) tracked per socket
    const room = rooms.get(ws.channel) ?? new Map()
    rooms.set(ws.channel, room)
    const name = uniqueName((candidate) => room.has(candidate))
    ws.name = name
    ws.isAlive = true
    // Welcome the newcomer with its name + who's already in the room, then announce it to the rest.
    send(ws, { type: 'welcome', name, channel: ws.channel, clients: [...room.keys()] })
    announce(ws.channel, name, { type: 'join', name })
    room.set(name, ws)

    // Remove on disconnect; drop the room once empty, else tell the others. Guarded so
    // close+error don't double-fire.
    const drop = () => {
      const room = rooms.get(ws.channel)
      if (room?.delete(ws.name)) {
        if (room.size === 0) {
          rooms.delete(ws.channel)
        } else {
          announce(ws.channel, ws.name, { type: 'leave', name: ws.name })
        }
      }
    }

    ws.on('pong', () => {
      ws.isAlive = true
    })
    ws.on('message', (raw) => handleMessage(ws, raw))
    ws.on('close', drop)
    ws.on('error', drop) // a single socket erroring must not sink the exchange
  })

  const heartbeat = setInterval(() => {
    for (const room of rooms.values()) {
      for (const ws of room.values()) {
        if (!ws.isAlive) {
          ws.terminate() // fires 'close' -> drop() does the bookkeeping
          continue
        }
        ws.isAlive = false
        ws.ping()
      }
    }
  }, HEARTBEAT_MS)
  heartbeat.unref?.()

  return wss
}
