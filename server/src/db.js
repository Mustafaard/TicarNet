import fs from 'node:fs/promises'
import path from 'node:path'
import { config } from './config.js'

const CHAT_ROOMS = ['global', 'trade', 'clan']
const DEFAULT_CHAT_STATE = {
  rooms: {
    global: [],
    trade: [],
    clan: [],
  },
  userMeta: {},
}

const DEFAULT_DB = {
  users: [],
  passwordResetTokens: [],
  accountDeletionRequests: [],
  supportTickets: [],
  gameProfiles: [],
  marketState: null,
  forexState: null,
  globalAnnouncements: [],
  chatState: DEFAULT_CHAT_STATE,
  directMessages: [],
  friendRequests: [],
  adminAuditLogs: [],
  adminActionRequests: [],
  deletedAnnouncements: [],
}

const DB_DIR_PATH = path.dirname(config.dbFilePath)
const DB_SNAPSHOT_PATH = path.resolve(DB_DIR_PATH, 'db.snapshot.json')
const DB_CORRUPT_DIR = path.resolve(DB_DIR_PATH, 'corrupt')
const DB_BACKUP_DIR = path.resolve(DB_DIR_PATH, 'backups')
const DB_ROLLING_BACKUP_PATH = path.resolve(config.dbRollingBackupFilePath)
const AUTO_BACKUP_PREFIX = 'db-backup-'
const AUTO_BACKUP_SUFFIX = '.json'

let writeQueue = Promise.resolve()
let autoBackupQueue = Promise.resolve()
let backupPolicyReady = false
export const NO_DB_WRITE = Symbol('NO_DB_WRITE')
const RETRIABLE_FS_ERROR_CODES = new Set([
  'EBUSY',
  'EPERM',
  'EACCES',
  'EAGAIN',
  'EMFILE',
  'ENFILE',
  'ETXTBSY',
])
const DB_IO_MAX_RETRIES = 12
const DB_IO_RETRY_BASE_MS = 60
const DB_IO_RETRY_MAX_MS = 1500

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stripUtf8Bom(value) {
  const raw = String(value ?? '')
  if (!raw) return ''
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
}

function timestampTag() {
  const date = new Date()
  const part = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    part(date.getMonth() + 1),
    part(date.getDate()),
    '_',
    part(date.getHours()),
    part(date.getMinutes()),
    part(date.getSeconds()),
  ].join('')
}

function isRetriableFsError(error) {
  return Boolean(error?.code && RETRIABLE_FS_ERROR_CODES.has(error.code))
}

function isAtomicRenameRetryable(error) {
  if (isRetriableFsError(error)) return true
  return String(error?.code || '').trim() === 'ENOENT'
}

async function withDbIoRetry(task, label = 'db-io') {
  let attempt = 0
  while (true) {
    try {
      return await task()
    } catch (error) {
      if (!isRetriableFsError(error) || attempt >= DB_IO_MAX_RETRIES) {
        throw error
      }

      const waitMs =
        Math.min(DB_IO_RETRY_BASE_MS * (2 ** attempt), DB_IO_RETRY_MAX_MS) +
        Math.floor(Math.random() * 40)

      if (config.dbIoRetryLog) {
        console.warn(
          `[DB] ${label} gecici hata (${error.code}). ${attempt + 1}. tekrar ${waitMs}ms sonra denenecek.`,
        )
      }

      await sleep(waitMs)
      attempt += 1
    }
  }
}

async function writeFileAtomic(filePath, content, label = 'write-atomic') {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await withDbIoRetry(async () => {
    await fs.writeFile(tempPath, content, 'utf8')
    try {
      await fs.rename(tempPath, filePath)
      return
    } catch (renameError) {
      if (!isAtomicRenameRetryable(renameError)) throw renameError
    }

    try {
      await fs.rm(filePath, { force: true })
    } catch {
      // best-effort destination cleanup
    }

    try {
      await fs.rename(tempPath, filePath)
      return
    } catch (secondRenameError) {
      if (!isAtomicRenameRetryable(secondRenameError)) throw secondRenameError
    }

    // OneDrive/AV locks can block rename intermittently on Windows.
    // Fallback to direct write keeps persistence working without bubbling transient EPERM.
    await fs.writeFile(filePath, content, 'utf8')
  }, label)

  try {
    await fs.unlink(tempPath)
  } catch {
    // best-effort temp cleanup
  }
}

async function writeSnapshot(content) {
  await writeFileAtomic(DB_SNAPSHOT_PATH, content, 'write-snapshot')
}

