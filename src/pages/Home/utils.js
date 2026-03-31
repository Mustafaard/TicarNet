import {
  MINE_IMAGE_BY_ID,
  MINE_NAME_BY_ID,
  MINE_OUTPUT_LABEL_BY_ITEM_ID,
  FACTORY_ITEM_META,
  FACTORY_SHOP_IMAGE_BY_ID,
  DEPOT_META_BY_ID,
  DAILY_LOGIN_TOTAL_DAYS,
  DAILY_LOGIN_ITEM_PRIORITY,
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
  WEEKLY_EVENT_FALLBACK_SCHEDULE,
  FUEL_MULTIPLIER_BY_TEMPLATE,
  BUSINESS_EXPENSE_MULTIPLIER,
  NEWS_HIDDEN_TRANSACTION_KINDS,
  MOJIBAKE_TEXT_PATTERN,
  MOJIBAKE_REPLACEMENTS,
  LISTING_PRICE_PROFILE,
  VEHICLE_MARKET_COMMISSION_RATE,
  VEHICLE_SCRAP_RETURN_RATE,
  VEHICLE_LIFETIME_MS,
  VEHICLE_LIFETIME_MONTHS_TOTAL,
  COLLECTION_TAX_RATE,
  EMPTY_CHAT_RESTRICTIONS,
  EMPTY_USER_MODERATION,
  ANNOUNCEMENT_TYPE_UPDATE,
  ANNOUNCEMENT_TYPE_ANNOUNCEMENT,
  MOBILE_LAYOUT_MAX_WIDTH,
  NAV_THEMES,
  NAV_THEME_DEFAULT,
  NAV_THEME_STORAGE_KEY,
  CHAT_PRUNE_KEEP_COUNT,
  CHAT_NEWS_MAX_ITEMS,
  MESSAGE_ICONS,
} from './constants.js'

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export const resolveMineImage = (mine) => {
  const safeId = String(mine?.id || '').trim()
  if (MINE_IMAGE_BY_ID[safeId]) return MINE_IMAGE_BY_ID[safeId]
  const meta = factoryItemMeta(mine?.outputItemId)
  return meta?.icon || '/home/icons/depot/cash.webp'
}

export const factoryItemMeta = (itemId) => {
  const safeId = String(itemId || '').trim()
  if (FACTORY_ITEM_META[safeId]) return FACTORY_ITEM_META[safeId]
  return {
    label: safeId || 'Kaynak',
    icon: '/home/icons/depot/cash.webp',
  }
}

export const normalizeMineLabel = (value) => String(value || '')
  .trim()
  .replace(/AltÄ±n/gi, 'Altın')
  .replace(/AltÃ„Â±n/gi, 'Altın')
  .replace(/BakÄ±r/gi, 'Bakır')
  .replace(/BakÃ„Â±r/gi, 'Bakır')
  .replace(/KÃ¶mÃ¼r/gi, 'Kömür')
  .replace(/KÃƒÂ¶mÃƒÂ¼r/gi, 'Kömür')
  .replace(/\bAltin\b/gi, 'Altın')
  .replace(/\bBakir\b/gi, 'Bakır')
  .replace(/\bKomur\b/gi, 'Kömür')
  .replace(/\bcoal\b/gi, 'Kömür')
  .replace(/\bKazi\b/gi, 'Kazı')

export const mineDisplayName = (mine) => {
  const safeId = String(mine?.id || '').trim()
  if (MINE_NAME_BY_ID[safeId]) return MINE_NAME_BY_ID[safeId]
  const normalized = normalizeMineLabel(mine?.name)
  return normalized || 'Maden'
}

export const mineOutputLabel = (mine) => {
  const outputItemId = String(mine?.outputItemId || '').trim()
  if (MINE_OUTPUT_LABEL_BY_ITEM_ID[outputItemId]) return MINE_OUTPUT_LABEL_BY_ITEM_ID[outputItemId]
  const normalizedApiName = normalizeMineLabel(mine?.outputItemName)
  if (normalizedApiName) return normalizedApiName
  return factoryItemMeta(outputItemId).label
}

export const resolveFactoryShopImage = (factory) => {
  const safeId = String(factory?.id || '').trim()
  if (FACTORY_SHOP_IMAGE_BY_ID[safeId]) return FACTORY_SHOP_IMAGE_BY_ID[safeId]
  const rawImage = String(factory?.image || '').trim()
  if (rawImage.includes('motorfab')) return '/home/icons/businesses/motorfab.webp'
  if (rawImage.includes('yedekfab')) return '/home/icons/businesses/yedekfab.webp'
  if (rawImage.includes('kerestefab')) return '/home/icons/businesses/kerestefab.webp'
  if (rawImage.includes('cimentofab') || rawImage.includes('cement')) return '/home/icons/businesses/cimentofab.webp'
  if (rawImage.includes('tuglafab') || rawImage.includes('brick')) return '/home/icons/businesses/tuglafab.webp'
  if (rawImage.includes('enerjifab')) return '/home/icons/businesses/enerjifab.webp'
  if (rawImage.includes('petrolfab')) return '/home/icons/businesses/petrolfab.webp'
  if (rawImage.includes('fabrikam')) return '/home/icons/businesses/fabrikam-shop.webp?v=20260314b'
  return rawImage || String(factory?.icon || '').trim() || '/home/icons/businesses/fabrikam-shop.webp?v=20260314b'
}

export const factoryPurchaseRowsFromFactory = (factory) => {
  if (!factory || typeof factory !== 'object') return []
  return [
    {
      key: 'cash',
      label: 'Nakit',
      icon: '/home/icons/depot/cash.webp',
      required: Math.max(0, Math.trunc(num(factory.purchaseCostCash || 0))),
      missing: Math.max(0, Math.trunc(num(factory.missingPurchaseCash || 0))),
    },
    ...((factory.purchaseCostRows || []).map((row) => ({
      key: row.itemId,
      label: row.meta.label,
      icon: row.meta.icon,
      required: Math.max(0, Math.trunc(num(row.amount || 0))),
      missing: Math.max(0, Math.trunc(num(row.missing || 0))),
    }))),
  ]
}

export const resolveTruckImage = (entry) => {
  const safeModelId = String(entry?.modelId || entry?.id || '').trim()
  if (TRUCK_IMAGE_BY_MODEL_ID[safeModelId]) {
    return TRUCK_IMAGE_BY_MODEL_ID[safeModelId]
  }
  const safeName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
  if (TRUCK_IMAGE_BY_NAME[safeName]) {
    return TRUCK_IMAGE_BY_NAME[safeName]
  }
  return ''
}

export const buildTutorialTasksForStep = (step) => {
  const stepId = String(step?.id || 'step').trim() || 'step'
  const actionPlan = Array.isArray(step?.actionPlan)
    ? step.actionPlan.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []
  return actionPlan.map((entry, index) => ({
    id: `${stepId}-task-${index + 1}`,
    label: entry,
  }))
}

export const digitsOnly = (value, maxLength = 16) =>
  String(value || '')
    .replace(/[^\d]/g, '')
    .slice(0, Math.max(1, Math.trunc(num(maxLength)) || 1))

export const roundTo = (value, digits = 0) => {
  const safeDigits = Math.max(0, Math.trunc(num(digits)))
  const factor = 10 ** safeDigits
  return Math.round(num(value) * factor) / factor
}

export const fmt = (v) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(num(v))

export const toBigIntOrNull = (value) => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return BigInt(Math.trunc(value))
  }
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (/^[+-]?\d+$/.test(raw)) {
    try {
      return BigInt(raw)
    } catch {
      return null
    }
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return BigInt(Math.trunc(parsed))
}

export const formatBigIntTr = (value) => {
  const safe = typeof value === 'bigint' ? value : toBigIntOrNull(value)
  if (safe === null) return '0'
  const negative = safe < 0n
  const absText = (negative ? -safe : safe).toString()
  const grouped = absText.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return negative ? `-${grouped}` : grouped
}

