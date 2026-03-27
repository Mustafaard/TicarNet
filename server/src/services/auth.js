import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { config, getSmtpMissingEnvVars, isSmtpConfigured } from '../config.js'
import { NO_DB_WRITE, readDb, updateDb } from '../db.js'
import { emitSessionActivated } from './sessionEvents.js'
import {
  emailRegex,
  generateSecureToken,
  hashToken,
  normalize,
  publicUser,
} from '../utils.js'
import { sendPasswordResetEmail } from './mailer.js'
import { USER_ROLES, normalizeUserRole } from './roles.js'
import {
  firebaseConfirmPasswordReset,
  firebaseLoginWithEmailPassword,
  firebaseRegisterWithEmailPassword,
  firebaseSendPasswordResetEmail,
  firebaseVerifyPasswordResetCode,
  getFirebaseAuthResetContinueUrl,
  isFirebaseAuthEnabled,
} from './firebaseAuth.js'

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 64
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 15
const USERNAME_PATTERN = /^[A-Z][A-Za-z ]{2,14}$/
const RESERVED_ADMIN_USERNAME = 'admin'
const RESERVED_ADMIN_OWNER_EMAIL = 'mustafaard76@gmail.com'
const USERNAME_CHANGE_DIAMOND_COST = 100
const ACCOUNT_DELETION_GRACE_DAYS = 2
const ACCOUNT_DELETION_GRACE_MS = ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000
const ACCOUNT_DELETION_ENABLED = Boolean(config.accountDeletionEnabled)
const PASSWORD_HASH_ROUNDS = 12
const INVALID_CREDENTIALS_MESSAGE = 'Giriş bilgileri hatalı.'
const ACCOUNT_NOT_FOUND_MESSAGE = 'Bu kullanıcı adı veya e-posta ile kayıtlı hesap bulunamadı.'
const DUMMY_PASSWORD_HASH = '$2b$12$5NEy4idmNHMDcrtmjflX5OBzHGRpdWtRG8koWC/ZSQLLiXbQs/pWi'

function isBootstrapAdminEmail(email) {
  const safeEmail = normalize(email)
  if (!safeEmail) return false
  return Array.isArray(config.adminEmails) && config.adminEmails.includes(safeEmail)
}

export function resolveUserRoleForStorage(currentRole, email) {
  if (isBootstrapAdminEmail(email)) return USER_ROLES.ADMIN
  return normalizeUserRole(currentRole, USER_ROLES.PLAYER)
}

function normalizeUserWithResolvedRole(user) {
  if (!user || typeof user !== 'object') return null
  return {
    ...user,
    role: resolveUserRoleForStorage(user.role, user.email),
  }
}

function isUserAdminBlocked(user) {
  return Boolean(user && user.adminBlocked === true)
}

function parseFutureIso(value, nowMs = Date.now()) {
  const safeValue = String(value || '').trim()
  if (!safeValue) return ''
  const parsedMs = new Date(safeValue).getTime()
  if (!Number.isFinite(parsedMs) || parsedMs <= nowMs) return ''
  return new Date(parsedMs).toISOString()
}

function getActiveTempBan(user, nowMs = Date.now()) {
  if (!user || typeof user !== 'object') {
    return {
      active: false,
      until: '',
      reason: '',
    }
  }

  const until = parseFutureIso(user.tempBanUntil, nowMs)
  return {
    active: Boolean(until),
    until,
    reason: String(user.tempBanReason || '').trim(),
  }
}

function isStrongEnoughPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return false
  if (/\s/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

function normalizeComparableSecret(value) {
  return String(value || '').trim().toLowerCase()
}

function isReservedAdminUsername(username) {
  const safe = normalizeComparableSecret(username).replace(/\s+/g, '')
  return safe === RESERVED_ADMIN_USERNAME
}

function canUseReservedAdminUsername(email) {
  return normalizeComparableSecret(email) === normalizeComparableSecret(RESERVED_ADMIN_OWNER_EMAIL)
}

function isPasswordSameAsIdentity(password, ...identities) {
  const safePassword = normalizeComparableSecret(password)
  if (!safePassword) return false
  const compactPassword = safePassword.replace(/\s+/g, '')
  return identities.some((identity) => {
    const safeIdentity = normalizeComparableSecret(identity)
    if (!safeIdentity) return false
    const compactIdentity = safeIdentity.replace(/\s+/g, '')
    return safePassword === safeIdentity || compactPassword === compactIdentity
  })
}

function createAccessToken(userId, sessionId, role = USER_ROLES.PLAYER) {
  const jti = sessionId || crypto.randomUUID()
  const signOptions = {}
  if (config.jwtExpires) {
    signOptions.expiresIn = config.jwtExpires
  }
  return jwt.sign(
    {
      sub: userId,
      jti,
      role: normalizeUserRole(role, USER_ROLES.PLAYER),
    },
    config.jwtSecret,
    signOptions,
  )
}

export async function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    if (!payload?.sub) return null

    // Tek aktif oturum: kullanıcıdaki activeSessionId ile token'daki jti eşleşmeli
    const db = await readDb()
    const user = db.users.find((item) => item.id === payload.sub)
    if (!user) return null
    if (isUserAdminBlocked(user)) return null
    if (getActiveTempBan(user).active) return null

    if (
      config.singleSessionEnforced
      && user.activeSessionId
      && payload.jti
      && user.activeSessionId !== payload.jti
    ) {
      return null
    }

    return {
      ...payload,
      role: resolveUserRoleForStorage(user.role, user.email),
    }
  } catch {
    return null
  }
}

export async function hasRegisteredUsers() {
  const db = await readDb()
  return db.users.length > 0
}

export async function findUserById(userId) {
  const db = await readDb()
  const user = db.users.find((item) => item.id === userId)
  return normalizeUserWithResolvedRole(user)
}

function validateRegisterPayload(payload) {
  const errors = {}
  const username = payload.username?.trim() || ''
  const email = payload.email?.trim() || ''
  const password = payload.password || ''

  if (!username) {
    errors.username = 'Kullanıcı adı zorunludur.'
  } else if (username.length < USERNAME_MIN_LENGTH) {
    errors.username = 'Kullanıcı adı en az 3 karakter olmalıdır.'
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = 'Kullanıcı adı en fazla 15 karakter olabilir.'
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      'Kullanıcı adı büyük harfle başlamalı, toplam 3-15 karakter olmalı ve yalnızca harf ile boşluk içermelidir.'
  } else if (isReservedAdminUsername(username) && !canUseReservedAdminUsername(email)) {
    errors.username = '"admin" kullanıcı adı sadece yetkili hesapta kullanılabilir.'
  }

  if (!email) {
    errors.email = 'E-posta zorunludur.'
  } else if (!emailRegex.test(email)) {
    errors.email = 'Geçerli bir e-posta adresi girin.'
  }

  if (!password) {
    errors.password = 'Şifre zorunludur.'
  } else if (!isStrongEnoughPassword(password)) {
    errors.password =
      'Şifre 8-64 karakter olmalı; en az bir küçük harf ve bir rakam içermelidir.'
  } else if (isPasswordSameAsIdentity(password, username, email)) {
    errors.password = 'Şifre kullanıcı adı veya e-posta ile aynı olamaz.'
  }

  return errors
}