async function writeRollingBackup(content) {
  if (!config.dbRollingBackupEnabled) return ''
  if (!String(content || '').trim()) return ''

  const backupDir = path.dirname(DB_ROLLING_BACKUP_PATH)
  await withDbIoRetry(
    () => fs.mkdir(backupDir, { recursive: true }),
    'mkdir-rolling-backup',
  )
  await writeFileAtomic(DB_ROLLING_BACKUP_PATH, content, 'write-rolling-backup')
  return DB_ROLLING_BACKUP_PATH
}

async function ensureSingleBackupMode() {
  if (!config.dbSingleBackupMode) return
  await withDbIoRetry(() => fs.mkdir(DB_BACKUP_DIR, { recursive: true }), 'mkdir-backups')

  const entries = await withDbIoRetry(
    () => fs.readdir(DB_BACKUP_DIR, { withFileTypes: true }),
    'readdir-backups',
  )

  const autoBackups = entries
    .filter((entry) => entry.isFile() && isAutoBackupFileName(entry.name))
    .map((entry) => path.resolve(DB_BACKUP_DIR, entry.name))
    .sort((a, b) => path.basename(b).localeCompare(path.basename(a)))

  if (autoBackups.length > 0 && config.dbRollingBackupEnabled) {
    const latestAutoBackup = autoBackups[0]
    try {
      const raw = await withDbIoRetry(
        () => fs.readFile(latestAutoBackup, 'utf8'),
        'read-latest-auto-backup',
      )
      if (String(raw || '').trim()) {
        await writeRollingBackup(raw)
      }
    } catch {
      // backup migration best-effort
    }
  }

  for (const backupPath of autoBackups) {
    await withDbIoRetry(
      () => fs.rm(backupPath, { force: true }),
      'remove-auto-backup-single-mode',
    )
  }
}

async function ensureBackupPolicy() {
  if (backupPolicyReady) return
  backupPolicyReady = true
  try {
    await ensureSingleBackupMode()
  } catch (error) {
    backupPolicyReady = false
    throw error
  }
}

async function persistCorruptDb(raw) {
  if (!String(raw || '').trim()) return ''
  await withDbIoRetry(
    () => fs.mkdir(DB_CORRUPT_DIR, { recursive: true }),
    'mkdir-corrupt',
  )

  const corruptPath = path.resolve(
    DB_CORRUPT_DIR,
    `db-corrupt-${timestampTag()}.json`,
  )
  await writeFileAtomic(corruptPath, raw, 'write-corrupt')
  return corruptPath
}

async function recoverDbFromSnapshot() {
  try {
    const rawSnapshot = await withDbIoRetry(
      () => fs.readFile(DB_SNAPSHOT_PATH, 'utf8'),
      'read-snapshot',
    )
    const parsedSnapshot = JSON.parse(stripUtf8Bom(rawSnapshot))
    const normalized = normalizeDbShape(parsedSnapshot)
    const payload = JSON.stringify(normalized, null, 2)
    await writeFileAtomic(config.dbFilePath, payload, 'recover-db-from-snapshot')
    await writeRollingBackup(payload)
    return normalized
  } catch {
    return null
  }
}

function hasRecoverableUserState(db) {
  if (!db || typeof db !== 'object') return false
  if (Array.isArray(db.users) && db.users.length > 0) return true
  if (Array.isArray(db.gameProfiles) && db.gameProfiles.length > 0) return true
  if (Array.isArray(db.accountDeletionRequests) && db.accountDeletionRequests.length > 0) return true
  if (Array.isArray(db.supportTickets) && db.supportTickets.length > 0) return true
  if (Array.isArray(db.directMessages) && db.directMessages.length > 0) return true
  if (Array.isArray(db.friendRequests) && db.friendRequests.length > 0) return true
  return false
}

async function recoverDbFromCorruptArchive() {
  try {
    const entries = await withDbIoRetry(
      () => fs.readdir(DB_CORRUPT_DIR, { withFileTypes: true }),
      'readdir-corrupt',
    )

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => path.resolve(DB_CORRUPT_DIR, entry.name))
      .sort((a, b) => path.basename(b).localeCompare(path.basename(a)))

    if (files.length === 0) return null

    let fallback = null

    for (const filePath of files) {
      try {
        const raw = await withDbIoRetry(
          () => fs.readFile(filePath, 'utf8'),
          'read-corrupt-archive',
        )
        const parsed = JSON.parse(stripUtf8Bom(raw))
        const normalized = normalizeDbShape(parsed)

        if (!fallback) {
          fallback = { db: normalized, sourcePath: filePath }
        }
        if (!hasRecoverableUserState(normalized)) continue

        const payload = JSON.stringify(normalized, null, 2)
        await writeFileAtomic(config.dbFilePath, payload, 'recover-db-from-corrupt')
        await writeSnapshot(payload)
        await writeRollingBackup(payload)
        return { db: normalized, sourcePath: filePath, meaningful: true }
      } catch {
        // bozuk arşiv dosyası atlanır
      }
    }

    if (!fallback) return null
    const payload = JSON.stringify(fallback.db, null, 2)
    await writeFileAtomic(config.dbFilePath, payload, 'recover-db-from-corrupt-fallback')
    await writeSnapshot(payload)
    await writeRollingBackup(payload)
    return { ...fallback, meaningful: false }
  } catch {
    return null
  }
}

