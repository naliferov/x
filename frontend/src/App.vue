<script setup lang="ts">
import { ref, computed, shallowRef, defineAsyncComponent, type Component } from 'vue'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import ini from 'highlight.js/lib/languages/ini'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import plaintext from 'highlight.js/lib/languages/plaintext'
import 'highlight.js/styles/github-dark.css'
import AssetView from './AssetView.vue'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('json', json)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('plaintext', plaintext)

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
)

const vueModules = import.meta.glob<{ default: Component }>('../scripts/*.vue')
const docMdModules = import.meta.glob('../data/*.md', { query: '?raw', import: 'default' })
const docTxtModules = import.meta.glob('../data/*.txt', { query: '?raw', import: 'default' })
const toName = (path: string) =>
  path
    .split('/')
    .pop()!
    .replace(/\.\w+$/, '')

const scripts = Object.keys(vueModules)
  .map((path) => ({ path, name: toName(path) }))
  .sort((left, right) => left.name.localeCompare(right.name))

type DocFormat = 'md' | 'txt'
type Doc = {
  path: string
  name: string
  format: DocFormat
  load: () => Promise<unknown>
}

const docs: Doc[] = [
  ...Object.keys(docMdModules).map((path) => ({
    path,
    name: toName(path),
    format: 'md' as DocFormat,
    load: docMdModules[path],
  })),
  ...Object.keys(docTxtModules).map((path) => ({
    path,
    name: toName(path),
    format: 'txt' as DocFormat,
    load: docTxtModules[path],
  })),
].sort((left, right) => left.name.localeCompare(right.name))

const escapeHtml = (source: string) =>
  source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const renderDoc = (source: string, format: DocFormat) =>
  format === 'md'
    ? (marked.parse(source) as string)
    : `<pre class="doc-txt">${escapeHtml(source)}</pre>`

const filter = ref('')
const matches = (name: string) => name.toLowerCase().includes(filter.value.trim().toLowerCase())
const visibleScripts = computed(() => scripts.filter((script) => matches(script.name)))
const visibleDocs = computed(() => docs.filter((doc) => matches(doc.name)))

const binModules = import.meta.glob(
  '../data/*.{csv,log,json,fb2,png,jpg,jpeg,gif,webp,avif,svg,opus,mp3,ogg,wav,m4a,flac,aac,mp4,webm,mov,mkv,gz,gzip}',
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>

const binType = (path: string) => {
  const name = path.toLowerCase().replace(/\.(gz|gzip)$/, '')
  if (/\.(txt|md|csv|log|json)$/.test(name)) {
    return 'txt'
  }
  if (name.endsWith('.fb2')) {
    return 'fb2'
  }
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(name)) {
    return 'image'
  }
  if (/\.(opus|mp3|ogg|wav|m4a|flac|aac)$/.test(name)) {
    return 'audio'
  }
  if (/\.(mp4|webm|mov|mkv)$/.test(name)) {
    return 'video'
  }
  return 'file'
}

const binName = (path: string) =>
  path
    .split('/')
    .pop()!
    .replace(/\.(gz|gzip)$/i, '')
    .replace(/\.[^.]+$/, '')
type Bin = { name: string; url: string; type: string }

const bins: Bin[] = Object.entries(binModules)
  .map(([path, url]) => ({ name: binName(path), url, type: binType(path) }))
  .sort((left, right) => left.name.localeCompare(right.name))

const visibleBins = computed(() => bins.filter((bin) => matches(bin.name)))

const activeUrl = ref<string | null>(null) // '/script/x' | '/doc/x'
const activeComponent = shallowRef<Component | null>(null)
const activeHtml = ref('') // compiled html for v-html
const activeSource = ref('') // raw file source (what the editor edits + saves)
const activeDocFormat = ref<DocFormat>('md')
const activeBin = shallowRef<Bin | null>(null)
const missing = ref<string | null>(null)

const canEdit = import.meta.env.DEV
const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const docEdits = new Map<string, string>() // raw source pushed over HMR, by doc name

const show = async (url: string | null) => {
  activeUrl.value = null
  activeComponent.value = null
  activeHtml.value = ''
  activeSource.value = ''
  activeBin.value = null
  missing.value = null
  editing.value = false
  document.title = 'x'
  if (!url) {
    return
  }

  const [, kind, rawName] = url.match(/^\/(script|doc|bin)\/(.+)$/) ?? []
  const name = rawName && decodeURIComponent(rawName)

  if (kind === 'bin') {
    const asset = bins.find((candidate) => candidate.name === name)
    if (!asset) {
      missing.value = url
      return
    }
    activeUrl.value = url
    document.title = `x · ${asset.name}`
    activeBin.value = asset
    return
  }

  if (kind === 'doc') {
    const doc = docs.find((candidate) => candidate.name === name)
    if (!doc) {
      missing.value = url
      return
    }
    activeUrl.value = url
    document.title = `x · ${doc.name}`
    const source = docEdits.get(name) ?? ((await doc.load()) as string)
    activeDocFormat.value = doc.format
    activeSource.value = source
    activeHtml.value = renderDoc(source, doc.format)
    return
  }

  const script = scripts.find((candidate) => candidate.name === name)
  if (!script) {
    missing.value = url
    return
  }
  activeUrl.value = url
  document.title = `x · ${script.name}`
  activeComponent.value = defineAsyncComponent(vueModules[script.path])
}

