import { buildApiUrl } from './apiRuntime.js'

const ACCESS_TOKEN_KEY = 'ticarnet_access_token'
const SESSION_TOKEN_KEY = 'ticarnet_session_token'
const CURRENT_USER_KEY = 'ticarnet_current_user'
const DEVICE_ID_KEY = 'ticarnet_device_id'
const PUBLIC_IP_KEY = 'ticarnet_public_ip'
const AUTH_NOTICE_KEY = 'ticarnet_auth_notice'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AUTH_EMAIL_ALLOWED_DOMAINS = new Set(['gmail.com', 'outlook.com', 'hotmail.com'])
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 15
const USERNAME_PATTERN = /^[A-Z][A-Za-z ]{2,14}$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 64

function normalize(value) {
  return value?.trim().toLowerCase() || ''
}

function isAllowedAuthEmailAddress(email) {
  const safe = normalize(email)
  if (!safe.includes('@')) return false
  const domain = safe.split('@').pop() || ''
  return AUTH_EMAIL_ALLOWED_DOMAINS.has(domain)
}

function isStrongEnoughPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) return false
  if (/\s/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY)
}

function setStoredToken(token, rememberMe) {
  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    return
  }

  sessionStorage.setItem(SESSION_TOKEN_KEY, token)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

function setCachedUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

function getCachedUser() {
  const raw = localStorage.getItem(CURRENT_USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(CURRENT_USER_KEY)
    return null
  }
}

function clearAuthStorage(options = {}) {
  const keepNotice = options?.keepNotice === true
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  localStorage.removeItem(CURRENT_USER_KEY)
  if (!keepNotice) {
    localStorage.removeItem(AUTH_NOTICE_KEY)
  }
}

function cacheAuthNotice(message) {
  const safeMessage = String(message || '').trim()
  if (!safeMessage) return
  localStorage.setItem(AUTH_NOTICE_KEY, safeMessage)
}

export function isForcedLogoutReason(reason) {
  const safeReason = String(reason || '').trim().toLowerCase()
  return safeReason === 'unauthorized' || safeReason === 'geo_blocked'
}

export function shouldForceLogoutFromResult(result) {
  return isForcedLogoutReason(result?.reason)
}

async function request(path, options = {}) {
  const { method = 'GET', body, auth = false } = options
  const headers = {}

  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getStoredToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const payload = await response
      .json()
      .catch(() => ({ success: false, errors: { global: 'Sunucu yanıtı okunamadı.' } }))

    if (!response.ok) {
      return payload.success === false
        ? payload
        : { success: false, errors: { global: 'İşlem sırasında sunucu hatası oluştu.' } }
    }

    return payload
  } catch {
    return {
      success: false,
      reason: 'network_error',
      errors: {
        global:
          'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı ve sunucunun çalıştığını kontrol edin.',
      },
    }
  }
}

function validateRegisterInput(values) {
  const errors = {}
  const username = values.username?.trim() || ''
  const email = values.email?.trim() || ''
  const password = values.password || ''

  if (!username) {
    errors.username = 'Kullanıcı adı zorunludur.'
  } else if (username.length < USERNAME_MIN_LENGTH) {
    errors.username = 'Kullanıcı adı en az 3 karakter olmalıdır.'
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = 'Kullanıcı adı en fazla 15 karakter olabilir.'
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      'Kullanıcı adı büyük harfle başlamalı, toplam 3-15 karakter olmalı ve yalnızca harf ile boşluk içermelidir.'
  }

  if (!email) {
    errors.email = 'E-posta zorunludur.'
  } else if (!emailRegex.test(email)) {
    errors.email = 'Geçerli bir e-posta adresi girin.'
  } else if (!isAllowedAuthEmailAddress(email)) {
    errors.email = 'Yalnızca Gmail, Outlook veya Hotmail adresleri kullanılabilir.'
  }

  if (!password) {
    errors.password = 'Şifre zorunludur.'
  } else if (!isStrongEnoughPassword(password)) {
    errors.password =
      'Şifre 8-64 karakter olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.'
  }

  return errors
}

