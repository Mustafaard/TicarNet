import cors from 'cors'
import crypto from 'node:crypto'
import express from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import compression from 'compression'
import { config, getStartupWarnings } from './config.js'
import { createDbAutoBackup, readDb } from './db.js'
import { adminRateLimit, authRateLimit, globalApiRateLimit } from './middleware/rateLimit.js'
import { getRequestMetricsSummary, requestMetricsMiddleware } from './middleware/requestMetrics.js'
import { runChatRetentionMaintenance } from './chat/service.js'
import { attachChatSocketServer } from './chat/socket.js'
import { attachMessageSocketServer } from './messages/socket.js'
import {
  runForexClockMaintenance,
  runHistoryRetentionMaintenance,
  runSystemMarketMaintenance,
} from './game/service.js'
import { runLeagueSeasonMaintenance } from './game/seasonMaintenance.js'
import { processDueAccountDeletions } from './services/auth.js'
import { runModeratorSalaryMaintenance } from './services/admin.js'
import { getBackupHealthSummary, getProcessHealthSummary } from './services/systemHealth.js'
import authRouter from './routes/auth.js'
import gameRouter from './routes/game.js'
import adminRouter from './routes/admin.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false)
const apiLockPath = String(config.apiSingleInstanceLockFilePath || '').trim()
const crashLogPath = String(config.crashLogFilePath || '').trim()
let apiLockAcquired = false
const allowedCorsOrigins = new Set(
  Array.isArray(config.corsAllowedOrigins)
    ? config.corsAllowedOrigins.map((origin) => normalizeOrigin(origin)).filter(Boolean)
    : [],
)

function normalizeOrigin(value) {
  const candidate = String(value || '').trim()
  if (!candidate) return ''

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.origin
  } catch {
    return ''
  }
}

function timingSafeEquals(left, right) {
  const safeLeft = Buffer.from(String(left || ''), 'utf8')
  const safeRight = Buffer.from(String(right || ''), 'utf8')
  if (safeLeft.length !== safeRight.length) return false
  return crypto.timingSafeEqual(safeLeft, safeRight)
}

function isHealthTokenAuthorized(req) {
  const configuredToken = String(config.healthToken || '').trim()
  if (!configuredToken) {
    return config.nodeEnv !== 'production'
  }

  const byHeader = String(req.headers['x-ticarnet-health-token'] || '').trim()
  if (byHeader && timingSafeEquals(byHeader, configuredToken)) {
    return true
  }

  const authHeader = String(req.headers.authorization || '').trim()
  if (authHeader.startsWith('Bearer ')) {
    const byBearer = authHeader.slice('Bearer '.length).trim()
    if (byBearer && timingSafeEquals(byBearer, configuredToken)) {
      return true
    }
  }

  return false
}

function requireHealthToken(req, res, next) {
  if (isHealthTokenAuthorized(req)) {
    next()
    return
  }

  res.status(403).json({
    success: false,
    reason: 'forbidden',
    errors: { global: 'Yetkisiz saglik endpoint erisimi.' },
  })
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

function releaseApiProcessLock() {
  if (!config.apiSingleInstanceLockEnabled) return
  if (!apiLockAcquired) return
  if (!apiLockPath) return
  try {
    fs.rmSync(apiLockPath, { force: true })
  } catch {
    // best-effort lock cleanup
  }
  apiLockAcquired = false
}

function logFatalEvent(kind, error) {
  const timestamp = new Date().toISOString()
  const errorText = error instanceof Error
    ? `${error.name}: ${error.message}\n${error.stack || ''}`
    : String(error || 'unknown_error')
  const payload = [
    '==============================',
    `[${timestamp}] ${kind}`,
    errorText,
    '',
  ].join('\n')

  try {
    if (crashLogPath) {
      fs.mkdirSync(path.dirname(crashLogPath), { recursive: true })
      fs.appendFileSync(crashLogPath, `${payload}\n`, 'utf8')
    }
  } catch (writeError) {
    console.error('[CRASH_LOG] Fatal log write failed:', writeError)
  }
}

function acquireApiProcessLockOrExit() {
  if (!config.apiSingleInstanceLockEnabled) return
  if (!apiLockPath) return

  try {
    fs.mkdirSync(path.dirname(apiLockPath), { recursive: true })
  } catch {
    // best-effort lock dir creation
  }

  const lockPayload = JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
    host: config.apiHost,
    port: config.apiPort,
  }, null, 2)

  try {
    fs.writeFileSync(apiLockPath, lockPayload, { encoding: 'utf8', flag: 'wx' })
    apiLockAcquired = true
    return
  } catch (error) {
    if (error?.code !== 'EEXIST') {
      console.error('[BOOT] API kilit dosyasi olusturulamadi:', error)
      process.exit(1)
      return
    }
  }

  let existingPid = 0
  try {
    const raw = fs.readFileSync(apiLockPath, 'utf8')
    existingPid = Number(JSON.parse(String(raw || '{}')).pid || 0)
  } catch {
    existingPid = 0
  }

  if (isProcessAlive(existingPid)) {
    console.error(
      `[BOOT] API zaten calisiyor (pid=${existingPid}). Tek instance icin ikinci surec durduruldu.`,
    )
    process.exit(1)
    return
  }

  try {
    fs.rmSync(apiLockPath, { force: true })
    fs.writeFileSync(apiLockPath, lockPayload, { encoding: 'utf8', flag: 'wx' })
    apiLockAcquired = true
  } catch (error) {
    console.error('[BOOT] API kilit dosyasi yenilenemedi:', error)
    process.exit(1)
  }
}

