<script setup lang="ts">
import { ref } from 'vue'
// System prompt lives in the harness doc, loaded offline at build time (no ocraft api needed).
import systemPrompt from '../data/harness.md?raw'

const blocks = ref<{ kind: 'user' | 'model' | 'tool' | 'error'; text: string }[]>([])
const BLOCK_COLOR = {
  user: 'text-base-content font-semibold',
  model: 'text-success',
  tool: 'text-info',
  error: 'text-error',
}
const ctxText = ref(systemPrompt)
const model = ref('opus')
const effort = ref('high')
const prompt = ref('')
const statusText = ref('')
const running = ref(false)
const totals = { calls: 0, tokens: 0, cost: 0 }

// last 10 prompts, persisted to localStorage so they survive reload (F5)
const HISTORY_KEY = 'harness.prompts'
const loadHistory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}
const history = ref<string[]>(loadHistory())
const rememberPrompt = (text: string) => {
  history.value = [text, ...history.value.filter((p) => p !== text)].slice(0, 10)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}
const recallPrompt = (event: Event) => {
  const select = event.target as HTMLSelectElement
  if (select.value) prompt.value = select.value
  select.selectedIndex = 0
}

//CONTEXT
const messages: { role: 'user' | 'assistant' | 'tool'; text: string }[] = []
const PREFIX = { user: 'User: ', assistant: 'Assistant: ', tool: 'Tool results:\n' }

const addBlock = (kind: 'user' | 'model' | 'tool' | 'error') => {
  const block = { kind, text: '' }
  blocks.value.push(block)
  return block
}

// Parse a reply for <tool NAME>…</tool> blocks → [{ name, body }].
const parseToolCalls = (text: string) =>
  [...text.matchAll(/<tool\s+(\w+)>([\s\S]*?)<\/tool>/g)].map((match) => ({
    name: match[1],
    body: match[2].trim(),
  }))

// Run one call in page context. Only `eval` for now.
const runToolCall = ({ name, body }: { name: string; body: string }) => {
  if (name !== 'eval') {
    return `error: unknown tool "${name}"`
  }
  try {
    // eslint-disable-next-line no-eval
    return JSON.stringify((window as any).eval(body))
  } catch (err: any) {
    return `error: ${err.message}`
  }
}

// One request: send the whole history, wait for the full reply, show it, return its text.
const callModel = async () => {
  const promptText = messages.map((message) => PREFIX[message.role] + message.text).join('\n\n')
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: promptText,
      system: ctxText.value || undefined,
      model: model.value || undefined,
      effort: effort.value || undefined,
    }),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  }
  const { text, usage, cost, model: usedModel } = await res.json()
  const { input_tokens, cache_read_input_tokens, cache_creation_input_tokens, output_tokens } = usage

  totals.calls += 1
  totals.tokens += input_tokens + cache_read_input_tokens + cache_creation_input_tokens + output_tokens
  totals.cost += cost ?? 0

  const modelTag = usedModel ? ` · ${usedModel}` : ''
  statusText.value = `${totals.calls} calls · ${totals.tokens} tokens · $${totals.cost.toFixed(4)}${modelTag}`

  addBlock('model').text = text
  return text
}

// Agent loop: call the model, run any tool calls, feed results back, repeat until the
// model's reply has no tool call — that absence is our "done" signal.
const send = async () => {
  const text = prompt.value.trim()
  if (!text) return
  rememberPrompt(text)
  prompt.value = ''
  addBlock('user').text = text

  messages.push({ role: 'user', text })
  running.value = true
  try {
    while (1) {
      const reply = await callModel()
      messages.push({ role: 'assistant', text: reply })
      const calls = parseToolCalls(reply)
      if (!calls.length) break

      const results = calls.map(runToolCall)
      addBlock('tool').text = calls.map((call, i) => `${call.name} ⇒ ${results[i]}`).join('\n')

      messages.push({
        role: 'tool',
        text: results.map((result) => `<result>${result}</result>`).join('\n'),
      })
    }
  } catch (err: any) {
    addBlock('error').text = err.message
  } finally {
    running.value = false
  }
}

const clearHistory = () => {
  messages.length = 0
  blocks.value = []
  statusText.value = 'history cleared'
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-3">
    <textarea
      v-model="ctxText"
      name="system-prompt"
      spellcheck="false"
      class="textarea textarea-bordered min-h-[280px] w-full resize-y font-mono text-[12.5px] whitespace-pre-wrap"
      placeholder="system prompt sent with every request (loaded from the harness doc)"
    ></textarea>

    <div class="min-h-[120px] max-h-[420px] overflow-auto rounded border border-base-300 bg-base-200 p-3 font-mono text-[12.5px] leading-relaxed">
      <div
        v-for="(b, i) in blocks"
        :key="i"
        class="mt-2 first:mt-0 whitespace-pre-wrap break-words"
        :class="BLOCK_COLOR[b.kind]"
      >{{ b.text }}</div>
    </div>
    <div class="flex gap-2">
      <input v-model="model" name="model" class="input input-sm input-bordered w-56" placeholder="model (haiku / sonnet / opus / …)" />
      <input v-model="effort" name="effort" class="input input-sm input-bordered w-36" placeholder="effort (low…max)" />
      <select
        v-if="history.length"
        name="recent-prompts"
        class="select select-sm select-bordered flex-1"
        @change="recallPrompt"
      >
        <option value="">↺ recent prompts ({{ history.length }})</option>
        <option v-for="(p, i) in history" :key="i" :value="p">
          {{ p.length > 80 ? p.slice(0, 80) + '…' : p }}
        </option>
      </select>
    </div>

    <textarea
      v-model="prompt"
      name="prompt"
      spellcheck="false"
      class="textarea textarea-bordered min-h-[70px] w-full resize-y"
      placeholder="prompt — Enter to send, Shift+Enter for newline"
      @keydown.enter.exact.prevent="send"
    ></textarea>
    <div class="flex items-center gap-2">
      <button class="btn btn-sm btn-primary" :disabled="running" @click="send">
        <span v-if="running" class="loading loading-spinner loading-xs"></span>
        {{ running ? 'running…' : 'send' }}
      </button>
      <button class="btn btn-sm" :disabled="running" @click="clearHistory">clear</button>
      <span class="text-sm" :class="running ? 'text-info' : 'opacity-60'">
        {{ running ? 'running…' : statusText }}
      </span>
    </div>
  </div>
</template>