function validateLoginPayload(payload) {
  const errors = {}
  const identifier = payload.identifier?.trim() || ''
  const password = payload.password || ''

  if (!identifier) {
    errors.identifier = 'Kullanıcı adı veya e-posta zorunludur.'
  }

  if (!password) {
    errors.password = 'Şifre zorunludur.'
  }

  return errors
}

function validatePasswordResetRequestPayload(payload) {
  const errors = {}
  const email = payload.email?.trim() || ''

  if (!email) {
    errors.email = 'E-posta zorunludur.'
  } else if (!emailRegex.test(email)) {
    errors.email = 'Geçerli bir e-posta adresi girin.'
  }

  return errors
}

function validatePasswordResetPayload(payload) {
  const errors = {}
  const token = payload.token || ''
  const newPassword = payload.newPassword || ''
  const confirmPassword = payload.confirmPassword || ''

  if (!token) {
    errors.global = 'Sıfırlama bağlantısı geçersiz.'
  }

  if (!newPassword) {
    errors.newPassword = 'Yeni şifre zorunludur.'
  } else if (!isStrongEnoughPassword(newPassword)) {
    errors.newPassword =
      'Yeni şifre 8-64 karakter olmalı; en az bir küçük harf ve bir rakam içermelidir.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunludur.'
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = 'Şifreler birbiriyle eşleşmiyor.'
  }

  return errors
}

function validateUsernameChangePayload(payload) {
  const errors = {}
  const username = String(payload?.username || '').trim()

  if (!username) {
    errors.username = 'Kullanıcı adı zorunludur.'
  } else if (username.length < USERNAME_MIN_LENGTH) {
    errors.username = 'Kullanıcı adı en az 3 karakter olmalıdır.'
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = 'Kullanıcı adı en fazla 15 karakter olabilir.'
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      'Kullanıcı adı büyük harfle başlamalı, toplam 3-15 karakter olmalı ve yalnızca harf ile boşluk içermelidir.'
  }

  return { errors, username }
}

function validatePasswordChangePayload(payload) {
  const errors = {}
  const newPassword = payload?.newPassword || ''
  const confirmPassword = payload?.confirmPassword || ''

  if (!newPassword) {
    errors.newPassword = 'Yeni şifre zorunludur.'
  } else if (!isStrongEnoughPassword(newPassword)) {
    errors.newPassword =
      'Yeni şifre 8-64 karakter olmalı; en az bir küçük harf ve bir rakam içermelidir.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunludur.'
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = 'Şifreler birbiriyle eşleşmiyor.'
  }

  return { errors, newPassword }
}

function countUsersByPublicIp(users, publicIp) {
  const safePublicIp = String(publicIp || '').trim()
  if (!safePublicIp || safePublicIp === 'unknown') return 0
  return users.filter((user) => String(user?.publicIp || '').trim() === safePublicIp).length
}

function subnetFromIp(ip) {
  if (!ip || ip === 'unknown') return 'unknown'
  const parts = ip.split('.')
  if (parts.length !== 4) return 'unknown'
  const valid = parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  if (!valid) return 'unknown'
  return `${parts[0]}.${parts[1]}.${parts[2]}.*`
}

