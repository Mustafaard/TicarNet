import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_FILE = fileURLToPath(import.meta.url)
const SCRIPT_DIR = path.dirname(SCRIPT_FILE)
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..')
const BACKUP_ROOT = path.resolve(PROJECT_ROOT, 'backups')
const ROLLING_BACKUP_DIR = 'project-rolling'
const LEGACY_BACKUP_PREFIX = 'project-backup-'
const BACKUP_KEEP_COUNT = 1
const BACKUP_LOCK_FILE = path.resolve(BACKUP_ROOT, `${ROLLING_BACKUP_DIR}.lock`)
const BACKUP_LOCK_WAIT_MS = 20_000
const BACKUP_LOCK_RETRY_DELAY_MS = 120
const BACKUP_LOCK_STALE_MS = 120_000

const ROOT_DIR_TARGETS = [
  'src',
  'public',
  'scripts',
  'docs',
  'server/src',
]

const ROOT_FILE_TARGETS = [
  '.env.production.example',
  'package.json',
  'package-lock.json',
  'README.md',
  'CALISTIRMA.md',
  'index.html',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'eslint.config.js',
  'capacitor.config.json',
  'ecosystem.config.cjs',
  'server/.env.example',
]

const EXCLUDED_SERVER_DATA_DIRS = new Set([
  'backups',
  'corrupt',
  'tmp-session-test',
])

const EMPTY_DB_TEMPLATE = {
  users: [],
  passwordResetTokens: [],
  accountDeletionRequests: [],
  gameProfiles: [],
  marketState: null,
  chatState: {
    rooms: {
      global: [],
      trade: [],
      clan: [],
    },
    userMeta: {},
  },
  directMessages: [],
  deletedAnnouncements: [],
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true })
}

