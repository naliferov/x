// do-droplet-down — destroy the x VPS to stop billing (counterpart to do-droplet-up).
//
//   node runtime/cli.js run do-droplet-down
//
// Finds the droplet(s) named x-vps and deletes them. Logs each key moment.
// Auth: the DigitalOcean token in mcp-servers/digitalocean-mcp/.env (via do-api.js).
import { listDroplets, deleteDroplet } from '../../mcp-servers/digitalocean-mcp/do-api.js'

const NAME = 'x-vps'

export const run = async (ctx) => {
  ctx.log(`looking for droplet "${NAME}"…`)
  const matches = (await listDroplets()).filter((droplet) => droplet.name === NAME)

  if (matches.length === 0) {
    ctx.log(`no droplet named "${NAME}" — already down`)
    return { deleted: false, reason: 'not found' }
  }

  const deleted = []
  for (const droplet of matches) {
    const ip = droplet.ipv4.find((network) => network.type === 'public')?.ip ?? '(no ip)'
    ctx.log(`deleting "${NAME}" id=${droplet.id} ip=${ip}…`)
    await deleteDroplet(droplet.id)
    ctx.log(`deleted id=${droplet.id}`)
    deleted.push({ id: droplet.id, ip })
  }

  ctx.state.save({ deleted, at: ctx.time.now() })
  ctx.log(`done — destroyed ${deleted.length} droplet(s), billing stopped`)
  return { deleted: true, droplets: deleted }
}
