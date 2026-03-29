import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { config } from '../config.js'

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

let initialized = false
let messaging = null
let initFailed = false
let adminSdk = null
let adminLoadTried = false

const require = createRequire(import.meta.url)

function loadFirebaseAdminSdk() {
  if (adminLoadTried) return adminSdk
  adminLoadTried = true

  try {
    const loaded = require('firebase-admin')
    adminSdk = loaded?.default || loaded
  } catch (error) {
    console.warn('[FCM] firebase-admin paketi bulunamadi. Mobil push devre disi birakildi.', error?.code || '')
    adminSdk = null
  }

  return adminSdk
}

function parseServiceAccountJson(raw) {
  const safeRaw = String(raw || '').trim()
  if (!safeRaw) return null

  try {
    return JSON.parse(safeRaw)
  } catch {
    console.error('[FCM] FIREBASE_SERVICE_ACCOUNT_JSON parse edilemedi.')
    return null
  }
}

function readServiceAccountFromFile(filePath) {
  const safePath = String(filePath || '').trim()
  if (!safePath) return null

  const resolved = path.isAbsolute(safePath)
    ? safePath
    : path.resolve(process.cwd(), safePath)

  try {
    const raw = fs.readFileSync(resolved, 'utf8')
    return parseServiceAccountJson(raw)
  } catch {
    console.error(`[FCM] Service account dosyasi okunamadi: ${resolved}`)
    return null
  }
}

function serviceAccountFromDirectFields() {
  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    return null
  }

  return {
    project_id: config.firebase.projectId,
    client_email: config.firebase.clientEmail,
    private_key: config.firebase.privateKey,
  }
}

function resolveServiceAccount() {
  const fromJson = parseServiceAccountJson(config.firebase.serviceAccountJson)
  if (fromJson) return fromJson

  const fromFile = readServiceAccountFromFile(config.firebase.serviceAccountFile)
  if (fromFile) return fromFile

  return serviceAccountFromDirectFields()
}

function ensureMessaging() {
  if (messaging || initFailed) return messaging

  if (!config.firebase.enabled) {
    initFailed = true
    return null
  }

  const admin = loadFirebaseAdminSdk()
  if (!admin) {
    initFailed = true
    return null
  }

  const serviceAccount = resolveServiceAccount()
  if (!serviceAccount) {
    initFailed = true
    console.warn('[FCM] Firebase push devre disi: service account bilgisi eksik.')
    return null
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    }

    messaging = admin.messaging()
    initialized = true
    return messaging
  } catch (error) {
    initFailed = true
    console.error('[FCM] Firebase Admin baslatilamadi:', error)
    return null
  }
}

function normalizeTokenList(tokens) {
  const next = new Set()
  for (const token of tokens || []) {
    const safe = String(token || '').trim()
    if (safe.length >= 20) next.add(safe)
  }
  return [...next]
}

function normalizePayloadData(data) {
  const out = {}
  const safeData = data && typeof data === 'object' ? data : {}

  for (const [key, value] of Object.entries(safeData)) {
    if (!key) continue
    if (value === null || typeof value === 'undefined') continue
    out[key] = typeof value === 'string' ? value : JSON.stringify(value)
  }

  return out
}

export function isMobilePushConfigured() {
  if (initialized) return true
  return Boolean(ensureMessaging())
}

export async function sendMobilePushToTokens(tokens, payload) {
  const safeTokens = normalizeTokenList(tokens)
  if (safeTokens.length === 0) {
    return {
      sent: 0,
      failed: 0,
      invalidTokens: [],
      skipped: true,
    }
  }

  const client = ensureMessaging()
  if (!client) {
    return {
      sent: 0,
      failed: safeTokens.length,
      invalidTokens: [],
      skipped: true,
    }
  }

  try {
    const response = await client.sendEachForMulticast({
      tokens: safeTokens,
      notification: {
        title: String(payload?.title || 'TicarNet'),
        body: String(payload?.message || ''),
      },
      data: normalizePayloadData({
        type: payload?.type || 'system',
        createdAt: payload?.createdAt || new Date().toISOString(),
        ...(payload?.meta || {}),
      }),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    })

    const invalidTokens = []
    response.responses.forEach((entry, index) => {
      if (entry.success) return
      const code = entry.error?.code || ''
      if (INVALID_TOKEN_CODES.has(code)) {
        invalidTokens.push(safeTokens[index])
      }
    })

    return {
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens,
      skipped: false,
    }
  } catch (error) {
    console.error('[FCM] Push gonderimi basarisiz:', error)
    return {
      sent: 0,
      failed: safeTokens.length,
      invalidTokens: [],
      skipped: false,
      error: 'send_failed',
    }
  }
}
