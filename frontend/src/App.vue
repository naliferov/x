<script setup lang="ts">
import {
  ref,
  computed,
  shallowRef,
  defineAsyncComponent,
  defineComponent,
  h,
  onMounted,
  onBeforeUnmount,
  type Component,
  type PropType,
} from 'vue'
import { marked } from 'marked'
import AssetView from './AssetView.vue'

const vueModules = import.meta.glob<{ default: Component }>('../scripts/*.vue')
const vanillaModules = import.meta.glob('../scripts/*.{js,ts}')
const solidModules = import.meta.glob('../scripts/*.{jsx,tsx}')
// Docs come in three source formats: hand-authored .html fragments, .md, and plain .txt. All render
// through the same doc pane — md is compiled to html on load, txt is escaped into a <pre> (see
// renderDoc) — so styling and the edit/save path are shared. (.txt.gzip stays a bin: the gzip layer,
// not the .txt, decides that.)
const docHtmlModules = import.meta.glob('../data/*.html', { query: '?raw', import: 'default' })
const docMdModules = import.meta.glob('../data/*.md', { query: '?raw', import: 'default' })
const docTxtModules = import.meta.glob('../data/*.txt', { query: '?raw', import: 'default' })

const toName = (path: string) =>
  path
    .split('/')
    .pop()!
    .replace(/\.\w+$/, '')

type ScriptKind = 'vue' | 'vanilla' | 'solid'
const scripts = [
  ...Object.keys(vueModules).map((path) => ({ path, kind: 'vue' as ScriptKind })),
  ...Object.keys(vanillaModules).map((path) => ({ path, kind: 'vanilla' as ScriptKind })),
  ...Object.keys(solidModules).map((path) => ({ path, kind: 'solid' as ScriptKind })),
]
  .map((s) => ({ ...s, name: toName(s.path) }))
  .sort((a, b) => a.name.localeCompare(b.name))

type DocFormat = 'html' | 'md' | 'txt'
type Doc = { path: string; name: string; format: DocFormat; load: () => Promise<unknown> }
const docs: Doc[] = [
  ...Object.keys(docHtmlModules).map((path) => ({
    path,
    name: toName(path),
    format: 'html' as DocFormat,
    load: docHtmlModules[path],
  })),
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
].sort((a, b) => a.name.localeCompare(b.name))

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// md compiles to html; txt is escaped into a <pre> (whitespace preserved, long lines wrap); html
// passes through untouched. All three render through the same doc pane.
const renderDoc = (source: string, format: DocFormat) =>
  format === 'md'
    ? (marked.parse(source) as string)
    : format === 'txt'
      ? `<pre class="doc-txt">${escapeHtml(source)}</pre>`
      : source

const filter = ref('')
const matches = (name: string) => name.toLowerCase().includes(filter.value.trim().toLowerCase())
const visibleScripts = computed(() => scripts.filter((s) => matches(s.name)))
const visibleDocs = computed(() => docs.filter((d) => matches(d.name)))

