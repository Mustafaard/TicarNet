import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), quiet: true })

const projectRoot = process.cwd()
const RESET_CONFIRM_TOKEN = 'RESET_TICARNET_DATA'
const SECONDARY_CONFIRM_FLAG = '--i-understand-account-loss'

const configuredDbPath = String(process.env.DB_FILE_PATH || '').trim()
const dbPath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.resolve(projectRoot, 'server/data/db.json')
const dataRoot = path.dirname(dbPath)
const snapshotPath = path.resolve(dataRoot, 'db.snapshot.json')
const backupRoot = path.resolve(dataRoot, 'backups')
const rollingBackupPath = path.resolve(backupRoot, 'db-rolling.json')

const configuredUploadRoot = String(process.env.UPLOAD_ROOT_DIR || '').trim()
const uploadsRoot = configuredUploadRoot
  ? path.resolve(configuredUploadRoot)
  : path.resolve(dataRoot, 'uploads')
const configuredAvatarRoot = String(process.env.AVATAR_UPLOAD_DIR || '').trim()
const avatarsRoot = configuredAvatarRoot
  ? path.resolve(configuredAvatarRoot)
  : path.resolve(uploadsRoot, 'avatars')

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

function isResetConfirmed() {
  const args = process.argv.slice(2)
  let hasPrimary = false
  let hasSecondary = false

  for (const arg of args) {
    const safeArg = String(arg || '').trim()
    if (!safeArg) continue
    if (safeArg === `--confirm=${RESET_CONFIRM_TOKEN}`) hasPrimary = true
    if (safeArg === SECONDARY_CONFIRM_FLAG) hasSecondary = true
  }

  const envPrimary = String(process.env.ALLOW_DATA_RESET || '').trim()
  const envSecondary = String(process.env.ALLOW_DATA_RESET_SECONDARY || '').trim().toLowerCase()
  const envPrimaryOk = envPrimary === RESET_CONFIRM_TOKEN
  const envSecondaryOk = envSecondary === 'true' || envSecondary === '1' || envSecondary === 'yes'

  return (hasPrimary && hasSecondary) || (envPrimaryOk && envSecondaryOk)
}

function sanitizeDbPayload(raw) {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_DB }
  return {
    ...raw,
    users: [],
    passwordResetTokens: [],
    accountDeletionRequests: [],
    gameProfiles: [],
    directMessages: [],
    friendRequests: [],
    adminAuditLogs: [],
    adminActionRequests: [],
    deletedAnnouncements: [],
    chatState: {
      rooms: {
        global: [],
        trade: [],
        clan: [],
      },
      userMeta: {},
    },
  }
}

async function backupCurrentDbToRolling() {
  await fs.mkdir(backupRoot, { recursive: true })
  try {
    const raw = await fs.readFile(dbPath, 'utf8')
    if (!String(raw || '').trim()) return ''
    const parsed = JSON.parse(raw)
    const sanitized = sanitizeDbPayload(parsed)
    await fs.writeFile(rollingBackupPath, `${JSON.stringify(sanitized, null, 2)}\n`, 'utf8')
    return rollingBackupPath
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    if (error instanceof SyntaxError) {
      await fs.writeFile(rollingBackupPath, `${JSON.stringify(EMPTY_DB, null, 2)}\n`, 'utf8')
      return rollingBackupPath
    }
    throw error
  }
}

async function resetUploads() {
  await fs.rm(uploadsRoot, { recursive: true, force: true })
  await fs.mkdir(avatarsRoot, { recursive: true })
}

async function writeDbState(payload) {
  const body = `${JSON.stringify(payload, null, 2)}\n`
  await fs.mkdir(dataRoot, { recursive: true })
  await fs.writeFile(dbPath, body, 'utf8')
  await fs.writeFile(snapshotPath, body, 'utf8')
}

async function readCurrentDbState() {
  for (const targetPath of [dbPath, snapshotPath]) {
    try {
      const raw = await fs.readFile(targetPath, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch (error) {
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) {
        continue
      }
      throw error
    }
  }

  return { ...EMPTY_DB }
}

async function resetDatabase() {
  const currentState = await readCurrentDbState()
  const sanitizedState = sanitizeDbPayload(currentState)
  await writeDbState(sanitizedState)
}

async function run() {
  if (!isResetConfirmed()) {
    console.error('[reset] Security lock: command blocked.')
    console.error(
      `[reset] Continue with: npm run data:reset -- --confirm=${RESET_CONFIRM_TOKEN} ${SECONDARY_CONFIRM_FLAG}`,
    )
    console.error(
      `[reset] Or env: ALLOW_DATA_RESET=${RESET_CONFIRM_TOKEN} ALLOW_DATA_RESET_SECONDARY=true npm run data:reset`,
    )
    process.exitCode = 1
    return
  }

  const backupPath = await backupCurrentDbToRolling()
  await resetDatabase()
  await resetUploads()

  console.log(`[reset] Active DB path: ${dbPath}`)
  if (backupPath) {
    console.log(`[reset] Rolling backup updated: ${backupPath}`)
  } else {
    console.log('[reset] Previous DB not found. Empty baseline created.')
  }
  console.log('[reset] Accounts, profiles, messages and uploads have been reset.')
}

run().catch((error) => {
  console.error('[reset] Failed:', error)
  process.exitCode = 1
})
