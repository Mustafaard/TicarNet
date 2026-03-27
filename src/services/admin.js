import { buildApiUrl } from './apiRuntime.js'

const ACCESS_TOKEN_KEY = 'ticarnet_access_token'
const SESSION_TOKEN_KEY = 'ticarnet_session_token'

function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY)
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function adminRequest(path, options = {}) {
  const { method = 'GET', body } = options
  const token = getStoredToken()

  if (!token) {
    return {
      success: false,
      reason: 'unauthorized',
      errors: { global: 'Yönetici oturumu bulunamadı. Lütfen tekrar giriş yapın.' },
    }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  if (typeof body !== 'undefined') {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: typeof body !== 'undefined' ? JSON.stringify(body) : undefined,
    })

    const payload = await response
      .json()
      .catch(() => ({ success: false, errors: { global: 'Sunucu yanıtı okunamadı.' } }))

    if (!response.ok) {
      return payload?.success === false
        ? payload
        : { success: false, errors: { global: 'Yönetim isteği başarısız oldu.' } }
    }

    return payload
  } catch {
    return {
      success: false,
      reason: 'network_error',
      errors: { global: 'Sunucuya ulaşılamadı. Lütfen API servisinin çalıştığını kontrol edin.' },
    }
  }
}

export async function getAdminCapabilities() {
  return adminRequest('/admin/capabilities')
}

export async function searchAdminUsers({ query = '', limit = 20, includeStaff = false } = {}) {
  const params = new URLSearchParams()
  if (String(query || '').trim()) params.set('query', String(query).trim())
  if (Number.isFinite(Number(limit))) params.set('limit', String(Math.trunc(Number(limit))))
  if (includeStaff) params.set('includeStaff', 'true')
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return adminRequest(`/admin/users${suffix}`)
}

export async function listAdminUsers({ query = '', limit = 120 } = {}) {
  const params = new URLSearchParams()
  if (String(query || '').trim()) params.set('query', String(query).trim())
  if (Number.isFinite(Number(limit))) params.set('limit', String(Math.trunc(Number(limit))))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return adminRequest(`/admin/users/all${suffix}`)
}

export async function resolveAdminUser(targetLookup, targetUserId = '') {
  return adminRequest('/admin/users/resolve', {
    method: 'POST',
    body: {
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
    },
  })
}

export async function updateAdminUserEmail(targetLookup, targetUserId, nextEmail, reason = '') {
  return adminRequest('/admin/users/email', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      nextEmail,
      reason,
    },
  })
}

export async function updateAdminUserPassword(targetLookup, targetUserId, newPassword, confirmPassword, reason = '') {
  return adminRequest('/admin/users/password', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      newPassword,
      confirmPassword,
      reason,
    },
  })
}

export async function deleteAdminUserAccount(targetLookup, targetUserId, reason) {
  return adminRequest('/admin/users/delete', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      reason,
    },
  })
}

export async function grantAdminCash(targetLookup, targetUserId, amount, reason) {
  return adminRequest('/admin/economy/cash/grant', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      amount,
      reason,
    },
  })
}

export async function grantAdminDiamonds(targetLookup, targetUserId, amount, reason) {
  return adminRequest('/admin/economy/diamond/grant', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      amount,
      reason,
    },
  })
}

export async function revokeAdminCash(targetLookup, targetUserId, amount, reason) {
  return adminRequest('/admin/economy/cash/revoke', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      amount,
      reason,
    },
  })
}

export async function revokeAdminDiamonds(targetLookup, targetUserId, amount, reason) {
  return adminRequest('/admin/economy/diamond/revoke', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      amount,
      reason,
    },
  })
}

export async function grantAdminResource(targetLookup, targetUserId, itemId, amount, reason) {
  return adminRequest('/admin/economy/resource/grant', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      itemId,
      amount,
      reason,
    },
  })
}

export async function revokeAdminResource(targetLookup, targetUserId, itemId, amount, reason) {
  return adminRequest('/admin/economy/resource/revoke', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      itemId,
      amount,
      reason,
    },
  })
}

