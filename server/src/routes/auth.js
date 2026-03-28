import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireTurkeyAccess } from '../middleware/accessPolicy.js'
import {
  deleteAccountPermanentlyForUser,
  changePasswordForUser,
  changeUsernameForUser,
  getRecentRegisteredPlayers,
  getUserFromAccessToken,
  hasRegisteredUsers,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
  validateResetToken,
} from '../services/auth.js'
import { authLoginRateLimit } from '../middleware/rateLimit.js'
import { getClientIp } from '../utils.js'

const authRouter = Router()

authRouter.get('/has-users', async (_req, res, next) => {
  try {
    const hasUsers = await hasRegisteredUsers()
    res.json({ success: true, hasUsers })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/register', authLoginRateLimit, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await registerUser(
      {
        ...(req.body || {}),
        appOrigin:
          req.body?.appOrigin ||
          (typeof req.headers.origin === 'string' ? req.headers.origin : ''),
      },
      { ip: getClientIp(req) },
    )
    const status =
      result.success
        ? 201
        : result.reason === 'email_exists' || result.reason === 'username_exists'
          ? 409
        : result.reason === 'limit_reached'
            ? 429
            : result.reason === 'register_unavailable'
              ? 503
            : 400
    res.status(status).json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', authLoginRateLimit, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await loginUser(
      {
        ...(req.body || {}),
        appOrigin:
          req.body?.appOrigin ||
          (typeof req.headers.origin === 'string' ? req.headers.origin : ''),
      },
      { ip: getClientIp(req) },
    )

    if (!result.success) {
      const status =
        result.reason === 'validation'
            ? 400
            : result.reason === 'account_not_found'
              ? 404
            : result.reason === 'auth_unavailable'
              ? 503
            : result.reason === 'blocked'
                || result.reason === 'temp_ban'
                || result.reason === 'network_restricted'
              ? 403
            : 401
      res.status(status).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', requireAuth, requireTurkeyAccess, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.slice('Bearer '.length)
    const session = await getUserFromAccessToken(token)
    const user = session?.user || null

    if (!user) {
      res.status(401).json({
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      })
      return
    }

    res.json({
      success: true,
      user,
      message: String(session?.message || ''),
    })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/request-password-reset', authLoginRateLimit, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await requestPasswordReset(
      {
        ...(req.body || {}),
        appOrigin:
          req.body?.appOrigin ||
          (typeof req.headers.origin === 'string' ? req.headers.origin : ''),
      },
      { ip: getClientIp(req) },
    )

    if (!result.success) {
      const status =
        result.reason === 'mail_unavailable' || result.reason === 'mail_failed'
          ? 503
          : result.reason === 'not_found'
            ? 404
          : 400
      res.status(status).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/validate-reset-token', authLoginRateLimit, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await validateResetToken(req.body?.token || '')

    if (!result.success) {
      res.status(400).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/reset-password', authLoginRateLimit, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await resetPasswordWithToken(req.body || {})

    if (!result.success) {
      const status = result.reason === 'validation' ? 400 : 401
      res.status(status).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/change-username', requireAuth, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await changeUsernameForUser(req.auth.userId, req.body || {})

    if (!result.success) {
      const status =
        result.reason === 'username_exists'
          ? 409
          : result.reason === 'insufficient_funds' || result.reason === 'not_ready'
            ? 409
          : result.reason === 'validation'
            ? 400
            : result.reason === 'unauthorized'
              ? 401
              : 400
      res.status(status).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/change-password', requireAuth, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await changePasswordForUser(req.auth.userId, req.body || {})

    if (!result.success) {
      const status =
        result.reason === 'invalid_password'
          ? 401
          : result.reason === 'validation'
            ? 400
            : result.reason === 'unauthorized'
              ? 401
              : 400
      res.status(status).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.get('/recent-players', requireAuth, requireTurkeyAccess, async (req, res, next) => {
  try {
    const limit = Number(req.query?.limit)
    const result = await getRecentRegisteredPlayers(limit)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/delete-account', requireAuth, requireTurkeyAccess, async (req, res, next) => {
  try {
    const result = await deleteAccountPermanentlyForUser(req.auth.userId, req.body || {})

    if (!result.success) {
      const status =
        result.reason === 'invalid_password'
          ? 401
          : result.reason === 'validation'
            ? 400
            : result.reason === 'unauthorized'
              ? 401
              : result.reason === 'forbidden'
                ? 403
                : 400
      res.status(status).json(result)
      return
    }

    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default authRouter