process.on('exit', () => {
  releaseApiProcessLock()
})
process.on('unhandledRejection', (reason) => {
  logFatalEvent('unhandledRejection', reason)
  console.error('[FATAL] unhandledRejection:', reason)
})
process.on('uncaughtException', (error) => {
  logFatalEvent('uncaughtException', error)
  console.error('[FATAL] uncaughtException:', error)
})
process.on('SIGINT', () => {
  releaseApiProcessLock()
  process.exit(0)
})
process.on('SIGTERM', () => {
  releaseApiProcessLock()
  process.exit(0)
})

async function logDbStateSummary() {
  try {
    const db = await readDb()
    const users = Array.isArray(db?.users) ? db.users.length : 0
    const profiles = Array.isArray(db?.gameProfiles) ? db.gameProfiles.length : 0
    console.log(`[DB] Aktif veri dosyasi: ${config.dbFilePath}`)
    console.log(`[DB] Durum: users=${users} profiles=${profiles}`)
    if (config.dbRollingBackupEnabled) {
      console.log(`[DB] Kalici yedek: ${config.dbRollingBackupFilePath}`)
    }
  } catch (error) {
    console.error('[DB] Baslangic veri ozeti okunamadi:', error)
  }
}

function logStartupWarnings() {
  const warnings = getStartupWarnings()
  if (warnings.length === 0) return

  console.warn(`[BOOT] ${warnings.length} ayar uyarısı var:`)
  for (const warning of warnings) {
    console.warn(`[BOOT][WARN] ${warning}`)
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, Boolean(config.corsAllowNoOrigin))
        return
      }

      const normalized = normalizeOrigin(origin)
      const allowed = normalized && allowedCorsOrigins.has(normalized)
      callback(null, Boolean(allowed))
    },
    credentials: true,
  }),
)

app.use((req, res, next) => {
  void req
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  res.setHeader('Origin-Agent-Cluster', '?1')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  if (config.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store')
  }
  next()
})

app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter(req, res) {
      if (req.headers['x-no-compression']) return false
      return compression.filter(req, res)
    },
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '200kb' }))
app.use(
  '/api/uploads',
  express.static(config.uploadRootDir, {
    dotfiles: 'deny',
    index: false,
    fallthrough: true,
    maxAge: '1d',
    immutable: false,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Cache-Control', 'public, max-age=86400')
    },
  }),
)
app.use(requestMetricsMiddleware)
app.use('/api', globalApiRateLimit)

