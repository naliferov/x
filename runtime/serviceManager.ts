import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { getDirname } from './lib/path.ts'
import { getTime } from './lib/time.ts'
import { withLock } from './lib/lock.ts'

const currentDir = getDirname(import.meta.url)
const ROOT_DIR = path.join(currentDir, '..')
const SERVICES_DIR = path.join(currentDir, 'services') // one config file per service
const STATE_DIR = path.join(currentDir, 'state/services') // per-service runtime state + logs
const MAX_LOG_BYTES = 2 * 1024 * 1024 // rotate the log on start once it exceeds 2MB

const statePath = (id) => path.join(STATE_DIR, `${id}.json`)
const logPath = (id) => path.join(STATE_DIR, `${id}.log`)
const lockName = (id) => `service-${id}` // one lock per service, so services never block each other

const loadConfig = async (id) => {
  try {
    const mod = await import(path.join(SERVICES_DIR, `${id}.ts`))
    return { id, ...mod.default }
  } catch {
    return null
  }
}

const listConfigs = async () => {
  let files
  try {
    files = await fsp.readdir(SERVICES_DIR)
  } catch {
    return []
  }
  const ids = files.filter((file) => file.endsWith('.ts')).map((file) => file.slice(0, -3))
  const configs = await Promise.all(ids.map(loadConfig))
  return configs.filter(Boolean)
}

const loadServiceState = async (id) => {
  try {
    return JSON.parse(await fsp.readFile(statePath(id), 'utf-8'))
  } catch {
    return {}
  }
}

const saveServiceState = async (id, rec) => {
  await fsp.mkdir(STATE_DIR, { recursive: true })
  await fsp.writeFile(statePath(id), JSON.stringify(rec, null, 2))
}

const isAlive = (pid) => {
  if (!pid) {
    return false
  }
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const appendLog = async (id, line) => {
  await fsp.mkdir(STATE_DIR, { recursive: true })
  await fsp.appendFile(logPath(id), `${line}\n`)
}

const rotateIfLarge = async (id) => {
  try {
    const { size } = await fsp.stat(logPath(id))
    if (size > MAX_LOG_BYTES) {
      await fsp.rename(logPath(id), `${logPath(id)}.1`)
    }
  } catch {
    /* no log yet */
  }
}

const statusOf = (cfg, rec: any = {}) => {
  const running = isAlive(rec.pid)
  return {
    id: cfg.id,
    cmd: cfg.cmd,
    args: cfg.args ?? [],
    autoRestart: !!cfg.autoRestart,
    running,
    status: running ? 'running' : (rec.status ?? 'stopped'),
    pid: running ? rec.pid : null,
    startedAt: rec.startedAt ?? null,
    stoppedAt: rec.stoppedAt ?? null,
    uptimeMs: running && rec.startedAt ? Date.now() - new Date(rec.startedAt).getTime() : null,
    error: rec.error ?? null,
  }
}

const markFailed = (id, message) =>
  withLock(lockName(id), async () => {
    const rec = await loadServiceState(id)
    await saveServiceState(id, {
      ...rec,
      status: 'failed',
      pid: null,
      error: message,
      stoppedAt: getTime(),
    })
  })

export const listServices = async () => {
  const configs = await listConfigs()
  return Promise.all(configs.map(async (cfg) => statusOf(cfg, await loadServiceState(cfg.id))))
}

export const getService = async (id) => {
  const cfg = await loadConfig(id)
  if (!cfg) {
    throw new Error(`No service config "${id}"`)
  }
  return statusOf(cfg, await loadServiceState(id))
}

export const startService = (id) =>
  withLock(lockName(id), async () => {
    const cfg = await loadConfig(id)
    if (!cfg) {
      throw new Error(`No service config "${id}"`)
    }

    const rec = await loadServiceState(id)
    if (isAlive(rec.pid)) {
      return statusOf(cfg, rec)
    }

    await fsp.mkdir(STATE_DIR, { recursive: true })
    await rotateIfLarge(id)

    const cwd = cfg.cwd ? path.resolve(ROOT_DIR, cfg.cwd) : ROOT_DIR
    const out = fs.openSync(logPath(id), 'a')
    fs.writeSync(
      out,
      `\n[${getTime()}] --- start: ${cfg.cmd} ${(cfg.args ?? []).join(' ')} (cwd ${cwd}) ---\n`,
    )

    let child
    try {
      child = spawn(cfg.cmd, cfg.args ?? [], {
        cwd,
        env: { ...process.env, ...(cfg.env ?? {}) },
        detached: true, // own process group, so it outlives this process
        stdio: ['ignore', out, out], // write straight to the log fd (survives our exit)
      })
    } finally {
      fs.closeSync(out) // the child kept its own dup of the fd
    }

    child.on('error', (err) => {
      appendLog(id, `[${getTime()}] --- spawn error: ${err.message} ---`).catch(() => {})
      markFailed(id, err.message).catch(() => {})
    })

    if (!child.pid) {
      const failed = { pid: null, status: 'failed', error: 'spawn failed', stoppedAt: getTime() }
      await saveServiceState(id, failed)
      return statusOf(cfg, failed)
    }

    child.unref()
    const started = {
      pid: child.pid,
      status: 'running',
      startedAt: getTime(),
      stoppedAt: null,
      error: null,
    }
    await saveServiceState(id, started)
    return statusOf(cfg, started)
  })

export const stopService = (id, { graceMs = 3000 } = {}) =>
  withLock(lockName(id), async () => {
    const cfg = await loadConfig(id)
    if (!cfg) {
      throw new Error(`No service config "${id}"`)
    }

    const rec = await loadServiceState(id)
    const pid = rec.pid

    if (!isAlive(pid)) {
      const stopped = { ...rec, status: 'stopped', pid: null, stoppedAt: getTime() }
      await saveServiceState(id, stopped)
      return statusOf(cfg, stopped)
    }

    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      /* already gone */
    }

    const deadline = Date.now() + graceMs
    while (Date.now() < deadline && isAlive(pid)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    let signal = 'SIGTERM'
    if (isAlive(pid)) {
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {
        /* already gone */
      }
      signal = 'SIGKILL'
    }

    await appendLog(id, `[${getTime()}] --- stop (${signal}) ---`)
    const stopped = { ...rec, status: 'stopped', pid: null, stoppedAt: getTime() }
    await saveServiceState(id, stopped)
    return statusOf(cfg, stopped)
  })

export const restartService = async (id) => {
  await stopService(id)
  return startService(id)
}

export const readLog = async (id, { lines = 200 } = {}) => {
  if (!(await loadConfig(id))) {
    throw new Error(`No service config "${id}"`)
  }
  try {
    const raw = await fsp.readFile(logPath(id), 'utf-8')
    return raw.split('\n').slice(-lines).join('\n')
  } catch {
    return ''
  }
}

export const clearLog = async (id) => {
  if (!(await loadConfig(id))) {
    throw new Error(`No service config "${id}"`)
  }
  await fsp.writeFile(logPath(id), '')
}
