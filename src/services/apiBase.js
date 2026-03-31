/**
 * apiBase.js
 * Shared HTTP request foundation used by all domain API modules.
 * Handles token retrieval, auth errors, force-logout and network errors.
 */
import { buildApiUrl } from './apiRuntime.js'
import { logoutUser, shouldForceLogoutFromResult } from './auth.js'

const ACCESS_TOKEN_KEY = 'ticarnet_access_token'
const SESSION_TOKEN_KEY = 'ticarnet_session_token'
const FORCED_LOGOUT_EVENT = 'ticarnet:auth-force-logout'

export const SESSION_LOST_MESSAGE =
  'Oturum bulunamadı. Hesabın başka bir cihazda açılmış olabilir veya süresi dolmuş olabilir. Lütfen tekrar giriş yap.'

export function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY)
}

export function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function firstErrorText(errors, fallback = '') {
  if (!errors || typeof errors !== 'object') return String(fallback || '').trim()
  const found = Object.values(errors).find((v) => typeof v === 'string' && v.trim())
  return String(found || fallback || '').trim()
}

export function emitForcedLogout(message, reason = 'unauthorized') {
  const safeMessage = String(message || '').trim() || SESSION_LOST_MESSAGE
  logoutUser({ notice: safeMessage })
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  window.dispatchEvent(
    new CustomEvent(FORCED_LOGOUT_EVENT, {
      detail: {
        reason: String(reason || '').trim() || 'unauthorized',
        message: safeMessage,
      },
    }),
  )
}

/**
 * Core authenticated fetch wrapper.
 * All domain API modules call this directly — no dependency on game.js.
 */
export async function gameRequest(path, options = {}) {
  const { method = 'GET', body } = options
  const token = getStoredToken()

  if (!token) {
    const result = {
      success: false,
      reason: 'unauthorized',
      errors: { global: SESSION_LOST_MESSAGE },
    }
    emitForcedLogout(result.errors.global, result.reason)
    return result
  }

  const headers = { Authorization: `Bearer ${token}` }
  const hasBody = typeof body !== 'undefined'
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (hasBody && !isFormData) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: hasBody ? (isFormData ? body : JSON.stringify(body)) : undefined,
    })

    const payload = await response
      .json()
      .catch(() => ({ success: false, errors: { global: 'Sunucu yanıtı okunamadı.' } }))

    if (!response.ok) {
      const result =
        payload.success === false
          ? payload
          : { success: false, errors: { global: 'Sunucu hatası oluştu.' } }
      if (shouldForceLogoutFromResult(result)) {
        emitForcedLogout(firstErrorText(result?.errors, SESSION_LOST_MESSAGE), result.reason)
      }
      return result
    }

    if (payload?.success === false && shouldForceLogoutFromResult(payload)) {
      emitForcedLogout(firstErrorText(payload?.errors, SESSION_LOST_MESSAGE), payload.reason)
    }
    return payload
  } catch {
    return {
      success: false,
      reason: 'network_error',
      errors: { global: 'Sunucuya bağlanılamadı. API çalışıyor mu kontrol et.' },
    }
  }
}
