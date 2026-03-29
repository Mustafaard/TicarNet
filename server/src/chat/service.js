import crypto from 'node:crypto'
import { NO_DB_WRITE, readDb, updateDb } from '../db.js'
import {
  applyProfanityMute,
  detectProfanity,
  formatMuteRemaining,
  getMessageMuteState,
} from '../services/chatModeration.js'
import { USER_ROLES, normalizeUserRole } from '../services/roles.js'

const CHAT_ROOMS = ['global', 'trade', 'clan']
const CHAT_ROOM_SET = new Set(CHAT_ROOMS)
const CHAT_PRUNE_TRIGGER = 15
const CHAT_PRUNE_KEEP_COUNT = 15
const CHAT_MAX_HISTORY = 15
const CHAT_MAX_LENGTH = 280
const CHAT_ROOM_LIMIT = CHAT_PRUNE_TRIGGER
const CHAT_COOLDOWN_MS = 5000
const CHAT_RETENTION_MS = 2 * 24 * 60 * 60 * 1000
const CHAT_REPLY_PREVIEW_LENGTH = 92
const CHAT_REPORT_MAX_REASON_LENGTH = 240
const CHAT_REPORT_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000
const CHAT_REPORT_LOG_LIMIT = 1000
const CHAT_REPORT_HISTORY_LIMIT = 4000
const XP_COEFFICIENT_L2 = 1250n
const XP_COEFFICIENT_L1 = -2250n
const XP_COEFFICIENT_C0 = 1500n
const CHAT_LEVEL_CAP = 1000
const CHAT_XP_TOTAL_CAP = cumulativeXpRequiredToReachLevel(CHAT_LEVEL_CAP)
const TURKIYE_UTC_OFFSET_MS = 3 * 60 * 60 * 1000

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

function ensureReportStores(db) {
  if (!Array.isArray(db.adminAuditLogs)) db.adminAuditLogs = []
  if (!Array.isArray(db.chatMessageReports)) db.chatMessageReports = []
}

function pushReportAuditLog(db, payload = {}) {
  ensureReportStores(db)
  db.adminAuditLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
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
  db.adminAuditLogs = db.adminAuditLogs.filter(Boolean).slice(0, CHAT_REPORT_LOG_LIMIT)
}

function toSafeInt(value, fallback = 0) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.trunc(next)
}

function xpRequiredForLevelFormula(level) {
  const safeLevel = Math.max(1, toSafeInt(level, 1))
  const l = BigInt(safeLevel)
  return (XP_COEFFICIENT_L2 * l * l) + (XP_COEFFICIENT_L1 * l) + XP_COEFFICIENT_C0
}

function cumulativeXpRequiredToReachLevel(level) {
  const safeLevel = Math.max(1, toSafeInt(level, 1))
  const n = BigInt(Math.max(0, safeLevel - 1))
  const sumLinear = (n * (n + 1n)) / 2n
  const sumSquares = (n * (n + 1n) * ((2n * n) + 1n)) / 6n
  const total = (XP_COEFFICIENT_L2 * sumSquares) + (XP_COEFFICIENT_L1 * sumLinear) + (XP_COEFFICIENT_C0 * n)
  return total < 0n ? 0n : total
}

function toBigInt(value, fallback = 0n) {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback
    return BigInt(Math.trunc(value))
  }
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  if (/^[+-]?\d+$/.test(raw)) {
    try {
      return BigInt(raw)
    } catch {
      return fallback
    }
  }
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) return fallback
  return BigInt(Math.trunc(numeric))
}

function toSafeRoom(room) {
  const safeRoom = String(room || '').trim().toLowerCase()
  return CHAT_ROOM_SET.has(safeRoom) ? safeRoom : 'global'
}

function toSafeMessageText(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  return value.slice(0, CHAT_MAX_LENGTH)
}

function toSafeReplyToId(value) {
  const safeValue = String(value || '').trim()
  return safeValue || ''
}

function toSafeReplyPreview(value) {
  if (!value || typeof value !== 'object') return null
  const id = toSafeReplyToId(value.id)
  if (!id) return null

  const username = String(value.u || value.username || '').replace(/\s+/g, ' ').trim().slice(0, 42)
  const text = toSafeMessageText(value.t || value.text || '').slice(0, CHAT_REPLY_PREVIEW_LENGTH)

  if (!text) return null
  return {
    id,
    u: username || 'Oyuncu',
    t: text,
  }
}

