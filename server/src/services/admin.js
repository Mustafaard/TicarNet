import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from '../config.js'
import { NO_DB_WRITE, readDb, updateDb } from '../db.js'
import { emailRegex, normalize } from '../utils.js'
import { getGameOverview } from '../game/service.js'
import { getRequestMetricsSummary } from '../middleware/requestMetrics.js'
import { getBackupHealthSummary, getProcessHealthSummary } from './systemHealth.js'
import {
  ITEM_CATALOG,
  MAX_NOTIFICATION_HISTORY,
  MAX_PUSH_HISTORY,
} from '../game/constants.js'
import { emitMessageCenterRefresh } from '../messages/events.js'
import { USER_ROLES, normalizeUserRole } from './roles.js'

const MAX_LOGS = 1000
const MAX_REQS = 2000
const REQ_TTL_MS = 10 * 60 * 1000
const SEARCH_DEFAULT_LIMIT = 20
const SEARCH_MAX_LIMIT = 50
const USER_LIST_DEFAULT_LIMIT = 120
const USER_LIST_MAX_LIMIT = 500
const AMOUNT_MAX = 1_000_000_000
const MIN_MINUTES = 1
const MAX_MINUTES = 43_200
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 64
const PASSWORD_HASH_ROUNDS = 12
const MAX_GLOBAL_ANNOUNCEMENTS = 100
const MAX_DELETED_ANNOUNCEMENTS = 100
const ANNOUNCEMENT_RESTORE_TTL_MS = 24 * 60 * 60 * 1000
const ANNOUNCEMENT_TITLE_MAX = 80
const ANNOUNCEMENT_BODY_MAX = 2400
const ANNOUNCEMENT_TYPE_ANNOUNCEMENT = 'announcement'
const ANNOUNCEMENT_TYPE_UPDATE = 'update'
const ANNOUNCEMENT_TYPE_SET = new Set([
  ANNOUNCEMENT_TYPE_ANNOUNCEMENT,
  ANNOUNCEMENT_TYPE_UPDATE,
])
const ANNOUNCEMENT_LIST_DEFAULT_LIMIT = 50
const ANNOUNCEMENT_LIST_MAX_LIMIT = 100
const ADMIN_PUSH_TYPE = 'alert'
const ADMIN_PUSH_TITLE = 'Yönetim Bildirimi'
const LOG_SUPPRESSED_ACTIONS = new Set([
  'chat_message_delete',
  'dm_message_delete',
  'logs_view',
  'moderation_queue_view',
  'user_search',
  'user_resolve',
  'announcement_list',
])

const PERM = Object.freeze({
  VIEW_PANEL: 'view_panel',
  VIEW_LOGS: 'view_logs',
  SEARCH_USER: 'search_user',
  DELETE_CHAT: 'delete_chat',
  DELETE_DM: 'delete_dm',
  MUTE: 'mute',
  CHAT_BLOCK: 'chat_block',
  MESSAGE_BLOCK: 'message_block',
  TEMP_BAN: 'temp_ban',
  CASH_GRANT: 'cash_grant',
  DIAMOND_GRANT: 'diamond_grant',
  CASH_REVOKE: 'cash_revoke',
  DIAMOND_REVOKE: 'diamond_revoke',
  RESOURCE_GRANT: 'resource_grant',
  RESOURCE_REVOKE: 'resource_revoke',
  USER_CREDENTIALS_MANAGE: 'user_credentials_manage',
  ROLE_MANAGE: 'role_manage',
  ANNOUNCEMENT_MANAGE: 'announcement_manage',
})

const MOD_PERMS = new Set([
  PERM.VIEW_PANEL,
  PERM.VIEW_LOGS,
  PERM.SEARCH_USER,
  PERM.DELETE_CHAT,
  PERM.DELETE_DM,
  PERM.MUTE,
  PERM.CHAT_BLOCK,
  PERM.MESSAGE_BLOCK,
  PERM.TEMP_BAN,
])
const ADMIN_PERMS = new Set([
  ...MOD_PERMS,
  PERM.CASH_GRANT,
  PERM.DIAMOND_GRANT,
  PERM.CASH_REVOKE,
  PERM.DIAMOND_REVOKE,
  PERM.RESOURCE_GRANT,
  PERM.RESOURCE_REVOKE,
  PERM.USER_CREDENTIALS_MANAGE,
  PERM.ROLE_MANAGE,
  PERM.ANNOUNCEMENT_MANAGE,
])

const RESOURCE_CATALOG = Object.freeze(
  ITEM_CATALOG
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      id: String(entry.id || '').trim(),
      name: String(entry.name || entry.id || '').trim() || String(entry.id || '').trim(),
    }))
    .filter((entry) => entry.id),
)
const RESOURCE_NAME_BY_ID = new Map(RESOURCE_CATALOG.map((entry) => [entry.id, entry.name]))

function nowIso() {
  return new Date().toISOString()
}

function asInt(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function norm(value) {
  return normalize(String(value || '').replace(/\s+/g, ' '))
}

function mask(text, keep = 16) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  return t.length <= keep ? `${t[0]}***` : `${t.slice(0, keep)}***`
}

function roleOf(user) {
  return normalizeUserRole(user?.role, USER_ROLES.PLAYER)
}

function hasPerm(role, perm) {
  const safeRole = normalizeUserRole(role, USER_ROLES.PLAYER)
  if (safeRole === USER_ROLES.ADMIN) return ADMIN_PERMS.has(perm)
  if (safeRole === USER_ROLES.MODERATOR) return MOD_PERMS.has(perm)
  return false
}

function ensureAudit(db) {
  if (!Array.isArray(db.adminAuditLogs)) db.adminAuditLogs = []
  if (!Array.isArray(db.adminActionRequests)) db.adminActionRequests = []
}

function compactMeta(meta = {}) {
  if (!meta || typeof meta !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(meta)) {
    const safeKey = String(key || '').trim()
    if (!safeKey) continue
    if (value === undefined || value === null || value === '') continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    if (Array.isArray(value) && value.length === 0) continue
    out[safeKey] = value
  }
  return out
}

function addLog(db, payload) {
  const actionKey = String(payload?.action || '').trim().toLowerCase()
  if (LOG_SUPPRESSED_ACTIONS.has(actionKey)) return
  ensureAudit(db)
  db.adminAuditLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    actorUserId: String(payload.actorUserId || '').trim(),
    actorUsername: String(payload.actorUsername || '').trim(),
    actorEmail: String(payload.actorEmail || '').trim(),
    actorRole: normalizeUserRole(payload.actorRole, USER_ROLES.PLAYER),
    action: String(payload.action || '').trim(),
    status: String(payload.status || 'failed').trim(),
    message: String(payload.message || '').trim(),
    targetUserId: String(payload.targetUserId || '').trim(),
    targetUsername: String(payload.targetUsername || '').trim(),
    targetEmail: String(payload.targetEmail || '').trim(),
    meta: compactMeta(payload.meta),
  })
  db.adminAuditLogs = db.adminAuditLogs.filter(Boolean).slice(0, MAX_LOGS)
}

function consumeRequestId(db, actorUserId, action, requestId) {
  ensureAudit(db)
  const rid = String(requestId || '').trim()
  if (!rid || rid.length < 8) {
    return { ok: false, reason: 'validation', message: 'requestId zorunlu.' }
  }
  const now = Date.now()
  db.adminActionRequests = db.adminActionRequests
    .filter(Boolean)
    .filter((entry) => {
      const ms = new Date(entry.createdAt || '').getTime()
      return Number.isFinite(ms) && now - ms <= REQ_TTL_MS
    })
  const dup = db.adminActionRequests.some((entry) => (
    String(entry.actorUserId || '').trim() === String(actorUserId || '').trim() &&
    String(entry.action || '').trim() === String(action || '').trim() &&
    String(entry.requestId || '').trim() === rid
  ))
  if (dup) return { ok: false, reason: 'duplicate', message: 'Aynı istek tekrar gönderildi.' }
  db.adminActionRequests.push({
    id: crypto.randomUUID(),
    createdAt: new Date(now).toISOString(),
    actorUserId: String(actorUserId || '').trim(),
    action: String(action || '').trim(),
    requestId: rid,
  })
  if (db.adminActionRequests.length > MAX_REQS) {
    db.adminActionRequests = db.adminActionRequests.slice(-MAX_REQS)
  }
  return { ok: true }
}

function actorPayload(db, actorUserId, options = {}) {
  const ignoreOwnerLock = Boolean(options?.ignoreOwnerLock)
  const actor = (db.users || []).find((u) => String(u?.id || '').trim() === String(actorUserId || '').trim())
  if (!actor) {
    return { ok: false, actor: null, role: USER_ROLES.PLAYER, result: fail('unauthorized', 'Yönetici oturumu bulunamadı.') }
  }
  const role = roleOf(actor)
  if (role === USER_ROLES.PLAYER) {
    return { ok: false, actor, role, result: fail('forbidden', 'Bu paneli kullanmak için yetkin yok.') }
  }
  if (!ignoreOwnerLock && config.adminPanelOwnerEmail && role === USER_ROLES.ADMIN) {
    const actorEmail = normalize(actor?.email || '')
    if (actorEmail !== config.adminPanelOwnerEmail) {
      return {
        ok: false,
        actor,
        role,
        result: fail('forbidden', 'Bu panelde sadece ana yönetici hesabı işlem yapabilir.'),
      }
    }
  }
  return { ok: true, actor, role, result: null }
}

function fail(reason, message) {
  return { success: false, reason, errors: { global: message } }
}

function moderationTargetError(actorRole, targetRole, actionLabel = 'Bu işlem') {
  const safeActorRole = normalizeUserRole(actorRole, USER_ROLES.PLAYER)
  const safeTargetRole = normalizeUserRole(targetRole, USER_ROLES.PLAYER)
  const safeActionLabel = String(actionLabel || 'Bu işlem').trim() || 'Bu işlem'

  if (safeActorRole === USER_ROLES.ADMIN) {
    return null
  }

  if (safeActorRole === USER_ROLES.MODERATOR) {
    if (safeTargetRole === USER_ROLES.ADMIN) {
      return fail('forbidden', 'Moderatörler admin kullanıcılarına işlem uygulayamaz; sadece bildirebilir.')
    }
    if (safeTargetRole === USER_ROLES.MODERATOR) {
      return fail('forbidden', 'Moderatörler birbirine işlem uygulayamaz; sadece bildirebilir.')
    }
    if (safeTargetRole !== USER_ROLES.PLAYER) {
      return fail('forbidden', `${safeActionLabel} sadece normal oyunculara uygulanabilir.`)
    }
    return null
  }

  return fail('forbidden', 'Bu işlem için yetkin yok.')
}

function validateReason(value) {
  const reason = String(value || '').trim().slice(0, 160)
  if (reason.length < 3) return { ok: false, result: fail('validation', 'Neden en az 3 karakter olmalı.') }
  return { ok: true, value: reason }
}

function validateOptionalReason(value) {
  const reason = String(value || '').trim().slice(0, 160)
  if (!reason) return { ok: true, value: '' }
  if (reason.length < 3) {
    return { ok: false, result: fail('validation', 'Neden boş bırakılabilir veya en az 3 karakter olmalı.') }
  }
  return { ok: true, value: reason }
}

function validateAdminEmail(value) {
  const email = normalize(value)
  if (!email) {
    return { ok: false, result: fail('validation', 'E-posta zorunlu.') }
  }
  if (!emailRegex.test(email)) {
    return { ok: false, result: fail('validation', 'Geçerli bir e-posta adresi girin.') }
  }
  return { ok: true, value: email }
}

function isStrongAdminPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return false
  if (/\s/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

function validateMinutes(value) {
  const mins = asInt(value, 0)
  if (mins < MIN_MINUTES || mins > MAX_MINUTES) {
    return { ok: false, result: fail('validation', `Süre ${MIN_MINUTES}-${MAX_MINUTES} dakika olmalı.`) }
  }
  return { ok: true, value: mins }
}

function validateAmount(value) {
  const amount = asInt(value, 0)
  if (amount <= 0) return { ok: false, result: fail('validation', 'Miktar sıfırdan büyük olmalı.') }
  if (amount > AMOUNT_MAX) return { ok: false, result: fail('validation', `Miktar en fazla ${AMOUNT_MAX}.`) }
  return { ok: true, value: amount }
}

function normalizeItemId(value) {
  return String(value || '').trim().toLowerCase()
}

function validateResourceItemId(value) {
  const itemId = normalizeItemId(value)
  if (!itemId) {
    return { ok: false, result: fail('validation', 'Kaynak seçimi zorunlu.') }
  }
  if (!RESOURCE_NAME_BY_ID.has(itemId)) {
    return { ok: false, result: fail('validation', 'Geçersiz kaynak seçildi.') }
  }
  return { ok: true, value: itemId }
}

function parseFuture(value, nowMs = Date.now()) {
  const iso = String(value || '').trim()
  if (!iso) return ''
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms <= nowMs) return ''
  return new Date(ms).toISOString()
}

function futureDetails(value, nowMs = Date.now()) {
  const iso = String(value || '').trim()
  if (!iso) return { active: false, until: '', remainingMs: 0 }
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms <= nowMs) return { active: false, until: '', remainingMs: 0 }
  return {
    active: true,
    until: new Date(ms).toISOString(),
    remainingMs: Math.max(0, ms - nowMs),
  }
}

function latestActionByTarget(db, action, targetUserId) {
  ensureAudit(db)
  const safeAction = String(action || '').trim().toLowerCase()
  const safeTargetUserId = String(targetUserId || '').trim()
  if (!safeAction || !safeTargetUserId) return null
  return (db.adminAuditLogs || []).find((entry) => (
    String(entry?.action || '').trim().toLowerCase() === safeAction &&
    String(entry?.status || '').trim().toLowerCase() === 'success' &&
    String(entry?.targetUserId || '').trim() === safeTargetUserId
  )) || null
}

function ensureChatMeta(db, userId) {
  if (!db.chatState || typeof db.chatState !== 'object') db.chatState = { rooms: {}, userMeta: {} }
  if (!db.chatState.userMeta || typeof db.chatState.userMeta !== 'object') db.chatState.userMeta = {}
  const uid = String(userId || '').trim()
  if (!uid) return null
  if (!db.chatState.userMeta[uid] || typeof db.chatState.userMeta[uid] !== 'object') db.chatState.userMeta[uid] = {}
  return db.chatState.userMeta[uid]
}

function clearUserMuteState(db, user) {
  if (!user || typeof user !== 'object') return
  user.chatMuteUntil = ''
  user.chatMuteReason = ''
  const meta = ensureChatMeta(db, user.id)
  if (!meta) return
  meta.mutedUntil = ''
  meta.muteReason = ''
  meta.muteReasonText = ''
  meta.lastViolationType = ''
  meta.lastViolationAt = ''
  meta.muteStrikeCount = Math.max(0, asInt(meta.muteStrikeCount, 0))
}

function removeUserChatMessages(db, userId) {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return 0
  if (!db.chatState || typeof db.chatState !== 'object') db.chatState = { rooms: {}, userMeta: {} }
  if (!db.chatState.rooms || typeof db.chatState.rooms !== 'object') db.chatState.rooms = {}
  let removed = 0
  for (const [roomKey, roomList] of Object.entries(db.chatState.rooms)) {
    const safeList = Array.isArray(roomList) ? roomList : []
    const nextList = safeList.filter((entry) => String(entry?.userId || '').trim() !== safeUserId)
    removed += Math.max(0, safeList.length - nextList.length)
    db.chatState.rooms[roomKey] = nextList
  }
  return removed
}

function removeUserDataFromDb(db, userId) {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return

  const existingUsers = Array.isArray(db.users) ? db.users : []
  db.users = existingUsers.filter((item) => String(item?.id || '').trim() !== safeUserId)
  db.passwordResetTokens = Array.isArray(db.passwordResetTokens)
    ? db.passwordResetTokens.filter((item) => String(item?.userId || '').trim() !== safeUserId)
    : []
  db.gameProfiles = Array.isArray(db.gameProfiles)
    ? db.gameProfiles.filter((item) => String(item?.userId || '').trim() !== safeUserId)
    : []
  db.directMessages = Array.isArray(db.directMessages)
    ? db.directMessages.filter(
      (item) => (
        String(item?.fromUserId || '').trim() !== safeUserId &&
        String(item?.toUserId || '').trim() !== safeUserId
      ),
    )
    : []
  db.accountDeletionRequests = Array.isArray(db.accountDeletionRequests)
    ? db.accountDeletionRequests.filter((entry) => String(entry?.userId || '').trim() !== safeUserId)
    : []

  if (!db.chatState || typeof db.chatState !== 'object') {
    db.chatState = { rooms: {}, userMeta: {} }
    return
  }

  if (!db.chatState.rooms || typeof db.chatState.rooms !== 'object') {
    db.chatState.rooms = {}
  }
  for (const roomKey of Object.keys(db.chatState.rooms)) {
    const rows = Array.isArray(db.chatState.rooms[roomKey]) ? db.chatState.rooms[roomKey] : []
    db.chatState.rooms[roomKey] = rows.filter(
      (entry) => String(entry?.userId || '').trim() !== safeUserId,
    )
  }

  if (!db.chatState.userMeta || typeof db.chatState.userMeta !== 'object') {
    db.chatState.userMeta = {}
    return
  }
  delete db.chatState.userMeta[safeUserId]
}

function findProfileByUserId(db, userId) {
  const uid = String(userId || '').trim()
  if (!uid) return null
  return (db.gameProfiles || []).find((entry) => String(entry?.userId || '').trim() === uid) || null
}

function ensureProfileInventory(profile) {
  if (!profile || typeof profile !== 'object') return
  if (!Array.isArray(profile.inventory)) profile.inventory = []
}

function getInventoryQuantity(profile, itemId) {
  ensureProfileInventory(profile)
  const safeItemId = normalizeItemId(itemId)
  if (!safeItemId) return 0
  const entry = profile.inventory.find((item) => normalizeItemId(item?.itemId) === safeItemId)
  return Math.max(0, asInt(entry?.quantity, 0))
}

function addInventoryItem(profile, itemId, quantity) {
  ensureProfileInventory(profile)
  const safeItemId = normalizeItemId(itemId)
  const safeQuantity = Math.max(0, asInt(quantity, 0))
  if (!safeItemId || safeQuantity <= 0) return
  const entry = profile.inventory.find((item) => normalizeItemId(item?.itemId) === safeItemId)
  if (!entry) {
    profile.inventory.push({ itemId: safeItemId, quantity: safeQuantity })
    return
  }
  entry.quantity = Math.max(0, asInt(entry.quantity, 0)) + safeQuantity
}

function removeInventoryItem(profile, itemId, quantity) {
  ensureProfileInventory(profile)
  const safeItemId = normalizeItemId(itemId)
  const safeQuantity = Math.max(0, asInt(quantity, 0))
  if (!safeItemId || safeQuantity <= 0) return true
  const entry = profile.inventory.find((item) => normalizeItemId(item?.itemId) === safeItemId)
  const current = Math.max(0, asInt(entry?.quantity, 0))
  if (!entry || current < safeQuantity) return false
  entry.quantity = Math.max(0, current - safeQuantity)
  if (entry.quantity <= 0) {
    profile.inventory = profile.inventory.filter((item) => normalizeItemId(item?.itemId) !== safeItemId)
  }
  return true
}

function ensureProfileMessages(profile) {
  if (!profile || typeof profile !== 'object') return
  if (!Array.isArray(profile.notifications)) profile.notifications = []
  if (!profile.pushCenter || typeof profile.pushCenter !== 'object') {
    profile.pushCenter = {}
  }
  if (!Array.isArray(profile.pushCenter.inbox)) profile.pushCenter.inbox = []
}

function buildEconomyNotice(kind, mode, amount, reason, actorName) {
  const unit = kind === 'cash' ? 'nakit' : 'elmas'
  if (mode === 'revoke') {
    return `Yönetim işlemi: hesabından ${amount} ${unit} düşürüldü. Neden: ${reason}. İşlem: ${actorName}.`
  }
  return `Yönetim işlemi: hesabına ${amount} ${unit} eklendi. Neden: ${reason}. İşlem: ${actorName}.`
}

function buildResourceNotice(itemName, mode, amount, reason, actorName) {
  if (mode === 'revoke') {
    return `Yönetim işlemi: depodan ${amount} ${itemName} düşürüldü. Neden: ${reason}. İşlem: ${actorName}.`
  }
  return `Yönetim işlemi: depoya ${amount} ${itemName} eklendi. Neden: ${reason}. İşlem: ${actorName}.`
}

function formatPenaltyDuration(minutesValue) {
  const minutes = Math.max(0, asInt(minutesValue, 0))
  if (minutes <= 0) return 'kalıcı'
  if (minutes < 60) return `${minutes} dakika`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return remainMinutes > 0 ? `${hours} saat ${remainMinutes} dakika` : `${hours} saat`
}

function buildModerationNotice(action, durationMinutes, reason, until, actorName) {
  const byAction = {
    user_mute: 'susturma',
    user_chat_block: 'sohbet engeli',
    user_message_block: 'mesaj engeli (chat+dm)',
    user_temp_ban: 'geçici engel',
  }
  const label = byAction[action] || 'ceza'
  const durationLabel = formatPenaltyDuration(durationMinutes)
  return `Yönetim cezası: ${durationLabel} ${label} uygulandı. Neden: ${reason}. Bitiş: ${until}. İşlem: ${actorName}.`
}

function sendAdminNotice(db, targetUser, payload = {}) {
  const targetUserId = String(targetUser?.id || '').trim()
  if (!targetUserId) {
    return { sent: false, reason: 'target_missing', notificationId: '', pushId: '', timestamp: nowIso() }
  }
  const profile = findProfileByUserId(db, targetUserId)
  if (!profile) {
    return { sent: false, reason: 'profile_missing', notificationId: '', pushId: '', timestamp: nowIso() }
  }
  ensureProfileMessages(profile)
  const timestamp = nowIso()
  const title = String(payload.title || ADMIN_PUSH_TITLE).trim().slice(0, 80) || ADMIN_PUSH_TITLE
  const message = String(payload.message || '').replace(/\s+/g, ' ').trim().slice(0, 320)
  if (!message) {
    return { sent: false, reason: 'message_empty', notificationId: '', pushId: '', timestamp }
  }
  const type = String(payload.type || ADMIN_PUSH_TYPE).trim() || ADMIN_PUSH_TYPE
  const meta = compactMeta(payload.meta)

  const notificationId = crypto.randomUUID()
  profile.notifications.unshift({
    id: notificationId,
    type,
    message,
    createdAt: timestamp,
  })
  profile.notifications = profile.notifications.filter(Boolean).slice(0, MAX_NOTIFICATION_HISTORY)

  const pushId = crypto.randomUUID()
  profile.pushCenter.inbox.unshift({
    id: pushId,
    type,
    title,
    message,
    read: false,
    createdAt: timestamp,
    meta,
  })
  profile.pushCenter.inbox = profile.pushCenter.inbox.filter(Boolean).slice(0, MAX_PUSH_HISTORY)

  emitMessageCenterRefresh(targetUserId, String(payload.refreshReason || 'admin_action').trim() || 'admin_action')
  return { sent: true, reason: '', notificationId, pushId, timestamp }
}

