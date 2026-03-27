import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const envPath = path.resolve(projectRoot, 'server/.env')

dotenv.config({ path: envPath, override: false, quiet: true })

function normalize(value) {
  return String(value ?? '').trim()
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  const safe = normalize(value).toLowerCase()
  if (!safe) return fallback
  if (safe === 'true' || safe === '1' || safe === 'yes') return true
  if (safe === 'false' || safe === '0' || safe === 'no') return false
  return fallback
}

function isPlaceholder(value) {
  const safe = normalize(value).toLowerCase()
  if (!safe) return true

  if (
    safe === 'change_me'
    || safe === 'changeme'
    || safe === 'replace_me'
    || safe === 'your_password'
    || safe === 'your_app_password'
    || safe === 'your_email@gmail.com'
    || safe === 'change_me_gmail_app_password'
    || safe === 'change_me_healthcheck_token'
    || safe === 'change_me_long_random_secret'
  ) {
    return true
  }

  if (safe.startsWith('your_') || safe.startsWith('buraya_') || safe.startsWith('uzun_')) {
    return true
  }

  if (safe.includes('example.com') || safe.includes('alanadi')) {
    return true
  }

  return false
}

function isLocalHost(hostname) {
  const safe = String(hostname || '').trim().toLowerCase()
  return safe === 'localhost' || safe === '127.0.0.1' || safe === '0.0.0.0'
}

function parseOrigin(name, value, errors) {
  const raw = normalize(value)
  if (!raw) {
    errors.push(`${name} bos birakilamaz.`)
    return ''
  }

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    errors.push(`${name} gecerli bir URL olmali: ${raw}`)
    return ''
  }

  if (parsed.protocol !== 'https:') {
    errors.push(`${name} production icin https:// ile baslamali: ${raw}`)
  }

  if (isLocalHost(parsed.hostname)) {
    errors.push(`${name} production icin localhost/127.0.0.1 olamaz: ${raw}`)
  }

  return parsed.origin
}

function parseEmail(name, value, errors) {
  const raw = normalize(value).toLowerCase()
  if (!raw) {
    errors.push(`${name} bos birakilamaz.`)
    return ''
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    errors.push(`${name} gecerli bir e-posta adresi olmali: ${raw}`)
    return ''
  }

  return raw
}

async function ensureDirectoryWritable(dirPath, label, errors) {
  const safePath = normalize(dirPath)
  if (!safePath) {
    errors.push(`${label} bos birakilamaz.`)
    return
  }

  try {
    await fs.mkdir(safePath, { recursive: true })
    const probePath = path.resolve(safePath, `.probe-${Date.now()}`)
    await fs.writeFile(probePath, 'ok', 'utf8')
    await fs.rm(probePath, { force: true })
  } catch (error) {
    errors.push(`${label} yazilabilir degil: ${safePath} (${error.message})`)
  }
}

