// Frontend dev server (Vite, port 5173). Runs `npm run dev` in frontend/ and
// proxies /api to the api service on port 3001 (started separately — see
// runtime/services/api.ts).
export default {
  cmd: 'npm',
  args: ['run', 'dev'],
  cwd: 'frontend', // relative to repo root
}
