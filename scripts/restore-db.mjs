import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), quiet: true })

const RESTORE_CONFIRM_TOKEN = 'RESTORE_TICARNET_DB'
const SECONDARY_CONFIRM_FLAG = '--i-understand-overwrite'

const configuredDbPath = String(process.env.DB_FILE_PATH || '').trim()
const dbPath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.resolve(process.cwd(), 'server/data/db.json')
const dataRoot = path.dirname(dbPath)
const snapshotPath = path.resolve(dataRoot, 'db.snapshot.json')
const backupRoot = path.resolve(dataRoot, 'backups')
const rollingBackupPath = String(process.env.DB_ROLLING_BACKUP_FILE_PATH || '').trim()
  ? path.resolve(String(process.env.DB_ROLLING_BACKUP_FILE_PATH || '').trim())
  : path.resolve(backupRoot, 'db-rolling.json')
const preRestorePath = path.resolve(backupRoot, 'db-pre-restore.json')

const EMPTY_DB = {
  users: [],
  passwordResetTokens: [],
  accountDeletionRequests: [],
  gameProfiles: [],
  marketState: null,
  forexState: null,
  globalAnnouncements: [],
  chatState: {
    rooms: {
      global: [],
      trade: [],
      clan: [],
    },
    userMeta: {},
  },
  directMessages: [],
  friendRequests: [],
  adminAuditLogs: [],
  adminActionRequests: [],
  deletedAnnouncements: [],
}

function isRestoreConfirmed() {
  const args = process.argv.slice(2)
  const hasPrimary = args.includes(`--confirm=${RESTORE_CONFIRM_TOKEN}`)
  const hasSecondary = args.includes(SECONDARY_CONFIRM_FLAG)

  const envPrimary = String(process.env.ALLOW_DB_RESTORE || '').trim()
  const envSecondary = String(process.env.ALLOW_DB_RESTORE_SECONDARY || '').trim().toLowerCase()
  const envPrimaryOk = envPrimary === RESTORE_CONFIRM_TOKEN
  const envSecondaryOk = envSecondary === 'true' || envSecondary === '1' || envSecondary === 'yes'

  return (hasPrimary && hasSecondary) || (envPrimaryOk && envSecondaryOk)
}

function parseSourcePathFromArgs() {
  const args = process.argv.slice(2)
  const sourceArg = args.find((entry) => String(entry || '').startsWith('--source='))
  if (!sourceArg) return rollingBackupPath
  const raw = String(sourceArg.split('=').slice(1).join('=') || '').trim()
  return raw ? path.resolve(raw) : rollingBackupPath
}

function normalizeDbShape(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_DB }
  return {
    ...EMPTY_DB,
    ...raw,
    users: Array.isArray(raw.users) ? raw.users : [],
    passwordResetTokens: Array.isArray(raw.passwordResetTokens) ? raw.passwordResetTokens : [],
    accountDeletionRequests: Array.isArray(raw.accountDeletionRequests)
      ? raw.accountDeletionRequests
      : [],
    gameProfiles: Array.isArray(raw.gameProfiles) ? raw.gameProfiles : [],
    globalAnnouncements: Array.isArray(raw.globalAnnouncements) ? raw.globalAnnouncements : [],
    directMessages: Array.isArray(raw.directMessages) ? raw.directMessages : [],
    friendRequests: Array.isArray(raw.friendRequests) ? raw.friendRequests : [],
    adminAuditLogs: Array.isArray(raw.adminAuditLogs) ? raw.adminAuditLogs : [],
    adminActionRequests: Array.isArray(raw.adminActionRequests) ? raw.adminActionRequests : [],
    deletedAnnouncements: Array.isArray(raw.deletedAnnouncements) ? raw.deletedAnnouncements : [],
    chatState: raw.chatState && typeof raw.chatState === 'object'
      ? {
          rooms: raw.chatState.rooms && typeof raw.chatState.rooms === 'object'
            ? raw.chatState.rooms
            : { global: [], trade: [], clan: [] },
          userMeta: raw.chatState.userMeta && typeof raw.chatState.userMeta === 'object'
            ? raw.chatState.userMeta
            : {},
        }
      : {
          rooms: { global: [], trade: [], clan: [] },
          userMeta: {},
        },
  }
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readJsonFile(targetPath) {
  const raw = await fs.readFile(targetPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Geçersiz JSON içeriği: ${targetPath}`)
  }
  return parsed
}

async function backupCurrentDbBeforeRestore() {
  await fs.mkdir(backupRoot, { recursive: true })
  if (!(await fileExists(dbPath))) return ''
  const raw = await fs.readFile(dbPath, 'utf8')
  if (!String(raw || '').trim()) return ''
  await fs.writeFile(preRestorePath, raw, 'utf8')
  return preRestorePath
}

function counters(db) {
  return {
    users: Array.isArray(db?.users) ? db.users.length : 0,
    profiles: Array.isArray(db?.gameProfiles) ? db.gameProfiles.length : 0,
  }
}

async function run() {
  if (!isRestoreConfirmed()) {
    console.error('[restore] Security lock: command blocked.')
    console.error(
      `[restore] Continue with: npm run data:restore -- --confirm=${RESTORE_CONFIRM_TOKEN} ${SECONDARY_CONFIRM_FLAG}`,
    )
    console.error(
      `[restore] Optional source: npm run data:restore -- --confirm=${RESTORE_CONFIRM_TOKEN} ${SECONDARY_CONFIRM_FLAG} --source=${rollingBackupPath}`,
    )
    console.error(
      `[restore] Or env: ALLOW_DB_RESTORE=${RESTORE_CONFIRM_TOKEN} ALLOW_DB_RESTORE_SECONDARY=true npm run data:restore`,
    )
    process.exitCode = 1
    return
  }

  const sourcePath = parseSourcePathFromArgs()
  if (!(await fileExists(sourcePath))) {
    console.error(`[restore] Backup file not found: ${sourcePath}`)
    process.exitCode = 1
    return
  }

  const backupPayload = normalizeDbShape(await readJsonFile(sourcePath))
  const backupPayloadText = `${JSON.stringify(backupPayload, null, 2)}\n`

  const preBackupPath = await backupCurrentDbBeforeRestore()

  await fs.mkdir(dataRoot, { recursive: true })
  await fs.writeFile(dbPath, backupPayloadText, 'utf8')
  await fs.writeFile(snapshotPath, backupPayloadText, 'utf8')

  if (path.resolve(sourcePath) !== path.resolve(rollingBackupPath)) {
    await fs.mkdir(path.dirname(rollingBackupPath), { recursive: true })
    await fs.writeFile(rollingBackupPath, backupPayloadText, 'utf8')
  }

  const restoredCounters = counters(backupPayload)
  console.log(`[restore] Restored from: ${sourcePath}`)
  console.log(`[restore] Active DB path: ${dbPath}`)
  console.log(`[restore] Snapshot path: ${snapshotPath}`)
  console.log(`[restore] Rolling backup path: ${rollingBackupPath}`)
  if (preBackupPath) {
    console.log(`[restore] Previous DB backup updated: ${preBackupPath}`)
  }
  console.log(
    `[restore] Restored state -> users=${restoredCounters.users} profiles=${restoredCounters.profiles}`,
  )
}

run().catch((error) => {
  console.error('[restore] Failed:', error)
  process.exitCode = 1
})
