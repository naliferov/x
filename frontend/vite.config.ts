import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve, sep, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// Files in data/ are written and deleted by x.js (src/data.ts); the dev server only reacts to the change.
const dataDir = resolve(fileURLToPath(new URL('./data', import.meta.url)))
const docFormatOf = (file: string) =>
  file.endsWith('.md') ? 'md' : file.endsWith('.txt') ? 'txt' : null
const dataHotUpdate = (): Plugin => ({
  name: 'x-data-hot-update',
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
})

// Bins need no plugin: App.vue discovers them with import.meta.glob over frontend/data/ (the flat
// content dir they share with docs), { query: '?url' } — Vite emits each as a fingerprinted asset
// and hands the client its URL at build time. Type is inferred from the extension there. No manifest,
// no middleware, no copy step.

// Scripts are .vue files under ./scripts, compiled by Vite and discovered via import.meta.glob in
// App.vue — no runtime engine, x is fully offline.
export default defineConfig({
  plugins: [vue(), tailwindcss(), dataHotUpdate()],
})
