/**
 * chatApi.js — Sohbet (Global Chat)
 * Sohbet odası mesajları, gönderme ve raporlama.
 */
import { gameRequest, createRequestId } from '../apiBase.js'

/**
 * Belirtilen sohbet odasının geçmiş mesajlarını döner.
 * @param {string} room   Oda adı (örn: 'global')
 * @param {number} limit  1-25
 */
export async function getChatRoomState(room = 'global', limit = 25) {
  const safeRoom = encodeURIComponent(String(room || 'global').trim() || 'global')
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25))
  return gameRequest(`/game/chat?room=${safeRoom}&limit=${safeLimit}`)
}

/**
 * Sohbet odasına mesaj gönderir.
 * @param {string} room
 * @param {string} text
 * @param {{ replyToId?: string }} options
 */
export async function sendChatRoomMessage(room, text, options = {}) {
  const replyToId = String(options?.replyToId || '').trim()
  return gameRequest('/game/chat', {
    method: 'POST',
    body: {
      room,
      text,
      replyToId: replyToId || undefined,
    },
  })
}

/** Bir sohbet mesajını moderasyona bildir. */
export async function reportChatMessage(messageId, room = '') {
  const safeId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/chat/messages/${safeId}/report`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      room: String(room || '').trim(),
    },
  })
}
