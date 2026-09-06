import 'dotenv/config'
import { execute } from './taskExecutor.ts'
import { listTaskExecutions } from './storage.ts'
import { runScheduler, runSchedulerLoop } from './scheduler.ts'
import {
  listServices,
  getService,
  startService,
  stopService,
  restartService,
  readLog,
  clearLog,
} from './serviceManager.ts'

const [command, ...args] = process.argv.slice(2)

const commands = {
  // Run one TASK to completion (finite). See runtime/tasks/.
  run: async () => {
    const [name, ...fnArgs] = args
    if (!name) {
      console.error('Usage: node runtime/cli.ts run <task-name> [args...]')
      process.exit(1)
    }

    const execution = await execute(name, fnArgs)
    console.log(`\nStatus: ${execution.status}`)
  },
  // Run every due task once (call periodically from cron). The long-running
  // equivalent is the `scheduler` SERVICE (scheduler-loop), supervised below.
  'start-scheduler': async () => {
    await runScheduler()
  },
  // The scheduler as a daemon: tick forever, running due tasks. This is what the
  // `scheduler` service runs (runtime/services/scheduler.ts).
  'scheduler-loop': async () => {
    await runSchedulerLoop()
  },
  'list-executions': async () => {
    const executions = await listTaskExecutions()
    if (executions.length === 0) {
      console.log('No executions yet')
      return
    }
    for (const execution of executions) {
      const date = new Date(execution.timestamp)
      const pad = (value) => String(value).padStart(2, '0')
      const formatted = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      console.log(`${formatted}  ${execution.name}  (${execution.id})`)
    }
  },
  // Manage SERVICES — long-running processes. See runtime/services/.
  service: async () => {
    const [sub, id, ...rest] = args
    const fmt = (service) => {
      const dot = service.running ? '●' : '○'
      const pid = service.pid ? `pid ${service.pid}` : ''
      const up = service.uptimeMs != null ? `(${Math.round(service.uptimeMs / 1000)}s)` : ''
      const err = service.error ? `— ${service.error}` : ''
      return `${dot} ${service.id.padEnd(16)} ${service.status.padEnd(8)} ${pid} ${up} ${err}`.trimEnd()
    }
    const requireId = (usage) => {
      if (!id) {
        console.error(usage)
        process.exit(1)
      }
    }

    try {
      switch (sub) {
        case undefined:
        case 'list': {
          const all = await listServices()
          if (all.length === 0) {
            console.log('No services configured')
            return
          }
          for (const service of all) {
            console.log(fmt(service))
          }
          return
        }
        case 'status':
          requireId('Usage: node runtime/cli.ts service status <id>')
          console.log(JSON.stringify(await getService(id), null, 2))
          return
        case 'start':
          requireId('Usage: node runtime/cli.ts service start <id>')
          console.log(fmt(await startService(id)))
          return
        case 'stop':
          requireId('Usage: node runtime/cli.ts service stop <id>')
          console.log(fmt(await stopService(id)))
          return
        case 'restart':
          requireId('Usage: node runtime/cli.ts service restart <id>')
          console.log(fmt(await restartService(id)))
          return
        case 'logs': {
          requireId('Usage: node runtime/cli.ts service logs <id> [lines]')
          const lines = rest[0] ? Number(rest[0]) : 200
          console.log(await readLog(id, { lines }))
          return
        }
        case 'clear-logs':
          requireId('Usage: node runtime/cli.ts service clear-logs <id>')
          await clearLog(id)
          console.log(`Cleared logs for ${id}`)
          return
        default:
          console.error(`Unknown service subcommand: ${sub}`)
          console.error('Subcommands: list, status, start, stop, restart, logs, clear-logs')
          process.exit(1)
      }
    } catch (err) {
      console.error(err.message)
      process.exit(1)
    }
  },
}

const exec = commands[command]
if (!exec) {
  console.error('Usage: node runtime/cli.ts <command> [args...]')
  console.error('Commands:')
  console.error('  run <task-name> [args...]   run a single task to completion')
  console.error('  start-scheduler             run all due tasks once (call from cron)')
  console.error('  scheduler-loop              run the scheduler daemon (the `scheduler` service)')
  console.error('  list-executions             print recent task executions')
  console.error('  service <list|status|start|stop|restart|logs|clear-logs> [id] [lines]')
  process.exit(1)
}

exec()