function resolveTarget(db, payload = {}) {
  const targetLookup = String(payload.targetLookup || payload.targetIdentifier || '').replace(/\s+/g, ' ').trim()
  const targetUsername = String(payload.targetUsername || '').replace(/\s+/g, ' ').trim()
  const targetEmail = String(payload.targetEmail || '').trim()
  const targetUserId = String(payload.targetUserId || '').trim()
  const targetIdentity = targetLookup || targetUsername || targetEmail
  const normalizedIdentity = norm(targetIdentity)
  const users = (db.users || []).filter(Boolean)

  if (!targetUserId && !normalizedIdentity) {
    return { ok: false, result: fail('validation', 'Hedef kullanıcı adı veya e-posta zorunlu.'), target: null }
  }

  const byIdentity = normalizedIdentity
    ? users.filter((u) => (
      norm(u?.username) === normalizedIdentity ||
      norm(u?.email) === normalizedIdentity
    ))
    : []

  if (targetUserId) {
    const byId = users.find((u) => String(u?.id || '').trim() === targetUserId)
    if (!byId) return { ok: false, result: fail('not_found', 'Hedef kullanıcı bulunamadı.'), target: null }
    if (normalizedIdentity) {
      const idMatchesIdentity = (
        norm(byId?.username) === normalizedIdentity ||
        norm(byId?.email) === normalizedIdentity
      )
      if (!idMatchesIdentity) {
        return { ok: false, result: fail('validation', 'Kullanıcı doğrulama bilgisi uyuşmuyor.'), target: null }
      }
    }
    return { ok: true, result: null, target: byId }
  }

  if (byIdentity.length === 0) {
    return { ok: false, result: fail('not_found', 'Kullanıcı bulunamadı.'), target: null }
  }
  if (byIdentity.length > 1) {
    return { ok: false, result: fail('validation', 'Birden fazla eşleşen kullanıcı var. Hedefi doğrula.'), target: null }
  }
  return { ok: true, result: null, target: byIdentity[0] }
}

function userCard(user, profile, nowMs = Date.now()) {
  const hasPassword = String(user?.passwordHash || '').trim().length > 0
  return {
    id: String(user?.id || '').trim(),
    username: String(user?.username || '').trim(),
    email: String(user?.email || '').trim(),
    role: roleOf(user),
    createdAt: String(user?.createdAt || ''),
    lastLoginAt: String(user?.lastLoginAt || ''),
    wallet: Math.max(0, asInt(profile?.wallet, 0)),
    diamonds: Math.max(0, asInt(profile?.reputation, 0)),
    xp: Math.max(0, asInt(profile?.xpTotal, 0)),
    credentials: {
      hasPassword,
      passwordStatus: hasPassword ? 'Gizli (hashlenmiş)' : 'Şifre tanımlı değil',
      passwordUpdatedAt: String(user?.passwordUpdatedAt || user?.updatedAt || ''),
    },
    moderation: {
      tempBanUntil: parseFuture(user?.tempBanUntil, nowMs),
      chatBlockUntil: parseFuture(user?.chatBlockedUntil, nowMs),
      messageBlockUntil: parseFuture(user?.dmBlockedUntil, nowMs),
      chatMuteUntil: parseFuture(user?.chatMuteUntil, nowMs),
      tempBanReason: String(user?.tempBanReason || ''),
      chatBlockReason: String(user?.chatBlockedReason || ''),
      messageBlockReason: String(user?.dmBlockedReason || ''),
      chatMuteReason: String(user?.chatMuteReason || ''),
      permanentBan: Boolean(user?.adminBlocked === true),
      permanentBanReason: String(user?.adminBlockedReason || ''),
      permanentBanAt: String(user?.adminBlockedAt || ''),
    },
  }
}

function ensureGlobalAnnouncements(db) {
  if (!Array.isArray(db.globalAnnouncements)) db.globalAnnouncements = []
}

function ensureDeletedAnnouncements(db) {
  if (!Array.isArray(db.deletedAnnouncements)) db.deletedAnnouncements = []
  const now = Date.now()
  db.deletedAnnouncements = db.deletedAnnouncements
    .filter((entry) => entry && typeof entry === 'object')
    .filter((entry) => {
      const deletedAtMs = new Date(entry?.deletedAt || '').getTime()
      return Number.isFinite(deletedAtMs) && now - deletedAtMs <= ANNOUNCEMENT_RESTORE_TTL_MS
    })
    .slice(0, MAX_DELETED_ANNOUNCEMENTS)
}

function cleanAnnouncementTitle(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ANNOUNCEMENT_TITLE_MAX)
}

function cleanAnnouncementBody(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
    .slice(0, ANNOUNCEMENT_BODY_MAX)
}

function normalizeAnnouncementType(value, fallback = ANNOUNCEMENT_TYPE_ANNOUNCEMENT) {
  const safeFallback = ANNOUNCEMENT_TYPE_SET.has(fallback) ? fallback : ANNOUNCEMENT_TYPE_ANNOUNCEMENT
  const safe = norm(value).replace(/[\s_-]+/g, '')
  if (!safe) return safeFallback
  if (['announcement', 'duyuru', 'bildiri', 'news'].includes(safe)) return ANNOUNCEMENT_TYPE_ANNOUNCEMENT
  if (['update', 'guncelleme', 'guncelle', 'patch', 'bakim'].includes(safe)) return ANNOUNCEMENT_TYPE_UPDATE
  return safeFallback
}

function announcementTypeTag(value) {
  return normalizeAnnouncementType(value) === ANNOUNCEMENT_TYPE_UPDATE ? 'G\u00dcNCELLEME' : 'DUYURU'
}

function announcementCard(db, entry) {
  const id = String(entry?.id || '').trim()
  if (!id) return null
  const title = cleanAnnouncementTitle(entry?.title || 'Duyuru') || 'Duyuru'
  const body = cleanAnnouncementBody(entry?.body || entry?.message || title)
  const announcementType = normalizeAnnouncementType(entry?.announcementType ?? entry?.type)
  const createdAt = String(entry?.createdAt || '').trim()
  const createdByUserId = String(entry?.createdBy || '').trim()
  const creator = createdByUserId
    ? (db.users || []).find((user) => String(user?.id || '').trim() === createdByUserId)
    : null
  const createdByUsername =
    String(entry?.createdByUsername || creator?.username || 'Yönetim').trim() || 'Yönetim'

  return {
    id,
    title,
    body,
    announcementType,
    announcementTag: announcementTypeTag(announcementType),
    createdAt,
    createdByUserId,
    createdByUsername,
  }
}

function can(actorRole, perm) {
  const err = hasPerm(actorRole, perm) ? null : fail('forbidden', 'Bu işlem için yetkin yok.')
  return err
}

export async function getAdminCapabilities(actorUserId) {
  const db = await readDb()
  const actor = actorPayload(db, actorUserId)
  if (!actor.ok) return actor.result
  if (can(actor.role, PERM.VIEW_PANEL)) return can(actor.role, PERM.VIEW_PANEL)
  return {
    success: true,
    actor: { id: actor.actor.id, username: actor.actor.username, email: actor.actor.email, role: actor.role },
    permissions: Array.from(actor.role === USER_ROLES.ADMIN ? ADMIN_PERMS : MOD_PERMS),
    flags: { diamondGrantEnabled: Boolean(config.adminDiamondGrantEnabled) },
    resourceCatalog: RESOURCE_CATALOG,
  }
}

export async function searchAdminUsers(actorUserId, payload = {}) {
  const query = String(payload?.query || payload?.username || payload?.email || '').trim()
  const limit = clamp(asInt(payload?.limit, SEARCH_DEFAULT_LIMIT), 1, SEARCH_MAX_LIMIT)
  const includeStaff = String(payload?.includeStaff || '').trim().toLowerCase() === 'true'
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }
    const permErr = can(actor.role, PERM.SEARCH_USER)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_search', status: 'failed', message: permErr.errors.global, meta: { query, limit } })
      return db
    }
    if (!query) {
      result = { success: true, query: '', total: 0, users: [], hint: 'Kullanıcı adı veya e-posta yazarak arama yap.' }
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_search', status: 'success', message: 'Boş arama isteği.', meta: { query: '', count: 0, searchBy: 'username_or_email' } })
      return db
    }
    const byId = new Map((db.gameProfiles || []).map((p) => [String(p?.userId || '').trim(), p]))
    const users = (db.users || []).filter(Boolean).sort((a, b) => String(a?.username || '').localeCompare(String(b?.username || ''), 'tr'))
    const nq = norm(query)
    const filtered = users
      .filter((u) => (
        norm(u?.username).includes(nq) ||
        norm(u?.email).includes(nq)
      ))
      .filter((u) => {
        if (String(u?.id || '').trim() === String(actor.actor.id || '').trim()) return false
        if (includeStaff) return roleOf(u) !== USER_ROLES.ADMIN
        return roleOf(u) === USER_ROLES.PLAYER
      })
    const cards = filtered.slice(0, limit).map((u) => userCard(u, byId.get(String(u?.id || '').trim()) || null))
    result = { success: true, query, total: cards.length, users: cards, hint: cards.length ? '' : 'Aramaya uygun kullanıcı bulunamadı.' }
    addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_search', status: 'success', message: cards.length ? 'Arama tamamlandı.' : 'Arama sonucu bulunamadı.', meta: { query, count: cards.length, searchBy: 'username_or_email' } })
    return db
  })
  return result
}

export async function listAdminUsers(actorUserId, payload = {}) {
  const query = String(payload?.query || payload?.username || payload?.email || '').trim()
  const limit = clamp(asInt(payload?.limit, USER_LIST_DEFAULT_LIMIT), 1, USER_LIST_MAX_LIMIT)
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'user_list'
    const permErr = can(actor.role, PERM.USER_CREDENTIALS_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: { query, limit },
      })
      return db
    }

    const byId = new Map((db.gameProfiles || []).map((p) => [String(p?.userId || '').trim(), p]))
    const allUsers = (db.users || [])
      .filter(Boolean)
      .sort((a, b) => String(a?.username || '').localeCompare(String(b?.username || ''), 'tr'))

    const nq = norm(query)
    const filtered = nq
      ? allUsers.filter((u) => (
        norm(u?.username).includes(nq) ||
        norm(u?.email).includes(nq)
      ))
      : allUsers

    const list = filtered
      .slice(0, limit)
      .map((u) => userCard(u, byId.get(String(u?.id || '').trim()) || null))

    result = {
      success: true,
      query,
      total: list.length,
      totalMatched: filtered.length,
      users: list,
      hint: list.length ? '' : 'Kullanıcı bulunamadı.',
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Kullanıcı listesi görüntülendi.',
      meta: {
        query,
        limit,
        returned: list.length,
        totalMatched: filtered.length,
      },
    })

    return db
  })
  return result
}

export async function resolveAdminUser(actorUserId, payload = {}) {
  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }
    const permErr = can(actor.role, PERM.SEARCH_USER)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_resolve', status: 'failed', message: permErr.errors.global, meta: { targetLookup, targetUserId } })
      return db
    }
    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_resolve', status: 'failed', message: target.result.errors.global, meta: { targetLookup, targetUserId } })
      return db
    }
    const targetRole = roleOf(target.target)
    if (targetRole === USER_ROLES.ADMIN) {
      result = fail('forbidden', 'Admin hesapları hedef olarak seçilemez.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_resolve', status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email })
      return db
    }
    const profile = findProfileByUserId(db, target.target.id)
    result = { success: true, user: userCard(target.target, profile || null) }
    addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_resolve', status: 'success', message: 'Hedef kullanıcı doğrulandı.', targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: { targetLookup, targetUserId } })
    return db
  })
  return result
}

