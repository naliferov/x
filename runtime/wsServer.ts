// wsServer.ts — the local WebSocket EXCHANGE on /api/ws.
//
// A dumb meeting point, NOT a feed of server state. It does not know or care about the
// node store; it only:
//   - puts each client in a ROOM chosen by the token it presents on connect,
//   - gives each client a unique funny name within that room (its address for direct messages),
//   - tells everyone in the room when a client joins or leaves,
//   - routes a direct message from one client to another by name, within the same room.
//
// Rooms (channels): the token the client sends IS the room key — there is no token registry on
// the server. Clients that present the same token share a room; clients in different rooms can't
// see or message each other. This isolates client groups (e.g. one site, or your own network of
// chrome tabs) so an unrelated connection can't join or snoop. A room is created on first join
// and its Map key is deleted when the last client leaves. A connection with no token is refused.
//
// The token is read from (first present): the Sec-WebSocket-Protocol header — the only "header" a
// browser can set, via `new WebSocket(url, [token])`, which we echo back so the handshake succeeds
// — then an `x-ws-channel` header (non-browser clients), then a `?channel=` query param.
//
// Same origin as /api, attached to the existing http.Server via its 'upgrade' event (no separate
// port, no second deploy). NOT session-gated — the room token the client presents IS the access
// control (see channelOf); a connection with no token is refused.
//
// Protocol (JSON text frames):
//   server → you  (on connect): { type: 'welcome', name, channel, clients: [names] }
//   server → others in room:    { type: 'join', name }
//                               { type: 'leave', name }
//   you → server:               { type: 'message', to, data }   DM another client by name
//                               { type: 'ping' }                → { type: 'pong' }
//   server → recipient:         { type: 'message', from, data }
//   server → you (bad target):  { type: 'error', error: 'no such client', to }
import type { Server, IncomingMessage } from 'node:http'
import { WebSocketServer } from 'ws'
import { uniqueName } from './lib/nameGenerator.ts'

const HEARTBEAT_MS = 30_000

// channel(token) -> (name -> socket). Each socket carries `channel`, `name`, `isAlive`.
const rooms = new Map()

// The room a client belongs to, from its connect token. First present wins; none -> undefined
// (a connection without a token is refused — there is no default room).
const channelOf = (req: IncomingMessage) => {
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.split(',')[0].trim() || undefined
  const query = new URL(req.url ?? '', 'http://x').searchParams.get('channel') || undefined
  return first(req.headers['sec-websocket-protocol']) || first(req.headers['x-ws-channel']) || query
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
  if (message.type === 'ping') {
    send(socket, { type: 'pong' })
    return
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

// Attach the exchange to an existing http.Server. Upgrades on /api/ws; access is the room token
// (no session gate) — a connection with no token is refused in the handler below.
export const attachWsServer = (server: Server) => {
  // Echo the client's offered subprotocol (browsers close the connection unless the server
  // selects one) so the room token can travel as the Sec-WebSocket-Protocol "header".
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

  // Heartbeat: drop sockets that stop answering pings (half-open) so rooms don't leak.
  const heartbeat = setInterval(() => {
    for (const [channel, room] of rooms) {
      for (const [name, ws] of room) {
        if (!ws.isAlive) {
          ws.terminate()
          if (room.delete(name)) {
            if (room.size === 0) {
              rooms.delete(channel)
            } else {
              announce(channel, name, { type: 'leave', name })
            }
          }
          continue
        }
        ws.isAlive = false
        ws.ping()
      }
    }
  }, HEARTBEAT_MS)
  heartbeat.unref?.() // never keep the process alive just for the heartbeat

  return wss
}