function levelFromXp(xpTotal) {
  const safeXpRaw = toBigInt(xpTotal, 0n)
  const safeXp = safeXpRaw < 0n
    ? 0n
    : safeXpRaw > CHAT_XP_TOTAL_CAP
      ? CHAT_XP_TOTAL_CAP
      : safeXpRaw
  let level = 1
  let carriedXp = safeXp

  while (carriedXp > 0n && level < CHAT_LEVEL_CAP) {
    const required = xpRequiredForLevelFormula(level)
    if (carriedXp < required) break
    carriedXp -= required
    level += 1
  }

  return level
}

function roleByLevel(level) {
  if (level >= 200) return 'Küresel Milyarder'
  if (level >= 140) return '\u0130mparator Giri\u015fimci'
  if (level >= 80) return 'Uluslararas\u0131 Patron'
  if (level >= 40) return 'K\u0131demli T\u00fcccar'
  return 'Gen\u00e7 \u0130\u015fletmeci'
}

function userRoleValue(user) {
  return normalizeUserRole(user?.role, USER_ROLES.PLAYER)
}

function userRoleLabel(role) {
  const safeRole = normalizeUserRole(role, USER_ROLES.PLAYER)
  if (safeRole === USER_ROLES.ADMIN) return 'Admin'
  if (safeRole === USER_ROLES.MODERATOR) return 'Moderatör'
  return 'Oyuncu'
}