export async function updateAdminUserEmail(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const targetLookup = String(
    payload?.targetLookup ||
    payload?.targetIdentifier ||
    payload?.targetUsername ||
    payload?.targetEmail ||
    '',
  ).trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const emailCheck = validateAdminEmail(payload?.nextEmail ?? payload?.email)
  if (!emailCheck.ok) return emailCheck.result
  const reasonCheck = validateOptionalReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'user_email_update'
    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      nextEmail: emailCheck.value,
      reason: reasonCheck.value,
    }

    const permErr = can(actor.role, PERM.USER_CREDENTIALS_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const targetRole = roleOf(target.target)
    if (targetRole === USER_ROLES.ADMIN) {
      result = fail('forbidden', 'Admin hesaplarının e-postası bu panelden güncellenemez.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const currentEmail = normalize(target.target.email)
    if (currentEmail === emailCheck.value) {
      result = fail('validation', 'Yeni e-posta mevcut e-posta ile aynı olamaz.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const duplicate = (db.users || []).some((u) => (
      String(u?.id || '').trim() !== String(target.target.id || '').trim() &&
      normalize(u?.email) === emailCheck.value
    ))
    if (duplicate) {
      result = fail('validation', 'Bu e-posta başka bir hesapta kullanılıyor.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    target.target.email = emailCheck.value
    target.target.updatedAt = nowIso()

    const profile = findProfileByUserId(db, target.target.id)
    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Hesap İşlemi',
      message: `Yönetim işlemi: e-posta adresin güncellendi.${reasonCheck.value ? ` Neden: ${reasonCheck.value}.` : ''} İşlem: ${actorName}.`,
      refreshReason: 'admin_account',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        previousEmail: currentEmail,
        nextEmail: emailCheck.value,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
      },
    })

    result = {
      success: true,
      message: `${target.target.username} kullanıcısının e-postası güncellendi.`,
      user: userCard(target.target, profile || null),
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Kullanıcı e-postası güncellendi.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        previousEmail: currentEmail,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function updateAdminUserPassword(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const targetLookup = String(
    payload?.targetLookup ||
    payload?.targetIdentifier ||
    payload?.targetUsername ||
    payload?.targetEmail ||
    '',
  ).trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const newPassword = String(payload?.newPassword || '').trim()
  const confirmPassword = String(payload?.confirmPassword || '').trim()
  const reasonCheck = validateOptionalReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result
  if (!newPassword) return fail('validation', 'Yeni şifre zorunlu.')
  if (!isStrongAdminPassword(newPassword)) {
    return fail('validation', 'Şifre 8-64 karakter olmalı; en az bir küçük harf ve bir rakam içermeli.')
  }
  if (!confirmPassword) return fail('validation', 'Şifre tekrarı zorunlu.')
  if (newPassword !== confirmPassword) return fail('validation', 'Şifreler birbiriyle eşleşmiyor.')

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'user_password_reset'
    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      reason: reasonCheck.value,
    }

    const permErr = can(actor.role, PERM.USER_CREDENTIALS_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const targetRole = roleOf(target.target)
    if (targetRole === USER_ROLES.ADMIN) {
      result = fail('forbidden', 'Admin hesaplarının şifresi bu panelden güncellenemez.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const currentHash = String(target.target.passwordHash || '').trim()
    if (currentHash.startsWith('$2a$') || currentHash.startsWith('$2b$') || currentHash.startsWith('$2y$')) {
      let sameAsCurrent = false
      try {
        sameAsCurrent = bcrypt.compareSync(newPassword, currentHash)
      } catch {
        sameAsCurrent = false
      }
      if (sameAsCurrent) {
        result = fail('validation', 'Yeni şifre mevcut şifreyle aynı olamaz.')
        addLog(db, {
          actorUserId: actor.actor.id,
          actorUsername: actor.actor.username,
          actorEmail: actor.actor.email,
          actorRole: actor.role,
          action,
          status: 'failed',
          message: result.errors.global,
          targetUserId: target.target.id,
          targetUsername: target.target.username,
          targetEmail: target.target.email,
          meta: baseMeta,
        })
        return db
      }
    }

    const normalizedPassword = String(newPassword || '').trim().toLowerCase().replace(/\s+/g, '')
    const normalizedUsername = String(target.target.username || '').trim().toLowerCase().replace(/\s+/g, '')
    const normalizedEmail = String(target.target.email || '').trim().toLowerCase().replace(/\s+/g, '')
    if (normalizedPassword && (normalizedPassword === normalizedUsername || normalizedPassword === normalizedEmail)) {
      result = fail('validation', 'Yeni şifre kullanıcı adı veya e-posta ile aynı olamaz.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const duplicatePasswordUser = Array.isArray(db.users)
      ? db.users.find((candidate) => {
        if (!candidate || candidate.id === target.target.id) return false
        const hash = String(candidate.passwordHash || '').trim()
        if (!(hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'))) return false
        try {
          return bcrypt.compareSync(newPassword, hash)
        } catch {
          return false
        }
      })
      : null
    if (duplicatePasswordUser) {
      result = fail('validation', 'Bu şifre başka bir hesapta kullanılıyor. Farklı bir şifre seçin.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: {
          ...baseMeta,
          conflictUserId: duplicatePasswordUser.id || '',
        },
      })
      return db
    }

    const profile = findProfileByUserId(db, target.target.id)
    const passwordHash = bcrypt.hashSync(newPassword, PASSWORD_HASH_ROUNDS)
    const updatedAt = nowIso()
    target.target.passwordHash = passwordHash
    target.target.passwordUpdatedAt = updatedAt
    target.target.updatedAt = updatedAt
    target.target.activeSessionId = crypto.randomUUID()
    if (!Array.isArray(db.passwordResetTokens)) db.passwordResetTokens = []
    db.passwordResetTokens = db.passwordResetTokens.filter(
      (entry) => String(entry?.userId || '').trim() !== String(target.target.id || '').trim(),
    )

    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Hesap İşlemi',
      message: `Yönetim işlemi: hesabının şifresi yenilendi.${reasonCheck.value ? ` Neden: ${reasonCheck.value}.` : ''} İşlem: ${actorName}.`,
      refreshReason: 'admin_account',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
      },
    })

    result = {
      success: true,
      message: `${target.target.username} kullanıcısının şifresi yenilendi.`,
      user: userCard(target.target, profile || null),
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Kullanıcı şifresi yenilendi.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function deleteAdminUserAccount(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const targetLookup = String(
    payload?.targetLookup ||
    payload?.targetIdentifier ||
    payload?.targetUsername ||
    payload?.targetEmail ||
    '',
  ).trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const reasonCheck = validateReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'user_account_delete'
    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      reason: reasonCheck.value,
    }

    const permErr = can(actor.role, PERM.USER_CREDENTIALS_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    if (String(target.target.id || '').trim() === String(actor.actor.id || '').trim()) {
      result = fail('validation', 'Kendi hesabını bu panelden silemezsin.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const targetRole = roleOf(target.target)
    if (targetRole === USER_ROLES.ADMIN) {
      result = fail('forbidden', 'Admin hesapları bu panelden silinemez.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const targetUser = target.target
    const targetSummary = {
      id: String(targetUser.id || '').trim(),
      username: String(targetUser.username || '').trim(),
      email: String(targetUser.email || '').trim(),
      role: roleOf(targetUser),
    }
    removeUserDataFromDb(db, targetUser.id)

    result = {
      success: true,
      message: `${targetSummary.username} kullanıcısının hesabı kalıcı olarak silindi.`,
      user: targetSummary,
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Kullanıcı hesabı kalıcı olarak silindi.',
      targetUserId: targetSummary.id,
      targetUsername: targetSummary.username,
      targetEmail: targetSummary.email,
      meta: baseMeta,
    })
    return db
  })
  return result
}

async function adjustEconomy(actorUserId, payload, kind, mode = 'grant') {
  const amountCheck = validateAmount(payload?.amount)
  if (!amountCheck.ok) return amountCheck.result
  const reasonCheck = validateReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result

  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const requestId = String(payload?.requestId || '').trim()

  const preDb = await readDb()
  const preTarget = resolveTarget(preDb, payload)
  if (!preTarget.ok) return preTarget.result
    if (!(await getGameOverview(preTarget.target.id))?.success) return fail('not_found', 'Hedef oyuncu profili bulunamadı.')

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const isRevoke = mode === 'revoke'
    const perm = kind === 'cash'
      ? (isRevoke ? PERM.CASH_REVOKE : PERM.CASH_GRANT)
      : (isRevoke ? PERM.DIAMOND_REVOKE : PERM.DIAMOND_GRANT)
    const action = `${kind}_${isRevoke ? 'revoke' : 'grant'}`
    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      amount: amountCheck.value,
      reason: reasonCheck.value,
      resourceKind: kind,
      mode: isRevoke ? 'revoke' : 'grant',
    }

    const permErr = can(actor.role, perm)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }

    if (!isRevoke && kind === 'diamond' && !config.adminDiamondGrantEnabled) {
      result = fail('forbidden', 'Elmas ekleme özelliği devre dışı.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    if (roleOf(target.target) !== USER_ROLES.PLAYER) {
      result = fail('forbidden', 'Ekonomi işlemleri sadece normal oyunculara uygulanabilir.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const profile = findProfileByUserId(db, target.target.id)
    if (!profile) {
      result = fail('not_found', 'Hedef oyuncu profili bulunamadı.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const field = kind === 'cash' ? 'wallet' : 'reputation'
    const before = Math.max(0, asInt(profile[field], 0))
    if (isRevoke && before < amountCheck.value) {
      result = fail('validation', `Hedef oyuncuda yeterli ${kind === 'cash' ? 'nakit' : 'elmas'} yok.`)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: {
          ...baseMeta,
          before,
        },
      })
      return db
    }

    const delta = isRevoke ? -amountCheck.value : amountCheck.value
    profile[field] = before + delta
    profile.updatedAt = nowIso()
    const after = Math.max(0, asInt(profile[field], 0))
    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Ekonomi İşlemi',
      message: buildEconomyNotice(kind, mode, amountCheck.value, reasonCheck.value, actorName),
      refreshReason: 'admin_economy',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        resourceKind: kind,
        amount: amountCheck.value,
        reason: reasonCheck.value,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
      },
    })

    result = {
      success: true,
      message: isRevoke
        ? `${target.target.username} kullanıcısından ${amountCheck.value} ${kind === 'cash' ? 'nakit' : 'elmas'} düşürüldü.`
        : `${target.target.username} kullanıcısına ${amountCheck.value} ${kind === 'cash' ? 'nakit' : 'elmas'} eklendi.`,
      amount: amountCheck.value,
      before,
      after,
      targetUser: { id: target.target.id, username: target.target.username, email: target.target.email },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Ekonomi işlemi tamamlandı.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        before,
        after,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function grantAdminCash(actorUserId, payload = {}) {
  return adjustEconomy(actorUserId, payload, 'cash', 'grant')
}
export async function grantAdminDiamonds(actorUserId, payload = {}) {
  return adjustEconomy(actorUserId, payload, 'diamond', 'grant')
}
export async function revokeAdminCash(actorUserId, payload = {}) {
  return adjustEconomy(actorUserId, payload, 'cash', 'revoke')
}
export async function revokeAdminDiamonds(actorUserId, payload = {}) {
  return adjustEconomy(actorUserId, payload, 'diamond', 'revoke')
}

async function adjustResourceInventory(actorUserId, payload, mode = 'grant') {
  const amountCheck = validateAmount(payload?.amount)
  if (!amountCheck.ok) return amountCheck.result
  const reasonCheck = validateReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result
  const itemCheck = validateResourceItemId(payload?.itemId)
  if (!itemCheck.ok) return itemCheck.result

  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const requestId = String(payload?.requestId || '').trim()
  const itemId = itemCheck.value
  const itemName = RESOURCE_NAME_BY_ID.get(itemId) || itemId

  const preDb = await readDb()
  const preTarget = resolveTarget(preDb, payload)
  if (!preTarget.ok) return preTarget.result
  if (!(await getGameOverview(preTarget.target.id))?.success) {
    return fail('not_found', 'Hedef oyuncu profili bulunamadı.')
  }

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const isRevoke = mode === 'revoke'
    const perm = isRevoke ? PERM.RESOURCE_REVOKE : PERM.RESOURCE_GRANT
    const action = `resource_${isRevoke ? 'revoke' : 'grant'}`
    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      itemId,
      itemName,
      amount: amountCheck.value,
      reason: reasonCheck.value,
      mode: isRevoke ? 'revoke' : 'grant',
    }

    const permErr = can(actor.role, perm)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    if (roleOf(target.target) !== USER_ROLES.PLAYER) {
      result = fail('forbidden', 'Depo kaynak işlemleri sadece normal oyunculara uygulanabilir.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const profile = findProfileByUserId(db, target.target.id)
    if (!profile) {
      result = fail('not_found', 'Hedef oyuncu profili bulunamadı.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const before = getInventoryQuantity(profile, itemId)
    if (isRevoke && before < amountCheck.value) {
      result = fail('validation', `Hedef oyuncunun deposunda yeterli ${itemName} yok.`)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: {
          ...baseMeta,
          before,
        },
      })
      return db
    }

    if (isRevoke) {
      removeInventoryItem(profile, itemId, amountCheck.value)
    } else {
      addInventoryItem(profile, itemId, amountCheck.value)
    }
    profile.updatedAt = nowIso()

    const after = getInventoryQuantity(profile, itemId)
    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Depo İşlemi',
      message: buildResourceNotice(itemName, mode, amountCheck.value, reasonCheck.value, actorName),
      refreshReason: 'admin_resource',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        itemId,
        itemName,
        amount: amountCheck.value,
        reason: reasonCheck.value,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
      },
    })

    result = {
      success: true,
      message: isRevoke
        ? `${target.target.username} kullanıcısının deposundan ${amountCheck.value} ${itemName} düşürüldü.`
        : `${target.target.username} kullanıcısının deposuna ${amountCheck.value} ${itemName} eklendi.`,
      itemId,
      itemName,
      amount: amountCheck.value,
      before,
      after,
      targetUser: { id: target.target.id, username: target.target.username, email: target.target.email },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Depo kaynak işlemi tamamlandı.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        before,
        after,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function grantAdminResource(actorUserId, payload = {}) {
  return adjustResourceInventory(actorUserId, payload, 'grant')
}
export async function revokeAdminResource(actorUserId, payload = {}) {
  return adjustResourceInventory(actorUserId, payload, 'revoke')
}

async function moderate(actorUserId, payload, action, perm, applyFn, options = {}) {
  const reasonCheck = validateReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result
  const minCheck = validateMinutes(payload?.durationMinutes)
  if (!minCheck.ok) return minCheck.result

  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const requestId = String(payload?.requestId || '').trim()

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId, { ignoreOwnerLock: Boolean(options?.ignoreOwnerLock) })
    if (!actor.ok) { result = actor.result; return db }

    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      reason: reasonCheck.value,
      durationMinutes: minCheck.value,
    }

    const permErr = can(actor.role, perm)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    if (String(target.target.id || '').trim() === String(actor.actor.id || '').trim()) {
      result = fail('validation', 'Kendi hesabına bu cezayı uygulayamazsın.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    const targetPermErr = moderationTargetError(
      actor.role,
      roleOf(target.target),
      'Ceza işlemleri',
    )
    if (targetPermErr) {
      result = targetPermErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    const until = new Date(Date.now() + minCheck.value * 60 * 1000).toISOString()
    const applyMetaRaw = applyFn(db, target.target, until, reasonCheck.value)
    const applyMeta = applyMetaRaw && typeof applyMetaRaw === 'object' ? applyMetaRaw : {}
    const removedChatMessages = Math.max(0, asInt(applyMeta.removedChatMessages, 0))
    const removedDirectMessages = Math.max(0, asInt(applyMeta.removedDirectMessages, 0))
    target.target.updatedAt = nowIso()

    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Ceza İşlemi',
      message: buildModerationNotice(action, minCheck.value, reasonCheck.value, until, actorName),
      refreshReason: 'admin_moderation',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        reason: reasonCheck.value,
        durationMinutes: minCheck.value,
        until,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
      },
    })

    const actionMessage = action === 'user_message_block'
      ? `${target.target.username} kullanıcısına mesaj engeli uygulandı.${removedChatMessages > 0 ? ` Sohbetten ${removedChatMessages} mesaj kaldırıldı.` : ''}`
      : `${target.target.username} kullanıcısına ceza uygulandı.`

    result = {
      success: true,
      message: actionMessage,
      durationMinutes: minCheck.value,
      until,
      reason: reasonCheck.value,
      removedChatMessages,
      removedDirectMessages,
      targetUser: { id: target.target.id, username: target.target.username, email: target.target.email },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Ceza uygulandı.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        until,
        removedChatMessages,
        removedDirectMessages,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function setAdminMute(actorUserId, payload = {}) {
  return moderate(actorUserId, payload, 'user_mute', PERM.MUTE, (db, target, until, reason) => {
    target.chatMuteUntil = until
    target.chatMuteReason = reason
    const meta = ensureChatMeta(db, target.id)
    meta.mutedUntil = until
    meta.muteReason = 'manual'
    meta.muteReasonText = reason
    meta.lastViolationType = 'manual'
    meta.lastViolationAt = nowIso()
    meta.muteStrikeCount = Math.max(1, asInt(meta.muteStrikeCount, 0))
  })
}

export async function setAdminChatBlock(actorUserId, payload = {}) {
  return moderate(actorUserId, payload, 'user_chat_block', PERM.CHAT_BLOCK, (_db, target, until, reason) => {
    target.chatBlockedUntil = until
    target.chatBlockedReason = reason
  })
}

export async function setAdminMessageBlock(actorUserId, payload = {}) {
  return moderate(actorUserId, payload, 'user_message_block', PERM.MESSAGE_BLOCK, (db, target, until, reason) => {
    clearUserMuteState(db, target)
    target.chatBlockedUntil = until
    target.chatBlockedReason = reason
    target.dmBlockedUntil = until
    target.dmBlockedReason = reason
    const removedChatMessages = removeUserChatMessages(db, target.id)
    return { removedChatMessages }
  })
}

export async function setAdminTempBan(actorUserId, payload = {}) {
  const durationMinutes = asInt(payload?.durationMinutes, 0)
  if (durationMinutes > 0) {
    return moderate(actorUserId, payload, 'user_temp_ban', PERM.TEMP_BAN, (_db, target, until, reason) => {
      target.tempBanUntil = until
      target.tempBanReason = reason
      target.activeSessionId = `temp-ban-${crypto.randomUUID()}`
      target.adminBlocked = false
      target.adminBlockedAt = ''
      target.adminBlockedReason = ''
    })
  }

  const reasonCheck = validateReason(payload?.reason)
  if (!reasonCheck.ok) return reasonCheck.result

  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const requestId = String(payload?.requestId || '').trim()
  let result

  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'user_perm_ban'
    const baseMeta = {
      requestId,
      targetLookup,
      targetUserId,
      reason: reasonCheck.value,
      durationMinutes: 0,
      permanent: true,
    }

    const permErr = can(actor.role, PERM.TEMP_BAN)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    if (String(target.target.id || '').trim() === String(actor.actor.id || '').trim()) {
      result = fail('validation', 'Kendi hesabına bu cezayı uygulayamazsın.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    const targetPermErr = moderationTargetError(
      actor.role,
      roleOf(target.target),
      'Ban işlemleri',
    )
    if (targetPermErr) {
      result = targetPermErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    const hadPermBan = Boolean(target.target.adminBlocked === true)
    target.target.adminBlocked = true
    target.target.adminBlockedAt = nowIso()
    target.target.adminBlockedReason = reasonCheck.value
    target.target.tempBanUntil = ''
    target.target.tempBanReason = ''
    target.target.activeSessionId = `perm-ban-${crypto.randomUUID()}`
    target.target.updatedAt = nowIso()

    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Ceza İşlemi',
      message: `Yönetim cezası: hesabına kalıcı engel uygulandı. Neden: ${reasonCheck.value}. İşlem: ${actorName}.`,
      refreshReason: 'admin_moderation',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        reason: reasonCheck.value,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
      },
    })

    result = {
      success: true,
      message: hadPermBan
        ? `${target.target.username} kullanıcısının kalıcı engel nedeni güncellendi.`
        : `${target.target.username} kullanıcısı kalıcı olarak engellendi.`,
      durationMinutes: 0,
      until: '',
      reason: reasonCheck.value,
      permanent: true,
      targetUser: { id: target.target.id, username: target.target.username, email: target.target.email },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Kalıcı engel uygulandı.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        hadPermBan,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })

  return result
}

export async function setStaffMute(actorUserId, payload = {}) {
  return moderate(actorUserId, payload, 'user_mute', PERM.MUTE, (db, target, until, reason) => {
    target.chatMuteUntil = until
    target.chatMuteReason = reason
    const meta = ensureChatMeta(db, target.id)
    meta.mutedUntil = until
    meta.muteReason = 'manual'
    meta.muteReasonText = reason
    meta.lastViolationType = 'manual'
    meta.lastViolationAt = nowIso()
    meta.muteStrikeCount = Math.max(1, asInt(meta.muteStrikeCount, 0))
  }, { ignoreOwnerLock: true })
}

export async function setStaffMessageBlock(actorUserId, payload = {}) {
  return moderate(actorUserId, payload, 'user_message_block', PERM.MESSAGE_BLOCK, (db, target, until, reason) => {
    clearUserMuteState(db, target)
    target.chatBlockedUntil = until
    target.chatBlockedReason = reason
    target.dmBlockedUntil = until
    target.dmBlockedReason = reason
    const removedChatMessages = removeUserChatMessages(db, target.id)
    return { removedChatMessages }
  }, { ignoreOwnerLock: true })
}

async function clearMessageBlock(actorUserId, payload = {}, options = {}) {
  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const requestId = String(payload?.requestId || '').trim()
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId, { ignoreOwnerLock: Boolean(options?.ignoreOwnerLock) })
    if (!actor.ok) { result = actor.result; return db }

    const action = 'user_message_block_clear'
    const baseMeta = { requestId, targetLookup, targetUserId }
    const permErr = can(actor.role, PERM.MESSAGE_BLOCK)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const targetPermErr = moderationTargetError(
      actor.role,
      roleOf(target.target),
      'Mesaj engeli işlemleri',
    )
    if (targetPermErr) {
      result = targetPermErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        targetUserId: target.target.id,
        targetUsername: target.target.username,
        targetEmail: target.target.email,
        meta: baseMeta,
      })
      return db
    }

    const nowMs = Date.now()
    const hadChatBlock = Boolean(parseFuture(target.target.chatBlockedUntil, nowMs))
    const hadDmBlock = Boolean(parseFuture(target.target.dmBlockedUntil, nowMs))
    const hadActiveBlock = hadChatBlock || hadDmBlock

    target.target.chatBlockedUntil = ''
    target.target.chatBlockedReason = ''
    target.target.dmBlockedUntil = ''
    target.target.dmBlockedReason = ''
    target.target.updatedAt = nowIso()

    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Ceza İşlemi',
      message: `Yönetim işlemi: mesaj engelin kaldırıldı. İşlem: ${actorName}.`,
      refreshReason: 'admin_moderation',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
      },
    })

    result = {
      success: true,
      message: hadActiveBlock
        ? `${target.target.username} kullanıcısının mesaj engeli kaldırıldı.`
        : `${target.target.username} kullanıcısında aktif mesaj engeli yoktu.`,
      targetUser: { id: target.target.id, username: target.target.username, email: target.target.email },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Mesaj engeli kaldırıldı.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        hadChatBlock,
        hadDmBlock,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function clearAdminMessageBlock(actorUserId, payload = {}) {
  return clearMessageBlock(actorUserId, payload)
}

export async function clearStaffMessageBlock(actorUserId, payload = {}) {
  return clearMessageBlock(actorUserId, payload, { ignoreOwnerLock: true })
}

export async function deleteAdminChatMessage(actorUserId, payload = {}, options = {}) {
  const messageId = String(payload?.messageId || '').trim()
  if (!messageId) return fail('validation', 'Mesaj kimligi zorunlu.')
  const room = String(payload?.room || '').trim().toLowerCase()
  const requestId = String(payload?.requestId || '').trim()
  const reason = String(payload?.reason || '').trim().slice(0, 160)
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId, { ignoreOwnerLock: Boolean(options?.ignoreOwnerLock) })
    if (!actor.ok) { result = actor.result; return db }
    const action = 'chat_message_delete'
    const baseMeta = { messageId, room, requestId, reason }

    const permErr = can(actor.role, PERM.DELETE_CHAT)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }
    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }
    if (!db.chatState || typeof db.chatState !== 'object') db.chatState = { rooms: {}, userMeta: {} }
    if (!db.chatState.rooms || typeof db.chatState.rooms !== 'object') db.chatState.rooms = {}
    const rooms = room ? [room] : Object.keys(db.chatState.rooms)
    let deleted = null
    let deletedRoom = ''
    let deletedIndex = -1
    for (const roomKey of rooms) {
      const list = Array.isArray(db.chatState.rooms[roomKey]) ? db.chatState.rooms[roomKey] : []
      const idx = list.findIndex((m) => String(m?.id || '').trim() === messageId)
      if (idx < 0) continue
      deleted = list[idx]
      deletedRoom = roomKey
      deletedIndex = idx
      break
    }

    if (!deleted || !deletedRoom || deletedIndex < 0) {
      result = fail('not_found', 'Sohbet mesajı bulunamadı.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = (db.users || []).find((u) => String(u?.id || '').trim() === String(deleted?.userId || '').trim())
    const targetPermErr = target
      ? moderationTargetError(actor.role, roleOf(target), 'Mesaj silme işlemleri')
      : null
    if (targetPermErr) {
      result = targetPermErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target?.id || '', targetUsername: target?.username || '', targetEmail: target?.email || '', meta: baseMeta })
      return db
    }

    const roomList = Array.isArray(db.chatState.rooms[deletedRoom]) ? db.chatState.rooms[deletedRoom] : []
    roomList.splice(deletedIndex, 1)
    db.chatState.rooms[deletedRoom] = roomList

    const notice = target && roleOf(target) === USER_ROLES.PLAYER
      ? sendAdminNotice(db, target, {
      title: 'Yönetim Moderasyon İşlemi',
        message: reason
        ? `Yönetim tarafından bir sohbet mesajın silindi. Neden: ${reason}.`
        : 'Yönetim tarafından bir sohbet mesajın silindi.',
        refreshReason: 'admin_moderation',
        meta: {
          source: 'admin_panel',
          action,
          room: deletedRoom,
          messageId,
          requestId,
          actorUserId: actor.actor.id,
          actorUsername: actor.actor.username,
        },
      })
      : { sent: false, reason: 'target_not_player', notificationId: '', pushId: '', timestamp: nowIso() }

    result = {
      success: true,
      message: 'Sohbet mesajı silindi.',
      messageId,
      room: deletedRoom,
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }
    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Sohbet mesajı silindi.',
      targetUserId: target?.id || '',
      targetUsername: target?.username || '',
      targetEmail: target?.email || '',
      meta: {
        ...baseMeta,
        room: deletedRoom,
        messageOwnerUserId: String(deleted?.userId || '').trim(),
        messageCreatedAt: String(deleted?.createdAt || '').trim(),
        maskedText: mask(deleted?.text),
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function deleteAdminDirectMessage(actorUserId, payload = {}, options = {}) {
  const messageId = String(payload?.messageId || '').trim()
  if (!messageId) return fail('validation', 'DM mesaj kimligi zorunlu.')
  const requestId = String(payload?.requestId || '').trim()
  const reason = String(payload?.reason || '').trim().slice(0, 160)
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId, { ignoreOwnerLock: Boolean(options?.ignoreOwnerLock) })
    if (!actor.ok) { result = actor.result; return db }
    const action = 'dm_message_delete'
    const baseMeta = { messageId, requestId, reason }

    const permErr = can(actor.role, PERM.DELETE_DM)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }
    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }
    if (!Array.isArray(db.directMessages)) db.directMessages = []
    const idx = db.directMessages.findIndex((m) => String(m?.id || '').trim() === messageId)
    if (idx < 0) {
      result = fail('not_found', 'DM mesajı bulunamadı.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }
    const candidate = db.directMessages[idx]
    const target = (db.users || []).find((u) => String(u?.id || '').trim() === String(candidate?.fromUserId || '').trim())
    const recipient = (db.users || []).find((u) => String(u?.id || '').trim() === String(candidate?.toUserId || '').trim())
    const targetPermErr = target
      ? moderationTargetError(actor.role, roleOf(target), 'DM mesaj silme işlemleri')
      : null
    if (targetPermErr) {
      result = targetPermErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target?.id || '', targetUsername: target?.username || '', targetEmail: target?.email || '', meta: baseMeta })
      return db
    }

    if (normalizeUserRole(actor.role, USER_ROLES.PLAYER) === USER_ROLES.MODERATOR && recipient && roleOf(recipient) === USER_ROLES.ADMIN) {
      result = fail('forbidden', 'Moderatörler admin kullanıcılarına işlem uygulayamaz; sadece bildirebilir.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: recipient.id, targetUsername: recipient.username, targetEmail: recipient.email, meta: baseMeta })
      return db
    }

    const [deleted] = db.directMessages.splice(idx, 1)

    const notice = target && roleOf(target) === USER_ROLES.PLAYER
      ? sendAdminNotice(db, target, {
      title: 'Yönetim Moderasyon İşlemi',
        message: reason
        ? `Yönetim tarafından bir DM mesajın silindi. Neden: ${reason}.`
        : 'Yönetim tarafından bir DM mesajın silindi.',
        refreshReason: 'admin_moderation',
        meta: {
          source: 'admin_panel',
          action,
          messageId,
          requestId,
          actorUserId: actor.actor.id,
          actorUsername: actor.actor.username,
        },
      })
      : { sent: false, reason: 'target_not_player', notificationId: '', pushId: '', timestamp: nowIso() }

    result = {
      success: true,
      message: 'DM mesajı silindi.',
      messageId,
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }
    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'DM mesajı silindi.',
      targetUserId: target?.id || '',
      targetUsername: target?.username || '',
      targetEmail: target?.email || '',
      meta: {
        ...baseMeta,
        fromUserId: String(deleted?.fromUserId || '').trim(),
        toUserId: String(deleted?.toUserId || '').trim(),
        messageCreatedAt: String(deleted?.createdAt || '').trim(),
        maskedText: mask(deleted?.text),
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function deleteStaffChatMessage(actorUserId, payload = {}) {
  return deleteAdminChatMessage(actorUserId, payload, { ignoreOwnerLock: true })
}

export async function deleteStaffDirectMessage(actorUserId, payload = {}) {
  return deleteAdminDirectMessage(actorUserId, payload, { ignoreOwnerLock: true })
}

export async function setAdminUserRole(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const nextRole = normalizeUserRole(payload?.role, USER_ROLES.PLAYER)
  const reason = String(payload?.reason || '').trim().slice(0, 160)
  const allowedRoles = new Set([USER_ROLES.PLAYER, USER_ROLES.MODERATOR])
  if (!allowedRoles.has(nextRole)) {
    return fail('validation', 'Rol sadece player veya moderator olabilir.')
  }
  if (reason && reason.length < 3) {
    return fail('validation', 'Rol değişimi nedeni en az 3 karakter olmalı.')
  }

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }
    const permErr = can(actor.role, PERM.ROLE_MANAGE)
    const baseMeta = { requestId, targetLookup, targetUserId, nextRole, reason }
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_role_update', status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }
    const req = consumeRequestId(db, actor.actor.id, 'user_role_update', requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_role_update', status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_role_update', status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    if (String(target.target.id || '').trim() === String(actor.actor.id || '').trim()) {
      result = fail('validation', 'Kendi rolünü bu ekrandan değiştiremezsin.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_role_update', status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    const currentRole = roleOf(target.target)
    if (currentRole === USER_ROLES.ADMIN) {
      result = fail('forbidden', 'Admin hesaplarının rolü bu panelden değiştirilemez.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_role_update', status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    if (currentRole === nextRole) {
      result = fail('validation', 'Hedef kullanıcı zaten bu rolde.')
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'user_role_update', status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    target.target.role = nextRole
    target.target.updatedAt = nowIso()
    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Rol İşlemi',
      message: `Yönetim işlemi: hesap rolün ${currentRole} -> ${nextRole} olarak güncellendi.${reason ? ` Neden: ${reason}.` : ''} İşlem: ${actorName}.`,
      refreshReason: 'admin_role',
      meta: {
        source: 'admin_panel',
        action: 'user_role_update',
        requestId,
        previousRole: currentRole,
        nextRole,
        reason: reason || '',
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
      },
    })

    result = {
      success: true,
      message: `${target.target.username} kullanıcısının rolü ${nextRole} olarak güncellendi.`,
      user: {
        id: target.target.id,
        username: target.target.username,
        email: target.target.email,
        role: nextRole,
      },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }
    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action: 'user_role_update',
      status: 'success',
      message: 'Kullanıcı rolü güncellendi.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        previousRole: currentRole,
        nextRole,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

const MODERATOR_WEEKLY_SALARY_DIAMONDS = 200
const MODERATOR_WEEKLY_SALARY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export async function runModeratorSalaryMaintenance() {
  let result = {
    success: true,
    paidCount: 0,
    totalDiamonds: 0,
    runAt: nowIso(),
    updated: false,
  }

  await updateDb((db) => {
    const now = nowIso()
    const nowMs = new Date(now).getTime()
    let paidCount = 0
    let totalDiamonds = 0
    let changed = false

    for (const user of db.users || []) {
      if (!user || roleOf(user) !== USER_ROLES.MODERATOR) continue
      const lastPaidAt = String(user?.moderatorWeeklySalaryPaidAt || '').trim()
      const lastPaidMs = new Date(lastPaidAt).getTime()
      const canPay = !Number.isFinite(lastPaidMs) || (nowMs - lastPaidMs) >= MODERATOR_WEEKLY_SALARY_INTERVAL_MS
      if (!canPay) continue

      const profile = findProfileByUserId(db, user.id)
      if (!profile) continue

      const before = Math.max(0, asInt(profile.reputation, 0))
      profile.reputation = before + MODERATOR_WEEKLY_SALARY_DIAMONDS
      profile.updatedAt = now
      user.moderatorWeeklySalaryPaidAt = now
      user.updatedAt = now
      changed = true
      paidCount += 1
      totalDiamonds += MODERATOR_WEEKLY_SALARY_DIAMONDS

      const notice = sendAdminNotice(db, user, {
        title: 'Moderatör Haftalık Maaşı',
        message: `Sistem ödemesi: haftalık ${MODERATOR_WEEKLY_SALARY_DIAMONDS} elmas maaşın hesabına eklendi.`,
        refreshReason: 'moderator_salary',
        meta: {
          source: 'system',
          action: 'moderator_weekly_salary',
          amount: MODERATOR_WEEKLY_SALARY_DIAMONDS,
        },
      })

      addLog(db, {
        actorUserId: 'system',
        actorUsername: 'system',
        actorEmail: 'system@local',
        actorRole: USER_ROLES.ADMIN,
        action: 'moderator_weekly_salary',
        status: 'success',
        message: 'Moderatör haftalık maaşı ödendi.',
        targetUserId: user.id,
        targetUsername: user.username,
        targetEmail: user.email,
        meta: {
          amount: MODERATOR_WEEKLY_SALARY_DIAMONDS,
          before,
          after: profile.reputation,
          notificationSent: notice.sent,
          notificationReason: notice.reason,
          notificationId: notice.notificationId,
          pushId: notice.pushId,
          notificationAt: notice.timestamp,
        },
      })
    }

    result = {
      success: true,
      paidCount,
      totalDiamonds,
      runAt: now,
      updated: changed,
    }
    return changed ? db : NO_DB_WRITE
  })

  return result
}

export async function getAdminLogs(actorUserId, payload = {}) {
  const limit = clamp(asInt(payload?.limit, 100), 1, MAX_LOGS)
  const action = String(payload?.action || '').trim().toLowerCase()
  const status = String(payload?.status || '').trim().toLowerCase()
  const actorRoleFilterRaw = String(payload?.actorRole || '').trim().toLowerCase()
  const actorRoleFilter = actorRoleFilterRaw
    ? normalizeUserRole(actorRoleFilterRaw, USER_ROLES.PLAYER)
    : ''
  const targetQuery = norm(payload?.targetQuery || payload?.targetUsername || payload?.targetEmail || '')
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId); if (!actor.ok) { result = actor.result; return db }
    const permErr = can(actor.role, PERM.VIEW_LOGS); if (permErr) { result = permErr; addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'logs_view', status: 'failed', message: permErr.errors.global, meta: { limit, action, status, actorRole: actorRoleFilter || '', targetQuery } }); return db }
    ensureAudit(db)
    let logs = db.adminAuditLogs
      .filter(Boolean)
      .filter((l) => !LOG_SUPPRESSED_ACTIONS.has(String(l?.action || '').trim().toLowerCase()))
    if (action) logs = logs.filter((l) => String(l?.action || '').trim().toLowerCase() === action)
    if (status) logs = logs.filter((l) => String(l?.status || '').trim().toLowerCase() === status)
    if (actorRoleFilter && actorRoleFilter !== USER_ROLES.PLAYER) {
      logs = logs.filter((l) => normalizeUserRole(l?.actorRole, USER_ROLES.PLAYER) === actorRoleFilter)
    }
    if (targetQuery) {
      logs = logs.filter((l) => (
        norm(l?.targetUsername).includes(targetQuery) ||
        norm(l?.targetEmail).includes(targetQuery)
      ))
    }
    logs = logs.slice(0, limit)
    result = { success: true, total: logs.length, logs }
    addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'logs_view', status: 'success', message: 'Loglar görüntülendi.', meta: { limit, action, status, actorRole: actorRoleFilter || '', targetQuery, returned: logs.length } })
    return db
  })
  return result
}