export async function setAdminChatBlock(targetLookup, targetUserId, durationMinutes, reason) {
  return adminRequest('/admin/moderation/chat-block', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      durationMinutes,
      reason,
    },
  })
}

export async function setAdminMute(targetLookup, targetUserId, durationMinutes, reason) {
  return adminRequest('/admin/moderation/mute', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      durationMinutes,
      reason,
    },
  })
}

export async function setAdminMessageBlock(targetLookup, targetUserId, durationMinutes, reason) {
  return adminRequest('/admin/moderation/message-block', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      durationMinutes,
      reason,
    },
  })
}

export async function clearAdminMessageBlock(targetLookup, targetUserId) {
  return adminRequest('/admin/moderation/message-block/clear', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
    },
  })
}

export async function setAdminTempBan(targetLookup, targetUserId, durationMinutes, reason) {
  return adminRequest('/admin/moderation/temp-ban', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      durationMinutes,
      reason,
    },
  })
}

export async function clearAdminBan(targetLookup, targetUserId, mode = 'all') {
  return adminRequest('/admin/moderation/ban/clear', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      mode,
    },
  })
}

export async function getModerationQueues() {
  return adminRequest('/admin/moderation/queues')
}

export async function deleteAdminChatMessage(messageId, room = '', reason = '') {
  const safeMessageId = encodeURIComponent(String(messageId || '').trim())
  return adminRequest(`/admin/messages/chat/${safeMessageId}`, {
    method: 'DELETE',
    body: {
      requestId: createRequestId(),
      room,
      reason: String(reason || '').trim(),
    },
  })
}

export async function deleteAdminDirectMessage(messageId, reason = '') {
  const safeMessageId = encodeURIComponent(String(messageId || '').trim())
  return adminRequest(`/admin/messages/dm/${safeMessageId}`, {
    method: 'DELETE',
    body: {
      requestId: createRequestId(),
      reason: String(reason || '').trim(),
    },
  })
}

export async function setAdminUserRole(targetLookup, targetUserId, role, reason = '') {
  return adminRequest('/admin/users/role', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup,
      targetUsername: targetLookup,
      targetUserId,
      role,
      reason,
    },
  })
}

export async function getAdminLogs({
  limit = 100,
  action = '',
  status = '',
  targetQuery = '',
  actorRole = '',
} = {}) {
  const params = new URLSearchParams()
  if (Number.isFinite(Number(limit))) params.set('limit', String(Math.trunc(Number(limit))))
  if (String(action || '').trim()) params.set('action', String(action).trim())
  if (String(status || '').trim()) params.set('status', String(status).trim())
  if (String(actorRole || '').trim()) params.set('actorRole', String(actorRole).trim())
  if (String(targetQuery || '').trim()) params.set('targetQuery', String(targetQuery).trim())
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return adminRequest(`/admin/logs${suffix}`)
}

export async function getAdminSystemStatus() {
  return adminRequest('/admin/system/status')
}

export async function getAdminAnnouncements(limit = 50) {
  const params = new URLSearchParams()
  if (Number.isFinite(Number(limit))) params.set('limit', String(Math.trunc(Number(limit))))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return adminRequest(`/admin/announcements${suffix}`)
}

export async function createAdminAnnouncement(title = '', body = '', announcementType = 'announcement') {
  return adminRequest('/admin/announcements', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      title: String(title || ''),
      body: String(body || ''),
      announcementType: String(announcementType || 'announcement'),
    },
  })
}

export async function deleteAdminAnnouncement(announcementId) {
  const safeId = encodeURIComponent(String(announcementId || '').trim())
  return adminRequest(`/admin/announcements/${safeId}`, {
    method: 'DELETE',
    body: {
      requestId: createRequestId(),
    },
  })
}

export async function restoreAdminAnnouncement(deletedAnnouncementId) {
  return adminRequest('/admin/announcements/restore', {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      deletedAnnouncementId: String(deletedAnnouncementId || '').trim(),
    },
  })
}

