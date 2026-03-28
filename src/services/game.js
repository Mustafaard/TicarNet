import { buildApiUrl, buildRealtimeSocketUrl } from './apiRuntime.js'
import { logoutUser, shouldForceLogoutFromResult } from './auth.js'

const ACCESS_TOKEN_KEY = 'ticarnet_access_token'
const SESSION_TOKEN_KEY = 'ticarnet_session_token'
const WS_PROTOCOL_SAFE_TOKEN = /^[A-Za-z0-9._~-]+$/
const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024
const AVATAR_ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const FORCED_LOGOUT_EVENT = 'ticarnet:auth-force-logout'
const SESSION_LOST_MESSAGE =
  'Oturum bulunamad?. Hesab?n ba?ka bir cihazda a??lm?? olabilir veya s?resi dolmu? olabilir. L?tfen tekrar giri? yap.'

function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY)
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function firstErrorText(errors, fallback = '') {
  if (!errors || typeof errors !== 'object') return String(fallback || '').trim()
  const found = Object.values(errors).find((value) => typeof value === 'string' && value.trim())
  return String(found || fallback || '').trim()
}

function emitForcedLogout(message, reason = 'unauthorized') {
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

export function getAuthTokenForRealtime() {
  return getStoredToken()
}

export function getRealtimeSocketProtocols() {
  const token = String(getStoredToken() || '').trim()
  if (!token) return []
  if (!WS_PROTOCOL_SAFE_TOKEN.test(token)) return []
  return ['ticarnet-auth', `ticarnet-token.${token}`]
}

export function getRealtimeChatUrl(room = 'global') {
  const token = getStoredToken()
  if (!token || typeof window === 'undefined') return ''

  const safeRoom = String(room || '').trim() || 'global'
  const wsUrl = buildRealtimeSocketUrl('/chat')
  if (!wsUrl) return ''

  wsUrl.searchParams.set('room', safeRoom)
  return wsUrl.toString()
}

export function getRealtimeMessagesUrl() {
  const token = getStoredToken()
  if (!token || typeof window === 'undefined') return ''

  const wsUrl = buildRealtimeSocketUrl('/messages/ws')
  if (!wsUrl) return ''

  return wsUrl.toString()
}

async function gameRequest(path, options = {}) {
  const { method = 'GET', body } = options
  const token = getStoredToken()

  if (!token) {
    const result = {
      success: false,
      reason: 'unauthorized',
      errors: {
        global: SESSION_LOST_MESSAGE,
      },
    }
    emitForcedLogout(result.errors.global, result.reason)
    return result
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  }

  const hasBody = typeof body !== 'undefined'
  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData
  if (hasBody && !isFormData) headers['Content-Type'] = 'application/json'

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers,
      body: hasBody ? (isFormData ? body : JSON.stringify(body)) : undefined,
    })

    const payload = await response
      .json()
      .catch(() => ({ success: false, errors: { global: 'Sunucu yan?t? okunamad?.' } }))

    if (!response.ok) {
      const result = payload.success === false
        ? payload
        : { success: false, errors: { global: 'Sunucu hatas? olu?tu.' } }
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
      errors: { global: 'Sunucuya ba?lan?lamad?. API ?al???yor mu kontrol et.' },
    }
  }
}

export async function getGameOverview() {
  return gameRequest('/game/overview')
}

export async function getMarketState() {
  return gameRequest('/game/market')
}

export async function getOrderBookState(itemId) {
  const search = itemId ? `?itemId=${encodeURIComponent(itemId)}` : ''
  return gameRequest(`/game/market/orderbook${search}`)
}

export async function placeOrderBookOrder(payload) {
  return gameRequest('/game/market/orderbook/orders', {
    method: 'POST',
    body: payload,
  })
}

