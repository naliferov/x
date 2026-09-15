<script lang="ts">
import { ref } from 'vue'
import initial from '../data/phrases.txt?raw'

const source = ref(initial)

if (import.meta.hot) {
  import.meta.hot.on('x:doc', (doc: { name: string; source: string }) => {
    if (doc.name === 'phrases') {
      source.value = doc.source
    }
  })
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

const GENDER: Record<string, string> = {
  ый: 'm',
  ий: 'm',
  ой: 'm',
  ая: 'f',
  яя: 'f',
  ое: 'n',
  ее: 'n',
  ые: 'p',
  ие: 'p',
}
const SHOWN = 30

const canSave = import.meta.env.DEV
const draft = ref('')
const status = ref('')
const seed = ref(Math.floor(Math.random() * 2 ** 31))

const lines = computed(() =>
  source.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean),
)
const phrases = computed(() => new Set(lines.value.map((line) => line.split('→')[0].trim())))

const rank = (pair: string) => {
  let hash = seed.value
  for (const char of pair) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619)
  }
  return hash
}

const crossings = computed(() => {
  const parts = [...phrases.value].flatMap((phrase) => {
    const words = phrase.split(/\s+/)
    const gender = words.length === 2 && GENDER[words[0].slice(-2)]
    return gender ? [{ adjective: words[0], noun: words[1], gender }] : []
  })
  const pairs = new Set(
    parts.flatMap((left) =>
      parts
        .filter((right) => right.gender === left.gender)
        .map((right) => `${left.adjective} ${right.noun}`),
    ),
  )
  return [...pairs]
    .filter((pair) => !phrases.value.has(pair))
    .sort((left, right) => rank(left) - rank(right))
})

const newestFirst = computed(() => [...lines.value].reverse())

const save = async (line: string) => {
  const next = `${[source.value.trimEnd(), line].filter(Boolean).join('\n')}\n`
  try {
    const res = await fetch('/__save-doc?name=phrases&ext=txt', { method: 'POST', body: next })
    if (!res.ok) {
      throw new Error((await res.text()) || `save failed (${res.status})`)
    }
    source.value = next
    status.value = ''
    return true
  } catch (err: any) {
    status.value = err.message
    return false
  }
}

const add = async () => {
  const line = draft.value.trim()
  if (line && (await save(line))) {
    draft.value = ''
  }
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-4">
    <input
      v-if="canSave"
      v-model="draft"
      name="phrase"
      class="input input-bordered w-full"
      placeholder="phrase — Enter"
      @keydown.enter="add"
    />
    <span v-if="status" class="text-sm text-error">{{ status }}</span>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2 text-sm opacity-60">
        crossings {{ Math.min(SHOWN, crossings.length) }} / {{ crossings.length }}
        <button class="btn btn-xs" @click="seed = Math.floor(Math.random() * 2 ** 31)">
          shuffle
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <span v-if="!crossings.length" class="text-sm opacity-60">
          нужны две фразы одного рода «прилагательное существительное»: синий батискаф + мокрый
          бинокль
        </span>
        <button
          v-for="pair in crossings.slice(0, SHOWN)"
          :key="pair"
          class="btn btn-sm btn-outline"
          :disabled="!canSave"
          @click="save(pair)"
        >
          {{ pair }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-sm opacity-60">frontend/data/phrases.txt · {{ lines.length }}</span>
      <div v-for="(line, index) in newestFirst" :key="index">{{ line }}</div>
    </div>
  </div>
</template>