function subnetFromOrigin(origin) {
  const candidate = origin?.trim() || ''
  if (!candidate) return 'unknown'

  try {
    const parsed = new URL(candidate)
    const host = parsed.hostname || ''
    return subnetFromIp(host)
  } catch {
    return 'unknown'
  }
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

function resolveResetLinkOrigins() {
  const unique = [
    normalizeHttpOrigin(config.resetLinkBaseUrl),
    normalizeHttpOrigin(config.clientUrl),
    ...(Array.isArray(config.corsAllowedOrigins) ? config.corsAllowedOrigins : []),
  ]
    .map((entry) => normalizeHttpOrigin(entry))
    .filter(Boolean)

  const filteredForEnvironment = [...new Set(unique)].filter((origin) => {
    if (config.nodeEnv !== 'production') return true

    try {
      const host = String(new URL(origin).hostname || '').trim().toLowerCase()
      return host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0'
    } catch {
      return false
    }
  })

  if (filteredForEnvironment.length > 0) {
    return filteredForEnvironment
  }

  if (config.nodeEnv !== 'production') {
    return ['http://localhost:5173']
  }

  return []
}

function asValidTimestampMs(value) {
  const parsedMs = new Date(value || '').getTime()
  return Number.isFinite(parsedMs) ? parsedMs : NaN
}

function hashEquals(left, right) {
  const safeLeft = Buffer.from(String(left || ''), 'utf8')
  const safeRight = Buffer.from(String(right || ''), 'utf8')
  if (safeLeft.length !== safeRight.length) return false
  return crypto.timingSafeEqual(safeLeft, safeRight)
}

function resolvePasswordHashForCompare(hashValue) {
  const safeHash = String(hashValue || '').trim()
  if (safeHash.startsWith('$2a$') || safeHash.startsWith('$2b$') || safeHash.startsWith('$2y$')) {
    return safeHash
  }
  return DUMMY_PASSWORD_HASH
}

async function comparePasswordSafe(rawPassword, hashValue) {
  const safePassword = String(rawPassword || '')
  const safeHash = resolvePasswordHashForCompare(hashValue)
  try {
    return await bcrypt.compare(safePassword, safeHash)
  } catch {
    return false
  }
}

async function isPasswordUsedByAnotherUser(users, rawPassword, options = {}) {
  const safeUsers = Array.isArray(users) ? users : []
  const excludedUserId = String(options?.excludedUserId || '').trim()
  const safePassword = String(rawPassword || '')
  if (!safePassword) return false

  for (const user of safeUsers) {
    if (!user || typeof user !== 'object') continue
    const candidateUserId = String(user.id || '').trim()
    if (excludedUserId && candidateUserId === excludedUserId) continue
    const candidateHash = String(user.passwordHash || '').trim()
    if (!candidateHash) continue
    const matched = await comparePasswordSafe(safePassword, candidateHash)
    if (matched) return true
  }

  return false
}

function normalizeStoredNetworkValue(value) {
  const safe = String(value || '').trim()
  return safe || 'unknown'
}

function resolveStoredPublicIp(user) {
  return normalizeStoredNetworkValue(user?.publicIp || user?.registerIp)
}

function resolveStoredSubnet(user) {
  const fromStorage = normalizeStoredNetworkValue(user?.localSubnet)
  if (fromStorage !== 'unknown') return fromStorage
  return subnetFromIp(resolveStoredPublicIp(user))
}

function removeUserDataFromDraft(draft, userId) {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return

  const existingUsers = Array.isArray(draft.users) ? draft.users : []
  draft.users = existingUsers.filter((item) => item?.id !== safeUserId)
  draft.passwordResetTokens = Array.isArray(draft.passwordResetTokens)
    ? draft.passwordResetTokens.filter((item) => item.userId !== safeUserId)
    : []
  draft.gameProfiles = Array.isArray(draft.gameProfiles)
    ? draft.gameProfiles.filter((item) => item?.userId !== safeUserId)
    : []
  draft.directMessages = Array.isArray(draft.directMessages)
    ? draft.directMessages.filter(
        (item) => item?.fromUserId !== safeUserId && item?.toUserId !== safeUserId,
      )
    : []
  draft.accountDeletionRequests = Array.isArray(draft.accountDeletionRequests)
    ? draft.accountDeletionRequests.filter(
        (entry) => String(entry?.userId || '').trim() !== safeUserId,
      )
    : []

  if (!draft.chatState || typeof draft.chatState !== 'object') {
    draft.chatState = { rooms: {}, userMeta: {} }
    return
  }

  if (!draft.chatState.rooms || typeof draft.chatState.rooms !== 'object') {
    draft.chatState.rooms = {}
  }
  for (const roomKey of Object.keys(draft.chatState.rooms)) {
    const rows = Array.isArray(draft.chatState.rooms[roomKey])
      ? draft.chatState.rooms[roomKey]
      : []
    draft.chatState.rooms[roomKey] = rows.filter(
      (entry) => String(entry?.userId || '').trim() !== safeUserId,
    )
  }

  if (!draft.chatState.userMeta || typeof draft.chatState.userMeta !== 'object') {
    draft.chatState.userMeta = {}
    return
  }

  delete draft.chatState.userMeta[safeUserId]
}

function sanitizeFutureDeletionRequest(entry) {
  if (!entry || typeof entry !== 'object') return null

  const userId = String(entry.userId || '').trim()
  if (!userId) return null

  const deleteAtMs = asValidTimestampMs(entry.deleteAt)
  if (!Number.isFinite(deleteAtMs)) return null

  const requestedAtMs = asValidTimestampMs(entry.requestedAt)
  const safeRequestedAtMs = Number.isFinite(requestedAtMs)
    ? requestedAtMs
    : Math.max(0, deleteAtMs - ACCOUNT_DELETION_GRACE_MS)

  return {
    id: String(entry.id || crypto.randomUUID()).trim() || crypto.randomUUID(),
    userId,
    requestedAt: new Date(safeRequestedAtMs).toISOString(),
    deleteAt: new Date(deleteAtMs).toISOString(),
  }
}

function findPendingDeletionRequestByUserId(db, userId) {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return null

  const requests = Array.isArray(db.accountDeletionRequests)
    ? db.accountDeletionRequests
    : []
  const nowMs = Date.now()

  for (const entry of requests) {
    if (!entry || typeof entry !== 'object') continue
    if (String(entry.userId || '').trim() !== safeUserId) continue
    const deleteAtMs = asValidTimestampMs(entry.deleteAt)
    if (!Number.isFinite(deleteAtMs) || deleteAtMs <= nowMs) continue
    return sanitizeFutureDeletionRequest(entry)
  }

  return null
}

export async function processDueAccountDeletions() {
  if (!ACCOUNT_DELETION_ENABLED) {
    let clearedRequests = 0
    await updateDb((draft) => {
      if (!Array.isArray(draft.accountDeletionRequests)) return NO_DB_WRITE
      if (draft.accountDeletionRequests.length === 0) return NO_DB_WRITE
      clearedRequests = draft.accountDeletionRequests.length
      draft.accountDeletionRequests = []
      return draft
    })

    return {
      success: true,
      disabled: true,
      deletedUserIds: [],
      deletedCount: 0,
      clearedRequests,
    }
  }

  const nowMs = Date.now()
  const deletedUserIds = []
  let changed = false

  await updateDb((draft) => {
    const requests = Array.isArray(draft.accountDeletionRequests)
      ? draft.accountDeletionRequests
      : []

    if (requests.length === 0) {
      if (Array.isArray(draft.accountDeletionRequests)) return NO_DB_WRITE
      draft.accountDeletionRequests = []
      changed = true
      return draft
    }

    const users = Array.isArray(draft.users) ? draft.users : []
    const userIdSet = new Set(users.map((item) => String(item?.id || '').trim()).filter(Boolean))
    const keptRequests = []

    for (const entry of requests) {
      const sanitized = sanitizeFutureDeletionRequest(entry)
      if (!sanitized) {
        changed = true
        continue
      }
      if (!userIdSet.has(sanitized.userId)) {
        changed = true
        continue
      }

      const deleteAtMs = asValidTimestampMs(sanitized.deleteAt)
      if (Number.isFinite(deleteAtMs) && deleteAtMs <= nowMs) {
        removeUserDataFromDraft(draft, sanitized.userId)
        deletedUserIds.push(sanitized.userId)
        changed = true
        continue
      }

      if (
        String(entry?.id || '').trim() !== sanitized.id ||
        String(entry?.userId || '').trim() !== sanitized.userId ||
        String(entry?.requestedAt || '').trim() !== sanitized.requestedAt ||
        String(entry?.deleteAt || '').trim() !== sanitized.deleteAt
      ) {
        changed = true
      }
      keptRequests.push(sanitized)
    }

    if (keptRequests.length !== requests.length) changed = true
    if (!changed) return NO_DB_WRITE
    draft.accountDeletionRequests = keptRequests
    return draft
  })

  return {
    success: true,
    deletedUserIds,
    deletedCount: deletedUserIds.length,
  }
}

export async function registerUser(payload, meta) {
  const errors = validateRegisterPayload(payload)
  const confirmPassword = String(payload?.confirmPassword || '')
  const password = String(payload?.password || '')
  if (!confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunludur.'
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'Şifreler birbiriyle eşleşmiyor.'
  }
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, user: null, reason: 'validation' }
  }

  const normalizedAppOrigin = normalizeHttpOrigin(payload.appOrigin || '')
  const username = payload.username.trim()
  const email = normalize(payload.email)
  const deviceId = payload.deviceId?.trim() || 'unknown-device'
  const ip = meta.ip || 'unknown'
  const publicIp = ip
  const localSubnetFromOrigin = subnetFromOrigin(payload.appOrigin || '')
  const localSubnet =
    localSubnetFromOrigin !== 'unknown' ? localSubnetFromOrigin : subnetFromIp(ip)
  const firebaseAuthEnabled = isFirebaseAuthEnabled()

  const dbForPreflight = await readDb()
  const emailExistsInDb = dbForPreflight.users.some((user) => normalize(user.email) === email)
  if (emailExistsInDb) {
    return {
      success: false,
      errors: { email: 'Bu e-posta zaten kayıtlı.' },
      user: null,
      reason: 'email_exists',
    }
  }

  const usernameExistsInDb = dbForPreflight.users.some(
    (user) => normalize(user.username) === normalize(username),
  )
  if (usernameExistsInDb) {
    return {
      success: false,
      errors: { username: 'Bu kullanıcı adı zaten kayıtlı.' },
      user: null,
      reason: 'username_exists',
    }
  }

  const duplicatePassword = await isPasswordUsedByAnotherUser(dbForPreflight.users, password)
  if (duplicatePassword) {
    return {
      success: false,
      errors: { password: 'Bu şifre başka bir hesapta kullanılıyor. Farklı bir şifre belirleyin.' },
      user: null,
      reason: 'password_reused',
    }
  }

  const byPublicIp = countUsersByPublicIp(dbForPreflight.users, publicIp)
  if (byPublicIp >= config.maxAccountsPerScope) {
    return {
      success: false,
      errors: {
        global:
          `Aynı internet (Wi-Fi/IP) üzerinden en fazla ${config.maxAccountsPerScope} hesap açılabilir.`,
      },
      user: null,
      reason: 'limit_reached',
    }
  }

  let firebaseUid = ''
  if (firebaseAuthEnabled) {
    const firebaseRegisterResult = await firebaseRegisterWithEmailPassword({
      email,
      password: payload.password,
    })

    if (!firebaseRegisterResult.success) {
      if (firebaseRegisterResult.reason === 'email_exists') {
        return {
          success: false,
          errors: { email: 'Bu e-posta zaten kayıtlı.' },
          user: null,
          reason: 'email_exists',
        }
      }

      const fallbackMessage =
        firebaseRegisterResult.reason === 'weak_password'
          ? 'Şifre Firebase kuralları için geçersiz.'
          : 'Kayıt işlemi şu anda tamamlanamıyor. Lütfen birazdan tekrar deneyin.'

      console.error('[auth] Firebase register failed.', {
        reason: firebaseRegisterResult.reason,
        code: firebaseRegisterResult.code,
        message: firebaseRegisterResult.message,
      })

      return {
        success: false,
        errors: { global: fallbackMessage },
        user: null,
        reason: 'register_unavailable',
      }
    }

    firebaseUid = String(firebaseRegisterResult.uid || '').trim()
  }

  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_HASH_ROUNDS)

  let createdUser = null
  let failure = null

  await updateDb((db) => {
    const emailExists = db.users.some((user) => normalize(user.email) === email)
    if (emailExists) {
      failure = {
        success: false,
        errors: { email: 'Bu e-posta zaten kayıtlı.' },
        user: null,
        reason: 'email_exists',
      }
      return db
    }
    const usernameExists = db.users.some((user) => normalize(user.username) === normalize(username))
    if (usernameExists) {
      failure = {
        success: false,
        errors: { username: 'Bu kullanıcı adı zaten kayıtlı.' },
        user: null,
        reason: 'username_exists',
      }
      return db
    }

    const byPublicIp = countUsersByPublicIp(db.users, publicIp)
    if (byPublicIp >= config.maxAccountsPerScope) {
      failure = {
        success: false,
        errors: {
          global:
            `Aynı internet (Wi-Fi/IP) üzerinden en fazla ${config.maxAccountsPerScope} hesap açılabilir.`,
        },
        user: null,
        reason: 'limit_reached',
      }
      return db
    }

    createdUser = {
      id: crypto.randomUUID(),
      username,
      email,
      role: resolveUserRoleForStorage(USER_ROLES.PLAYER, email),
      adminBlocked: false,
      adminBlockedAt: '',
      adminBlockedReason: '',
      tempBanUntil: '',
      tempBanReason: '',
      chatBlockedUntil: '',
      chatBlockedReason: '',
      dmBlockedUntil: '',
      dmBlockedReason: '',
      chatMuteUntil: '',
      chatMuteReason: '',
      moderatorWeeklySalaryPaidAt: '',
      passwordHash,
      createdAt: new Date().toISOString(),
      deviceId,
      registerIp: ip,
      appOrigin: normalizedAppOrigin,
      publicIp,
      localSubnet,
      lastLoginAt: new Date().toISOString(),
      activeSessionId: null,
      firebaseUid,
    }

    db.users.push(createdUser)
    return db
  })

  if (failure) {
    return failure
  }

  const sessionId = crypto.randomUUID()
  await updateDb((draft) => {
    const user = draft.users.find((item) => item.id === createdUser.id)
    if (user) {
      user.activeSessionId = sessionId
    }
    return draft
  })
  const token = createAccessToken(createdUser.id, sessionId, createdUser.role)
  if (config.singleSessionEnforced) {
    emitSessionActivated({
      userId: createdUser.id,
      sessionId,
      source: 'register',
    })
  }
  return {
    success: true,
    errors: {},
    reason: null,
    user: publicUser(createdUser),
    token,
  }
}