function createdMs(value) {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function turkiyeDayStartMs(timestamp) {
  const safeTimestamp = String(timestamp || '').trim() || new Date().toISOString()
  const instantMs = new Date(safeTimestamp).getTime()
  if (!Number.isFinite(instantMs)) return 0
  const trMs = instantMs + TURKIYE_UTC_OFFSET_MS
  const trDate = new Date(trMs)
  const startTrUtcMs = Date.UTC(
    trDate.getUTCFullYear(),
    trDate.getUTCMonth(),
    trDate.getUTCDate(),
    0,
    0,
    0,
    0,
  )
  return startTrUtcMs - TURKIYE_UTC_OFFSET_MS
}

function seasonKeyFromIso(timestamp) {
  const monthStartMsTr = (() => {
    const dayStartMs = turkiyeDayStartMs(timestamp)
    const trDate = new Date(dayStartMs + TURKIYE_UTC_OFFSET_MS)
    const y = trDate.getUTCFullYear()
    const m = trDate.getUTCMonth()
    const monthStartTrUtcMs = Date.UTC(y, m, 1, 0, 0, 0, 0)
    return monthStartTrUtcMs - TURKIYE_UTC_OFFSET_MS
  })()
  const monthStartTrDate = new Date(monthStartMsTr + TURKIYE_UTC_OFFSET_MS)
  const yyyy = monthStartTrDate.getUTCFullYear()
  const mm = String(monthStartTrDate.getUTCMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function normalizeSeasonKey(value) {
  const safeValue = String(value || '').trim()
  if (!/^\d{4}-\d{2}$/.test(safeValue)) return ''
  const [, monthPart] = safeValue.split('-')
  const month = Number(monthPart)
  if (!Number.isFinite(month) || month < 1 || month > 12) return ''
  return safeValue
}

function normalizeSeasonBadgePayload(raw, timestamp = new Date().toISOString()) {
  if (!raw || typeof raw !== 'object') return null
  const currentSeasonKey = seasonKeyFromIso(timestamp)
  const visibleSeasonKey = normalizeSeasonKey(raw.visibleSeasonKey)
  const awardedForSeasonKey = normalizeSeasonKey(raw.awardedForSeasonKey)
  if (!visibleSeasonKey || !awardedForSeasonKey) return null
  if (visibleSeasonKey !== currentSeasonKey) return null

  const tierRaw = String(raw.tier || '').trim().toLowerCase()
  const tier = ['gold', 'silver', 'bronze', 'common'].includes(tierRaw) ? tierRaw : 'gold'
  const label = String(raw.label || 'Sezon Rozeti').trim() || 'Sezon Rozeti'
  const icon = String(raw.icon || '').trim()
  if (!icon) return null

  return {
    rank: Math.max(1, toSafeInt(raw.rank, 1)),
    tier,
    label,
    icon,
    awardedForSeasonKey,
    visibleSeasonKey,
    awardedAt: String(raw.awardedAt || '').trim(),
  }
}

function seasonBadgeFromProfile(profile, timestamp = new Date().toISOString()) {
  return normalizeSeasonBadgePayload(profile?.league?.seasonBadge, timestamp)
}

function isPremiumActive(profile, timestamp = new Date().toISOString()) {
  const until = String(profile?.premiumUntil || '').trim()
  if (!until) return false
  return createdMs(until) > createdMs(timestamp)
}

function safeIso(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function parseFutureIso(value, nowMs = Date.now()) {
  const safeValue = String(value || '').trim()
  if (!safeValue) return ''
  const parsedMs = new Date(safeValue).getTime()
  if (!Number.isFinite(parsedMs) || parsedMs <= nowMs) return ''
  return new Date(parsedMs).toISOString()
}

function muteReasonLabel(reasonCode, fallbackText = '') {
  const safeCode = String(reasonCode || '').trim().toLowerCase()
  const safeFallback = String(fallbackText || '').trim()
  if (safeFallback) return safeFallback
  if (safeCode === 'profanity') return 'Küfür / hakaret'
  if (safeCode === 'manual') return 'Yönetici susturması'
  return 'Sohbet kural ihlali'
}

function cooldownStateFromLastSent(lastSentAt, nowMs = Date.now()) {
  const safeLastSentAt = safeIso(lastSentAt)
  const lastSentMs = safeLastSentAt ? new Date(safeLastSentAt).getTime() : 0
  const availableAtMs = lastSentMs ? lastSentMs + CHAT_COOLDOWN_MS : 0
  const remainingMs = availableAtMs ? Math.max(0, availableAtMs - nowMs) : 0
  const active = remainingMs > 0
  return {
    active,
    lastSentAt: safeLastSentAt,
    availableAt: active ? new Date(availableAtMs).toISOString() : '',
    remainingMs,
    waitSeconds: active ? Math.max(1, Math.ceil(remainingMs / 1000)) : 0,
  }
}

function chatStateView(db, userId, nowMs = Date.now()) {
  const user = Array.isArray(db?.users)
    ? db.users.find((entry) => String(entry?.id || '').trim() === String(userId || '').trim())
    : null
  const metaRoot = db?.chatState?.userMeta && typeof db.chatState.userMeta === 'object'
    ? db.chatState.userMeta
    : {}
  const meta = metaRoot[userId] && typeof metaRoot[userId] === 'object' ? metaRoot[userId] : {}

  const muteState = getMessageMuteState(db, userId, nowMs)
  const autoMutedUntil = safeIso(muteState.mutedUntil)
  const manualMutedUntil = parseFutureIso(user?.chatMuteUntil, nowMs)
  const effectiveMuteUntilMs = Math.max(
    autoMutedUntil ? new Date(autoMutedUntil).getTime() : 0,
    manualMutedUntil ? new Date(manualMutedUntil).getTime() : 0,
  )
  const effectiveMutedUntil =
    Number.isFinite(effectiveMuteUntilMs) && effectiveMuteUntilMs > nowMs
      ? new Date(effectiveMuteUntilMs).toISOString()
      : ''
  const manualMuteIsDominant = Boolean(manualMutedUntil) && manualMutedUntil === effectiveMutedUntil
  const reasonCode = manualMuteIsDominant
    ? 'manual'
    : String(meta.muteReason || meta.lastViolationType || '').trim().toLowerCase()
  const reason = manualMuteIsDominant
    ? String(user?.chatMuteReason || '').trim() || muteReasonLabel('manual')
    : muteReasonLabel(reasonCode, meta.muteReasonText)

  const mute = {
    active: Boolean(effectiveMutedUntil),
    reasonCode: reasonCode || (effectiveMutedUntil ? 'unknown' : ''),
    reason: effectiveMutedUntil ? reason : '',
    mutedUntil: effectiveMutedUntil,
    remainingMs: effectiveMutedUntil ? Math.max(0, effectiveMuteUntilMs - nowMs) : 0,
    strikeCount: Math.max(0, Number(muteState.strikeCount) || 0),
    lastViolationAt: safeIso(meta.lastViolationAt || ''),
  }

  const blockUntil = parseFutureIso(user?.chatBlockedUntil, nowMs)
  const blockReason = String(user?.chatBlockedReason || '').trim()
  const block = {
    active: Boolean(blockUntil),
    reason: blockUntil ? blockReason || 'Yönetici sohbet engeli' : '',
    blockedUntil: blockUntil,
    remainingMs: blockUntil ? Math.max(0, new Date(blockUntil).getTime() - nowMs) : 0,
  }

  const cooldown = cooldownStateFromLastSent(meta.lastSentAt, nowMs)

  return {
    canSend: !mute.active && !block.active && !cooldown.active,
    mute,
    block,
    cooldown,
  }
}

function pruneRoomHistory(entries) {
  const safeEntries = Array.isArray(entries) ? entries : []
  if (safeEntries.length < CHAT_PRUNE_TRIGGER) return safeEntries
  return safeEntries.slice(-CHAT_PRUNE_KEEP_COUNT)
}

function ensureChatRoot(db) {
  const cutoffMs = Date.now() - CHAT_RETENTION_MS
  if (!db.chatState || typeof db.chatState !== 'object') {
    db.chatState = { rooms: {}, userMeta: {} }
  }

  if (!db.chatState.rooms || typeof db.chatState.rooms !== 'object') {
    db.chatState.rooms = {}
  }

  for (const room of CHAT_ROOMS) {
    if (!Array.isArray(db.chatState.rooms[room])) {
      db.chatState.rooms[room] = []
    }
    const sanitized = db.chatState.rooms[room]
      .filter((entry) => {
        if (!entry || typeof entry !== 'object') return false
        return createdMs(entry.createdAt) >= cutoffMs
      })
      .map((entry) => {
        const safeReplyToId = toSafeReplyToId(entry.replyToId)
        const safeReplyTo = toSafeReplyPreview(entry.replyTo)
        return {
          ...entry,
          replyToId: safeReplyToId || '',
          replyTo: safeReplyTo,
        }
      })
      .slice(-CHAT_MAX_HISTORY)
    db.chatState.rooms[room] = pruneRoomHistory(sanitized)
  }

  if (!db.chatState.userMeta || typeof db.chatState.userMeta !== 'object') {
    db.chatState.userMeta = {}
  }
}

function userChatMeta(user, profile, timestamp = new Date().toISOString()) {
  const level = levelFromXp(profile?.xpTotal)
  const userRole = userRoleValue(user)
  return {
    username: user?.username || profile?.username || 'Oyuncu',
    level,
    role: roleByLevel(level),
    userRole,
    userRoleLabel: userRoleLabel(userRole),
    premium: isPremiumActive(profile, timestamp),
    seasonBadge: seasonBadgeFromProfile(profile, timestamp),
    city: 'Ankara',
    clan: 'TN',
    avatarUrl: String(profile?.avatarUrl || '').trim(),
  }
}

function messageView(message, currentUserId, timestamp = new Date().toISOString()) {
  const safeDate = new Date(message.createdAt)
  const at = Number.isNaN(safeDate.getTime())
    ? '--:--'
    : `${`${safeDate.getHours()}`.padStart(2, '0')}:${`${safeDate.getMinutes()}`.padStart(2, '0')}`

  return {
    id: message.id,
    room: message.room,
    userId: message.userId,
    u: message.username,
    lv: message.level,
    role: message.role,
    userRole: normalizeUserRole(message.userRole, USER_ROLES.PLAYER),
    userRoleLabel: String(message.userRoleLabel || '').trim(),
    premium: message.premium === true,
    seasonBadge: normalizeSeasonBadgePayload(message.seasonBadge, timestamp),
    city: message.city,
    clan: message.clan,
    t: message.text,
    replyToId: toSafeReplyToId(message.replyToId) || null,
    replyTo: toSafeReplyPreview(message.replyTo),
    at,
    avatar: message.avatarUrl || '',
    own: currentUserId === message.userId,
    createdAt: message.createdAt,
  }
}

export function isChatRoom(room) {
  return CHAT_ROOM_SET.has(String(room || '').trim().toLowerCase())
}

export async function getChatRoomMessages(userId, room, limit = 25) {
  const safeRoom = toSafeRoom(room)
  const safeLimit = Math.max(1, Math.min(CHAT_ROOM_LIMIT, toSafeInt(limit, CHAT_ROOM_LIMIT)))

  let result
  await updateDb((db) => {
    ensureChatRoot(db)
    const nowMs = Date.now()
    const timestamp = new Date(nowMs).toISOString()
    const user = db.users.find((entry) => entry.id === userId)
    if (!user) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const rows = db.chatState.rooms[safeRoom].slice(-safeLimit)
    result = {
      success: true,
      room: safeRoom,
      messages: rows.map((entry) => messageView(entry, userId, timestamp)),
      chatState: chatStateView(db, userId, nowMs),
    }
    return db
  })

  return result
}

export async function createChatMessage(userId, payload) {
  const safeRoom = toSafeRoom(payload?.room)
  const safeText = toSafeMessageText(payload?.text)
  const safeReplyToId = toSafeReplyToId(payload?.replyToId)
  if (!safeText) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Mesaj boş olamaz.' },
    }
  }

  let result
  await updateDb((db) => {
    ensureChatRoot(db)
    const nowMs = Date.now()
    const timestamp = new Date(nowMs).toISOString()
    const user = db.users.find((entry) => entry.id === userId)
    if (!user) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const restrictions = chatStateView(db, userId, nowMs)
    if (restrictions.block?.active) {
      const remainingLabel = formatMuteRemaining(restrictions.block.remainingMs)
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Sohbet engelin aktif (${restrictions.block.reason}). Kalan süre: ${remainingLabel}.`,
        },
        chatState: restrictions,
      }
      return db
    }

    if (restrictions.mute.active) {
      const remainingLabel = formatMuteRemaining(restrictions.mute.remainingMs)
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Susturma aktif (${restrictions.mute.reason}). Kalan süre: ${remainingLabel}.`,
        },
        chatState: restrictions,
      }
      return db
    }

    const profanity = detectProfanity(safeText)
    if (profanity.flagged) {
      const penalty = applyProfanityMute(db, userId, timestamp)
      const nextRestrictions = chatStateView(db, userId, Date.now())
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Küfür nedeniyle ${penalty.durationHours} saat susturuldun. Bu sürede mesaj g\u00f6nderemezsin.`,
        },
        chatState: nextRestrictions,
      }
      return db
    }

    if (restrictions.cooldown.active) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Mesajlar arasında 5 saniye beklemelisin. Kalan süre: ${restrictions.cooldown.waitSeconds} sn.`,
        },
        chatState: restrictions,
      }
      return db
    }

    const profile = db.gameProfiles.find((entry) => entry.userId === userId)
    const meta = userChatMeta(user, profile, timestamp)
    let replyTo = null
    if (safeReplyToId) {
      const target = db.chatState.rooms[safeRoom].find((entry) => entry?.id === safeReplyToId)
      if (target) {
        replyTo = {
          id: target.id,
          u: String(target.username || 'Oyuncu').replace(/\s+/g, ' ').trim().slice(0, 42) || 'Oyuncu',
          t: toSafeMessageText(target.text || '').slice(0, CHAT_REPLY_PREVIEW_LENGTH),
        }
      }
    }

    const message = {
      id: crypto.randomUUID(),
      room: safeRoom,
      userId,
      username: meta.username,
      level: meta.level,
      role: meta.role,
      userRole: meta.userRole,
      userRoleLabel: meta.userRoleLabel,
      premium: Boolean(meta.premium),
      seasonBadge: meta.seasonBadge || null,
      city: meta.city,
      clan: meta.clan,
      text: safeText,
      replyToId: replyTo?.id || '',
      replyTo: replyTo || null,
      avatarUrl: meta.avatarUrl,
      createdAt: timestamp,
    }

    db.chatState.rooms[safeRoom].push(message)
    if (db.chatState.rooms[safeRoom].length > CHAT_MAX_HISTORY) {
      db.chatState.rooms[safeRoom] = db.chatState.rooms[safeRoom].slice(-CHAT_MAX_HISTORY)
    }
    db.chatState.rooms[safeRoom] = pruneRoomHistory(db.chatState.rooms[safeRoom])

    const previousUserMeta =
      db.chatState.userMeta[userId] && typeof db.chatState.userMeta[userId] === 'object'
        ? db.chatState.userMeta[userId]
        : {}
    db.chatState.userMeta[userId] = {
      ...previousUserMeta,
      lastSentAt: timestamp,
      lastSeenAt: timestamp,
    }

    result = {
      success: true,
      room: safeRoom,
      message: messageView(message, userId, timestamp),
      chatState: chatStateView(db, userId, Date.now()),
    }
    return db
  })

  return result
}

