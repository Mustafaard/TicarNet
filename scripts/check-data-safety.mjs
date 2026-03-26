import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const tmpDir = path.resolve(rootDir, 'server/data/tmp-data-safety-test')
const tmpDbPath = path.resolve(tmpDir, 'db.json')
const rollingPath = path.resolve(tmpDir, 'backups', 'db-rolling.json')

process.env.DB_FILE_PATH = tmpDbPath
process.env.DB_ROLLING_BACKUP_FILE_PATH = rollingPath
process.env.DB_SINGLE_BACKUP_MODE = 'true'
process.env.DB_ROLLING_BACKUP_ENABLED = 'true'
process.env.DB_PREVENT_FULL_USER_WIPE = 'true'
process.env.DB_HARD_STOP_ON_EMPTY_WRITE = 'true'
process.env.DB_ALLOW_EMPTY_USERS_WRITE = 'false'

await fs.rm(tmpDir, { recursive: true, force: true })
await fs.mkdir(tmpDir, { recursive: true })

const { readDb, writeDb, updateDb, createDbAutoBackup } = await import('../server/src/db.js')

const seeded = await readDb()
seeded.users = [
  {
    id: 'u-safe',
    username: 'safe-user',
    email: 'safe@example.com',
    passwordHash: 'hash',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
seeded.gameProfiles = [
  {
    userId: 'u-safe',
    wallet: 1000,
    reputation: 0,
    xpTotal: 0,
    notifications: [],
  },
]
await writeDb(seeded)

let blocked = false
try {
  await updateDb((db) => {
    db.users = []
    db.gameProfiles = []
    return db
  })
} catch (error) {
  blocked = String(error?.reason || '').trim() === 'db_guard_full_user_wipe_blocked'
}
assert.equal(blocked, true, 'Toplu kullanıcı/profil silme engellenmeliydi.')

const after = await readDb()
assert.equal(Array.isArray(after.users) ? after.users.length : 0, 1, 'Kullanıcı kaydı korunmalı.')
assert.equal(Array.isArray(after.gameProfiles) ? after.gameProfiles.length : 0, 1, 'Profil kaydı korunmalı.')

const backupResult = await createDbAutoBackup()
const backupPath = String(backupResult?.backupPath || '').trim()
assert.equal(Boolean(backupPath), true, 'Rolling yedek yolu dönmeliydi.')

const rollingExists = await fs.access(rollingPath).then(() => true).catch(() => false)
assert.equal(rollingExists, true, 'Rolling yedek dosyası oluşmalı.')

console.log('Data safety checks passed.')
console.log(`DB: ${tmpDbPath}`)
console.log(`Rolling backup: ${rollingPath}`)
