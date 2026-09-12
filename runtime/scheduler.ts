import { execute } from './taskExecutor.ts'
import { loadSchedulerState, saveSchedulerState } from './storage.ts'
import { log } from './lib/log.ts'
import { withLock } from './lib/lock.ts'

const minutes = (count) => count * 60 * 1000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const match = (schedule, date) => {
  if (schedule.hour !== '*' && schedule.hour !== date.getHours()) {
    return false
  }
  if (schedule.minute !== '*' && schedule.minute !== date.getMinutes()) {
    return false
  }
  return true
}

const isActiveHour = (activeHours, date) => {
  const hour = date.getHours()
  return hour >= activeHours.from && hour < activeHours.to
}

type Job = {
  id: string
  task: string
  schedule?: { hour: number | '*'; minute: number | '*' }
  activeHours?: { from: number; to: number }
  intervalMs?: number
  args?: unknown[]
}
const jobs: Job[] = []

export const runScheduler = () =>
  withLock('scheduler', async () => {
    const state = await loadSchedulerState()
    const now = Date.now()
    const date = new Date(now)

    for (const job of jobs) {
      if (job.activeHours && !isActiveHour(job.activeHours, date)) {
        continue
      }

      if (job.intervalMs) {
        const lastRunAt = state[job.id]?.lastRunAt ?? 0
        if (now - lastRunAt < job.intervalMs) {
          continue
        }
      } else if (job.schedule) {
        if (!match(job.schedule, date)) {
          continue
        }
        const lastRunAt = state[job.id]?.lastRunAt ?? 0
        if (now - lastRunAt < minutes(1)) {
          continue
        }
      }

      log(`[scheduler] running ${job.id}`)
      await execute(job.task, job.args)

      state[job.id] = { lastRunAt: now }
      await saveSchedulerState(state)
    }
  })

export const runSchedulerLoop = async ({ tickMs = minutes(1) } = {}) => {
  log(`[scheduler] daemon started (tick ${tickMs}ms)`)
  for (;;) {
    try {
      await runScheduler()
    } catch (err) {
      log(`[scheduler] tick error: ${err.message}`)
    }
    await sleep(tickMs)
  }
}
