import crypto from 'node:crypto'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env'), quiet: true })

function toNumber(value, fallback) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function toPositiveInt(value, fallback, min = 1, max = 1440) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  const normalized = Math.trunc(next)
  if (normalized < min) return min
  if (normalized > max) return max
  return normalized
}

function toNonNegativeInt(value, fallback, max = 1000000) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  const normalized = Math.trunc(next)
  if (normalized < 0) return 0
  if (normalized > max) return max
  return normalized
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  return fallback
}

function toCsvList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function decodeMultiline(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\\n/g, '\n')
}

function normalizeHttpOrigin(value) {
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

function toOriginList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => normalizeHttpOrigin(entry))
    .filter(Boolean)
}

function parseJwtExpires(value, fallback = '30d') {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  const normalized = raw.toLowerCase()
  if (
    normalized === 'none'
    || normalized === 'off'
    || normalized === 'false'
    || normalized === '0'
    || normalized === 'never'
    || normalized === 'infinite'
    || normalized === 'unlimited'
  ) {
    return null
  }
  return raw
}

function normalizeEnvString(value) {
  return String(value ?? '').trim()
}

function isPlaceholderSecret(value) {
  const safe = normalizeEnvString(value).toLowerCase()
  if (!safe) return true

  if (
    safe === 'change_me'
    || safe === 'changeme'
    || safe === 'replace_me'
    || safe === 'your_password'
    || safe === 'your_app_password'
    || safe === 'your_email@gmail.com'
  ) {
    return true
  }

  if (safe.startsWith('your_') || safe.startsWith('buraya_') || safe.startsWith('uzun_')) {
    return true
  }

  if (
    safe.includes('your_gmail')
    || safe.includes('example.com')
    || safe.includes('gmail_app_password')
    || safe.includes('smtp_app_password')
  ) {
    return true
  }

  return false
}

function resolveJwtSecret(nodeEnv) {
  const configured = String(process.env.JWT_SECRET || '').trim()
  if (configured) return configured

  if (String(nodeEnv || '').trim().toLowerCase() === 'production') {
    throw new Error('[config] JWT_SECRET zorunlu. Production ortami guvensiz baslatilamaz.')
  }

  const generated = crypto.randomBytes(48).toString('hex')
  console.warn('[config] JWT_SECRET bulunamadi. Gecici rastgele anahtar kullaniliyor (yalnizca development).')
  return generated
}

const nodeEnv = process.env.NODE_ENV || 'development'
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const resetLinkBaseUrl = process.env.RESET_LINK_BASE_URL || clientUrl
const defaultCorsOrigins = [clientUrl, resetLinkBaseUrl]
  .map((entry) => normalizeHttpOrigin(entry))
  .filter(Boolean)
const corsAllowedOriginsFromEnv = toOriginList(process.env.CORS_ALLOWED_ORIGINS)
const corsAllowedOrigins =
  corsAllowedOriginsFromEnv.length > 0
    ? [...new Set(corsAllowedOriginsFromEnv)]
    : [...new Set(defaultCorsOrigins)]
const adminEmails = toCsvList(process.env.ADMIN_EMAILS)
const adminPanelOwnerEmail = String(
  process.env.ADMIN_PANEL_OWNER_EMAIL || adminEmails[0] || '',
)
  .trim()
  .toLowerCase()
const resolvedDbFilePath =
  process.env.DB_FILE_PATH || path.resolve(process.cwd(), 'server/data/db.json')
const resolvedDbRootDir = path.dirname(resolvedDbFilePath)

