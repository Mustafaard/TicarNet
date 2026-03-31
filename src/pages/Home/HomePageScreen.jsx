import { useCallback, useEffect, useMemo, useRef, startTransition, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import {
  NAV,
  MARKET_TABS,
  CHAT_ROOM,
  CHAT_PRUNE_KEEP_COUNT,
  CHAT_NEWS_MAX_ITEMS,
  EMPTY_MESSAGE_UNREAD,
  DEFAULT_CHAT_AVATAR,
  MESSAGE_ICONS,
  MESSAGE_FILTERS,
  VEHICLE_MARKET_COMMISSION_RATE,
  VEHICLE_MARKET_COMMISSION_PERCENT,
  VEHICLE_SCRAP_RETURN_RATE,
  VEHICLE_LIFETIME_MS,
  VEHICLE_LIFETIME_MONTHS_TOTAL,
  COLLECTION_TAX_RATE,
  COLLECTION_TAX_PERCENT,
  LISTING_PRICE_PROFILE,
  EMPTY_CHAT_RESTRICTIONS,
  EMPTY_USER_MODERATION,
  NAV_THEME_STORAGE_KEY,
  NAV_THEME_DEFAULT,
  NAV_THEMES,
  MOBILE_LAYOUT_MAX_WIDTH,
  ANNOUNCEMENT_TYPE_ANNOUNCEMENT,
  ANNOUNCEMENT_TYPE_UPDATE,
  TUTORIAL_SPOTLIGHT_CLASS,
  TUTORIAL_STEPS,
  TUTORIAL_STEP_IMAGE_BY_ID,
  TUTORIAL_PENDING_KEY,
  TUTORIAL_COMPLETED_KEY,
  TUTORIAL_STEP_KEY,
  TUTORIAL_TASKS_KEY,
  CITY_RULES_GUIDE,
  FLEET_CARD_META,
  BUSINESS_UNLOCK_ICON_BY_KEY,
  BUSINESS_UNLOCK_LABEL_BY_KEY,
  FACTORY_CARD_ORDER,
  FACTORY_SHOP_IMAGE_BY_ID,
  FACTORY_ITEM_META,
  MINE_IMAGE_BY_ID,
  MINE_NAME_BY_ID,
  MINE_OUTPUT_LABEL_BY_ITEM_ID,
  DEPOT_CATALOG,
  DEPOT_META_BY_ID,
  DAILY_LOGIN_TOTAL_DAYS,
  DAILY_LOGIN_ITEM_PRIORITY,
  DAILY_LOGIN_STATE_SEED,
  DAILY_LOGIN_ICON_BY_ITEM_ID,
  MOTO_LEVEL_IMAGE_BY_LEVEL,
  MOTO_LEVEL_KEYS,
  TRUCK_IMAGE_BY_MODEL_ID,
  TRUCK_IMAGE_BY_NAME,
  WEEKLY_EVENT_DAY_LABELS,
  WEEKLY_EVENT_DAY_ORDER,
  WEEKLY_EVENT_DAY_MS,
  WEEKLY_EVENT_WEEK_MS,
  WEEKLY_EVENT_START_OFFSET_MS,
  WEEKLY_EVENT_WINDOW_DURATION_MS,
  TURKIYE_UTC_OFFSET_MS,
  TURKIYE_TIMEZONE,
  WEEKLY_EVENT_ICON_BY_TYPE,
  WEEKLY_EVENT_FALLBACK_SCHEDULE,
  FUEL_MULTIPLIER_BY_TEMPLATE,
  BUSINESS_EXPENSE_MULTIPLIER,
  HOME_CRITICAL_ASSET_SOURCES,
  CHAT_SEED,
  MESSAGES_DISABLED,
  AUTH_FORCE_LOGOUT_EVENT,
  SESSION_REPLACED_NOTICE,
  PROFILE_THEME_OPTIONS,
  IS_NATIVE_ANDROID_RUNTIME,
  DIAMOND_WELCOME_PACK_ID,
  FOREX_CLIENT_POLL_INTERVAL_MS,
  AVATAR_CROP_OUTPUT_SIZE,
  AVATAR_CROP_PREVIEW_SIZE,
  AVATAR_MAX_FILE_BYTES,
  AVATAR_MAX_FILE_MB,
  AVATAR_CHANGE_COST_DIAMONDS,
  USERNAME_CHANGE_COST_DIAMONDS,
  AVATAR_ALLOWED_MIME_TYPES,
  DIAMOND_CASH_PACKAGES,
  FOREX_TRADE_MAX_TOTAL_QUANTITY,
  FOREX_TRADE_MAX_QUANTITY,
  FOREX_CURRENCY_ID_PATTERN,
  EVENTS_MENU_ICON_PRIMARY_SRC,
  EVENTS_MENU_ICON_FALLBACK_SRC,
  TUTORIAL_ASSISTANT_IMAGE_SRC,
  NEWS_HIDDEN_TRANSACTION_KINDS,
  MOJIBAKE_TEXT_PATTERN,
  MOJIBAKE_REPLACEMENTS,
} from './constants.js'
import {
  clamp,
  num,
  resolveMineImage,
  factoryItemMeta,
  normalizeMineLabel,
  mineDisplayName,
  mineOutputLabel,
  resolveFactoryShopImage,
  factoryPurchaseRowsFromFactory,
  resolveTruckImage,
  buildTutorialTasksForStep,
  digitsOnly,
  roundTo,
  fmt,
  toBigIntOrNull,
  formatBigIntTr,
  fmtTry,
  fmtFixed,
  fmtFxRate,
  fmtTrySigned,
  fmtCountdown,
  fmtPctSigned,
  fmtLevel,
  sanitizeNavTheme,
  loadStoredNavTheme,
  metricLengthClass,
  safeUiText,
  errText,
  resolveVehicleImage,
  fuelItemMeta,
  normalizeDailyLoginRewardItems,
  dailyLoginItemMeta,
  dailyLoginRewardEntries,
  normalizeDailyLoginPayload,
  turkiyeDayStartMs,
  weeklyEventWindowByStartDay,
  weeklyEventLocalWindow,
  normalizeWeeklyEventsPayload,
  listingPriceProfile,
  listingBounds,
  listingCommissionPreview,
  fleetListingBounds,
  logisticsListingBounds,
  scrapReturnAmount,
  scrapPreviewForEntry,
  formatScrapNotice,
  resolveVehicleLifetime,
  formatLifetimeDetailedTr,
  marketTabLabel,
  parseSafeDate,
  chatSnippet,
  normalizeRoleValue,
  roleLabelFromValue,
  normalizeSeasonBadgeMeta,
  roleBadgeMeta,
  profileStaffRoleMeta,
  _relativeChatTime,
  _formatChatDateTime,
  pruneChatMessages,
  pruneNewsRecords,
  dedupeFeedEntries,
  isHiddenNewsTransactionKind,
  parseFactoryNewsMeta,
  extractForexRateLabel,
  safeIsoDate,
  normalizeChatRestrictions,
  normalizeUserModeration,
  normalizeMessageUnreadCounters,
  remainingMsFromIso,
  fmtRemainShort,
  formatCountdownTr,
  formatLifetimeWithTotal,
  formatCountdownClock,
  formatCountdownWithDaysTr,
  formatCollectionCountdown,
  formatBuildDuration,
  isGifUrl,
  formatDateTime,
  formatAnnouncementDateTime,
  formatHourMinuteTurkey,
  normalizeAnnouncementType,
  announcementTypeMeta,
  vehicleEmojiByTier,
  vehicleCostScore,
  sortByVehicleCostAsc,
  sortByVehicleIncomeDesc,
  fuelMultiplierByTemplateId,
  fleetFuelUnitsByModelLevel,
  truckCostScore,
  sortByTruckCostAsc,
  fleetCollectPreview,
  bulkCollectPreview,
  messageIconMeta,
  replaceCommonMojibake,
  normalizeMojibakeText,
  createCostAvailabilityRow,
  fleetOrderCostRows,
  logisticsOrderCostRows,
  normalizeRequiredCostLabel,
  toDisplayOrderCostRows,
  isPageVisible,
  resolveMobileViewportWidth,
  preloadCriticalAssets,
} from './utils.js'
import {
  Chart,
  AssetMetric,
  ForexCountdownText,
  BankCountdownText,
} from './ui-components.jsx'
import { useTicker } from './useTicker.js'
// ── Market API ──
import {
  createMarketAuction,
  buyItem,
  buyFromSellOrder,
  cancelOrderBookOrder,
  getMarketState,
  getOrderBookState,
  placeOrderBookOrder,
  placeAuctionBid,
  sellItem,
} from '../../services/api/marketApi.js'
// ── Finance API ──
import {
  getForexState,
  getBankState,
  depositBankCash,
  withdrawBankCash,
  openBankTermDeposit,
  claimBankTermDeposit,
  buyForexCurrency,
  sellForexCurrency,
} from '../../services/api/financeApi.js'
// ── Inventory API (businesses, factories, mines, logistics) ──
import {
  getBusinessesState,
  getFactoriesState,
  getMinesState,
  getLogisticsState,
  buyBusiness,
  buyFactory,
  collectBusinessIncome,
  collectBusinessesBulk,
  collectLogisticsIncome,
  collectFactory,
  collectFactoriesBulk,
  upgradeBusinessLevel,
  upgradeFactory,
  speedupFactoryUpgrade,
  speedupFactoryBuild,
  startMineDig,
  collectMine,
  produceBusinessVehicle,
  listBusinessVehicle,
  buyBusinessVehicleListing,
  cancelBusinessVehicleListing,
  scrapBusinessVehicleListing,
  scrapBusinessVehicle,
  purchaseLogisticsTruck,
  listLogisticsTruckForSale,
  scrapLogisticsTruck,
} from '../../services/api/inventoryApi.js'
// ── Mission API ──
import {
  getMissionsState,
  claimMissionReward,
} from '../../services/api/missionApi.js'
// ── Profile API ──
import {
  getGameOverview,
  getProfileState,
  getPublicProfileState,
  getFriendsState,
  sendFriendRequestToUser,
  respondFriendRequest,
  removeFriendFromUser,
  setUserBlocked,
  uploadProfileAvatarFile,
  getPenalizedUsers,
} from '../../services/api/profileApi.js'
// ── Chat API ──
import {
  getChatRoomState,
  sendChatRoomMessage,
  reportChatMessage,
} from '../../services/api/chatApi.js'
import {
  getMessageCenterState,
} from '../../services/api/messageApi.js'
import {
  getDirectMessageThread,
  sendDirectMessageToUser,
  reportDirectMessage,
  markMessageCenterItemRead,
  markMessageCenterNotificationsAsRead,
} from '../../services/api/dmApi.js'
// ── Realtime API ──
import {
  getRealtimeChatUrl,
  getRealtimeMessagesUrl,
  getRealtimeSocketProtocols,
} from '../../services/api/realtimeApi.js'
// ── Notification API ──
import {
  getPushCenterState,
  updatePushSettings,
  createPriceAlert,
  readPushNotification,
} from '../../services/api/notificationApi.js'
// ── Store API ──
import {
  getDailyStore,
  getDailyLoginReward,
  claimDailyLoginReward,
  purchaseDailyOffer,
  consumeDiamondWelcomePack,
  purchasePremium,
} from '../../services/api/storeApi.js'
// ── League API ──
import {
  getLeagueState,
  claimLeagueReward,
  openLeagueSeasonChest,
} from '../../services/api/leagueApi.js'
// ── Moderation API ──
import {
  moderateBlockMessages,
  moderateDeleteChatMessage,
  moderateDeleteDirectMessage,
} from '../../services/api/moderationApi.js'
// ── Support API ──
import {
  submitSupportRequest,
} from '../../services/api/supportApi.js'
import {
  changeCurrentUserUsername,
  changeCurrentUserPassword,
  consumeAuthNotice,
  deleteCurrentUserAccount,
  getRecentRegisteredPlayers,
  getStoredUser,
  shouldForceLogoutFromResult,
} from '../../services/auth.js'
import './HomePage.css'

// ── View modules ──
import { renderMinesView } from './views/MinesView.jsx'
import { renderMissionsView } from './views/MissionsView.jsx'
import { renderMarketplaceView } from './views/MarketplaceView.jsx'
import { renderForexView } from './views/ForexView.jsx'
import { renderBankView } from './views/BankView.jsx'
import { renderHomeView } from './views/HomeView.jsx'
import { renderAnnouncementsView } from './views/AnnouncementsView.jsx'
import { renderRulesView } from './views/RulesView.jsx'
import { renderPenalizedView } from './views/PenalizedView.jsx'
import { renderEventsView } from './views/EventsView.jsx'
import { renderFactoriesView } from './views/FactoriesView.jsx'
import { renderBusinessView } from './views/BusinessView.jsx'
import { renderChatView } from './views/ChatView.jsx'
import { renderMessagesView } from './views/MessagesView.jsx'
import { renderPrivateListingsView } from './views/PrivateListingsView.jsx'
import { renderProfileContent } from './views/ProfileContent.jsx'

// ── Modal modules ──
import { renderMineConfirmModal } from './modals/MineConfirmModal.jsx'
import { renderMineDigModal } from './modals/MineDigModal.jsx'
import { renderMarketplaceBuyModal } from './modals/MarketplaceBuyModal.jsx'
import { renderTutorialOverlay } from './modals/TutorialOverlay.jsx'
import { renderAvatarChangeConfirm } from './modals/AvatarChangeConfirm.jsx'
import { renderProfileModal } from './modals/ProfileModal.jsx'
import { renderGaragePanel } from './modals/GaragePanel.jsx'
import { renderWarehouseOverlay } from './modals/WarehouseOverlay.jsx'
import { renderChatReportModal } from './modals/ChatReportModal.jsx'
import { renderDmReportModal } from './modals/DmReportModal.jsx'
import { renderStarterDetailOverlay } from './modals/StarterDetailOverlay.jsx'

// ── Hooks ──
import { useForexChart } from './hooks/useForexChart.js'
import { useLeaderboard } from './hooks/useLeaderboard.js'
import { useInventoryCalc } from './hooks/useInventoryCalc.js'
import { useChatNewsFeed } from './hooks/useChatNewsFeed.js'
import { useSockets } from './hooks/useSockets.js'
import { useDataLoaders } from './hooks/useDataLoaders.js'
import { useTutorial } from './hooks/useTutorial.js'

function HomePage({ user, onLogout }) {
  const [tab, setTab] = useState('home')
  const [marketTab, setMarketTab] = useState('buy')
  const [profileTab, setProfileTab] = useState('profile')
  const DEFAULT_MINE_DIG_DURATION_SEC = 5
  const DEFAULT_MINE_COOLDOWN_MINUTES = 15
  const role = normalizeRoleValue(user?.role)
  const isStaffUser = role === 'admin' || role === 'moderator'
  const selfRoleLabel = roleLabelFromValue(role, user?.roleLabel || '')
  const leaderboardMetricSafe = 'season'
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [leaderboardTick, setLeaderboardTick] = useState(0)
  const [leaderboardSearchOpen, setLeaderboardSearchOpen] = useState(false)
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('')
  const [leaderboardSearchError, setLeaderboardSearchError] = useState('')
  const [leaderboardHighlightKey, setLeaderboardHighlightKey] = useState('')
  const [marketplaceTab, setMarketplaceTab] = useState('pazar')
  const [marketplaceFilter, setMarketplaceFilter] = useState('all')
  const [sellForm, setSellForm] = useState({ itemId: '', quantity: '50', unitPrice: '' })
  const [marketplaceBuyModal, setMarketplaceBuyModal] = useState(null)
  const [marketplaceBuyModalQty, setMarketplaceBuyModalQty] = useState('1')
  const [navTheme, setNavTheme] = useState(() => loadStoredNavTheme())
  const [messageFilter, setMessageFilter] = useState('all')
  const [messageViewTab, setMessageViewTab] = useState('bildirimler')
  const [overview, setOverview] = useState(null)
  const [market, setMarket] = useState(null)
  const [forex, setForex] = useState(null)
  const [bankState, setBankState] = useState(null)
  const [bankForm, setBankForm] = useState({
    depositAmount: '',
    withdrawAmount: '',
    termAmount: '',
    termDays: '1',
  })
  const [forexTradeForm, setForexTradeForm] = useState({
    quantity: '',
    side: 'buy',
  })
  const [forexChartRangeId, setForexChartRangeId] = useState('24h')
  const [forexChartHoverIndex, setForexChartHoverIndex] = useState(-1)
  const [forexViewportWidth, setForexViewportWidth] = useState(() => (
    resolveMobileViewportWidth()
  ))
  const [business, setBusiness] = useState(null)
  const [factories, setFactories] = useState(null)
  const [mines, setMines] = useState(null)
  const [mineDigModal, setMineDigModal] = useState(null)
  const [mineDigCountdownSec, setMineDigCountdownSec] = useState(DEFAULT_MINE_DIG_DURATION_SEC)
  const [mineCollectResult, setMineCollectResult] = useState(null)
  const [mineConfirmModal, setMineConfirmModal] = useState(null)
  const [_minesClockTick, setMinesClockTick] = useState(0)
  const [noticeIsSuccess, setNoticeIsSuccess] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [businessScene, setBusinessScene] = useState('hub')
  const [businessDetailTab, setBusinessDetailTab] = useState('garage')
  const [logisticsDetailTab, setLogisticsDetailTab] = useState('garage')
  const [logisticsScene, setLogisticsScene] = useState('detail')
  const [businessModal, setBusinessModal] = useState('')
  const [factoryPurchaseModalId, setFactoryPurchaseModalId] = useState('')
  const [factoryBulkModalOpen, setFactoryBulkModalOpen] = useState(false)
  const [factoryBulkModalError, setFactoryBulkModalError] = useState('')
  const [factoryCollectModalId, setFactoryCollectModalId] = useState('')
  const [factoryCollectModalError, setFactoryCollectModalError] = useState('')
  const [factoryUpgradeModalId, setFactoryUpgradeModalId] = useState('')
  const [listingDraft, setListingDraft] = useState(null)
  const [listingFriends, setListingFriends] = useState([])
  const [listingFriendsLoading, setListingFriendsLoading] = useState(false)
  const [marketDetailDraft, setMarketDetailDraft] = useState(null)
  const [marketPurchaseResult, setMarketPurchaseResult] = useState(null)

  useEffect(() => preloadCriticalAssets(HOME_CRITICAL_ASSET_SOURCES), [])

  useEffect(() => {
    if (!listingDraft || String(listingDraft.visibility || 'public').trim().toLowerCase() !== 'custom') return
    const currentRecipientUserId = String(listingDraft.recipientUserId || '').trim()
    const hasCurrent = Array.isArray(listingFriends) && listingFriends.some((f) => String(f?.userId || '').trim() === currentRecipientUserId)
    const firstFriendUserId = Array.isArray(listingFriends) && listingFriends.length ? String(listingFriends[0]?.userId || '').trim() : ''
    if (!hasCurrent && firstFriendUserId) {
      setListingDraft((prev) => (prev ? { ...prev, recipientUserId: firstFriendUserId } : prev))
    }
  }, [listingFriends, listingDraft, setListingDraft])
  const [collectTargetBusinessId, setCollectTargetBusinessId] = useState('')
  const [marketFilterForm, setMarketFilterForm] = useState({
    model: 'all',
    minPrice: '',
    maxPrice: '',
    minLevel: '',
    maxLevel: '',
  })
  const [missions, setMissions] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orderBook, setOrderBook] = useState(null)
  const [logistics, setLogistics] = useState(null)
  const [league, setLeague] = useState(null)
  const [seasonRewardsOpen, setSeasonRewardsOpen] = useState(false)
  const [seasonChestsOpen, setSeasonChestsOpen] = useState(false)
  const [, setPushCenter] = useState(null)
  const [history, setHistory] = useState({})
  const [chartItemId, setChartItemId] = useState('')
  const [bookItemId, setBookItemId] = useState('')
  const [qty, setQty] = useState({})
  const [orderForm, setOrderForm] = useState({
    side: 'buy',
    quantity: '25',
    limitPrice: '100',
    expiresMinutes: '30',
  })
  const [priceAlertForm, setPriceAlertForm] = useState({
    itemId: '',
    direction: 'below',
    targetPrice: '100',
  })
  const [auctionForm, setAuctionForm] = useState({
    itemId: '',
    quantity: '20',
    startBid: '1500',
    minIncrement: '100',
    durationMinutes: '30',
  })
  const [auctionBidById, setAuctionBidById] = useState({})
  const [chat, setChat] = useState(CHAT_SEED)
  const [chatUsers, setChatUsers] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatReplyTarget, setChatReplyTarget] = useState(null)
  const [chatFirstUnreadId, setChatFirstUnreadId] = useState('')
  const [chatCommunityTab, setChatCommunityTab] = useState('sohbet')
  const [, setChatSocketState] = useState('offline')
  const [chatRestrictions, setChatRestrictions] = useState(EMPTY_CHAT_RESTRICTIONS)
  const [chatClockMs, setChatClockMs] = useState(() => new Date().getTime())
  const [penalizedUsers, setPenalizedUsers] = useState([])
  const [chatRecentPlayers, setChatRecentPlayers] = useState([])
  const [chatRecentPlayersLoading, setChatRecentPlayersLoading] = useState(false)
  const [chatNewsExpandedId, setChatNewsExpandedId] = useState('')
  const [, setMessageSocketState] = useState('offline')
  const [messageCenter, setMessageCenter] = useState({
    filter: 'all',
    counts: { all: 0, message: 0, trade: 0, other: 0, alert: 0 },
    unreadCount: 0,
    unread: EMPTY_MESSAGE_UNREAD,
    spotlight: null,
    items: [],
    moderation: EMPTY_USER_MODERATION,
  })

  const [messageThread, setMessageThread] = useState([])
  const [messageForm, setMessageForm] = useState({ toUsername: '', text: '' })
  const [messageReplyTarget, setMessageReplyTarget] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(() => consumeAuthNotice())
  const [error, setError] = useState('')
  const [levelFx, setLevelFx] = useState(false)
  const [bursts, setBursts] = useState([])
  const [avatarFailedSrc, setAvatarFailedSrc] = useState('')
  const [profileModalUserId, setProfileModalUserId] = useState(null)
  const [profileModalData, setProfileModalData] = useState(null)
  const [profileModalLoading, setProfileModalLoading] = useState(false)
  const [profileModalBusinessExpand, setProfileModalBusinessExpand] = useState(null)
  const [profileTeklifSending, setProfileTeklifSending] = useState(false)
  const [chatReportModal, setChatReportModal] = useState(null)
  const [dmReportModal, setDmReportModal] = useState(null)
  const [garagePanel, setGaragePanel] = useState({
    open: false,
    username: null,
    displayName: null,
    avatarUrl: null,
    levelLabel: null,
    businessName: null,
    templateId: '',
    assetTypeLabel: 'Araç',
    garageTypeLabel: 'Garaj',
    vehicles: [],
    isLogistics: false,
  })
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarCropSource, setAvatarCropSource] = useState('')
  const [avatarCropFile, setAvatarCropFile] = useState(null)
  const [avatarCropFileName, setAvatarCropFileName] = useState('')
  const [avatarCropMode, setAvatarCropMode] = useState('crop')
  const [avatarChangeConfirmOpen, setAvatarChangeConfirmOpen] = useState(false)
  const [avatarCropZoom, setAvatarCropZoom] = useState(1)
  const [avatarCropOffsetX, setAvatarCropOffsetX] = useState(0)
  const [avatarCropOffsetY, setAvatarCropOffsetY] = useState(0)
  const [avatarCropNatural, setAvatarCropNatural] = useState({ width: 0, height: 0 })
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [profileAccountForm, setProfileAccountForm] = useState(() => ({
    username: String(user?.username || '').trim(),
    avatarUrl: '',
    newPassword: '',
    confirmPassword: '',
    deleteEmail: '',
    deletePassword: '',
  }))
  const [supportForm, setSupportForm] = useState({
    title: '',
    description: '',
  })
  const [settingsThemeModalOpen, setSettingsThemeModalOpen] = useState(false)
  const [dailyStore, setDailyStore] = useState({
    offers: [],
    nextResetAt: '',
    remainingMs: 0,
    weekMultiplier: 1,
  })
  const [dailyLoginReward, setDailyLoginReward] = useState(DAILY_LOGIN_STATE_SEED)
  const [dailyRewardOpen, setDailyRewardOpen] = useState(false)
  const [dailyRewardResult, setDailyRewardResult] = useState(null)
  const [tutorialEnabled, setTutorialEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return (
        window.localStorage.getItem(TUTORIAL_PENDING_KEY) === '1' ||
        window.localStorage.getItem(TUTORIAL_COMPLETED_KEY) === '1' ||
        window.localStorage.getItem(TUTORIAL_STEP_KEY) !== null ||
        window.localStorage.getItem('ticarnet_live_narrator_welcome') === '1'
      )
    } catch {
      return false
    }
  })
  const [tutorialPending, setTutorialPending] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return (
        window.localStorage.getItem(TUTORIAL_PENDING_KEY) === '1' ||
        window.localStorage.getItem('ticarnet_live_narrator_welcome') === '1'
      )
    } catch {
      return false
    }
  })
  const [tutorialCompleted, setTutorialCompleted] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(TUTORIAL_COMPLETED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [tutorialActive, setTutorialActive] = useState(false)
  const [tutorialStepIndex, setTutorialStepIndex] = useState(() => {
    if (typeof window === 'undefined') return 0
    try {
      const raw = Math.trunc(num(window.localStorage.getItem(TUTORIAL_STEP_KEY) || 0))
      return clamp(raw, 0, Math.max(0, TUTORIAL_STEPS.length - 1))
    } catch {
      return 0
    }
  })
  const [tutorialTaskState, setTutorialTaskState] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      const parsed = JSON.parse(window.localStorage.getItem(TUTORIAL_TASKS_KEY) || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      const normalized = {}
      Object.entries(parsed).forEach(([stepId, stepTasks]) => {
        if (!stepTasks || typeof stepTasks !== 'object' || Array.isArray(stepTasks)) return
        const safeStepId = String(stepId || '').trim()
        if (!safeStepId) return
        normalized[safeStepId] = Object.fromEntries(
          Object.entries(stepTasks).map(([taskId, done]) => [String(taskId || '').trim(), Boolean(done)]),
        )
      })
      return normalized
    } catch {
      return {}
    }
  })
  const [tutorialNavPending, setTutorialNavPending] = useState(false)
  const fxTimer = useRef(0)
  const forexBoundaryRetryTimerRef = useRef(0)
  const forexHoverRafRef = useRef(0)
  const forexHoverPendingRef = useRef(null)
  const overviewLevelRef = useRef(0)
  const burstCounter = useRef(0)
  const chatSocketRef = useRef(null)
  const marketDetailJustOpenedAtRef = useRef(0)
  const chatReconnectTimer = useRef(0)
  const chatReconnectEnabled = useRef(true)
  const chatConnectRef = useRef(() => {})
  const chatThreadRef = useRef(null)
  const chatMessageRefs = useRef({})
  const chatInitReadyRef = useRef(false)
  const activeTabRef = useRef('home')
  const mineDigCollectedRef = useRef(false)
  const mineAutoCollectingRef = useRef('')
  const pageScrollRef = useRef(null)
  const factoryPurchaseOverlayRef = useRef(null)
  const avatarCropImageRef = useRef(null)
  const avatarCropSourceRef = useRef('')
  const avatarFileInputRef = useRef(null)
  const messageFilterRef = useRef('all')
  const messageSocketRef = useRef(null)
  const messageReconnectTimer = useRef(0)
  const messageReconnectEnabled = useRef(true)
  const messageConnectRef = useRef(() => {})
  const messageReplyTargetRef = useRef(null)
  const messageViewTabRef = useRef('bildirimler')
  const liveMessageRefreshTimerRef = useRef(0)
  const liveMessageRefreshInFlightRef = useRef(false)
  const notificationsMarkedRef = useRef(false)
  const notificationsMarkingInFlightRef = useRef(false)
  const logoutTriggeredRef = useRef(false)
  const missionSlotRefreshInFlightRef = useRef(false)
  const dailyLoginResetSyncKeyRef = useRef('')
  const overviewLoadInFlightRef = useRef(false)
  const bankLoadInFlightRef = useRef(false)
  const bankLastLoadedAtRef = useRef(0)
  const bankStateRef = useRef(null)
  const openTabRef = useRef(async () => {})
  const tutorialAutoTriedRef = useRef(false)
  const tutorialSpotlightTimerRef = useRef(0)

  useEffect(() => () => {
    clearTimeout(fxTimer.current)
    clearTimeout(forexBoundaryRetryTimerRef.current)
    clearTimeout(tutorialSpotlightTimerRef.current)
    clearTimeout(liveMessageRefreshTimerRef.current)
    if (typeof window !== 'undefined' && forexHoverRafRef.current) {
      window.cancelAnimationFrame(forexHoverRafRef.current)
      forexHoverRafRef.current = 0
    }
    forexHoverPendingRef.current = null
    clearTimeout(chatReconnectTimer.current)
    clearTimeout(messageReconnectTimer.current)
    chatReconnectEnabled.current = false
    messageReconnectEnabled.current = false
    if (chatSocketRef.current) {
      chatSocketRef.current.close(1000, 'component_unmount')
      chatSocketRef.current = null
    }
    if (messageSocketRef.current) {
      messageSocketRef.current.close(1000, 'component_unmount')
      messageSocketRef.current = null
    }
  }, [])

  useEffect(() => {
    activeTabRef.current = tab
  }, [tab])

  useEffect(() => {
    bankStateRef.current = bankState
  }, [bankState])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(NAV_THEME_STORAGE_KEY, sanitizeNavTheme(navTheme))
    } catch {
      // ignore storage errors
    }
  }, [navTheme])

  useEffect(() => {
    if (marketplaceBuyModal && tab === 'marketplace') {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev || '' }
    }
  }, [marketplaceBuyModal, tab])

  useEffect(() => {
    if (tab === 'marketplace') return
    if (!marketplaceBuyModal) return
    setMarketplaceBuyModal(null)
    setMarketplaceBuyModalQty('1')
  }, [marketplaceBuyModal, tab])

  useEffect(() => {
    if (tab === 'factories') return
    if (!factoryPurchaseModalId) return
    setFactoryPurchaseModalId('')
  }, [factoryPurchaseModalId, tab])

  useEffect(() => {
    if (tab !== 'bank' || typeof document === 'undefined') return
    // Hard reset any stale page lock that could block scroll/typing in bank screen.
    if (document.body?.style?.overflow === 'hidden') {
      document.body.style.overflow = ''
    }
  }, [tab])

  const {
    clearTutorialPendingFlag,
    closeTutorial,
    focusTutorialTarget,
    getTutorialStepMetaByIndex,
    goTutorialNext,
    goTutorialPrev,
    markTutorialCompleted,
    openTutorialTargetForStep,
    startTutorial,
  } = useTutorial({
    openTabRef,
    setNotice,
    setNoticeIsSuccess,
    setTab,
    setTutorialActive,
    setTutorialCompleted,
    setTutorialEnabled,
    setTutorialNavPending,
    setTutorialPending,
    setTutorialStepIndex,
    setTutorialTaskState,
    tab,
    tutorialActive,
    tutorialAutoTriedRef,
    tutorialCompleted,
    tutorialEnabled,
    tutorialNavPending,
    tutorialPending,
    tutorialSpotlightTimerRef,
    tutorialStepIndex,
    tutorialTaskState,
  })

  const reloadProfileModal = useCallback(async (options = {}) => {
    if (!profileModalUserId) {
      setProfileModalData(null)
      setProfileModalLoading(false)
      return false
    }
    const showLoading = options?.showLoading !== false
    if (showLoading) {
      setProfileModalLoading(true)
    }
    const isSelf = user?.id && String(profileModalUserId) === String(user.id)
    const response = isSelf ? await getProfileState() : await getPublicProfileState(profileModalUserId)
    if (response?.success && response?.profile) {
      setProfileModalData(response.profile)
      if (showLoading) setProfileModalLoading(false)
      return true
    }
    setProfileModalData((prev) => {
      const prevUserId = String(prev?.userId || '').trim()
      const currentUserId = String(profileModalUserId || '').trim()
      if (prev && prevUserId && currentUserId && prevUserId === currentUserId) {
        return prev
      }
      return null
    })
    if (showLoading) setProfileModalLoading(false)
    return false
  }, [profileModalUserId, user?.id])

  useEffect(() => {
    if (!profileModalUserId) {
      setProfileModalData(null)
      setProfileModalLoading(false)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      const ok = await reloadProfileModal({ showLoading: true })
      if (!ok && !cancelled) {
        setProfileModalLoading(false)
      }
    })()

    const timer = window.setInterval(() => {
      if (cancelled || tab !== 'profile') return
      void reloadProfileModal({ showLoading: false })
    }, 25000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [profileModalUserId, reloadProfileModal, tab])

  const profileOverviewDisplayName = overview?.profile?.displayName
  const profileOverviewUsername = overview?.profile?.username

  useEffect(() => {
    if (profileTab !== 'profile') return undefined

    const timerId = window.setTimeout(() => {
      setProfileAccountForm((prev) => ({
        ...prev,
        username: String(profileOverviewUsername ?? prev.username ?? '').trim(),
      }))
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [profileOverviewUsername, profileTab])

  const handleForcedLogout = useCallback((message) => {
    if (logoutTriggeredRef.current) return
    logoutTriggeredRef.current = true
    const safeMessage = String(message || '').trim() || SESSION_REPLACED_NOTICE
    onLogout(safeMessage)
  }, [onLogout])

  const fail = useCallback((response, fallback) => {
    if (shouldForceLogoutFromResult(response)) {
      handleForcedLogout(errText(response?.errors, SESSION_REPLACED_NOTICE))
      return false
    }
    setError(errText(response?.errors, fallback))
    return false
  }, [handleForcedLogout])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      if (logoutTriggeredRef.current) return
      void (async () => {
        const activeUser = await getStoredUser()
        if (!activeUser) {
          handleForcedLogout(SESSION_REPLACED_NOTICE)
        }
      })()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [handleForcedLogout])

  useEffect(() => {
    const onForcedLogout = (event) => {
      const safeMessage = String(event?.detail?.message || '').trim() || SESSION_REPLACED_NOTICE
      handleForcedLogout(safeMessage)
    }
    window.addEventListener(AUTH_FORCE_LOGOUT_EVENT, onForcedLogout)
    return () => window.removeEventListener(AUTH_FORCE_LOGOUT_EVENT, onForcedLogout)
  }, [handleForcedLogout])

  const applyChatRestrictions = useCallback((rawState) => {
    if (!rawState || typeof rawState !== 'object') return
    startTransition(() => {
      setChatRestrictions(normalizeChatRestrictions(rawState))
      setChatClockMs(Date.now())
    })
  }, [])

  useEffect(() => {
    if (!error && !notice) return undefined
    const timeoutMs = error ? 8500 : 5200
    const timer = window.setTimeout(() => {
      if (error) setError('')
      if (notice) {
        setNotice('')
        setNoticeIsSuccess(false)
      }
    }, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [error, notice])

  useEffect(() => {
    if (tab !== 'mines' || !Array.isArray(mines?.mines) || mines.mines.length === 0) return undefined
    const interval = window.setInterval(() => setMinesClockTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [tab, mines?.mines?.length])

  const {
    loadBank,
    loadBusiness,
    loadFactories,
    loadForex,
    loadMarket,
    loadMines,
    loadMissions,
    loadOverview,
    loadProfile,
  } = useDataLoaders({
    auctionForm,
    bankLastLoadedAtRef,
    bankLoadInFlightRef,
    bankStateRef,
    bookItemId,
    chartItemId,
    fail,
    fxTimer,
    overviewLevelRef,
    overviewLoadInFlightRef,
    priceAlertForm,
    setAuctionForm,
    setBankForm,
    setBankState,
    setBookItemId,
    setBusiness,
    setChartItemId,
    setChatUsers,
    setFactories,
    setForex,
    setHistory,
    setLevelFx,
    setMarket,
    setMessageCenter,
    setMines,
    setMissions,
    setOverview,
    setPriceAlertForm,
    setProfile,
    user,
  })

  useEffect(() => {
    if (!mineDigModal) return undefined
    if (mineCollectResult) return undefined
    if (mineDigCountdownSec > 0) {
      const interval = window.setInterval(() => {
        setMineDigCountdownSec((s) => Math.max(0, s - 1))
      }, 1000)
      return () => window.clearInterval(interval)
    }

    if (mineDigCollectedRef.current) return undefined
    mineDigCollectedRef.current = true
    const mineId = String(mineDigModal?.mine?.id || '').trim()
    if (!mineId) {
      mineDigCollectedRef.current = false
      setMineDigModal(null)
      setMineDigCountdownSec(DEFAULT_MINE_DIG_DURATION_SEC)
      return undefined
    }

    let cancelled = false
    let retryTimer = 0
    const maxCollectAttempts = 8
    const runCollectAttempt = async (attemptNo = 1) => {
      try {
        const response = await collectMine(mineId)
        if (cancelled) return
        if (response?.success && response?.collected) {
          setMineCollectResult(response.collected)
          setMines((prev) => (response.mines ? { ...prev, mines: response.mines, updatedAt: response.updatedAt } : prev))
          const label = factoryItemMeta(response.collected.itemId)?.label || response.collected.itemId
          setNoticeIsSuccess(true)
          setNotice(`Elde ettiğin kaynak: ${response.collected.quantity} ${label} depoya aktarıldı.`)
          loadProfile().catch(() => {})
          loadOverview().catch(() => {})
          setMineDigCountdownSec(DEFAULT_MINE_DIG_DURATION_SEC)
          return
        }

        const isNotReady = String(response?.reason || '').trim() === 'not_ready'
        if (isNotReady && attemptNo < maxCollectAttempts) {
          retryTimer = window.setTimeout(() => {
            void runCollectAttempt(attemptNo + 1)
          }, 450)
          return
        }

        fail(response, response?.errors?.global || 'Tahsilat alınamadı.')
        setMineDigModal(null)
        setMineCollectResult(null)
        mineDigCollectedRef.current = false
        setMineDigCountdownSec(DEFAULT_MINE_DIG_DURATION_SEC)
      } catch {
        if (!cancelled) {
          setMineDigModal(null)
          setMineCollectResult(null)
          mineDigCollectedRef.current = false
          setMineDigCountdownSec(DEFAULT_MINE_DIG_DURATION_SEC)
        }
      }
    }

    void runCollectAttempt(1)
    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
    }
  }, [DEFAULT_MINE_DIG_DURATION_SEC, fail, loadOverview, loadProfile, mineDigCountdownSec, mineDigModal, mineCollectResult])

  useEffect(() => {
    const mineEntries = Array.isArray(mines?.mines) ? mines.mines : []
    if (!mineEntries.length) return undefined
    if (mineDigModal || mineCollectResult) return undefined
    if (String(busy || '').startsWith('mine-')) return undefined

    const readyMine = mineEntries.find((entry) => entry?.canCollect && !entry?.isDigging)
    if (!readyMine) return undefined
    const mineId = String(readyMine?.id || '').trim()
    if (!mineId) return undefined
    if (mineAutoCollectingRef.current === mineId) return undefined
    mineAutoCollectingRef.current = mineId

    let cancelled = false
    collectMine(mineId)
      .then((response) => {
        if (cancelled || !response?.success) return
        setMines((prev) => (response.mines ? { ...prev, mines: response.mines, updatedAt: response.updatedAt } : prev))
        if (response?.collected) {
          const label = factoryItemMeta(response.collected.itemId)?.label || response.collected.itemId
          setNoticeIsSuccess(true)
          setNotice(`Elde ettiğin kaynak: ${response.collected.quantity} ${label} depoya aktarıldı.`)
        }
        if (response.inventory) loadProfile().catch(() => {})
        loadOverview().catch(() => {})
      })
      .finally(() => {
        if (!cancelled) {
          mineAutoCollectingRef.current = ''
        }
      })

    return () => {
      cancelled = true
    }
  }, [busy, loadOverview, loadProfile, mineCollectResult, mineDigModal, mines])

  const triggerLiveStateRefresh = useCallback(() => {
    const runRefresh = async () => {
      if (liveMessageRefreshInFlightRef.current) return
      liveMessageRefreshInFlightRef.current = true
      try {
        const tasks = [
          loadOverview(),
          loadProfile(),
          loadBank({ force: true }),
        ]
        if (tab === 'missions') {
          tasks.push(loadMissions())
        }
        await Promise.allSettled(tasks)
      } finally {
        liveMessageRefreshInFlightRef.current = false
      }
    }

    if (typeof window === 'undefined') {
      void runRefresh()
      return
    }

    clearTimeout(liveMessageRefreshTimerRef.current)
    liveMessageRefreshTimerRef.current = window.setTimeout(() => {
      void runRefresh()
    }, 160)
  }, [loadBank, loadMissions, loadOverview, loadProfile, tab])

  const loadDailyStoreState = useCallback(async () => {
    const response = await getDailyStore()
    if (!response?.success) return fail(response, 'Sınırlı fırsatlar alınamadı.')
    setDailyStore({
      offers: Array.isArray(response.offers) ? response.offers : [],
      nextResetAt: String(response.nextResetAt || ''),
      remainingMs: Math.max(0, Math.trunc(num(response.remainingMs || 0))),
      weekMultiplier: Math.max(1, Math.trunc(num(response.weekMultiplier || 1))),
    })
    return true
  }, [fail])

  const loadDailyLoginRewardState = useCallback(async () => {
    const response = await getDailyLoginReward()
    if (!response?.success) return fail(response, 'Günlük ödül verileri alınamadı.')
    setDailyLoginReward(normalizeDailyLoginPayload(response))
    return true
  }, [fail])

  const loadOrderBook = useCallback(async (itemId) => {
    const safeItemId = String(itemId || bookItemId || '').trim()
    const response = await getOrderBookState(safeItemId)
    if (!response?.success) return fail(response, 'Emir defteri verileri alınamadı.')
    setOrderBook(response)
    return true
  }, [bookItemId, fail])

  const loadLogistics = useCallback(async () => {
    const response = await getLogisticsState()
    if (!response?.success) return fail(response, 'Lojistik verileri alınamadı.')
    setLogistics(response)
    return true
  }, [fail])

  const _loadLeague = useCallback(async () => {
    const response = await getLeagueState()
    if (!response?.success) return fail(response, 'Lig verileri alınamadı.')
    const standings = (response?.standings && typeof response.standings === 'object')
      ? response.standings
      : {}
    setLeague({
      ...response,
      daily: Array.isArray(response?.daily) ? response.daily : (Array.isArray(standings?.daily) ? standings.daily : []),
      weekly: Array.isArray(response?.weekly) ? response.weekly : (Array.isArray(standings?.weekly) ? standings.weekly : []),
      season: Array.isArray(response?.season) ? response.season : (Array.isArray(standings?.season) ? standings.season : []),
      cash: Array.isArray(response?.cash) ? response.cash : (Array.isArray(standings?.cash) ? standings.cash : []),
      level: Array.isArray(response?.level) ? response.level : (Array.isArray(standings?.level) ? standings.level : []),
    })
    return true
  }, [fail])

  useEffect(() => {
    if (tab !== 'profile' || profileTab !== 'leaderboard') return
    void _loadLeague()
  }, [tab, profileTab, _loadLeague])

  useEffect(() => {
    if (tab === 'profile') void _loadLeague().catch(() => {})
  }, [tab, _loadLeague])

  useEffect(() => {
    void _loadLeague().catch(() => {})
  }, [_loadLeague])

  const loadPush = useCallback(async () => {
    const response = await getPushCenterState()
    if (!response?.success) return fail(response, 'Bildirim merkezi verileri alınamadı.')
    setPushCenter(response)
    return true
  }, [fail])

  const loadRecentPlayers = useCallback(async (options = {}) => {
    const shouldShowLoading = options?.silent !== true
    if (shouldShowLoading) {
      setChatRecentPlayersLoading(true)
    }
    const response = await getRecentRegisteredPlayers(CHAT_NEWS_MAX_ITEMS)
    if (!response?.success) {
      if (shouldShowLoading) {
        setChatRecentPlayersLoading(false)
        return fail(response, 'Yeni oyuncu akışı yüklenemedi.')
      }
      return false
    }
    setChatRecentPlayers(pruneNewsRecords(response.players, CHAT_NEWS_MAX_ITEMS))
    if (shouldShowLoading) {
      setChatRecentPlayersLoading(false)
    }
    return true
  }, [fail])

  useEffect(() => {
    if (tab !== 'chat') return undefined
    void loadRecentPlayers()
    const intervalId = setInterval(() => {
      if (!isPageVisible()) return
      void loadRecentPlayers({ silent: true })
    }, 45 * 1000)
    return () => clearInterval(intervalId)
  }, [loadRecentPlayers, tab])

  const loadMessageCenter = useCallback(async (filter) => {
    if (MESSAGES_DISABLED) {
      setMessageCenter({
        filter: 'all',
        counts: { all: 0, message: 0, trade: 0, other: 0, alert: 0 },
        unreadCount: 0,
        unread: EMPTY_MESSAGE_UNREAD,
        spotlight: null,
        items: [],
        moderation: EMPTY_USER_MODERATION,
      })
      return true
    }
    const targetFilter = String(filter || 'all').trim().toLowerCase() || 'all'
    const response = await getMessageCenterState(targetFilter, 25)
    if (!response?.success) return fail(response, 'Mesaj merkezi y\u00fcklenemedi.')
    const unreadCounters = normalizeMessageUnreadCounters(response.unread)
    const unreadTotalRaw = Number(
      response.unreadCount != null
        ? response.unreadCount
        : unreadCounters.total,
    )
    const unreadTotal = Number.isFinite(unreadTotalRaw) && unreadTotalRaw > 0
      ? Math.max(0, Math.trunc(unreadTotalRaw))
      : 0
    setMessageCenter({
      filter: response.filter || targetFilter,
      counts: response.counts || { all: 0, message: 0, trade: 0, other: 0, alert: 0 },
      unreadCount: unreadTotal,
      unread: unreadCounters,
      spotlight: response.spotlight || null,
      items: Array.isArray(response.items) ? response.items : [],
      moderation: normalizeUserModeration(response.moderation),
    })
    return true
  }, [fail])

  useEffect(() => {
    if (MESSAGES_DISABLED || tab !== 'chat') return
    void loadMessageCenter('all')
  }, [MESSAGES_DISABLED, loadMessageCenter, tab])

  // BİLDİRİMLER sekmesine girildiğinde tüm bildirimleri toplu okundu yap (DM sayaçları etkilenmez)
  useEffect(() => {
    if (MESSAGES_DISABLED) return
    if (tab !== 'messages' || messageViewTab !== 'bildirimler') {
      notificationsMarkedRef.current = false
      notificationsMarkingInFlightRef.current = false
      return
    }
    if (notificationsMarkedRef.current || notificationsMarkingInFlightRef.current) return

    const unreadNotifications = Math.max(0, Math.trunc(Number(messageCenter?.unread?.notifications || 0)))
    if (unreadNotifications <= 0) {
      notificationsMarkedRef.current = true
      return
    }

    notificationsMarkedRef.current = true
    notificationsMarkingInFlightRef.current = true
    ;(async () => {
      try {
        const response = await markMessageCenterNotificationsAsRead()
        if (!response?.success) {
          notificationsMarkedRef.current = false
        }
      } finally {
        notificationsMarkingInFlightRef.current = false
        await loadMessageCenter('all')
      }
    })()
  }, [MESSAGES_DISABLED, loadMessageCenter, messageCenter?.unread?.notifications, messageViewTab, tab])

  const loadDirectMessageThread = useCallback(async (username) => {
    if (MESSAGES_DISABLED) {
      setMessageThread([])
      return true
    }
    const safeUsername = String(username || '').trim()
    if (!safeUsername) {
      setMessageThread([])
      return true
    }
    const response = await getDirectMessageThread(safeUsername, 25)
    if (!response?.success) {
      fail(response, response?.errors?.global || 'Mesaj geçmişi yüklenemedi.')
      setMessageThread([])
      return false
    }
    setMessageThread(Array.isArray(response.items) ? response.items : [])
    const latestCounterpart = Array.isArray(response.items)
      ? [...response.items].reverse().find((entry) => entry?.counterpart) || null
      : null
    setMessageReplyTarget((prev) => {
      if (!prev) return prev
      if (String(prev.username || '').trim().toLowerCase() !== safeUsername.toLowerCase()) return prev
      const next = {
        ...prev,
        userId: response.userId || prev.userId || null,
        avatarUrl: String(latestCounterpart?.counterpart?.avatarUrl || prev.avatarUrl || '').trim(),
        level: latestCounterpart?.counterpart?.level ?? prev.level ?? null,
        role: latestCounterpart?.counterpart?.role || prev.role || 'player',
        roleLabel: latestCounterpart?.counterpart?.roleLabel || prev.roleLabel || '',
        premium: latestCounterpart?.counterpart?.premium ?? prev.premium ?? false,
        seasonBadge: latestCounterpart?.counterpart?.seasonBadge || prev.seasonBadge || null,
        relationship: response.relationship || prev.relationship || null,
        moderation: normalizeUserModeration(response.moderation),
      }
      messageReplyTargetRef.current = next
      return next
    })
    setMessageCenter((prev) => ({
      ...prev,
      moderation: normalizeUserModeration(response.moderation),
    }))
    return true
  }, [fail])

  const loadChatRoom = useCallback(async (room) => {
    if (MESSAGES_DISABLED) {
      const safeRoom = String(room || CHAT_ROOM || 'global').trim() || 'global'
      setChat((prev) => ({ ...prev, [safeRoom]: [] }))
      startTransition(() => {
        setChatRestrictions(EMPTY_CHAT_RESTRICTIONS)
        setChatClockMs(Date.now())
      })
      return true
    }
    const response = await getChatRoomState(room, CHAT_PRUNE_KEEP_COUNT)
    if (!response?.success) return fail(response, 'Sohbet verileri alınamadı.')
    const safeRoom = response.room || String(room || 'global').trim() || 'global'
    setChat((prev) => ({ ...prev, [safeRoom]: pruneChatMessages(response.messages || []) }))
    applyChatRestrictions(response.chatState)
    return true
  }, [applyChatRestrictions, fail])

  const {
    connectChatSocket,
    connectMessageSocket,
  } = useSockets({
    activeTabRef,
    applyChatRestrictions,
    chatConnectRef,
    chatInitReadyRef,
    chatReconnectEnabled,
    chatReconnectTimer,
    chatSocketRef,
    handleForcedLogout,
    loadDirectMessageThread,
    loadMessageCenter,
    messageConnectRef,
    messageFilter,
    messageFilterRef,
    messageReconnectEnabled,
    messageReconnectTimer,
    messageReplyTargetRef,
    messageSocketRef,
    messageViewTab,
    messageViewTabRef,
    setChat,
    setChatFirstUnreadId,
    setChatSocketState,
    setChatUsers,
    setError,
    setMessageSocketState,
    triggerLiveStateRefresh,
  })

  useEffect(() => {
    messageConnectRef.current = connectMessageSocket
  }, [connectMessageSocket])

  // Initial load: only fetch what the home tab actually needs.
  // Each module-tab loads its own data when the user switches to it,
  // so there is no need to pre-fetch market / missions / etc. here.
  const refreshAll = useCallback(async (options = {}) => {
    const force = Boolean(options?.force)
    await Promise.all([
      loadOverview({ force }),
      loadProfile({ force }),
      loadDailyLoginRewardState(),
      loadMessageCenter('all'),
    ])
  }, [loadDailyLoginRewardState, loadMessageCenter, loadOverview, loadProfile])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setError('')
      try {
        await refreshAll({ force: true })
      } catch (err) {
        console.error('[HomePage] refreshAll failed:', err)
        setError(err?.message || 'Veriler yüklenirken hata oluştu.')
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [refreshAll])

  useEffect(() => {
    if (tab !== 'home' && tab !== 'penalized') return undefined
    getPenalizedUsers().then((res) => {
      if (res?.success && Array.isArray(res.users)) setPenalizedUsers(res.users)
    }).catch(() => {})
  }, [tab])

  useEffect(() => {
    if (tab !== 'market') return undefined
    const intervalId = setInterval(() => {
      if (!isPageVisible()) return
      void loadMarket()
      if (marketTab === 'orderbook') {
        void loadOrderBook(bookItemId)
      }
    }, 8000)
    return () => clearInterval(intervalId)
  }, [bookItemId, loadMarket, loadOrderBook, marketTab, tab])

  useEffect(() => {
    if (tab !== 'marketplace') return undefined
    void loadMarket()
    const intervalId = setInterval(() => {
      if (!isPageVisible()) return
      void loadMarket()
    }, 18000)
    return () => clearInterval(intervalId)
  }, [loadMarket, tab])

  useEffect(() => {
    if (tab !== 'forex') return undefined
    void loadForex()
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadForex()
    }, FOREX_CLIENT_POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [loadForex, tab])

  useEffect(() => {
    if (tab === 'forex') return
    clearTimeout(forexBoundaryRetryTimerRef.current)
  }, [tab])

  useEffect(() => {
    if (tab !== 'forex' || typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const refreshForex = () => {
      void loadForex()
    }
    const onVisibilityChange = () => {
      if (document.hidden) return
      refreshForex()
    }

    window.addEventListener('focus', refreshForex)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', refreshForex)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadForex, tab])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setForexViewportWidth(resolveMobileViewportWidth())
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    chatReconnectEnabled.current = true
    const connectTimer = window.setTimeout(() => {
      chatConnectRef.current()
    }, 0)
    return () => {
      window.clearTimeout(connectTimer)
      clearTimeout(chatReconnectTimer.current)
      chatReconnectEnabled.current = false
      if (chatSocketRef.current) {
        chatSocketRef.current.close(1000, 'reconnect_cleanup')
        chatSocketRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    messageReconnectEnabled.current = true
    const connectTimer = window.setTimeout(() => {
      messageConnectRef.current()
    }, 0)
    return () => {
      window.clearTimeout(connectTimer)
      clearTimeout(messageReconnectTimer.current)
      messageReconnectEnabled.current = false
      if (messageSocketRef.current) {
        messageSocketRef.current.close(1000, 'reconnect_cleanup')
        messageSocketRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (tab !== 'chat') return undefined
    if (chatSocketRef.current?.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(JSON.stringify({ type: 'join', room: CHAT_ROOM }))
      return undefined
    }
    const loadTimer = window.setTimeout(() => {
      void loadChatRoom(CHAT_ROOM)
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadChatRoom, tab])

  useEffect(() => {
    if (tab !== 'chat') return
    if (!chatThreadRef.current) return
    const frame = window.requestAnimationFrame(() => {
      if (!chatThreadRef.current) return
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chat, tab])

  useEffect(() => {
    if (tab !== 'chat' || !chatFirstUnreadId) return undefined
    const timer = window.setTimeout(() => {
      setChatFirstUnreadId('')
    }, 4200)
    return () => window.clearTimeout(timer)
  }, [chatFirstUnreadId, tab])

  useEffect(() => {
    const FAST_TABS = new Set(['chat', 'messages'])
    const MEDIUM_TABS = new Set(['missions', 'home', 'events', 'businesses', 'factories', 'mines'])
    const intervalMs = tab === 'bank' ? 20000 : FAST_TABS.has(tab) ? 3000 : MEDIUM_TABS.has(tab) ? 10000 : 20000
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      startTransition(() => setChatClockMs(Date.now()))
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [tab])

  useEffect(() => {
    if (tab !== 'messages') return undefined
    const loadTimer = window.setTimeout(() => {
      void loadMessageCenter(messageFilter)
    }, 0)
    return () => {
      window.clearTimeout(loadTimer)
    }
  }, [loadMessageCenter, messageFilter, tab])

  useEffect(() => {
    if (tab !== 'messages') return undefined
    const safeUsername = String(messageReplyTarget?.username || '').trim()
    if (!safeUsername) return undefined

    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      const activeUsername = String(messageReplyTargetRef.current?.username || '').trim()
      if (!activeUsername) return
      void loadDirectMessageThread(activeUsername)
    }, 12000)

    return () => window.clearInterval(intervalId)
  }, [loadDirectMessageThread, messageReplyTarget?.username, tab])

  const openTab = async (next, options = {}) => {
    if (next !== tab) {
      setBusinessModal('')
      setListingDraft(null)
      setMarketDetailDraft(null)
      setMarketPurchaseResult(null)
      setCollectTargetBusinessId('')
      setMarketplaceBuyModal(null)
      setMarketplaceBuyModalQty('1')
      setFactoryPurchaseModalId('')
      setProfileModalUserId(null)
      setProfileModalBusinessExpand(null)
      setGaragePanel((prev) => ({ ...prev, open: false }))
      setWarehouseOpen(false)
      setAvatarCropOpen(false)
      setMineConfirmModal(null)
      setMineDigModal(null)
      setDailyRewardOpen(false)
      setDailyRewardResult(null)
    }
    setTab(next)
    setError('')
    if (next !== tab || options.forceTop === true) {
      if (pageScrollRef.current?.scrollTo) {
        pageScrollRef.current.scrollTo({ top: 0, behavior: 'auto' })
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }
    if (options.marketTab) setMarketTab(options.marketTab)
    if (options.profileTab) setProfileTab(options.profileTab)
    if (options.messageFilter) setMessageFilter(options.messageFilter)

    if (next === 'businesses') {
      // İşletme sekmesi her zaman ana sayfadan açılır; son alt-sekmeyi hatırlamaz.
      setBusinessScene('hub')
      setBusinessDetailTab('garage')
      setLogisticsScene('detail')
      setLogisticsDetailTab('garage')
      setSelectedBusinessId('')
      setCollectTargetBusinessId('')
      setBusinessModal('')
      setListingDraft(null)
      setMarketDetailDraft(null)
      setMarketPurchaseResult(null)
      await Promise.all([loadBusiness(), loadLogistics(), loadMarket()])
    }
    if (next === 'private-listings') {
      await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile()])
    }
    if (next === 'marketplace') {
      await loadMarket()
    }
    if (next === 'forex') {
      await loadForex()
    }
    if (next === 'bank') {
      await Promise.all([loadOverview(), loadProfile(), loadBank({ force: true })])
    }
    if (next === 'factories') {
      await Promise.all([loadFactories(), loadProfile()])
    }
    if (next === 'mines') {
      await loadMines()
    }
    if (next === 'chat') {
      await loadChatRoom(CHAT_ROOM)
    }
    if (next === 'messages') {
      const targetFilter = options.messageFilter || messageFilter
      await loadMessageCenter(targetFilter)
    }
    if (next === 'home' && !missions) {
      await loadMissions()
    }
    if (next === 'missions') {
      await loadMissions()
    }
    if (next === 'events') {
      await Promise.all([loadOverview(), loadBusiness(), loadFactories()])
    }
    if (next === 'announcements') {
      await loadOverview()
    }
    if (next === 'profile') {
      await loadProfile()
      if (options.profileTab === 'leaderboard') _loadLeague().catch(() => {})
    }
  }

  useEffect(() => {
    openTabRef.current = openTab
  }, [openTab])

  useEffect(() => {
    if (pageScrollRef.current?.scrollTo) {
      const frameId = window.requestAnimationFrame(() => {
        pageScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      })
      return () => window.cancelAnimationFrame(frameId)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
    return undefined
  }, [tab])

  useEffect(() => {
    if (tutorialActive || tutorialCompleted || !tutorialEnabled) return
    const { step } = getTutorialStepMetaByIndex(tutorialStepIndex)
    const target = step?.target
    if (!target?.tab || target.tab !== tab) return
    focusTutorialTarget(target)
  }, [
    focusTutorialTarget,
    getTutorialStepMetaByIndex,
    tab,
    tutorialActive,
    tutorialCompleted,
    tutorialEnabled,
    tutorialStepIndex,
  ])

  // Missions: countdown and batch refresh should feel live while this tab is open.
  useEffect(() => {
    if (tab !== 'missions') return undefined
    const refreshMs = 30000
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadMissions()
    }, refreshMs)
    return () => window.clearInterval(intervalId)
  }, [tab, loadMissions])

  useEffect(() => {
    if (tab !== 'bank') return undefined
    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void loadBank()
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [loadBank, tab])

  useEffect(() => {
    if (tab !== 'bank' || typeof document === 'undefined') return undefined
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void loadBank({ force: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [loadBank, tab])

  // Mines: poll while on this tab so timers stay live.
  useEffect(() => {
    if (tab !== 'mines') return undefined
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadMines()
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [loadMines, tab])

  // Factories: poll while on this tab.
  useEffect(() => {
    if (tab !== 'factories') return undefined
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadFactories()
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [loadFactories, tab])

  // Businesses: poll while on this tab.
  useEffect(() => {
    if (tab !== 'businesses') return undefined
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadBusiness()
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [loadBusiness, tab])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      if (tab === 'home' || tab === 'profile' || tab === 'announcements') {
        void triggerLiveStateRefresh()
      }
      if (tab === 'profile' && profileTab === 'leaderboard') {
        void _loadLeague()
      }
    }, 45000)
    return () => window.clearInterval(intervalId)
  }, [_loadLeague, profileTab, tab, triggerLiveStateRefresh])

  const openDiamondMarketHub = async () => {
    await openTab('profile', { profileTab: 'diamond-market' })
  }

  const openPremiumHub = async () => {
    await openTab('profile', { profileTab: 'premium' })
  }

  const openDiamondCashCheckout = async (pack) => {
    const safePackId = String(pack?.id || pack || '').trim()
    if (!safePackId) return

    if (IS_NATIVE_ANDROID_RUNTIME) {
      setNotice('Android sürümünde satın alma işlemleri Google Play Faturalandırma ile sunulacaktır.')
      return
    }

    const baseUrl = String(import.meta.env.VITE_DIAMOND_CHECKOUT_URL || '').trim()
    if (!baseUrl) {
      setNotice('Elmas Marketi hazır. Ödeme entegrasyonu tamamlandığında satın alma aktif olacaktır.')
      return
    }

    const isWelcomePack = Boolean(pack?.welcomeOnly) || safePackId === DIAMOND_WELCOME_PACK_ID
    if (isWelcomePack) {
      if (welcomePackPurchased) {
        setNotice('Hoş geldin paketi bu hesapta daha önce kullanıldı.')
        return
      }
      if (busy) return
      setBusy(`diamond-welcome:${safePackId}`)
      try {
        const response = await consumeDiamondWelcomePack(safePackId)
        if (!response?.success) {
          if (response?.reason === 'already_claimed') {
            setNotice('Hoş geldin paketi bu hesapta daha önce kullanıldı.')
            await loadOverview()
            return
          }
          fail(response, 'Hoş geldin paketi işlemi tamamlanamadı.')
          return
        }
        await loadOverview()
      } finally {
        setBusy('')
      }
    }

    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}pack=${encodeURIComponent(safePackId)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const doTrade = async (itemId, side) => {
    if (busy) return
    const quantity = Math.max(0, Math.trunc(num(qty[itemId] || 0)))
    if (quantity <= 0) return setError('Miktar en az 1 olmalı.')
    setBusy(`${side}:${itemId}`)
    setError('')
    const response = side === 'buy' ? await buyItem(itemId, quantity) : await sellItem(itemId, quantity)
    setBusy('')
    if (!response?.success) return fail(response, side === 'buy' ? 'Satın alma başarısız.' : 'Satış başarısız.')
    setNotice(response.message || 'Pazar işlemi tamamlandı.')
    await Promise.all([loadOverview(), loadMarket(), loadMissions(), loadProfile()])
    if (bookItemId) await loadOrderBook(bookItemId)
  }

  const upBiz = async (id) => {
    if (busy) return
    if (nextCompanyUnlock && Math.max(0, Math.trunc(num(nextCompanyUnlock?.missingCompanyLevel || 0))) <= 0) {
      setError(`Önce İş Kur bölümünden ${nextCompanyUnlock.name || 'sıradaki işletmeyi'} satın al.`)
      return
    }
    if (!companyUpgrade) {
      setError('İşletme seviyesi bilgisi alınamadı.')
      return
    }
    if (companyUpgrade.maxReached) {
      setError('İşletme seviyesi zaten maksimumda.')
      return
    }
    if (companyUpgrade.missingCash > 0) {
      setError(`İşletme seviyesi yükseltmek için ${fmt(companyUpgrade.cost || 0)} nakit gerekli. Kalan: ${fmt(companyUpgrade.missingCash)}.`)
      return
    }
    setBusy(`upbiz:${id}`)
    const response = await upgradeBusinessLevel(id)
    setBusy('')
    if (!response?.success) return fail(response, 'İşletme geliştirme işlemi tamamlanamadı.')
    setNotice(response.message || 'İşletme seviyesi yükseltildi.')
    await Promise.all([loadOverview(), loadBusiness(), loadProfile()])
  }

  const buyCompanyBusiness = async (unlockKey) => {
    if (busy) return
    const safeUnlockKey = String(unlockKey || '').trim()
    if (!safeUnlockKey) return
    setBusy(`buybiz:${safeUnlockKey}`)
    const response = await buyBusiness(safeUnlockKey)
    setBusy('')
    if (!response?.success) return fail(response, 'İşletme satın alma işlemi tamamlanamadı.')
    setNotice(response.message || 'İşletme satın alındı.')
    await Promise.all([loadOverview(), loadBusiness(), loadProfile()])
  }

  const buyFactoryAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-buy:${safeFactoryId}`)
    const response = await buyFactory(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Fabrika satın alma işlemi tamamlanamadı.')
    setNotice(response.message || 'Fabrika satın alındı.')
    setFactoryPurchaseModalId('')
    await Promise.all([loadOverview(), loadFactories(), loadProfile(), loadMarket()])
  }

  const collectFactoryAction = async (factoryId, options = {}) => {
    if (busy) return { success: false, reason: 'busy' }
    const silent = options?.silent === true
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return { success: false, reason: 'validation' }
    setBusy(`factory-collect:${safeFactoryId}`)
    const response = await collectFactory(safeFactoryId)
    setBusy('')
    if (!response?.success) {
      if (!silent) {
        fail(response, 'Fabrika tahsilatı yapılamadı.')
      }
      return { success: false, response }
    }
    setNotice(response.message || 'Fabrika tahsilatı tamamlandı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview(), loadMarket()])
    return { success: true, response }
  }

  const collectFactoriesBulkAction = async (options = {}) => {
    if (busy) return { success: false, reason: 'busy' }
    const silent = options?.silent === true
    setBusy('factory-collect-bulk')
    const response = await collectFactoriesBulk()
    setBusy('')
    if (!response?.success) {
      if (!silent) {
        fail(response, 'Fabrikalar için toplu tahsilat yapılamadı.')
      }
      return { success: false, response }
    }
    const collectedCount = Math.max(0, Math.trunc(num(response?.collected?.count || 0)))
    setNotice(response.message || `Fabrika toplu tahsilat tamamlandı (${fmt(collectedCount)}).`)
    await Promise.all([loadFactories(), loadProfile(), loadOverview(), loadMarket()])
    return { success: true, response }
  }

  const confirmFactoryBulkCollectFromModal = async () => {
    if (busy) return
    setFactoryBulkModalError('')
    const result = await collectFactoriesBulkAction({ silent: true })
    if (!result?.success) {
      const message = errText(result?.response?.errors, 'Fabrikalar için toplu tahsilat yapılamadı.')
      setFactoryBulkModalError(message)
      setError(message)
      return
    }
    setFactoryBulkModalOpen(false)
    setFactoryBulkModalError('')
  }

  const confirmFactoryCollectFromModal = async () => {
    const id = String(factoryCollectModalId || '').trim()
    if (!id || busy) return
    setFactoryCollectModalError('')
    const result = await collectFactoryAction(id, { silent: true })
    if (!result?.success) {
      const message = errText(result?.response?.errors, 'Fabrika tahsilatı yapılamadı.')
      setFactoryCollectModalError(message)
      setError(message)
      return
    }
    setFactoryCollectModalId('')
    setFactoryCollectModalError('')
  }

  const confirmFactoryUpgradeFromModal = async () => {
    const id = String(factoryUpgradeModalId || '').trim()
    if (!id || busy) return
    const factory = factoryRows.find((f) => String(f?.id || '') === id)
    if (!factory) return
    const blockedByOtherUpgrade = !factory.isUpgrading && !canStartAnotherFactoryUpgrade
    if (blockedByOtherUpgrade) {
      setError(
        maxFactorySlots <= 1
          ? 'Yükseltme yuvası dolu. Aktif inşaat/yükseltme tamamlanınca tekrar deneyin.'
          : `Yükseltme yuvaları dolu (${fmt(maxFactorySlots)} / ${fmt(maxFactorySlots)}).`,
      )
      return
    }
    if (factory?.nextUpgrade?.maxReached) return
    if (!factory?.nextUpgrade?.canUpgradeNow) {
      const missingRows = []
      const missingCash = Math.max(0, Math.trunc(num(factory?.missingUpgradeCash || 0)))
      if (missingCash > 0) {
        missingRows.push(`Nakit: ${fmt(missingCash)}`)
      }
      for (const row of Array.isArray(factory?.upgradeCostRows) ? factory.upgradeCostRows : []) {
        const missing = Math.max(0, Math.trunc(num(row?.missing || 0)))
        if (missing <= 0) continue
        const itemLabel = String(row?.meta?.label || row?.itemId || 'Kaynak').trim()
        missingRows.push(`${itemLabel}: ${fmt(missing)}`)
      }
      setError(
        missingRows.length > 0
          ? `Yükseltme için kaynaklar yetersiz. Eksikler: ${missingRows.join(', ')}`
          : 'Yükseltme şartları henüz sağlanmadı.',
      )
      return
    }
    setFactoryUpgradeModalId('')
    await upgradeFactoryAction(id)
  }

  const upgradeFactoryAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-upgrade:${safeFactoryId}`)
    const response = await upgradeFactory(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Fabrika yükseltmesi başlatılamadı.')
    setNotice(response.message || 'Fabrika yükseltmesi başlatıldı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview(), loadMarket()])
  }

  const speedupFactoryBuildAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-speedup-build:${safeFactoryId}`)
    const response = await speedupFactoryBuild(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'İnşaat hızlandırılamadı.')
    setNotice(response.message || 'Fabrika inşaatı hızlandırıldı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview()])
  }

  const speedupFactoryUpgradeAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-speedup:${safeFactoryId}`)
    const response = await speedupFactoryUpgrade(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Yükseltme hızlandırılamadı.')
    setNotice(response.message || 'Yükseltme hızlandırıldı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview()])
  }

  const openFactoryPurchaseModal = (factoryId) => {
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setFactoryPurchaseModalId(safeFactoryId)
  }

  const openFactoryBulkCollectModal = () => {
    setFactoryBulkModalError('')
    setFactoryBulkModalOpen(true)
  }

  const closeFactoryBulkCollectModal = () => {
    setFactoryBulkModalOpen(false)
    setFactoryBulkModalError('')
  }

  const openFactoryCollectModal = (factoryId) => {
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setFactoryCollectModalError('')
    setFactoryCollectModalId(safeFactoryId)
  }

  const closeFactoryCollectModal = () => {
    setFactoryCollectModalId('')
    setFactoryCollectModalError('')
  }

  const closeFactoryPurchaseModal = () => {
    setFactoryPurchaseModalId('')
  }

  useEffect(() => {
    if (!factoryPurchaseModalId) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (String(busy || '').startsWith('factory-buy:')) return
      setFactoryPurchaseModalId('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, factoryPurchaseModalId])

  useEffect(() => {
    if (!factoryPurchaseModalId) return
    const raf = requestAnimationFrame(() => {
      factoryPurchaseOverlayRef.current?.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [factoryPurchaseModalId])

  const produceBizVehicle = async (id, modelId) => {
    if (busy) return
    setBusy(`prodbiz:${id}:${modelId || 'next'}`)
    const response = await produceBusinessVehicle(id, modelId ? { modelId } : {})
    setBusy('')
    if (!response?.success) return fail(response, 'Araç üretimi başarısız.')
    const producedName = String(response?.cost?.vehicleName || '').trim() || 'Araç'
    setNotice(`${producedName} başarıyla filoya eklendi.`)
    await Promise.all([loadOverview(), loadBusiness(), loadProfile(), loadMarket()])
  }

  const listBizVehicle = async (businessId, vehicleId, price = 0, visibility = 'public', recipientUserId = '') => {
    if (busy) return
    setBusy(`listbiz:${businessId}:${vehicleId}`)
    const safePrice = Math.max(0, Math.trunc(num(price)))
    const safeVisibility = visibility === 'custom' ? 'custom' : 'public'
    const safeRecipientUserId = safeVisibility === 'custom' ? String(recipientUserId || '').trim() : ''
    const payload = safePrice > 0
      ? { vehicleId, price: safePrice, visibility: safeVisibility, recipientUserId: safeRecipientUserId }
      : { vehicleId, visibility: safeVisibility, recipientUserId: safeRecipientUserId }
    const response = await listBusinessVehicle(businessId, payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Araç ilana eklenemedi.')
    setNotice(response.message || 'Araç ikinci el pazarına eklendi.')
    await Promise.all([loadBusiness(), loadOverview(), loadProfile()])
  }

  const listLogisticsTruckAction = async (truckId, price = 0, visibility = 'public', recipientUserId = '') => {
    if (busy) return
    const safeTruckId = String(truckId || '').trim()
    if (!safeTruckId) return
    setBusy(`listlog:${safeTruckId}`)
    const safePrice = Math.max(0, Math.trunc(num(price)))
    const safeVisibility = visibility === 'custom' ? 'custom' : 'public'
    const safeRecipientUserId = safeVisibility === 'custom' ? String(recipientUserId || '').trim() : ''
    const payload = safePrice > 0
      ? { price: safePrice, visibility: safeVisibility, recipientUserId: safeRecipientUserId }
      : { visibility: safeVisibility, recipientUserId: safeRecipientUserId }
    const response = await listLogisticsTruckForSale(safeTruckId, payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Tır ilana eklenemedi.')
    setNotice(response.message || 'Tır ikinci el pazarına eklendi.')
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile()])
  }

  const openVehicleListingModal = (businessId, vehicle) => {
    if (!vehicle || !businessId) return
    const templateId = String(selectedBusiness?.templateId || '').trim()
    const bounds = fleetListingBounds(vehicle, templateId)
    const scrapPreview = scrapPreviewForEntry(vehicle)
    const lifetime = resolveVehicleLifetime(vehicle, liveNowMs)
    const safeModelId = String(vehicle?.modelId || '').trim()
    const safeName = String(vehicle?.name || '').trim().toLocaleLowerCase('tr-TR')
    const marketPrices = (selectedBusinessListings || [])
      .filter((entry) => {
        const entryModelId = String(entry?.modelId || '').trim()
        const entryName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
        if (safeModelId && entryModelId) return entryModelId === safeModelId
        return safeName && entryName === safeName
      })
      .map((entry) => Math.max(1, Math.trunc(num(entry?.price || 0))))
      .filter((price) => price > 0)
      .sort((a, b) => a - b)
    const marketCount = marketPrices.length
    const marketMinPrice = marketCount ? marketPrices[0] : 0
    const marketMaxPrice = marketCount ? marketPrices[marketCount - 1] : 0
    const marketAvgPrice = marketCount
      ? Math.round(marketPrices.reduce((sum, price) => sum + price, 0) / marketCount)
      : 0
    setListingDraft({
      kind: 'fleet',
      isListed: false,
      listingId: '',
      businessId: String(businessId || '').trim(),
      vehicleId: String(vehicle.id || '').trim(),
      name: String(vehicle.name || 'Araç').trim() || 'Araç',
      image: resolveVehicleImage(vehicle, templateId),
      emoji: String(vehicle.emoji || '').trim(),
      templateId,
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      suggestedPrice: bounds.suggestedPrice,
      price: String(bounds.suggestedPrice),
      income: Math.max(1, Math.trunc(num(vehicle.rentPerHour || 0))),
      xp: Math.max(1, Math.trunc(num(vehicle.xp || 0))),
      level: Math.max(1, Math.trunc(num(vehicle.requiredLevel || 1))),
      requiredLevel: Math.max(1, Math.trunc(num(vehicle.requiredLevel || 1))),
      engineKits: Math.max(0, Math.trunc(num(vehicle?.cost?.engineKits || vehicle?.engineKits || 0))),
      spareParts: Math.max(0, Math.trunc(num(vehicle?.cost?.spareParts || vehicle?.spareParts || 0))),
      scrapEngineKits: scrapPreview.engineKits,
      scrapSpareParts: scrapPreview.spareParts,
      marketCount,
      marketMinPrice,
      marketAvgPrice,
      marketMaxPrice,
      lifetimeRemainingMs: lifetime.remainingMs,
      lifetimeLabel: formatLifetimeWithTotal(lifetime),
      expiresAt: lifetime.expiresAt,
      visibility: 'public',
      recipientUserId: '',
    })
    setBusinessModal('vehicle-actions')
  }

  const openTruckListingModal = (truck) => {
    if (!truck) return
    const safeTruckId = String(truck.id || '').trim()
    if (!safeTruckId) return
    const bounds = logisticsListingBounds(truck)
    const scrapPreview = scrapPreviewForEntry(truck)
    const lifetime = resolveVehicleLifetime(truck, liveNowMs)
    const safeModelId = String(truck?.modelId || '').trim()
    const safeName = String(truck?.name || '').trim().toLocaleLowerCase('tr-TR')
    const marketPrices = (logisticsMarketListings || [])
      .filter((entry) => {
        const entryModelId = String(entry?.modelId || '').trim()
        const entryName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
        if (safeModelId && entryModelId) return entryModelId === safeModelId
        return safeName && entryName === safeName
      })
      .map((entry) => Math.max(1, Math.trunc(num(entry?.price || 0))))
      .filter((price) => price > 0)
      .sort((a, b) => a - b)
    const marketCount = marketPrices.length
    const marketMinPrice = marketCount ? marketPrices[0] : 0
    const marketMaxPrice = marketCount ? marketPrices[marketCount - 1] : 0
    const marketAvgPrice = marketCount
      ? Math.round(marketPrices.reduce((sum, price) => sum + price, 0) / marketCount)
      : 0
    setListingDraft({
      kind: 'logistics',
      isListed: false,
      listingId: '',
      truckId: safeTruckId,
      name: String(truck.name || 'Tır').trim() || 'Tır',
      image: resolveVehicleImage(truck, 'logistics'),
      emoji: String(truck.emoji || '').trim(),
      templateId: 'logistics',
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      suggestedPrice: bounds.suggestedPrice,
      price: String(bounds.suggestedPrice),
      income: Math.max(1, Math.trunc(num(truck.incomePerRun || 0))),
      xp: Math.max(1, Math.trunc(num(truck.xpPerRun || 0))),
      level: Math.max(1, Math.trunc(num(truck.levelRequired || 1))),
      levelRequired: Math.max(1, Math.trunc(num(truck.levelRequired || 1))),
      capacity: Math.max(1, Math.trunc(num(truck.capacity || 1))),
      upkeep: Math.max(1, Math.trunc(num(truck.upkeepPerRun || 1))),
      engineKits: Math.max(0, Math.trunc(num(truck?.engineKits || 0))),
      spareParts: Math.max(0, Math.trunc(num(truck?.spareParts || 0))),
      scrapEngineKits: scrapPreview.engineKits,
      scrapSpareParts: scrapPreview.spareParts,
      marketCount,
      marketMinPrice,
      marketAvgPrice,
      marketMaxPrice,
      lifetimeRemainingMs: lifetime.remainingMs,
      lifetimeLabel: formatLifetimeWithTotal(lifetime),
      expiresAt: lifetime.expiresAt,
      visibility: 'public',
      recipientUserId: '',
    })
    setBusinessModal('vehicle-actions')
  }

  const openActiveListingModal = (listing, templateIdHint = '') => {
    if (!listing) return
    const safeTemplateId = String(listing?.templateId || templateIdHint || selectedBusiness?.templateId || '').trim()
    const templateId = safeTemplateId || 'auto-rental'
    const isLogistics = templateId === 'logistics'
    const listingId = String(listing?.listingId || listing?.id || '').trim()
    if (!listingId) {
      setError('İlan kaydı bulunamadı.')
      return
    }
    const requiredLevel = Math.max(
      1,
      Math.trunc(
        num(
          listing?.requiredLevel ||
          listing?.marketLevel ||
          listing?.levelRequired ||
          1,
        ),
      ),
    )
    const hourlyIncome = Math.max(
      1,
      Math.trunc(
        num(
          listing?.rentPerHour ||
          listing?.marketIncome ||
          listing?.incomePerRun ||
          listing?.income ||
          0,
        ),
      ),
    )
    const xpGain = Math.max(
      1,
      Math.trunc(
        num(
          listing?.xp ||
          listing?.xpPerRun ||
          0,
        ),
      ),
    )
    const listingPrice = Math.max(1, Math.trunc(num(listing?.price || listing?.marketPrice || 0)))
    const commissionRate = Math.max(0, num(listing?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE))
    const commissionAmount = Math.max(
      0,
      Math.trunc(
        num(
          listing?.commissionAmount ||
          Math.floor(listingPrice * commissionRate),
        ),
      ),
    )
    const sellerPayout = Math.max(
      0,
      Math.trunc(
        num(
          listing?.sellerPayout ||
          (listingPrice - commissionAmount),
        ),
      ),
    )
    const lifetime = resolveVehicleLifetime(listing, liveNowMs)
    const scrapPreview = scrapPreviewForEntry(listing)

    setListingDraft({
      kind: isLogistics ? 'logistics' : 'fleet',
      isListed: true,
      listingId,
      businessId: isLogistics
        ? ''
        : String(selectedBusiness?.id || listing?.businessId || '').trim(),
      vehicleId: String(listing?.vehicleId || listing?.id || '').trim(),
      truckId: isLogistics
        ? String(listing?.truckId || listing?.vehicleId || listing?.id || '').trim()
        : '',
      name: String(listing?.name || (isLogistics ? 'Tır' : 'Araç')).trim() || (isLogistics ? 'Tır' : 'Araç'),
      image: resolveVehicleImage(listing, templateId),
      emoji: String(listing?.emoji || '').trim(),
      templateId,
      minPrice: Math.max(1, Math.trunc(num(listing?.minPrice || 1))),
      maxPrice: Math.max(2, Math.trunc(num(listing?.maxPrice || 2))),
      suggestedPrice: listingPrice,
      price: String(listingPrice),
      listingPrice,
      listedAt: String(listing?.listedAt || '').trim(),
      income: hourlyIncome,
      xp: xpGain,
      level: requiredLevel,
      requiredLevel,
      levelRequired: requiredLevel,
      engineKits: Math.max(0, Math.trunc(num(listing?.cost?.engineKits || listing?.engineKits || 0))),
      spareParts: Math.max(0, Math.trunc(num(listing?.cost?.spareParts || listing?.spareParts || 0))),
      scrapEngineKits: scrapPreview.engineKits,
      scrapSpareParts: scrapPreview.spareParts,
      marketCount: Math.max(0, Math.trunc(num(listing?.marketCount || 0))),
      marketMinPrice: Math.max(0, Math.trunc(num(listing?.marketMinPrice || 0))),
      marketAvgPrice: Math.max(0, Math.trunc(num(listing?.marketAvgPrice || 0))),
      marketMaxPrice: Math.max(0, Math.trunc(num(listing?.marketMaxPrice || 0))),
      commissionRate,
      commissionAmount,
      sellerPayout,
      capacity: Math.max(1, Math.trunc(num(listing?.capacity || 1))),
      upkeep: Math.max(1, Math.trunc(num(listing?.upkeep || listing?.upkeepPerRun || 1))),
      lifetimeRemainingMs: lifetime.remainingMs,
      lifetimeLabel: formatLifetimeWithTotal(lifetime),
      expiresAt: lifetime.expiresAt,
    })
    setBusinessModal('vehicle-actions')
  }

  const openListingPriceModal = async () => {
    if (!listingDraft) return
    setListingDraft((prev) => (prev ? { ...prev, price: '' } : prev))
    setBusinessModal('list-sale')

    if (listingFriendsLoading) return
    if (Array.isArray(listingFriends) && listingFriends.length > 0) return

    setListingFriendsLoading(true)
    try {
      const response = await getFriendsState()
      if (!response?.success) {
        const globalError = response?.errors?.global || response?.reason || 'Arkadaş listesi yüklenemedi.'
        setError(globalError)
        setListingFriends([])
        return
      }
      setListingFriends(Array.isArray(response?.friends) ? response.friends : [])
    } finally {
      setListingFriendsLoading(false)
    }
  }

  const openScrapConfirmModal = () => {
    if (!listingDraft) return
    setBusinessModal('scrap-confirm')
  }

  const closeListingModal = () => {
    setBusinessModal('')
    setListingDraft(null)
  }

  const cancelListingFromModal = async () => {
    if (busy || !listingDraft?.isListed) return
    const safeListingId = String(listingDraft?.listingId || '').trim()
    if (!safeListingId) {
      setError('İlan kaydı bulunamadı.')
      return
    }
    closeListingModal()
    await cancelVehicleListingAction(safeListingId)
  }

  const confirmListingModal = async () => {
    if (busy || !listingDraft) return
    const minPrice = Math.max(1, Math.trunc(num(listingDraft.minPrice || 1)))
    const maxPrice = Math.max(minPrice + 1, Math.trunc(num(listingDraft.maxPrice || minPrice + 1)))
    const rawPrice = Math.max(0, Math.trunc(num(String(listingDraft.price || '').replace(/[^\d]/g, ''))))
    if (rawPrice <= 0) {
      setError('Satış fiyatı girmelisiniz.')
      return
    }
    if (rawPrice < minPrice || rawPrice > maxPrice) {
      setError(`Satış fiyatı ${fmt(minPrice)} ile ${fmt(maxPrice)} arasında olmalı.`)
      return
    }
    const currentDraft = { ...listingDraft }
    closeListingModal()

    const visibility = currentDraft?.visibility === 'custom' ? 'custom' : 'public'
    const recipientUserId = visibility === 'custom' ? String(currentDraft?.recipientUserId || '').trim() : ''
    if (visibility === 'custom' && !recipientUserId) {
      setError('Özel ilan için satılacak kişi seçmelisin.')
      return
    }

    if (currentDraft.kind === 'logistics') {
      await listLogisticsTruckAction(currentDraft.truckId, rawPrice, visibility, recipientUserId)
      return
    }
    await listBizVehicle(currentDraft.businessId, currentDraft.vehicleId, rawPrice, visibility, recipientUserId)
  }

  const scrapBizVehicleAction = async (businessId, vehicleId) => {
    if (busy) return
    const safeBusinessId = String(businessId || '').trim()
    const safeVehicleId = String(vehicleId || '').trim()
    if (!safeBusinessId || !safeVehicleId) return
    setBusy(`scrapbiz:${safeBusinessId}:${safeVehicleId}`)
    const response = await scrapBusinessVehicle(safeBusinessId, { vehicleId: safeVehicleId })
    setBusy('')
    if (!response?.success) return fail(response, 'Araç parçalanamadı.')
    setNotice(`${response.message || 'Araç parçalandı.'} ${formatScrapNotice(response?.scrapReturn)}`)
    await Promise.all([loadBusiness(), loadOverview(), loadProfile(), loadMarket()])
  }

  const scrapLogisticsTruckAction = async (truckId) => {
    if (busy) return
    const safeTruckId = String(truckId || '').trim()
    if (!safeTruckId) return
    setBusy(`scraplog:${safeTruckId}`)
    const response = await scrapLogisticsTruck(safeTruckId)
    setBusy('')
    if (!response?.success) return fail(response, 'Tır parçalanamadı.')
    setNotice(`${response.message || 'Tır parçalandı.'} ${formatScrapNotice(response?.scrapReturn)}`)
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const confirmScrapFromListingModal = async () => {
    if (busy || !listingDraft) return
    const currentDraft = { ...listingDraft }
    closeListingModal()
    if (currentDraft.kind === 'logistics') {
      await scrapLogisticsTruckAction(currentDraft.truckId)
      return
    }
    await scrapBizVehicleAction(currentDraft.businessId, currentDraft.vehicleId)
  }

  const marketAssetLabel = (templateId) => {
    const safeTemplateId = String(templateId || '').trim()
    if (safeTemplateId === 'moto-rental') {
      return {
        singular: 'Motor',
        buyAction: 'Motoru Satın Al',
        successText: 'Motor başarıyla satın alındı.',
        ownedTabLabel: 'Motorlarım',
      }
    }
    if (safeTemplateId === 'logistics') {
      return {
        singular: 'Tır',
        buyAction: 'Tırı Satın Al',
        successText: 'Tır başarıyla satın alındı.',
        ownedTabLabel: 'Tırlarım',
      }
    }
    if (safeTemplateId === 'property-rental') {
      return {
        singular: 'Mülk',
        buyAction: 'Mülkü Satın Al',
        successText: 'Mülk başarıyla satın alındı.',
        ownedTabLabel: 'Mülklerim',
      }
    }
    return {
      singular: 'Araç',
      buyAction: 'Aracı Satın Al',
      successText: 'Araç başarıyla satın alındı.',
      ownedTabLabel: 'Arabalarım',
    }
  }

  const resetMarketFilters = () => {
    setMarketFilterForm({
      model: 'all',
      minPrice: '',
      maxPrice: '',
      minLevel: '',
      maxLevel: '',
    })
  }

  const openMarketListingDetail = (listing) => {
    try {
      if (!listing) return false
      // Overlay click ile hemen kapanmayı engellemek için zamanı erken kaydedelim.
      marketDetailJustOpenedAtRef.current = Date.now()
      const safeListingId = String(listing?.id || listing?.listingId || '').trim()
      if (!safeListingId) return false
      const safeTemplateId = String(listing?.templateId || selectedBusiness?.templateId || '').trim() || 'moto-rental'
      const safePrice = Math.max(1, Math.trunc(num(listing?.marketPrice || listing?.price || 0)))
      const safeIncome = Math.max(1, Math.trunc(num(listing?.marketIncome || listing?.rentPerHour || 0)))
      const safeXp = Math.max(1, Math.trunc(num(listing?.xp || 0)))
      const safeRequiredLevel = Math.max(
        1,
        Math.trunc(
          num(listing?.marketLevel || listing?.requiredLevel || listing?.levelRequired || 1),
        ),
      )
      const commission = listingCommissionPreview(
        safePrice,
        num(listing?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE),
      )
      setMarketDetailDraft({
        ...listing,
        id: safeListingId,
        templateId: safeTemplateId,
        marketPrice: safePrice,
        marketIncome: safeIncome,
        xp: safeXp,
        marketLevel: safeRequiredLevel,
        requiredLevel: safeRequiredLevel,
        commissionRate: commission.rate,
        commissionAmount: commission.amount,
        totalCost: commission.totalCost,
        sellerPayout: commission.sellerPayout,
        image: resolveVehicleImage(listing, safeTemplateId),
        sellerName: String(listing?.sellerName || 'Oyuncu').trim() || 'Oyuncu',
        listingOpenedAt: new Date().toISOString(),
      })
      setMarketPurchaseResult(null)
      setBusinessModal('market-detail')
      return true
    } catch (e) {
      console.error('[private_listing_detail_open_failed]', e)
      setError('Özel ilan detayı açılamadı. Tekrar dene.')
      return false
    }
  }

  const tapPrivateListing = (listing) => {
    const safeListingId = String(listing?.id || listing?.listingId || '').trim()
    if (!safeListingId) {
      setError('Özel ilan detayı için ilan bulunamadı.')
      return false
    }
    // Aynı modal zaten açıkken tekrar açmaya çalışma (mobilde click/tap çift tetiklenebiliyor).
    const currentId = String(marketDetailDraft?.id || marketDetailDraft?.listingId || '').trim()
    if (businessModal === 'market-detail' && currentId && currentId === safeListingId) return false
    const ok = openMarketListingDetail(listing)
    if (!ok) setError('Özel ilan detayı açılamadı. Tekrar dene.')
    return ok
  }

  const closeMarketListingDetail = () => {
    const dt = Date.now() - (marketDetailJustOpenedAtRef.current || 0)
    // Mobilde aynı dokunuş hem kartı hem de overlay click'i tetikleyebiliyor;
    // kısa süre içinde gelen close isteklerini tamamen yutalım.
    if (dt < 1500) return
    if (businessModal === 'market-detail') setBusinessModal('')
    setMarketDetailDraft(null)
  }

  const closeMarketPurchaseResult = () => {
    if (businessModal === 'market-buy-success') setBusinessModal('')
    setMarketPurchaseResult(null)
  }

  const goToOwnedFleetFromPurchase = () => {
    const templateId = String(marketPurchaseResult?.templateId || marketDetailDraft?.templateId || '').trim()
    closeMarketPurchaseResult()
    closeMarketListingDetail()
    if (templateId === 'logistics') {
      setBusinessScene('logistics')
      setLogisticsScene('detail')
      setLogisticsDetailTab('garage')
      return
    }
    setBusinessScene('detail')
    setBusinessDetailTab('garage')
  }

  const goToMyListingsFromPurchase = () => {
    const templateId = String(marketPurchaseResult?.templateId || marketDetailDraft?.templateId || '').trim()
    closeMarketPurchaseResult()
    closeMarketListingDetail()
    if (templateId === 'logistics') {
      setBusinessScene('logistics')
      setLogisticsScene('detail')
      setLogisticsDetailTab('market')
      return
    }
    setBusinessScene('detail')
    setBusinessDetailTab('market')
  }

  const buyVehicleFromMarket = async (listingId, listingPreview = null) => {
    const safeListingId = String(listingId || '').trim()
    if (!safeListingId || busy) return
    const preview = listingPreview || marketDetailDraft
    setBusy(`buy-listing:${safeListingId}`)
    const response = await buyBusinessVehicleListing(safeListingId)
    setBusy('')
    if (!response?.success) return fail(response, 'İkinci el araç satın alınamadı.')
    setNotice(response.message || 'Araç ikinci el pazardan satın alındı.')
    const purchase = response?.purchase || {}
    setMarketPurchaseResult(preview
      ? {
          id: safeListingId,
          name: String(preview?.name || 'Araç').trim() || 'Araç',
          templateId: String(preview?.templateId || '').trim() || 'moto-rental',
          marketPrice: Math.max(1, Math.trunc(num(purchase?.listingPrice || preview?.marketPrice || preview?.price || 0))),
          commissionRate: Math.max(0, num(purchase?.commissionRate || preview?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
          commissionAmount: Math.max(0, Math.trunc(num(purchase?.commissionAmount || preview?.commissionAmount || 0))),
          totalCost: Math.max(
            1,
            Math.trunc(
              num(
                purchase?.totalCost ||
                preview?.totalCost ||
                Math.max(1, Math.trunc(num(purchase?.listingPrice || preview?.marketPrice || preview?.price || 0))),
              ),
            ),
          ),
          sellerPayout: Math.max(
            0,
            Math.trunc(
              num(
                purchase?.sellerPayout ||
                preview?.sellerPayout ||
                (
                  Math.max(1, Math.trunc(num(purchase?.listingPrice || preview?.marketPrice || preview?.price || 0))) -
                  Math.max(0, Math.trunc(num(purchase?.commissionAmount || preview?.commissionAmount || 0)))
                ),
              ),
            ),
          ),
          image: resolveVehicleImage(preview, preview?.templateId),
        }
      : null)
    setMarketDetailDraft(null)
    setBusinessModal('market-buy-success')
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const cancelVehicleListingAction = async (listingId) => {
    const safeListingId = String(listingId || '').trim()
    if (!safeListingId || busy) return
    setBusy(`cancel-listing:${safeListingId}`)
    const response = await cancelBusinessVehicleListing(safeListingId)
    setBusy('')
    if (!response?.success) return fail(response, 'İlan iptal edilemedi.')
    setNotice(response.message || 'İlan iptal edildi ve araç filoya geri eklendi.')
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const _scrapVehicleListingAction = async (listingId) => {
    const safeListingId = String(listingId || '').trim()
    if (!safeListingId || busy) return
    setBusy(`scrap-listing:${safeListingId}`)
    const response = await scrapBusinessVehicleListing(safeListingId)
    setBusy('')
    if (!response?.success) return fail(response, 'İlan parçalanamadı.')
    setNotice(`${response.message || 'İlan parçalandı.'} ${formatScrapNotice(response?.scrapReturn)}`)
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const burst = (event) => {
    const bid = `burst_${burstCounter.current}`
    burstCounter.current += 1
    const vectors = [[-92, -126], [-66, -158], [-34, -140], [-10, -168], [10, -146], [36, -160], [62, -132], [86, -154], [-48, -118], [48, -118]]
    const particles = vectors.map((vector, i) => ({ id: `${bid}_${i}`, dx: vector[0], dy: vector[1] }))
    setBursts((prev) => [...prev, { id: bid, x: event.clientX, y: event.clientY, particles }])
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== bid)), 900)
  }

  const collectBiz = async (id, event) => {
    if (busy) return
    if (event?.clientX && event?.clientY) {
      burst(event)
    }
    setBusy(`collect:${id}`)
    const response = await collectBusinessIncome(id)
    setBusy('')
    if (!response?.success) return fail(response, 'Toplama başarısız.')
    const collectedCash = fmt(response?.collected?.cash || 0)
    const collectedXp = fmt(response?.collected?.xpGain || 0)
    const taxAmount = Math.max(0, Math.trunc(num(response?.collected?.taxAmount || 0)))
    const fuelConsumed = Math.max(0, Math.trunc(num(response?.collected?.fuelConsumed || 0)))
    const fuelName = String(response?.collected?.fuelItemName || 'Yakıt').trim() || 'Yakıt'
    const appliedMultiplier = Math.max(
      1,
      Math.trunc(num(response?.collected?.multiplier || (premiumBoostActive ? premiumMultiplier : 1))),
    )
    const breakdown = [
      `+${collectedCash} nakit`,
      `+${collectedXp} XP`,
      `-${fmt(fuelConsumed)} ${fuelName}`,
      `-${fmt(taxAmount)} vergi`,
    ]
    setNotice(`${appliedMultiplier > 1 ? '2x tahsilat tamamlandı' : 'Tahsilat tamamlandı'}: ${breakdown.join(' | ')}.`)
    await Promise.all([loadOverview(), loadBusiness(), loadMissions(), loadProfile(), loadMarket()])
  }

  const openCollectPreview = (businessId) => {
    const safeBusinessId = String(businessId || selectedBusiness?.id || '').trim()
    if (!safeBusinessId) {
      setError('Tahsilat yapılacak işletme bulunamadı.')
      return
    }
    const targetBusiness = unlockedBusinesses.find((entry) => String(entry?.id || '').trim() === safeBusinessId)
    if (!targetBusiness) {
      setError('Tahsilat yapılacak işletme bulunamadı.')
      return
    }
    if (Math.max(0, Math.trunc(num(targetBusiness.fleetCount))) <= 0) {
      const unitLabel = targetBusiness.templateId === 'moto-rental'
        ? 'motosiklet'
        : targetBusiness.templateId === 'auto-rental'
          ? 'araç'
          : targetBusiness.templateId === 'property-rental'
            ? 'mülk'
            : 'tır'
      setError(`Tahsilat yapabilmek için önce en az bir ${unitLabel} edinmelisin.`)
      return
    }
    const collectRemainingMs = remainingMsFromIso(targetBusiness.nextCollectAt || '', liveNowMs)
    if (collectRemainingMs > 0) {
      setError(`Tahsilat henüz hazır değil. Kalan süre: ${formatCollectionCountdown(collectRemainingMs)}`)
      return
    }
    const preview = fleetCollectPreview(targetBusiness, inventoryById, { weeklyEvents: weeklyEventsRuntimeState })
    if (Math.max(0, Math.trunc(num(preview.fuelNeeded))) > Math.max(0, Math.trunc(num(preview.fuelAvailable)))) {
      const fuelName = String(preview.fuelItemName || 'Yakıt').trim() || 'Yakıt'
      setError(`${fuelName} yetersiz. Gerekli: ${fmt(preview.fuelNeeded)}, Depodaki: ${fmt(preview.fuelAvailable)}.`)
      return
    }
    setCollectTargetBusinessId(safeBusinessId)
    setBusinessModal('collect')
  }

  const confirmCollectFromModal = async () => {
    if (busy) return
    const safeBusinessId = String(collectTargetBusinessId || '').trim()
    if (!safeBusinessId) return
    setBusinessModal('')
    setCollectTargetBusinessId('')
    await collectBiz(safeBusinessId)
  }

  const openLogisticsCollectPreview = () => {
    const truckCount = Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0)))
    if (truckCount <= 0) {
      setError('Tahsilat yapabilmek için önce en az bir tır edinmelisin.')
      return
    }
    const collectRemainingMs = remainingMsFromIso(logistics?.collectPreview?.nextCollectAt || '', liveNowMs)
    if (collectRemainingMs > 0) {
      setError(`Tahsilat henüz hazır değil. Kalan süre: ${formatCollectionCountdown(collectRemainingMs)}`)
      return
    }
    const fuelItemId = String(logistics?.collectPreview?.fuelItemId || 'oil')
    const fuelNeeded = Math.max(0, Math.trunc(num(logistics?.collectPreview?.fuelNeeded || 0)))
    const fuelAvailable = Math.max(0, Math.trunc(num(inventoryById[fuelItemId] || 0)))
    if (fuelNeeded > fuelAvailable) {
      setError(`Petrol yetersiz. Gerekli: ${fmt(fuelNeeded)}, Depodaki: ${fmt(fuelAvailable)}.`)
      return
    }
    setBusinessModal('logistics-collect')
  }

  const confirmLogisticsCollectFromModal = async () => {
    if (busy) return
    setBusinessModal('')
    await collectLogisticsAction()
  }

  const openBusinessHub = () => {
    setBusinessScene('hub')
    setBusinessDetailTab('garage')
    setLogisticsScene('detail')
    setCollectTargetBusinessId('')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openBusinessDetail = (businessId) => {
    const targetBusiness = (business?.businesses || []).find((entry) => entry.id === businessId)
    if (!targetBusiness) {
      setError('İşletme bulunamadı.')
      return
    }
    if (targetBusiness.unlocked === false) {
      setError('Bu işletme kilitli. İşletmeni geliştirerek önce işletmeyi açmalısın.')
      return
    }
    setSelectedBusinessId(businessId)
    setBusinessScene('detail')
    setBusinessDetailTab('garage')
    setCollectTargetBusinessId('')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openBusinessGallery = () => {
    setBusinessScene('gallery')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openBusinessMarket = () => {
    setBusinessScene('market')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openFleetHelp = () => {
    setBusinessModal('fleet-help')
  }

  const openLogisticsCenter = async () => {
    if (!(business?.companyUnlock?.logisticsUnlocked === true || logistics?.unlocked === true)) {
      setError('Tır Kiralama kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.')
      return
    }
    await Promise.all([loadLogistics(), loadMarket()])
    setBusinessScene('logistics')
    setLogisticsScene('detail')
    setLogisticsDetailTab('garage')
    setCollectTargetBusinessId('')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openLogisticsDetail = () => {
    setLogisticsScene('detail')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openLogisticsMarket = () => {
    setLogisticsScene('market')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openLogisticsGallery = () => {
    setLogisticsScene('gallery')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const runBulkCollectPreview = () => {
    const totalFleetUnits = unlockedBusinesses.reduce((sum, entry) => sum + Math.max(0, num(entry.fleetCount)), 0)
    const totalTruckUnits = Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0)))
    if (totalFleetUnits + totalTruckUnits <= 0) {
      setError('Tahsilat için hazır gelir bulunamadı veya yakıt yetersiz.')
      return
    }
    setBusinessModal('bulk')
  }

  const collectBulkAction = async () => {
    if (busy) return
    setBusy('collect-bulk')
    const requestedMultiplier = premiumActive ? premiumMultiplier : 1
    const response = await collectBusinessesBulk({ multiplier: requestedMultiplier })
    setBusy('')
    if (!response?.success) return fail(response, 'Toplu tahsilat yapılamadı.')
    const collectedCash = fmt(response?.collected?.cash || 0)
    const collectedXp = fmt(response?.collected?.xpGain || 0)
    const appliedMultiplier = Math.max(1, Math.trunc(num(response?.collected?.multiplier || 1)))
    const isBoosted = appliedMultiplier > 1
    setNotice(
      isBoosted
        ? `2x toplu tahsilat tamamlandı: +${collectedCash} nakit | +${collectedXp} XP.`
        : `Toplu tahsilat tamamlandı: +${collectedCash} nakit | +${collectedXp} XP.`,
    )
    if (response?.logistics && typeof response.logistics === 'object') {
      setLogistics((prev) => {
        const base = prev && typeof prev === 'object' ? prev : {}
        return {
          ...base,
          ...response.logistics,
          wallet: Math.max(0, Math.trunc(num(response?.wallet || base?.wallet || 0))),
        }
      })
      startTransition(() => setChatClockMs((prev) => prev + 1))
    }
    setBusinessModal('')
    await Promise.all([loadOverview(), loadBusiness(), loadLogistics(), loadProfile(), loadMissions(), loadMarket()])
  }

  const purchasePremiumPlan = async (planId) => {
    const safePlanId = String(planId || '').trim()
    if (!safePlanId || busy) return
    setBusy(`premium:${safePlanId}`)
    const response = await purchasePremium(safePlanId)
    setBusy('')
    if (!response?.success) return fail(response, 'Premium satın alınamadı.')
    setNotice('Premium üyelik güncellendi.')
    await Promise.all([loadOverview(), loadProfile()])
  }

  const purchaseDailyOfferAction = async (offerId) => {
    const safeOfferId = String(offerId || '').trim()
    if (!safeOfferId || busy) return
    setBusy(`daily:${safeOfferId}`)
    const response = await purchaseDailyOffer(safeOfferId)
    setBusy('')
    if (!response?.success) return fail(response, 'Sınırlı fırsat alınamadı.')
    setNotice(String(response.message || 'Sınırlı fırsat başarıyla alındı.'))
    if (Array.isArray(response.inventory)) {
      setMarket((prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...prev,
          inventory: response.inventory,
        }
      })
    }
    setDailyStore({
      offers: Array.isArray(response.offers) ? response.offers : [],
      nextResetAt: String(response.nextResetAt || ''),
      remainingMs: Math.max(0, Math.trunc(num(response.remainingMs || 0))),
      weekMultiplier: Math.max(1, Math.trunc(num(response.weekMultiplier || 1))),
    })
    await Promise.all([loadOverview(), loadProfile(), loadMarket()])
  }

  const claimDailyLoginRewardAction = async () => {
    if (busy) return
    if (!dailyLoginReward?.canClaim) {
      setNotice('Bugünkü günlük ödülü zaten aldın. Yeni ödül Türkiye saatine göre 00:00\'da açılır.')
      return
    }
    setBusy('daily-login:claim')
    const response = await claimDailyLoginReward()
    setBusy('')
    if (!response?.success) return fail(response, 'Günlük ödül alınamadı.')
    setDailyLoginReward(normalizeDailyLoginPayload(response))
    setDailyRewardResult(response?.reward && typeof response.reward === 'object' ? response.reward : null)
    setNotice(String(response.message || 'Günlük ödül hesabına eklendi.'))
    if (Array.isArray(response.inventory)) {
      setMarket((prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...prev,
          inventory: response.inventory,
        }
      })
    }
    await Promise.all([loadOverview(), loadProfile(), loadMarket(), loadDailyLoginRewardState()])
  }

  const placeLimitOrderAction = async () => {
    if (busy) return
    const itemId = bookItemId || market?.items?.[0]?.id
    if (!itemId) return setError('Emir defteri için ürün seçilmedi.')

    const quantity = Math.max(1, Math.trunc(num(orderForm.quantity)))
    const limitPrice = Math.max(1, Math.trunc(num(orderForm.limitPrice)))
    const expiresMinutes = clamp(Math.trunc(num(orderForm.expiresMinutes)), 5, 180)

    setBusy('place-orderbook')
    const response = await placeOrderBookOrder({
      itemId,
      side: orderForm.side,
      quantity,
      limitPrice,
      expiresMinutes,
    })
    setBusy('')

    if (!response?.success) return fail(response, 'Limit emir oluşturulamadı.')
    setNotice(response.message || 'Limit emir açıldı.')
    await Promise.all([loadOrderBook(itemId), loadMarket(), loadProfile()])
  }

  const cancelLimitOrderAction = async (orderId) => {
    if (busy) return
    setBusy(`cancel-order:${orderId}`)
    const response = await cancelOrderBookOrder(orderId)
    setBusy('')
    if (!response?.success) return fail(response, 'Limit emir iptal edilemedi.')
    setNotice(response.message || 'Limit emir iptal edildi.')
    await Promise.all([loadOrderBook(bookItemId), loadMarket(), loadProfile()])
  }

  const createAuctionAction = async () => {
    if (busy) return
    const payload = {
      itemId: auctionForm.itemId,
      quantity: Math.max(1, Math.trunc(num(auctionForm.quantity))),
      startBid: Math.max(1, Math.trunc(num(auctionForm.startBid))),
      minIncrement: Math.max(1, Math.trunc(num(auctionForm.minIncrement))),
      durationMinutes: clamp(Math.trunc(num(auctionForm.durationMinutes)), 5, 180),
    }
    if (!payload.itemId) return setError('Açık artırma için ürün seçin.')

    setBusy('create-auction')
    const response = await createMarketAuction(payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Açık artırma oluşturulamadı.')
    setNotice(response.message || 'Açık artırma açıldı.')
    await Promise.all([loadMarket(), loadProfile()])
  }

  const bidAuctionAction = async (auction) => {
    if (busy) return
    const safeAuction = auction && typeof auction === 'object' ? auction : null
    if (!safeAuction?.id) return
    const bidValueRaw = auctionBidById[safeAuction.id]
    const fallbackValue = safeAuction.minNextBid || safeAuction.currentBid + safeAuction.minIncrement
    const amount = Math.max(1, Math.trunc(num(bidValueRaw || fallbackValue)))

    setBusy(`bid-auction:${safeAuction.id}`)
    const response = await placeAuctionBid(safeAuction.id, amount)
    setBusy('')
    if (!response?.success) return fail(response, 'Teklif verilemedi.')
    setNotice(response.message || 'Teklif verildi.')
    await Promise.all([loadMarket(), loadProfile()])
  }

  const collectLogisticsAction = async () => {
    if (busy) return
    setBusy('collect-logistics')
    const response = await collectLogisticsIncome()
    setBusy('')
    if (!response?.success) return fail(response, 'Tır tahsilatı yapılamadı.')
    const netCash = fmt(response?.netCash || 0)
    const taxAmount = Math.max(0, Math.trunc(num(response?.taxAmount || 0)))
    const xpGain = Math.max(0, Math.trunc(num(response?.xpGain || 0)))
    const fuelConsumed = Math.max(0, Math.trunc(num(response?.fuelConsumed || 0)))
    const fuelItemName = String(response?.fuelItemName || 'Petrol').trim() || 'Petrol'
    const appliedMultiplier = Math.max(
      1,
      Math.trunc(num(response?.multiplier || (premiumBoostActive ? premiumMultiplier : 1))),
    )
    const lines = [`${appliedMultiplier > 1 ? '2x tır tahsilatı tamamlandı.' : (response.message || 'Tır tahsilatı tamamlandı.')} +${netCash} nakit`]
    if (taxAmount > 0) lines.push(`-${fmt(taxAmount)} vergi`)
    if (fuelConsumed > 0) lines.push(`-${fmt(fuelConsumed)} ${fuelItemName}`)
    if (xpGain > 0) lines.push(`+${fmt(xpGain)} XP`)
    setNotice(lines.join(' | '))
    if (response?.logisticsFleet || response?.collectPreview) {
      setLogistics((prev) => {
        const base = prev && typeof prev === 'object' ? prev : {}
        return {
          ...base,
          wallet: Math.max(0, Math.trunc(num(response?.wallet || base?.wallet || 0))),
          unlocked: true,
          logisticsFleet: response?.logisticsFleet || base?.logisticsFleet,
          collectPreview: response?.collectPreview || base?.collectPreview,
        }
      })
      startTransition(() => setChatClockMs((prev) => prev + 1))
    }
    await Promise.all([loadLogistics(), loadOverview(), loadProfile(), loadBusiness(), loadMarket()])
  }

  const buyTruckAction = async (modelId) => {
    if (busy) return
    setBusy(`buy-truck:${modelId}`)
    const response = await purchaseLogisticsTruck({ modelId })
    setBusy('')
    if (!response?.success) return fail(response, 'Tır satın alımı başarısız.')
    const safeModelId = String(modelId || '').trim()
    const truckName = (logistics?.logisticsFleet?.catalog || []).find((entry) => entry.id === safeModelId)?.name || 'Tır'
    setNotice(response.message || `${truckName} lojistik filona eklendi.`)
    await Promise.all([loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const _claimLeagueAction = async (period) => {
    if (busy) return
    setBusy(`claim-league:${period}`)
    const response = await claimLeagueReward(period)
    setBusy('')
    if (!response?.success) return fail(response, 'Lig ödülü alınamadı.')
    setNotice(response.message || 'Lig ödülü alındı.')
    await Promise.all([loadOverview(), loadProfile()])
  }

  const _openSeasonChestAction = async (chestId) => {
    const safeChestId = String(chestId || '').trim()
    if (!safeChestId || busy) return
    setBusy(`season-chest-open:${safeChestId}`)
    const response = await openLeagueSeasonChest(safeChestId)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Sandık açılamadı.')
    setNotice(response?.message || 'Sandık açıldı, ödül hesabına eklendi.')
    if (response?.seasonPrizes) {
      setLeague((prev) => (prev && typeof prev === 'object'
        ? { ...prev, seasonPrizes: response.seasonPrizes }
        : prev))
    }
    await Promise.all([loadOverview(), loadProfile(), _loadLeague()])
  }

  const _savePushSettingsAction = async (nextSettings) => {
    if (busy) return
    setBusy('push-settings')
    const response = await updatePushSettings(nextSettings)
    setBusy('')
    if (!response?.success) return fail(response, 'Bildirim ayarları kaydedilemedi.')
    setPushCenter(response)
    setNotice('Bildirim ayarları güncellendi.')
  }

  const _createPriceAlertAction = async () => {
    if (busy) return
    const payload = {
      itemId: priceAlertForm.itemId,
      direction: priceAlertForm.direction,
      targetPrice: Math.max(1, Math.trunc(num(priceAlertForm.targetPrice))),
    }
    if (!payload.itemId) return setError('Alarm için ürün seçin.')

    setBusy('create-alert')
    const response = await createPriceAlert(payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Fiyat alarmı oluşturulamadı.')
    setNotice(response.message || 'Fiyat alarmı eklendi.')
    await loadPush()
  }

  const _readPushAction = async (pushId) => {
    if (busy) return
    setBusy(`read-push:${pushId}`)
    const response = await readPushNotification(pushId)
    setBusy('')
    if (!response?.success) return fail(response, 'Bildirim okunamadı.')
    setPushCenter(response)
  }

  const clearAvatarCropSource = useCallback(() => {
    const currentSource = avatarCropSourceRef.current
    if (currentSource) {
      URL.revokeObjectURL(currentSource)
      avatarCropSourceRef.current = ''
    }
  }, [])

  const closeAvatarCrop = useCallback(() => {
    clearAvatarCropSource()
    setAvatarCropOpen(false)
    setAvatarCropSource('')
    setAvatarCropFile(null)
    setAvatarCropFileName('')
    setAvatarCropMode('crop')
    setAvatarCropZoom(1)
    setAvatarCropOffsetX(0)
    setAvatarCropOffsetY(0)
    setAvatarCropNatural({ width: 0, height: 0 })
  }, [clearAvatarCropSource])

  useEffect(() => () => {
    clearAvatarCropSource()
  }, [clearAvatarCropSource])

  useEffect(() => {
    if (!avatarCropOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && busy !== 'avatar-upload') {
        closeAvatarCrop()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [avatarCropOpen, busy, closeAvatarCrop])

  const openAvatarCropFromFile = useCallback((event) => {
    const file = event.target?.files?.[0]
    if (!file) return
    const mimeType = String(file.type || '').trim().toLowerCase()
    const fileSize = Number(file.size || 0)
    if (!AVATAR_ALLOWED_MIME_TYPES.has(mimeType)) {
      setError('Desteklenmeyen dosya türü. Sadece PNG, JPG, WEBP veya GIF yükleyebilirsin.')
      event.target.value = ''
      return
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      setError('Geçersiz avatar dosyası.')
      event.target.value = ''
      return
    }
    if (fileSize > AVATAR_MAX_FILE_BYTES) {
      setError(`Avatar dosyası en fazla ${AVATAR_MAX_FILE_MB} MB olabilir.`)
      event.target.value = ''
      return
    }
    clearAvatarCropSource()
    const url = URL.createObjectURL(file)
    avatarCropSourceRef.current = url
    setAvatarCropSource(url)
    setAvatarCropFile(file)
    setAvatarCropFileName(file.name)
    setAvatarCropMode(String(file.type || '').toLowerCase() === 'image/gif' ? 'gif' : 'crop')
    setAvatarCropZoom(1)
    setAvatarCropOffsetX(0)
    setAvatarCropOffsetY(0)
    setAvatarCropNatural({ width: 0, height: 0 })
    setAvatarCropOpen(true)
    event.target.value = ''
  }, [clearAvatarCropSource])

  const triggerAvatarFilePicker = useCallback(() => {
    if (busy) return
    const currentDiamonds = Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0)))
    if (currentDiamonds < AVATAR_CHANGE_COST_DIAMONDS) {
      setError(`Avatar değiştirmek için ${AVATAR_CHANGE_COST_DIAMONDS} elmas gerekli.`)
      return
    }
    setAvatarChangeConfirmOpen(true)
  }, [busy, overview?.profile?.reputation])

  const confirmAvatarFilePicker = useCallback(() => {
    if (busy) return
    const currentDiamonds = Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0)))
    if (currentDiamonds < AVATAR_CHANGE_COST_DIAMONDS) {
      setAvatarChangeConfirmOpen(false)
      setError(`Avatar değiştirmek için ${AVATAR_CHANGE_COST_DIAMONDS} elmas gerekli.`)
      return
    }
    setAvatarChangeConfirmOpen(false)
    avatarFileInputRef.current?.click()
  }, [busy, overview?.profile?.reputation])

  const applyAvatarCropAction = async () => {
    if (!avatarCropFile || busy) return
    const currentDiamonds = Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0)))
    if (currentDiamonds < AVATAR_CHANGE_COST_DIAMONDS) {
      setError(`Avatar değiştirmek için ${AVATAR_CHANGE_COST_DIAMONDS} elmas gerekli.`)
      return
    }

    setBusy('avatar-upload')
    setError('')

    let uploadFile = avatarCropFile
    if (avatarCropMode !== 'gif') {
      const imageNode = avatarCropImageRef.current
      if (!imageNode || !avatarCropLayout.ready) {
        setBusy('')
        setError('Kırpma önizlemesi henüz hazır değil. Biraz bekleyip tekrar dene.')
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = AVATAR_CROP_OUTPUT_SIZE
      canvas.height = AVATAR_CROP_OUTPUT_SIZE
      const context = canvas.getContext('2d')
      if (!context) {
        setBusy('')
        setError('Kırpma motoru başlatılamadı.')
        return
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'

      context.drawImage(
        imageNode,
        avatarCropLayout.sourceX,
        avatarCropLayout.sourceY,
        avatarCropLayout.sourceSize,
        avatarCropLayout.sourceSize,
        0,
        0,
        AVATAR_CROP_OUTPUT_SIZE,
        AVATAR_CROP_OUTPUT_SIZE,
      )

      const blob = await new Promise((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png')
      })
      if (!blob) {
        setBusy('')
        setError('Kırpılmış avatar oluşturulamadı.')
        return
      }

      const fileStem = String(avatarCropFileName || 'avatar')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 42) || 'avatar'

      uploadFile = new File([blob], `${fileStem}-crop.png`, { type: 'image/png' })
    }

    const response = await uploadProfileAvatarFile(uploadFile)
    setBusy('')
    if (!response?.success) return fail(response, 'Avatar dosyası yüklenemedi.')

    setAvatarFailedSrc('')
    closeAvatarCrop()
    setNotice(response.message || 'Profil resmi yüklendi.')
    await Promise.all([loadOverview(), loadProfile()])
  }

  const updateProfilePasswordAction = async () => {
    if (busy) return
    const payload = {
      newPassword: String(profileAccountForm.newPassword || ''),
      confirmPassword: String(profileAccountForm.confirmPassword || ''),
    }

    if (!payload.newPassword || !payload.confirmPassword) {
      setError('Yeni şifre ve şifre tekrarı alanları zorunludur.')
      return
    }

    setBusy('profile-password')
    setError('')
    const response = await changeCurrentUserPassword(payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Şifre güncellenemedi.')

    setProfileAccountForm((prev) => ({
      ...prev,
      newPassword: '',
      confirmPassword: '',
    }))
    setNotice(response.message || 'Şifreniz başarıyla güncellendi.')
    setNoticeIsSuccess(true)
  }

  const updateProfileUsernameAction = async () => {
    if (busy) return
    const username = String(profileAccountForm.username || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15)

    if (!username) {
      setError('Yeni kullanıcı adı zorunludur.')
      return
    }
    const currentDiamonds = Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0)))
    if (currentDiamonds < USERNAME_CHANGE_COST_DIAMONDS) {
      setError(`Kullanıcı adı değiştirmek için ${USERNAME_CHANGE_COST_DIAMONDS} elmas gerekli.`)
      return
    }
    const confirmed = window.confirm('Kullanıcı adınızı değiştirmek istediğinize emin misiniz?')
    if (!confirmed) return

    setBusy('profile-username')
    setError('')
    const response = await changeCurrentUserUsername(username)
    setBusy('')
    if (!response?.success) return fail(response, 'Kullanıcı adı güncellenemedi.')

    const nextUsername = String(response?.user?.username || username).trim()
    setProfileAccountForm((prev) => ({
      ...prev,
      username: nextUsername,
    }))
    setNotice(response.message || 'Kullanıcı adı güncellendi.')
    setNoticeIsSuccess(true)
    await Promise.all([loadOverview(), loadProfile()])
  }

  const deleteOwnAccountAction = async () => {
    if (busy) return
    const confirmEmail = String(profileAccountForm.deleteEmail || '').trim()
    const currentPassword = String(profileAccountForm.deletePassword || '')
    if (!confirmEmail) {
      setError('Hesabı kalıcı silmek için kayıtlı e-posta adresini girmelisin.')
      return
    }
    const currentAccountEmail = String(user?.email || '').trim().toLowerCase()
    if (currentAccountEmail && confirmEmail.toLowerCase() !== currentAccountEmail) {
      setError('Girilen e-posta bu hesapla eşleşmiyor.')
      return
    }
    if (!currentPassword) {
      setError('Hesabı kalıcı silmek için mevcut şifreni girmelisin.')
      return
    }
    const confirmed = window.confirm('Hesabını kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.')
    if (!confirmed) return

    setBusy('profile-delete-account')
    setError('')
    const response = await deleteCurrentUserAccount({ currentPassword, confirmEmail })
    setBusy('')
    if (!response?.success) return fail(response, 'Hesap silinemedi.')

    setProfileAccountForm((prev) => ({
      ...prev,
      deleteEmail: '',
      deletePassword: '',
    }))
    onLogout(response.message || 'Hesabın kalıcı olarak silindi.')
  }

  const sendSupportRequestAction = async () => {
    if (busy) return
    const title = String(supportForm.title || '').replace(/\s+/g, ' ').trim()
    const description = String(supportForm.description || '').replace(/\r\n/g, '\n').trim()

    if (title.length < 4 || title.length > 120) {
      setError('Destek başlığı 4-120 karakter arasında olmalıdır.')
      return
    }

    if (description.length < 10 || description.length > 2500) {
      setError('Destek açıklaması 10-2500 karakter arasında olmalıdır.')
      return
    }

    setBusy('support-request')
    setError('')
    const response = await submitSupportRequest({ title, description })
    setBusy('')
    if (!response?.success) return fail(response, 'Destek talebi gönderilemedi.')

    setSupportForm({ title: '', description: '' })
    setNotice(response.message || 'Destek talebiniz başarıyla gönderildi.')
    setNoticeIsSuccess(true)
  }

  const applySettingsTheme = (themeId) => {
    const safeTheme = sanitizeNavTheme(themeId)
    setNavTheme(safeTheme)
    setSettingsThemeModalOpen(false)
    const themeLabel =
      PROFILE_THEME_OPTIONS.find((entry) => entry.id === safeTheme)?.label || 'Tema'
    setNotice(`${themeLabel} aktif edildi.`)
    setNoticeIsSuccess(true)
  }

  const promptStaffReason = (title) => {
    const raw = String(
      typeof window !== 'undefined'
        ? window.prompt(`${title} (en az 3 karakter):`, '') || ''
        : '',
    ).trim()
    if (!raw) return { cancelled: true, value: '' }
    if (raw.length < 3) {
      setError('Neden en az 3 karakter olmalı.')
      return { cancelled: false, value: '' }
    }
    return { cancelled: false, value: raw.slice(0, 160) }
  }

  const promptStaffDurationHours = (title, defaultHours = 1) => {
    const raw = String(
      typeof window !== 'undefined'
        ? window.prompt(`${title} (saat):`, String(defaultHours)) || ''
        : '',
    ).trim()
    if (!raw) return { cancelled: true, value: 0 }
    const hours = Math.max(0, Math.trunc(num(raw)))
    if (hours <= 0) {
      setError('Süre saat cinsinden 1 veya daha büyük olmalı.')
      return { cancelled: false, value: 0 }
    }
    return { cancelled: false, value: hours * 60 }
  }

  const staffDeleteChatMessageAction = async (message) => {
    if (!isStaffUser || busy) return
    const messageId = String(message?.id || '').trim()
    if (!messageId) return

    setBusy('staff-chat-delete')
    const response = await moderateDeleteChatMessage(messageId, CHAT_ROOM, '')
    setBusy('')
    if (!response?.success) return fail(response, 'Sohbet mesajı silinemedi.')
    setNotice(response.message || 'Sohbet mesajı silindi.')
    await Promise.all([
      loadChatRoom(CHAT_ROOM),
      loadMessageCenter(messageFilterRef.current || 'all'),
    ])
  }

  const staffBlockMessagesAction = async (message) => {
    if (!isStaffUser || busy) return
    const targetUserId = String(message?.userId || '').trim()
    const targetLookup = String(message?.u || '').trim()
    if (!targetUserId || !targetLookup) {
      setError('Hedef kullanıcı bilgisi bulunamadı.')
      return
    }
    const minutesPrompt = promptStaffDurationHours('Mesaj engeli süresi', 2)
    if (minutesPrompt.cancelled) return
    if (!minutesPrompt.value) return
    const reasonPrompt = promptStaffReason('Mesaj engeli nedeni')
    if (reasonPrompt.cancelled) return
    if (!reasonPrompt.value) return

    setBusy('staff-message-block')
    const response = await moderateBlockMessages(
      targetUserId,
      targetLookup,
      minutesPrompt.value,
      reasonPrompt.value,
    )
    setBusy('')
    if (!response?.success) return fail(response, 'Mesaj engeli uygulanamadı.')
    setNotice(response.message || 'Kullanıcıya mesaj engeli uygulandı.')
    await Promise.all([
      loadChatRoom(CHAT_ROOM),
      loadMessageCenter(messageFilterRef.current || 'all'),
    ])
  }

  const staffDeleteDirectMessageAction = async (entry) => {
    if (!isStaffUser || busy) return
    const messageId = String(entry?.id || '').trim()
    if (!messageId || String(messageId).startsWith('dm-local-')) return

    setBusy('staff-dm-delete')
    const response = await moderateDeleteDirectMessage(messageId, '')
    setBusy('')
    if (!response?.success) return fail(response, 'DM mesajı silinemedi.')
    setNotice(response.message || 'DM mesajı silindi.')
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      messageReplyTargetRef.current?.username
        ? loadDirectMessageThread(messageReplyTargetRef.current.username)
        : Promise.resolve(true),
    ])
  }

  const openChatReportModal = (message, resolvedRole = '') => {
    const messageId = String(message?.id || '').trim()
    const targetUserId = String(message?.userId || '').trim()
    const targetUsername = String(message?.u || '').trim()
    const text = String(message?.t || '').replace(/\s+/g, ' ').trim()
    const isOwnMessage = Boolean(message?.own)
    const targetRole = normalizeRoleValue(resolvedRole || message?.userRole || 'player')

    if (targetRole === 'admin') {
      setError('Admin kullanıcıları raporlanamaz.')
      return
    }
    if (!messageId || !targetUserId || !targetUsername || !text || isOwnMessage) return
    setChatReportModal({
      messageId,
      room: CHAT_ROOM,
      targetUserId,
      targetUsername,
      text: text.slice(0, 280),
    })
  }

  const closeChatReportModal = () => {
    if (busy === 'chat-report') return
    setChatReportModal(null)
  }

  const submitChatReportAction = async () => {
    if (!chatReportModal || busy) return
    const messageId = String(chatReportModal?.messageId || '').trim()
    if (!messageId) return

    setBusy('chat-report')
    const response = await reportChatMessage(messageId, chatReportModal.room || CHAT_ROOM)
    setBusy('')
    if (!response?.success) return fail(response, 'Mesaj bildirimi gönderilemedi.')

    setChatReportModal(null)
    setNotice(response.message || 'Mesaj yetkililere bildirildi.')
  }

  const openDmReportModal = () => {
    if (busy) return
    const targetUserId = String(messageReplyTarget?.userId || '').trim()
    const targetUsername = String(messageReplyTarget?.username || '').trim()
    const targetRole = normalizeRoleValue(messageReplyTarget?.role || 'player')
    if (!targetUserId || !targetUsername) {
      setError('Bildirim hedefi bulunamadı.')
      return
    }
    if (targetRole === 'admin') {
      setError('Admin kullanıcıları raporlanamaz.')
      return
    }

    const reportableMessages = (Array.isArray(messageThread) ? messageThread : [])
      .filter((entry) => entry && typeof entry === 'object')
      .filter((entry) => !entry.own)
      .map((entry) => {
        const id = String(entry?.id || '').trim()
        const text = String(entry?.text || '').replace(/\s+/g, ' ').trim()
        const createdAt = String(entry?.createdAt || '').trim()
        const at = String(entry?.at || '').trim()
        const isLocal = id.startsWith('dm-local-')
        return {
          id,
          text,
          createdAt,
          at,
          isLocal,
          label: `${at || '--:--'} - ${text.slice(0, 80)}`,
        }
      })
      .filter((entry) => entry.id && entry.text && !entry.isLocal)

    if (!reportableMessages.length) {
      setError('Bildirmek için seçilebilir mesaj bulunamadı.')
      return
    }

    const defaultMessage = reportableMessages[reportableMessages.length - 1]
    setDmReportModal({
      targetUserId,
      targetUsername,
      messages: reportableMessages,
      selectedMessageId: defaultMessage.id,
      reason: '',
    })
  }

  const closeDmReportModal = () => {
    if (busy === 'dm-report') return
    setDmReportModal(null)
  }

  const submitDmReportAction = async () => {
    if (!dmReportModal || busy) return
    const selectedMessageId = String(dmReportModal?.selectedMessageId || '').trim()
    const reason = String(dmReportModal?.reason || '').replace(/\s+/g, ' ').trim()

    if (!selectedMessageId) {
      setError('Bildirim için bir mesaj seçmelisin.')
      return
    }
    if (reason.length < 5) {
      setError('Şikâyet açıklaması en az 5 karakter olmalı.')
      return
    }

    setBusy('dm-report')
    const response = await reportDirectMessage(selectedMessageId, reason)
    setBusy('')
    if (!response?.success) return fail(response, 'DM bildirimi gönderilemedi.')

    setDmReportModal(null)
    setNotice(response.message || 'DM bildirimi yetkililere iletildi.')
    setNoticeIsSuccess(true)
  }

  const _sendChat = (event) => {
    event.preventDefault()
    if (MESSAGES_DISABLED) {
      setError('Sohbet mesajları geçici olarak kapalı.')
      return
    }
    const text = chatInput.trim()
    if (!text) return
    if (chatMuteActive) {
      setError(`Mesaj engelin aktif: ${chatMuteReasonLabel}. Kalan süre: ${formatCountdownTr(chatMuteRemainingMs)}.`)
      return
    }
    if (chatBlockActive) {
      setError(`Sohbet engelin aktif: ${chatBlockReasonLabel}. Kalan süre: ${formatCountdownTr(chatBlockRemainingMs)}.`)
      return
    }
    if (chatCooldownActive) {
      setError(`Yeni mesaj için ${Math.max(1, Math.ceil(chatCooldownRemainingMs / 1000))} saniye beklemelisin.`)
      return
    }
    const replyToId = String(chatReplyTarget?.id || '').trim()
    if (chatSocketRef.current?.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(
        JSON.stringify({
          type: 'send',
          room: CHAT_ROOM,
          text,
          replyToId: replyToId || undefined,
        }),
      )
      setChatInput('')
      setChatReplyTarget(null)
      return
    }

    void (async () => {
      const response = await sendChatRoomMessage(CHAT_ROOM, text, {
        replyToId,
      })
      if (!response?.success) {
        applyChatRestrictions(response?.chatState)
        fail(response, 'Mesaj g\u00f6nderilemedi.')
        return
      }
      applyChatRestrictions(response?.chatState)
      setChatInput('')
      setChatReplyTarget(null)
      await loadChatRoom(CHAT_ROOM)
    })()
  }

  const _openChatReply = (message) => {
    if (MESSAGES_DISABLED) return
    const safeId = String(message?.id || '').trim()
    if (!safeId) return
    const username = String(message?.u || 'Oyuncu').trim() || 'Oyuncu'
    const avatarSource = String(message?.avatar || DEFAULT_CHAT_AVATAR).trim() || DEFAULT_CHAT_AVATAR
    setChatReplyTarget({
      id: safeId,
      username,
      preview: chatSnippet(message?.t, 90),
      avatar: avatarSource,
      initial: username.slice(0, 1).toUpperCase(),
    })
  }

  const _clearChatReply = () => {
    setChatReplyTarget(null)
  }

  const _jumpToChatMessage = (messageId) => {
    const safeId = String(messageId || '').trim()
    if (!safeId) return
    const target = chatMessageRefs.current[safeId]
    if (!target) return
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    target.classList.remove('chat-jump-flash')
    void target.offsetWidth
    target.classList.add('chat-jump-flash')
  }

  const _openReplyToMessage = (item) => {
    if (MESSAGES_DISABLED) return
    const username = String(item?.counterpart?.username || '').trim()
    if (!username) return
    const rawReplyId = String(item?.id || '').replace(/^dm:/, '').trim()
    const avatarUrl = String(item?.counterpart?.avatarUrl || '').trim()
    const levelLabel = item?.counterpart?.levelLabel || ''
    const roleLabel = item?.counterpart?.roleLabel || ''
    const target = {
      userId: item?.counterpart?.userId || null,
      username,
      replyToId: rawReplyId || null,
      avatarUrl: avatarUrl || '',
      level: item?.counterpart?.level ?? null,
      levelLabel: levelLabel || '',
      role: item?.counterpart?.role || 'player',
      roleLabel: roleLabel || '',
      premium: Boolean(item?.counterpart?.premium),
      seasonBadge: item?.counterpart?.seasonBadge || null,
      relationship: item?.relationship || null,
      moderation: normalizeUserModeration(messageCenter?.moderation),
    }
    setMessageReplyTarget(target)
    messageReplyTargetRef.current = target
    setMessageForm((prev) => ({ ...prev, toUsername: username }))
    setNotice(`${username} için cevap penceresi hazır.`)
    void loadDirectMessageThread(username)
    if (item?.id) {
      void _readMessageItemAction(item.id)
    }
  }

  const _clearReplyTarget = () => {
    setMessageReplyTarget(null)
    messageReplyTargetRef.current = null
    setDmReportModal(null)
  }

  const _readMessageItemAction = async (itemId) => {
    if (MESSAGES_DISABLED) {
      setError('Mesaj merkezi geçici olarak kapalı.')
      return
    }
    const safeId = String(itemId || '').trim()
    if (!safeId || busy) return
    setBusy(`read-message:${safeId}`)
    const response = await markMessageCenterItemRead(safeId)
    setBusy('')
    if (!response?.success) return fail(response, 'Mesaj okundu olarak işaretlenemedi.')
    const targetFilter = String(messageFilterRef.current || messageFilter || 'all').trim().toLowerCase() || 'all'
    await loadMessageCenter(targetFilter)
  }

  const _sendFriendRequestAction = async () => {
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy('social:friend-request')
    const response = await sendFriendRequestToUser(targetUserId)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Arkadaşlık isteği gönderilemedi.')
    setNotice(response.message || 'Arkadaşlık isteği gönderildi.')
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      if (!prevUserId || prevUserId !== targetUserId) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _respondFriendRequestAction = async (requestId, action) => {
    const safeRequestId = String(requestId || '').trim()
    const safeAction = String(action || '').trim().toLowerCase()
    if (!safeRequestId || !['accept', 'reject', 'cancel'].includes(safeAction) || busy) return
    setBusy(`social:friend-request:${safeAction}:${safeRequestId}`)
    const response = await respondFriendRequest(safeRequestId, safeAction)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Arkadaşlık isteği yanıtlanamadı.')
    setNotice(response.message || 'Arkadaşlık isteği güncellendi.')
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _removeFriendAction = async () => {
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy('social:friend-remove')
    const response = await removeFriendFromUser(targetUserId)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Arkadaş kaldırılamadı.')
    setNotice(response.message || 'Arkadaş listenden kaldırıldı.')
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      if (!prevUserId || prevUserId !== targetUserId) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _toggleBlockAction = async (shouldBlock) => {
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    const targetUsername = String(profileModalData?.username || '').trim().toLowerCase()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy(`social:block:${shouldBlock ? 'on' : 'off'}`)
    const response = await setUserBlocked(targetUserId, shouldBlock)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Engel durumu güncellenemedi.')
    setNotice(response.message || (shouldBlock ? 'Kullanıcı engellendi.' : 'Kullanıcı engeli kaldırıldı.'))
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      if (!prevUserId || prevUserId !== targetUserId) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    setMessageReplyTarget((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      const prevUsername = String(prev.username || '').trim().toLowerCase()
      const matchesById = Boolean(prevUserId && prevUserId === targetUserId)
      const matchesByUsername = Boolean(targetUsername && prevUsername && prevUsername === targetUsername)
      if (!matchesById && !matchesByUsername) return prev
      const next = {
        ...prev,
        userId: prev.userId || targetUserId || null,
        relationship: response.relationship || prev.relationship || null,
      }
      messageReplyTargetRef.current = next
      return next
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _toggleBlockByMessageTargetAction = async (shouldBlock) => {
    const targetUserId = String(messageReplyTarget?.userId || '').trim()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy(`social:dm-block:${shouldBlock ? 'on' : 'off'}`)
    const response = await setUserBlocked(targetUserId, shouldBlock)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Engel durumu güncellenemedi.')
    setNotice(response.message || (shouldBlock ? 'Kullanıcı engellendi.' : 'Kullanıcı engeli kaldırıldı.'))
    setNoticeIsSuccess(true)
    setMessageReplyTarget((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
      messageReplyTargetRef.current = next
      return next
    })
    await loadMessageCenter(messageFilterRef.current || 'all')
  }

  const _sendDirectMessageAction = async (event) => {
    event.preventDefault()
    if (MESSAGES_DISABLED) {
      setError('Mesaj gönderimi geçici olarak kapalı.')
      return
    }
    if (busy) return
    const toUsername = String(messageReplyTarget?.username || messageForm.toUsername || '').trim()
    const text = String(messageForm.text || '').trim()
    if (!toUsername || !text) {
      setError('Alıcı kullanıcı adı ve mesaj metni gerekli.')
      return
    }
    if (dmMessageBlockActive) {
      setError(
        `DM mesaj engelin aktif: ${dmMessageBlockReasonLabel}. Bitiş: ${dmMessageBlockEndLabel || '-'}. Kalan süre: ${formatCountdownTr(dmMessageBlockRemainingMs)}.`,
      )
      return
    }
    if (messageReplyTarget?.relationship?.blockedByMe) {
      setError('Engellediğin kullanıcıya mesaj gönderemezsin.')
      return
    }
    if (messageReplyTarget?.relationship?.blockedMe) {
      setError('Bu kullanıcı seni engellediği için mesaj gönderemezsin.')
      return
    }

    const now = new Date()
    const optimisticId = `dm-local-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticCreatedAt = now.toISOString()
    const optimisticEntry = {
      id: optimisticId,
      text,
      own: true,
      at: formatHourMinuteTurkey(optimisticCreatedAt),
      createdAt: optimisticCreatedAt,
      readAt: optimisticCreatedAt,
      counterpart: {
        userId: messageReplyTarget?.userId || null,
        username: toUsername,
        avatarUrl: messageReplyTarget?.avatarUrl || '',
      },
    }

    setMessageThread((prev) => [...prev, optimisticEntry])
    setMessageForm((prev) => ({ ...prev, toUsername, text: '' }))
    setBusy('message-send')
    setError('')
    const response = await sendDirectMessageToUser({
      toUsername,
      text,
      subject: messageReplyTarget ? 'Cevap' : 'Mesaj',
      replyToId: messageReplyTarget?.replyToId || '',
    })
    setBusy('')
    if (!response?.success) {
      setMessageThread((prev) => prev.filter((entry) => entry?.id !== optimisticId))
      if (messageReplyTargetRef.current?.username) {
        void loadDirectMessageThread(messageReplyTargetRef.current.username)
      }
      return fail(response, 'Mesaj gönderilemedi.')
    }

    setNotice(response.message || 'Mesaj gönderildi.')
    await loadMessageCenter(messageFilter)
    if (messageReplyTargetRef.current?.username) {
      void loadDirectMessageThread(messageReplyTargetRef.current.username)
    }
  }

  const _sendProfileTeklif = async (toUsername, offerTargetLabel) => {
    if (MESSAGES_DISABLED || !toUsername) return
    const safeUsername = String(toUsername).trim()
    if (!safeUsername) return

    const safeOfferTargetLabel = String(offerTargetLabel || '').trim() || 'varlığınız'
    setProfileTeklifSending(true)
    try {
      setProfileModalUserId(null)
      setProfileModalBusinessExpand(null)
      setGaragePanel((p) => ({ ...p, open: false }))

      const text = `Merhaba, ${safeOfferTargetLabel} için teklif vermek istiyorum. Uygunsa fiyat paylaşır mısınız?`
      const target = {
        username: safeUsername,
        replyToId: null,
        avatarUrl: '',
        levelLabel: '',
        roleLabel: '',
        seasonBadge: null,
        userId: null,
      }
      setMessageReplyTarget(target)
      messageReplyTargetRef.current = target
      setMessageForm((prev) => ({ ...prev, toUsername: safeUsername, text }))
      setMessageViewTab('mesajlar')
      setMessageFilter('message')
      await openTab('messages', { messageFilter: 'message' })
      await loadMessageCenter('message')
      void loadDirectMessageThread(safeUsername)
    } finally {
      setProfileTeklifSending(false)
    }
  }

  const name = overview?.profile?.username || user?.username || 'Oyuncu'
  const lv = overview?.profile?.levelInfo || { level: 1, currentXp: 0, nextLevelXp: 500, progressPercent: 0 }
  const playerLevelNow = Math.max(1, Math.trunc(num(lv?.level || overview?.profile?.levelInfo?.level || 1)))
  const isPlayerMaxLevel = Boolean(lv?.isMaxLevel) || playerLevelNow >= 1000
  const liveNowMs = chatClockMs
  const companyUnlock = business?.companyUnlock || {}
  const companyUpgrade = companyUnlock.upgrade || null
  const logisticsUnlocked = companyUnlock.logisticsUnlocked === true || logistics?.unlocked === true
  const nextCompanyUnlock = companyUnlock.nextUnlock || null
  const companyUnlockFlowRaw = Array.isArray(companyUnlock.flow) ? companyUnlock.flow : []
  const businesses = business?.businesses || []
  const unlockedBusinesses = businesses.filter((entry) => entry?.unlocked !== false)
  const selectedBusiness = unlockedBusinesses.find((entry) => entry.id === selectedBusinessId) || unlockedBusinesses[0] || null
  const selectedBusinessMeta = FLEET_CARD_META[selectedBusiness?.templateId] || null
  const companyLegalLabel = `${name} Ltd. Şti.`
  const selectedBusinessHeaderTitle = selectedBusinessMeta?.label || selectedBusiness?.name || 'Kiralama İşletmesi'
  const selectedBusinessMarketTitle = selectedBusinessMeta?.marketTitle || 'İkinci El Pazarı'
  const selectedBusinessGalleryTitle = selectedBusinessMeta?.galleryTitle
    || (selectedBusiness?.templateId === 'moto-rental'
      ? 'Sıfır Motor Siparişi'
      : selectedBusiness?.templateId === 'property-rental'
        ? 'Yeni Mülk Siparişi'
        : 'Sıfır Araba Siparişi')
  const selectedBusinessFuelMeta = fuelItemMeta(
    selectedBusiness?.fuelItemId || (selectedBusiness?.templateId === 'property-rental' ? 'energy' : 'oil'),
  )
  const ownedTabLabel = selectedBusinessMeta?.ownedTitle
    || (selectedBusiness?.templateId === 'logistics' ? 'Tırlarım' : 'Varlıklarım')
  const logisticsTruckCatalog = sortByTruckCostAsc(logistics?.logisticsFleet?.catalog || [])
  const allVehicleListings = Array.isArray(business?.vehicleListings) ? business.vehicleListings : []
  const vehicleListingById = new Map(
    allVehicleListings
      .map((entry) => {
        const id = String(entry?.id || '').trim()
        if (!id) return null
        return [id, entry]
      })
      .filter(Boolean),
  )
  const allMyVehicleListings = Array.isArray(business?.myVehicleListings) ? business.myVehicleListings : []
  const myListingIdSet = new Set(
    allMyVehicleListings
      .map((entry) => String(entry?.id || '').trim())
      .filter(Boolean),
  )
  const selectedBusinessListings = allVehicleListings.filter(
    (entry) => entry.templateId === selectedBusiness?.templateId,
  )
  const selectedMyListings = allMyVehicleListings.filter(
    (entry) => entry.templateId === selectedBusiness?.templateId,
  )
  const logisticsMarketRowsSource = allVehicleListings
    .filter((entry) => entry.templateId === 'logistics')
    .map((entry) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry.price))),
      marketIncome: Math.max(1, Math.round(num(entry.rentPerHour))),
      marketLevel: Math.max(1, Math.round(num(entry.requiredLevel || 1))),
      commissionRate: Math.max(0, num(entry?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
      commissionAmount: Math.max(
        0,
        Math.trunc(
          num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE)),
        ),
      ),
      totalCost: Math.max(
        1,
        Math.trunc(
          num(
            entry?.totalCost ||
            Math.max(1, Math.round(num(entry.price))),
          ),
        ),
      ),
      sellerPayout: Math.max(
        0,
        Math.trunc(
          num(
            entry?.sellerPayout ||
            (
              Math.max(1, Math.round(num(entry.price))) -
              Math.max(
                0,
                Math.trunc(num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE))),
              )
            ),
          ),
        ),
      ),
      capacity: Math.max(1, Math.round(num(entry.capacity || 1))),
      upkeep: Math.max(1, Math.round(num(entry.upkeepPerRun || 1))),
      isMine: myListingIdSet.has(String(entry?.id || '').trim()),
    }))
    .sort((a, b) =>
      num(a.marketPrice) - num(b.marketPrice) ||
      num(a.marketLevel) - num(b.marketLevel) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )
  const selectedVehicleCatalogBase = selectedBusiness?.vehicleCatalog || []
  const selectedVehicleCatalog =
    selectedBusiness && selectedBusiness.fleetCount >= selectedVehicleCatalogBase.length && selectedBusiness.nextVehicle
      ? [...selectedVehicleCatalogBase, selectedBusiness.nextVehicle]
      : selectedVehicleCatalogBase
  const selectedCatalogModelOptions = [...new Set(
    selectedVehicleCatalog
      .map((vehicle) => String(vehicle?.name || '').trim())
      .filter(Boolean),
  )]
  const selectedMarketModelOptions = [...new Set(
    [...selectedCatalogModelOptions, ...selectedBusinessListings.map((vehicle) => String(vehicle?.name || '').trim())]
      .filter(Boolean),
  )]
  const logisticsCatalogModelOptions = [...new Set(
    logisticsTruckCatalog
      .map((truck) => String(truck?.name || '').trim())
      .filter(Boolean),
  )]
  const logisticsMarketModelOptions = [...new Set(
    [...logisticsCatalogModelOptions, ...logisticsMarketRowsSource.map((entry) => String(entry?.name || '').trim())]
      .filter(Boolean),
  )]
  const filterInLogisticsMarket = businessScene === 'logistics' && logisticsScene === 'market'
  const activeMarketModelOptions = filterInLogisticsMarket ? logisticsMarketModelOptions : selectedMarketModelOptions
  const activeModelFilter = activeMarketModelOptions.includes(String(marketFilterForm.model || 'all'))
    ? String(marketFilterForm.model || 'all')
    : 'all'
  const selectedBuildRows = sortByVehicleCostAsc(selectedVehicleCatalog)
  const selectedMarketRows = selectedBusinessListings
    .map((vehicle, index) => ({
      ...vehicle,
      marketPrice: Math.max(1, Math.round(num(vehicle.price))),
      marketIncome: Math.max(1, Math.round(num(vehicle.rentPerHour))),
      marketLevel: Math.max(1, num(vehicle.requiredLevel) || index + 1),
      commissionRate: Math.max(0, num(vehicle?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
      commissionAmount: Math.max(
        0,
        Math.trunc(
          num(vehicle?.commissionAmount || Math.floor(Math.max(1, Math.round(num(vehicle.price))) * VEHICLE_MARKET_COMMISSION_RATE)),
        ),
      ),
      totalCost: Math.max(
        1,
        Math.trunc(
          num(
            vehicle?.totalCost ||
            Math.max(1, Math.round(num(vehicle.price))),
          ),
        ),
      ),
      sellerPayout: Math.max(
        0,
        Math.trunc(
          num(
            vehicle?.sellerPayout ||
            (
              Math.max(1, Math.round(num(vehicle.price))) -
              Math.max(
                0,
                Math.trunc(num(vehicle?.commissionAmount || Math.floor(Math.max(1, Math.round(num(vehicle.price))) * VEHICLE_MARKET_COMMISSION_RATE))),
              )
            ),
          ),
        ),
      ),
      isMine: myListingIdSet.has(String(vehicle?.id || '').trim()),
    }))
    .filter((vehicle) => {
      const modelValue = String(vehicle?.name || '').trim()
      const modelOk = activeModelFilter === 'all' || modelValue === activeModelFilter
      const minPriceOk = !marketFilterForm.minPrice || num(vehicle.marketPrice) >= num(marketFilterForm.minPrice)
      const maxPriceOk = !marketFilterForm.maxPrice || num(vehicle.marketPrice) <= num(marketFilterForm.maxPrice)
      const minLevelOk = !marketFilterForm.minLevel || num(vehicle.marketLevel) >= num(marketFilterForm.minLevel)
      const maxLevelOk = !marketFilterForm.maxLevel || num(vehicle.marketLevel) <= num(marketFilterForm.maxLevel)
      return modelOk && minPriceOk && maxPriceOk && minLevelOk && maxLevelOk
    })
    .sort((a, b) =>
      num(a.marketPrice) - num(b.marketPrice) ||
      num(a.marketLevel) - num(b.marketLevel) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )
  const selectedMarketPublicRows = selectedMarketRows.filter(
    (vehicle) =>
      !myListingIdSet.has(String(vehicle?.id || '').trim()) &&
      String(vehicle?.visibility || 'public').trim().toLowerCase() === 'public',
  )
  const logisticsMarketListings = logisticsMarketRowsSource
    .filter((vehicle) => {
      const modelValue = String(vehicle?.name || '').trim()
      const modelOk = activeModelFilter === 'all' || modelValue === activeModelFilter
      const minPriceOk = !marketFilterForm.minPrice || num(vehicle.marketPrice) >= num(marketFilterForm.minPrice)
      const maxPriceOk = !marketFilterForm.maxPrice || num(vehicle.marketPrice) <= num(marketFilterForm.maxPrice)
      const minLevelOk = !marketFilterForm.minLevel || num(vehicle.marketLevel) >= num(marketFilterForm.minLevel)
      const maxLevelOk = !marketFilterForm.maxLevel || num(vehicle.marketLevel) <= num(marketFilterForm.maxLevel)
      return modelOk && minPriceOk && maxPriceOk && minLevelOk && maxLevelOk
    })
    .sort((a, b) =>
      num(a.marketPrice) - num(b.marketPrice) ||
      num(a.marketLevel) - num(b.marketLevel) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )
  const logisticsPublicListings = logisticsMarketListings.filter(
    (entry) =>
      !myListingIdSet.has(String(entry?.id || '').trim()) &&
      String(entry?.visibility || 'public').trim().toLowerCase() === 'public',
  )

  const privateCustomFleetRows = allVehicleListings
    .filter((entry) => {
      const visibility = String(entry?.visibility || 'public').trim().toLowerCase()
      const templateId = String(entry?.templateId || '').trim()
      if (visibility !== 'custom') return false
      if (templateId === 'logistics') return false
      return !myListingIdSet.has(String(entry?.id || '').trim())
    })
    .map((entry, index) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry?.price || 0))),
      marketIncome: Math.max(1, Math.round(num(entry?.rentPerHour || 0))),
      marketLevel: Math.max(1, Math.trunc(num(entry?.requiredLevel || 1) || index + 1)),
    }))
    .sort(
      (a, b) =>
        num(a.marketPrice) - num(b.marketPrice) ||
        num(a.marketLevel) - num(b.marketLevel) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )

  const privateCustomLogisticsRows = allVehicleListings
    .filter((entry) => {
      const visibility = String(entry?.visibility || 'public').trim().toLowerCase()
      const templateId = String(entry?.templateId || '').trim()
      if (visibility !== 'custom') return false
      if (templateId !== 'logistics') return false
      return !myListingIdSet.has(String(entry?.id || '').trim())
    })
    .map((entry) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry?.price || 0))),
      marketIncome: Math.max(1, Math.round(num(entry?.rentPerHour || 0))),
      marketLevel: Math.max(1, Math.trunc(num(entry?.requiredLevel || entry?.levelRequired || 1) || 1)),
    }))
    .sort(
      (a, b) =>
        num(a.marketPrice) - num(b.marketPrice) ||
        num(a.marketLevel) - num(b.marketLevel) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )

  const logisticsMyListings = allMyVehicleListings
    .filter((entry) => entry.templateId === 'logistics')
    .map((entry) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry.price))),
      marketIncome: Math.max(1, Math.round(num(entry.rentPerHour))),
      marketLevel: Math.max(1, Math.round(num(entry.requiredLevel || 1))),
      commissionRate: Math.max(0, num(entry?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
      commissionAmount: Math.max(
        0,
        Math.trunc(
          num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE)),
        ),
      ),
      totalCost: Math.max(
        1,
        Math.trunc(
          num(
            entry?.totalCost ||
            Math.max(1, Math.round(num(entry.price))),
          ),
        ),
      ),
      sellerPayout: Math.max(
        0,
        Math.trunc(
          num(
            entry?.sellerPayout ||
            (
              Math.max(1, Math.round(num(entry.price))) -
              Math.max(
                0,
                Math.trunc(num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE))),
              )
            ),
          ),
        ),
      ),
      capacity: Math.max(1, Math.round(num(entry.capacity || 1))),
      upkeep: Math.max(1, Math.round(num(entry.upkeepPerRun || 1))),
      isMine: true,
    }))
    .sort(
      (a, b) =>
        new Date(String(b?.listedAt || '')).getTime() -
        new Date(String(a?.listedAt || '')).getTime(),
    )
  const detailVehicles = sortByVehicleIncomeDesc(selectedBusiness?.vehicles || [])
  const detailVehicleIdSet = new Set(detailVehicles.map((vehicle) => String(vehicle?.id || '').trim()))
  const listedDetailVehicles = selectedMyListings
    .map((vehicle) => ({
      ...vehicle,
      id: String(vehicle?.vehicleId || vehicle?.id || '').trim() || String(vehicle?.id || '').trim(),
      isListed: true,
      listingId: String(vehicle?.id || '').trim(),
      requiredLevel: Math.max(1, Math.trunc(num(vehicle?.requiredLevel || 1))),
      rentPerHour: Math.max(1, Math.trunc(num(vehicle?.rentPerHour || 0))),
      xp: Math.max(1, Math.trunc(num(vehicle?.xp || 0))),
      tier: ['standard', 'rare', 'luxury'].includes(String(vehicle?.tier || '').trim())
        ? String(vehicle?.tier || '').trim()
        : 'standard',
    }))
    .filter((vehicle) => String(vehicle.id || '').trim() && !detailVehicleIdSet.has(String(vehicle.id || '').trim()))
  const detailVehiclesView = [...detailVehicles, ...listedDetailVehicles]
  const selectedCollectRemainingMs = remainingMsFromIso(selectedBusiness?.nextCollectAt || '', liveNowMs)
  const selectedOrderRemainingMs = remainingMsFromIso(selectedBusiness?.nextVehicleOrderAt || '', liveNowMs)
  const _selectedCollectCountdown = selectedCollectRemainingMs > 0 ? formatCollectionCountdown(selectedCollectRemainingMs) : 'Hazır'
  const selectedCollectCooldownLabel = selectedCollectRemainingMs > 0 ? formatCollectionCountdown(selectedCollectRemainingMs) : ''
  const selectedOrderCountdown = selectedOrderRemainingMs > 0 ? formatCountdownClock(selectedOrderRemainingMs) : 'Hazır'
  const selectedUnlockedModelLevel = Math.max(1, num(selectedBusiness?.vehicleOrderUnlockLevel || selectedBusiness?.level || 1))
  const unlockedModelLevelByTemplate = unlockedBusinesses.reduce((acc, entry) => {
    const templateId = String(entry?.templateId || '').trim()
    if (!templateId) return acc
    const unlockedLevel = Math.max(1, Math.trunc(num(entry?.vehicleOrderUnlockLevel || entry?.level || 1)))
    const previousLevel = Math.max(1, Math.trunc(num(acc[templateId] || 1)))
    acc[templateId] = Math.max(previousLevel, unlockedLevel)
    return acc
  }, {})
  const unlockedFleetTemplateIdSet = new Set(
    unlockedBusinesses
      .map((entry) => String(entry?.templateId || '').trim())
      .filter(Boolean),
  )
  const selectedHasCapacityForOrder = Boolean(selectedBusiness) &&
    num(selectedBusiness?.fleetCount) < num(selectedBusiness?.fleetCapacity)
  const selectedCollectLocked = Boolean(selectedBusiness) &&
    num(selectedBusiness?.fleetCount) > 0 &&
    selectedCollectRemainingMs > 0
  const selectedCanOrderNow = Boolean(selectedBusiness) &&
    selectedHasCapacityForOrder &&
    selectedOrderRemainingMs <= 0
  const logisticsOrderRemainingMs = remainingMsFromIso(
    logistics?.logisticsFleet?.summary?.nextTruckOrderAt || '',
    liveNowMs,
  )
  const logisticsOrderCountdown = logisticsOrderRemainingMs > 0
    ? formatCountdownClock(logisticsOrderRemainingMs)
    : 'Hazır'
  const logisticsUnlockedModelLevel = Math.max(
    1,
    num(
      logistics?.logisticsFleet?.summary?.truckOrderUnlockLevel ||
      logistics?.logisticsFleet?.summary?.vehicleOrderUnlockLevel ||
      logistics?.logisticsFleet?.summary?.level ||
      overview?.profile?.levelInfo?.level ||
      1,
    ),
  )
  const canOrderTruckNow = logistics?.logisticsFleet?.summary?.canOrderTruckNow === true
  const logisticsCollectRemainingMs = remainingMsFromIso(
    logistics?.collectPreview?.nextCollectAt || '',
    liveNowMs,
  )
  const logisticsCollectLocked =
    Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0))) > 0 &&
    logisticsCollectRemainingMs > 0
  const logisticsCollectCountdown = logisticsCollectRemainingMs > 0
    ? formatCollectionCountdown(logisticsCollectRemainingMs)
    : 'Hazır'
  const listingDraftLiveLifetime = listingDraft
    ? resolveVehicleLifetime(listingDraft, liveNowMs)
    : null
  const listingDraftIsListed = Boolean(listingDraft?.isListed)
  const listingDraftSafeListingId = String(listingDraft?.listingId || '').trim()
  const listingDraftCancelBusyKey = listingDraftSafeListingId
    ? `cancel-listing:${listingDraftSafeListingId}`
    : ''
  const logisticsViewIsDetail = logisticsScene === 'detail'
  const logisticsViewIsMarket = logisticsScene === 'market'
  const logisticsViewIsGallery = logisticsScene === 'gallery'
  const fleetHelpLabel = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'Tır Kiralama'
    : (selectedBusinessMeta?.label || selectedBusiness?.name || 'Kiralama İşletmesi')
  const fleetHelpUnit = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'tır'
    : (selectedBusinessMeta?.unitLabel || 'araç').toLowerCase()
  const fleetHelpSecondHandLabel = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'İkinci El Tır Pazarı'
    : (selectedBusinessMeta?.secondHandLabel || 'İkinci El Pazarı')
  const fleetHelpOrderLabel = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'Sıfır Tır Siparişi'
    : (selectedBusinessMeta?.newOrderLabel || 'Sıfır Araba Siparişi')
  const logisticsScreenSectionTitle = logisticsViewIsGallery
    ? 'Sıfır Tır Siparişi'
    : logisticsViewIsMarket
      ? 'İkinci El Tır Pazarı'
      : 'Tır Kiralama'
  const unlockedTemplateIds = Array.isArray(companyUnlock.unlockedFleetTemplates)
    ? companyUnlock.unlockedFleetTemplates
    : []
  const companyLevel = Math.max(1, Math.trunc(num(companyUnlock.companyLevel || 1)))
  const companyBusinessCount = unlockedBusinesses.length + (logisticsUnlocked ? 1 : 0)
  const companyBootstrapped = companyBusinessCount > 0
  const companyBusinessLimit = Math.max(3, Math.trunc(num(companyUnlockFlowRaw.length || 3)))
  const upgradeAnchorBusinessId = selectedBusiness?.id || businesses[0]?.id || ''
  const walletNow = Math.max(0, Math.trunc(num(overview?.profile?.wallet || 0)))
  const marketDetailLiveLifetime = marketDetailDraft
    ? resolveVehicleLifetime(marketDetailDraft, liveNowMs)
    : null
  const marketDetailTemplateId = String(marketDetailDraft?.templateId || '').trim()
  const marketDetailRequiredLevel = Math.max(
    1,
    Math.trunc(num(marketDetailDraft?.marketLevel || marketDetailDraft?.requiredLevel || 1)),
  )
  const marketDetailIsLogistics = marketDetailTemplateId === 'logistics'
  const marketDetailHasBusinessAccess = marketDetailIsLogistics
    ? logisticsUnlocked
    : unlockedFleetTemplateIdSet.has(marketDetailTemplateId)
  const marketDetailLevelCurrent = marketDetailIsLogistics
    ? playerLevelNow
    : Math.max(1, Math.trunc(num(unlockedModelLevelByTemplate[marketDetailTemplateId] || 1)))
  const marketDetailLevelCurrentLabel = marketDetailIsLogistics
    ? 'Oyuncu Seviyen'
    : 'Açılan Model Seviyen'
  const marketDetailBusinessLabel = marketDetailIsLogistics
    ? 'Tır Kiralama'
    : (FLEET_CARD_META[marketDetailTemplateId]?.label || 'İşletme')
  const marketDetailCanBuyByLevel = marketDetailRequiredLevel <= marketDetailLevelCurrent
  const marketDetailPrice = Math.max(1, Math.trunc(num(marketDetailDraft?.marketPrice || marketDetailDraft?.price || 0)))
  const marketDetailCommissionRate = Math.max(
    0,
    num(marketDetailDraft?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE),
  )
  const marketDetailCommissionAmount = Math.max(
    0,
    Math.trunc(
      num(
        marketDetailDraft?.commissionAmount ||
        Math.floor(marketDetailPrice * marketDetailCommissionRate),
      ),
    ),
  )
  const marketDetailTotalCost = Math.max(
    marketDetailPrice,
    Math.trunc(
      num(
        marketDetailDraft?.totalCost ||
        marketDetailPrice,
      ),
    ),
  )
  const marketDetailSellerPayout = Math.max(
    0,
    Math.trunc(
      num(
        marketDetailDraft?.sellerPayout ||
        (marketDetailPrice - marketDetailCommissionAmount),
      ),
    ),
  )
  const marketDetailCanAfford = walletNow >= marketDetailTotalCost
  const _marketDetailCanBuyNow = Boolean(marketDetailDraft) &&
    marketDetailHasBusinessAccess &&
    marketDetailCanBuyByLevel &&
    marketDetailCanAfford
  const marketDetailAssetMeta = marketAssetLabel(marketDetailTemplateId)
  const soldListingRowsAll = (overview?.profile?.transactions || [])
    .filter((entry) => String(entry?.kind || '').trim() === 'vehicle_market_sell')
  const matchesSoldTemplate = (entry, templateId) => {
    const safeTemplateId = String(templateId || '').trim()
    if (!safeTemplateId) return true
    const detail = String(entry?.detail || '').toLocaleLowerCase('tr-TR')
    if (!detail) return false
    if (safeTemplateId === 'logistics') {
      return detail.includes('[kategori: tır]') || detail.includes(' tır ')
    }
    if (safeTemplateId === 'moto-rental') {
      return (
        detail.includes('[kategori: motor]') ||
        detail.includes(' motosiklet ') ||
        detail.includes(' motor ') ||
        detail.includes(' araç ')
      )
    }
    if (safeTemplateId === 'auto-rental') {
      return (
        detail.includes('[kategori: araba]') ||
        detail.includes(' araba ') ||
        detail.includes(' araç ')
      )
    }
    if (safeTemplateId === 'property-rental') {
      return (
        detail.includes('[kategori: mülk]') ||
        detail.includes('[kategori: mulk]') ||
        detail.includes(' mülk ') ||
        detail.includes(' mulk ') ||
        detail.includes(' daire ') ||
        detail.includes(' villa ') ||
        detail.includes(' ofis ')
      )
    }
    return true
  }
  const selectedSoldListingRows = soldListingRowsAll
    .filter((entry) => matchesSoldTemplate(entry, selectedBusiness?.templateId))
    .slice(0, 8)
  const logisticsSoldListingRows = soldListingRowsAll
    .filter((entry) => matchesSoldTemplate(entry, 'logistics'))
    .slice(0, 8)
  const fallbackUnlockFlow = [
    { key: 'moto-rental', kind: 'fleet', name: 'Motor Kiralama', cost: 500000, requiredLevel: 1, requiredCompanyLevel: 1 },
    { key: 'auto-rental', kind: 'fleet', name: 'Araba Kiralama', cost: 1000000, requiredLevel: 1, requiredCompanyLevel: 2 },
    { key: 'logistics', kind: 'logistics', name: 'Tır Kiralama', cost: 3000000, requiredLevel: 1, requiredCompanyLevel: 3 },
    { key: 'property-rental', kind: 'fleet', name: 'Mülk Kiralama', cost: 12000000, requiredLevel: 1, requiredCompanyLevel: 4 },
  ]
  const unlockFlowSource = companyUnlockFlowRaw.length ? companyUnlockFlowRaw : fallbackUnlockFlow
  const setupBusinessRows = unlockFlowSource.map((entry, index) => {
    const safeKey = String(entry?.key || '').trim()
    const unlocked = entry?.unlocked === true || (
      safeKey === 'logistics'
        ? logisticsUnlocked
        : unlockedTemplateIds.includes(safeKey)
    )
    const previousUnlocked = index === 0
      ? true
      : unlockFlowSource.slice(0, index).every((prev) => {
        const prevKey = String(prev?.key || '').trim()
        return prev?.unlocked === true || (
          prevKey === 'logistics'
            ? logisticsUnlocked
            : unlockedTemplateIds.includes(prevKey)
        )
      })
    const cost = Math.max(1, Math.trunc(num(entry?.cost || 0)))
    const requiredLevel = 1
    const requiredCompanyLevel = Math.max(1, Math.trunc(num(entry?.requiredCompanyLevel ?? (index + 1))))
    const missingCash = Math.max(0, Math.trunc(num(entry?.missingCash ?? (cost - walletNow))))
    const missingLevel = 0
    const missingCompanyLevel = Math.max(0, Math.trunc(num(entry?.missingCompanyLevel ?? (requiredCompanyLevel - companyLevel))))
    const isNextUnlock = String(nextCompanyUnlock?.key || '').trim() === safeKey
    const canUnlockNow =
      entry?.canUnlockNow === true ||
      (!unlocked && previousUnlocked && missingCompanyLevel <= 0 && missingCash <= 0 && missingLevel <= 0 && isNextUnlock)
    let lockReason = String(entry?.lockReason || '').trim()
    if (!lockReason) {
      if (unlocked) {
        lockReason = 'Durum: Açık'
      } else if (!previousUnlocked) {
        const previousName = BUSINESS_UNLOCK_LABEL_BY_KEY[String(unlockFlowSource[index - 1]?.key || '').trim()] || unlockFlowSource[index - 1]?.name || 'Önceki alan'
        lockReason = `Önce ${previousName} açılmalı.`
      } else if (missingCompanyLevel > 0) {
        lockReason = `İşletme seviyesi yetersiz. Gereken seviye: ${fmt(requiredCompanyLevel)}.`
      } else if (missingCash > 0) {
        lockReason = `Nakit yetersiz. Gereken tutar: ${fmt(cost)}.`
      } else {
        lockReason = 'Açılmaya hazır.'
      }
    }
    return {
      key: safeKey,
      title: BUSINESS_UNLOCK_LABEL_BY_KEY[safeKey] || String(entry?.name || 'İşletme Alanı'),
      description: safeKey === 'moto-rental'
        ? 'Motor kiralama ve ikinci el operasyonları.'
        : safeKey === 'auto-rental'
          ? 'Araba kiralama ve filo yönetimi.'
          : safeKey === 'property-rental'
            ? 'Mülk kiralama ve portföy yönetimi.'
            : 'Tır kiralama, sevkiyat ve lojistik yönetimi.',
      icon: BUSINESS_UNLOCK_ICON_BY_KEY[safeKey] || '',
      unlocked,
      previousUnlocked,
      isNextUnlock,
      canUnlockNow,
      cost,
      requiredLevel,
      requiredCompanyLevel,
      missingCash,
      missingLevel,
      missingCompanyLevel,
      lockReason,
      order: index + 1,
    }
  })
  const setupPendingRows = setupBusinessRows.filter((entry) => !entry.unlocked)
  const setupVisibleRows = setupPendingRows.slice(0, 1)
  const nextUnlockRequiredCompanyLevel = Math.max(1, Math.trunc(num(nextCompanyUnlock?.requiredCompanyLevel || 0)))
  const nextUnlockMissingCompanyLevel = nextCompanyUnlock
    ? Math.max(0, nextUnlockRequiredCompanyLevel - companyLevel)
    : 0
  const mustBuyNextUnlockFirst = Boolean(nextCompanyUnlock) && nextUnlockMissingCompanyLevel <= 0
  const canUpgradeBusinessLevel =
    Boolean(companyUpgrade) &&
    !companyUpgrade.maxReached &&
    num(companyUpgrade?.missingCash || 0) <= 0 &&
    !mustBuyNextUnlockFirst
  const upgradeCurrentLevel = Math.max(1, Math.trunc(num(companyUpgrade?.companyLevel || companyLevel)))
  const upgradeNextLevel = companyUpgrade?.maxReached
    ? upgradeCurrentLevel
    : Math.max(upgradeCurrentLevel + 1, Math.trunc(num(companyUpgrade?.nextLevel || (upgradeCurrentLevel + 1))))
  const upgradeMissingCashValue = companyUpgrade?.maxReached
    ? 0
    : Math.max(0, Math.trunc(num(companyUpgrade?.missingCash || 0)))
  const upgradeCostValue = companyUpgrade?.maxReached
    ? 0
    : Math.max(0, Math.trunc(num(companyUpgrade?.cost || 0)))
  const upgradeMaxLevel = Math.max(
    upgradeCurrentLevel,
    upgradeNextLevel,
    unlockFlowSource.reduce(
      (max, entry) => Math.max(max, Math.max(1, Math.trunc(num(entry?.requiredCompanyLevel || 1)))),
      1,
    ),
  )
  const upgradeProgressPercent = clamp(
    Math.round((upgradeCurrentLevel / Math.max(1, upgradeMaxLevel)) * 100),
    0,
    100,
  )
  const upgradeStatusLabel = companyUpgrade?.maxReached
    ? 'Maksimum Seviye'
    : mustBuyNextUnlockFirst
      ? 'Önce İş Kur'
      : upgradeMissingCashValue > 0
        ? 'Nakit Yetersiz'
        : 'Yükseltmeye Hazır'
  const logisticsTruckCount = Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0)))
  const logisticsTotalCapacityNow = Math.max(
    0,
    Math.trunc(num(
      logistics?.logisticsFleet?.summary?.totalCapacity
      || (logistics?.logisticsFleet?.owned || []).reduce(
        (sum, truck) => sum + Math.max(0, num(truck?.capacity || 0)),
        0,
      ),
    )),
  )
  const activeBusinessCards = [
    ...unlockedBusinesses.map((entry) => {
      const fleetCount = Math.max(0, Math.trunc(num(entry?.fleetCount || 0)))
      const collectRemainingMs = remainingMsFromIso(entry?.nextCollectAt || '', liveNowMs)
      const collectCountdown = collectRemainingMs > 0 ? formatCollectionCountdown(collectRemainingMs) : 'Hazır'
      return {
        id: entry.id,
        kind: 'fleet',
        templateId: String(entry?.templateId || '').trim(),
        name: FLEET_CARD_META[entry.templateId]?.label || entry.name,
        image: entry.heroImage || resolveVehicleImage(entry.vehicles?.[0], entry.templateId) || '',
        icon: FLEET_CARD_META[entry.templateId]?.fallback || '?',
        actionLabel: 'Giriş',
        timerLabel: fleetCount > 0 ? `Tahsilat: ${collectCountdown}` : '',
      }
    }),
    ...(logisticsUnlocked ? [{
      id: 'logistics-center',
      kind: 'logistics',
      templateId: 'logistics',
      name: 'Tır Kiralama',
      image: '/home/icons/businesses/lojistik-kiralama.webp',
      icon: 'TIR',
      actionLabel: 'Giriş',
      timerLabel: logisticsTruckCount > 0 ? `Tahsilat: ${logisticsCollectCountdown}` : '',
    }] : []),
  ]
    .sort((left, right) => {
      const order = ['moto-rental', 'auto-rental', 'logistics', 'property-rental']
      const leftIndex = order.indexOf(String(left?.templateId || '').trim())
      const rightIndex = order.indexOf(String(right?.templateId || '').trim())
      const safeLeft = leftIndex === -1 ? order.length : leftIndex
      const safeRight = rightIndex === -1 ? order.length : rightIndex
      if (safeLeft !== safeRight) return safeLeft - safeRight
      return String(left?.name || '').localeCompare(String(right?.name || ''), 'tr')
    })
  const chartItem = (market?.items || []).find((item) => item.id === chartItemId) || (market?.items || [])[0]
  const chartPoints = chartItem ? history[chartItem.id] || [] : []
  const cWallet = useTicker(overview?.profile?.wallet || 0)
  const cGold = useTicker(overview?.profile?.reputation || 0)
  const netWorthBreakdown = overview?.profile?.netWorthBreakdown || {}
  const bankSnapshot = bankState && typeof bankState === 'object' ? bankState : {}
  const bankWalletNow = Math.max(0, Math.trunc(num(bankSnapshot.wallet ?? overview?.profile?.wallet ?? 0)))
  const bankMainBalance = Math.max(
    0,
    Math.trunc(num(bankSnapshot.bank ?? netWorthBreakdown.bank ?? overview?.profile?.bank ?? 0)),
  )
  const bankTransferMinAmount = Math.max(1, Math.trunc(num(bankSnapshot.minTransferAmount || 1)))
  const bankDepositFeeRate = clamp(num(bankSnapshot.depositFeeRate ?? 0.05), 0, 0.99)
  const bankDepositFeeRatePctLabel = roundTo(bankDepositFeeRate * 100, 2)
  const bankWithdrawFeeRate = clamp(num(bankSnapshot.withdrawFeeRate ?? 0), 0, 0.99)
  const bankTermRateCapPct = Math.max(1, Math.trunc(num(bankSnapshot.termRateCapPct || 10)))
  const bankTermOptions = Array.isArray(bankSnapshot.termOptions) && bankSnapshot.termOptions.length
    ? bankSnapshot.termOptions
      .map((entry) => ({
        days: Math.max(1, Math.trunc(num(entry?.days || 1))),
        dailyRatePct: Math.max(0, num(entry?.dailyRatePct || 0)),
        totalRatePct: clamp(
          num(
            entry?.totalRatePct ??
            (num(entry?.dailyRatePct || 0) * Math.max(1, Math.trunc(num(entry?.days || 1)))),
          ),
          0,
          bankTermRateCapPct,
        ),
      }))
      .sort((left, right) => left.days - right.days)
    : [
      { days: 1, dailyRatePct: 2, totalRatePct: 2 },
      { days: 2, dailyRatePct: 3, totalRatePct: 6 },
      { days: 3, dailyRatePct: 3, totalRatePct: 9 },
      { days: 4, dailyRatePct: 3, totalRatePct: 10 },
    ]
  const bankSelectedTermDays = Math.max(
    1,
    Math.trunc(
      num(
        bankForm.termDays ||
        bankTermOptions[0]?.days ||
        1,
      ),
    ),
  )
  const bankSelectedTerm = bankTermOptions.find((entry) => entry.days === bankSelectedTermDays) || bankTermOptions[0]
  const bankTermDailyRatePct = Math.max(0, num(bankSelectedTerm?.dailyRatePct || 0))
  const bankTermTotalRatePct = Math.max(0, num(bankSelectedTerm?.totalRatePct || (bankTermDailyRatePct * bankSelectedTermDays)))
  const bankTermLive = bankSnapshot?.term && typeof bankSnapshot.term === 'object'
    ? bankSnapshot.term
    : {
      active: false,
      principal: 0,
      expectedPayout: 0,
      days: 0,
      dailyRatePct: 0,
      unlockAt: '',
      openedAt: '',
      matured: false,
    }
  const bankTermRemainingLiveMs = bankTermLive.active
    ? Math.max(0, Math.trunc(num(bankTermLive.remainingMs || 0)))
    : 0
  const bankTermMatured = Boolean(bankTermLive.active) && (
    Boolean(bankTermLive.matured)
    || bankTermRemainingLiveMs <= 0
  )
  const bankTermCountdownLabel = bankTermLive.active
    ? (bankTermMatured ? 'Vade doldu' : formatCountdownWithDaysTr(bankTermRemainingLiveMs))
    : '--'
  const bankHistoryRows = Array.isArray(bankSnapshot.history) ? bankSnapshot.history : []
  const bankDepositInputDigits = String(bankForm.depositAmount || '').replace(/[^\d]/g, '')
  const bankWithdrawInputDigits = String(bankForm.withdrawAmount || '').replace(/[^\d]/g, '')
  const bankTermInputDigits = String(bankForm.termAmount || '').replace(/[^\d]/g, '')
  const bankDepositAmount = Math.max(0, Math.trunc(num(bankDepositInputDigits || 0)))
  const bankWithdrawAmount = Math.max(0, Math.trunc(num(bankWithdrawInputDigits || 0)))
  const bankTermAmount = Math.max(0, Math.trunc(num(bankTermInputDigits || 0)))
  const bankTermMaxPrincipal = Math.max(
    bankTransferMinAmount,
    Math.trunc(num(bankSnapshot.termMaxPrincipal || 200000000)),
  )
  const bankTermMaxAllowedNow = Math.max(0, Math.min(bankMainBalance, bankTermMaxPrincipal))
  const bankDepositFeePreview = Math.max(0, Math.floor(bankDepositAmount * bankDepositFeeRate))
  const bankDepositNetPreview = Math.max(0, bankDepositAmount - bankDepositFeePreview)
  const bankWithdrawFeePreview = Math.max(0, Math.floor(bankWithdrawAmount * bankWithdrawFeeRate))
  const bankWithdrawNetPreview = Math.max(0, bankWithdrawAmount - bankWithdrawFeePreview)
  const bankTermPayoutPreview = bankTermAmount > 0
    ? Math.max(
      bankTermAmount,
      Math.floor(bankTermAmount * (1 + (bankTermTotalRatePct / 100))),
    )
    : 0
  const bankTermProfitPreview = Math.max(0, bankTermPayoutPreview - bankTermAmount)
  const bankBusyDepositKey = 'bank-deposit'
  const bankBusyWithdrawKey = 'bank-withdraw'
  const bankBusyTermOpenKey = 'bank-term-open'
  const bankBusyTermClaimKey = 'bank-term-claim'
  const bankTermLivePrincipal = Math.max(0, Math.trunc(num(bankTermLive.principal || 0)))
  const bankTermLiveExpectedPayout = Math.max(0, Math.trunc(num(bankTermLive.expectedPayout || bankTermLivePrincipal)))
  const bankTermLiveEstimatedProfit = Math.max(
    0,
    Math.trunc(num(bankTermLive.estimatedProfit || (bankTermLiveExpectedPayout - bankTermLivePrincipal))),
  )
  const bankTermLiveTotalRatePct = Math.max(
    0,
    Math.min(
      bankTermRateCapPct,
      num(
        bankTermLive.totalRatePct ||
        (num(bankTermLive.dailyRatePct || 0) * Math.max(0, Math.trunc(num(bankTermLive.days || 0)))),
      ),
    ),
  )
  const bankTotalAssetsNow = Math.max(0, bankWalletNow + bankMainBalance + bankTermLivePrincipal)
  const bankDepositSubmitBlocked = (
    Boolean(busy)
    || bankDepositAmount < bankTransferMinAmount
    || bankDepositAmount > bankWalletNow
  )
  const bankWithdrawSubmitBlocked = (
    Boolean(busy)
    || bankWithdrawAmount < bankTransferMinAmount
    || bankWithdrawAmount > bankMainBalance
  )
  const bankTermOpenSubmitBlocked = (
    Boolean(busy)
    || Boolean(bankTermLive.active)
    || bankTermAmount < bankTransferMinAmount
    || bankTermAmount > bankMainBalance
    || bankTermAmount > bankTermMaxPrincipal
  )
  const bankTermClaimSubmitBlocked = Boolean(busy) || !bankTermLive.active || !bankTermMatured
  const bankTermOpenedAtLabel = bankTermLive.active ? formatDateTime(bankTermLive.openedAt || '') : '-'
  const bankTermUnlockAtLabel = bankTermLive.active ? formatDateTime(bankTermLive.unlockAt || '') : '-'
  const bankTermStatusLabel = bankTermLive.active
    ? (bankTermMatured ? 'Tahsile Hazır' : 'Aktif Vade')
    : 'Aktif Vade Yok'
  const levelProgress = clamp(lv.progressPercent || 0, 0, 100)
  const premiumInfo = overview?.premium || {}
  const premiumStatus = overview?.profile?.premium || premiumInfo || {}
  const premiumActive = Boolean(premiumInfo.active ?? premiumStatus.active)
  const selfBadge = roleBadgeMeta(role, premiumActive, selfRoleLabel, overview?.profile?.seasonBadge || null)
  const premiumUntil = String(premiumInfo.until || premiumStatus.until || '').trim()
  const premiumMultiplier = Math.max(1, Math.trunc(num(premiumInfo.bulkMultiplier || premiumStatus.bulkMultiplier || 2)))
  const premiumBoostActive = premiumActive && premiumMultiplier > 1
  const premiumPlans = Array.isArray(premiumInfo.plans) ? premiumInfo.plans : []
  const premiumDiamond = Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0)))
  const diamondStoreState = overview?.profile?.diamondStore || {}
  const welcomePackPurchased = Boolean(diamondStoreState?.welcomePackPurchased)
  const diamondMarketPackages = DIAMOND_CASH_PACKAGES.filter(
    (pack) => !(pack?.welcomeOnly && welcomePackPurchased),
  )
  const defaultPremiumPlans = [
    { id: 'premium-7', days: 7, price: 100, label: '7 Gün' },
    { id: 'premium-14', days: 14, price: 180, label: '14 Gün' },
    { id: 'premium-32', days: 32, price: 360, label: '32 Gün' },
    { id: 'premium-365', days: 365, price: 2400, label: '365 Gün' },
  ]
  const premiumRemainingMs = premiumActive && premiumUntil ? remainingMsFromIso(premiumUntil, liveNowMs) : 0
  const premiumCountdownLabel = premiumActive && premiumRemainingMs > 0
    ? formatLifetimeDetailedTr(premiumRemainingMs)
    : premiumActive
      ? 'Süre bilgisi bekleniyor'
      : ''
  const resolvedPremiumPlans = premiumPlans.length ? premiumPlans : defaultPremiumPlans
  const premiumPlanList = [...resolvedPremiumPlans].sort((a, b) => num(a?.days) - num(b?.days))
  const premiumBestValuePlan = premiumPlanList.reduce((best, plan) => {
    const days = Math.max(1, Math.trunc(num(plan?.days || 1)))
    const price = Math.max(0, Math.trunc(num(plan?.price || 0)))
    const perDay = price / days
    if (!best || perDay < best.perDay) return { id: String(plan?.id || ''), label: String(plan?.label || `${days} Gün`), perDay }
    return best
  }, null)
  const dailyResetRemainingMs = remainingMsFromIso(dailyStore.nextResetAt || '', liveNowMs)
  const dailyResetLabel = dailyResetRemainingMs > 0 ? formatCountdownClock(dailyResetRemainingMs) : '00:00:00'
  const dailyOfferWeekMultiplier = Math.max(1, Math.trunc(num(dailyStore?.cycleMultiplier ?? dailyStore?.weekMultiplier ?? 1)))
  const dailyOfferCycleDays = Math.max(1, Math.trunc(num(dailyStore?.cycleLengthDays || 20)))
  const dailyOfferCycleRemainingMs = remainingMsFromIso(dailyStore?.cycleNextResetAt || '', liveNowMs)
  const dailyOfferCycleResetLabel = dailyOfferCycleRemainingMs > 0 ? formatCountdownClock(dailyOfferCycleRemainingMs) : '00:00:00'
  const dailyResetInfoLabel = `Her gün 00:00'da yenilenir · Mevcut çarpan ${dailyOfferWeekMultiplier}x · ${dailyOfferCycleDays} gün dolunca 2x artar (${dailyOfferCycleResetLabel}) · Para paketi üst sınır 50.000.000, kaynak paketi üst sınır 400.000`
  const dailyLoginState = dailyLoginReward || DAILY_LOGIN_STATE_SEED
  const dailyLoginSeriesLabel = String(dailyLoginState?.series?.label || `0/${DAILY_LOGIN_TOTAL_DAYS}`)
  const dailyLoginCanClaim = Boolean(dailyLoginState?.canClaim) && !dailyLoginState?.claimedToday
  const dailyLoginNextResetMs = remainingMsFromIso(dailyLoginState?.nextResetAt || '', liveNowMs)
  const dailyLoginNextResetLabel = dailyLoginNextResetMs > 0 ? formatCountdownClock(dailyLoginNextResetMs) : '00:00:00'
  const dailyLoginDayRows = Array.isArray(dailyLoginState?.days) ? dailyLoginState.days : []
  const dailyLoginLoaded = dailyLoginDayRows.length > 0
  const dailyLoginQuickStatus = !dailyLoginLoaded
    ? 'Günlük ödül bilgisi yükleniyor...'
    : dailyLoginCanClaim
      ? 'Bugünkü ödül seni bekliyor'
      : `Bugünkü ödül alındı · ${dailyLoginNextResetLabel}`
  const dailyLoginTopStripVisible = tab === 'home' && dailyLoginCanClaim
  const dailyLoginClaimBusy = busy === 'daily-login:claim'
  const dailyLoginClaimButtonLabel = dailyLoginCanClaim
    ? 'Ödülü Al'
    : 'Bugünkü Ödülü Aldın'
  const weeklyEventsState = normalizeWeeklyEventsPayload(
    overview?.events || business?.events || factories?.events || null,
  )
  const weekendLocalWindow = weeklyEventLocalWindow('weekend-xp', liveNowMs)
  const midweekLocalWindow = weeklyEventLocalWindow('midweek-discount', liveNowMs)
  const runtimeDayIndex = new Date(liveNowMs + TURKIYE_UTC_OFFSET_MS).getUTCDay()
  const runtimeDayName = String(WEEKLY_EVENT_DAY_LABELS[runtimeDayIndex] || weeklyEventsState.dayName || '').trim()
  const runtimeSchedule = (Array.isArray(weeklyEventsState.schedule) ? weeklyEventsState.schedule : []).map((entry) => {
    const dayIndexRaw = Math.trunc(num(entry?.dayIndex))
    const dayIndex = dayIndexRaw >= 0 && dayIndexRaw <= 6 ? dayIndexRaw : 0
    const eventType = String(entry?.eventType || 'standard').trim().toLowerCase()
    const isToday = dayIndex === runtimeDayIndex
    const isActive = isToday && (
      (eventType === 'xp' && weekendLocalWindow.active) ||
      (eventType === 'discount' && midweekLocalWindow.active)
    )
    return {
      ...entry,
      dayIndex,
      dayName: String(entry?.dayName || WEEKLY_EVENT_DAY_LABELS[dayIndex] || '').trim() || (WEEKLY_EVENT_DAY_LABELS[dayIndex] || ''),
      isToday,
      isActive,
    }
  })
  const runtimeXpMultiplier = weekendLocalWindow.active
    ? Math.max(1, Math.trunc(num(weeklyEventsState.xpMultiplier || 2)))
    : 1
  const runtimeCostMultiplier = midweekLocalWindow.active
    ? Math.max(0.01, num(weeklyEventsState.costMultiplier || 0.75))
    : 1
  const weeklyEventsRuntimeState = {
    ...weeklyEventsState,
    dayIndex: runtimeDayIndex,
    dayName: runtimeDayName || weeklyEventsState.dayName,
    schedule: runtimeSchedule,
    xpMultiplier: runtimeXpMultiplier,
    costMultiplier: runtimeCostMultiplier,
    weekendXp: {
      ...weeklyEventsState.weekendXp,
      active: weekendLocalWindow.active,
      endsAt: weekendLocalWindow.endsAt || weeklyEventsState.weekendXp.endsAt || '',
    },
    midweekDiscount: {
      ...weeklyEventsState.midweekDiscount,
      active: midweekLocalWindow.active,
      endsAt: midweekLocalWindow.endsAt || weeklyEventsState.midweekDiscount.endsAt || '',
    },
  }
  const weeklyEventsPrimary = weeklyEventsRuntimeState.weekendXp.active
    ? weeklyEventsRuntimeState.weekendXp
    : (weeklyEventsRuntimeState.midweekDiscount.active ? weeklyEventsRuntimeState.midweekDiscount : null)
  const weeklyEventsRemainingMs = weeklyEventsPrimary
    ? remainingMsFromIso(weeklyEventsPrimary.endsAt || '', liveNowMs)
    : 0
  const weeklyEventsRemainingLabel = weeklyEventsRemainingMs > 0
    ? formatCountdownWithDaysTr(weeklyEventsRemainingMs)
    : '0 gün 00 saat 00 dakika 00 saniye'
  const weeklyEventsStripVisible = tab === 'home' && Boolean(weeklyEventsPrimary)
  const weeklyEventsStripSubtitle = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Haftalık Etkinlik'} · ${weeklyEventsPrimary.bonusLabel || 'Etkinlik'}`
    : 'Haftalık takvimi görüntüle'
  const weeklyEventsStripCountdown = weeklyEventsPrimary
    ? `Kalan süre: ${weeklyEventsRemainingLabel}`
    : 'Etkinlik yok'
  const weeklyEventsHomeHint = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Etkinlik'} aktif`
    : 'Haftalık takvimi incele'
  const weeklyEventStatusCards = [
    {
      id: 'weekend-xp',
      kind: 'xp',
      active: weeklyEventsRuntimeState.weekendXp.active === true,
      title: String(weeklyEventsRuntimeState.weekendXp.title || 'Cumartesi-Pazar Tahsilat XP').trim() || 'Cumartesi-Pazar Tahsilat XP',
      description: String(weeklyEventsRuntimeState.weekendXp.description || '').trim(),
      effectLabel: '2x XP',
      windowLabel: 'Cuma 23:59 · Pazar 23:59',
      endsAt: String(weeklyEventsRuntimeState.weekendXp.endsAt || '').trim(),
    },
    {
      id: 'midweek-discount',
      kind: 'discount',
      active: weeklyEventsRuntimeState.midweekDiscount.active === true,
      title: String(weeklyEventsRuntimeState.midweekDiscount.title || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi').trim() || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi',
      description: String(weeklyEventsRuntimeState.midweekDiscount.description || '').trim(),
      effectLabel: `-%${Math.max(0, Math.trunc(num(weeklyEventsRuntimeState.costDiscountPercent || 25)))} Gider`,
      windowLabel: 'Pazartesi 23:59 · Çarşamba 23:59',
      endsAt: String(weeklyEventsRuntimeState.midweekDiscount.endsAt || '').trim(),
    },
  ].map((entry) => {
    const remainingMs = entry.active ? remainingMsFromIso(entry.endsAt, liveNowMs) : 0
    const countdownLabel = entry.active
      ? (remainingMs > 0 ? formatCountdownWithDaysTr(remainingMs) : '0 gün 00 saat 00 dakika 00 saniye')
      : 'Etkinlik günü bekleniyor'
    return {
      ...entry,
      remainingMs,
      countdownLabel,
    }
  })
  const weeklyEventRangeCards = [
    {
      ...weeklyEventStatusCards.find((entry) => entry.id === 'midweek-discount'),
      id: 'midweek-discount-range',
      dayRange: 'Salı Çarşamba',
      subtitle: 'İşletme ve Fabrika Tahsilat Gider İndirimi',
      iconEmoji: '💰',
      timeWindow: 'Pazartesi 23:59 · Çarşamba 23:59',
      inactiveNote: 'Pazartesi 23:59 sonrası otomatik devreye girer.',
      rangeDays: [2, 3],
    },
    {
      ...weeklyEventStatusCards.find((entry) => entry.id === 'weekend-xp'),
      id: 'weekend-xp-range',
      dayRange: 'Cumartesi Pazar',
      subtitle: 'İşletme ve Fabrika XP',
      iconEmoji: '💰',
      timeWindow: 'Cuma 23:59 · Pazar 23:59',
      inactiveNote: 'Cuma 23:59 sonrası otomatik devreye girer.',
      rangeDays: [6, 0],
    },
  ]
    .filter((entry) => entry && entry.kind)
    .map((entry) => {
      const rangeDays = Array.isArray(entry.rangeDays) ? entry.rangeDays : []
      const todayInRange = entry.active || rangeDays.includes(runtimeDayIndex)
      return {
        ...entry,
        todayInRange,
        rangeBadge: todayInRange ? 'BUGÜN' : 'TAKVİM',
      }
    })
  const weeklyEventsTodaySummary = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Etkinlik'} · ${weeklyEventsPrimary.bonusLabel || 'Aktif'}`
    : 'Bugün aktif etkinlik bulunmuyor.'
  const weeklyEventsPrimaryWindowLabel = weeklyEventsPrimary
    ? (weeklyEventsPrimary.id === 'weekend-xp' ? 'Cuma 23:59 · Pazar 23:59' : 'Pazartesi 23:59 · Çarşamba 23:59')
    : ''
  const weeklyEventsTodayDetail = weeklyEventsPrimary
    ? `Zaman: ${weeklyEventsPrimaryWindowLabel} · Kalan süre: ${weeklyEventsRemainingLabel}`
    : 'Sonraki etkinlikler takvime göre otomatik başlar.'
  const weeklyEventsHeroSubtitle = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Haftalık etkinlik'} · ${weeklyEventsPrimary.bonusLabel || 'Aktif'}`
    : 'Haftalık planlı etkinlikleri ve aktif bonusları aşağıdan takip et.'
  const weeklyEventsHeroBadge = weeklyEventsPrimary
    ? (weeklyEventsPrimary.bonusLabel || 'Aktif')
    : 'Takvim'
  const weeklyEventsHeroCountdown = weeklyEventsPrimary
    ? `Zaman: ${weeklyEventsPrimaryWindowLabel} · Bitiş: ${formatDateTime(weeklyEventsPrimary.endsAt || '')} · Kalan: ${weeklyEventsRemainingLabel}`
    : `Bugün: ${weeklyEventsRuntimeState.dayName} · ${weeklyEventsTodayDetail}`
  const cityAnnouncements = (Array.isArray(overview?.announcements) ? overview.announcements : [])
    .map((entry) => {
      const id = String(entry?.id || '').trim()
      const title = String(entry?.title || 'Duyuru').trim() || 'Duyuru'
      const body = String(entry?.body || '').replace(/\r/g, '').trim()
      const typeMeta = announcementTypeMeta(entry?.announcementType ?? entry?.type ?? entry?.announcementTag)
      if (!id) return null
      return {
        id,
        title,
        body: body || title,
        announcementType: typeMeta.type,
        announcementTag: typeMeta.label,
        createdAt: String(entry?.createdAt || '').trim(),
        createdByUsername: String(entry?.createdByUsername || 'Yönetim').trim() || 'Yönetim',
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(String(left?.createdAt || ''))
      const rightTime = Date.parse(String(right?.createdAt || ''))
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return rightTime - leftTime
      }
      if (Number.isFinite(rightTime) && !Number.isFinite(leftTime)) return 1
      if (Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return -1
      return String(right?.id || '').localeCompare(String(left?.id || ''), 'tr')
    })
    .slice(0, CHAT_NEWS_MAX_ITEMS)
  const activeWeeklyEventStatusCards = weeklyEventStatusCards.filter((entry) => entry.active)
  const renderWeeklyEventInlineCard = (surfaceLabel = 'Haftalık Etkinlikler') => {
    if (activeWeeklyEventStatusCards.length <= 0) return null
    return (
      <article className="weekly-event-inline-card" aria-live="polite">
        <div className="weekly-event-inline-head">
          <strong>Aktif Etkinlik Takibi</strong>
          <small>{surfaceLabel}</small>
        </div>
        <div className="weekly-event-inline-grid">
          {activeWeeklyEventStatusCards.map((entry) => (
            <article
              key={`${surfaceLabel}-${entry.id}`}
              className={`weekly-event-inline-item ${entry.kind === 'xp' ? 'is-xp' : 'is-discount'} is-active`.trim()}
            >
              <p className="weekly-event-inline-title">{entry.title}</p>
              <p className="weekly-event-inline-effect">{entry.effectLabel}</p>
              <p className="weekly-event-inline-desc">{entry.description || 'Etkinlik açıklaması bulunmuyor.'}</p>
              <small className="weekly-event-inline-window">{entry.windowLabel || ''}</small>
              <small className="weekly-event-inline-countdown">Kalan: {entry.countdownLabel}</small>
            </article>
          ))}
        </div>
      </article>
    )
  }

  useEffect(() => {
    if (!dailyLoginState?.claimedToday) {
      dailyLoginResetSyncKeyRef.current = ''
      return
    }
    if (dailyLoginNextResetMs > 0) return
    const syncKey = String(dailyLoginState?.nextResetAt || '').trim()
    if (!syncKey || dailyLoginResetSyncKeyRef.current === syncKey) return
    dailyLoginResetSyncKeyRef.current = syncKey
    void loadDailyLoginRewardState().catch(() => {
      dailyLoginResetSyncKeyRef.current = ''
    })
  }, [
    dailyLoginState?.claimedToday,
    dailyLoginState?.nextResetAt,
    dailyLoginNextResetMs,
    loadDailyLoginRewardState,
  ])
  const walletCashValue = fmt(cWallet)
  const walletGoldValue = fmt(cGold)
  const currentLevelXpBig = (() => {
    const parsed = toBigIntOrNull(lv.currentXp)
    if (parsed === null || parsed < 0n) return 0n
    return parsed
  })()
  const nextLevelXpBig = (() => {
    const parsed = toBigIntOrNull(lv.nextLevelXp)
    if (parsed === null || parsed < currentLevelXpBig) return currentLevelXpBig
    return parsed
  })()
  const xpToNextLevelBig = nextLevelXpBig - currentLevelXpBig
  const xpToNextLevelValue = formatBigIntTr(xpToNextLevelBig)
  const walletCashClass = metricLengthClass(walletCashValue)
  const walletGoldClass = metricLengthClass(walletGoldValue)
  const avatar = profile?.profile?.avatar || overview?.profile?.avatar || { url: '', type: 'default' }
  const avatarSrc = String(avatar.url || DEFAULT_CHAT_AVATAR).trim() || DEFAULT_CHAT_AVATAR
  const avatarLoadError = avatarFailedSrc === avatarSrc
  const avatarDisplaySrc = avatarLoadError ? DEFAULT_CHAT_AVATAR : avatarSrc
  const avatarIsGif = isGifUrl(avatarDisplaySrc)
  const avatarTypeLabel =
    avatar.type === 'upload' ? 'Yüklenen Görsel' : avatar.type === 'url' ? 'Harici Bağlantı' : 'Varsayılan'
  const profileAccountUsername =
    String(profileOverviewUsername || '').trim() ||
    String(user?.username || '').trim() ||
    'Oyuncu'
  const selectedThemeOption =
    PROFILE_THEME_OPTIONS.find((entry) => entry.id === navTheme) || PROFILE_THEME_OPTIONS[0]
  const supportTitleLength = String(supportForm.title || '').length
  const supportDescriptionLength = String(supportForm.description || '').length
  const accountEmail = String(user?.email || '').trim() || '-'
  const accountLastLoginAt = formatDateTime(user?.lastLoginAt || '', { includeWeekday: true })
  const accountUserId = String(user?.id || overview?.profile?.userId || '-')
  const maskedAccountId =
    accountUserId && accountUserId !== '-'
      ? `${accountUserId.slice(0, 8)}...${accountUserId.slice(-6)}`
      : '-'
  const openProfileModal = useCallback((targetUserId, options = {}) => {
    const safeUserId = String(targetUserId || '').trim()
    if (!safeUserId) return false

    const isSelfTarget = Boolean(user?.id) && safeUserId === String(user.id)
    if (options?.disallowSelf && isSelfTarget) {
      const blockedMessage = String(options?.selfBlockedMessage || '').trim()
      if (blockedMessage) {
        setError(blockedMessage)
      }
      return false
    }

    const parseProfileLevel = (value) => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return null
      return Math.max(1, Math.trunc(parsed))
    }

    let previewProfile = null

    if (isSelfTarget) {
      const selfProfile = overview?.profile && typeof overview.profile === 'object'
        ? overview.profile
        : {}
      const selfUsername = String(selfProfile?.username || user?.username || '').trim()
      const selfDisplayName = String(selfProfile?.displayName || selfUsername).trim()
      const selfAvatarUrl = String(selfProfile?.avatar?.url || user?.avatarUrl || '').trim()
      const selfLevel = parseProfileLevel(selfProfile?.levelInfo?.level || selfProfile?.level || options?.level)

      previewProfile = {
        ...selfProfile,
        userId: safeUserId,
        username: selfUsername || 'Oyuncu',
        displayName: selfDisplayName || selfUsername || 'Oyuncu',
        avatar: {
          ...(selfProfile?.avatar && typeof selfProfile.avatar === 'object' ? selfProfile.avatar : {}),
          url: selfAvatarUrl || '/splash/logo.png',
        },
        levelInfo: selfLevel ? { level: selfLevel } : selfProfile?.levelInfo,
        role,
        roleLabel: selfRoleLabel,
        seasonBadge: selfProfile?.seasonBadge || options?.seasonBadge || null,
        premium: {
          ...(selfProfile?.premium && typeof selfProfile.premium === 'object' ? selfProfile.premium : {}),
          active: Boolean(premiumActive || selfProfile?.premium?.active),
        },
      }
    } else {
      const username = String(options?.username || '').trim()
      const displayName = String(options?.displayName || username).trim()
      const avatarUrl = String(options?.avatarUrl || '').trim()
      const levelValue = parseProfileLevel(options?.level)
      const roleValue = normalizeRoleValue(options?.role || 'player')

      previewProfile = {
        userId: safeUserId,
        username,
        displayName: displayName || username || 'Oyuncu',
        avatar: avatarUrl ? { url: avatarUrl } : { url: '/splash/logo.png' },
        levelInfo: levelValue ? { level: levelValue } : undefined,
        role: roleValue,
        roleLabel: String(options?.roleLabel || roleLabelFromValue(roleValue)).trim(),
        seasonBadge: options?.seasonBadge || null,
        premium: {
          active: Boolean(options?.premium),
        },
      }
    }

    setProfileModalBusinessExpand(null)
    setProfileModalData(previewProfile)
    setProfileModalLoading(true)
    setProfileModalUserId(safeUserId)
    return true
  }, [overview?.profile, premiumActive, role, selfRoleLabel, user?.avatarUrl, user?.id, user?.username])
  const avatarCropSourceWidth = Math.max(0, Math.trunc(num(avatarCropNatural.width)))
  const avatarCropSourceHeight = Math.max(0, Math.trunc(num(avatarCropNatural.height)))
  const avatarCropReady = avatarCropSourceWidth > 0 && avatarCropSourceHeight > 0
  let avatarCropDrawWidth = 0
  let avatarCropDrawHeight = 0
  let avatarCropDrawX = 0
  let avatarCropDrawY = 0
  let avatarCropSourceX = 0
  let avatarCropSourceY = 0
  let avatarCropSourceSize = 0

  if (avatarCropReady) {
    const frameSize = AVATAR_CROP_PREVIEW_SIZE
    const baseScale = Math.max(frameSize / avatarCropSourceWidth, frameSize / avatarCropSourceHeight)
    const scale = baseScale * clamp(num(avatarCropZoom), 1, 3)
    avatarCropDrawWidth = avatarCropSourceWidth * scale
    avatarCropDrawHeight = avatarCropSourceHeight * scale
    const maxPanX = Math.max(0, (avatarCropDrawWidth - frameSize) / 2)
    const maxPanY = Math.max(0, (avatarCropDrawHeight - frameSize) / 2)
    const panX = (clamp(num(avatarCropOffsetX), -100, 100) / 100) * maxPanX
    const panY = (clamp(num(avatarCropOffsetY), -100, 100) / 100) * maxPanY
    avatarCropDrawX = (frameSize - avatarCropDrawWidth) / 2 + panX
    avatarCropDrawY = (frameSize - avatarCropDrawHeight) / 2 + panY

    const sourceSizeRaw = frameSize / scale
    avatarCropSourceSize = Math.min(
      avatarCropSourceWidth,
      avatarCropSourceHeight,
      Math.max(1, sourceSizeRaw),
    )
    const sourceMaxX = Math.max(0, avatarCropSourceWidth - avatarCropSourceSize)
    const sourceMaxY = Math.max(0, avatarCropSourceHeight - avatarCropSourceSize)
    avatarCropSourceX = clamp((-avatarCropDrawX) / scale, 0, sourceMaxX)
    avatarCropSourceY = clamp((-avatarCropDrawY) / scale, 0, sourceMaxY)
  }

  const avatarCropLayout = {
    ready: avatarCropReady,
    drawWidth: avatarCropDrawWidth,
    drawHeight: avatarCropDrawHeight,
    drawX: avatarCropDrawX,
    drawY: avatarCropDrawY,
    sourceX: avatarCropSourceX,
    sourceY: avatarCropSourceY,
    sourceSize: avatarCropSourceSize,
  }
  const avatarCropImageStyle = avatarCropReady
    ? {
        width: `${avatarCropDrawWidth}px`,
        height: `${avatarCropDrawHeight}px`,
        transform: `translate(${avatarCropDrawX}px, ${avatarCropDrawY}px)`,
      }
    : { opacity: 0 }
  const logisticsOwnedTrucks = [...(logistics?.logisticsFleet?.owned || [])].sort((a, b) =>
    num(b?.capacity) - num(a?.capacity) ||
    num(b?.levelRequired) - num(a?.levelRequired),
  )
  const logisticsOwnedTruckIdSet = new Set(
    logisticsOwnedTrucks.map((truck) => String(truck?.id || '').trim()).filter(Boolean),
  )
  const logisticsListedTrucks = logisticsMyListings
    .map((truck) => {
      const listingId = String(truck?.id || '').trim()
      const truckId = String(truck?.vehicleId || truck?.id || '').trim()
      const truckLevelRequired = Math.max(
        1,
        Math.trunc(num(truck?.requiredLevel || truck?.marketLevel || 1)),
      )
      return {
        ...truck,
        id: truckId,
        modelId: String(truck?.modelId || '').trim(),
        listingId,
        isListed: true,
        levelRequired: truckLevelRequired,
        incomePerRun: Math.max(1, Math.trunc(num(truck?.rentPerHour || truck?.incomePerRun || 0))),
        xpPerRun: Math.max(1, Math.trunc(num(truck?.xp || truck?.xpPerRun || 0))),
        upkeepPerRun: Math.max(1, Math.trunc(num(truck?.upkeepPerRun || truck?.upkeep || 1))),
      }
    })
    .filter((truck) => String(truck?.id || '').trim() && !logisticsOwnedTruckIdSet.has(String(truck?.id || '').trim()))
  const logisticsGarageTrucks = [...logisticsOwnedTrucks, ...logisticsListedTrucks]
  const chatMuteUntil = chatRestrictions?.mute?.mutedUntil || ''
  const chatMuteRemainingMs = remainingMsFromIso(chatMuteUntil, chatClockMs)
  const chatMuteActive = chatMuteRemainingMs > 0
  const chatMuteReasonLabel = String(chatRestrictions?.mute?.reason || '').trim() || 'Mesaj kısıtı'
  const chatMuteEndLabel = formatDateTime(chatMuteUntil)

  const chatBlockUntil = chatRestrictions?.block?.blockedUntil || ''
  const chatBlockRemainingMs = remainingMsFromIso(chatBlockUntil, chatClockMs)
  const chatBlockActive = chatBlockRemainingMs > 0
  const chatBlockReasonLabel = String(chatRestrictions?.block?.reason || '').trim() || 'Yönetici mesaj engeli'
  const chatBlockEndLabel = formatDateTime(chatBlockUntil)
  const chatHardRestrictionActive = chatMuteActive || chatBlockActive

  const chatCooldownUntil = chatRestrictions?.cooldown?.availableAt || ''
  const chatCooldownRemainingMs = remainingMsFromIso(chatCooldownUntil, chatClockMs)
  const chatCooldownActive = !chatHardRestrictionActive && chatCooldownRemainingMs > 0
  const _chatSendBlocked = MESSAGES_DISABLED || chatHardRestrictionActive || chatCooldownActive || Boolean(busy === 'chat-send')

  const _chatCooldownHint = MESSAGES_DISABLED
    ? 'Sohbet mesajları kapalı.'
    : chatBlockActive
      ? `Sohbet engelin var. Kalan süre: ${formatCountdownTr(chatBlockRemainingMs)}.`
    : chatCooldownActive
      ? `${Math.max(1, Math.ceil(chatCooldownRemainingMs / 1000))} saniye sonra tekrar yazabilirsin.`
      : '5 saniyede bir mesaj gönderebilirsin.'
  const chatRestrictionTitle = chatBlockActive
    ? 'Mesaj engelin aktif'
    : chatMuteActive
      ? 'Mesaj kısıtı aktif'
      : ''
  const chatRestrictionReason = chatBlockActive
    ? chatBlockReasonLabel
    : chatMuteActive
      ? chatMuteReasonLabel
      : ''
  const chatRestrictionRemainingMs = chatBlockActive ? chatBlockRemainingMs : chatMuteRemainingMs
  const chatRestrictionEndLabel = chatBlockActive ? chatBlockEndLabel : chatMuteEndLabel
  const floatingErrorText = safeUiText(error)
  const floatingNoticeText = safeUiText(notice)
  const floatingFeedbackText = floatingErrorText || floatingNoticeText
  const floatingFeedbackType = floatingErrorText ? 'error' : floatingNoticeText ? (noticeIsSuccess ? 'success' : 'notice') : ''

  const activeChatMessages = useMemo(
    () => (MESSAGES_DISABLED ? [] : (Array.isArray(chat[CHAT_ROOM]) ? chat[CHAT_ROOM] : [])),
    [chat],
  )
  const _chatUsersById = useMemo(
    () =>
      chatUsers.reduce((acc, entry) => {
        if (entry?.userId) acc[entry.userId] = entry
        return acc
      }, {}),
    [chatUsers],
  )
  const _chatTimeline = useMemo(() => {
    return activeChatMessages
      .filter((message) => message && message.id)
      .map((message) => ({
        type: 'message',
        id: `msg:${message.id}`,
        message,
      }))
  }, [activeChatMessages])
  const _messageCounts = MESSAGES_DISABLED
    ? { all: 0, message: 0, trade: 0, other: 0, alert: 0 }
    : (messageCenter?.counts || { all: 0, message: 0, trade: 0, other: 0, alert: 0 })
  const _messageUnread = MESSAGES_DISABLED
    ? EMPTY_MESSAGE_UNREAD
    : normalizeMessageUnreadCounters(messageCenter?.unread)
  const _messageItems = MESSAGES_DISABLED ? [] : (messageCenter?.items || [])
  const messageDirectItems = useMemo(
    () => _messageItems.filter((item) => item?.source === 'direct' || item?.filter === 'message'),
    [_messageItems],
  )
  const messageNotificationItems = useMemo(() => {
    const rows = _messageItems
      .filter((item) => !(item?.source === 'direct' || item?.filter === 'message'))
      .filter((item) => {
        if (String(item?.source || '').trim().toLowerCase() !== 'transaction') return true
        return !isHiddenNewsTransactionKind(item?.kind)
      })
    return dedupeFeedEntries(rows, Math.max(1, rows.length || 1))
  }, [_messageItems])
  const messageSpotlight = MESSAGES_DISABLED ? null : (messageCenter?.spotlight || null)
  const _unreadMessageCountRaw = MESSAGES_DISABLED ? 0 : Number(messageCenter?.unreadCount || 0)
  const _unreadMessageCount = Number.isFinite(_unreadMessageCountRaw) && _unreadMessageCountRaw > 0
    ? Math.min(99, Math.max(1, Math.trunc(_unreadMessageCountRaw)))
    : 0
  const _unreadDirectCount = Math.min(99, Math.max(0, Math.trunc(Number(_messageUnread.direct || 0))))
  const _unreadNotificationCount = Math.min(99, Math.max(0, Math.trunc(Number(_messageUnread.notifications || 0))))
  const messageFilterResolved = MESSAGES_DISABLED ? messageFilter : (messageCenter?.filter || messageFilter)
  const _messageSpotlightIcon = messageIconMeta(messageSpotlight)
  const [starterDetailOpen, setStarterDetailOpen] = useState(false)

  const {
    _activeBuildingFactory,
    _activeUpgradingFactory,
    buildingFactoryRows,
    bulkFuelByItem,
    bulkPreview,
    bulkPreview2x,
    canStartAnotherFactoryBuild,
    canStartAnotherFactoryUpgrade,
    collectModalBusiness,
    collectModalFuelEnough,
    collectModalFuelMeta,
    collectModalMeta,
    collectModalPreview,
    collectModalPreviewBase,
    ctaBulkPrimary,
    ctaBulkSecondary,
    ctaSetupPrimary,
    ctaSetupSecondary,
    ctaUpgradePrimary,
    ctaUpgradeSecondary,
    factoriesEnergyBlockedCount,
    factoriesOwnedCount,
    factoriesReadyCount,
    factoriesUpgradingCount,
    factoryBulkPreview,
    factoryCollectModal,
    factoryCollectModalBlockedReason,
    factoryCollectModalBusyKey,
    factoryPurchaseBusyKey,
    factoryPurchaseModal,
    factoryPurchaseModalCanBuyNow,
    factoryPurchaseModalMissingRows,
    factoryPurchaseModalRows,
    factoryRows,
    factorySlotsUsed,
    factoryUpgradeModal,
    factoryUpgradeModalBlockedBySlot,
    factoryUpgradeModalHasMissingCost,
    factoryUpgradeModalMissingRows,
    hasPropertyFleet,
    inventoryById,
    lockedFactoryRows,
    logisticsCollectNet,
    logisticsPreview,
    logisticsPreview2x,
    logisticsPreviewActive,
    logisticsPreviewFuelEnough,
    maxFactorySlots,
    ownedFactoryRows,
    profileModalDisplayName,
    profileModalIsSelf,
    profileModalMembershipLabel,
    profileModalPremiumActive,
    profileModalRoleValue,
    profileModalSeasonBadge,
    profileModalShowHandle,
    profileModalStaffRole,
    profileModalUsername,
    selectedCollectPreview,
    totalBulkCount,
    totalBulkEnergyFuel,
    totalBulkIncome,
    totalBulkNet,
    totalBulkNet2x,
    totalBulkOilFuel,
    totalBulkTax,
    totalBulkXp,
    upgradingFactoryRows,
    warehouseCards,
    warehouseDisplayCards,
    warehouseTotalQuantity,
  } = useInventoryCalc({
    collectTargetBusinessId,
    companyUpgrade,
    factories,
    factoryCollectModalId,
    factoryPurchaseModalId,
    factoryUpgradeModalId,
    liveNowMs,
    logistics,
    market,
    mustBuyNextUnlockFirst,
    name,
    nextCompanyUnlock,
    overview,
    premiumActive,
    premiumBoostActive,
    premiumMultiplier,
    profile,
    profileModalData,
    profileModalUserId,
    qty,
    role,
    selectedBusiness,
    unlockedBusinesses,
    upgradeCostValue,
    upgradeCurrentLevel,
    upgradeNextLevel,
    user,
    weeklyEventsRuntimeState,
  })

  const {
    buildLeaderboardRows,
    leaderboardListRows,
    leaderboardMeRow,
    leaderboardPageCount,
    leaderboardPageEnd,
    leaderboardPageRows,
    leaderboardPageSafe,
    leaderboardPageSize,
    leaderboardPageStart,
    leaderboardRowDomId,
    leaderboardRowsResolved,
    leaderboardRowsSeason,
    leaderboardSeasonReset,
    leaderboardTotalCount,
    leagueOpenedSeasonChests,
    leaguePendingSeasonChests,
    leagueSeasonPrizes,
    leagueSeasonRewardCatalog,
    leagueSeasonRewardCatalogResolved,
    leagueSeasonRewardForRank,
    profileModalLeagueRanks,
    runLeaderboardSearch,
  } = useLeaderboard({
    avatar,
    leaderboardMetricSafe,
    leaderboardPage,
    leaderboardSearchQuery,
    leaderboardTick,
    league,
    openProfileModal,
    profileModalData,
    profileModalUserId,
    profileTab,
    role,
    setLeaderboardHighlightKey,
    setLeaderboardPage,
    setLeaderboardSearchError,
    setLeaderboardSearchOpen,
    setLeaderboardTick,
    tab,
    user,
  })

  const minesList = Array.isArray(mines?.mines) ? mines.mines : []
  const minesDigDurationSeconds = Math.max(
    1,
    Math.trunc(num(minesList[0]?.digDurationSeconds || DEFAULT_MINE_DIG_DURATION_SEC)),
  )
  const minesCooldownMinutes = Math.max(
    1,
    Math.trunc(num(minesList[0]?.cooldownMinutes || DEFAULT_MINE_COOLDOWN_MINUTES)),
  )
  const minesBaseMinOutput = Math.max(1, Math.trunc(num(minesList[0]?.minOutput || 10)))
  const minesBaseMaxOutput = Math.max(minesBaseMinOutput, Math.trunc(num(minesList[0]?.maxOutput || 500)))
  const minesPremiumMinOutput = minesBaseMinOutput * 2
  const minesPremiumMaxOutput = minesBaseMaxOutput * 2
  const mineDigAction = async (mineId) => {
    const mine = minesList.find((m) => m.id === mineId)
    if (mine && !mine.hasEnoughCash) {
      fail(null, `Yetersiz nakit. ${mine.name} kazısı için ${fmt(mine.costCash)} nakit gerekir.`)
      return
    }
    const key = `mine-dig:${mineId}`
    setBusy(key)
    try {
      const response = await startMineDig(mineId)
      if (!response?.success) {
        fail(response, response?.errors?.global || 'Kazı başlatılamadı.')
        if (response?.reason === 'insufficient_funds') setError(response?.errors?.global || 'Yetersiz nakit.')
        return
      }
      if (response?.autoCollected?.quantity > 0) {
        const autoCollectedLabel = factoryItemMeta(response.autoCollected.itemId)?.label || response.autoCollected.itemName || response.autoCollected.itemId
        setNoticeIsSuccess(true)
        setNotice(`Elde ettiğin kaynak: ${response.autoCollected.quantity} ${autoCollectedLabel} depoya aktarıldı.`)
      }
      setMines((prev) => (response.mines ? { ...prev, mines: response.mines, updatedAt: response.updatedAt } : prev))
      if (response.wallet != null) loadOverview().catch(() => {})
      mineDigCollectedRef.current = false
      setMineCollectResult(null)
      const updatedMine = response.mines?.find((m) => m.id === mineId) || mine || minesList.find((m) => m.id === mineId)
      const nextDigDurationSec = DEFAULT_MINE_DIG_DURATION_SEC
      setMineDigCountdownSec(nextDigDurationSec)
      setMineDigModal(updatedMine ? { mine: updatedMine } : null)
    } finally {
      setBusy('')
    }
  }
  const minesView = renderMinesView({
    busy,
    fail,
    minesBaseMaxOutput,
    minesBaseMinOutput,
    minesCooldownMinutes,
    minesDigDurationSeconds,
    minesList,
    minesPremiumMaxOutput,
    minesPremiumMinOutput,
    openTab,
    setError,
    setMineConfirmModal,
  })

  const missionItems = Array.isArray(missions?.missions)
    ? missions.missions.slice(0, 5)
    : []
  const missionBatchMeta =
    missions?.missionBatch && typeof missions.missionBatch === 'object'
      ? missions.missionBatch
      : null
  const missionBatchSize = Math.max(
    1,
    Math.trunc(num(missionBatchMeta?.size || missionItems.length || 5)),
  )
  const missionClaimedCount = Math.max(
    0,
    Math.trunc(
      num(
        missionBatchMeta?.claimedCount ||
          missionItems.filter((item) => String(item?.status || '').trim().toLowerCase() === 'claimed').length,
      ),
    ),
  )
  const missionBatchIndex = Math.max(1, Math.trunc(num(missionBatchMeta?.batchIndex || 1)))
  const missionSeasonPointsTotal = Math.max(0, Math.trunc(num(missions?.seasonPoints || 0)))
  const missionCashIconPng = '/home/icons/depot/cash.png'
  const missionXpIconPng = '/home/ui/hud/xp-icon.png'
  const missionSlotCooldownMs = Math.max(
    1000,
    Math.trunc(num(missionBatchMeta?.refreshCooldownMs || 4 * 60 * 60 * 1000)),
  )

  const missionProgressMeta = (mission) => {
    const target = Math.max(1, Math.trunc(num(mission?.target || 1)))
    const progress = Math.max(0, Math.min(target, Math.trunc(num(mission?.progress || 0))))
    const status = String(mission?.status || '').trim().toLowerCase()
    const isClaimed = status === 'claimed' || Boolean(mission?.claimedAt)
    const isClaimable = !isClaimed && (status === 'claimable' || progress >= target)
    const percent = Math.max(0, Math.min(100, Math.round((progress / target) * 100)))
    return {
      progress,
      target,
      percent,
      isClaimed,
      isClaimable,
      statusText: isClaimed ? 'Ödül alındı' : isClaimable ? 'Tamamlandı' : 'Devam ediyor',
    }
  }

  const missionSlotRemainingMs = (mission) => {
    const status = String(mission?.status || '').trim().toLowerCase()
    const isClaimed = status === 'claimed' || Boolean(mission?.claimedAt)
    if (!isClaimed) return 0

    const claimRefIso = String(
      mission?.claimedAt || mission?.updatedAt || mission?.createdAt || '',
    ).trim()
    if (!claimRefIso) return 0

    const claimRefMs = new Date(claimRefIso).getTime()
    if (Number.isNaN(claimRefMs) || claimRefMs <= 0) return 0

    const nowMs = chatClockMs || Date.now()
    return Math.max(0, claimRefMs + missionSlotCooldownMs - nowMs)
  }

  useEffect(() => {
    if (tab !== 'missions') return
    if (!Array.isArray(missionItems) || missionItems.length === 0) return
    if (missionSlotRefreshInFlightRef.current) return

    const dueClaimedMissionExists = missionItems.some((mission) => {
      const status = String(mission?.status || '').trim().toLowerCase()
      if (status !== 'claimed' && !mission?.claimedAt) return false
      return missionSlotRemainingMs(mission) <= 0
    })
    if (!dueClaimedMissionExists) return

    missionSlotRefreshInFlightRef.current = true
    void loadMissions().finally(() => {
      missionSlotRefreshInFlightRef.current = false
    })
  }, [tab, missionItems, chatClockMs, loadMissions])

  const missionRewardItems = (mission) => {
    const rewardSources = [
      mission?.rewardItems,
      mission?.reward?.rewardItems,
      mission?.reward,
    ]
    const merged = new Map()
    for (const source of rewardSources) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) continue
      for (const [itemId, amountValue] of Object.entries(source)) {
        const safeItemId = String(itemId || '').trim()
        const safeAmount = Math.max(0, Math.trunc(num(amountValue)))
        if (!safeItemId || safeAmount <= 0) continue
        if (
          safeItemId === 'cash' ||
          safeItemId === 'xp' ||
          safeItemId === 'reputation' ||
          safeItemId === 'title' ||
          safeItemId === 'rewardItems'
        ) {
          continue
        }
        const meta = DEPOT_CATALOG.find((entry) => String(entry.id || '').trim() === safeItemId)
        if (!meta) continue
        if (meta.fromWallet || meta.fromReputation) continue
        const current = merged.get(safeItemId)
        merged.set(safeItemId, {
          itemId: safeItemId,
          label: meta.label,
          icon: meta.png || meta.icon || '/home/icons/v2/nav-missions.png',
          amount: (current?.amount || 0) + safeAmount,
        })
      }
    }
    return Array.from(merged.values())
  }

  const claimDailyMissionAction = async (missionId) => {
    const safeId = String(missionId || '').trim()
    if (!safeId || busy) return
    setBusy(`claim-mission:${safeId}`)
    try {
      const response = await claimMissionReward(safeId)
      if (!response?.success) return fail(response, response?.errors?.global || 'Ödül alınamadı.')
      const seasonPointsGained = Math.max(0, Math.trunc(num(response?.seasonPointsGained || 0)))
      setNotice(
        response?.message ||
          (seasonPointsGained > 0
            ? `Görev ödülü alındı. +${fmt(seasonPointsGained)} sezon puanı kazandın.`
            : 'Görev ödülü alındı.'),
      )
      setNoticeIsSuccess(true)
      await Promise.all([loadMissions(), loadOverview(), loadProfile()])
    } finally {
      setBusy('')
    }
  }

  const {
    buildFallbackForexHistory,
    buildSmoothForexPath,
    forexChartData,
    forexChartInteractionEnabled,
    forexChartRange,
    forexDayChangePercent,
    forexHolding,
    forexHoldingAverageBuyRate,
    forexHoldingCostTry,
    forexHoldingMarketValueTry,
    forexHoldingQuantity,
    forexHoldingRemainingCapacity,
    forexHoldingUnrealizedPnlPercent,
    forexHoldingUnrealizedPnlTry,
    forexIsMobileView,
    forexLastUpdateLabel,
    forexLastUpdateRaw,
    forexLastUpdatedMs,
    forexMarket,
    forexNextUpdateAtRaw,
    forexNextUpdateLabel,
    forexNextUpdateMs,
    forexNextUpdateMsFromServer,
    forexSpreadTry,
    forexTradeExceedsTotalHoldingCap,
    forexTradeFeePreview,
    forexTradeGrossPreview,
    forexTradeInsufficientHoldings,
    forexTradeInsufficientWallet,
    forexTradeMaxQuantity,
    forexTradeQuantity,
    forexTradeQuantityRaw,
    forexTradeQuantityTooHigh,
    forexTradeRate,
    forexTradeRateValid,
    forexTradeSide,
    forexTradeSubmitBlocked,
    forexTradeTotalPreview,
    forexTrendDirection,
    forexUpdateIntervalMs,
    forexWalletTry,
    formatForexChartAxisLabel,
    formatForexChartUpdatedAt,
    formatForexChartUpdatedAtCompact,
    handleBankCountdownElapsed,
    handleForexCountdownElapsed,
    queueForexTouchHoverByClientX,
    setForexHoverByClientX,
  } = useForexChart({
    activeTabRef,
    busy,
    forex,
    forexBoundaryRetryTimerRef,
    forexChartRangeId,
    forexHoverPendingRef,
    forexHoverRafRef,
    forexTradeForm,
    forexViewportWidth,
    history,
    loadBank,
    loadForex,
    market,
    overview,
    profile,
    setForexChartHoverIndex,
  })

  const runForexTradeAction = async () => {
    if (busy || !forexMarket) return
    if (forexTradeQuantityTooHigh) {
      setError(`Güvenlik limiti: en fazla ${fmt(FOREX_TRADE_MAX_QUANTITY)} adet işlem yapabilirsin.`)
      return
    }
    if (forexTradeQuantity < 1) {
      setError('Minimum işlem miktarı 1 adet olmalıdır.')
      return
    }
    if (!Number.isSafeInteger(forexTradeQuantity)) {
      setError('Geçersiz işlem miktarı algılandı. Lütfen tekrar deneyin.')
      return
    }

    if (!forexTradeRateValid || !Number.isFinite(forexTradeTotalPreview) || forexTradeTotalPreview <= 0) {
      setError('Kur verisi güncelleniyor. Birkaç saniye sonra tekrar deneyin.')
      return
    }
    if (forexTradeSide === 'buy' && forexTradeInsufficientWallet) {
      setError(`Yetersiz nakit. Bu işlem için ${fmtTry(forexTradeTotalPreview)} gerekiyor.`)
      return
    }
    if (forexTradeSide === 'buy' && forexTradeExceedsTotalHoldingCap) {
      setError(`Maksimum toplam TCT limiti ${fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} adet. Kalan kapasite: ${fmt(forexHoldingRemainingCapacity)}.`)
      return
    }
    if (forexTradeSide === 'sell' && forexTradeInsufficientHoldings) {
      setError('Bozum için yeterli TCT bakiyesi yok.')
      return
    }

    const safeQuantity = Math.max(
      1,
      Math.min(
        FOREX_TRADE_MAX_QUANTITY,
        forexTradeSide === 'buy' ? forexHoldingRemainingCapacity : FOREX_TRADE_MAX_QUANTITY,
        forexTradeQuantity,
      ),
    )
    const rawCurrencyId = String(forexMarket?.id || 'tct').trim().toLowerCase()
    const safeCurrencyId = FOREX_CURRENCY_ID_PATTERN.test(rawCurrencyId) ? rawCurrencyId : 'tct'
    const busyKey = forexTradeSide === 'buy' ? 'forex-buy' : 'forex-sell'
    setBusy(busyKey)
    try {
      const response = forexTradeSide === 'buy'
        ? await buyForexCurrency(safeQuantity, safeCurrencyId)
        : await sellForexCurrency(safeQuantity, safeCurrencyId)

      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Döviz işlemi başarısız.')
      }

      setNotice(
        response?.message
          || (forexTradeSide === 'buy' ? 'TCT alımı tamamlandı.' : 'TCT bozumu tamamlandı.'),
      )
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadForex()])
    } finally {
      setBusy('')
    }
  }

  const runBankDepositAction = async () => {
    if (busy) return
    if (bankDepositAmount < bankTransferMinAmount) {
      setError(`Yatırılacak tutar en az ${fmt(bankTransferMinAmount)} olmalıdır.`)
      return
    }
    if (bankDepositAmount > bankWalletNow) {
      setError(`Yetersiz nakit. En fazla ${fmt(bankWalletNow)} yatırabilirsin.`)
      return
    }
    setBusy(bankBusyDepositKey)
    try {
      const response = await depositBankCash(bankDepositAmount)
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Bankaya yatırma işlemi başarısız.')
      }
      setBankState(response?.bank || null)
      setBankForm((prev) => ({ ...prev, depositAmount: '' }))
      setNotice(response?.message || 'Nakit bankaya başarıyla aktarıldı.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const runBankWithdrawAction = async () => {
    if (busy) return
    if (bankWithdrawAmount < bankTransferMinAmount) {
      setError(`Çekilecek tutar en az ${fmt(bankTransferMinAmount)} olmalıdır.`)
      return
    }
    if (bankWithdrawAmount > bankMainBalance) {
      setError(`Banka bakiyesi yetersiz. En fazla ${fmt(bankMainBalance)} çekebilirsin.`)
      return
    }
    setBusy(bankBusyWithdrawKey)
    try {
      const response = await withdrawBankCash(bankWithdrawAmount)
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Bankadan çekim işlemi başarısız.')
      }
      setBankState(response?.bank || null)
      setBankForm((prev) => ({ ...prev, withdrawAmount: '' }))
      setNotice(response?.message || 'Bankadan nakit çekme işlemi tamamlandı.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const runBankTermOpenAction = async () => {
    if (busy) return
    if (bankTermLive.active) {
      setError('Aktif bir vadeli hesabın var. Önce mevcut vadeyi tahsil etmelisin.')
      return
    }
    if (bankMainBalance < bankTransferMinAmount) {
      setError('Vadeli açmak için önce bankaya para yatırmalısın.')
      return
    }
    if (bankTermAmount < bankTransferMinAmount) {
      setError(`Vadeli için en az ${fmt(bankTransferMinAmount)} yatırmalısın.`)
      return
    }
    if (bankTermAmount > bankMainBalance) {
      setError(`Vadeli açmak için banka bakiyesi yetersiz. En fazla ${fmt(bankMainBalance)} yatırabilirsin.`)
      return
    }
    if (bankTermAmount > bankTermMaxPrincipal) {
      setError(`Vadeli yatırım üst limiti ${fmt(bankTermMaxPrincipal)}. Daha yüksek tutar giremezsin.`)
      return
    }
    const safeDays = Math.max(1, Math.trunc(num(bankSelectedTermDays || 1)))
    setBusy(bankBusyTermOpenKey)
    try {
      const response = await openBankTermDeposit(bankTermAmount, safeDays)
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Vadeli hesap açılamadı.')
      }
      setBankState(response?.bank || null)
      setBankForm((prev) => ({ ...prev, termAmount: '' }))
      setNotice(response?.message || 'Vadeli faiz hesabı açıldı.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const runBankTermClaimAction = async () => {
    if (busy) return
    if (!bankTermLive.active) {
      setError('Tahsil edilecek aktif vadeli hesap bulunmuyor.')
      return
    }
    if (!bankTermMatured) {
      setError(`Vade henüz dolmadı. Kalan süre: ${bankTermCountdownLabel}.`)
      return
    }
    setBusy(bankBusyTermClaimKey)
    try {
      const response = await claimBankTermDeposit()
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Vadeli tahsilatı yapılamadı.')
      }
      setBankState(response?.bank || null)
      setNotice(response?.message || 'Vadeli faiz tahsil edildi.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const forexHoveredCandle = (
    forexChartData
    && forexChartHoverIndex >= 0
    && forexChartHoverIndex < forexChartData.points.length
  )
    ? forexChartData.points[forexChartHoverIndex]
    : null

  const missionsView = renderMissionsView({
    busy,
    claimDailyMissionAction,
    missionBatchIndex,
    missionBatchSize,
    missionCashIconPng,
    missionClaimedCount,
    missionItems,
    missionProgressMeta,
    missionRewardItems,
    missionSeasonPointsTotal,
    missionSlotRemainingMs,
    missionXpIconPng,
    missions,
    openTab,
  })

  const tradeableDepotItems = (DEPOT_CATALOG || []).filter(
    (d) => !d.fromWallet && !d.fromReputation && d.id !== 'water-right' && d.label !== 'Su'
  )
  const marketplaceMaxQty = logisticsTotalCapacityNow > 0 ? logisticsTotalCapacityNow : 0
  const marketplaceNoCapacity = logisticsTotalCapacityNow <= 0
  const cashIconSrc = '/home/icons/depot/cash.webp'
  const NakitLabel = ({ value, showIcon = true }) => (
    <span className="marketplace-nakit-inline">
      {showIcon && <img src={cashIconSrc} alt="" className="marketplace-nakit-icon" onError={(e) => { e.target.style.display = 'none' }} />}
      <span>{typeof value === 'number' ? fmt(value) : String(value ?? '')}</span>
      <span className="marketplace-nakit-text"> Nakit</span>
    </span>
  )
  const marketplaceView = renderMarketplaceView({
    NakitLabel,
    busy,
    cancelOrderBookOrder,
    cashIconSrc,
    fail,
    inventoryById,
    loadMarket,
    loadOverview,
    loadProfile,
    market,
    marketplaceFilter,
    marketplaceMaxQty,
    marketplaceNoCapacity,
    marketplaceTab,
    name,
    openProfileModal,
    openTab,
    overview,
    placeOrderBookOrder,
    profile,
    qty,
    sellForm,
    setBusy,
    setMarketplaceBuyModal,
    setMarketplaceBuyModalQty,
    setMarketplaceFilter,
    setMarketplaceTab,
    setNotice,
    setNoticeIsSuccess,
    setSellForm,
    tradeableDepotItems,
    walletCashValue,
    walletGoldValue,
  })

  const forexView = renderForexView({
    busy,
    forex,
    forexChartData,
    forexChartInteractionEnabled,
    forexChartRange,
    forexChartRangeId,
    forexDayChangePercent,
    forexHolding,
    forexHoldingAverageBuyRate,
    forexHoldingQuantity,
    forexHoldingRemainingCapacity,
    forexHoldingUnrealizedPnlPercent,
    forexHoldingUnrealizedPnlTry,
    forexHoveredCandle,
    forexIsMobileView,
    forexLastUpdateLabel,
    forexMarket,
    forexNextUpdateLabel,
    forexNextUpdateMs,
    forexSpreadTry,
    forexTradeExceedsTotalHoldingCap,
    forexTradeFeePreview,
    forexTradeForm,
    forexTradeInsufficientHoldings,
    forexTradeInsufficientWallet,
    forexTradeMaxQuantity,
    forexTradeQuantity,
    forexTradeQuantityTooHigh,
    forexTradeRate,
    forexTradeRateValid,
    forexTradeSide,
    forexTradeSubmitBlocked,
    forexTradeTotalPreview,
    forexTrendDirection,
    forexWalletTry,
    formatForexChartAxisLabel,
    handleForexCountdownElapsed,
    openTab,
    queueForexTouchHoverByClientX,
    runForexTradeAction,
    setForexChartHoverIndex,
    setForexChartRangeId,
    setForexHoverByClientX,
    setForexTradeForm,
  })

  const bankView = renderBankView({
    bankBusyDepositKey,
    bankBusyTermClaimKey,
    bankBusyTermOpenKey,
    bankBusyWithdrawKey,
    bankDepositFeePreview,
    bankDepositFeeRatePctLabel,
    bankDepositNetPreview,
    bankDepositSubmitBlocked,
    bankForm,
    bankHistoryRows,
    bankMainBalance,
    bankSelectedTermDays,
    bankTermClaimSubmitBlocked,
    bankTermLive,
    bankTermLiveEstimatedProfit,
    bankTermLiveExpectedPayout,
    bankTermLivePrincipal,
    bankTermLiveTotalRatePct,
    bankTermMatured,
    bankTermMaxAllowedNow,
    bankTermMaxPrincipal,
    bankTermOpenSubmitBlocked,
    bankTermOpenedAtLabel,
    bankTermOptions,
    bankTermPayoutPreview,
    bankTermProfitPreview,
    bankTermRateCapPct,
    bankTermRemainingLiveMs,
    bankTermStatusLabel,
    bankTermTotalRatePct,
    bankTermUnlockAtLabel,
    bankTotalAssetsNow,
    bankTransferMinAmount,
    bankWalletNow,
    bankWithdrawFeePreview,
    bankWithdrawNetPreview,
    bankWithdrawSubmitBlocked,
    busy,
    handleBankCountdownElapsed,
    openTab,
    runBankDepositAction,
    runBankTermClaimAction,
    runBankTermOpenAction,
    runBankWithdrawAction,
    setBankForm,
  })

  const tutorialStepCount = Math.max(1, TUTORIAL_STEPS.length)
  const tutorialStepSafeIndex = Math.max(0, Math.min(tutorialStepCount - 1, Math.trunc(num(tutorialStepIndex))))
  const tutorialCurrentStep = TUTORIAL_STEPS[tutorialStepSafeIndex] || TUTORIAL_STEPS[0]
  const tutorialCurrentStepId = String(tutorialCurrentStep?.id || `step-${tutorialStepSafeIndex + 1}`).trim() || `step-${tutorialStepSafeIndex + 1}`
  const tutorialProgressPct = Math.max(0, Math.min(100, Math.round(((tutorialStepSafeIndex + 1) / tutorialStepCount) * 100)))
  const tutorialCurrentTargetLabel = String(tutorialCurrentStep?.target?.focusLabel || '').trim()
  const tutorialPurposeText = String(tutorialCurrentStep?.objective || tutorialCurrentStep?.body || '').trim()
  const tutorialStepImageSrc =
    String(TUTORIAL_STEP_IMAGE_BY_ID[tutorialCurrentStepId] || '').trim() || TUTORIAL_ASSISTANT_IMAGE_SRC
  const homeView = renderHomeView({
    _loadLeague,
    busy,
    leaguePendingSeasonChests,
    openTab,
    setSeasonChestsOpen,
    setWarehouseOpen,
    weeklyEventsHomeHint,
  })

  const announcementsView = renderAnnouncementsView({ cityAnnouncements, penalizedUsers })

  const rulesView = renderRulesView()

  const penalizedView = renderPenalizedView({ penalizedUsers })

  const eventsView = renderEventsView({
    weeklyEventRangeCards,
    weeklyEventsHeroBadge,
    weeklyEventsHeroCountdown,
    weeklyEventsHeroSubtitle,
    weeklyEventsPrimary,
    weeklyEventsRuntimeState,
    weeklyEventsTodayDetail,
    weeklyEventsTodaySummary,
  })
  const factoriesView = renderFactoriesView({
    buildingFactoryRows,
    busy,
    buyFactoryAction,
    canStartAnotherFactoryBuild,
    canStartAnotherFactoryUpgrade,
    closeFactoryBulkCollectModal,
    closeFactoryCollectModal,
    closeFactoryPurchaseModal,
    collectFactoryAction,
    confirmFactoryBulkCollectFromModal,
    confirmFactoryCollectFromModal,
    confirmFactoryUpgradeFromModal,
    factoriesEnergyBlockedCount,
    factoriesOwnedCount,
    factoriesReadyCount,
    factoriesUpgradingCount,
    factoryBulkModalError,
    factoryBulkModalOpen,
    factoryBulkPreview,
    factoryCollectModal,
    factoryCollectModalBlockedReason,
    factoryCollectModalBusyKey,
    factoryCollectModalError,
    factoryPurchaseBusyKey,
    factoryPurchaseModal,
    factoryPurchaseModalCanBuyNow,
    factoryPurchaseModalMissingRows,
    factoryPurchaseModalRows,
    factoryPurchaseOverlayRef,
    factoryUpgradeModal,
    factoryUpgradeModalBlockedBySlot,
    factoryUpgradeModalHasMissingCost,
    factoryUpgradeModalMissingRows,
    inventoryById,
    lockedFactoryRows,
    openFactoryBulkCollectModal,
    openFactoryCollectModal,
    openFactoryPurchaseModal,
    ownedFactoryRows,
    premiumActive,
    premiumBoostActive,
    premiumDiamond,
    premiumMultiplier,
    renderWeeklyEventInlineCard,
    setFactoryUpgradeModalId,
    speedupFactoryBuildAction,
    speedupFactoryUpgradeAction,
    upgradingFactoryRows,
  })

  const businessView = renderBusinessView({
    activeBusinessCards,
    activeMarketModelOptions,
    activeModelFilter,
    business,
    businessDetailTab,
    businessModal,
    businessScene,
    busy,
    buyCompanyBusiness,
    buyTruckAction,
    buyVehicleFromMarket,
    canOrderTruckNow,
    canUpgradeBusinessLevel,
    cancelListingFromModal,
    closeListingModal,
    closeMarketListingDetail,
    closeMarketPurchaseResult,
    collectBulkAction,
    collectModalBusiness,
    collectModalFuelEnough,
    collectModalFuelMeta,
    collectModalMeta,
    collectModalPreview,
    collectModalPreviewBase,
    companyBootstrapped,
    companyBusinessCount,
    companyBusinessLimit,
    companyLegalLabel,
    companyLevel,
    companyUpgrade,
    confirmCollectFromModal,
    confirmListingModal,
    confirmLogisticsCollectFromModal,
    confirmScrapFromListingModal,
    ctaBulkPrimary,
    ctaBulkSecondary,
    ctaSetupPrimary,
    ctaSetupSecondary,
    ctaUpgradePrimary,
    ctaUpgradeSecondary,
    detailVehiclesView,
    fleetHelpLabel,
    fleetHelpOrderLabel,
    fleetHelpSecondHandLabel,
    fleetHelpUnit,
    goToMyListingsFromPurchase,
    goToOwnedFleetFromPurchase,
    hasPropertyFleet,
    inventoryById,
    listingDraft,
    listingDraftCancelBusyKey,
    listingDraftIsListed,
    listingDraftLiveLifetime,
    listingDraftSafeListingId,
    listingFriends,
    listingFriendsLoading,
    liveNowMs,
    logistics,
    logisticsCollectCountdown,
    logisticsCollectLocked,
    logisticsCollectNet,
    logisticsDetailTab,
    logisticsGarageTrucks,
    logisticsMyListings,
    logisticsOrderCountdown,
    logisticsPreview,
    logisticsPreviewActive,
    logisticsPreviewFuelEnough,
    logisticsPublicListings,
    logisticsScreenSectionTitle,
    logisticsSoldListingRows,
    logisticsTotalCapacityNow,
    logisticsTruckCatalog,
    logisticsTruckCount,
    logisticsUnlockedModelLevel,
    logisticsViewIsDetail,
    logisticsViewIsGallery,
    logisticsViewIsMarket,
    market,
    marketAssetLabel,
    marketDetailAssetMeta,
    marketDetailBusinessLabel,
    marketDetailCanAfford,
    marketDetailCanBuyByLevel,
    marketDetailCommissionAmount,
    marketDetailCommissionRate,
    marketDetailDraft,
    marketDetailHasBusinessAccess,
    marketDetailLevelCurrent,
    marketDetailLevelCurrentLabel,
    marketDetailLiveLifetime,
    marketDetailPrice,
    marketDetailRequiredLevel,
    marketDetailSellerPayout,
    marketDetailTemplateId,
    marketDetailTotalCost,
    marketFilterForm,
    marketPurchaseResult,
    mustBuyNextUnlockFirst,
    name,
    nextCompanyUnlock,
    openActiveListingModal,
    openBusinessDetail,
    openBusinessGallery,
    openBusinessHub,
    openBusinessMarket,
    openCollectPreview,
    openFleetHelp,
    openListingPriceModal,
    openLogisticsCenter,
    openLogisticsCollectPreview,
    openLogisticsDetail,
    openLogisticsGallery,
    openLogisticsMarket,
    openMarketListingDetail,
    openScrapConfirmModal,
    openTab,
    openTruckListingModal,
    openVehicleListingModal,
    ownedTabLabel,
    playerLevelNow,
    premiumActive,
    premiumBoostActive,
    premiumMultiplier,
    produceBizVehicle,
    renderWeeklyEventInlineCard,
    resetMarketFilters,
    runBulkCollectPreview,
    selectedBuildRows,
    selectedBusiness,
    selectedBusinessFuelMeta,
    selectedBusinessGalleryTitle,
    selectedBusinessHeaderTitle,
    selectedBusinessMarketTitle,
    selectedBusinessMeta,
    selectedCanOrderNow,
    selectedCollectCooldownLabel,
    selectedCollectLocked,
    selectedCollectPreview,
    selectedHasCapacityForOrder,
    selectedMarketPublicRows,
    selectedMyListings,
    selectedOrderCountdown,
    selectedOrderRemainingMs,
    selectedSoldListingRows,
    selectedUnlockedModelLevel,
    setBusinessDetailTab,
    setBusinessModal,
    setBusinessScene,
    setCollectTargetBusinessId,
    setListingDraft,
    setLogisticsDetailTab,
    setMarketFilterForm,
    setupVisibleRows,
    totalBulkCount,
    totalBulkEnergyFuel,
    totalBulkIncome,
    totalBulkNet,
    totalBulkNet2x,
    totalBulkOilFuel,
    totalBulkTax,
    totalBulkXp,
    upBiz,
    upgradeAnchorBusinessId,
    upgradeCostValue,
    upgradeCurrentLevel,
    upgradeMaxLevel,
    upgradeMissingCashValue,
    upgradeNextLevel,
    upgradeProgressPercent,
    upgradeStatusLabel,
    walletNow,
    weeklyEventsRuntimeState,
  })

  const _marketView = (
    <section className="panel-stack">
      <article className="card">
        <div className="tab-strip five">
          {MARKET_TABS.map((m) => (
            <button key={m} className={marketTab === m ? 'on' : ''} onClick={() => setMarketTab(m)}>
              {marketTabLabel(m)}
            </button>
          ))}
        </div>

        {marketTab === 'auction' ? (
          <section className="panel-stack">
            <article className="tile">
              <h4>Yeni Açık Artırma</h4>
              <div className="grid two">
                <label>
                  Ürün
                  <select
                    value={auctionForm.itemId}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, itemId: e.target.value }))}
                  >
                    {(market?.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  Miktar
                  <input
                    className="qty-input"
                    value={auctionForm.quantity}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 4) || '0' }))}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Başlangıç Teklifi
                  <input
                    className="qty-input"
                    value={auctionForm.startBid}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, startBid: e.target.value.replace(/[^\d]/g, '').slice(0, 7) || '0' }))}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Min Artış
                  <input
                    className="qty-input"
                    value={auctionForm.minIncrement}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, minIncrement: e.target.value.replace(/[^\d]/g, '').slice(0, 6) || '0' }))}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Süre (dk)
                  <input
                    className="qty-input"
                    value={auctionForm.durationMinutes}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, durationMinutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3) || '30' }))}
                    inputMode="numeric"
                  />
                </label>
              </div>
              <button className="btn btn-primary full" onClick={createAuctionAction} disabled={Boolean(busy)}>
                {busy === 'create-auction' ? 'Açılıyor...' : 'Açık Artırmayı Başlat'}
              </button>
            </article>

            <div className="grid two">
              {(market?.activeAuctions || []).slice(0, 8).map((auction) => {
                const isMine = Boolean(auction.myAuction)
                const suggestedBid = auction.minNextBid || (num(auction.currentBid) + num(auction.minIncrement))
                const bidValue = auctionBidById[auction.id] || String(Math.max(1, Math.trunc(num(suggestedBid))))
                return (
                  <article key={auction.id} className="tile">
                    <strong>{auction.title}</strong>
                    <p>Satıcı {auction.sellerName || 'Oyuncu'} | Miktar {fmt(auction.quantity || 0)}</p>
                    <p>Teklif {fmt(auction.currentBid || 0)} | Min sonraki {fmt(suggestedBid)}</p>
                    <p>
                      Bitiş{' '}
                      {new Date(auction.endAt).toLocaleString('tr-TR', {
                        timeZone: TURKIYE_TIMEZONE,
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </p>
                    {isMine ? (
                      <p className="muted">Bu artırma sana ait.</p>
                    ) : (
                      <div className="row gap-sm">
                        <input
                          className="qty-input"
                          value={bidValue}
                          onChange={(e) => setAuctionBidById((prev) => ({ ...prev, [auction.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 7) || '0' }))}
                          inputMode="numeric"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => void bidAuctionAction(auction)}
                          disabled={Boolean(busy)}
                        >
                          {busy === `bid-auction:${auction.id}` ? 'Teklif...' : 'Teklif Ver'}
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {marketTab === 'orderbook' ? (
          <section className="panel-stack">
            <div className="row gap-sm">
              <label htmlFor="book-item">Ürün</label>
              <select id="book-item" value={bookItemId} onChange={(e) => {
                const nextId = e.target.value
                setBookItemId(nextId)
                void loadOrderBook(nextId)
              }}>
                {(market?.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="btn" onClick={() => void loadOrderBook(bookItemId)} disabled={Boolean(busy)}>Yenile</button>
            </div>
            <div className="orderbook-grid">
              <article className="tile">
                <h4>Alış Defteri</h4>
                <ul className="simple-list">
                  {(orderBook?.orderBook?.bids || []).map((bid, index) => (
                    <li key={`bid-${index}`} className="row">
                      <span>{fmt(bid.quantity)}</span>
                      <strong>{fmt(bid.price)}</strong>
                      <small>{bid.source}</small>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="tile">
                <h4>Satış Defteri</h4>
                <ul className="simple-list">
                  {(orderBook?.orderBook?.asks || []).map((ask, index) => (
                    <li key={`ask-${index}`} className="row">
                      <span>{fmt(ask.quantity)}</span>
                      <strong>{fmt(ask.price)}</strong>
                      <small>{ask.source}</small>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <article className="tile">
              <h4>Limit Emir Ver</h4>
              <div className="grid two">
                <label>
                  Yönü
                  <select value={orderForm.side} onChange={(e) => setOrderForm((prev) => ({ ...prev, side: e.target.value }))}>
                    <option value="buy">Alış</option>
                    <option value="sell">Satış</option>
                  </select>
                </label>
                <label>
                  Miktar
                  <input className="qty-input" value={orderForm.quantity} onChange={(e) => setOrderForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 4) || '0' }))} inputMode="numeric" />
                </label>
                <label>
                  Limit Fiyat
                  <input className="qty-input" value={orderForm.limitPrice} onChange={(e) => setOrderForm((prev) => ({ ...prev, limitPrice: e.target.value.replace(/[^\d]/g, '').slice(0, 6) || '0' }))} inputMode="numeric" />
                </label>
                <label>
                  Süre (dk)
                  <input className="qty-input" value={orderForm.expiresMinutes} onChange={(e) => setOrderForm((prev) => ({ ...prev, expiresMinutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3) || '30' }))} inputMode="numeric" />
                </label>
              </div>
              <button className="btn btn-primary full" onClick={placeLimitOrderAction} disabled={Boolean(busy)}>
                {busy === 'place-orderbook' ? 'Emir oluşturuluyor...' : 'Limit Emri Aç'}
              </button>
            </article>
            <article className="tile">
              <h4>Açık Emirlerin</h4>
              <ul className="simple-list">
                {(orderBook?.openOrders || []).filter((entry) => entry.status === 'open').map((entry) => (
                  <li key={entry.id} className="tile">
                    <div className="row"><strong>{entry.itemName}</strong><span>{entry.side === 'buy' ? 'ALIŞ' : 'SATIŞ'}</span></div>
                    <p>Fiyat {fmt(entry.limitPrice)} | Kalan {fmt(entry.remainingQuantity)}</p>
                    <button className="btn btn-danger" onClick={() => cancelLimitOrderAction(entry.id)} disabled={Boolean(busy)}>
                      {busy === `cancel-order:${entry.id}` ? 'İptal...' : 'Emri İptal Et'}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}

        {marketTab === 'chart' ? (
          <div>
            <div className="row"><label htmlFor="chart-item">Kaynak</label><select id="chart-item" value={chartItem?.id || ''} onChange={(e) => setChartItemId(e.target.value)}>{(market?.items || []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
            <Chart points={chartPoints} />
            {chartItem ? <p className="muted">{chartItem.name} anlık fiyat {fmt(chartItem.price)}</p> : null}
          </div>
        ) : null}

        {marketTab === 'buy' || marketTab === 'sell' ? (
          <div className="simple-list">
            {(market?.items || []).map((i) => {
              const q = qty[i.id] ?? '10'
              const side = marketTab === 'buy' ? 'buy' : 'sell'
              return <article key={i.id} className="tile">
                <div className="row"><strong>{i.name}</strong><span className={`trend ${i.changePercent >= 0 ? 'up' : 'down'}`}>{`${i.changePercent > 0 ? '+' : ''}${num(i.changePercent).toFixed(2)}%`}</span></div>
                <p>Fiyat {fmt(i.price)} | Stok {fmt(i.stock)} | Envanter {fmt(i.owned)}</p>
                <div className="row gap-sm">
                  <input className="qty-input" value={q} onChange={(e) => setQty((p) => ({ ...p, [i.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }))} inputMode="numeric" />
                  <button className={`btn ${side === 'buy' ? 'btn-success' : 'btn-danger'}`} onClick={() => doTrade(i.id, side)} disabled={Boolean(busy)}>
                    {busy === `${side}:${i.id}` ? 'İşleniyor...' : side === 'buy' ? `Al (${fmt(i.buyPrice)})` : `Sat (${fmt(i.sellPrice)})`}
                  </button>
                </div>
              </article>
            })}
          </div>
        ) : null}
      </article>
    </section>
  )

  const {
    chatActivityNewsFeed,
    chatAnnouncementFeed,
    chatNewsFeed,
    chatPlayerNewsFeed,
    currentChatProfileName,
    currentChatProfileUserId,
    formatMessageDate,
    formatMessageTimeAgo,
  } = useChatNewsFeed({
    chatRecentPlayers,
    cityAnnouncements,
    messageNotificationItems,
    overview,
    profile,
    user,
  })

  useEffect(() => {
    if (!chatNewsExpandedId) return
    const expandedId = String(chatNewsExpandedId || '')
    const hasExpandedItem = chatNewsFeed.some((entry) => String(entry?.id || '') === expandedId)
    if (!hasExpandedItem) {
      setChatNewsExpandedId('')
    }
  }, [chatNewsExpandedId, chatNewsFeed])

  const chatCommunityTitle = chatCommunityTab === 'haberler' ? 'Haberler' : chatCommunityTab === 'kurallar' ? 'Kurallar' : 'Sohbet'
  const isSohbetCommunityTab = chatCommunityTab === 'sohbet'

  const chatView = renderChatView({
    _chatTimeline,
    _chatUsersById,
    _sendChat,
    avatar,
    avatarSrc,
    busy,
    chat,
    chatCommunityTab,
    chatCommunityTitle,
    chatCooldownActive,
    chatHardRestrictionActive,
    chatInput,
    chatMessageRefs,
    chatNewsExpandedId,
    chatNewsFeed,
    chatRecentPlayersLoading,
    chatRestrictionEndLabel,
    chatRestrictionReason,
    chatRestrictionRemainingMs,
    chatRestrictionTitle,
    chatThreadRef,
    formatMessageDate,
    formatMessageTimeAgo,
    isSohbetCommunityTab,
    isStaffUser,
    lv,
    openChatReportModal,
    openProfileModal,
    openTab,
    overview,
    profile,
    role,
    setChatCommunityTab,
    setChatInput,
    setChatNewsExpandedId,
    staffBlockMessagesAction,
    staffDeleteChatMessageAction,
    user,
  })

  const messageItemTag = (typeOrKind) => {
    const t = String(typeOrKind || '').toLowerCase()
    if (t === 'announcement') return 'DUYURU'
    if (t === 'market' || t === 'trade') return 'PAZAR'
    if (t === 'business') return 'İşletmeler'
    if (t === 'factory') return 'Fabrikalar'
    if (t === 'mine') return 'Madenler'
    return 'BİLDİRİM'
  }
  const messageItemIcon = () => '/home/icons/messages/bildirim.webp'
  const dmRelationship = messageReplyTarget?.relationship || null
  const dmBlockedByMe = Boolean(dmRelationship?.blockedByMe)
  const dmBlockedMe = Boolean(dmRelationship?.blockedMe)
  const dmModeration = normalizeUserModeration(
    messageReplyTarget?.moderation || messageCenter?.moderation || overview?.profile?.moderation,
  )
  const dmMessageBlockUntil = dmModeration?.dmBlock?.blockedUntil || ''
  const dmMessageBlockRemainingMs = remainingMsFromIso(dmMessageBlockUntil, chatClockMs)
  const dmMessageBlockActive = dmMessageBlockRemainingMs > 0
  const dmMessageBlockReasonLabel = String(dmModeration?.dmBlock?.reason || '').trim() || 'Yönetici mesaj engeli'
  const dmMessageBlockEndLabel = formatDateTime(dmMessageBlockUntil)
  const dmCanSend = !(dmBlockedByMe || dmBlockedMe || dmMessageBlockActive)
  const dmTargetRole = normalizeRoleValue(messageReplyTarget?.role || 'player')
  const canReportDmTarget = dmTargetRole !== 'admin' && role !== 'admin'
  const staffCanModerateDmTarget = role === 'admin' || dmTargetRole === 'player'
  const dmPlaceholder = dmMessageBlockActive
    ? 'DM mesaj engelin aktif.'
    : dmBlockedByMe
    ? 'Engellediğin kullanıcıya mesaj gönderemezsin.'
    : dmBlockedMe
      ? 'Bu kullanıcı seni engelledi.'
      : 'Mesaj yaz...'
  const dmReportMessages = Array.isArray(dmReportModal?.messages) ? dmReportModal.messages : []
  const dmReportSelectedMessage = dmReportMessages.find(
    (entry) => String(entry?.id || '').trim() === String(dmReportModal?.selectedMessageId || '').trim(),
  ) || null
  const dmReportReasonLength = String(dmReportModal?.reason || '').length

  const messagesView = renderMessagesView({
    _clearReplyTarget,
    _openReplyToMessage,
    _readMessageItemAction,
    _respondFriendRequestAction,
    _sendDirectMessageAction,
    _toggleBlockByMessageTargetAction,
    _unreadDirectCount,
    _unreadNotificationCount,
    avatar,
    busy,
    canReportDmTarget,
    dmBlockedByMe,
    dmCanSend,
    dmMessageBlockActive,
    dmMessageBlockEndLabel,
    dmMessageBlockReasonLabel,
    dmMessageBlockRemainingMs,
    dmPlaceholder,
    formatMessageDate,
    isStaffUser,
    loadMessageCenter,
    messageDirectItems,
    messageForm,
    messageItemIcon,
    messageItemTag,
    messageNotificationItems,
    messageReplyTarget,
    messageThread,
    messageViewTab,
    openDmReportModal,
    openProfileModal,
    openTab,
    overview,
    premiumActive,
    profile,
    role,
    selfRoleLabel,
    setMessageFilter,
    setMessageForm,
    setMessageViewTab,
    setStarterDetailOpen,
    staffBlockMessagesAction,
    staffCanModerateDmTarget,
    staffDeleteDirectMessageAction,
    user,
  })

  const profileContent = renderProfileContent({
    _loadLeague,
    accountEmail,
    accountLastLoginAt,
    applySettingsTheme,
    avatar,
    avatarDisplaySrc,
    avatarIsGif,
    avatarSrc,
    avatarTypeLabel,
    busy,
    cGold,
    deleteOwnAccountAction,
    isStaffUser,
    leaderboardHighlightKey,
    leaderboardListRows,
    leaderboardMeRow,
    leaderboardMetricSafe,
    leaderboardPageCount,
    leaderboardPageSafe,
    leaderboardRowDomId,
    leaderboardRowsResolved,
    leaderboardSeasonReset,
    leaderboardTotalCount,
    lv,
    market,
    maskedAccountId,
    name,
    navTheme,
    onLogout,
    openDiamondMarketHub,
    openProfileModal,
    openTab,
    premiumActive,
    premiumCountdownLabel,
    premiumDiamond,
    premiumMultiplier,
    profile,
    profileAccountForm,
    profileAccountUsername,
    profileTab,
    role,
    selectedThemeOption,
    sendSupportRequestAction,
    setAvatarFailedSrc,
    setLeaderboardPage,
    setLeaderboardSearchError,
    setLeaderboardSearchOpen,
    setProfileAccountForm,
    setSeasonRewardsOpen,
    setSettingsThemeModalOpen,
    setSupportForm,
    settingsThemeModalOpen,
    startTutorial,
    supportDescriptionLength,
    supportForm,
    supportTitleLength,
    triggerAvatarFilePicker,
    updateProfilePasswordAction,
    updateProfileUsernameAction,
    welcomePackPurchased,
    diamondMarketPackages,
    openDiamondCashCheckout,
    dailyStore,
    dailyResetLabel,
    dailyResetInfoLabel,
    purchaseDailyOfferAction,
    premiumPlanList,
    premiumBestValuePlan,
    purchasePremiumPlan,
  })

  const privateListingsView = renderPrivateListingsView({
    businessModal,
    busy,
    buyVehicleFromMarket,
    closeMarketListingDetail,
    closeMarketPurchaseResult,
    companyLegalLabel,
    goToMyListingsFromPurchase,
    goToOwnedFleetFromPurchase,
    market,
    marketAssetLabel,
    marketDetailAssetMeta,
    marketDetailBusinessLabel,
    marketDetailCanAfford,
    marketDetailCanBuyByLevel,
    marketDetailCommissionAmount,
    marketDetailCommissionRate,
    marketDetailDraft,
    marketDetailHasBusinessAccess,
    marketDetailLevelCurrent,
    marketDetailLevelCurrentLabel,
    marketDetailLiveLifetime,
    marketDetailPrice,
    marketDetailRequiredLevel,
    marketDetailSellerPayout,
    marketDetailTemplateId,
    marketDetailTotalCost,
    marketPurchaseResult,
    name,
    openTab,
    ownedTabLabel,
    playerLevelNow,
    privateCustomFleetRows,
    privateCustomLogisticsRows,
    tapPrivateListing,
    unlockedModelLevelByTemplate,
    walletNow,
  })

  let content = homeView
  if (tab === 'factories') content = factoriesView
  if (tab === 'businesses') content = businessView
  if (tab === 'missions') content = missionsView
  if (tab === 'events') content = eventsView
  if (tab === 'announcements') content = announcementsView
  if (tab === 'rules') content = rulesView
  if (tab === 'penalized') content = penalizedView
  if (tab === 'mines') content = minesView
  if (tab === 'marketplace') content = marketplaceView
  if (tab === 'forex') content = forexView
  if (tab === 'bank') content = bankView
  if (tab === 'private-listings') content = privateListingsView
  if (tab === 'chat') content = chatView
  if (tab === 'messages') content = messagesView
  if (tab === 'profile') {
    content = (
      <section className="panel-stack profile-screen">
        {profileContent}
      </section>
    )
  }
  const contentViewKey = `${tab}:${tab === 'profile' ? profileTab : ''}:${tab === 'messages' ? messageFilterResolved : ''}`
  const _chatLikeTab = tab === 'chat' || tab === 'messages'
  const chatOnlyLayout = tab === 'chat' || (tab === 'messages' && Boolean(messageReplyTarget))
  const walletHiddenTab =
    tab === 'chat' ||
    tab === 'profile' ||
    tab === 'rules' ||
    tab === 'missions' ||
    (tab === 'messages' && Boolean(messageReplyTarget))
  const navMetaById = {
    'nav-profile': {
      hint: 'Store',
      badge: premiumActive
        ? { label: 'PRE', tone: 'is-ready' }
        : { label: 'Pasif' },
    },
    'nav-leaderboard': {
      hint: 'Sıralama',
      badge: { label: 'TOP' },
    },
    'nav-home': {
      hint: 'Ana Menü',
      badge: null,
    },
    'nav-chat-trade': {
      hint: 'Bildirimler',
      badge: _unreadMessageCount > 0
        ? {
            label: String(_unreadMessageCount),
            tone: 'is-alert',
          }
        : null,
    },
    'nav-chat-global': {
      hint: 'Oyuncu Sohbeti',
      badge: null,
    },
  }
  const homePageClassName = [
    'home-page',
    tab === 'home' ? 'home-tab-active' : '',
    tab === 'bank' ? 'bank-tab-active' : '',
    tab === 'chat' || (tab === 'messages' && Boolean(messageReplyTarget)) ? 'chat-tab-active' : '',
    tab === 'messages' && Boolean(messageReplyTarget) ? 'dm-fullscreen-active' : '',
    tab === 'profile' && profileTab === 'leaderboard' ? 'leaderboard-tab-active' : '',
    tab === 'missions' ? 'missions-tab-active' : '',
    tab === 'announcements' ? 'announcements-tab-active' : '',
    chatOnlyLayout ? 'chat-only-page' : '',
    walletHiddenTab ? 'wallet-hidden-page' : '',
    (tab === 'factories' && factoryPurchaseModal) ? 'factory-modal-open' : '',
    (tab === 'marketplace' && marketplaceBuyModal) ? 'marketplace-modal-open' : '',
    `nav-theme-${navTheme}`,
    tab === 'businesses' ? 'business-only-page' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const homeShellClassName = ['home-shell', levelFx ? 'levelup' : '', chatOnlyLayout ? 'chat-only-shell' : '', tab === 'businesses' ? 'business-only-shell' : '', tab === 'messages' ? 'messages-tab-shell' : '', tab === 'missions' ? 'missions-shell' : '', tab === 'announcements' ? 'announcements-shell' : '']
    .filter(Boolean)
    .join(' ')

  const leaderboardSearchModal = leaderboardSearchOpen && createPortal(
    <section className="warehouse-overlay leaderboard-search-overlay" onClick={() => setLeaderboardSearchOpen(false)}>
      <article className="warehouse-modal leaderboard-search-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Oyuncu Ara</h3>
        <p className="leaderboard-search-sub">İsim veya kullanıcı adı yaz; listede bulup seni oraya götürelim.</p>
        <form
          className="leaderboard-search-form"
          onSubmit={(e) => {
            e.preventDefault()
            runLeaderboardSearch()
          }}
        >
          <input
            id="leaderboard-search-input"
            value={leaderboardSearchQuery}
            onChange={(e) => {
              setLeaderboardSearchQuery(e.target.value)
              if (leaderboardSearchError) setLeaderboardSearchError('')
            }}
            placeholder="OyuncuAdı"
            autoComplete="off"
            className="leaderboard-search-input"
          />
          {leaderboardSearchError ? <p className="leaderboard-search-error">{leaderboardSearchError}</p> : null}
          <div className="leaderboard-search-actions">
            <button type="submit" className="btn btn-primary full">Ara</button>
            <button type="button" className="btn btn-danger full" onClick={() => setLeaderboardSearchOpen(false)}>Kapat</button>
          </div>
        </form>
      </article>
    </section>,
    document.body
  )

  const seasonRankIconByRank = {
    1: '/home/icons/leaderboard/rank-1.webp',
    2: '/home/icons/leaderboard/rank-2.webp',
    3: '/home/icons/leaderboard/rank-3.webp',
  }
  const seasonChestIconByRank = {
    1: '/home/icons/leaderboard/chest-gold.webp',
    2: '/home/icons/leaderboard/chest-silver.webp',
    3: '/home/icons/leaderboard/chest-bronze.webp',
  }
  const seasonBadgeIconByRank = {
    1: '/home/icons/leaderboard/badge-season-1.webp',
    2: '/home/icons/leaderboard/badge-season-2.webp',
    3: '/home/icons/leaderboard/badge-season-3.webp',
  }
  const seasonBadgeLabelByRank = {
    1: 'Sezon Şampiyonu',
    2: 'Sezon İkincisi',
    3: 'Sezon Üçüncüsü',
  }
  const seasonRewardMultiplierText = (multiplierValue, multiplierMaxValue) => {
    const rewardMultiplier = Math.max(1, Math.trunc(num(multiplierValue ?? 1)))
    const rewardMultiplierMax = Math.max(
      rewardMultiplier,
      Math.trunc(num(multiplierMaxValue ?? rewardMultiplier)),
    )
    if (rewardMultiplier >= rewardMultiplierMax) return `x${rewardMultiplier} (Maksimum)`
    return `x${rewardMultiplier} / x${rewardMultiplierMax}`
  }

  const seasonRewardsModal = seasonRewardsOpen && createPortal(
    <section className="warehouse-overlay season-rewards-overlay" onClick={() => setSeasonRewardsOpen(false)}>
      <article className="warehouse-modal season-rewards-modal" onClick={(e) => e.stopPropagation()}>
        <header className="season-modal-head">
          <div className="season-modal-head-copy">
            <h3>Sezon Ödülleri</h3>
            <p className="season-rewards-sub">
              Sezon sonunda ilk 3 oyuncu özel sandık ve sezon rozeti kazanır. 4-25 sıralaması Sıradan Sandık alır. Sandıklarını sınırsız biriktirip istediğin zaman tek tek açabilirsin.
            </p>
          </div>
          <button type="button" className="btn btn-danger season-modal-close" onClick={() => setSeasonRewardsOpen(false)}>
            Kapat
          </button>
        </header>
        <div className="season-rewards-grid">
          {leagueSeasonRewardCatalogResolved.map((entry) => {
            const rankMin = Math.max(1, Math.trunc(num(entry?.rankMin ?? entry?.rank ?? 1)))
            const rankMax = Math.max(rankMin, Math.trunc(num(entry?.rankMax ?? rankMin)))
            const rankDisplay = rankMax > rankMin ? `${rankMin}-${rankMax}` : `${rankMin}`
            const rankForVisual = rankMin
            const tier = String(entry?.tier || '').trim().toLowerCase()
            const isCommonTier = tier === 'common' || rankMin >= 4
            const isTopRankBadge = rankForVisual <= 3
            const multiplierText = seasonRewardMultiplierText(
              entry?.rewardMultiplier,
              entry?.rewardMultiplierMax,
            )
            const rankIcon = rankForVisual <= 3 ? (seasonRankIconByRank[rankForVisual] || '') : ''
            const chestIcon = isCommonTier
              ? '/home/icons/leaderboard/chestsiradan.webp'
              : (
                String(seasonChestIconByRank[rankForVisual] || entry.chestIcon || '/home/icons/leaderboard/chest-gold.webp').trim() ||
                '/home/icons/leaderboard/chest-gold.webp'
              )
            const badgeIcon = isTopRankBadge
              ? (
                String(entry?.badgeIcon || seasonBadgeIconByRank[rankForVisual] || '').trim() ||
                String(seasonBadgeIconByRank[rankForVisual] || '').trim()
              )
              : ''
            const badgeLabel = isTopRankBadge
              ? (
                String(entry?.badgeLabel || seasonBadgeLabelByRank[rankForVisual] || 'Sezon Rozeti').trim() ||
                'Sezon Rozeti'
              )
              : ''
            return (
              <article
                key={`season-reward-${rankDisplay}`}
                className={`season-reward-card is-${tier || 'gold'}`}
              >
                <div className="season-reward-head">
                  <div className="season-reward-rank-wrap">
                    {rankIcon ? (
                      <img
                        src={rankIcon}
                        alt={`${rankDisplay}. sıra`}
                        className="season-reward-rank-icon"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <strong>#{rankDisplay}</strong>
                  </div>
                  <span className="season-reward-tier-label">{entry.chestLabel}</span>
                </div>
                <div className="season-reward-visuals">
                  <div className="season-reward-visual-item">
                    <img
                      src={chestIcon}
                      alt={entry.chestLabel || 'Sandık'}
                      className="season-reward-visual-icon"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                    <small>Sandık</small>
                  </div>
                  {isTopRankBadge && badgeIcon ? (
                    <div className="season-reward-visual-item">
                      <img
                        src={badgeIcon}
                        alt={badgeLabel}
                        className="season-reward-visual-icon season-reward-visual-icon-badge"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                      <small>{badgeLabel}</small>
                    </div>
                  ) : null}
                </div>
                <p className="season-reward-line"><span>Nakit ödülü</span><strong>{fmt(entry.cashAmount || 0)}</strong></p>
                <p className="season-reward-line"><span>Kaynak ödülü</span><strong>{fmt(entry.resourceAmount || 0)}</strong></p>
                <p className="season-reward-line season-reward-line-multiplier"><span>Ödül katı</span><strong>{multiplierText}</strong></p>
              </article>
            )
          })}
        </div>
      </article>
    </section>,
    document.body,
  )

  const seasonChestsModal = seasonChestsOpen && createPortal(
    <section className="warehouse-overlay season-chests-overlay" onClick={() => setSeasonChestsOpen(false)}>
      <article className="warehouse-modal season-chests-modal" onClick={(e) => e.stopPropagation()}>
        <header className="season-modal-head">
          <div className="season-modal-head-copy">
            <h3>Sezon Sandıkları</h3>
            <p className="season-rewards-sub season-rewards-sub-compact">
              Sandıklarını burada sınırsız biriktirebilir, istediğin sırada tek tek açabilirsin.
            </p>
          </div>
          <button type="button" className="btn btn-danger season-modal-close" onClick={() => setSeasonChestsOpen(false)}>
            Kapat
          </button>
        </header>
        <div className="season-chests-stats">
          <span>Bekleyen: <strong>{fmt(leaguePendingSeasonChests.length)}</strong></span>
          <span>Açılan: <strong>{fmt(leagueOpenedSeasonChests.length)}</strong></span>
        </div>

        {leaguePendingSeasonChests.length ? (
          <div className="season-chests-list">
            {leaguePendingSeasonChests.map((chest) => {
              const openBusyKey = `season-chest-open:${chest.id}`
              const rank = Math.max(1, Math.trunc(num(chest.rank || 1)))
              const rewardMeta = leagueSeasonRewardForRank(rank) || null
              const cashAmount = Math.max(
                0,
                Math.trunc(num(chest.cashAmount ?? rewardMeta?.cashAmount ?? 0)),
              )
              const resourceAmount = Math.max(
                0,
                Math.trunc(num(chest.resourceAmount ?? rewardMeta?.resourceAmount ?? 0)),
              )
              const tier = String(chest.tier || rewardMeta?.tier || '').trim().toLowerCase()
              const isCommonTier = tier === 'common' || rank >= 4
              const isTopRankBadge = rank <= 3
              const multiplierText = seasonRewardMultiplierText(
                chest?.rewardMultiplier ?? rewardMeta?.rewardMultiplier,
                chest?.rewardMultiplierMax ?? rewardMeta?.rewardMultiplierMax,
              )
              const rankIcon = rank <= 3 ? (seasonRankIconByRank[rank] || '') : ''
              const chestIcon = isCommonTier
                ? '/home/icons/leaderboard/chestsiradan.webp'
                : (
                  String(
                    seasonChestIconByRank[rank] ||
                    chest.chestIcon ||
                    rewardMeta?.chestIcon ||
                    '/home/icons/leaderboard/chest-gold.webp',
                  ).trim() || '/home/icons/leaderboard/chest-gold.webp'
                )
              const badgeIcon = isTopRankBadge
                ? (
                  String(chest.badgeIcon || rewardMeta?.badgeIcon || seasonBadgeIconByRank[rank] || '').trim() ||
                  String(seasonBadgeIconByRank[rank] || '').trim()
                )
                : ''
              const badgeLabel = isTopRankBadge
                ? (
                  String(chest.badgeLabel || rewardMeta?.badgeLabel || seasonBadgeLabelByRank[rank] || 'Sezon Rozeti').trim() ||
                  'Sezon Rozeti'
                )
                : ''
              return (
                <article key={chest.id} className={`season-chest-row is-${tier || 'gold'}`}>
                  <div className="season-chest-row-top">
                    <span className="season-chest-row-order">#{rank}</span>
                    <span className="season-chest-row-season">{chest.seasonKey || '-'}</span>
                  </div>
                  <div className="season-chest-row-main">
                    {rankIcon ? (
                      <img
                        src={rankIcon}
                        alt={`${rank}. sıra`}
                        className="season-chest-rank-icon"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : null}
                    <div className="season-chest-icon-wrap">
                      <div className="season-chest-amounts">
                        <span className="season-chest-amount-pill is-cash">Nakit: {fmt(cashAmount)}</span>
                        <span className="season-chest-amount-pill is-resource">Kaynak: {fmt(resourceAmount)}</span>
                      </div>
                      <img
                        src={chestIcon}
                        alt={chest.chestLabel || 'Sandık'}
                        className="season-chest-icon"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>
                    <div className="season-chest-copy">
                      <strong>{chest.chestLabel || 'Sezon Sandığı'}</strong>
                      <span>Sezon: {chest.seasonKey || '-'}</span>
                      <span className="season-chest-multiplier">Ödül katı: {multiplierText}</span>
                      {isTopRankBadge && badgeIcon ? (
                        <span className="season-chest-badge-line">
                          <img
                            src={badgeIcon}
                            alt=""
                            className="season-chest-badge-icon"
                            aria-hidden
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                          {badgeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy === openBusyKey}
                    onClick={() => void _openSeasonChestAction(chest.id)}
                  >
                    {busy === openBusyKey ? 'Açılıyor...' : 'Sandığı Aç'}
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="season-chests-empty">
            <span className="season-chests-empty-icon" aria-hidden>🎁</span>
            <strong>Bekleyen sezon sandığın yok.</strong>
            <small>Sezon sonunda kazandığın sandıklar burada görünecek.</small>
          </div>
        )}

        {leagueOpenedSeasonChests.length ? (
          <div className="season-chests-history">
            <h4>Açılan Sandıklar</h4>
            {leagueOpenedSeasonChests.map((chest) => {
              const rank = Math.max(1, Math.trunc(num(chest.rank || 1)))
              const rewardMeta = leagueSeasonRewardForRank(rank) || null
              const tier = String(chest.tier || rewardMeta?.tier || '').trim().toLowerCase()
              const isCommonTier = tier === 'common' || rank >= 4
              const isTopRankBadge = rank <= 3
              const multiplierText = seasonRewardMultiplierText(
                chest?.rewardMultiplier ?? rewardMeta?.rewardMultiplier,
                chest?.rewardMultiplierMax ?? rewardMeta?.rewardMultiplierMax,
              )
              const rankIcon = rank <= 3 ? (seasonRankIconByRank[rank] || '') : ''
              const chestIcon = isCommonTier
                ? '/home/icons/leaderboard/chestsiradan.webp'
                : (
                  String(seasonChestIconByRank[rank] || chest.chestIcon || rewardMeta?.chestIcon || '/home/icons/leaderboard/chest-gold.webp').trim() ||
                  '/home/icons/leaderboard/chest-gold.webp'
                )
              const badgeIcon = isTopRankBadge
                ? (
                  String(chest.badgeIcon || rewardMeta?.badgeIcon || seasonBadgeIconByRank[rank] || '').trim() ||
                  String(seasonBadgeIconByRank[rank] || '').trim()
                )
                : ''
              const badgeLabel = isTopRankBadge
                ? (
                  String(chest.badgeLabel || rewardMeta?.badgeLabel || seasonBadgeLabelByRank[rank] || 'Sezon Rozeti').trim() ||
                  'Sezon Rozeti'
                )
                : ''
              return (
                <article key={`opened-${chest.id}`} className="season-chest-history-row">
                  <div className="season-chest-history-main">
                    {rankIcon ? (
                      <img
                        src={rankIcon}
                        alt=""
                        className="season-chest-history-rank-icon"
                        aria-hidden
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <img
                      src={chestIcon}
                      alt=""
                      className="season-chest-history-icon"
                      aria-hidden
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="season-chest-history-copy">
                      <span>{chest.chestLabel}</span>
                      <span className="season-chest-multiplier">Ödül katı: {multiplierText}</span>
                      {isTopRankBadge && badgeIcon ? (
                        <span className="season-chest-badge-line">
                          <img
                            src={badgeIcon}
                            alt=""
                            className="season-chest-badge-icon"
                            aria-hidden
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                          {badgeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <strong>{chest?.reward?.amountText || 'Ödül alındı'}</strong>
                </article>
              )
            })}
          </div>
        ) : null}

      </article>
    </section>,
    document.body,
  )

  const dailyRewardModal = dailyRewardOpen && createPortal(
    <section className="warehouse-overlay warehouse-overlay-fullscreen daily-login-overlay" onClick={() => setDailyRewardOpen(false)}>
      <article className="warehouse-modal warehouse-modal-fullscreen daily-login-modal" onClick={(event) => event.stopPropagation()}>
        <div className="daily-login-header">
          <h3>Günlük Ödül</h3>
          <button
            type="button"
            className="btn btn-danger daily-login-close-btn"
            onClick={() => setDailyRewardOpen(false)}
          >
            Kapat
          </button>
        </div>
        <article className="daily-login-hero">
          <span className="daily-login-hero-icon">
            <img
              src="/home/icons/gift-box.svg"
              alt=""
              aria-hidden
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </span>
          <div className="daily-login-hero-copy">
            <strong>Günlük Giriş Ödülü</strong>
            <p>Her gün giriş yap, artan ödülleri al. Bir gün kaçırırsan seri sıfırlanır.</p>
            <span className="daily-login-hero-streak">🔥 Seri: {dailyLoginSeriesLabel}</span>
          </div>
        </article>

        <div className="daily-login-days-scroll">
          <div className="daily-login-days-grid">
            {dailyLoginDayRows.map((entry) => {
              const status = String(entry?.status || 'locked').trim()
              const rewards = dailyLoginRewardEntries(entry?.reward || {})
              const isClaimed = status === 'claimed' || status === 'today-claimed'
              const isTodayClaimed = status === 'today-claimed'
              const isAvailable = status === 'available'
              return (
                <article
                  key={`daily-login-day-${entry.day}`}
                  className={`daily-login-day-card ${isClaimed ? 'is-claimed' : ''} ${isTodayClaimed ? 'is-today' : ''} ${isAvailable ? 'is-available' : ''}`.trim()}
                >
                  <div className="daily-login-day-top">
                    <span className="daily-login-day-index">{entry.day}. Gün</span>
                    {entry.isBonus ? <span className="daily-login-day-bonus">Bonus</span> : null}
                  </div>
                  <div className="daily-login-reward-list">
                    {rewards.map((rewardEntry) => (
                      <div key={`daily-reward-row-${entry.day}-${rewardEntry.itemId}`} className="daily-login-reward-row">
                        <img
                          src={rewardEntry.icon}
                          alt={rewardEntry.label}
                          onError={(event) => {
                            const node = event.currentTarget
                            if (node.dataset.fallbackApplied === '1') return
                            node.dataset.fallbackApplied = '1'
                            node.src = '/home/icons/depot/cash.webp'
                          }}
                        />
                        <span>{rewardEntry.label}</span>
                        <strong>{fmt(rewardEntry.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  <span className="daily-login-day-state">
                    {isTodayClaimed
                      ? 'Bugün alındı'
                      : isClaimed
                        ? 'Tamamlandı'
                        : isAvailable
                          ? 'Alınabilir'
                          : 'Kilitli'}
                  </span>
                </article>
              )
            })}
          </div>
        </div>

        <div className="daily-login-foot">
          <p className="daily-login-reset-note">
            Sıfırlanma: <strong>{dailyLoginNextResetLabel}</strong> (Türkiye saati 00:00)
          </p>
          <button
            type="button"
            className="btn btn-primary full daily-login-claim-btn"
            onClick={() => void claimDailyLoginRewardAction()}
            disabled={Boolean(busy) || !dailyLoginCanClaim}
          >
            {dailyLoginClaimBusy ? 'Ödül Alınıyor...' : dailyLoginClaimButtonLabel}
          </button>
        </div>
      </article>
    </section>,
    document.body,
  )

  const dailyRewardResultRows = dailyRewardResult ? dailyLoginRewardEntries(dailyRewardResult) : []
  const mineDigDurationForModal = Math.max(1, Math.trunc(num(DEFAULT_MINE_DIG_DURATION_SEC)))
  const mineDigProgressPercent = Math.min(
    100,
    Math.max(0, ((mineDigDurationForModal - mineDigCountdownSec) / mineDigDurationForModal) * 100),
  )
  const dailyRewardResultModal = dailyRewardResult && createPortal(
    <section className="warehouse-overlay daily-login-result-overlay" onClick={() => setDailyRewardResult(null)}>
      <article className="warehouse-modal daily-login-result-modal" onClick={(event) => event.stopPropagation()}>
        <span className="daily-login-result-icon">
          <img
            src="/home/icons/gift-box.svg"
            alt=""
            aria-hidden
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </span>
        <h3>Ödül Kazandın!</h3>
        <p className="daily-login-result-headline">Günlük giriş ödülün hesabına eklendi.</p>
        <div className="daily-login-result-list">
          {dailyRewardResultRows.map((entry) => (
            <p key={`daily-result-${entry.itemId}`} className="daily-login-result-row">
              <img src={entry.icon} alt="" aria-hidden />
              <strong className="daily-login-result-value">+{fmt(entry.quantity)}</strong>
              <span className="daily-login-result-label">{entry.label}</span>
            </p>
          ))}
        </div>
        <button type="button" className="btn btn-success full daily-login-result-continue-btn" onClick={() => setDailyRewardResult(null)}>
          Devam Et
        </button>
      </article>
    </section>,
    document.body,
  )

  return (
    <main ref={pageScrollRef} className={homePageClassName}>
      {mineConfirmModal && createPortal(renderMineConfirmModal({
        DEFAULT_MINE_DIG_DURATION_SEC,
        busy,
        mineConfirmModal,
        mineDigAction,
        premiumActive,
        role,
        setMineConfirmModal,
      }), document.body)}

      {leaderboardSearchModal}
      {seasonRewardsModal}
      {seasonChestsModal}
      {dailyRewardModal}
      {dailyRewardResultModal}

      {mineDigModal && createPortal(renderMineDigModal({
        mineCollectResult,
        mineDigCollectedRef,
        mineDigCountdownSec,
        mineDigDurationForModal,
        mineDigModal,
        mineDigProgressPercent,
        role,
        setMineCollectResult,
        setMineDigModal,
      }), document.body)}

      {marketplaceBuyModal && createPortal(renderMarketplaceBuyModal({
        NakitLabel,
        busy,
        cashIconSrc,
        fail,
        loadMarket,
        loadOverview,
        loadProfile,
        marketplaceBuyModal,
        marketplaceBuyModalQty,
        marketplaceMaxQty,
        marketplaceNoCapacity,
        overview,
        profile,
        qty,
        role,
        setBusy,
        setMarketplaceBuyModal,
        setMarketplaceBuyModalQty,
        setNotice,
        setNoticeIsSuccess,
      }), document.body)}

      {tutorialActive ? renderTutorialOverlay({
        closeTutorial,
        goTutorialNext,
        goTutorialPrev,
        role,
        tutorialCurrentStep,
        tutorialCurrentTargetLabel,
        tutorialNavPending,
        tutorialProgressPct,
        tutorialPurposeText,
        tutorialStepCount,
        tutorialStepImageSrc,
        tutorialStepSafeIndex,
      }) : null}
      <section className={homeShellClassName}>
        {!walletHiddenTab ? (
          <section className="wallet-dock" aria-label="Cüzdan Özeti">
            <article className="hud-pill wallet-pill cash" aria-label="Nakit">
              <span className="hud-pill-icon" aria-hidden="true">
                <img className="stat-icon-img" src="/home/icons/depot/cash.webp" alt="" />
              </span>
              <span className="wallet-pill-copy">
                <small>Nakit</small>
                <strong className={`wallet-pill-value ${walletCashClass}`.trim()}>{walletCashValue}</strong>
              </span>
            </article>
            <article className="hud-pill wallet-pill gem" aria-label="Elmas">
              <span className="hud-pill-icon" aria-hidden="true">
                <img className="stat-icon-img" src="/home/icons/depot/diamond.webp" alt="" />
              </span>
              <span className="wallet-pill-copy">
                <small>Elmas</small>
                <strong className={`wallet-pill-value ${walletGoldClass}`.trim()}>{walletGoldValue}</strong>
              </span>
            </article>
          </section>
        ) : null}

        <input
          ref={avatarFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="profile-avatar-file-input"
          onChange={openAvatarCropFromFile}
          aria-label="Avatar dosyası seç"
        />

        {avatarChangeConfirmOpen ? renderAvatarChangeConfirm({
          confirmAvatarFilePicker,
          overview,
          profile,
          role,
          setAvatarChangeConfirmOpen,
        }) : null}

        {tab === 'home' ? (
          <header className="hud">
            <article className="hero-card">
              <div className="hero-main">
                <div
                  className={`hero-avatar is-interactive${busy ? ' is-busy' : ''}`}
                  role="button"
                  tabIndex={busy ? -1 : 0}
                  aria-label="Avatarı değiştir"
                  onClick={triggerAvatarFilePicker}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    triggerAvatarFilePicker()
                  }}
                >
                  <img
                    className={avatarIsGif ? 'is-gif' : ''}
                    src={avatarDisplaySrc}
                    alt={name}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={() => {
                      if (avatarSrc !== DEFAULT_CHAT_AVATAR) setAvatarFailedSrc(avatarSrc)
                    }}
                  />
                </div>
                <div className="hero-info">
                  <div className="hero-name-row">
                    <div className="hero-name-stack">
                      <span className="hero-name-label">Oyuncu Profili</span>
                      <button
                        type="button"
                        className="hero-username-btn"
                        onClick={() => {
                          if (!user?.id) return
                          void openProfileModal(user.id, {
                            username: name,
                            displayName: profileOverviewDisplayName || name,
                            avatarUrl: avatarDisplaySrc,
                            level: lv.level,
                            role,
                            roleLabel: selfRoleLabel,
                            premium: premiumActive,
                          })
                        }}
                      >
                        <h1 className="hero-username">{name}</h1>
                      </button>
                      <small className="hero-user-handle">{profileAccountUsername}</small>
                    </div>
                    <button
                      type="button"
                      className={`hero-premium-pill ${selfBadge.className === 'staff-admin' || selfBadge.className === 'staff-moderator' ? 'staff' : (premiumActive ? 'on' : 'off')}`}
                      onClick={() => void openPremiumHub()}
                      onTouchEnd={(event) => {
                        event.preventDefault()
                        void openPremiumHub()
                      }}
                    >
                      {selfBadge.isStaff ? (
                        <span className="hero-premium-icon hero-premium-icon-staff" aria-hidden="true">
                          {selfBadge.icon ? (
                            <img
                              src={selfBadge.icon}
                              alt=""
                              className="hero-premium-icon-staff-img"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            selfBadge.className === 'staff-admin' ? 'ADM' : 'MOD'
                          )}
                        </span>
                      ) : (
                        <span className="hero-premium-icon">
                          <img src="/home/icons/depot/premium.webp" alt="" aria-hidden="true" />
                        </span>
                      )}
                      <span className="hero-premium-status">
                        {selfBadge.isStaff ? selfBadge.fullText : selfBadge.text}
                      </span>
                    </button>
                  </div>
                  <div className="hero-level-line">
                    <span className="hero-level-chip">
                      <img className="hero-level-icon" src="/home/ui/hud/level-icon.webp" alt="" aria-hidden="true" />
                      <strong className="level-text">{fmtLevel(lv.level)}</strong>
                    </span>
                  </div>
                  <div className="meter hero-meter"><span style={{ width: `${levelProgress}%` }} /></div>
                  <p className="hero-xp-progress">Seviye İlerlemesi: %{Math.round(levelProgress)}</p>
                  <p className="hero-xp-remaining">
                    {isPlayerMaxLevel
                      ? 'Maksimum seviyeye ulaştınız.'
                      : xpToNextLevelBig > 0n
                        ? `Sonraki seviyeye ${xpToNextLevelValue} XP kaldı`
                        : 'Sonraki seviye için hazırsınız.'}
                  </p>
                </div>
              </div>
            </article>
          </header>
        ) : null}

        {dailyLoginTopStripVisible ? (
          <section className="home-daily-claim-strip-wrap">
            <button
              type="button"
              className="home-daily-claim-strip"
              onClick={() => setDailyRewardOpen(true)}
              disabled={Boolean(busy)}
            >
              <span className="home-daily-claim-icon">
                <img
                  src="/home/icons/gift-box.svg"
                  alt="Günlük Ödül"
                  onError={(event) => {
                    const node = event.currentTarget
                    node.style.display = 'none'
                  }}
                />
              </span>
              <span className="home-daily-claim-copy">
                <strong>Günlük Ödül</strong>
                <small>{dailyLoginQuickStatus}</small>
              </span>
              <span className="home-daily-claim-action">AL</span>
            </button>
          </section>
        ) : null}

        {weeklyEventsStripVisible ? (
          <section className="home-daily-claim-strip-wrap">
            <button
              type="button"
              className="home-daily-claim-strip home-weekly-event-strip"
              onClick={() => void openTab('events', { tab: 'events' })}
              disabled={Boolean(busy)}
            >
              <span className="home-daily-claim-icon home-weekly-event-icon">
                <img
                  src={EVENTS_MENU_ICON_PRIMARY_SRC}
                  alt="Etkinlikler"
                  onError={(event) => {
                    const node = event.currentTarget
                    if (node.dataset.fallbackApplied === '1') {
                      node.style.display = 'none'
                      return
                    }
                    node.dataset.fallbackApplied = '1'
                    node.src = EVENTS_MENU_ICON_FALLBACK_SRC
                  }}
                />
              </span>
              <span className="home-daily-claim-copy">
                <strong>Haftalık Etkinlik</strong>
                <small>{weeklyEventsStripSubtitle}</small>
                <small className="home-weekly-event-countdown">{weeklyEventsStripCountdown}</small>
              </span>
              <span className="home-daily-claim-action home-weekly-event-action">Takvim</span>
            </button>
          </section>
        ) : null}

        {floatingFeedbackText ? (
          <aside className={`home-floating-alert ${floatingFeedbackType === 'error' ? 'is-error' : floatingFeedbackType === 'success' ? 'is-success' : 'is-notice'}`} role="status" aria-live="polite">
            <span className="home-floating-alert-text">{floatingFeedbackText}</span>
            <button
              type="button"
              className="home-floating-alert-close"
              onClick={() => {
                setError('')
                setNotice('')
                setNoticeIsSuccess(false)
              }}
            >
              Kapat
            </button>
          </aside>
        ) : null}
        <section key={contentViewKey} className="tab-content-layer">{content ?? homeView}</section>
      </section>

      {profileModalUserId ? renderProfileModal({
        _removeFriendAction,
        _respondFriendRequestAction,
        _sendFriendRequestAction,
        _sendProfileTeklif,
        _toggleBlockAction,
        allVehicleListings,
        avatar,
        businesses,
        busy,
        chatClockMs,
        companyLevel,
        factories,
        loadDirectMessageThread,
        loadMessageCenter,
        logisticsUnlocked,
        market,
        messageFilter,
        messageReplyTargetRef,
        name,
        openMarketListingDetail,
        openTab,
        playerLevelNow,
        profile,
        profileModalBusinessExpand,
        profileModalData,
        profileModalDisplayName,
        profileModalLeagueRanks,
        profileModalLoading,
        profileModalMembershipLabel,
        profileModalPremiumActive,
        profileModalSeasonBadge,
        profileModalShowHandle,
        profileModalStaffRole,
        profileModalUserId,
        profileModalUsername,
        profileTeklifSending,
        role,
        setBusinessDetailTab,
        setBusinessScene,
        setError,
        setGaragePanel,
        setLogisticsDetailTab,
        setLogisticsScene,
        setMessageForm,
        setMessageReplyTarget,
        setMessageViewTab,
        setProfileModalBusinessExpand,
        setProfileModalUserId,
        setSelectedBusinessId,
        tab,
        unlockedBusinesses,
        unlockedFleetTemplateIdSet,
        unlockedModelLevelByTemplate,
        user,
        vehicleListingById,
        weeklyEventsRuntimeState,
      }) : null}

      {garagePanel.open && garagePanel.username ? renderGaragePanel({
        _sendProfileTeklif,
        garagePanel,
        name,
        profileTeklifSending,
        role,
        setGaragePanel,
      }) : null}

      {warehouseOpen ? renderWarehouseOverlay({ setWarehouseOpen, warehouseDisplayCards, warehouseTotalQuantity }) : null}

      {avatarCropOpen ? (
        <section
          className="avatar-crop-overlay"
          onClick={() => {
            if (busy === 'avatar-upload') return
            closeAvatarCrop()
          }}
        >
          <article className="avatar-crop-modal" onClick={(event) => event.stopPropagation()}>
            <div className="avatar-crop-head">
              <h3>Avatar Kırp</h3>
              <button
                type="button"
                className="warehouse-x"
                onClick={() => {
                  if (busy === 'avatar-upload') return
                  closeAvatarCrop()
                }}
              >
                X
              </button>
            </div>

            <p className="muted avatar-crop-note">
              {avatarCropMode === 'gif'
                ? `GIF seçildi. Animasyonu korumak için kırpma kapalı, orijinal dosya yüklenecek (en fazla ${AVATAR_MAX_FILE_MB} MB).`
                : 'Kare alanı ayarlayıp avatarını daha temiz hale getir.'}
            </p>

            <div className="avatar-crop-stage">
              <div className="avatar-crop-frame">
                {avatarCropSource ? (
                  <img
                    ref={avatarCropImageRef}
                    src={avatarCropSource}
                    alt="Avatar önizleme"
                    className={`avatar-crop-image${avatarCropMode === 'gif' ? ' gif' : ''}`}
                    style={avatarCropMode === 'gif' ? undefined : avatarCropImageStyle}
                    onLoad={(event) => {
                      const naturalWidth = Number(event.currentTarget.naturalWidth || 0)
                      const naturalHeight = Number(event.currentTarget.naturalHeight || 0)
                      setAvatarCropNatural({
                        width: naturalWidth,
                        height: naturalHeight,
                      })
                    }}
                  />
                ) : null}
                <span className="avatar-crop-grid" />
              </div>
            </div>

            {avatarCropMode !== 'gif' ? (
              <div className="avatar-crop-controls">
                <label>
                  Yakınlaştır: {num(avatarCropZoom).toFixed(2)}x
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={avatarCropZoom}
                    onChange={(event) => setAvatarCropZoom(num(event.target.value))}
                    disabled={busy === 'avatar-upload'}
                  />
                </label>
                <label>
                  Sağa / Sola
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={avatarCropOffsetX}
                    onChange={(event) => setAvatarCropOffsetX(num(event.target.value))}
                    disabled={busy === 'avatar-upload'}
                  />
                </label>
                <label>
                  Yukarı / Aşağı
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={avatarCropOffsetY}
                    onChange={(event) => setAvatarCropOffsetY(num(event.target.value))}
                    disabled={busy === 'avatar-upload'}
                  />
                </label>
              </div>
            ) : null}

            <div className="avatar-crop-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeAvatarCrop}
                disabled={busy === 'avatar-upload'}
              >
                İptal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void applyAvatarCropAction()}
                disabled={busy === 'avatar-upload'}
              >
                {busy === 'avatar-upload'
                  ? 'Yükleniyor...'
                  : avatarCropMode === 'gif'
                    ? 'GIF Yükle'
                    : 'Kırp ve Yükle'}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      <nav className="mobile-nav">
        <div className="mobile-nav-grid">
          {NAV.map((n) => {
            const target = n.target || { tab: 'home' }
            const isProfileTarget = target.tab === 'profile' && Boolean(target.profileTab)
            const isMessageTarget = target.tab === 'messages'
            const isRulesAsHome = n.id === 'nav-home' && tab === 'rules'
            const isActive = isProfileTarget
              ? tab === 'profile' && profileTab === target.profileTab
              : isMessageTarget
                ? tab === 'messages'
                : tab === target.tab || isRulesAsHome
            const buttonClassName = [
              isActive ? 'active' : '',
              n.center ? 'is-center' : '',
              isProfileTarget ? 'is-profile-link' : '',
              n.id === 'nav-leaderboard' ? 'is-leaderboard-link' : '',
              target.tab === 'chat' ? 'is-chat-link' : '',
              target.tab === 'messages' ? 'is-message-link' : '',
            ].filter(Boolean).join(' ')
            const navMeta = navMetaById[n.id] || {}
            const navHint = String(navMeta?.hint || '').trim()
            const navBadge = navMeta?.badge || null
            const hasBadge = Boolean(navBadge) && (Boolean(navBadge.dot) || Boolean(String(navBadge.label || '').trim()))
            const navBadgeClassName = hasBadge
              ? [
                  'mobile-nav-badge',
                  String(navBadge?.tone || '').trim(),
                  navBadge?.dot ? 'is-dot' : '',
                ].filter(Boolean).join(' ')
              : ''

            return (
              <button
                key={n.id}
                className={buttonClassName}
                onClick={() => void openTab(target.tab, target)}
              >
                <span className="mobile-nav-icon-wrap">
                  <img
                    src={n.icon}
                    alt={n.label}
                    onError={(event) => {
                      const node = event.currentTarget
                      if (node.dataset.fallbackApplied === '1') return
                      const fallback = n.fallbackIcon
                      if (!fallback) return
                      node.dataset.fallbackApplied = '1'
                      node.src = fallback
                    }}
                  />
                  {hasBadge ? (
                    <span className={navBadgeClassName} aria-hidden="true">
                      {navBadge?.dot ? '' : String(navBadge?.label || '').trim()}
                    </span>
                  ) : null}
                </span>
                <span className="mobile-nav-label">{n.label}</span>
                <span className="mobile-nav-hint">{navHint}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {chatReportModal ? renderChatReportModal({
        busy,
        chatReportModal,
        closeChatReportModal,
        role,
        submitChatReportAction,
      }) : null}

      {dmReportModal ? renderDmReportModal({
        busy,
        closeDmReportModal,
        dmReportMessages,
        dmReportModal,
        dmReportReasonLength,
        dmReportSelectedMessage,
        role,
        setDmReportModal,
        submitDmReportAction,
      }) : null}

      {starterDetailOpen ? renderStarterDetailOverlay({ role, setStarterDetailOpen }) : null}

      <div className="coin-layer" aria-hidden>
        {bursts.map((b) => b.particles.map((p) => <span key={p.id} className="coin" style={{ left: `${b.x}px`, top: `${b.y}px`, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` }}>$</span>))}
      </div>
    </main>
  )
}

export default HomePage