export async function cancelOrderBookOrder(orderId) {
  return gameRequest(`/game/market/orderbook/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}

export async function buyItem(itemId, quantity) {
  return gameRequest('/game/market/buy', {
    method: 'POST',
    body: { itemId, quantity },
  })
}

export async function buyFromSellOrder(orderId, quantity) {
  return gameRequest('/game/market/buy-from-order', {
    method: 'POST',
    body: { orderId, quantity },
  })
}

export async function sellItem(itemId, quantity) {
  return gameRequest('/game/market/sell', {
    method: 'POST',
    body: { itemId, quantity },
  })
}

export async function createMarketAuction(payload) {
  return gameRequest('/game/market/auctions', {
    method: 'POST',
    body: payload,
  })
}

export async function placeAuctionBid(auctionId, amount) {
  const safeAuctionId = encodeURIComponent(String(auctionId || '').trim())
  return gameRequest(`/game/market/auctions/${safeAuctionId}/bid`, {
    method: 'POST',
    body: { amount },
  })
}

export async function getForexState() {
  return gameRequest('/game/forex')
}

export async function getBankState() {
  return gameRequest('/game/bank')
}

export async function depositBankCash(amount) {
  return gameRequest('/game/bank/deposit', {
    method: 'POST',
    body: { amount },
  })
}

export async function withdrawBankCash(amount) {
  return gameRequest('/game/bank/withdraw', {
    method: 'POST',
    body: { amount },
  })
}

export async function openBankTermDeposit(amount, days) {
  return gameRequest('/game/bank/term/open', {
    method: 'POST',
    body: { amount, days },
  })
}

export async function claimBankTermDeposit() {
  return gameRequest('/game/bank/term/claim', {
    method: 'POST',
  })
}

export async function buyForexCurrency(quantity, currencyId = 'tct') {
  return gameRequest('/game/forex/buy', {
    method: 'POST',
    body: { currencyId, quantity },
  })
}

export async function sellForexCurrency(quantity, currencyId = 'tct') {
  return gameRequest('/game/forex/sell', {
    method: 'POST',
    body: { currencyId, quantity },
  })
}

export async function getBusinessesState() {
  return gameRequest('/game/businesses')
}

export async function getLogisticsState() {
  return gameRequest('/game/logistics')
}

export async function createLogisticsShipment(payload) {
  return gameRequest('/game/logistics', {
    method: 'POST',
    body: payload,
  })
}

export async function purchaseLogisticsTruck(payload) {
  return gameRequest('/game/logistics/trucks', {
    method: 'POST',
    body: payload,
  })
}

export async function listLogisticsTruckForSale(truckId, payload = {}) {
  const safeId = encodeURIComponent(String(truckId || '').trim())
  return gameRequest(`/game/logistics/trucks/${safeId}/list`, {
    method: 'POST',
    body: payload,
  })
}

export async function claimLogisticsShipment(shipmentId) {
  return gameRequest(`/game/logistics/${shipmentId}/claim`, {
    method: 'POST',
  })
}

export async function collectLogisticsIncome() {
  return gameRequest('/game/logistics/collect', {
    method: 'POST',
  })
}

export async function buyBusiness(templateId) {
  return gameRequest('/game/businesses/buy', {
    method: 'POST',
    body: { templateId },
  })
}

export async function collectBusinessesBulk(payload = {}) {
  return gameRequest('/game/businesses/collect/bulk', {
    method: 'POST',
    body: payload,
  })
}

export async function getFactoriesState() {
  return gameRequest('/game/factories')
}

export async function buyFactory(factoryId) {
  return gameRequest('/game/factories/buy', {
    method: 'POST',
    body: { factoryId },
  })
}

export async function collectFactory(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/collect`, {
    method: 'POST',
  })
}

export async function collectFactoriesBulk() {
  return gameRequest('/game/factories/collect/bulk', {
    method: 'POST',
  })
}

export async function upgradeFactory(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/upgrade`, {
    method: 'POST',
  })
}

export async function speedupFactoryUpgrade(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/speedup`, {
    method: 'POST',
  })
}