export const config = {
  nodeEnv,
  apiHost: process.env.API_HOST || '0.0.0.0',
  apiPort: toNumber(process.env.API_PORT || process.env.PORT, 8787),
  clientUrl,
  resetLinkBaseUrl,
  corsAllowedOrigins,
  corsAllowNoOrigin: toBoolean(process.env.CORS_ALLOW_NO_ORIGIN, true),
  healthToken: String(process.env.HEALTHCHECK_TOKEN || process.env.HEALTH_TOKEN || '').trim(),
  wsAllowQueryToken: toBoolean(process.env.WS_ALLOW_QUERY_TOKEN, nodeEnv !== 'production'),
  maxAccountsPerScope: toNumber(process.env.MAX_ACCOUNTS_PER_SCOPE, 2),
  enforceRegisterIpOnLogin: toBoolean(process.env.ENFORCE_REGISTER_IP_ON_LOGIN, false),
  enforceRegisterSubnetOnLogin: toBoolean(process.env.ENFORCE_REGISTER_SUBNET_ON_LOGIN, false),
  resetTokenTtlMinutes: toPositiveInt(process.env.RESET_TOKEN_TTL_MINUTES, 3),
  accountDeletionEnabled: toBoolean(process.env.ACCOUNT_DELETION_ENABLED, false),
  jwtSecret: resolveJwtSecret(nodeEnv),
  jwtExpires: parseJwtExpires(process.env.JWT_EXPIRES, '30d'),
  singleSessionEnforced: toBoolean(process.env.SINGLE_SESSION_ENFORCED, false),
  adminEmails,
  adminPanelOwnerEmail,
  adminDiamondGrantEnabled: toBoolean(process.env.ADMIN_DIAMOND_GRANT_ENABLED, true),
  dbFilePath: resolvedDbFilePath,
  dbAutoBackupEnabled: toBoolean(process.env.DB_AUTO_BACKUP_ENABLED, false),
  dbAutoBackupIntervalMinutes: toPositiveInt(process.env.DB_AUTO_BACKUP_INTERVAL_MINUTES, 10),
  dbAutoBackupKeepCount: toNonNegativeInt(process.env.DB_AUTO_BACKUP_KEEP_COUNT, 1),
  dbSingleBackupMode: toBoolean(process.env.DB_SINGLE_BACKUP_MODE, true),
  dbRollingBackupEnabled: toBoolean(process.env.DB_ROLLING_BACKUP_ENABLED, true),
  dbRollingBackupFilePath:
    process.env.DB_ROLLING_BACKUP_FILE_PATH ||
    path.resolve(resolvedDbRootDir, 'backups', 'db-rolling.json'),
  dbPreventFullUserWipe: toBoolean(process.env.DB_PREVENT_FULL_USER_WIPE, true),
  dbHardStopOnEmptyWrite: toBoolean(process.env.DB_HARD_STOP_ON_EMPTY_WRITE, true),
  dbAllowEmptyUsersWrite: toBoolean(process.env.DB_ALLOW_EMPTY_USERS_WRITE, false),
  apiSingleInstanceLockEnabled: toBoolean(process.env.API_SINGLE_INSTANCE_LOCK_ENABLED, true),
  apiSingleInstanceLockFilePath:
    process.env.API_SINGLE_INSTANCE_LOCK_FILE_PATH ||
    path.resolve(resolvedDbRootDir, 'api.lock'),
  rateLimitEnabled: toBoolean(process.env.RATE_LIMIT_ENABLED, true),
  rateLimitGlobalWindowMs: toPositiveInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 60_000, 1_000, 3_600_000),
  rateLimitGlobalMax: toPositiveInt(process.env.RATE_LIMIT_GLOBAL_MAX, 240, 1, 50_000),
  rateLimitAuthWindowMs: toPositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 60_000, 1_000, 3_600_000),
  rateLimitAuthMax: toPositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 40, 1, 50_000),
  rateLimitLoginWindowMs: toPositiveInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 60_000, 1_000, 3_600_000),
  rateLimitLoginMax: toPositiveInt(process.env.RATE_LIMIT_LOGIN_MAX, 12, 1, 50_000),
  rateLimitAdminWindowMs: toPositiveInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS, 60_000, 1_000, 3_600_000),
  rateLimitAdminMax: toPositiveInt(process.env.RATE_LIMIT_ADMIN_MAX, 120, 1, 50_000),
  requestMetricsEnabled: toBoolean(process.env.REQUEST_METRICS_ENABLED, true),
  requestMetricsTopRoutes: toPositiveInt(process.env.REQUEST_METRICS_TOP_ROUTES, 12, 1, 100),
  crashLogFilePath:
    process.env.CRASH_LOG_FILE_PATH ||
    path.resolve(resolvedDbRootDir, 'logs', 'api-crash.log'),
  dbIoRetryLog: toBoolean(process.env.DB_IO_RETRY_LOG, false),
  uploadRootDir:
    process.env.UPLOAD_ROOT_DIR || path.resolve(process.cwd(), 'server/data/uploads'),
  avatarUploadDir:
    process.env.AVATAR_UPLOAD_DIR ||
    path.resolve(process.cwd(), 'server/data/uploads/avatars'),
  avatarPublicBase: process.env.AVATAR_PUBLIC_BASE || '/api/uploads/avatars',
  avatarMaxFileBytes: toNumber(process.env.AVATAR_MAX_FILE_BYTES, 2 * 1024 * 1024),
  geo: {
    enforceTrOnly: process.env.GEO_ENFORCE_TR_ONLY !== 'false',
    allowedCountryCode: (process.env.GEO_ALLOWED_COUNTRY_CODE || 'TR').toUpperCase(),
    blockProxyVpn: process.env.GEO_BLOCK_PROXY_VPN !== 'false',
    allowPrivateIpBypass: process.env.GEO_ALLOW_PRIVATE_IP_BYPASS !== 'false',
    cacheTtlMs: toNumber(process.env.GEO_CACHE_TTL_MS, 15 * 60 * 1000),
    staleAllowMs: toNumber(process.env.GEO_STALE_ALLOW_MS, 24 * 60 * 60 * 1000),
    lookupTimeoutMs: toNumber(process.env.GEO_LOOKUP_TIMEOUT_MS, 2500),
    failClosed: process.env.GEO_FAIL_CLOSED !== 'false',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  },
  supportInboxEmail: String(
    process.env.SUPPORT_INBOX_EMAIL || 'mustafaard76@gmail.com',
  )
    .trim()
    .toLowerCase(),
  firebase: {
    enabled: process.env.FIREBASE_ENABLED !== 'false',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: decodeMultiline(process.env.FIREBASE_PRIVATE_KEY || ''),
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '',
    serviceAccountFile: process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '',
  },
}

export function isSmtpConfigured() {
  return (
    !isPlaceholderSecret(config.smtp.user)
    && !isPlaceholderSecret(config.smtp.pass)
    && !isPlaceholderSecret(config.smtp.from)
  )
}

export function getSmtpMissingEnvVars() {
  const missing = []
  if (isPlaceholderSecret(config.smtp.user)) missing.push('SMTP_USER')
  if (isPlaceholderSecret(config.smtp.pass)) missing.push('SMTP_APP_PASSWORD (veya SMTP_PASS)')
  if (isPlaceholderSecret(config.smtp.from)) missing.push('MAIL_FROM')
  return missing
}