export const fmtTry = (v) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num(v))

export const fmtFixed = (value, digits = 2) =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num(value))

export const fmtFxRate = (value) => fmtFixed(value, 2)
export const fmtTrySigned = (value) => `${num(value) > 0 ? '+' : ''}${fmtTry(value)}`

export const fmtCountdown = (totalMs) => {
  const safeMs = Math.max(0, Math.trunc(num(totalMs)))
  const totalSec = Math.floor(safeMs / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const fmtPctSigned = (value, digits = 2) => {
  const safe = num(value)
  return `${safe > 0 ? '+' : ''}${safe.toFixed(digits)}%`
}

export const fmtLevel = (value) => `${fmt(value)}. Seviye`

export const sanitizeNavTheme = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return NAV_THEMES.includes(normalized) ? normalized : NAV_THEME_DEFAULT
}

export const loadStoredNavTheme = () => {
  if (typeof window === 'undefined') return NAV_THEME_DEFAULT
  try {
    return sanitizeNavTheme(window.localStorage.getItem(NAV_THEME_STORAGE_KEY))
  } catch {
    return NAV_THEME_DEFAULT
  }
}

export const metricLengthClass = (value) => {
  const len = String(value || '').trim().length
  if (len >= 34) return 'is-mega'
  if (len >= 26) return 'is-xxlong'
  if (len >= 18) return 'is-xlong'
  if (len >= 12) return 'is-long'
  return ''
}

export const safeUiText = (value, depth = 0) => {
  if (value == null) return ''
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return ''
    if (text === '[object Object]') return ''
    return text
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = safeUiText(entry, depth + 1)
      if (candidate) return candidate
    }
    return ''
  }
  if (typeof value === 'object' && depth < 3) {
    const priorityKeys = ['global', 'message', 'error', 'detail', 'reason', 'title']
    for (const key of priorityKeys) {
      const candidate = safeUiText(value?.[key], depth + 1)
      if (candidate) return candidate
    }
    for (const entry of Object.values(value || {})) {
      const candidate = safeUiText(entry, depth + 1)
      if (candidate) return candidate
    }
  }
  return ''
}

export const errText = (errors, fallback) => {
  const direct = safeUiText(errors?.global || errors?.message || errors?.error)
  if (direct) return direct
  for (const value of Object.values(errors || {})) {
    const candidate = safeUiText(value)
    if (candidate) return candidate
  }
  return safeUiText(fallback) || 'İşlem sırasında bir hata oluştu.'
}

export const resolveVehicleImage = (entry, templateId = '') => {
  const safeTemplateId = String(templateId || entry?.templateId || '').trim()
  const directImage = String(entry?.image || '').trim()
  if (safeTemplateId === 'moto-rental') {
    const requiredLevel = Math.max(1, Math.trunc(num(entry?.requiredLevel || entry?.levelRequired || 1)))
    let targetLevel = MOTO_LEVEL_KEYS[0] || 1
    for (const level of MOTO_LEVEL_KEYS) {
      if (requiredLevel >= level) {
        targetLevel = level
        continue
      }
      break
    }
    return MOTO_LEVEL_IMAGE_BY_LEVEL[targetLevel] || directImage || '/home/icons/businesses/moto-kiralama.webp'
  }
  if (safeTemplateId === 'auto-rental') {
    return directImage || '/home/icons/businesses/oto-kiralama.webp'
  }
  if (safeTemplateId === 'property-rental') {
    return directImage || '/home/icons/businesses/mulkum.webp'
  }
  if (safeTemplateId === 'logistics') {
    const mappedTruckImage = resolveTruckImage(entry)
    return mappedTruckImage || directImage || '/home/icons/businesses/lojistik-kiralama.webp'
  }
  return directImage
}

export const fuelItemMeta = (itemId = 'oil') => {
  const safeItemId = String(itemId || 'oil').trim().toLowerCase()
  if (safeItemId === 'energy') {
    return {
      id: 'energy',
      label: 'Enerji',
      expenseLabel: 'Enerji Gideri',
      icon: '/home/icons/depot/enerji.png',
    }
  }
  if (safeItemId === 'oil') {
    return {
      id: 'oil',
      label: 'Petrol',
      expenseLabel: 'Benzin Gideri',
      icon: '/home/icons/depot/oil.webp',
    }
  }
  return {
    id: safeItemId || 'oil',
    label: safeItemId || 'Yakıt',
    expenseLabel: 'Yakıt Gideri',
    icon: '/home/icons/depot/oil.webp',
  }
}

export const normalizeDailyLoginRewardItems = (rawItems) => {
  const normalized = {}
  if (!rawItems || typeof rawItems !== 'object') return normalized
  for (const [itemIdRaw, quantityRaw] of Object.entries(rawItems)) {
    const itemId = String(itemIdRaw || '').trim()
    const quantity = Math.max(0, Math.trunc(num(quantityRaw)))
    if (!itemId || quantity <= 0) continue
    normalized[itemId] = quantity
  }
  return normalized
}

export const dailyLoginItemMeta = (itemId) => {
  const safeId = String(itemId || '').trim()
  if (!safeId) {
    return {
      id: 'cash',
      label: 'Nakit',
      icon: DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      short: 'NKT',
    }
  }
  if (safeId === 'cash') {
    return {
      id: 'cash',
      label: 'Nakit',
      icon: DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      short: 'NKT',
    }
  }
  const depotMeta = DEPOT_META_BY_ID.get(safeId)
  if (depotMeta) {
    return {
      id: safeId,
      label: String(depotMeta.label || safeId).trim() || safeId,
      icon: String(
        DAILY_LOGIN_ICON_BY_ITEM_ID[safeId] ||
        depotMeta.png ||
        DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      ).trim() || DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      short: String(depotMeta.icon || safeId.slice(0, 3).toUpperCase()).trim(),
    }
  }
  return {
    id: safeId,
    label: safeId,
    icon: DAILY_LOGIN_ICON_BY_ITEM_ID[safeId] || DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
    short: safeId.slice(0, 3).toUpperCase(),
  }
}

export const dailyLoginRewardEntries = (rewardRaw) => {
  const reward = rewardRaw && typeof rewardRaw === 'object' ? rewardRaw : {}
  const cash = Math.max(0, Math.trunc(num(reward.cash || 0)))
  const normalizedItems = normalizeDailyLoginRewardItems(reward.items)
  const itemRows = Object.entries(normalizedItems)
    .map(([itemId, quantity]) => ({
      itemId,
      quantity,
      ...dailyLoginItemMeta(itemId),
      isCash: false,
    }))
    .sort((left, right) => {
      const leftPriority = DAILY_LOGIN_ITEM_PRIORITY.indexOf(left.itemId)
      const rightPriority = DAILY_LOGIN_ITEM_PRIORITY.indexOf(right.itemId)
      const safeLeftPriority = leftPriority === -1 ? DAILY_LOGIN_ITEM_PRIORITY.length : leftPriority
      const safeRightPriority = rightPriority === -1 ? DAILY_LOGIN_ITEM_PRIORITY.length : rightPriority
      if (safeLeftPriority !== safeRightPriority) return safeLeftPriority - safeRightPriority
      return String(left.label || '').localeCompare(String(right.label || ''), 'tr')
    })

  const rows = []
  if (cash > 0) {
    rows.push({
      itemId: 'cash',
      quantity: cash,
      ...dailyLoginItemMeta('cash'),
      isCash: true,
    })
  }
  rows.push(...itemRows)
  return rows
}

