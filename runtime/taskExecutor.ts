import path from 'node:path'
import { getTime } from './lib/time.ts'
import { saveTaskExecution, loadTaskState, saveTaskState } from './storage.ts'
import { getDirname } from './lib/path.ts'

const currentDir = getDirname(import.meta.url)

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000

const runWithTimeout = (fn, ctx, timeoutMs, name) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(`task "${name}" exceeded its ${timeoutMs}ms budget — a task must terminate`),
        ),
      timeoutMs,
    )
    Promise.resolve(fn(ctx)).then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })

export const execute = async (name, args = []) => {
  const taskPath = path.join(currentDir, 'tasks', `${name}.ts`)

  let mod
  try {
    mod = await import(taskPath)
  } catch {
    throw new Error(`Task "${name}" not found`)
  }

  const fn = mod.run
  if (typeof fn !== 'function') {
    throw new Error(`Task "${name}" must export a run function`)
  }
  const timeoutMs = typeof mod.timeoutMs === 'number' ? mod.timeoutMs : DEFAULT_TIMEOUT_MS

  const logs = []
  const ctx = {
    args,
    env: process.env,
    state: {
      load: () => loadTaskState(name),
      save: (state) => saveTaskState(name, state),
    },
    log: (msg) => {
      const line = { time: getTime(), msg }
      logs.push(line)
      console.log(`[${line.time}] ${msg}`)
    },
    time: {
      now: getTime,
    },
  }

  const startedAt = new Date().toISOString()
  const startedMs = Date.now()
  const id = `${startedAt.replace(/[:.]/g, '-').slice(0, 19)}-${name}`
  let result,
    status = 'success',
    error

  await saveTaskExecution({ id, task: name, startedAt, status: 'running', logs })

  try {
    result = await runWithTimeout(fn, ctx, timeoutMs, name)
  } catch (err) {
    status = 'error'
    error = err.message
    ctx.log(`error: ${err.message}`)
  }

  const finishedAt = new Date().toISOString()
  const durationMs = Date.now() - startedMs
  const execution = {
    id,
    task: name,
    startedAt,
    finishedAt,
    durationMs,
    status,
    result,
    logs,
    error,
  }

  await saveTaskExecution(execution)

  return execution
}
