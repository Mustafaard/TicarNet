import { execFileSync } from 'node:child_process'
import process from 'node:process'

const TARGET_PORTS = [5173, 8787]

function execText(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

function findWindowsPidsForPort(port) {
  const output = execText('netstat', ['-ano', '-p', 'tcp'])
  if (!output) return []

  const pids = new Set()
  const suffix = `:${port}`

  for (const line of output.split(/\r?\n/)) {
    const row = line.trim()
    if (!row || !row.startsWith('TCP')) continue

    const parts = row.split(/\s+/)
    if (parts.length < 5) continue

    const localAddress = parts[1]
    const state = String(parts[3] || '').toUpperCase()
    const pid = Number(parts[4])

    if (!Number.isFinite(pid) || pid <= 0) continue
    if (state !== 'LISTENING') continue
    if (!String(localAddress || '').endsWith(suffix)) continue

    pids.add(pid)
  }

  return [...pids]
}

function findUnixPidsForPort(port) {
  const output = execText('lsof', ['-ti', `:${port}`])
  if (!output) return []

  return output
    .split(/\r?\n/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
}

function killWindowsPid(pid) {
  try {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function killUnixPid(pid) {
  try {
    process.kill(pid, 'SIGTERM')
    return true
  } catch {
    return false
  }
}

function run() {
  const isWindows = process.platform === 'win32'
  const allPids = new Set()

  for (const port of TARGET_PORTS) {
    const pids = isWindows ? findWindowsPidsForPort(port) : findUnixPidsForPort(port)
    for (const pid of pids) allPids.add(pid)
  }

  if (allPids.size === 0) {
    console.log(`[dev:prepare] portlar temiz: ${TARGET_PORTS.join(', ')}`)
    return
  }

  let closedCount = 0
  for (const pid of allPids) {
    const closed = isWindows ? killWindowsPid(pid) : killUnixPid(pid)
    if (closed) closedCount += 1
  }

  console.log(`[dev:prepare] kapatilan process sayisi: ${closedCount}`)
}

run()
