import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { writeFile } from 'node:fs/promises'
import { resolve, sep, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// Dev-only writer for data/: POST /__save?name=<name>&ext=<md|txt|json> writes the body to
// data/<name>.<ext> (docs from the editor, collage layouts). apply:'serve' keeps it out of the static
// build (which stays read-only); the name is confined to data/ so a crafted name can't escape the folder.
const dataDir = resolve(fileURLToPath(new URL('./data', import.meta.url)))
const savedFormats = ['md', 'txt', 'json']
const docFormatOf = (file: string) =>
  file.endsWith('.md') ? 'md' : file.endsWith('.txt') ? 'txt' : null
const save = (): Plugin => ({
  name: 'x-save',
  apply: 'serve',
  // A data file is a dep of App.vue via import.meta.glob, so its change hot-updates the whole
  // component and the UI blinks. For a doc, push the raw source over a custom event (the client
  // patches just the open doc, compiling md as needed); for a collage layout the open script already
  // holds the state, and a re-render would remount it. Return [] to cancel the default re-render.
  async handleHotUpdate({ file, read, server }) {
    if (!file.startsWith(dataDir + sep)) {
      return
    }
    if (file.endsWith('.json')) {
      return []
    }
    const format = docFormatOf(file)
    if (!format) {
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
      if (req.method !== 'POST' || !req.url?.startsWith('/__save?')) {
        return next()
      }
      const params = new URL(req.url, 'http://localhost').searchParams
      const name = params.get('name') ?? ''
      const ext = params.get('ext') ?? ''
      const file = resolve(dataDir, `${name}.${ext}`)
      if (!savedFormats.includes(ext)) {
        res.statusCode = 400
        res.end('bad ext')
        return
      }
      if (!name || name.includes('/') || name.includes('\\') || !file.startsWith(dataDir + sep)) {
        res.statusCode = 400
        res.end('bad name')
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
// App.vue — no runtime engine, x is fully offline.
export default defineConfig({
  plugins: [vue(), tailwindcss(), save()],
})