const urlFromLocation = () =>
  location.pathname.match(/^\/(script|doc|bin)\/.+$/) ? location.pathname : null

const open = (kind: 'script' | 'doc' | 'bin', name: string) => {
  const url = `/${kind}/${encodeURIComponent(name)}`
  history.pushState(null, '', url)
  show(url)
}

const activeDocName = computed(() => {
  const match = activeUrl.value?.match(/^\/doc\/(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
})

const startEdit = () => {
  draft.value = activeSource.value
  saveError.value = null
  editing.value = true
}

const cancelEdit = () => {
  editing.value = false
}

const saveEdit = async () => {
  if (!activeDocName.value) {
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const res = await fetch(
      `/__save-doc?name=${encodeURIComponent(activeDocName.value)}&ext=${activeDocFormat.value}`,
      { method: 'POST', body: draft.value },
    )
    if (!res.ok) {
      throw new Error((await res.text()) || `save failed (${res.status})`)
    }
    activeSource.value = draft.value
    activeHtml.value = renderDoc(draft.value, activeDocFormat.value)
    editing.value = false
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}

const onContentClick = (event: MouseEvent) => {
  const link = (event.target as HTMLElement).closest('a')
  if (!link) {
    return
  }
  const match = link.getAttribute('href')?.match(/^\/(script|doc|bin)\/(.+)$/)
  if (!match) {
    return
  }
  event.preventDefault()
  open(match[1] as 'script' | 'doc' | 'bin', decodeURIComponent(match[2]))
}

window.addEventListener('popstate', () => show(urlFromLocation()))
show(urlFromLocation())

const theme = ref<'dark' | 'light'>(
  (localStorage.getItem('x.theme') as 'dark' | 'light') ?? 'light',
)
const applyTheme = () => (document.documentElement.dataset.theme = theme.value)
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('x.theme', theme.value)
  applyTheme()
}
applyTheme()

// A changed doc file arrives here (not as a full App re-render) — patch the open doc in place.
if (import.meta.hot) {
  import.meta.hot.on(
    'x:doc',
    ({ name, source, format }: { name: string; source: string; format: DocFormat }) => {
      docEdits.set(name, source)
      if (!editing.value && activeDocName.value === name) {
        activeSource.value = source
        activeHtml.value = renderDoc(source, format)
      }
    },
  )
}
</script>

<template>
  <div class="flex h-screen bg-base-100 text-base-content">
    <aside class="flex w-72 shrink-0 flex-col border-r border-base-300">
      <div class="flex items-center justify-between border-b border-base-300 p-4">
        <span class="text-lg font-bold">x</span>
        <button class="btn btn-ghost btn-xs" @click="toggleTheme">
          {{ theme === 'dark' ? '☀' : '☾' }}
        </button>
      </div>

      <div class="border-b border-base-300 p-2">
        <input
          v-model="filter"
          name="sidebar-filter"
          class="input input-sm input-bordered w-full"
          placeholder="filter…"
        />
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="px-4 pt-3 pb-1 text-xs font-semibold uppercase opacity-50">
          scripts ({{ visibleScripts.length }})
        </div>
        <ul class="menu w-full py-0">
          <li v-for="s in visibleScripts" :key="s.path">
            <a
              :class="{ active: activeUrl === `/script/${s.name}` }"
              @click="open('script', s.name)"
            >
              <span class="truncate">{{ s.name }}</span>
            </a>
          </li>
        </ul>

        <div class="px-4 pt-3 pb-1 text-xs font-semibold uppercase opacity-50">
          docs ({{ visibleDocs.length }})
        </div>
        <ul class="menu w-full py-0">
          <li v-for="d in visibleDocs" :key="d.path">
            <a :class="{ active: activeUrl === `/doc/${d.name}` }" @click="open('doc', d.name)">
              <span class="truncate">{{ d.name }}</span>
              <span class="badge badge-ghost badge-xs">{{ d.format }}</span>
            </a>
          </li>
        </ul>

        <template v-if="visibleBins.length">
          <div class="px-4 pt-3 pb-1 text-xs font-semibold uppercase opacity-50">
            bins ({{ visibleBins.length }})
          </div>
          <ul class="menu w-full py-0">
            <li v-for="a in visibleBins" :key="a.url">
              <a :class="{ active: activeBin?.name === a.name }" @click="open('bin', a.name)">
                <span class="truncate">{{ a.name }}</span>
                <span class="badge badge-ghost badge-xs">{{ a.type }}</span>
              </a>
            </li>
          </ul>
        </template>

        <div
          v-if="!visibleScripts.length && !visibleDocs.length && !visibleBins.length"
          class="p-4 text-xs opacity-50"
        >
          no matches
        </div>
      </div>
      <div class="border-t border-base-300 p-3 text-xs opacity-50">
        {{ scripts.length }} scripts · {{ docs.length }} docs · {{ bins.length }} bins
      </div>
    </aside>

    <main class="flex-1 overflow-auto">
      <div v-if="missing" class="grid h-full place-items-center opacity-40">
        <p>nothing at {{ missing }}</p>
      </div>
      <div
        v-else-if="activeHtml"
        :key="activeUrl!"
        class="max-w-3xl p-8"
        :class="{ 'flex h-full flex-col': editing }"
      >
        <div v-if="canEdit" class="mb-3 flex shrink-0 items-center gap-2">
          <template v-if="editing">
            <button class="btn btn-primary btn-xs" :disabled="saving" @click="saveEdit">
              {{ saving ? 'saving…' : 'save' }}
            </button>
            <button class="btn btn-ghost btn-xs" :disabled="saving" @click="cancelEdit">
              cancel
            </button>
            <span v-if="saveError" class="text-xs text-error">{{ saveError }}</span>
          </template>
          <button v-else class="btn btn-primary btn-xs" @click="startEdit">edit</button>
        </div>

        <textarea
          v-if="editing"
          v-model="draft"
          name="doc-source"
          spellcheck="false"
          class="textarea textarea-bordered min-h-0 w-full flex-1 font-mono text-sm leading-normal"
        ></textarea>
        <article v-else class="doc" @click="onContentClick" v-html="activeHtml"></article>
      </div>

      <div v-else-if="activeComponent" :key="'run:' + activeUrl" class="h-full p-6">
        <component :is="activeComponent" />
      </div>
      <div
        v-else-if="activeBin"
        :key="'bin:' + activeUrl"
        class="max-w-3xl p-8"
        :class="{ 'flex h-full flex-col': activeBin.type === 'fb2' }"
      >
        <AssetView :asset="activeBin" />
      </div>
      <div v-else class="grid h-full place-items-center opacity-40">
        <p>select a script, doc, or bin</p>
      </div>
    </main>
  </div>
</template>

<style>
.doc {
  line-height: 1.65;
}
.doc h1,
.doc h2,
.doc h3,
.doc h4,
.doc h5,
.doc h6 {
  font-weight: 700;
  margin: 1.2em 0 0.5em;
}
.doc h1 {
  font-size: 1.5rem;
}
.doc h2 {
  font-size: 1.25rem;
}
.doc h3 {
  font-size: 1.1rem;
}
.doc h4 {
  font-size: 1rem;
}
.doc h5 {
  font-size: 0.95rem;
}
.doc h6 {
  font-size: 0.9rem;
}
.doc p {
  margin: 0.6em 0;
}
.doc ul,
.doc ol {
  margin: 0.6em 0;
  padding-left: 1.4em;
}
.doc ul {
  list-style: disc;
}
.doc ol {
  list-style: decimal;
}
.doc li {
  margin: 0.25em 0;
}
.doc a {
  color: var(--color-primary, #3d7eff);
  text-decoration: underline;
}
.doc pre,
.doc code {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9em;
}
.doc pre {
  background: color-mix(in oklab, currentColor 8%, transparent);
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0.8em 0;
}
/* highlighted fences: let the hljs theme own the box (bg/color); .txt <pre> keeps the styling above */
.doc pre:has(code.hljs) {
  background: transparent;
  padding: 0;
}
.doc pre code.hljs {
  display: block;
  padding: 10px 12px;
  border-radius: 6px;
  overflow-x: auto;
}
/* a whole .txt doc renders as one <pre>; wrap long lines instead of scrolling the page. */
.doc pre.doc-txt {
  white-space: pre-wrap;
  word-break: break-word;
}
.doc blockquote {
  border-left: 3px solid color-mix(in oklab, currentColor 25%, transparent);
  padding-left: 1em;
  margin: 0.8em 0;
  opacity: 0.85;
}
.doc img,
.doc video {
  max-width: 100%;
}
.doc table {
  border-collapse: collapse;
  margin: 0.8em 0;
}
.doc th,
.doc td {
  border: 1px solid color-mix(in oklab, currentColor 20%, transparent);
  padding: 4px 10px;
}
</style>
