import { config } from '../config.js'

const FIREBASE_AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1'

function normalize(value) {
  return String(value ?? '').trim()
}

function isPlaceholderApiKey(value) {
  const safe = normalize(value).toLowerCase()
  if (!safe) return true
  if (safe.startsWith('your_') || safe.startsWith('change_me')) return true
  if (safe.includes('example') || safe.includes('firebase_web_api_key')) return true
  return false
}

function extractFirebaseErrorCode(message) {
  const safeMessage = normalize(message)
  if (!safeMessage) return 'UNKNOWN'
  const [code] = safeMessage.split(':')
  return normalize(code) || 'UNKNOWN'
}

function mapFirebaseReason(errorCode) {
  switch (errorCode) {
    case 'EMAIL_EXISTS':
      return 'email_exists'
    case 'EMAIL_NOT_FOUND':
      return 'account_not_found'
    case 'INVALID_PASSWORD':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'invalid_credentials'
    case 'USER_DISABLED':
      return 'user_disabled'
    case 'INVALID_OOB_CODE':
      return 'invalid_token'
    case 'EXPIRED_OOB_CODE':
      return 'token_expired'
    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
      return 'rate_limited'
    case 'WEAK_PASSWORD':
      return 'weak_password'
    case 'OPERATION_NOT_ALLOWED':
      return 'operation_not_allowed'
    default:
      return 'remote_error'
  }
}

function buildFirebaseAuthUrl(endpoint) {
  const apiKey = normalize(config.firebaseAuth.apiKey)
  return `${FIREBASE_AUTH_BASE_URL}/${endpoint}?key=${encodeURIComponent(apiKey)}`
}

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestFirebaseAuth(endpoint, payload) {
  if (!config.firebaseAuth.enabled) {
    return {
      success: false,
      reason: 'disabled',
      code: 'FIREBASE_AUTH_DISABLED',
      message: 'Firebase Auth disabled.',
    }
  }

  const apiKey = normalize(config.firebaseAuth.apiKey)
  if (isPlaceholderApiKey(apiKey)) {
    return {
      success: false,
      reason: 'not_configured',
      code: 'FIREBASE_AUTH_API_KEY_MISSING',
      message: 'Firebase Auth API key is missing.',
    }
  }

  try {
    const response = await fetch(buildFirebaseAuthUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    })

    const data = await parseJsonSafe(response)
    if (!response.ok) {
      const errorMessage = normalize(data?.error?.message)
      const errorCode = extractFirebaseErrorCode(errorMessage)
      return {
        success: false,
        reason: mapFirebaseReason(errorCode),
        code: errorCode,
        message: errorMessage || 'Firebase auth request failed.',
      }
    }

    return {
      success: true,
      data: data || {},
    }
  } catch (error) {
    return {
      success: false,
      reason: 'network_error',
      code: 'FIREBASE_NETWORK_ERROR',
      message: normalize(error?.message) || 'Firebase auth network error.',
    }
  }
}

export function isFirebaseAuthEnabled() {
  return config.firebaseAuth.enabled === true
}

export function getFirebaseAuthMissingEnvVars() {
  const missing = []
  if (isPlaceholderApiKey(config.firebaseAuth.apiKey)) {
    missing.push('FIREBASE_WEB_API_KEY')
  }
  return missing
}

export function getFirebaseAuthResetContinueUrl() {
  const fromResetBase = normalize(config.resetLinkBaseUrl)
  if (fromResetBase) return fromResetBase
  const fromClient = normalize(config.clientUrl)
  if (fromClient) return fromClient
  return ''
}

export async function firebaseRegisterWithEmailPassword({ email, password }) {
  const result = await requestFirebaseAuth('accounts:signUp', {
    email: normalize(email),
    password: String(password || ''),
    returnSecureToken: true,
  })

  if (!result.success) return result
  return {
    success: true,
    uid: normalize(result.data?.localId),
    email: normalize(result.data?.email),
    idToken: normalize(result.data?.idToken),
  }
}

export async function firebaseLoginWithEmailPassword({ email, password }) {
  const result = await requestFirebaseAuth('accounts:signInWithPassword', {
    email: normalize(email),
    password: String(password || ''),
    returnSecureToken: true,
  })

  if (!result.success) return result
  return {
    success: true,
    uid: normalize(result.data?.localId),
    email: normalize(result.data?.email),
    idToken: normalize(result.data?.idToken),
  }
}

export async function firebaseSendPasswordResetEmail({ email, continueUrl = '' }) {
  const payload = {
    requestType: 'PASSWORD_RESET',
    email: normalize(email),
  }
  const safeContinueUrl = normalize(continueUrl)
  if (safeContinueUrl) {
    payload.continueUrl = safeContinueUrl
  }

  return requestFirebaseAuth('accounts:sendOobCode', payload)
}

export async function firebaseVerifyPasswordResetCode(code) {
  const result = await requestFirebaseAuth('accounts:resetPassword', {
    oobCode: normalize(code),
  })

  if (!result.success) return result
  return {
    success: true,
    email: normalize(result.data?.email),
  }
}

export async function firebaseConfirmPasswordReset(code, newPassword) {
  const result = await requestFirebaseAuth('accounts:resetPassword', {
    oobCode: normalize(code),
    newPassword: String(newPassword || ''),
  })

  if (!result.success) return result
  return {
    success: true,
    email: normalize(result.data?.email),
  }
}
