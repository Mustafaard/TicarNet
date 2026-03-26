import { verifyAccessToken } from '../services/auth.js'

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : ''

  if (!token) {
    res.status(401).json({
      success: false,
      reason: 'unauthorized',
      errors: {
        global:
          'Oturum bulunamadı. Hesabınız başka bir cihazda açılmış olabilir veya oturum süresi dolmuş olabilir. Lütfen yeniden giriş yapın.',
      },
    })
    return
  }

  const payload = await verifyAccessToken(token)
  if (!payload?.sub) {
    res.status(401).json({
      success: false,
      reason: 'unauthorized',
      errors: {
        global:
          'Oturumunuz sona erdi. Hesabınız başka bir cihazda açılmış olabilir veya oturum süresi dolmuş olabilir. Lütfen yeniden giriş yapın.',
      },
    })
    return
  }

  req.auth = {
    userId: payload.sub,
    role: String(payload.role || 'player').trim().toLowerCase() || 'player',
  }
  next()
}