export async function getModerationQueues(actorUserId, _payload = {}) {
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId, { ignoreOwnerLock: true })
    if (!actor.ok) { result = actor.result; return db }
    const permErr = can(actor.role, PERM.VIEW_PANEL)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action: 'moderation_queue_view', status: 'failed', message: permErr.errors.global })
      return db
    }

    const nowMs = Date.now()
    const now = new Date(nowMs).toISOString()
    const allUsers = (db.users || []).filter(Boolean)
    const players = allUsers.filter((entry) => roleOf(entry) === USER_ROLES.PLAYER)

    const messageBlocks = players
      .map((entry) => {
        const chat = futureDetails(entry.chatBlockedUntil, nowMs)
        const dm = futureDetails(entry.dmBlockedUntil, nowMs)
        if (!chat.active && !dm.active) return null
        const untilMs = Math.max(
          chat.active ? new Date(chat.until).getTime() : 0,
          dm.active ? new Date(dm.until).getTime() : 0,
        )
        const until = untilMs > 0 ? new Date(untilMs).toISOString() : ''
        const issuer = latestActionByTarget(db, 'user_message_block', entry.id)
          || latestActionByTarget(db, 'user_chat_block', entry.id)
        return {
          userId: entry.id,
          username: String(entry.username || '').trim(),
          email: String(entry.email || '').trim(),
          chatActive: chat.active,
          dmActive: dm.active,
          chatBlockedUntil: chat.until,
          dmBlockedUntil: dm.until,
          until,
          remainingMs: untilMs > nowMs ? Math.max(0, untilMs - nowMs) : 0,
          reason: String(entry.dmBlockedReason || entry.chatBlockedReason || '').trim(),
          issuedBy: issuer
            ? {
                userId: issuer.actorUserId,
                username: issuer.actorUsername,
                email: issuer.actorEmail,
                role: issuer.actorRole,
              }
            : null,
          issuedAt: String(issuer?.createdAt || ''),
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.remainingMs - a.remainingMs)

    const chatBlocks = players
      .map((entry) => {
        const chat = futureDetails(entry.chatBlockedUntil, nowMs)
        if (!chat.active) return null
        const issuer = latestActionByTarget(db, 'user_chat_block', entry.id)
          || latestActionByTarget(db, 'user_message_block', entry.id)
        return {
          userId: entry.id,
          username: String(entry.username || '').trim(),
          email: String(entry.email || '').trim(),
          until: chat.until,
          remainingMs: chat.remainingMs,
          reason: String(entry.chatBlockedReason || '').trim(),
          issuedBy: issuer
            ? {
                userId: issuer.actorUserId,
                username: issuer.actorUsername,
                email: issuer.actorEmail,
                role: issuer.actorRole,
              }
            : null,
          issuedAt: String(issuer?.createdAt || ''),
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.remainingMs - a.remainingMs)

    const tempBans = players
      .map((entry) => {
        const temp = futureDetails(entry.tempBanUntil, nowMs)
        if (!temp.active) return null
        const issuer = latestActionByTarget(db, 'user_temp_ban', entry.id)
        return {
          userId: entry.id,
          username: String(entry.username || '').trim(),
          email: String(entry.email || '').trim(),
          until: temp.until,
          remainingMs: temp.remainingMs,
          reason: String(entry.tempBanReason || '').trim(),
          permanent: false,
          issuedBy: issuer
            ? {
                userId: issuer.actorUserId,
                username: issuer.actorUsername,
                email: issuer.actorEmail,
                role: issuer.actorRole,
              }
            : null,
          issuedAt: String(issuer?.createdAt || ''),
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.remainingMs - a.remainingMs)

    const permanentBans = players
      .filter((entry) => Boolean(entry.adminBlocked === true))
      .map((entry) => {
        const issuer = latestActionByTarget(db, 'user_perm_ban', entry.id)
        return {
          userId: entry.id,
          username: String(entry.username || '').trim(),
          email: String(entry.email || '').trim(),
          blockedAt: String(entry.adminBlockedAt || ''),
          reason: String(entry.adminBlockedReason || '').trim(),
          permanent: true,
          issuedBy: issuer
            ? {
                userId: issuer.actorUserId,
                username: issuer.actorUsername,
                email: issuer.actorEmail,
                role: issuer.actorRole,
              }
            : null,
          issuedAt: String(issuer?.createdAt || ''),
        }
      })
      .sort((a, b) => new Date(b.blockedAt || 0).getTime() - new Date(a.blockedAt || 0).getTime())

    const moderators = actor.role === USER_ROLES.ADMIN
      ? allUsers
          .filter((entry) => roleOf(entry) === USER_ROLES.MODERATOR)
          .map((entry) => ({
            userId: entry.id,
            username: String(entry.username || '').trim(),
            email: String(entry.email || '').trim(),
            lastLoginAt: String(entry.lastLoginAt || ''),
            moderatorWeeklySalaryPaidAt: String(entry.moderatorWeeklySalaryPaidAt || ''),
          }))
          .sort((a, b) => String(a.username || '').localeCompare(String(b.username || ''), 'tr'))
      : []

    result = {
      success: true,
      now,
      actorRole: actor.role,
      messageBlocks,
      chatBlocks: actor.role === USER_ROLES.ADMIN ? chatBlocks : [],
      tempBans: actor.role === USER_ROLES.ADMIN ? tempBans : [],
      permanentBans: actor.role === USER_ROLES.ADMIN ? permanentBans : [],
      moderators,
      counts: {
        messageBlocks: messageBlocks.length,
        chatBlocks: chatBlocks.length,
        tempBans: tempBans.length,
        permanentBans: permanentBans.length,
        moderators: moderators.length,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action: 'moderation_queue_view',
      status: 'success',
      message: 'Moderasyon listeleri görüntülendi.',
      meta: {
        messageBlocks: messageBlocks.length,
        chatBlocks: chatBlocks.length,
        tempBans: tempBans.length,
        permanentBans: permanentBans.length,
        moderators: moderators.length,
      },
    })
    return db
  })
  return result
}

export async function clearAdminBan(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const targetLookup = String(payload?.targetLookup || payload?.targetIdentifier || payload?.targetUsername || payload?.targetEmail || '').trim()
  const targetUserId = String(payload?.targetUserId || '').trim()
  const modeRaw = String(payload?.mode || 'all').trim().toLowerCase()
  const mode = modeRaw === 'permanent' ? 'perm' : modeRaw === 'temporary' ? 'temp' : modeRaw
  if (!new Set(['all', 'temp', 'perm']).has(mode)) {
    return fail('validation', 'Ban kaldırma modu geçersiz.')
  }

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }
    const action = 'user_ban_clear'
    const baseMeta = { requestId, targetLookup, targetUserId, mode }
    const permErr = can(actor.role, PERM.TEMP_BAN)
    if (permErr) {
      result = permErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: permErr.errors.global, meta: baseMeta })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const target = resolveTarget(db, payload)
    if (!target.ok) {
      result = target.result
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, meta: baseMeta })
      return db
    }

    const targetPermErr = moderationTargetError(
      actor.role,
      roleOf(target.target),
      'Ban işlemleri',
    )
    if (targetPermErr) {
      result = targetPermErr
      addLog(db, { actorUserId: actor.actor.id, actorUsername: actor.actor.username, actorEmail: actor.actor.email, actorRole: actor.role, action, status: 'failed', message: result.errors.global, targetUserId: target.target.id, targetUsername: target.target.username, targetEmail: target.target.email, meta: baseMeta })
      return db
    }

    const nowMs = Date.now()
    const hadTempBan = Boolean(parseFuture(target.target.tempBanUntil, nowMs))
    const hadPermBan = Boolean(target.target.adminBlocked === true)
    const clearTemp = mode === 'all' || mode === 'temp'
    const clearPerm = mode === 'all' || mode === 'perm'

    if (clearTemp) {
      target.target.tempBanUntil = ''
      target.target.tempBanReason = ''
    }
    if (clearPerm) {
      target.target.adminBlocked = false
      target.target.adminBlockedAt = ''
      target.target.adminBlockedReason = ''
    }
    target.target.updatedAt = nowIso()

    const wasChanged = (clearTemp && hadTempBan) || (clearPerm && hadPermBan)
    const actorName = String(actor.actor?.username || actor.actor?.email || 'Yönetim').trim()
    const notice = sendAdminNotice(db, target.target, {
      title: 'Yönetim Ceza İşlemi',
      message: wasChanged
        ? `Yönetim işlemi: hesap engelin kaldırıldı. İşlem: ${actorName}.`
        : `Yönetim işlemi: hesap engel kontrolü yapıldı. İşlem: ${actorName}.`,
      refreshReason: 'admin_moderation',
      meta: {
        source: 'admin_panel',
        action,
        requestId,
        mode,
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
      },
    })

    result = {
      success: true,
      message: wasChanged
        ? `${target.target.username} kullanıcısının engeli kaldırıldı.`
        : `${target.target.username} kullanıcısında seçilen tipte aktif engel yoktu.`,
      targetUser: { id: target.target.id, username: target.target.username, email: target.target.email },
      cleared: { temp: clearTemp, perm: clearPerm },
      had: { temp: hadTempBan, perm: hadPermBan },
      notification: {
        sent: notice.sent,
        timestamp: notice.timestamp,
      },
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: wasChanged ? 'Ban kaldırıldı.' : 'Ban kaldırma kontrolü yapıldı.',
      targetUserId: target.target.id,
      targetUsername: target.target.username,
      targetEmail: target.target.email,
      meta: {
        ...baseMeta,
        hadTempBan,
        hadPermBan,
        notificationSent: notice.sent,
        notificationReason: notice.reason,
        notificationId: notice.notificationId,
        pushId: notice.pushId,
        notificationAt: notice.timestamp,
      },
    })
    return db
  })
  return result
}

