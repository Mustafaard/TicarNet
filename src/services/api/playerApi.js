/**
 * playerApi.js — Oyuncu İşlemleri
 * Profil görüntüleme/düzenleme, arkadaşlık, engelleme, avatar ve destek talebi.
 */
import { gameRequest } from '../apiBase.js'

const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024
const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

// ─── Profil ───────────────────────────────────────────────────────────────────

/** Kendi profilini döner: envanter, istatistikler, seviye bilgisi. */
export async function getProfileState() {
  return gameRequest('/game/profile')
}

/** Başka bir oyuncunun genel profilini döner. */
export async function getPublicProfileState(userId) {
  const safeId = encodeURIComponent(String(userId || '').trim())
  if (!safeId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeId}`)
}

/** Cezalı (penalize) oyuncuların listesini döner. */
export async function getPenalizedUsers() {
  return gameRequest('/game/penalized-users')
}

// ─── Arkadaşlık ───────────────────────────────────────────────────────────────

/** Arkadaş listesini ve bekleyen istekleri döner. */
export async function getFriendsState() {
  return gameRequest('/game/profile/friends')
}

/** Belirtilen oyuncuya arkadaşlık isteği gönderir. */
export async function sendFriendRequestToUser(userId) {
  const safeId = encodeURIComponent(String(userId || '').trim())
  if (!safeId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeId}/friend-request`, {
    method: 'POST',
  })
}

/**
 * Gelen arkadaşlık isteğine yanıt verir.
 * @param {string} requestId
 * @param {'accept'|'reject'|'cancel'} action
 */
export async function respondFriendRequest(requestId, action) {
  const safeId = encodeURIComponent(String(requestId || '').trim())
  const safeAction = String(action || '').trim().toLowerCase()
  if (!safeId || !['accept', 'reject', 'cancel'].includes(safeAction)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İstek yanıtı geçersiz.' },
    }
  }
  return gameRequest(`/game/profile/friend-requests/${safeId}/respond`, {
    method: 'POST',
    body: { action: safeAction },
  })
}

/** Arkadaş listesinden belirtilen oyuncuyu çıkarır. */
export async function removeFriendFromUser(userId) {
  const safeId = encodeURIComponent(String(userId || '').trim())
  if (!safeId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeId}/friends/remove`, {
    method: 'POST',
  })
}

/**
 * Belirtilen oyuncuyu engeller veya engelini kaldırır.
 * @param {string} userId
 * @param {boolean} blocked  true → engelle, false → kaldır
 */
export async function setUserBlocked(userId, blocked) {
  const safeId = encodeURIComponent(String(userId || '').trim())
  if (!safeId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeId}/block`, {
    method: 'POST',
    body: { blocked: blocked !== false },
  })
}

// ─── Avatar & Görünen Ad ──────────────────────────────────────────────────────

/** Avatar URL'sini (harici link) günceller. */
export async function updateProfileAvatarUrl(avatarUrl) {
  return gameRequest('/game/profile/avatar/url', {
    method: 'POST',
    body: { avatarUrl },
  })
}

/** Görünen adı günceller. */
export async function updateProfileDisplayName(displayName) {
  return gameRequest('/game/profile/display-name', {
    method: 'POST',
    body: { displayName: String(displayName ?? '').trim() },
  })
}

/**
 * Profil avatarı olarak dosya yükler.
 * İzin verilen MIME tipleri: PNG, JPG, WEBP, GIF — maks 2 MB.
 */
export async function uploadProfileAvatarFile(file) {
  const mimeType = String(file?.type || '').trim().toLowerCase()
  const fileSize = Number(file?.size || 0)

  if (!AVATAR_ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Sadece PNG, JPG, WEBP veya GIF yükleyebilirsin.' },
    }
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçersiz avatar dosyası.' },
    }
  }
  if (fileSize > AVATAR_MAX_FILE_BYTES) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Avatar dosyası en fazla 2 MB olabilir.' },
    }
  }

  const form = new FormData()
  form.append('avatar', file)
  return gameRequest('/game/profile/avatar/upload', {
    method: 'POST',
    body: form,
  })
}

// ─── Destek Talebi ────────────────────────────────────────────────────────────

/**
 * Destek talebi oluşturur.
 * Başlık: 4-120 karakter, Açıklama: 10-2500 karakter.
 */
export async function submitSupportRequest(payload = {}) {
  const title = String(payload?.title || '').trim()
  const description = String(payload?.description || '').trim()
  return gameRequest('/game/support/request', {
    method: 'POST',
    body: { title, description },
  })
}

// ─── Sözleşmeler ──────────────────────────────────────────────────────────────

/** Aktif ticaret sözleşmelerini döner. */
export async function getContractsState() {
  return gameRequest('/game/contracts')
}

/** Yeni ticaret sözleşmesi teklifi oluşturur. */
export async function createContractOffer(payload) {
  return gameRequest('/game/contracts', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Gelen sözleşme teklifine yanıt verir.
 * @param {string} contractId
 * @param {'accept'|'reject'|'cancel'} action
 */
export async function respondContractOffer(contractId, action) {
  return gameRequest(`/game/contracts/${contractId}/respond`, {
    method: 'POST',
    body: { action },
  })
}
