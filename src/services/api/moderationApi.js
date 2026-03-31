/**
 * moderationApi.js — Moderasyon
 * Yönetici/moderatör işlemleri: mesaj silme ve kullanıcı engelleme.
 * Tüm fonksiyonlar admin veya moderatör rolü gerektirir.
 */
import { gameRequest, createRequestId } from '../apiBase.js'

/** Global sohbet odasındaki bir mesajı siler. */
export async function moderateDeleteChatMessage(messageId, room, reason) {
  const safeId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/moderation/chat/messages/${safeId}/delete`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      room: String(room || '').trim(),
      reason: String(reason || '').trim(),
    },
  })
}

/** Bir DM mesajını siler. */
export async function moderateDeleteDirectMessage(messageId, reason) {
  const safeId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/moderation/dm/messages/${safeId}/delete`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      reason: String(reason || '').trim(),
    },
  })
}

/**
 * Bir kullanıcıya mesaj yasağı uygular.
 * @param {string} targetUserId
 * @param {string} targetLookup  Kullanıcı adı veya ek tanımlayıcı
 * @param {number} durationMinutes
 * @param {string} reason
 */
export async function moderateBlockMessages(targetUserId, targetLookup, durationMinutes, reason) {
  const safeId = encodeURIComponent(String(targetUserId || '').trim())
  return gameRequest(`/game/moderation/users/${safeId}/message-block`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup: String(targetLookup || '').trim(),
      durationMinutes,
      reason: String(reason || '').trim(),
    },
  })
}

/** Kullanıcının mesaj yasağını kaldırır. */
export async function moderateClearMessageBlock(targetUserId, targetLookup = '') {
  const safeId = encodeURIComponent(String(targetUserId || '').trim())
  return gameRequest(`/game/moderation/users/${safeId}/message-block/clear`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup: String(targetLookup || '').trim(),
    },
  })
}
