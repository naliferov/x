// http.js — a tiny, framework-free HTTP transport kit (domain-agnostic).
//
// Everything here is about moving bytes over HTTP, not about x: request-body reading
// (with a size cap), gzipped responses, a `:param` route matcher, static-file/SPA serving
// with traversal guards, and a hardened `createServer` that turns handler throws and dropped
// connections into responses instead of crashes. The app (runtime/api.js) supplies the
// routes, auth, and config; this module supplies the plumbing.
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'

// --- Request bodies --------------------------------------------------------
// Cap request bodies so a client can't exhaust memory by streaming an unbounded payload.
// Reject early on the declared Content-Length, and abort mid-stream if the actual bytes
// exceed the cap. The thrown error carries statusCode 413, which createServer's dispatch
// turns into a 413 response.
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES) || 5 * 1024 * 1024 // 5 MB

const tooLarge = () => {
  const err: any = new Error('payload too large') // Node errors carry ad-hoc fields (statusCode)
  err.statusCode = 413
  return err
}

const readRaw = async (req: http.IncomingMessage) => {
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    throw tooLarge()
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      req.destroy()
      throw tooLarge()
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

export const readBody = async (req: http.IncomingMessage): Promise<any> =>
  JSON.parse(await readRaw(req))
export const readText = (req: http.IncomingMessage) => readRaw(req)

// --- Responses -------------------------------------------------------------
// Send a text/JSON body, gzipped when the client accepts it and it's big enough to be
// worth the header overhead. Synchronous gzip is fine for this single-user server.
export const sendText = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: string | Buffer,
  contentType: string,
) => {
  const buffer = Buffer.from(body)
  const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip')
  if (acceptsGzip && buffer.length > 512) {
    res
      .writeHead(200, {
        'Content-Type': contentType,
        'Content-Encoding': 'gzip',
        Vary: 'Accept-Encoding',
      })
      .end(zlib.gzipSync(buffer))
  } else {
    res.writeHead(200, { 'Content-Type': contentType }).end(buffer)
  }
}

// --- Routing ---------------------------------------------------------------
// A route handler: the matched request, its response, and the `:param` values pulled from the URL.
export type Handler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
) => Promise<void> | void

// Match `method`+`url` against a routes object keyed by "METHOD /path/:param". Returns
// { handler, params, key } or null. `:param` segments stop at '/'.
export const matchUrl = (routes: Record<string, Handler>, method: string, url: string) => {
  for (const key of Object.keys(routes)) {
    const [routeMethod, routePath] = key.split(' ')
    if (routeMethod !== method) {
      continue
    }
    const pattern = routePath.replace(/:\w+/g, '([^/]+)')
    const match = url.match(new RegExp(`^${pattern}$`))
    if (match) {
      const paramNames = [...routePath.matchAll(/:(\w+)/g)].map((paramMatch) => paramMatch[1])
      const params = Object.fromEntries(paramNames.map((name, index) => [name, match[index + 1]]))
      return { handler: routes[key], params, key }
    }
  }
  return null
}

// --- Static files ----------------------------------------------------------
// Serve a built SPA under `dir`: real files are returned (hashed `/assets/*` cached
// forever, everything else no-cache); an extension-less path that isn't a file falls back
// to index.html so client-side history routes resolve on direct load. Traversal-guarded.
export const serveStatic = async (
  res: http.ServerResponse,
  {
    dir,
    urlPath,
    contentTypes,
    notBuiltMessage,
  }: {
    dir: string
    urlPath: string
    contentTypes: Record<string, string>
    notBuiltMessage?: string
  },
) => {
  const relPath = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).slice(1)
  const full = path.resolve(dir, relPath)
  if (full === dir || full.startsWith(dir + path.sep)) {
    try {
      const data = await fs.readFile(full)
      const type = contentTypes[path.extname(full).toLowerCase()] ?? 'application/octet-stream'
      const cacheControl = urlPath.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cacheControl }).end(data)
      return
    } catch {
      // not a real file — fall through to the SPA fallback
    }
  }
  if (path.extname(urlPath)) {
    res.writeHead(404).end('Not found')
    return
  }
  try {
    const html = await fs.readFile(path.join(dir, 'index.html'))
    res
      .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
      .end(html)
  } catch {
    res.writeHead(404).end(notBuiltMessage ?? 'Not built')
  }
}

// --- Server + resilience ---------------------------------------------------
// A dropped/reset connection (client closed mid-request or mid-response) shows up as one of
// these codes. They carry no server state — the only correct response is to stop touching
// that socket, never to crash.
export const isTransientNetworkError = (err) =>
  !!err &&
  [
    'ECONNRESET',
    'EPIPE',
    'ECONNABORTED',
    'ECANCELED',
    'ERR_STREAM_DESTROYED',
    'ERR_STREAM_WRITE_AFTER_END',
  ].includes(err.code)

// Install last-resort process guards ONCE so a dropped connection can never bring the
// server down. Transient socket errors are logged quietly; anything unexpected is logged
// loudly but kept alive (nothing supervises this process yet — see the security plan).
let guardsInstalled = false
const installProcessGuards = () => {
  if (guardsInstalled) {
    return
  }
  guardsInstalled = true
  process.on('uncaughtException', (err: any) => {
    if (isTransientNetworkError(err)) {
      console.warn(`[http] ignored transient socket error: ${err.code}`)
      return
    }
    console.error('[http] uncaught exception (kept process alive):', err)
  })
  process.on('unhandledRejection', (reason: any) => {
    if (isTransientNetworkError(reason)) {
      console.warn(`[http] ignored transient socket rejection: ${reason.code}`)
      return
    }
    console.error('[http] unhandled rejection (kept process alive):', reason)
  })
}

// Build an http.Server around `handler(req, res)` with the resilience baked in:
//  - per-request req/res 'error' listeners so a vanished client doesn't crash the process
//  - a dispatch try/catch: transient errors are swallowed; err.statusCode (e.g. 413) and
//    malformed JSON (400) become client errors; anything else is a logged 500
//  - a clientError handler for connections that error before the request is parsed
//  - process-level uncaught/unhandledRejection guards (installed once)
// Returns the server WITHOUT listening, so the caller can attach upgrades (WS) then listen.
export const createServer = (
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void,
) => {
  const server = http.createServer(async (req, res) => {
    req.on('error', () => {})
    res.on('error', () => {})
    try {
      await handler(req, res)
    } catch (err) {
      if (isTransientNetworkError(err)) {
        return // client went away mid-flight — nothing to send
      }
      const status = err.statusCode || (err instanceof SyntaxError ? 400 : 500)
      if (status >= 500) {
        console.error(`[http] ${req.method} ${req.url} failed:`, err)
      }
      if (!res.headersSent) {
        res
          .writeHead(status, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: status === 500 ? 'internal error' : err.message }))
      } else {
        res.destroy()
      }
    }
  })

  // A connection that errors before/while we parse the request (abrupt reset, garbage
  // bytes). Reply 400 if the socket can still take it, else drop it — never let it throw.
  server.on('clientError', (err, socket) => {
    if (socket.writable && !socket.destroyed) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    } else {
      socket.destroy()
    }
  })
  // Listen-level faults (e.g. EADDRINUSE) — log instead of an opaque crash.
  server.on('error', (err) => console.error('[http] server error:', err))

  installProcessGuards()
  return server
}