async function main() {
  const errors = []
  const warnings = []

  const nodeEnv = normalize(process.env.NODE_ENV)
  if (nodeEnv !== 'production') {
    errors.push(`NODE_ENV=production olmali. Mevcut: ${nodeEnv || '(bos)'}`)
  }

  const apiHost = normalize(process.env.API_HOST || '127.0.0.1')
  if (apiHost !== '127.0.0.1') {
    warnings.push(`API_HOST icin onerilen deger 127.0.0.1. Mevcut: ${apiHost}`)
  }

  const apiPort = Number(process.env.API_PORT || 8787)
  if (!Number.isInteger(apiPort) || apiPort <= 0 || apiPort > 65535) {
    errors.push(`API_PORT gecerli bir port olmali. Mevcut: ${process.env.API_PORT || '(bos)'}`)
  }

  const clientOrigin = parseOrigin('CLIENT_URL', process.env.CLIENT_URL, errors)
  const resetOrigin = parseOrigin('RESET_LINK_BASE_URL', process.env.RESET_LINK_BASE_URL, errors)

  const corsOrigins = normalize(process.env.CORS_ALLOWED_ORIGINS)
    .split(',')
    .map((entry) => normalize(entry))
    .filter(Boolean)

  if (corsOrigins.length === 0) {
    errors.push('CORS_ALLOWED_ORIGINS bos birakilamaz.')
  }

  const normalizedCorsOrigins = []
  for (const origin of corsOrigins) {
    const parsed = parseOrigin('CORS_ALLOWED_ORIGINS', origin, errors)
    if (parsed) normalizedCorsOrigins.push(parsed)
  }

  if (clientOrigin && !normalizedCorsOrigins.includes(clientOrigin)) {
    errors.push('CORS_ALLOWED_ORIGINS, CLIENT_URL originini icermeli.')
  }

  if (resetOrigin && !normalizedCorsOrigins.includes(resetOrigin)) {
    errors.push('CORS_ALLOWED_ORIGINS, RESET_LINK_BASE_URL originini icermeli.')
  }

  const jwtSecret = normalize(process.env.JWT_SECRET)
  if (isPlaceholder(jwtSecret) || jwtSecret.length < 32) {
    errors.push('JWT_SECRET placeholder/missing veya cok kisa (min 32 karakter).')
  }

  const healthToken = normalize(process.env.HEALTHCHECK_TOKEN || process.env.HEALTH_TOKEN)
  if (isPlaceholder(healthToken) || healthToken.length < 16) {
    errors.push('HEALTHCHECK_TOKEN placeholder/missing veya cok kisa (min 16 karakter).')
  }

  const smtpUser = normalize(process.env.SMTP_USER)
  const smtpPass = normalize(process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS)
  const mailFrom = normalize(process.env.MAIL_FROM || process.env.SMTP_USER)
  const smtpHost = normalize(process.env.SMTP_HOST || 'smtp.gmail.com')
  const smtpPort = Number(process.env.SMTP_PORT || 587)
  const firebaseAuthEnabled = parseBoolean(process.env.FIREBASE_AUTH_ENABLED, false)
  const firebaseWebApiKey = normalize(process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY)
  const smtpReady = !isPlaceholder(smtpUser) && !isPlaceholder(smtpPass) && !isPlaceholder(mailFrom)

  if (firebaseAuthEnabled && isPlaceholder(firebaseWebApiKey)) {
    errors.push('FIREBASE_WEB_API_KEY placeholder/missing (Firebase Auth acik).')
  }

  if (!firebaseAuthEnabled || smtpReady) {
    if (!smtpHost) {
      errors.push('SMTP_HOST bos birakilamaz.')
    }

    if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65535) {
      errors.push(`SMTP_PORT gecerli bir port olmali. Mevcut: ${process.env.SMTP_PORT || '(bos)'}`)
    }

    if (isPlaceholder(smtpUser)) {
      errors.push('SMTP_USER placeholder/missing.')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpUser)) {
      errors.push(`SMTP_USER gecerli bir e-posta olmali. Mevcut: ${smtpUser}`)
    }

    if (isPlaceholder(smtpPass)) {
      errors.push('SMTP_APP_PASSWORD (veya SMTP_PASS) placeholder/missing.')
    }

    if (isPlaceholder(mailFrom)) {
      errors.push('MAIL_FROM placeholder/missing.')
    }
  } else {
    warnings.push(
      'SMTP ayarlari eksik. Firebase Auth ile giris/sifre reset calisir ama destek e-postalari queued kalabilir.',
    )
  }

  const supportInbox = parseEmail('SUPPORT_INBOX_EMAIL', process.env.SUPPORT_INBOX_EMAIL, errors)
  if (supportInbox && supportInbox !== 'mustafaard76@gmail.com') {
    errors.push(`SUPPORT_INBOX_EMAIL mustafaard76@gmail.com olmali. Mevcut: ${supportInbox}`)
  }

  const dbFilePath = normalize(process.env.DB_FILE_PATH)
  if (!dbFilePath) {
    errors.push('DB_FILE_PATH bos birakilamaz (production kalici yol zorunlu).')
  } else {
    try {
      const dbDir = path.dirname(dbFilePath)
      await ensureDirectoryWritable(dbDir, 'DB_FILE_PATH dizini', errors)
    } catch (error) {
      errors.push(`DB_FILE_PATH dizini kontrol edilemedi: ${error.message}`)
    }
  }

  const uploadRootDir = normalize(
    process.env.UPLOAD_ROOT_DIR || path.resolve(projectRoot, 'server/data/uploads'),
  )
  const avatarUploadDir = normalize(
    process.env.AVATAR_UPLOAD_DIR || path.resolve(uploadRootDir, 'avatars'),
  )

  await ensureDirectoryWritable(uploadRootDir, 'UPLOAD_ROOT_DIR', errors)
  await ensureDirectoryWritable(avatarUploadDir, 'AVATAR_UPLOAD_DIR', errors)

  if (errors.length > 0) {
    console.error('[check-production-env] FAILED')
    for (const error of errors) {
      console.error(` - ${error}`)
    }
    if (warnings.length > 0) {
      console.error('[check-production-env] WARNINGS')
      for (const warning of warnings) {
        console.error(` - ${warning}`)
      }
    }
    process.exit(1)
    return
  }

  console.log('[check-production-env] OK')
  if (warnings.length > 0) {
    console.log('[check-production-env] WARNINGS')
    for (const warning of warnings) {
      console.log(` - ${warning}`)
    }
  }
}

main().catch((error) => {
  console.error('[check-production-env] FAILED with unexpected error')
  console.error(error)
  process.exit(1)
})
