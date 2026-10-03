// Writes to frontend/data go straight to x.js (repo root, `node --watch x.js`), not through the dev
// server. Dev only: the static build has no x.js behind it.
const xUrl = 'http://localhost:3000'

const post = async (route: string, name: string, ext: 'md' | 'txt' | 'json', body?: string) => {
  let res: Response
  try {
    res = await fetch(`${xUrl}/${route}?name=${encodeURIComponent(name)}&ext=${ext}`, {
      method: 'POST',
      body,
    })
  } catch {
    throw new Error('x.js is not reachable on :3000, start it: node --watch x.js')
  }
  if (!res.ok) {
    throw new Error((await res.json()).error)
  }
}

export const saveData = (name: string, ext: 'md' | 'txt' | 'json', body: string) =>
  post('__save', name, ext, body)

export const deleteData = (name: string, ext: 'md' | 'txt' | 'json') => post('__delete', name, ext)
