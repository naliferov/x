<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { fb2ToHtml, decodeFb2 } from './fb2'

// Renders one bin item by its content type. Files live in frontend/data (fetched on demand). A
// .gz/.gzip suffix is a TRANSPARENT compression layer — inflated in-browser via DecompressionStream
// (see isGzipped), independent of type: both txt and fb2 handle it. fb2 books are parsed + rendered
// with a saved scroll position; images/audio/video get a native element; else a download link.
const props = defineProps<{ asset: { name: string; url: string; type: string } }>()
const src = computed(() => props.asset.url)
const text = ref('')
const bookHtml = ref('')
const status = ref('')
const filter = ref('')

// a trailing .gz/.gzip on the (fingerprinted) url means the bytes are gzip-compressed
const isGzipped = () => /\.(gz|gzip)(\?|$)/i.test(props.asset.url)

// --- reading position: persist a reader's scrollTop per file, restore on reopen ---
const reader = ref<HTMLElement>()
const scrollKey = () => `ocraft.read:${props.asset.name}`
let scrollSaveTimer: ReturnType<typeof setTimeout> | undefined
const onScroll = () => {
  const el = reader.value
  if (!el) return
  clearTimeout(scrollSaveTimer)
  scrollSaveTimer = setTimeout(() => localStorage.setItem(scrollKey(), String(el.scrollTop)), 200)
}
const restoreScroll = () => {
  const saved = Number(localStorage.getItem(scrollKey()) || 0)
  if (reader.value && saved) reader.value.scrollTop = saved
}

const loadFb2 = async () => {
  status.value = 'loading…'
  bookHtml.value = ''
  try {
    const res = await fetch(src.value)
    if (!res.ok || !res.body) throw new Error(`fetch ${res.status}`)
    const buffer = isGzipped()
      ? await new Response(res.body.pipeThrough(new DecompressionStream('gzip') as any)).arrayBuffer()
      : await res.arrayBuffer()
    bookHtml.value = fb2ToHtml(decodeFb2(buffer))
    status.value = `${Math.round(buffer.byteLength / 1024)} KB`
    await nextTick()
    restoreScroll()
  } catch (error) {
    status.value = `error: ${error instanceof Error ? error.message : String(error)}`
  }
}

const gunzip = (stream: ReadableStream<Uint8Array>) =>
  // `as any`: lib.dom types DecompressionStream's pair too strictly for pipeThrough (runtime is fine)
  new Response(stream.pipeThrough(new DecompressionStream('gzip') as any)).text()

const loadText = async () => {
  status.value = 'loading…'
  text.value = ''
  try {
    const res = await fetch(src.value)
    if (!res.ok || !res.body) throw new Error(`fetch ${res.status}`)
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
    text.value = ''
    bookHtml.value = ''
    status.value = ''
    filter.value = ''
    if (asset.type === 'fb2') loadFb2()
    else if (isText(asset.type)) loadText()
  },
  { immediate: true },
)

const lines = computed(() => (text.value ? text.value.split('\n') : []))
const CAP = 1000 // filter first, then cap what we paint
const view = computed(() => {
  // prefix match: the query starts a word on the line, so "кав" hits "кава" but not "заковика"
  const q = filter.value.trim().toLowerCase()
  const hits = q
    ? lines.value.filter((line) =>
        line
          .toLowerCase()
          .split(/[^\p{L}\p{N}'’-]+/u)
          .some((word) => word.startsWith(q)),
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
      <input v-model="filter" name="bin-filter" class="input input-sm input-bordered" placeholder="filter lines…" />
      <div v-if="lines.length" class="text-xs opacity-60">
        {{ view.total.toLocaleString() }} lines{{
          view.total > CAP ? ` · showing first ${CAP}` : ''
        }}
      </div>
      <pre class="rounded bg-base-200 p-3 text-sm whitespace-pre-wrap">{{ view.rows.join('\n') }}</pre>
    </template>

    <div
      v-else-if="asset.type === 'fb2'"
      ref="reader"
      class="doc fb2 min-h-0 flex-1 overflow-y-auto rounded border border-base-300 p-6"
      @scroll="onScroll"
      v-html="bookHtml"
    ></div>

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
</style>