export async function loginUser(payload, meta = {}) {
  const errors = validateLoginPayload(payload)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, user: null, reason: 'validation' }
  }

  await processDueAccountDeletions()

  const normalizedAppOrigin = normalizeHttpOrigin(payload.appOrigin || '')
  const identifier = normalize(payload.identifier)
  const db = await readDb()

  const matchedUser = db.users.find(
    (user) =>
      normalize(user.username) === identifier || normalize(user.email) === identifier,
  )

  if (!matchedUser) {
    await comparePasswordSafe(
      payload.password,
      resolvePasswordHashForCompare(''),
    )
    return {
      success: false,
      errors: {
        identifier: ACCOUNT_NOT_FOUND_MESSAGE,
        global: ACCOUNT_NOT_FOUND_MESSAGE,
      },
      user: null,
      reason: 'account_not_found',
    }
  }

  const firebaseAuthEnabled = isFirebaseAuthEnabled()
  let passwordOk = false
  let syncPasswordHashFromLogin = false
  let firebaseUidFromLogin = ''

  if (firebaseAuthEnabled) {
    const firebaseLoginResult = await firebaseLoginWithEmailPassword({
      email: matchedUser.email,
      password: payload.password,
    })

    if (firebaseLoginResult.success) {
      passwordOk = true
      syncPasswordHashFromLogin = true
      firebaseUidFromLogin = String(firebaseLoginResult.uid || '').trim()
    } else if (firebaseLoginResult.reason === 'account_not_found') {
      const localPasswordOk = await comparePasswordSafe(
        payload.password,
        resolvePasswordHashForCompare(matchedUser?.passwordHash),
      )
      if (!localPasswordOk) {
        return {
          success: false,
          errors: {
            global: INVALID_CREDENTIALS_MESSAGE,
          },
          user: null,
          reason: 'invalid_credentials',
        }
      }

      const firebaseRegisterResult = await firebaseRegisterWithEmailPassword({
        email: matchedUser.email,
        password: payload.password,
      })

      if (firebaseRegisterResult.success) {
        passwordOk = true
        syncPasswordHashFromLogin = true
        firebaseUidFromLogin = String(firebaseRegisterResult.uid || '').trim()
      } else if (firebaseRegisterResult.reason === 'email_exists') {
        const retryLogin = await firebaseLoginWithEmailPassword({
          email: matchedUser.email,
          password: payload.password,
        })
        if (!retryLogin.success) {
          return {
            success: false,
            errors: {
              global: 'Kimlik doğrulama servisine bağlanılamadı. Lütfen tekrar deneyin.',
            },
            user: null,
            reason: 'auth_unavailable',
          }
        }

        passwordOk = true
        syncPasswordHashFromLogin = true
        firebaseUidFromLogin = String(retryLogin.uid || '').trim()
      } else {
        console.error('[auth] Firebase login migration failed.', {
          reason: firebaseRegisterResult.reason,
          code: firebaseRegisterResult.code,
          message: firebaseRegisterResult.message,
        })
        return {
          success: false,
          errors: {
            global: 'Kimlik doğrulama servisine bağlanılamadı. Lütfen tekrar deneyin.',
          },
          user: null,
          reason: 'auth_unavailable',
        }
      }
    } else if (firebaseLoginResult.reason === 'invalid_credentials') {
      return {
        success: false,
        errors: {
          global: INVALID_CREDENTIALS_MESSAGE,
        },
        user: null,
        reason: 'invalid_credentials',
      }
    } else if (firebaseLoginResult.reason === 'user_disabled') {
      return {
        success: false,
        errors: {
          global: 'Hesabınız geçici olarak devre dışı bırakıldı.',
        },
        user: null,
        reason: 'blocked',
      }
    } else {
      console.error('[auth] Firebase login failed.', {
        reason: firebaseLoginResult.reason,
        code: firebaseLoginResult.code,
        message: firebaseLoginResult.message,
      })
      return {
        success: false,
        errors: {
          global: 'Kimlik doğrulama servisine bağlanılamadı. Lütfen tekrar deneyin.',
        },
        user: null,
        reason: 'auth_unavailable',
      }
    }
  } else {
    passwordOk = await comparePasswordSafe(
      payload.password,
      resolvePasswordHashForCompare(matchedUser?.passwordHash),
    )
    if (!passwordOk) {
      return {
        success: false,
        errors: {
          global: INVALID_CREDENTIALS_MESSAGE,
        },
        user: null,
        reason: 'invalid_credentials',
      }
    }
  }

  const loginIp = normalizeStoredNetworkValue(meta?.ip)
  const loginSubnet = subnetFromIp(loginIp)
  const storedPublicIp = resolveStoredPublicIp(matchedUser)
  const storedSubnet = resolveStoredSubnet(matchedUser)

  if (
    config.enforceRegisterIpOnLogin
    && storedPublicIp !== 'unknown'
    && loginIp !== 'unknown'
    && loginIp !== storedPublicIp
  ) {
    return {
      success: false,
      errors: {
        global: 'Bu hesap yalnızca ilk kayıt yapıldığı Wi-Fi/IP üzerinden giriş yapabilir.',
      },
      user: null,
      reason: 'network_restricted',
    }
  }

  if (
    config.enforceRegisterSubnetOnLogin
    && storedSubnet !== 'unknown'
    && loginSubnet !== 'unknown'
    && loginSubnet !== storedSubnet
  ) {
    return {
      success: false,
      errors: {
        global:
          'Bu hesap yalnızca ilk kayıt yapıldığı ağ bloğundan giriş yapabilir (farklı Wi-Fi engeli).',
      },
      user: null,
      reason: 'network_restricted',
    }
  }

  if (isUserAdminBlocked(matchedUser)) {
    return {
      success: false,
      errors: {
        global: 'Hesabınız yönetici tarafından engellendi. Lütfen destek ile iletişime geçin.',
      },
      user: null,
      reason: 'blocked',
    }
  }

  const tempBan = getActiveTempBan(matchedUser)
  if (tempBan.active) {
    const reasonText = tempBan.reason ? ` Sebep: ${tempBan.reason}.` : ''
    return {
      success: false,
      errors: {
        global: `Hesabın geçici olarak engellendi.${reasonText} Bitiş: ${tempBan.until}`,
      },
      user: null,
      reason: 'temp_ban',
      bannedUntil: tempBan.until,
    }
  }

  const sessionId = crypto.randomUUID()
  const nextPasswordHash = syncPasswordHashFromLogin
    ? await bcrypt.hash(String(payload.password || ''), PASSWORD_HASH_ROUNDS)
    : ''
  let deletionCancelled = false
  let resolvedUser = null

  await updateDb((draft) => {
    const user = draft.users.find((item) => item.id === matchedUser.id)
    if (user) {
      user.role = resolveUserRoleForStorage(user.role, user.email)
      user.lastLoginAt = new Date().toISOString()
      user.lastLoginIp = loginIp
      if (normalizedAppOrigin) {
        user.appOrigin = normalizedAppOrigin
      }
      if (resolveStoredPublicIp(user) === 'unknown' && loginIp !== 'unknown') {
        user.publicIp = loginIp
      }
      if (resolveStoredSubnet(user) === 'unknown' && loginSubnet !== 'unknown') {
        user.localSubnet = loginSubnet
      }
      if (nextPasswordHash) {
        user.passwordHash = nextPasswordHash
      }
      if (firebaseUidFromLogin) {
        user.firebaseUid = firebaseUidFromLogin
      }
      user.activeSessionId = sessionId
      resolvedUser = { ...user }
    }

    if (Array.isArray(draft.accountDeletionRequests)) {
      const beforeCount = draft.accountDeletionRequests.length
      draft.accountDeletionRequests = draft.accountDeletionRequests.filter(
        (entry) => String(entry?.userId || '').trim() !== matchedUser.id,
      )
      if (draft.accountDeletionRequests.length < beforeCount) {
        deletionCancelled = true
      }
    } else {
      draft.accountDeletionRequests = []
    }

    return draft
  })

  const responseUser =
    normalizeUserWithResolvedRole(resolvedUser) ||
    normalizeUserWithResolvedRole({ ...matchedUser, lastLoginAt: new Date().toISOString() })

  const token = createAccessToken(matchedUser.id, sessionId, responseUser?.role)
  if (config.singleSessionEnforced) {
    emitSessionActivated({
      userId: matchedUser.id,
      sessionId,
      source: 'login',
    })
  }

  return {
    success: true,
    errors: {},
    reason: null,
    user: publicUser(responseUser),
    token,
    message: deletionCancelled
      ? 'Hesap silme işlemi iptal edildi. Oyuna tekrar giriş yaptığınız için hesabınız korunuyor.'
      : '',
  }
}
export async function requestPasswordReset(payload, meta) {
  const errors = validatePasswordResetRequestPayload(payload)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, reason: 'validation' }
  }

  const email = normalize(payload.email)
  const db = await readDb()
  const user = db.users.find((item) => normalize(item.email) === email)

  if (!user) {
    return {
      success: false,
      reason: 'not_found',
      errors: {
        email:
          'Bu e-posta adresi ile kayıtlı hesap bulunamadı. Lütfen adresi kontrol edin veya kayıt olun.',
      },
    }
  }

  if (isFirebaseAuthEnabled()) {
    const firebaseResetResult = await firebaseSendPasswordResetEmail({
      email: user.email,
      continueUrl: getFirebaseAuthResetContinueUrl(),
    })

    if (!firebaseResetResult.success) {
      if (firebaseResetResult.reason === 'account_not_found') {
        return {
          success: false,
          reason: 'mail_unavailable',
          errors: {
            global:
              'Bu hesap için şifre sıfırlama henüz aktif değil. Önce giriş yapıp tekrar deneyin.',
          },
        }
      }

      console.error('[auth] Firebase password reset mail failed.', {
        reason: firebaseResetResult.reason,
        code: firebaseResetResult.code,
        message: firebaseResetResult.message,
      })
      return {
        success: false,
        reason: 'mail_unavailable',
        errors: {
          global:
            'Şu anda şifre sıfırlama bağlantısı gönderilemiyor. Lütfen daha sonra tekrar deneyin.',
        },
      }
    }

    return {
      success: true,
      reason: null,
      message:
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.',
    }
  }

  const resetOrigins = resolveResetLinkOrigins()
  if (resetOrigins.length === 0) {
    console.error('[auth] Password reset mail skipped: reset link origin missing.', {
      nodeEnv: config.nodeEnv,
      clientUrl: config.clientUrl || '-',
      resetLinkBaseUrl: config.resetLinkBaseUrl || '-',
      corsAllowedOriginsCount: Array.isArray(config.corsAllowedOrigins)
        ? config.corsAllowedOrigins.length
        : 0,
    })
    return {
      success: false,
      reason: 'mail_unavailable',
      errors: {
        global:
          'Şu anda şifre sıfırlama bağlantısı gönderilemiyor. Lütfen daha sonra tekrar deneyin.',
      },
    }
  }

  if (!isSmtpConfigured()) {
    console.error('[auth] Password reset mail skipped: SMTP is not configured.', {
      missing: getSmtpMissingEnvVars(),
    })
    return {
      success: false,
      reason: 'mail_unavailable',
      errors: {
        global:
          'Şu anda şifre sıfırlama bağlantısı gönderilemiyor. Lütfen daha sonra tekrar deneyin.',
      },
    }
  }

  const rawToken = generateSecureToken(40)
  const tokenHash = hashToken(rawToken)
  const now = Date.now()
  const expiresAt = new Date(
    now + config.resetTokenTtlMinutes * 60 * 1000,
  ).toISOString()
  const resetUrl = `${resetOrigins[0]}/?resetToken=${encodeURIComponent(rawToken)}`
  const alternativeResetUrls = resetOrigins
    .slice(1, 3)
    .map((origin) => `${origin}/?resetToken=${encodeURIComponent(rawToken)}`)

  await updateDb((draft) => {
    draft.passwordResetTokens = draft.passwordResetTokens.filter((item) => {
      if (item.usedAt) {
        return new Date(item.usedAt).getTime() > now - 24 * 60 * 60 * 1000
      }

      return new Date(item.expiresAt).getTime() > now - 24 * 60 * 60 * 1000
    })

    draft.passwordResetTokens.push({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      createdAt: new Date().toISOString(),
      expiresAt,
      usedAt: null,
      requesterIp: meta.ip || 'unknown',
      requesterDeviceId: payload.deviceId?.trim() || 'unknown-device',
    })

    return draft
  })

  try {
    await sendPasswordResetEmail({
      to: user.email,
      username: user.username,
      resetUrl,
      alternativeResetUrls,
      expiresMinutes: config.resetTokenTtlMinutes,
    })
  } catch (error) {
    console.error('[auth] Password reset mail send failed.', {
      code: error?.code,
      message: error?.message,
      responseCode: error?.responseCode,
      command: error?.command,
    })
    return {
      success: false,
      reason: 'mail_unavailable',
      errors: {
        global:
          'Şu anda şifre sıfırlama bağlantısı gönderilemiyor. Lütfen daha sonra tekrar deneyin.',
      },
    }
  }

  return {
    success: true,
    reason: null,
    message: `Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Bağlantı ${config.resetTokenTtlMinutes} dakika geçerlidir.`,
  }
}

