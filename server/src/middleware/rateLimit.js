import { config } from '../config.js'
import { getClientIp } from '../utils.js'

const RATE_LIMIT_STATE = new Map()
const RATE_LIMIT_MAX_KEYS = 20_000

function cleanupRateLimitState(now) {
  if (RATE_LIMIT_STATE.size < RATE_LIMIT_MAX_KEYS) return
  for (const [key, entry] of RATE_LIMIT_STATE.entries()) {
    if (!entry || now >= entry.resetAt) {
      RATE_LIMIT_STATE.delete(key)
    }
  }
}

function buildRateLimitError(message, limit, windowMs) {
  return {
    success: false,
    reason: 'rate_limited',
    errors: { global: message },
    rateLimit: {
      limit,
      windowMs,
    },
  }
}

function createRateLimiter(options = {}) {
  const keyPrefix = String(options.keyPrefix || 'api').trim() || 'api'
  const limit = Math.max(1, Number(options.limit) || 1)
  const windowMs = Math.max(1000, Number(options.windowMs) || 60_000)
  const message = String(options.message || 'Çok fazla istek gönderildi.').trim()

  return function rateLimitMiddleware(req, res, next) {
    if (!config.rateLimitEnabled) {
      next()
      return
    }

    const now = Date.now()
    cleanupRateLimitState(now)

    const ip = getClientIp(req)
    const key = `${keyPrefix}:${ip}`
    const current = RATE_LIMIT_STATE.get(key)
    const entry = !current || now >= current.resetAt
      ? { count: 0, resetAt: now + windowMs }
      : current

    entry.count += 1
    RATE_LIMIT_STATE.set(key, entry)

    const remaining = Math.max(0, limit - entry.count)
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.max(0, Math.ceil((entry.resetAt - now) / 1000))))

    if (entry.count <= limit) {
      next()
      return
    }

    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))))
    res.status(429).json(buildRateLimitError(message, limit, windowMs))
  }
}

export const globalApiRateLimit = createRateLimiter({
  keyPrefix: 'global',
  limit: config.rateLimitGlobalMax,
  windowMs: config.rateLimitGlobalWindowMs,
  message: 'Kısa sürede çok fazla API isteği gönderildi.',
})

export const authRateLimit = createRateLimiter({
  keyPrefix: 'auth',
  limit: config.rateLimitAuthMax,
  windowMs: config.rateLimitAuthWindowMs,
  message: 'Kimlik doğrulama istek sınırına ulaştınız.',
})

export const authLoginRateLimit = createRateLimiter({
  keyPrefix: 'auth-login',
  limit: config.rateLimitLoginMax,
  windowMs: config.rateLimitLoginWindowMs,
  message: 'Giriş denemesi limiti aşıldı. Lütfen biraz bekleyin.',
})

export const adminRateLimit = createRateLimiter({
  keyPrefix: 'admin',
  limit: config.rateLimitAdminMax,
  windowMs: config.rateLimitAdminWindowMs,
  message: 'Yönetim paneli istek limiti aşıldı.',
})