function isRetryableRemoveError(error) {
  const code = String(error?.code || '').trim()
  return code === 'EPERM' || code === 'EACCES' || code === 'EBUSY'
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isProcessAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function readJsonFileSafe(targetPath) {
  try {
    const raw = await fs.readFile(targetPath, 'utf8')
    const parsed = JSON.parse(String(raw || '{}'))
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

async function removeBackupLockFileSafe() {
  try {
    await fs.rm(BACKUP_LOCK_FILE, { force: true })
  } catch {
    // best-effort lock cleanup
  }
}

async function acquireBackupLock(options = {}) {
  await ensureDir(BACKUP_ROOT)
  const startedAt = Date.now()
  const token = crypto.randomUUID()
  const trigger = String(options.trigger || 'manual').trim() || 'manual'

  while (Date.now() - startedAt <= BACKUP_LOCK_WAIT_MS) {
    const payload = {
      token,
      pid: process.pid,
      trigger,
      acquiredAt: new Date().toISOString(),
    }

    try {
      await fs.writeFile(
        BACKUP_LOCK_FILE,
        `${JSON.stringify(payload, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' },
      )
      return payload
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error
      }
    }

    const existing = await readJsonFileSafe(BACKUP_LOCK_FILE)
    const existingPid = Number(existing?.pid || 0)
    const lockStartedMs = Date.parse(String(existing?.acquiredAt || ''))
    const lockAgeMs = Number.isFinite(lockStartedMs)
      ? Date.now() - lockStartedMs
      : Number.POSITIVE_INFINITY
    const isStale = !isProcessAlive(existingPid) || lockAgeMs > BACKUP_LOCK_STALE_MS

    if (isStale) {
      await removeBackupLockFileSafe()
      continue
    }

    await wait(BACKUP_LOCK_RETRY_DELAY_MS)
  }

  throw new Error(`Backup lock timeout: ${BACKUP_LOCK_FILE}`)
}

async function releaseBackupLock(lockPayload) {
  const token = String(lockPayload?.token || '').trim()
  if (!token) return

  const existing = await readJsonFileSafe(BACKUP_LOCK_FILE)
  if (String(existing?.token || '').trim() !== token) return
  await removeBackupLockFileSafe()
}

async function removeDirectorySafe(targetPath) {
  let attempt = 0
  while (attempt < 5) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true })
      return true
    } catch (error) {
      if (!isRetryableRemoveError(error) || attempt >= 4) {
        console.warn(`[backup] Eski yedek silinemedi: ${targetPath}`, error)
        return false
      }
      await wait(80 * (attempt + 1))
      attempt += 1
    }
  }
  return false
}

async function copyPathIfExists(sourcePath, targetPath) {
  if (!(await exists(sourcePath))) return
  await ensureDir(path.dirname(targetPath))
  await fs.cp(sourcePath, targetPath, { recursive: true })
}

function sanitizeDbPayload(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') {
    return { ...EMPTY_DB_TEMPLATE }
  }

  const marketState =
    rawValue.marketState &&
    typeof rawValue.marketState === 'object' &&
    Array.isArray(rawValue.marketState.items)
      ? rawValue.marketState
      : null

  return {
    ...rawValue,
    users: [],
    passwordResetTokens: [],
    accountDeletionRequests: [],
    gameProfiles: [],
    directMessages: [],
    deletedAnnouncements: [],
    chatState: {
      rooms: {
        global: [],
        trade: [],
        clan: [],
      },
      userMeta: {},
    },
    marketState,
  }
}

async function writeSanitizedDbFile(sourcePath, targetPath) {
  let payload = { ...EMPTY_DB_TEMPLATE }
  try {
    const raw = await fs.readFile(sourcePath, 'utf8')
    payload = sanitizeDbPayload(JSON.parse(raw))
  } catch {
    payload = { ...EMPTY_DB_TEMPLATE }
  }

  await ensureDir(path.dirname(targetPath))
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function copyServerDataSanitized(backupRootPath) {
  const dataSourceRoot = path.resolve(PROJECT_ROOT, 'server/data')
  if (!(await exists(dataSourceRoot))) return

  const dataTargetRoot = path.resolve(backupRootPath, 'server/data')
  await ensureDir(dataTargetRoot)

  const entries = await fs.readdir(dataSourceRoot, { withFileTypes: true })
  for (const entry of entries) {
    const sourcePath = path.resolve(dataSourceRoot, entry.name)
    const targetPath = path.resolve(dataTargetRoot, entry.name)

    if (entry.isDirectory()) {
      if (EXCLUDED_SERVER_DATA_DIRS.has(entry.name)) continue
      if (entry.name === 'uploads') {
        await ensureDir(path.resolve(targetPath, 'avatars'))
        continue
      }
      await copyPathIfExists(sourcePath, targetPath)
      continue
    }

    if (!entry.isFile()) continue

    if (entry.name === 'db.json' || entry.name === 'db.snapshot.json') {
      await writeSanitizedDbFile(sourcePath, targetPath)
      continue
    }

    await copyPathIfExists(sourcePath, targetPath)
  }
}

async function writeBackupMeta(backupPath, options = {}) {
  const meta = {
    createdAt: new Date().toISOString(),
    trigger: String(options.trigger || 'manual').trim() || 'manual',
    mode: 'rolling-single',
    note: String(options.note || '').trim(),
    keepCount: BACKUP_KEEP_COUNT,
    include: [
      'src',
      'public',
      'scripts',
      'docs',
      'server/src',
      'server/data (sanitize, no account data)',
      'root config files',
    ],
    exclude: [
      'node_modules',
      '.git',
      'dist',
      'project backups directory itself',
      'account data',
      'direct messages',
      'auth tokens',
    ],
  }

  const metaPath = path.resolve(backupPath, 'backup.meta.json')
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
}

async function cleanupLegacyBackups() {
  await ensureDir(BACKUP_ROOT)
  const entries = await fs.readdir(BACKUP_ROOT, { withFileTypes: true })
  const legacyDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(LEGACY_BACKUP_PREFIX))
    .map((entry) => path.resolve(BACKUP_ROOT, entry.name))

  const removed = []
  for (const item of legacyDirs) {
    const deleted = await removeDirectorySafe(item)
    if (deleted) removed.push(item)
  }

  return removed
}

export async function createProjectBackup(options = {}) {
  const safeTrigger = String(options.trigger || 'manual').trim() || 'manual'
  const backupPath = path.resolve(BACKUP_ROOT, ROLLING_BACKUP_DIR)
  const lock = await acquireBackupLock({ trigger: safeTrigger })
  try {
    await ensureDir(BACKUP_ROOT)
    const deletedRolling = await removeDirectorySafe(backupPath)
    if (!(deletedRolling || !(await exists(backupPath)))) {
      throw new Error(`Rolling yedek dizini temizlenemedi: ${backupPath}`)
    }
    await ensureDir(backupPath)

    for (const relativeDir of ROOT_DIR_TARGETS) {
      const sourcePath = path.resolve(PROJECT_ROOT, relativeDir)
      const targetPath = path.resolve(backupPath, relativeDir)
      await copyPathIfExists(sourcePath, targetPath)
    }

    for (const relativeFile of ROOT_FILE_TARGETS) {
      const sourcePath = path.resolve(PROJECT_ROOT, relativeFile)
      const targetPath = path.resolve(backupPath, relativeFile)
      await copyPathIfExists(sourcePath, targetPath)
    }

    await copyServerDataSanitized(backupPath)
    await writeBackupMeta(backupPath, { ...options, trigger: safeTrigger })

    const removedLegacy = await cleanupLegacyBackups()

    return {
      success: true,
      backupPath,
      removed: removedLegacy,
      keepCount: BACKUP_KEEP_COUNT,
      trigger: safeTrigger,
    }
  } finally {
    await releaseBackupLock(lock)
  }
}

async function runCli() {
  const args = process.argv.slice(2)
  const triggerFlagIndex = args.findIndex((entry) => entry === '--trigger')
  const noteFlagIndex = args.findIndex((entry) => entry === '--note')

  const trigger =
    triggerFlagIndex >= 0 && args[triggerFlagIndex + 1]
      ? String(args[triggerFlagIndex + 1]).trim()
      : 'manual-cli'
  const note =
    noteFlagIndex >= 0 && args[noteFlagIndex + 1]
      ? String(args[noteFlagIndex + 1]).trim()
      : ''

  const result = await createProjectBackup({ trigger, note })
  console.log(`[backup] Rolling proje yedegi guncellendi: ${result.backupPath}`)
  if (result.removed.length > 0) {
    console.log(`[backup] Eski otomatik yedekler temizlendi: ${result.removed.length} adet`)
  }
  console.log(`[backup] Korunan yedek sayisi: ${result.keepCount}`)
}

const isDirectRun =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url

if (isDirectRun) {
  runCli().catch((error) => {
    console.error('[backup] Proje yedegi alinamadi:', error)
    process.exitCode = 1
  })
}
