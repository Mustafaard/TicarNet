import { findUserById } from '../services/auth.js'
import { USER_ROLES, hasAtLeastRole, normalizeUserRole } from '../services/roles.js'

function forbiddenPayload() {
  return {
    success: false,
    reason: 'forbidden',
    errors: { global: 'Bu işlem için yönetici yetkisi gerekli.' },
  }
}

async function requireRole(req, res, next, minimumRole) {
  const safeMinimumRole = normalizeUserRole(minimumRole, USER_ROLES.ADMIN)
  const currentUserId = String(req?.auth?.userId || '').trim()
  if (!currentUserId) {
    res.status(401).json({
      success: false,
      reason: 'unauthorized',
      errors: { global: 'Oturum bulunamadı.' },
    })
    return
  }

  const currentRoleFromToken = normalizeUserRole(req?.auth?.role, USER_ROLES.PLAYER)
  if (hasAtLeastRole(currentRoleFromToken, safeMinimumRole)) {
    req.auth.role = currentRoleFromToken
    next()
    return
  }

  const user = await findUserById(currentUserId)
  const currentRole = normalizeUserRole(user?.role, USER_ROLES.PLAYER)
  req.auth.role = currentRole

  if (!hasAtLeastRole(currentRole, safeMinimumRole)) {
    res.status(403).json(forbiddenPayload())
    return
  }

  next()
}

export async function requireAdmin(req, res, next) {
  await requireRole(req, res, next, USER_ROLES.ADMIN)
}

export async function requireModerator(req, res, next) {
  await requireRole(req, res, next, USER_ROLES.MODERATOR)
}