export async function speedupFactoryBuild(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/speedup-build`, {
    method: 'POST',
  })
}

export async function getMinesState() {
  return gameRequest('/game/mines')
}

export async function startMineDig(mineId) {
  const safeId = encodeURIComponent(String(mineId || '').trim())
  return gameRequest(`/game/mines/${safeId}/dig`, {
    method: 'POST',
    body: {},
  })
}

export async function collectMine(mineId) {
  const safeId = encodeURIComponent(String(mineId || '').trim())
  return gameRequest(`/game/mines/${safeId}/collect`, {
    method: 'POST',
    body: {},
  })
}

export async function purchasePremium(planId) {
  return gameRequest('/game/premium/purchase', {
    method: 'POST',
    body: { planId },
  })
}

export async function getDailyStore() {
  return gameRequest('/game/store/daily', {
    method: 'GET',
  })
}

export async function getDailyLoginReward() {
  return gameRequest('/game/rewards/daily-login', {
    method: 'GET',
  })
}

export async function claimDailyLoginReward() {
  return gameRequest('/game/rewards/daily-login/claim', {
    method: 'POST',
    body: {},
  })
}

export async function purchaseDailyOffer(offerId) {
  return gameRequest('/game/store/daily/purchase', {
    method: 'POST',
    body: { offerId },
  })
}

export async function consumeDiamondWelcomePack(packId = 'welcome-pack-5000') {
  return gameRequest('/game/store/diamond/welcome/consume', {
    method: 'POST',
    body: { packId },
  })
}

export async function upgradeBusinessLevel(businessId) {
  return gameRequest(`/game/businesses/${businessId}/upgrade`, { method: 'POST' })
}

export async function produceBusinessVehicle(businessId, payload = {}) {
  return gameRequest(`/game/businesses/${businessId}/produce-vehicle`, {
    method: 'POST',
    body: payload,
  })
}

export async function listBusinessVehicle(businessId, payload) {
  return gameRequest(`/game/businesses/${businessId}/list-vehicle`, {
    method: 'POST',
    body: payload,
  })
}

export async function buyBusinessVehicleListing(listingId) {
  const safeId = encodeURIComponent(String(listingId || '').trim())
  return gameRequest(`/game/businesses/vehicle-market/${safeId}/buy`, {
    method: 'POST',
  })
}

export async function cancelBusinessVehicleListing(listingId) {
  const safeId = encodeURIComponent(String(listingId || '').trim())
  return gameRequest(`/game/businesses/vehicle-market/${safeId}/cancel`, {
    method: 'POST',
  })
}

export async function scrapBusinessVehicleListing(listingId) {
  const safeId = encodeURIComponent(String(listingId || '').trim())
  return gameRequest(`/game/businesses/vehicle-market/${safeId}/scrap`, {
    method: 'POST',
  })
}

export async function scrapBusinessVehicle(businessId, payload = {}) {
  return gameRequest(`/game/businesses/${businessId}/scrap-vehicle`, {
    method: 'POST',
    body: payload,
  })
}

export async function scrapLogisticsTruck(truckId) {
  const safeTruckId = encodeURIComponent(String(truckId || '').trim())
  return gameRequest(`/game/logistics/${safeTruckId}/scrap-truck`, {
    method: 'POST',
  })
}

export async function collectBusinessIncome(businessId) {
  return gameRequest(`/game/businesses/${businessId}/collect`, { method: 'POST' })
}

export async function getMissionsState() {
  return gameRequest('/game/missions')
}

export async function claimMissionReward(missionId) {
  return gameRequest(`/game/missions/${missionId}/claim`, { method: 'POST' })
}

export async function getProfileState() {
  return gameRequest('/game/profile')
}

export async function getPublicProfileState(userId) {
  const safeUserId = encodeURIComponent(String(userId || '').trim())
  if (!safeUserId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeUserId}`)
}

export async function getFriendsState() {
  return gameRequest('/game/profile/friends')
}

export async function sendFriendRequestToUser(userId) {
  const safeUserId = encodeURIComponent(String(userId || '').trim())
  if (!safeUserId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeUserId}/friend-request`, {
    method: 'POST',
  })
}

export async function respondFriendRequest(requestId, action) {
  const safeRequestId = encodeURIComponent(String(requestId || '').trim())
  const safeAction = String(action || '').trim().toLowerCase()
  if (!safeRequestId || !['accept', 'reject', 'cancel'].includes(safeAction)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İstek yanıtı geçersiz.' },
    }
  }
  return gameRequest(`/game/profile/friend-requests/${safeRequestId}/respond`, {
    method: 'POST',
    body: { action: safeAction },
  })
}

export async function removeFriendFromUser(userId) {
  const safeUserId = encodeURIComponent(String(userId || '').trim())
  if (!safeUserId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeUserId}/friends/remove`, {
    method: 'POST',
  })
}

export async function setUserBlocked(userId, blocked) {
  const safeUserId = encodeURIComponent(String(userId || '').trim())
  if (!safeUserId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir kullanıcı gerekli.' },
    }
  }
  return gameRequest(`/game/profile/${safeUserId}/block`, {
    method: 'POST',
    body: { blocked: blocked !== false },
  })
}

export async function updateProfileAvatarUrl(avatarUrl) {
  return gameRequest('/game/profile/avatar/url', {
    method: 'POST',
    body: { avatarUrl },
  })
}