function findValidResetTokenRecord(db, rawToken) {
  const tokenHash = hashToken(rawToken || '')
  const now = Date.now()

  const tokenRecord = db.passwordResetTokens.find((item) => hashEquals(item?.tokenHash, tokenHash))
  if (!tokenRecord) {
    return { record: null, reason: 'invalid_token' }
  }

  if (tokenRecord.usedAt) {
    return { record: null, reason: 'token_used' }
  }

  if (new Date(tokenRecord.expiresAt).getTime() < now) {
    return { record: null, reason: 'token_expired' }
  }

  return { record: tokenRecord, reason: null }
}

export async function validateResetToken(rawToken) {
  if (!rawToken) {
    return {
      success: false,
      reason: 'invalid_token',
      errors: { global: 'Sıfırlama bağlantısı geçersiz.' },
    }
  }

  if (isFirebaseAuthEnabled()) {
    const firebaseVerifyResult = await firebaseVerifyPasswordResetCode(rawToken)
    if (!firebaseVerifyResult.success) {
      return {
        success: false,
        reason:
          firebaseVerifyResult.reason === 'token_expired'
            ? 'token_expired'
            : 'invalid_token',
        errors: { global: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' },
      }
    }

    return { success: true, reason: null }
  }

  const db = await readDb()
  const { record, reason } = findValidResetTokenRecord(db, rawToken)

  if (!record) {
    return {
      success: false,
      reason,
      errors: { global: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' },
    }
  }

  return { success: true, reason: null }
}

export async function resetPasswordWithToken(payload) {
  const errors = validatePasswordResetPayload(payload)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, reason: 'validation' }
  }

  if (isFirebaseAuthEnabled()) {
    const firebaseResetResult = await firebaseConfirmPasswordReset(
      payload.token,
      payload.newPassword,
    )

    if (!firebaseResetResult.success) {
      return {
        success: false,
        reason:
          firebaseResetResult.reason === 'token_expired'
            ? 'token_expired'
            : 'invalid_token',
        errors: { global: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' },
      }
    }

    const safeEmail = normalize(firebaseResetResult.email)
    if (safeEmail) {
      const db = await readDb()
      const targetUser = db.users.find((item) => normalize(item.email) === safeEmail)
      if (targetUser) {
        if (isPasswordSameAsIdentity(payload.newPassword, targetUser.username, targetUser.email)) {
          return {
            success: false,
            reason: 'validation',
            errors: { newPassword: 'Yeni şifre kullanıcı adı veya e-posta ile aynı olamaz.' },
          }
        }

        const isSameAsCurrent = await comparePasswordSafe(payload.newPassword, targetUser.passwordHash)
        if (isSameAsCurrent) {
          return {
            success: false,
            reason: 'validation',
            errors: { newPassword: 'Yeni şifre mevcut şifreyle aynı olamaz.' },
          }
        }

        const duplicatePassword = await isPasswordUsedByAnotherUser(db.users, payload.newPassword, {
          excludedUserId: targetUser.id,
        })
        if (duplicatePassword) {
          return {
            success: false,
            reason: 'validation',
            errors: { newPassword: 'Bu şifre başka bir hesapta kullanılıyor. Farklı bir şifre seçin.' },
          }
        }

        const passwordHash = await bcrypt.hash(payload.newPassword, PASSWORD_HASH_ROUNDS)
        const updatedAt = new Date().toISOString()
        await updateDb((draft) => {
          const mutableTarget = draft.users.find((item) => normalize(item.email) === safeEmail)
          if (mutableTarget) {
            mutableTarget.passwordHash = passwordHash
            mutableTarget.updatedAt = updatedAt
          }
          return draft
        })
      }
    }

    return {
      success: true,
      reason: null,
      message: 'Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz.',
    }
  }

  const db = await readDb()
  const { record, reason } = findValidResetTokenRecord(db, payload.token)

  if (!record) {
    return {
      success: false,
      reason,
      errors: { global: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' },
    }
  }

  const existingUser = db.users.find((item) => item.id === record.userId)
  if (!existingUser) {
    return {
      success: false,
      reason: 'invalid_token',
      errors: { global: 'Sıfırlama kaydı bozuk. Yeni bağlantı isteyin.' },
    }
  }

  if (isPasswordSameAsIdentity(payload.newPassword, existingUser.username, existingUser.email)) {
    return {
      success: false,
      reason: 'validation',
      errors: { newPassword: 'Yeni şifre kullanıcı adı veya e-posta ile aynı olamaz.' },
    }
  }

  const isSameAsCurrent = await comparePasswordSafe(payload.newPassword, existingUser.passwordHash)
  if (isSameAsCurrent) {
    return {
      success: false,
      reason: 'validation',
      errors: { newPassword: 'Yeni şifre mevcut şifreyle aynı olamaz.' },
    }
  }

  const duplicatePassword = await isPasswordUsedByAnotherUser(db.users, payload.newPassword, {
    excludedUserId: existingUser.id,
  })
  if (duplicatePassword) {
    return {
      success: false,
      reason: 'validation',
      errors: { newPassword: 'Bu şifre başka bir hesapta kullanılıyor. Farklı bir şifre seçin.' },
    }
  }

  const passwordHash = await bcrypt.hash(payload.newPassword, PASSWORD_HASH_ROUNDS)
  const usedAt = new Date().toISOString()
  const tokenHash = hashToken(payload.token)

  await updateDb((draft) => {
    const targetUser = draft.users.find((item) => item.id === record.userId)
    if (targetUser) {
      targetUser.passwordHash = passwordHash
      targetUser.updatedAt = usedAt
    }

    draft.passwordResetTokens = draft.passwordResetTokens.map((item) => {
      if (item.userId === record.userId && !item.usedAt) {
        return { ...item, usedAt }
      }

      if (hashEquals(item?.tokenHash, tokenHash)) {
        return { ...item, usedAt }
      }

      return item
    })

    return draft
  })

  return {
    success: true,
    reason: null,
    message: 'Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz.',
  }
}

export async function changeUsernameForUser(userId, payload) {
  const { errors, username } = validateUsernameChangePayload(payload)
  if (Object.keys(errors).length > 0) {
    return { success: false, reason: 'validation', errors }
  }

  let result
  await updateDb((draft) => {
    const targetUser = draft.users.find((item) => item.id === userId)
    if (!targetUser) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return draft
    }

    const normalizedNext = normalize(username)
    const normalizedCurrent = normalize(targetUser.username)
    if (isReservedAdminUsername(normalizedNext) && !canUseReservedAdminUsername(targetUser.email)) {
      result = {
        success: false,
        reason: 'validation',
        errors: { username: '"admin" kullanıcı adı sadece yetkili hesapta kullanılabilir.' },
      }
      return draft
    }

    const gameProfile = Array.isArray(draft.gameProfiles)
      ? draft.gameProfiles.find((item) => item?.userId === userId)
      : null

    const diamondsNowRaw = Number(gameProfile?.reputation ?? 0)
    const diamondsNow = Number.isFinite(diamondsNowRaw)
      ? Math.max(0, Math.trunc(diamondsNowRaw))
      : 0

    if (normalizedNext === normalizedCurrent) {
      result = {
        success: true,
        reason: null,
        message: 'Kullanıcı adı zaten güncel.',
        diamonds: diamondsNow,
        user: publicUser(targetUser),
      }
      return draft
    }

    const exists = draft.users.some(
      (item) => item.id !== userId && normalize(item.username) === normalizedNext,
    )
    if (exists) {
      result = {
        success: false,
        reason: 'username_exists',
        errors: { username: 'Bu kullanıcı adı zaten kullanılıyor.' },
      }
      return draft
    }

    if (!gameProfile) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Oyun profili hazır değil. Şehir ekranını açıp tekrar deneyin.' },
      }
      return draft
    }

    if (diamondsNow < USERNAME_CHANGE_DIAMOND_COST) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: {
          global: `Kullanıcı adı değiştirmek için ${USERNAME_CHANGE_DIAMOND_COST} elmas gerekli. Mevcut elmas: ${diamondsNow}.`,
        },
      }
      return draft
    }

    const now = new Date().toISOString()
    targetUser.username = username
    targetUser.updatedAt = now

    gameProfile.username = username
    gameProfile.reputation = Math.max(0, diamondsNow - USERNAME_CHANGE_DIAMOND_COST)
    gameProfile.updatedAt = now

    result = {
      success: true,
      reason: null,
      message: `Kullanıcı adı güncellendi. ${USERNAME_CHANGE_DIAMOND_COST} elmas düşüldü.`,
      diamonds: gameProfile.reputation,
      user: publicUser(targetUser),
    }
    return draft
  })

  return result
}