// bins share the flat data/ dir with docs — import.meta.glob imports each as a URL (?url), giving us
// the list + fingerprinted URLs at build time (no manifest). Type is inferred from the content
// extension; the type-aware viewer (AssetView) renders it (csv/log/json as text, fb2 as a book,
// images/media as elements, else a download link). The extensions are enumerated (not a bare data/*)
// so the .md/.html/.txt docs living in the same dir aren't emitted as dead url assets or listed as
// bins. Plain .txt is a DOC, but a gzipped .txt.gzip is a bin — matched here via the gz/gzip entries
// and typed 'txt' by binType (which strips the .gzip layer first).
const binModules = import.meta.glob(
  '../data/*.{csv,log,json,fb2,png,jpg,jpeg,gif,webp,avif,svg,opus,mp3,ogg,wav,m4a,flac,aac,mp4,webm,mov,mkv,gz,gzip}',
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>
// Type by CONTENT. A trailing .gz/.gzip is a transparent compression layer — stripped here, inflated
// on load (see AssetView) — NOT part of the type. So foo.txt.gzip is 'txt', foo.fb2.gzip is 'fb2'.
const binType = (path: string) => {
  const name = path.toLowerCase().replace(/\.(gz|gzip)$/, '')
  if (/\.(txt|md|csv|log|json)$/.test(name)) return 'txt'
  if (name.endsWith('.fb2')) return 'fb2'
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(name)) return 'image'
  if (/\.(opus|mp3|ogg|wav|m4a|flac|aac)$/.test(name)) return 'audio'
  if (/\.(mp4|webm|mov|mkv)$/.test(name)) return 'video'
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
  .sort((a, b) => a.name.localeCompare(b.name))
const visibleBins = computed(() => bins.filter((a) => matches(a.name)))

// --- script mounting (non-Vue kinds get a host <div> + cleanup lifecycle) ---
type MountFn = (host: HTMLElement) => Promise<(() => void) | undefined>

const HostMount = defineComponent({
  props: { mount: { type: Function as PropType<MountFn>, required: true } },
  setup(props) {
    const host = ref<HTMLElement>()
    let cleanup: (() => void) | undefined
    onMounted(async () => {
      cleanup = await props.mount(host.value!)
    })
    onBeforeUnmount(() => cleanup?.())
    return () => h('div', { ref: host })
  },
})

const mountVanilla =
  (path: string): MountFn =>
  async (host) => {
    const mod = (await vanillaModules[path]()) as { default: (host: HTMLElement) => unknown }
    const result = await mod.default(host)
    return typeof result === 'function' ? (result as () => void) : undefined
  }

const mountSolid =
  (path: string): MountFn =>
  async (host) => {
    const [{ render }, mod] = await Promise.all([import('solid-js/web'), solidModules[path]()])
    return render((mod as { default: () => any }).default, host)
  }

// --- selection: /script/<name> or /doc/<name> ---
const activeUrl = ref<string | null>(null) // '/script/x' | '/doc/x'
const activeComponent = shallowRef<Component | null>(null)
const activeMount = shallowRef<MountFn | null>(null)
const activeHtml = ref('') // compiled html for v-html
const activeSource = ref('') // raw file source (what the editor edits + saves)
const activeDocFormat = ref<DocFormat>('html')
const activeBin = shallowRef<Bin | null>(null)
const missing = ref<string | null>(null)

// --- doc editing (dev only: backed by the /__save-doc vite middleware) ---
const canEdit = import.meta.env.DEV
const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)
const docEdits = new Map<string, string>() // raw source pushed over HMR, by doc name

const show = async (url: string | null) => {
  activeUrl.value = null
  activeComponent.value = null
  activeMount.value = null
  activeHtml.value = ''
  activeSource.value = ''
  activeBin.value = null
  missing.value = null
  editing.value = false
  document.title = 'ocraft'
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
    document.title = `ocraft · ${asset.name}`
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
    document.title = `ocraft · ${doc.name}`
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
  document.title = `ocraft · ${script.name}`
  if (script.kind === 'vue') {
    activeComponent.value = defineAsyncComponent(vueModules[script.path])
  }
  if (script.kind === 'vanilla') {
    activeMount.value = mountVanilla(script.path)
  }
  if (script.kind === 'solid') {
    activeMount.value = mountSolid(script.path)
  }
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

// In-doc navigation without reload: docs link to /doc/<name> (and may link /script/<name>).
// Intercept those; external links behave normally.
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
  (localStorage.getItem('ocraft.theme') as 'dark' | 'light') ?? 'light',
)
const applyTheme = () => (document.documentElement.dataset.theme = theme.value)
const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('ocraft.theme', theme.value)
  applyTheme()
}
applyTheme()

// A changed doc file arrives here (not as a full App re-render) — patch the open doc in place.
if (import.meta.hot) {
  import.meta.hot.on(
    'ocraft:doc',
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
        <span class="text-lg font-bold">ocraft</span>
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
              <span v-if="s.kind !== 'vue'" class="badge badge-ghost badge-xs">{{ s.kind }}</span>
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
      <div v-else-if="activeComponent || activeMount" :key="'run:' + activeUrl" class="p-6">
        <component :is="activeComponent" v-if="activeComponent" />
        <HostMount v-else :mount="activeMount!" />
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
/* Readable defaults for the raw doc html (rendered via v-html, so not scoped). */
.doc {
  line-height: 1.65;
}
.doc h1,
.doc h2,
.doc h3 {
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
