<script setup lang="ts">
// Desktop notification every 50 minutes, so I don't sit too long. Asks for the permission on open
// and starts once it is granted. The deadline lives in localStorage, so a reload or coming back from
// another node continues the same period; while the script is not open, nothing fires.
import { ref, computed, onMounted, onUnmounted } from 'vue'

const PERIOD_MS = 50 * 60 * 1000
const STORE_KEY = 'x.timer' // deadline of the running period, ms since epoch

const permission = ref<NotificationPermission>('default')
const deadline = ref(0)
const now = ref(0)
let tick: number | undefined
let unmounted = false

const countdown = computed(() => {
  const seconds = Math.ceil((deadline.value - now.value) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

const startPeriod = () => {
  deadline.value = Date.now() + PERIOD_MS
  localStorage.setItem(STORE_KEY, String(deadline.value))
}

const step = () => {
  now.value = Date.now()
  if (now.value < deadline.value) {
    return
  }
  new Notification('50 minutes')
  startPeriod()
}

onMounted(async () => {
  permission.value = await Notification.requestPermission()
  // The prompt outlives the script: opening another node while it is up unmounts this one first.
  if (permission.value !== 'granted' || unmounted) {
    return
  }
  const storedDeadline = Number(localStorage.getItem(STORE_KEY))
  if (storedDeadline) {
    deadline.value = storedDeadline
  } else {
    startPeriod()
  }
  step()
  tick = window.setInterval(step, 1000)
})

onUnmounted(() => {
  unmounted = true
  clearInterval(tick)
})
</script>

<template>
  <span v-if="permission === 'granted'" class="font-mono text-6xl">{{ countdown }}</span>
  <p v-else class="opacity-60">
    notifications are not allowed: allow them for this site and reload
  </p>
</template>