export async function changePasswordForUser(userId, payload) {
  const { errors, newPassword } = validatePasswordChangePayload(payload)
  if (Object.keys(errors).length > 0) {
    return { success: false, reason: 'validation', errors }
  }

  const db = await readDb()
  const existingUser = db.users.find((item) => item.id === userId)
  if (!existingUser) {
    return {
      success: false,
      reason: 'unauthorized',
      errors: { global: 'Oturum bulunamadı.' },
    }
  }

  const isSameAsCurrent = await comparePasswordSafe(newPassword, existingUser.passwordHash)
  if (isSameAsCurrent) {
    return {
      success: false,
      reason: 'validation',
      errors: { newPassword: 'Yeni şifre mevcut şifreyle aynı olamaz.' },
    }
  }

  if (isPasswordSameAsIdentity(newPassword, existingUser.username, existingUser.email)) {
    return {
      success: false,
      reason: 'validation',
      errors: { newPassword: 'Yeni şifre kullanıcı adı veya e-posta ile aynı olamaz.' },
    }
  }

  const duplicatePassword = await isPasswordUsedByAnotherUser(db.users, newPassword, {
    excludedUserId: existingUser.id,
  })
  if (duplicatePassword) {
    return {
      success: false,
      reason: 'validation',
      errors: { newPassword: 'Bu şifre başka bir hesapta kullanılıyor. Farklı bir şifre seçin.' },
    }
  }

  const nextHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS)
  const updatedAt = new Date().toISOString()

  await updateDb((draft) => {
    const targetUser = draft.users.find((item) => item.id === userId)
    if (!targetUser) return draft
    targetUser.passwordHash = nextHash
    targetUser.updatedAt = updatedAt
    return draft
  })

  return {
    success: true,
    reason: null,
    message: 'Şifreniz güncellendi.',
  }
}