export async function getAdminAnnouncements(actorUserId, payload = {}) {
  const limit = clamp(
    asInt(payload?.limit, ANNOUNCEMENT_LIST_DEFAULT_LIMIT),
    1,
    ANNOUNCEMENT_LIST_MAX_LIMIT,
  )
  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const permErr = can(actor.role, PERM.ANNOUNCEMENT_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action: 'announcement_list',
        status: 'failed',
        message: permErr.errors.global,
        meta: { limit },
      })
      return db
    }

    ensureGlobalAnnouncements(db)
    const announcements = db.globalAnnouncements
      .map((entry) => announcementCard(db, entry))
      .filter(Boolean)
      .slice(0, limit)

    result = {
      success: true,
      total: announcements.length,
      announcements,
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action: 'announcement_list',
      status: 'success',
      message: 'Duyuru listesi görüntülendi.',
      meta: {
        limit,
        returned: announcements.length,
      },
    })
    return db
  })
  return result
}

export async function getAdminSystemStatus(actorUserId) {
  const db = await readDb()
  const actor = actorPayload(db, actorUserId)
  if (!actor.ok) return actor.result

  const permErr = can(actor.role, PERM.VIEW_PANEL)
  if (permErr) return permErr

  const backup = await getBackupHealthSummary()
  const processSummary = getProcessHealthSummary()
  const requestMetrics = getRequestMetricsSummary()
  const users = Array.isArray(db?.users) ? db.users.length : 0
  const profiles = Array.isArray(db?.gameProfiles) ? db.gameProfiles.length : 0

  return {
    success: true,
    actor: {
      id: String(actor.actor?.id || '').trim(),
      username: String(actor.actor?.username || '').trim(),
      role: actor.role,
    },
    checkedAt: new Date().toISOString(),
    db: {
      path: String(config.dbFilePath || '').trim(),
      users,
      profiles,
    },
    backup,
    process: processSummary,
    requestMetrics,
  }
}