export async function reportChatMessage(userId, payload = {}) {
  const safeMessageId = String(payload?.messageId || '').trim()
  const safeRoomHint = String(payload?.room || '').trim().toLowerCase()
  if (!safeMessageId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Raporlanacak mesaj seçilmedi.' },
    }
  }

  let result
  await updateDb((db) => {
    ensureChatRoot(db)
    ensureReportStores(db)

    const nowMs = Date.now()
    const timestamp = new Date(nowMs).toISOString()
    const reporter = db.users.find((entry) => String(entry?.id || '').trim() === String(userId || '').trim())
    if (!reporter) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return NO_DB_WRITE
    }

    const duplicate = db.chatMessageReports.some((entry) => (
      String(entry?.reporterUserId || '').trim() === String(userId || '').trim() &&
      String(entry?.messageId || '').trim() === safeMessageId &&
      (nowMs - new Date(entry?.createdAt || '').getTime()) < CHAT_REPORT_DUPLICATE_WINDOW_MS
    ))
    if (duplicate) {
      result = {
        success: false,
        reason: 'duplicate',
        errors: { global: 'Bu mesajı zaten raporladın.' },
      }
      return NO_DB_WRITE
    }

    const rooms = []
    if (safeRoomHint && CHAT_ROOM_SET.has(safeRoomHint)) rooms.push(safeRoomHint)
    for (const room of CHAT_ROOMS) {
      if (!rooms.includes(room)) rooms.push(room)
    }

    let targetRoom = ''
    let targetMessage = null
    for (const room of rooms) {
      const messages = Array.isArray(db?.chatState?.rooms?.[room]) ? db.chatState.rooms[room] : []
      const found = messages.find((entry) => String(entry?.id || '').trim() === safeMessageId)
      if (!found) continue
      targetRoom = room
      targetMessage = found
      break
    }

    if (!targetMessage) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Mesaj bulunamadı.' },
      }
      return NO_DB_WRITE
    }

    const safeTargetUserId = String(targetMessage?.userId || '').trim()
    if (!safeTargetUserId || safeTargetUserId === String(userId || '').trim()) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendi mesajını raporlayamazsın.' },
      }
      return NO_DB_WRITE
    }

    const targetUser = db.users.find((entry) => String(entry?.id || '').trim() === safeTargetUserId) || null
    const targetRole = normalizeUserRole(targetUser?.role || targetMessage?.userRole, USER_ROLES.PLAYER)
    if (targetRole === USER_ROLES.ADMIN) {
      result = {
        success: false,
        reason: 'forbidden',
        errors: { global: 'Admin kullanıcıları raporlanamaz.' },
      }
      return NO_DB_WRITE
    }
    const preview = String(targetMessage?.text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_REPORT_MAX_REASON_LENGTH)
    const report = {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      reporterUserId: String(reporter.id || '').trim(),
      reporterUsername: String(reporter.username || '').trim(),
      reporterEmail: String(reporter.email || '').trim(),
      reporterRole: normalizeUserRole(reporter.role, USER_ROLES.PLAYER),
      messageId: safeMessageId,
      room: targetRoom,
      messageOwnerUserId: safeTargetUserId,
      messageOwnerUsername: String(targetMessage?.username || '').trim(),
      messageTextPreview: preview,
      messageCreatedAt: String(targetMessage?.createdAt || '').trim(),
    }

    db.chatMessageReports.unshift(report)
    db.chatMessageReports = db.chatMessageReports
      .filter(Boolean)
      .slice(0, CHAT_REPORT_HISTORY_LIMIT)

    pushReportAuditLog(db, {
      actorUserId: reporter.id,
      actorUsername: reporter.username,
      actorEmail: reporter.email,
      actorRole: reporter.role,
      action: 'chat_message_report',
      status: 'success',
      message: 'Oyuncu sohbet mesajı bildirdi.',
      targetUserId: safeTargetUserId,
      targetUsername: targetUser?.username || report.messageOwnerUsername,
      targetEmail: targetUser?.email || '',
      meta: {
        reportId: report.id,
        room: targetRoom,
        messageId: safeMessageId,
        messageCreatedAt: report.messageCreatedAt,
        reportedText: preview,
      },
    })

    result = {
      success: true,
      message: 'Mesaj yetkililere bildirildi.',
      report: {
        id: report.id,
        messageId: report.messageId,
        room: report.room,
        createdAt: report.createdAt,
      },
    }
    return db
  })

  return result
}