export async function deleteAccountForUser(userId, payload) {
  if (!ACCOUNT_DELETION_ENABLED) {
    return {
      success: false,
      reason: 'forbidden',
      errors: { global: 'Hesap silme özelliği kapalı.' },
    }
  }

  const currentPassword = String(payload?.currentPassword || '')
  if (!currentPassword) {
    return {
      success: false,
      reason: 'validation',
      errors: { currentPassword: 'Mevcut \u015fifre zorunludur.' },
    }
  }

  await processDueAccountDeletions()

  const db = await readDb()
  const existingUser = db.users.find((item) => item.id === userId)
  if (!existingUser) {
    return {
      success: false,
      reason: 'unauthorized',
      errors: { global: 'Oturum bulunamad\u0131.' },
    }
  }

  const matches = await comparePasswordSafe(currentPassword, existingUser.passwordHash)
  if (!matches) {
    return {
      success: false,
      reason: 'invalid_password',
      errors: { currentPassword: 'Mevcut \u015fifre yanl\u0131\u015f.' },
    }
  }

  const nowMs = Date.now()
  const deleteAtMs = nowMs + ACCOUNT_DELETION_GRACE_MS
  const requestedAtIso = new Date(nowMs).toISOString()
  const deleteAtIso = new Date(deleteAtMs).toISOString()

  await updateDb((draft) => {
    const requests = Array.isArray(draft.accountDeletionRequests)
      ? draft.accountDeletionRequests
      : []

    draft.accountDeletionRequests = requests.filter(
      (entry) => String(entry?.userId || '').trim() !== userId,
    )

    draft.accountDeletionRequests.push({
      id: crypto.randomUUID(),
      userId,
      requestedAt: requestedAtIso,
      deleteAt: deleteAtIso,
    })

    return draft
  })

  return {
    success: true,
    reason: null,
    message:
      `Hesab\u0131n silinmek \u00fczere planland\u0131. ${ACCOUNT_DELETION_GRACE_DAYS} g\u00fcn i\u00e7inde giri\u015f yapmazsan hesab\u0131n otomatik silinecek.`,
    deleteAt: deleteAtIso,
    graceDays: ACCOUNT_DELETION_GRACE_DAYS,
  }
}

