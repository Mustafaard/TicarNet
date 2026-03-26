import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import process from 'node:process'
import { config } from '../config.js'

const DB_PATH = path.resolve(config.dbFilePath)
const DB_ROOT = path.dirname(DB_PATH)
const SNAPSHOT_PATH = path.resolve(DB_ROOT, 'db.snapshot.json')
const ROLLING_BACKUP_PATH = path.resolve(config.dbRollingBackupFilePath)

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function counters(db) {
  return {
    users: Array.isArray(db?.users) ? db.users.length : 0,
    profiles: Array.isArray(db?.gameProfiles) ? db.gameProfiles.length : 0,
    announcements: Array.isArray(db?.globalAnnouncements) ? db.globalAnnouncements.length : 0,
  }
}

async function summarizeJsonFile(targetPath, label) {
  try {
    const raw = await fs.readFile(targetPath, 'utf8')
    const parsed = JSON.parse(raw)
    const stat = await fs.stat(targetPath)
    return {
      label,
      path: targetPath,
      exists: true,
      sizeBytes: stat.size,
      mtimeIso: stat.mtime.toISOString(),
      hash: sha256(raw),
      counters: counters(parsed),
      error: '',
    }
  } catch (error) {
    const exists = error?.code !== 'ENOENT'
    return {
      label,
      path: targetPath,
      exists,
      sizeBytes: 0,
      mtimeIso: '',
      hash: '',
      counters: counters(null),
      error: String(error?.message || error),
    }
  }
}

export async function getBackupHealthSummary() {
  const [activeDb, snapshot, rollingBackup] = await Promise.all([
    summarizeJsonFile(DB_PATH, 'activeDb'),
    summarizeJsonFile(SNAPSHOT_PATH, 'snapshot'),
    summarizeJsonFile(ROLLING_BACKUP_PATH, 'rollingBackup'),
  ])

  const warnings = []
  const errors = []
  for (const item of [activeDb, snapshot, rollingBackup]) {
    if (!item.exists) {
      errors.push(`${item.label} dosyası bulunamadı.`)
      continue
    }
    if (item.error) {
      errors.push(`${item.label} okunamadı: ${item.error}`)
    }
  }

  if (!errors.length) {
    if (activeDb.hash !== snapshot.hash) warnings.push('Aktif DB ve snapshot içeriği farklı.')
    if (activeDb.hash !== rollingBackup.hash) warnings.push('Aktif DB ve rolling yedek içeriği farklı.')
  }

  return {
    checkedAt: new Date().toISOString(),
    ok: errors.length === 0,
    files: {
      activeDb,
      snapshot,
      rollingBackup,
    },
    errors,
    warnings,
  }
}

export function getProcessHealthSummary() {
  const memory = process.memoryUsage()
  const seconds = Math.max(0, Math.trunc(process.uptime()))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds: seconds,
    uptimeHuman: `${hours} sa ${minutes} dk ${secs} sn`,
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
  }
}
