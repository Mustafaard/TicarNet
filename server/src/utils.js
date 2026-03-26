import crypto from 'node:crypto'

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalize(value) {
  return value?.trim().toLowerCase() || ''
}

export function isGmailAddress(email) {
  return normalize(email).endsWith('@gmail.com')
}

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

export function publicUser(user) {
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: String(user.role || 'player').trim().toLowerCase() || 'player',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || null,
    lastLoginAt: user.lastLoginAt || null,
  }
}

function normalizeIpLiteral(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'unknown'
  if (raw.startsWith('::ffff:')) return raw.slice('::ffff:'.length)
  if (raw === '::1') return '127.0.0.1'
  return raw
}

function isPrivateOrLoopbackIp(value) {
  const ip = normalizeIpLiteral(value)
  if (ip === 'unknown') return false

  if (ip === '127.0.0.1') return true
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true
  if (ip.startsWith('169.254.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true

  if (ip.includes(':')) {
    const lowered = ip.toLowerCase()
    if (lowered === '::1' || lowered === '::') return true
    if (lowered.startsWith('fc') || lowered.startsWith('fd')) return true
    if (lowered.startsWith('fe80:')) return true
  }

  return false
}

function parseForwardedFor(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  if (!raw.trim()) return 'unknown'
  const first = raw
    .split(',')
    .map((entry) => normalizeIpLiteral(entry))
    .find((entry) => entry && entry !== 'unknown')
  return first || 'unknown'
}

export function getClientIp(req) {
  const socketIp = normalizeIpLiteral(req?.socket?.remoteAddress || '')

  if (isPrivateOrLoopbackIp(socketIp)) {
    const forwardedIp = parseForwardedFor(req?.headers?.['x-forwarded-for'])
    if (forwardedIp !== 'unknown') {
      return forwardedIp
    }
  }

  const expressIp = normalizeIpLiteral(req?.ip || '')
  if (expressIp !== 'unknown') return expressIp

  return socketIp
}
