// The node API server (runtime/api.ts, port 3001). Runs as its own
// managed SERVICE — detached, so it survives Claude/terminal session exits — with
// output logged to state/services/api.log. Start/stop/inspect via:
//   npm run cli service start api
//   npm run cli service logs api
// The frontend (Vite) only proxies /api here; it does not spawn the server itself.
// Run the TS entry via Node's native type stripping (no build step, no runner dep).
export default {
  cmd: 'node',
  args: ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', 'runtime/api.ts'],
  // cwd defaults to the repo root
}
