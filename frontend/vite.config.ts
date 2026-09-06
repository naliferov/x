import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { writeFile } from 'node:fs/promises'
import { resolve, sep, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// Dev-only writer for the in-app doc editor: POST /__save-doc?name=<doc>&ext=<md|txt> writes the
// body to data/<doc>.<ext>. apply:'serve' keeps it out of the static build (which stays read-only);
// the name is confined to data/ so a crafted name can't escape the folder. Docs (.md and plain
// .txt) share the flat data/ dir with bins; docFormatOf gates this writer to those two.
const dataDir = resolve(fileURLToPath(new URL('./data', import.meta.url)))
const docFormatOf = (file: string) =>
  file.endsWith('.md') ? 'md' : file.endsWith('.txt') ? 'txt' : null
const saveDoc = (): Plugin => ({
  name: 'x-save-doc',
  apply: 'serve',
  // A doc file is a dep of App.vue via import.meta.glob, so its change hot-updates the whole
  // component and the UI blinks. Instead, push the raw source over a custom event (the client
  // patches just the open doc, compiling md as needed) and return [] to cancel the default re-render.
  async handleHotUpdate({ file, read, server }) {
    const format = docFormatOf(file)
    if (!file.startsWith(dataDir + sep) || !format) {
      return
    }
    const source = await read()
    server.ws.send({
      type: 'custom',
      event: 'x:doc',
      data: { name: basename(file, `.${format}`), source, format },
    })
    return []
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.method !== 'POST' || !req.url?.startsWith('/__save-doc')) {
        return next()
      }
      const params = new URL(req.url, 'http://localhost').searchParams
      const name = params.get('name') ?? ''
      const raw = params.get('ext') ?? ''
      const ext = raw === 'txt' ? 'txt' : 'md'
      const file = resolve(dataDir, `${name}.${ext}`)
      if (!name || name.includes('/') || name.includes('\\') || !file.startsWith(dataDir + sep)) {
        res.statusCode = 400
        res.end('bad doc name')
        return
      }
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', async () => {
        await writeFile(file, body)
        res.setHeader('content-type', 'application/json')
        res.end('{"ok":true}')
      })
    })
  },
})

// Bins need no plugin: App.vue discovers them with import.meta.glob over frontend/data/ (the flat
// content dir they share with docs), { query: '?url' } — Vite emits each as a fingerprinted asset
// and hands the client its URL at build time. Type is inferred from the extension there. No manifest,
// no middleware, no copy step.

// Scripts are .vue files under ./scripts, compiled by Vite and discovered via import.meta.glob in
// App.vue — no runtime engine. x itself is offline; the /api and /ws proxies below exist only
// for the handful of ported scripts that talk to a LIVE x api service (harness → /api/claude,
// refactory loading vlang sources by node id, the ws testers → the /ws hub). With the api service
// down those scripts degrade to their own error handling; everything else runs fully offline.
export default defineConfig({
  plugins: [vue(), tailwindcss(), saveDoc()],
  server: {
    proxy: {
      // ws: true also forwards the /api/ws websocket upgrade (the hub lives under /api now)
      '/api': { target: 'http://localhost:3001', ws: true },
    },
  },
})
