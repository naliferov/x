import http from 'node:http'

const x = {
  http,
  port: process.env.PORT || 3000,
}

x.json = (res, status, body) =>
  res
    .writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    .end(JSON.stringify(body))

x.read = async (req) => {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

x.handle = async (req, res) => {
  res.on('error', () => {})
  try {
    if (req.method !== 'POST') {
      x.json(res, 405, { error: 'post only' })
      return
    }
    x.json(res, 200, await x.read(req))
  } catch (err) {
    x.json(res, err instanceof SyntaxError ? 400 : 500, { error: err.message })
  }
}

x.server = x.http
  .createServer(x.handle)
  .listen(x.port, () => console.log(`http://localhost:${x.port}`))

process.on('SIGINT', () => x.server.close(() => process.exit(0)))
