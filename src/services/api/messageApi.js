/**
 * messageApi.js — Mesajlar & Bildirimler
 * Mesaj merkezi (in-game bildirimler) ve push bildirim yönetimi.
 */
import { gameRequest } from '../apiBase.js'

// ─── Mesaj Merkezi ────────────────────────────────────────────────────────────

/**
 * Mesaj merkezini döner.
 * @param {'all'|'message'|'trade'|'other'|'alert'} filter
 * @param {number} limit  1-25
 */
export async function getMessageCenterState(filter = 'all', limit = 25) {
  const safeFilter = encodeURIComponent(String(filter || 'all').trim().toLowerCase() || 'all')
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25))
  return gameRequest(`/game/messages?filter=${safeFilter}&limit=${safeLimit}`)
}

// ─── Push Bildirimleri ────────────────────────────────────────────────────────

/** Push bildirim merkezini ve ayarlarını döner. */
export async function getPushCenterState() {
  return gameRequest('/game/push')
}

/** Push bildirim ayarlarını günceller. */
export async function updatePushSettings(payload) {
  return gameRequest('/game/push/settings', {
    method: 'POST',
    body: payload,
  })
}

/** Belirtilen ürün için fiyat alarmı oluşturur. */
export async function createPriceAlert(payload) {
  return gameRequest('/game/push/price-alert', {
    method: 'POST',
    body: payload,
  })
}

/** Yeni push cihazı kaydeder (Android/Web). */
export async function registerPushDevice(payload) {
  return gameRequest('/game/push/device/register', {
    method: 'POST',
    body: payload,
  })
}

/** Kayıtlı push cihazını siler. */
export async function unregisterPushDevice(payload) {
  return gameRequest('/game/push/device/unregister', {
    method: 'POST',
    body: payload,
  })
}

/** Belirtilen push bildirimi okundu olarak işaretle. */
export async function readPushNotification(pushId) {
  return gameRequest(`/game/push/${pushId}/read`, {
    method: 'POST',
  })
}
