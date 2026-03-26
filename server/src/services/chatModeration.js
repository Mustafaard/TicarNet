const PROFANITY_SHORT_WORDS = new Set([
  'amk',
  'aq',
  'sg',
  'mk',
  'sik',
  'got',
  'pic',
  'oc',
])

const PROFANITY_LONG_PATTERNS = [
  'amina',
  'amcik',
  'orospu',
  'siktir',
  'yarrak',
  'yarak',
  'kahpe',
  'gavat',
  'ibne',
  'pezevenk',
  'piic',
]

const MUTE_DURATIONS_MS = [
  1 * 60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  5 * 60 * 60 * 1000,
]

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function normalizeForScan(text) {
  return String(text || '')
    .toLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensureUserMetaRoot(db) {
  if (!db.chatState || typeof db.chatState !== 'object') {
    db.chatState = { rooms: {}, userMeta: {} }
  }
  if (!db.chatState.userMeta || typeof db.chatState.userMeta !== 'object') {
    db.chatState.userMeta = {}
  }
}

function ensureUserMeta(db, userId) {
  ensureUserMetaRoot(db)
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return null

  const current = db.chatState.userMeta[safeUserId]
  if (!current || typeof current !== 'object') {
    db.chatState.userMeta[safeUserId] = {}
  }
  return db.chatState.userMeta[safeUserId]
}

export function detectProfanity(text) {
  const normalized = normalizeForScan(text)
  if (!normalized) return { flagged: false, normalized }

  const tokens = normalized.split(' ').filter(Boolean)
  for (const token of tokens) {
    if (PROFANITY_SHORT_WORDS.has(token)) {
      return { flagged: true, normalized, token }
    }
  }

  const compact = tokens.join('')
  for (const pattern of PROFANITY_LONG_PATTERNS) {
    if (compact.includes(pattern)) {
      return { flagged: true, normalized, token: pattern }
    }
  }

  return { flagged: false, normalized }
}

export function getMessageMuteState(db, userId, nowMs = Date.now()) {
  const entry = ensureUserMeta(db, userId)
  if (!entry) {
    return {
      isMuted: false,
      mutedUntil: '',
      remainingMs: 0,
      strikeCount: 0,
    }
  }

  const mutedUntil = typeof entry.mutedUntil === 'string' ? entry.mutedUntil : ''
  const mutedUntilMs = mutedUntil ? new Date(mutedUntil).getTime() : 0
  const validMute = Number.isFinite(mutedUntilMs) && mutedUntilMs > nowMs
  if (!validMute) {
    entry.mutedUntil = ''
    return {
      isMuted: false,
      mutedUntil: '',
      remainingMs: 0,
      strikeCount: Math.max(0, Math.trunc(toNumber(entry.muteStrikeCount, 0))),
    }
  }

  return {
    isMuted: true,
    mutedUntil,
    remainingMs: mutedUntilMs - nowMs,
    strikeCount: Math.max(0, Math.trunc(toNumber(entry.muteStrikeCount, 0))),
  }
}

export function applyProfanityMute(db, userId, timestamp) {
  const entry = ensureUserMeta(db, userId)
  if (!entry) {
    return {
      mutedUntil: '',
      durationMs: 0,
      durationHours: 0,
      strikeCount: 0,
    }
  }

  const previousStrike = Math.max(0, Math.trunc(toNumber(entry.muteStrikeCount, 0)))
  const nextStrike = previousStrike + 1
  const durationMs = MUTE_DURATIONS_MS[Math.min(MUTE_DURATIONS_MS.length - 1, nextStrike - 1)]
  const mutedUntil = new Date(Date.now() + durationMs).toISOString()

  entry.mutedUntil = mutedUntil
  entry.muteStrikeCount = nextStrike
  entry.lastViolationAt = String(timestamp || new Date().toISOString())
  entry.lastViolationType = 'profanity'
  entry.muteReason = 'profanity'
  entry.muteReasonText = 'Küfür / hakaret'

  return {
    mutedUntil,
    durationMs,
    durationHours: Math.round(durationMs / (60 * 60 * 1000)),
    strikeCount: nextStrike,
  }
}

export function formatMuteRemaining(remainingMs) {
  const safeMs = Math.max(0, toNumber(remainingMs, 0))
  const totalMinutes = Math.max(1, Math.ceil(safeMs / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours} saat ${minutes} dk`
  if (hours > 0) return `${hours} saat`
  return `${minutes} dk`
}