app.get('/api/health', async (_req, res, next) => {
  try {
    const backup = await getBackupHealthSummary()
    res.json({
      success: true,
      service: 'ticarnet-api',
      timestamp: new Date().toISOString(),
      backupOk: backup.ok,
      warningCount: backup.warnings.length,
      errorCount: backup.errors.length,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/health/backup', requireHealthToken, async (_req, res, next) => {
  try {
    const backup = await getBackupHealthSummary()
    res.json({
      success: true,
      ...backup,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/health/system', requireHealthToken, async (_req, res, next) => {
  try {
    const backup = await getBackupHealthSummary()
    const processSummary = getProcessHealthSummary()
    const requestMetrics = getRequestMetricsSummary()
    res.json({
      success: true,
      checkedAt: new Date().toISOString(),
      process: processSummary,
      requestMetrics,
      backup,
    })
  } catch (error) {
    next(error)
  }
})

app.use('/api/auth', authRateLimit, authRouter)
app.use('/api/game', gameRouter)
app.use('/api/admin', adminRateLimit, adminRouter)

function getLanIpv4Addresses() {
  const list = []
  const interfaces = os.networkInterfaces()

  for (const entries of Object.values(interfaces)) {
    if (!Array.isArray(entries)) continue
    for (const entry of entries) {
      if (!entry || entry.internal) continue
      const family = String(entry.family || '')
      if (family !== 'IPv4' && family !== '4') continue
      list.push(entry.address)
    }
  }

  return [...new Set(list)]
}

function logApiUrls() {
  const host = String(config.apiHost || '').trim() || '0.0.0.0'
  const localHost = host === '0.0.0.0' || host === '::' ? 'localhost' : host

  console.log(`TicarNet API running on http://${localHost}:${config.apiPort}`)

  if (host === '0.0.0.0' || host === '::') {
    for (const lanIp of getLanIpv4Addresses()) {
      console.log(`TicarNet API LAN     http://${lanIp}:${config.apiPort}`)
    }
  }
}

app.use((error, _req, res, next) => {
  void next

  if (res.headersSent) return

  const status = Math.max(0, Number(error?.statusCode || error?.status || 500))
  const parseFailed = String(error?.type || '').trim() === 'entity.parse.failed'

  if (parseFailed || (status >= 400 && status < 500)) {
    if (!parseFailed) {
      const details = String(error?.message || '').trim()
      if (details) console.warn(`[API WARN] ${details}`)
    }

    const reason = parseFailed
      ? 'bad_request'
      : String(error?.reason || 'bad_request').trim() || 'bad_request'
    const message = parseFailed
      ? 'Gecersiz istek verisi gonderildi.'
      : String(error?.message || 'Istek islenemedi.').trim() || 'Istek islenemedi.'

    res.status(parseFailed ? 400 : status).json({
      success: false,
      reason,
      errors: { global: message },
    })
    return
  }

  console.error('[API ERROR]', error)
  res.status(500).json({
    success: false,
    reason: 'internal_error',
    errors: { global: 'Sunucu hatasi olustu.' },
  })
})

acquireApiProcessLockOrExit()

const server = app.listen(config.apiPort, config.apiHost, () => {
  logApiUrls()
  logStartupWarnings()
  void logDbStateSummary()
})
server.requestTimeout = 30_000
server.headersTimeout = 35_000
server.keepAliveTimeout = 10_000
server.maxRequestsPerSocket = 200

attachChatSocketServer(server)
attachMessageSocketServer(server)

async function runAccountDeletionCleanup() {
  try {
    const result = await processDueAccountDeletions()
    if (result?.deletedCount > 0) {
      console.log(`[AUTH] Zamani gelen ${result.deletedCount} hesap kalici olarak silindi.`)
    }
  } catch (error) {
    console.error('[AUTH] Zamanlanmis hesap silme temizligi basarisiz:', error)
  }
}

async function runLeagueMaintenance() {
  try {
    const result = await runLeagueSeasonMaintenance()
    if (result?.transitioned) {
      const winners = Array.isArray(result?.winners) ? result.winners : []
      const winnerSummary = winners.length
        ? winners.map((entry) => `#${entry.rank} ${entry.username}`).join(', ')
        : 'kazanan yok'
      console.log(
        `[LEAGUE] Sezon gecisi islendi: ${result.fromSeasonKey} -> ${result.toSeasonKey}. Kazananlar: ${winnerSummary}`,
      )
    }
    if (result?.resetProfiles > 0) {
      console.log(
        `[LEAGUE] ${result.seasonKey} sezonu icin ${result.resetProfiles} profilin sezon puani sifirlandi.`,
      )
    }
  } catch (error) {
    console.error('[LEAGUE] Zamanlanmis sezon bakim gorevi basarisiz:', error)
  }
}

async function runForexMaintenance() {
  try {
    const result = await runForexClockMaintenance()
    if (result?.updated) {
      console.log(
        `[FOREX] Kur guncellendi. adim=${result.steps} updatedAt=${result.updatedAt || 'n/a'}`,
      )
    }
  } catch (error) {
    console.error('[FOREX] Zamanlanmis kur bakimi basarisiz:', error)
  }
}

async function runSystemMarketMaintenanceJob() {
  try {
    const result = await runSystemMarketMaintenance()
    if (result?.updated) {
      console.log(
        `[MARKET] Sistem pazari kontrol edildi. checked=${result.checkedItems || 0} restocked=${result.restockedItems || 0} updatedAt=${result.updatedAt || 'n/a'}`,
      )
    }
  } catch (error) {
    console.error('[MARKET] Zamanlanmis sistem pazar bakimi basarisiz:', error)
  }
}

async function runHistoryRetentionMaintenanceJob() {
  try {
    const gameResult = await runHistoryRetentionMaintenance()
    const chatResult = await runChatRetentionMaintenance()
    if (gameResult?.updated || chatResult?.updated) {
      console.log(
        `[CLEANUP] Eski kayitlar temizlendi. tx=${gameResult?.transactionsTrimmed || 0} notif=${gameResult?.notificationsTrimmed || 0} push=${gameResult?.pushInboxTrimmed || 0} dm=${gameResult?.directMessagesTrimmed || 0} chat=${chatResult?.trimmedMessages || 0}`,
      )
    }
  } catch (error) {
    console.error('[CLEANUP] Zamanlanmis gecmis temizligi basarisiz:', error)
  }
}

async function runModeratorSalaryMaintenanceJob() {
  try {
    const result = await runModeratorSalaryMaintenance()
    if (result?.updated && result?.paidCount > 0) {
      console.log(
        `[MOD_SALARY] Haftalik maas odendi. moderator=${result.paidCount} toplamElmas=${result.totalDiamonds}`,
      )
    }
  } catch (error) {
    console.error('[MOD_SALARY] Zamanlanmis maas odemesi basarisiz:', error)
  }
}

async function runDbAutoBackupJob() {
  if (!config.dbAutoBackupEnabled) return

  try {
    const result = await createDbAutoBackup()
    const backupPath = String(result?.backupPath || '').trim()
    if (!backupPath) return

    const removedCount = Array.isArray(result?.removed) ? result.removed.length : 0
    if (removedCount > 0) {
      console.log(`[DB] Otomatik yedek guncellendi: ${backupPath} (silinen eski yedek: ${removedCount})`)
      return
    }
    console.log(`[DB] Otomatik yedek guncellendi: ${backupPath}`)
  } catch (error) {
    console.error('[DB] Otomatik yedekleme basarisiz:', error)
  }
}

void runAccountDeletionCleanup()
void runLeagueMaintenance()
void runForexMaintenance()
void runSystemMarketMaintenanceJob()
void runHistoryRetentionMaintenanceJob()
void runModeratorSalaryMaintenanceJob()
if (config.dbAutoBackupEnabled) {
  console.log(
    `[DB] Otomatik yedekleme acik. Aralik=${config.dbAutoBackupIntervalMinutes} dk, mod=${config.dbSingleBackupMode ? 'tek-dosya' : 'coklu'}`,
  )
  void runDbAutoBackupJob()
  setInterval(() => {
    void runDbAutoBackupJob()
  }, config.dbAutoBackupIntervalMinutes * 60 * 1000)
} else {
  console.log('[DB] Otomatik yedekleme kapali (rolling yedek aciksa her write aninda guncellenir).')
}
setInterval(() => {
  void runAccountDeletionCleanup()
  void runLeagueMaintenance()
  void runForexMaintenance()
  void runHistoryRetentionMaintenanceJob()
  void runModeratorSalaryMaintenanceJob()
}, 60 * 1000)
setInterval(() => {
  void runSystemMarketMaintenanceJob()
}, 3 * 60 * 60 * 1000)

export default server
