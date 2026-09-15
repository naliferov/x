import fs from 'node:fs/promises'
import path from 'node:path'
import { getDirname } from './lib/path.ts'

const currentDir = getDirname(import.meta.url)
const TASK_EXECUTIONS_DIR = path.join(currentDir, 'state', 'taskExecutions') // task-run records, under runtime/state/
const MAX_TASK_EXECUTIONS = 500

export const saveTaskExecution = async (execution) => {
  await fs.mkdir(TASK_EXECUTIONS_DIR, { recursive: true })
  const filePath = path.join(TASK_EXECUTIONS_DIR, `${execution.id}.json`)
  await fs.writeFile(filePath, JSON.stringify(execution, null, 2))
  await rotateTaskExecutions()
  return execution.id
}

const rotateTaskExecutions = async () => {
  const files = (await fs.readdir(TASK_EXECUTIONS_DIR)).sort()
  if (files.length > MAX_TASK_EXECUTIONS) {
    for (const fileName of files.slice(0, files.length - MAX_TASK_EXECUTIONS)) {
      await fs.unlink(path.join(TASK_EXECUTIONS_DIR, fileName))
    }
  }
}

export const listTaskExecutions = async () => {
  await fs.mkdir(TASK_EXECUTIONS_DIR, { recursive: true })
  const files = await fs.readdir(TASK_EXECUTIONS_DIR)

  return files
    .sort()
    .reverse()
    .map((fileName) => {
      const base = fileName.replace('.json', '')
      const dateStr = base.slice(0, 19).replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3')
      const name = base.slice(20)
      return { id: base, name, timestamp: new Date(dateStr).getTime() }
    })
}

const STATE_DIR = path.join(currentDir, 'state')
const taskStatePath = (name) => path.join(STATE_DIR, 'tasks', `${name}.json`)

export const loadTaskState = async (name) => {
  try {
    const raw = await fs.readFile(taskStatePath(name), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export const saveTaskState = async (name, state) => {
  const file = taskStatePath(name)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(state, null, 2))
}
