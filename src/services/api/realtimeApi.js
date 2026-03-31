/**
 * realtimeApi.js — Gerçek Zamanlı Bağlantı (WebSocket)
 * WebSocket URL üreticileri ve kimlik doğrulama protokolü yardımcıları.
 */
import { buildRealtimeSocketUrl } from '../apiRuntime.js'
import { getStoredToken } from '../apiBase.js'

const WS_PROTOCOL_SAFE_TOKEN = /^[A-Za-z0-9._~-]+$/

/** Saklı erişim tokenını döner (WebSocket bağlantıları için). */
export function getAuthTokenForRealtime() {
  return getStoredToken()
}

/**
 * WebSocket protokol başlıklarını oluşturur.
 * Token geçerli değilse boş dizi döner.
 */
export function getRealtimeSocketProtocols() {
  const token = String(getStoredToken() || '').trim()
  if (!token) return []
  if (!WS_PROTOCOL_SAFE_TOKEN.test(token)) return []
  return ['ticarnet-auth', `ticarnet-token.${token}`]
}

/**
 * Global sohbet için WebSocket URL'si oluşturur.
 * @param {string} room  Varsayılan: 'global'
 */
export function getRealtimeChatUrl(room = 'global') {
  const token = getStoredToken()
  if (!token || typeof window === 'undefined') return ''

  const safeRoom = String(room || '').trim() || 'global'
  const wsUrl = buildRealtimeSocketUrl('/chat')
  if (!wsUrl) return ''

  wsUrl.searchParams.set('room', safeRoom)
  return wsUrl.toString()
}

/** Özel mesajlar (DM) için WebSocket URL'si oluşturur. */
export function getRealtimeMessagesUrl() {
  const token = getStoredToken()
  if (!token || typeof window === 'undefined') return ''

  const wsUrl = buildRealtimeSocketUrl('/messages/ws')
  if (!wsUrl) return ''

  return wsUrl.toString()
}