export async function createAdminAnnouncement(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const title = cleanAnnouncementTitle(payload?.title || '')
  const body = cleanAnnouncementBody(payload?.body ?? payload?.message ?? '')
  const announcementType = normalizeAnnouncementType(payload?.announcementType ?? payload?.type ?? payload?.kind)
  if (!title && !body) {
    return fail('validation', 'Başlık veya duyuru metni zorunlu.')
  }

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'announcement_create'
    const baseMeta = {
      requestId,
      titleLength: title.length,
      bodyLength: body.length,
      announcementType,
    }

    const permErr = can(actor.role, PERM.ANNOUNCEMENT_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    ensureGlobalAnnouncements(db)
    const createdAt = nowIso()
    const entry = {
      id: crypto.randomUUID(),
      title: title || 'Duyuru',
      body: body || title,
      announcementType,
      createdAt,
      createdBy: actor.actor.id,
      createdByUsername: String(actor.actor.username || '').trim() || 'Yönetim',
    }
    db.globalAnnouncements.unshift(entry)
    db.globalAnnouncements = db.globalAnnouncements
      .filter((item) => item && typeof item === 'object')
      .slice(0, MAX_GLOBAL_ANNOUNCEMENTS)

    result = {
      success: true,
      message: announcementType === ANNOUNCEMENT_TYPE_UPDATE
        ? 'G\u00fcncelleme duyurusu yay\u0131nland\u0131.'
        : 'Duyuru yay\u0131nland\u0131.',
      announcement: announcementCard(db, entry),
      total: db.globalAnnouncements.length,
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: announcementType === ANNOUNCEMENT_TYPE_UPDATE
        ? 'Y\u00f6netim g\u00fcncelleme duyurusu yay\u0131nland\u0131.'
        : 'Y\u00f6netim duyurusu yay\u0131nland\u0131.',
      meta: {
        ...baseMeta,
        announcementId: entry.id,
        total: db.globalAnnouncements.length,
      },
    })
    return db
  })
  return result
}