export async function getChatRoomRoster(room, onlineUserIds = []) {
  const safeRoom = toSafeRoom(room)
  const db = await readDb()
  ensureChatRoot(db)

  const onlineSet = new Set(
    Array.isArray(onlineUserIds)
      ? onlineUserIds.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [],
  )

  const profilesByUserId = new Map(
    (Array.isArray(db.gameProfiles) ? db.gameProfiles : [])
      .filter((entry) => entry && entry.userId)
      .map((entry) => [entry.userId, entry]),
  )

  const userMeta = db.chatState.userMeta && typeof db.chatState.userMeta === 'object'
    ? db.chatState.userMeta
    : {}
  const timestamp = new Date().toISOString()

  const users = (Array.isArray(db.users) ? db.users : [])
    .filter((entry) => entry && entry.id)
    .map((entry) => {
      const profile = profilesByUserId.get(entry.id)
      const level = levelFromXp(profile?.xpTotal)
      const role = userRoleValue(entry)
      return {
        userId: entry.id,
        username: entry.username || profile?.username || 'Oyuncu',
        avatarUrl: String(profile?.avatarUrl || '').trim(),
        level,
        role: roleByLevel(level),
        userRole: role,
        userRoleLabel: userRoleLabel(role),
        premium: isPremiumActive(profile, timestamp),
        seasonBadge: seasonBadgeFromProfile(profile, timestamp),
        online: onlineSet.has(entry.id),
        lastSeenAt:
          userMeta?.[entry.id]?.lastSeenAt ||
          userMeta?.[entry.id]?.lastSentAt ||
          entry.lastLoginAt ||
          entry.createdAt ||
          '',
      }
    })
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1
      return a.username.localeCompare(b.username, 'tr')
    })
    .slice(0, 240)

  return {
    success: true,
    room: safeRoom,
    users,
  }
}

