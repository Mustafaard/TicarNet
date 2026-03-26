export const USER_ROLES = Object.freeze({
  PLAYER: 'player',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
})

export const MANAGEABLE_USER_ROLES = Object.freeze([
  USER_ROLES.PLAYER,
  USER_ROLES.MODERATOR,
  USER_ROLES.ADMIN,
])

const ROLE_WEIGHT = Object.freeze({
  [USER_ROLES.PLAYER]: 1,
  [USER_ROLES.MODERATOR]: 2,
  [USER_ROLES.ADMIN]: 3,
})

export function normalizeUserRole(value, fallback = USER_ROLES.PLAYER) {
  const safeFallback = String(fallback || USER_ROLES.PLAYER).trim().toLowerCase()
  const safeValue = String(value || '').trim().toLowerCase()

  if (safeValue && Object.prototype.hasOwnProperty.call(ROLE_WEIGHT, safeValue)) {
    return safeValue
  }

  if (Object.prototype.hasOwnProperty.call(ROLE_WEIGHT, safeFallback)) {
    return safeFallback
  }

  return USER_ROLES.PLAYER
}

export function hasAtLeastRole(currentRole, minimumRole) {
  const current = normalizeUserRole(currentRole)
  const minimum = normalizeUserRole(minimumRole)
  return (ROLE_WEIGHT[current] || 0) >= (ROLE_WEIGHT[minimum] || 0)
}