export const normalizeDailyLoginPayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  const totalDays = Math.max(1, Math.trunc(num(source.totalDays || DAILY_LOGIN_TOTAL_DAYS)))
  const seriesRaw = source.series && typeof source.series === 'object' ? source.series : {}
  const seriesCurrent = clamp(Math.trunc(num(seriesRaw.current || 0)), 0, totalDays)
  const normalizedDays = (Array.isArray(source.days) ? source.days : [])
    .map((entry, index) => {
      const reward = entry?.reward && typeof entry.reward === 'object' ? entry.reward : {}
      const safeDay = clamp(Math.trunc(num(entry?.day || (index + 1))), 1, totalDays)
      const status = String(entry?.status || '').trim() || 'locked'
      const items = normalizeDailyLoginRewardItems(reward.items)
      return {
        day: safeDay,
        status,
        isBonus: entry?.isBonus === true || safeDay === totalDays,
        reward: {
          cash: Math.max(0, Math.trunc(num(reward.cash || 0))),
          items,
        },
      }
    })
    .sort((left, right) => left.day - right.day)
  const nextClaimDay = clamp(Math.trunc(num(source.nextClaimDay || 1)), 1, totalDays)
  const nextRewardRaw = source.nextReward && typeof source.nextReward === 'object'
    ? source.nextReward
    : { day: nextClaimDay, cash: 0, items: {} }
  const nextReward = {
    day: clamp(Math.trunc(num(nextRewardRaw.day || nextClaimDay)), 1, totalDays),
    cash: Math.max(0, Math.trunc(num(nextRewardRaw.cash || 0))),
    items: normalizeDailyLoginRewardItems(nextRewardRaw.items),
  }
  const claimedToday = source.claimedToday === true
  const canClaim = source.canClaim === true && !claimedToday
  return {
    totalDays,
    claimedToday,
    canClaim,
    nextClaimDay,
    nextResetAt: String(source.nextResetAt || ''),
    remainingMs: Math.max(0, Math.trunc(num(source.remainingMs || 0))),
    series: {
      current: seriesCurrent,
      total: totalDays,
      label: `${seriesCurrent}/${totalDays}`,
    },
    days: normalizedDays,
    nextReward,
    lastClaim: source.lastClaim && typeof source.lastClaim === 'object'
      ? {
          day: clamp(Math.trunc(num(source.lastClaim.day || 0)), 0, totalDays),
          dayKey: String(source.lastClaim.dayKey || ''),
          claimedAt: String(source.lastClaim.claimedAt || ''),
        }
      : null,
  }
}

export const turkiyeDayStartMs = (nowMs = Date.now()) => {
  const safeNowMs = Math.max(0, Math.trunc(num(nowMs)))
  const shiftedMs = safeNowMs + TURKIYE_UTC_OFFSET_MS
  const shiftedDayStart = Math.floor(shiftedMs / WEEKLY_EVENT_DAY_MS) * WEEKLY_EVENT_DAY_MS
  return shiftedDayStart - TURKIYE_UTC_OFFSET_MS
}

export const weeklyEventWindowByStartDay = (startDayIndex, nowMs = Date.now()) => {
  const safeNowMs = Math.max(0, Math.trunc(num(nowMs)))
  const dayStartMs = turkiyeDayStartMs(safeNowMs)
  const dayIndex = new Date(safeNowMs + TURKIYE_UTC_OFFSET_MS).getUTCDay()
  const safeStartDayIndex = clamp(Math.trunc(num(startDayIndex)), 0, 6)

  const referenceStartMs =
    dayStartMs +
    ((safeStartDayIndex - dayIndex) * WEEKLY_EVENT_DAY_MS) +
    WEEKLY_EVENT_START_OFFSET_MS
  const candidates = [
    referenceStartMs - WEEKLY_EVENT_WEEK_MS,
    referenceStartMs,
    referenceStartMs + WEEKLY_EVENT_WEEK_MS,
  ]
  let activeStartMs = 0
  for (const candidateStartMs of candidates) {
    if (safeNowMs >= candidateStartMs && safeNowMs < (candidateStartMs + WEEKLY_EVENT_WINDOW_DURATION_MS)) {
      activeStartMs = candidateStartMs
      break
    }
  }
  if (!activeStartMs) {
    return {
      active: false,
      remainingMs: 0,
      endsAt: '',
      startAt: '',
    }
  }

  const endExclusiveMs = activeStartMs + WEEKLY_EVENT_WINDOW_DURATION_MS
  const remainingMs = endExclusiveMs > safeNowMs ? Math.max(0, endExclusiveMs - safeNowMs) : 0
  return {
    active: remainingMs > 0,
    remainingMs,
    endsAt: remainingMs > 0 ? new Date(Math.max(0, endExclusiveMs - 1000)).toISOString() : '',
    startAt: new Date(activeStartMs).toISOString(),
  }
}

export const weeklyEventLocalWindow = (eventId, nowMs = Date.now()) => {
  if (eventId === 'weekend-xp') return weeklyEventWindowByStartDay(5, nowMs)
  if (eventId === 'midweek-discount') return weeklyEventWindowByStartDay(1, nowMs)
  return {
    active: false,
    remainingMs: 0,
    endsAt: '',
    startAt: '',
  }
}

export const normalizeWeeklyEventsPayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  const clientDayIndex = (() => {
    const parsed = new Date().getDay()
    return Number.isFinite(parsed) ? clamp(Math.trunc(parsed), 0, 6) : 0
  })()
  const sourceDayIndexRaw = Math.trunc(num(source.dayIndex))
  const sourceDayIndex = sourceDayIndexRaw >= 0 && sourceDayIndexRaw <= 6 ? sourceDayIndexRaw : clientDayIndex
  const sourceSchedule = Array.isArray(source.schedule) && source.schedule.length > 0
    ? source.schedule
    : WEEKLY_EVENT_FALLBACK_SCHEDULE
  const parsedSchedule = sourceSchedule.map((entry, index) => {
    const fallback = WEEKLY_EVENT_FALLBACK_SCHEDULE[index] || WEEKLY_EVENT_FALLBACK_SCHEDULE[0]
    const safeDayIndexRaw = Math.trunc(num(entry?.dayIndex))
    const dayIndex = safeDayIndexRaw >= 0 && safeDayIndexRaw <= 6 ? safeDayIndexRaw : fallback.dayIndex
    const eventTypeRaw = String(entry?.eventType || fallback.eventType || 'standard').trim().toLowerCase()
    const eventType = ['xp', 'discount', 'standard'].includes(eventTypeRaw) ? eventTypeRaw : 'standard'
    const dayName = String(entry?.dayName || WEEKLY_EVENT_DAY_LABELS[dayIndex] || '').trim() || (WEEKLY_EVENT_DAY_LABELS[dayIndex] || '')
    return {
      dayIndex,
      dayName,
      eventType,
      title: String(entry?.title || fallback.title || 'Standart Gün').trim() || 'Standart Gün',
      description: String(entry?.description || fallback.description || '').trim(),
      bonusLabel: String(entry?.bonusLabel || fallback.bonusLabel || 'Standart').trim() || 'Standart',
      isToday: entry?.isToday === true || dayIndex === sourceDayIndex,
      isActive: entry?.isActive === true,
    }
  })
  const scheduleOrder = new Map(WEEKLY_EVENT_DAY_ORDER.map((dayIndex, index) => [dayIndex, index]))
  const schedule = parsedSchedule
    .slice()
    .sort((left, right) => {
      const leftRank = scheduleOrder.has(left.dayIndex) ? scheduleOrder.get(left.dayIndex) : 999
      const rightRank = scheduleOrder.has(right.dayIndex) ? scheduleOrder.get(right.dayIndex) : 999
      return leftRank - rightRank
    })

  const weekendRaw = source.weekendXp && typeof source.weekendXp === 'object' ? source.weekendXp : {}
  const midweekRaw = source.midweekDiscount && typeof source.midweekDiscount === 'object' ? source.midweekDiscount : {}
  const xpMultiplier = Math.max(1, Math.trunc(num(source.xpMultiplier || weekendRaw.multiplier || 1)))
  const costMultiplierRaw = num(source.costMultiplier || midweekRaw.multiplier || 1)
  const costMultiplier = costMultiplierRaw > 0 ? costMultiplierRaw : 1
  const discountPercentFromMultiplier = Math.max(0, Math.round((1 - costMultiplier) * 100))
  const costDiscountPercent = Math.max(
    0,
    Math.trunc(num(source.costDiscountPercent || midweekRaw.discountPercent || discountPercentFromMultiplier)),
  )
  const activeEventIds = Array.isArray(source.activeEventIds)
    ? source.activeEventIds.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []

  return {
    timezone: String(source.timezone || 'Europe/Istanbul').trim() || 'Europe/Istanbul',
    nowAt: String(source.nowAt || '').trim(),
    dayIndex: sourceDayIndex,
    dayName: String(source.dayName || WEEKLY_EVENT_DAY_LABELS[sourceDayIndex] || '').trim() || (WEEKLY_EVENT_DAY_LABELS[sourceDayIndex] || ''),
    xpMultiplier,
    costMultiplier,
    costDiscountPercent,
    activeEventIds,
    weekendXp: {
      id: 'weekend-xp',
      active: weekendRaw.active === true,
      title: String(weekendRaw.title || 'Cumartesi-Pazar Tahsilat XP').trim() || 'Cumartesi-Pazar Tahsilat XP',
      description: String(weekendRaw.description || 'Fabrika ve işletme tahsilatlarında 2x XP kazanılır.').trim(),
      endsAt: String(weekendRaw.endsAt || '').trim(),
      bonusLabel: `2x XP`,
    },
    midweekDiscount: {
      id: 'midweek-discount',
      active: midweekRaw.active === true,
      title: String(midweekRaw.title || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi').trim() || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi',
      description: String(midweekRaw.description || 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.').trim(),
      endsAt: String(midweekRaw.endsAt || '').trim(),
      bonusLabel: `-%${Math.max(0, Math.trunc(num(midweekRaw.discountPercent || costDiscountPercent || 25)))} Gider`,
    },
    schedule,
  }
}

export const listingPriceProfile = (templateId = 'moto-rental') => {
  const safeTemplateId = String(templateId || '').trim()
  return LISTING_PRICE_PROFILE[safeTemplateId] || LISTING_PRICE_PROFILE['moto-rental']
}

export const listingBounds = (basePrice, options = {}) => {
  const safeBase = Math.max(1, Math.trunc(num(basePrice)))
  const requiredLevel = Math.max(1, Math.trunc(num(options?.requiredLevel || 1)))
  const profile = listingPriceProfile(options?.templateId)
  const levelOffset = Math.max(0, requiredLevel - 1)
  const dynamicMinFloor = Math.max(1, profile.minFloor + profile.minStepByLevel * levelOffset)
  const dynamicMaxFloor = Math.max(dynamicMinFloor + 1, profile.maxFloor + profile.maxStepByLevel * levelOffset)
  const minPrice = Math.max(dynamicMinFloor, Math.floor(safeBase * 0.6))
  const maxPrice = Math.max(minPrice + 1, dynamicMaxFloor, Math.floor(safeBase * 4.5))
  return {
    minPrice,
    maxPrice,
    suggestedPrice: clamp(safeBase, minPrice, maxPrice),
  }
}

export const listingCommissionPreview = (priceValue, explicitRate = VEHICLE_MARKET_COMMISSION_RATE) => {
  const safeRate = Math.max(0, num(explicitRate))
  const listingPrice = Math.max(1, Math.trunc(num(priceValue)))
  const commissionAmount = Math.max(0, Math.floor(listingPrice * safeRate))
  const sellerPayout = Math.max(0, listingPrice - commissionAmount)
  const totalCost = listingPrice
  return {
    rate: safeRate,
    amount: commissionAmount,
    totalCost,
    sellerPayout,
  }
}

export const fleetListingBounds = (vehicle, templateId = 'moto-rental') => {
  const buildCash = Math.max(0, Math.trunc(num(vehicle?.cost?.cash || vehicle?.cash || 0)))
  const hourlyIncome = Math.max(0, Math.trunc(num(vehicle?.rentPerHour || 0)))
  const requiredLevel = Math.max(1, Math.trunc(num(vehicle?.requiredLevel || vehicle?.levelRequired || 1)))
  const basePrice = Math.max(1, Math.round(Math.max(buildCash * 0.9, hourlyIncome * 140)))
  return listingBounds(basePrice, {
    templateId: String(templateId || 'moto-rental').trim() || 'moto-rental',
    requiredLevel,
  })
}

export const logisticsListingBounds = (truck) => {
  const purchaseCash = Math.max(0, Math.trunc(num(truck?.cash || 0)))
  const runIncome = Math.max(0, Math.trunc(num(truck?.incomePerRun || truck?.rentPerHour || 0)))
  const requiredLevel = Math.max(1, Math.trunc(num(truck?.levelRequired || truck?.requiredLevel || 1)))
  const basePrice = Math.max(1, Math.round(Math.max(purchaseCash * 0.82, runIncome * 160)))
  return listingBounds(basePrice, {
    templateId: 'logistics',
    requiredLevel,
  })
}

export const scrapReturnAmount = (requiredAmount) => {
  const source = Math.max(0, Math.trunc(num(requiredAmount)))
  if (source <= 0) return 0
  return Math.max(1, Math.round(source * VEHICLE_SCRAP_RETURN_RATE))
}

export const scrapPreviewForEntry = (entry) => ({
  engineKits: scrapReturnAmount(entry?.engineKits ?? entry?.cost?.engineKits ?? 0),
  spareParts: scrapReturnAmount(entry?.spareParts ?? entry?.cost?.spareParts ?? 0),
})

export const formatScrapNotice = (scrapReturn) => {
  const engineKits = Math.max(0, Math.trunc(num(scrapReturn?.engineKits || 0)))
  const spareParts = Math.max(0, Math.trunc(num(scrapReturn?.spareParts || 0)))
  return `+${fmt(engineKits)} Motor | +${fmt(spareParts)} Yedek Parça depoya eklendi.`
}

export function formatLifetimeDetailedTr(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  if (safeMs <= 0) return 'Süresi doldu'
  const totalSeconds = Math.max(1, Math.ceil(safeMs / 1000))
  const monthSeconds = 30 * 24 * 60 * 60
  const daySeconds = 24 * 60 * 60
  const hourSeconds = 60 * 60
  const minuteSeconds = 60

  let remaining = totalSeconds
  const months = Math.floor(remaining / monthSeconds)
  remaining -= months * monthSeconds
  const days = Math.floor(remaining / daySeconds)
  remaining -= days * daySeconds
  const hours = Math.floor(remaining / hourSeconds)
  remaining -= hours * hourSeconds
  const minutes = Math.floor(remaining / minuteSeconds)
  remaining -= minutes * minuteSeconds
  const seconds = remaining

  return `${months} Ay ${days} Gün ${hours} Saat ${minutes} Dakika ${seconds} Saniye`
}

export const resolveVehicleLifetime = (entry, nowMs = Date.now()) => {
  const explicitExpiry = String(entry?.expiresAt || '').trim()
  const referenceIso = explicitExpiry ||
    String(entry?.producedAt || entry?.purchasedAt || entry?.acquiredAt || '').trim()
  const referenceMs = new Date(referenceIso).getTime()
  if (Number.isNaN(referenceMs)) {
    return {
      remainingMs: 0,
      expired: false,
      text: 'Ömür bilgisi yok',
      expiresAt: '',
    }
  }

  const expiresAtMs = explicitExpiry ? referenceMs : referenceMs + VEHICLE_LIFETIME_MS
  const safeNowMs = Math.max(0, Math.trunc(num(nowMs)))
  const remainingMs = Math.max(0, expiresAtMs - safeNowMs)
  return {
    remainingMs,
    expired: remainingMs <= 0,
    text: remainingMs > 0 ? formatLifetimeDetailedTr(remainingMs) : 'Süresi doldu',
    expiresAt: new Date(expiresAtMs).toISOString(),
  }
}

export function marketTabLabel(tab) {
  if (tab === 'buy') return 'Satın Al'
  if (tab === 'sell') return 'Sat'
  if (tab === 'orderbook') return 'Emir Defteri'
  if (tab === 'auction') return 'Açık Artırma'
  return 'Grafik'
}

export function parseSafeDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function chatSnippet(value, max = 76) {
  const text = normalizeMojibakeText(String(value || '')).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

export function normalizeRoleValue(value) {
  const role = String(value || '').trim().toLowerCase()
  if (role === 'admin' || role === 'moderator') return role
  return 'player'
}

export function roleLabelFromValue(role, fallback = '') {
  const safeRole = normalizeRoleValue(role)
  if (safeRole === 'admin') return 'Admin'
  if (safeRole === 'moderator') return 'Moderatör'
  const safeFallback = String(fallback || '').trim()
  return safeFallback || 'Oyuncu'
}

export function normalizeSeasonBadgeMeta(seasonBadge) {
  if (!seasonBadge || typeof seasonBadge !== 'object') return null
  const tierRaw = String(seasonBadge.tier || '').trim().toLowerCase()
  const tier = ['gold', 'silver', 'bronze', 'common'].includes(tierRaw) ? tierRaw : 'gold'
  const label = String(seasonBadge.label || 'Sezon Rozeti').trim() || 'Sezon Rozeti'
  const icon = String(seasonBadge.icon || '').trim()
  if (!icon) return null
  return {
    tier,
    label,
    icon,
    awardedForSeasonKey: String(seasonBadge.awardedForSeasonKey || '').trim(),
    visibleSeasonKey: String(seasonBadge.visibleSeasonKey || '').trim(),
    awardedAt: String(seasonBadge.awardedAt || '').trim(),
  }
}

export function roleBadgeMeta(role, isPremium = false, fallbackLabel = '', seasonBadge = null) {
  const safeRole = normalizeRoleValue(role)
  if (safeRole === 'admin') {
    return {
      className: 'staff-admin',
      tierClass: '',
      text: 'Admin',
      fullText: 'Admin',
      roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
      icon: '/home/icons/v2/nav-uyari.png',
      isStaff: true,
    }
  }
  if (safeRole === 'moderator') {
    return {
      className: 'staff-moderator',
      tierClass: '',
      text: 'Moderat\u00f6r',
      fullText: 'Moderat\u00f6r',
      roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
      icon: '/home/icons/v2/nav-uyari.png',
      isStaff: true,
    }
  }

  const normalizedSeasonBadge = normalizeSeasonBadgeMeta(seasonBadge)
  if (normalizedSeasonBadge) {
    return {
      className: 'season',
      tierClass: normalizedSeasonBadge.tier !== 'gold' ? `is-${normalizedSeasonBadge.tier}` : '',
      text: normalizedSeasonBadge.label,
      fullText: normalizedSeasonBadge.label,
      roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
      icon: normalizedSeasonBadge.icon,
      seasonBadge: normalizedSeasonBadge,
      isStaff: false,
    }
  }

  return {
    className: isPremium ? 'premium' : 'normal',
    tierClass: '',
    text: isPremium ? 'Premium \u00dcye' : 'Standart \u00dcye',
    fullText: isPremium ? 'Premium \u00dcye' : 'Standart \u00dcye',
    roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
    icon: isPremium ? '/home/icons/depot/premium.webp' : '',
    isStaff: false,
  }
}

export function profileStaffRoleMeta(role) {
  const safeRole = normalizeRoleValue(role)
  if (safeRole === 'admin') {
    return { text: 'Admin', className: 'is-admin' }
  }
  if (safeRole === 'moderator') {
    return { text: 'Moderatör', className: 'is-moderator' }
  }
  return null
}

export function _relativeChatTime(value) {
  const date = parseSafeDate(value)
  if (!date) return '--'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMin < 1) return 'Şimdi'
  if (diffMin < 60) return `${diffMin} dk önce`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} saat önce`
  if (diffHour < 48) return 'Dün'

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 8) return `${diffDay} gün önce`

  return date.toLocaleDateString('tr-TR', {
    timeZone: TURKIYE_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function _formatChatDateTime(value) {
  const date = parseSafeDate(value)
  if (!date) return '--.--.-- --:--'
  return date.toLocaleString('tr-TR', {
    timeZone: TURKIYE_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function pruneChatMessages(list) {
  const safeList = Array.isArray(list) ? list.filter((entry) => entry && entry.id) : []
  if (safeList.length <= CHAT_PRUNE_KEEP_COUNT) return safeList
  return safeList.slice(-CHAT_PRUNE_KEEP_COUNT)
}

export function pruneNewsRecords(list, limit = CHAT_NEWS_MAX_ITEMS) {
  const parsedLimit = Number(limit)
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.max(1, Math.trunc(parsedLimit))
    : CHAT_NEWS_MAX_ITEMS
  const safeList = Array.isArray(list) ? list.filter(Boolean) : []
  if (safeList.length <= safeLimit) return safeList
  return safeList
    .map((entry, index) => {
      const parsedCreatedAt = Date.parse(String(entry?.createdAt || ''))
      return {
        entry,
        index,
        createdAtMs: Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : -1,
      }
    })
    .sort((left, right) => {
      if (right.createdAtMs !== left.createdAtMs) return right.createdAtMs - left.createdAtMs
      return right.index - left.index
    })
    .slice(0, safeLimit)
    .map((entry) => entry.entry)
}

export function dedupeFeedEntries(list, limit = CHAT_NEWS_MAX_ITEMS) {
  const parsedLimit = Number(limit)
  const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.max(1, Math.trunc(parsedLimit))
    : CHAT_NEWS_MAX_ITEMS
  const safeList = Array.isArray(list) ? list.filter(Boolean) : []
  const normalizeText = (value) => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr')
  const seen = new Set()
  const deduped = []
  for (const entry of safeList) {
    if (!entry || typeof entry !== 'object') continue
    const createdAt = String(entry?.createdAt || '').trim()
    const createdAtMs = Date.parse(createdAt)
    const timeBucket = Number.isFinite(createdAtMs)
      ? Math.trunc(createdAtMs / 1000)
      : 0
    const source = normalizeText(entry?.source || entry?.kind || entry?.type || '')
    const title = normalizeText(entry?.title || '')
    const detail = normalizeText(
      entry?.detailIntro ?? entry?.message ?? entry?.detail ?? entry?.preview ?? '',
    )
    const key = `${source}|${timeBucket}|${title}|${detail}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(entry)
    if (deduped.length >= safeLimit) break
  }
  return deduped
}