async function ensureDbFile() {
  await ensureBackupPolicy()

  const dbPath = config.dbFilePath
  const dirPath = path.dirname(dbPath)
  let rawDbForBackup = ''

  await withDbIoRetry(() => fs.mkdir(dirPath, { recursive: true }), 'mkdir')

  try {
    await withDbIoRetry(() => fs.access(dbPath), 'access')
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error
    }
    const initialPayload = JSON.stringify(DEFAULT_DB, null, 2)
    await writeFileAtomic(dbPath, initialPayload, 'create-db')
    await writeSnapshot(initialPayload)
    await writeRollingBackup(initialPayload)
    return
  }

  try {
    await withDbIoRetry(() => fs.access(DB_SNAPSHOT_PATH), 'access-snapshot')
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error
    }

    const rawDb = await withDbIoRetry(
      () => fs.readFile(dbPath, 'utf8'),
      'read-db-for-snapshot',
    )
    rawDbForBackup = rawDb
    await writeSnapshot(rawDb)
  }

  if (!config.dbRollingBackupEnabled) return
  if (!rawDbForBackup) {
    rawDbForBackup = await withDbIoRetry(
      () => fs.readFile(dbPath, 'utf8'),
      'read-db-for-rolling-backup',
    )
  }
  await writeRollingBackup(rawDbForBackup)
}

function isAutoBackupFileName(name) {
  return (
    typeof name === 'string'
    && name.startsWith(AUTO_BACKUP_PREFIX)
    && name.endsWith(AUTO_BACKUP_SUFFIX)
  )
}

async function pruneAutoBackups(keepPath = '', keepCount = 1) {
  const parsedKeepCount = Number(keepCount)
  const normalizedKeepCount = Number.isFinite(parsedKeepCount)
    ? Math.max(0, Math.trunc(parsedKeepCount))
    : 1
  const keepAbsPath = keepPath ? path.resolve(keepPath) : ''

  await withDbIoRetry(() => fs.mkdir(DB_BACKUP_DIR, { recursive: true }), 'mkdir-backups')

  const entries = await withDbIoRetry(
    () => fs.readdir(DB_BACKUP_DIR, { withFileTypes: true }),
    'readdir-backups',
  )

  const backupPaths = entries
    .filter((entry) => entry.isFile() && isAutoBackupFileName(entry.name))
    .map((entry) => path.resolve(DB_BACKUP_DIR, entry.name))
    .sort((a, b) => path.basename(b).localeCompare(path.basename(a)))

  if (normalizedKeepCount === 0) {
    return { kept: backupPaths, removed: [] }
  }

  const kept = []
  const removed = []
  const keepSet = new Set()

  if (keepAbsPath) {
    keepSet.add(keepAbsPath)
    kept.push(keepAbsPath)
  }

  for (const backupPath of backupPaths) {
    if (keepSet.has(backupPath)) continue
    if (kept.length < normalizedKeepCount) {
      keepSet.add(backupPath)
      kept.push(backupPath)
      continue
    }

    await withDbIoRetry(
      () => fs.rm(backupPath, { force: true }),
      'remove-old-backup',
    )
    removed.push(backupPath)
  }

  return { kept, removed }
}

function normalizeChatState(raw) {
  const sourceRooms = raw?.rooms && typeof raw.rooms === 'object' ? raw.rooms : {}
  const rooms = {}

  for (const room of CHAT_ROOMS) {
    const list = Array.isArray(sourceRooms[room]) ? sourceRooms[room] : []
    rooms[room] = list.filter((entry) => entry && typeof entry === 'object').slice(-200)
  }

  return {
    rooms,
    userMeta: raw?.userMeta && typeof raw.userMeta === 'object' ? raw.userMeta : {},
  }
}

