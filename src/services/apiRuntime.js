import { Capacitor } from '@capacitor/core'

const HTTP_BASE_PATTERN = /^https?:\/\//i
const DEFAULT_RELATIVE_API_BASE = '/api'
const IS_NATIVE_RUNTIME = Capacitor.isNativePlatform()

function normalizePath(value) {
  const safe = String(value || '').trim()
  if (!safe) return '/'
  return safe.startsWith('/') ? safe : `/${safe}`
}

function normalizeRelativeBase(value) {
  const safe = String(value || '').trim().replace(/^\/+|\/+$/g, '')
  if (!safe) return ''
  return `/${safe}`
}

function normalizeApiBase(value) {
  const safe = String(value || '').trim()
  if (!safe) return ''
  if (HTTP_BASE_PATTERN.test(safe)) return safe.replace(/\/+$/g, '')
  return normalizeRelativeBase(safe)
}

function resolveApiBase() {
  const webBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL)
  const nativeBase = normalizeApiBase(import.meta.env.VITE_NATIVE_API_BASE_URL)
  const resolved = IS_NATIVE_RUNTIME
    ? nativeBase || webBase || DEFAULT_RELATIVE_API_BASE
    : webBase || DEFAULT_RELATIVE_API_BASE

  if (IS_NATIVE_RUNTIME && !HTTP_BASE_PATTERN.test(resolved)) {
    console.warn(
      '[API] Native çalışma algılandı. Android release derlemesi için VITE_NATIVE_API_BASE_URL tanımlayın.',
    )
  }

  return resolved
}

export const API_BASE = resolveApiBase()

export function buildApiUrl(path) {
  return `${API_BASE}${normalizePath(path)}`
}

export function buildRealtimeSocketUrl(path) {
  const safePath = normalizePath(path)

  if (HTTP_BASE_PATTERN.test(API_BASE)) {
    const apiUrl = new URL(API_BASE)
    apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    apiUrl.pathname = `${apiUrl.pathname.replace(/\/+$/, '')}${safePath}`
    return apiUrl
  }

  if (typeof window === 'undefined') return null

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return new URL(`${protocol}//${window.location.host}${API_BASE}${safePath}`)
}
