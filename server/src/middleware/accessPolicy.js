import { getClientIp } from '../utils.js'
import {
  buildGeoBlockedPayload,
  evaluateAccessByIp,
  resolveAccessIp,
} from '../services/accessPolicy.js'

export async function requireTurkeyAccess(req, res, next) {
  try {
    const ip = resolveAccessIp({
      directIp: getClientIp(req),
    })

    const access = await evaluateAccessByIp(ip)

    if (!access.allowed) {
      const accessReason = String(access?.reason || '').trim()
      const canSoftAllow =
        Boolean(req.auth?.userId) &&
        accessReason === 'geo_unverified'

      if (canSoftAllow) {
        req.accessPolicy = {
          allowed: true,
          reason: 'geo_soft_allow_authenticated',
          countryCode: access?.countryCode || '',
          isProxy: Boolean(access?.isProxy),
          isHosting: Boolean(access?.isHosting),
          source: access?.source || '',
        }
        next()
        return
      }

      res.status(403).json(buildGeoBlockedPayload(access))
      return
    }

    req.accessPolicy = access
    next()
  } catch (error) {
    next(error)
  }
}