function normalizeDbShape(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DB }
  }

  const normalized = {
    ...DEFAULT_DB,
    ...raw,
    users: Array.isArray(raw.users) ? raw.users : [],
    passwordResetTokens: Array.isArray(raw.passwordResetTokens)
      ? raw.passwordResetTokens
      : [],
    accountDeletionRequests: Array.isArray(raw.accountDeletionRequests)
      ? raw.accountDeletionRequests.filter((entry) => entry && typeof entry === 'object')
      : [],
    supportTickets: Array.isArray(raw.supportTickets)
      ? raw.supportTickets
          .filter((entry) => entry && typeof entry === 'object')
          .slice(-5000)
      : [],
    gameProfiles: Array.isArray(raw.gameProfiles) ? raw.gameProfiles : [],
    marketState:
      raw.marketState &&
      typeof raw.marketState === 'object' &&
      Array.isArray(raw.marketState.items)
        ? {
            lastUpdatedAt:
              typeof raw.marketState.lastUpdatedAt === 'string'
                ? raw.marketState.lastUpdatedAt
                : new Date().toISOString(),
            items: raw.marketState.items,
          }
        : null,
    forexState:
      raw.forexState &&
      typeof raw.forexState === 'object' &&
      Array.isArray(raw.forexState.pairs)
        ? raw.forexState
        : null,
    globalAnnouncements: Array.isArray(raw.globalAnnouncements)
      ? raw.globalAnnouncements.filter((entry) => entry && typeof entry === 'object').slice(-400)
      : [],
    chatState: normalizeChatState(raw.chatState),
    directMessages: Array.isArray(raw.directMessages)
      ? raw.directMessages.filter((entry) => entry && typeof entry === 'object').slice(-600)
      : [],
    friendRequests: Array.isArray(raw.friendRequests)
      ? raw.friendRequests.filter((entry) => entry && typeof entry === 'object').slice(-1500)
      : [],
    adminAuditLogs: Array.isArray(raw.adminAuditLogs)
      ? raw.adminAuditLogs.filter((entry) => entry && typeof entry === 'object').slice(-500)
      : [],
    adminActionRequests: Array.isArray(raw.adminActionRequests)
      ? raw.adminActionRequests
          .filter((entry) => entry && typeof entry === 'object')
          .slice(-2000)
      : [],
    deletedAnnouncements: Array.isArray(raw.deletedAnnouncements)
      ? raw.deletedAnnouncements
          .filter((entry) => entry && typeof entry === 'object')
          .slice(-500)
      : [],
  }

  return normalized
}

export async function readDb() {
  await ensureDbFile()
  const raw = await withDbIoRetry(
    () => fs.readFile(config.dbFilePath, 'utf8'),
    'read-db',
  )

  try {
    const parsed = JSON.parse(stripUtf8Bom(raw))
    const normalized = normalizeDbShape(parsed)

    // If db.json is suddenly empty but snapshot still has user state,
    // restore snapshot to avoid accidental account loss after a partial write.
    if (!hasRecoverableUserState(normalized)) {
      try {
        const rawSnapshot = await withDbIoRetry(
          () => fs.readFile(DB_SNAPSHOT_PATH, 'utf8'),
          'read-snapshot-guard',
        )
        const parsedSnapshot = JSON.parse(stripUtf8Bom(rawSnapshot))
        const normalizedSnapshot = normalizeDbShape(parsedSnapshot)
        if (hasRecoverableUserState(normalizedSnapshot)) {
          const payload = JSON.stringify(normalizedSnapshot, null, 2)
          await writeFileAtomic(config.dbFilePath, payload, 'restore-db-from-snapshot-guard')
          await writeRollingBackup(payload)
          return normalizedSnapshot
        }
      } catch {
        // ignore guard failures and return the currently parsed db
      }
    }

    return normalized
  } catch (error) {
    const corruptPath = await persistCorruptDb(raw).catch(() => '')
    const recoveredFromCorrupt = await recoverDbFromCorruptArchive()
    if (recoveredFromCorrupt?.db) {
      const suffix = corruptPath ? ` Bozuk kopya: ${corruptPath}` : ''
      const sourceInfo = recoveredFromCorrupt.sourcePath
        ? ` Kaynak: ${recoveredFromCorrupt.sourcePath}.`
        : ''
      console.warn(`[DB] db.json bozuldu, corrupt arsivinden geri yuklendi.${sourceInfo}${suffix}`)
      return recoveredFromCorrupt.db
    }

    const recovered = await recoverDbFromSnapshot()
    if (recovered) {
      const suffix = corruptPath ? ` Bozuk kopya: ${corruptPath}` : ''
      console.warn(`[DB] db.json bozuldu, snapshot ile geri yuklendi.${suffix}`)
      return recovered
    }

    const suffix = corruptPath ? ` Bozuk kopya: ${corruptPath}` : ''
    const fatal = new Error(
      `[DB] db.json parse edilemedi ve snapshot/corrupt geri yuklenemedi.${suffix}`,
    )
    fatal.cause = error
    throw fatal
  }
}