function validateRegisterCodeRequestInput(values) {
  const errors = validateRegisterInput(values)
  const confirmPassword = String(values?.confirmPassword || '')
  const password = String(values?.password || '')

  if (!confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunludur.'
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'Şifreler birbiriyle eşleşmiyor.'
  }

  return errors
}

function validateLoginInput(values) {
  const errors = {}
  const identifier = values.identifier?.trim() || ''
  const password = values.password || ''

  if (!identifier) {
    errors.identifier = 'Kullanıcı adı veya e-posta zorunludur.'
  }

  if (!password) {
    errors.password = 'Şifre zorunludur.'
  }

  return errors
}

function validateResetRequestInput(values) {
  const errors = {}
  const email = values.email?.trim() || ''

  if (!email) {
    errors.email = 'E-posta zorunludur.'
  } else if (!emailRegex.test(email)) {
    errors.email = 'Geçerli bir e-posta adresi girin.'
  } else if (!isAllowedAuthEmailAddress(email)) {
    errors.email = 'Yalnızca Gmail, Outlook veya Hotmail adresleri kullanılabilir.'
  }

  return errors
}

function validateResetWithTokenInput(values) {
  const errors = {}
  const token = values.token || ''
  const newPassword = values.newPassword || ''
  const confirmPassword = values.confirmPassword || ''

  if (!token) {
    errors.global = 'Sıfırlama bağlantısı geçersiz.'
  }

  if (!newPassword) {
    errors.newPassword = 'Yeni şifre zorunludur.'
  } else if (!isStrongEnoughPassword(newPassword)) {
    errors.newPassword =
      'Yeni şifre 8-64 karakter olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Şifre tekrarı zorunludur.'
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = 'Şifreler birbiriyle eşleşmiyor.'
  }

  return errors
}

export function getDeviceId() {
  const current = localStorage.getItem(DEVICE_ID_KEY)
  if (current) return current

  const next =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  localStorage.setItem(DEVICE_ID_KEY, next)
  return next
}

export async function hasRegisteredUsers() {
  const result = await request('/auth/has-users')
  if (!result?.success) {
    // Ag/sunucu hatasinda yanlislikla "kayit zorunlu" ekranina dusmeyelim.
    return true
  }
  return Boolean(result.hasUsers)
}

export async function requestRegisterCode(values) {
  const errors = validateRegisterCodeRequestInput(values)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, user: null, reason: 'validation' }
  }

  const result = await request('/auth/register', {
    method: 'POST',
    body: {
      username: values.username,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      deviceId: getDeviceId(),
      appOrigin: window.location.origin,
    },
  })

  if (!result.success) {
    return result
  }

  if (result.token) {
    setStoredToken(result.token, true)
  }

  if (result.user) {
    setCachedUser(result.user)
  }

  if (result.message) {
    cacheAuthNotice(result.message)
  }

  return result
}

export async function loginUser(values) {
  const errors = validateLoginInput(values)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, user: null, reason: 'validation' }
  }

  const result = await request('/auth/login', {
    method: 'POST',
    body: {
      identifier: values.identifier,
      password: values.password,
      deviceId: getDeviceId(),
      appOrigin: window.location.origin,
    },
  })

  if (!result.success) {
    return result
  }

  if (result.token) {
    setStoredToken(result.token, true)
  }

  if (result.user) {
    setCachedUser(result.user)
  }

  if (result.message) {
    cacheAuthNotice(result.message)
  }

  return result
}

export async function requestPasswordReset(values) {
  const errors = validateResetRequestInput(values)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, reason: 'validation' }
  }

  const safeEmail = normalize(values.email)
  return request('/auth/request-password-reset', {
    method: 'POST',
    body: {
      email: safeEmail,
      deviceId: getDeviceId(),
      appOrigin: window.location.origin,
    },
  })
}

export async function validateResetToken(token) {
  if (!token) {
    return {
      success: false,
      reason: 'invalid_token',
      errors: { global: 'Sıfırlama bağlantısı geçersiz.' },
    }
  }

  return request('/auth/validate-reset-token', {
    method: 'POST',
    body: { token },
  })
}

export async function resetPasswordWithToken(values) {
  const errors = validateResetWithTokenInput(values)
  if (Object.keys(errors).length > 0) {
    return { success: false, errors, reason: 'validation' }
  }

  return request('/auth/reset-password', {
    method: 'POST',
    body: values,
  })
}

