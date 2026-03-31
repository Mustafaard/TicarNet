/**
 * dmApi.js — Özel Mesajlar (DM)
 * Kullanıcılar arası birebir mesajlaşma, thread okuma, okundu işaretleme.
 */
import { gameRequest, createRequestId } from '../apiBase.js'

/**
 * Belirtilen kullanıcıyla olan DM thread'ini döner.
 * @param {string} username
 * @param {number} limit  1-25
 */
export async function getDirectMessageThread(username, limit = 25) {
  const safeUsername = encodeURIComponent(String(username || '').trim())
  if (!safeUsername) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Kullanıcı adı gerekli.' },
    }
  }
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25))
  return gameRequest(`/game/messages/thread?username=${safeUsername}&limit=${safeLimit}`)
}

/**
 * Belirtilen kullanıcıya DM gönderir.
 * @param {{ toUsername: string, text: string, replyToId?: string }} payload
 */
export async function sendDirectMessageToUser(payload) {
  return gameRequest('/game/messages/send', {
    method: 'POST',
    body: payload,
  })
}

/** Bir DM mesajını bildir. */
export async function reportDirectMessage(messageId, reason) {
  const safeId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/messages/${safeId}/report`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      reason: String(reason || '').trim(),
    },
  })
}

/** Tek bir mesaj merkezi öğesini okundu olarak işaretle. */
export async function markMessageCenterItemRead(messageId) {
  const safeId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/messages/${safeId}/read`, {
    method: 'POST',
  })
}

/** Tüm bildirim mesajlarını okundu olarak işaretle. */
export async function markMessageCenterNotificationsAsRead() {
  return gameRequest('/game/messages/read-notifications', {
    method: 'POST',
  })
}
