<script setup lang="ts">
import { ref, shallowRef, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { fb2ToHtml, decodeFb2 } from './fb2'
import { saveData } from './data'

const props = defineProps<{ asset: { name: string; url: string; type: string } }>()
const src = computed(() => props.asset.url)
const text = ref('')
const bookHtml = ref('')
const status = ref('')
const filter = ref('')

const isGzipped = () => /\.(gz|gzip)(\?|$)/i.test(props.asset.url)

const reader = ref<HTMLElement>()
const frame = ref<HTMLElement>()

// A book's reading position and marker highlights live in data/<book>.marks.json, written through
// x.js so they stay in git. A highlight is kept as its quote plus the text around it, not as offsets,
// so it finds its place again however the book is rendered.
const COLORS = ['green', 'coral'] as const
type Color = (typeof COLORS)[number]
type Highlight = { color: Color; quote: string; prefix: string; suffix: string }
type Marks = { position: { block: number }; highlights: Highlight[] }
const CONTEXT = 32
const POSITION_SAVE_DELAY_MS = 3000
const emptyMarks = (): Marks => ({ position: { block: 0 }, highlights: [] })

const marksUrls = import.meta.glob('../data/*.marks.json', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>
// A marks file created in this session is not in the glob yet; the dev server serves it by path.
const marksUrl = (name: string) =>
  marksUrls[`../data/${name}.marks.json`] ?? `/data/${name}.marks.json`

const loadMarks = async (name: string): Promise<Marks> => {
  const res = await fetch(marksUrl(name), { cache: 'no-store' })
  // The dev server answers a missing file with index.html, so anything but json means no marks yet.
  const isJson = res.ok && res.headers.get('content-type')?.includes('json')
  return isJson ? await res.json() : emptyMarks()
}

let marks = emptyMarks()
let marksBook = '' // the book `marks` were loaded for; empty until they are, and nothing is saved then

const saveMarks = async () => {
  try {
    await saveData(`${marksBook}.marks`, 'json', JSON.stringify(marks, null, 2))
  } catch (error) {
    status.value = error instanceof Error ? error.message : String(error)
  }
}

// The book's text as one string and where each text node starts in it: a selection becomes offsets
// into this string, and a highlight's offsets become a Range again.
let bookText = ''
let textNodes: Text[] = []
let nodeStarts: number[] = []
const indexText = () => {
  bookText = ''
  textNodes = []
  nodeStarts = []
  const walker = document.createTreeWalker(reader.value!, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    textNodes.push(node as Text)
    nodeStarts.push(bookText.length)
    bookText += node.nodeValue
  }
}

const offsetOf = (container: Node, offset: number) => {
  const range = document.createRange()
  range.setStart(reader.value!, 0)
  range.setEnd(container, offset)
  return range.toString().length
}

// The text node an offset falls in: a range starts in the node that begins at or before its start,
// and ends in the node that begins before its end.
const nodeIndexAt = (offset: number, side: 'start' | 'end') => {
  let low = 0
  let high = nodeStarts.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const fits = side === 'start' ? nodeStarts[middle] <= offset : nodeStarts[middle] < offset
    if (fits) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return low
}

const rangeOf = (start: number, end: number) => {
  const first = nodeIndexAt(start, 'start')
  const last = nodeIndexAt(end, 'end')
  const range = document.createRange()
  range.setStart(textNodes[first], start - nodeStarts[first])
  range.setEnd(textNodes[last], end - nodeStarts[last])
  return range
}

// Where the quote stands with the same text around it; failing that, its first occurrence.
const locate = (highlight: Highlight) => {
  let firstAt = -1
  for (
    let at = bookText.indexOf(highlight.quote);
    at !== -1;
    at = bookText.indexOf(highlight.quote, at + 1)
  ) {
    const end = at + highlight.quote.length
    if (bookText.endsWith(highlight.prefix, at) && bookText.startsWith(highlight.suffix, end)) {
      return at
    }
    if (firstAt === -1) {
      firstAt = at
    }
  }
  return firstAt
}

type Located = { highlight: Highlight; start: number; end: number }
let located: Located[] = []

const paint = () => {
  located = []
  for (const highlight of marks.highlights) {
    const start = locate(highlight)
    if (start !== -1) {
      located.push({ highlight, start, end: start + highlight.quote.length })
    }
  }
  for (const color of COLORS) {
    const ranges = located
      .filter((item) => item.highlight.color === color)
      .map((item) => rangeOf(item.start, item.end))
    CSS.highlights.set(`mark-${color}`, new Highlight(...ranges))
  }
}

const unpaint = () => {
  for (const color of COLORS) {
    CSS.highlights.delete(`mark-${color}`)
  }
}

// The position is the first paragraph or heading in view, not scrollTop: it stays put when the
// window width or the font changes.
const blocks = () => Array.from(reader.value!.querySelectorAll<HTMLElement>('p, h2, h3'))

const firstVisibleBlock = () => {
  const top = reader.value!.getBoundingClientRect().top
  return blocks().findIndex((block) => block.getBoundingClientRect().bottom > top)
}

const restorePosition = () => {
  const block = blocks()[marks.position.block]
  if (block) {
    reader.value!.scrollTop +=
      block.getBoundingClientRect().top - reader.value!.getBoundingClientRect().top
  }
}

const savePosition = () => {
  // A scroll can still arrive after the book is closed, and then its timer fires with no reader.
  if (!marksBook) {
    return
  }
  const block = firstVisibleBlock()
  if (block !== -1 && block !== marks.position.block) {
    marks.position = { block }
    saveMarks()
  }
}

let positionTimer: ReturnType<typeof setTimeout> | undefined
// Leaving the book before the delay is up still saves where it was left.
const flushPosition = () => {
  if (positionTimer === undefined) {
    return
  }
  clearTimeout(positionTimer)
  positionTimer = undefined
  savePosition()
}

type Toolbar = {
  top: number
  left: number
  selection?: { start: number; end: number }
  hit?: Located
}
const toolbar = shallowRef<Toolbar | null>(null)

const onScroll = () => {
  toolbar.value = null
  clearTimeout(positionTimer)
  positionTimer = setTimeout(() => {
    positionTimer = undefined
    savePosition()
  }, POSITION_SAVE_DELAY_MS)
}

const toolbarAt = (rect: DOMRect, target: Pick<Toolbar, 'selection' | 'hit'>): Toolbar => {
  const box = frame.value!.getBoundingClientRect()
  const above = rect.top - box.top - 40
  return {
    top: above > 0 ? above : rect.bottom - box.top + 8,
    left: rect.left - box.left + rect.width / 2,
    ...target,
  }
}

// A selection offers the colors; a click inside a highlight offers recoloring and removal.
const onSelect = () => {
  const selection = document.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  if (!marksBook || !range || !reader.value!.contains(range.commonAncestorContainer)) {
    toolbar.value = null
    return
  }
  let start = offsetOf(range.startContainer, range.startOffset)
  let end = offsetOf(range.endContainer, range.endOffset)
  while (start < end && /\s/.test(bookText[start])) {
    start++
  }
  while (end > start && /\s/.test(bookText[end - 1])) {
    end--
  }
  if (start < end) {
    toolbar.value = toolbarAt(range.getBoundingClientRect(), { selection: { start, end } })
    return
  }
  const hit = located.find((item) => item.start <= start && start < item.end)
  toolbar.value = hit
    ? toolbarAt(rangeOf(hit.start, hit.end).getBoundingClientRect(), { hit })
    : null
}

const finishMarking = () => {
  toolbar.value = null
  document.getSelection()?.removeAllRanges()
  paint()
  saveMarks()
}

const mark = (color: Color) => {
  const { selection, hit } = toolbar.value ?? {}
  if (hit) {
    hit.highlight.color = color
  } else if (selection) {
    const { start, end } = selection
    marks.highlights.push({
      color,
      quote: bookText.slice(start, end),
      prefix: bookText.slice(Math.max(0, start - CONTEXT), start),
      suffix: bookText.slice(end, end + CONTEXT),
    })
  }
  finishMarking()
}

const unmark = () => {
  const removed = toolbar.value?.hit?.highlight
  marks.highlights = marks.highlights.filter((highlight) => highlight !== removed)
  finishMarking()
}

const closeBook = () => {
  flushPosition()
  toolbar.value = null
  unpaint()
  marks = emptyMarks()
  marksBook = ''
}

onBeforeUnmount(closeBook)

const loadFb2 = async () => {
  status.value = 'loading…'
  bookHtml.value = ''
  try {
    const res = await fetch(src.value)
    if (!res.ok || !res.body) {
      throw new Error(`fetch ${res.status}`)
    }

    const buffer = isGzipped()
      ? await new Response(
          res.body.pipeThrough(new DecompressionStream('gzip') as any),
        ).arrayBuffer()
      : await res.arrayBuffer()

    bookHtml.value = fb2ToHtml(decodeFb2(buffer))
    status.value = `${Math.round(buffer.byteLength / 1024)} KB`
    await nextTick()
    indexText()
    marks = await loadMarks(props.asset.name)
    marksBook = props.asset.name
    paint()
    restorePosition()
  } catch (error) {
    status.value = `error: ${error instanceof Error ? error.message : String(error)}`
  }
}

const gunzip = (stream: ReadableStream<Uint8Array>) =>
  new Response(stream.pipeThrough(new DecompressionStream('gzip') as any)).text()

const loadText = async () => {
  status.value = 'loading…'
  text.value = ''
  try {
    const res = await fetch(src.value)
    if (!res.ok || !res.body) {
      throw new Error(`fetch ${res.status}`)
    }
    text.value = isGzipped() ? await gunzip(res.body) : await res.text()
    status.value = `${text.value.length.toLocaleString()} chars`
  } catch (error) {
    status.value = `error: ${error instanceof Error ? error.message : String(error)}`
  }
}

const isText = (type: string) => type === 'txt'

watch(
  () => props.asset,
  (asset) => {
    closeBook()
    text.value = ''
    bookHtml.value = ''
    status.value = ''
    filter.value = ''

    if (asset.type === 'fb2') {
      loadFb2()
    } else if (isText(asset.type)) {
      loadText()
    }
  },
  { immediate: true },
)

const lines = computed(() => (text.value ? text.value.split('\n') : []))
const CAP = 1000
const view = computed(() => {
  const query = filter.value.trim().toLowerCase()
  const hits = query
    ? lines.value.filter((line) =>
        line
          .toLowerCase()
          .split(/[^\p{L}\p{N}'’-]+/u)
          .some((word) => word.startsWith(query)),
      )
    : lines.value
  return { total: hits.length, rows: hits.slice(0, CAP) }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <div class="flex shrink-0 items-center gap-2">
      <span class="font-semibold">{{ asset.name }}</span>
      <span class="text-xs opacity-60">{{ status }}</span>
    </div>

    <template v-if="isText(asset.type)">
      <input
        v-model="filter"
        name="bin-filter"
        class="input input-sm input-bordered"
        placeholder="filter lines…"
      />
      <div v-if="lines.length" class="text-xs opacity-60">
        {{ view.total.toLocaleString() }} lines{{
          view.total > CAP ? ` · showing first ${CAP}` : ''
        }}
      </div>
      <pre class="rounded bg-base-200 p-3 text-sm whitespace-pre-wrap">{{
        view.rows.join('\n')
      }}</pre>
    </template>

    <div v-else-if="asset.type === 'fb2'" ref="frame" class="relative flex min-h-0 flex-1 flex-col">
      <div
        ref="reader"
        class="doc fb2 min-h-0 flex-1 overflow-y-auto rounded border border-base-300 p-6"
        @scroll="onScroll"
        @mouseup="onSelect"
        v-html="bookHtml"
      ></div>
      <div
        v-if="toolbar"
        class="absolute z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-base-300 bg-base-100 p-1 shadow"
        :style="{ top: `${toolbar.top}px`, left: `${toolbar.left}px` }"
        @mousedown.prevent
      >
        <button
          v-for="color in COLORS"
          :key="color"
          :class="`mark-${color} size-6 cursor-pointer rounded-full border border-base-300`"
          :title="color"
          @click="mark(color)"
        ></button>
        <button
          v-if="toolbar.hit"
          class="btn btn-circle btn-ghost btn-xs"
          title="remove"
          @click="unmark"
        >
          ✕
        </button>
      </div>
    </div>

    <img
      v-else-if="asset.type === 'image'"
      :src="src"
      :alt="asset.name"
      class="max-w-full rounded"
    />
    <audio v-else-if="asset.type === 'audio'" :src="src" controls class="w-full" />
    <video v-else-if="asset.type === 'video'" :src="src" controls class="max-w-full rounded" />
    <a v-else :href="src" :download="asset.name" class="link link-primary">⬇ {{ asset.name }}</a>
  </div>
</template>

<style>
/* fb2 book content is injected via v-html, so these aren't scoped. Typography comes from .doc. */
.fb2 img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1em auto;
}
.fb2-author {
  font-style: italic;
  text-align: right;
  opacity: 0.8;
}
.fb2-poem {
  margin: 0.8em 0;
  padding-left: 1.5em;
  font-style: italic;
}
.fb2-stanza {
  margin: 0.6em 0;
}
:root {
  --mark-green: #bbf7d0;
  --mark-coral: #ffc4b2;
}
::highlight(mark-green),
.mark-green {
  background-color: var(--mark-green);
}
::highlight(mark-coral),
.mark-coral {
  background-color: var(--mark-coral);
}
</style>