export function isHiddenNewsTransactionKind(kind) {
  return NEWS_HIDDEN_TRANSACTION_KINDS.has(String(kind || '').trim().toLowerCase())
}

export function parseFactoryNewsMeta(rawDetail) {
  const safeDetail = String(rawDetail || '').replace(/\s+/g, ' ').trim()
  if (!safeDetail) {
    return { factoryName: 'Fabrika', fromLevel: null, toLevel: null }
  }

  const normalized = safeDetail
    .replace(/["""']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const nameMatch = normalized.match(
    /^(.+?)\s+(?:sat[ıi]n\s+al[ıi]nd[ıi]|kuruldu|y[üu]kseltmesi|y[üu]kseltme)/i,
  )
  const fallbackName = normalized
    .split(/[.(]/)[0]
    .replace(/\s+/g, ' ')
    .trim()
  const factoryName = String(nameMatch?.[1] || fallbackName || 'Fabrika').trim() || 'Fabrika'

  const levelTransitionMatch = normalized.match(/seviye\s*(\d+)\s*[^0-9]{1,8}\s*(\d+)/i)
  const fromLevel = levelTransitionMatch ? Math.max(1, Math.trunc(num(levelTransitionMatch[1]))) : null
  const toLevel = levelTransitionMatch ? Math.max(1, Math.trunc(num(levelTransitionMatch[2]))) : null

  return {
    factoryName,
    fromLevel: Number.isFinite(fromLevel) ? fromLevel : null,
    toLevel: Number.isFinite(toLevel) ? toLevel : null,
  }
}

export function extractForexRateLabel(rawDetail) {
  const safeDetail = String(rawDetail || '').replace(/\s+/g, ' ').trim()
  if (!safeDetail) return ''
  const explicitMatch = safeDetail.match(/yeni\s+kur\s*:\s*([^.]*)/i)
  if (explicitMatch?.[1]) return explicitMatch[1].trim()
  const fallbackMatch = safeDetail.match(/kur\s*:\s*([^.]*)/i)
  if (fallbackMatch?.[1]) return fallbackMatch[1].trim()
  return ''
}

export function safeIsoDate(value) {
  const parsed = parseSafeDate(value)
  return parsed ? parsed.toISOString() : ''
}

export function normalizeChatRestrictions(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_CHAT_RESTRICTIONS

  const muteRaw = raw.mute && typeof raw.mute === 'object' ? raw.mute : {}
  const blockRaw = raw.block && typeof raw.block === 'object' ? raw.block : {}
  const cooldownRaw = raw.cooldown && typeof raw.cooldown === 'object' ? raw.cooldown : {}

  const mutedUntil = safeIsoDate(muteRaw.mutedUntil)
  const blockedUntil = safeIsoDate(blockRaw.blockedUntil)
  const availableAt = safeIsoDate(cooldownRaw.availableAt)
  const lastSentAt = safeIsoDate(cooldownRaw.lastSentAt)

  return {
    canSend: Boolean(raw.canSend),
    mute: {
      active: Boolean(muteRaw.active),
      reason: String(muteRaw.reason || '').trim(),
      reasonCode: String(muteRaw.reasonCode || '').trim(),
      mutedUntil,
      remainingMs: Math.max(0, Math.trunc(num(muteRaw.remainingMs))),
      strikeCount: Math.max(0, Math.trunc(num(muteRaw.strikeCount))),
      lastViolationAt: safeIsoDate(muteRaw.lastViolationAt),
    },
    block: {
      active: Boolean(blockRaw.active),
      reason: String(blockRaw.reason || '').trim(),
      blockedUntil,
      remainingMs: Math.max(0, Math.trunc(num(blockRaw.remainingMs))),
    },
    cooldown: {
      active: Boolean(cooldownRaw.active),
      remainingMs: Math.max(0, Math.trunc(num(cooldownRaw.remainingMs))),
      waitSeconds: Math.max(0, Math.trunc(num(cooldownRaw.waitSeconds))),
      lastSentAt,
      availableAt,
    },
  }
}

export function normalizeUserModeration(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_USER_MODERATION

  const chatBlockRaw = raw.chatBlock && typeof raw.chatBlock === 'object' ? raw.chatBlock : {}
  const dmBlockRaw = raw.dmBlock && typeof raw.dmBlock === 'object' ? raw.dmBlock : {}
  const muteRaw = raw.mute && typeof raw.mute === 'object' ? raw.mute : {}

  return {
    chatBlock: {
      active: Boolean(chatBlockRaw.active),
      blockedUntil: safeIsoDate(chatBlockRaw.blockedUntil),
      reason: String(chatBlockRaw.reason || '').trim(),
      remainingMs: Math.max(0, Math.trunc(num(chatBlockRaw.remainingMs))),
    },
    dmBlock: {
      active: Boolean(dmBlockRaw.active),
      blockedUntil: safeIsoDate(dmBlockRaw.blockedUntil),
      reason: String(dmBlockRaw.reason || '').trim(),
      remainingMs: Math.max(0, Math.trunc(num(dmBlockRaw.remainingMs))),
    },
    mute: {
      active: Boolean(muteRaw.active),
      mutedUntil: safeIsoDate(muteRaw.mutedUntil),
      reason: String(muteRaw.reason || '').trim(),
      remainingMs: Math.max(0, Math.trunc(num(muteRaw.remainingMs))),
    },
  }
}

export function remainingMsFromIso(isoValue, nowMs) {
  const parsed = parseSafeDate(isoValue)
  if (!parsed) return 0
  return Math.max(0, parsed.getTime() - nowMs)
}

export function fmtRemainShort(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return ''
  const min = Math.ceil(n / 60000)
  if (min < 60) return `${min}dk`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}sa`
  return `${Math.floor(h / 24)}g`
}

export function formatCountdownTr(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  if (safeMs <= 0) return 'hazır'

  const totalSeconds = Math.max(1, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours} saat ${minutes} dakika ${seconds} saniye`
  }
  if (minutes > 0) {
    return `${minutes} dakika ${seconds} saniye`
  }
  return `${seconds} saniye`
}

export function formatLifetimeWithTotal(lifetime) {
  const remaining = String(lifetime?.text || 'Ömür bilgisi yok')
  return `Toplam ${VEHICLE_LIFETIME_MONTHS_TOTAL} Ay | ${remaining}`
}

export function formatCountdownClock(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatCountdownWithDaysTr(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days} gün ${String(hours).padStart(2, '0')} saat ${String(minutes).padStart(2, '0')} dakika ${String(seconds).padStart(2, '0')} saniye`
}

export function formatCollectionCountdown(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} saat`)
  if (minutes > 0) parts.push(`${minutes} dakika`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} saniye`)
  return parts.join(' ').trim() || '0 saniye'
}

export function formatBuildDuration(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} saat`)
  if (minutes > 0) parts.push(`${minutes} dakika`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} saniye`)
  return parts.join(' ').trim() || '0 saniye'
}

export function isGifUrl(value) {
  const safeValue = String(value || '').trim().toLowerCase()
  if (!safeValue) return false
  if (safeValue.startsWith('data:image/gif')) return true
  const clean = safeValue.split('?')[0].split('#')[0]
  return clean.endsWith('.gif')
}

export function formatDateTime(value, options = {}) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  const includeWeekday = options?.includeWeekday === true

  const formatterOptions = {
    timeZone: TURKIYE_TIMEZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }
  if (includeWeekday) {
    formatterOptions.weekday = 'long'
  }

  const formatter = new Intl.DateTimeFormat('tr-TR', formatterOptions)

  const parts = formatter.formatToParts(parsed)
  const values = {}
  for (const part of parts) {
    if (!part?.type || part.type === 'literal') continue
    values[part.type] = part.value
  }

  const day = values.day || '--'
  const month = values.month || '--'
  const year = values.year || '----'
  const weekday = values.weekday || ''
  const hour = values.hour || '00'
  const minute = values.minute || '00'
  const second = values.second || '00'
  const timestamp = `${hour}:${minute}:${second}`

  if (includeWeekday && weekday) {
    return `${day} ${month} ${year} ${weekday} ${timestamp}`
  }
  return `${day} ${month} ${year} ${timestamp}`
}

export function formatAnnouncementDateTime(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed
    .toLocaleString('tr-TR', {
      timeZone: TURKIYE_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '')
}

export function formatHourMinuteTurkey(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString('tr-TR', {
    timeZone: TURKIYE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function normalizeAnnouncementType(value) {
  const safe = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (['update', 'guncelleme', 'güncelleme', 'patch', 'bakim'].includes(safe)) {
    return ANNOUNCEMENT_TYPE_UPDATE
  }
  return ANNOUNCEMENT_TYPE_ANNOUNCEMENT
}

export function announcementTypeMeta(value) {
  const type = normalizeAnnouncementType(value)
  if (type === ANNOUNCEMENT_TYPE_UPDATE) {
    return {
      type,
      className: 'update',
      label: 'G\u00dcNCELLEME',
    }
  }
  return {
    type: ANNOUNCEMENT_TYPE_ANNOUNCEMENT,
    className: 'announcement',
    label: 'DUYURU',
  }
}

export function vehicleEmojiByTier(tier, templateId = 'auto-rental') {
  const safeTemplateId = String(templateId || '').trim()
  if (safeTemplateId === 'moto-rental') {
    return 'MTR'
  }
  if (safeTemplateId === 'logistics') {
    return 'TIR'
  }
  return 'OTO'
}

export function vehicleCostScore(vehicle) {
  return (
    num(vehicle?.cash) +
    num(vehicle?.engineKits) * 1200 +
    num(vehicle?.spareParts) * 900 +
    num(vehicle?.fuel) * 450 +
    num(vehicle?.energy) * 350
  )
}

export function sortByVehicleCostAsc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    vehicleCostScore(a) - vehicleCostScore(b) ||
    num(a?.requiredLevel) - num(b?.requiredLevel) ||
    String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'),
  )
}

export function sortByVehicleIncomeDesc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    num(b?.rentPerHour) - num(a?.rentPerHour) ||
    num(b?.requiredLevel) - num(a?.requiredLevel) ||
    String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'),
  )
}

export function fuelMultiplierByTemplateId(templateId) {
  const safeTemplateId = String(templateId || '').trim()
  return FUEL_MULTIPLIER_BY_TEMPLATE[safeTemplateId] || 1
}

export function fleetFuelUnitsByModelLevel(level, templateId = 'moto-rental', options = {}) {
  const safeLevel = Math.max(1, Math.trunc(num(level)))
  const fuelMultiplier = Math.max(1, Math.trunc(num(fuelMultiplierByTemplateId(templateId))))
  const baseFuelCost = Math.max(2, Math.round(safeLevel * 2 * fuelMultiplier * BUSINESS_EXPENSE_MULTIPLIER))
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : null
  const costMultiplierRaw = num(weeklyEvents?.costMultiplier || 1)
  const costMultiplier = costMultiplierRaw > 0 ? costMultiplierRaw : 1
  if (costMultiplier >= 0.999) return baseFuelCost
  return Math.max(1, Math.round(baseFuelCost * costMultiplier))
}

export function truckCostScore(truck) {
  return (
    num(truck?.cash) +
    num(truck?.engineKits) * 1200 +
    num(truck?.spareParts) * 900
  )
}

export function sortByTruckCostAsc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    truckCostScore(a) - truckCostScore(b) ||
    num(a?.levelRequired) - num(b?.levelRequired) ||
    String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'),
  )
}

export function fleetCollectPreview(entry, inventoryById = {}, options = {}) {
  const multiplier = Math.max(1, Math.trunc(num(options?.multiplier || 1)))
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : null
  const scope = String(options?.scope || 'pending').trim().toLowerCase() === 'hourly'
    ? 'hourly'
    : 'pending'
  const fleetCount = Math.max(0, Math.trunc(num(entry?.fleetCount)))
  const pendingIncome = Math.max(0, Math.floor(num(entry?.pendingIncome)))
  const hourlyIncome = Math.max(0, Math.trunc(num(entry?.hourlyIncome)))
  const hourlyXpFromVehicles = Array.isArray(entry?.vehicles)
    ? entry.vehicles.reduce((sum, vehicle) => sum + Math.max(0, Math.trunc(num(vehicle?.xp))), 0)
    : 0
  const hourlyXpBase = Math.max(0, Math.trunc(num(
    entry?.hourlyXpBase ||
    (hourlyXpFromVehicles > 0 ? hourlyXpFromVehicles : entry?.hourlyXp || 0),
  )))
  const collectableCycles = Math.max(0, Math.trunc(num(entry?.collectableCycles)))
  const estimatedHours = hourlyIncome > 0 ? pendingIncome / hourlyIncome : 0
  const costMultiplierRaw = num(weeklyEvents?.costMultiplier || 1)
  const costMultiplier = costMultiplierRaw > 0 ? costMultiplierRaw : 1
  const xpMultiplierRaw = Math.trunc(num(weeklyEvents?.xpMultiplier || 1))
  const xpMultiplier = clamp(xpMultiplierRaw || 1, 1, 2)
  const incomeBase = scope === 'hourly'
    ? hourlyIncome
    : pendingIncome
  const elapsedHours = scope === 'hourly'
    ? 1
    : (collectableCycles > 0 ? collectableCycles : estimatedHours)
  const fuelNeedPerHour = Math.max(0, Math.trunc(num(entry?.fuelNeedPerHour)))
  const baseFuelNeeded = fuelNeedPerHour > 0 ? Math.max(0, Math.floor(fuelNeedPerHour * elapsedHours)) : 0
  const fuelNeeded = baseFuelNeeded > 0
    ? Math.max(1, Math.round(baseFuelNeeded * costMultiplier))
    : 0
  const fuelItemId = String(entry?.fuelItemId || 'oil')
  const fuelItemName = String(entry?.fuelItemName || 'Yakıt')
  const fuelInventory = options?.fuelInventory && typeof options.fuelInventory === 'object'
    ? options.fuelInventory
    : null
  const fuelAvailable = Math.max(0, Math.trunc(num(
    fuelInventory ? fuelInventory?.[fuelItemId] : inventoryById?.[fuelItemId],
  )))
  const hasEnoughFuel = fuelNeeded <= 0 || fuelAvailable >= fuelNeeded
  const fuelConsumed = hasEnoughFuel ? fuelNeeded : 0
  const fuelCoverage = hasEnoughFuel ? 1 : 0
  const grossAfterFuel = Math.max(0, Math.floor(incomeBase * multiplier * fuelCoverage))
  const xpBase = scope === 'hourly'
    ? hourlyXpBase
    : Math.max(0, Math.floor(hourlyXpBase * elapsedHours))
  const xpBaseWithEvents = Math.max(0, Math.floor(xpBase * xpMultiplier))
  const taxAmount = Math.max(0, Math.floor(grossAfterFuel * COLLECTION_TAX_RATE))
  const netCash = Math.max(0, grossAfterFuel - taxAmount)
  const xpGain = Math.max(0, Math.floor(xpBaseWithEvents * fuelCoverage))

  if (fuelInventory) {
    fuelInventory[fuelItemId] = Math.max(0, fuelAvailable - fuelConsumed)
  }

  return {
    fleetCount,
    pendingIncome,
    hourlyIncome,
    hourlyXp: hourlyXpBase,
    collectableCycles,
    estimatedHours,
    fuelItemId,
    fuelItemName,
    fuelNeeded,
    fuelAvailable,
    fuelConsumed,
    fuelCoverage,
    grossAfterFuel,
    taxAmount,
    netCash,
    xpGain,
  }
}

export function bulkCollectPreview(entries, inventoryById = {}, options = {}) {
  const multiplier = Math.max(1, Math.trunc(num(options?.multiplier || 1)))
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : null
  const fuelInventory = { ...inventoryById }
  const summary = {
    grossCash: 0,
    taxAmount: 0,
    netCash: 0,
    xpGain: 0,
    fuelConsumed: 0,
    fuelConsumedByItem: {},
    collectedCount: 0,
  }

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || entry.unlocked === false) continue
    const preview = fleetCollectPreview(entry, inventoryById, { fuelInventory, multiplier, weeklyEvents })
    if (preview.fleetCount <= 0 || preview.pendingIncome <= 0) continue
    summary.grossCash += preview.grossAfterFuel
    summary.taxAmount += preview.taxAmount
    summary.netCash += preview.netCash
    summary.xpGain += preview.xpGain
    summary.fuelConsumed += preview.fuelConsumed
    if (preview.fuelConsumed > 0) {
      const fuelItemId = String(preview.fuelItemId || 'oil').trim() || 'oil'
      summary.fuelConsumedByItem[fuelItemId] =
        Math.max(0, num(summary.fuelConsumedByItem[fuelItemId])) + preview.fuelConsumed
    }
    summary.collectedCount += 1
  }

  return summary
}

export function messageIconMeta(item) {
  const filter = String(item?.filter || '').trim().toLowerCase()
  if (filter === 'alert') {
    return {
      src: MESSAGE_ICONS.alert,
      fallback: MESSAGE_ICONS.alertFallback,
      label: 'Uyarı',
    }
  }
  if (filter === 'trade') {
    return {
      src: MESSAGE_ICONS.trade,
      fallback: MESSAGE_ICONS.tradeFallback,
      label: 'Ticaret',
    }
  }
  if (filter === 'message') {
    return {
      src: MESSAGE_ICONS.message,
      fallback: MESSAGE_ICONS.messageFallback,
      label: 'Mesaj',
    }
  }
  if (filter === 'other') {
    return {
      src: MESSAGE_ICONS.other,
      fallback: MESSAGE_ICONS.otherFallback,
      label: 'Sistem',
    }
  }
  return {
    src: MESSAGE_ICONS.default,
    fallback: MESSAGE_ICONS.defaultFallback,
    label: 'Bildirim',
  }
}

export function normalizeMessageUnreadCounters(value) {
  const unread = value && typeof value === 'object' ? value : {}
  const rawDirect = Number(unread.direct ?? unread.message ?? 0)
  const rawNotifications = Number(unread.notifications ?? unread.other ?? 0)
  const direct = Number.isFinite(rawDirect) && rawDirect > 0 ? Math.max(0, Math.trunc(rawDirect)) : 0
  const notifications = Number.isFinite(rawNotifications) && rawNotifications > 0
    ? Math.max(0, Math.trunc(rawNotifications))
    : 0
  const total = direct + notifications
  return {
    direct,
    notifications,
    total,
  }
}

export function replaceCommonMojibake(value) {
  let output = String(value ?? '')
  for (const [broken, fixed] of MOJIBAKE_REPLACEMENTS.entries()) {
    output = output.split(broken).join(fixed)
  }
  return output
}

export function normalizeMojibakeText(value) {
  const safeValue = String(value ?? '')
  if (!safeValue || !MOJIBAKE_TEXT_PATTERN.test(safeValue)) return safeValue

  if (typeof TextDecoder === 'function') {
    try {
      const bytes = new Uint8Array(safeValue.length)
      for (let i = 0; i < safeValue.length; i += 1) {
        bytes[i] = safeValue.charCodeAt(i) & 0xff
      }
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (decoded && decoded !== safeValue) {
        return replaceCommonMojibake(decoded)
      }
    } catch {}
  }

  return replaceCommonMojibake(safeValue)
}

export function createCostAvailabilityRow({ label, icon, required, available }) {
  const safeRequired = Math.max(0, Math.trunc(num(required)))
  const safeAvailable = Math.max(0, Math.trunc(num(available)))
  const enough = safeAvailable >= safeRequired
  const missing = Math.max(0, safeRequired - safeAvailable)
  return {
    label,
    icon,
    required: safeRequired,
    available: safeAvailable,
    enough,
    missing,
    value: `${fmt(safeRequired)} / ${fmt(safeAvailable)}`,
    statusHint: enough ? 'Yeterli' : `Eksik: ${fmt(missing)}`,
  }
}

export function fleetOrderCostRows(vehicle, walletNow, inventoryById = {}) {
  const rows = [
    createCostAvailabilityRow({
      label: 'Nakit Maliyet',
      icon: '/home/icons/depot/cash.webp',
      required: vehicle?.cash || 0,
      available: walletNow,
    }),
  ]

  const engineKitRequired = Math.max(0, Math.trunc(num(vehicle?.engineKits || 0)))
  if (engineKitRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Motor Maliyeti',
      icon: '/home/icons/depot/spare-parts.webp',
      required: engineKitRequired,
      available: inventoryById['engine-kit'] || 0,
    }))
  }

  const sparePartsRequired = Math.max(0, Math.trunc(num(vehicle?.spareParts || 0)))
  if (sparePartsRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Yedek Parça Maliyeti',
      icon: '/home/icons/depot/yedekparca.webp',
      required: sparePartsRequired,
      available: inventoryById['spare-parts'] || 0,
    }))
  }

  const cementRequired = Math.max(0, Math.trunc(num(vehicle?.cement || 0)))
  if (cementRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Çimento Maliyeti',
      icon: '/home/icons/depot/cement.webp',
      required: cementRequired,
      available: inventoryById.cement || 0,
    }))
  }

  const timberRequired = Math.max(0, Math.trunc(num(vehicle?.timber || 0)))
  if (timberRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Kereste Maliyeti',
      icon: '/home/icons/depot/timber.webp',
      required: timberRequired,
      available: inventoryById.timber || 0,
    }))
  }

  const brickRequired = Math.max(0, Math.trunc(num(vehicle?.brick || 0)))
  if (brickRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Tuğla Maliyeti',
      icon: '/home/icons/depot/brick.webp',
      required: brickRequired,
      available: inventoryById.brick || 0,
    }))
  }

  return rows
}

export function logisticsOrderCostRows(truck, walletNow, inventoryById = {}) {
  return [
    createCostAvailabilityRow({
      label: 'Nakit Maliyet',
      icon: '/home/icons/depot/cash.webp',
      required: truck?.cash || 0,
      available: walletNow,
    }),
    createCostAvailabilityRow({
      label: 'Motor Maliyeti',
      icon: '/home/icons/depot/spare-parts.webp',
      required: truck?.engineKits || 0,
      available: inventoryById['engine-kit'] || 0,
    }),
    createCostAvailabilityRow({
      label: 'Yedek Parça Maliyeti',
      icon: '/home/icons/depot/yedekparca.webp',
      required: truck?.spareParts || 0,
      available: inventoryById['spare-parts'] || 0,
    }),
  ]
}

export function normalizeRequiredCostLabel(label) {
  if (label === 'Nakit Maliyet') return 'Gereken Para'
  if (label === 'Motor Maliyeti') return 'Gereken Motor'
  if (label === 'Yedek Parça Maliyeti') return 'Gereken Yedek Parça'
  if (label === 'Çimento Maliyeti') return 'Gereken Çimento'
  if (label === 'Kereste Maliyeti') return 'Gereken Kereste'
  if (label === 'Tuğla Maliyeti') return 'Gereken Tuğla'
  return label
}

export function toDisplayOrderCostRows(rows, options = {}) {
  const requiredOnly = options?.requiredOnly !== false
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    label: normalizeRequiredCostLabel(row?.label),
    value: requiredOnly ? fmt(row?.required || 0) : String(row?.value || ''),
  }))
}

export function isPageVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

export function resolveMobileViewportWidth() {
  if (typeof window === 'undefined') return MOBILE_LAYOUT_MAX_WIDTH
  const viewportWidth = Number(window.innerWidth || MOBILE_LAYOUT_MAX_WIDTH)
  return Math.min(MOBILE_LAYOUT_MAX_WIDTH, Math.max(320, viewportWidth))
}

export function preloadCriticalAssets(sources) {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return () => {}
  const uniqueSources = Array.from(new Set((Array.isArray(sources) ? sources : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)))
  const buffered = []
  for (const src of uniqueSources) {
    const image = new Image()
    image.decoding = 'async'
    image.src = src
    buffered.push(image)
  }
  return () => {
    buffered.length = 0
  }
}
