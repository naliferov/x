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

// Each job fires a TASK (runtime/tasks/<task>.ts) on an interval or a cron-like
// schedule. The scheduler itself runs as a SERVICE — see runtime/services/scheduler.ts.
type Job = {
  id: string
  task: string
  schedule?: { hour: number | '*'; minute: number | '*' }
  activeHours?: { from: number; to: number }
  intervalMs?: number
  args?: unknown[]
}
// No scheduled jobs at the moment. Add one here (id + task + schedule) to run a runtime/tasks/*.ts
// on a cadence — that's the runtime's own instrument, not a system cron.
const jobs: Job[] = []

// One pass: run every job that's due now. Call periodically (cron) or via the loop below.
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

// The scheduler as a long-running SERVICE: tick forever, running due tasks each
// tick. This is what runtime/services/scheduler.ts spawns (node runtime/cli.ts scheduler-loop),
// replacing an external cron that called start-scheduler.
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