export async function runChatRetentionMaintenance() {
  let result = {
    success: true,
    updated: false,
    rooms: CHAT_ROOMS.length,
    trimmedMessages: 0,
    beforeByRoom: {},
    afterByRoom: {},
    ranAt: '',
  }

  await updateDb((db) => {
    let totalBefore = 0
    const beforeByRoom = {}
    for (const room of CHAT_ROOMS) {
      const count = Array.isArray(db?.chatState?.rooms?.[room]) ? db.chatState.rooms[room].length : 0
      beforeByRoom[room] = count
      totalBefore += count
    }

    ensureChatRoot(db)

    let totalAfter = 0
    const afterByRoom = {}
    for (const room of CHAT_ROOMS) {
      const count = Array.isArray(db?.chatState?.rooms?.[room]) ? db.chatState.rooms[room].length : 0
      afterByRoom[room] = count
      totalAfter += count
    }

    result = {
      success: true,
      updated: totalAfter !== totalBefore,
      rooms: CHAT_ROOMS.length,
      trimmedMessages: Math.max(0, totalBefore - totalAfter),
      beforeByRoom,
      afterByRoom,
      ranAt: new Date().toISOString(),
    }

    if (!result.updated) {
      return NO_DB_WRITE
    }

    return db
  })

  return result
}