function dbStateCounters(db) {
  return {
    users: Array.isArray(db?.users) ? db.users.length : 0,
    profiles: Array.isArray(db?.gameProfiles) ? db.gameProfiles.length : 0,
  }
}

function shouldBlockFullUserWipe(previousDb, nextDb) {
  if (!config.dbPreventFullUserWipe) return false
  if (config.dbAllowEmptyUsersWrite) return false

  const prev = dbStateCounters(previousDb)
  const next = dbStateCounters(nextDb)

  const hadAnyUserState = prev.users > 0 || prev.profiles > 0
  if (!hadAnyUserState) return false

  const usersWiped = prev.users > 0 && next.users === 0
  const profilesWiped = prev.profiles > 0 && next.profiles === 0
  return usersWiped && profilesWiped
}

function shouldBlockEmptyUserStateWrite(previousDb, nextDb) {
  if (!config.dbHardStopOnEmptyWrite) return false
  if (config.dbAllowEmptyUsersWrite) return false

  const prev = dbStateCounters(previousDb)
  const next = dbStateCounters(nextDb)

  const hadAnyUserState = prev.users > 0 || prev.profiles > 0
  if (!hadAnyUserState) return false

  return next.users === 0 && next.profiles === 0
}

export async function writeDb(nextDb) {
  await ensureDbFile()
  const payload = JSON.stringify(normalizeDbShape(nextDb), null, 2)
  await writeFileAtomic(config.dbFilePath, payload, 'write-db')
  await writeSnapshot(payload)
  await writeRollingBackup(payload)
}

async function createDbAutoBackupInternal() {
  await ensureDbFile()

  const raw = await withDbIoRetry(
    () => fs.readFile(config.dbFilePath, 'utf8'),
    'read-db-for-backup',
  )
  if (!String(raw || '').trim()) {
    return { backupPath: '', kept: [], removed: [] }
  }

  if (config.dbSingleBackupMode || config.dbRollingBackupEnabled) {
    const backupPath = await writeRollingBackup(raw)
    return { backupPath, kept: backupPath ? [backupPath] : [], removed: [] }
  }

  await withDbIoRetry(() => fs.mkdir(DB_BACKUP_DIR, { recursive: true }), 'mkdir-backups')

  const backupPath = path.resolve(
    DB_BACKUP_DIR,
    `${AUTO_BACKUP_PREFIX}${timestampTag()}${AUTO_BACKUP_SUFFIX}`,
  )
  await writeFileAtomic(backupPath, raw, 'write-db-backup')

  const { kept, removed } = await pruneAutoBackups(
    backupPath,
    config.dbAutoBackupKeepCount,
  )

  return { backupPath, kept, removed }
}

export function createDbAutoBackup() {
  const operation = autoBackupQueue.then(() => createDbAutoBackupInternal())
  autoBackupQueue = operation.catch(() => undefined)
  return operation
}

export function updateDb(mutator) {
  const operation = writeQueue.then(async () => {
    const db = await readDb()
    const beforeDb = JSON.parse(JSON.stringify(normalizeDbShape(db)))
    const result = await mutator(db)
    if (result === NO_DB_WRITE) {
      return db
    }
    const nextDb = normalizeDbShape(result || db)

    if (shouldBlockFullUserWipe(beforeDb, nextDb)) {
      const safePayload = JSON.stringify(beforeDb, null, 2)
      await writeRollingBackup(safePayload).catch(() => '')
      const error = new Error(
        '[DB_GUARD] Kullanici/profil verisi toplu sifirlanmak istendi. Islem engellendi.',
      )
      error.statusCode = 409
      error.reason = 'db_guard_full_user_wipe_blocked'
      throw error
    }

    if (shouldBlockEmptyUserStateWrite(beforeDb, nextDb)) {
      const safePayload = JSON.stringify(beforeDb, null, 2)
      await writeRollingBackup(safePayload).catch(() => '')
      const error = new Error(
        '[DB_GUARD] users=0 ve profiles=0 durumuna yazma talebi engellendi. Acik override olmadan bos veri yazilamaz.',
      )
      error.statusCode = 409
      error.reason = 'db_guard_empty_user_state_write_blocked'
      throw error
    }

    await writeDb(nextDb)
    return nextDb
  })

  writeQueue = operation.catch(() => undefined)
  return operation
}