export async function updateProfileDisplayName(displayName) {
  return gameRequest('/game/profile/display-name', {
    method: 'POST',
    body: { displayName: String(displayName ?? '').trim() },
  })
}

export async function submitSupportRequest(payload = {}) {
  const title = String(payload?.title || '').trim()
  const description = String(payload?.description || '').trim()
  return gameRequest('/game/support/request', {
    method: 'POST',
    body: { title, description },
  })
}

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

export async function getChatRoomState(room = 'global', limit = 25) {
  const safeRoom = encodeURIComponent(String(room || 'global').trim() || 'global')
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25))
  return gameRequest(`/game/chat?room=${safeRoom}&limit=${safeLimit}`)
}

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

export async function reportChatMessage(messageId, room = '') {
  const safeMessageId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/chat/messages/${safeMessageId}/report`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      room: String(room || '').trim(),
    },
  })
}

export async function reportDirectMessage(messageId, reason) {
  const safeMessageId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/messages/${safeMessageId}/report`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      reason: String(reason || '').trim(),
    },
  })
}

export async function moderateDeleteChatMessage(messageId, room, reason) {
  const safeMessageId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/moderation/chat/messages/${safeMessageId}/delete`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      room: String(room || '').trim(),
      reason: String(reason || '').trim(),
    },
  })
}

export async function moderateDeleteDirectMessage(messageId, reason) {
  const safeMessageId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/moderation/dm/messages/${safeMessageId}/delete`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      reason: String(reason || '').trim(),
    },
  })
}

export async function moderateBlockMessages(targetUserId, targetLookup, durationMinutes, reason) {
  const safeTargetUserId = encodeURIComponent(String(targetUserId || '').trim())
  return gameRequest(`/game/moderation/users/${safeTargetUserId}/message-block`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup: String(targetLookup || '').trim(),
      durationMinutes,
      reason: String(reason || '').trim(),
    },
  })
}

export async function moderateClearMessageBlock(targetUserId, targetLookup = '') {
  const safeTargetUserId = encodeURIComponent(String(targetUserId || '').trim())
  return gameRequest(`/game/moderation/users/${safeTargetUserId}/message-block/clear`, {
    method: 'POST',
    body: {
      requestId: createRequestId(),
      targetLookup: String(targetLookup || '').trim(),
    },
  })
}

export async function getMessageCenterState(filter = 'all', limit = 25) {
  const safeFilter = encodeURIComponent(String(filter || 'all').trim().toLowerCase() || 'all')
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25))
  return gameRequest(`/game/messages?filter=${safeFilter}&limit=${safeLimit}`)
}

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

export async function sendDirectMessageToUser(payload) {
  return gameRequest('/game/messages/send', {
    method: 'POST',
    body: payload,
  })
}

export async function markMessageCenterItemRead(messageId) {
  const safeId = encodeURIComponent(String(messageId || '').trim())
  return gameRequest(`/game/messages/${safeId}/read`, {
    method: 'POST',
  })
}

export async function getContractsState() {
  return gameRequest('/game/contracts')
}

export async function createContractOffer(payload) {
  return gameRequest('/game/contracts', {
    method: 'POST',
    body: payload,
  })
}

export async function respondContractOffer(contractId, action) {
  return gameRequest(`/game/contracts/${contractId}/respond`, {
    method: 'POST',
    body: { action },
  })
}

export async function getLeagueState() {
  return gameRequest('/game/league')
}

export async function claimLeagueReward(period) {
  return gameRequest('/game/league/claim', {
    method: 'POST',
    body: { period },
  })
}

export async function openLeagueSeasonChest(chestId) {
  return gameRequest('/game/league/chest/open', {
    method: 'POST',
    body: { chestId },
  })
}

export async function getPushCenterState() {
  return gameRequest('/game/push')
}

export async function updatePushSettings(payload) {
  return gameRequest('/game/push/settings', {
    method: 'POST',
    body: payload,
  })
}

export async function createPriceAlert(payload) {
  return gameRequest('/game/push/price-alert', {
    method: 'POST',
    body: payload,
  })
}

export async function registerPushDevice(payload) {
  return gameRequest('/game/push/device/register', {
    method: 'POST',
    body: payload,
  })
}

export async function unregisterPushDevice(payload) {
  return gameRequest('/game/push/device/unregister', {
    method: 'POST',
    body: payload,
  })
}

export async function readPushNotification(pushId) {
  return gameRequest(`/game/push/${pushId}/read`, {
    method: 'POST',
  })
}
