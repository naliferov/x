// do-droplet-up — provision the x VPS from scratch, end to end.
//
//   node runtime/cli.ts run do-droplet-up [region] [size]
//
// Steps (each logged via ctx.log):
//   1. pick the latest Ubuntu image
//   2. create the droplet (DO injects the "macbook air" SSH key)
//   3. wait until it's active and has a public IP
//   4. wait until sshd answers
//   5. let DO's base cloud-init finish (avoids apt-lock contention)
//   6. install latest Node.js (NodeSource "current") + git
//   7. clone the repo into /root/x (repo keeps its real name — not "clone")
//   8. verify node -v and the clone, save state
//
// Auth: the DigitalOcean token in mcp-servers/digitalocean-mcp/.env (loaded by do-api.js).
// SSH:  uses the local default key (~/.ssh/id_ed25519 = the DO "macbook air" key).
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  createDroplet,
  getDroplet,
  latestUbuntuImage,
} from '../../mcp-servers/digitalocean-mcp/do-api.js'

const execFileAsync = promisify(execFile)
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const NAME = 'x-vps'
const SSH_KEY_ID = 53064860 // DO key "macbook air"
const REPO = 'https://github.com/naliferov/x'

// Disposable boxes get a fresh host key each rebuild, so skip host-key checking
// rather than fight known_hosts collisions.
const SSH_OPTS = [
  '-o',
  'StrictHostKeyChecking=no',
  '-o',
  'UserKnownHostsFile=/dev/null',
  '-o',
  'ConnectTimeout=20',
  '-o',
  'LogLevel=ERROR',
]

const ssh = async (ip, command, timeout = 300000) => {
  const { stdout } = await execFileAsync('ssh', [...SSH_OPTS, `root@${ip}`, command], {
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  })
  return stdout.trim()
}

async function waitForActive(id) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const droplet = await getDroplet(id)
    const publicIp = droplet.ipv4.find((network) => network.type === 'public')?.ip
    if (droplet.status === 'active' && publicIp) {
      return publicIp
    }
    await sleep(5000)
  }
  throw new Error('droplet did not become active within ~5 min')
}

async function waitForSsh(ip) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await ssh(ip, 'true', 20000)
      return
    } catch {
      await sleep(5000)
    }
  }
  throw new Error('ssh did not become reachable within ~3 min')
}

export const run = async (ctx) => {
  const region = ctx.args[0] || 'fra1'
  const size = ctx.args[1] || 's-1vcpu-512mb-10gb'

  ctx.log(`picking latest Ubuntu image…`)
  const image = await latestUbuntuImage()
  ctx.log(`image: ${image}`)

  ctx.log(`creating droplet ${NAME} (${region}, ${size})…`)
  const droplet = await createDroplet({
    name: NAME,
    region,
    size,
    image,
    ssh_keys: [SSH_KEY_ID],
  })
  ctx.log(`created droplet id=${droplet.id}`)

  ctx.log(`waiting for droplet to become active…`)
  const ip = await waitForActive(droplet.id)
  ctx.log(`active — public ip=${ip}`)

  ctx.log(`waiting for ssh…`)
  await waitForSsh(ip)
  ctx.log(`ssh ready`)

  ctx.log(`waiting for cloud-init to finish (base image)…`)
  await ssh(ip, 'cloud-init status --wait || true')

  ctx.log(`installing Node.js (current) + git…`)
  await ssh(
    ip,
    'curl -fsSL https://deb.nodesource.com/setup_current.x | bash - && ' +
      'DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs git',
  )
  const nodeVersion = await ssh(ip, 'node -v')
  ctx.log(`node installed: ${nodeVersion}`)

  ctx.log(`cloning ${REPO} into /root/x…`)
  await ssh(ip, `cd /root && rm -rf x && git clone ${REPO}`)
  ctx.log(`clone done (/root/x)`)

  const result = {
    id: droplet.id,
    name: NAME,
    region,
    size,
    image,
    ip,
    node: nodeVersion,
    repoDir: '/root/x',
    provisionedAt: ctx.time.now(),
  }
  ctx.state.save(result)
  ctx.log(`provisioned ✓  ssh root@${ip}`)
  return result
}
