import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), quiet: true })

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
const rollingMetaPath = path.resolve(dataRoot, 'db-rolling.meta.json')

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readText(targetPath) {
  return fs.readFile(targetPath, 'utf8')
}

function parseJson(text, label) {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`${label} JSON obje değil.`)
    }
    return parsed
  } catch (error) {
    throw new Error(`${label} JSON parse edilemedi: ${error.message}`)
  }
}

function counters(db) {
  return {
    users: Array.isArray(db?.users) ? db.users.length : 0,
    profiles: Array.isArray(db?.gameProfiles) ? db.gameProfiles.length : 0,
    announcements: Array.isArray(db?.globalAnnouncements) ? db.globalAnnouncements.length : 0,
  }
}

function hasArg(flag) {
  return process.argv.slice(2).includes(flag)
}

async function readFileSummary(targetPath, label) {
  if (!(await exists(targetPath))) {
    return {
      label,
      path: targetPath,
      exists: false,
      error: `${label} dosyası bulunamadı.`,
      hash: '',
      counters: { users: 0, profiles: 0, announcements: 0 },
      mtimeIso: '',
    }
  }

  try {
    const text = await readText(targetPath)
    const parsed = parseJson(text, label)
    const stat = await fs.stat(targetPath)
    return {
      label,
      path: targetPath,
      exists: true,
      error: '',
      hash: sha256(text),
      counters: counters(parsed),
      mtimeIso: stat.mtime.toISOString(),
    }
  } catch (error) {
    return {
      label,
      path: targetPath,
      exists: true,
      error: String(error?.message || error),
      hash: '',
      counters: { users: 0, profiles: 0, announcements: 0 },
      mtimeIso: '',
    }
  }
}

async function run() {
  const strict = hasArg('--strict')
  const writeMeta = hasArg('--write-meta')

  const dbSummary = await readFileSummary(dbPath, 'Aktif DB')
  const snapshotSummary = await readFileSummary(snapshotPath, 'Snapshot')
  const rollingSummary = await readFileSummary(rollingBackupPath, 'Rolling yedek')

  const errors = []
  const warnings = []

  for (const summary of [dbSummary, snapshotSummary, rollingSummary]) {
    if (!summary.exists) {
      errors.push(`${summary.label}: dosya yok (${summary.path})`)
      continue
    }
    if (summary.error) {
      errors.push(`${summary.label}: ${summary.error}`)
    }
  }

  if (!errors.length) {
    if (dbSummary.hash !== snapshotSummary.hash) {
      warnings.push('Aktif DB ve snapshot içerikleri farklı.')
    }
    if (dbSummary.hash !== rollingSummary.hash) {
      warnings.push('Aktif DB ve rolling yedek içerikleri farklı.')
    }
  }

  const payload = {
    checkedAt: new Date().toISOString(),
    dbPath,
    snapshotPath,
    rollingBackupPath,
    strict,
    ok: errors.length === 0 && (!strict || warnings.length === 0),
    errors,
    warnings,
    files: {
      activeDb: dbSummary,
      snapshot: snapshotSummary,
      rollingBackup: rollingSummary,
    },
  }

  if (writeMeta && rollingSummary.exists && !rollingSummary.error) {
    const metaPayload = {
      verifiedAt: payload.checkedAt,
      rollingBackupPath,
      hash: rollingSummary.hash,
      counters: rollingSummary.counters,
      mtimeIso: rollingSummary.mtimeIso,
      warnings,
    }
    await fs.mkdir(path.dirname(rollingMetaPath), { recursive: true })
    await fs.writeFile(rollingMetaPath, `${JSON.stringify(metaPayload, null, 2)}\n`, 'utf8')
    payload.metaPath = rollingMetaPath
  }

  console.log(JSON.stringify(payload, null, 2))
  if (!payload.ok) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error('[verify-db-backup] Failed:', error)
  process.exitCode = 1
})
