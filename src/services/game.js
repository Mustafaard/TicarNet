/**
 * game.js — Geriye Dönük Uyumluluk Katmanı
 *
 * Bu dosya artık hiçbir şey implement etmiyor.
 * Tüm implementasyonlar domain-specific API modüllerine taşındı.
 * Eski import'ların kırılmaması için tüm fonksiyonlar burada re-export ediliyor.
 *
 * Yeni kod yazan biri için doğru import yolları:
 *   Ana Menü      → services/api/homeApi.js
 *   Liderlik      → services/api/leaderboardApi.js
 *   Sandıklar     → services/api/chestApi.js
 *   DM            → services/api/dmApi.js
 *   Premium       → services/api/premiumApi.js
 *   Elmas Marketi → services/api/diamondApi.js
 *   Fabrikalar    → services/api/factoryApi.js
 *   Görevler      → services/api/missionApi.js
 *   İşletmeler    → services/api/businessApi.js
 *   Madenler      → services/api/mineApi.js
 *   Mesajlar      → services/api/messageApi.js
 *   Sohbet        → services/api/chatApi.js
 *   Oyuncu        → services/api/playerApi.js
 *   Pazar         → services/api/marketApi.js
 *   Finans        → services/api/financeApi.js
 *   Moderasyon    → services/api/moderationApi.js
 *   WebSocket     → services/api/realtimeApi.js
 */

// ── Ana Menü ──────────────────────────────────────────────────────────────────
export { getGameOverview } from './api/homeApi.js'

// ── Liderlik ──────────────────────────────────────────────────────────────────
export { getLeagueState, claimLeagueReward } from './api/leaderboardApi.js'

// ── Sandıklar ─────────────────────────────────────────────────────────────────
export { openLeagueSeasonChest } from './api/chestApi.js'

// ── DM / Özel Mesajlar ────────────────────────────────────────────────────────
export {
  getDirectMessageThread,
  sendDirectMessageToUser,
  reportDirectMessage,
  markMessageCenterItemRead,
  markMessageCenterNotificationsAsRead,
} from './api/dmApi.js'

// ── Premium ───────────────────────────────────────────────────────────────────
export { purchasePremium, getDailyLoginReward, claimDailyLoginReward } from './api/premiumApi.js'

// ── Elmas Marketi ─────────────────────────────────────────────────────────────
export {
  getDailyStore,
  purchaseDailyOffer,
  consumeDiamondWelcomePack,
} from './api/diamondApi.js'

// ── Fabrikalar ────────────────────────────────────────────────────────────────
export {
  getFactoriesState,
  buyFactory,
  collectFactory,
  collectFactoriesBulk,
  upgradeFactory,
  speedupFactoryUpgrade,
  speedupFactoryBuild,
} from './api/factoryApi.js'

// ── Görevler ──────────────────────────────────────────────────────────────────
export { getMissionsState, claimMissionReward } from './api/missionApi.js'

// ── İşletmeler & Lojistik ────────────────────────────────────────────────────
export {
  getBusinessesState,
  buyBusiness,
  collectBusinessIncome,
  collectBusinessesBulk,
  upgradeBusinessLevel,
  produceBusinessVehicle,
  listBusinessVehicle,
  buyBusinessVehicleListing,
  cancelBusinessVehicleListing,
  scrapBusinessVehicleListing,
  scrapBusinessVehicle,
  getLogisticsState,
  createLogisticsShipment,
  purchaseLogisticsTruck,
  listLogisticsTruckForSale,
  claimLogisticsShipment,
  collectLogisticsIncome,
  scrapLogisticsTruck,
} from './api/businessApi.js'

// ── Madenler ──────────────────────────────────────────────────────────────────
export { getMinesState, startMineDig, collectMine } from './api/mineApi.js'

// ── Mesajlar & Bildirimler ────────────────────────────────────────────────────
export {
  getMessageCenterState,
  getPushCenterState,
  updatePushSettings,
  createPriceAlert,
  registerPushDevice,
  unregisterPushDevice,
  readPushNotification,
} from './api/messageApi.js'

// ── Sohbet ────────────────────────────────────────────────────────────────────
export {
  getChatRoomState,
  sendChatRoomMessage,
  reportChatMessage,
} from './api/chatApi.js'

// ── Oyuncu İşlemleri ──────────────────────────────────────────────────────────
export {
  getProfileState,
  getPublicProfileState,
  getFriendsState,
  sendFriendRequestToUser,
  respondFriendRequest,
  removeFriendFromUser,
  setUserBlocked,
  updateProfileAvatarUrl,
  updateProfileDisplayName,
  uploadProfileAvatarFile,
  getPenalizedUsers,
  submitSupportRequest,
  getContractsState,
  createContractOffer,
  respondContractOffer,
} from './api/playerApi.js'

// ── Pazar & Ticaret ───────────────────────────────────────────────────────────
export {
  getMarketState,
  getOrderBookState,
  placeOrderBookOrder,
  cancelOrderBookOrder,
  buyItem,
  buyFromSellOrder,
  sellItem,
  createMarketAuction,
  placeAuctionBid,
} from './api/marketApi.js'

// ── Finans (Banka & Döviz) ────────────────────────────────────────────────────
export {
  getBankState,
  getForexState,
  depositBankCash,
  withdrawBankCash,
  openBankTermDeposit,
  claimBankTermDeposit,
  buyForexCurrency,
  sellForexCurrency,
} from './api/financeApi.js'

// ── Moderasyon ────────────────────────────────────────────────────────────────
export {
  moderateDeleteChatMessage,
  moderateDeleteDirectMessage,
  moderateBlockMessages,
  moderateClearMessageBlock,
} from './api/moderationApi.js'

// ── WebSocket / Gerçek Zamanlı ────────────────────────────────────────────────
export {
  getAuthTokenForRealtime,
  getRealtimeSocketProtocols,
  getRealtimeChatUrl,
  getRealtimeMessagesUrl,
} from './api/realtimeApi.js'