export async function deleteAdminAnnouncement(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const announcementId = String(payload?.announcementId || payload?.id || '').trim()
  if (!announcementId) {
    return fail('validation', 'Silinecek duyuru kimliği zorunlu.')
  }

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'announcement_delete'
    const baseMeta = {
      requestId,
      announcementId,
    }

    const permErr = can(actor.role, PERM.ANNOUNCEMENT_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    ensureGlobalAnnouncements(db)
    const index = db.globalAnnouncements.findIndex(
      (entry) => String(entry?.id || '').trim() === announcementId,
    )
    if (index < 0) {
      result = fail('not_found', 'Duyuru bulunamadı.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const removed = db.globalAnnouncements[index]
    db.globalAnnouncements.splice(index, 1)
    const removedCard = announcementCard(db, removed)
    ensureDeletedAnnouncements(db)
    const deletedEntry = {
      id: crypto.randomUUID(),
      deletedAt: nowIso(),
      deletedByUserId: String(actor.actor.id || '').trim(),
      deletedByUsername: String(actor.actor.username || '').trim(),
      announcement: removed,
    }
    db.deletedAnnouncements.unshift(deletedEntry)
    db.deletedAnnouncements = db.deletedAnnouncements
      .filter((entry) => entry && typeof entry === 'object')
      .slice(0, MAX_DELETED_ANNOUNCEMENTS)

    const undoUntilMs = new Date(deletedEntry.deletedAt).getTime() + ANNOUNCEMENT_RESTORE_TTL_MS
    const undoUntil = Number.isFinite(undoUntilMs) ? new Date(undoUntilMs).toISOString() : ''

    result = {
      success: true,
      message: 'Duyuru silindi.',
      announcementId,
      deletedAnnouncementId: deletedEntry.id,
      undoUntil,
      total: db.globalAnnouncements.length,
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Yönetim duyurusu silindi.',
      meta: {
        ...baseMeta,
        deletedAnnouncementId: deletedEntry.id,
        undoUntil,
        removedTitle: String(removedCard?.title || '').trim(),
        total: db.globalAnnouncements.length,
      },
    })
    return db
  })
  return result
}

export async function restoreAdminAnnouncement(actorUserId, payload = {}) {
  const requestId = String(payload?.requestId || '').trim()
  const deletedAnnouncementId = String(
    payload?.deletedAnnouncementId || payload?.undoToken || payload?.id || '',
  ).trim()

  if (!deletedAnnouncementId) {
    return fail('validation', 'Geri alınacak duyuru kimliği zorunlu.')
  }

  let result
  await updateDb((db) => {
    const actor = actorPayload(db, actorUserId)
    if (!actor.ok) { result = actor.result; return db }

    const action = 'announcement_restore'
    const baseMeta = {
      requestId,
      deletedAnnouncementId,
    }

    const permErr = can(actor.role, PERM.ANNOUNCEMENT_MANAGE)
    if (permErr) {
      result = permErr
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: permErr.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const req = consumeRequestId(db, actor.actor.id, action, requestId)
    if (!req.ok) {
      result = fail(req.reason, req.message)
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    ensureGlobalAnnouncements(db)
    ensureDeletedAnnouncements(db)

    const deletedIndex = db.deletedAnnouncements.findIndex(
      (entry) => String(entry?.id || '').trim() === deletedAnnouncementId,
    )

    if (deletedIndex < 0) {
      result = fail('not_found', 'Geri alınacak silinmiş duyuru bulunamadı.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const deletedEntry = db.deletedAnnouncements[deletedIndex]
    const sourceAnnouncement = deletedEntry?.announcement && typeof deletedEntry.announcement === 'object'
      ? deletedEntry.announcement
      : null
    const sourceAnnouncementId = String(sourceAnnouncement?.id || '').trim()
    if (!sourceAnnouncementId) {
      result = fail('validation', 'Silinen duyuru içeriği bozuk.')
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'failed',
        message: result.errors.global,
        meta: baseMeta,
      })
      return db
    }

    const alreadyExists = db.globalAnnouncements.some(
      (entry) => String(entry?.id || '').trim() === sourceAnnouncementId,
    )
    if (alreadyExists) {
      db.deletedAnnouncements.splice(deletedIndex, 1)
      result = {
        success: true,
        message: 'Duyuru zaten aktif listede bulundu, geri alma kaydı temizlendi.',
        announcementId: sourceAnnouncementId,
        total: db.globalAnnouncements.length,
      }
      addLog(db, {
        actorUserId: actor.actor.id,
        actorUsername: actor.actor.username,
        actorEmail: actor.actor.email,
        actorRole: actor.role,
        action,
        status: 'success',
        message: 'Duyuru geri alma kaydı temizlendi (zaten aktif).',
        meta: {
          ...baseMeta,
          announcementId: sourceAnnouncementId,
          total: db.globalAnnouncements.length,
        },
      })
      return db
    }

    db.globalAnnouncements.unshift(sourceAnnouncement)
    db.globalAnnouncements = db.globalAnnouncements
      .filter((entry) => entry && typeof entry === 'object')
      .slice(0, MAX_GLOBAL_ANNOUNCEMENTS)
    db.deletedAnnouncements.splice(deletedIndex, 1)

    const restoredCard = announcementCard(db, sourceAnnouncement)
    result = {
      success: true,
      message: 'Duyuru geri alındı.',
      announcement: restoredCard,
      announcementId: sourceAnnouncementId,
      total: db.globalAnnouncements.length,
    }

    addLog(db, {
      actorUserId: actor.actor.id,
      actorUsername: actor.actor.username,
      actorEmail: actor.actor.email,
      actorRole: actor.role,
      action,
      status: 'success',
      message: 'Yönetim duyurusu geri alındı.',
      meta: {
        ...baseMeta,
        announcementId: sourceAnnouncementId,
        total: db.globalAnnouncements.length,
      },
    })
    return db
  })
  return result
}

