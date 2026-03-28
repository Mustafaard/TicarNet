import crypto from 'node:crypto'
import { NO_DB_WRITE, readDb, updateDb } from '../db.js'
import { config } from '../config.js'
import {
  BUSINESS_TEMPLATES,
  FACTORY_TEMPLATES,
  ITEM_CATALOG,
  LEAGUE_DAILY_REWARD,
  LEAGUE_SEASON_REWARD,
  LEAGUE_WEEKLY_REWARD,
  LOGISTICS_ROUTES,
  LOGISTICS_TRUCK_CATALOG,
  MAX_NOTIFICATION_HISTORY,
  MAX_PUSH_DEVICE_TOKENS,
  MAX_PUSH_HISTORY,
  MESSAGE_CENTER_MAX_ITEMS,
  MAX_TRANSACTION_HISTORY,
  MINE_TEMPLATES,
  ORDER_BOOK_DEPTH,
  STARTER_BANK,
  STARTER_ENERGY,
  STARTER_REPUTATION,
  STARTER_WALLET,
  STARTER_XP,
} from './constants.js'
import {
  isMobilePushConfigured,
  sendMobilePushToTokens,
} from '../services/mobilePush.js'
import {
  applyMissionProgress,
  claimMissionReward,
  createInitialMissions,
  MISSION_BATCH_COOLDOWN_MS,
  MISSION_BATCH_SIZE,
  normalizeMissions,
  syncBusinessCountMission,
} from './missions.js'
import { emitMessageCenterRefresh } from '../messages/events.js'
import {
  applyProfanityMute,
  detectProfanity,
  formatMuteRemaining,
  getMessageMuteState,
} from '../services/chatModeration.js'
import { USER_ROLES, normalizeUserRole } from '../services/roles.js'

const ITEM_BY_ID = new Map(ITEM_CATALOG.map((item) => [item.id, item]))
const BUSINESS_BY_ID = new Map(BUSINESS_TEMPLATES.map((item) => [item.id, item]))
const FACTORY_BY_ID = new Map(FACTORY_TEMPLATES.map((item) => [item.id, item]))
const MINE_BY_ID = new Map(MINE_TEMPLATES.map((item) => [item.id, item]))
const LOGISTICS_BY_ID = new Map(LOGISTICS_ROUTES.map((route) => [route.id, route]))
const LOGISTICS_TRUCK_BY_ID = new Map(LOGISTICS_TRUCK_CATALOG.map((truck) => [truck.id, truck]))

const logisticsTruckSpecByModelId = (modelId) => {
  const safeModelId = String(modelId || '').trim()
  if (!safeModelId) return null
  return LOGISTICS_TRUCK_BY_ID.get(safeModelId) || null
}

const logisticsTruckImagePath = (modelId, fallbackImage = '') => {
  const spec = logisticsTruckSpecByModelId(modelId)
  if (spec?.image) return String(spec.image).trim()
  return String(fallbackImage || '').trim()
}

const FLEET_TEMPLATE_IDS = BUSINESS_TEMPLATES
  .filter((template) => template?.businessKind === 'fleet')
  .map((template) => template.id)
const FLEET_TEMPLATE_SET = new Set(FLEET_TEMPLATE_IDS)
const LEGACY_TEMPLATE_MAP = {
  farm: 'auto-rental',
  'textile-mill': 'moto-rental',
  foundry: 'auto-rental',
  refinery: 'auto-rental',
  'tech-lab': 'moto-rental',
  'fleet-company': 'auto-rental',
}
const COUNTERPARTIES = ['Anka Trade', 'Marmara Lojistik', 'Nova Broker', 'Delta Pazarlama']
const ORDER_MAX_DURATION_MINUTES = 180
const SELL_LISTINGS_DAILY_LIMIT = 8
const CONTRACT_MAX_DURATION_MINUTES = 120
const AUCTION_MIN_DURATION_MINUTES = 5
const AUCTION_MAX_DURATION_MINUTES = 180
const AUCTION_HISTORY_LIMIT = 120
const MS_MINUTE = 60000
const MS_HOUR = 60 * MS_MINUTE
const DAY_MS = 24 * 60 * 60 * 1000
const DAILY_STORE_RESET_INTERVAL_MS = 12 * MS_HOUR
const LIMITED_OFFER_RESET_INTERVAL_MS = 7 * DAY_MS
const BUILD_SPEEDUP_BASE_DIAMONDS = 40
const BUILD_SPEEDUP_DIAMONDS_PER_HOUR = 5
const UPGRADE_SPEEDUP_BASE_DIAMONDS = 55
const UPGRADE_SPEEDUP_DIAMONDS_PER_HOUR = 8
const SPEEDUP_DIAMOND_CAP = 500
const FLEET_COLLECT_COOLDOWN_MS = 60 * MS_MINUTE
const FLEET_VEHICLE_ORDER_COOLDOWN_MS = 4 * 60 * MS_MINUTE
const LOGISTICS_TRUCK_ORDER_COOLDOWN_MS = 4 * 60 * MS_MINUTE
const LOGISTICS_MAX_TRUCK_COUNT = 1000
const COLLECTION_TAX_RATE = 0.01
const MARKET_TAX_RATE = 0.10
const WEEKLY_EVENT_TIMEZONE = 'Europe/Istanbul'
const WEEKLY_EVENT_XP_MULTIPLIER = 2
const WEEKLY_EVENT_COST_DISCOUNT_RATE = 0.25
const WEEKLY_EVENT_COST_MULTIPLIER = 1 - WEEKLY_EVENT_COST_DISCOUNT_RATE
const BUSINESS_EXPENSE_MULTIPLIER = 3
const AVATAR_CHANGE_DIAMOND_COST = 10
const NOTIFICATION_DEDUPE_WINDOW_MS = 30 * 1000
const PUSH_ALERT_DEDUPE_WINDOW_MS = 30 * 1000
const FOREX_UPDATE_INTERVAL_MS = 3 * 60 * 60 * 1000
const FOREX_HISTORY_KEEP = 600
const FOREX_HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const FOREX_DAY_WINDOW_MS = 24 * 60 * 60 * 1000
const FOREX_BASE_SPREAD_RATE = 0.012
const FOREX_TRADE_FEE_RATE = 0.003
const FOREX_CHART_SEED_POINTS = 18
const FOREX_DEFAULT_ID = 'tct'
const FOREX_MIN_TRADE_QUANTITY = 1
const FOREX_MAX_TRADE_QUANTITY = 10_000_000
const FOREX_MAX_TOTAL_HOLDING_QUANTITY = 10_000_000
const FOREX_DELTA_BASE_CAP = 0.0062
const FOREX_DELTA_HARD_CAP = 0.03
const FOREX_MAJOR_SWING_CHANCE_MIN = 0.24
const FOREX_MAJOR_SWING_CHANCE_MAX = 0.66
const FOREX_MAJOR_SWING_MIN = 0.0085
const FOREX_MAJOR_SWING_MAX = 0.024
const FOREX_CENTER_PULL_STRENGTH = 0.0014
const FOREX_PATTERN_PHASES = Object.freeze([
  {
    id: 'drop-hard-a',
    direction: -1,
    minSteps: 1,
    maxSteps: 1,
    driftMin: 0.00068,
    driftMax: 0.00118,
    burstChance: 0.22,
    burstMin: 0.0002,
    burstMax: 0.00072,
    volatilityScale: 1.14,
    shockMultiplier: 1.2,
  },
  {
    id: 'rise-slow-a',
    direction: 1,
    minSteps: 2,
    maxSteps: 4,
    driftMin: 0.00016,
    driftMax: 0.00038,
    burstChance: 0.06,
    burstMin: 0.00006,
    burstMax: 0.0002,
    volatilityScale: 0.88,
    shockMultiplier: 0.9,
  },
  {
    id: 'drop-hard-b',
    direction: -1,
    minSteps: 1,
    maxSteps: 2,
    driftMin: 0.00072,
    driftMax: 0.0013,
    burstChance: 0.24,
    burstMin: 0.00024,
    burstMax: 0.00086,
    volatilityScale: 1.2,
    shockMultiplier: 1.24,
  },
  {
    id: 'rise-slow-b',
    direction: 1,
    minSteps: 2,
    maxSteps: 4,
    driftMin: 0.00014,
    driftMax: 0.00034,
    burstChance: 0.05,
    burstMin: 0.00006,
    burstMax: 0.0002,
    volatilityScale: 0.86,
    shockMultiplier: 0.9,
  },
  {
    id: 'rise-jump',
    direction: 1,
    minSteps: 1,
    maxSteps: 1,
    driftMin: 0.00092,
    driftMax: 0.00158,
    burstChance: 0.36,
    burstMin: 0.00032,
    burstMax: 0.00112,
    volatilityScale: 1.18,
    shockMultiplier: 1.16,
  },
  {
    id: 'rise-slow-c',
    direction: 1,
    minSteps: 2,
    maxSteps: 3,
    driftMin: 0.00012,
    driftMax: 0.0003,
    burstChance: 0.05,
    burstMin: 0.00005,
    burstMax: 0.00016,
    volatilityScale: 0.84,
    shockMultiplier: 0.86,
  },
  {
    id: 'pullback',
    direction: -1,
    minSteps: 2,
    maxSteps: 4,
    driftMin: 0.00018,
    driftMax: 0.00044,
    burstChance: 0.08,
    burstMin: 0.00008,
    burstMax: 0.00024,
    volatilityScale: 0.92,
    shockMultiplier: 0.94,
  },
])
const FOREX_PATTERN_PHASE_COUNT = Math.max(1, FOREX_PATTERN_PHASES.length)
const BANK_MIN_TRANSFER_AMOUNT = 1
const BANK_DEPOSIT_FEE_RATE = 0.05
const BANK_WITHDRAW_FEE_RATE = 0
const BANK_TERM_MAX_PRINCIPAL = 200_000_000
const BANK_TERM_MAX_TOTAL_RATE_PCT = 10
const BANK_TERM_HISTORY_LIMIT = 30
const BANK_TERM_OPTIONS = [
  { days: 1, dailyRatePct: 2 },
  { days: 2, dailyRatePct: 3 },
  { days: 3, dailyRatePct: 3 },
  { days: 4, dailyRatePct: 3 },
]
const BANK_TERM_OPTIONS_BY_DAYS = new Map(BANK_TERM_OPTIONS.map((entry) => [entry.days, entry]))
const FOREX_CATALOG = [
  {
    id: FOREX_DEFAULT_ID,
    code: 'TCT',
    name: 'TicarNet Oyun D\u00f6vizi',
    baseRate: 3_750_000,
    minRate: 3_000_000,
    maxRate: 4_500_000,
    drift: 0,
    volatility: 0.0031,
    meanReversion: 0.14,
    shockChance: 0.0068,
    shockScale: 0.0038,
  },
]
const FOREX_BY_ID = new Map(FOREX_CATALOG.map((entry) => [entry.id, entry]))
const VEHICLE_SCRAP_RETURN_RATE = 0.02
const VEHICLE_MARKET_COMMISSION_RATE = 0.05
const VEHICLE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000
const FLEET_XP_RATE = 0.002
const FLEET_MIN_XP = 5
const AUTO_RENTAL_FUEL_MULTIPLIER = 2
const PROPERTY_RENTAL_FUEL_MULTIPLIER = 3
const LOGISTICS_FUEL_MULTIPLIER = 4
const PREMIUM_BULK_MULTIPLIER = 2
const LISTING_PRICE_PROFILE = {
  'moto-rental': {
    minFloor: 300000,
    minStepByLevel: 45000,
    maxFloor: 50000000,
    maxStepByLevel: 3000000,
  },
  'auto-rental': {
    minFloor: 900000,
    minStepByLevel: 90000,
    maxFloor: 90000000,
    maxStepByLevel: 4600000,
  },
  'property-rental': {
    minFloor: 1800000,
    minStepByLevel: 130000,
    maxFloor: 156000000,
    maxStepByLevel: 6800000,
  },
  logistics: {
    minFloor: 1800000,
    minStepByLevel: 140000,
    maxFloor: 170000000,
    maxStepByLevel: 7600000,
  },
}
const PREMIUM_PLANS = [
  { id: 'premium-7', days: 7, price: 100, label: '7 Gün' },
  { id: 'premium-14', days: 14, price: 180, label: '14 Gün' },
  { id: 'premium-32', days: 32, price: 360, label: '32 Gün' },
  { id: 'premium-365', days: 365, price: 2400, label: '365 Gün' },
]
const PREMIUM_PLAN_BY_ID = new Map(PREMIUM_PLANS.map((plan) => [plan.id, plan]))

const DAILY_STORE_OFFERS = [
  {
    id: 'daily-cash-1m',
    title: 'Para Paketi',
    description: '1.000.000 nakit anında kasana eklenir.',
    price: 25,
    rewards: {
      cash: 1000000,
      items: {},
    },
  },
  {
    id: 'daily-materials-pack',
    title: 'Kaynak Paketi',
    description: 'Şansına rastgele bir kaynak kazanırsın ve depoya eklenir (Tuğla, Kereste, Çimento, Yedek Parça, Motor veya Petrol).',
    price: 50,
    rewards: {
      cash: 0,
      items: {},
    },
  },
]
const DAILY_LOGIN_TOTAL_DAYS = 7
const DAILY_LOGIN_REWARD_TABLE = [
  {
    day: 1,
    cash: 200000,
    items: {
      oil: 500,
    },
  },
  {
    day: 2,
    cash: 260000,
    items: {
      energy: 300,
    },
  },
  {
    day: 3,
    cash: 320000,
    items: {
      'spare-parts': 1000,
    },
  },
  {
    day: 4,
    cash: 380000,
    items: {
      'engine-kit': 300,
    },
  },
  {
    day: 5,
    cash: 500000,
    items: {
      oil: 750,
      energy: 450,
    },
  },
  {
    day: 6,
    cash: 650000,
    items: {
      'spare-parts': 1400,
      'engine-kit': 400,
    },
  },
  {
    day: 7,
    cash: 1000000,
    items: {
      oil: 1200,
      energy: 800,
      'spare-parts': 2000,
      'engine-kit': 600,
    },
  },
]
const DAILY_LOGIN_REWARD_BY_DAY = new Map(
  DAILY_LOGIN_REWARD_TABLE.map((entry) => [Math.max(1, asInt(entry?.day, 1)), entry]),
)
const DIAMOND_WELCOME_PACK_ID = 'welcome-pack-5000'
const LEGACY_ITEM_MAP = {
  textile: 'timber',
  fuel: 'plastic-granule',
  electronics: 'microchip',
}
const AVATAR_PUBLIC_PREFIX = `${String(config.avatarPublicBase || '/api/uploads/avatars').replace(/\/+$/, '')}/`
const AVATAR_MAX_URL_LENGTH = 600
const DIRECT_MESSAGE_MAX_LENGTH = 320
const DIRECT_MESSAGE_HISTORY_LIMIT = Math.max(1, MESSAGE_CENTER_MAX_ITEMS || 25)
const DIRECT_MESSAGE_REPORT_REASON_MIN_LENGTH = 5
const DIRECT_MESSAGE_REPORT_REASON_MAX_LENGTH = 500
const DIRECT_MESSAGE_REPORT_DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000
const DIRECT_MESSAGE_REPORT_HISTORY_LIMIT = 4000
const DIRECT_MESSAGE_REPORT_AUDIT_LOG_LIMIT = 1000
const DIRECT_MESSAGE_REPORT_TEXT_PREVIEW_MAX = 240
const MESSAGE_CENTER_LIMIT = Math.max(1, MESSAGE_CENTER_MAX_ITEMS || 25)
const MESSAGE_FILTERS = ['all', 'message', 'trade', 'other', 'alert']
const MESSAGE_FILTER_SET = new Set(MESSAGE_FILTERS)
const MESSAGE_COOLDOWN_MS = 2500
const MESSAGE_RETENTION_MS = 2 * 24 * 60 * 60 * 1000
const PROFILE_ONLINE_WINDOW_MS = 90 * 1000
const FRIEND_REQUEST_HISTORY_LIMIT = 1000
const FRIEND_REQUEST_STATUS_SET = new Set(['pending', 'accepted', 'rejected', 'cancelled'])
const ALERT_HISTORY_TRIGGER = 10
const ALERT_HISTORY_KEEP = 5
const ALERT_TYPE_SET = new Set([
  'push',
  'alert',
  'warning',
  'pricealert',
  'productionfull',
  'auctionending',
])
const LEAGUE_TOP_RANK_REWARD_BY_RANK = {
  1: {
    rank: 1,
    tier: 'gold',
    chestLabel: 'Altın Sandık',
    badgeLabel: 'Sezon Şampiyonu',
    badgeIcon: '/home/icons/leaderboard/badge-season-1.png',
    chestIcon: '/home/icons/leaderboard/chest-gold.png',
    cashAmount: 10000000,
    resourceAmount: 750000,
  },
  2: {
    rank: 2,
    tier: 'silver',
    chestLabel: 'Gümüş Sandık',
    badgeLabel: 'Sezon İkincisi',
    badgeIcon: '/home/icons/leaderboard/badge-season-2.png',
    chestIcon: '/home/icons/leaderboard/chest-silver.png',
    cashAmount: 5000000,
    resourceAmount: 375000,
  },
  3: {
    rank: 3,
    tier: 'bronze',
    chestLabel: 'Bronz Sandık',
    badgeLabel: 'Sezon Üçüncüsü',
    badgeIcon: '/home/icons/leaderboard/badge-season-3.png',
    chestIcon: '/home/icons/leaderboard/chest-bronze.png',
    cashAmount: 2500000,
    resourceAmount: 187500,
  },
}
const LEAGUE_TOP_RANKS = [1, 2, 3]
const LEAGUE_TOP_RANK_SET = new Set(LEAGUE_TOP_RANKS)
const LEAGUE_REGULAR_REWARD_RANK_MIN = 4
const LEAGUE_REGULAR_REWARD_RANK_MAX = 25
const LEAGUE_SEASON_REWARD_MAX_RANK = LEAGUE_REGULAR_REWARD_RANK_MAX
const LEAGUE_SEASON_REWARD_MULTIPLIER_BASE_SEASON_KEY = '2026-03'
const LEAGUE_SEASON_REWARD_MULTIPLIER_STEP = 1
const LEAGUE_SEASON_REWARD_MULTIPLIER_MAX = 5
const LEAGUE_REGULAR_RANK_REWARD_CONFIG = {
  tier: 'common',
  chestLabel: 'Sıradan Sandık',
  badgeLabel: 'Sezon İlk 25',
  badgeIcon: '/home/icons/leaderboard/chestsiradan.png',
  chestIcon: '/home/icons/leaderboard/chestsiradan.png',
  cashAmount: 1000000,
  resourceAmount: 50000,
}
const LEGACY_ADMIN_SEASON_REWARD_PATCH_VERSION = '2026-03-admin-season-pack-v1'
const LEAGUE_TOP_REWARD_RESOURCE_IDS = [
  'spare-parts',
  'engine-kit',
  'brick',
  'cement',
  'timber',
  'energy',
  'oil',
]
const XP_COEFFICIENT_L2 = 1250n
const XP_COEFFICIENT_L1 = -2250n
const XP_COEFFICIENT_C0 = 1500n
const PLAYER_LEVEL_CAP = 1000
const PLAYER_LAST_TRANSITION_LEVEL = Math.max(1, PLAYER_LEVEL_CAP - 1)
const PLAYER_MAX_LEVEL_XP_COST = xpRequiredForLevelFormula(PLAYER_LAST_TRANSITION_LEVEL)
const PLAYER_XP_TOTAL_CAP = cumulativeXpRequiredToReachLevel(PLAYER_LEVEL_CAP)
const PLAYER_STARTER_RESOURCE_AMOUNT = 10000
const PLAYER_SUPPORT_PATCH_VERSION = '2026-03-support-v4'
const FACTORY_ENERGY_FIX_PATCH_VERSION = '2026-03-energy-factory-fix-v1'
const STARTER_RESOURCE_EXCLUDE = new Set(['diamond'])
const COMPANY_LEVEL_MIN = 1
const COMPANY_LEVEL_MAX = 4
const COMPANY_UPGRADE_COST_BY_LEVEL = {
  1: 1_000_000,
  2: 5_000_000,
  3: 12_000_000,
}
const COMPANY_UNLOCK_FLOW = [
  {
    key: 'moto-rental',
    kind: 'fleet',
    templateId: 'moto-rental',
    name: 'Motor Kiralama',
    cost: 500000,
    requiredLevel: 1,
    requiredCompanyLevel: 1,
  },
  {
    key: 'auto-rental',
    kind: 'fleet',
    templateId: 'auto-rental',
    name: 'Araba Kiralama',
    cost: 1000000,
    requiredLevel: 1,
    requiredCompanyLevel: 2,
  },
  {
    key: 'logistics',
    kind: 'logistics',
    name: 'Tır Kiralama',
    cost: 3000000,
    requiredLevel: 1,
    requiredCompanyLevel: 3,
  },
  {
    key: 'property-rental',
    kind: 'fleet',
    templateId: 'property-rental',
    name: 'Mülk Kiralama',
    cost: 12000000,
    requiredLevel: 1,
    requiredCompanyLevel: 4,
  },
]

function createDefaultBusinessUnlocks() {
  return {
    'moto-rental': false,
    'auto-rental': false,
    'property-rental': false,
    logistics: false,
  }
}

const FACTORY_MIN_LEVEL = 1
const FACTORY_UNCAPPED_MAX_LEVEL = 1000000000
const FACTORY_DEFAULT_MAX_LEVEL = 200
const FACTORY_DEFAULT_SPEEDUP_RATIO = 0.3
const FACTORY_DEFAULT_SPEEDUP_DIAMONDS = 40
const FACTORY_MAX_SLOTS_DEFAULT = 1
const FACTORY_MAX_SLOTS_PREMIUM = 2

function factoryConfiguredMaxLevel(template) {
  return Math.max(0, asInt(template?.upgrade?.maxLevel, 0))
}

function factoryHasLevelCap(template) {
  const configured = factoryConfiguredMaxLevel(template)
  return configured > 0 || FACTORY_DEFAULT_MAX_LEVEL > 0
}

function factoryMaxLevel(template) {
  const configured = factoryConfiguredMaxLevel(template)
  if (configured > 0) return Math.max(FACTORY_MIN_LEVEL, configured)
  return Math.max(FACTORY_MIN_LEVEL, FACTORY_DEFAULT_MAX_LEVEL)
}

function createDefaultFactoryUpgradeState(template) {
  return {
    active: false,
    fromLevel: 0,
    toLevel: 0,
    startedAt: '',
    endsAt: '',
    speedupCount: 0,
    speedupRatio: clamp(
      Number(template?.upgrade?.speedupRatio ?? FACTORY_DEFAULT_SPEEDUP_RATIO),
      0.05,
      0.9,
    ),
    speedupDiamondCost: Math.max(
      1,
      asInt(template?.upgrade?.speedupDiamondCost, FACTORY_DEFAULT_SPEEDUP_DIAMONDS),
    ),
  }
}

function createFactoryState(factoryId, timestamp) {
  const template = FACTORY_BY_ID.get(factoryId)
  const baseUpgrade = createDefaultFactoryUpgradeState(template)
  return {
    factoryId,
    owned: false,
    level: 0,
    purchasedAt: '',
    buildStartedAt: '',
    buildEndsAt: '',
    collectReadyAt: '',
    lastCollectedAt: '',
    totalCollected: 0,
    upgrading: baseUpgrade,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createDefaultFactoriesState(timestamp) {
  const state = {}
  for (const template of FACTORY_TEMPLATES) {
    state[template.id] = createFactoryState(template.id, timestamp)
  }
  return state
}

function normalizeFactoryUpgradeState(value, template) {
  const source = value && typeof value === 'object' ? value : {}
  const fallback = createDefaultFactoryUpgradeState(template)
  const active = source.active === true
  const fromLevel = Math.max(0, asInt(source.fromLevel, fallback.fromLevel))
  const toLevel = Math.max(0, asInt(source.toLevel, fallback.toLevel))
  const speedupRatio = clamp(
    Number(source.speedupRatio ?? fallback.speedupRatio),
    0.05,
    0.9,
  )
  const speedupDiamondCost = Math.max(
    1,
    asInt(source.speedupDiamondCost, fallback.speedupDiamondCost),
  )

  if (!active || toLevel <= fromLevel) {
    return {
      ...fallback,
      speedupRatio,
      speedupDiamondCost,
    }
  }

  return {
    active: true,
    fromLevel,
    toLevel,
    startedAt: typeof source.startedAt === 'string' ? source.startedAt : '',
    endsAt: typeof source.endsAt === 'string' ? source.endsAt : '',
    speedupCount: Math.max(0, asInt(source.speedupCount, 0)),
    speedupRatio,
    speedupDiamondCost,
  }
}

function normalizeFactoryState(value, template, timestamp) {
  const source = value && typeof value === 'object' ? value : {}
  const fallback = createFactoryState(template.id, timestamp)
  const nowMs = createdMs(timestamp) || Date.now()
  const maxLevel = factoryMaxLevel(template)
  const hasLevelCap = factoryHasLevelCap(template)
  const owned = source.owned === true
  let level = asInt(source.level, owned ? FACTORY_MIN_LEVEL : 0)
  if (owned) {
    level = Math.max(FACTORY_MIN_LEVEL, level)
    if (hasLevelCap) {
      level = clamp(level, FACTORY_MIN_LEVEL, maxLevel)
    }
  } else {
    level = Math.max(0, level)
    if (hasLevelCap) {
      level = clamp(level, 0, maxLevel)
    }
  }

  const buildEndsAt = typeof source.buildEndsAt === 'string' ? source.buildEndsAt : ''
  const buildEndsMs = createdMs(buildEndsAt)
  const isBuilding = !owned && buildEndsMs > nowMs
  if (isBuilding && level < FACTORY_MIN_LEVEL) {
    level = FACTORY_MIN_LEVEL
  }

  const upgrading = normalizeFactoryUpgradeState(source.upgrading, template)
  if (upgrading.active) {
    upgrading.fromLevel = Math.max(FACTORY_MIN_LEVEL, upgrading.fromLevel)
    upgrading.toLevel = Math.max(FACTORY_MIN_LEVEL, upgrading.toLevel)
    if (hasLevelCap) {
      upgrading.fromLevel = clamp(upgrading.fromLevel, FACTORY_MIN_LEVEL, maxLevel)
      upgrading.toLevel = clamp(upgrading.toLevel, FACTORY_MIN_LEVEL, maxLevel)
    }
    if (upgrading.toLevel <= upgrading.fromLevel) {
      upgrading.active = false
      upgrading.fromLevel = 0
      upgrading.toLevel = 0
      upgrading.startedAt = ''
      upgrading.endsAt = ''
      upgrading.speedupCount = 0
    }
  }

  let collectReadyAt = typeof source.collectReadyAt === 'string' ? source.collectReadyAt : ''
  if (owned && !collectReadyAt) {
    collectReadyAt = timestamp
  } else if (!owned && isBuilding && !collectReadyAt) {
    collectReadyAt = buildEndsAt
  }

  return {
    ...fallback,
    ...source,
    factoryId: template.id,
    owned,
    level,
    purchasedAt: typeof source.purchasedAt === 'string' ? source.purchasedAt : '',
    buildStartedAt: typeof source.buildStartedAt === 'string' ? source.buildStartedAt : '',
    buildEndsAt,
    collectReadyAt,
    lastCollectedAt: typeof source.lastCollectedAt === 'string' ? source.lastCollectedAt : '',
    totalCollected: Math.max(0, asInt(source.totalCollected, 0)),
    upgrading,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : fallback.createdAt,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : fallback.updatedAt,
  }
}

function normalizeFactoriesState(rawFactories, timestamp) {
  const source = rawFactories && typeof rawFactories === 'object' ? rawFactories : {}
  const nextState = {}
  for (const template of FACTORY_TEMPLATES) {
    const sourceEntry = source[template.id]
    nextState[template.id] = normalizeFactoryState(sourceEntry, template, timestamp)
  }
  return nextState
}

// --- Madenler (Mines) ---
const MS_SECOND = 1000
const MINE_PREMIUM_MULTIPLIER = 2

function createMineState(mineId, timestamp) {
  return {
    mineId,
    digEndsAt: '',
    collectReadyAt: '',
    nextDigAt: '',
    updatedAt: timestamp,
  }
}

function createDefaultMinesState(timestamp) {
  const state = {}
  for (const template of MINE_TEMPLATES) {
    state[template.id] = createMineState(template.id, timestamp)
  }
  return state
}

function normalizeMineState(source, template, timestamp) {
  const fallback = createMineState(template.id, timestamp)
  const raw = source && typeof source === 'object' ? source : {}
  return {
    mineId: template.id,
    digEndsAt: typeof raw.digEndsAt === 'string' ? raw.digEndsAt : '',
    collectReadyAt: typeof raw.collectReadyAt === 'string' ? raw.collectReadyAt : '',
    nextDigAt: typeof raw.nextDigAt === 'string' ? raw.nextDigAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : fallback.updatedAt,
  }
}

function normalizeMinesState(rawMines, timestamp) {
  const source = rawMines && typeof rawMines === 'object' ? rawMines : {}
  const nextState = {}
  for (const template of MINE_TEMPLATES) {
    nextState[template.id] = normalizeMineState(source[template.id], template, timestamp)
  }
  return nextState
}

function mineDigDurationMs(template) {
  const sec = Math.max(1, asInt(template?.digDurationSeconds, 10))
  return sec * MS_SECOND
}

function mineCooldownMs(template) {
  return Math.max(1, asInt(template?.cooldownMinutes, 30)) * MS_MINUTE
}

function mineCostCash(template) {
  const baseCost = Math.max(0, asInt(template?.costCash, 0))
  return Math.max(0, baseCost * 4)
}

function mineRandomOutput(profile, template, timestamp) {
  const minOut = Math.max(10, asInt(template?.minOutput, 10))
  const maxOut = Math.min(Math.max(minOut, asInt(template?.maxOutput, 500)), 500)
  let amount = minOut + Math.floor(Math.random() * (maxOut - minOut + 1))
  if (isPremiumActive(profile, timestamp)) {
    amount = Math.floor(amount * MINE_PREMIUM_MULTIPLIER)
  }
  return Math.max(1, amount)
}

function tickMines(profile, timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  if (!profile.mines || typeof profile.mines !== 'object') {
    profile.mines = createDefaultMinesState(timestamp)
  }
  for (const template of MINE_TEMPLATES) {
    const state = profile.mines[template.id] || createMineState(template.id, timestamp)
    profile.mines[template.id] = state
    const digEndsMs = createdMs(state.digEndsAt)
    if (digEndsMs > 0 && nowMs >= digEndsMs) {
      state.collectReadyAt = timestamp
      state.digEndsAt = ''
      state.updatedAt = timestamp
    }
  }
}

function minesView(profile, timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  const minesState = profile.mines && typeof profile.mines === 'object' ? profile.mines : {}
  const wallet = Math.max(0, asInt(profile?.wallet, 0))
  return MINE_TEMPLATES.map((template) => {
    const state = minesState[template.id] || createMineState(template.id, timestamp)
    const digEndsMs = createdMs(state.digEndsAt)
    const isDigging = digEndsMs > nowMs
    const digRemainingMs = isDigging ? Math.max(0, digEndsMs - nowMs) : 0
    const collectReadyMs = createdMs(state.collectReadyAt)
    const canCollect = collectReadyMs > 0 && nowMs >= collectReadyMs
    const nextDigMs = createdMs(state.nextDigAt)
    const canStartDig = !isDigging && !canCollect && (nextDigMs <= 0 || nowMs >= nextDigMs)
    const costCash = mineCostCash(template)
    const outputItemId = normalizeItemId(template.outputItemId || 'gold')
    const outputItem = ITEM_BY_ID.get(outputItemId)
    const minOutput = Math.max(10, asInt(template.minOutput, 10))
    const maxOutput = Math.min(Math.max(minOutput, asInt(template.maxOutput, 500)), 500)
    return {
      id: template.id,
      name: template.name || template.id,
      outputItemId,
      outputItemName: outputItem?.name || outputItemId,
      minOutput,
      maxOutput,
      digDurationSeconds: Math.max(1, asInt(template.digDurationSeconds, 10)),
      cooldownMinutes: Math.max(1, asInt(template.cooldownMinutes, 30)),
      costCash,
      xpPerCollect: Math.max(0, asInt(template.xpPerCollect, 10)),
      canStartDig,
      hasEnoughCash: wallet >= costCash,
      isDigging,
      digRemainingMs,
      canCollect,
      collectReadyAt: state.collectReadyAt,
      nextDigAt: state.nextDigAt,
      nextDigRemainingMs: nextDigMs > 0 && nowMs < nextDigMs ? Math.max(0, nextDigMs - nowMs) : 0,
    }
  })
}

function factoryBuildDurationMs(template) {
  return Math.max(1, asInt(template?.buildDurationMinutes, 30)) * MS_MINUTE
}

function factoryCollectIntervalMs(template) {
  return Math.max(1, asInt(template?.collectIntervalMinutes, 30)) * MS_MINUTE
}

function factoryUpgradeDurationMs(template, targetLevel) {
  const baseMinutes = Math.max(1, asInt(template?.upgrade?.baseDurationMinutes, 30))
  const safeTargetLevel = Math.max(FACTORY_MIN_LEVEL + 1, asInt(targetLevel, FACTORY_MIN_LEVEL + 1))
  const levelStep = Math.max(0, safeTargetLevel - (FACTORY_MIN_LEVEL + 1))
  return Math.max(1, Math.round(baseMinutes * Math.pow(4, levelStep))) * MS_MINUTE
}

const FACTORY_UPGRADE_MIN_CASH = 5000000

function factoryUpgradeCashCost(template, targetLevel, options = {}) {
  const configuredBaseCash = Math.max(0, asInt(template?.upgrade?.baseCashCost, 0))
  const fallbackBaseCash = Math.max(FACTORY_UPGRADE_MIN_CASH, Math.round(Math.max(1, asInt(template?.purchaseCostCash, 0)) * 0.1))
  const baseCash = Math.max(FACTORY_UPGRADE_MIN_CASH, configuredBaseCash > 0 ? configuredBaseCash : fallbackBaseCash)
  const safeTargetLevel = Math.max(FACTORY_MIN_LEVEL + 1, asInt(targetLevel, FACTORY_MIN_LEVEL + 1))
  const levelStep = Math.max(0, safeTargetLevel - (FACTORY_MIN_LEVEL + 1))
  const growth = 4
  const calculated = Math.max(FACTORY_UPGRADE_MIN_CASH, Math.round(baseCash * Math.pow(growth, levelStep)))
  return weeklyEventCostValue(
    calculated,
    options?.timestamp || '',
    options?.weeklyEvents || null,
    { minPositive: 1 },
  )
}

function factoryUpgradeResourceCost(template, targetLevel, options = {}) {
  const base = template?.upgrade?.baseResourceCost && typeof template.upgrade.baseResourceCost === 'object'
    ? template.upgrade.baseResourceCost
    : {}
  const safeTargetLevel = Math.max(FACTORY_MIN_LEVEL + 1, asInt(targetLevel, FACTORY_MIN_LEVEL + 1))
  const levelStep = Math.max(0, safeTargetLevel - (FACTORY_MIN_LEVEL + 1))
  const growth = 4
  const multiplier = Math.pow(growth, levelStep)
  const nextCost = {}
  for (const [itemId, amount] of Object.entries(base)) {
    const safeItemId = normalizeItemId(itemId)
    if (!ITEM_BY_ID.has(safeItemId)) continue
    const safeAmount = Math.max(0, Math.round(asInt(amount, 0) * multiplier))
    if (safeAmount <= 0) continue
    nextCost[safeItemId] = safeAmount
  }
  return weeklyEventCostMap(nextCost, options?.timestamp || '', options?.weeklyEvents || null)
}

function factorySpeedupDiamondCost(template) {
  return Math.max(1, asInt(template?.upgrade?.speedupDiamondCost, FACTORY_DEFAULT_SPEEDUP_DIAMONDS))
}

/** İnşaat hızlandırma maliyeti: kalan süre arttıkça artar. */
function computeBuildSpeedupDiamondCost(template, remainingMs) {
  const base = Math.max(1, asInt(template?.upgrade?.speedupDiamondCost, BUILD_SPEEDUP_BASE_DIAMONDS))
  const hours = Math.max(0, remainingMs) / MS_HOUR
  const extra = Math.floor(hours * BUILD_SPEEDUP_DIAMONDS_PER_HOUR)
  return Math.min(SPEEDUP_DIAMOND_CAP, Math.max(base, base + extra))
}

/** Yükseltme hızlandırma maliyeti: inşaattan daha pahalı, kalan süre arttıkça artar. */
function computeUpgradeSpeedupDiamondCost(template, remainingMs) {
  const base = Math.max(UPGRADE_SPEEDUP_BASE_DIAMONDS, asInt(template?.upgrade?.speedupDiamondCost, FACTORY_DEFAULT_SPEEDUP_DIAMONDS) + 15)
  const hours = Math.max(0, remainingMs) / MS_HOUR
  const extra = Math.floor(hours * UPGRADE_SPEEDUP_DIAMONDS_PER_HOUR)
  return Math.min(SPEEDUP_DIAMOND_CAP, Math.max(base, base + extra))
}

function factorySpeedupRatio(template) {
  return clamp(Number(template?.upgrade?.speedupRatio ?? FACTORY_DEFAULT_SPEEDUP_RATIO), 0.05, 0.9)
}

function factoryOutputPerCollect(template, level) {
  const safeLevel = Math.max(FACTORY_MIN_LEVEL, asInt(level, FACTORY_MIN_LEVEL))
  const baseOutput = Math.max(1, asInt(template?.baseOutputPerCollect, 1))
  const levelStep = Math.max(0, safeLevel - FACTORY_MIN_LEVEL)
  return Math.max(1, Math.round(baseOutput * Math.pow(2, levelStep)))
}

function factoryEnergyCostPerCollect(template, level) {
  const safeLevel = Math.max(FACTORY_MIN_LEVEL, asInt(level, FACTORY_MIN_LEVEL))
  const baseEnergy = Math.max(0, asInt(template?.baseEnergyCostPerCollect, 0))
  const levelStep = Math.max(0, safeLevel - FACTORY_MIN_LEVEL)
  return Math.max(0, Math.round(baseEnergy * Math.pow(2, levelStep)))
}

function factoryPurchaseResourceCost(template, options = {}) {
  const base = template?.purchaseResourceCost && typeof template.purchaseResourceCost === 'object'
    ? template.purchaseResourceCost
    : {}
  const nextCost = {}
  for (const [itemId, amount] of Object.entries(base)) {
    const safeItemId = normalizeItemId(itemId)
    if (!ITEM_BY_ID.has(safeItemId)) continue
    const safeAmount = Math.max(0, asInt(amount, 0))
    if (safeAmount <= 0) continue
    nextCost[safeItemId] = safeAmount
  }
  return weeklyEventCostMap(nextCost, options?.timestamp || '', options?.weeklyEvents || null)
}

function countFactoryBuildAndUpgradeSlots(profile, timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  let building = 0
  let upgrading = 0
  if (!profile?.factories || typeof profile.factories !== 'object') {
    return { building, upgrading, total: 0 }
  }
  for (const template of FACTORY_TEMPLATES) {
    const state = profile.factories[template.id]
    if (!state) continue
    const buildEndsMs = createdMs(state?.buildEndsAt)
    const isBuilding = state.owned !== true && buildEndsMs > nowMs
    if (isBuilding) building += 1
    const up = state?.upgrading && typeof state.upgrading === 'object' ? state.upgrading : {}
    const upgradeEndsMs = createdMs(up.endsAt)
    if (state.owned === true && up.active === true && upgradeEndsMs > nowMs) upgrading += 1
  }
  return { building, upgrading, total: building + upgrading }
}

function removeFactoryMiningCost(profile, costByItem) {
  const entries = Object.entries(costByItem || {})
  for (const [itemId, amount] of entries) {
    const safeAmount = Math.max(0, asInt(amount, 0))
    if (safeAmount <= 0) continue
    if (!removeInventory(profile, itemId, safeAmount)) return false
  }
  return true
}

function tickFactories(profile, timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  if (!profile.factories || typeof profile.factories !== 'object') {
    profile.factories = createDefaultFactoriesState(timestamp)
  }

  for (const template of FACTORY_TEMPLATES) {
    const maxLevel = factoryMaxLevel(template)
    const hasLevelCap = factoryHasLevelCap(template)
    const state = profile.factories[template.id] || createFactoryState(template.id, timestamp)
    profile.factories[template.id] = state

    const buildEndsMs = createdMs(state.buildEndsAt)
    const isBuilding = state.owned !== true && buildEndsMs > nowMs
    if (!isBuilding && state.owned !== true && buildEndsMs > 0 && nowMs >= buildEndsMs) {
      state.owned = true
      state.level = Math.max(FACTORY_MIN_LEVEL, asInt(state.level, FACTORY_MIN_LEVEL))
      if (hasLevelCap) {
        state.level = clamp(state.level, FACTORY_MIN_LEVEL, maxLevel)
      }
      if (!state.purchasedAt) {
        state.purchasedAt = state.buildStartedAt || timestamp
      }
      /* İnşaat yeni bitti: ilk tahsilat hemen hazır olsun, 30 dk bekletme */
      state.collectReadyAt = timestamp
      state.updatedAt = timestamp
      pushNotification(profile, 'factory', `Fabrika kuruldu: ${template.name || template.id}. İnşaat tamamlandı.`, timestamp)
    }

    if (state.owned) {
      state.level = Math.max(FACTORY_MIN_LEVEL, asInt(state.level, FACTORY_MIN_LEVEL))
      if (hasLevelCap) {
        state.level = clamp(state.level, FACTORY_MIN_LEVEL, maxLevel)
      }
      if (!state.collectReadyAt || createdMs(state.collectReadyAt) <= 0) {
        state.collectReadyAt = timestamp
      }
    }

    const upgrading = state.upgrading && typeof state.upgrading === 'object'
      ? state.upgrading
      : createDefaultFactoryUpgradeState(template)
    const upgradeEndsMs = createdMs(upgrading.endsAt)
    if (upgrading.active === true && upgradeEndsMs > 0 && nowMs >= upgradeEndsMs) {
      state.level = Math.max(FACTORY_MIN_LEVEL, asInt(upgrading.toLevel, state.level + 1))
      if (hasLevelCap) {
        state.level = clamp(state.level, FACTORY_MIN_LEVEL, maxLevel)
      }
      state.upgrading = createDefaultFactoryUpgradeState(template)
      state.updatedAt = timestamp
      pushNotification(profile, 'factory', `Fabrika yükseltmesi tamamlandı: ${template.name || template.id} (Seviye ${state.level}).`, timestamp)
    } else {
      state.upgrading = normalizeFactoryUpgradeState(upgrading, template)
    }
  }
}

function factoriesView(profile, timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  const weeklyEvents = weeklyEventState(timestamp)
  const slotUsage = countFactoryBuildAndUpgradeSlots(profile, timestamp)
  const maxUpgradeSlots = isPremiumActive(profile, timestamp) ? FACTORY_MAX_SLOTS_PREMIUM : FACTORY_MAX_SLOTS_DEFAULT
  const hasUpgradeSlotCapacity = slotUsage.total < maxUpgradeSlots
  const factoriesState = profile.factories && typeof profile.factories === 'object'
    ? profile.factories
    : {}

  return FACTORY_TEMPLATES.map((template) => {
    const maxLevel = factoryMaxLevel(template)
    const hasLevelCap = factoryHasLevelCap(template)
    const _configuredMaxLevel = factoryConfiguredMaxLevel(template)
    const state = factoriesState[template.id] || createFactoryState(template.id, timestamp)
    const buildEndsMs = createdMs(state.buildEndsAt)
    const isBuilding = state.owned !== true && buildEndsMs > nowMs
    const buildRemainingMs = isBuilding ? Math.max(0, buildEndsMs - nowMs) : 0
    const owned = state.owned === true
    let level = owned ? Math.max(FACTORY_MIN_LEVEL, asInt(state.level, FACTORY_MIN_LEVEL)) : 0
    if (owned && hasLevelCap) {
      level = clamp(level, FACTORY_MIN_LEVEL, maxLevel)
    }
    const purchaseCostCash = weeklyEventCostValue(
      Math.max(1, asInt(template.purchaseCostCash, 0)),
      timestamp,
      weeklyEvents,
      { minPositive: 1 },
    )
    const purchaseCostByItem = factoryPurchaseResourceCost(template, { timestamp, weeklyEvents })
    const purchaseMissingByItem = Object.fromEntries(
      Object.entries(purchaseCostByItem).map(([itemId, amount]) => {
        const needed = Math.max(0, asInt(amount, 0))
        const available = getInventoryQuantity(profile, itemId)
        return [itemId, Math.max(0, needed - available)]
      }),
    )
    const missingPurchaseCash = Math.max(0, purchaseCostCash - Math.max(0, asInt(profile?.wallet, 0)))
    const canPurchaseNow = !owned &&
      !isBuilding &&
      missingPurchaseCash <= 0 &&
      Object.values(purchaseMissingByItem).every((value) => asInt(value, 0) <= 0)
    const collectReadyAt = owned
      ? (typeof state.collectReadyAt === 'string' && state.collectReadyAt ? state.collectReadyAt : timestamp)
      : ''
    const collectReadyMs = createdMs(collectReadyAt)
    const collectRemainingMs = owned && collectReadyMs > 0
      ? Math.max(0, collectReadyMs - nowMs)
      : 0
    const currentOutputPerCollect = factoryOutputPerCollect(template, Math.max(level, FACTORY_MIN_LEVEL))
    const currentEnergyCostPerCollect = weeklyEventCostValue(
      factoryEnergyCostPerCollect(template, Math.max(level, FACTORY_MIN_LEVEL)),
      timestamp,
      weeklyEvents,
      { minPositive: 1, applyDiscount: true },
    )
    const upgrade = normalizeFactoryUpgradeState(state.upgrading, template)
    const upgradeEndsMs = createdMs(upgrade.endsAt)
    const isUpgrading = owned && upgrade.active === true && upgradeEndsMs > nowMs
    const upgradeRemainingMs = isUpgrading ? Math.max(0, upgradeEndsMs - nowMs) : 0
    const upgradeSlotBlocked = !isUpgrading && !hasUpgradeSlotCapacity
    const nextLevel = hasLevelCap
      ? Math.min(maxLevel, Math.max(FACTORY_MIN_LEVEL, level) + 1)
      : Math.max(FACTORY_MIN_LEVEL, level) + 1
    const maxReached = hasLevelCap && level >= maxLevel
    const upgradeCostCash = maxReached
      ? 0
      : factoryUpgradeCashCost(template, nextLevel, { timestamp, weeklyEvents })
    const upgradeCostByItem = maxReached
      ? {}
      : factoryUpgradeResourceCost(template, nextLevel, { timestamp, weeklyEvents })
    const upgradeMissingByItem = Object.fromEntries(
      Object.entries(upgradeCostByItem).map(([itemId, amount]) => {
        const needed = Math.max(0, asInt(amount, 0))
        const available = getInventoryQuantity(profile, itemId)
        return [itemId, Math.max(0, needed - available)]
      }),
    )
    const missingUpgradeCash = Math.max(0, upgradeCostCash - Math.max(0, asInt(profile?.wallet, 0)))
    const hasMissingUpgradeResources = Object.values(upgradeMissingByItem).some((v) => asInt(v, 0) > 0)
    const canUpgradeNow = owned &&
      !isBuilding &&
      !isUpgrading &&
      !upgradeSlotBlocked &&
      !maxReached &&
      missingUpgradeCash <= 0 &&
      !hasMissingUpgradeResources
    const energyItemId = normalizeItemId(template.energyItemId || 'energy')
    const energyAvailable = getInventoryQuantity(profile, energyItemId)
    const collectEnergyMissing = Math.max(0, currentEnergyCostPerCollect - energyAvailable)
    const xpPerCollect = weeklyEventXpGain(
      Math.max(5, Math.round(currentOutputPerCollect * 0.35)),
      timestamp,
      weeklyEvents,
    )
    const canCollectNow = owned &&
      !isBuilding &&
      !isUpgrading &&
      collectRemainingMs <= 0 &&
      collectEnergyMissing <= 0

    return {
      id: template.id,
      name: template.name,
      image: String(template.image || '').trim(),
      icon: String(template.icon || '').trim(),
      owned,
      level,
      isBuilding,
      buildStartedAt: state.buildStartedAt || '',
      buildEndsAt: state.buildEndsAt || '',
      buildRemainingMs,
      buildDurationMinutes: Math.max(1, asInt(template.buildDurationMinutes, 30)),
      buildSpeedupDiamondCost: isBuilding ? computeBuildSpeedupDiamondCost(template, buildRemainingMs) : 0,
      buildSpeedupRatio: isBuilding ? factorySpeedupRatio(template) : 0,
      hasLevelCap,
      maxLevel: hasLevelCap ? maxLevel : 0,
      purchaseCostCash,
      purchaseCostByItem,
      purchaseMissingByItem,
      missingPurchaseCash,
      canPurchaseNow,
      collectIntervalMinutes: Math.max(1, asInt(template.collectIntervalMinutes, 30)),
      collectReadyAt,
      collectRemainingMs,
      canCollectNow,
      outputItemId: normalizeItemId(template.outputItemId),
      outputItemName: String(template.outputItemName || ITEM_BY_ID.get(normalizeItemId(template.outputItemId))?.name || '').trim(),
      outputPerCollect: currentOutputPerCollect,
      energyItemId,
      energyItemName: ITEM_BY_ID.get(energyItemId)?.name || energyItemId,
      energyCostPerCollect: currentEnergyCostPerCollect,
      xpPerCollect,
      energyAvailable,
      collectEnergyMissing,
      totalCollected: Math.max(0, asInt(state.totalCollected, 0)),
      upgrading: {
        active: isUpgrading,
        fromLevel: Math.max(0, asInt(upgrade.fromLevel, 0)),
        toLevel: Math.max(0, asInt(upgrade.toLevel, 0)),
        startedAt: upgrade.startedAt || '',
        endsAt: upgrade.endsAt || '',
        remainingMs: upgradeRemainingMs,
        speedupCount: Math.max(0, asInt(upgrade.speedupCount, 0)),
        speedupRatio: factorySpeedupRatio(template),
        speedupDiamondCost: isUpgrading ? computeUpgradeSpeedupDiamondCost(template, upgradeRemainingMs) : 0,
      },
      nextUpgrade: {
        maxReached,
        nextLevel,
        durationMinutes: maxReached ? 0 : Math.round(factoryUpgradeDurationMs(template, nextLevel) / MS_MINUTE),
        costCash: upgradeCostCash,
        missingCash: missingUpgradeCash,
        costByItem: upgradeCostByItem,
        missingByItem: upgradeMissingByItem,
        canUpgradeNow,
      },
      upgradeSlotBlocked,
      updatedAt: state.updatedAt || '',
    }
  })
}

function _starterResourceRows(quantity = PLAYER_STARTER_RESOURCE_AMOUNT, options = {}) {
  const safeQuantity = Math.max(0, asInt(quantity, PLAYER_STARTER_RESOURCE_AMOUNT))
  const safeOilQuantity = Math.max(0, asInt(options?.oilQuantity, safeQuantity))
  return ITEM_CATALOG
    .filter((item) => !STARTER_RESOURCE_EXCLUDE.has(String(item?.id || '').trim()))
    .map((item) => ({
      itemId: item.id,
      quantity: String(item?.id || '').trim() === 'oil' ? safeOilQuantity : safeQuantity,
    }))
}

function normalizeItemId(itemId) {
  const safeId = String(itemId || '').trim()
  return LEGACY_ITEM_MAP[safeId] || safeId
}

function normalizeBusinessTemplateId(templateId) {
  const safeTemplateId = String(templateId || '').trim()
  if (!safeTemplateId) return ''
  if (FLEET_TEMPLATE_SET.has(safeTemplateId)) return safeTemplateId
  return LEGACY_TEMPLATE_MAP[safeTemplateId] || ''
}

function normalizeListingTemplateId(templateId) {
  const safeTemplateId = String(templateId || '').trim()
  if (!safeTemplateId) return ''
  if (safeTemplateId === 'logistics') return 'logistics'
  return normalizeBusinessTemplateId(safeTemplateId)
}

/** İkinci el ilan etiketleri: Motor, Araba, Mülk, Tır */
function assetTypeLabelFromTemplateId(templateId) {
  const t = String(templateId || '').trim()
  if (t === 'moto-rental') return 'Motor'
  if (t === 'auto-rental') return 'Araba'
  if (t === 'property-rental') return 'Mülk'
  if (t === 'logistics') return 'Tır'
  return 'Araç'
}

function normalizeBusinessUnlocks(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    'moto-rental': source['moto-rental'] === true,
    'auto-rental': source['auto-rental'] === true,
    'property-rental': source['property-rental'] === true,
    logistics: source.logistics === true,
  }
}

function isFleetTemplateUnlocked(profile, templateId) {
  const safeTemplateId = normalizeBusinessTemplateId(templateId)
  if (!safeTemplateId) return false
  return profile?.businessUnlocks?.[safeTemplateId] === true
}

function isLogisticsUnlocked(profile) {
  return profile?.businessUnlocks?.logistics === true
}

function getNextCompanyUnlock(profile) {
  for (const unlock of COMPANY_UNLOCK_FLOW) {
    const isUnlocked = unlock.kind === 'logistics'
      ? isLogisticsUnlocked(profile)
      : isFleetTemplateUnlocked(profile, unlock.templateId)
    if (!isUnlocked) return unlock
  }
  return null
}

function resolveCompanyLevel(profile) {
  return clamp(asInt(profile?.companyLevel, COMPANY_LEVEL_MIN), COMPANY_LEVEL_MIN, COMPANY_LEVEL_MAX)
}

function companyUpgradeCost(level, options = {}) {
  const safeLevel = clamp(asInt(level, COMPANY_LEVEL_MIN), COMPANY_LEVEL_MIN, COMPANY_LEVEL_MAX)
  const baseCost = Math.max(0, asInt(COMPANY_UPGRADE_COST_BY_LEVEL[safeLevel], 0))
  return weeklyEventCostValue(
    baseCost,
    options?.timestamp || '',
    options?.weeklyEvents || null,
    { minPositive: 1 },
  )
}

function isCompanyUnlockEntryUnlocked(profile, entry) {
  if (!entry) return false
  return entry.kind === 'logistics'
    ? isLogisticsUnlocked(profile)
    : isFleetTemplateUnlocked(profile, entry.templateId)
}

function setCompanyUnlockEntry(profile, entry, value) {
  if (!entry) return
  const nextValue = value === true
  if (entry.kind === 'logistics') {
    profile.businessUnlocks.logistics = nextValue
    return
  }
  if (entry.templateId) {
    profile.businessUnlocks[entry.templateId] = nextValue
  }
}

function companyUnlockEntryByKey(rawKey) {
  const safeKey = String(rawKey || '').trim()
  if (!safeKey) return null
  return (
    COMPANY_UNLOCK_FLOW.find((entry) => entry.key === safeKey) ||
    COMPANY_UNLOCK_FLOW.find((entry) => entry.templateId === safeKey) ||
    null
  )
}

function fleetUnlockCost(templateId, options = {}) {
  const next = COMPANY_UNLOCK_FLOW.find(
    (entry) => entry.kind === 'fleet' && entry.templateId === normalizeBusinessTemplateId(templateId),
  )
  const baseCost = next ? Math.max(1, asInt(next.cost, 0)) : 0
  if (!next) return 0
  return weeklyEventCostValue(
    baseCost,
    options?.timestamp || '',
    options?.weeklyEvents || null,
    { minPositive: 1 },
  )
}

function companyUnlockView(profile, timestamp = '') {
  const wallet = Math.max(0, asInt(profile?.wallet, 0))
  const companyLevel = resolveCompanyLevel(profile)
  const weeklyEvents = timestamp ? weeklyEventState(timestamp) : null
  const nextUnlock = getNextCompanyUnlock(profile)
  const flow = COMPANY_UNLOCK_FLOW.map((entry, index) => {
    const unlocked = isCompanyUnlockEntryUnlocked(profile, entry)
    const previousEntries = COMPANY_UNLOCK_FLOW.slice(0, index)
    const previousUnlocked = previousEntries.every((prev) =>
      isCompanyUnlockEntryUnlocked(profile, prev),
    )
    const cost = weeklyEventCostValue(
      Math.max(1, asInt(entry.cost, 0)),
      timestamp,
      weeklyEvents,
      { minPositive: 1 },
    )
    const requiredCompanyLevel = Math.max(
      COMPANY_LEVEL_MIN,
      asInt(entry.requiredCompanyLevel, index + 1),
    )
    const missingCash = Math.max(0, cost - wallet)
    const missingCompanyLevel = Math.max(0, requiredCompanyLevel - companyLevel)
    let lockReason = 'Açılmaya hazır.'
    if (unlocked) {
      lockReason = 'Açık'
    } else if (!previousUnlocked) {
      const previousLocked = previousEntries.find((prev) =>
        !isCompanyUnlockEntryUnlocked(profile, prev),
      )
      lockReason = previousLocked ? `Önce ${previousLocked.name} açılmalı.` : 'Sıralama kilidi.'
    } else if (missingCompanyLevel > 0) {
      lockReason = `İşletme seviyesi yetersiz. Gereken seviye: ${requiredCompanyLevel}.`
    } else if (missingCash > 0) {
      lockReason = `Nakit yetersiz. Gereken tutar: ${cost}.`
    }
    return {
      key: entry.key,
      kind: entry.kind,
      templateId: entry.templateId || '',
      name: entry.name,
      cost,
      requiredLevel: 1,
      requiredCompanyLevel,
      unlocked,
      previousUnlocked,
      missingCash,
      missingLevel: 0,
      missingCompanyLevel,
      canUnlockNow:
        !unlocked &&
        previousUnlocked &&
        missingCompanyLevel <= 0 &&
        missingCash <= 0,
      lockReason,
    }
  })
  const nextFlowEntry = flow.find((entry) => !entry.unlocked) || null
  const nextLevel = Math.min(COMPANY_LEVEL_MAX, companyLevel + 1)
  const maxReached = companyLevel >= COMPANY_LEVEL_MAX
  const upgradeCost = maxReached
    ? 0
    : companyUpgradeCost(companyLevel, { timestamp, weeklyEvents })
  const missingUpgradeCash = maxReached ? 0 : Math.max(0, upgradeCost - wallet)
  return {
    unlockedFleetTemplates: FLEET_TEMPLATE_IDS.filter((templateId) => isFleetTemplateUnlocked(profile, templateId)),
    logisticsUnlocked: isLogisticsUnlocked(profile),
    flow,
    upgrade: {
      companyLevel,
      nextLevel,
      cost: upgradeCost,
      missingCash: missingUpgradeCash,
      canUpgradeNow: !maxReached && missingUpgradeCash <= 0,
      maxReached,
    },
    nextUnlock: nextUnlock && nextFlowEntry
      ? {
          key: nextFlowEntry.key,
          kind: nextFlowEntry.kind,
          name: nextFlowEntry.name,
          cost: nextFlowEntry.cost,
          requiredLevel: nextFlowEntry.requiredLevel,
          requiredCompanyLevel: nextFlowEntry.requiredCompanyLevel,
          missingCash: nextFlowEntry.missingCash,
          missingLevel: nextFlowEntry.missingLevel,
          missingCompanyLevel: nextFlowEntry.missingCompanyLevel,
          canUnlockNow: nextFlowEntry.canUnlockNow,
          lockReason: nextFlowEntry.lockReason,
        }
      : null,
    companyLevel,
  }
}

/** Tarım ürünleri ve su kaldırıldı; eski veriden temizlemek için atlanır. */
const DEPRECATED_ITEM_IDS = new Set(['fertilizer', 'grain', 'feed', 'water-right'])

function normalizeInventoryEntries(entries) {
  const totals = new Map()
  const list = Array.isArray(entries) ? entries : []

  for (const entry of list) {
    const itemId = normalizeItemId(entry?.itemId)
    if (DEPRECATED_ITEM_IDS.has(itemId)) continue
    if (!ITEM_BY_ID.has(itemId)) continue
    const quantity = Math.max(0, asInt(entry?.quantity, 0))
    if (quantity <= 0) continue
    totals.set(itemId, (totals.get(itemId) || 0) + quantity)
  }

  return [...totals.entries()].map(([itemId, quantity]) => ({ itemId, quantity }))
}

function normalizeAvatarUrl(rawValue) {
  const safeValue = String(rawValue || '').trim()
  if (!safeValue) return ''
  if (safeValue.length > AVATAR_MAX_URL_LENGTH) return ''

  if (safeValue.startsWith('/')) {
    return safeValue
  }

  try {
    const parsed = new URL(safeValue)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return safeValue
  } catch {
    return ''
  }
}

function isUploadedAvatarUrl(rawValue) {
  const safeValue = String(rawValue || '').trim()
  return safeValue.startsWith(AVATAR_PUBLIC_PREFIX)
}

function avatarView(profile) {
  return {
    url: profile.avatarUrl || '',
    type: profile.avatarType || 'default',
  }
}

const TURKIYE_HOUR_MINUTE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  timeZone: WEEKLY_EVENT_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatHourMinuteTurkiye(value) {
  const date = new Date(value || '')
  if (Number.isNaN(date.getTime())) return '--:--'
  return TURKIYE_HOUR_MINUTE_FORMATTER.format(date)
}

function dayKeyFromIso(timestamp) {
  return String(timestamp || '').slice(0, 10)
}

const TURKIYE_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
const WEEKLY_EVENT_START_OFFSET_MS = ((23 * 60) + 59) * MS_MINUTE
const WEEKLY_EVENT_WINDOW_DURATION_MS = (2 * DAY_MS) + MS_MINUTE
const WEEKLY_EVENT_WEEK_MS = 7 * DAY_MS
const TURKIYE_DAY_LABELS = Object.freeze([
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
])
const WEEKLY_EVENT_SCHEDULE_DAYS = Object.freeze([1, 2, 3, 4, 5, 6, 0])

function turkiyeDayStartMs(timestamp) {
  return turkiyeWindowStartMs(timestamp, DAY_MS)
}

function turkiyeWindowStartMs(timestamp, windowMs = DAY_MS) {
  const nowMs = createdMs(timestamp) || Date.now()
  const safeWindowMs = Math.max(MS_HOUR, asInt(windowMs, DAY_MS))
  const shiftedMs = nowMs + TURKIYE_UTC_OFFSET_MS
  const shiftedWindowStartMs = Math.floor(shiftedMs / safeWindowMs) * safeWindowMs
  return shiftedWindowStartMs - TURKIYE_UTC_OFFSET_MS
}

function weeklyEventWindowState(dayIndex, dayStartMs, nowMs, rules = {}) {
  const startDayIndex = clamp(asInt(rules.startDayIndex, 0), 0, 6)
  const startOffsetMs = Math.max(0, asInt(rules.startOffsetMs, WEEKLY_EVENT_START_OFFSET_MS))
  const durationMs = Math.max(MS_MINUTE, asInt(rules.durationMs, WEEKLY_EVENT_WINDOW_DURATION_MS))

  const referenceStartMs = dayStartMs + ((startDayIndex - dayIndex) * DAY_MS) + startOffsetMs
  const candidates = [
    referenceStartMs - WEEKLY_EVENT_WEEK_MS,
    referenceStartMs,
    referenceStartMs + WEEKLY_EVENT_WEEK_MS,
  ]

  let activeStartMs = NaN
  for (const candidateStartMs of candidates) {
    if (nowMs >= candidateStartMs && nowMs < (candidateStartMs + durationMs)) {
      activeStartMs = candidateStartMs
      break
    }
  }

  if (!Number.isFinite(activeStartMs)) {
    return {
      active: false,
      startMs: 0,
      endExclusiveMs: 0,
      endsAt: '',
      remainingMs: 0,
    }
  }

  const endExclusiveMs = activeStartMs + durationMs
  return {
    active: true,
    startMs: activeStartMs,
    endExclusiveMs,
    endsAt: new Date(Math.max(0, endExclusiveMs - 1000)).toISOString(),
    remainingMs: Math.max(0, endExclusiveMs - nowMs),
  }
}

function weeklyEventState(timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  const dayStartMs = turkiyeDayStartMs(timestamp)
  const turkiyeNow = new Date(nowMs + TURKIYE_UTC_OFFSET_MS)
  const dayIndex = turkiyeNow.getUTCDay()
  const dayName = TURKIYE_DAY_LABELS[dayIndex] || ''

  const weekendXpWindow = weeklyEventWindowState(dayIndex, dayStartMs, nowMs, {
    startDayIndex: 5, // Cuma
    startOffsetMs: WEEKLY_EVENT_START_OFFSET_MS, // 23:59
    durationMs: WEEKLY_EVENT_WINDOW_DURATION_MS, // -> Pazar 23:59
  })
  const midweekDiscountWindow = weeklyEventWindowState(dayIndex, dayStartMs, nowMs, {
    startDayIndex: 1, // Pazartesi
    startOffsetMs: WEEKLY_EVENT_START_OFFSET_MS, // 23:59
    durationMs: WEEKLY_EVENT_WINDOW_DURATION_MS, // -> Çarşamba 23:59
  })

  const xpMultiplier = weekendXpWindow.active ? WEEKLY_EVENT_XP_MULTIPLIER : 1
  const costMultiplier = midweekDiscountWindow.active ? WEEKLY_EVENT_COST_MULTIPLIER : 1
  const activeEventIds = []
  if (weekendXpWindow.active) activeEventIds.push('weekend-xp')
  if (midweekDiscountWindow.active) activeEventIds.push('midweek-discount')

  const schedule = WEEKLY_EVENT_SCHEDULE_DAYS.map((scheduleDayIndex) => {
    const isXpDay = scheduleDayIndex === 6 || scheduleDayIndex === 0
    const isDiscountDay = scheduleDayIndex === 2 || scheduleDayIndex === 3
    const isToday = scheduleDayIndex === dayIndex
    const isActive = isToday && (
      (isXpDay && weekendXpWindow.active) ||
      (isDiscountDay && midweekDiscountWindow.active)
    )
    return {
      dayIndex: scheduleDayIndex,
      dayName: TURKIYE_DAY_LABELS[scheduleDayIndex] || '',
      eventType: isXpDay ? 'xp' : (isDiscountDay ? 'discount' : 'standard'),
      title: isXpDay
        ? 'Tahsilat XP Etkinliği'
        : (isDiscountDay ? 'Tahsilat Gider İndirimi' : 'Standart Gün'),
      description: isXpDay
        ? 'İşletme ve fabrika tahsilatlarında 2x XP kazanılır.'
        : (isDiscountDay ? 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.' : 'Ek haftalık bonus bulunmuyor.'),
      bonusLabel: isXpDay
        ? '2x XP'
        : (isDiscountDay ? '-%25 Gider' : 'Standart'),
      isToday,
      isActive,
    }
  })

  return {
    timezone: WEEKLY_EVENT_TIMEZONE,
    nowAt: new Date(nowMs).toISOString(),
    dayIndex,
    dayName,
    xpMultiplier,
    costMultiplier,
    costDiscountRate: WEEKLY_EVENT_COST_DISCOUNT_RATE,
    costDiscountPercent: Math.round(WEEKLY_EVENT_COST_DISCOUNT_RATE * 100),
    activeEventIds,
    weekendXp: {
      id: 'weekend-xp',
      title: 'Cumartesi-Pazar Tahsilat XP',
      description: 'İşletme ve fabrika tahsilatlarında 2x XP kazanılır.',
      active: weekendXpWindow.active,
      multiplier: WEEKLY_EVENT_XP_MULTIPLIER,
      startDay: 'Cuma 23:59',
      endDay: 'Pazar 23:59',
      endsAt: weekendXpWindow.endsAt,
      remainingMs: weekendXpWindow.remainingMs,
    },
    midweekDiscount: {
      id: 'midweek-discount',
      title: 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi',
      description: 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.',
      active: midweekDiscountWindow.active,
      discountRate: WEEKLY_EVENT_COST_DISCOUNT_RATE,
      discountPercent: Math.round(WEEKLY_EVENT_COST_DISCOUNT_RATE * 100),
      multiplier: WEEKLY_EVENT_COST_MULTIPLIER,
      startDay: 'Pazartesi 23:59',
      endDay: 'Çarşamba 23:59',
      endsAt: midweekDiscountWindow.endsAt,
      remainingMs: midweekDiscountWindow.remainingMs,
    },
    schedule,
  }
}

function weeklyEventCostValue(amount, timestamp, weeklyEvents = null, options = {}) {
  const baseAmount = Math.max(0, asInt(amount, 0))
  if (baseAmount <= 0) return 0
  const applyDiscount = options?.applyDiscount === true
  if (!applyDiscount) return baseAmount
  const resolvedEvents = weeklyEvents && typeof weeklyEvents === 'object'
    ? weeklyEvents
    : (timestamp ? weeklyEventState(timestamp) : null)
  if (!resolvedEvents) return baseAmount
  const multiplier = clamp(Number(resolvedEvents.costMultiplier || 1), 0.01, 1)
  if (multiplier >= 0.999) return baseAmount
  const minPositive = Math.max(1, asInt(options?.minPositive, 1))
  return Math.max(minPositive, Math.round(baseAmount * multiplier))
}

function weeklyEventCostMap(costByItem, timestamp, weeklyEvents = null) {
  const nextCost = {}
  for (const [itemId, amount] of Object.entries(costByItem || {})) {
    const safeAmount = Math.max(0, asInt(amount, 0))
    if (safeAmount <= 0) continue
    const discounted = weeklyEventCostValue(safeAmount, timestamp, weeklyEvents, { minPositive: 1 })
    if (discounted <= 0) continue
    nextCost[itemId] = discounted
  }
  return nextCost
}

function weeklyEventXpGain(xpAmount, timestamp, weeklyEvents = null) {
  const baseXp = Math.max(0, asInt(xpAmount, 0))
  if (baseXp <= 0) return 0
  const resolvedEvents = weeklyEvents && typeof weeklyEvents === 'object'
    ? weeklyEvents
    : (timestamp ? weeklyEventState(timestamp) : null)
  if (!resolvedEvents) return baseXp
  const multiplier = clamp(Number(resolvedEvents.xpMultiplier || 1), 1, WEEKLY_EVENT_XP_MULTIPLIER)
  return Math.max(0, Math.floor(baseXp * multiplier))
}

function dailyStoreDayKeyFromIso(timestamp) {
  const windowStartMs = turkiyeWindowStartMs(timestamp, DAILY_STORE_RESET_INTERVAL_MS)
  const trDate = new Date(windowStartMs + TURKIYE_UTC_OFFSET_MS)
  const yyyy = trDate.getUTCFullYear()
  const mm = String(trDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(trDate.getUTCDate()).padStart(2, '0')
  const hh = String(trDate.getUTCHours()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}-${hh}`
}

function dailyStoreResetInfoFromIso(timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  const nextResetMs = turkiyeWindowStartMs(timestamp, DAILY_STORE_RESET_INTERVAL_MS) + DAILY_STORE_RESET_INTERVAL_MS
  return {
    nextResetAt: new Date(nextResetMs).toISOString(),
    remainingMs: Math.max(0, nextResetMs - nowMs),
  }
}

const LIMITED_OFFER_WEEK_BASE_START_MS = Date.UTC(2026, 0, 5, 0, 0, 0, 0) - TURKIYE_UTC_OFFSET_MS

function limitedOfferWeekStartMs(timestamp) {
  const dayStartMs = turkiyeDayStartMs(timestamp)
  const trDate = new Date(dayStartMs + TURKIYE_UTC_OFFSET_MS)
  const trDay = trDate.getUTCDay() || 7
  const mondayOffsetDays = trDay - 1
  return dayStartMs - (mondayOffsetDays * DAY_MS)
}

function limitedOfferDayKeyFromIso(timestamp) {
  const weekStartMs = limitedOfferWeekStartMs(timestamp)
  const trDate = new Date(weekStartMs + TURKIYE_UTC_OFFSET_MS)
  const yyyy = trDate.getUTCFullYear()
  const mm = String(trDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(trDate.getUTCDate()).padStart(2, '0')
  return `${yyyy}-W${mm}${dd}`
}

function limitedOfferResetInfoFromIso(timestamp) {
  const nowMs = createdMs(timestamp) || Date.now()
  const nextResetMs = limitedOfferWeekStartMs(timestamp) + LIMITED_OFFER_RESET_INTERVAL_MS
  return {
    nextResetAt: new Date(nextResetMs).toISOString(),
    remainingMs: Math.max(0, nextResetMs - nowMs),
  }
}

function limitedOfferMultiplier(timestamp) {
  const weekStartMs = limitedOfferWeekStartMs(timestamp)
  const elapsedWeeks = Math.max(
    0,
    Math.floor((weekStartMs - LIMITED_OFFER_WEEK_BASE_START_MS) / LIMITED_OFFER_RESET_INTERVAL_MS),
  )
  return Math.max(1, Math.pow(2, elapsedWeeks))
}

function dailyStoreMaterialItemIds(db) {
  const list = Array.isArray(db?.marketState?.items) ? db.marketState.items : []
  const ids = new Set()
  for (const entry of list) {
    const itemId = normalizeItemId(entry?.id)
    if (!itemId || !ITEM_BY_ID.has(itemId)) continue
    ids.add(itemId)
  }
  if (ids.size === 0) {
    for (const fallbackId of ['brick', 'timber', 'cement', 'energy', 'spare-parts', 'engine-kit', 'oil']) {
      if (ITEM_BY_ID.has(fallbackId)) ids.add(fallbackId)
    }
  }
  return Array.from(ids)
}

function dailyStoreOfferSnapshot(db, offer, timestamp) {
  const safeOffer = offer && typeof offer === 'object' ? offer : null
  if (!safeOffer) return null
  const multiplier = limitedOfferMultiplier(timestamp)
  const safePrice = Math.max(0, asInt(safeOffer.price, 0))
  const baseCash = Math.max(0, asInt(safeOffer?.rewards?.cash, 0))
  const scaledCash = Math.max(0, Math.floor(baseCash * multiplier))

  if (safeOffer.id === 'daily-materials-pack') {
    const itemIds = dailyStoreMaterialItemIds(db)
    const eachQuantity = Math.max(1, Math.floor(2000 * multiplier))
    const items = Object.fromEntries(itemIds.map((itemId) => [itemId, eachQuantity]))
    const names = itemIds.map((itemId) => ITEM_BY_ID.get(itemId)?.name || itemId)
    const listedNames = names.slice(0, 8).join(', ')
    const extraCount = Math.max(0, names.length - 8)
    const nameText = extraCount > 0 ? `${listedNames} ve +${extraCount} kaynak` : listedNames
    return {
      id: safeOffer.id,
      title: safeOffer.title,
      description: `Pazardaki tüm kaynaklar depoya eklenir (${eachQuantity} adet): ${nameText}.`,
      price: safePrice,
      weekMultiplier: multiplier,
      rewards: {
        cash: 0,
        items,
      },
    }
  }

  const description = safeOffer.id === 'daily-cash-1m'
    ? `${new Intl.NumberFormat('tr-TR').format(scaledCash)} nakit anında kasana eklenir.`
    : String(safeOffer.description || '').trim()

  return {
    id: safeOffer.id,
    title: safeOffer.title,
    description,
    price: safePrice,
    weekMultiplier: multiplier,
    rewards: {
      cash: scaledCash,
      items: safeOffer?.rewards?.items && typeof safeOffer.rewards.items === 'object'
        ? Object.fromEntries(
          Object.entries(safeOffer.rewards.items)
            .map(([itemId, amount]) => [
              normalizeItemId(itemId),
              Math.max(0, Math.floor(asInt(amount, 0) * multiplier)),
            ])
            .filter(([itemId, quantity]) => itemId && quantity > 0 && ITEM_BY_ID.has(itemId)),
        )
        : {},
    },
  }
}

function turkiyeDayKeyFromDayStartMs(dayStartMs) {
  const safeMs = Math.max(0, asInt(dayStartMs, 0))
  const trDate = new Date(safeMs + TURKIYE_UTC_OFFSET_MS)
  const yyyy = trDate.getUTCFullYear()
  const mm = String(trDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(trDate.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function turkiyeDayStartMsFromDayKey(dayKey) {
  const safeKey = String(dayKey || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(safeKey)
  if (!match) return 0
  const year = asInt(match[1], 0)
  const month = asInt(match[2], 0)
  const day = asInt(match[3], 0)
  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) return 0
  const dayStartMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - TURKIYE_UTC_OFFSET_MS
  if (turkiyeDayKeyFromDayStartMs(dayStartMs) !== safeKey) return 0
  return dayStartMs
}

function normalizeDailyLoginState(profile) {
  if (!profile || typeof profile !== 'object') return
  if (!profile.dailyLogin || typeof profile.dailyLogin !== 'object') {
    profile.dailyLogin = {
      streakCount: 0,
      lastClaimDayKey: '',
      lastClaimDayStartMs: 0,
      lastClaimDayIndex: -1,
      lastClaimAt: '',
    }
    return
  }
  const state = profile.dailyLogin
  state.streakCount = clamp(asInt(state.streakCount, 0), 0, DAILY_LOGIN_TOTAL_DAYS)
  state.lastClaimDayKey = String(state.lastClaimDayKey || '').trim()
  state.lastClaimDayStartMs = Math.max(0, asInt(state.lastClaimDayStartMs, 0))
  if (!state.lastClaimDayStartMs && state.lastClaimDayKey) {
    state.lastClaimDayStartMs = turkiyeDayStartMsFromDayKey(state.lastClaimDayKey)
  }
  if (state.lastClaimDayStartMs > 0) {
    state.lastClaimDayKey = turkiyeDayKeyFromDayStartMs(state.lastClaimDayStartMs)
  } else {
    state.lastClaimDayKey = ''
    state.streakCount = 0
  }
  state.lastClaimDayIndex = clamp(asInt(state.lastClaimDayIndex, -1), -1, DAILY_LOGIN_TOTAL_DAYS - 1)
  state.lastClaimAt = typeof state.lastClaimAt === 'string' ? state.lastClaimAt : ''
  if (!state.lastClaimDayKey) {
    state.lastClaimAt = ''
    state.lastClaimDayIndex = -1
  }
}

function dailyLoginProgressMultiplier(profile) {
  const level = Math.max(1, asInt(levelInfoFromXp(profile?.xpTotal)?.level, 1))
  const companyLevel = clamp(
    asInt(profile?.companyLevel, COMPANY_LEVEL_MIN),
    COMPANY_LEVEL_MIN,
    COMPANY_LEVEL_MAX,
  )
  const levelBonus = clamp((level - 1) / 1800, 0, 0.30)
  const companyBonus = Math.max(0, companyLevel - COMPANY_LEVEL_MIN) * 0.05
  return clamp(1 + levelBonus + companyBonus, 1, 1.45)
}

function scaleDailyLoginItems(rawItems, multiplier = 1) {
  const output = {}
  const safeMultiplier = Math.max(1, Number(multiplier) || 1)
  if (!rawItems || typeof rawItems !== 'object') return output
  for (const [itemIdRaw, quantityRaw] of Object.entries(rawItems)) {
    const itemId = String(itemIdRaw || '').trim()
    const baseQuantity = Math.max(0, asInt(quantityRaw, 0))
    if (!itemId || baseQuantity <= 0) continue
    output[itemId] = Math.max(1, Math.floor(baseQuantity * safeMultiplier))
  }
  return output
}

function dailyLoginRewardByDay(profile, day) {
  const safeDay = clamp(asInt(day, 1), 1, DAILY_LOGIN_TOTAL_DAYS)
  const baseReward =
    DAILY_LOGIN_REWARD_BY_DAY.get(safeDay) ||
    DAILY_LOGIN_REWARD_TABLE[safeDay - 1] ||
    DAILY_LOGIN_REWARD_TABLE[0]
  const progressMultiplier = dailyLoginProgressMultiplier(profile)
  const baseCash = Math.max(0, asInt(baseReward?.cash, 0))
  const cash = Math.max(0, Math.floor(baseCash * progressMultiplier))
  const items = scaleDailyLoginItems(baseReward?.items, progressMultiplier)
  return {
    day: safeDay,
    cash,
    items,
    progressMultiplier,
  }
}

function dailyLoginSync(profile, timestamp) {
  normalizeDailyLoginState(profile)
  const state = profile.dailyLogin
  const safeTimestamp = timestamp || nowIso()
  const nowMs = createdMs(safeTimestamp) || Date.now()
  const todayDayStartMs = turkiyeDayStartMs(safeTimestamp)
  const todayKey = turkiyeDayKeyFromDayStartMs(todayDayStartMs)

  const lastClaimDayStartMs = Math.max(0, asInt(state.lastClaimDayStartMs, 0))
  const dayDiff = lastClaimDayStartMs > 0
    ? Math.floor((todayDayStartMs - lastClaimDayStartMs) / DAY_MS)
    : -1

  let streakCount = clamp(asInt(state.streakCount, 0), 0, DAILY_LOGIN_TOTAL_DAYS)
  if (lastClaimDayStartMs <= 0) {
    streakCount = 0
  } else if (dayDiff === 1) {
    if (streakCount >= DAILY_LOGIN_TOTAL_DAYS) {
      streakCount = 0
    }
  } else if (dayDiff > 1) {
    streakCount = 0
  }
  if (streakCount !== state.streakCount) {
    state.streakCount = streakCount
  }

  const claimedToday = lastClaimDayStartMs > 0 && lastClaimDayStartMs === todayDayStartMs
  const rawLastIndex = clamp(asInt(state.lastClaimDayIndex, -1), -1, DAILY_LOGIN_TOTAL_DAYS - 1)
  const lastClaimDayIndex = claimedToday
    ? Math.max(0, rawLastIndex)
    : rawLastIndex

  let nextDayIndex = 0
  if (claimedToday) {
    nextDayIndex = lastClaimDayIndex >= DAILY_LOGIN_TOTAL_DAYS - 1 ? 0 : (lastClaimDayIndex + 1)
  } else if (dayDiff === 1 && streakCount > 0 && streakCount < DAILY_LOGIN_TOTAL_DAYS) {
    nextDayIndex = streakCount
  }

  const currentSeries = claimedToday
    ? clamp(Math.max(streakCount, lastClaimDayIndex + 1), 1, DAILY_LOGIN_TOTAL_DAYS)
    : streakCount

  const nextResetMs = todayDayStartMs + DAY_MS
  return {
    nowMs,
    todayKey,
    todayDayStartMs,
    claimedToday,
    canClaim: !claimedToday,
    dayDiff,
    streakCount,
    currentSeries,
    nextDayIndex,
    lastClaimDayIndex,
    lastClaimDayKey: state.lastClaimDayKey,
    lastClaimAt: state.lastClaimAt,
    nextResetMs,
    nextResetAt: new Date(nextResetMs).toISOString(),
    remainingMs: Math.max(0, nextResetMs - nowMs),
  }
}

function dailyLoginDayStatus(dayIndex, snapshot) {
  const safeIndex = clamp(asInt(dayIndex, 0), 0, DAILY_LOGIN_TOTAL_DAYS - 1)
  if (snapshot.claimedToday) {
    if (safeIndex < snapshot.lastClaimDayIndex) return 'claimed'
    if (safeIndex === snapshot.lastClaimDayIndex) return 'today-claimed'
    return 'locked'
  }
  if (safeIndex < snapshot.currentSeries) return 'claimed'
  if (safeIndex === snapshot.nextDayIndex) return 'available'
  return 'locked'
}

function dailyLoginView(profile, timestamp) {
  const snapshot = dailyLoginSync(profile, timestamp)
  const dayRows = DAILY_LOGIN_REWARD_TABLE.map((entry) => {
    const safeDay = clamp(asInt(entry?.day, 1), 1, DAILY_LOGIN_TOTAL_DAYS)
    const reward = dailyLoginRewardByDay(profile, safeDay)
    return {
      day: safeDay,
      status: dailyLoginDayStatus(safeDay - 1, snapshot),
      isBonus: safeDay === DAILY_LOGIN_TOTAL_DAYS,
      reward: {
        cash: reward.cash,
        items: reward.items,
      },
    }
  })
  const nextClaimDay = snapshot.nextDayIndex + 1
  const nextReward = dailyLoginRewardByDay(profile, nextClaimDay)
  return {
    totalDays: DAILY_LOGIN_TOTAL_DAYS,
    todayKey: snapshot.todayKey,
    claimedToday: snapshot.claimedToday,
    canClaim: snapshot.canClaim,
    nextClaimDay,
    nextResetAt: snapshot.nextResetAt,
    remainingMs: snapshot.remainingMs,
    series: {
      current: snapshot.currentSeries,
      total: DAILY_LOGIN_TOTAL_DAYS,
      label: `${snapshot.currentSeries}/${DAILY_LOGIN_TOTAL_DAYS}`,
    },
    days: dayRows,
    nextReward: {
      day: nextClaimDay,
      cash: nextReward.cash,
      items: nextReward.items,
    },
    lastClaim: snapshot.lastClaimDayIndex >= 0
      ? {
          day: snapshot.lastClaimDayIndex + 1,
          dayKey: snapshot.lastClaimDayKey,
          claimedAt: snapshot.lastClaimAt,
        }
      : null,
  }
}

function weekKeyFromIso(timestamp) {
  const date = new Date(timestamp)
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function seasonKeyFromIso(timestamp) {
  // Monthly season reset (Turkey time). Season key changes at 00:00 TR on the 1st day.
  // We reuse the existing Turkey day-start logic to avoid timezone drift.
  const monthStartMsTr = (() => {
    const dayStartMs = turkiyeDayStartMs(timestamp)
    const trDate = new Date(dayStartMs + TURKIYE_UTC_OFFSET_MS)
    const y = trDate.getUTCFullYear()
    const m = trDate.getUTCMonth()
    const monthStartTrUtcMs = Date.UTC(y, m, 1, 0, 0, 0, 0)
    return monthStartTrUtcMs - TURKIYE_UTC_OFFSET_MS
  })()
  const monthStartTrDate = new Date(monthStartMsTr + TURKIYE_UTC_OFFSET_MS)
  const yyyy = monthStartTrDate.getUTCFullYear()
  const mm = String(monthStartTrDate.getUTCMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function normalizeSeasonKey(value) {
  const safeValue = String(value || '').trim()
  if (!/^\d{4}-\d{2}$/.test(safeValue)) return ''
  const [, monthPart] = safeValue.split('-')
  const month = Number(monthPart)
  if (!Number.isFinite(month) || month < 1 || month > 12) return ''
  return safeValue
}

function shiftSeasonKey(seasonKey, deltaMonths = 0) {
  const safeKey = normalizeSeasonKey(seasonKey)
  if (!safeKey) return ''
  const [yearPart, monthPart] = safeKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return ''
  const baseDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  baseDate.setUTCMonth(baseDate.getUTCMonth() + Math.trunc(Number(deltaMonths) || 0))
  const nextYear = baseDate.getUTCFullYear()
  const nextMonth = String(baseDate.getUTCMonth() + 1).padStart(2, '0')
  return `${nextYear}-${nextMonth}`
}

function seasonKeyOrderValue(seasonKey) {
  const safeKey = normalizeSeasonKey(seasonKey)
  if (!safeKey) return 0
  const [yearPart, monthPart] = safeKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 0
  return (year * 12) + Math.max(1, Math.min(12, month))
}

function leagueSeasonRewardMultiplier(seasonKey) {
  const currentSeasonKey = normalizeSeasonKey(seasonKey) || seasonKeyFromIso(nowIso())
  const baseSeasonKey = normalizeSeasonKey(LEAGUE_SEASON_REWARD_MULTIPLIER_BASE_SEASON_KEY) || currentSeasonKey
  const seasonDelta = Math.max(0, seasonKeyOrderValue(currentSeasonKey) - seasonKeyOrderValue(baseSeasonKey))
  const rawMultiplier = 1 + (seasonDelta * Math.max(0, Number(LEAGUE_SEASON_REWARD_MULTIPLIER_STEP) || 0))
  return clamp(
    Math.max(1, Math.round(rawMultiplier)),
    1,
    Math.max(1, asInt(LEAGUE_SEASON_REWARD_MULTIPLIER_MAX, 1)),
  )
}

function applySeasonRewardMultiplierToConfig(config, seasonKey) {
  const rewardMultiplier = leagueSeasonRewardMultiplier(seasonKey)
  const baseCashAmount = Math.max(1, asInt(config?.cashAmount, 0))
  const baseResourceAmount = Math.max(1, asInt(config?.resourceAmount, 0))
  return {
    ...config,
    rewardMultiplier,
    rewardMultiplierMax: Math.max(1, asInt(LEAGUE_SEASON_REWARD_MULTIPLIER_MAX, 1)),
    cashAmount: Math.max(1, Math.round(baseCashAmount * rewardMultiplier)),
    resourceAmount: Math.max(1, Math.round(baseResourceAmount * rewardMultiplier)),
  }
}

function nowIso() {
  return new Date().toISOString()
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function asInt(value, fallback = 0) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.trunc(next)
}

function xpRequiredForLevelFormula(level) {
  const safeLevel = Math.max(1, asInt(level, 1))
  const l = BigInt(safeLevel)
  return (XP_COEFFICIENT_L2 * l * l) + (XP_COEFFICIENT_L1 * l) + XP_COEFFICIENT_C0
}

function cumulativeXpRequiredToReachLevel(level) {
  const safeLevel = Math.max(1, asInt(level, 1))
  const n = BigInt(Math.max(0, safeLevel - 1))
  const sumLinear = (n * (n + 1n)) / 2n
  const sumSquares = (n * (n + 1n) * ((2n * n) + 1n)) / 6n
  const total = (XP_COEFFICIENT_L2 * sumSquares) + (XP_COEFFICIENT_L1 * sumLinear) + (XP_COEFFICIENT_C0 * n)
  return total < 0n ? 0n : total
}

function toBigInt(value, fallback = 0n) {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback
    return BigInt(Math.trunc(value))
  }
  const raw = String(value ?? '').trim()
  if (!raw) return fallback
  if (/^[+-]?\d+$/.test(raw)) {
    try {
      return BigInt(raw)
    } catch {
      return fallback
    }
  }
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) return fallback
  return BigInt(Math.trunc(numeric))
}

function normalizeXpTotal(value) {
  const parsed = toBigInt(value, 0n)
  if (parsed < 0n) return 0n
  if (parsed > PLAYER_XP_TOTAL_CAP) return PLAYER_XP_TOTAL_CAP
  return parsed
}

function xpTotalToString(value) {
  return normalizeXpTotal(value).toString()
}

function addProfileXp(profile, amount) {
  const gain = BigInt(Math.max(0, asInt(amount, 0)))
  const current = normalizeXpTotal(profile?.xpTotal)
  const total = normalizeXpTotal(current + gain)
  profile.xpTotal = total.toString()
  return total
}

function normalizeLookup(value) {
  return String(value || '').trim().toLowerCase()
}

function userRoleValue(user) {
  return normalizeUserRole(user?.role, USER_ROLES.PLAYER)
}

function userRoleLabel(role) {
  const safeRole = normalizeUserRole(role, USER_ROLES.PLAYER)
  if (safeRole === USER_ROLES.ADMIN) return 'Admin'
  if (safeRole === USER_ROLES.MODERATOR) return 'Moderator'
  return 'Oyuncu'
}

function normalizedNotificationType(value) {
  return normalizeLookup(value).replace(/[\s_-]+/g, '')
}

function isAlertType(type) {
  return ALERT_TYPE_SET.has(normalizedNotificationType(type))
}

function pruneAlertEntries(entries, isAlertEntry) {
  const list = Array.isArray(entries) ? entries : []
  if (list.length === 0) return []

  const predicate = typeof isAlertEntry === 'function' ? isAlertEntry : () => false
  const alertEntries = list.filter((entry) => entry && predicate(entry))
  if (alertEntries.length < ALERT_HISTORY_TRIGGER) return list

  const keepAlertIds = new Set(
    alertEntries
      .slice(0, ALERT_HISTORY_KEEP)
      .map((entry) => String(entry?.id || '').trim())
      .filter(Boolean),
  )

  return list.filter((entry) => {
    if (!entry || !predicate(entry)) return true
    return keepAlertIds.has(String(entry.id || '').trim())
  })
}

function normalizeProfileNotificationEntry(entry, timestamp) {
  if (!entry || typeof entry !== 'object') return null
  const message = String(entry.message || '').trim()
  if (!message) return null

  return {
    id: String(entry.id || crypto.randomUUID()),
    type: String(entry.type || 'info').trim() || 'info',
    message,
    read: entry.read === true,
    createdAt: String(entry.createdAt || timestamp),
  }
}

function normalizePushInboxEntry(entry, timestamp) {
  if (!entry || typeof entry !== 'object') return null
  const type = String(entry.type || '').trim()
  const title = String(entry.title || 'Bildirim').trim() || 'Bildirim'
  const message = String(entry.message || '').trim()
  if (!type || !message) return null

  return {
    id: String(entry.id || crypto.randomUUID()),
    type,
    title,
    message,
    read: entry.read === true,
    createdAt: String(entry.createdAt || timestamp),
    meta: entry.meta && typeof entry.meta === 'object' ? entry.meta : {},
  }
}

function xpRequiredForLevel(level) {
  const safeLevel = clamp(asInt(level, 1), 1, PLAYER_LEVEL_CAP)
  return xpRequiredForLevelFormula(safeLevel)
}

function levelInfoFromXp(xpTotal) {
  const safeXp = normalizeXpTotal(xpTotal)
  let level = 1
  let carriedXp = safeXp

  while (carriedXp > 0n && level < PLAYER_LEVEL_CAP) {
    const required = xpRequiredForLevel(level)
    if (carriedXp < required) break
    carriedXp -= required
    level += 1
  }

  const capped = level >= PLAYER_LEVEL_CAP
  const nextLevelXp = capped ? PLAYER_MAX_LEVEL_XP_COST : xpRequiredForLevel(level)
  const currentXp = capped
    ? nextLevelXp
    : carriedXp < 0n
      ? 0n
      : carriedXp > nextLevelXp
        ? nextLevelXp
        : carriedXp
  let progressPercent = 0
  if (capped) {
    progressPercent = 100
  } else if (nextLevelXp > 0n) {
    const ratioScaled = ((currentXp * 10000n) + (nextLevelXp / 2n)) / nextLevelXp
    progressPercent = clamp(Number(ratioScaled) / 100, 0, 100)
  }

  return {
    level,
    xpTotal: safeXp.toString(),
    currentXp: currentXp.toString(),
    nextLevelXp: nextLevelXp.toString(),
    progressPercent,
    isMaxLevel: capped,
  }
}

function calculateMarketPrice(itemDef, stock) {
  const scarcity = (itemDef.targetStock - stock) / itemDef.targetStock
  const rawPrice = itemDef.basePrice * (1 + scarcity * itemDef.volatility)
  return clamp(Math.round(rawPrice), itemDef.minPrice, itemDef.maxPrice)
}

function createInitialMarketState(timestamp) {
  return {
    lastUpdatedAt: timestamp,
    items: ITEM_CATALOG.map((item) => ({
      id: item.id,
      stock: item.targetStock,
      price: item.basePrice,
      lastPrice: item.basePrice,
      updatedAt: timestamp,
    })),
  }
}

function normalizeMarketState(marketState, timestamp) {
  const byId = new Map()
  const sourceItems = Array.isArray(marketState?.items) ? marketState.items : []

  for (const entry of sourceItems) {
    const itemId = normalizeItemId(entry?.id)
    if (!ITEM_BY_ID.has(itemId) || byId.has(itemId)) continue
    byId.set(itemId, entry)
  }

  const items = ITEM_CATALOG.map((itemDef) => {
    const source = byId.get(itemDef.id)
    const stock = clamp(
      asInt(source?.stock, itemDef.targetStock),
      itemDef.minStock,
      itemDef.maxStock,
    )
    const price = clamp(
      asInt(source?.price, calculateMarketPrice(itemDef, stock)),
      itemDef.minPrice,
      itemDef.maxPrice,
    )
    const lastPrice = clamp(
      asInt(source?.lastPrice, price),
      itemDef.minPrice,
      itemDef.maxPrice,
    )

    return {
      id: itemDef.id,
      stock,
      price,
      lastPrice,
      updatedAt: typeof source?.updatedAt === 'string' ? source.updatedAt : timestamp,
    }
  })

  return {
    lastUpdatedAt:
      typeof marketState?.lastUpdatedAt === 'string' ? marketState.lastUpdatedAt : timestamp,
    items,
  }
}

function randomTriangularUnit() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
}

function roundTo(value, digits = 4) {
  const safeDigits = clamp(asInt(digits, 4), 0, 10)
  const factor = Math.pow(10, safeDigits)
  const safeValue = Number(value)
  if (!Number.isFinite(safeValue)) return 0
  return Math.round(safeValue * factor) / factor
}

function randomBetween(min, max) {
  const safeMin = Number(min)
  const safeMax = Number(max)
  if (!Number.isFinite(safeMin) && !Number.isFinite(safeMax)) return 0
  if (!Number.isFinite(safeMin)) return safeMax
  if (!Number.isFinite(safeMax)) return safeMin
  if (safeMax <= safeMin) return safeMin
  return safeMin + ((safeMax - safeMin) * Math.random())
}

function randomIntBetween(min, max) {
  const safeMin = asInt(min, 0)
  const safeMax = asInt(max, safeMin)
  if (safeMax <= safeMin) return safeMin
  return Math.floor(randomBetween(safeMin, safeMax + 1))
}

function forexPatternPhaseForPair(pair) {
  const currentIndex = clamp(asInt(pair?.patternPhaseIndex, 0), 0, FOREX_PATTERN_PHASE_COUNT - 1)
  let phaseIndex = currentIndex
  let remaining = clamp(asInt(pair?.patternPhaseRemaining, 0), 0, 72)

  if (remaining <= 0) {
    phaseIndex = (currentIndex + 1) % FOREX_PATTERN_PHASE_COUNT
    const phaseDef = FOREX_PATTERN_PHASES[phaseIndex] || FOREX_PATTERN_PHASES[0]
    remaining = Math.max(1, randomIntBetween(phaseDef.minSteps, phaseDef.maxSteps))
  }

  pair.patternPhaseIndex = phaseIndex
  pair.patternPhaseRemaining = remaining
  return FOREX_PATTERN_PHASES[phaseIndex] || FOREX_PATTERN_PHASES[0]
}

function createSeededForexHistory(baseRate, timestamp) {
  const safeBaseRate = Math.max(0.0001, Number(baseRate) || 0.0001)
  const pointCount = Math.max(6, asInt(FOREX_CHART_SEED_POINTS, 18))
  const endMs = Math.max(0, createdMs(timestamp) || Date.now())
  const stepMs = Math.max(1000, asInt(FOREX_UPDATE_INTERVAL_MS, 5000))
  const startMs = Math.max(0, endMs - ((pointCount - 1) * stepMs))
  const list = []

  for (let index = 0; index < pointCount; index += 1) {
    const progress = pointCount <= 1 ? 1 : (index / (pointCount - 1))
    const wave = (Math.sin(progress * Math.PI * 1.75) * 0.0024) + (Math.cos(progress * Math.PI * 3.1) * 0.0012)
    const drift = (progress - 0.5) * 0.002
    const rate = roundTo(Math.max(0.0001, safeBaseRate * (1 + wave + drift)), 4)
    const volume = roundTo(Math.max(1, Math.abs(wave * safeBaseRate * 850) + (Math.random() * 18)), 2)
    list.push({
      at: new Date(startMs + (index * stepMs)).toISOString(),
      rate,
      volume,
    })
  }

  return list
}

function normalizeForexHistory(
  history,
  fallbackRate,
  timestamp,
  minRate = 0.0001,
  maxRate = Number.POSITIVE_INFINITY,
) {
  const cutoffMs = createdMs(timestamp) - FOREX_HISTORY_WINDOW_MS
  const list = Array.isArray(history) ? history : []
  const safeMinRate = Math.max(0.0001, Number(minRate) || 0.0001)
  const safeMaxRate = Math.max(safeMinRate, Number(maxRate) || safeMinRate)
  const normalized = list
    .map((entry) => {
      const at = typeof entry?.at === 'string' ? entry.at : ''
      const rate = Number(entry?.rate)
      if (!at || !Number.isFinite(rate) || rate <= 0) return null
      const rawVolume = Number(entry?.volume)
      const volume = Number.isFinite(rawVolume) && rawVolume > 0
        ? roundTo(rawVolume, 2)
        : roundTo(Math.max(1, Math.abs(rate) * 0.4), 2)
      return { at, rate: clamp(roundTo(rate, 4), safeMinRate, safeMaxRate), volume }
    })
    .filter(Boolean)
    .sort((a, b) => createdMs(a.at) - createdMs(b.at))
    .filter((entry) => createdMs(entry.at) >= cutoffMs)
    .slice(-FOREX_HISTORY_KEEP)

  if (normalized.length > 0) return normalized
  return createSeededForexHistory(fallbackRate, timestamp)
}

function createInitialForexState(timestamp) {
  const stepMs = Math.max(1000, asInt(FOREX_UPDATE_INTERVAL_MS, 5000))
  const rawMs = createdMs(timestamp) || Date.now()
  const alignedMs = Math.floor(Math.max(0, rawMs) / stepMs) * stepMs
  const alignedTimestamp = new Date(alignedMs).toISOString()
  return {
    lastUpdatedAt: alignedTimestamp,
    sentiment: 0,
    turbulence: 1,
    event: {
      title: '',
      direction: 0,
      strength: 0,
      endsAt: '',
    },
    pairs: FOREX_CATALOG.map((def) => {
      const seededHistory = createSeededForexHistory(def.baseRate, alignedTimestamp)
      const latestRate = seededHistory[seededHistory.length - 1]?.rate ?? roundTo(def.baseRate, 4)
      const previousRate = seededHistory[seededHistory.length - 2]?.rate ?? latestRate
      const initialPatternPhaseIndex = Math.floor(Math.random() * FOREX_PATTERN_PHASE_COUNT)
      const initialPatternPhase = FOREX_PATTERN_PHASES[initialPatternPhaseIndex] || FOREX_PATTERN_PHASES[0]
      const dayCutoffMs = createdMs(alignedTimestamp) - FOREX_DAY_WINDOW_MS
      const seededDayHistory = seededHistory.filter((entry) => createdMs(entry?.at || '') >= dayCutoffMs)
      const daySource = seededDayHistory.length > 0 ? seededDayHistory : seededHistory
      const openRate = daySource[0]?.rate ?? latestRate
      const dayHigh = daySource.reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.rate) || 0), latestRate)
      const dayLow = daySource.reduce((minValue, entry) => Math.min(minValue, Number(entry?.rate) || minValue), latestRate)
      return {
        id: def.id,
        rate: roundTo(latestRate, 4),
        lastRate: roundTo(previousRate, 4),
        openRate: roundTo(openRate, 4),
        dayHigh: roundTo(dayHigh, 4),
        dayLow: roundTo(dayLow, 4),
        trendBias: 0,
        volatilityPulse: 1,
        patternPhaseIndex: initialPatternPhaseIndex,
        patternPhaseRemaining: Math.max(1, randomIntBetween(initialPatternPhase.minSteps, initialPatternPhase.maxSteps)),
        patternMomentum: 0,
        spreadRate: FOREX_BASE_SPREAD_RATE,
        updatedAt: alignedTimestamp,
        history: seededHistory,
      }
    }),
  }
}

function normalizeForexState(forexState, timestamp) {
  const stepMs = Math.max(1000, asInt(FOREX_UPDATE_INTERVAL_MS, 5000))
  const rawNowMs = createdMs(timestamp) || Date.now()
  const alignedNowMs = Math.floor(Math.max(0, rawNowMs) / stepMs) * stepMs
  const alignedNowIso = new Date(alignedNowMs).toISOString()
  const byId = new Map()
  const sourcePairs = Array.isArray(forexState?.pairs) ? forexState.pairs : []
  for (const entry of sourcePairs) {
    const id = String(entry?.id || '').trim().toLowerCase()
    if (!id || !FOREX_BY_ID.has(id) || byId.has(id)) continue
    byId.set(id, entry)
  }

  const pairs = FOREX_CATALOG.map((def) => {
    const source = byId.get(def.id)
    const sourceRate = Number(source?.rate)
    const sourceLastRate = Number(source?.lastRate)
    const baseRate = Number.isFinite(sourceRate) ? sourceRate : def.baseRate
    const rate = clamp(roundTo(baseRate, 4), def.minRate, def.maxRate)
    const lastRate = clamp(
      roundTo(Number.isFinite(sourceLastRate) ? sourceLastRate : rate, 4),
      def.minRate,
      def.maxRate,
    )
    const history = normalizeForexHistory(source?.history, rate, timestamp, def.minRate, def.maxRate)
    const dayCutoffMs = createdMs(timestamp) - FOREX_DAY_WINDOW_MS
    const dayHistory = history.filter((entry) => createdMs(entry?.at || '') >= dayCutoffMs)
    const daySource = dayHistory.length > 0 ? dayHistory : history
    const firstRate = clamp(roundTo(daySource[0]?.rate ?? rate, 4), def.minRate, def.maxRate)
    const highFromHistory = daySource.reduce((maxValue, entry) => Math.max(maxValue, Number(entry.rate) || 0), 0)
    const lowFromHistory = daySource.reduce(
      (minValue, entry) => Math.min(minValue, Number(entry.rate) || minValue),
      rate,
    )
    const dayHigh = clamp(
      roundTo(
        Math.max(
          Number(source?.dayHigh) || 0,
          highFromHistory,
          rate,
          lastRate,
        ),
        4,
      ),
      def.minRate,
      def.maxRate,
    )
    const dayLow = clamp(
      roundTo(
        Math.min(
          Number(source?.dayLow) || rate,
          lowFromHistory,
          rate,
          lastRate,
        ),
        4,
      ),
      def.minRate,
      def.maxRate,
    )
    const safeDayLow = Math.min(dayLow, dayHigh)
    const safeDayHigh = Math.max(dayHigh, safeDayLow)

    return {
      id: def.id,
      rate,
      lastRate,
      openRate: firstRate,
      dayHigh: safeDayHigh,
      dayLow: safeDayLow,
      trendBias: clamp(Number(source?.trendBias) || 0, -0.45, 0.45),
      volatilityPulse: clamp(Number(source?.volatilityPulse) || 1, 0.75, 1.9),
      patternPhaseIndex: clamp(asInt(source?.patternPhaseIndex, 0), 0, FOREX_PATTERN_PHASE_COUNT - 1),
      patternPhaseRemaining: clamp(asInt(source?.patternPhaseRemaining, 0), 0, 72),
      patternMomentum: clamp(Number(source?.patternMomentum) || 0, -0.0045, 0.0045),
      spreadRate: clamp(
        Number(source?.spreadRate) || FOREX_BASE_SPREAD_RATE,
        0.006,
        0.04,
      ),
      updatedAt: typeof source?.updatedAt === 'string' ? source.updatedAt : timestamp,
      history,
    }
  })

  return {
    lastUpdatedAt: typeof forexState?.lastUpdatedAt === 'string' ? forexState.lastUpdatedAt : alignedNowIso,
    sentiment: clamp(Number(forexState?.sentiment) || 0, -1, 1),
    turbulence: clamp(Number(forexState?.turbulence) || 1, 0.72, 1.9),
    event: {
      title: String(forexState?.event?.title || '').trim().slice(0, 120),
      direction: clamp(asInt(forexState?.event?.direction, 0), -1, 1),
      strength: clamp(Number(forexState?.event?.strength) || 0, 0, 0.09),
      endsAt: typeof forexState?.event?.endsAt === 'string' ? forexState.event.endsAt : '',
    },
    pairs,
  }
}

function createDefaultForexPortfolio(timestamp) {
  const holdings = {}
  for (const def of FOREX_CATALOG) {
    holdings[def.id] = {
      quantity: 0,
      costTry: 0,
      realizedPnlTry: 0,
      updatedAt: timestamp,
    }
  }
  return holdings
}

function normalizeForexPortfolio(profile, timestamp) {
  const source = profile?.forexPortfolio && typeof profile.forexPortfolio === 'object'
    ? profile.forexPortfolio
    : {}
  const normalized = {}
  for (const def of FOREX_CATALOG) {
    const entry = source?.[def.id]
    const quantity = Math.max(0, roundTo(Number(entry?.quantity) || 0, 6))
    const costTry = Math.max(0, roundTo(Number(entry?.costTry) || 0, 2))
    normalized[def.id] = {
      quantity,
      costTry: quantity > 0 ? costTry : 0,
      realizedPnlTry: roundTo(Number(entry?.realizedPnlTry) || 0, 2),
      updatedAt: typeof entry?.updatedAt === 'string' ? entry.updatedAt : timestamp,
    }
  }
  profile.forexPortfolio = normalized
}

function forexRatesForPair(pair) {
  const midRate = Math.max(0.0001, Number(pair?.rate) || 0.0001)
  const spreadRate = clamp(
    Number(pair?.spreadRate) || FOREX_BASE_SPREAD_RATE,
    0.006,
    0.04,
  )
  const buyRate = roundTo(midRate * (1 + spreadRate / 2), 4)
  const sellRate = roundTo(midRate * (1 - spreadRate / 2), 4)
  return {
    midRate,
    spreadRate,
    buyRate,
    sellRate: Math.max(0.0001, sellRate),
  }
}

function forexPortfolioValueTry(profile, forexState) {
  const holdings = profile?.forexPortfolio && typeof profile.forexPortfolio === 'object'
    ? profile.forexPortfolio
    : {}
  const pairs = Array.isArray(forexState?.pairs) ? forexState.pairs : []
  let total = 0

  for (const pair of pairs) {
    const quantity = Math.max(0, Number(holdings?.[pair.id]?.quantity) || 0)
    if (quantity <= 0) continue
    const rates = forexRatesForPair(pair)
    total += quantity * rates.sellRate
  }

  return Math.max(0, Math.round(total))
}

function forexNextUpdateAt(lastUpdatedAt, nowMs = Date.now()) {
  const stepMs = Math.max(1000, asInt(FOREX_UPDATE_INTERVAL_MS, 5000))
  const baseMs = createdMs(lastUpdatedAt)
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now()
  const alignFloor = (valueMs) => Math.floor(Math.max(0, valueMs) / stepMs) * stepMs
  const alignCeil = (valueMs) => {
    const floorMs = alignFloor(valueMs)
    return floorMs === valueMs ? valueMs + stepMs : floorMs + stepMs
  }
  if (!Number.isFinite(baseMs) || baseMs <= 0) {
    return new Date(alignCeil(safeNowMs)).toISOString()
  }
  const normalizedBaseMs = alignFloor(baseMs)
  return new Date(alignCeil(Math.max(safeNowMs, normalizedBaseMs))).toISOString()
}

function formatForexRateTr(value, digits = 2) {
  const safeDigits = clamp(asInt(digits, 2), 0, 6)
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: safeDigits,
    maximumFractionDigits: safeDigits,
  }).format(Number(value) || 0)
}

function formatIsoTimeHm(value) {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--:--'
  const hh = `${dt.getHours()}`.padStart(2, '0')
  const mm = `${dt.getMinutes()}`.padStart(2, '0')
  return `${hh}:${mm}`
}

function notifyAllProfilesForexUpdated(db, timestamp) {
  const profiles = Array.isArray(db?.gameProfiles) ? db.gameProfiles : []
  if (profiles.length <= 0) return
  const pairs = Array.isArray(db?.forexState?.pairs) ? db.forexState.pairs : []
  const primaryPair = pairs.find((entry) => entry?.id === FOREX_DEFAULT_ID) || pairs[0]
  if (!primaryPair) return
  const def = FOREX_BY_ID.get(primaryPair.id)
  const code = String(def?.code || primaryPair.id || 'TCT').trim().toUpperCase() || 'TCT'
  const rateText = formatForexRateTr(roundTo(Number(primaryPair.rate) || 0, 2), 2)
  const nextUpdateAt = forexNextUpdateAt(db?.forexState?.lastUpdatedAt || timestamp, createdMs(timestamp))
  const nextUpdateHm = formatIsoTimeHm(nextUpdateAt)
  const message = `${code} döviz kuru güncellendi. Yeni kur: ${rateText} TRY. Sonraki güncelleme: ${nextUpdateHm}.`
  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object') continue
    pushNotification(profile, 'market', message, timestamp)
  }
}

function forexPairView(profile, pair) {
  const def = FOREX_BY_ID.get(pair.id)
  const rates = forexRatesForPair(pair)
  const holding = profile?.forexPortfolio?.[pair.id] || { quantity: 0, costTry: 0, realizedPnlTry: 0 }
  const quantity = Math.max(0, Number(holding.quantity) || 0)
  const costTry = Math.max(0, Number(holding.costTry) || 0)
  const marketValueTry = quantity * rates.sellRate
  const unrealizedPnlTry = marketValueTry - costTry
  const unrealizedPnlPercent = costTry > 0 ? (unrealizedPnlTry / costTry) * 100 : 0
  const changePercent = pair.lastRate > 0
    ? Number((((pair.rate - pair.lastRate) / pair.lastRate) * 100).toFixed(2))
    : 0
  const dayChangePercent = pair.openRate > 0
    ? Number((((pair.rate - pair.openRate) / pair.openRate) * 100).toFixed(2))
    : 0
  const riskScore = clamp(
    Math.round((Math.abs(pair.trendBias) * 130) + (pair.volatilityPulse * 42) + ((def?.volatility || 0.01) * 850)),
    1,
    100,
  )

  return {
    id: pair.id,
    code: def?.code || pair.id.toUpperCase(),
    name: def?.name || pair.id,
    minRate: roundTo(def?.minRate || 0, 2),
    maxRate: roundTo(def?.maxRate || 0, 2),
    updatedAt: typeof pair?.updatedAt === 'string' ? pair.updatedAt : '',
    rate: roundTo(pair.rate, 4),
    buyRate: rates.buyRate,
    sellRate: rates.sellRate,
    spreadRate: rates.spreadRate,
    dayHigh: roundTo(pair.dayHigh, 4),
    dayLow: roundTo(pair.dayLow, 4),
    changePercent,
    dayChangePercent,
    riskScore,
    trendBias: roundTo(pair.trendBias, 4),
    volatilityPulse: roundTo(pair.volatilityPulse, 4),
    history: (Array.isArray(pair.history) ? pair.history : []).slice(-360).map((entry) => ({
      at: entry.at,
      rate: roundTo(entry.rate, 4),
      volume: roundTo(Number(entry?.volume) || 0, 2),
    })),
    holding: {
      quantity: roundTo(quantity, 6),
      costTry: roundTo(costTry, 2),
      marketValueTry: roundTo(marketValueTry, 2),
      unrealizedPnlTry: roundTo(unrealizedPnlTry, 2),
      unrealizedPnlPercent: Number(unrealizedPnlPercent.toFixed(2)),
      realizedPnlTry: roundTo(Number(holding.realizedPnlTry) || 0, 2),
    },
  }
}

function _forexPortfolioSummary(profile, quotes) {
  const list = Array.isArray(quotes) ? quotes : []
  const holdings = list
    .filter((quote) => (Number(quote?.holding?.quantity) || 0) > 0)
    .map((quote) => ({
      id: quote.id,
      code: quote.code,
      name: quote.name,
      quantity: quote.holding.quantity,
      avgCostRate: quote.holding.quantity > 0
        ? roundTo(quote.holding.costTry / quote.holding.quantity, 4)
        : 0,
      costTry: quote.holding.costTry,
      marketValueTry: quote.holding.marketValueTry,
      unrealizedPnlTry: quote.holding.unrealizedPnlTry,
      unrealizedPnlPercent: quote.holding.unrealizedPnlPercent,
      realizedPnlTry: quote.holding.realizedPnlTry,
    }))
    .sort((a, b) => b.marketValueTry - a.marketValueTry)

  const totalCostTry = holdings.reduce((sum, entry) => sum + (entry.costTry || 0), 0)
  const totalMarketValueTry = holdings.reduce((sum, entry) => sum + (entry.marketValueTry || 0), 0)
  const totalUnrealizedPnlTry = totalMarketValueTry - totalCostTry
  const totalUnrealizedPnlPercent = totalCostTry > 0 ? (totalUnrealizedPnlTry / totalCostTry) * 100 : 0
  const totalRealizedPnlTry = Object.values(profile?.forexPortfolio || {}).reduce(
    (sum, entry) => sum + (Number(entry?.realizedPnlTry) || 0),
    0,
  )

  return {
    holdings,
    totalCostTry: roundTo(totalCostTry, 2),
    totalMarketValueTry: roundTo(totalMarketValueTry, 2),
    totalUnrealizedPnlTry: roundTo(totalUnrealizedPnlTry, 2),
    totalUnrealizedPnlPercent: Number(totalUnrealizedPnlPercent.toFixed(2)),
    totalRealizedPnlTry: roundTo(totalRealizedPnlTry, 2),
  }
}

function isFleetBusinessTemplate(template) {
  return template?.businessKind === 'fleet'
}

function fleetCapacityFromPlayerLevel(playerLevel, template) {
  const safeLevel = clamp(asInt(playerLevel, 1), 1, PLAYER_LEVEL_CAP)
  const baseCapacity = Math.max(1, asInt(template?.baseFleetCapacity, 1))
  return Math.max(baseCapacity, safeLevel)
}

function normalizedFleetTier(value) {
  const safeTier = String(value || '').trim().toLowerCase()
  if (safeTier === 'rare') return 'rare'
  if (safeTier === 'luxury') return 'luxury'
  return 'standard'
}

function fleetCatalogOf(template) {
  return Array.isArray(template?.vehicleCatalog) ? template.vehicleCatalog : []
}

function propertyVehicleImagePath(index) {
  const safeIndex = clamp(asInt(index, 0), 0, 9999)
  const imageNumber = clamp(safeIndex + 1, 1, 20)
  return `/home/vehicles/property/mulk${imageNumber}.png`
}

function fleetOrderUnlockLevelFromPlayerLevel(playerLevel, template) {
  const safePlayerLevel = clamp(asInt(playerLevel, 1), 1, PLAYER_LEVEL_CAP)
  const catalog = fleetCatalogOf(template)
  const maxRequiredLevel = catalog.reduce(
    (maxLevel, entry) => Math.max(maxLevel, Math.max(1, asInt(entry?.levelRequired, 1))),
    1,
  )
  return clamp(safePlayerLevel, 1, maxRequiredLevel)
}

function fleetVehicleSpecByModelId(template, modelId) {
  const safeModelId = String(modelId || '').trim()
  if (!safeModelId) return null

  const catalog = fleetCatalogOf(template)
  const index = catalog.findIndex((entry) => String(entry?.id || '').trim() === safeModelId)
  if (index < 0) return null
  return fleetVehicleSpecForIndex(template, index)
}

function fleetVehicleSpecForIndex(template, index) {
  const safeIndex = Math.max(0, asInt(index, 0))
  const catalog = fleetCatalogOf(template)
  if (catalog.length === 0) {
    return {
      id: `${template?.id || 'fleet'}-veh-${safeIndex + 1}`,
      name: `Araç ${safeIndex + 1}`,
      tier: 'standard',
      image: '',
      emoji: '',
      requiredLevel: safeIndex + 1,
      cash: 12000 + safeIndex * 2500,
      engineKits: 4 + safeIndex,
      spareParts: 10 + safeIndex * 2,
      fuel: 4 + safeIndex,
      energy: 6 + safeIndex,
      cement: 0,
      timber: 0,
      brick: 0,
      rentPerHour: 120 + safeIndex * 18,
      xp: 20 + safeIndex * 2,
    }
  }

  const base = safeIndex < catalog.length ? catalog[safeIndex] : catalog[catalog.length - 1]
  const extra = Math.max(0, safeIndex - catalog.length + 1)
  const scale = 1 + extra * 0.14
  const templateId = String(template?.id || '').trim()
  const resolvedImage = templateId === 'property-rental'
    ? propertyVehicleImagePath(safeIndex)
    : String(base?.image || '')

  return {
    id: extra > 0
      ? `${String(base?.id || `${template?.id || 'fleet'}-veh-${safeIndex + 1}`)}-x${extra}`
      : String(base?.id || `${template?.id || 'fleet'}-veh-${safeIndex + 1}`),
    name: extra > 0
      ? `${String(base?.name || `Araç ${safeIndex + 1}`)} +${extra}`
      : String(base?.name || `Araç ${safeIndex + 1}`),
    tier: normalizedFleetTier(base?.tier),
    image: resolvedImage,
    emoji: String(base?.emoji || ''),
    requiredLevel: Math.max(1, asInt(base?.levelRequired, safeIndex + 1)),
    cash: Math.max(1, Math.round(Math.max(1, asInt(base?.cash, 15000)) * scale)),
    engineKits: Math.max(0, Math.round(Math.max(0, asInt(base?.engineKits, 0)) * scale)),
    spareParts: Math.max(0, Math.round(Math.max(0, asInt(base?.spareParts, 0)) * scale)),
    fuel: Math.max(0, Math.round(Math.max(0, asInt(base?.fuel, 0)) * scale)),
    energy: Math.max(0, Math.round(Math.max(0, asInt(base?.energy, 0)) * scale)),
    cement: Math.max(0, Math.round(Math.max(0, asInt(base?.cement, 0)) * scale)),
    timber: Math.max(0, Math.round(Math.max(0, asInt(base?.timber, 0)) * scale)),
    brick: Math.max(0, Math.round(Math.max(0, asInt(base?.brick, 0)) * scale)),
    rentPerHour: Math.max(1, Math.round(Math.max(1, asInt(base?.rentPerHour, 160)) * scale)),
    xp: Math.max(1, Math.round(Math.max(1, asInt(base?.xp, 20)) * scale)),
  }
}

function fleetFuelMultiplierByTemplate(template) {
  const templateId = String(template?.id || '').trim()
  if (templateId === 'auto-rental') return AUTO_RENTAL_FUEL_MULTIPLIER
  if (templateId === 'property-rental') return PROPERTY_RENTAL_FUEL_MULTIPLIER
  return 1
}

function fuelUnitsByOperationLevel(level, multiplier = 1) {
  const safeLevel = Math.max(1, asInt(level, 1))
  const safeMultiplier = Math.max(1, Number(multiplier) || 1)
  // Motor baz tüketim: seviye 1 = 2 petrol.
  // Araba ve tır için işletme çarpanı ayrıca uygulanır.
  return Math.max(2, Math.round(safeLevel * 2 * safeMultiplier * BUSINESS_EXPENSE_MULTIPLIER))
}

function fleetVehicleOperationLevel(template, vehicle, fallbackIndex = 0) {
  const safeFallbackLevel = Math.max(1, asInt(fallbackIndex, 0) + 1)
  const safeVehicle = vehicle && typeof vehicle === 'object' ? vehicle : {}
  const requiredLevelFromVehicle = Math.max(1, asInt(safeVehicle?.requiredLevel, 0))
  if (requiredLevelFromVehicle > 0) return requiredLevelFromVehicle
  const catalog = fleetCatalogOf(template)
  const rawModelId = String(safeVehicle?.modelId || '').trim()

  if (catalog.length > 0 && rawModelId) {
    let baseModelId = rawModelId
    const extraMatch = /-x(\d+)$/.exec(rawModelId)
    if (extraMatch) baseModelId = rawModelId.slice(0, extraMatch.index)

    const modelIndex = catalog.findIndex((entry) => String(entry?.id || '').trim() === baseModelId)
    if (modelIndex >= 0) {
      const byCatalogRequired = Math.max(1, asInt(catalog[modelIndex]?.levelRequired, modelIndex + 1))
      return byCatalogRequired
    }
  }

  return safeFallbackLevel
}

function fleetFuelNeedPerHour(profile, template, business) {
  if (!isFleetBusinessTemplate(template)) return 0
  const activeVehicles = fleetOperationalVehicles(profile, business, template)
  const fleetCount = activeVehicles.length
  if (fleetCount <= 0) return 0

  const fuelMultiplier = fleetFuelMultiplierByTemplate(template)
  let totalFuelNeed = 0
  for (let index = 0; index < fleetCount; index += 1) {
    const opLevel = fleetVehicleOperationLevel(template, activeVehicles[index], index)
    totalFuelNeed += fuelUnitsByOperationLevel(opLevel, fuelMultiplier)
  }
  return Math.max(0, totalFuelNeed)
}

function fleetCollectWindow(lastIncomeAt, timestamp) {
  const nowMs = createdMs(timestamp)
  const rawLastIncomeMs = createdMs(lastIncomeAt || timestamp)
  // Backward-compatibility guard:
  // Older saves may keep the last collection timestamp too far in the past
  // (legacy 4h window). Clamp to at most one 60-minute cycle backlog so
  // hourly UI values and collection math stay consistent.
  const minLastIncomeMs = Math.max(0, nowMs - FLEET_COLLECT_COOLDOWN_MS)
  const lastIncomeMs = Math.min(nowMs, Math.max(rawLastIncomeMs, minLastIncomeMs))
  const elapsedMs = Math.max(0, nowMs - lastIncomeMs)
  const elapsedCycles = Math.max(0, Math.floor(elapsedMs / FLEET_COLLECT_COOLDOWN_MS))
  const collectedUntilMs = lastIncomeMs + elapsedCycles * FLEET_COLLECT_COOLDOWN_MS

  return {
    nowMs,
    lastIncomeMs,
    elapsedCycles,
    collectedUntilMs,
  }
}

function taxAndNetFromGross(gross) {
  const taxAmount = Math.max(0, Math.floor(gross * COLLECTION_TAX_RATE))
  const netCash = Math.max(0, gross - taxAmount)
  return { taxAmount, netCash }
}

function fleetCollectSnapshot(profile, business, template, timestamp, options = {}) {
  const multiplier = clamp(Math.trunc(Number(options?.multiplier || 1)), 1, PREMIUM_BULK_MULTIPLIER)
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : weeklyEventState(timestamp)
  const fuelInventory = options?.fuelInventory && typeof options.fuelInventory === 'object'
    ? options.fuelInventory
    : null
  const collectWindow = fleetCollectWindow(business.lastIncomeCollectedAt || timestamp, timestamp)
  const nowMs = collectWindow.nowMs
  const lastIncomeMs = collectWindow.lastIncomeMs
  const elapsedCycles = collectWindow.elapsedCycles
  const elapsedHours = elapsedCycles
  const hourlyTotals = fleetHourlyTotalsFromBusiness(profile, business, template)
  const pendingIncome = elapsedCycles > 0
    ? Math.max(0, elapsedCycles * Math.max(0, asInt(hourlyTotals.hourlyIncome, 0)))
    : 0
  const fuelItemId = String(template?.fuelItemId || 'oil')
  const fuelItemName = ITEM_BY_ID.get(fuelItemId)?.name || fuelItemId
  const fuelNeedPerHour = fleetFuelNeedPerHour(profile, template, business)
  const baseFuelNeeded = Math.max(0, elapsedCycles * fuelNeedPerHour)
  const fuelNeeded = baseFuelNeeded > 0
    ? weeklyEventCostValue(baseFuelNeeded, timestamp, weeklyEvents, { minPositive: 1, applyDiscount: true })
    : 0
  const fuelAvailable = Math.max(
    0,
    asInt(fuelInventory ? fuelInventory?.[fuelItemId] : getInventoryQuantity(profile, fuelItemId), 0),
  )
  const hasEnoughFuel = fuelNeeded <= 0 || fuelAvailable >= fuelNeeded
  const fuelConsumed = hasEnoughFuel ? fuelNeeded : 0
  const incomeMultiplier = hasEnoughFuel ? 1 : 0
  const grossAfterFuel = Math.max(0, Math.floor(pendingIncome * multiplier * incomeMultiplier))
  const baseXpGain = elapsedCycles > 0
    ? Math.max(0, elapsedCycles * Math.max(0, asInt(hourlyTotals.hourlyXp, 0)))
    : 0
  const { taxAmount, netCash } = taxAndNetFromGross(grossAfterFuel)
  const xpGain = Math.max(0, Math.floor(baseXpGain * incomeMultiplier))

  if (fuelInventory) {
    fuelInventory[fuelItemId] = Math.max(0, fuelAvailable - fuelConsumed)
  }

  return {
    nowMs,
    lastIncomeMs,
    elapsedHours,
    elapsedCycles,
    collectedUntilMs: collectWindow.collectedUntilMs,
    collectedUntilAt: new Date(collectWindow.collectedUntilMs).toISOString(),
    pendingIncome,
    hourlyIncome: Math.max(0, asInt(hourlyTotals.hourlyIncome, 0)),
    hourlyXp: Math.max(0, asInt(hourlyTotals.hourlyXp, 0)),
    fuelItemId,
    fuelItemName,
    fuelNeedPerHour,
    fuelNeeded,
    fuelAvailable,
    fuelConsumed,
    incomeMultiplier,
    grossAfterFuel,
    taxAmount,
    netCash,
    xpGain,
    multiplier,
  }
}

function logisticsTruckOperationLevel(truck, fallbackIndex = 0) {
  const safeFallbackLevel = Math.max(1, asInt(fallbackIndex, 0) + 1)
  const requiredLevelFromTruck = Math.max(1, asInt(truck?.levelRequired, 0))
  if (requiredLevelFromTruck > 0) return requiredLevelFromTruck
  const rawModelId = String(truck?.modelId || '').trim()
  if (rawModelId) {
    const catalogIndex = LOGISTICS_TRUCK_CATALOG.findIndex(
      (entry) => String(entry?.id || '').trim() === rawModelId,
    )
    if (catalogIndex >= 0) {
      return Math.max(1, asInt(LOGISTICS_TRUCK_CATALOG[catalogIndex]?.levelRequired, catalogIndex + 1))
    }
  }

  return safeFallbackLevel
}

function logisticsClaimOperationCost(profile, shipment) {
  const trucks = logisticsActiveTrucks(profile)
  if (trucks.length <= 0) {
    return {
      fuelItemId: 'oil',
      fuelItemName: ITEM_BY_ID.get('oil')?.name || 'Petrol',
      fuelNeeded: 0,
      upkeepCash: 0,
    }
  }

  const totalCapacity = Math.max(1, logisticsFleetCapacity(profile))
  const quantity = Math.max(1, asInt(shipment?.quantity, 1))
  const loadRatio = clamp(quantity / totalCapacity, 0.08, 1)

  let baseFuelNeed = 0
  let baseUpkeepCash = 0
  trucks.forEach((truck, index) => {
    const opLevel = logisticsTruckOperationLevel(truck, index)
    baseFuelNeed += fuelUnitsByOperationLevel(opLevel, LOGISTICS_FUEL_MULTIPLIER)
    baseUpkeepCash += Math.max(1, asInt(truck?.upkeepPerRun, 1))
  })

  return {
    fuelItemId: 'oil',
    fuelItemName: ITEM_BY_ID.get('oil')?.name || 'Petrol',
    fuelNeeded: Math.max(1, Math.round(baseFuelNeed * loadRatio)),
    upkeepCash: Math.max(0, Math.round(baseUpkeepCash * loadRatio)),
  }
}

function logisticsCollectPreview(profile, timestamp, options = {}) {
  const snapshot = logisticsCollectSnapshot(profile, timestamp, options)
  return {
    grossCash: snapshot.grossCash,
    taxAmount: snapshot.taxAmount,
    netCash: snapshot.netCash,
    upkeepCash: 0,
    fuelConsumed: snapshot.fuelConsumed,
    xpGain: snapshot.xpGain,
    collectedCount: snapshot.collectedCount,
    collectedShipments: [],
    multiplier: snapshot.multiplier,
    fuelItemId: snapshot.fuelItemId,
    fuelItemName: snapshot.fuelItemName,
    fuelNeedPerHour: snapshot.fuelNeedPerHour,
    fuelAvailable: snapshot.fuelAvailable,
    hourlyIncome: snapshot.hourlyIncome,
    hourlyXp: snapshot.hourlyXp,
    pendingIncome: snapshot.pendingIncome,
    collectIntervalMinutes: snapshot.collectIntervalMinutes,
    nextCollectAt: snapshot.nextCollectAt,
  }
}

function fleetVehicleBuildCost(profile, business, template, options = {}) {
  const fleetCount = fleetOperationalCount(profile, business, template)
  const spec = fleetVehicleSpecForIndex(template, fleetCount)
  const timestamp = options?.timestamp || ''
  const weeklyEvents = options?.weeklyEvents || null
  const applyCost = (value) => weeklyEventCostValue(value, timestamp, weeklyEvents, { minPositive: 1 })

  return {
    cash: applyCost(spec.cash),
    engineKits: applyCost(spec.engineKits),
    spareParts: applyCost(spec.spareParts),
    fuel: applyCost(spec.fuel),
    energy: applyCost(spec.energy),
    cement: applyCost(spec.cement),
    timber: applyCost(spec.timber),
    brick: applyCost(spec.brick),
    vehicleId: spec.id,
    vehicleName: spec.name,
    tier: spec.tier,
    image: spec.image,
    emoji: spec.emoji,
    requiredLevel: spec.requiredLevel,
    rentPerHour: spec.rentPerHour,
    xp: spec.xp,
  }
}

function fleetVehicleSnapshot(template, index, timestamp) {
  const spec = fleetVehicleSpecForIndex(template, index)
  const lifetime = resolveAssetLifetime(timestamp, timestamp, timestamp)
  return {
    id: crypto.randomUUID(),
    modelId: spec.id,
    name: spec.name,
    tier: spec.tier,
    image: spec.image,
    emoji: spec.emoji,
    requiredLevel: spec.requiredLevel,
    rentPerHour: spec.rentPerHour,
    xp: spec.xp,
    cost: {
      cash: spec.cash,
      engineKits: spec.engineKits,
      spareParts: spec.spareParts,
      fuel: spec.fuel,
      energy: spec.energy,
      cement: spec.cement,
      timber: spec.timber,
      brick: spec.brick,
    },
    producedAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
  }
}

function estimateFleetRentTotal(template, fleetCount) {
  let total = 0
  for (let index = 0; index < fleetCount; index += 1) {
    total += Math.max(0, asInt(fleetVehicleSpecForIndex(template, index).rentPerHour, 0))
  }
  return total
}

function estimateFleetXpTotal(template, fleetCount) {
  let total = 0
  for (let index = 0; index < fleetCount; index += 1) {
    total += Math.max(0, asInt(fleetVehicleSpecForIndex(template, index).xp, 0))
  }
  return total
}

function fleetHourlyTotalsFromBusiness(profile, business, template) {
  const vehicles = fleetOperationalVehicles(profile, business, template)
  const fleetCount = vehicles.length

  const rentFromVehicles = vehicles.reduce(
    (sum, entry) => sum + Math.max(0, asInt(entry?.rentPerHour, 0)),
    0,
  )
  const xpFromVehicles = vehicles.reduce(
    (sum, entry) => sum + Math.max(0, asInt(entry?.xp, 0)),
    0,
  )
  const fallbackRent = estimateFleetRentTotal(template, fleetCount)
  const fallbackXp = estimateFleetXpTotal(template, fleetCount)
  const savedRent = Math.max(0, asInt(business?.fleetRentTotal, 0))
  const savedXp = Math.max(0, asInt(business?.fleetXpTotal, 0))

  return {
    fleetCount,
    hourlyIncome: rentFromVehicles > 0 ? rentFromVehicles : (savedRent || fallbackRent),
    hourlyXp: xpFromVehicles > 0 ? xpFromVehicles : (savedXp || fallbackXp),
  }
}

function normalizeFleetBusinessState(business, template, timestamp, playerLevel = 1) {
  const level = clamp(asInt(business.level, 1), 1, PLAYER_LEVEL_CAP)
  const safePlayerLevel = clamp(asInt(playerLevel, 1), 1, PLAYER_LEVEL_CAP)
  const rawVehicles = Array.isArray(business.vehicles) ? business.vehicles : []
  const baseCapacity = fleetCapacityFromPlayerLevel(safePlayerLevel, template)
  let fleetCapacity = Math.max(baseCapacity, rawVehicles.length)
  let fleetCount = clamp(asInt(business.fleetCount, 0), 0, fleetCapacity)
  if (rawVehicles.length > fleetCount) {
    fleetCount = rawVehicles.length
  }
  let normalizedVehicles = rawVehicles
    .slice(0, fleetCount)
    .map((entry, index) => {
      const spec = fleetVehicleSpecByModelId(template, entry?.modelId) || fleetVehicleSpecForIndex(template, index)
      const lifetime = resolveAssetLifetime(
        entry?.producedAt || entry?.acquiredAt || timestamp,
        timestamp,
        timestamp,
      )
      if (lifetime.expired) return null
      return {
        id: String(entry?.id || crypto.randomUUID()),
        modelId: String(entry?.modelId || spec.id),
        name: String(entry?.name || spec.name),
        tier: normalizedFleetTier(entry?.tier || spec.tier),
        image: String(entry?.image || spec.image || ''),
        emoji: String(entry?.emoji || spec.emoji || ''),
        requiredLevel: Math.max(1, asInt(spec.requiredLevel, 1)),
        rentPerHour: Math.max(1, asInt(spec.rentPerHour, 1)),
        xp: Math.max(1, asInt(spec.xp, 1)),
        cost: {
          cash: Math.max(1, asInt(spec.cash, 1)),
          engineKits: Math.max(0, asInt(spec.engineKits, 0)),
          spareParts: Math.max(0, asInt(spec.spareParts, 0)),
          fuel: Math.max(0, asInt(spec.fuel, 0)),
          energy: Math.max(0, asInt(spec.energy, 0)),
          cement: Math.max(0, asInt(spec.cement, 0)),
          timber: Math.max(0, asInt(spec.timber, 0)),
          brick: Math.max(0, asInt(spec.brick, 0)),
        },
        producedAt: lifetime.acquiredAt,
        expiresAt: lifetime.expiresAt,
        remainingMs: lifetime.remainingMs,
      }
    })
    .filter(Boolean)

  if (rawVehicles.length === 0) {
    while (normalizedVehicles.length < fleetCount) {
      normalizedVehicles.push(fleetVehicleSnapshot(template, normalizedVehicles.length, timestamp))
    }
  }
  fleetCount = normalizedVehicles.length
  fleetCapacity = Math.max(baseCapacity, fleetCount)

  const rentFromVehicles = normalizedVehicles.reduce(
    (sum, item) => sum + Math.max(0, asInt(item?.rentPerHour, 0)),
    0,
  )
  const xpFromVehicles = normalizedVehicles.reduce(
    (sum, item) => sum + Math.max(0, asInt(item?.xp, 0)),
    0,
  )
  const fallbackRent = estimateFleetRentTotal(template, fleetCount)
  const fallbackXp = estimateFleetXpTotal(template, fleetCount)
  const resolvedRent = rentFromVehicles > 0 ? rentFromVehicles : fallbackRent
  const resolvedXp = xpFromVehicles > 0 ? xpFromVehicles : fallbackXp

  business.level = level
  business.fleetCapacity = fleetCapacity
  business.fleetCount = fleetCount
  business.vehicles = normalizedVehicles
  business.lastVehicleOrderedAt =
    typeof business.lastVehicleOrderedAt === 'string' ? business.lastVehicleOrderedAt : ''
  business.fleetRentTotal = Math.max(0, asInt(resolvedRent, 0))
  business.fleetXpTotal = Math.max(0, asInt(resolvedXp, 0))
  business.storageAmount = 0
  business.storageCapacity = 1
  business.storageItemId = template.outputItemId

  const createdAtMs = createdMs(business.createdAt || timestamp)
  const lastIncomeMs = createdMs(business.lastIncomeCollectedAt || timestamp)
  const lastVehicleOrderMs = createdMs(business.lastVehicleOrderedAt || '')
  // Existing saves can lock first collection for 60 minutes right after the first vehicle order.
  // If no collection happened yet, backdate once so the first cycle is collectible immediately.
  if (
    fleetCount > 0 &&
    createdAtMs > 0 &&
    lastIncomeMs === createdAtMs &&
    lastVehicleOrderMs > 0
  ) {
    business.lastIncomeCollectedAt = new Date(
      Math.max(0, lastVehicleOrderMs - FLEET_COLLECT_COOLDOWN_MS),
    ).toISOString()
  }
}

function fleetListingBasePrice(vehicle) {
  return Math.max(
    1,
    Math.round(Math.max(asInt(vehicle?.cost?.cash, 0) * 0.9, asInt(vehicle?.rentPerHour, 0) * 140)),
  )
}

function logisticsListingBasePrice(truck) {
  return Math.max(
    1,
    Math.round(Math.max(asInt(truck?.cash, 0) * 0.82, asInt(truck?.incomePerRun, 0) * 160)),
  )
}

function listingPriceProfile(templateId) {
  const safeTemplateId = normalizeListingTemplateId(templateId) || 'moto-rental'
  return LISTING_PRICE_PROFILE[safeTemplateId] || LISTING_PRICE_PROFILE['moto-rental']
}

function listingPriceBounds(basePrice, options = {}) {
  const safeBase = Math.max(1, asInt(basePrice, 1))
  const requiredLevel = Math.max(1, asInt(options?.requiredLevel, 1))
  const profile = listingPriceProfile(options?.templateId)
  const levelOffset = Math.max(0, requiredLevel - 1)

  const dynamicMinFloor = Math.max(
    1,
    profile.minFloor + profile.minStepByLevel * levelOffset,
  )
  const dynamicMaxFloor = Math.max(
    dynamicMinFloor + 1,
    profile.maxFloor + profile.maxStepByLevel * levelOffset,
  )
  const minPrice = Math.max(
    dynamicMinFloor,
    Math.floor(safeBase * 0.6),
  )
  const maxPrice = Math.max(
    minPrice + 1,
    dynamicMaxFloor,
    Math.floor(safeBase * 9),
  )
  const suggestedPrice = clamp(safeBase, minPrice, maxPrice)
  return {
    minPrice,
    maxPrice,
    suggestedPrice,
  }
}

function listingCommissionPreview(priceValue) {
  const price = Math.max(1, asInt(priceValue, 1))
  const commissionAmount = Math.max(0, Math.floor(price * VEHICLE_MARKET_COMMISSION_RATE))
  const sellerPayout = Math.max(0, price - commissionAmount)
  return {
    commissionRate: VEHICLE_MARKET_COMMISSION_RATE,
    commissionAmount,
    totalCost: price,
    sellerPayout,
  }
}

function resolveAssetAcquiredAt(rawValue, fallbackTimestamp) {
  const candidate = typeof rawValue === 'string' ? rawValue : ''
  if (createdMs(candidate) > 0) return candidate
  return fallbackTimestamp
}

function resolveAssetLifetime(rawAcquiredAt, fallbackTimestamp, nowTimestamp = fallbackTimestamp) {
  const acquiredAt = resolveAssetAcquiredAt(rawAcquiredAt, fallbackTimestamp)
  const acquiredAtMs = createdMs(acquiredAt)
  const expiresAtMs = acquiredAtMs + VEHICLE_LIFETIME_MS
  const nowMs = createdMs(nowTimestamp || fallbackTimestamp)
  return {
    acquiredAt,
    expiresAt: new Date(expiresAtMs).toISOString(),
    remainingMs: Math.max(0, expiresAtMs - nowMs),
    expired: nowMs >= expiresAtMs,
  }
}

function normalizeVehicleListingEntry(entry, profile, timestamp) {
  if (!entry || typeof entry !== 'object') return null

  const businessId = String(entry.businessId || '').trim()
  const templateId = normalizeListingTemplateId(entry.templateId)
  const vehicleId = String(entry.vehicleId || '').trim()
  const modelId = String(entry.modelId || '').trim()
  if (!businessId || !templateId || !vehicleId || !modelId) return null

  const template = BUSINESS_BY_ID.get(templateId)
  const spec = templateId === 'logistics'
    ? LOGISTICS_TRUCK_BY_ID.get(modelId)
    : template
      ? fleetVehicleSpecByModelId(template, modelId)
      : null
  const requiredLevel = Math.max(
    1,
    asInt(spec?.requiredLevel ?? spec?.levelRequired ?? entry.requiredLevel, 1),
  )
  const basePrice = templateId === 'logistics'
    ? logisticsListingBasePrice({
        cash: asInt(spec?.cash ?? entry.cash, 0),
        incomePerRun: asInt(spec?.incomePerRun ?? entry.rentPerHour, 0),
      })
    : fleetListingBasePrice({
        cost: { cash: asInt(spec?.cash ?? entry.cash, 0) },
        rentPerHour: asInt(spec?.rentPerHour ?? entry.rentPerHour, 0),
      })
  const fallbackBounds = listingPriceBounds(basePrice, { templateId, requiredLevel })
  const minPrice = Math.max(1, asInt(entry.minPrice, fallbackBounds.minPrice))
  const maxPrice = Math.max(minPrice + 1, asInt(entry.maxPrice, fallbackBounds.maxPrice))
  const suggestedPrice = clamp(asInt(entry.suggestedPrice, fallbackBounds.suggestedPrice), minPrice, maxPrice)
  const price = clamp(Math.max(1, asInt(entry.price, suggestedPrice)), minPrice, maxPrice)
  const commission = listingCommissionPreview(price)
  const listedAt = typeof entry.listedAt === 'string' ? entry.listedAt : timestamp
  const lifetime = resolveAssetLifetime(
    entry?.acquiredAt || entry?.purchasedAt || entry?.producedAt || listedAt,
    timestamp,
    timestamp,
  )
  if (lifetime.expired) return null

  return {
    id: String(entry.id || crypto.randomUUID()),
    businessId,
    templateId,
    vehicleId,
    modelId,
    name: String(entry.name || 'Araç İlanı').trim() || 'Araç İlanı',
    tier: normalizedFleetTier(entry.tier),
    image: templateId === 'logistics'
      ? logisticsTruckImagePath(modelId, entry?.image)
      : String(entry.image || '').trim(),
    emoji: String(entry.emoji || '').trim(),
    requiredLevel,
    rentPerHour: Math.max(1, asInt(spec?.rentPerHour ?? spec?.incomePerRun ?? entry.rentPerHour, 1)),
    xp: Math.max(1, asInt(spec?.xp ?? spec?.xpPerRun ?? entry.xp, 1)),
    capacity: Math.max(1, asInt(spec?.capacity ?? entry.capacity, 1)),
    upkeepPerRun: Math.max(1, asInt(spec?.upkeepPerRun ?? entry.upkeepPerRun, 1)),
    engineKits: Math.max(0, asInt(spec?.engineKits ?? entry.engineKits, 0)),
    spareParts: Math.max(0, asInt(spec?.spareParts ?? entry.spareParts, 0)),
    energy: Math.max(0, asInt(spec?.energy ?? entry.energy, 0)),
    cement: Math.max(0, asInt(spec?.cement ?? entry.cement, 0)),
    timber: Math.max(0, asInt(spec?.timber ?? entry.timber, 0)),
    brick: Math.max(0, asInt(spec?.brick ?? entry.brick, 0)),
    cash: Math.max(0, asInt(spec?.cash ?? entry.cash, 0)),
    minPrice,
    maxPrice,
    suggestedPrice,
    price,
    commissionRate: commission.commissionRate,
    commissionAmount: commission.commissionAmount,
    totalCost: commission.totalCost,
    sellerPayout: commission.sellerPayout,
    listedAt,
    acquiredAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
    remainingMs: lifetime.remainingMs,
    sellerUserId: String(entry.sellerUserId || profile?.userId || '').trim(),
    sellerName: String(entry.sellerName || profile?.username || 'Oyuncu').trim() || 'Oyuncu',
    visibility:
      String(entry.visibility || 'public').trim().toLowerCase() === 'custom' ? 'custom' : 'public',
    recipientUserId:
      String(entry.visibility || '').trim().toLowerCase() === 'custom'
        ? String(entry.recipientUserId || '').trim()
        : '',
  }
}

function vehicleListingsByTemplate(profile, templateId) {
  const safeTemplateId = normalizeListingTemplateId(templateId)
  if (!safeTemplateId) return []
  const listings = Array.isArray(profile?.vehicleListings) ? profile.vehicleListings : []
  return listings.filter((entry) => normalizeListingTemplateId(entry?.templateId) === safeTemplateId)
}

function fleetOperationalVehicleFromListing(listing, fallbackIndex = 0) {
  const requiredLevel = Math.max(1, asInt(listing?.requiredLevel, fallbackIndex + 1))
  const lifetime = resolveAssetLifetime(
    listing?.acquiredAt || listing?.producedAt || listing?.listedAt || nowIso(),
    nowIso(),
    nowIso(),
  )
  return {
    id: String(listing?.vehicleId || listing?.id || crypto.randomUUID()),
    modelId: String(listing?.modelId || '').trim(),
    requiredLevel,
    rentPerHour: Math.max(1, asInt(listing?.rentPerHour, 1)),
    xp: Math.max(1, asInt(listing?.xp, 1)),
    cost: {
      cash: Math.max(0, asInt(listing?.cash, 0)),
      engineKits: Math.max(0, asInt(listing?.engineKits, 0)),
      spareParts: Math.max(0, asInt(listing?.spareParts, 0)),
      fuel: Math.max(0, asInt(listing?.fuel, 0)),
      energy: Math.max(0, asInt(listing?.energy, 0)),
      cement: Math.max(0, asInt(listing?.cement, 0)),
      timber: Math.max(0, asInt(listing?.timber, 0)),
      brick: Math.max(0, asInt(listing?.brick, 0)),
    },
    producedAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
    remainingMs: lifetime.remainingMs,
  }
}

function fleetListingsForBusiness(profile, business, template) {
  const safeBusinessId = String(business?.id || '').trim()
  const safeTemplateId = normalizeBusinessTemplateId(template?.id || business?.templateId)
  if (!safeBusinessId || !safeTemplateId) return []

  const templateListings = vehicleListingsByTemplate(profile, safeTemplateId)
  return templateListings
    .filter((entry) => String(entry?.businessId || '').trim() === safeBusinessId)
    .map((entry, index) => fleetOperationalVehicleFromListing(entry, index))
}

function fleetOperationalVehicles(profile, business, template) {
  const ownedVehicles = Array.isArray(business?.vehicles) ? business.vehicles : []
  const listedVehicles = fleetListingsForBusiness(profile, business, template)
  return [...ownedVehicles, ...listedVehicles]
}

function fleetOperationalCount(profile, business, template) {
  return fleetOperationalVehicles(profile, business, template).length
}

function logisticsOperationalTruckFromListing(listing, timestamp = nowIso()) {
  const lifetime = resolveAssetLifetime(
    listing?.acquiredAt || listing?.purchasedAt || listing?.listedAt || timestamp,
    timestamp,
    timestamp,
  )
  const modelId = String(listing?.modelId || '').trim() || crypto.randomUUID()
  return {
    id: String(listing?.vehicleId || listing?.id || crypto.randomUUID()),
    modelId,
    name: String(listing?.name || 'İkinci El Tır'),
    image: logisticsTruckImagePath(modelId, listing?.image),
    tier: normalizedFleetTier(listing?.tier),
    levelRequired: Math.max(1, asInt(listing?.requiredLevel, 1)),
    capacity: Math.max(1, asInt(listing?.capacity, 1)),
    engineKits: Math.max(0, asInt(listing?.engineKits, 0)),
    spareParts: Math.max(0, asInt(listing?.spareParts, 0)),
    cash: Math.max(0, asInt(listing?.cash, 0)),
    incomePerRun: Math.max(1, asInt(listing?.rentPerHour, 1)),
    xpPerRun: Math.max(1, asInt(listing?.xp, 1)),
    upkeepPerRun: Math.max(1, asInt(listing?.upkeepPerRun, 1)),
    fuel: Math.max(0, asInt(listing?.fuel, 0)),
    purchasedAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
    remainingMs: lifetime.remainingMs,
  }
}

function logisticsListingsAsOperationalTrucks(profile, timestamp = nowIso()) {
  const listings = vehicleListingsByTemplate(profile, 'logistics')
  return listings.map((entry) => logisticsOperationalTruckFromListing(entry, timestamp))
}

function logisticsOperationalTrucks(profile, timestamp = nowIso()) {
  const owned = Array.isArray(profile?.logisticsFleet) ? profile.logisticsFleet : []
  const listed = logisticsListingsAsOperationalTrucks(profile, timestamp)
  return [...owned, ...listed]
}

function normalizeLogisticsTruckEntry(entry, timestamp) {
  if (!entry || typeof entry !== 'object') return null
  const modelId = String(entry.modelId || '').trim()
  const spec = LOGISTICS_TRUCK_BY_ID.get(modelId)
  if (!spec) return null
  const lifetime = resolveAssetLifetime(
    entry?.purchasedAt || entry?.acquiredAt || timestamp,
    timestamp,
    timestamp,
  )
  if (lifetime.expired) return null

  return {
    id: String(entry.id || crypto.randomUUID()),
    modelId,
    name: String(entry.name || spec.name).trim() || spec.name,
    image: logisticsTruckImagePath(modelId, entry?.image || spec?.image),
    tier: normalizedFleetTier(entry.tier || spec.tier),
    // Tır istatistiklerini her zaman model kataloğundan eşitle:
    // eski kayıtlar, denge değişimlerinden sonra hatalı değer taşımamalı.
    levelRequired: Math.max(1, asInt(spec.levelRequired, 1)),
    capacity: Math.max(1, asInt(spec.capacity, 1)),
    engineKits: Math.max(1, asInt(spec.engineKits, 1)),
    spareParts: Math.max(1, asInt(spec.spareParts, 1)),
    cash: Math.max(1, asInt(spec.cash, 1)),
    incomePerRun: Math.max(1, asInt(spec.incomePerRun, 1)),
    xpPerRun: Math.max(1, asInt(spec.xpPerRun, 1)),
    upkeepPerRun: Math.max(1, asInt(spec.upkeepPerRun, 1)),
    fuel: Math.max(1, asInt(spec.fuel, 1)),
    purchasedAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
    remainingMs: lifetime.remainingMs,
  }
}

function logisticsFleetCapacity(profile) {
  const trucks = logisticsActiveTrucks(profile)
  return trucks.reduce((sum, truck) => sum + Math.max(0, asInt(truck?.capacity, 0)), 0)
}

function logisticsReservedCapacity(profile) {
  void profile
  return 0
}

function logisticsOwnedTrucks(profile) {
  return Array.isArray(profile?.logisticsFleet) ? profile.logisticsFleet : []
}

function logisticsTruckSlotCapacity(profile) {
  const playerLevel = levelInfoFromXp(profile?.xpTotal || 0).level
  return clamp(playerLevel, 1, LOGISTICS_MAX_TRUCK_COUNT)
}

function logisticsActiveTrucks(profile) {
  const owned = logisticsOwnedTrucks(profile)
  const slotCapacity = logisticsTruckSlotCapacity(profile)
  return owned.slice(0, slotCapacity)
}

function logisticsHourlyIncomeFromTrucks(trucks) {
  return trucks.reduce((sum, truck) => sum + Math.max(0, asInt(truck?.incomePerRun, 0)), 0)
}

function logisticsHourlyXpFromTrucks(trucks) {
  return trucks.reduce((sum, truck) => sum + Math.max(0, asInt(truck?.xpPerRun, 0)), 0)
}

function logisticsFuelNeedPerHourFromTrucks(trucks) {
  let totalFuelNeed = 0
  trucks.forEach((truck, index) => {
    const opLevel = logisticsTruckOperationLevel(truck, index)
    totalFuelNeed += fuelUnitsByOperationLevel(opLevel, LOGISTICS_FUEL_MULTIPLIER)
  })
  return Math.max(0, totalFuelNeed)
}

function logisticsCollectSnapshot(profile, timestamp, options = {}) {
  const multiplier = clamp(Math.trunc(Number(options?.multiplier || 1)), 1, PREMIUM_BULK_MULTIPLIER)
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : weeklyEventState(timestamp)
  const fuelInventory = options?.fuelInventory && typeof options.fuelInventory === 'object'
    ? options.fuelInventory
    : null
  const slotCapacity = logisticsTruckSlotCapacity(profile)
  const activeTrucks = logisticsOperationalTrucks(profile, timestamp).slice(0, slotCapacity)
  const truckCount = activeTrucks.length
  const collectWindow = fleetCollectWindow(profile?.lastLogisticsIncomeCollectedAt || timestamp, timestamp)
  const elapsedCycles = Math.max(0, collectWindow.elapsedCycles)
  const fuelItemId = 'oil'
  const fuelItemName = ITEM_BY_ID.get(fuelItemId)?.name || 'Petrol'
  const hourlyIncome = logisticsHourlyIncomeFromTrucks(activeTrucks)
  const hourlyXp = logisticsHourlyXpFromTrucks(activeTrucks)
  const pendingIncome = elapsedCycles > 0 ? elapsedCycles * hourlyIncome : 0
  const fuelNeedPerHour = logisticsFuelNeedPerHourFromTrucks(activeTrucks)
  const baseFuelNeeded = elapsedCycles > 0 ? elapsedCycles * fuelNeedPerHour : 0
  const fuelNeeded = baseFuelNeeded > 0
    ? weeklyEventCostValue(baseFuelNeeded, timestamp, weeklyEvents, { minPositive: 1, applyDiscount: true })
    : 0
  const fuelAvailable = Math.max(
    0,
    asInt(fuelInventory ? fuelInventory?.[fuelItemId] : getInventoryQuantity(profile, fuelItemId), 0),
  )
  const hasEnoughFuel = fuelNeeded <= 0 || fuelAvailable >= fuelNeeded
  const fuelConsumed = hasEnoughFuel ? fuelNeeded : 0
  const incomeMultiplier = hasEnoughFuel ? 1 : 0
  const grossCash = Math.max(0, Math.floor(pendingIncome * multiplier * incomeMultiplier))
  const baseXpGain = elapsedCycles > 0 ? elapsedCycles * hourlyXp : 0
  const { taxAmount, netCash } = taxAndNetFromGross(grossCash)
  const rawXpGain = Math.max(0, Math.floor(baseXpGain * incomeMultiplier))
  const xpGain = weeklyEventXpGain(rawXpGain, timestamp, weeklyEvents)
  const collectedCount = truckCount > 0 && pendingIncome > 0 && hasEnoughFuel ? 1 : 0
  const collectedUntilMs = collectWindow.lastIncomeMs + elapsedCycles * FLEET_COLLECT_COOLDOWN_MS

  if (fuelInventory) {
    fuelInventory[fuelItemId] = Math.max(0, fuelAvailable - fuelConsumed)
  }

  return {
    truckCount,
    collectIntervalMinutes: Math.round(FLEET_COLLECT_COOLDOWN_MS / MS_MINUTE),
    lastIncomeMs: collectWindow.lastIncomeMs,
    collectedUntilMs,
    collectedUntilAt: new Date(collectedUntilMs).toISOString(),
    nextCollectAt: new Date(collectWindow.lastIncomeMs + FLEET_COLLECT_COOLDOWN_MS).toISOString(),
    elapsedCycles,
    hourlyIncome,
    hourlyXp,
    pendingIncome,
    fuelItemId,
    fuelItemName,
    fuelNeedPerHour,
    fuelNeeded,
    fuelAvailable,
    fuelConsumed,
    grossCash,
    taxAmount,
    netCash,
    xpGain,
    multiplier,
    collectedCount,
  }
}

function scaledLogisticsTruckSpec(baseTruck, truckCount = 0) {
  void truckCount
  return {
    ...baseTruck,
    cash: Math.max(1, asInt(baseTruck?.cash, 1)),
    engineKits: Math.max(1, asInt(baseTruck?.engineKits, 1)),
    spareParts: Math.max(1, asInt(baseTruck?.spareParts, 1)),
    fuel: Math.max(1, asInt(baseTruck?.fuel, 1)),
    capacity: Math.max(1, asInt(baseTruck?.capacity, 1)),
    upkeepPerRun: Math.max(1, asInt(baseTruck?.upkeepPerRun, 1)),
    incomePerRun: Math.max(1, asInt(baseTruck?.incomePerRun, 1)),
    xpPerRun: Math.max(1, asInt(baseTruck?.xpPerRun, 1)),
  }
}

function logisticsFleetView(profile, timestamp = nowIso()) {
  const ownedAll = logisticsOwnedTrucks(profile)
  const owned = logisticsActiveTrucks(profile)
  const playerLevel = levelInfoFromXp(profile?.xpTotal || 0).level
  const truckSlotCapacity = logisticsTruckSlotCapacity(profile)
  const operationalTrucks = logisticsOperationalTrucks(profile, timestamp).slice(0, truckSlotCapacity)
  const operationalTruckCount = operationalTrucks.length
  const totalCapacity = operationalTrucks.reduce((sum, truck) => sum + Math.max(0, asInt(truck?.capacity, 0)), 0)
  const reservedCapacity = logisticsReservedCapacity(profile)
  const availableCapacity = Math.max(0, totalCapacity - reservedCapacity)
  const nowMs = createdMs(timestamp)
  const lastTruckOrderMs = createdMs(profile?.lastTruckOrderedAt || '')
  const nextTruckOrderAt = lastTruckOrderMs > 0
    ? new Date(lastTruckOrderMs + LOGISTICS_TRUCK_ORDER_COOLDOWN_MS).toISOString()
    : ''
  const canOrderTruckNow = !nextTruckOrderAt || nowMs >= createdMs(nextTruckOrderAt)

  return {
    catalog: LOGISTICS_TRUCK_CATALOG.map((truck) => {
      const scaled = scaledLogisticsTruckSpec(truck, owned.length)
      return {
        ...scaled,
        ownedCount: operationalTrucks.filter((entry) => entry.modelId === truck.id).length,
      }
    }),
    owned: owned
      .map((truck) => {
        const lifetime = resolveAssetLifetime(
          truck?.purchasedAt || truck?.acquiredAt || timestamp,
          timestamp,
          timestamp,
        )
        return {
          ...truck,
          purchasedAt: lifetime.acquiredAt,
          expiresAt: lifetime.expiresAt,
          remainingMs: lifetime.remainingMs,
        }
      })
      .sort(
        (a, b) =>
          Math.max(0, asInt(b?.capacity, 0)) - Math.max(0, asInt(a?.capacity, 0)) ||
          createdMs(b.purchasedAt) - createdMs(a.purchasedAt),
      ),
    summary: {
      playerLevel,
      truckSlotCapacity,
      totalCapacity,
      reservedCapacity,
      availableCapacity,
      truckCount: operationalTruckCount,
      storedTruckCount: ownedAll.length,
      slotRemaining: Math.max(0, truckSlotCapacity - operationalTruckCount),
      truckOrderCooldownMinutes: Math.round(LOGISTICS_TRUCK_ORDER_COOLDOWN_MS / MS_MINUTE),
      nextTruckOrderAt,
      canOrderTruckNow: canOrderTruckNow && operationalTruckCount < truckSlotCapacity,
    },
  }
}

function vehicleListingView(profile) {
  const listings = Array.isArray(profile?.vehicleListings) ? profile.vehicleListings : []
  return listings
    .map((entry) => {
      const templateId = normalizeListingTemplateId(entry?.templateId) || String(entry?.templateId || '').trim()
      const modelId = String(entry?.modelId || '').trim()
      const image = templateId === 'logistics'
        ? logisticsTruckImagePath(modelId, entry?.image)
        : String(entry?.image || '').trim()
      const minPrice = Math.max(1, asInt(entry.minPrice, 1))
      const maxPrice = Math.max(minPrice + 1, asInt(entry.maxPrice, minPrice + 1))
      const suggestedPrice = clamp(asInt(entry.suggestedPrice, minPrice), minPrice, maxPrice)
      const price = clamp(Math.max(1, asInt(entry.price, suggestedPrice)), minPrice, maxPrice)
      const commission = listingCommissionPreview(price)
      return {
        id: entry.id,
        businessId: entry.businessId,
        templateId,
        vehicleId: entry.vehicleId,
        modelId,
        name: entry.name,
        tier: normalizedFleetTier(entry.tier),
        image,
        emoji: entry.emoji,
        requiredLevel: Math.max(1, asInt(entry.requiredLevel, 1)),
        rentPerHour: Math.max(1, asInt(entry.rentPerHour, 1)),
        xp: Math.max(1, asInt(entry.xp, 1)),
        capacity: Math.max(1, asInt(entry.capacity, 1)),
        upkeepPerRun: Math.max(1, asInt(entry.upkeepPerRun, 1)),
        engineKits: Math.max(0, asInt(entry.engineKits, 0)),
        spareParts: Math.max(0, asInt(entry.spareParts, 0)),
        cash: Math.max(0, asInt(entry.cash, 0)),
        minPrice,
        maxPrice,
        suggestedPrice,
        price,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        totalCost: commission.totalCost,
        sellerPayout: commission.sellerPayout,
        listedAt: entry.listedAt,
        acquiredAt: String(entry.acquiredAt || entry.listedAt || ''),
        expiresAt: String(entry.expiresAt || ''),
        remainingMs: Math.max(0, asInt(entry.remainingMs, 0)),
        visibility:
          String(entry.visibility || 'public').trim().toLowerCase() === 'custom' ? 'custom' : 'public',
        recipientUserId:
          String(entry.visibility || '').trim().toLowerCase() === 'custom'
            ? String(entry.recipientUserId || '').trim()
            : '',
        sellerUserId: String(entry.sellerUserId || '').trim(),
        sellerName: entry.sellerName,
      }
    })
    .sort((a, b) => createdMs(b.listedAt) - createdMs(a.listedAt))
}

function vehicleListingMarketView(db, viewerUserId = '') {
  const profiles = Array.isArray(db?.gameProfiles) ? db.gameProfiles : []
  const allListings = []

  for (const profile of profiles) {
    allListings.push(...vehicleListingView(profile))
  }

  const safeViewerUserId = String(viewerUserId || '').trim()
  const visibleListings = safeViewerUserId
    ? allListings.filter((listing) => {
        if (!listing || typeof listing !== 'object') return false
        if (String(listing.visibility || 'public').trim().toLowerCase() !== 'custom') return true
        return String(listing.recipientUserId || '').trim() === safeViewerUserId
      })
    : allListings.filter((listing) => {
        if (!listing || typeof listing !== 'object') return false
        return String(listing.visibility || 'public').trim().toLowerCase() !== 'custom'
      })

  return visibleListings
    .sort((a, b) => createdMs(b.listedAt) - createdMs(a.listedAt))
    .slice(0, 240)
}

function createBusinessInstance(templateId, timestamp) {
  const normalizedTemplateId = normalizeBusinessTemplateId(templateId) || FLEET_TEMPLATE_IDS[0]
  const template = BUSINESS_BY_ID.get(normalizedTemplateId) || BUSINESS_TEMPLATES[0]
  const baseBusiness = {
    id: crypto.randomUUID(),
    templateId: normalizedTemplateId,
    name: template.name,
    level: 1,
    storageItemId: template.outputItemId,
    storageAmount: 0,
    storageCapacity: template.storageCapacity,
    lastProducedAt: timestamp,
    lastIncomeCollectedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  if (isFleetBusinessTemplate(template)) {
    const fleetCapacity = fleetCapacityFromPlayerLevel(1, template)
    return {
      ...baseBusiness,
      storageAmount: 0,
      storageCapacity: 1,
      fleetCount: 0,
      fleetCapacity,
      fleetRentTotal: 0,
      fleetXpTotal: 0,
      lastVehicleOrderedAt: '',
      vehicles: [],
    }
  }

  return baseBusiness
}

function createDefaultLeagueState(timestamp) {
  return {
    dayKey: dayKeyFromIso(timestamp),
    weekKey: weekKeyFromIso(timestamp),
    seasonKey: seasonKeyFromIso(timestamp),
    dailyPoints: 0,
    weeklyPoints: 0,
    seasonPoints: 0,
    claimedDailyKey: '',
    claimedWeeklyKey: '',
    claimedSeasonKey: '',
    seasonBadge: null,
    seasonChests: [],
    lastTopRewardSeasonKey: '',
  }
}

function leagueTopRewardConfigForRank(rank, seasonKey = '') {
  const safeRank = Math.max(1, asInt(rank, 1))
  const topConfig = LEAGUE_TOP_RANK_REWARD_BY_RANK[safeRank]
  if (topConfig) {
    return applySeasonRewardMultiplierToConfig({
      ...topConfig,
      rank: safeRank,
    }, seasonKey)
  }
  if (safeRank >= LEAGUE_REGULAR_REWARD_RANK_MIN && safeRank <= LEAGUE_REGULAR_REWARD_RANK_MAX) {
    return applySeasonRewardMultiplierToConfig({
      ...LEAGUE_REGULAR_RANK_REWARD_CONFIG,
      rank: safeRank,
    }, seasonKey)
  }
  return null
}

function leagueTopRewardCatalogView(seasonKey = '') {
  const catalog = LEAGUE_TOP_RANKS.map((rank) => {
    const config = leagueTopRewardConfigForRank(rank, seasonKey)
    if (!config) return null
    return {
      rank: config.rank,
      tier: config.tier,
      chestLabel: config.chestLabel,
      badgeLabel: config.badgeLabel,
      chestIcon: config.chestIcon,
      badgeIcon: config.badgeIcon,
      cashAmount: config.cashAmount,
      resourceAmount: config.resourceAmount,
      rewardMultiplier: config.rewardMultiplier,
      rewardMultiplierMax: config.rewardMultiplierMax,
      resourceIds: LEAGUE_TOP_REWARD_RESOURCE_IDS.slice(),
    }
  }).filter(Boolean)

  const regularConfig = leagueTopRewardConfigForRank(LEAGUE_REGULAR_REWARD_RANK_MIN, seasonKey)
  if (regularConfig) {
    catalog.push({
      rank: LEAGUE_REGULAR_REWARD_RANK_MIN,
      rankMin: LEAGUE_REGULAR_REWARD_RANK_MIN,
      rankMax: LEAGUE_REGULAR_REWARD_RANK_MAX,
      tier: regularConfig.tier,
      chestLabel: regularConfig.chestLabel,
      badgeLabel: regularConfig.badgeLabel,
      chestIcon: regularConfig.chestIcon,
      badgeIcon: regularConfig.badgeIcon,
      cashAmount: regularConfig.cashAmount,
      resourceAmount: regularConfig.resourceAmount,
      rewardMultiplier: regularConfig.rewardMultiplier,
      rewardMultiplierMax: regularConfig.rewardMultiplierMax,
      resourceIds: LEAGUE_TOP_REWARD_RESOURCE_IDS.slice(),
    })
  }

  return catalog
}

function normalizeLeagueSeasonBadge(entry) {
  if (!entry || typeof entry !== 'object') return null

  const rank = Math.max(1, asInt(entry.rank, 0))
  const config = leagueTopRewardConfigForRank(rank)
  if (!config) return null

  const awardedForSeasonKey = normalizeSeasonKey(entry.awardedForSeasonKey)
  const visibleSeasonKey = normalizeSeasonKey(entry.visibleSeasonKey)
  if (!awardedForSeasonKey || !visibleSeasonKey) return null

  const tierRaw = String(entry.tier || config.tier).trim().toLowerCase()
  const tier = ['gold', 'silver', 'bronze', 'common'].includes(tierRaw) ? tierRaw : config.tier
  const label = String(entry.label || config.badgeLabel).trim() || config.badgeLabel
  const icon = String(entry.icon || config.badgeIcon).trim() || config.badgeIcon
  const awardedAt = String(entry.awardedAt || '').trim()

  return {
    rank,
    tier,
    label,
    icon,
    awardedForSeasonKey,
    visibleSeasonKey,
    awardedAt,
  }
}

function seasonBadgeView(entry) {
  const normalized = normalizeLeagueSeasonBadge(entry)
  if (!normalized) return null
  return {
    rank: normalized.rank,
    tier: normalized.tier,
    label: normalized.label,
    icon: normalized.icon,
    awardedForSeasonKey: normalized.awardedForSeasonKey,
    visibleSeasonKey: normalized.visibleSeasonKey,
    awardedAt: normalized.awardedAt,
  }
}

function normalizeLeagueSeasonChestReward(entry) {
  if (!entry || typeof entry !== 'object') return null
  const kindRaw = String(entry.kind || '').trim().toLowerCase()
  if (!['cash', 'item'].includes(kindRaw)) return null

  if (kindRaw === 'cash') {
    const cash = Math.max(1, asInt(entry.cash, 0))
    if (cash <= 0) return null
    return {
      kind: 'cash',
      cash,
      label: String(entry.label || 'Nakit').trim() || 'Nakit',
      icon: String(entry.icon || '/home/icons/depot/cash.webp').trim() || '/home/icons/depot/cash.webp',
      amountText: `+${new Intl.NumberFormat('tr-TR').format(cash)} Nakit`,
    }
  }

  const itemId = normalizeItemId(entry.itemId)
  if (!itemId || !ITEM_BY_ID.has(itemId)) return null
  const quantity = Math.max(1, asInt(entry.quantity, 0))
  if (quantity <= 0) return null
  const itemMeta = ITEM_BY_ID.get(itemId)
  return {
    kind: 'item',
    itemId,
    quantity,
    label: String(entry.label || itemMeta?.name || itemId).trim() || itemId,
    icon: String(entry.icon || itemMeta?.png || '').trim(),
    amountText: `+${new Intl.NumberFormat('tr-TR').format(quantity)} ${String(itemMeta?.name || itemId)}`,
  }
}

function normalizeLeagueSeasonChest(entry, timestamp) {
  if (!entry || typeof entry !== 'object') return null

  const rank = Math.max(1, asInt(entry.rank, 0))
  const seasonKey = normalizeSeasonKey(entry.seasonKey)
  if (!seasonKey) return null
  const config = leagueTopRewardConfigForRank(rank, seasonKey)
  if (!config) return null

  const tierRaw = String(entry.tier || config.tier).trim().toLowerCase()
  const tier = ['gold', 'silver', 'bronze', 'common'].includes(tierRaw) ? tierRaw : config.tier

  const id = String(entry.id || crypto.randomUUID()).trim() || crypto.randomUUID()
  const awardedAt = String(entry.awardedAt || timestamp).trim() || timestamp
  const openedAt = String(entry.openedAt || '').trim()

  return {
    id,
    rank,
    tier,
    seasonKey,
    chestLabel: String(entry.chestLabel || config.chestLabel).trim() || config.chestLabel,
    chestIcon: String(config.chestIcon).trim() || '/home/icons/leaderboard/chest-gold.png',
    cashAmount: Math.max(1, asInt(entry.cashAmount, config.cashAmount)),
    resourceAmount: Math.max(1, asInt(entry.resourceAmount, config.resourceAmount)),
    rewardMultiplier: Math.max(1, asInt(entry.rewardMultiplier, config.rewardMultiplier)),
    rewardMultiplierMax: Math.max(1, asInt(entry.rewardMultiplierMax, config.rewardMultiplierMax)),
    awardedAt,
    openedAt,
    reward: normalizeLeagueSeasonChestReward(entry.reward),
  }
}

function leagueSeasonChestView(entry) {
  const normalized = normalizeLeagueSeasonChest(entry, nowIso())
  if (!normalized) return null
  return {
    id: normalized.id,
    rank: normalized.rank,
    tier: normalized.tier,
    seasonKey: normalized.seasonKey,
    chestLabel: normalized.chestLabel,
    chestIcon: normalized.chestIcon,
    cashAmount: normalized.cashAmount,
    resourceAmount: normalized.resourceAmount,
    rewardMultiplier: normalized.rewardMultiplier,
    rewardMultiplierMax: normalized.rewardMultiplierMax,
    awardedAt: normalized.awardedAt,
    openedAt: normalized.openedAt || '',
    opened: Boolean(normalized.openedAt),
    reward: normalized.reward,
  }
}

function leagueSeasonPrizesView(profile) {
  const activeSeasonKey =
    normalizeSeasonKey(profile?.league?.seasonKey) ||
    seasonKeyFromIso(nowIso())
  const all = Array.isArray(profile?.league?.seasonChests)
    ? profile.league.seasonChests
        .map((entry) => leagueSeasonChestView(entry))
        .filter(Boolean)
        .sort((a, b) => createdMs(b.awardedAt) - createdMs(a.awardedAt))
    : []
  const pending = all
    .filter((entry) => !entry.opened)
    .sort((a, b) => {
      const rankDiff = asInt(a.rank, 0) - asInt(b.rank, 0)
      if (rankDiff !== 0) return rankDiff
      return createdMs(a.awardedAt) - createdMs(b.awardedAt)
    })
  const opened = all
    .filter((entry) => entry.opened)
    .sort((a, b) => createdMs(b.openedAt || b.awardedAt) - createdMs(a.openedAt || a.awardedAt))

  return {
    badge: seasonBadgeView(profile?.league?.seasonBadge),
    pendingCount: pending.length,
    totalCount: all.length,
    pendingChests: pending,
    openedChests: opened,
    rewardCatalog: leagueTopRewardCatalogView(activeSeasonKey),
  }
}

function createLeagueSeasonBadgeAward(rank, awardedForSeasonKey, visibleSeasonKey, timestamp) {
  const config = leagueTopRewardConfigForRank(rank)
  if (!config) return null
  return {
    rank: config.rank,
    tier: config.tier,
    label: config.badgeLabel,
    icon: config.badgeIcon,
    awardedForSeasonKey: normalizeSeasonKey(awardedForSeasonKey),
    visibleSeasonKey: normalizeSeasonKey(visibleSeasonKey),
    awardedAt: timestamp,
  }
}

function createLeagueSeasonChestAward(rank, seasonKey, timestamp) {
  const config = leagueTopRewardConfigForRank(rank, seasonKey)
  if (!config) return null
  return {
    id: crypto.randomUUID(),
    rank: config.rank,
    tier: config.tier,
    seasonKey: normalizeSeasonKey(seasonKey),
    chestLabel: config.chestLabel,
    chestIcon: config.chestIcon,
    cashAmount: config.cashAmount,
    resourceAmount: config.resourceAmount,
    rewardMultiplier: config.rewardMultiplier,
    rewardMultiplierMax: config.rewardMultiplierMax,
    awardedAt: timestamp,
    openedAt: '',
    reward: null,
  }
}

function leagueSeasonTransitionPreviousKey(db, currentSeasonKey) {
  const safeCurrentKey = normalizeSeasonKey(currentSeasonKey)
  if (!safeCurrentKey) return ''

  const counts = new Map()
  for (const profile of db.gameProfiles || []) {
    const key = normalizeSeasonKey(profile?.league?.seasonKey)
    if (!key || key === safeCurrentKey) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const immediatePrevious = shiftSeasonKey(safeCurrentKey, -1)
  if (!immediatePrevious) return ''
  return counts.has(immediatePrevious) ? immediatePrevious : ''
}

function applyLeagueSeasonTopRankRewards(db, fromSeasonKey, toSeasonKey, timestamp) {
  const safeFromSeasonKey = normalizeSeasonKey(fromSeasonKey)
  const safeToSeasonKey = normalizeSeasonKey(toSeasonKey)
  if (!safeFromSeasonKey || !safeToSeasonKey) {
    return { transitioned: false, fromSeasonKey: safeFromSeasonKey, toSeasonKey: safeToSeasonKey, winners: [] }
  }

  const ranked = (db.gameProfiles || [])
    .filter((profile) => {
      if (!profile || typeof profile !== 'object') return false
      const profileSeasonKey = normalizeSeasonKey(profile?.league?.seasonKey)
      return profileSeasonKey === safeFromSeasonKey
    })
    .map((profile) => {
      const user = db.users.find((entry) => entry.id === profile.userId)
      const username = String(user?.username || profile.username || 'Oyuncu').trim() || 'Oyuncu'
      return {
        profile,
        userId: String(profile.userId || '').trim(),
        username,
        seasonPoints: Math.max(0, asInt(profile?.league?.seasonPoints, 0)),
        wallet: Math.max(0, asInt(profile?.wallet, 0)),
        level: Math.max(1, asInt(levelInfoFromXp(profile?.xpTotal || 0)?.level, 1)),
      }
    })
    .sort((left, right) => {
      const pointsDiff = right.seasonPoints - left.seasonPoints
      if (pointsDiff !== 0) return pointsDiff
      const walletDiff = right.wallet - left.wallet
      if (walletDiff !== 0) return walletDiff
      const levelDiff = right.level - left.level
      if (levelDiff !== 0) return levelDiff
      return left.username.localeCompare(right.username, 'tr')
    })

  const uniqueRanked = []
  const seenUserIds = new Set()
  for (const entry of ranked) {
    const safeUserId = String(entry?.userId || '').trim()
    if (!safeUserId || seenUserIds.has(safeUserId)) continue
    seenUserIds.add(safeUserId)
    uniqueRanked.push(entry)
    if (uniqueRanked.length >= LEAGUE_SEASON_REWARD_MAX_RANK) break
  }

  const winners = []
  for (let index = 0; index < uniqueRanked.length; index += 1) {
    const rank = index + 1
    const config = leagueTopRewardConfigForRank(rank, safeFromSeasonKey)
    const entry = uniqueRanked[index]
    if (!config || !entry?.profile) continue

    if (!entry.profile.league || typeof entry.profile.league !== 'object') {
      entry.profile.league = createDefaultLeagueState(timestamp)
      entry.profile.league.seasonKey = safeFromSeasonKey
    }

    const chest = createLeagueSeasonChestAward(rank, safeFromSeasonKey, timestamp)
    if (!Array.isArray(entry.profile.league.seasonChests)) entry.profile.league.seasonChests = []
    if (chest) entry.profile.league.seasonChests.unshift(chest)
    entry.profile.league.seasonChests = entry.profile.league.seasonChests
      .map((item) => normalizeLeagueSeasonChest(item, timestamp))
      .filter(Boolean)
      .sort((a, b) => createdMs(b.awardedAt) - createdMs(a.awardedAt))
    if (LEAGUE_TOP_RANK_SET.has(rank)) {
      entry.profile.league.seasonBadge = createLeagueSeasonBadgeAward(
        rank,
        safeFromSeasonKey,
        safeToSeasonKey,
        timestamp,
      )
    }
    entry.profile.league.lastTopRewardSeasonKey = safeFromSeasonKey

    pushNotification(
      entry.profile,
      'league',
      `${safeFromSeasonKey} sezonunda ${rank}. oldun. ${config.chestLabel} sandığı kazandın!`,
      timestamp,
    )

    winners.push({
      rank,
      userId: entry.userId,
      username: entry.username,
      seasonPoints: entry.seasonPoints,
      tier: config.tier,
      chestLabel: config.chestLabel,
    })
  }

  return {
    transitioned: true,
    fromSeasonKey: safeFromSeasonKey,
    toSeasonKey: safeToSeasonKey,
    winners,
  }
}

function processLeagueSeasonTransition(db, timestamp) {
  const currentSeasonKey = seasonKeyFromIso(timestamp)
  const previousSeasonKey = leagueSeasonTransitionPreviousKey(db, currentSeasonKey)
  if (!previousSeasonKey) {
    return {
      transitioned: false,
      fromSeasonKey: '',
      toSeasonKey: currentSeasonKey,
      winners: [],
    }
  }
  return applyLeagueSeasonTopRankRewards(db, previousSeasonKey, currentSeasonKey, timestamp)
}

function rollLeagueSeasonChestReward(chest) {
  const normalizedChest = normalizeLeagueSeasonChest(chest, nowIso())
  if (!normalizedChest) return null
  const config = leagueTopRewardConfigForRank(normalizedChest.rank, normalizedChest.seasonKey)
  if (!config) return null
  const cashAmount = Math.max(1, asInt(normalizedChest.cashAmount, config.cashAmount))
  const resourceAmount = Math.max(1, asInt(normalizedChest.resourceAmount, config.resourceAmount))

  const resourcePool = LEAGUE_TOP_REWARD_RESOURCE_IDS
    .map((itemId) => normalizeItemId(itemId))
    .filter((itemId) => ITEM_BY_ID.has(itemId))

  const options = [
    { kind: 'cash' },
    ...resourcePool.map((itemId) => ({ kind: 'item', itemId })),
  ]
  if (!options.length) return null

  const selected = options[Math.floor(Math.random() * options.length)] || options[0]
  if (selected.kind === 'cash') {
    return {
      kind: 'cash',
      cash: cashAmount,
      label: 'Nakit',
      icon: '/home/icons/depot/cash.webp',
      amountText: `+${new Intl.NumberFormat('tr-TR').format(cashAmount)} Nakit`,
    }
  }

  const itemDef = ITEM_BY_ID.get(selected.itemId)
  return {
    kind: 'item',
    itemId: selected.itemId,
    quantity: resourceAmount,
    label: String(itemDef?.name || selected.itemId),
    icon: String(itemDef?.png || ''),
    amountText: `+${new Intl.NumberFormat('tr-TR').format(resourceAmount)} ${String(itemDef?.name || selected.itemId)}`,
  }
}

function applyLeagueSeasonChestReward(profile, reward) {
  const normalizedReward = normalizeLeagueSeasonChestReward(reward)
  if (!normalizedReward) return null
  if (normalizedReward.kind === 'cash') {
    profile.wallet += Math.max(0, asInt(normalizedReward.cash, 0))
    return normalizedReward
  }
  addInventory(profile, normalizedReward.itemId, normalizedReward.quantity)
  return normalizedReward
}

function normalizeAuctionEntry(entry, profile, timestamp) {
  if (!entry || typeof entry !== 'object') return null
  const itemId = normalizeItemId(entry.itemId)
  const itemDef = ITEM_BY_ID.get(itemId)
  if (!itemDef) return null

  const sellerUserId = String(entry.sellerUserId || profile?.userId || '').trim()
  if (!sellerUserId || sellerUserId !== profile?.userId) return null

  const quantity = Math.max(1, asInt(entry.quantity, 1))
  const startBid = Math.max(1, asInt(entry.startBid, itemDef.basePrice * quantity))
  const minIncrement = Math.max(1, asInt(entry.minIncrement, Math.max(1, Math.round(startBid * 0.05))))
  const currentBid = Math.max(0, asInt(entry.currentBid, 0))
  const bidCount = Math.max(0, asInt(entry.bidCount, 0))
  const status = String(entry.status || 'active').trim()
  const highestBidderUserId = String(entry.highestBidderUserId || '').trim()

  const safeStatus = ['active', 'ended', 'cancelled'].includes(status) ? status : 'active'
  const endAt = String(entry.endAt || '')
  const hasValidEndAt = !Number.isNaN(new Date(endAt).getTime())

  return {
    id: String(entry.id || crypto.randomUUID()),
    sellerUserId,
    sellerName: String(entry.sellerName || profile?.username || 'Oyuncu').trim() || 'Oyuncu',
      title: String(entry.title || `${itemDef.name} Açık Artırma`).trim() || `${itemDef.name} Açık Artırma`,
    itemId,
    itemName: itemDef.name,
    quantity,
    startBid,
    currentBid,
    minIncrement,
    bidCount,
    highestBidderUserId,
    highestBidderName: String(entry.highestBidderName || '').trim(),
    status: safeStatus,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : timestamp,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : timestamp,
    endAt: hasValidEndAt ? endAt : new Date(Date.now() + 30 * MS_MINUTE).toISOString(),
    warnedAt: typeof entry.warnedAt === 'string' ? entry.warnedAt : '',
    resolvedAt: typeof entry.resolvedAt === 'string' ? entry.resolvedAt : '',
  }
}

function openAuctionView(auction, currentUserId) {
  const minNextBid =
    auction.currentBid > 0
      ? auction.currentBid + auction.minIncrement
      : auction.startBid

  return {
    ...auction,
    minNextBid,
    myAuction: auction.sellerUserId === currentUserId,
    myBid: auction.highestBidderUserId === currentUserId,
  }
}

function getActiveAuctions(db, currentUserId = '') {
  const rows = []
  for (const profile of db.gameProfiles) {
    const list = Array.isArray(profile?.marketAuctions) ? profile.marketAuctions : []
    for (const auction of list) {
      if (!auction || auction.status !== 'active') continue
      rows.push(openAuctionView(auction, currentUserId))
    }
  }

  return rows
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
    .slice(0, 40)
}

function createDefaultPushCenter() {
  return {
    enabled: true,
    subscriptions: {
      priceAlert: true,
      productionFull: true,
      auctionEnding: true,
    },
    priceAlerts: [],
    inbox: [],
    devices: [],
    meta: {
      productionByBusiness: {},
      auctionById: {},
    },
  }
}

function normalizeLeagueState(profile, timestamp) {
  if (!profile.league || typeof profile.league !== 'object') {
    profile.league = createDefaultLeagueState(timestamp)
    return
  }

  const dayKey = dayKeyFromIso(timestamp)
  const weekKey = weekKeyFromIso(timestamp)
  const seasonKey = seasonKeyFromIso(timestamp)

  profile.league.dayKey = String(profile.league.dayKey || dayKey)
  profile.league.weekKey = String(profile.league.weekKey || weekKey)
  profile.league.seasonKey = String(profile.league.seasonKey || seasonKey)

  profile.league.dailyPoints = Math.max(0, asInt(profile.league.dailyPoints, 0))
  profile.league.weeklyPoints = Math.max(0, asInt(profile.league.weeklyPoints, 0))
  profile.league.seasonPoints = Math.max(0, asInt(profile.league.seasonPoints, 0))
  profile.league.claimedDailyKey = String(profile.league.claimedDailyKey || '')
  profile.league.claimedWeeklyKey = String(profile.league.claimedWeeklyKey || '')
  profile.league.claimedSeasonKey = String(profile.league.claimedSeasonKey || '')
  profile.league.lastTopRewardSeasonKey = normalizeSeasonKey(profile.league.lastTopRewardSeasonKey)
  profile.league.seasonBadge = normalizeLeagueSeasonBadge(profile.league.seasonBadge)
  profile.league.seasonChests = Array.isArray(profile.league.seasonChests)
    ? profile.league.seasonChests
        .map((entry) => normalizeLeagueSeasonChest(entry, timestamp))
        .filter(Boolean)
        .sort((a, b) => createdMs(b.awardedAt) - createdMs(a.awardedAt))
    : []

  if (profile.league.dayKey !== dayKey) {
    profile.league.dayKey = dayKey
    profile.league.dailyPoints = 0
    if (profile.league.claimedDailyKey !== dayKey) {
      profile.league.claimedDailyKey = ''
    }
  }

  if (profile.league.weekKey !== weekKey) {
    profile.league.weekKey = weekKey
    profile.league.weeklyPoints = 0
    if (profile.league.claimedWeeklyKey !== weekKey) {
      profile.league.claimedWeeklyKey = ''
    }
  }

  if (profile.league.seasonKey !== seasonKey) {
    profile.league.seasonKey = seasonKey
    profile.league.seasonPoints = 0
    if (profile.league.claimedSeasonKey !== seasonKey) {
      profile.league.claimedSeasonKey = ''
    }
  }

  if (profile.league.seasonBadge && profile.league.seasonBadge.visibleSeasonKey !== seasonKey) {
    profile.league.seasonBadge = null
  }
}

function rollbackLegacyAdminSeasonPack(profile, timestamp) {
  if (!profile || typeof profile !== 'object') return
  const legacyVersion = String(profile.adminSeasonRewardPatchVersion || '').trim()
  if (legacyVersion !== LEGACY_ADMIN_SEASON_REWARD_PATCH_VERSION) return

  if (!profile.league || typeof profile.league !== 'object') {
    profile.adminSeasonRewardPatchVersion = ''
    return
  }

  const activeSeasonKey = normalizeSeasonKey(profile.league.seasonKey) || seasonKeyFromIso(timestamp)
  const legacyRankSet = new Set(LEAGUE_TOP_RANKS)
  profile.league.seasonChests = Array.isArray(profile.league.seasonChests)
    ? profile.league.seasonChests
        .map((entry) => normalizeLeagueSeasonChest(entry, timestamp))
        .filter(Boolean)
        .filter((entry) => {
          if (entry.openedAt) return true
          if (normalizeSeasonKey(entry.seasonKey) !== activeSeasonKey) return true
          return !legacyRankSet.has(Math.max(1, asInt(entry.rank, 0)))
        })
    : []

  const badge = normalizeLeagueSeasonBadge(profile.league.seasonBadge)
  if (
    badge &&
    normalizeSeasonKey(badge.awardedForSeasonKey) === activeSeasonKey &&
    normalizeSeasonKey(badge.visibleSeasonKey) === activeSeasonKey
  ) {
    profile.league.seasonBadge = null
  }

  profile.adminSeasonRewardPatchVersion = ''
}

function normalizePushDevice(entry, timestamp) {
  if (!entry || typeof entry !== 'object') return null

  const token = String(entry.token || '').trim()
  if (token.length < 20) return null

  const platform = String(entry.platform || 'android').trim().toLowerCase()
  const safePlatform =
    platform === 'ios' || platform === 'android' || platform === 'web'
      ? platform
      : 'android'

  const deviceId = String(entry.deviceId || 'unknown-device').trim() || 'unknown-device'
  const appVersion = String(entry.appVersion || '').trim().slice(0, 40)

  return {
    id: String(entry.id || crypto.randomUUID()),
    token,
    platform: safePlatform,
    deviceId: deviceId.slice(0, 120),
    appVersion,
    createdAt: String(entry.createdAt || timestamp),
    updatedAt: String(entry.updatedAt || timestamp),
    lastSeenAt: String(entry.lastSeenAt || timestamp),
  }
}

function normalizePushCenter(profile, timestamp) {
  if (!profile.pushCenter || typeof profile.pushCenter !== 'object') {
    profile.pushCenter = createDefaultPushCenter()
    return
  }

  profile.pushCenter.enabled = profile.pushCenter.enabled !== false
  profile.pushCenter.subscriptions =
    profile.pushCenter.subscriptions && typeof profile.pushCenter.subscriptions === 'object'
      ? profile.pushCenter.subscriptions
      : {}

  profile.pushCenter.subscriptions.priceAlert = profile.pushCenter.subscriptions.priceAlert !== false
  profile.pushCenter.subscriptions.productionFull = profile.pushCenter.subscriptions.productionFull !== false
  profile.pushCenter.subscriptions.auctionEnding = profile.pushCenter.subscriptions.auctionEnding !== false

  profile.pushCenter.priceAlerts = Array.isArray(profile.pushCenter.priceAlerts)
    ? profile.pushCenter.priceAlerts
    : []
  profile.pushCenter.inbox = Array.isArray(profile.pushCenter.inbox)
    ? profile.pushCenter.inbox
        .map((entry) => normalizePushInboxEntry(entry, timestamp))
        .filter(Boolean)
        .sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
        .slice(0, MAX_PUSH_HISTORY)
    : []
  profile.pushCenter.inbox = pruneAlertEntries(
    profile.pushCenter.inbox,
    (entry) => isAlertType(entry?.type),
  ).slice(0, MAX_PUSH_HISTORY)
  profile.pushCenter.devices = Array.isArray(profile.pushCenter.devices)
    ? profile.pushCenter.devices
        .map((entry) => normalizePushDevice(entry, timestamp))
        .filter(Boolean)
        .slice(0, MAX_PUSH_DEVICE_TOKENS)
    : []

  profile.pushCenter.meta =
    profile.pushCenter.meta && typeof profile.pushCenter.meta === 'object'
      ? profile.pushCenter.meta
      : {}
  profile.pushCenter.meta.productionByBusiness =
    profile.pushCenter.meta.productionByBusiness &&
    typeof profile.pushCenter.meta.productionByBusiness === 'object'
      ? profile.pushCenter.meta.productionByBusiness
      : {}
  profile.pushCenter.meta.auctionById =
    profile.pushCenter.meta.auctionById &&
    typeof profile.pushCenter.meta.auctionById === 'object'
      ? profile.pushCenter.meta.auctionById
      : {}
}

function createDefaultProfile(user, timestamp) {
  // Başlangıç paket: yalnızca temel başlangıç kaynakları
  const starterWallet = STARTER_WALLET
  const starterInventory = [
    { itemId: 'oil', quantity: 500 },
    { itemId: 'energy', quantity: 200 },
    { itemId: 'engine-kit', quantity: 3000 },
    { itemId: 'spare-parts', quantity: 3000 },
  ]
  return {
    userId: user.id,
    username: user.username,
    displayName: '',
    wallet: starterWallet,
    bank: STARTER_BANK,
    reputation: STARTER_REPUTATION,
    xpTotal: STARTER_XP,
    energy: STARTER_ENERGY,
    avatarUrl: '',
    avatarType: 'default',
    inventory: starterInventory,
    businesses: FLEET_TEMPLATE_IDS.map((templateId) => createBusinessInstance(templateId, timestamp)),
    factories: createDefaultFactoriesState(timestamp),
    mines: createDefaultMinesState(timestamp),
    missions: createInitialMissions(timestamp, {
      userId: user.id,
      batchIndex: 1,
      level: 1,
      companyLevel: COMPANY_LEVEL_MIN,
      businessCount: FLEET_TEMPLATE_IDS.length,
    }),
    missionsBatchIndex: 1,
    missionsRefreshAvailableAt: '',
    transactions: [
      {
        id: crypto.randomUUID(),
        kind: 'system_init',
        detail: 'Başlangıç paketi hesabınıza tanımlandı.',
        amount: starterWallet,
        balanceAfter: starterWallet,
        createdAt: timestamp,
      },
    ],
    notifications: [
      {
        id: crypto.randomUUID(),
        type: 'info',
        message: `TicarNet'e hoş geldin ${user.username}. Başlangıç paketin tanımlandı: 2.000.000 Nakit, 500 Petrol, 200 Enerji, 3.000 Motor, 3.000 Yedek Parça. Detaylar için buraya tıklayabilirsin.`,
        createdAt: timestamp,
      },
    ],
    limitOrders: [],
    sellListingsDayKey: '',
    sellListingsCountToday: 0,
    shipments: [],
    logisticsFleet: [],
    lastTruckOrderedAt: '',
    lastLogisticsIncomeCollectedAt: '',
    contracts: [],
    marketAuctions: [],
    vehicleListings: [],
    soldItems: [],
    forexPortfolio: createDefaultForexPortfolio(timestamp),
    bankState: createDefaultBankState(),
    businessUnlocks: createDefaultBusinessUnlocks(),
    companyLevel: COMPANY_LEVEL_MIN,
    supportPatchVersion: PLAYER_SUPPORT_PATCH_VERSION,
    factoryEnergyFixVersion: FACTORY_ENERGY_FIX_PATCH_VERSION,
    adminSeasonRewardPatchVersion: '',
    premiumUntil: '',
    league: createDefaultLeagueState(timestamp),
    pushCenter: createDefaultPushCenter(),
    social: {
      friends: [],
      blockedUserIds: [],
    },
    dailyLogin: {
      streakCount: 0,
      lastClaimDayKey: '',
      lastClaimDayStartMs: 0,
      lastClaimDayIndex: -1,
      lastClaimAt: '',
    },
    dailyStore: {
      dayKey: limitedOfferDayKeyFromIso(timestamp),
      purchased: [],
    },
    diamondStore: {
      welcomePackPurchased: false,
      welcomePackPurchasedAt: '',
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function normalizeDiamondStore(profile) {
  if (!profile || typeof profile !== 'object') return
  if (!profile.diamondStore || typeof profile.diamondStore !== 'object') {
    profile.diamondStore = {
      welcomePackPurchased: false,
      welcomePackPurchasedAt: '',
    }
    return
  }
  profile.diamondStore.welcomePackPurchased = profile.diamondStore.welcomePackPurchased === true
  profile.diamondStore.welcomePackPurchasedAt =
    typeof profile.diamondStore.welcomePackPurchasedAt === 'string'
      ? profile.diamondStore.welcomePackPurchasedAt
      : ''
  if (!profile.diamondStore.welcomePackPurchased) {
    profile.diamondStore.welcomePackPurchasedAt = ''
  }
}

function diamondStoreView(profile) {
  normalizeDiamondStore(profile)
  return {
    welcomePackPurchased: profile?.diamondStore?.welcomePackPurchased === true,
    welcomePackPurchasedAt: String(profile?.diamondStore?.welcomePackPurchasedAt || '').trim(),
  }
}

function normalizeProfile(profile, timestamp) {
  profile.wallet = Math.max(0, asInt(profile.wallet, STARTER_WALLET))
  profile.bank = Math.max(0, asInt(profile.bank, STARTER_BANK))
  normalizeBankState(profile, timestamp)
  profile.reputation = Math.max(0, asInt(profile.reputation, STARTER_REPUTATION))
  profile.xpTotal = xpTotalToString(profile.xpTotal ?? STARTER_XP)
  const playerLevel = levelInfoFromXp(profile.xpTotal).level
  profile.energy = clamp(asInt(profile.energy, STARTER_ENERGY), 0, 100)
  profile.businessUnlocks = normalizeBusinessUnlocks(profile.businessUnlocks)
  const unlockedCount = COMPANY_UNLOCK_FLOW.reduce(
    (sum, entry) => sum + (isCompanyUnlockEntryUnlocked(profile, entry) ? 1 : 0),
    0,
  )
  const minimumCompanyLevel = Math.max(COMPANY_LEVEL_MIN, unlockedCount)
  profile.companyLevel = clamp(
    asInt(profile.companyLevel, minimumCompanyLevel),
    minimumCompanyLevel,
    COMPANY_LEVEL_MAX,
  )
  profile.avatarUrl = normalizeAvatarUrl(profile.avatarUrl)
  const rawAvatarType = String(profile.avatarType || '').trim()
  profile.avatarType = ['default', 'url', 'upload'].includes(rawAvatarType)
    ? rawAvatarType
    : profile.avatarUrl
      ? 'url'
      : 'default'
  if (!profile.avatarUrl) {
    profile.avatarType = 'default'
  } else if (profile.avatarType === 'upload' && !isUploadedAvatarUrl(profile.avatarUrl)) {
    profile.avatarType = 'url'
  }
  const normalizedDisplayName = normalizeDisplayName(profile.displayName)
  profile.displayName = validateDisplayName(normalizedDisplayName) ? '' : normalizedDisplayName
  ensureSocialState(profile)
  profile.inventory = normalizeInventoryEntries(profile.inventory)
  profile.factories = normalizeFactoriesState(profile.factories, timestamp)
  profile.mines = normalizeMinesState(profile.mines, timestamp)
  profile.supportPatchVersion = String(profile.supportPatchVersion || '').trim()
  profile.factoryEnergyFixVersion = String(profile.factoryEnergyFixVersion || '').trim()
  profile.adminSeasonRewardPatchVersion = String(profile.adminSeasonRewardPatchVersion || '').trim()
  profile.premiumUntil = typeof profile.premiumUntil === 'string' ? profile.premiumUntil : ''
  if (profile.premiumUntil) {
    const premiumUntilMs = new Date(profile.premiumUntil).getTime()
    if (Number.isNaN(premiumUntilMs)) {
      profile.premiumUntil = ''
    }
  }
  if (profile.supportPatchVersion !== PLAYER_SUPPORT_PATCH_VERSION) {
    // Eski toplu kaynak yükseltmeleri kaldırıldı.
    profile.supportPatchVersion = PLAYER_SUPPORT_PATCH_VERSION
  }
  if (profile.factoryEnergyFixVersion !== FACTORY_ENERGY_FIX_PATCH_VERSION) {
    // Eski enerji telafi yaması kaldırıldı.
    profile.factoryEnergyFixVersion = FACTORY_ENERGY_FIX_PATCH_VERSION
  }
  if (!profile.dailyStore || typeof profile.dailyStore !== 'object') {
    profile.dailyStore = {
      dayKey: limitedOfferDayKeyFromIso(timestamp),
      purchased: [],
    }
  } else {
    const todayKey = limitedOfferDayKeyFromIso(timestamp)
    profile.dailyStore.dayKey = String(profile.dailyStore.dayKey || todayKey)
    if (!Array.isArray(profile.dailyStore.purchased)) {
      profile.dailyStore.purchased = []
    }
    if (profile.dailyStore.dayKey !== todayKey) {
      profile.dailyStore.dayKey = todayKey
      profile.dailyStore.purchased = []
    }
  }
  normalizeDailyLoginState(profile)
  dailyLoginSync(profile, timestamp)
  normalizeDiamondStore(profile)
  const rawBusinesses = Array.isArray(profile.businesses) ? profile.businesses : []
  const candidateByTemplateId = new Map()
  profile.transactions = Array.isArray(profile.transactions) ? profile.transactions : []
  profile.transactions = profile.transactions
    .sort((a, b) => createdMs(b?.createdAt) - createdMs(a?.createdAt))
    .slice(0, MAX_TRANSACTION_HISTORY)
  profile.notifications = Array.isArray(profile.notifications)
    ? profile.notifications
        .map((entry) => normalizeProfileNotificationEntry(entry, timestamp))
        .filter(Boolean)
        .sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
        .slice(0, MAX_NOTIFICATION_HISTORY)
    : []
  profile.notifications = pruneAlertEntries(
    profile.notifications,
    (entry) => isAlertType(entry?.type),
  ).slice(0, MAX_NOTIFICATION_HISTORY)

  // Mission slots:
  // - Active missions never expire while unfinished.
  // - Claimed missions stay visible for 4 hours.
  // - When a claimed mission cooldown ends, that single mission slot is replaced.
  {
    const nowMs = Math.max(0, createdMs(timestamp))
    profile.missionsBatchIndex = Math.max(1, asInt(profile.missionsBatchIndex, 1))
    profile.missionsRefreshAvailableAt =
      typeof profile.missionsRefreshAvailableAt === 'string'
        ? profile.missionsRefreshAvailableAt
        : ''
    if (profile.missionsRefreshAvailableAt && createdMs(profile.missionsRefreshAvailableAt) <= 0) {
      profile.missionsRefreshAvailableAt = ''
    }

    profile.missions = normalizeMissions(profile.missions, timestamp, {
      maxCount: MISSION_BATCH_SIZE,
    })

    const missionContext = {
      userId: profile.userId,
      level: Math.max(1, asInt(playerLevel, 1)),
      companyLevel: Math.max(COMPANY_LEVEL_MIN, asInt(profile.companyLevel, COMPANY_LEVEL_MIN)),
      businessCount: Array.isArray(profile.businesses) ? profile.businesses.length : 0,
    }
    const hasValidMissionBatch = profile.missions.length === MISSION_BATCH_SIZE

    if (!hasValidMissionBatch) {
      const preservedMissions = Array.isArray(profile.missions)
        ? profile.missions.slice(0, MISSION_BATCH_SIZE)
        : []

      if (preservedMissions.length === 0) {
        profile.missions = createInitialMissions(timestamp, {
          ...missionContext,
          batchIndex: profile.missionsBatchIndex,
        })
      } else {
        const existingMissionIds = new Set(
          preservedMissions
            .map((entry) => String(entry?.id || '').trim())
            .filter(Boolean),
        )
        const existingBlueprintIds = preservedMissions
          .map((entry) => String(entry?.blueprintId || '').trim())
          .filter(Boolean)
        const existingBlueprintSet = new Set(existingBlueprintIds)
        const missingCount = Math.max(0, MISSION_BATCH_SIZE - preservedMissions.length)

        for (let slot = 0; slot < missingCount; slot += 1) {
          let appendedMission = null
          for (let attempt = 0; attempt < 30; attempt += 1) {
            profile.missionsBatchIndex += 1
            const candidate = createInitialMissions(timestamp, {
              ...missionContext,
              batchIndex: profile.missionsBatchIndex,
              count: 1,
              previousBlueprintIds: existingBlueprintIds,
            })[0]
            if (!candidate) continue

            const candidateBlueprintId = String(candidate?.blueprintId || '').trim()
            if (!candidateBlueprintId) continue
            if (existingBlueprintSet.has(candidateBlueprintId)) continue

            const candidateId = String(candidate?.id || '').trim()
            const safeCandidateId =
              candidateId && !existingMissionIds.has(candidateId)
                ? candidateId
                : `mission-${profile.missionsBatchIndex}-${`${preservedMissions.length + 1}`.padStart(2, '0')}-${candidateBlueprintId}`
            appendedMission = {
              ...candidate,
              id: safeCandidateId,
            }
            break
          }

          if (!appendedMission) break
          preservedMissions.push(appendedMission)
          existingMissionIds.add(String(appendedMission.id || '').trim())
          const appendedBlueprintId = String(appendedMission.blueprintId || '').trim()
          if (appendedBlueprintId) {
            existingBlueprintIds.push(appendedBlueprintId)
            existingBlueprintSet.add(appendedBlueprintId)
          }
        }

        profile.missions = preservedMissions
      }
      profile.missionsRefreshAvailableAt = ''
    } else {
      let nextRefreshAtMs = 0

      for (let missionIndex = 0; missionIndex < profile.missions.length; missionIndex += 1) {
        const mission = profile.missions[missionIndex]
        const status = String(mission?.status || '').trim().toLowerCase()
        if (status !== 'claimed') continue

        const claimedAtMs =
          createdMs(mission?.claimedAt || '') ||
          createdMs(mission?.updatedAt || '') ||
          createdMs(mission?.createdAt || '')
        if (claimedAtMs <= 0) continue

        const refreshAtMs = claimedAtMs + MISSION_BATCH_COOLDOWN_MS
        if (nowMs < refreshAtMs) {
          nextRefreshAtMs = nextRefreshAtMs <= 0 ? refreshAtMs : Math.min(nextRefreshAtMs, refreshAtMs)
          continue
        }

        const previousBlueprintId = String(mission?.blueprintId || '').trim()
        const excludedBlueprintIds = new Set(
          profile.missions
            .filter((_, index) => index !== missionIndex)
            .map((entry) => String(entry?.blueprintId || '').trim())
            .filter(Boolean),
        )

        let replacement = null
        for (let attempt = 0; attempt < 30; attempt += 1) {
          profile.missionsBatchIndex += 1
          const candidate = createInitialMissions(timestamp, {
            ...missionContext,
            batchIndex: profile.missionsBatchIndex,
            count: 1,
            previousBlueprintIds: previousBlueprintId ? [previousBlueprintId] : [],
          })[0]
          if (!candidate) continue

          const candidateBlueprintId = String(candidate?.blueprintId || '').trim()
          if (!candidateBlueprintId) continue
          if (previousBlueprintId && candidateBlueprintId === previousBlueprintId) continue
          if (excludedBlueprintIds.has(candidateBlueprintId)) continue
          replacement = candidate
          break
        }

        if (replacement) {
          profile.missions[missionIndex] = replacement
        }
      }

      profile.missionsRefreshAvailableAt =
        nextRefreshAtMs > 0 ? new Date(nextRefreshAtMs).toISOString() : ''
    }

    if (Object.prototype.hasOwnProperty.call(profile, 'missionsCycleKey')) {
      delete profile.missionsCycleKey
    }
    if (Object.prototype.hasOwnProperty.call(profile, 'missionsDifficultyMultiplier')) {
      delete profile.missionsDifficultyMultiplier
    }
  }
  profile.limitOrders = Array.isArray(profile.limitOrders) ? profile.limitOrders : []
  profile.shipments = Array.isArray(profile.shipments) ? profile.shipments : []
  profile.shipments = []
  profile.logisticsFleet = Array.isArray(profile.logisticsFleet)
    ? profile.logisticsFleet
        .map((entry) => normalizeLogisticsTruckEntry(entry, timestamp))
        .filter(Boolean)
    : []
  profile.contracts = Array.isArray(profile.contracts) ? profile.contracts : []
  profile.marketAuctions = Array.isArray(profile.marketAuctions)
    ? profile.marketAuctions
    : []
  profile.vehicleListings = Array.isArray(profile.vehicleListings)
    ? profile.vehicleListings
        .map((entry) => normalizeVehicleListingEntry(entry, profile, timestamp))
        .filter(Boolean)
    : []
  profile.soldItems = Array.isArray(profile.soldItems)
    ? profile.soldItems.slice(-50)
    : []
  normalizeForexPortfolio(profile, timestamp)
  profile.lastTruckOrderedAt =
    typeof profile.lastTruckOrderedAt === 'string' ? profile.lastTruckOrderedAt : ''
  profile.lastLogisticsIncomeCollectedAt =
    typeof profile.lastLogisticsIncomeCollectedAt === 'string'
      ? profile.lastLogisticsIncomeCollectedAt
      : ''
  const truckBaselineMs = createdMs(profile.lastTruckOrderedAt || '')
  const lastLogisticsMs = createdMs(profile.lastLogisticsIncomeCollectedAt || '')
  if (
    profile.logisticsFleet.length > 0 &&
    truckBaselineMs > 0 &&
    (!profile.lastLogisticsIncomeCollectedAt || lastLogisticsMs === truckBaselineMs)
  ) {
    profile.lastLogisticsIncomeCollectedAt = new Date(
      Math.max(0, truckBaselineMs - FLEET_COLLECT_COOLDOWN_MS),
    ).toISOString()
  }

  for (const rawBusiness of rawBusinesses) {
    if (!rawBusiness || typeof rawBusiness !== 'object') continue
    const templateId = normalizeBusinessTemplateId(rawBusiness.templateId)
    if (!templateId) continue
    if (!FLEET_TEMPLATE_SET.has(templateId)) continue

    const template = BUSINESS_BY_ID.get(templateId)
    if (!template) continue

    const current = candidateByTemplateId.get(templateId)
    const currentLevel = asInt(current?.level, 0)
    const rawLevel = asInt(rawBusiness.level, 0)
    if (!current || rawLevel > currentLevel) {
      candidateByTemplateId.set(templateId, {
        ...rawBusiness,
        templateId,
      })
    }
  }

  profile.businesses = FLEET_TEMPLATE_IDS.map((templateId) => {
    const template = BUSINESS_BY_ID.get(templateId)
    const source = candidateByTemplateId.get(templateId)
    if (!template) return null

    const created = createBusinessInstance(templateId, timestamp)
    if (!source) {
      normalizeFleetBusinessState(created, template, timestamp, playerLevel)
      return created
    }

    const nextBusiness = {
      ...created,
      ...source,
      id: String(source.id || created.id),
      templateId,
      name: template.name,
      storageItemId: template.outputItemId,
      lastProducedAt:
        typeof source.lastProducedAt === 'string' ? source.lastProducedAt : created.lastProducedAt,
      lastIncomeCollectedAt:
        typeof source.lastIncomeCollectedAt === 'string'
          ? source.lastIncomeCollectedAt
          : created.lastIncomeCollectedAt,
      lastVehicleOrderedAt:
        typeof source.lastVehicleOrderedAt === 'string'
          ? source.lastVehicleOrderedAt
          : created.lastVehicleOrderedAt,
      createdAt: typeof source.createdAt === 'string' ? source.createdAt : created.createdAt,
      updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : created.updatedAt,
    }
    normalizeFleetBusinessState(nextBusiness, template, timestamp, playerLevel)
    return nextBusiness
  }).filter(Boolean)

  for (const templateId of FLEET_TEMPLATE_IDS) {
    const businessEntry = profile.businesses.find((entry) => entry.templateId === templateId)
    if (!businessEntry) continue
    const hasActiveFleet = Math.max(0, asInt(businessEntry.fleetCount, 0)) > 0
    const hasListedFleet = Array.isArray(profile.vehicleListings) &&
      profile.vehicleListings.some((entry) => entry?.templateId === templateId)
    if (hasActiveFleet || hasListedFleet) {
      profile.businessUnlocks[templateId] = true
    }
  }

  if (profile.logisticsFleet.length > 0 || profile.shipments.length > 0) {
    profile.businessUnlocks.logistics = true
  }
  if (Array.isArray(profile.vehicleListings) && profile.vehicleListings.some((entry) => entry?.templateId === 'logistics')) {
    profile.businessUnlocks.logistics = true
  }

  const vehicleIds = new Set(
    profile.businesses.flatMap((business) =>
      Array.isArray(business?.vehicles) ? business.vehicles.map((vehicle) => String(vehicle?.id || '').trim()) : []),
  )
  const truckIds = new Set(
    Array.isArray(profile.logisticsFleet)
      ? profile.logisticsFleet.map((truck) => String(truck?.id || '').trim())
      : [],
  )
  profile.vehicleListings = profile.vehicleListings.filter(
    (entry) => !vehicleIds.has(entry.vehicleId) && !truckIds.has(entry.vehicleId),
  )

  profile.limitOrders = profile.limitOrders
    .map((entry) => ({ ...entry, itemId: normalizeItemId(entry.itemId) }))
    .filter((entry) => ITEM_BY_ID.has(entry.itemId))
  profile.shipments = profile.shipments
    .map((entry) => {
      const itemId = normalizeItemId(entry.itemId)
      const itemName = ITEM_BY_ID.get(itemId)?.name || entry.itemName || itemId
      return { ...entry, itemId, itemName }
    })
    .filter((entry) => ITEM_BY_ID.has(entry.itemId))
  profile.contracts = profile.contracts
    .map((entry) => ({ ...entry, itemId: normalizeItemId(entry.itemId) }))
    .filter((entry) => ITEM_BY_ID.has(entry.itemId))
  profile.marketAuctions = profile.marketAuctions
    .map((entry) => normalizeAuctionEntry(entry, profile, timestamp))
    .filter(Boolean)
    .slice(0, AUCTION_HISTORY_LIMIT)

  normalizeLeagueState(profile, timestamp)
  rollbackLegacyAdminSeasonPack(profile, timestamp)
  normalizePushCenter(profile, timestamp)
  profile.pushCenter.priceAlerts = profile.pushCenter.priceAlerts
    .map((entry) => ({ ...entry, itemId: normalizeItemId(entry.itemId) }))
    .filter((entry) => ITEM_BY_ID.has(entry.itemId))
  tickFactories(profile, timestamp)
}

function ensureGameRoot(db, timestamp) {
  if (!db.marketState || !Array.isArray(db.marketState.items)) {
    db.marketState = createInitialMarketState(timestamp)
  }
  db.marketState = normalizeMarketState(db.marketState, timestamp)
  if (!db.forexState || !Array.isArray(db.forexState.pairs)) {
    db.forexState = createInitialForexState(timestamp)
  }
  db.forexState = normalizeForexState(db.forexState, timestamp)
  ensureDirectMessagesRoot(db, timestamp)
  ensureFriendRequestsRoot(db)

  if (!Array.isArray(db.gameProfiles)) {
    db.gameProfiles = []
  }
  if (!Array.isArray(db.globalAnnouncements)) {
    db.globalAnnouncements = []
  }
}

function ensureProfile(db, userId, timestamp, options = {}) {
  const user = db.users.find((item) => item.id === userId)
  if (!user) return null

  let profile = db.gameProfiles.find((item) => item.userId === userId)
  if (!profile) {
    profile = createDefaultProfile(user, timestamp)
    db.gameProfiles.push(profile)
  }

  const markActive = options.markActive !== false
  if (markActive) {
    profile.lastSeenAt = timestamp
  } else if (!profile.lastSeenAt) {
    profile.lastSeenAt = String(profile.updatedAt || profile.createdAt || timestamp)
  }

  normalizeProfile(profile, timestamp)
  syncBusinessCountMission(profile.missions, profile.businesses.length, timestamp)

  return profile
}

function normalizeAllProfiles(db, timestamp, options = {}) {
  if (!Array.isArray(db.gameProfiles)) {
    db.gameProfiles = []
    return
  }

  if (options.skipSeasonTransition !== true) {
    processLeagueSeasonTransition(db, timestamp)
  }

  for (const profile of db.gameProfiles) {
    if (!profile || typeof profile !== 'object') continue
    normalizeProfile(profile, timestamp)
    syncBusinessCountMission(profile.missions, profile.businesses.length, timestamp)
  }
}

function getInventoryQuantity(profile, itemId) {
  const inventory = Array.isArray(profile?.inventory) ? profile.inventory : []
  const entry = inventory.find((item) => item.itemId === itemId)
  return entry ? Math.max(0, asInt(entry.quantity, 0)) : 0
}

function addInventory(profile, itemId, quantity) {
  if (!profile || typeof profile !== 'object') return
  if (!Array.isArray(profile.inventory)) profile.inventory = []
  const safeQuantity = Math.max(0, asInt(quantity, 0))
  if (safeQuantity <= 0) return
  const entry = profile.inventory.find((item) => item.itemId === itemId)

  if (!entry) {
    profile.inventory.push({ itemId, quantity: safeQuantity })
    return
  }

  entry.quantity = Math.max(0, asInt(entry.quantity, 0)) + safeQuantity
}

function removeInventory(profile, itemId, quantity) {
  if (!profile || typeof profile !== 'object') return false
  if (!Array.isArray(profile.inventory)) profile.inventory = []
  const safeQuantity = Math.max(0, asInt(quantity, 0))
  if (safeQuantity <= 0) return true

  const entry = profile.inventory.find((item) => item.itemId === itemId)
  const available = Math.max(0, asInt(entry?.quantity, 0))
  if (!entry || available < safeQuantity) {
    return false
  }

  entry.quantity = Math.max(0, available - safeQuantity)

  if (entry.quantity <= 0) {
    profile.inventory = profile.inventory.filter((item) => item.itemId !== itemId)
  }

  return true
}

function pushTransaction(profile, payload, timestamp) {
  profile.transactions.unshift({
    id: crypto.randomUUID(),
    kind: payload.kind,
    detail: payload.detail,
    amount: payload.amount,
    balanceAfter: profile.wallet,
    createdAt: timestamp,
  })

  profile.transactions = profile.transactions.slice(0, MAX_TRANSACTION_HISTORY)
  emitMessageCenterRefresh(profile.userId, 'transaction')
}

function pushNotification(profile, type, message, timestamp) {
  if (!Array.isArray(profile.notifications)) profile.notifications = []
  const safeType = String(type || 'other').trim() || 'other'
  const safeMessage = String(message || '').replace(/\s+/g, ' ').trim()
  if (!safeMessage) return
  const nowMs = createdMs(timestamp) || Date.now()

  let updatedExisting = false

  if (safeType === 'business') {
    const prefix = safeMessage.includes(' satın')
      ? String(safeMessage.split(' satın')[0] || '').trim()
      : safeMessage
    if (prefix) {
      const existingBusiness = profile.notifications.find((entry) =>
        String(entry?.type || '').trim() === 'business' &&
        String(entry?.message || '').trim().startsWith(prefix),
      )
      if (existingBusiness) {
        existingBusiness.message = safeMessage
        existingBusiness.read = false
        existingBusiness.createdAt = timestamp
        updatedExisting = true
      }
    }
  }

  if (!updatedExisting) {
    const duplicate = profile.notifications.find((entry) => {
      if (!entry || typeof entry !== 'object') return false
      if (String(entry.type || '').trim() !== safeType) return false
      if (String(entry.message || '').replace(/\s+/g, ' ').trim() !== safeMessage) return false
      const entryMs = createdMs(entry.createdAt)
      if (entryMs <= 0) return false
      return Math.abs(nowMs - entryMs) <= NOTIFICATION_DEDUPE_WINDOW_MS
    })
    if (duplicate) {
      duplicate.read = false
      duplicate.createdAt = timestamp
      updatedExisting = true
    }
  }

  if (!updatedExisting) {
    profile.notifications.unshift({
      id: crypto.randomUUID(),
      type: safeType,
      message: safeMessage,
      read: false,
      createdAt: timestamp,
    })
  }
  profile.notifications = profile.notifications
    .sort((a, b) => createdMs(b?.createdAt) - createdMs(a?.createdAt))
    .slice(0, MAX_NOTIFICATION_HISTORY)
  profile.notifications = pruneAlertEntries(
    profile.notifications,
    (entry) => isAlertType(entry?.type),
  ).slice(0, MAX_NOTIFICATION_HISTORY)
  emitMessageCenterRefresh(profile.userId, 'notification')
}

function trimProfileMessageHistories(profile, timestamp) {
  if (!profile || typeof profile !== 'object') {
    return {
      transactionsTrimmed: 0,
      notificationsTrimmed: 0,
      pushInboxTrimmed: 0,
    }
  }

  const beforeTransactions = Array.isArray(profile.transactions) ? profile.transactions.length : 0
  profile.transactions = Array.isArray(profile.transactions)
    ? profile.transactions
        .filter((entry) => entry && typeof entry === 'object')
        .sort((a, b) => createdMs(b?.createdAt) - createdMs(a?.createdAt))
        .slice(0, MAX_TRANSACTION_HISTORY)
    : []
  const afterTransactions = profile.transactions.length

  const beforeNotifications = Array.isArray(profile.notifications) ? profile.notifications.length : 0
  profile.notifications = Array.isArray(profile.notifications)
    ? profile.notifications
        .map((entry) => normalizeProfileNotificationEntry(entry, timestamp))
        .filter(Boolean)
        .sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
        .slice(0, MAX_NOTIFICATION_HISTORY)
    : []
  profile.notifications = pruneAlertEntries(
    profile.notifications,
    (entry) => isAlertType(entry?.type),
  ).slice(0, MAX_NOTIFICATION_HISTORY)
  const afterNotifications = profile.notifications.length

  if (!profile.pushCenter || typeof profile.pushCenter !== 'object') {
    profile.pushCenter = createDefaultPushCenter()
  }
  const beforePushInbox = Array.isArray(profile.pushCenter.inbox) ? profile.pushCenter.inbox.length : 0
  profile.pushCenter.inbox = Array.isArray(profile.pushCenter.inbox)
    ? profile.pushCenter.inbox
        .map((entry) => normalizePushInboxEntry(entry, timestamp))
        .filter(Boolean)
        .sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
        .slice(0, MAX_PUSH_HISTORY)
    : []
  profile.pushCenter.inbox = pruneAlertEntries(
    profile.pushCenter.inbox,
    (entry) => isAlertType(entry?.type),
  ).slice(0, MAX_PUSH_HISTORY)
  const afterPushInbox = profile.pushCenter.inbox.length

  return {
    transactionsTrimmed: Math.max(0, beforeTransactions - afterTransactions),
    notificationsTrimmed: Math.max(0, beforeNotifications - afterNotifications),
    pushInboxTrimmed: Math.max(0, beforePushInbox - afterPushInbox),
  }
}

function addLeaguePoints(profile, points) {
  const safePoints = Math.max(0, asInt(points, 0))
  if (safePoints <= 0) return
  profile.league.dailyPoints += safePoints
  profile.league.weeklyPoints += safePoints
  /* Sezon puanı ayrı bir metrik: sadece addSeasonPoints ile artmalı. */
}

function addSeasonPoints(profile, points) {
  const safePoints = Math.max(0, asInt(points, 0))
  if (safePoints <= 0) return
  if (!profile.league || typeof profile.league !== 'object') {
    profile.league = {
      dailyPoints: 0,
      weeklyPoints: 0,
      seasonPoints: 0,
    }
  }
  profile.league.seasonPoints = Math.max(0, asInt(profile.league.seasonPoints, 0)) + safePoints
}

function getActivePushTokens(profile) {
  return (profile.pushCenter?.devices || [])
    .filter((entry) => entry && entry.token)
    .map((entry) => String(entry.token || '').trim())
    .filter((token) => token.length >= 20)
}

async function dropInvalidPushTokens(userId, invalidTokens) {
  if (!userId || !Array.isArray(invalidTokens) || invalidTokens.length === 0) return
  const blocked = new Set(invalidTokens.map((token) => String(token || '').trim()).filter(Boolean))
  if (blocked.size === 0) return

  await updateDb((db) => {
    const profile = db.gameProfiles.find((entry) => entry.userId === userId)
    if (!profile) return db

    normalizePushCenter(profile, nowIso())
    profile.pushCenter.devices = profile.pushCenter.devices.filter(
      (entry) => !blocked.has(String(entry.token || '').trim()),
    )
    return db
  })
}

function dispatchNativePush(profile, type, title, message, timestamp, meta = {}) {
  const tokens = getActivePushTokens(profile)
  if (tokens.length === 0) return

  void sendMobilePushToTokens(tokens, {
    type,
    title,
    message,
    createdAt: timestamp,
    meta,
  })
    .then((result) => {
      if (result?.invalidTokens?.length) {
        void dropInvalidPushTokens(profile.userId, result.invalidTokens)
      }
    })
    .catch((error) => {
      console.error('[PUSH] Mobil bildirim g\u00f6nderilemedi:', error)
    })
}

function pushMobileAlert(profile, type, title, message, timestamp, meta = {}) {
  if (!profile.pushCenter?.enabled) return
  if (!profile.pushCenter.subscriptions?.[type]) return
  if (!Array.isArray(profile.pushCenter.inbox)) profile.pushCenter.inbox = []
  const safeType = String(type || '').trim()
  const safeTitle = String(title || 'Bildirim').replace(/\s+/g, ' ').trim() || 'Bildirim'
  const safeMessage = String(message || '').replace(/\s+/g, ' ').trim()
  if (!safeType || !safeMessage) return
  const nowMs = createdMs(timestamp) || Date.now()

  const duplicate = (profile.pushCenter.inbox || []).find((entry) => {
    if (!entry || typeof entry !== 'object') return false
    if (String(entry.type || '').trim() !== safeType) return false
    if (String(entry.title || '').replace(/\s+/g, ' ').trim() !== safeTitle) return false
    if (String(entry.message || '').replace(/\s+/g, ' ').trim() !== safeMessage) return false
    const entryMs = createdMs(entry.createdAt)
    if (entryMs <= 0) return false
    return Math.abs(nowMs - entryMs) <= PUSH_ALERT_DEDUPE_WINDOW_MS
  })

  if (duplicate) {
    duplicate.read = false
    duplicate.createdAt = timestamp
    duplicate.meta = meta && typeof meta === 'object' ? meta : {}
  } else {
    profile.pushCenter.inbox.unshift({
      id: crypto.randomUUID(),
      type: safeType,
      title: safeTitle,
      message: safeMessage,
      read: false,
      createdAt: timestamp,
      meta: meta && typeof meta === 'object' ? meta : {},
    })
  }
  profile.pushCenter.inbox = pruneAlertEntries(
    profile.pushCenter.inbox,
    (entry) => isAlertType(entry?.type),
  ).slice(0, MAX_PUSH_HISTORY)
  emitMessageCenterRefresh(profile.userId, 'push')
  dispatchNativePush(profile, safeType, safeTitle, safeMessage, timestamp, meta)
}

function tickPriceAlerts(profile, marketState, timestamp) {
  for (const alert of profile.pushCenter.priceAlerts) {
    if (!alert || alert.active === false) continue
    const item = marketState.items.find((entry) => entry.id === alert.itemId)
    if (!item) continue

    const shouldTrigger =
      alert.direction === 'above'
        ? item.price >= alert.targetPrice
        : item.price <= alert.targetPrice

    if (!shouldTrigger) continue

    alert.active = false
    alert.triggeredAt = timestamp
    pushMobileAlert(
      profile,
      'priceAlert',
      'Fiyat Alarmı',
      `${ITEM_BY_ID.get(alert.itemId)?.name || alert.itemId} fiyat hedefini gördü (${item.price}).`,
      timestamp,
      { itemId: alert.itemId, price: item.price },
    )
  }
}

function tickProductionAlerts(profile, timestamp) {
  const nowMs = new Date(timestamp).getTime()
  for (const business of profile.businesses) {
    if (!business.storageCapacity || business.storageAmount < business.storageCapacity) continue
    const lastAlertAt = profile.pushCenter.meta.productionByBusiness[business.id]
    const lastMs = lastAlertAt ? new Date(lastAlertAt).getTime() : 0
    if (nowMs - lastMs < 20 * MS_MINUTE) continue
    profile.pushCenter.meta.productionByBusiness[business.id] = timestamp
    pushMobileAlert(
      profile,
      'productionFull',
      'Depo Doldu',
      `${business.name} deposu doldu. Toplama zamani.`,
      timestamp,
      { businessId: business.id },
    )
  }
}

function tickAuctions(db, timestamp) {
  const nowMs = new Date(timestamp).getTime()

  for (const sellerProfile of db.gameProfiles) {
    if (!Array.isArray(sellerProfile.marketAuctions)) {
      sellerProfile.marketAuctions = []
      continue
    }

    for (const auction of sellerProfile.marketAuctions) {
      if (!auction || auction.status !== 'active') continue
      const remainingMs = new Date(auction.endAt).getTime() - nowMs

      if (remainingMs > 0) {
        if (remainingMs <= 3 * MS_MINUTE && !auction.warnedAt) {
          auction.warnedAt = timestamp
          pushMobileAlert(
            sellerProfile,
            'auctionEnding',
            'Açık Artırma Bitiyor',
            `${auction.title} için son dakikalar.`,
            timestamp,
            { auctionId: auction.id, remainingMs },
          )

          if (auction.highestBidderUserId) {
            const bidderProfile = db.gameProfiles.find(
              (entry) => entry.userId === auction.highestBidderUserId,
            )
            if (bidderProfile && bidderProfile.userId !== sellerProfile.userId) {
              pushMobileAlert(
                bidderProfile,
                'auctionEnding',
                'Teklifin Tehlikede',
                `${auction.title} için son dakikalar.`,
                timestamp,
                { auctionId: auction.id, remainingMs },
              )
            }
          }
        }
        continue
      }

      auction.status = 'ended'
      auction.resolvedAt = timestamp
      auction.updatedAt = timestamp

      const quantity = Math.max(1, asInt(auction.quantity, 1))
      const finalBid = Math.max(0, asInt(auction.currentBid, 0))
      const itemName = ITEM_BY_ID.get(auction.itemId)?.name || auction.itemName || auction.itemId

      if (auction.highestBidderUserId && finalBid > 0) {
        const bidderProfile = db.gameProfiles.find(
          (entry) => entry.userId === auction.highestBidderUserId,
        )
        if (bidderProfile) {
          addInventory(bidderProfile, auction.itemId, quantity)
          pushNotification(
            bidderProfile,
            'market',
            `${itemName} açık artırmasını kazandın.`,
            timestamp,
          )
        }

        sellerProfile.wallet += finalBid
        pushTransaction(
          sellerProfile,
          {
            kind: 'auction_sell',
            detail: `${itemName} açık artırması tamamlandı.`,
            amount: finalBid,
          },
          timestamp,
        )
        pushNotification(
          sellerProfile,
          'market',
          `${itemName} açık artırması ${finalBid} ile tamamlandı.`,
          timestamp,
        )
      } else {
        addInventory(sellerProfile, auction.itemId, quantity)
        pushNotification(
          sellerProfile,
          'market',
          `${itemName} için teklif gelmedi, ürün envantere iade edildi.`,
          timestamp,
        )
      }
    }

    sellerProfile.marketAuctions = sellerProfile.marketAuctions
      .filter((auction) => {
        if (!auction || auction.status === 'active') return true
        const resolvedMs = new Date(auction.resolvedAt || auction.endAt || timestamp).getTime()
        return nowMs - resolvedMs <= 24 * 60 * MS_MINUTE
      })
      .slice(0, AUCTION_HISTORY_LIMIT)
  }
}

function tickShipments(profile, timestamp) {
  const nowMs = new Date(timestamp).getTime()

  for (const shipment of profile.shipments) {
    if (shipment.status !== 'in_transit') continue
    if (new Date(shipment.arrivalAt).getTime() > nowMs) continue

    const failure = Math.random() < shipment.riskRate
    if (!failure) {
      shipment.status = 'arrived'
      shipment.claimableAmount = shipment.expectedGross
      shipment.resolvedAt = timestamp
      pushMobileAlert(
        profile,
        'auctionEnding',
        'Sevkiyat Teslim',
        `${shipment.itemName} sevkiyati hedefe ulasti.`,
        timestamp,
        { shipmentId: shipment.id, status: shipment.status },
      )
      continue
    }

    shipment.status = 'failed'
    shipment.claimableAmount = shipment.insured
      ? Math.max(0, Math.round(shipment.expectedGross * 0.72))
      : 0
    shipment.resolvedAt = timestamp
    shipment.lossReason = 'Rota riski nedeniyle kismi kayip yasandi.'
    pushMobileAlert(
      profile,
      'auctionEnding',
      'Sevkiyat Sorunu',
      `${shipment.itemName} sevkiyatinda risk gerceklesti.`,
      timestamp,
      { shipmentId: shipment.id, status: shipment.status },
    )
  }
}

function tickMarket(marketState, timestamp) {
  const nowMs = new Date(timestamp).getTime()
  const lastMs = new Date(marketState.lastUpdatedAt || timestamp).getTime()
  const elapsedMinutes = Math.max(0, (nowMs - lastMs) / 60000)

  if (elapsedMinutes <= 0.01) return

  for (const marketItem of marketState.items) {
    const def = ITEM_BY_ID.get(marketItem.id)
    if (!def) continue

    const restock = def.restockPerMinute * elapsedMinutes
    const rebalance = (def.targetStock - marketItem.stock) * 0.016 * elapsedMinutes

    marketItem.stock = clamp(
      Math.round(marketItem.stock + restock + rebalance),
      def.minStock,
      def.maxStock,
    )

    marketItem.lastPrice = marketItem.price
    marketItem.price = calculateMarketPrice(def, marketItem.stock)
    marketItem.updatedAt = timestamp
  }

  marketState.lastUpdatedAt = timestamp
}

function forexTickMeta(forexState, timestamp) {
  const stepMs = Math.max(1000, asInt(FOREX_UPDATE_INTERVAL_MS, 5000))
  const nowMs = createdMs(timestamp)
  const alignFloor = (valueMs) => Math.floor(Math.max(0, valueMs) / stepMs) * stepMs
  const currentBoundaryMs = alignFloor(nowMs)
  const rawLastMs = createdMs(forexState?.lastUpdatedAt || '')
  const normalizedLastMs = Number.isFinite(rawLastMs) && rawLastMs > 0
    ? alignFloor(rawLastMs)
    : currentBoundaryMs
  const elapsedMs = Math.max(0, currentBoundaryMs - normalizedLastMs)
  const steps = clamp(Math.floor(elapsedMs / stepMs), 0, 360)
  return {
    stepMs,
    currentBoundaryMs,
    normalizedLastMs,
    steps,
  }
}

function createDefaultBankTermState() {
  return {
    id: '',
    active: false,
    principal: 0,
    days: 0,
    dailyRatePct: 0,
    expectedPayout: 0,
    openedAt: '',
    unlockAt: '',
    readyNotifiedAt: '',
    claimedAt: '',
  }
}

function createDefaultBankState() {
  return {
    term: createDefaultBankTermState(),
    history: [],
  }
}

function normalizeBankHistoryEntry(entry, fallbackTimestamp = nowIso()) {
  if (!entry || typeof entry !== 'object') return null
  const principal = Math.max(0, asInt(entry.principal, 0))
  const payout = Math.max(principal, asInt(entry.payout, principal))
  const days = Math.max(0, asInt(entry.days, 0))
  const dailyRatePct = Math.max(0, asInt(entry.dailyRatePct, 0))
  const openedAt = typeof entry.openedAt === 'string' ? entry.openedAt : fallbackTimestamp
  const unlockAt = typeof entry.unlockAt === 'string' ? entry.unlockAt : fallbackTimestamp
  const claimedAt = typeof entry.claimedAt === 'string' ? entry.claimedAt : fallbackTimestamp
  return {
    id: String(entry.id || crypto.randomUUID()),
    principal,
    payout,
    profit: Math.max(0, payout - principal),
    days,
    dailyRatePct,
    openedAt,
    unlockAt,
    claimedAt,
  }
}

function bankTotalRatePct(dailyRatePct, days) {
  const safeDailyRatePct = Math.max(0, asInt(dailyRatePct, 0))
  const safeDays = Math.max(0, asInt(days, 0))
  return clamp(
    safeDailyRatePct * safeDays,
    0,
    Math.max(0, asInt(BANK_TERM_MAX_TOTAL_RATE_PCT, 10)),
  )
}

function bankExpectedPayout(principal, dailyRatePct, days) {
  const safePrincipal = Math.max(0, asInt(principal, 0))
  const totalRatePct = bankTotalRatePct(dailyRatePct, days)
  const growthRate = totalRatePct / 100
  return Math.max(safePrincipal, Math.floor(safePrincipal * (1 + growthRate)))
}

function bankTermOptionByDays(days) {
  const safeDays = Math.max(0, asInt(days, 0))
  return BANK_TERM_OPTIONS_BY_DAYS.get(safeDays) || null
}

function normalizeBankState(profile, timestamp = nowIso()) {
  if (!profile || typeof profile !== 'object') return createDefaultBankState()
  const raw = profile.bankState && typeof profile.bankState === 'object'
    ? profile.bankState
    : createDefaultBankState()

  const termSource = raw.term && typeof raw.term === 'object'
    ? raw.term
    : createDefaultBankTermState()
  const termOption = bankTermOptionByDays(termSource.days)
  const active = Boolean(termSource.active) && termOption !== null
  const principal = Math.max(0, asInt(termSource.principal, 0))
  const days = termOption ? termOption.days : 0
  const dailyRatePct = termOption ? termOption.dailyRatePct : 0
  const expectedPayout = active
    ? bankExpectedPayout(
      principal,
      dailyRatePct,
      Math.max(1, days),
    )
    : 0
  const openedAt = typeof termSource.openedAt === 'string' ? termSource.openedAt : ''
  const unlockAt = typeof termSource.unlockAt === 'string' ? termSource.unlockAt : ''
  const readyNotifiedAt = typeof termSource.readyNotifiedAt === 'string' ? termSource.readyNotifiedAt : ''
  const claimedAt = typeof termSource.claimedAt === 'string' ? termSource.claimedAt : ''

  const historySource = Array.isArray(raw.history) ? raw.history : []
  const history = historySource
    .map((entry) => normalizeBankHistoryEntry(entry, timestamp))
    .filter(Boolean)
    .sort((a, b) => createdMs(b.claimedAt || b.unlockAt || b.openedAt) - createdMs(a.claimedAt || a.unlockAt || a.openedAt))
    .slice(0, BANK_TERM_HISTORY_LIMIT)

  profile.bankState = {
    term: {
      id: active ? String(termSource.id || crypto.randomUUID()) : '',
      active,
      principal: active ? principal : 0,
      days: active ? days : 0,
      dailyRatePct: active ? dailyRatePct : 0,
      expectedPayout: active ? expectedPayout : 0,
      openedAt: active ? openedAt : '',
      unlockAt: active ? unlockAt : '',
      readyNotifiedAt: active ? readyNotifiedAt : '',
      claimedAt: active ? claimedAt : '',
    },
    history,
  }

  return profile.bankState
}

function bankRemainingMs(term, timestamp = nowIso()) {
  if (!term?.active) return 0
  return Math.max(0, createdMs(term.unlockAt) - createdMs(timestamp))
}

function bankView(profile, timestamp = nowIso()) {
  const normalized = normalizeBankState(profile, timestamp)
  const term = normalized.term
  const remainingMs = bankRemainingMs(term, timestamp)
  const matured = Boolean(term.active) && remainingMs <= 0
  return {
    wallet: Math.max(0, asInt(profile?.wallet, 0)),
    bank: Math.max(0, asInt(profile?.bank, 0)),
    minTransferAmount: BANK_MIN_TRANSFER_AMOUNT,
    depositFeeRate: BANK_DEPOSIT_FEE_RATE,
    withdrawFeeRate: BANK_WITHDRAW_FEE_RATE,
    termMaxPrincipal: BANK_TERM_MAX_PRINCIPAL,
    termRateCapPct: BANK_TERM_MAX_TOTAL_RATE_PCT,
    termOptions: BANK_TERM_OPTIONS.map((entry) => ({
      days: entry.days,
      dailyRatePct: entry.dailyRatePct,
      totalRatePct: bankTotalRatePct(entry.dailyRatePct, entry.days),
    })),
    term: {
      active: Boolean(term.active),
      id: String(term.id || ''),
      principal: Math.max(0, asInt(term.principal, 0)),
      days: Math.max(0, asInt(term.days, 0)),
      dailyRatePct: Math.max(0, asInt(term.dailyRatePct, 0)),
      totalRatePct: bankTotalRatePct(term.dailyRatePct, term.days),
      expectedPayout: Math.max(0, asInt(term.expectedPayout, 0)),
      estimatedProfit: Math.max(0, asInt(term.expectedPayout, 0) - asInt(term.principal, 0)),
      openedAt: String(term.openedAt || ''),
      unlockAt: String(term.unlockAt || ''),
      readyNotifiedAt: String(term.readyNotifiedAt || ''),
      claimedAt: String(term.claimedAt || ''),
      remainingMs,
      matured,
    },
    history: (normalized.history || [])
      .map((entry) => ({
        id: String(entry.id || ''),
        principal: Math.max(0, asInt(entry.principal, 0)),
        payout: Math.max(0, asInt(entry.payout, 0)),
        profit: Math.max(0, asInt(entry.profit, 0)),
        days: Math.max(0, asInt(entry.days, 0)),
        dailyRatePct: Math.max(0, asInt(entry.dailyRatePct, 0)),
        totalRatePct: bankTotalRatePct(entry.dailyRatePct, entry.days),
        openedAt: String(entry.openedAt || ''),
        unlockAt: String(entry.unlockAt || ''),
        claimedAt: String(entry.claimedAt || ''),
      }))
      .slice(0, BANK_TERM_HISTORY_LIMIT),
  }
}

function tickBankState(profile, timestamp = nowIso()) {
  const state = normalizeBankState(profile, timestamp)
  const term = state.term
  if (!term?.active) return
  const remainingMs = bankRemainingMs(term, timestamp)
  if (remainingMs > 0) return
  if (term.readyNotifiedAt) return
  term.readyNotifiedAt = timestamp
  pushNotification(
    profile,
    'system',
    'Vadeli hesabının vadesi doldu. Tahsilat için Banka ekranına gidebilirsin.',
    timestamp,
  )
}

function tickForex(forexState, timestamp) {
  const {
    stepMs,
    currentBoundaryMs,
    normalizedLastMs,
    steps,
  } = forexTickMeta(forexState, timestamp)
  forexState.lastUpdatedAt = new Date(normalizedLastMs).toISOString()
  if (steps <= 0) {
    return {
      updated: false,
      steps: 0,
      updatedAt: forexState.lastUpdatedAt,
    }
  }

  const bullishHeadlines = [
    'Kuresel risk istahi guclendi',
    'Merkez bankalarından destekleyici sinyal',
    'Likidite artisi ile talep canlandi',
    'Veri akisinda olumlu surpriz goruldu',
  ]
  const bearishHeadlines = [
    'Kuresel riskten kacinma hizlandi',
    'Politika belirsizligi dalgayi buyuttu',
    'Volatilite artisi satisa neden oldu',
    'Beklentilerden zayif veri aciklandi',
  ]

  let cursorMs = normalizedLastMs
  for (let step = 0; step < steps; step += 1) {
    cursorMs += stepMs
    const stepIso = new Date(cursorMs).toISOString()

    forexState.sentiment = clamp(
      (Number(forexState.sentiment) || 0) * 0.96 + randomTriangularUnit() * 0.04,
      -1,
      1,
    )
    forexState.turbulence = clamp(
      (Number(forexState.turbulence) || 1) * 0.95 + (0.93 + Math.random() * 0.16) * 0.05,
      0.86,
      1.24,
    )

    const eventEndsMs = createdMs(forexState?.event?.endsAt || '')
    const eventActive = eventEndsMs > cursorMs
    if (!eventActive && Math.random() < (0.0026 * forexState.turbulence)) {
      const direction = Math.random() < 0.5 ? -1 : 1
      const strength = clamp((0.0012 + Math.random() * 0.0032) * forexState.turbulence, 0.0009, 0.0068)
      const durationSteps = 12 + Math.floor(Math.random() * 48)
      forexState.event = {
        title: direction > 0
          ? bullishHeadlines[Math.floor(Math.random() * bullishHeadlines.length)]
          : bearishHeadlines[Math.floor(Math.random() * bearishHeadlines.length)],
        direction,
        strength,
        endsAt: new Date(cursorMs + durationSteps * stepMs).toISOString(),
      }
    } else if (!eventActive) {
      forexState.event = {
        title: '',
        direction: 0,
        strength: 0,
        endsAt: '',
      }
    }

    const activeEvent = createdMs(forexState?.event?.endsAt || '') > cursorMs
      ? forexState.event
      : { direction: 0, strength: 0 }
    const sentiment = Number(forexState.sentiment) || 0

    for (const pair of forexState.pairs || []) {
      const def = FOREX_BY_ID.get(pair.id)
      if (!def) continue

      const phase = forexPatternPhaseForPair(pair)
      const phaseDirection = clamp(asInt(phase?.direction, 0), -1, 1)
      const phaseVolatilityScale = clamp(Number(phase?.volatilityScale) || 1, 0.72, 1.36)
      const phaseDrift = phaseDirection * randomBetween(phase?.driftMin, phase?.driftMax)

      pair.patternMomentum = clamp(
        (Number(pair.patternMomentum) || 0) * 0.58
          + (phaseDrift * 0.42)
          + (randomTriangularUnit() * Math.abs(phaseDrift) * 0.24),
        -0.0032,
        0.0032,
      )
      pair.trendBias = clamp(
        (Number(pair.trendBias) || 0) * 0.94
          + (phaseDirection * 0.0022)
          + (randomTriangularUnit() * 0.0024),
        -0.18,
        0.18,
      )
      pair.volatilityPulse = clamp(
        (Number(pair.volatilityPulse) || 1) * 0.92
          + ((0.9 + Math.random() * 0.22) * 0.08 * phaseVolatilityScale),
        0.84,
        1.32,
      )

      const meanAnchor = def.baseRate * (1 + (sentiment * 0.014) + (pair.trendBias * 0.012))
      const currentRate = Math.max(def.minRate, Math.min(def.maxRate, Number(pair.rate) || def.baseRate))
      const meanForce = ((meanAnchor - currentRate) / Math.max(1, meanAnchor)) * def.meanReversion
      const drift = def.drift + (pair.trendBias * 0.00026) + (sentiment * 0.00014) + pair.patternMomentum
      const noise = randomTriangularUnit()
        * def.volatility
        * pair.volatilityPulse
        * forexState.turbulence
        * 0.46
        * phaseVolatilityScale
      const eventEffect = activeEvent.direction
        ? activeEvent.direction * activeEvent.strength * (0.09 + Math.random() * 0.17)
        : 0
      const bandCenterRate = (def.minRate + def.maxRate) / 2
      const halfBandRange = Math.max(1, (def.maxRate - def.minRate) / 2)
      const bandOffset = clamp((currentRate - bandCenterRate) / halfBandRange, -1, 1)
      // Bandın dışına taşmadan doğal dengeyi koru.
      const centerPull = -bandOffset * FOREX_CENTER_PULL_STRENGTH

      let phaseBurst = 0
      const phaseBurstChance = clamp(Number(phase?.burstChance) || 0, 0, 0.85)
      if (phaseDirection !== 0 && Math.random() < phaseBurstChance) {
        phaseBurst = phaseDirection * randomBetween(phase?.burstMin, phase?.burstMax)
      }

      let shock = 0
      const shockMultiplier = clamp(Number(phase?.shockMultiplier) || 1, 0.7, 1.4)
      const shockChance = clamp(
        def.shockChance * (0.2 + forexState.turbulence * 0.34) * shockMultiplier,
        0.0007,
        0.014,
      )
      if (Math.random() < shockChance) {
        const positiveShockChance = clamp(0.5 + (phaseDirection * 0.2), 0.12, 0.88)
        const shockDirection = Math.random() < positiveShockChance ? 1 : -1
        shock = shockDirection * def.shockScale * (0.12 + Math.random() * 0.34)
      }

      let majorSwing = 0
      const turbulenceFactor = Math.max(0, Number(forexState.turbulence) - 1)
      const majorSwingChance = clamp(
        0.195 +
          (turbulenceFactor * 0.12) +
          (Math.abs(sentiment) * 0.025) +
          (Math.max(0, phaseVolatilityScale - 1) * 0.08),
        FOREX_MAJOR_SWING_CHANCE_MIN,
        FOREX_MAJOR_SWING_CHANCE_MAX,
      )
      if (Math.random() < majorSwingChance) {
        const trendSignal = Math.sign(drift + pair.patternMomentum + (sentiment * 0.0009))
        const towardCenterDirection = bandOffset > 0
          ? -1
          : (bandOffset < 0 ? 1 : (Math.random() < 0.5 ? -1 : 1))
        const edgeWeight = clamp(Math.abs(bandOffset), 0, 1)
        const followTrendChance = clamp(0.54 - (edgeWeight * 0.34), 0.18, 0.62)
        const swingDirection = trendSignal !== 0 && Math.random() < followTrendChance
          ? trendSignal
          : towardCenterDirection
        const swingMagnitude = randomBetween(FOREX_MAJOR_SWING_MIN, FOREX_MAJOR_SWING_MAX)
          * (
            0.92 +
            (Math.max(0, Number(pair.volatilityPulse) - 1) * 0.4) +
            (turbulenceFactor * 0.24)
          )
        majorSwing = swingDirection * swingMagnitude
        if (Math.abs(bandOffset) > 0.82 && Math.sign(majorSwing) === Math.sign(bandOffset)) {
          majorSwing *= 0.35
        }
      }

      const baseDelta = drift + meanForce + noise + eventEffect + phaseBurst + shock + centerPull
      const dynamicBaseCap = FOREX_DELTA_BASE_CAP * (0.9 + Math.max(0, Number(pair.volatilityPulse) - 1) * 0.5)
      const boundedBaseDelta = clamp(baseDelta, -dynamicBaseCap, dynamicBaseCap)
      const deltaPct = clamp(boundedBaseDelta + majorSwing, -FOREX_DELTA_HARD_CAP, FOREX_DELTA_HARD_CAP)
      const nextRate = clamp(currentRate * (1 + deltaPct), def.minRate, def.maxRate)
      const roundedCurrentRate = roundTo(currentRate, 4)
      let safeNextRate = roundTo(nextRate, 4)

      // Keep each interval visually alive: avoid flat candles when rounding collapses a tiny move.
      if (safeNextRate === roundedCurrentRate) {
        const nudgeDirection = Math.random() < 0.5 ? -1 : 1
        const nudgePct = 0.00008 + (Math.random() * 0.00014)
        safeNextRate = clamp(
          roundTo(currentRate * (1 + (nudgeDirection * nudgePct)), 4),
          def.minRate,
          def.maxRate,
        )
      }

      const moveMagnitude = Math.abs(safeNextRate - currentRate)
      const baseLiquidity = Math.max(10, (def.baseRate / Math.max(1, def.minRate)) * 10)
      const syntheticVolume = roundTo(
        Math.max(
          1,
          (moveMagnitude * 18000) + (Math.abs(deltaPct) * 9000) + (Math.random() * 12) + (baseLiquidity * (0.4 + pair.volatilityPulse)),
        ),
        2,
      )

      pair.lastRate = roundTo(currentRate, 4)
      pair.rate = safeNextRate
      pair.updatedAt = stepIso
      pair.spreadRate = clamp(
        FOREX_BASE_SPREAD_RATE * (0.9 + Math.max(0, pair.volatilityPulse - 1) * 0.38 + Math.max(0, forexState.turbulence - 1) * 0.22),
        0.006,
        0.02,
      )

      const history = Array.isArray(pair.history) ? pair.history : []
      history.push({ at: stepIso, rate: safeNextRate, volume: syntheticVolume })
      const cutoffMs = cursorMs - FOREX_HISTORY_WINDOW_MS
      pair.history = history
        .filter((entry) => createdMs(entry.at) >= cutoffMs)
        .slice(-FOREX_HISTORY_KEEP)

      const dayCutoffMs = cursorMs - FOREX_DAY_WINDOW_MS
      const dayHistory = pair.history.filter((entry) => createdMs(entry?.at || '') >= dayCutoffMs)
      const daySource = dayHistory.length > 0 ? dayHistory : pair.history
      const firstPoint = daySource[0]?.rate || safeNextRate
      pair.openRate = roundTo(firstPoint, 4)
      let dayHigh = safeNextRate
      let dayLow = safeNextRate
      for (const point of daySource) {
        const pointRate = Number(point?.rate) || safeNextRate
        dayHigh = Math.max(dayHigh, pointRate)
        dayLow = Math.min(dayLow, pointRate)
      }
      pair.dayHigh = roundTo(dayHigh, 4)
      pair.dayLow = roundTo(dayLow, 4)
      pair.patternPhaseRemaining = Math.max(0, asInt(pair.patternPhaseRemaining, 0) - 1)
    }
  }

  forexState.lastUpdatedAt = new Date(currentBoundaryMs).toISOString()
  return {
    updated: true,
    steps,
    updatedAt: forexState.lastUpdatedAt,
  }
}

function getBusinessPendingIncome(profile, business, timestamp) {
  const template = BUSINESS_BY_ID.get(business.templateId)
  if (!template) return 0

  const nowMs = createdMs(timestamp)
  const lastIncomeMs = createdMs(business.lastIncomeCollectedAt || timestamp)
  const elapsedHours = Math.max(0, (nowMs - lastIncomeMs) / 3600000)
  if (isFleetBusinessTemplate(template)) {
    const hourlyTotals = fleetHourlyTotalsFromBusiness(profile, business, template)
    const hourlyIncome = Math.max(0, asInt(hourlyTotals.hourlyIncome, 0))
    const collectWindow = fleetCollectWindow(business.lastIncomeCollectedAt || timestamp, timestamp)
    const collectCycles = Math.max(0, collectWindow.elapsedCycles)
    business.fleetRentTotal = Math.max(0, hourlyIncome)
    business.fleetXpTotal = Math.max(0, asInt(hourlyTotals.hourlyXp, 0))
    return Math.max(0, collectCycles * hourlyIncome)
  }

  const hourlyIncome = template.baseIncomePerHour * (1 + (business.level - 1) * 0.22)

  return Math.max(0, Math.floor(elapsedHours * hourlyIncome))
}

function tickBusinesses(profile, timestamp) {
  const nowMs = new Date(timestamp).getTime()
  const playerLevel = levelInfoFromXp(profile?.xpTotal || 0).level

  for (const business of profile.businesses) {
    const template = BUSINESS_BY_ID.get(business.templateId)
    if (!template) continue

    if (isFleetBusinessTemplate(template)) {
      normalizeFleetBusinessState(business, template, timestamp, playerLevel)
      continue
    }

    const levelFactor = 1 + Math.max(0, business.level - 1) * 0.07
    const cycleMinutes = Math.max(4, template.cycleMinutes / levelFactor)
    const outputPerCycle = Math.max(
      1,
      Math.round(template.outputPerCycle * (1 + Math.max(0, business.level - 1) * 0.17)),
    )
    const capacity = Math.max(
      template.storageCapacity,
      Math.round(template.storageCapacity * (1 + Math.max(0, business.level - 1) * 0.34)),
    )

    business.storageCapacity = capacity

    const lastProducedMs = new Date(business.lastProducedAt || timestamp).getTime()
    const elapsedMinutes = Math.max(0, (nowMs - lastProducedMs) / 60000)
    const cycles = Math.floor(elapsedMinutes / cycleMinutes)

    if (cycles > 0) {
      const produced = cycles * outputPerCycle
      business.storageAmount = Math.min(capacity, business.storageAmount + produced)

      const consumedMs = Math.round(cycles * cycleMinutes * 60000)
      business.lastProducedAt = new Date(lastProducedMs + consumedMs).toISOString()
      business.updatedAt = timestamp
    }
  }
}

function releaseSellOrderReserve(profile, order) {
  const remaining = Math.max(0, asInt(order.quantity, 0) - asInt(order.filledQuantity, 0))
  if (remaining > 0) {
    addInventory(profile, order.itemId, remaining)
  }
}

function orderRemainingQuantity(order) {
  return Math.max(0, asInt(order.quantity, 0) - asInt(order.filledQuantity, 0))
}

function openBuyExposure(profile) {
  const orders = Array.isArray(profile?.limitOrders) ? profile.limitOrders : []
  return orders
    .filter((order) => order && order.status === 'open' && order.side === 'buy')
    .reduce(
      (total, order) => total + orderRemainingQuantity(order) * Math.max(1, asInt(order.limitPrice, 0)),
      0,
    )
}

function orderSortAsc(a, b) {
  const priceDiff = asInt(a.order.limitPrice, 0) - asInt(b.order.limitPrice, 0)
  if (priceDiff !== 0) return priceDiff
  return new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime()
}

function orderSortDesc(a, b) {
  const priceDiff = asInt(b.order.limitPrice, 0) - asInt(a.order.limitPrice, 0)
  if (priceDiff !== 0) return priceDiff
  return new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime()
}

function markOrderFilled(profile, order, timestamp) {
  if (order.status === 'filled') return
  order.status = 'filled'
  order.updatedAt = timestamp
  pushNotification(
    profile,
    'market',
    `${ITEM_BY_ID.get(order.itemId)?.name || order.itemId} limit emri tamamlandı.`,
    timestamp,
  )
}

function tickLimitOrders(db, marketState, timestamp) {
  const nowMs = new Date(timestamp).getTime()

  const allOrders = []
  for (const profile of db.gameProfiles) {
    const orders = Array.isArray(profile.limitOrders) ? profile.limitOrders : []
    for (const order of orders) {
      if (!order || order.status !== 'open') continue
      const remaining = orderRemainingQuantity(order)
      if (remaining <= 0) {
        markOrderFilled(profile, order, timestamp)
        continue
      }

      const item = marketState.items.find((entry) => entry.id === order.itemId)
      if (!item || !ITEM_BY_ID.has(order.itemId)) {
        order.status = 'cancelled'
        order.updatedAt = timestamp
        if (order.side === 'sell') {
          releaseSellOrderReserve(profile, order)
        }
        continue
      }

      if (new Date(order.expiresAt).getTime() <= nowMs) {
        order.status = 'expired'
        order.updatedAt = timestamp
        if (order.side === 'sell') {
          releaseSellOrderReserve(profile, order)
        }
        continue
      }

      allOrders.push({ profile, order })
    }
  }

  for (const itemDef of ITEM_CATALOG) {
    const buys = allOrders
      .filter((entry) => entry.order.itemId === itemDef.id && entry.order.side === 'buy')
      .sort(orderSortDesc)
    const sells = allOrders
      .filter((entry) => entry.order.itemId === itemDef.id && entry.order.side === 'sell')
      .sort(orderSortAsc)

    for (const buyEntry of buys) {
      if (buyEntry.order.status !== 'open') continue

      let buyRemaining = orderRemainingQuantity(buyEntry.order)
      if (buyRemaining <= 0) {
        markOrderFilled(buyEntry.profile, buyEntry.order, timestamp)
        continue
      }

      for (const sellEntry of sells) {
        if (sellEntry.order.status !== 'open') continue
        if (buyEntry.profile.userId === sellEntry.profile.userId) continue

        const sellRemaining = orderRemainingQuantity(sellEntry.order)
        if (sellRemaining <= 0) {
          markOrderFilled(sellEntry.profile, sellEntry.order, timestamp)
          continue
        }

        const buyPrice = asInt(buyEntry.order.limitPrice, 0)
        const sellPrice = asInt(sellEntry.order.limitPrice, 0)
        if (buyPrice < sellPrice) {
          break
        }

        let tradeQty = Math.min(buyRemaining, sellRemaining)
        const unitPrice = Math.max(1, sellPrice)
        const affordableQty = Math.floor(buyEntry.profile.wallet / unitPrice)
        tradeQty = Math.min(tradeQty, affordableQty)

        if (tradeQty <= 0) {
          buyEntry.order.status = 'cancelled'
          buyEntry.order.updatedAt = timestamp
          pushNotification(
            buyEntry.profile,
            'market',
            `${ITEM_BY_ID.get(buyEntry.order.itemId)?.name || buyEntry.order.itemId} alış emri, bakiye yetersizliği nedeniyle iptal edildi.`,
            timestamp,
          )
          break
        }

        const totalCost = tradeQty * unitPrice
        buyEntry.profile.wallet -= totalCost
        sellEntry.profile.wallet += totalCost
        addInventory(buyEntry.profile, buyEntry.order.itemId, tradeQty)

        buyEntry.order.filledQuantity += tradeQty
        buyEntry.order.updatedAt = timestamp
        buyEntry.order.lastFillAt = timestamp

        sellEntry.order.filledQuantity += tradeQty
        sellEntry.order.updatedAt = timestamp
        sellEntry.order.lastFillAt = timestamp

        addLeaguePoints(buyEntry.profile, Math.max(1, Math.floor(totalCost / 150)))
        addLeaguePoints(sellEntry.profile, Math.max(1, Math.floor(totalCost / 150)))
        applyMissionProgress(
          buyEntry.profile.missions,
          { type: 'buy_units', value: tradeQty },
          timestamp,
        )
        applyMissionProgress(
          sellEntry.profile.missions,
          { type: 'sell_value', value: totalCost },
          timestamp,
        )

        buyRemaining = orderRemainingQuantity(buyEntry.order)

        if (orderRemainingQuantity(sellEntry.order) <= 0) {
          markOrderFilled(sellEntry.profile, sellEntry.order, timestamp)
        }

        if (buyRemaining <= 0) {
          markOrderFilled(buyEntry.profile, buyEntry.order, timestamp)
          break
        }
      }
    }
  }
}

function buildOrderBook(db, marketItem) {
  const bidLevels = []
  const askLevels = []

  for (const profile of db.gameProfiles) {
    const orders = Array.isArray(profile.limitOrders) ? profile.limitOrders : []
    for (const order of orders) {
      if (order.status !== 'open' || order.itemId !== marketItem.id) continue
      const remaining = orderRemainingQuantity(order)
      if (remaining <= 0) continue

      const target = order.side === 'buy' ? bidLevels : askLevels
      const level = target.find((entry) => entry.price === order.limitPrice)
      if (level) {
        level.quantity += remaining
      } else {
        target.push({
          price: order.limitPrice,
          quantity: remaining,
          source: 'oyuncu',
        })
      }
    }
  }

  bidLevels.sort((a, b) => b.price - a.price)
  askLevels.sort((a, b) => a.price - b.price)

  const bestBid = bidLevels[0]?.price || 0
  const bestAsk = askLevels[0]?.price || 0

  return {
    itemId: marketItem.id,
    itemName: ITEM_BY_ID.get(marketItem.id)?.name || marketItem.id,
    lastPrice: marketItem.price,
    spread: bestBid > 0 && bestAsk > 0 ? Math.max(0, bestAsk - bestBid) : 0,
    bids: bidLevels.slice(0, ORDER_BOOK_DEPTH),
    asks: askLevels.slice(0, ORDER_BOOK_DEPTH),
  }
}

function releaseContractReservation(profile, contract) {
  if (contract.contractType !== 'outgoing_sell') return
  const remaining = Math.max(0, asInt(contract.quantity, 0) - asInt(contract.filledQuantity, 0))
  if (remaining > 0) addInventory(profile, contract.itemId, remaining)
  contract.filledQuantity = contract.quantity
}

function finalizeContractAccept(profile, contract, timestamp) {
  const quantity = Math.max(1, asInt(contract.quantity, 1))
  const total = Math.max(1, asInt(contract.totalPrice, 1))
  const itemName = ITEM_BY_ID.get(contract.itemId)?.name || contract.itemId

  if (contract.contractType === 'incoming_buy') {
    if (!removeInventory(profile, contract.itemId, quantity)) {
      return {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Kontrat için envanter yetersiz.' },
      }
    }
    profile.wallet += total
  } else if (contract.contractType === 'incoming_sell') {
    if (profile.wallet < total) {
      return {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Kontrat için bakiye yetersiz.' },
      }
    }
    profile.wallet -= total
    addInventory(profile, contract.itemId, quantity)
  } else if (contract.contractType === 'outgoing_sell') {
    profile.wallet += total
  } else if (contract.contractType === 'outgoing_buy') {
    if (profile.wallet < total) {
      return {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Alış kontratı kabul edilse de bakiye yetersiz.' },
      }
    }
    profile.wallet -= total
    addInventory(profile, contract.itemId, quantity)
  }

  contract.status = 'accepted'
  contract.resolvedAt = timestamp
  contract.updatedAt = timestamp
  addLeaguePoints(profile, Math.max(1, Math.floor(total / 130)))

  pushTransaction(
    profile,
    {
      kind: 'contract_accept',
      detail: `${itemName} için kontrat kabul edildi (${contract.counterpartyName}).`,
      amount: contract.contractType === 'incoming_sell' || contract.contractType === 'outgoing_buy' ? -total : total,
    },
    timestamp,
  )

  pushNotification(
    profile,
    'market',
    `${contract.counterpartyName} ile kontrat tamamlandı.`,
    timestamp,
  )

  return { success: true }
}

function tickContracts(profile, timestamp) {
  const nowMs = new Date(timestamp).getTime()
  const openIncoming = profile.contracts.filter(
    (contract) => contract.status === 'open' && contract.initiator === 'counterparty',
  )

  const latestIncoming = openIncoming[0]
  const latestIncomingMs = latestIncoming ? new Date(latestIncoming.createdAt).getTime() : 0

  if (openIncoming.length < 3 && (nowMs - latestIncomingMs > 4 * MS_MINUTE || openIncoming.length === 0)) {
    const item = ITEM_CATALOG[Math.floor(Math.random() * ITEM_CATALOG.length)]
    const quantity = 10 + Math.floor(Math.random() * 40)
    const base = item.basePrice
    const contractType = Math.random() < 0.5 ? 'incoming_buy' : 'incoming_sell'
    const factor = contractType === 'incoming_buy' ? 1.12 : 0.93
    const unitPrice = Math.max(1, Math.round(base * factor))
    profile.contracts.unshift({
      id: crypto.randomUUID(),
      contractType,
      initiator: 'counterparty',
      counterpartyName: COUNTERPARTIES[Math.floor(Math.random() * COUNTERPARTIES.length)],
      itemId: item.id,
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(nowMs + 14 * MS_MINUTE).toISOString(),
      autoResolveAt: null,
      resolvedAt: null,
      filledQuantity: 0,
    })
  }

  for (const contract of profile.contracts) {
    if (contract.status !== 'open') continue
    const expiresMs = new Date(contract.expiresAt).getTime()
    if (expiresMs <= nowMs) {
      contract.status = 'expired'
      contract.updatedAt = timestamp
      contract.resolvedAt = timestamp
      releaseContractReservation(profile, contract)
      continue
    }

    if (contract.initiator !== 'user') continue
    const autoResolveMs = contract.autoResolveAt ? new Date(contract.autoResolveAt).getTime() : 0
    if (!autoResolveMs || autoResolveMs > nowMs) continue

    if (Math.random() < 0.64) {
      const acceptResult = finalizeContractAccept(profile, contract, timestamp)
      if (!acceptResult.success) {
        contract.status = 'rejected'
        contract.resolvedAt = timestamp
        contract.updatedAt = timestamp
        releaseContractReservation(profile, contract)
      }
    } else {
      contract.status = 'rejected'
      contract.resolvedAt = timestamp
      contract.updatedAt = timestamp
      releaseContractReservation(profile, contract)
    }
  }

  profile.contracts = profile.contracts.slice(0, 120)
}

function runGameTick(db, profile, timestamp) {
  normalizeAllProfiles(db, timestamp)
  normalizeLeagueState(profile, timestamp)
  tickMarket(db.marketState, timestamp)
  const forexTickResult = tickForex(db.forexState, timestamp)
  if (forexTickResult?.updated) {
    notifyAllProfilesForexUpdated(db, timestamp)
  }
  tickBusinesses(profile, timestamp)
  tickFactories(profile, timestamp)
  tickMines(profile, timestamp)
  tickLimitOrders(db, db.marketState, timestamp)
  tickShipments(profile, timestamp)
  tickAuctions(db, timestamp)
  tickContracts(profile, timestamp)
  tickBankState(profile, timestamp)
  syncBusinessCountMission(profile.missions, profile.businesses.length, timestamp)
  tickPriceAlerts(profile, db.marketState, timestamp)
  tickProductionAlerts(profile, timestamp)
}

function marketItemView(profile, marketItem) {
  const def = ITEM_BY_ID.get(marketItem.id)
  const price = marketItem.price
  const buyPrice = Math.max(1, Math.round(price * (1 + MARKET_TAX_RATE)))
  const sellPrice = Math.max(1, Math.round(price * (1 - MARKET_TAX_RATE)))
  const owned = getInventoryQuantity(profile, marketItem.id)
  const changePercent =
    marketItem.lastPrice > 0
      ? Number((((price - marketItem.lastPrice) / marketItem.lastPrice) * 100).toFixed(2))
      : 0

  return {
    id: marketItem.id,
    name: def?.name || marketItem.id,
    stock: marketItem.stock,
    price,
    buyPrice,
    sellPrice,
    owned,
    changePercent,
  }
}

function businessUpgradeCost(business, options = {}) {
  const template = BUSINESS_BY_ID.get(business.templateId)
  if (!template) return 0
  const baseCost = Math.max(1, Math.round(template.upgradeBaseCost * Math.pow(1.55, business.level - 1)))
  return weeklyEventCostValue(
    baseCost,
    options?.timestamp || '',
    options?.weeklyEvents || null,
    { minPositive: 1 },
  )
}

function businessPurchaseCost(templateId, businesses, options = {}) {
  const template = BUSINESS_BY_ID.get(templateId)
  if (!template) return 0

  const sameTypeCount = businesses.filter((item) => item.templateId === templateId).length
  const baseCost = Math.max(1, Math.round(template.baseCost * (1 + sameTypeCount * 0.22)))
  return weeklyEventCostValue(
    baseCost,
    options?.timestamp || '',
    options?.weeklyEvents || null,
    { minPositive: 1 },
  )
}

function inventoryView(profile, marketItems) {
  const byItemId = new Map(marketItems.map((item) => [item.id, item]))

  return profile.inventory
    .map((entry) => {
      const itemView = byItemId.get(entry.itemId)
      const itemDef = ITEM_BY_ID.get(entry.itemId)
      const unitPrice = itemView?.price || itemDef?.basePrice || 0
      const quantity = Math.max(0, asInt(entry.quantity, 0))

      return {
        itemId: entry.itemId,
        name: itemDef?.name || entry.itemId,
        quantity,
        unitPrice,
        totalValue: unitPrice * quantity,
      }
    })
    .sort((a, b) => b.totalValue - a.totalValue)
}

function computeProfileNetWorth(profile, timestamp, inventoryItems, forexState = null) {
  const inventoryValue = (inventoryItems || []).reduce((sum, item) => sum + (item.totalValue || 0), 0)
  const wallet = Math.max(0, asInt(profile?.wallet, 0))
  const bank = Math.max(0, asInt(profile?.bank, 0))

  let fleetValue = 0
  for (const business of profile?.businesses || []) {
    if (!FLEET_TEMPLATE_IDS.includes(business.templateId)) continue
    for (const vehicle of business.vehicles || []) {
      fleetValue += fleetListingBasePrice({
        cost: { cash: asInt(vehicle?.cost?.cash, 0) },
        rentPerHour: asInt(vehicle?.rentPerHour, 0),
      })
    }
  }
  const normalizedListings = (profile?.vehicleListings || [])
    .map((entry) => normalizeVehicleListingEntry(entry, profile, timestamp))
    .filter(Boolean)
  for (const entry of normalizedListings) {
    if (FLEET_TEMPLATE_SET.has(String(entry?.templateId || '').trim())) {
      fleetValue += Math.max(0, asInt(entry.price, 0))
    }
  }

  let logisticsValue = 0
  for (const truck of profile?.logisticsFleet || []) {
    logisticsValue += logisticsListingBasePrice({
      cash: asInt(truck?.cash, 0),
      incomePerRun: asInt(truck?.incomePerRun, 0),
    })
  }
  for (const entry of normalizedListings) {
    if (entry.templateId === 'logistics') {
      logisticsValue += Math.max(0, asInt(entry.price, 0))
    }
  }

  const forexValue = forexPortfolioValueTry(profile, forexState)
  const total = wallet + bank + inventoryValue + fleetValue + logisticsValue + forexValue
  return {
    wallet,
    bank,
    inventoryValue,
    fleetValue,
    logisticsValue,
    forexValue,
    netWorth: total,
  }
}

function businessView(profile, timestamp) {
  const playerLevel = levelInfoFromXp(profile?.xpTotal || 0).level
  const weeklyEvents = weeklyEventState(timestamp)
  return profile.businesses.map((business) => {
    const template = BUSINESS_BY_ID.get(business.templateId)
    const isFleet = isFleetBusinessTemplate(template)
    const isUnlocked = isFleet ? isFleetTemplateUnlocked(profile, business.templateId) : true
    const collectIntervalMinutes = isFleet ? Math.round(FLEET_COLLECT_COOLDOWN_MS / MS_MINUTE) : 0
    const rawFleetVehiclesAll = isFleetBusinessTemplate(template) && Array.isArray(business.vehicles)
      ? business.vehicles
      : []
    const operationalFleetVehicles = isFleetBusinessTemplate(template)
      ? fleetOperationalVehicles(profile, business, template)
      : []
    const operationalFleetCount = operationalFleetVehicles.length
    const baseFleetCapacity = isFleetBusinessTemplate(template)
      ? fleetCapacityFromPlayerLevel(playerLevel, template)
      : 0
    const fleetCapacity = isFleetBusinessTemplate(template)
      ? Math.max(baseFleetCapacity, rawFleetVehiclesAll.length, operationalFleetCount)
      : 0
    const fleetCount = isFleetBusinessTemplate(template)
      ? clamp(operationalFleetCount, 0, fleetCapacity)
      : 0
    const fuelNeedPerHour = isFleetBusinessTemplate(template)
      ? fleetFuelNeedPerHour(profile, template, business)
      : 0
    const rawFleetVehicles = isFleetBusinessTemplate(template)
      ? rawFleetVehiclesAll.slice(0, fleetCapacity)
      : []
    const fleetHourlyTotals = isFleetBusinessTemplate(template)
      ? fleetHourlyTotalsFromBusiness(profile, business, template)
      : null
    const hourlyIncome = isFleetBusinessTemplate(template)
      ? Math.max(0, asInt(fleetHourlyTotals?.hourlyIncome, 0))
      : Math.max(0, Math.round((template?.baseIncomePerHour || 0) * (1 + Math.max(0, business.level - 1) * 0.22)))
    const hourlyXpBase = isFleetBusinessTemplate(template)
      ? Math.max(0, asInt(fleetHourlyTotals?.hourlyXp, 0))
      : 0
    const hourlyXp = isFleetBusinessTemplate(template)
      ? weeklyEventXpGain(hourlyXpBase, timestamp, weeklyEvents)
      : 0
    if (isFleetBusinessTemplate(template)) {
      business.fleetRentTotal = Math.max(0, asInt(hourlyIncome, 0))
      business.fleetXpTotal = Math.max(0, asInt(hourlyXpBase, 0))
    }
    const nextVehicleCost = isFleetBusinessTemplate(template) && isUnlocked
      ? fleetVehicleBuildCost(profile, business, template, { timestamp, weeklyEvents })
      : null
    const catalog = isFleet && isUnlocked ? fleetCatalogOf(template).map((_, index) => fleetVehicleSpecForIndex(template, index)) : []
    const nextVehicleSpec = isFleet && isUnlocked ? fleetVehicleSpecForIndex(template, fleetCount) : null
    const vehicleOrderUnlockLevel = isFleetBusinessTemplate(template)
      ? fleetOrderUnlockLevelFromPlayerLevel(playerLevel, template)
      : 0
    const collectWindow = isFleet
      ? fleetCollectWindow(business.lastIncomeCollectedAt || timestamp, timestamp)
      : null
    const lastCollectedMs = isFleet ? collectWindow.lastIncomeMs : createdMs(business.lastIncomeCollectedAt || timestamp)
    const collectableCycles = isFleet ? collectWindow.elapsedCycles : 0
    const nextCollectAt = isFleet
      ? new Date(lastCollectedMs + FLEET_COLLECT_COOLDOWN_MS).toISOString()
      : ''
    const canCollectNow = isFleet
      ? isUnlocked && fleetCount > 0 && collectableCycles > 0
      : false
    const lastVehicleOrderMs = isFleetBusinessTemplate(template)
      ? createdMs(business.lastVehicleOrderedAt || '')
      : 0
    const nextVehicleOrderAt = isFleetBusinessTemplate(template) && lastVehicleOrderMs > 0
      ? new Date(lastVehicleOrderMs + FLEET_VEHICLE_ORDER_COOLDOWN_MS).toISOString()
      : ''
    const canOrderVehicleNow = isFleetBusinessTemplate(template)
      ? isUnlocked && (!nextVehicleOrderAt || createdMs(timestamp) >= createdMs(nextVehicleOrderAt)) && fleetCount < fleetCapacity
      : false
    const vehicles = isFleet && isUnlocked && rawFleetVehicles.length
      ? rawFleetVehicles.map((entry, index) => {
          const spec = fleetVehicleSpecByModelId(template, entry?.modelId) || fleetVehicleSpecForIndex(template, index)
          const costCash = Math.max(1, asInt(entry?.cost?.cash, asInt(spec?.cash, 1)))
          const costEngineKits = Math.max(0, asInt(entry?.cost?.engineKits, asInt(spec?.engineKits, 0)))
          const costSpareParts = Math.max(0, asInt(entry?.cost?.spareParts, asInt(spec?.spareParts, 0)))
          const costFuel = Math.max(0, asInt(entry?.cost?.fuel, asInt(spec?.fuel, 0)))
          const costEnergy = Math.max(0, asInt(entry?.cost?.energy, asInt(spec?.energy, 0)))
          const costCement = Math.max(0, asInt(entry?.cost?.cement, asInt(spec?.cement, 0)))
          const costTimber = Math.max(0, asInt(entry?.cost?.timber, asInt(spec?.timber, 0)))
          const costBrick = Math.max(0, asInt(entry?.cost?.brick, asInt(spec?.brick, 0)))
          const lifetime = resolveAssetLifetime(
            entry?.producedAt || entry?.acquiredAt || timestamp,
            timestamp,
            timestamp,
          )
          return {
            id: String(entry?.id || `${business.id}-veh-${index + 1}`),
            modelId: String(entry?.modelId || ''),
            name: String(entry?.name || ''),
            tier: normalizedFleetTier(entry?.tier),
            image: String(entry?.image || ''),
            emoji: String(entry?.emoji || ''),
            requiredLevel: Math.max(1, asInt(entry?.requiredLevel, 1)),
            rentPerHour: Math.max(1, asInt(entry?.rentPerHour, 0)),
            xp: Math.max(1, asInt(entry?.xp, 0)),
            cash: costCash,
            engineKits: costEngineKits,
            spareParts: costSpareParts,
            cement: costCement,
            timber: costTimber,
            brick: costBrick,
            cost: {
              cash: costCash,
              engineKits: costEngineKits,
              spareParts: costSpareParts,
              fuel: costFuel,
              energy: costEnergy,
              cement: costCement,
              timber: costTimber,
              brick: costBrick,
            },
            producedAt: lifetime.acquiredAt,
            expiresAt: lifetime.expiresAt,
            remainingMs: lifetime.remainingMs,
          }
        })
        .sort(
          (a, b) =>
            Math.max(0, asInt(b?.rentPerHour, 0)) - Math.max(0, asInt(a?.rentPerHour, 0)) ||
            Math.max(0, asInt(b?.requiredLevel, 0)) - Math.max(0, asInt(a?.requiredLevel, 0)),
        )
      : []
    const tierCounts = {
      standard: vehicles.filter((entry) => entry.tier === 'standard').length,
      rare: vehicles.filter((entry) => entry.tier === 'rare').length,
      luxury: vehicles.filter((entry) => entry.tier === 'luxury').length,
    }

    return {
      id: business.id,
      templateId: business.templateId,
      businessKind: isFleetBusinessTemplate(template) ? 'fleet' : 'standard',
      unlocked: isUnlocked,
      name: business.name,
      level: business.level,
      playerLevel,
      outputItemId: business.storageItemId,
      outputItemName: ITEM_BY_ID.get(business.storageItemId)?.name || business.storageItemId,
      storageAmount: business.storageAmount,
      storageCapacity: business.storageCapacity,
      fleetCount,
      fleetCapacity,
      maxFleetCapacity: isFleetBusinessTemplate(template)
        ? PLAYER_LEVEL_CAP
        : 0,
      hourlyIncome,
      hourlyXpBase,
      hourlyXp,
      fuelItemId: isFleetBusinessTemplate(template) ? String(template.fuelItemId || 'oil') : '',
      fuelItemName: isFleetBusinessTemplate(template)
        ? ITEM_BY_ID.get(String(template.fuelItemId || 'oil'))?.name || String(template.fuelItemId || 'oil')
        : '',
      fuelNeedPerHour,
      engineKitItemId: isFleetBusinessTemplate(template) ? 'engine-kit' : '',
      engineKitItemName: isFleetBusinessTemplate(template)
        ? ITEM_BY_ID.get('engine-kit')?.name || 'Motor'
        : '',
      heroImage: isFleetBusinessTemplate(template) ? String(template?.heroImage || '') : '',
      cardIcon: isFleetBusinessTemplate(template) ? String(template?.cardIcon || '') : '',
      nextVehicleCost,
      nextVehicle: nextVehicleSpec,
      vehicleOrderCooldownMinutes: isFleetBusinessTemplate(template)
        ? Math.round(FLEET_VEHICLE_ORDER_COOLDOWN_MS / MS_MINUTE)
        : 0,
      vehicleOrderUnlockLevel,
      nextVehicleOrderAt,
      canOrderVehicleNow,
      vehicles,
      tierCounts,
      vehicleCatalog: catalog,
      pendingIncome: isUnlocked ? getBusinessPendingIncome(profile, business, timestamp) : 0,
      collectableCycles,
      collectIntervalMinutes,
      nextCollectAt,
      canCollectNow,
      upgradeCost: businessUpgradeCost(business, { timestamp, weeklyEvents }),
      cycleMinutes: template?.cycleMinutes || 0,
    }
  })
}

function templateView(profile, timestamp = '') {
  const weeklyEvents = timestamp ? weeklyEventState(timestamp) : null
  return BUSINESS_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    unlocked: isFleetBusinessTemplate(template)
      ? isFleetTemplateUnlocked(profile, template.id)
      : true,
    unlockCost: isFleetBusinessTemplate(template)
      ? fleetUnlockCost(template.id, { timestamp, weeklyEvents })
      : 0,
    businessKind: isFleetBusinessTemplate(template) ? 'fleet' : 'standard',
    outputItemId: template.outputItemId,
    outputItemName: ITEM_BY_ID.get(template.outputItemId)?.name || template.outputItemId,
    baseIncomePerHour: template.baseIncomePerHour,
    outputPerCycle: template.outputPerCycle,
    cycleMinutes: template.cycleMinutes,
    heroImage: String(template.heroImage || ''),
    cardIcon: String(template.cardIcon || ''),
    maxFleetCapacity: isFleetBusinessTemplate(template)
      ? PLAYER_LEVEL_CAP
      : 0,
    baseRentPerVehiclePerHour: isFleetBusinessTemplate(template)
      ? Math.max(1, asInt(template.baseRentPerVehiclePerHour, 40))
      : 0,
    vehicleBuildCost: isFleetBusinessTemplate(template)
      ? {
          requiredLevel: fleetVehicleSpecForIndex(template, 0).requiredLevel,
          cash: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).cash, timestamp, weeklyEvents, { minPositive: 1 }),
          engineKits: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).engineKits, timestamp, weeklyEvents, { minPositive: 1 }),
          spareParts: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).spareParts, timestamp, weeklyEvents, { minPositive: 1 }),
          fuel: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).fuel, timestamp, weeklyEvents, { minPositive: 1 }),
          energy: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).energy, timestamp, weeklyEvents, { minPositive: 1 }),
          cement: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).cement, timestamp, weeklyEvents, { minPositive: 1 }),
          timber: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).timber, timestamp, weeklyEvents, { minPositive: 1 }),
          brick: weeklyEventCostValue(fleetVehicleSpecForIndex(template, 0).brick, timestamp, weeklyEvents, { minPositive: 1 }),
        }
      : null,
    vehicleCatalog: isFleetBusinessTemplate(template)
      ? fleetCatalogOf(template).map((_, index) => fleetVehicleSpecForIndex(template, index))
      : [],
    cost: isFleetBusinessTemplate(template)
      ? 0
      : businessPurchaseCost(template.id, profile.businesses, { timestamp, weeklyEvents }),
  }))
}

function missionView(profile) {
  const safeMissions = Array.isArray(profile?.missions) ? profile.missions : []
  return safeMissions.map((mission) => ({
    id: mission.id,
    blueprintId: mission.blueprintId || null,
    title: mission.title,
    description: mission.description,
    icon: mission.icon,
    metric: mission.metric,
    progress: Math.max(0, asInt(mission.progress, 0)),
    target: Math.max(1, asInt(mission.target, 1)),
    status: String(mission.status || 'active').trim().toLowerCase(),
    rewardCash: Math.max(0, asInt(mission.rewardCash, 0)),
    rewardXp: Math.max(0, asInt(mission.rewardXp, 0)),
    rewardRep: Math.max(0, asInt(mission.rewardRep, 0)),
    rewardItems: mission.rewardItems && typeof mission.rewardItems === 'object'
      ? mission.rewardItems
      : {},
    reward: {
      title: mission.title,
      cash: Math.max(0, asInt(mission.rewardCash, 0)),
      xp: Math.max(0, asInt(mission.rewardXp, 0)),
      reputation: Math.max(0, asInt(mission.rewardRep, 0)),
      rewardItems:
        mission.rewardItems && typeof mission.rewardItems === 'object'
          ? mission.rewardItems
          : {},
      ...(mission.rewardItems || {}),
    },
    createdAt: mission.createdAt || null,
    updatedAt: mission.updatedAt || null,
    claimedAt: mission.claimedAt || null,
  }))
}

function missionBatchView(profile, timestamp) {
  const nowMs = Math.max(0, createdMs(timestamp))
  const safeMissions = Array.isArray(profile?.missions) ? profile.missions : []
  const totalCount = safeMissions.length
  const claimedCount = safeMissions.filter(
    (mission) => String(mission?.status || '').trim().toLowerCase() === 'claimed',
  ).length
  const allClaimed = totalCount > 0 && claimedCount === totalCount
  let refreshAtMs = 0

  for (const mission of safeMissions) {
    const status = String(mission?.status || '').trim().toLowerCase()
    if (status !== 'claimed') continue
    const claimedAtMs =
      createdMs(mission?.claimedAt || '') ||
      createdMs(mission?.updatedAt || '') ||
      createdMs(mission?.createdAt || '')
    if (claimedAtMs <= 0) continue
    const slotRefreshAtMs = claimedAtMs + MISSION_BATCH_COOLDOWN_MS
    if (slotRefreshAtMs <= nowMs) continue
    refreshAtMs = refreshAtMs <= 0 ? slotRefreshAtMs : Math.min(refreshAtMs, slotRefreshAtMs)
  }

  if (refreshAtMs <= 0) {
    const legacyRefreshAtMs = createdMs(profile?.missionsRefreshAvailableAt || '')
    if (legacyRefreshAtMs > nowMs) {
      refreshAtMs = legacyRefreshAtMs
    }
  }

  const remainingMs = refreshAtMs > nowMs ? Math.max(0, refreshAtMs - nowMs) : 0

  return {
    size: MISSION_BATCH_SIZE,
    batchIndex: Math.max(1, asInt(profile?.missionsBatchIndex, 1)),
    totalCount,
    claimedCount,
    allClaimed,
    refreshCooldownMs: MISSION_BATCH_COOLDOWN_MS,
    refreshAvailableAt: refreshAtMs > 0 ? new Date(refreshAtMs).toISOString() : null,
    remainingMs,
  }
}

function limitOrderView(profile) {
  return profile.limitOrders
    .map((order) => ({
      id: order.id,
      itemId: order.itemId,
      itemName: ITEM_BY_ID.get(order.itemId)?.name || order.itemId,
      side: order.side,
      quantity: order.quantity,
      filledQuantity: order.filledQuantity || 0,
      remainingQuantity: Math.max(0, order.quantity - (order.filledQuantity || 0)),
      limitPrice: order.limitPrice,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      updatedAt: order.updatedAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 60)
}

function shipmentView(profile) {
  return profile.shipments
    .map((shipment) => ({
      id: shipment.id,
      itemId: shipment.itemId,
      itemName: shipment.itemName,
      quantity: shipment.quantity,
      routeId: shipment.routeId,
      routeName: shipment.routeName,
      insured: shipment.insured,
      riskRate: shipment.riskRate,
      shippingFee: shipment.shippingFee,
      expectedGross: shipment.expectedGross,
      claimableAmount: shipment.claimableAmount || 0,
      status: shipment.status,
      createdAt: shipment.createdAt,
      arrivalAt: shipment.arrivalAt,
      resolvedAt: shipment.resolvedAt || null,
      lossReason: shipment.lossReason || '',
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 80)
}

function contractView(profile) {
  return profile.contracts
    .map((contract) => ({
      id: contract.id,
      contractType: contract.contractType,
      initiator: contract.initiator,
      counterpartyName: contract.counterpartyName,
      itemId: contract.itemId,
      itemName: ITEM_BY_ID.get(contract.itemId)?.name || contract.itemId,
      quantity: contract.quantity,
      unitPrice: contract.unitPrice,
      totalPrice: contract.totalPrice,
      status: contract.status,
      createdAt: contract.createdAt,
      expiresAt: contract.expiresAt,
      resolvedAt: contract.resolvedAt || null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100)
}

function pushView(profile) {
  return {
    enabled: profile.pushCenter.enabled,
    subscriptions: profile.pushCenter.subscriptions,
    mobile: {
      configured: isMobilePushConfigured(),
      activeDeviceCount: profile.pushCenter.devices.length,
      devices: profile.pushCenter.devices.slice(0, 10).map((entry) => ({
        id: entry.id,
        platform: entry.platform,
        deviceId: entry.deviceId,
        appVersion: entry.appVersion || '',
        tokenTail: String(entry.token || '').slice(-10),
        lastSeenAt: entry.lastSeenAt,
      })),
    },
    priceAlerts: profile.pushCenter.priceAlerts
      .map((alert) => ({
        id: alert.id,
        itemId: alert.itemId,
        itemName: ITEM_BY_ID.get(alert.itemId)?.name || alert.itemId,
        direction: alert.direction,
        targetPrice: alert.targetPrice,
        active: alert.active !== false,
        createdAt: alert.createdAt,
        triggeredAt: alert.triggeredAt || null,
      }))
      .slice(0, 40),
    inbox: profile.pushCenter.inbox.slice(0, MAX_PUSH_HISTORY),
  }
}

function createdMs(value) {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function isPremiumActive(profile, timestamp) {
  if (!profile?.premiumUntil) return false
  return createdMs(profile.premiumUntil) > createdMs(timestamp)
}

function premiumStatus(profile, timestamp) {
  return {
    active: isPremiumActive(profile, timestamp),
    until: typeof profile?.premiumUntil === 'string' ? profile.premiumUntil : '',
    bulkMultiplier: PREMIUM_BULK_MULTIPLIER,
    plans: PREMIUM_PLANS,
  }
}

function normalizeDirectMessageText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DIRECT_MESSAGE_MAX_LENGTH)
}

function normalizeDirectMessageSubject(subject) {
  return String(subject || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function normalizeReportReasonText(text, maxLength = DIRECT_MESSAGE_REPORT_REASON_MAX_LENGTH) {
  const safeMax = Math.max(10, asInt(maxLength, DIRECT_MESSAGE_REPORT_REASON_MAX_LENGTH))
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, safeMax)
}

function ensureAdminAuditRoot(db) {
  if (!Array.isArray(db.adminAuditLogs)) db.adminAuditLogs = []
}

function ensureDirectMessageReportsRoot(db) {
  if (!Array.isArray(db.directMessageReports)) db.directMessageReports = []
}

function compactAdminAuditMeta(meta = {}) {
  if (!meta || typeof meta !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(meta)) {
    const safeKey = String(key || '').trim()
    if (!safeKey) continue
    if (value === undefined || value === null || value === '') continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    if (Array.isArray(value) && value.length === 0) continue
    out[safeKey] = value
  }
  return out
}

function pushAdminAuditLogEntry(db, payload = {}) {
  ensureAdminAuditRoot(db)
  db.adminAuditLogs.unshift({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    actorUserId: String(payload.actorUserId || '').trim(),
    actorUsername: String(payload.actorUsername || '').trim(),
    actorEmail: String(payload.actorEmail || '').trim(),
    actorRole: normalizeUserRole(payload.actorRole, USER_ROLES.PLAYER),
    action: String(payload.action || '').trim(),
    status: String(payload.status || 'failed').trim(),
    message: String(payload.message || '').trim(),
    targetUserId: String(payload.targetUserId || '').trim(),
    targetUsername: String(payload.targetUsername || '').trim(),
    targetEmail: String(payload.targetEmail || '').trim(),
    meta: compactAdminAuditMeta(payload.meta),
  })
  db.adminAuditLogs = db.adminAuditLogs.filter(Boolean).slice(0, DIRECT_MESSAGE_REPORT_AUDIT_LOG_LIMIT)
}

function ensureDirectMessagesRoot(db, timestamp = nowIso()) {
  if (!Array.isArray(db.directMessages)) {
    db.directMessages = []
    return
  }

  const list = []
  const nowMs = createdMs(timestamp) || Date.now()
  const cutoffMs = nowMs - MESSAGE_RETENTION_MS
  for (const entry of db.directMessages) {
    if (!entry || typeof entry !== 'object') continue
    const fromUserId = String(entry.fromUserId || '').trim()
    const toUserId = String(entry.toUserId || '').trim()
    const text = normalizeDirectMessageText(entry.text)
    if (!fromUserId || !toUserId || !text) continue

    const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : nowIso()
    if (createdMs(createdAt) < cutoffMs) continue

    list.push({
      id: String(entry.id || crypto.randomUUID()),
      fromUserId,
      toUserId,
      text,
      subject: normalizeDirectMessageSubject(entry.subject),
      createdAt,
      readAt: typeof entry.readAt === 'string' ? entry.readAt : null,
      replyToId: String(entry.replyToId || '').trim() || null,
    })
  }

  const maxPerUser = DIRECT_MESSAGE_HISTORY_LIMIT
  const userIds = new Set()
  for (const e of list) {
    userIds.add(e.fromUserId)
    userIds.add(e.toUserId)
  }
  const keepIds = new Set()
  for (const uid of userIds) {
    const involving = list.filter((e) => e.fromUserId === uid || e.toUserId === uid)
    involving.sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
    involving.slice(0, maxPerUser).forEach((e) => keepIds.add(e.id))
  }
  db.directMessages = list.filter((e) => keepIds.has(e.id))
}

function normalizeUniqueUserIdList(value) {
  const source = Array.isArray(value) ? value : []
  const seen = new Set()
  const output = []
  for (const entry of source) {
    const userId = String(entry || '').trim()
    if (!userId || seen.has(userId)) continue
    seen.add(userId)
    output.push(userId)
  }
  return output
}

function ensureSocialState(profile) {
  if (!profile || typeof profile !== 'object') return
  const rawSocial = profile.social && typeof profile.social === 'object' ? profile.social : {}
  profile.social = {
    friends: normalizeUniqueUserIdList(rawSocial.friends),
    blockedUserIds: normalizeUniqueUserIdList(rawSocial.blockedUserIds),
  }
}

function ensureFriendRequestsRoot(db) {
  const raw = Array.isArray(db.friendRequests) ? db.friendRequests : []
  const list = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const fromUserId = String(entry.fromUserId || '').trim()
    const toUserId = String(entry.toUserId || '').trim()
    if (!fromUserId || !toUserId || fromUserId === toUserId) continue
    const status = String(entry.status || 'pending').trim().toLowerCase()
    const safeStatus = FRIEND_REQUEST_STATUS_SET.has(status) ? status : 'pending'
    const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : nowIso()
    const respondedAt = typeof entry.respondedAt === 'string' ? entry.respondedAt : ''
    const seenBy = normalizeUniqueUserIdList(entry.seenBy)
      .filter((id) => id === fromUserId || id === toUserId)
    list.push({
      id: String(entry.id || crypto.randomUUID()),
      fromUserId,
      toUserId,
      status: safeStatus,
      seenBy,
      createdAt,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : createdAt,
      respondedAt: respondedAt || null,
    })
  }
  db.friendRequests = list
    .sort((a, b) => createdMs(b.updatedAt || b.createdAt) - createdMs(a.updatedAt || a.createdAt))
    .slice(0, FRIEND_REQUEST_HISTORY_LIMIT)
}

function hasUserIdInList(value, userId) {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId || !Array.isArray(value)) return false
  return value.some((entry) => String(entry || '').trim() === safeUserId)
}

function addUserIdToList(value, userId) {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return normalizeUniqueUserIdList(value)
  return normalizeUniqueUserIdList([...(Array.isArray(value) ? value : []), safeUserId])
}

function removeUserIdFromList(value, userId) {
  const safeUserId = String(userId || '').trim()
  return normalizeUniqueUserIdList(value).filter((entry) => entry !== safeUserId)
}

function usersAreFriends(profileA, profileB, userAId, userBId) {
  const safeA = String(userAId || '').trim()
  const safeB = String(userBId || '').trim()
  if (!safeA || !safeB) return false
  const aFriend = hasUserIdInList(profileA?.social?.friends, safeB)
  const bFriend = hasUserIdInList(profileB?.social?.friends, safeA)
  return aFriend && bFriend
}

function userBlocked(profile, targetUserId) {
  const safeTarget = String(targetUserId || '').trim()
  if (!safeTarget) return false
  return hasUserIdInList(profile?.social?.blockedUserIds, safeTarget)
}

function latestPendingFriendRequest(db, fromUserId, toUserId) {
  const safeFrom = String(fromUserId || '').trim()
  const safeTo = String(toUserId || '').trim()
  if (!safeFrom || !safeTo) return null
  const requests = Array.isArray(db.friendRequests) ? db.friendRequests : []
  for (const request of requests) {
    if (!request || typeof request !== 'object') continue
    if (request.status !== 'pending') continue
    if (String(request.fromUserId || '').trim() !== safeFrom) continue
    if (String(request.toUserId || '').trim() !== safeTo) continue
    return request
  }
  return null
}

function profilePresenceView(profile, timestamp) {
  const safeLastActiveAt = String(profile?.lastSeenAt || profile?.updatedAt || profile?.createdAt || '').trim()
  const lastActiveMs = createdMs(safeLastActiveAt)
  const nowMs = createdMs(timestamp || nowIso())
  const isOnline = lastActiveMs > 0 && nowMs - lastActiveMs <= PROFILE_ONLINE_WINDOW_MS
  return {
    isOnline,
    lastActiveAt: safeLastActiveAt,
  }
}

function timedRestrictionView(untilValue, reasonValue, fallbackReason, nowMs) {
  const rawUntil = String(untilValue || '').trim()
  const untilMs = createdMs(rawUntil)
  const active = Boolean(rawUntil) && Number.isFinite(untilMs) && untilMs > nowMs
  return {
    active,
    until: active ? new Date(untilMs).toISOString() : '',
    reason: active ? (String(reasonValue || '').trim() || String(fallbackReason || '').trim()) : '',
    remainingMs: active ? Math.max(0, untilMs - nowMs) : 0,
  }
}

function userModerationStateView(user, timestamp = nowIso()) {
  const nowMs = createdMs(timestamp) || Date.now()
  const chatBlock = timedRestrictionView(user?.chatBlockedUntil, user?.chatBlockedReason, 'Yönetici sohbet engeli', nowMs)
  const dmBlock = timedRestrictionView(user?.dmBlockedUntil, user?.dmBlockedReason, 'Yönetici mesaj engeli', nowMs)
  const mute = timedRestrictionView(user?.chatMuteUntil, user?.chatMuteReason, 'Sohbet susturmasi', nowMs)
  return {
    chatBlock: {
      active: chatBlock.active,
      blockedUntil: chatBlock.until,
      reason: chatBlock.reason,
      remainingMs: chatBlock.remainingMs,
    },
    dmBlock: {
      active: dmBlock.active,
      blockedUntil: dmBlock.until,
      reason: dmBlock.reason,
      remainingMs: dmBlock.remainingMs,
    },
    mute: {
      active: mute.active,
      mutedUntil: mute.until,
      reason: mute.reason,
      remainingMs: mute.remainingMs,
    },
  }
}

function socialRelationshipView(db, viewerProfile, targetProfile, timestamp) {
  const viewerUserId = String(viewerProfile?.userId || '').trim()
  const targetUserId = String(targetProfile?.userId || '').trim()
  if (!viewerUserId || !targetUserId || viewerUserId === targetUserId) {
    return {
      blockedByMe: false,
      blockedMe: false,
      isFriend: false,
      outgoingRequest: null,
      incomingRequest: null,
      canSendMessage: true,
      canSendFriendRequest: false,
    }
  }

  const outgoingRequest = latestPendingFriendRequest(db, viewerUserId, targetUserId)
  const incomingRequest = latestPendingFriendRequest(db, targetUserId, viewerUserId)
  const blockedByMe = userBlocked(viewerProfile, targetUserId)
  const blockedMe = userBlocked(targetProfile, viewerUserId)
  const isFriend = usersAreFriends(viewerProfile, targetProfile, viewerUserId, targetUserId)
  const canSendMessage = !blockedByMe && !blockedMe
  const canSendFriendRequest = !blockedByMe && !blockedMe && !isFriend && !outgoingRequest && !incomingRequest

  return {
    blockedByMe,
    blockedMe,
    isFriend,
    outgoingRequest: outgoingRequest
      ? {
          id: outgoingRequest.id,
          status: outgoingRequest.status,
          createdAt: outgoingRequest.createdAt,
        }
      : null,
    incomingRequest: incomingRequest
      ? {
          id: incomingRequest.id,
          status: incomingRequest.status,
          createdAt: incomingRequest.createdAt,
        }
      : null,
    canSendMessage,
    canSendFriendRequest,
    updatedAt: timestamp,
  }
}

function safeMessageFilter(filter) {
  const safeFilter = String(filter || '').trim().toLowerCase()
  return MESSAGE_FILTER_SET.has(safeFilter) ? safeFilter : 'all'
}

function messageMetaView(db, userId, timestamp = nowIso()) {
  const safeUserId = String(userId || '').trim()
  const user = db.users.find((entry) => entry.id === safeUserId)
  const profile = db.gameProfiles.find((entry) => entry.userId === safeUserId)
  const role = userRoleValue(user)
  const currentSeasonKey = seasonKeyFromIso(timestamp)
  const rawSeasonBadge = seasonBadgeView(profile?.league?.seasonBadge)
  const seasonBadge = rawSeasonBadge && normalizeSeasonKey(rawSeasonBadge.visibleSeasonKey) === currentSeasonKey
    ? rawSeasonBadge
    : null
  return {
    userId: safeUserId,
    username: user?.username || profile?.username || 'Oyuncu',
    avatarUrl: String(profile?.avatarUrl || '').trim(),
    level: levelInfoFromXp(profile?.xpTotal || 0).level,
    premium: isPremiumActive(profile, timestamp),
    seasonBadge,
    role,
    roleLabel: userRoleLabel(role),
  }
}

function notificationFilter(type) {
  if (isAlertType(type)) return 'alert'
  if (type === 'message') return 'message'
  if (['market', 'business', 'factory', 'mine', 'shipment', 'contract', 'mission', 'league'].includes(type)) {
    return 'trade'
  }
  return 'other'
}

function transactionTitle(kind) {
  if (kind === 'market_buy') return 'Al\u0131m \u0130\u015flemi'
  if (kind === 'market_sell') return 'Sat\u0131\u015f \u0130\u015flemi'
  if (kind === 'forex_buy') return 'D\u00f6viz Al\u0131m\u0131'
  if (kind === 'forex_sell') return 'D\u00f6viz Bozumu'
  if (kind === 'shipment_claim') return 'Tahsilat'
  if (kind === 'business_collect') return '\u00dcretim Tahsilat\u0131'
  if (kind === 'business_collect_bulk') return 'Toplu Tahsilat'
  if (kind === 'factory_collect') return 'Fabrika Tahsilat\u0131'
  if (kind === 'factory_collect_bulk') return 'Fabrika Toplu Tahsilat'
  if (kind === 'contract_accept') return 'S\u00f6zle\u015fme Sonucu'
  if (kind === 'mission_claim') return 'G\u00f6rev \u00d6d\u00fcl\u00fc'
  if (kind === 'league_claim') return 'Lig \u00d6d\u00fcl\u00fc'
  if (kind === 'season_chest_open') return 'Sezon Sandığı'
  return '\u0130\u015flem Kayd\u0131'
}

function directMessageItemView(db, entry, currentUserId, timestamp = nowIso()) {
  const incoming = entry.toUserId === currentUserId
  const counterpartId = incoming ? entry.fromUserId : entry.toUserId
  const counterpart = messageMetaView(db, counterpartId, timestamp)
  return {
    id: `dm:${entry.id}`,
    source: 'direct',
    filter: 'message',
    title: incoming
      ? `${counterpart.username} mesaj g\u00f6nderdi`
      : `${counterpart.username} kullan\u0131c\u0131s\u0131na yazd\u0131n`,
    message: entry.text,
    preview: entry.text.slice(0, 120),
    createdAt: entry.createdAt,
    read: incoming ? Boolean(entry.readAt) : true,
    canReply: true,
    incoming,
    subject: entry.subject || '',
    counterpart,
    replyToId: entry.replyToId || null,
  }
}

function friendRequestItemView(db, entry, currentUserId, timestamp = nowIso()) {
  const safeCurrentUserId = String(currentUserId || '').trim()
  const fromUserId = String(entry?.fromUserId || '').trim()
  const toUserId = String(entry?.toUserId || '').trim()
  const incoming = toUserId === safeCurrentUserId
  const counterpartId = incoming ? fromUserId : toUserId
  const counterpart = messageMetaView(db, counterpartId, timestamp)
  const status = String(entry?.status || 'pending').trim().toLowerCase()
  const pending = status === 'pending'
  const seenBy = normalizeUniqueUserIdList(entry?.seenBy)
  const hasSeen = seenBy.includes(safeCurrentUserId)
  return {
    id: `friend_request:${entry.id}`,
    source: 'friend_request',
    filter: 'other',
    type: 'friend_request',
    title: incoming ? 'Arkadaşlık isteği' : 'Gönderilen arkadaşlık isteği',
    message: incoming
      ? `${counterpart.username} size arkadaşlık isteği gönderdi.`
      : `${counterpart.username} kullanıcısına arkadaşlık isteği gönderdin.`,
    preview: incoming
      ? `${counterpart.username} arkadaşlık isteği`
      : `${counterpart.username} kullanıcısına arkadaşlık isteği`,
    createdAt: entry?.createdAt,
    read: !incoming || !pending || hasSeen,
    canReply: false,
    incoming,
    subject: 'Arkadaşlık isteği',
    counterpart,
    replyToId: null,
    request: {
      id: entry.id,
      status,
      incoming,
      fromUserId,
      toUserId,
      createdAt: entry?.createdAt,
      updatedAt: entry?.updatedAt || entry?.createdAt,
      seen: hasSeen,
    },
  }
}

function pushItemView(entry) {
  const filter = notificationFilter(entry.type)
  const message = String(entry.message || '').trim()
  return {
    id: `push:${entry.id}`,
    source: 'push',
    filter,
    title: String(entry.title || 'Bildirim').trim() || 'Bildirim',
    message,
    preview: message.slice(0, 120),
    createdAt: entry.createdAt,
    read: entry.read === true,
    canReply: false,
    incoming: true,
    subject: '',
    counterpart: null,
    replyToId: null,
  }
}

function notificationItemView(entry) {
  const filter = notificationFilter(entry.type)
  const message = String(entry.message || '').trim()
  return {
    id: `notif:${entry.id}`,
    source: 'notification',
    filter,
    type: entry.type || 'other',
    title: filter === 'trade' ? 'Ticaret Bildirimi' : filter === 'alert' ? 'Uyar\u0131' : 'Sistem Mesaj\u0131',
    message,
    preview: message.slice(0, 120),
    createdAt: entry.createdAt,
    read: entry.read === true,
    canReply: false,
    incoming: true,
    subject: '',
    counterpart: null,
    replyToId: null,
  }
}

const MESSAGE_CENTER_ALERT_DEDUPE_WINDOW_MS = 2 * MS_MINUTE

function messageCenterAlertDedupKey(entry) {
  if (!entry || typeof entry !== 'object') return ''
  const source = String(entry.source || '').trim().toLowerCase()
  if (!['push', 'notification'].includes(source)) return ''
  const message = String(entry.message || '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!message) return ''
  const type = String(entry.type || entry.filter || 'other').trim().toLowerCase() || 'other'
  return `${type}|${message}`
}

function dedupeMessageCenterAlertItems(items) {
  const safeItems = Array.isArray(items) ? items : []
  const keyToMs = new Map()
  const deduped = []

  for (const entry of safeItems) {
    const dedupeKey = messageCenterAlertDedupKey(entry)
    if (!dedupeKey) {
      deduped.push(entry)
      continue
    }
    const entryMsRaw = createdMs(entry.createdAt)
    const entryMs = entryMsRaw > 0 ? entryMsRaw : Date.now()
    const prevMs = keyToMs.get(dedupeKey)
    if (Number.isFinite(prevMs) && Math.abs(prevMs - entryMs) <= MESSAGE_CENTER_ALERT_DEDUPE_WINDOW_MS) {
      continue
    }
    keyToMs.set(dedupeKey, entryMs)
    deduped.push(entry)
  }

  return deduped
}

function announcementItemView(entry) {
  const title = String(entry.title || 'Duyuru').trim() || 'Duyuru'
  const message = String(entry.body || entry.message || '').trim()
  const announcementType = normalizeAnnouncementType(entry?.announcementType ?? entry?.type)
  const announcementTag = announcementType === 'update' ? 'G\u00dcNCELLEME' : 'DUYURU'
  return {
    id: `ann:${entry.id}`,
    source: 'announcement',
    filter: 'alert',
    type: 'alert',
    announcementType,
    announcementTag,
    title,
    message,
    preview: message.slice(0, 120),
    createdAt: entry.createdAt,
    read: true,
    canReply: false,
    incoming: true,
    subject: '',
    counterpart: null,
    replyToId: null,
  }
}

const MAX_OVERVIEW_ANNOUNCEMENTS = 30

function normalizeAnnouncementType(value, fallback = 'announcement') {
  const safeFallback = fallback === 'update' ? 'update' : 'announcement'
  const safe = normalizeLookup(value).replace(/[\s_-]+/g, '')
  if (!safe) return safeFallback
  if (['update', 'guncelleme', 'guncelle', 'patch', 'bakim'].includes(safe)) return 'update'
  if (['announcement', 'duyuru', 'bildiri', 'news'].includes(safe)) return 'announcement'
  return safeFallback
}

function overviewAnnouncementView(entry, userById = new Map()) {
  const id = String(entry?.id || '').trim()
  if (!id) return null
  const title = String(entry?.title || 'Duyuru').replace(/\s+/g, ' ').trim() || 'Duyuru'
  const body = String(entry?.body || entry?.message || '').replace(/\r/g, '').trim()
  const announcementType = normalizeAnnouncementType(entry?.announcementType ?? entry?.type)
  const createdAt = String(entry?.createdAt || '').trim()
  const createdByUserId = String(entry?.createdBy || '').trim()
  const creator = createdByUserId ? userById.get(createdByUserId) : null
  const createdByUsername =
    String(entry?.createdByUsername || creator?.username || 'Yönetim').trim() || 'Yönetim'

  return {
    id,
    title,
    body: body || title,
    announcementType,
    announcementTag: announcementType === 'update' ? 'G\u00dcNCELLEME' : 'DUYURU',
    createdAt,
    createdByUserId,
    createdByUsername,
  }
}

function transactionSourceType(kind) {
  if (['market_buy', 'market_sell', 'forex_buy', 'forex_sell'].includes(kind)) return 'market'
  if (['vehicle_market_buy', 'vehicle_market_sell', 'company_upgrade', 'business_collect', 'business_collect_bulk'].includes(kind)) return 'business'
  if (['factory_collect', 'factory_collect_bulk', 'factory_upgrade_start', 'factory_upgrade_speedup'].includes(kind)) return 'factory'
  return 'other'
}

function transactionItemView(entry) {
  if (entry.kind === 'system_init') return null
  const detail = String(entry.detail || '').trim()
  const amount = asInt(entry.amount, 0)
  const amountLabel = amount >= 0 ? `+${amount}` : `${amount}`
  return {
    id: `txn:${entry.id}`,
    source: 'transaction',
    filter: 'trade',
    type: transactionSourceType(entry.kind),
    title: transactionTitle(entry.kind),
    message: detail,
    preview: `${detail} (${amountLabel})`.slice(0, 140),
    createdAt: entry.createdAt,
    read: true,
    canReply: false,
    incoming: true,
    subject: '',
    counterpart: null,
    replyToId: null,
    amount,
  }
}

function messageCenterView(db, profile, currentUserId, options = {}, timestamp = nowIso()) {
  const filter = safeMessageFilter(options.filter)
  const limit = clamp(asInt(options.limit, MESSAGE_CENTER_LIMIT), 1, MESSAGE_CENTER_LIMIT)
  ensureSocialState(profile)
  const currentUser = db.users.find((entry) => String(entry?.id || '').trim() === String(currentUserId || '').trim())
  const moderation = userModerationStateView(currentUser, timestamp)

  // Kullanıcı başına okunmamış DM sayısı (karşı oyuncu bazında)
  const unreadDirectByCounterpart = db.directMessages.reduce((acc, entry) => {
    if (entry.toUserId !== currentUserId) return acc
    if (entry.readAt) return acc
    const counterpartId = entry.fromUserId
    if (!counterpartId) return acc
    acc[counterpartId] = (acc[counterpartId] || 0) + 1
    return acc
  }, {})

  // DM'leri konuşma bazlı topla: her kullanıcı için tek satır (en son mesaj), sayaç sadece o konuşmadaki okunmamış
  const directConversations = new Map()
  for (const entry of db.directMessages) {
    if (entry.toUserId !== currentUserId && entry.fromUserId !== currentUserId) continue
    const counterpartId = entry.toUserId === currentUserId ? entry.fromUserId : entry.toUserId
    const existing = directConversations.get(counterpartId)
    if (!existing || createdMs(entry.createdAt) > createdMs(existing.createdAt)) {
      directConversations.set(counterpartId, entry)
    }
  }
  const directItems = Array.from(directConversations.entries()).map(([counterpartId, entry]) => {
    const base = directMessageItemView(db, entry, currentUserId, timestamp)
    const unreadCount = unreadDirectByCounterpart[counterpartId] || 0
    const safeCounterpartId = String(counterpartId || '').trim()
    const counterpartProfile = db.gameProfiles.find(
      (candidate) => String(candidate?.userId || '').trim() === safeCounterpartId,
    )
    if (counterpartProfile) {
      ensureSocialState(counterpartProfile)
    }
    const relationship = socialRelationshipView(db, profile, counterpartProfile, timestamp)
    return {
      ...base,
      id: base.id,
      read: unreadCount === 0,
      unreadCount,
      relationship,
    }
  })

  const friendRequestItems = (db.friendRequests || [])
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false
      if (entry.status !== 'pending') return false
      const fromUserId = String(entry.fromUserId || '').trim()
      const toUserId = String(entry.toUserId || '').trim()
      return fromUserId === currentUserId || toUserId === currentUserId
    })
    .map((entry) => friendRequestItemView(db, entry, currentUserId, timestamp))

  const pushItems = (profile.pushCenter?.inbox || []).map((entry) => pushItemView(entry))
  const notificationItems = (profile.notifications || []).map((entry) => notificationItemView(entry))
  const transactionItems = (profile.transactions || [])
    .map((entry) => transactionItemView(entry))
    .filter((entry) => entry)
  const announcementItems = (db.globalAnnouncements || []).map((entry) => announcementItemView(entry))
  const alertItems = dedupeMessageCenterAlertItems([
    ...pushItems,
    ...notificationItems,
  ])

  const all = [
    ...announcementItems,
    ...directItems,
    ...friendRequestItems,
    ...alertItems,
    ...transactionItems,
  ]
    .filter((entry) => entry && entry.id)
    .sort((a, b) => createdMs(b.createdAt) - createdMs(a.createdAt))
    .slice(0, MESSAGE_CENTER_LIMIT * 4)

  const counts = {
    all: all.length,
    message: all.filter((entry) => entry.filter === 'message').length,
    trade: all.filter((entry) => entry.filter === 'trade').length,
    other: all.filter((entry) => entry.filter === 'other').length,
    alert: all.filter((entry) => entry.filter === 'alert').length,
  }

  // Toplam okunmamış: sadece gerçek okunmamış mesaj sayıları (konuşma başına bir kez sayılır)
  const totalUnreadDirect = Object.values(unreadDirectByCounterpart).reduce((s, n) => s + n, 0)
  const unreadFriendRequests = friendRequestItems.filter((entry) => entry.read !== true).length
  const unreadCount =
    totalUnreadDirect +
    unreadFriendRequests +
    alertItems.filter((entry) => entry?.read !== true).length +
    transactionItems.filter((e) => !e.read).length +
    announcementItems.filter((e) => !e.read).length
  const spotlight = all.find((entry) => !entry.read) || all[0] || null
  const items =
    filter === 'all'
      ? all.slice(0, limit)
      : all.filter((entry) => entry.filter === filter).slice(0, limit)

  return {
    filter,
    counts,
    unreadCount,
    spotlight,
    items,
    moderation,
  }
}

function leagueStandingView(db, currentUserId, timestamp) {
  const rows = db.gameProfiles.map((profile) => {
    normalizeLeagueState(profile, timestamp)
    const user = db.users.find((entry) => entry.id === profile.userId)
    const safeWallet = Math.max(0, asInt(profile.wallet, 0))
    const safeLevel = Math.max(1, asInt(levelInfoFromXp(profile.xpTotal)?.level, 1))
    const safeDisplayName = String(profile.displayName || '').trim()
    const safeUsername = String(user?.username || profile.username || 'Oyuncu').trim() || 'Oyuncu'
    return {
      userId: profile.userId,
      username: safeUsername,
      displayName: safeDisplayName || safeUsername,
      avatar: avatarView(profile),
      seasonBadge: seasonBadgeView(profile?.league?.seasonBadge),
      wallet: safeWallet,
      level: safeLevel,
      dailyPoints: profile.league.dailyPoints,
      weeklyPoints: profile.league.weeklyPoints,
      seasonPoints: profile.league.seasonPoints,
    }
  })

  const sortByMetric = (metric, options = {}) => {
    const requestedLimit = Number(options.limit)
    const safeLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.max(1, Math.trunc(requestedLimit))
      : rows.length
    return (
    rows
      .slice()
      .sort((left, right) => {
        const primaryDiff = Number(right?.[metric] || 0) - Number(left?.[metric] || 0)
        if (primaryDiff !== 0) return primaryDiff
        const walletDiff = Number(right?.wallet || 0) - Number(left?.wallet || 0)
        if (walletDiff !== 0) return walletDiff
        const levelDiff = Number(right?.level || 0) - Number(left?.level || 0)
        if (levelDiff !== 0) return levelDiff
        return String(left?.username || '').localeCompare(String(right?.username || ''), 'tr')
      })
      .slice(0, safeLimit)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        username: entry.username,
        displayName: entry.displayName,
        avatar: entry.avatar,
        seasonBadge: seasonBadgeView(entry.seasonBadge),
        points: Math.max(0, asInt(entry[metric], 0)),
        wallet: Math.max(0, asInt(entry.wallet, 0)),
        level: Math.max(1, asInt(entry.level, 1)),
        isMe: String(entry.userId || '') === String(currentUserId || ''),
      }))
    )
  }

  return {
    daily: sortByMetric('dailyPoints', { limit: 50 }),
    weekly: sortByMetric('weeklyPoints', { limit: 50 }),
    season: sortByMetric('seasonPoints'),
    cash: sortByMetric('wallet'),
    level: sortByMetric('level'),
  }
}

function getOverviewPayload(db, profile, user) {
  const timestamp = nowIso()
  const weeklyEvents = weeklyEventState(timestamp)
  const levelInfo = levelInfoFromXp(profile.xpTotal)
  const marketItems = db.marketState.items.map((item) => marketItemView(profile, item))
  const inventory = inventoryView(profile, marketItems)
  const businesses = businessView(profile, timestamp)
  const netWorthBreakdown = computeProfileNetWorth(profile, timestamp, inventory, db.forexState)
  const moderation = userModerationStateView(user, timestamp)
  const userById = new Map(
    (db.users || [])
      .map((entry) => [String(entry?.id || '').trim(), entry]),
  )
  const announcements = (db.globalAnnouncements || [])
    .map((entry) => overviewAnnouncementView(entry, userById))
    .filter(Boolean)
    .slice(0, MAX_OVERVIEW_ANNOUNCEMENTS)

  return {
    success: true,
    profile: {
      userId: profile.userId,
      username: (profile.displayName && String(profile.displayName).trim()) || user.username,
      displayName: profile.displayName && String(profile.displayName).trim() ? profile.displayName : undefined,
      avatar: avatarView(profile),
      wallet: profile.wallet,
      bank: profile.bank,
      reputation: profile.reputation,
      energy: profile.energy,
      levelInfo,
      inventorySlots: inventory.length,
      netWorth: netWorthBreakdown.netWorth,
      netWorthBreakdown: {
        wallet: netWorthBreakdown.wallet,
        bank: netWorthBreakdown.bank,
        inventoryValue: netWorthBreakdown.inventoryValue,
        fleetValue: netWorthBreakdown.fleetValue,
        logisticsValue: netWorthBreakdown.logisticsValue,
        forexValue: netWorthBreakdown.forexValue,
      },
      totalBusinesses: businesses.length,
      moderation,
      diamondStore: diamondStoreView(profile),
      dailyLogin: dailyLoginView(profile, timestamp),
    },
    premium: premiumStatus(profile, timestamp),
    events: weeklyEvents,
    highlights: {
      queuePlayers: 120 + Math.floor(Math.random() * 18),
      openRooms: 4 + Math.floor(Math.random() * 3),
      pingMs: 34 + Math.floor(Math.random() * 9),
      region: 'TR/EU',
    },
    notifications: profile.notifications.slice(0, 6),
    announcements,
  }
}

export async function getGameOverview(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const user = db.users.find((item) => item.id === userId)
    if (!user) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const profile = ensureProfile(db, userId, timestamp)
    runGameTick(db, profile, timestamp)

    result = getOverviewPayload(db, profile, user)
    return db
  })

  return result
}

export async function getMarket(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    ensureFriendRequestsRoot(db)

    const items = db.marketState.items.map((item) => marketItemView(profile, item))
    const openOrders = limitOrderView(profile).filter((o) => o.status === 'open')

    const sellOrders = []
    for (const p of db.gameProfiles) {
      if (p.userId === profile.userId) continue
      const orders = Array.isArray(p.limitOrders) ? p.limitOrders : []
      for (const order of orders) {
        if (!order || order.status !== 'open' || order.side !== 'sell') continue
        const remaining = orderRemainingQuantity(order)
        if (remaining <= 0) continue
        const itemDef = ITEM_BY_ID.get(order.itemId)
        if (!itemDef) continue
        sellOrders.push({
          orderId: order.id,
          itemId: order.itemId,
          itemName: itemDef.name || order.itemId,
          quantity: remaining,
          limitPrice: Math.max(1, asInt(order.limitPrice, 0)),
          sellerName: String(p.username || p.displayName || 'Oyuncu').trim() || 'Oyuncu',
          sellerUserId: p.userId,
        })
      }
    }
    sellOrders.sort((a, b) => (a.itemId === b.itemId ? a.limitPrice - b.limitPrice : (a.itemId || '').localeCompare(b.itemId || '')))

    const todayKey = dailyStoreDayKeyFromIso(timestamp)
    if (profile.sellListingsDayKey !== todayKey) {
      profile.sellListingsDayKey = todayKey
      profile.sellListingsCountToday = 0
    }
    const sellListingsUsedToday = Math.max(0, asInt(profile.sellListingsCountToday, 0))
    const resetInfo = dailyStoreResetInfoFromIso(timestamp)

    result = {
      success: true,
      wallet: profile.wallet,
      items,
      inventory: inventoryView(profile, items),
      activeAuctions: getActiveAuctions(db, profile.userId).slice(0, 8),
      openOrders,
      sellOrders,
      sellListingsLimit: SELL_LISTINGS_DAILY_LIMIT,
      sellListingsUsedToday,
      sellListingsNextResetAt: resetInfo.nextResetAt,
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function runForexClockMaintenance() {
  const probeTimestamp = nowIso()
  const probeDb = await readDb()
  ensureGameRoot(probeDb, probeTimestamp)
  const pending = forexTickMeta(probeDb.forexState, probeTimestamp)
  if ((pending?.steps || 0) <= 0) {
    return {
      success: true,
      updated: false,
      steps: 0,
      updatedAt: String(probeDb?.forexState?.lastUpdatedAt || ''),
    }
  }

  let result = {
    success: true,
    updated: false,
    steps: 0,
    updatedAt: '',
  }

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const tickResult = tickForex(db.forexState, timestamp)
    if (tickResult?.updated) {
      notifyAllProfilesForexUpdated(db, timestamp)
    }
    result = {
      success: true,
      updated: Boolean(tickResult?.updated),
      steps: Math.max(0, asInt(tickResult?.steps, 0)),
      updatedAt: String(tickResult?.updatedAt || db?.forexState?.lastUpdatedAt || timestamp),
    }
    return db
  })

  return result
}

export async function runHistoryRetentionMaintenance() {
  let result = {
    success: true,
    updated: false,
    profilesScanned: 0,
    transactionsTrimmed: 0,
    notificationsTrimmed: 0,
    pushInboxTrimmed: 0,
    directMessagesTrimmed: 0,
    ranAt: '',
  }

  await updateDb((db) => {
    const timestamp = nowIso()

    if (!Array.isArray(db.gameProfiles)) {
      db.gameProfiles = []
    }

    const beforeDirectMessages = Array.isArray(db.directMessages) ? db.directMessages.length : 0
    ensureDirectMessagesRoot(db, timestamp)
    const afterDirectMessages = Array.isArray(db.directMessages) ? db.directMessages.length : 0

    let transactionsTrimmed = 0
    let notificationsTrimmed = 0
    let pushInboxTrimmed = 0

    for (const profile of db.gameProfiles) {
      if (!profile || typeof profile !== 'object') continue
      const trimmed = trimProfileMessageHistories(profile, timestamp)
      transactionsTrimmed += trimmed.transactionsTrimmed
      notificationsTrimmed += trimmed.notificationsTrimmed
      pushInboxTrimmed += trimmed.pushInboxTrimmed
    }

    const directMessagesTrimmed = Math.max(0, beforeDirectMessages - afterDirectMessages)
    const updated =
      transactionsTrimmed > 0 ||
      notificationsTrimmed > 0 ||
      pushInboxTrimmed > 0 ||
      directMessagesTrimmed > 0

    result = {
      success: true,
      updated,
      profilesScanned: db.gameProfiles.length,
      transactionsTrimmed,
      notificationsTrimmed,
      pushInboxTrimmed,
      directMessagesTrimmed,
      ranAt: timestamp,
    }

    if (!updated) {
      return NO_DB_WRITE
    }

    return db
  })

  return result
}

export async function getForex(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const forexState = db.forexState
    const marketQuote = (forexState.pairs || [])
      .map((pair) => forexPairView(profile, pair))[0] || null
    const marketHolding = marketQuote?.holding || {
      quantity: 0,
      costTry: 0,
      marketValueTry: 0,
      unrealizedPnlTry: 0,
      unrealizedPnlPercent: 0,
      realizedPnlTry: 0,
    }
    const marketUpdatedAt = String(marketQuote?.updatedAt || forexState?.lastUpdatedAt || timestamp).trim()
    const marketNextUpdateAt = forexNextUpdateAt(marketUpdatedAt, createdMs(timestamp))

    result = {
      success: true,
      wallet: profile.wallet,
      market: marketQuote
        ? {
            id: marketQuote.id,
            code: marketQuote.code,
            name: marketQuote.name,
            minRate: marketQuote.minRate,
            maxRate: marketQuote.maxRate,
            rate: marketQuote.rate,
            buyRate: marketQuote.buyRate,
            sellRate: marketQuote.sellRate,
            spreadRate: marketQuote.spreadRate,
            dayHigh: marketQuote.dayHigh,
            dayLow: marketQuote.dayLow,
            changePercent: marketQuote.changePercent,
            dayChangePercent: marketQuote.dayChangePercent,
            history: marketQuote.history,
            updatedAt: marketUpdatedAt,
            nextUpdateAt: marketNextUpdateAt,
            updateIntervalMs: FOREX_UPDATE_INTERVAL_MS,
          }
        : null,
      holding: marketHolding,
      investmentNote:
        'Gelece\u011fe yat\u0131r\u0131m yaparken garanti kazan\u00e7 olmad\u0131\u011f\u0131n\u0131 unutma. TCT kuru, \u015fans, risk ve zamanlamaya ba\u011fl\u0131 dalgalan\u0131r.',
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function getBank(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    result = {
      success: true,
      bank: bankView(profile, timestamp),
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function depositBankCash(userId, payload = {}) {
  const amount = Math.max(0, asInt(payload?.amount, 0))
  if (amount < BANK_MIN_TRANSFER_AMOUNT) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: `Yatırılacak tutar en az ${BANK_MIN_TRANSFER_AMOUNT} olmalıdır.` },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    if (profile.wallet < amount) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Yeterli nakit bulunmuyor.' },
      }
      return db
    }

    const fee = Math.max(0, Math.floor(amount * BANK_DEPOSIT_FEE_RATE))
    const netAmount = Math.max(0, amount - fee)
    profile.wallet -= amount
    profile.bank += netAmount
    profile.updatedAt = timestamp
    applyMissionProgress(profile.missions, { type: 'bank_deposit', value: netAmount }, timestamp)

    pushTransaction(
      profile,
      {
        kind: 'bank_deposit',
        detail: `Bankaya para yatırıldı (${amount}) | Komisyon: ${fee}.`,
        amount: -amount,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'system',
      `Bankaya ${amount} yatırdın. Komisyon ${fee}, net ${netAmount} banka hesabına geçti.`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Nakit bankaya aktarıldı. %5 komisyon kesildi.',
      amount,
      fee,
      netAmount,
      wallet: profile.wallet,
      bankAmount: profile.bank,
      bank: bankView(profile, timestamp),
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function withdrawBankCash(userId, payload = {}) {
  const amount = Math.max(0, asInt(payload?.amount, 0))
  if (amount < BANK_MIN_TRANSFER_AMOUNT) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: `Çekilecek tutar en az ${BANK_MIN_TRANSFER_AMOUNT} olmalıdır.` },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    if (profile.bank < amount) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Banka bakiyesi yetersiz.' },
      }
      return db
    }

    profile.bank -= amount
    profile.wallet += amount
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'bank_withdraw',
        detail: `Bankadan nakit çekildi (${amount}) | Komisyon: 0.`,
        amount,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'system',
      `Bankadan ${amount} çekildi. Komisyon uygulanmadı.`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Bankadan nakit çekme işlemi tamamlandı.',
      amount,
      fee: 0,
      netAmount: amount,
      wallet: profile.wallet,
      bankAmount: profile.bank,
      bank: bankView(profile, timestamp),
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function openBankTermDeposit(userId, payload = {}) {
  const amount = Math.max(0, asInt(payload?.amount, 0))
  const days = Math.max(0, asInt(payload?.days, 0))
  const termOption = bankTermOptionByDays(days)
  if (amount < BANK_MIN_TRANSFER_AMOUNT) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: `Vadeli için en az ${BANK_MIN_TRANSFER_AMOUNT} yatırmalısın.` },
    }
  }
  if (amount > BANK_TERM_MAX_PRINCIPAL) {
    return {
      success: false,
      reason: 'validation',
      errors: {
        global: `Vadeli için en fazla ${new Intl.NumberFormat('tr-TR').format(BANK_TERM_MAX_PRINCIPAL)} yatırabilirsin.`,
      },
    }
  }
  if (!termOption) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçersiz vade seçimi.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const normalizedBankState = normalizeBankState(profile, timestamp)
    if (normalizedBankState.term.active) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Aktif bir vadeli hesabın var. Önce onu tahsil etmelisin.' },
      }
      return db
    }
    if (profile.bank < BANK_MIN_TRANSFER_AMOUNT) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Vadeli açmak için önce bankaya para yatırmalısın.' },
      }
      return db
    }
    if (profile.bank < amount) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Vadeli açmak için banka bakiyesi yetersiz.' },
      }
      return db
    }

    const nowMs = createdMs(timestamp)
    const unlockAtMs = nowMs + (termOption.days * 24 * 60 * 60 * 1000)
    const expectedPayout = bankExpectedPayout(amount, termOption.dailyRatePct, termOption.days)

    profile.bank -= amount
    profile.bankState.term = {
      id: crypto.randomUUID(),
      active: true,
      principal: amount,
      days: termOption.days,
      dailyRatePct: termOption.dailyRatePct,
      expectedPayout,
      openedAt: timestamp,
      unlockAt: new Date(unlockAtMs).toISOString(),
      readyNotifiedAt: '',
      claimedAt: '',
    }
    profile.updatedAt = timestamp
    applyMissionProgress(profile.missions, { type: 'bank_term_open', value: 1 }, timestamp)

    pushNotification(
      profile,
      'system',
      `Vadeli hesap açıldı: ${termOption.days} gün, günlük %${termOption.dailyRatePct}, toplam en fazla %${BANK_TERM_MAX_TOTAL_RATE_PCT}.`,
      timestamp,
    )

    result = {
      success: true,
      message: `Vadeli faiz hesabı açıldı (${termOption.days} gün).`,
      amount,
      expectedPayout,
      bankAmount: profile.bank,
      bank: bankView(profile, timestamp),
      updatedAt: timestamp,
    }

    return db
  })

  return result
}
export async function claimBankTermDeposit(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const normalizedBankState = normalizeBankState(profile, timestamp)
    const term = normalizedBankState.term
    if (!term.active) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Tahsil edilecek aktif vadeli hesap bulunmuyor.' },
      }
      return db
    }

    const remainingMs = bankRemainingMs(term, timestamp)
    if (remainingMs > 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Vade henüz dolmadı. Süre tamamlanınca tahsil edebilirsin.' },
        remainingMs,
        bank: bankView(profile, timestamp),
      }
      return db
    }

    const principal = Math.max(0, asInt(term.principal, 0))
    const payout = Math.max(principal, asInt(term.expectedPayout, principal))
    const profit = Math.max(0, payout - principal)
    const settledAt = timestamp
    profile.bank += payout
    profile.bankState.history.unshift({
      id: String(term.id || crypto.randomUUID()),
      principal,
      payout,
      profit,
      days: Math.max(0, asInt(term.days, 0)),
      dailyRatePct: Math.max(0, asInt(term.dailyRatePct, 0)),
      openedAt: String(term.openedAt || settledAt),
      unlockAt: String(term.unlockAt || settledAt),
      claimedAt: settledAt,
    })
    profile.bankState.history = profile.bankState.history
      .map((entry) => normalizeBankHistoryEntry(entry, settledAt))
      .filter(Boolean)
      .slice(0, BANK_TERM_HISTORY_LIMIT)
    profile.bankState.term = createDefaultBankTermState()
    profile.updatedAt = settledAt

    pushNotification(
      profile,
      'system',
      `Vadeli tahsilat tamamlandı. Ana para: ${principal} | Net ödeme: ${payout} | Kar: ${profit}.`,
      settledAt,
    )

    result = {
      success: true,
      message: 'Vadeli hesap tahsil edildi.',
      principal,
      payout,
      profit,
      bankAmount: profile.bank,
      bank: bankView(profile, settledAt),
      updatedAt: settledAt,
    }

    return db
  })

  return result
}

export async function buyForexCurrency(userId, payload) {
  const requestedCurrencyId = String(payload?.currencyId || '').trim().toLowerCase()
  const currencyId = FOREX_BY_ID.has(requestedCurrencyId) ? requestedCurrencyId : FOREX_DEFAULT_ID
  const tryAmountRaw = Number(payload?.tryAmount)
  const providedTryAmount = Math.max(0, Math.round(Number.isFinite(tryAmountRaw) ? tryAmountRaw : 0))
  const quantityRaw = Number(payload?.quantity)
  const providedQuantity = roundTo(Number.isFinite(quantityRaw) ? quantityRaw : 0, 6)

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const pair = db.forexState.pairs.find((entry) => entry.id === currencyId)
    const def = FOREX_BY_ID.get(currencyId)
    if (!pair || !def) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'D\u00f6viz kuru bulunamad\u0131.' },
      }
      return db
    }

    const rates = forexRatesForPair(pair)
    let quantity = providedQuantity
    if (quantity <= 0 && providedTryAmount > 0) {
      quantity = roundTo(providedTryAmount / Math.max(0.0001, rates.buyRate), 6)
    }
    quantity = clamp(quantity, 0, FOREX_MAX_TRADE_QUANTITY)
    if (quantity < FOREX_MIN_TRADE_QUANTITY) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: `Minimum al\u0131m miktar\u0131 ${FOREX_MIN_TRADE_QUANTITY} adet olmal\u0131d\u0131r.` },
      }
      return db
    }

    const gross = Math.max(0, Math.round(quantity * rates.buyRate))
    if (gross <= 0) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Al\u0131m tutar\u0131 hesaplanamad\u0131. Daha y\u00fcksek miktar deneyin.' },
      }
      return db
    }

    const holding = profile.forexPortfolio[currencyId] || {
      quantity: 0,
      costTry: 0,
      realizedPnlTry: 0,
      updatedAt: timestamp,
    }
    const holdingQuantityBefore = Math.max(0, Number(holding.quantity) || 0)
    const nextQuantity = roundTo(holdingQuantityBefore + quantity, 6)
    if (nextQuantity > (FOREX_MAX_TOTAL_HOLDING_QUANTITY + 0.000001)) {
      result = {
        success: false,
        reason: 'holding_limit',
        errors: { global: `Maksimum toplam TCT bakiyesi ${FOREX_MAX_TOTAL_HOLDING_QUANTITY} adet olabilir.` },
      }
      return db
    }

    const fee = Math.max(0, Math.round(gross * FOREX_TRADE_FEE_RATE))
    const totalCost = gross + fee
    if (profile.wallet < totalCost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'D\u00f6viz al\u0131m i\u015fleminde bakiye yetersiz.' },
      }
      return db
    }

    profile.wallet -= totalCost
    holding.quantity = nextQuantity
    holding.costTry = roundTo((Number(holding.costTry) || 0) + totalCost, 2)
    holding.updatedAt = timestamp
    profile.forexPortfolio[currencyId] = holding

    pushTransaction(
      profile,
      {
        kind: 'forex_buy',
        detail: `${def.code} alımı yapıldı. Kur: ${rates.buyRate.toFixed(2)} | Miktar: ${quantity}.`,
        amount: -totalCost,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'market',
      `${def.code} alim emri gerceklesti. ${quantity} birim pozisyon acildi.`,
      timestamp,
    )
    profile.updatedAt = timestamp

    const market = db.forexState.pairs.map((entry) => forexPairView(profile, entry))[0] || null
    const marketUpdatedAt = String(market?.updatedAt || db?.forexState?.lastUpdatedAt || timestamp).trim()
    const marketNextUpdateAt = forexNextUpdateAt(marketUpdatedAt, createdMs(timestamp))
    result = {
      success: true,
      message: `${def.code} alımı tamamlandı.`,
      wallet: profile.wallet,
      trade: {
        currencyId,
        code: def.code,
        side: 'buy',
        unitRate: rates.buyRate,
        gross,
        fee,
        totalCost,
        quantity,
      },
      market: market
        ? {
            id: market.id,
            code: market.code,
            name: market.name,
            minRate: market.minRate,
            maxRate: market.maxRate,
            rate: market.rate,
            buyRate: market.buyRate,
            sellRate: market.sellRate,
            dayHigh: market.dayHigh,
            dayLow: market.dayLow,
            dayChangePercent: market.dayChangePercent,
            history: market.history,
            updatedAt: marketUpdatedAt,
            nextUpdateAt: marketNextUpdateAt,
            updateIntervalMs: FOREX_UPDATE_INTERVAL_MS,
          }
        : null,
      holding: market?.holding || {
        quantity: 0,
        costTry: 0,
        marketValueTry: 0,
        unrealizedPnlTry: 0,
        unrealizedPnlPercent: 0,
        realizedPnlTry: 0,
      },
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function sellForexCurrency(userId, payload) {
  const requestedCurrencyId = String(payload?.currencyId || '').trim().toLowerCase()
  const currencyId = FOREX_BY_ID.has(requestedCurrencyId) ? requestedCurrencyId : FOREX_DEFAULT_ID
  const quantityRaw = Number(payload?.quantity)
  const quantity = clamp(
    roundTo(Number.isFinite(quantityRaw) ? quantityRaw : 0, 6),
    0,
    FOREX_MAX_TRADE_QUANTITY,
  )

  if (quantity < FOREX_MIN_TRADE_QUANTITY) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: `Minimum bozum miktari ${FOREX_MIN_TRADE_QUANTITY} adet olmali.` },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const pair = db.forexState.pairs.find((entry) => entry.id === currencyId)
    const def = FOREX_BY_ID.get(currencyId)
    if (!pair || !def) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'D\u00f6viz kuru bulunamad\u0131.' },
      }
      return db
    }

    const holding = profile.forexPortfolio[currencyId]
    const availableQuantity = Math.max(0, Number(holding?.quantity) || 0)
    if (availableQuantity + 0.000001 < quantity) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Bozum i\u00e7in yeterli d\u00f6viz bakiyesi yok.' },
      }
      return db
    }

    const rates = forexRatesForPair(pair)
    const gross = Math.max(0, Math.round(quantity * rates.sellRate))
    const fee = Math.max(0, Math.round(gross * FOREX_TRADE_FEE_RATE))
    const net = Math.max(0, gross - fee)
    const costBefore = Math.max(0, Number(holding?.costTry) || 0)
    const costPortion = availableQuantity > 0
      ? roundTo(costBefore * (quantity / availableQuantity), 2)
      : 0
    const realizedPnl = roundTo(net - costPortion, 2)

    profile.wallet += net
    holding.quantity = roundTo(Math.max(0, availableQuantity - quantity), 6)
    holding.costTry = holding.quantity > 0
      ? roundTo(Math.max(0, costBefore - costPortion), 2)
      : 0
    holding.realizedPnlTry = roundTo((Number(holding.realizedPnlTry) || 0) + realizedPnl, 2)
    holding.updatedAt = timestamp
    profile.forexPortfolio[currencyId] = holding

    pushTransaction(
      profile,
      {
        kind: 'forex_sell',
        detail: `${def.code} bozumu yapıldı. Kur: ${rates.sellRate.toFixed(2)} | Miktar: ${quantity}.`,
        amount: net,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'market',
      `${def.code} bozumu tamamlandı. Hesabına +${net} TRY eklendi.`,
      timestamp,
    )
    profile.updatedAt = timestamp

    const market = db.forexState.pairs.map((entry) => forexPairView(profile, entry))[0] || null
    const marketUpdatedAt = String(market?.updatedAt || db?.forexState?.lastUpdatedAt || timestamp).trim()
    const marketNextUpdateAt = forexNextUpdateAt(marketUpdatedAt, createdMs(timestamp))
    result = {
      success: true,
      message: `${def.code} bozumu tamamlandı.`,
      wallet: profile.wallet,
      trade: {
        currencyId,
        code: def.code,
        side: 'sell',
        unitRate: rates.sellRate,
        quantity,
        gross,
        fee,
        net,
        realizedPnl,
      },
      market: market
        ? {
            id: market.id,
            code: market.code,
            name: market.name,
            minRate: market.minRate,
            maxRate: market.maxRate,
            rate: market.rate,
            buyRate: market.buyRate,
            sellRate: market.sellRate,
            dayHigh: market.dayHigh,
            dayLow: market.dayLow,
            dayChangePercent: market.dayChangePercent,
            history: market.history,
            updatedAt: marketUpdatedAt,
            nextUpdateAt: marketNextUpdateAt,
            updateIntervalMs: FOREX_UPDATE_INTERVAL_MS,
          }
        : null,
      holding: market?.holding || {
        quantity: 0,
        costTry: 0,
        marketValueTry: 0,
        unrealizedPnlTry: 0,
        unrealizedPnlPercent: 0,
        realizedPnlTry: 0,
      },
      updatedAt: timestamp,
    }

    return db
  })

  return result
}

export async function buyMarketItem(userId, payload) {
  const itemId = String(payload?.itemId || '').trim()
  const quantity = asInt(payload?.quantity, 0)

  if (!itemId || quantity <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Ürün ve miktar zorunludur.' },
    }
  }

  if (quantity > 50000) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Tek seferde en fazla 50.000 birim alabilirsin.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const logisticsFleet = logisticsFleetView(profile, timestamp)
    if (logisticsFleet.summary.totalCapacity <= 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Pazar alım satımı yapabilmek için en az bir tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.' },
      }
      return db
    }

    const marketItem = db.marketState.items.find((item) => item.id === itemId)
    const itemDef = ITEM_BY_ID.get(itemId)

    if (!marketItem || !itemDef) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Ürün bulunamadı.' },
      }
      return db
    }

    if (marketItem.stock < quantity) {
      result = {
        success: false,
        reason: 'insufficient_stock',
        errors: { global: 'Pazarda yeterli stok yok.' },
      }
      return db
    }

    const buyPrice = Math.max(1, Math.round(marketItem.price * (1 + MARKET_TAX_RATE)))
    const totalCost = buyPrice * quantity

    if (profile.wallet < totalCost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Yetersiz bakiye.' },
      }
      return db
    }

    profile.wallet -= totalCost
    marketItem.stock = clamp(
      marketItem.stock - quantity,
      itemDef.minStock,
      itemDef.maxStock,
    )
    marketItem.lastPrice = marketItem.price
    marketItem.price = calculateMarketPrice(itemDef, marketItem.stock)
    marketItem.updatedAt = timestamp

    addInventory(profile, itemId, quantity)
    applyMissionProgress(profile.missions, { type: 'buy_units', value: quantity }, timestamp)
    addLeaguePoints(profile, Math.max(1, Math.floor(totalCost / 170)))

    pushTransaction(
      profile,
      {
        kind: 'market_buy',
        detail: `${quantity} birim ${itemDef.name} satın alındı.`,
        amount: -totalCost,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'market',
      `${quantity} birim ${itemDef.name} alımı tamamlandı.`,
      timestamp,
    )

    profile.updatedAt = timestamp

    result = {
      success: true,
      wallet: profile.wallet,
      marketItem: marketItemView(profile, marketItem),
      message: `${quantity} birim ${itemDef.name} satın alındı.`,
    }

    return db
  })

  return result
}

export async function buyFromSellOrder(userId, payload) {
  const orderId = String(payload?.orderId || '').trim()
  const quantity = asInt(payload?.quantity, 0)

  if (!orderId || quantity <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Emir ve miktar zorunludur.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const buyerProfile = ensureProfile(db, userId, timestamp)
    if (!buyerProfile) {
      result = { success: false, reason: 'unauthorized', errors: { global: 'Oturum bulunamadı.' } }
      return db
    }

    runGameTick(db, buyerProfile, timestamp)

    const buyerFleet = logisticsFleetView(buyerProfile, timestamp)
    if (buyerFleet.summary.totalCapacity <= 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Pazar alım satımı yapabilmek için en az bir tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.' },
      }
      return db
    }

    let sellerProfile = null
    let order = null
    for (const p of db.gameProfiles) {
      const o = (p.limitOrders || []).find((ord) => ord && ord.id === orderId)
      if (o) {
        sellerProfile = p
        order = o
        break
      }
    }

    if (!order || !sellerProfile) {
      result = { success: false, reason: 'not_found', errors: { global: 'İlan bulunamadı.' } }
      return db
    }

    if (order.status !== 'open' || order.side !== 'sell') {
      result = { success: false, reason: 'validation', errors: { global: 'Bu ilan artık geçerli değil.' } }
      return db
    }

    if (sellerProfile.userId === userId) {
      result = { success: false, reason: 'validation', errors: { global: 'Kendi ilanından alım yapılamaz.' } }
      return db
    }

    const remaining = orderRemainingQuantity(order)
    if (quantity > remaining) {
      result = { success: false, reason: 'insufficient_stock', errors: { global: `En fazla ${remaining} adet alabilirsin.` } }
      return db
    }

    const unitPrice = Math.max(1, asInt(order.limitPrice, 0))
    const totalCost = quantity * unitPrice
    if (buyerProfile.wallet < totalCost) {
      result = { success: false, reason: 'insufficient_funds', errors: { global: 'Yetersiz bakiye.' } }
      return db
    }

    const itemDef = ITEM_BY_ID.get(order.itemId)
    const itemName = itemDef?.name || order.itemId

    const taxAmount = Math.max(0, Math.round(totalCost * MARKET_TAX_RATE))
    const sellerPayout = Math.max(0, totalCost - taxAmount)

    buyerProfile.wallet -= totalCost
    sellerProfile.wallet += sellerPayout
    addInventory(buyerProfile, order.itemId, quantity)

    order.filledQuantity = (order.filledQuantity || 0) + quantity
    order.updatedAt = timestamp
    order.lastFillAt = timestamp

    if (orderRemainingQuantity(order) <= 0) {
      markOrderFilled(sellerProfile, order, timestamp)
    }

    addLeaguePoints(buyerProfile, Math.max(1, Math.floor(totalCost / 150)))
    addLeaguePoints(sellerProfile, Math.max(1, Math.floor(sellerPayout / 150)))
    applyMissionProgress(buyerProfile.missions, { type: 'buy_units', value: quantity }, timestamp)
    applyMissionProgress(sellerProfile.missions, { type: 'sell_value', value: totalCost }, timestamp)

    const sellerName = sellerProfile.username || sellerProfile.displayName || 'Oyuncu'
    const buyerName = buyerProfile.username || buyerProfile.displayName || 'Oyuncu'
    pushTransaction(
      buyerProfile,
      { kind: 'market_buy', detail: `${quantity} adet ${itemName} aldın. Satıcı: ${sellerName}. Deponuza eklendi.`, amount: -totalCost },
      timestamp,
    )
    pushTransaction(
      sellerProfile,
      {
        kind: 'market_sell',
        detail: `${quantity} adet ${itemName} satıldı. Vergi: ${taxAmount}. Hesabınıza +${sellerPayout} eklendi. Alıcı: ${buyerName}.`,
        amount: sellerPayout,
      },
      timestamp,
    )
    pushNotification(buyerProfile, 'market', `${quantity} adet ${itemName} satın aldınız. Satıcı: ${sellerName}. Deponuza eklendi.`, timestamp)
    pushNotification(sellerProfile, 'market', `${quantity} adet ${itemName} satıldı. Vergi: ${taxAmount}. Hesabınıza +${sellerPayout} eklendi. Alıcı: ${buyerName}.`, timestamp)

    buyerProfile.updatedAt = timestamp
    sellerProfile.updatedAt = timestamp

    const orderFullyFilled = orderRemainingQuantity(order) <= 0
    result = {
      success: true,
      wallet: buyerProfile.wallet,
      message: `${quantity} birim ${itemName} satın alındı ve deponuza eklendi.${orderFullyFilled ? ' İlan pazardan kaldırıldı.' : ''}`,
      quantity,
      itemId: order.itemId,
      itemName,
      totalCost,
      sellerPayout,
      taxAmount,
      orderFullyFilled,
    }
    return db
  })

  return result
}

const MAX_GLOBAL_ANNOUNCEMENTS = 100

export async function createAnnouncement(userId, payload) {
  const title = String(payload?.title || '').trim()
  const body = String(payload?.body ?? payload?.message ?? '').trim()
  if (!title && !body) {
    return { success: false, reason: 'validation', errors: { global: 'Başlık veya metin girin.' } }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const user = db.users.find((entry) => entry.id === userId)
    if (!user) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    const list = db.globalAnnouncements || []
    list.unshift({
      id: crypto.randomUUID(),
      title: title || 'Duyuru',
      body: body || title,
      createdAt: timestamp,
      createdBy: userId,
    })
    db.globalAnnouncements = list.slice(0, MAX_GLOBAL_ANNOUNCEMENTS)
    result = { success: true, message: 'Duyuru yayınlandı.' }
    return db
  })
  return result
}

export async function sellMarketItem(userId, payload) {
  const itemId = String(payload?.itemId || '').trim()
  const quantity = asInt(payload?.quantity, 0)

  if (!itemId || quantity <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Ürün ve miktar zorunludur.' },
    }
  }

  if (quantity > 50000) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Tek seferde en fazla 50.000 birim satabilirsin.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const logisticsFleet = logisticsFleetView(profile, timestamp)
    if (logisticsFleet.summary.totalCapacity <= 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Pazar alım satımı yapabilmek için en az bir tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.' },
      }
      return db
    }

    const marketItem = db.marketState.items.find((item) => item.id === itemId)
    const itemDef = ITEM_BY_ID.get(itemId)

    if (!marketItem || !itemDef) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Ürün bulunamadı.' },
      }
      return db
    }

    if (!removeInventory(profile, itemId, quantity)) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Envanterde yeterli ürün yok.' },
      }
      return db
    }

    const sellPrice = Math.max(1, Math.round(marketItem.price * (1 - MARKET_TAX_RATE)))
    const totalGain = sellPrice * quantity

    profile.wallet += totalGain
    marketItem.stock = clamp(
      marketItem.stock + quantity,
      itemDef.minStock,
      itemDef.maxStock,
    )
    marketItem.lastPrice = marketItem.price
    marketItem.price = calculateMarketPrice(itemDef, marketItem.stock)
    marketItem.updatedAt = timestamp

    applyMissionProgress(profile.missions, { type: 'sell_value', value: totalGain }, timestamp)
    addLeaguePoints(profile, Math.max(1, Math.floor(totalGain / 120)))

    pushTransaction(
      profile,
      {
        kind: 'market_sell',
        detail: `${quantity} birim ${itemDef.name} satıldı.`,
        amount: totalGain,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'market',
      `${quantity} birim ${itemDef.name} satışı tamamlandı.`,
      timestamp,
    )

    profile.updatedAt = timestamp

    result = {
      success: true,
      wallet: profile.wallet,
      marketItem: marketItemView(profile, marketItem),
      message: `${quantity} birim ${itemDef.name} satıldı.`,
    }

    return db
  })

  return result
}

function minimumAuctionBid(auction) {
  return auction.currentBid > 0
    ? auction.currentBid + auction.minIncrement
    : auction.startBid
}

function findAuctionOwner(db, auctionId) {
  const safeAuctionId = String(auctionId || '').trim()
  if (!safeAuctionId) return { sellerProfile: null, auction: null }

  for (const sellerProfile of db.gameProfiles) {
    const list = Array.isArray(sellerProfile.marketAuctions) ? sellerProfile.marketAuctions : []
    const auction = list.find((entry) => entry && entry.id === safeAuctionId)
    if (auction) return { sellerProfile, auction }
  }

  return { sellerProfile: null, auction: null }
}

export async function createMarketAuction(userId, payload) {
  const itemId = String(payload?.itemId || '').trim()
  const quantity = asInt(payload?.quantity, 0)
  const startBid = asInt(payload?.startBid, 0)
  const minIncrement = asInt(payload?.minIncrement, 0)
  const durationMinutes = clamp(
    asInt(payload?.durationMinutes, 30),
    AUCTION_MIN_DURATION_MINUTES,
    AUCTION_MAX_DURATION_MINUTES,
  )

  if (!ITEM_BY_ID.has(itemId) || quantity <= 0 || startBid <= 0 || minIncrement <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Açık artırma bilgileri geçersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const itemDef = ITEM_BY_ID.get(itemId)
    if (!itemDef) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Ürün bulunamadı.' },
      }
      return db
    }

    if (!removeInventory(profile, itemId, quantity)) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Açık artırma için envanter yetersiz.' },
      }
      return db
    }

    const nowMs = new Date(timestamp).getTime()
    profile.marketAuctions.unshift({
      id: crypto.randomUUID(),
      sellerUserId: profile.userId,
      sellerName: profile.username || 'Oyuncu',
      title: `${itemDef.name} Açık Artırma`,
      itemId,
      itemName: itemDef.name,
      quantity,
      startBid,
      currentBid: 0,
      minIncrement,
      bidCount: 0,
      highestBidderUserId: '',
      highestBidderName: '',
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      endAt: new Date(nowMs + durationMinutes * MS_MINUTE).toISOString(),
      warnedAt: '',
      resolvedAt: '',
    })
    profile.marketAuctions = profile.marketAuctions.slice(0, AUCTION_HISTORY_LIMIT)

    pushNotification(
      profile,
      'market',
      `${itemDef.name} için açık artırma başlatıldı.`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Açık artırma oluşturuldu.',
      activeAuctions: getActiveAuctions(db, userId).slice(0, 8),
      myAuctions: profile.marketAuctions.slice(0, 20),
    }
    return db
  })

  return result
}

export async function placeMarketAuctionBid(userId, auctionId, payload) {
  const safeAuctionId = String(auctionId || '').trim()
  const amount = asInt(payload?.amount, 0)

  if (!safeAuctionId || amount <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Teklif bilgisi geçersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const bidderProfile = ensureProfile(db, userId, timestamp)
    if (!bidderProfile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, bidderProfile, timestamp)

    const { sellerProfile, auction } = findAuctionOwner(db, safeAuctionId)
    if (!sellerProfile || !auction) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Açık artırma bulunamadı.' },
      }
      return db
    }

    if (auction.status !== 'active') {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Bu açık artırma artık aktif değil.' },
      }
      return db
    }

    if (new Date(auction.endAt).getTime() <= new Date(timestamp).getTime()) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Açık artırma süresi dolmuş.' },
      }
      return db
    }

    if (sellerProfile.userId === userId || auction.sellerUserId === userId) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendi açık artırmana teklif veremezsin.' },
      }
      return db
    }

    const minRequired = minimumAuctionBid(auction)
    if (amount < minRequired) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: `Teklif en az ${minRequired} olmalı.` },
      }
      return db
    }

    const sameBidder = auction.highestBidderUserId === userId
    const payableDelta = sameBidder
      ? Math.max(0, amount - auction.currentBid)
      : amount
    if (payableDelta <= 0) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Mevcut teklifin zaten daha yuksek.' },
      }
      return db
    }

    if (bidderProfile.wallet < payableDelta) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Teklif için bakiye yetersiz.' },
      }
      return db
    }

    if (!sameBidder && auction.highestBidderUserId && auction.currentBid > 0) {
      const previousBidder = db.gameProfiles.find(
        (entry) => entry.userId === auction.highestBidderUserId,
      )
      if (previousBidder) {
        previousBidder.wallet += auction.currentBid
        pushNotification(
          previousBidder,
          'market',
          `${auction.title} açık artırmasında teklifin geçildi.`,
          timestamp,
        )
      }
    }

    bidderProfile.wallet -= payableDelta
    auction.currentBid = amount
    auction.highestBidderUserId = bidderProfile.userId
    auction.highestBidderName = bidderProfile.username || 'Oyuncu'
    auction.bidCount = Math.max(0, asInt(auction.bidCount, 0)) + 1
    auction.updatedAt = timestamp

    pushNotification(
      sellerProfile,
      'market',
      `${auction.title} için yeni teklif: ${amount}.`,
      timestamp,
    )
    pushNotification(
      bidderProfile,
      'market',
      `${auction.title} için teklifin alındı.`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Teklif başarıyla verildi.',
      activeAuctions: getActiveAuctions(db, userId).slice(0, 8),
    }
    return db
  })

  return result
}

export async function getBusinesses(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    result = {
      success: true,
      wallet: profile.wallet,
      businesses: businessView(profile, timestamp),
      templates: templateView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
      companyUnlock: companyUnlockView(profile, timestamp),
      events: weeklyEventState(timestamp),
    }

    return db
  })

  return result
}

export async function getFactories(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const factories = factoriesView(profile, timestamp)
    const slotUsage = countFactoryBuildAndUpgradeSlots(profile, timestamp)
    const maxUpgradeSlots = isPremiumActive(profile, timestamp) ? FACTORY_MAX_SLOTS_PREMIUM : FACTORY_MAX_SLOTS_DEFAULT
    result = {
      success: true,
      wallet: Math.max(0, asInt(profile.wallet, 0)),
      diamonds: Math.max(0, asInt(profile.reputation, 0)),
      factories,
      events: weeklyEventState(timestamp),
      summary: {
        ownedCount: factories.filter((entry) => entry.owned).length,
        readyCount: factories.filter((entry) => entry.canCollectNow).length,
        upgradingCount: factories.filter((entry) => entry.upgrading?.active).length,
        slotUsed: slotUsage.total,
        slotBuilding: slotUsage.building,
        slotUpgrading: slotUsage.upgrading,
        slotMax: maxUpgradeSlots,
      },
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function getMines(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = { success: false, reason: 'unauthorized', errors: { global: 'Oturum bulunamadı.' } }
      return db
    }
    runGameTick(db, profile, timestamp)
    const mines = minesView(profile, timestamp)
    result = {
      success: true,
      wallet: Math.max(0, asInt(profile.wallet, 0)),
      mines,
      summary: {
        diggingCount: mines.filter((m) => m.isDigging).length,
        readyCount: mines.filter((m) => m.canCollect).length,
      },
      updatedAt: timestamp,
    }
    return db
  })
  return result
}

export async function startMineDig(userId, mineId) {
  const safeMineId = String(mineId || '').trim()
  if (!safeMineId || !MINE_BY_ID.has(safeMineId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir maden seçmelisin.' },
    }
  }
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = { success: false, reason: 'unauthorized', errors: { global: 'Oturum bulunamadı.' } }
      return db
    }
    runGameTick(db, profile, timestamp)
    if (!profile.mines || typeof profile.mines !== 'object') {
      profile.mines = createDefaultMinesState(timestamp)
    }
    const template = MINE_BY_ID.get(safeMineId)
    const state = profile.mines[safeMineId] || createMineState(safeMineId, timestamp)
    profile.mines[safeMineId] = state
    const nowMs = createdMs(timestamp) || Date.now()
    const digEndsMs = createdMs(state.digEndsAt)
    const isDigging = digEndsMs > nowMs
    const collectReadyMs = createdMs(state.collectReadyAt)
    const canCollect = collectReadyMs > 0 && nowMs >= collectReadyMs
    const nextDigMs = createdMs(state.nextDigAt)
    const canStartDig = !isDigging && !canCollect && (nextDigMs <= 0 || nowMs >= nextDigMs)
    const costCash = mineCostCash(template)
    const wallet = Math.max(0, asInt(profile.wallet, 0))
    if (!canStartDig) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: isDigging ? 'Bu maden şu an kazılıyor.' : canCollect ? 'Önce tahsilat yapmalısın.' : 'Bir sonraki kazı için bekleme süresi dolmadı.' },
      }
      return db
    }
    if (wallet < costCash) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `Yetersiz nakit. ${template?.name || 'Bu maden'} kazısı için ${costCash.toLocaleString('tr-TR')} nakit gerekir.` },
      }
      return db
    }
    profile.wallet = Math.max(0, wallet - costCash)
    const durationMs = mineDigDurationMs(template)
    const cooldownMs = mineCooldownMs(template)
    state.digEndsAt = new Date(nowMs + durationMs).toISOString()
    state.nextDigAt = new Date(nowMs + cooldownMs).toISOString()
    state.collectReadyAt = ''
    state.updatedAt = timestamp
    pushNotification(profile, 'mine', `${template?.name || 'Maden'} kazısı başlatıldı. Tahsilat süresi dolunca bildirim alacaksınız.`, timestamp)
    result = {
      success: true,
      message: `${template?.name || 'Maden'} kazısı başladı.`,
      wallet: profile.wallet,
      mines: minesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })
  return result
}

export async function collectMine(userId, mineId) {
  const safeMineId = String(mineId || '').trim()
  if (!safeMineId || !MINE_BY_ID.has(safeMineId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir maden seçmelisin.' },
    }
  }
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = { success: false, reason: 'unauthorized', errors: { global: 'Oturum bulunamadı.' } }
      return db
    }
    runGameTick(db, profile, timestamp)
    const template = MINE_BY_ID.get(safeMineId)
    const state = profile.mines?.[safeMineId] || createMineState(safeMineId, timestamp)
    profile.mines[safeMineId] = state
    const nowMs = createdMs(timestamp) || Date.now()
    const collectReadyMs = createdMs(state.collectReadyAt)
    if (collectReadyMs <= 0 || nowMs < collectReadyMs) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tahsilat henüz hazır değil.' },
      }
      return db
    }
    const amount = mineRandomOutput(profile, template, timestamp)
    const outputItemId = normalizeItemId(template.outputItemId || 'gold')
    const outputItem = ITEM_BY_ID.get(outputItemId)
    const xpEarned = Math.max(0, asInt(template?.xpPerCollect, 10))
    addInventory(profile, outputItemId, amount)
    applyMissionProgress(profile.missions, { type: 'mine_output', value: amount }, timestamp)
    if (xpEarned > 0) addProfileXp(profile, xpEarned)
    addSeasonPoints(profile, 2)
    state.collectReadyAt = ''
    state.digEndsAt = ''
    state.updatedAt = timestamp
    pushNotification(profile, 'mine', `${template?.name || 'Maden'} kazısı tamamlandı. ${amount} adet ${outputItem?.name || outputItemId} depoya eklendi.`, timestamp)
    result = {
      success: true,
      message: `${amount} ${outputItem?.name || outputItemId} depoya aktarıldı.`,
      collected: { itemId: outputItemId, quantity: amount },
      xpEarned,
      inventory: inventoryView(profile, []),
      mines: minesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })
  return result
}

export async function buyFactory(userId, payload = {}) {
  const safeFactoryId = String(payload?.factoryId || '').trim()
  if (!safeFactoryId || !FACTORY_BY_ID.has(safeFactoryId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir fabrika seçmelisin.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const template = FACTORY_BY_ID.get(safeFactoryId)
    const state = profile.factories?.[safeFactoryId] || createFactoryState(safeFactoryId, timestamp)
    profile.factories[safeFactoryId] = state

    const nowMs = createdMs(timestamp) || Date.now()
    const buildEndsMs = createdMs(state.buildEndsAt)
    const isBuilding = state.owned !== true && buildEndsMs > nowMs
    if (state.owned === true || isBuilding) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Bu fabrika'} zaten satın alınmış durumda.` },
      }
      return db
    }

    const slots = countFactoryBuildAndUpgradeSlots(profile, timestamp)
    const maxSlots = isPremiumActive(profile, timestamp) ? FACTORY_MAX_SLOTS_PREMIUM : FACTORY_MAX_SLOTS_DEFAULT
    if (slots.total >= maxSlots) {
      const hint = maxSlots === 1
        ? 'Bir fabrika inşaat veya yükseltmede. Bitmesini bekle veya premium ile 2 slot kullan.'
        : 'İki slot dolu. Biri bitene kadar yeni inşaat başlatılamaz.'
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: hint },
      }
      return db
    }

    const purchaseCostCash = weeklyEventCostValue(
      Math.max(1, asInt(template?.purchaseCostCash, 0)),
      timestamp,
      weeklyEvents,
      { minPositive: 1 },
    )
    const purchaseCostByItem = factoryPurchaseResourceCost(template, { timestamp, weeklyEvents })
    const purchaseMissingRows = Object.entries(purchaseCostByItem)
      .map(([itemId, amount]) => {
        const needed = Math.max(0, asInt(amount, 0))
        const available = getInventoryQuantity(profile, itemId)
        const missing = Math.max(0, needed - available)
        if (missing <= 0) return ''
        return `${ITEM_BY_ID.get(itemId)?.name || itemId}: ${missing}`
      })
      .filter(Boolean)

    if (profile.wallet < purchaseCostCash) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `${template?.name || 'Fabrika'} için yeterli nakit yok.` },
      }
      return db
    }
    if (purchaseMissingRows.length > 0) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: {
          global: `Kurulum için kaynaklar eksik. ${purchaseMissingRows.join(', ')}`.trim(),
        },
      }
      return db
    }
    if (!removeFactoryMiningCost(profile, purchaseCostByItem)) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Kurulum kaynakları depodan düşürülemedi.' },
      }
      return db
    }

    const buildDurationMs = factoryBuildDurationMs(template)
    profile.wallet -= purchaseCostCash
    state.owned = false
    state.level = FACTORY_MIN_LEVEL
    state.purchasedAt = timestamp
    state.buildStartedAt = timestamp
    state.buildEndsAt = new Date(nowMs + buildDurationMs).toISOString()
    state.collectReadyAt = state.buildEndsAt
    state.lastCollectedAt = ''
    state.upgrading = createDefaultFactoryUpgradeState(template)
    state.updatedAt = timestamp
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'factory_buy',
        detail: `${template?.name || 'Fabrika'} satın alındı.`,
        amount: -purchaseCostCash,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'business',
      `${template?.name || 'Fabrika'} inşası başladı.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${template?.name || 'Fabrika'} satın alındı. İnşa süreci başladı.`,
      wallet: profile.wallet,
      factories: factoriesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function collectFactory(userId, factoryId) {
  const safeFactoryId = String(factoryId || '').trim()
  if (!safeFactoryId || !FACTORY_BY_ID.has(safeFactoryId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir fabrika seçmelisin.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const template = FACTORY_BY_ID.get(safeFactoryId)
    const state = profile.factories?.[safeFactoryId] || createFactoryState(safeFactoryId, timestamp)
    profile.factories[safeFactoryId] = state

    const nowMs = createdMs(timestamp) || Date.now()
    const buildEndsMs = createdMs(state.buildEndsAt)
    if (state.owned !== true && buildEndsMs > nowMs) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} inşası tamamlanmadı.` },
      }
      return db
    }
    if (state.owned !== true) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} henüz satın alınmadı.` },
      }
      return db
    }

    const maxLevel = factoryMaxLevel(template)
    const level = clamp(
      Math.max(FACTORY_MIN_LEVEL, asInt(state.level, FACTORY_MIN_LEVEL)),
      FACTORY_MIN_LEVEL,
      maxLevel,
    )
    const upgrading = normalizeFactoryUpgradeState(state.upgrading, template)
    const isUpgrading = upgrading.active === true && createdMs(upgrading.endsAt) > nowMs
    if (isUpgrading) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} yükseltiliyor. Yükseltme tamamlanınca tahsilat açılır.` },
      }
      return db
    }

    const collectReadyAt = typeof state.collectReadyAt === 'string' && state.collectReadyAt
      ? state.collectReadyAt
      : timestamp
    const collectReadyMs = createdMs(collectReadyAt)
    if (collectReadyMs > nowMs) {
      const waitMinutes = Math.max(1, Math.ceil((collectReadyMs - nowMs) / MS_MINUTE))
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Tahsilat henüz hazır değil. Yaklaşık ${waitMinutes} dakika sonra tekrar deneyin.` },
      }
      return db
    }

    const outputItemId = normalizeItemId(template.outputItemId)
    const outputItem = ITEM_BY_ID.get(outputItemId)
    const energyItemId = normalizeItemId(template.energyItemId || 'energy')
    const energyCost = weeklyEventCostValue(
      factoryEnergyCostPerCollect(template, level),
      timestamp,
      weeklyEvents,
      { minPositive: 1, applyDiscount: true },
    )
    const energyAvailable = getInventoryQuantity(profile, energyItemId)
    if (energyAvailable < energyCost) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: {
          global: `${ITEM_BY_ID.get(energyItemId)?.name || energyItemId} yetersiz. Gerekli: ${energyCost}, Depodaki: ${energyAvailable}.`,
        },
      }
      return db
    }

    const baseOutput = factoryOutputPerCollect(template, level)
    const multiplier = isPremiumActive(profile, timestamp) ? PREMIUM_BULK_MULTIPLIER : 1
    const outputAmount = Math.max(1, Math.round(baseOutput * multiplier))
    if (energyCost > 0) {
      removeInventory(profile, energyItemId, energyCost)
    }
    addInventory(profile, outputItemId, outputAmount)
    applyMissionProgress(profile.missions, { type: 'factory_output', value: outputAmount }, timestamp)
    state.lastCollectedAt = timestamp
    state.collectReadyAt = new Date(nowMs + factoryCollectIntervalMs(template)).toISOString()
    state.totalCollected = Math.max(0, asInt(state.totalCollected, 0)) + outputAmount
    state.updatedAt = timestamp

    const xpGain = weeklyEventXpGain(
      Math.max(5, Math.round(baseOutput * 0.35)),
      timestamp,
      weeklyEvents,
    )
    addProfileXp(profile, xpGain)
    addLeaguePoints(profile, Math.max(1, Math.floor(outputAmount / 4)))
    addSeasonPoints(profile, 10)
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'factory_collect',
        detail: `${template?.name || 'Fabrika'} tahsilatı tamamlandı.`,
        amount: 0,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'business',
      `${template?.name || 'Fabrika'}: +${outputAmount} ${outputItem?.name || outputItemId}, -${energyCost} ${ITEM_BY_ID.get(energyItemId)?.name || energyItemId}.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${template?.name || 'Fabrika'} tahsilatı yapıldı.`,
      collected: {
        itemId: outputItemId,
        itemName: outputItem?.name || outputItemId,
        quantity: outputAmount,
        energyItemId,
        energyItemName: ITEM_BY_ID.get(energyItemId)?.name || energyItemId,
        energyCost,
        xpGain,
        nextCollectAt: state.collectReadyAt,
      },
      factories: factoriesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function collectFactoriesBulk(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const nowMs = createdMs(timestamp) || Date.now()

    let collectedCount = 0
    let totalXpGain = 0
    let totalLeaguePoints = 0
    const producedByItem = {}
    const consumedByItem = {}
    const collectedFactories = []

    for (const template of FACTORY_TEMPLATES) {
      const factoryId = String(template?.id || '').trim()
      if (!factoryId) continue
      const state = profile.factories?.[factoryId] || createFactoryState(factoryId, timestamp)
      profile.factories[factoryId] = state

      const buildEndsMs = createdMs(state.buildEndsAt)
      if (state.owned !== true || buildEndsMs > nowMs) continue

      const upgrading = normalizeFactoryUpgradeState(state.upgrading, template)
      if (upgrading.active === true && createdMs(upgrading.endsAt) > nowMs) continue

      const hasLevelCap = factoryHasLevelCap(template)
      const maxLevel = factoryMaxLevel(template)
      let level = Math.max(FACTORY_MIN_LEVEL, asInt(state.level, FACTORY_MIN_LEVEL))
      if (hasLevelCap) {
        level = clamp(level, FACTORY_MIN_LEVEL, maxLevel)
      }

      const collectReadyMs = createdMs(state.collectReadyAt || timestamp)
      if (collectReadyMs > nowMs) continue

      const outputItemId = normalizeItemId(template.outputItemId)
      const energyItemId = normalizeItemId(template.energyItemId || 'energy')
      const baseOutput = factoryOutputPerCollect(template, level)
      const multiplier = isPremiumActive(profile, timestamp) ? PREMIUM_BULK_MULTIPLIER : 1
      const outputAmount = Math.max(1, Math.round(baseOutput * multiplier))
      const energyCost = weeklyEventCostValue(
        factoryEnergyCostPerCollect(template, level),
        timestamp,
        weeklyEvents,
        { minPositive: 1, applyDiscount: true },
      )
      const energyAvailable = getInventoryQuantity(profile, energyItemId)
      if (energyAvailable < energyCost) continue

      if (energyCost > 0 && !removeInventory(profile, energyItemId, energyCost)) continue
      addInventory(profile, outputItemId, outputAmount)

      const xpGain = weeklyEventXpGain(
        Math.max(5, Math.round(baseOutput * 0.35)),
        timestamp,
        weeklyEvents,
      )
      const leaguePoints = Math.max(1, Math.floor(outputAmount / 4))
      addProfileXp(profile, xpGain)
      addLeaguePoints(profile, leaguePoints)
      addSeasonPoints(profile, 10)

      state.lastCollectedAt = timestamp
      state.collectReadyAt = new Date(nowMs + factoryCollectIntervalMs(template)).toISOString()
      state.totalCollected = Math.max(0, asInt(state.totalCollected, 0)) + outputAmount
      state.updatedAt = timestamp

      producedByItem[outputItemId] = Math.max(0, asInt(producedByItem[outputItemId], 0)) + outputAmount
      consumedByItem[energyItemId] = Math.max(0, asInt(consumedByItem[energyItemId], 0)) + energyCost
      totalXpGain += xpGain
      totalLeaguePoints += leaguePoints
      collectedCount += 1
      collectedFactories.push(template?.name || factoryId)
    }

    if (collectedCount <= 0) {
      result = {
        success: false,
        reason: 'nothing_to_collect',
        errors: { global: 'Toplu tahsilat için hazır fabrika yok veya enerji yetersiz.' },
      }
      return db
    }

    const totalFactoryOutput = Object.values(producedByItem).reduce(
      (sum, amount) => sum + Math.max(0, asInt(amount, 0)),
      0,
    )
    if (totalFactoryOutput > 0) {
      applyMissionProgress(profile.missions, { type: 'factory_output', value: totalFactoryOutput }, timestamp)
    }

    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'factory_collect_bulk',
        detail: `${collectedCount} fabrika için toplu tahsilat tamamlandı.`,
        amount: 0,
      },
      timestamp,
    )

    const producedRows = Object.entries(producedByItem).map(([itemId, amount]) => {
      const itemName = ITEM_BY_ID.get(itemId)?.name || itemId
      return `+${amount} ${itemName}`
    })
    const consumedRows = Object.entries(consumedByItem)
      .filter(([, amount]) => asInt(amount, 0) > 0)
      .map(([itemId, amount]) => {
        const itemName = ITEM_BY_ID.get(itemId)?.name || itemId
        return `-${amount} ${itemName}`
      })
    const notificationParts = []
    if (producedRows.length) notificationParts.push(producedRows.join(', '))
    if (consumedRows.length) notificationParts.push(consumedRows.join(', '))
    pushNotification(
      profile,
      'business',
      `Fabrika toplu tahsilat tamamlandı: ${notificationParts.join(' | ')}`.trim(),
      timestamp,
    )

    result = {
      success: true,
      message: `Fabrika toplu tahsilat tamamlandı (${collectedCount}).`,
      collected: {
        count: collectedCount,
        producedByItem,
        consumedByItem,
        xpGain: totalXpGain,
        leaguePoints: totalLeaguePoints,
        factories: collectedFactories,
      },
      factories: factoriesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function upgradeFactory(userId, factoryId) {
  const safeFactoryId = String(factoryId || '').trim()
  if (!safeFactoryId || !FACTORY_BY_ID.has(safeFactoryId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir fabrika seçmelisin.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const template = FACTORY_BY_ID.get(safeFactoryId)
    const state = profile.factories?.[safeFactoryId] || createFactoryState(safeFactoryId, timestamp)
    profile.factories[safeFactoryId] = state

    const nowMs = createdMs(timestamp) || Date.now()
    const buildEndsMs = createdMs(state.buildEndsAt)
    if (state.owned !== true && buildEndsMs > nowMs) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} inşa halinde.` },
      }
      return db
    }
    if (state.owned !== true) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} henüz aktif değil.` },
      }
      return db
    }

    const maxLevel = factoryMaxLevel(template)
    const level = clamp(
      Math.max(FACTORY_MIN_LEVEL, asInt(state.level, FACTORY_MIN_LEVEL)),
      FACTORY_MIN_LEVEL,
      maxLevel,
    )
    if (level >= maxLevel) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} maksimum seviyede.` },
      }
      return db
    }

    const upgrading = normalizeFactoryUpgradeState(state.upgrading, template)
    const isUpgrading = upgrading.active === true && createdMs(upgrading.endsAt) > nowMs
    if (isUpgrading) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} için aktif bir yükseltme var.` },
      }
      return db
    }

    const slots = countFactoryBuildAndUpgradeSlots(profile, timestamp)
    const maxSlots = isPremiumActive(profile, timestamp) ? FACTORY_MAX_SLOTS_PREMIUM : FACTORY_MAX_SLOTS_DEFAULT
    if (slots.total >= maxSlots) {
      const hint = maxSlots === 1
        ? 'Bir fabrika inşaat veya yükseltmede. Bitmesini bekle veya premium ile 2 slot kullan.'
        : 'İki slot dolu. Biri bitene kadar yeni yükseltme başlatılamaz.'
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: hint },
      }
      return db
    }

    const targetLevel = Math.min(maxLevel, level + 1)
    const upgradeCostCash = factoryUpgradeCashCost(template, targetLevel, { timestamp, weeklyEvents })
    const upgradeCostByItem = factoryUpgradeResourceCost(template, targetLevel, { timestamp, weeklyEvents })
    const upgradeMissingRows = Object.entries(upgradeCostByItem)
      .map(([itemId, amount]) => {
        const needed = Math.max(0, asInt(amount, 0))
        const available = getInventoryQuantity(profile, itemId)
        const missing = Math.max(0, needed - available)
        if (missing <= 0) return ''
        return `${ITEM_BY_ID.get(itemId)?.name || itemId}: ${missing}`
      })
      .filter(Boolean)

    if (profile.wallet < upgradeCostCash) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `Yükseltme için ${upgradeCostCash} nakit gerekli.` },
      }
      return db
    }
    if (upgradeMissingRows.length > 0) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: {
          global: `Yükseltme için kaynaklar eksik. ${upgradeMissingRows.join(', ')}`.trim(),
        },
      }
      return db
    }
    if (!removeFactoryMiningCost(profile, upgradeCostByItem)) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Yükseltme kaynakları depodan düşürülemedi.' },
      }
      return db
    }

    profile.wallet -= upgradeCostCash
    const durationMs = factoryUpgradeDurationMs(template, targetLevel)
    state.upgrading = {
      active: true,
      fromLevel: level,
      toLevel: targetLevel,
      startedAt: timestamp,
      endsAt: new Date(nowMs + durationMs).toISOString(),
      speedupCount: 0,
      speedupRatio: factorySpeedupRatio(template),
      speedupDiamondCost: factorySpeedupDiamondCost(template),
    }
    state.updatedAt = timestamp
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'factory_upgrade_start',
        detail: `${template?.name || 'Fabrika'} yükseltmesi başlatıldı (Seviye ${level} -> ${targetLevel}, ${upgradeCostCash} nakit).`,
        amount: -upgradeCostCash,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'business',
      `${template?.name || 'Fabrika'} yükseltmesi başladı. Hedef seviye: ${targetLevel}.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${template?.name || 'Fabrika'} yükseltmesi başlatıldı.`,
      factories: factoriesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function speedupFactoryUpgrade(userId, factoryId) {
  const safeFactoryId = String(factoryId || '').trim()
  if (!safeFactoryId || !FACTORY_BY_ID.has(safeFactoryId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir fabrika seçmelisin.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const template = FACTORY_BY_ID.get(safeFactoryId)
    const state = profile.factories?.[safeFactoryId] || createFactoryState(safeFactoryId, timestamp)
    profile.factories[safeFactoryId] = state

    if (state.owned !== true) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} aktif değil.` },
      }
      return db
    }

    const upgrade = normalizeFactoryUpgradeState(state.upgrading, template)
    const nowMs = createdMs(timestamp) || Date.now()
    const endsMs = createdMs(upgrade.endsAt)
    if (upgrade.active !== true || endsMs <= nowMs) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} için hızlandırılacak aktif yükseltme yok.` },
      }
      return db
    }

    const remainingMs = Math.max(1, endsMs - nowMs)
    const diamondCost = computeUpgradeSpeedupDiamondCost(template, remainingMs)
    if (profile.reputation < diamondCost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `Hızlandırma için ${diamondCost} elmas gerekli.` },
      }
      return db
    }

    const speedupRatio = factorySpeedupRatio(template)
    const reductionMs = Math.max(1, Math.round(remainingMs * speedupRatio))
    const nextEndsMs = Math.max(nowMs + 1000, endsMs - reductionMs)

    profile.reputation -= diamondCost
    state.upgrading = {
      ...upgrade,
      active: true,
      endsAt: new Date(nextEndsMs).toISOString(),
      speedupCount: Math.max(0, asInt(upgrade.speedupCount, 0)) + 1,
      speedupRatio,
      speedupDiamondCost: diamondCost,
    }
    state.updatedAt = timestamp
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'factory_upgrade_speedup',
        detail: `${template?.name || 'Fabrika'} yükseltmesi elmas ile hızlandırıldı.`,
        amount: -diamondCost,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'business',
      `${template?.name || 'Fabrika'} yükseltme süresi %${Math.round(speedupRatio * 100)} azaltıldı.`,
      timestamp,
    )

    tickFactories(profile, timestamp)

    result = {
      success: true,
      message: `${template?.name || 'Fabrika'} yükseltmesi hızlandırıldı.`,
      diamonds: profile.reputation,
      factories: factoriesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function speedupFactoryBuild(userId, factoryId) {
  const safeFactoryId = String(factoryId || '').trim()
  if (!safeFactoryId || !FACTORY_BY_ID.has(safeFactoryId)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçerli bir fabrika seçmelisin.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const template = FACTORY_BY_ID.get(safeFactoryId)
    const state = profile.factories?.[safeFactoryId] || createFactoryState(safeFactoryId, timestamp)
    profile.factories[safeFactoryId] = state

    const nowMs = createdMs(timestamp) || Date.now()
    const buildEndsMs = createdMs(state.buildEndsAt)
    const isBuilding = state.owned !== true && buildEndsMs > nowMs
    if (!isBuilding) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Fabrika'} inşaat halinde değil veya tamamlandı.` },
      }
      return db
    }

    const remainingMs = Math.max(1, buildEndsMs - nowMs)
    const diamondCost = computeBuildSpeedupDiamondCost(template, remainingMs)
    if (profile.reputation < diamondCost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `İnşaat hızlandırma için ${diamondCost} elmas gerekli.` },
      }
      return db
    }
    const speedupRatio = factorySpeedupRatio(template)
    const reductionMs = Math.max(1, Math.round(remainingMs * speedupRatio))
    const nextEndsMs = Math.max(nowMs + 1000, buildEndsMs - reductionMs)
    state.buildEndsAt = new Date(nextEndsMs).toISOString()
    state.updatedAt = timestamp
    profile.reputation -= diamondCost
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'factory_build_speedup',
        detail: `${template?.name || 'Fabrika'} inşaatı elmas ile hızlandırıldı (%${Math.round(speedupRatio * 100)}).`,
        amount: -diamondCost,
      },
      timestamp,
    )
    pushNotification(
      profile,
      'business',
      `${template?.name || 'Fabrika'} inşaat süresi %${Math.round(speedupRatio * 100)} kısaltıldı.`,
      timestamp,
    )

    tickFactories(profile, timestamp)

    result = {
      success: true,
      message: nextEndsMs <= nowMs ? `${template?.name || 'Fabrika'} inşaatı tamamlandı.` : `${template?.name || 'Fabrika'} inşaatı hızlandırıldı.`,
      diamonds: profile.reputation,
      factories: factoriesView(profile, timestamp),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function buyBusiness(userId, payload) {
  const purchaseKey = String(payload?.templateId || '').trim()

  if (!purchaseKey) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: '\u0130\u015fletme tipi seçmelisin.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const unlockEntry = companyUnlockEntryByKey(purchaseKey)
    if (!unlockEntry) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: '\u0130\u015fletme tipi bulunamadı.' },
      }
      return db
    }

    if (isCompanyUnlockEntryUnlocked(profile, unlockEntry)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${unlockEntry.name} zaten açılmış durumda.` },
      }
      return db
    }

    const entryIndex = COMPANY_UNLOCK_FLOW.findIndex((entry) => entry.key === unlockEntry.key)
    const previousEntries = entryIndex > 0 ? COMPANY_UNLOCK_FLOW.slice(0, entryIndex) : []
    const previousUnlocked = previousEntries.every((entry) => isCompanyUnlockEntryUnlocked(profile, entry))
    if (!previousUnlocked) {
      const previousLocked = previousEntries.find((entry) => !isCompanyUnlockEntryUnlocked(profile, entry))
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Önce ${previousLocked?.name || 'önceki işletme alanı'} açılmalıdır.` },
      }
      return db
    }

    const companyLevel = resolveCompanyLevel(profile)
    const requiredCompanyLevel = Math.max(0, asInt(unlockEntry.requiredCompanyLevel, 1))
    if (companyLevel < requiredCompanyLevel) {
      const missingCompanyLevel = Math.max(0, requiredCompanyLevel - companyLevel)
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${unlockEntry.name} için işletme seviyesi ${requiredCompanyLevel} gerekli. Kalan seviye: ${missingCompanyLevel}.` },
      }
      return db
    }

    const cost = weeklyEventCostValue(
      Math.max(1, asInt(unlockEntry.cost, 0)),
      timestamp,
      weeklyEvents,
      { minPositive: 1 },
    )

    if (profile.wallet < cost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `${unlockEntry.name} satın almak için bakiye yetersiz.` },
      }
      return db
    }

    profile.wallet -= cost
    setCompanyUnlockEntry(profile, unlockEntry, true)
    const unlockedBusinessCount = COMPANY_UNLOCK_FLOW.reduce(
      (sum, entry) => sum + (isCompanyUnlockEntryUnlocked(profile, entry) ? 1 : 0),
      0,
    )
    syncBusinessCountMission(profile.missions, unlockedBusinessCount, timestamp)
    addLeaguePoints(profile, Math.max(1, Math.floor(cost / 150)))

    pushTransaction(
      profile,
      {
        kind: 'business_buy',
        detail: `${unlockEntry.name} satın alındı.`,
        amount: -cost,
      },
      timestamp,
    )

    pushNotification(profile, 'business', `${unlockEntry.name} işletmesi aktif edildi.`, timestamp)

    profile.updatedAt = timestamp

    result = {
      success: true,
      wallet: profile.wallet,
      message: `${unlockEntry.name} satın alındı.`,
      businesses: businessView(profile, timestamp),
      templates: templateView(profile, timestamp),
      companyUnlock: companyUnlockView(profile, timestamp),
    }

    return db
  })

  return result
}

export async function upgradeBusiness(userId, businessId) {
  void businessId

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const companyLevel = resolveCompanyLevel(profile)
    if (companyLevel >= COMPANY_LEVEL_MAX) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'İşletme seviyesi zaten maksimuma ulaştı.' },
      }
      return db
    }
    const cost = companyUpgradeCost(companyLevel, { timestamp, weeklyEvents })
    if (profile.wallet < cost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'İşletme seviyesini yükseltmek için bakiye yetersiz.' },
      }
      return db
    }

    profile.wallet -= cost
    profile.companyLevel = clamp(companyLevel + 1, COMPANY_LEVEL_MIN, COMPANY_LEVEL_MAX)
    addLeaguePoints(profile, Math.max(1, Math.floor(cost / 180)))

    pushTransaction(
      profile,
      {
        kind: 'company_upgrade',
        detail: `İşletme seviyesi ${profile.companyLevel}. seviyeye yükseltildi.`,
        amount: -cost,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `İşletme seviyesi ${profile.companyLevel}. seviyeye yükseltildi.`,
      timestamp,
    )

    profile.updatedAt = timestamp

    result = {
      success: true,
      wallet: profile.wallet,
      message: `İşletme seviyesi ${profile.companyLevel}. seviyeye yükseldi.`,
      businesses: businessView(profile, timestamp),
      companyUnlock: companyUnlockView(profile, timestamp),
    }

    return db
  })

  return result
}

export async function produceBusinessVehicle(userId, businessId, payload = {}) {
  const safeBusinessId = String(businessId || '').trim()
  const requestedModelId = String(payload?.modelId || '').trim()
  if (!safeBusinessId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İşletme seçimi geçersiz.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const playerLevel = levelInfoFromXp(profile.xpTotal).level

    const business = profile.businesses.find((item) => item.id === safeBusinessId)
    if (!business) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İşletme bulunamadı.' },
      }
      return db
    }

    const template = BUSINESS_BY_ID.get(business.templateId)
    if (!isFleetBusinessTemplate(template)) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Bu işletmede araç üretilemez.' },
      }
      return db
    }

    if (!isFleetTemplateUnlocked(profile, business.templateId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Bu işletme'} kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.` },
      }
      return db
    }

    normalizeFleetBusinessState(business, template, timestamp, playerLevel)
    const fleetCapacity = business.fleetCapacity
    const operationalFleetCount = fleetOperationalCount(profile, business, template)

    if (operationalFleetCount >= fleetCapacity) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Filo kapasitesi dolu. Daha fazla kapasite için oyuncu seviyeni yükselt.' },
      }
      return db
    }

    const selectedSpec = requestedModelId
      ? fleetVehicleSpecByModelId(template, requestedModelId)
      : fleetVehicleSpecForIndex(template, operationalFleetCount)

    if (!selectedSpec) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Seçilen araç modeli bulunamadı.' },
      }
      return db
    }

    const cost = {
      cash: weeklyEventCostValue(selectedSpec.cash, timestamp, weeklyEvents, { minPositive: 1 }),
      engineKits: weeklyEventCostValue(selectedSpec.engineKits, timestamp, weeklyEvents, { minPositive: 1 }),
      spareParts: weeklyEventCostValue(selectedSpec.spareParts, timestamp, weeklyEvents, { minPositive: 1 }),
      fuel: weeklyEventCostValue(selectedSpec.fuel, timestamp, weeklyEvents, { minPositive: 1 }),
      energy: weeklyEventCostValue(selectedSpec.energy, timestamp, weeklyEvents, { minPositive: 1 }),
      cement: weeklyEventCostValue(Math.max(0, asInt(selectedSpec.cement, 0)), timestamp, weeklyEvents, { minPositive: 1 }),
      timber: weeklyEventCostValue(Math.max(0, asInt(selectedSpec.timber, 0)), timestamp, weeklyEvents, { minPositive: 1 }),
      brick: weeklyEventCostValue(Math.max(0, asInt(selectedSpec.brick, 0)), timestamp, weeklyEvents, { minPositive: 1 }),
      vehicleId: selectedSpec.id,
      vehicleName: selectedSpec.name,
      tier: selectedSpec.tier,
      image: selectedSpec.image,
      emoji: selectedSpec.emoji,
      requiredLevel: selectedSpec.requiredLevel,
      rentPerHour: selectedSpec.rentPerHour,
      xp: selectedSpec.xp,
    }

    const unlockedVehicleLevel = fleetOrderUnlockLevelFromPlayerLevel(playerLevel, template)
    if (Math.max(1, asInt(cost.requiredLevel, 1)) > unlockedVehicleLevel) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Bu modeli sipariş etmek için açılan model seviyesi en az ${cost.requiredLevel} olmalı. Mevcut açılan seviye: ${unlockedVehicleLevel}.`,
        },
      }
      return db
    }

    const nowMs = createdMs(timestamp)
    const lastOrderMs = createdMs(business.lastVehicleOrderedAt || '')
    const nextOrderReadyMs = lastOrderMs + FLEET_VEHICLE_ORDER_COOLDOWN_MS
    if (lastOrderMs > 0 && nowMs < nextOrderReadyMs) {
      const waitMinutes = Math.max(1, Math.ceil((nextOrderReadyMs - nowMs) / MS_MINUTE))
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Yeni sipariş için ${waitMinutes} dakika beklemelisin.` },
      }
      return db
    }

    const isPropertyTemplate = String(template?.id || '').trim() === 'property-rental'
    const materialCosts = isPropertyTemplate
      ? [
          { itemId: 'cement', required: Math.max(0, asInt(cost.cement, 0)) },
          { itemId: 'timber', required: Math.max(0, asInt(cost.timber, 0)) },
          { itemId: 'brick', required: Math.max(0, asInt(cost.brick, 0)) },
        ]
      : [
          { itemId: 'engine-kit', required: Math.max(0, asInt(cost.engineKits, 0)) },
          { itemId: 'spare-parts', required: Math.max(0, asInt(cost.spareParts, 0)) },
        ]

    if (profile.wallet < cost.cash) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Yeni araç için nakit yetersiz.' },
      }
      return db
    }

    for (const row of materialCosts) {
      if (row.required <= 0) continue
      const available = getInventoryQuantity(profile, row.itemId)
      if (available < row.required) {
        const itemName = ITEM_BY_ID.get(row.itemId)?.name || row.itemId
        result = {
          success: false,
          reason: 'insufficient_inventory',
          errors: { global: `Yeni birim için ${itemName} yetersiz.` },
        }
        return db
      }
    }

    profile.wallet -= cost.cash
    for (const row of materialCosts) {
      if (row.required <= 0) continue
      removeInventory(profile, row.itemId, row.required)
    }

    if (!Array.isArray(business.vehicles)) {
      business.vehicles = []
    }
    const vehicleLifetime = resolveAssetLifetime(timestamp, timestamp, timestamp)
    business.vehicles.push({
      id: crypto.randomUUID(),
      modelId: String(cost.vehicleId || ''),
      name: String(cost.vehicleName || 'Yeni Araç'),
      tier: normalizedFleetTier(cost.tier),
      image: String(cost.image || ''),
      emoji: String(cost.emoji || ''),
      requiredLevel: Math.max(1, asInt(cost.requiredLevel, 1)),
      rentPerHour: Math.max(1, asInt(cost.rentPerHour, 0)),
      xp: Math.max(1, asInt(cost.xp, 0)),
      cost: {
        cash: cost.cash,
        engineKits: cost.engineKits,
        spareParts: cost.spareParts,
        fuel: cost.fuel,
        energy: cost.energy,
        cement: cost.cement,
        timber: cost.timber,
        brick: cost.brick,
      },
      producedAt: vehicleLifetime.acquiredAt,
      expiresAt: vehicleLifetime.expiresAt,
    })
    business.fleetCount = Math.max(0, business.vehicles.length)
    business.fleetRentTotal = Math.max(0, asInt(business.fleetRentTotal, 0)) + Math.max(1, asInt(cost.rentPerHour, 0))
    business.fleetXpTotal = Math.max(0, asInt(business.fleetXpTotal, 0)) + Math.max(1, asInt(cost.xp, 0))
    business.lastVehicleOrderedAt = timestamp
    business.updatedAt = timestamp
    profile.updatedAt = timestamp
    applyMissionProgress(profile.missions, { type: 'vehicle_purchase', value: 1 }, timestamp)
    addLeaguePoints(profile, Math.max(1, Math.floor(cost.cash / 220)))

    pushTransaction(
      profile,
      {
        kind: 'business_vehicle_build',
        detail: `${template.name} filosuna ${cost.vehicleName || 'yeni araç'} eklendi.`,
        amount: -cost.cash,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `${template.name} filosuna yeni araç eklendi.`,
      timestamp,
    )

    result = {
      success: true,
      wallet: profile.wallet,
      message: `${cost.vehicleName || 'Yeni araç'} filoya eklendi.`,
      business: {
        id: business.id,
        fleetCount: business.fleetCount,
        fleetCapacity: business.fleetCapacity,
        fleetRentTotal: business.fleetRentTotal,
        fleetXpTotal: business.fleetXpTotal,
      },
      energy: profile.energy,
      cost,
      businesses: businessView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }

    return db
  })

  return result
}

export async function listBusinessVehicleForSale(userId, businessId, payload = {}) {
  const safeBusinessId = String(businessId || '').trim()
  const safeVehicleId = String(payload?.vehicleId || '').trim()
  const safePrice = Math.max(0, asInt(payload?.price, 0))
  const safeRecipientUserId = String(payload?.recipientUserId || '').trim()
  const requestedVisibility = String(payload?.visibility || 'public').trim().toLowerCase() === 'custom' ? 'custom' : 'public'
  // Frontend bug/latency olursa da recipientUserId gönderildiyse "custom" kabul edelim.
  const visibility = safeRecipientUserId ? 'custom' : requestedVisibility

  if (!safeBusinessId || !safeVehicleId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İlan için işletme ve araç seçimi zorunludur.' },
    }
  }

  if (visibility === 'custom') {
    if (!safeRecipientUserId) {
      return {
        success: false,
        reason: 'validation',
        errors: { global: 'Özel ilan için satılacak kişi zorunludur.' },
      }
    }
    if (String(userId || '').trim() === safeRecipientUserId) {
      return {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendine özel ilan veremezsin.' },
      }
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const playerLevel = levelInfoFromXp(profile.xpTotal).level

    const business = profile.businesses.find((item) => item.id === safeBusinessId)
    if (!business) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İşletme bulunamadı.' },
      }
      return db
    }

    const template = BUSINESS_BY_ID.get(business.templateId)
    if (!isFleetBusinessTemplate(template)) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Bu işletmede ikinci el ilan açılamaz.' },
      }
      return db
    }

    if (!isFleetTemplateUnlocked(profile, business.templateId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Bu işletme'} kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.` },
      }
      return db
    }

    normalizeFleetBusinessState(business, template, timestamp, playerLevel)

    if (visibility === 'custom') {
      ensureSocialState(profile)
      const recipientProfile = ensureProfile(db, safeRecipientUserId, timestamp, {
        markActive: false,
      })
      if (!recipientProfile) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'Satılacak kişi bulunamadı.' },
        }
        return db
      }

      ensureSocialState(recipientProfile)
      const blockedByEitherSide =
        userBlocked(profile, safeRecipientUserId) || userBlocked(recipientProfile, profile.userId)
      if (blockedByEitherSide) {
        result = {
          success: false,
          reason: 'validation',
          errors: { global: 'Özel ilan için engel durumu nedeniyle işlem reddedildi.' },
        }
        return db
      }

      if (!usersAreFriends(profile, recipientProfile, profile.userId, safeRecipientUserId)) {
        result = {
          success: false,
          reason: 'validation',
          errors: { global: 'Özel ilan yalnızca arkadaşlara gönderilebilir.' },
        }
        return db
      }
    }

    const vehicleIndex = (business.vehicles || []).findIndex(
      (entry) => String(entry?.id || '').trim() === safeVehicleId,
    )
    if (vehicleIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İlana koyulacak araç bulunamadı.' },
      }
      return db
    }

    const vehicle = business.vehicles[vehicleIndex]

    const requiredLevel = Math.max(1, asInt(vehicle?.requiredLevel, 1))
    const basePrice = fleetListingBasePrice(vehicle)
    const bounds = listingPriceBounds(basePrice, {
      templateId: business.templateId,
      requiredLevel,
    })
    const finalPrice = safePrice > 0
      ? clamp(safePrice, bounds.minPrice, bounds.maxPrice)
      : bounds.suggestedPrice
    const [listedVehicle] = business.vehicles.splice(vehicleIndex, 1)
    const listedLifetime = resolveAssetLifetime(
      listedVehicle?.producedAt || timestamp,
      timestamp,
      timestamp,
    )
    business.fleetCount = Math.max(0, business.vehicles.length)
    business.fleetRentTotal = business.vehicles.reduce(
      (sum, entry) => sum + Math.max(0, asInt(entry?.rentPerHour, 0)),
      0,
    )
    business.fleetXpTotal = business.vehicles.reduce(
      (sum, entry) => sum + Math.max(0, asInt(entry?.xp, 0)),
      0,
    )
    business.updatedAt = timestamp

    if (!Array.isArray(profile.vehicleListings)) {
      profile.vehicleListings = []
    }
    profile.vehicleListings.unshift({
      id: crypto.randomUUID(),
      businessId: business.id,
      templateId: business.templateId,
      vehicleId: String(listedVehicle?.id || crypto.randomUUID()),
      modelId: String(listedVehicle?.modelId || ''),
      name: String(listedVehicle?.name || 'Araç İlanı'),
      tier: normalizedFleetTier(listedVehicle?.tier),
      image: String(listedVehicle?.image || ''),
      emoji: String(listedVehicle?.emoji || ''),
      requiredLevel: Math.max(1, asInt(listedVehicle?.requiredLevel, requiredLevel)),
      rentPerHour: Math.max(1, asInt(listedVehicle?.rentPerHour, 1)),
      xp: Math.max(1, asInt(listedVehicle?.xp, 1)),
      capacity: Math.max(1, asInt(listedVehicle?.capacity, 1)),
      upkeepPerRun: Math.max(1, asInt(listedVehicle?.upkeepPerRun, Math.max(1, Math.round(asInt(listedVehicle?.rentPerHour, 1) * 0.08)))),
      engineKits: Math.max(0, asInt(listedVehicle?.cost?.engineKits, 0)),
      spareParts: Math.max(0, asInt(listedVehicle?.cost?.spareParts, 0)),
      energy: Math.max(0, asInt(listedVehicle?.cost?.energy, 0)),
      cement: Math.max(0, asInt(listedVehicle?.cost?.cement, 0)),
      timber: Math.max(0, asInt(listedVehicle?.cost?.timber, 0)),
      brick: Math.max(0, asInt(listedVehicle?.cost?.brick, 0)),
      cash: Math.max(0, asInt(listedVehicle?.cost?.cash, 0)),
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      suggestedPrice: bounds.suggestedPrice,
      price: finalPrice,
      listedAt: timestamp,
      acquiredAt: listedLifetime.acquiredAt,
      expiresAt: listedLifetime.expiresAt,
      visibility,
      recipientUserId: visibility === 'custom' ? safeRecipientUserId : '',
      sellerUserId: profile.userId,
      sellerName: profile.username,
    })
    profile.vehicleListings = profile.vehicleListings.slice(0, 120)
    profile.updatedAt = timestamp
    const assetTypeLabel = assetTypeLabelFromTemplateId(business.templateId)
    const vehicleDisplayName = String(listedVehicle?.name || assetTypeLabel).trim() || assetTypeLabel
    pushNotification(profile, 'business', `${assetTypeLabel} "${vehicleDisplayName}" satışa sunuldu. İlana koyuldu.`, timestamp)

    result = {
      success: true,
      message: `${listedVehicle?.name || 'Araç'} satış listene eklendi.`,
      businesses: businessView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }

    return db
  })

  return result
}

export async function listLogisticsTruckForSale(userId, truckId, payload = {}) {
  const safeTruckId = String(truckId || '').trim()
  const safePrice = Math.max(0, asInt(payload?.price, 0))
  const safeRecipientUserId = String(payload?.recipientUserId || '').trim()
  const requestedVisibility = String(payload?.visibility || 'public').trim().toLowerCase() === 'custom' ? 'custom' : 'public'
  // Frontend bug/latency olursa da recipientUserId gönderildiyse "custom" kabul edelim.
  const visibility = safeRecipientUserId ? 'custom' : requestedVisibility
  if (!safeTruckId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İlan için tır seçimi zorunludur.' },
    }
  }

  if (visibility === 'custom') {
    if (!safeRecipientUserId) {
      return {
        success: false,
        reason: 'validation',
        errors: { global: 'Özel ilan için satılacak kişi zorunludur.' },
      }
    }
    if (String(userId || '').trim() === safeRecipientUserId) {
      return {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendine özel ilan veremezsin.' },
      }
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    if (!isLogisticsUnlocked(profile)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tır Kiralama kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.' },
      }
      return db
    }

    if (visibility === 'custom') {
      ensureSocialState(profile)
      const recipientProfile = ensureProfile(db, safeRecipientUserId, timestamp, {
        markActive: false,
      })
      if (!recipientProfile) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'Satılacak kişi bulunamadı.' },
        }
        return db
      }

      ensureSocialState(recipientProfile)
      const blockedByEitherSide =
        userBlocked(profile, safeRecipientUserId) || userBlocked(recipientProfile, profile.userId)
      if (blockedByEitherSide) {
        result = {
          success: false,
          reason: 'validation',
          errors: { global: 'Özel ilan için engel durumu nedeniyle işlem reddedildi.' },
        }
        return db
      }

      if (!usersAreFriends(profile, recipientProfile, profile.userId, safeRecipientUserId)) {
        result = {
          success: false,
          reason: 'validation',
          errors: { global: 'Özel ilan yalnızca arkadaşlara gönderilebilir.' },
        }
        return db
      }
    }

    const truckIndex = (profile.logisticsFleet || []).findIndex(
      (entry) => String(entry?.id || '').trim() === safeTruckId,
    )
    if (truckIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İlan için seçilen tır bulunamadı.' },
      }
      return db
    }

    const truck = profile.logisticsFleet[truckIndex]
    const totalCapacityBefore = logisticsFleetCapacity(profile)
    const reservedCapacity = logisticsReservedCapacity(profile)
    const truckCapacity = Math.max(1, asInt(truck?.capacity, 1))
    if (Math.max(0, totalCapacityBefore - truckCapacity) < reservedCapacity) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: 'Aktif sevkiyat kapasitesi nedeniyle bu tır şu an ilana konamaz.',
        },
      }
      return db
    }

    const requiredLevel = Math.max(1, asInt(truck?.levelRequired, 1))
    const basePrice = logisticsListingBasePrice(truck)
    const bounds = listingPriceBounds(basePrice, {
      templateId: 'logistics',
      requiredLevel,
    })
    const finalPrice = safePrice > 0
      ? clamp(safePrice, bounds.minPrice, bounds.maxPrice)
      : bounds.suggestedPrice
    const truckLifetime = resolveAssetLifetime(
      truck?.purchasedAt || timestamp,
      timestamp,
      timestamp,
    )

    const truckModelId = String(truck?.modelId || '').trim()
    profile.logisticsFleet.splice(truckIndex, 1)

    if (!Array.isArray(profile.vehicleListings)) {
      profile.vehicleListings = []
    }
    profile.vehicleListings.unshift({
      id: crypto.randomUUID(),
      businessId: 'logistics-center',
      templateId: 'logistics',
      vehicleId: String(truck.id || crypto.randomUUID()),
      modelId: truckModelId,
      name: String(truck.name || 'İkinci El Tır'),
      tier: normalizedFleetTier(truck.tier),
      image: logisticsTruckImagePath(truckModelId, truck?.image),
      emoji: String(truck.emoji || ''),
      requiredLevel,
      rentPerHour: Math.max(1, asInt(truck.incomePerRun, 1)),
      xp: Math.max(1, asInt(truck.xpPerRun, 1)),
      capacity: truckCapacity,
      upkeepPerRun: Math.max(1, asInt(truck.upkeepPerRun, 1)),
      engineKits: Math.max(1, asInt(truck.engineKits, 1)),
      spareParts: Math.max(1, asInt(truck.spareParts, 1)),
      cash: Math.max(1, asInt(truck.cash, 1)),
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      suggestedPrice: bounds.suggestedPrice,
      price: finalPrice,
      listedAt: timestamp,
      acquiredAt: truckLifetime.acquiredAt,
      expiresAt: truckLifetime.expiresAt,
      visibility,
      recipientUserId: visibility === 'custom' ? safeRecipientUserId : '',
      sellerUserId: profile.userId,
      sellerName: profile.username,
    })
    profile.vehicleListings = profile.vehicleListings.slice(0, 120)
    profile.updatedAt = timestamp
    const truckDisplayName = String(truck?.name || 'Tır').trim() || 'Tır'
    pushNotification(profile, 'business', `Tır "${truckDisplayName}" satışa sunuldu. İlana koyuldu.`, timestamp)

    result = {
      success: true,
      message: `${truck?.name || 'Tır'} ikinci el pazarına eklendi.`,
      businesses: businessView(profile, timestamp),
      logisticsFleet: logisticsFleetView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }
    return db
  })

  return result
}

function listingToFleetVehicle(listing, timestamp) {
  const price = Math.max(1, asInt(listing?.price, 1))
  const lifetime = resolveAssetLifetime(
    listing?.acquiredAt || listing?.producedAt || listing?.listedAt || timestamp,
    timestamp,
    timestamp,
  )
  return {
    id: crypto.randomUUID(),
    modelId: String(listing?.modelId || ''),
    name: String(listing?.name || 'Araç'),
    tier: normalizedFleetTier(listing?.tier),
    image: String(listing?.image || ''),
    emoji: String(listing?.emoji || ''),
    requiredLevel: Math.max(1, asInt(listing?.requiredLevel, 1)),
    rentPerHour: Math.max(1, asInt(listing?.rentPerHour, 1)),
    xp: Math.max(1, asInt(listing?.xp, 1)),
    cost: {
      cash: Math.max(1, asInt(listing?.cash, Math.round(price * 0.9))),
      engineKits: Math.max(0, asInt(listing?.engineKits, 0)),
      spareParts: Math.max(0, asInt(listing?.spareParts, 0)),
      fuel: Math.max(0, asInt(listing?.fuel, 0)),
      energy: Math.max(0, asInt(listing?.energy, 0)),
      cement: Math.max(0, asInt(listing?.cement, 0)),
      timber: Math.max(0, asInt(listing?.timber, 0)),
      brick: Math.max(0, asInt(listing?.brick, 0)),
    },
    producedAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
  }
}

function listingToLogisticsTruck(listing, timestamp) {
  const price = Math.max(1, asInt(listing?.price, 1))
  const modelId = String(listing?.modelId || '').trim() || crypto.randomUUID()
  const lifetime = resolveAssetLifetime(
    listing?.acquiredAt || listing?.purchasedAt || listing?.listedAt || timestamp,
    timestamp,
    timestamp,
  )
  return {
    id: crypto.randomUUID(),
    modelId,
    name: String(listing?.name || 'İkinci El Tır'),
    image: logisticsTruckImagePath(modelId, listing?.image),
    tier: normalizedFleetTier(listing?.tier),
    levelRequired: Math.max(1, asInt(listing?.requiredLevel, 1)),
    capacity: Math.max(1, asInt(listing?.capacity, 1)),
    engineKits: Math.max(1, asInt(listing?.engineKits, 1)),
    spareParts: Math.max(1, asInt(listing?.spareParts, 1)),
    cash: Math.max(1, asInt(listing?.cash, Math.round(price * 0.9))),
    incomePerRun: Math.max(1, asInt(listing?.rentPerHour, 1)),
    xpPerRun: Math.max(1, asInt(listing?.xp, 1)),
    upkeepPerRun: Math.max(1, asInt(listing?.upkeepPerRun, Math.max(1, Math.round(asInt(listing?.rentPerHour, 1) * 0.08)))),
    purchasedAt: lifetime.acquiredAt,
    expiresAt: lifetime.expiresAt,
  }
}

function scrapReturnQuantityFromMaterial(materialQuantity) {
  const sourceQuantity = Math.max(0, asInt(materialQuantity, 0))
  if (sourceQuantity <= 0) return 0
  return Math.max(1, Math.round(sourceQuantity * VEHICLE_SCRAP_RETURN_RATE))
}

function resolveVehicleScrapReturn(source) {
  const engineKits = scrapReturnQuantityFromMaterial(
    source?.engineKits ?? source?.cost?.engineKits ?? 0,
  )
  const spareParts = scrapReturnQuantityFromMaterial(
    source?.spareParts ?? source?.cost?.spareParts ?? 0,
  )
  const energy = scrapReturnQuantityFromMaterial(
    source?.energy ?? source?.cost?.energy ?? 0,
  )
  const cement = scrapReturnQuantityFromMaterial(
    source?.cement ?? source?.cost?.cement ?? 0,
  )
  const timber = scrapReturnQuantityFromMaterial(
    source?.timber ?? source?.cost?.timber ?? 0,
  )
  const brick = scrapReturnQuantityFromMaterial(
    source?.brick ?? source?.cost?.brick ?? 0,
  )
  return {
    engineKits,
    spareParts,
    energy,
    cement,
    timber,
    brick,
    rate: VEHICLE_SCRAP_RETURN_RATE,
  }
}

function applyVehicleScrapReturn(profile, scrapReturn) {
  const engineKits = Math.max(0, asInt(scrapReturn?.engineKits, 0))
  const spareParts = Math.max(0, asInt(scrapReturn?.spareParts, 0))
  const energy = Math.max(0, asInt(scrapReturn?.energy, 0))
  const cement = Math.max(0, asInt(scrapReturn?.cement, 0))
  const timber = Math.max(0, asInt(scrapReturn?.timber, 0))
  const brick = Math.max(0, asInt(scrapReturn?.brick, 0))
  if (engineKits > 0) {
    addInventory(profile, 'engine-kit', engineKits)
  }
  if (spareParts > 0) {
    addInventory(profile, 'spare-parts', spareParts)
  }
  if (energy > 0) {
    addInventory(profile, 'energy', energy)
  }
  if (cement > 0) {
    addInventory(profile, 'cement', cement)
  }
  if (timber > 0) {
    addInventory(profile, 'timber', timber)
  }
  if (brick > 0) {
    addInventory(profile, 'brick', brick)
  }
}

function scrapReturnPayload(scrapReturn) {
  return {
    rate: VEHICLE_SCRAP_RETURN_RATE,
    engineKitItemId: 'engine-kit',
    engineKitItemName: ITEM_BY_ID.get('engine-kit')?.name || 'Motor',
    engineKits: Math.max(0, asInt(scrapReturn?.engineKits, 0)),
    sparePartItemId: 'spare-parts',
    sparePartItemName: ITEM_BY_ID.get('spare-parts')?.name || 'Yedek Parça',
    spareParts: Math.max(0, asInt(scrapReturn?.spareParts, 0)),
    energyItemId: 'energy',
    energyItemName: ITEM_BY_ID.get('energy')?.name || 'Enerji',
    energy: Math.max(0, asInt(scrapReturn?.energy, 0)),
    cementItemId: 'cement',
    cementItemName: ITEM_BY_ID.get('cement')?.name || 'Cimento',
    cement: Math.max(0, asInt(scrapReturn?.cement, 0)),
    timberItemId: 'timber',
    timberItemName: ITEM_BY_ID.get('timber')?.name || 'Kereste',
    timber: Math.max(0, asInt(scrapReturn?.timber, 0)),
    brickItemId: 'brick',
    brickItemName: ITEM_BY_ID.get('brick')?.name || 'Tugla',
    brick: Math.max(0, asInt(scrapReturn?.brick, 0)),
  }
}

export async function buyVehicleListing(userId, listingId) {
  const safeListingId = String(listingId || '').trim()
  if (!safeListingId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İkinci el alımında ilan seçimi zorunludur.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const buyerProfile = ensureProfile(db, userId, timestamp)
    if (!buyerProfile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, buyerProfile, timestamp)
    const buyerLevel = levelInfoFromXp(buyerProfile.xpTotal).level

    let sellerProfile = null
    let listing = null
    for (const profile of db.gameProfiles) {
      const list = Array.isArray(profile?.vehicleListings) ? profile.vehicleListings : []
      const entry = list.find((item) => String(item?.id || '').trim() === safeListingId)
      if (!entry) continue
      sellerProfile = profile
      listing = entry
      break
    }

    if (!listing || !sellerProfile) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İlan bulunamadı veya kaldırıldı.' },
      }
      return db
    }

    if (String(listing.sellerUserId || '') === String(buyerProfile.userId || '')) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendi ilanını satın alamazsın.' },
      }
      return db
    }

    const listingVisibility =
      String(listing.visibility || 'public').trim().toLowerCase() === 'custom' ? 'custom' : 'public'
    if (listingVisibility === 'custom') {
      const recipientUserId = String(listing.recipientUserId || '').trim()
      const buyerUserId = String(buyerProfile.userId || '').trim()
      if (!recipientUserId || recipientUserId !== buyerUserId) {
        result = {
          success: false,
          reason: 'validation',
          errors: { global: 'Bu özel ilan sadece belirlenen kullanıcıya açıktır.' },
        }
        return db
      }
    }

    const listingTemplateId = normalizeListingTemplateId(listing.templateId)
    const templateId = listingTemplateId === 'logistics' ? '' : normalizeBusinessTemplateId(listingTemplateId)
    const template = templateId ? BUSINESS_BY_ID.get(templateId) : null
    const isLogisticsListing = listingTemplateId === 'logistics'

    if (!isLogisticsListing && !isFleetBusinessTemplate(template)) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Bu ilan türü satın almaya uygun değil.' },
      }
      return db
    }

    let targetBusiness = null
    if (!isLogisticsListing) {
      targetBusiness = buyerProfile.businesses.find((item) => item.templateId === templateId)
      if (!targetBusiness) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'Bu ilan için uygun işletme bulunamadı.' },
        }
        return db
      }

      if (!isFleetTemplateUnlocked(buyerProfile, templateId)) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: `${template?.name || 'Bu işletme'} kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.` },
        }
        return db
      }

      normalizeFleetBusinessState(targetBusiness, template, timestamp, buyerLevel)
      const operationalFleetCount = fleetOperationalCount(buyerProfile, targetBusiness, template)

      if (operationalFleetCount >= targetBusiness.fleetCapacity) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: 'Kapasite dolu olduğu için ikinci el araç alınamaz.' },
        }
        return db
      }

      const requiredLevel = Math.max(1, asInt(listing.requiredLevel, 1))
      const unlockedVehicleLevel = fleetOrderUnlockLevelFromPlayerLevel(buyerLevel, template)
      if (requiredLevel > unlockedVehicleLevel) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: `Bu araç için gereken seviye ${requiredLevel}. Açılan seviye ${unlockedVehicleLevel}.` },
        }
        return db
      }
    } else {
      if (!isLogisticsUnlocked(buyerProfile)) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: 'Tır Kiralama kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.' },
        }
        return db
      }

      const requiredLevel = Math.max(1, asInt(listing.requiredLevel, 1))
      if (requiredLevel > buyerLevel) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: `Bu tır için gereken seviye ${requiredLevel}.` },
        }
        return db
      }

      const truckSlotCapacity = clamp(buyerLevel, 1, LOGISTICS_MAX_TRUCK_COUNT)
      const operationalTruckCount = logisticsOperationalTrucks(buyerProfile, timestamp).length
      if (operationalTruckCount >= truckSlotCapacity) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: 'Tır slot kapasitesi dolu olduğu için bu ilanı satın alamazsın.' },
        }
        return db
      }
    }

    const price = Math.max(1, asInt(listing.price, 1))
    const commission = listingCommissionPreview(price)
    const totalBuyerCost = commission.totalCost
    const sellerPayout = Math.max(0, asInt(commission.sellerPayout, 0))
    if (buyerProfile.wallet < totalBuyerCost) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: `İkinci el alım için nakit yetersiz. Gerekli tutar: ${totalBuyerCost}.` },
      }
      return db
    }

    const sellerListingIndex = (sellerProfile.vehicleListings || []).findIndex(
      (item) => String(item?.id || '').trim() === safeListingId,
    )
    if (sellerListingIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İlan bulunamadı veya kaldırıldı.' },
      }
      return db
    }

    const [soldListing] = sellerProfile.vehicleListings.splice(sellerListingIndex, 1)
    buyerProfile.wallet -= totalBuyerCost
    sellerProfile.wallet = Math.max(0, asInt(sellerProfile.wallet, 0)) + sellerPayout
    const soldTemplateId = normalizeListingTemplateId(soldListing?.templateId)
    const soldAssetLabel = soldTemplateId === 'moto-rental'
      ? 'Motor'
      : soldTemplateId === 'property-rental'
        ? 'Mülk'
      : soldTemplateId === 'auto-rental'
        ? 'Araba'
        : 'Tır'

    if (isLogisticsListing) {
      if (!Array.isArray(buyerProfile.logisticsFleet)) {
        buyerProfile.logisticsFleet = []
      }
      buyerProfile.logisticsFleet.push(listingToLogisticsTruck(soldListing, timestamp))
    } else if (targetBusiness) {
      if (!Array.isArray(targetBusiness.vehicles)) {
        targetBusiness.vehicles = []
      }
      targetBusiness.vehicles.push(listingToFleetVehicle(soldListing, timestamp))
      targetBusiness.fleetCount = Math.max(0, targetBusiness.vehicles.length)
      targetBusiness.fleetRentTotal = targetBusiness.vehicles.reduce(
        (sum, entry) => sum + Math.max(0, asInt(entry?.rentPerHour, 0)),
        0,
      )
      targetBusiness.fleetXpTotal = targetBusiness.vehicles.reduce(
        (sum, entry) => sum + Math.max(0, asInt(entry?.xp, 0)),
        0,
      )
      targetBusiness.updatedAt = timestamp
    }

    buyerProfile.updatedAt = timestamp
    sellerProfile.updatedAt = timestamp
    applyMissionProgress(buyerProfile.missions, { type: 'vehicle_purchase', value: 1 }, timestamp)

    pushTransaction(
      buyerProfile,
      {
        kind: 'vehicle_market_buy',
        detail: `${soldListing?.name || soldAssetLabel} ikinci el pazardan satın alındı. [Kategori: ${soldAssetLabel}]`,
        amount: -totalBuyerCost,
      },
      timestamp,
    )
    pushTransaction(
      sellerProfile,
      {
        kind: 'vehicle_market_sell',
        detail: `${soldAssetLabel} "${String(soldListing?.name || soldAssetLabel).trim() || soldAssetLabel}" satıldı. Vergi: ${asInt(commission.commissionAmount, 0)}. Hesabınıza +${sellerPayout} eklendi. Alıcı: ${buyerProfile.username || buyerProfile.displayName || 'Oyuncu'}.`,
        amount: sellerPayout,
      },
      timestamp,
    )

    const buyerName = buyerProfile.username || buyerProfile.displayName || 'Oyuncu'
    const sellerName = sellerProfile.username || sellerProfile.displayName || 'Oyuncu'
    const assetName = String(soldListing?.name || soldAssetLabel).trim() || soldAssetLabel
    const commissionAmount = asInt(commission.commissionAmount, 0)
    pushNotification(
      buyerProfile,
      'business',
      `${soldAssetLabel} "${assetName}" satın aldınız. Satıcı: ${sellerName}. Filona eklendi.`,
      timestamp,
    )
    pushNotification(
      sellerProfile,
      'business',
      `${soldAssetLabel} "${assetName}" satıldı. Vergi: ${commissionAmount}. Hesabınıza +${sellerPayout} eklendi. Alıcı: ${buyerName}.`,
      timestamp,
    )

    if (!Array.isArray(sellerProfile.soldItems)) sellerProfile.soldItems = []
    sellerProfile.soldItems.push({
      name: String(soldListing?.name || soldAssetLabel).trim() || soldAssetLabel,
      templateId: soldTemplateId,
      label: soldAssetLabel,
      soldAt: timestamp,
    })

    result = {
      success: true,
      message: `${soldListing?.name || (isLogisticsListing ? 'Tır' : 'Araç')} satın alındı.`,
      wallet: buyerProfile.wallet,
      purchase: {
        listingPrice: price,
        commissionRate: commission.commissionRate,
        commissionAmount: commission.commissionAmount,
        totalCost: totalBuyerCost,
        sellerPayout,
      },
      businesses: businessView(buyerProfile, timestamp),
      logisticsFleet: logisticsFleetView(buyerProfile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(buyerProfile),
    }

    return db
  })

  return result
}

export async function cancelVehicleListing(userId, listingId) {
  const safeListingId = String(listingId || '').trim()
  if (!safeListingId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İptal edilecek ilan seçilmelidir.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const playerLevel = levelInfoFromXp(profile.xpTotal).level

    const listingIndex = (profile.vehicleListings || []).findIndex(
      (item) => String(item?.id || '').trim() === safeListingId,
    )
    if (listingIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İlan bulunamadı veya daha önce kaldırıldı.' },
      }
      return db
    }

    const listing = profile.vehicleListings[listingIndex]
    const listingTemplateId = normalizeListingTemplateId(listing.templateId)
    const templateId = listingTemplateId === 'logistics' ? '' : normalizeBusinessTemplateId(listingTemplateId)
    const template = templateId ? BUSINESS_BY_ID.get(templateId) : null
    const isLogisticsListing = listingTemplateId === 'logistics'

    let targetBusiness = null
    if (!isLogisticsListing) {
      if (!isFleetBusinessTemplate(template)) {
        result = {
          success: false,
          reason: 'validation',
          errors: { global: 'Bu ilanı iptal etmek için uygun işletme bulunamadı.' },
        }
        return db
      }

      const preferredBusiness = profile.businesses.find(
        (entry) => entry.id === listing.businessId && entry.templateId === templateId,
      )
      const fallbackBusiness = profile.businesses.find((entry) => entry.templateId === templateId)
      targetBusiness = preferredBusiness || fallbackBusiness

      if (!targetBusiness) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'İade için uygun işletme bulunamadı.' },
        }
        return db
      }

      normalizeFleetBusinessState(targetBusiness, template, timestamp, playerLevel)
    } else {
      void playerLevel
    }

    profile.vehicleListings.splice(listingIndex, 1)

    if (isLogisticsListing) {
      if (!Array.isArray(profile.logisticsFleet)) {
        profile.logisticsFleet = []
      }
      profile.logisticsFleet.push(listingToLogisticsTruck(listing, timestamp))
    } else if (targetBusiness) {
      if (!Array.isArray(targetBusiness.vehicles)) {
        targetBusiness.vehicles = []
      }
      targetBusiness.vehicles.push(listingToFleetVehicle(listing, timestamp))
      targetBusiness.fleetCount = Math.max(0, targetBusiness.vehicles.length)
      targetBusiness.fleetRentTotal = targetBusiness.vehicles.reduce(
        (sum, entry) => sum + Math.max(0, asInt(entry?.rentPerHour, 0)),
        0,
      )
      targetBusiness.fleetXpTotal = targetBusiness.vehicles.reduce(
        (sum, entry) => sum + Math.max(0, asInt(entry?.xp, 0)),
        0,
      )
      targetBusiness.updatedAt = timestamp
    }
    profile.updatedAt = timestamp

    pushNotification(
      profile,
      'market',
      `${listing?.name || (isLogisticsListing ? 'Tır' : 'Araç')} ilanından çıkarıldı ve filoya geri eklendi.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${listing?.name || (isLogisticsListing ? 'Tır' : 'Araç')} ilanı iptal edildi.`,
      businesses: businessView(profile, timestamp),
      logisticsFleet: logisticsFleetView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }

    return db
  })

  return result
}

export async function scrapBusinessVehicle(userId, businessId, payload = {}) {
  const safeBusinessId = String(businessId || '').trim()
  const safeVehicleId = String(payload?.vehicleId || '').trim()
  if (!safeBusinessId || !safeVehicleId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Parçalama için işletme ve araç seçimi zorunludur.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const playerLevel = levelInfoFromXp(profile.xpTotal).level

    const business = profile.businesses.find((item) => item.id === safeBusinessId)
    if (!business) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'İşletme bulunamadı.' },
      }
      return db
    }

    const template = BUSINESS_BY_ID.get(business.templateId)
    if (!isFleetBusinessTemplate(template)) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Bu işletmede araç parçalama yapılamaz.' },
      }
      return db
    }

    if (!isFleetTemplateUnlocked(profile, business.templateId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Bu işletme'} kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.` },
      }
      return db
    }

    normalizeFleetBusinessState(business, template, timestamp, playerLevel)
    const vehicleIndex = (business.vehicles || []).findIndex(
      (entry) => String(entry?.id || '').trim() === safeVehicleId,
    )
    if (vehicleIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Parçalanacak araç bulunamadı.' },
      }
      return db
    }

    const [vehicle] = business.vehicles.splice(vehicleIndex, 1)
    const scrapReturn = resolveVehicleScrapReturn(vehicle)
    applyVehicleScrapReturn(profile, scrapReturn)
    business.fleetCount = Math.max(0, business.vehicles.length)
    business.fleetRentTotal = business.vehicles.reduce(
      (sum, entry) => sum + Math.max(0, asInt(entry?.rentPerHour, 0)),
      0,
    )
    business.fleetXpTotal = business.vehicles.reduce(
      (sum, entry) => sum + Math.max(0, asInt(entry?.xp, 0)),
      0,
    )
    business.updatedAt = timestamp
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'business_vehicle_scrap',
        detail: `${vehicle?.name || 'Araç'} parçalandı ve malzeme depoya iade edildi.`,
        amount: 0,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `${vehicle?.name || 'Araç'} parçalandı. Malzeme depoya iade edildi.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${vehicle?.name || 'Araç'} parçalandı.`,
      scrapReturn: scrapReturnPayload(scrapReturn),
      businesses: businessView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }

    return db
  })

  return result
}

export async function scrapLogisticsTruck(userId, truckId) {
  const safeTruckId = String(truckId || '').trim()
  if (!safeTruckId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Parçalama için tır seçimi zorunludur.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    if (!isLogisticsUnlocked(profile)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tır Kiralama kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.' },
      }
      return db
    }

    const truckIndex = (profile.logisticsFleet || []).findIndex(
      (entry) => String(entry?.id || '').trim() === safeTruckId,
    )
    if (truckIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Parçalanacak tır bulunamadı.' },
      }
      return db
    }

    const [truck] = profile.logisticsFleet.splice(truckIndex, 1)
    const scrapReturn = resolveVehicleScrapReturn(truck)
    applyVehicleScrapReturn(profile, scrapReturn)
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'logistics_truck_scrap',
        detail: `${truck?.name || 'Tır'} parçalandı ve malzeme depoya iade edildi.`,
        amount: 0,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `${truck?.name || 'Tır'} parçalandı. Malzeme depoya iade edildi.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${truck?.name || 'Tır'} parçalandı.`,
      scrapReturn: scrapReturnPayload(scrapReturn),
      businesses: businessView(profile, timestamp),
      logisticsFleet: logisticsFleetView(profile, timestamp),
      collectPreview: logisticsCollectPreview(profile, timestamp, {
        multiplier: 1,
        fuelInventory: { oil: getInventoryQuantity(profile, 'oil') },
      }),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }

    return db
  })

  return result
}

export async function scrapVehicleListing(userId, listingId) {
  const safeListingId = String(listingId || '').trim()
  if (!safeListingId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Parçalama için ilan seçimi zorunludur.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const listingIndex = (profile.vehicleListings || []).findIndex(
      (entry) => String(entry?.id || '').trim() === safeListingId,
    )
    if (listingIndex < 0) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Parçalanacak ilan bulunamadı.' },
      }
      return db
    }

    const [listing] = profile.vehicleListings.splice(listingIndex, 1)
    const listingTemplateId = normalizeListingTemplateId(listing?.templateId)
    const isLogisticsListing = listingTemplateId === 'logistics'
    const scrapReturn = resolveVehicleScrapReturn(listing)
    applyVehicleScrapReturn(profile, scrapReturn)

    if (!isLogisticsListing) {
      const templateId = normalizeBusinessTemplateId(listingTemplateId)
      const targetBusiness = profile.businesses.find(
        (entry) =>
          entry.id === listing?.businessId &&
          normalizeBusinessTemplateId(entry?.templateId) === templateId,
      ) || profile.businesses.find((entry) => normalizeBusinessTemplateId(entry?.templateId) === templateId)
      if (targetBusiness) {
        targetBusiness.updatedAt = timestamp
      }
    }

    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'vehicle_market_scrap',
        detail: `${listing?.name || (isLogisticsListing ? 'Tır' : 'Araç')} ilanı parçalandı.`,
        amount: 0,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'market',
      `${listing?.name || (isLogisticsListing ? 'Tır' : 'Araç')} ilanı parçalandı ve depoya iade yapıldı.`,
      timestamp,
    )

    result = {
      success: true,
      message: `${listing?.name || (isLogisticsListing ? 'Tır' : 'Araç')} parçalandı.`,
      scrapReturn: scrapReturnPayload(scrapReturn),
      businesses: businessView(profile, timestamp),
      logisticsFleet: logisticsFleetView(profile, timestamp),
      vehicleListings: vehicleListingMarketView(db, userId),
      myVehicleListings: vehicleListingView(profile),
    }

    return db
  })

  return result
}

export async function collectBusiness(userId, businessId) {
  const safeBusinessId = String(businessId || '').trim()

  if (!safeBusinessId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: '\u0130\u015fletme secimi ge\u00e7ersiz.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const premiumAllowed = isPremiumActive(profile, timestamp)
    const multiplier = premiumAllowed ? PREMIUM_BULK_MULTIPLIER : 1

    const business = profile.businesses.find((item) => item.id === safeBusinessId)
    if (!business) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: '\u0130\u015fletme bulunamadı.' },
      }
      return db
    }

    const template = BUSINESS_BY_ID.get(business.templateId)
    const storedUnits = Math.max(0, asInt(business.storageAmount, 0))
    const isFleet = isFleetBusinessTemplate(template)
    const pendingIncome = isFleet ? 0 : getBusinessPendingIncome(profile, business, timestamp)
    if (isFleet && !isFleetTemplateUnlocked(profile, business.templateId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `${template?.name || 'Bu işletme'} kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.` },
      }
      return db
    }

    const fleetCount = isFleet ? fleetOperationalCount(profile, business, template) : 0
    const fleetSnapshot = isFleet
      ? fleetCollectSnapshot(profile, business, template, timestamp, { multiplier, weeklyEvents })
      : null
    const nowMs = isFleet ? fleetSnapshot.nowMs : new Date(timestamp).getTime()
    const lastIncomeMs = isFleet ? fleetSnapshot.lastIncomeMs : nowMs
    const collectReadyMs = lastIncomeMs + FLEET_COLLECT_COOLDOWN_MS
    const fuelItemId = isFleet ? fleetSnapshot.fuelItemId : ''
    const fuelItemName = isFleet ? fleetSnapshot.fuelItemName : ''
    const fuelNeedPerHour = isFleet ? fleetSnapshot.fuelNeedPerHour : 0
    const fuelNeeded = isFleet ? fleetSnapshot.fuelNeeded : 0
    const fuelConsumed = isFleet ? fleetSnapshot.fuelConsumed : 0
    const incomeAfterFuel = isFleet ? fleetSnapshot.grossAfterFuel : pendingIncome
    const taxAmount = isFleet ? fleetSnapshot.taxAmount : 0
    const incomeAfterTax = isFleet ? fleetSnapshot.netCash : incomeAfterFuel

    if (isFleet && fleetCount <= 0) {
      const unitLabel = template?.id === 'moto-rental'
        ? 'motosiklet'
        : template?.id === 'auto-rental'
          ? 'araç'
          : template?.id === 'property-rental'
            ? 'mülk'
          : 'araç'
      result = {
        success: false,
        reason: 'nothing_to_collect',
        errors: { global: `Tahsilat yapabilmek için önce en az bir ${unitLabel} edinmelisin.` },
      }
      return db
    }

    if (isFleet && nowMs < collectReadyMs) {
      const waitMinutes = Math.max(1, Math.ceil((collectReadyMs - nowMs) / MS_MINUTE))
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Tahsilat henüz hazır değil. Yaklaşık ${waitMinutes} dakika sonra tekrar deneyin.` },
      }
      return db
    }

    if (storedUnits <= 0 && incomeAfterTax <= 0) {
      result = {
        success: false,
        reason: 'nothing_to_collect',
        errors: { global: 'Toplanacak gelir veya ürün yok.' },
      }
      return db
    }

    if (!isFleet && storedUnits > 0) {
      addInventory(profile, business.storageItemId, storedUnits)
      business.storageAmount = 0
    }

    if (isFleet && fuelNeeded > 0 && fuelConsumed < fuelNeeded) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: {
          global: `${ITEM_BY_ID.get(fuelItemId)?.name || fuelItemId} yetersiz. Gerekli: ${fuelNeeded}, Depodaki: ${fleetSnapshot.fuelAvailable}.`,
        },
      }
      return db
    }

    if (isFleet && fuelConsumed > 0) {
      removeInventory(profile, fuelItemId, fuelConsumed)
    }

    if (incomeAfterTax > 0) {
      profile.wallet += incomeAfterTax
    }

    const missionProgressValue = Math.max(0, Math.round(incomeAfterTax))
    if (missionProgressValue > 0) {
      applyMissionProgress(profile.missions, { type: 'business_income', value: missionProgressValue }, timestamp)
    }

    if (isFleet) {
      business.lastIncomeCollectedAt = fleetSnapshot.collectedUntilAt
    } else {
      business.lastIncomeCollectedAt = timestamp
    }
    business.updatedAt = timestamp

    const fleetXp = isFleet
      ? fleetSnapshot.xpGain
      : 0
    const unitXp = storedUnits > 0 ? Math.floor(storedUnits * 1.6) : 0
    const xpGain = weeklyEventXpGain(Math.max(0, fleetXp + unitXp), timestamp, weeklyEvents)
    const nextFleetCollectAt = isFleet
      ? new Date(fleetSnapshot.collectedUntilMs + FLEET_COLLECT_COOLDOWN_MS).toISOString()
      : ''
    addProfileXp(profile, xpGain)
    addLeaguePoints(profile, Math.max(1, Math.floor((incomeAfterFuel + storedUnits * 8) / 120)))
    addSeasonPoints(profile, 5)

    pushTransaction(
      profile,
      {
        kind: 'business_collect',
        detail: `${template?.name || business.name} toplama işlemi tamamlandı.`,
        amount: incomeAfterTax,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `${template?.name || business.name} gelirleri toplandı.`,
      timestamp,
    )

    profile.updatedAt = timestamp

    result = {
      success: true,
      wallet: profile.wallet,
      message: 'Toplama i\u015flemi başarılı.',
      collected: {
        units: isFleet ? 0 : storedUnits,
        itemId: business.storageItemId,
        itemName: ITEM_BY_ID.get(business.storageItemId)?.name || business.storageItemId,
        cash: incomeAfterTax,
        grossCash: incomeAfterFuel,
        taxRate: isFleet ? COLLECTION_TAX_RATE : 0,
        taxAmount,
        xpGain,
        fuelItemId,
        fuelItemName,
        fuelNeedPerHour,
        fuelNeeded,
        fuelConsumed,
        nextCollectAt: nextFleetCollectAt,
        multiplier: isFleet ? multiplier : 1,
      },
      businesses: businessView(profile, timestamp),
    }

    return db
  })

  return result
}

export async function collectBusinessesBulk(userId, payload = {}) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    const weeklyEvents = weeklyEventState(timestamp)
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const requestedMultiplier = clamp(
      Math.trunc(Number(payload?.multiplier || 1)),
      1,
      PREMIUM_BULK_MULTIPLIER,
    )
    const premiumAllowed = isPremiumActive(profile, timestamp)
    const multiplier = requestedMultiplier > 1 && !premiumAllowed ? 1 : requestedMultiplier

    const nowMs = createdMs(timestamp)
    let totalCash = 0
    let totalGross = 0
    let totalTax = 0
    let totalXp = 0
    let totalFuel = 0
    let collectedCount = 0

    for (const business of profile.businesses) {
      const template = BUSINESS_BY_ID.get(business.templateId)
      if (!template || !isFleetBusinessTemplate(template)) continue
      if (!isFleetTemplateUnlocked(profile, business.templateId)) continue

      const fleetCount = fleetOperationalCount(profile, business, template)
      if (fleetCount <= 0) continue

      const collectWindow = fleetCollectWindow(business.lastIncomeCollectedAt || timestamp, timestamp)
      const collectReadyMs = collectWindow.lastIncomeMs + FLEET_COLLECT_COOLDOWN_MS
      if (nowMs < collectReadyMs) continue

      const snapshot = fleetCollectSnapshot(profile, business, template, timestamp, { multiplier, weeklyEvents })
      if (snapshot.pendingIncome <= 0) continue

      const fuelItemId = snapshot.fuelItemId
      const fuelNeeded = snapshot.fuelNeeded
      const fuelConsumed = snapshot.fuelConsumed
      if (fuelNeeded > 0 && fuelConsumed < fuelNeeded) {
        continue
      }

      const incomeAfterFuel = snapshot.grossAfterFuel
      const taxAmount = snapshot.taxAmount
      const incomeAfterTax = snapshot.netCash
      if (incomeAfterTax <= 0 && incomeAfterFuel <= 0) continue

      if (fuelConsumed > 0) {
        removeInventory(profile, fuelItemId, fuelConsumed)
      }

      const baseXp = snapshot.xpGain
      const finalCash = incomeAfterTax
      const finalXp = weeklyEventXpGain(baseXp, timestamp, weeklyEvents)

      profile.wallet += finalCash
      addProfileXp(profile, finalXp)
      addLeaguePoints(profile, Math.max(1, Math.floor(incomeAfterFuel / 120)))
      addSeasonPoints(profile, 5)

      business.lastIncomeCollectedAt = snapshot.collectedUntilAt
      business.updatedAt = timestamp

      totalCash += finalCash
      totalGross += incomeAfterFuel
      totalTax += taxAmount
      totalXp += finalXp
      totalFuel += fuelConsumed
      collectedCount += 1
    }

    if (isLogisticsUnlocked(profile)) {
      const logisticsSnapshot = logisticsCollectSnapshot(profile, timestamp, { multiplier, weeklyEvents })
      if (
        logisticsSnapshot.truckCount > 0 &&
        logisticsSnapshot.elapsedCycles > 0 &&
        logisticsSnapshot.pendingIncome > 0 &&
        (logisticsSnapshot.fuelNeeded <= 0 || logisticsSnapshot.fuelConsumed >= logisticsSnapshot.fuelNeeded)
      ) {
        if (logisticsSnapshot.fuelConsumed > 0) {
          removeInventory(profile, logisticsSnapshot.fuelItemId, logisticsSnapshot.fuelConsumed)
        }

        profile.wallet += logisticsSnapshot.netCash
        addProfileXp(profile, logisticsSnapshot.xpGain)
        profile.lastLogisticsIncomeCollectedAt = logisticsSnapshot.collectedUntilAt
        addLeaguePoints(profile, Math.max(1, Math.floor(logisticsSnapshot.grossCash / 120)))
        addSeasonPoints(profile, 5)

        totalCash += logisticsSnapshot.netCash
        totalGross += logisticsSnapshot.grossCash
        totalTax += logisticsSnapshot.taxAmount
        totalXp += logisticsSnapshot.xpGain
        totalFuel += logisticsSnapshot.fuelConsumed
        collectedCount += 1
      }
    }

    if (collectedCount <= 0) {
      result = {
        success: false,
        reason: 'nothing_to_collect',
        errors: { global: 'Toplu tahsilat için hazır gelir bulunamadı.' },
      }
      return db
    }

    // Görev ilerlemesi: toplu tahsilatın net nakit kazancı
    if (totalCash > 0) {
      applyMissionProgress(profile.missions, { type: 'business_income', value: totalCash }, timestamp)
    }

    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'business_collect_bulk',
        detail: 'Toplu tahsilat işlemi tamamlandı.',
        amount: totalCash,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `Toplu tahsilat tamamlandı. +${totalCash} nakit`,
      timestamp,
    )

    const logisticsState = isLogisticsUnlocked(profile)
      ? {
          unlocked: true,
          collectPreview: logisticsCollectPreview(profile, timestamp, {
            multiplier: 1,
            weeklyEvents,
            fuelInventory: { oil: getInventoryQuantity(profile, 'oil') },
          }),
          collectPreview2x: logisticsCollectPreview(profile, timestamp, {
            multiplier: PREMIUM_BULK_MULTIPLIER,
            weeklyEvents,
            fuelInventory: { oil: getInventoryQuantity(profile, 'oil') },
          }),
          logisticsFleet: logisticsFleetView(profile, timestamp),
        }
      : {
          unlocked: false,
          collectPreview: null,
          collectPreview2x: null,
          logisticsFleet: logisticsFleetView(profile, timestamp),
        }

    result = {
      success: true,
      wallet: profile.wallet,
      collected: {
        cash: totalCash,
        grossCash: totalGross,
        taxAmount: totalTax,
        xpGain: totalXp,
        fuelConsumed: totalFuel,
        multiplier,
        collectedCount,
      },
      businesses: businessView(profile, timestamp),
      logistics: logisticsState,
    }

    return db
  })

  return result
}

export async function getDailyLoginReward(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const view = dailyLoginView(profile, timestamp)
    result = {
      success: true,
      wallet: profile.wallet,
      ...view,
    }
    return db
  })

  return result
}

export async function claimDailyLoginReward(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const sync = dailyLoginSync(profile, timestamp)
    if (!sync.canClaim) {
      result = {
        success: false,
        reason: 'already_claimed',
        errors: { global: 'Bugünkü günlük ödül zaten alındı. Yeni ödül Türkiye saatine göre 00:00\'da açılır.' },
      }
      return db
    }

    const claimDay = clamp(sync.nextDayIndex + 1, 1, DAILY_LOGIN_TOTAL_DAYS)
    const reward = dailyLoginRewardByDay(profile, claimDay)
    const cashReward = Math.max(0, asInt(reward.cash, 0))
    const itemRows = []

    if (cashReward > 0) {
      profile.wallet += cashReward
    }

    for (const [itemIdRaw, quantityRaw] of Object.entries(reward.items || {})) {
      const itemId = String(itemIdRaw || '').trim()
      const quantity = Math.max(0, asInt(quantityRaw, 0))
      if (!itemId || quantity <= 0) continue
      addInventory(profile, itemId, quantity)
      itemRows.push({
        itemId,
        quantity,
        itemName: ITEM_BY_ID.get(itemId)?.name || itemId,
      })
    }

    normalizeDailyLoginState(profile)
    profile.dailyLogin.streakCount = claimDay
    profile.dailyLogin.lastClaimDayIndex = claimDay - 1
    profile.dailyLogin.lastClaimDayStartMs = sync.todayDayStartMs
    profile.dailyLogin.lastClaimDayKey = sync.todayKey
    profile.dailyLogin.lastClaimAt = timestamp
    profile.updatedAt = timestamp

    const rewardTextRows = []
    if (cashReward > 0) {
      const formattedCash = new Intl.NumberFormat('tr-TR').format(cashReward)
      rewardTextRows.push(`+${formattedCash} nakit`)
    }
    if (itemRows.length) {
      const itemText = itemRows
        .map((entry) => `${entry.itemName} x${entry.quantity}`)
        .join(', ')
      rewardTextRows.push(itemText)
    }
    const message = rewardTextRows.length
      ? `${claimDay}. gün ödülü alındı: ${rewardTextRows.join(' | ')}.`
      : `${claimDay}. gün ödülü hesabına eklendi.`

    pushTransaction(
      profile,
      {
        kind: 'daily_login_reward',
        detail: message,
        amount: cashReward,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'system',
      message,
      timestamp,
    )

    const marketItems = db.marketState.items.map((item) => marketItemView(profile, item))
    const view = dailyLoginView(profile, timestamp)
    result = {
      success: true,
      message,
      wallet: profile.wallet,
      reward: {
        day: claimDay,
        cash: cashReward,
        items: reward.items,
      },
      inventory: inventoryView(profile, marketItems),
      ...view,
    }
    return db
  })

  return result
}

function dailyStoreView(db, profile, timestamp) {
  const todayKey = limitedOfferDayKeyFromIso(timestamp)
  if (!profile.dailyStore || typeof profile.dailyStore !== 'object') {
    profile.dailyStore = {
      dayKey: todayKey,
      purchased: [],
    }
  }
  const store = profile.dailyStore
  if (!Array.isArray(store.purchased)) {
    store.purchased = []
  }
  if (store.dayKey !== todayKey) {
    store.dayKey = todayKey
    store.purchased = []
  }
  const purchasedSet = new Set(store.purchased)

  const resetInfo = limitedOfferResetInfoFromIso(timestamp)
  const offerMultiplier = limitedOfferMultiplier(timestamp)
  const offerSnapshots = DAILY_STORE_OFFERS
    .map((offer) => dailyStoreOfferSnapshot(db, offer, timestamp))
    .filter(Boolean)

  const offers = offerSnapshots.map((offer) => ({
    id: offer.id,
    title: offer.title,
    description: offer.description,
    price: offer.price,
    purchased: purchasedSet.has(offer.id),
  }))

  return {
    dayKey: store.dayKey,
    nextResetAt: resetInfo.nextResetAt,
    remainingMs: resetInfo.remainingMs,
    weekMultiplier: offerMultiplier,
    offers,
  }
}

export async function getDailyStore(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const view = dailyStoreView(db, profile, timestamp)
    result = {
      success: true,
      reputation: profile.reputation,
      wallet: profile.wallet,
      ...view,
    }
    return db
  })

  return result
}

export async function purchaseDailyOffer(userId, payload = {}) {
  const offerId = String(payload?.offerId || '').trim()
  const offerTemplate = DAILY_STORE_OFFERS.find((entry) => entry.id === offerId)
  if (!offerTemplate) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Haftalık fırsat seçimi geçersiz.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const todayKey = limitedOfferDayKeyFromIso(timestamp)
    if (!profile.dailyStore || typeof profile.dailyStore !== 'object') {
      profile.dailyStore = {
        dayKey: todayKey,
        purchased: [],
      }
    }
    if (!Array.isArray(profile.dailyStore.purchased)) {
      profile.dailyStore.purchased = []
    }
    if (profile.dailyStore.dayKey !== todayKey) {
      profile.dailyStore.dayKey = todayKey
      profile.dailyStore.purchased = []
    }

    const offer = dailyStoreOfferSnapshot(db, offerTemplate, timestamp)
    if (!offer) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Haftalık fırsat oluşturulamadı.' },
      }
      return db
    }

    if (profile.dailyStore.purchased.includes(offer.id)) {
      result = {
        success: false,
        reason: 'already_claimed',
        errors: { global: 'Bu fırsat bu haftalık periyotta zaten kullanıldı.' },
      }
      return db
    }

    const price = Math.max(0, asInt(offer.price, 0))
    if (profile.reputation < price) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Yeterli elmas bulunamadı.' },
      }
      return db
    }

    profile.reputation -= price
    let rewardMessage = `${offer.title} fırsatı alındı.`
    if (offer.rewards.cash > 0) {
      profile.wallet += offer.rewards.cash
      const formattedCash = new Intl.NumberFormat('tr-TR').format(offer.rewards.cash)
      rewardMessage = `Haftalık Para Paketi: +${formattedCash} nakit kazandın.`
    }
    if (offer.id === 'daily-materials-pack') {
      const itemEntries = Object.entries(offer.rewards.items || {})
      for (const [itemIdRaw, qty] of itemEntries) {
        const itemId = normalizeItemId(itemIdRaw)
        const quantity = Math.max(0, asInt(qty, 0))
        if (!itemId || quantity <= 0 || !ITEM_BY_ID.has(itemId)) continue
        addInventory(profile, itemId, quantity)
      }
      const firstQuantity = Math.max(0, asInt(itemEntries[0]?.[1], 0))
      rewardMessage = `Haftalık Kaynak Paketi: Pazardaki tüm kaynaklar depoya eklendi (her biri +${firstQuantity}).`
    } else if (offer.rewards.items && typeof offer.rewards.items === 'object') {
      for (const [itemIdRaw, qty] of Object.entries(offer.rewards.items)) {
        const itemId = String(itemIdRaw || '').trim()
        const quantity = Math.max(0, asInt(qty, 0))
        if (!itemId || quantity <= 0) continue
        addInventory(profile, itemId, quantity)
      }
    }

    profile.dailyStore.purchased.push(offer.id)
    profile.updatedAt = timestamp

    pushTransaction(
      profile,
      {
        kind: 'daily_offer',
        detail: rewardMessage,
        amount: offer.rewards.cash,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'system',
      rewardMessage,
      timestamp,
    )

    const view = dailyStoreView(db, profile, timestamp)
    const marketItems = db.marketState.items.map((item) => marketItemView(profile, item))
    result = {
      success: true,
      message: rewardMessage,
      reputation: profile.reputation,
      wallet: profile.wallet,
      inventory: inventoryView(profile, marketItems),
      ...view,
    }

    return db
  })

  return result
}

export async function consumeDiamondWelcomePack(userId, payload = {}) {
  const packId = String(payload?.packId || '').trim() || DIAMOND_WELCOME_PACK_ID
  if (packId !== DIAMOND_WELCOME_PACK_ID) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Hoş geldin paketi seçimi geçersiz.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    normalizeDiamondStore(profile)
    if (profile.diamondStore.welcomePackPurchased) {
      result = {
        success: false,
        reason: 'already_claimed',
        errors: { global: 'Hoş geldin paketi bu hesapta zaten kullanıldı.' },
        diamondStore: diamondStoreView(profile),
      }
      return db
    }

    profile.diamondStore.welcomePackPurchased = true
    profile.diamondStore.welcomePackPurchasedAt = timestamp
    profile.updatedAt = timestamp

    pushNotification(
      profile,
      'system',
      'Hoş geldin paketi hakkı bu hesapta bir kez kullanılmak üzere işaretlendi.',
      timestamp,
    )

    result = {
      success: true,
      message: 'Hoş geldin paketi bu hesapta tek seferlik olarak işaretlendi.',
      diamondStore: diamondStoreView(profile),
    }
    return db
  })

  return result
}

export async function purchasePremium(userId, payload = {}) {
  const planId = String(payload?.planId || '').trim()
  const plan = PREMIUM_PLAN_BY_ID.get(planId)
  if (!plan) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Premium paketi seçimi geçersiz.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const price = Math.max(0, asInt(plan.price, 0))
    if (profile.reputation < price) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Yeterli elmas bulunamadı.' },
      }
      return db
    }

    profile.reputation -= price

    const nowMs = createdMs(timestamp)
    const currentUntilMs = createdMs(profile.premiumUntil || '')
    const baseMs = Math.max(nowMs, currentUntilMs)
    const newUntilMs = baseMs + plan.days * 24 * 60 * 60 * 1000
    profile.premiumUntil = new Date(newUntilMs).toISOString()
    profile.updatedAt = timestamp

    pushNotification(
      profile,
      'system',
      `Premium üyelik ${plan.label} olarak güncellendi.`,
      timestamp,
    )

    result = {
      success: true,
      reputation: profile.reputation,
      premium: premiumStatus(profile, timestamp),
    }

    return db
  })

  return result
}

export async function getMissions(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const levelInfo = levelInfoFromXp(profile.xpTotal)
    const missions = missionView(profile)
    const missionBatch = missionBatchView(profile, timestamp)

    result = {
      success: true,
      wallet: profile.wallet,
      reputation: profile.reputation,
      levelInfo,
      seasonPoints: Math.max(0, asInt(profile?.league?.seasonPoints, 0)),
      missions,
      missionBatch,
      canClaimCount: missions.filter((item) => item.status === 'claimable').length,
    }

    return db
  })

  return result
}

export async function claimMission(userId, missionId) {
  const safeMissionId = String(missionId || '').trim()
  const missionSeasonPoints = 10
  if (!safeMissionId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'G\u00f6rev secimi ge\u00e7ersiz.' },
    }
  }

  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const claimResult = claimMissionReward(profile.missions, safeMissionId, timestamp)
    if (!claimResult.success) {
      result = claimResult
      return db
    }

    const rewardItems = claimResult.reward?.rewardItems || {}
    for (const [itemId, qty] of Object.entries(rewardItems)) {
      const safeItemId = String(itemId || '').trim()
      const safeQty = Math.max(0, asInt(qty, 0))
      if (!safeItemId || safeQty <= 0) continue
      addInventory(profile, safeItemId, safeQty)
    }

    profile.wallet += claimResult.reward.cash
    addProfileXp(profile, claimResult.reward.xp)
    addSeasonPoints(profile, missionSeasonPoints)

    pushTransaction(
      profile,
      {
        kind: 'mission_claim',
        detail: `${claimResult.reward.title} \u00f6dülü alındı.`,
        amount: claimResult.reward.cash,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'mission',
      `${claimResult.reward.title} görev ödülü toplandı. +${missionSeasonPoints} sezon puanı kazanıldı.`,
      timestamp,
    )

    profile.updatedAt = timestamp

    result = {
      success: true,
      wallet: profile.wallet,
      reward: claimResult.reward,
      levelInfo: levelInfoFromXp(profile.xpTotal),
      missions: missionView(profile),
      missionBatch: missionBatchView(profile, timestamp),
      canClaimCount: profile.missions.filter((item) => item.status === 'claimable').length,
      seasonPointsGained: missionSeasonPoints,
      seasonPoints: Math.max(0, asInt(profile?.league?.seasonPoints, 0)),
      message: `${claimResult.reward.title} görev ödülü alındı. +${missionSeasonPoints} sezon puanı kazandın.`,
    }

    return db
  })

  return result
}

export async function getProfileDetails(userId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const user = db.users.find((item) => item.id === userId)
    if (!user) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const profile = ensureProfile(db, userId, timestamp)
    runGameTick(db, profile, timestamp)

    const marketItems = db.marketState.items.map((item) => marketItemView(profile, item))

    result = {
      success: true,
      profile: {
        userId: profile.userId,
        username: user.username,
        role: userRoleValue(user),
        roleLabel: userRoleLabel(userRoleValue(user)),
        avatar: avatarView(profile),
        wallet: profile.wallet,
        bank: profile.bank,
        reputation: profile.reputation,
        energy: profile.energy,
        levelInfo: levelInfoFromXp(profile.xpTotal),
        companyLevel: profile.companyLevel,
        seasonBadge: seasonBadgeView(profile?.league?.seasonBadge),
        seasonPrizes: leagueSeasonPrizesView(profile),
        lastSeenAt: profile.lastSeenAt,
        inventory: inventoryView(profile, marketItems),
        transactions: profile.transactions.slice(0, MAX_TRANSACTION_HISTORY),
        notifications: profile.notifications.slice(0, MAX_NOTIFICATION_HISTORY),
        contracts: contractView(profile),
        businesses: businessView(profile, timestamp),
        factories: factoriesView(profile, timestamp),
        logisticsFleet: logisticsFleetView(profile, timestamp),
        soldItems: (profile.soldItems || []).slice(-30).reverse(),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    }

    return db
  })

  return result
}

export async function getFriendsState(userId) {
  let result = { success: true, friends: [] }

  try {
    const db = await readDb()
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const viewerUserId = String(userId || '').trim()
    const viewerProfile = ensureProfile(db, viewerUserId, timestamp)
    if (!viewerProfile) {
      return {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
    }

    runGameTick(db, viewerProfile, timestamp)
    ensureSocialState(viewerProfile)

    const friendIds = Array.isArray(viewerProfile?.social?.friends) ? viewerProfile.social.friends : []
    const friends = []

    for (const friendId of friendIds) {
      try {
        const safeFriendId = String(friendId || '').trim()
        if (!safeFriendId) continue

        // Friend'in profile state'ini oluşturup türetmek için ensureProfile kullanıyoruz;
        // ancak son aktiflik güncellememek için markActive: false veriyoruz.
        const friendProfile = ensureProfile(db, safeFriendId, timestamp, { markActive: false })
        if (!friendProfile) continue

        const levelInfo = levelInfoFromXp(friendProfile.xpTotal)
        const user = db.users.find((u) => u.id === safeFriendId)

        friends.push({
          userId: safeFriendId,
          username: user?.username || friendProfile.username,
          avatar: avatarView(friendProfile),
          level: Math.max(1, asInt(levelInfo?.level, 1)),
        })
      } catch {
        // Tek bir bozuk arkadaş kaydı tüm endpoint'i bozmasın.
      }
    }

    friends.sort((a, b) => (b.level || 1) - (a.level || 1))

    result = {
      success: true,
      friends,
    }
  } catch (error) {
    result = {
      success: false,
      reason: 'server_error',
      errors: { global: String(error?.message || 'Arkadaş listesi alınamadı.') },
    }
  }

  return result
}

  /** Başka oyuncunun herkese açık profil bilgisi (işlem, bildirim yok; temel cüzdan ve premium durumu görünür) */
export async function getPublicProfile(viewerUserId, targetUserId) {
  const safeTarget = String(targetUserId || '').trim()
  if (!safeTarget) {
    return { success: false, reason: 'validation', errors: { global: 'Oyuncu seçilmedi.' } }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const user = db.users.find((item) => item.id === safeTarget)
    if (!user) {
      result = { success: false, reason: 'not_found', errors: { global: 'Oyuncu bulunamadı.' } }
      return db
    }

    const viewerProfile = ensureProfile(db, viewerUserId, timestamp)
    if (!viewerProfile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const profile = ensureProfile(db, safeTarget, timestamp, { markActive: false })
    runGameTick(db, viewerProfile, timestamp)
    ensureSocialState(viewerProfile)
    ensureSocialState(profile)
    const presence = profilePresenceView(profile, timestamp)
    const relationship = socialRelationshipView(db, viewerProfile, profile, timestamp)

    const businesses = businessView(profile, timestamp)
    const factories = factoriesView(profile, timestamp)
    const logistics = logisticsFleetView(profile, timestamp)
    // Custom/özel ilanlar herkese açık profil ekranında kesinlikle görünmesin.
    // Özel ilan görünümü sadece "Özel İlanlar" menüsündeki alıcı filtresi ile sağlanır.
    const vehicleListings = vehicleListingView(profile)
      .filter((listing) => String(listing?.visibility || 'public').trim().toLowerCase() !== 'custom')
      .map((listing) => ({
        ...listing,
        marketPrice: Math.max(1, asInt(listing?.price, 1)),
        marketIncome: Math.max(1, asInt(listing?.rentPerHour, 1)),
        marketLevel: Math.max(1, asInt(listing?.requiredLevel, 1)),
      }))

    result = {
      success: true,
      profile: {
        userId: profile.userId,
        username: user.username,
        role: userRoleValue(user),
        roleLabel: userRoleLabel(userRoleValue(user)),
        displayName: (profile.displayName && String(profile.displayName).trim()) || undefined,
        avatar: avatarView(profile),
        wallet: profile.wallet,
        levelInfo: levelInfoFromXp(profile.xpTotal),
        companyLevel: profile.companyLevel,
        seasonBadge: seasonBadgeView(profile?.league?.seasonBadge),
        reputation: profile.reputation,
        lastSeenAt: profile.lastSeenAt,
        isOnline: presence.isOnline,
        lastActiveAt: presence.lastActiveAt,
        relationship,
        businesses: businesses.map((b) => ({
          id: b.id,
          name: b.name,
          templateId: b.templateId,
          heroImage: b.heroImage || '',
          fleetCount: b.fleetCount ?? 0,
          fleetCapacity: b.fleetCapacity ?? 0,
          unlocked: b.unlocked !== false,
          vehicles: Array.isArray(b.vehicles)
            ? b.vehicles.map((v) => ({ id: v.id, name: v.name, image: v.image || '' }))
            : [],
        })),
        logisticsFleet: {
          truckCount: logistics?.summary?.truckCount ?? 0,
          totalCapacity: logistics?.summary?.totalCapacity ?? 0,
          trucks: (logistics?.owned || []).map((t) => ({
            id: t.id,
            name: t.name || 'Tır',
            image: t.image || '',
          })),
        },
        vehicleListings,
        factories: factories.map((f) => ({ id: f.id, name: f.name, owned: f.owned, level: f.level })),
        soldItems: (profile.soldItems || []).slice(-30).reverse(),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        premium: premiumStatus(profile, timestamp),
      },
    }
    return db
  })
  return result
}

export async function updateProfileAvatarUrl(userId, payload) {
  const requestedUrl = String(payload?.avatarUrl || '').trim()
  const safeUrl = normalizeAvatarUrl(requestedUrl)

  if (requestedUrl && !safeUrl) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Avatar URL ge\u00e7ersiz. Sadece http/https veya / ile baslayan yol kullan.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const currentAvatarUrl = String(profile.avatarUrl || '').trim()
    const currentAvatarType = String(profile.avatarType || 'default').trim()
    const currentDiamonds = Math.max(0, asInt(profile.reputation, 0))
    const isResetRequest = !safeUrl
    const alreadyCurrent = !isResetRequest &&
      currentAvatarType === 'url' &&
      currentAvatarUrl === safeUrl

    if (!isResetRequest && !alreadyCurrent && currentDiamonds < AVATAR_CHANGE_DIAMOND_COST) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: {
          global: `Avatar değiştirmek için ${AVATAR_CHANGE_DIAMOND_COST} elmas gerekli. Mevcut elmas: ${currentDiamonds}.`,
        },
      }
      return db
    }

    const previousUploadUrl =
      profile.avatarType === 'upload' && isUploadedAvatarUrl(profile.avatarUrl)
        ? profile.avatarUrl
        : ''

    let charged = 0
    if (!isResetRequest && !alreadyCurrent) {
      profile.reputation = Math.max(0, currentDiamonds - AVATAR_CHANGE_DIAMOND_COST)
      charged = AVATAR_CHANGE_DIAMOND_COST
    }
    profile.avatarUrl = safeUrl
    profile.avatarType = safeUrl ? 'url' : 'default'
    profile.updatedAt = timestamp

    result = {
      success: true,
      message: safeUrl
        ? (charged > 0
          ? `Profil resmi güncellendi. ${charged} elmas düşüldü.`
          : 'Profil resmi zaten güncel.')
        : 'Profil resmi varsayılan görsele döndürüldü.',
      avatar: avatarView(profile),
      diamonds: Math.max(0, asInt(profile.reputation, 0)),
      previousUploadUrl,
    }
    return db
  })

  return result
}

export async function updateProfileAvatarUpload(userId, payload) {
  const avatarUrl = String(payload?.avatarUrl || '').trim()
  if (!isUploadedAvatarUrl(avatarUrl)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Y\u00fcklenen avatar yolu ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const currentAvatarUrl = String(profile.avatarUrl || '').trim()
    const currentAvatarType = String(profile.avatarType || 'default').trim()
    const currentDiamonds = Math.max(0, asInt(profile.reputation, 0))
    const alreadyCurrent =
      currentAvatarType === 'upload' &&
      currentAvatarUrl === avatarUrl

    if (!alreadyCurrent && currentDiamonds < AVATAR_CHANGE_DIAMOND_COST) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: {
          global: `Avatar değiştirmek için ${AVATAR_CHANGE_DIAMOND_COST} elmas gerekli. Mevcut elmas: ${currentDiamonds}.`,
        },
      }
      return db
    }

    const previousUploadUrl =
      profile.avatarType === 'upload' && isUploadedAvatarUrl(profile.avatarUrl)
        ? profile.avatarUrl
        : ''

    let charged = 0
    if (!alreadyCurrent) {
      profile.reputation = Math.max(0, currentDiamonds - AVATAR_CHANGE_DIAMOND_COST)
      charged = AVATAR_CHANGE_DIAMOND_COST
    }
    profile.avatarUrl = avatarUrl
    profile.avatarType = 'upload'
    profile.updatedAt = timestamp

    result = {
      success: true,
      message: charged > 0
        ? `Profil resmi yüklendi. ${charged} elmas düşüldü.`
        : 'Profil resmi zaten güncel.',
      avatar: avatarView(profile),
      diamonds: Math.max(0, asInt(profile.reputation, 0)),
      previousUploadUrl,
    }
    return db
  })

  return result
}

const DISPLAY_NAME_MIN_LENGTH = 3
const DISPLAY_NAME_MAX_LENGTH = 15
const DISPLAY_NAME_PATTERN = /^[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü ]{2,14}$/

function normalizeDisplayName(value) {
  const collapsed = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DISPLAY_NAME_MAX_LENGTH)
  if (!collapsed) return ''
  return `${collapsed[0].toLocaleUpperCase('tr-TR')}${collapsed.slice(1)}`
}

function validateDisplayName(displayName) {
  const safeDisplayName = String(displayName ?? '')
  if (!safeDisplayName) return ''
  if (safeDisplayName.length < DISPLAY_NAME_MIN_LENGTH) {
    return 'Görünen ad en az 3 karakter olmalıdır.'
  }
  if (!DISPLAY_NAME_PATTERN.test(safeDisplayName)) {
    return 'Görünen ad büyük harfle başlamalı, 3-15 karakter olmalı ve yalnızca harf ile boşluk içermelidir.'
  }
  return ''
}

export async function updateProfileDisplayName(userId, payload) {
  const displayName = normalizeDisplayName(payload?.displayName)
  const displayNameValidation = validateDisplayName(displayName)
  if (displayNameValidation) {
    return {
      success: false,
      reason: 'validation',
      errors: { displayName: displayNameValidation },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    profile.displayName = displayName
    profile.updatedAt = timestamp

    result = {
      success: true,
      message: displayName ? 'Görünen ad güncellendi.' : 'Görünen ad kaldırıldı.',
      username: (displayName && String(displayName).trim()) || undefined,
    }
    return db
  })

  return result
}

export async function getOrderBook(userId, itemId) {
  let result

  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const safeItemId = String(itemId || '').trim() || db.marketState.items[0]?.id
    const marketItem = db.marketState.items.find((entry) => entry.id === safeItemId)

    if (!marketItem) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Emir defteri ürünü bulunamadı.' },
      }
      return db
    }

    result = {
      success: true,
      orderBook: buildOrderBook(db, marketItem),
      openOrders: limitOrderView(profile).filter((order) => order.status === 'open'),
      marketItem: marketItemView(profile, marketItem),
      updatedAt: timestamp,
    }
    return db
  })

  return result
}

export async function placeLimitOrder(userId, payload) {
  const itemId = String(payload?.itemId || '').trim()
  const side = String(payload?.side || '').trim()
  const quantity = asInt(payload?.quantity, 0)
  const limitPrice = asInt(payload?.limitPrice, 0)
  const expiresMinutes = clamp(asInt(payload?.expiresMinutes, 30), 5, ORDER_MAX_DURATION_MINUTES)

  if (!itemId || !['buy', 'sell'].includes(side) || quantity <= 0 || limitPrice <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Order bilgileri ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const logisticsFleet = logisticsFleetView(profile, timestamp)
    if (logisticsFleet.summary.totalCapacity <= 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Pazar alım satımı yapabilmek için en az bir tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.' },
      }
      return db
    }

    const marketItem = db.marketState.items.find((entry) => entry.id === itemId)
    if (!marketItem || !ITEM_BY_ID.get(itemId)) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Ürün bulunamadı.' },
      }
      return db
    }

    if (side === 'buy') {
      const worstCaseCost = quantity * limitPrice
      const exposure = openBuyExposure(profile)
      if (profile.wallet < exposure + worstCaseCost) {
        result = {
          success: false,
          reason: 'insufficient_funds',
          errors: { global: 'Alış limit emri için ayrılan bakiye yetersiz.' },
        }
        return db
      }
    }

    if (side === 'sell') {
      const todayKey = dailyStoreDayKeyFromIso(timestamp)
      if (profile.sellListingsDayKey !== todayKey) {
        profile.sellListingsDayKey = todayKey
        profile.sellListingsCountToday = 0
      }
      const used = Math.max(0, asInt(profile.sellListingsCountToday, 0))
      if (used >= SELL_LISTINGS_DAILY_LIMIT) {
        result = {
          success: false,
          reason: 'limit_reached',
          errors: {
            global: `Satış ilanı limitine ulaştınız (${SELL_LISTINGS_DAILY_LIMIT} ilan). Limit Türkiye saatine göre her 12 saatte bir (00:00 / 12:00) yenilenir.`,
          },
        }
        return db
      }
      if (!removeInventory(profile, itemId, quantity)) {
        result = {
          success: false,
          reason: 'insufficient_inventory',
          errors: { global: 'Satış limit emri için envanter yetersiz.' },
        }
        return db
      }
      profile.sellListingsCountToday = used + 1
    }

    const nowMs = new Date(timestamp).getTime()
    profile.limitOrders.unshift({
      id: crypto.randomUUID(),
      itemId,
      side,
      quantity,
      filledQuantity: 0,
      limitPrice,
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(nowMs + expiresMinutes * MS_MINUTE).toISOString(),
      lastFillAt: null,
    })
    profile.limitOrders = profile.limitOrders.slice(0, 120)
  pushNotification(
    profile,
    'market',
    `${ITEM_BY_ID.get(itemId)?.name || itemId} için ${side === 'buy' ? 'alış' : 'satış'} limit emri açıldı.`,
    timestamp,
  )
    profile.updatedAt = timestamp

    result = {
      success: true,
      message: 'Limit emri oluşturuldu.',
      openOrders: limitOrderView(profile),
      orderBook: buildOrderBook(db, marketItem),
    }
    return db
  })

  return result
}

export async function cancelLimitOrder(userId, orderId) {
  const safeOrderId = String(orderId || '').trim()
  if (!safeOrderId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Emir secimi ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const order = profile.limitOrders.find((entry) => entry.id === safeOrderId)
    if (!order) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Emir bulunamadı.' },
      }
      return db
    }

    if (order.status !== 'open') {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Sadece a\u00e7\u0131k emir iptal edilebilir.' },
      }
      return db
    }

    order.status = 'cancelled'
    order.updatedAt = timestamp
    if (order.side === 'sell') {
      releaseSellOrderReserve(profile, order)
    }

    const isSell = order.side === 'sell'
    result = {
      success: true,
      message: isSell
        ? 'İlan kaldırıldı. Ürün depoya iade edildi.'
        : 'Limit emir iptal edildi.',
      openOrders: limitOrderView(profile),
    }
    return db
  })

  return result
}

export async function getLogistics(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const weeklyEvents = weeklyEventState(timestamp)
    const logisticsPreview = logisticsCollectPreview(profile, timestamp, {
      multiplier: 1,
      fuelInventory: { oil: getInventoryQuantity(profile, 'oil') },
      weeklyEvents,
    })
    const logisticsPreview2x = logisticsCollectPreview(profile, timestamp, {
      multiplier: PREMIUM_BULK_MULTIPLIER,
      fuelInventory: { oil: getInventoryQuantity(profile, 'oil') },
      weeklyEvents,
    })
    result = {
      success: true,
      wallet: profile.wallet,
      unlocked: isLogisticsUnlocked(profile),
      unlockCost: COMPANY_UNLOCK_FLOW.find((entry) => entry.kind === 'logistics')?.cost || 0,
      weeklyEvents,
      routes: [],
      shipments: [],
      collectPreview: logisticsPreview,
      collectPreview2x: logisticsPreview2x,
      logisticsFleet: logisticsFleetView(profile, timestamp),
    }
    return db
  })
  return result
}

export async function collectLogisticsIncome(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const weeklyEvents = weeklyEventState(timestamp)
    const premiumAllowed = isPremiumActive(profile, timestamp)
    const multiplier = premiumAllowed ? PREMIUM_BULK_MULTIPLIER : 1
    if (!isLogisticsUnlocked(profile)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tır Kiralama kilitli. İşletmeni geliştirerek önce bu işletmeyi açmalısın.' },
      }
      return db
    }

    const snapshot = logisticsCollectSnapshot(profile, timestamp, { multiplier, weeklyEvents })
    if (snapshot.truckCount <= 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tahsilat için önce tır kiralama filosuna araç eklemelisin.' },
      }
      return db
    }

    if (snapshot.elapsedCycles <= 0 || snapshot.pendingIncome <= 0) {
      result = {
        success: false,
        reason: 'nothing_to_collect',
        errors: { global: 'Tır kiralama için hazır tahsilat bulunamadı.' },
      }
      return db
    }

    if (snapshot.fuelNeeded > 0 && snapshot.fuelConsumed < snapshot.fuelNeeded) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: {
          global: `${snapshot.fuelItemName} yetersiz. Gerekli: ${snapshot.fuelNeeded}, Depodaki: ${snapshot.fuelAvailable}.`,
        },
      }
      return db
    }

    if (snapshot.fuelConsumed > 0) {
      removeInventory(profile, snapshot.fuelItemId, snapshot.fuelConsumed)
    }

    profile.wallet += snapshot.netCash
    addProfileXp(profile, snapshot.xpGain)
    profile.lastLogisticsIncomeCollectedAt = snapshot.collectedUntilAt
    profile.updatedAt = timestamp
    addLeaguePoints(profile, Math.max(1, Math.floor(snapshot.grossCash / 120)))
    addSeasonPoints(profile, 5)
    applyMissionProgress(profile.missions, { type: 'logistics_income', value: snapshot.netCash }, timestamp)

    pushTransaction(
      profile,
      {
        kind: 'logistics_collect',
        detail: 'Tır kiralama tahsilatı toplandı.',
        amount: snapshot.netCash,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'business',
      `Tır kiralama tahsilatı tamamlandı. +${snapshot.netCash} nakit`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Tır kiralama tahsilatı tamamlandı.',
      wallet: profile.wallet,
      grossCash: snapshot.grossCash,
      taxAmount: snapshot.taxAmount,
      netCash: snapshot.netCash,
      xpGain: snapshot.xpGain,
      fuelItemId: snapshot.fuelItemId,
      fuelItemName: snapshot.fuelItemName,
      fuelNeeded: snapshot.fuelNeeded,
      fuelConsumed: snapshot.fuelConsumed,
      multiplier: snapshot.multiplier,
      logisticsFleet: logisticsFleetView(profile, timestamp),
      collectPreview: logisticsCollectPreview(profile, timestamp, {
        multiplier: 1,
        fuelInventory: { oil: getInventoryQuantity(profile, 'oil') },
        weeklyEvents,
      }),
    }
    return db
  })
  return result
}

export async function createShipment(userId, payload) {
  void userId
  void payload
  return {
    success: false,
    reason: 'validation',
    errors: { global: 'Sevkiyat sistemi kaldırıldı. Tır geliri saatlik kira tahsilatı ile toplanır.' },
  }
}

export async function claimShipment(userId, shipmentId) {
  void userId
  void shipmentId
  return {
    success: false,
    reason: 'validation',
    errors: { global: 'Sevkiyat sistemi kaldırıldı. Tır geliri saatlik kira tahsilatı ile toplanır.' },
  }
}

export async function createShipmentLegacy(userId, payload) {
  const itemId = String(payload?.itemId || '').trim()
  const routeId = String(payload?.routeId || '').trim()
  const quantity = asInt(payload?.quantity, 0)
  const insured = payload?.insured === true

  if (!itemId || !routeId || quantity <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Sevkiyat bilgileri ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    if (!isLogisticsUnlocked(profile)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tır Kiralama kilitli. İşletmeni geliştirerek önce bu işletmeyi açmalısın.' },
      }
      return db
    }

    const route = LOGISTICS_BY_ID.get(routeId)
    const itemDef = ITEM_BY_ID.get(itemId)
    if (!route || !itemDef) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Rota veya ürün bulunamadı.' },
      }
      return db
    }

    const logisticsFleet = logisticsFleetView(profile, timestamp)
    if (logisticsFleet.summary.totalCapacity <= 0) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Sevkiyat başlatmak için önce lojistik filosuna tır eklemelisin.' },
      }
      return db
    }

    if (quantity > logisticsFleet.summary.availableCapacity) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Seçilen yük miktarı mevcut lojistik kapasitesini aşıyor. Kullanılabilir kapasite: ${logisticsFleet.summary.availableCapacity}.`,
        },
      }
      return db
    }

    if (!removeInventory(profile, itemId, quantity)) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Sevkiyat için envanter yetersiz.' },
      }
      return db
    }

    const unitMarketPrice = db.marketState.items.find((entry) => entry.id === itemId)?.price || itemDef.basePrice
    const expectedGross = Math.max(1, Math.round(unitMarketPrice * quantity * route.payoutMultiplier))
    const shippingFee = Math.max(1, Math.round(unitMarketPrice * quantity * route.feeRate))
    const insuranceFee = insured ? Math.max(1, Math.round(unitMarketPrice * quantity * 0.04)) : 0
    const totalFee = shippingFee + insuranceFee

    if (profile.wallet < totalFee) {
      addInventory(profile, itemId, quantity)
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Kargo ve sigorta masrafı için bakiye yetersiz.' },
      }
      return db
    }

    profile.wallet -= totalFee
    const nowMs = new Date(timestamp).getTime()
    profile.shipments.unshift({
      id: crypto.randomUUID(),
      itemId,
      itemName: itemDef.name,
      quantity,
      routeId: route.id,
      routeName: route.name,
      insured,
      riskRate: route.riskRate,
      shippingFee,
      insuranceFee,
      expectedGross,
      claimableAmount: 0,
      status: 'in_transit',
      createdAt: timestamp,
      arrivalAt: new Date(nowMs + route.etaMinutes * MS_MINUTE).toISOString(),
      resolvedAt: null,
      lossReason: '',
    })
    profile.shipments = profile.shipments.slice(0, 140)

    pushTransaction(
      profile,
      {
        kind: 'shipment_create',
        detail: `${itemDef.name} için ${route.name} sevkiyatı başlatıldı.`,
        amount: -totalFee,
      },
      timestamp,
    )

    pushNotification(
      profile,
      'market',
      `${itemDef.name} sevkiyati baslatildi.`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Sevkiyat oluşturuldu.',
      wallet: profile.wallet,
      shipments: shipmentView(profile),
      logisticsFleet: logisticsFleetView(profile, timestamp),
    }
    return db
  })
  return result
}

export async function claimShipmentLegacy(userId, shipmentId) {
  const safeShipmentId = String(shipmentId || '').trim()
  if (!safeShipmentId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Sevkiyat secimi ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const shipment = profile.shipments.find((entry) => entry.id === safeShipmentId)
    if (!shipment) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Sevkiyat bulunamadı.' },
      }
      return db
    }

    if (shipment.status === 'claimed') {
      result = {
        success: false,
        reason: 'already_claimed',
        errors: { global: 'Bu sevkiyat daha önce tahsil edildi.' },
      }
      return db
    }

    if (!['arrived', 'failed'].includes(shipment.status)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Sevkiyat henüz sonuçlanmadı.' },
      }
      return db
    }

    const payout = Math.max(0, asInt(shipment.claimableAmount, 0))
    const operationCost = payout > 0
      ? logisticsClaimOperationCost(profile, shipment)
      : {
          fuelItemId: 'oil',
          fuelItemName: ITEM_BY_ID.get('oil')?.name || 'Petrol',
          fuelNeeded: 0,
          upkeepCash: 0,
        }
    const fuelAvailable = Math.max(0, getInventoryQuantity(profile, operationCost.fuelItemId))
    if (operationCost.fuelNeeded > 0 && fuelAvailable < operationCost.fuelNeeded) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: {
          global: `Sevkiyat tahsilatı için ${operationCost.fuelItemName} yetersiz. Gereken: ${operationCost.fuelNeeded}.`,
        },
      }
      return db
    }

    if (operationCost.fuelNeeded > 0) {
      removeInventory(profile, operationCost.fuelItemId, operationCost.fuelNeeded)
    }

    const grossAfterUpkeep = Math.max(0, payout - operationCost.upkeepCash)
    const { taxAmount, netCash: netPayout } = taxAndNetFromGross(grossAfterUpkeep)
    const xpGain = netPayout > 0
      ? Math.max(FLEET_MIN_XP, Math.round(netPayout * FLEET_XP_RATE))
      : 0
    profile.wallet += netPayout
    if (xpGain > 0) {
      addProfileXp(profile, xpGain)
    }
    shipment.status = 'claimed'
    shipment.claimedAt = timestamp
    shipment.updatedAt = timestamp
    addLeaguePoints(profile, Math.max(1, Math.floor(netPayout / 135)))

    pushTransaction(
      profile,
      {
        kind: 'shipment_claim',
        detail: `${shipment.itemName} sevkiyat tahsilatı alındı.`,
        amount: netPayout,
      },
      timestamp,
    )

    result = {
      success: true,
      message: 'Sevkiyat tahsil edildi.',
      wallet: profile.wallet,
      payout: netPayout,
      grossPayout: payout,
      grossAfterUpkeep,
      upkeepCash: operationCost.upkeepCash,
      fuelItemId: operationCost.fuelItemId,
      fuelItemName: operationCost.fuelItemName,
      fuelNeeded: operationCost.fuelNeeded,
      fuelConsumed: operationCost.fuelNeeded,
      taxRate: COLLECTION_TAX_RATE,
      taxAmount,
      xpGain,
      shipments: shipmentView(profile),
      logisticsFleet: logisticsFleetView(profile, timestamp),
    }
    return db
  })
  return result
}

export async function purchaseLogisticsTruck(userId, payload) {
  const modelId = String(payload?.modelId || '').trim()
  if (!modelId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Satın alınacak tır modeli seçilmelidir.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    if (!isLogisticsUnlocked(profile)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Tır Kiralama kilitli. İşletmeni geliştirerek önce bu işletmeyi açmalısın.' },
      }
      return db
    }

    const baseTruck = LOGISTICS_TRUCK_BY_ID.get(modelId)
    if (!baseTruck) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Seçilen tır modeli bulunamadı.' },
      }
      return db
    }

    const operationalTruckCount = logisticsOperationalTrucks(profile, timestamp).length
    const truck = scaledLogisticsTruckSpec(baseTruck, operationalTruckCount)
    const level = levelInfoFromXp(profile.xpTotal).level
    const unlockedTruckLevel = level
    if (Math.max(1, asInt(truck.levelRequired, 1)) > unlockedTruckLevel) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Bu tırı açmak için gereken seviye ${truck.levelRequired}. Mevcut açılan seviye: ${unlockedTruckLevel}.`,
        },
      }
      return db
    }

    const truckSlotCapacity = clamp(level, 1, LOGISTICS_MAX_TRUCK_COUNT)
    if (operationalTruckCount >= truckSlotCapacity) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Tır kapasitesi seviyene göre dolu. Mevcut seviye ${level} ile en fazla ${truckSlotCapacity} tır alabilirsin.` },
      }
      return db
    }

    const nowMs = createdMs(timestamp)
    const lastTruckOrderMs = createdMs(profile.lastTruckOrderedAt || '')
    const nextTruckOrderReadyMs = lastTruckOrderMs + LOGISTICS_TRUCK_ORDER_COOLDOWN_MS
    if (lastTruckOrderMs > 0 && nowMs < nextTruckOrderReadyMs) {
      const waitMinutes = Math.max(1, Math.ceil((nextTruckOrderReadyMs - nowMs) / MS_MINUTE))
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Yeni tır siparişi için ${waitMinutes} dakika beklemelisin.` },
      }
      return db
    }

    if (profile.wallet < Math.max(1, asInt(truck.cash, 0))) {
      result = {
        success: false,
        reason: 'insufficient_funds',
        errors: { global: 'Bu tırı satın almak için yeterli nakit yok.' },
      }
      return db
    }

    if (getInventoryQuantity(profile, 'engine-kit') < Math.max(1, asInt(truck.engineKits, 0))) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Tır satın alımı için yeterli motor yok.' },
      }
      return db
    }

    if (getInventoryQuantity(profile, 'spare-parts') < Math.max(1, asInt(truck.spareParts, 0))) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Tır satın alımı için yeterli yedek parça yok.' },
      }
      return db
    }

    profile.wallet -= Math.max(1, asInt(truck.cash, 0))
    removeInventory(profile, 'engine-kit', Math.max(1, asInt(truck.engineKits, 0)))
    removeInventory(profile, 'spare-parts', Math.max(1, asInt(truck.spareParts, 0)))
    const truckLifetime = resolveAssetLifetime(timestamp, timestamp, timestamp)
    profile.logisticsFleet.unshift({
      id: crypto.randomUUID(),
      modelId: truck.id,
      name: truck.name,
      image: truck.image,
      tier: truck.tier,
      levelRequired: truck.levelRequired,
      capacity: truck.capacity,
      engineKits: truck.engineKits,
      spareParts: truck.spareParts,
      fuel: Math.max(0, asInt(truck.fuel, 0)),
      cash: truck.cash,
      incomePerRun: truck.incomePerRun,
      xpPerRun: truck.xpPerRun,
      upkeepPerRun: truck.upkeepPerRun,
      purchasedAt: truckLifetime.acquiredAt,
      expiresAt: truckLifetime.expiresAt,
    })
    profile.logisticsFleet = profile.logisticsFleet.slice(0, LOGISTICS_MAX_TRUCK_COUNT)
    profile.lastTruckOrderedAt = timestamp
    if (operationalTruckCount === 0 && !profile.lastLogisticsIncomeCollectedAt) {
      profile.lastLogisticsIncomeCollectedAt = new Date(
        Math.max(0, nowMs - FLEET_COLLECT_COOLDOWN_MS),
      ).toISOString()
    }
    profile.updatedAt = timestamp
    applyMissionProgress(profile.missions, { type: 'vehicle_purchase', value: 1 }, timestamp)

    pushTransaction(
      profile,
      {
        kind: 'logistics_truck_buy',
        detail: `${truck.name} lojistik filosuna eklendi.`,
        amount: -truck.cash,
      },
      timestamp,
    )

    result = {
      success: true,
      message: `${truck.name} lojistik filosuna eklendi.`,
      wallet: profile.wallet,
      logisticsFleet: logisticsFleetView(profile, timestamp),
    }
    return db
  })

  return result
}

export async function getContracts(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)
    result = {
      success: true,
      contracts: contractView(profile),
      counterparties: COUNTERPARTIES,
    }
    return db
  })
  return result
}

export async function createContract(userId, payload) {
  const contractType = String(payload?.contractType || '').trim()
  const counterpartyName = String(payload?.counterpartyName || '').trim()
  const itemId = String(payload?.itemId || '').trim()
  const quantity = asInt(payload?.quantity, 0)
  const unitPrice = asInt(payload?.unitPrice, 0)
  const expiresMinutes = clamp(asInt(payload?.expiresMinutes, 20), 5, CONTRACT_MAX_DURATION_MINUTES)

  if (
    !['outgoing_sell', 'outgoing_buy'].includes(contractType) ||
    !counterpartyName ||
    !itemId ||
    quantity <= 0 ||
    unitPrice <= 0
  ) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Kontrat bilgileri ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)

    const itemDef = ITEM_BY_ID.get(itemId)
    if (!itemDef) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Ürün bulunamadı.' },
      }
      return db
    }

    if (contractType === 'outgoing_sell' && !removeInventory(profile, itemId, quantity)) {
      result = {
        success: false,
        reason: 'insufficient_inventory',
        errors: { global: 'Satış kontratı için envanter yetersiz.' },
      }
      return db
    }

    const nowMs = new Date(timestamp).getTime()
    profile.contracts.unshift({
      id: crypto.randomUUID(),
      contractType,
      initiator: 'user',
      counterpartyName,
      itemId,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      status: 'open',
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(nowMs + expiresMinutes * MS_MINUTE).toISOString(),
      autoResolveAt: new Date(nowMs + (2 + Math.floor(Math.random() * 5)) * MS_MINUTE).toISOString(),
      resolvedAt: null,
      filledQuantity: 0,
    })
    profile.contracts = profile.contracts.slice(0, 120)

    pushNotification(
      profile,
      'market',
      `${counterpartyName} için kontrat teklifi g\u00f6nderildi.`,
      timestamp,
    )

    result = {
      success: true,
      message: 'Kontrat teklifi oluşturuldu.',
      contracts: contractView(profile),
    }
    return db
  })
  return result
}

export async function respondContract(userId, contractId, payload) {
  const safeContractId = String(contractId || '').trim()
  const action = String(payload?.action || '').trim()
  if (!safeContractId || !['accept', 'reject'].includes(action)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Kontrat yanıtı geçersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)

    const contract = profile.contracts.find((entry) => entry.id === safeContractId)
    if (!contract) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Kontrat bulunamadı.' },
      }
      return db
    }

    if (contract.status !== 'open') {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Bu kontrat artık a\u00e7ık değil.' },
      }
      return db
    }

    if (action === 'reject') {
      contract.status = 'rejected'
      contract.resolvedAt = timestamp
      contract.updatedAt = timestamp
      releaseContractReservation(profile, contract)
      result = {
        success: true,
        message: 'Kontrat reddedildi.',
        contracts: contractView(profile),
      }
      return db
    }

    const acceptResult = finalizeContractAccept(profile, contract, timestamp)
    if (!acceptResult.success) {
      result = acceptResult
      return db
    }

    result = {
      success: true,
      message: 'Kontrat kabul edildi.',
      wallet: profile.wallet,
      contracts: contractView(profile),
    }
    return db
  })
  return result
}

export async function getLeague(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)

    const standings = leagueStandingView(db, userId, timestamp)
    result = {
      success: true,
      seasonKey: profile.league.seasonKey,
      points: {
        daily: profile.league.dailyPoints,
        weekly: profile.league.weeklyPoints,
        season: profile.league.seasonPoints,
      },
      standings,
      daily: standings.daily,
      weekly: standings.weekly,
      season: standings.season,
      cash: standings.cash,
      level: standings.level,
      seasonPrizes: leagueSeasonPrizesView(profile),
      rewards: {
        daily: {
          ...LEAGUE_DAILY_REWARD,
          canClaim:
            profile.league.dailyPoints >= LEAGUE_DAILY_REWARD.minPoints &&
            profile.league.claimedDailyKey !== profile.league.dayKey,
        },
        weekly: {
          ...LEAGUE_WEEKLY_REWARD,
          canClaim:
            profile.league.weeklyPoints >= LEAGUE_WEEKLY_REWARD.minPoints &&
            profile.league.claimedWeeklyKey !== profile.league.weekKey,
        },
        season: {
          ...LEAGUE_SEASON_REWARD,
          canClaim:
            profile.league.seasonPoints >= LEAGUE_SEASON_REWARD.minPoints &&
            profile.league.claimedSeasonKey !== profile.league.seasonKey,
        },
      },
    }
    return db
  })
  return result
}

export async function runLeagueSeasonMaintenanceTick() {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const seasonKey = seasonKeyFromIso(timestamp)
    const resetProfiles = Array.isArray(db.gameProfiles)
      ? db.gameProfiles.filter((profile) => {
          const key = normalizeSeasonKey(profile?.league?.seasonKey)
          return Boolean(key && key !== seasonKey)
        }).length
      : 0

    const transition = processLeagueSeasonTransition(db, timestamp)
    normalizeAllProfiles(db, timestamp, { skipSeasonTransition: true })

    result = {
      success: true,
      seasonKey,
      checkedProfiles: Array.isArray(db.gameProfiles) ? db.gameProfiles.length : 0,
      resetProfiles,
      transitioned: Boolean(transition?.transitioned),
      fromSeasonKey: transition?.fromSeasonKey || '',
      toSeasonKey: transition?.toSeasonKey || seasonKey,
      winners: Array.isArray(transition?.winners) ? transition.winners : [],
    }
    return db
  })
  return result
}

export async function claimLeague(userId, payload) {
  const period = String(payload?.period || '').trim()
  if (!['daily', 'weekly', 'season'].includes(period)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Lig \u00d6d\u00fcl periyodu ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const rewardByPeriod = {
      daily: LEAGUE_DAILY_REWARD,
      weekly: LEAGUE_WEEKLY_REWARD,
      season: LEAGUE_SEASON_REWARD,
    }
    const reward = rewardByPeriod[period]

    const pointByPeriod = {
      daily: profile.league.dailyPoints,
      weekly: profile.league.weeklyPoints,
      season: profile.league.seasonPoints,
    }
    const claimedKeyByPeriod = {
      daily: 'claimedDailyKey',
      weekly: 'claimedWeeklyKey',
      season: 'claimedSeasonKey',
    }
    const activeKeyByPeriod = {
      daily: profile.league.dayKey,
      weekly: profile.league.weekKey,
      season: profile.league.seasonKey,
    }

    const claimedField = claimedKeyByPeriod[period]
    const activeKey = activeKeyByPeriod[period]

    if (pointByPeriod[period] < reward.minPoints || profile.league[claimedField] === activeKey) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Bu lig ödülü henüz alınabilir değil.' },
      }
      return db
    }

    profile.league[claimedField] = activeKey
    profile.wallet += reward.cash
    addProfileXp(profile, reward.xp)
    profile.reputation += reward.rep

    pushTransaction(
      profile,
      {
        kind: 'league_claim',
        detail: `${period} lig \u00f6dülü alındı.`,
        amount: reward.cash,
      },
      timestamp,
    )

    result = {
      success: true,
      message: `${period} lig \u00f6dülü alındı.`,
      wallet: profile.wallet,
      levelInfo: levelInfoFromXp(profile.xpTotal),
      reputation: profile.reputation,
    }
    return db
  })
  return result
}

export async function openLeagueSeasonChest(userId, payload) {
  const chestId = String(payload?.chestId || '').trim()
  if (!chestId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Açılacak sandık seçilmedi.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    if (!Array.isArray(profile.league.seasonChests)) {
      profile.league.seasonChests = []
    }
    profile.league.seasonChests = profile.league.seasonChests
      .map((entry) => normalizeLeagueSeasonChest(entry, timestamp))
      .filter(Boolean)
      .sort((a, b) => createdMs(b.awardedAt) - createdMs(a.awardedAt))

    const chest = profile.league.seasonChests.find((entry) => String(entry.id || '').trim() === chestId)
    if (!chest) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Sandık bulunamadı.' },
      }
      return db
    }
    if (chest.openedAt) {
      result = {
        success: false,
        reason: 'already_claimed',
        errors: { global: 'Bu sandık zaten açıldı.' },
      }
      return db
    }

    const rolledReward = rollLeagueSeasonChestReward(chest)
    const appliedReward = applyLeagueSeasonChestReward(profile, rolledReward)
    if (!appliedReward) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Sandık ödülü üretilemedi. Tekrar dene.' },
      }
      return db
    }

    chest.reward = appliedReward
    chest.openedAt = timestamp

    const rewardText = String(appliedReward.amountText || '').trim() || 'Ödül hesabına eklendi.'
    const safeChestLabel = String(chest.chestLabel || 'Sezon Sandığı').trim() || 'Sezon Sandığı'

    if (appliedReward.kind === 'cash') {
      pushTransaction(
        profile,
        {
          kind: 'season_chest_open',
          detail: `${safeChestLabel} açıldı (${rewardText}).`,
          amount: Math.max(0, asInt(appliedReward.cash, 0)),
        },
        timestamp,
      )
    } else {
      pushNotification(profile, 'league', `${safeChestLabel} açıldı: ${rewardText}`, timestamp)
    }

    result = {
      success: true,
      message: `${safeChestLabel} açıldı: ${rewardText}`,
      reward: appliedReward,
      chest: leagueSeasonChestView(chest),
      seasonPrizes: leagueSeasonPrizesView(profile),
      wallet: profile.wallet,
      levelInfo: levelInfoFromXp(profile.xpTotal),
    }
    return db
  })
  return result
}

export async function getPushCenter(userId) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)
    result = {
      success: true,
      push: pushView(profile),
    }
    return db
  })
  return result
}

export async function updatePushPreferences(userId, payload) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)

    if (typeof payload?.enabled === 'boolean') {
      profile.pushCenter.enabled = payload.enabled
    }

    if (payload?.subscriptions && typeof payload.subscriptions === 'object') {
      for (const key of ['priceAlert', 'productionFull', 'auctionEnding']) {
        if (typeof payload.subscriptions[key] === 'boolean') {
          profile.pushCenter.subscriptions[key] = payload.subscriptions[key]
        }
      }
    }

    result = {
      success: true,
      push: pushView(profile),
    }
    return db
  })
  return result
}

export async function createPushPriceAlert(userId, payload) {
  const itemId = String(payload?.itemId || '').trim()
  const direction = String(payload?.direction || '').trim()
  const targetPrice = asInt(payload?.targetPrice, 0)

  if (!itemId || !['above', 'below'].includes(direction) || targetPrice <= 0) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Fiyat alarm bilgisi ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)

    if (!ITEM_BY_ID.get(itemId)) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Alarm ürünü bulunamadı.' },
      }
      return db
    }

    profile.pushCenter.priceAlerts.unshift({
      id: crypto.randomUUID(),
      itemId,
      direction,
      targetPrice,
      active: true,
      createdAt: timestamp,
      triggeredAt: null,
    })
    profile.pushCenter.priceAlerts = profile.pushCenter.priceAlerts.slice(0, 60)

    result = {
      success: true,
      message: 'Fiyat alarmı oluşturuldu.',
      push: pushView(profile),
    }
    return db
  })
  return result
}

export async function registerPushDevice(userId, payload) {
  const token = String(payload?.token || '').trim()
  const rawPlatform = String(payload?.platform || 'android').trim().toLowerCase()
  const platform =
    rawPlatform === 'ios' || rawPlatform === 'android' || rawPlatform === 'web'
      ? rawPlatform
      : 'android'
  const deviceId = String(payload?.deviceId || 'unknown-device').trim() || 'unknown-device'
  const appVersion = String(payload?.appVersion || '').trim().slice(0, 40)

  if (token.length < 20) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Push token ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    let target = profile.pushCenter.devices.find((entry) => entry.token === token)
    if (!target) {
      target = profile.pushCenter.devices.find(
        (entry) => entry.deviceId === deviceId && entry.platform === platform,
      )
    }

    if (target) {
      target.token = token
      target.platform = platform
      target.deviceId = deviceId.slice(0, 120)
      target.appVersion = appVersion
      target.updatedAt = timestamp
      target.lastSeenAt = timestamp
    } else {
      profile.pushCenter.devices.unshift({
        id: crypto.randomUUID(),
        token,
        platform,
        deviceId: deviceId.slice(0, 120),
        appVersion,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastSeenAt: timestamp,
      })
    }

    const seen = new Set()
    profile.pushCenter.devices = profile.pushCenter.devices
      .filter((entry) => {
        const safeToken = String(entry.token || '').trim()
        if (!safeToken || seen.has(safeToken)) return false
        seen.add(safeToken)
        return true
      })
      .slice(0, MAX_PUSH_DEVICE_TOKENS)

    result = {
      success: true,
      message: 'Cihaz, push bildirimleri için kaydedildi.',
      push: pushView(profile),
    }
    return db
  })

  return result
}

export async function unregisterPushDevice(userId, payload) {
  const token = String(payload?.token || '').trim()
  const deviceId = String(payload?.deviceId || '').trim()

  if (!token && !deviceId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Kaldırılacak cihaz bilgisi gerekli.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    const beforeCount = profile.pushCenter.devices.length
    profile.pushCenter.devices = profile.pushCenter.devices.filter((entry) => {
      if (token && entry.token === token) return false
      if (deviceId && entry.deviceId === deviceId) return false
      return true
    })
    const removed = Math.max(0, beforeCount - profile.pushCenter.devices.length)

    result = {
      success: true,
      removed,
      push: pushView(profile),
    }
    return db
  })

  return result
}

export async function markPushNotificationRead(userId, pushId) {
  const safePushId = String(pushId || '').trim()
  if (!safePushId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Bildirim secimi ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, profile, timestamp)

    const push = profile.pushCenter.inbox.find((entry) => entry.id === safePushId)
    if (!push) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Bildirim bulunamadı.' },
      }
      return db
    }

    push.read = true
    emitMessageCenterRefresh(userId, 'push_read')
    result = {
      success: true,
      push: pushView(profile),
    }
    return db
  })
  return result
}

export async function sendFriendRequest(userId, targetUserId) {
  const safeTargetUserId = String(targetUserId || '').trim()
  if (!safeTargetUserId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Oyuncu seçilmedi.' },
    }
  }
  if (safeTargetUserId === String(userId || '').trim()) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Kendine arkadaşlık isteği gönderemezsin.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const senderUser = db.users.find((entry) => entry.id === userId)
    if (!senderUser) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const targetUser = db.users.find((entry) => entry.id === safeTargetUserId)
    if (!targetUser) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Oyuncu bulunamadı.' },
      }
      return db
    }

    const senderProfile = ensureProfile(db, userId, timestamp)
    const targetProfile = ensureProfile(db, safeTargetUserId, timestamp, { markActive: false })
    if (!senderProfile || !targetProfile) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Profil bulunamadı.' },
      }
      return db
    }

    runGameTick(db, senderProfile, timestamp)
    ensureSocialState(senderProfile)
    ensureSocialState(targetProfile)

    if (userBlocked(senderProfile, safeTargetUserId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Engellediğin kullanıcıya arkadaşlık isteği gönderemezsin.' },
      }
      return db
    }
    if (userBlocked(targetProfile, userId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Bu kullanıcıyla şu anda işlem yapamazsın.' },
      }
      return db
    }
    if (usersAreFriends(senderProfile, targetProfile, userId, safeTargetUserId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Bu kullanıcı zaten arkadaş listende.' },
      }
      return db
    }

    const outgoingPending = latestPendingFriendRequest(db, userId, safeTargetUserId)
    if (outgoingPending) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Arkadaşlık isteği zaten gönderildi.' },
      }
      return db
    }

    const incomingPending = latestPendingFriendRequest(db, safeTargetUserId, userId)
    if (incomingPending) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Bu kullanıcıdan gelen bir istek zaten var. Bildirimlerden yanıtlayabilirsin.' },
      }
      return db
    }

    if (!Array.isArray(db.friendRequests)) {
      db.friendRequests = []
    }
    const senderUserId = String(userId || '').trim()
    const request = {
      id: crypto.randomUUID(),
      fromUserId: senderUserId,
      toUserId: safeTargetUserId,
      status: 'pending',
      seenBy: senderUserId ? [senderUserId] : [],
      createdAt: timestamp,
      updatedAt: timestamp,
      respondedAt: null,
    }
    db.friendRequests.unshift(request)
    ensureFriendRequestsRoot(db)

    // Arkadaşlık isteği artık DM olarak gönderilmiyor; sadece bildirimler sekmesinde Evet/Hayır ile yanıtlanır.

    emitMessageCenterRefresh(String(userId || '').trim(), 'friend_request_sent')
    emitMessageCenterRefresh(safeTargetUserId, 'friend_request_received')

    result = {
      success: true,
      message: `${targetUser.username} kullanıcısına arkadaşlık isteği gönderildi.`,
      request: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
      },
      relationship: socialRelationshipView(db, senderProfile, targetProfile, timestamp),
    }
    return db
  })

  return result
}

export async function respondFriendRequest(userId, requestId, payload) {
  const safeRequestId = String(requestId || '').trim()
  const action = String(payload?.action || '').trim().toLowerCase()
  if (!safeRequestId || !['accept', 'reject', 'cancel'].includes(action)) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'İstek yanıtı geçersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    ensureFriendRequestsRoot(db)

    const currentProfile = ensureProfile(db, userId, timestamp)
    if (!currentProfile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }
    runGameTick(db, currentProfile, timestamp)
    ensureSocialState(currentProfile)

    const request = db.friendRequests.find((entry) => String(entry?.id || '').trim() === safeRequestId)
    if (!request || request.status !== 'pending') {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Arkadaşlık isteği bulunamadı.' },
      }
      return db
    }

    const safeCurrentUserId = String(userId || '').trim()
    const requestFromUserId = String(request.fromUserId || '').trim()
    const requestToUserId = String(request.toUserId || '').trim()
    const cancelAction = action === 'cancel'
    const counterpartUserId = cancelAction ? requestToUserId : requestFromUserId
    const canAct = cancelAction
      ? requestFromUserId === safeCurrentUserId
      : requestToUserId === safeCurrentUserId
    if (!canAct) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: {
          global: cancelAction
            ? 'Sadece gönderdiğin isteği iptal edebilirsin.'
            : 'Bu isteği yanıtlayamazsın.',
        },
      }
      return db
    }

    const counterpartProfile = ensureProfile(db, counterpartUserId, timestamp, { markActive: false })
    if (!counterpartProfile) {
      result = {
        success: false,
        reason: 'not_found',
        errors: {
          global: cancelAction
            ? 'İsteğin gönderildiği kullanıcı bulunamadı.'
            : 'İsteği gönderen kullanıcı bulunamadı.',
        },
      }
      return db
    }
    ensureSocialState(counterpartProfile)

    if (action === 'accept') {
      if (userBlocked(currentProfile, counterpartUserId) || userBlocked(counterpartProfile, userId)) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: 'Engelli kullanıcı ile arkadaş olamazsın.' },
        }
        return db
      }

      currentProfile.social.friends = addUserIdToList(currentProfile.social.friends, counterpartUserId)
      counterpartProfile.social.friends = addUserIdToList(counterpartProfile.social.friends, userId)
    }

    request.status = action === 'accept'
      ? 'accepted'
      : action === 'reject'
        ? 'rejected'
        : 'cancelled'
    request.updatedAt = timestamp
    request.respondedAt = timestamp

    const currentUser = db.users.find((entry) => entry.id === safeCurrentUserId)
    const counterpartUser = db.users.find((entry) => entry.id === counterpartUserId)
    const currentName = currentUser?.username || currentProfile.username || 'Oyuncu'
    const counterpartName = counterpartUser?.username || counterpartProfile.username || 'Oyuncu'

    let counterpartNotice = ''
    let currentNotice = ''
    if (action === 'accept') {
      counterpartNotice = `${currentName} arkadaşlık isteğini kabul etti. Artık arkadaşsınız.`
      currentNotice = `${counterpartName} ile arkadaş oldunuz.`
    } else if (action === 'reject') {
      counterpartNotice = `${currentName} arkadaşlık isteğini reddetti.`
      currentNotice = 'Arkadaşlık isteğini reddettiniz.'
    } else {
      counterpartNotice = `${currentName} gönderdiği arkadaşlık isteğini iptal etti.`
      currentNotice = 'Arkadaşlık isteğini iptal ettiniz.'
    }

    pushNotification(counterpartProfile, 'other', counterpartNotice, timestamp)
    pushNotification(currentProfile, 'other', currentNotice, timestamp)

    emitMessageCenterRefresh(safeCurrentUserId, 'friend_request_responded')
    emitMessageCenterRefresh(counterpartUserId, 'friend_request_responded')

    result = {
      success: true,
      message: currentNotice,
      relationship: socialRelationshipView(db, currentProfile, counterpartProfile, timestamp),
      request: {
        id: request.id,
        status: request.status,
        updatedAt: request.updatedAt,
      },
    }
    return db
  })

  return result
}

export async function removeFriend(userId, targetUserId) {
  const safeTargetUserId = String(targetUserId || '').trim()
  if (!safeTargetUserId || safeTargetUserId === String(userId || '').trim()) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçersiz arkadaş seçimi.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const currentProfile = ensureProfile(db, userId, timestamp)
    const targetProfile = ensureProfile(db, safeTargetUserId, timestamp, { markActive: false })
    if (!currentProfile || !targetProfile) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Oyuncu bulunamadı.' },
      }
      return db
    }

    runGameTick(db, currentProfile, timestamp)
    ensureSocialState(currentProfile)
    ensureSocialState(targetProfile)

    currentProfile.social.friends = removeUserIdFromList(currentProfile.social.friends, safeTargetUserId)
    targetProfile.social.friends = removeUserIdFromList(targetProfile.social.friends, String(userId || '').trim())

    emitMessageCenterRefresh(String(userId || '').trim(), 'friend_removed')
    emitMessageCenterRefresh(safeTargetUserId, 'friend_removed')

    result = {
      success: true,
      message: 'Arkadaş listenden çıkarıldı.',
      relationship: socialRelationshipView(db, currentProfile, targetProfile, timestamp),
    }
    return db
  })

  return result
}

export async function setBlockStatus(userId, targetUserId, payload) {
  const safeTargetUserId = String(targetUserId || '').trim()
  if (!safeTargetUserId || safeTargetUserId === String(userId || '').trim()) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Geçersiz kullanıcı seçimi.' },
    }
  }
  const shouldBlock = payload?.blocked !== false

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const currentProfile = ensureProfile(db, userId, timestamp)
    const targetProfile = ensureProfile(db, safeTargetUserId, timestamp, { markActive: false })
    if (!currentProfile || !targetProfile) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Oyuncu bulunamadı.' },
      }
      return db
    }

    runGameTick(db, currentProfile, timestamp)
    ensureSocialState(currentProfile)
    ensureSocialState(targetProfile)

    if (shouldBlock) {
      currentProfile.social.blockedUserIds = addUserIdToList(
        currentProfile.social.blockedUserIds,
        safeTargetUserId,
      )
      currentProfile.social.friends = removeUserIdFromList(currentProfile.social.friends, safeTargetUserId)
      targetProfile.social.friends = removeUserIdFromList(
        targetProfile.social.friends,
        String(userId || '').trim(),
      )

      for (const request of db.friendRequests || []) {
        if (!request || request.status !== 'pending') continue
        const fromUserId = String(request.fromUserId || '').trim()
        const toUserId = String(request.toUserId || '').trim()
        const samePair =
          (fromUserId === String(userId || '').trim() && toUserId === safeTargetUserId) ||
          (fromUserId === safeTargetUserId && toUserId === String(userId || '').trim())
        if (!samePair) continue
        request.status = 'cancelled'
        request.updatedAt = timestamp
        request.respondedAt = timestamp
      }
    } else {
      currentProfile.social.blockedUserIds = removeUserIdFromList(
        currentProfile.social.blockedUserIds,
        safeTargetUserId,
      )
    }

    emitMessageCenterRefresh(String(userId || '').trim(), shouldBlock ? 'user_blocked' : 'user_unblocked')
    emitMessageCenterRefresh(safeTargetUserId, shouldBlock ? 'blocked_by_other' : 'unblocked_by_other')

    result = {
      success: true,
      message: shouldBlock ? 'Kullanıcı engellendi.' : 'Kullanıcı engeli kaldırıldı.',
      blocked: shouldBlock,
      relationship: socialRelationshipView(db, currentProfile, targetProfile, timestamp),
    }
    return db
  })

  return result
}

export async function getMessageCenter(userId, payload) {
  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)
    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)
    const center = messageCenterView(db, profile, userId, payload || {}, timestamp)
    result = {
      success: true,
      ...center,
    }
    return db
  })

  return result
}

export async function sendDirectMessage(userId, payload) {
  const safeToUsername = String(payload?.toUsername || '').trim()
  const safeText = normalizeDirectMessageText(payload?.text)
  const safeSubject = normalizeDirectMessageSubject(payload?.subject)
  const safeReplyToId = String(payload?.replyToId || '').trim()

  if (!safeToUsername || safeToUsername.length < 3 || !safeText) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Al\u0131c\u0131 kullan\u0131c\u0131 adı ve mesaj zorunlu.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const senderUser = db.users.find((entry) => entry.id === userId)
    if (!senderUser) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const senderProfile = ensureProfile(db, userId, timestamp)
    runGameTick(db, senderProfile, timestamp)

    const nowMs = createdMs(timestamp)
    const dmBlockedUntil = String(senderUser?.dmBlockedUntil || '').trim()
    const dmBlockedUntilMs = createdMs(dmBlockedUntil)
    const dmBlockActive = dmBlockedUntil && Number.isFinite(dmBlockedUntilMs) && dmBlockedUntilMs > nowMs
    if (dmBlockActive) {
      const reasonText = String(senderUser?.dmBlockedReason || '').trim()
      const remainingLabel = formatMuteRemaining(Math.max(0, dmBlockedUntilMs - nowMs))
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `DM mesaj engelin aktif${reasonText ? ` (${reasonText})` : ''}. Kalan süre: ${remainingLabel}.`,
        },
      }
      return db
    }

    const muteState = getMessageMuteState(db, userId)
    if (muteState.isMuted) {
      const remainingLabel = formatMuteRemaining(muteState.remainingMs)
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: `Susturma aktif. Kalan süre: ${remainingLabel}.` },
      }
      return db
    }

    const profanity = detectProfanity(safeText)
    if (profanity.flagged) {
      const penalty = applyProfanityMute(db, userId, timestamp)
      result = {
        success: false,
        reason: 'not_ready',
        errors: {
          global: `Küfür nedeniyle ${penalty.durationHours} saat susturuldun. Bu sürede mesaj g\u00f6nderemezsin.`,
        },
      }
      return db
    }

    const recipientUser = db.users.find(
      (entry) => normalizeLookup(entry.username) === normalizeLookup(safeToUsername),
    )
    if (!recipientUser) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Al\u0131c\u0131 kullan\u0131c\u0131 bulunamadı.' },
      }
      return db
    }

    if (recipientUser.id === userId) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendine mesaj g\u00f6nderemezsin.' },
      }
      return db
    }

    const recipientProfile = ensureProfile(db, recipientUser.id, timestamp, { markActive: false })
    ensureSocialState(senderProfile)
    ensureSocialState(recipientProfile)
    if (userBlocked(senderProfile, recipientUser.id)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Engellediğin kullanıcıya mesaj gönderemezsin.' },
      }
      return db
    }
    if (userBlocked(recipientProfile, userId)) {
      result = {
        success: false,
        reason: 'not_ready',
        errors: { global: 'Bu kullanıcı sana mesaj gönderimini engelledi.' },
      }
      return db
    }
    const latestSent = db.directMessages.find((entry) => entry.fromUserId === userId)
    if (latestSent) {
      const diffMs = createdMs(timestamp) - createdMs(latestSent.createdAt)
      if (diffMs < MESSAGE_COOLDOWN_MS) {
        result = {
          success: false,
          reason: 'not_ready',
          errors: { global: 'Mesajlar arasında kısa bir bekleme var.' },
        }
        return db
      }
    }

    const nextMessage = {
      id: crypto.randomUUID(),
      fromUserId: userId,
      toUserId: recipientUser.id,
      text: safeText,
      subject: safeSubject,
      createdAt: timestamp,
      readAt: null,
      replyToId: safeReplyToId || null,
    }

    db.directMessages.unshift(nextMessage)
    ensureDirectMessagesRoot(db, timestamp)
    emitMessageCenterRefresh(userId, 'direct_message_sent')
    emitMessageCenterRefresh(recipientUser.id, 'direct_message_received')

    result = {
      success: true,
      message: 'Mesaj g\u00f6nderildi.',
      item: directMessageItemView(db, nextMessage, userId, timestamp),
    }
    return db
  })

  return result
}

export async function reportDirectMessage(userId, payload = {}) {
  const rawMessageId = String(payload?.messageId || '').trim()
  const messageId = rawMessageId.startsWith('dm:') ? rawMessageId.slice(3).trim() : rawMessageId
  const requestId = String(payload?.requestId || '').trim()
  const reason = normalizeReportReasonText(payload?.reason || payload?.description)

  if (!messageId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Raporlanacak mesaj seçilmedi.' },
    }
  }
  if (reason.length < DIRECT_MESSAGE_REPORT_REASON_MIN_LENGTH) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: `Aciklama en az ${DIRECT_MESSAGE_REPORT_REASON_MIN_LENGTH} karakter olmali.` },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    const nowMs = createdMs(timestamp) || Date.now()
    const safeUserId = String(userId || '').trim()
    ensureGameRoot(db, timestamp)
    ensureAdminAuditRoot(db)
    ensureDirectMessageReportsRoot(db)

    const reporter = (db.users || []).find((entry) => String(entry?.id || '').trim() === safeUserId)
    if (!reporter) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const directMessage = (db.directMessages || []).find((entry) => String(entry?.id || '').trim() === messageId)
    if (!directMessage) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'DM mesajı bulunamadı.' },
      }
      return db
    }

    const fromUserId = String(directMessage?.fromUserId || '').trim()
    const toUserId = String(directMessage?.toUserId || '').trim()
    const reporterInConversation = fromUserId === safeUserId || toUserId === safeUserId
    if (!reporterInConversation) {
      result = {
        success: false,
        reason: 'forbidden',
        errors: { global: 'Bu mesajı raporlayamazsın.' },
      }
      return db
    }

    if (fromUserId === safeUserId) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Kendi mesajını raporlayamazsın.' },
      }
      return db
    }

    const duplicate = (db.directMessageReports || []).some((entry) => {
      if (!entry || typeof entry !== 'object') return false
      if (String(entry?.reporterUserId || '').trim() !== safeUserId) return false
      if (String(entry?.messageId || '').trim() !== messageId) return false
      return (nowMs - createdMs(entry?.createdAt)) < DIRECT_MESSAGE_REPORT_DUPLICATE_WINDOW_MS
    })
    if (duplicate) {
      result = {
        success: false,
        reason: 'duplicate',
        errors: { global: 'Bu mesajı zaten daha önce raporladın.' },
      }
      return db
    }

    const targetUser = (db.users || []).find((entry) => String(entry?.id || '').trim() === fromUserId) || null
    if (normalizeUserRole(targetUser?.role, USER_ROLES.PLAYER) === USER_ROLES.ADMIN) {
      result = {
        success: false,
        reason: 'forbidden',
        errors: { global: 'Admin kullanıcıları raporlanamaz.' },
      }
      return db
    }
    const reportedText = normalizeDirectMessageText(directMessage?.text || '').slice(0, DIRECT_MESSAGE_REPORT_TEXT_PREVIEW_MAX)

    const report = {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      requestId: requestId || '',
      messageId,
      messageCreatedAt: String(directMessage?.createdAt || '').trim(),
      reporterUserId: safeUserId,
      reporterUsername: String(reporter?.username || '').trim(),
      reporterEmail: String(reporter?.email || '').trim(),
      reporterRole: normalizeUserRole(reporter?.role, USER_ROLES.PLAYER),
      targetUserId: fromUserId,
      targetUsername: String(targetUser?.username || '').trim(),
      targetEmail: String(targetUser?.email || '').trim(),
      reason,
      reportedText,
    }

    db.directMessageReports.unshift(report)
    db.directMessageReports = db.directMessageReports
      .filter(Boolean)
      .slice(0, DIRECT_MESSAGE_REPORT_HISTORY_LIMIT)

    pushAdminAuditLogEntry(db, {
      actorUserId: safeUserId,
      actorUsername: reporter?.username,
      actorEmail: reporter?.email,
      actorRole: reporter?.role,
      action: 'dm_message_report',
      status: 'success',
      message: 'DM mesajı raporlandı.',
      targetUserId: report.targetUserId,
      targetUsername: report.targetUsername,
      targetEmail: report.targetEmail,
      meta: {
        reportId: report.id,
        messageId: report.messageId,
        messageCreatedAt: report.messageCreatedAt,
        reason: report.reason,
        reportedText: report.reportedText,
      },
    })

    result = {
      success: true,
      message: 'DM raporu yetkililere iletildi.',
      report: {
        id: report.id,
        messageId: report.messageId,
        createdAt: report.createdAt,
      },
    }
    return db
  })

  return result
}

export async function getDirectMessageThread(userId, payload) {
  const rawUsername = String(payload?.username || payload?.toUsername || '').trim()
  const safeLimit = clamp(asInt(payload?.limit, DIRECT_MESSAGE_HISTORY_LIMIT), 1, DIRECT_MESSAGE_HISTORY_LIMIT)

  if (!rawUsername || rawUsername.length < 3) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Hedef kullanıcı adı bulunamadı.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    const counterpartUser = db.users.find(
      (entry) => normalizeLookup(entry.username) === normalizeLookup(rawUsername),
    )
    if (!counterpartUser) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Kullanıcı bulunamadı.' },
      }
      return db
    }

    const currentUserId = String(userId || '').trim()
    const counterpartUserId = String(counterpartUser.id || '').trim()
    const currentUser = db.users.find((entry) => String(entry?.id || '').trim() === currentUserId)
    if (!currentUserId || !counterpartUserId || currentUserId === counterpartUserId) {
      result = {
        success: false,
        reason: 'validation',
        errors: { global: 'Geçersiz mesajlaşma hedefi.' },
      }
      return db
    }

    ensureDirectMessagesRoot(db, timestamp)
    const all = Array.isArray(db.directMessages) ? db.directMessages : []
    const thread = all
      .filter((entry) => {
        if (!entry || typeof entry !== 'object') return false
        const fromId = String(entry.fromUserId || '').trim()
        const toId = String(entry.toUserId || '').trim()
        if (!fromId || !toId) return false
        const isForward = fromId === currentUserId && toId === counterpartUserId
        const isBackward = fromId === counterpartUserId && toId === currentUserId
        return isForward || isBackward
      })
      .sort((a, b) => createdMs(a.createdAt) - createdMs(b.createdAt))
      .slice(-safeLimit)

    const counterpartProfile = ensureProfile(db, counterpartUserId, timestamp, { markActive: false })
    ensureSocialState(profile)
    ensureSocialState(counterpartProfile)
    const relationship = socialRelationshipView(db, profile, counterpartProfile, timestamp)
    const counterpartMeta = messageMetaView(db, counterpartUserId, timestamp)

    const items = thread.map((entry) => {
      const fromSelf = String(entry.fromUserId || '').trim() === currentUserId
      const at = formatHourMinuteTurkiye(entry.createdAt)

      return {
        id: entry.id,
        fromUserId: entry.fromUserId,
        toUserId: entry.toUserId,
        text: entry.text,
        subject: entry.subject,
        createdAt: entry.createdAt,
        readAt: entry.readAt,
        own: fromSelf,
        direction: fromSelf ? 'out' : 'in',
        at,
        counterpart: {
          userId: counterpartMeta.userId || counterpartUserId,
          username: counterpartMeta.username || counterpartUser.username || counterpartProfile?.username || 'Oyuncu',
          avatarUrl: counterpartMeta.avatarUrl || '',
          level: counterpartMeta.level,
          premium: Boolean(counterpartMeta.premium),
          seasonBadge: counterpartMeta.seasonBadge || null,
          role: counterpartMeta.role,
          roleLabel: counterpartMeta.roleLabel,
        },
      }
    })

    result = {
      success: true,
      username: counterpartUser.username,
      userId: counterpartUserId,
      relationship,
      moderation: userModerationStateView(currentUser, timestamp),
      items,
    }

    return db
  })

  return result
}

export async function markMessageCenterRead(userId, messageId) {
  const rawMessageId = String(messageId || '').trim()
  if (!rawMessageId) {
    return {
      success: false,
      reason: 'validation',
      errors: { global: 'Mesaj secimi ge\u00e7ersiz.' },
    }
  }

  let result
  await updateDb((db) => {
    const timestamp = nowIso()
    ensureGameRoot(db, timestamp)

    const profile = ensureProfile(db, userId, timestamp)
    if (!profile) {
      result = {
        success: false,
        reason: 'unauthorized',
        errors: { global: 'Oturum bulunamadı.' },
      }
      return db
    }

    runGameTick(db, profile, timestamp)

    if (rawMessageId.startsWith('push:')) {
      const pushId = rawMessageId.slice('push:'.length)
      const push = profile.pushCenter.inbox.find((entry) => entry.id === pushId)
      if (!push) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'Bildirim bulunamadı.' },
        }
        return db
      }

      push.read = true
      emitMessageCenterRefresh(userId, 'read')
      result = { success: true }
      return db
    }

    if (rawMessageId.startsWith('notif:')) {
      const notificationId = rawMessageId.slice('notif:'.length).trim()
      const notification = (profile.notifications || []).find(
        (entry) => String(entry?.id || '').trim() === notificationId,
      )
      if (!notification) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'Bildirim bulunamadı.' },
        }
        return db
      }
      notification.read = true
      emitMessageCenterRefresh(userId, 'read')
      result = { success: true }
      return db
    }

    if (rawMessageId.startsWith('txn:')) {
      result = { success: true }
      return db
    }

    if (rawMessageId.startsWith('friend_request:')) {
      const requestId = rawMessageId.slice('friend_request:'.length).trim()
      const request = (db.friendRequests || []).find((entry) => String(entry?.id || '').trim() === requestId)
      if (!request) {
        result = {
          success: false,
          reason: 'not_found',
          errors: { global: 'Arkadaşlık isteği bulunamadı.' },
        }
        return db
      }
      const safeUserId = String(userId || '').trim()
      const fromUserId = String(request?.fromUserId || '').trim()
      const toUserId = String(request?.toUserId || '').trim()
      if (safeUserId !== fromUserId && safeUserId !== toUserId) {
        result = {
          success: false,
          reason: 'unauthorized',
          errors: { global: 'Bu isteğe erişim yok.' },
        }
        return db
      }
      request.seenBy = addUserIdToList(request.seenBy, safeUserId)
      result = { success: true }
      emitMessageCenterRefresh(userId, 'read')
      return db
    }

    const directId = rawMessageId.startsWith('dm:') ? rawMessageId.slice('dm:'.length) : rawMessageId
    const target = db.directMessages.find((entry) => entry.id === directId)
    if (!target || (target.toUserId !== userId && target.fromUserId !== userId)) {
      result = {
        success: false,
        reason: 'not_found',
        errors: { global: 'Mesaj bulunamadı.' },
      }
      return db
    }

    if (target.toUserId === userId) {
      // Bu DM konuşmasındaki TÜM okunmamış gelen mesajları okundu say
      const counterpartId = target.fromUserId
      for (const msg of db.directMessages) {
        if (msg.toUserId === userId && msg.fromUserId === counterpartId && !msg.readAt) {
          msg.readAt = timestamp
        }
      }
    }

    emitMessageCenterRefresh(userId, 'read')
    result = { success: true }
    return db
  })

  return result
}
