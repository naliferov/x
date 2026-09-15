import fs from 'node:fs/promises'
import path from 'node:path'
import { getDirname } from './path.ts'

const currentDir = getDirname(import.meta.url)
const LOCKS_DIR = path.join(currentDir, '..')

const lockPath = (name) => path.join(LOCKS_DIR, `${name}.lock`)

const POLL_MS = 500

const waitForUnlock = async (name) => {
  const file = lockPath(name)
  while (true) {
    try {
      await fs.access(file)
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    } catch {
      break
    }
  }
}

export const withLock = async (name, fn) => {
  const file = lockPath(name)

  await waitForUnlock(name)
  await fs.writeFile(file, String(process.pid))

  try {
    return await fn()
  } finally {
    await fs.unlink(file).catch(() => {})
  }
}