export async function getAccountDeletionStatusForUser(userId) {
  if (!ACCOUNT_DELETION_ENABLED) {
    const db = await readDb()
    const existingUser = db.users.find((item) => item.id === userId)
    if (!existingUser) {
      return {
        success: false,
        reason: 'unauthorized',
      errors: { global: 'Oturum bulunamadı.' },
      }
    }
    return {
      success: true,
      reason: null,
      scheduled: false,
      requestedAt: '',
      deleteAt: '',
      remainingMs: 0,
      graceDays: ACCOUNT_DELETION_GRACE_DAYS,
      disabled: true,
    }
  }

  await processDueAccountDeletions()

  const db = await readDb()
  const existingUser = db.users.find((item) => item.id === userId)
  if (!existingUser) {
    return {
      success: false,
      reason: 'unauthorized',
      errors: { global: 'Oturum bulunamad\u0131.' },
    }
  }

  const request = findPendingDeletionRequestByUserId(db, userId)
  if (!request) {
    return {
      success: true,
      reason: null,
      scheduled: false,
      requestedAt: '',
      deleteAt: '',
      remainingMs: 0,
      graceDays: ACCOUNT_DELETION_GRACE_DAYS,
    }
  }

  const nowMs = Date.now()
  const deleteAtMs = asValidTimestampMs(request.deleteAt)
  const remainingMs = Number.isFinite(deleteAtMs) ? Math.max(0, deleteAtMs - nowMs) : 0

  return {
    success: true,
    reason: null,
    scheduled: true,
    requestedAt: request.requestedAt,
    deleteAt: request.deleteAt,
    remainingMs,
    graceDays: ACCOUNT_DELETION_GRACE_DAYS,
  }
}

export async function cancelAccountDeletionForUser(userId) {
  await processDueAccountDeletions()

  let cancelled = false
  await updateDb((draft) => {
    const existingUser = Array.isArray(draft.users)
      ? draft.users.find((item) => item.id === userId)
      : null
    if (!existingUser) return draft

    if (!Array.isArray(draft.accountDeletionRequests)) {
      draft.accountDeletionRequests = []
      return draft
    }

    const beforeCount = draft.accountDeletionRequests.length
    draft.accountDeletionRequests = draft.accountDeletionRequests.filter(
      (entry) => String(entry?.userId || '').trim() !== userId,
    )
    cancelled = draft.accountDeletionRequests.length < beforeCount
    return draft
  })

  if (!cancelled) {
    return {
      success: false,
      reason: 'not_found',
      errors: { global: 'Aktif bir hesap silme plan\u0131 bulunamad\u0131.' },
    }
  }

  return {
    success: true,
    reason: null,
    message: 'Hesap silme plan\u0131 iptal edildi. Hesab\u0131n korunuyor.',
  }
}

export async function getUserFromAccessToken(token) {
  await processDueAccountDeletions()

  const payload = await verifyAccessToken(token)
  if (!payload?.sub) {
    return { user: null, message: '' }
  }

  const db = await readDb()
  const existingUser = Array.isArray(db.users)
    ? db.users.find((item) => item.id === payload.sub)
    : null
  if (!existingUser) {
    return { user: null, message: '' }
  }

  const resolvedRole = resolveUserRoleForStorage(existingUser.role, existingUser.email)
  const hasPendingDeletion = Array.isArray(db.accountDeletionRequests)
    && db.accountDeletionRequests.some((entry) => String(entry?.userId || '').trim() === payload.sub)

  if (!hasPendingDeletion && resolvedRole === existingUser.role) {
    return {
      user: publicUser({ ...existingUser, role: resolvedRole }),
      message: '',
    }
  }

  let resolvedUser = publicUser({ ...existingUser, role: resolvedRole })
  let cancellationMessage = ''
  await updateDb((draft) => {
    let changed = false
    const user = Array.isArray(draft.users)
      ? draft.users.find((item) => item.id === payload.sub)
      : null
    if (!user) return NO_DB_WRITE

    const nextRole = resolveUserRoleForStorage(user.role, user.email)
    if (user.role !== nextRole) {
      user.role = nextRole
      changed = true
    }

    if (!Array.isArray(draft.accountDeletionRequests)) {
      if (hasPendingDeletion) {
        draft.accountDeletionRequests = []
        changed = true
      }
    } else {
      const beforeCount = draft.accountDeletionRequests.length
      draft.accountDeletionRequests = draft.accountDeletionRequests.filter(
        (entry) => String(entry?.userId || '').trim() !== payload.sub,
      )
      if (draft.accountDeletionRequests.length < beforeCount) {
        changed = true
        cancellationMessage =
          'Hesap silme i\u015flemi iptal edildi. Oyuna giri\u015f yapt\u0131\u011f\u0131n i\u00e7in hesab\u0131n korunuyor.'
      }
    }

    resolvedUser = publicUser(user)
    return changed ? draft : NO_DB_WRITE
  })

  return {
    user: resolvedUser,
    message: cancellationMessage,
  }
}