export async function changeCurrentUserUsername(username) {
  const safeUsername = String(username || '').trim()
  if (!safeUsername) {
    return {
      success: false,
      reason: 'validation',
      errors: { username: 'Kullanıcı adı zorunludur.' },
    }
  }

  const result = await request('/auth/change-username', {
    method: 'POST',
    auth: true,
    body: {
      username: safeUsername,
    },
  })

  if (result?.success && result.user) {
    setCachedUser(result.user)
  }

  return result
}

export async function changeCurrentUserPassword(values) {
  const newPassword = String(values?.newPassword || '')
  const confirmPassword = String(values?.confirmPassword || '')

  if (!newPassword || !confirmPassword) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Yeni şifre ve şifre tekrarı zorunludur.' },
    }
  }

  if (!isStrongEnoughPassword(newPassword)) {
    return {
      success: false,
      reason: 'validation',
      errors: {
        newPassword:
          'Yeni şifre 8-64 karakter olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.',
      },
    }
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      reason: 'validation',
      errors: { confirmPassword: 'Şifreler birbiriyle eşleşmiyor.' },
    }
  }

  return request('/auth/change-password', {
    method: 'POST',
    auth: true,
    body: {
      newPassword,
      confirmPassword,
    },
  })
}

export async function getStoredUser() {
  const token = getStoredToken()
  if (!token) {
    return null
  }

  const result = await request('/auth/me', { auth: true })
  if (!result.success || !result.user) {
    if (shouldForceLogoutFromResult(result)) {
      const forcedMessage =
        Object.values(result?.errors || {}).find((value) => typeof value === 'string' && value.trim()) || ''
      clearAuthStorage({ keepNotice: Boolean(forcedMessage) })
      if (forcedMessage) {
        cacheAuthNotice(forcedMessage)
      }
      return null
    }
    return getCachedUser()
  }

  setCachedUser(result.user)
  if (result.message) {
    cacheAuthNotice(result.message)
  }
  return result.user
}

export async function hasStoredUser() {
  const user = await getStoredUser()
  return Boolean(user)
}

export function getLastKnownUser() {
  return getCachedUser()
}

export function logoutUser(options = {}) {
  const notice = String(options?.notice || '').trim()
  clearAuthStorage({ keepNotice: Boolean(notice) })
  if (notice) {
    cacheAuthNotice(notice)
  }
}

export function consumeAuthNotice() {
  const notice = String(localStorage.getItem(AUTH_NOTICE_KEY) || '').trim()
  if (!notice) return ''
  localStorage.removeItem(AUTH_NOTICE_KEY)
  return notice
}

export async function refreshPublicIpCache() {
  const endpoints = [
    { url: 'https://api.ipify.org?format=json', read: (data) => data?.ip },
    { url: 'https://api64.ipify.org?format=json', read: (data) => data?.ip },
    { url: 'https://ipapi.co/json/', read: (data) => data?.ip },
  ]

  for (const endpoint of endpoints) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2500)
    try {
      const response = await fetch(endpoint.url, {
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!response.ok) {
        continue
      }

      const data = await response.json().catch(() => null)
      const ip = String(endpoint.read(data) || '').trim()
      if (!ip) {
        continue
      }

      localStorage.setItem(PUBLIC_IP_KEY, ip)
      return ip
    } catch {
      // s\u0131radaki endpoint denenecek
    } finally {
      clearTimeout(timeout)
    }
  }

  return null
}

export async function getApiHealth() {
  const startedAt =
    typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now()

  try {
    const response = await fetch(buildApiUrl('/health'), { cache: 'no-store' })
    const endedAt =
      typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now()

    if (!response.ok) {
      return {
        success: false,
        online: false,
        pingMs: Math.max(1, Math.round(endedAt - startedAt)),
      }
    }

    const payload = await response.json().catch(() => ({}))
    return {
      success: Boolean(payload?.success),
      online: Boolean(payload?.success),
      pingMs: Math.max(1, Math.round(endedAt - startedAt)),
    }
  } catch {
    return { success: false, online: false, pingMs: 0 }
  }
}
