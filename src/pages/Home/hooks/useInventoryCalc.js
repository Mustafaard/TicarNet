import { useMemo } from 'react'
import {
  DEPOT_CATALOG,
  FACTORY_CARD_ORDER,
  FLEET_CARD_META,
} from '../constants.js'
import {
  bulkCollectPreview,
  factoryItemMeta,
  factoryPurchaseRowsFromFactory,
  fleetCollectPreview,
  fmt,
  formatCollectionCountdown,
  fuelItemMeta,
  normalizeRoleValue,
  normalizeSeasonBadgeMeta,
  num,
  profileStaffRoleMeta,
  remainingMsFromIso,
} from '../utils.js'

export function useInventoryCalc({
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
  nextCompanyUnlock,
  overview,
  premiumActive,
  premiumBoostActive,
  premiumMultiplier,
  profile,
  profileModalData,
  profileModalUserId,
  role,
  selectedBusiness,
  unlockedBusinesses,
  upgradeCostValue,
  upgradeCurrentLevel,
  upgradeNextLevel,
  user,
  weeklyEventsRuntimeState,
}) {
const inventoryById = useMemo(() => {
  const map = {}
  const mergeRows = (rows) => {
    for (const entry of rows || []) {
      const itemId = String(entry?.itemId || '').trim()
      if (!itemId) continue
      const quantity = Math.max(0, Math.trunc(num(entry.quantity)))
      map[itemId] = Math.max(quantity, Math.max(0, Math.trunc(num(map[itemId] || 0))))
    }
  }
  mergeRows(profile?.profile?.inventory)
  mergeRows(market?.inventory)
  return map
}, [market, profile])

const factoryRows = (Array.isArray(factories?.factories) ? factories.factories : [])
  .slice()
  .sort((left, right) => {
    const leftId = String(left?.id || '').trim()
    const rightId = String(right?.id || '').trim()
    const leftIndex = FACTORY_CARD_ORDER.indexOf(leftId)
    const rightIndex = FACTORY_CARD_ORDER.indexOf(rightId)
    const safeLeft = leftIndex === -1 ? FACTORY_CARD_ORDER.length : leftIndex
    const safeRight = rightIndex === -1 ? FACTORY_CARD_ORDER.length : rightIndex
    if (safeLeft !== safeRight) return safeLeft - safeRight
    return String(left?.name || '').localeCompare(String(right?.name || ''), 'tr')
  })
  .map((entry) => {
    const safeId = String(entry?.id || '').trim()
    const owned = entry?.owned === true
    const level = Math.max(0, Math.trunc(num(entry?.level || 0)))
    const hasLevelCap = entry?.hasLevelCap === true
    const FACTORY_MAX_LEVEL = 200
    const maxLevel = hasLevelCap ? FACTORY_MAX_LEVEL : 0
    const isBuilding = entry?.isBuilding === true
    const isUpgrading = entry?.upgrading?.active === true
    const buildRemainingByIso = remainingMsFromIso(entry?.buildEndsAt || '', liveNowMs)
    const buildRemainingMs = isBuilding
      ? Math.max(0, buildRemainingByIso > 0 ? buildRemainingByIso : Math.trunc(num(entry?.buildRemainingMs || 0)))
      : 0
    const upgradeRemainingByIso = remainingMsFromIso(entry?.upgrading?.endsAt || '', liveNowMs)
    const upgradeRemainingMs = isUpgrading
      ? Math.max(0, upgradeRemainingByIso > 0 ? upgradeRemainingByIso : Math.trunc(num(entry?.upgrading?.remainingMs || 0)))
      : 0
    const collectRemainingByIso = remainingMsFromIso(entry?.collectReadyAt || '', liveNowMs)
    const collectRemainingMs = owned && !isBuilding
      ? Math.max(0, collectRemainingByIso > 0 ? collectRemainingByIso : Math.trunc(num(entry?.collectRemainingMs || 0)))
      : 0
    const outputMeta = factoryItemMeta(entry?.outputItemId || '')
    const energyMeta = factoryItemMeta(entry?.energyItemId || 'energy')
    const buildDurationMinutes = Math.max(1, Math.trunc(num(entry?.buildDurationMinutes || 30)))
    const speedupDiamondCost = Math.max(0, Math.trunc(num(entry?.upgrading?.speedupDiamondCost || 0)))
    const xpPerCollect = Math.max(0, Math.trunc(num(entry?.xpPerCollect || 0)))
    const nextUpgradeOutputPerCollect = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.outputPerCollect || 0)))
    const nextUpgradeEnergyCostPerCollect = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.energyCostPerCollect || 0)))
    const nextUpgradeXpPerCollect = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.xpPerCollect || 0)))
    const nextUpgradeCostCash = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.costCash || 0)))
    const missingUpgradeCash = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.missingCash || 0)))
    const upgradeCostRows = Object.entries(entry?.nextUpgrade?.costByItem || {})
      .map(([itemId, amount]) => ({
        itemId,
        amount: Math.max(0, Math.trunc(num(amount || 0))),
        missing: Math.max(0, Math.trunc(num(entry?.nextUpgrade?.missingByItem?.[itemId] || 0))),
        available: Math.max(0, Math.trunc(num(inventoryById[itemId] || 0))),
        meta: factoryItemMeta(itemId),
      }))
      .filter((row) => row.amount > 0)
    const purchaseCostRows = Object.entries(entry?.purchaseCostByItem || {})
      .map(([itemId, amount]) => ({
        itemId,
        amount: Math.max(0, Math.trunc(num(amount || 0))),
        missing: Math.max(0, Math.trunc(num(entry?.purchaseMissingByItem?.[itemId] || 0))),
        available: Math.max(0, Math.trunc(num(inventoryById[itemId] || 0))),
        meta: factoryItemMeta(itemId),
      }))
      .filter((row) => row.amount > 0)

    return {
      ...entry,
      id: safeId,
      owned,
      level,
      hasLevelCap,
      maxLevel,
      isBuilding,
      isUpgrading,
      buildRemainingMs,
      upgradeRemainingMs,
      collectRemainingMs,
      buildDurationMinutes,
      outputMeta,
      energyMeta,
      xpPerCollect,
      nextUpgradeOutputPerCollect,
      nextUpgradeEnergyCostPerCollect,
      nextUpgradeXpPerCollect,
      nextUpgradeCostCash,
      missingUpgradeCash,
      speedupDiamondCost,
      purchaseCostRows,
      upgradeCostRows,
    }
  })

const factoriesOwnedCount = factoryRows.filter((entry) => entry.owned).length
const factoriesReadyCount = factoryRows.filter((entry) => entry.canCollectNow).length
const factoriesEnergyBlockedCount = factoryRows.filter(
  (entry) => entry.owned && !entry.isBuilding && !entry.isUpgrading && entry.collectRemainingMs <= 0 && entry.collectEnergyMissing > 0,
).length
const factoriesUpgradingCount = factoryRows.filter((entry) => entry.isUpgrading).length
const factoryBulkPreview = useMemo(() => {
  const ready = factoryRows.filter((entry) => entry.canCollectNow)
  const byItem = {}
  const energyByItem = {}
  let totalXp = 0
  ready.forEach((f) => {
    const itemId = String(f?.outputItemId || '').trim()
    if (itemId) {
      byItem[itemId] = (byItem[itemId] || 0) + Math.max(0, Math.trunc(num(f?.outputPerCollect || 0)))
    }
    totalXp += Math.max(0, Math.trunc(num(f?.xpPerCollect || 0)))
    const eId = String(f?.energyItemId || 'energy').trim()
    if (eId) {
      energyByItem[eId] = (energyByItem[eId] || 0) + Math.max(0, Math.trunc(num(f?.energyCostPerCollect || 0)))
    }
  })
  const mult = premiumActive && premiumMultiplier > 1 ? premiumMultiplier : 1
  const byItem2x = {}
  Object.entries(byItem).forEach(([id, qty]) => { byItem2x[id] = Math.max(0, Math.trunc(qty * mult)) })
  return { byItem: byItem2x, totalXp, energyByItem, count: ready.length, is2x: mult > 1 }
}, [factoryRows, premiumActive, premiumMultiplier])
const buildingFactoryRows = factoryRows
  .filter((entry) => entry.isBuilding)
  .slice()
  .sort((left, right) => Math.max(0, num(left?.buildRemainingMs || 0)) - Math.max(0, num(right?.buildRemainingMs || 0)))
const _activeBuildingFactory = buildingFactoryRows[0] || null
const upgradingFactoryRows = factoryRows
  .filter((entry) => entry.isUpgrading)
  .slice()
  .sort((left, right) => Math.max(0, num(left?.upgradeRemainingMs || 0)) - Math.max(0, num(right?.upgradeRemainingMs || 0)))
const _activeUpgradingFactory = upgradingFactoryRows[0] || null
const factorySlotsUsed = buildingFactoryRows.length + upgradingFactoryRows.length
const maxFactorySlots = premiumActive ? 2 : 1
const canStartAnotherFactoryBuild = factorySlotsUsed < maxFactorySlots
const canStartAnotherFactoryUpgrade = factorySlotsUsed < maxFactorySlots
const ownedFactoryRows = factoryRows.filter((entry) => entry.owned)
const lockedFactoryRows = factoryRows.filter((entry) => !entry.owned && !entry.isBuilding)
const factoryPurchaseModal = lockedFactoryRows.find(
  (entry) => String(entry?.id || '').trim() === String(factoryPurchaseModalId || '').trim(),
) || null
const factoryPurchaseModalRows = factoryPurchaseRowsFromFactory(factoryPurchaseModal)
const factoryPurchaseModalMissingRows = factoryPurchaseModalRows.filter((row) => row.missing > 0)
const factoryPurchaseBusyKey = factoryPurchaseModal ? `factory-buy:${factoryPurchaseModal.id}` : ''
const factoryCollectModal = factoryRows.find((f) => String(f?.id || '') === String(factoryCollectModalId || '').trim()) || null
const factoryCollectModalBusyKey = factoryCollectModal ? `factory-collect:${factoryCollectModal.id}` : ''
const factoryCollectModalBlockedReason = factoryCollectModal
  ? (factoryCollectModal.collectRemainingMs > 0
    ? `Tahsilat henüz hazır değil. Kalan süre: ${formatCollectionCountdown(factoryCollectModal.collectRemainingMs)}`
    : factoryCollectModal.collectEnergyMissing > 0
      ? `${factoryCollectModal.energyMeta?.label || 'Enerji'} yetersiz. Eksik: ${fmt(factoryCollectModal.collectEnergyMissing)}`
      : '')
  : ''
const factoryUpgradeModal = factoryRows.find((f) => String(f?.id || '') === String(factoryUpgradeModalId || '').trim()) || null
const factoryUpgradeModalBlockedBySlot = Boolean(
  factoryUpgradeModal &&
  !factoryUpgradeModal.isUpgrading &&
  !canStartAnotherFactoryUpgrade,
)
const factoryUpgradeModalMissingRows = factoryUpgradeModal
  ? [
    ...(Math.max(0, Math.trunc(num(factoryUpgradeModal.missingUpgradeCash || 0))) > 0
      ? [
        {
          key: 'cash',
          label: 'Nakit',
          missing: Math.max(0, Math.trunc(num(factoryUpgradeModal.missingUpgradeCash || 0))),
        },
      ]
      : []),
    ...((Array.isArray(factoryUpgradeModal.upgradeCostRows) ? factoryUpgradeModal.upgradeCostRows : [])
      .map((row, index) => ({
        row,
        index,
      }))
      .filter(({ row }) => Math.max(0, Math.trunc(num(row?.missing || 0))) > 0)
      .map(({ row, index }) => ({
        key: `${String(row?.itemId || row?.meta?.label || 'resource')}-${index}`,
        label: String(row?.meta?.label || row?.itemId || 'Kaynak').trim(),
        missing: Math.max(0, Math.trunc(num(row?.missing || 0))),
      }))),
  ]
  : []
const factoryUpgradeModalHasMissingCost = factoryUpgradeModalMissingRows.length > 0
const profileModalIsSelf = Boolean(profileModalUserId && user?.id && String(profileModalUserId) === String(user.id))
const profileModalRoleValue = profileModalIsSelf
  ? normalizeRoleValue(role)
  : normalizeRoleValue(profileModalData?.role || 'player')
const profileModalPremiumActive = profileModalIsSelf ? premiumActive : Boolean(profileModalData?.premium?.active)
const profileModalStaffRole = profileStaffRoleMeta(profileModalRoleValue)
const profileModalSeasonBadge = normalizeSeasonBadgeMeta(profileModalData?.seasonBadge || null)
const profileModalDisplayName = String(profileModalData?.displayName || profileModalData?.username || 'Oyuncu').trim() || 'Oyuncu'
const profileModalUsername = String(profileModalData?.username || '').trim()
const profileModalShowHandle = Boolean(
  profileModalUsername &&
  profileModalUsername.toLocaleLowerCase('tr') !== profileModalDisplayName.toLocaleLowerCase('tr'),
)
const profileModalMembershipLabel = profileModalPremiumActive ? 'Premium Üye' : 'Standart Üye'
const factoryPurchaseModalCanBuyNow = Boolean(
  factoryPurchaseModal &&
  canStartAnotherFactoryBuild &&
  factoryPurchaseModal.canPurchaseNow,
)

const collectModalBusiness = unlockedBusinesses.find(
  (entry) => String(entry?.id || '').trim() === String(collectTargetBusinessId || '').trim(),
) || null
const collectModalPreviewBase = fleetCollectPreview(collectModalBusiness, inventoryById, {
  multiplier: 1,
  weeklyEvents: weeklyEventsRuntimeState,
})
const collectModalPreview = fleetCollectPreview(
  collectModalBusiness,
  inventoryById,
  {
    multiplier: premiumBoostActive ? premiumMultiplier : 1,
    weeklyEvents: weeklyEventsRuntimeState,
  },
)
const collectModalFuelMeta = fuelItemMeta(collectModalPreview.fuelItemId || collectModalBusiness?.fuelItemId || 'oil')
const collectModalMeta = FLEET_CARD_META[collectModalBusiness?.templateId] || null
const selectedCollectPreview = fleetCollectPreview(
  selectedBusiness,
  inventoryById,
  {
    multiplier: premiumBoostActive ? premiumMultiplier : 1,
    weeklyEvents: weeklyEventsRuntimeState,
  },
)
const bulkPreview = bulkCollectPreview(unlockedBusinesses, inventoryById, {
  multiplier: 1,
  weeklyEvents: weeklyEventsRuntimeState,
})
const bulkPreview2x = bulkCollectPreview(unlockedBusinesses, inventoryById, {
  multiplier: premiumMultiplier,
  weeklyEvents: weeklyEventsRuntimeState,
})
const logisticsPreview = logistics?.collectPreview || {}
const logisticsPreview2x = logistics?.collectPreview2x || {}
const logisticsPreviewActive = premiumBoostActive ? logisticsPreview2x : logisticsPreview
const logisticsCollectNet = Math.max(0, Math.trunc(num(logisticsPreviewActive?.netCash || 0)))
const collectModalFuelEnough =
  Math.max(0, Math.trunc(num(collectModalPreview.fuelNeeded))) <= 0 ||
  Math.max(0, Math.trunc(num(collectModalPreview.fuelAvailable))) >= Math.max(0, Math.trunc(num(collectModalPreview.fuelNeeded)))
const logisticsPreviewFuelEnough =
  Math.max(0, Math.trunc(num(logisticsPreviewActive.fuelNeeded || 0))) <= 0 ||
  Math.max(0, Math.trunc(num(inventoryById[String(logisticsPreviewActive.fuelItemId || 'oil')] || 0))) >= Math.max(0, Math.trunc(num(logisticsPreviewActive.fuelNeeded || 0)))

const totalBulkIncome = Math.max(0, num(bulkPreview.grossCash) + num(logisticsPreview.grossCash || 0))
const bulkFuelByItem = bulkPreview?.fuelConsumedByItem && typeof bulkPreview.fuelConsumedByItem === 'object'
  ? bulkPreview.fuelConsumedByItem
  : {}
const hasPropertyFleet = unlockedBusinesses.some(
  (entry) => String(entry?.templateId || '').trim() === 'property-rental' && Math.max(0, Math.trunc(num(entry?.fleetCount || 0))) > 0,
)
const totalBulkOilFuel = Math.max(0, num(bulkFuelByItem.oil) + num(logisticsPreview.fuelConsumed || 0))
const totalBulkEnergyFuel = Math.max(0, num(bulkFuelByItem.energy))
const totalBulkXp = Math.max(0, num(bulkPreview.xpGain) + num(logisticsPreview.xpGain || 0))
const totalBulkTax = Math.max(0, num(bulkPreview.taxAmount) + num(logisticsPreview.taxAmount || 0))
const totalBulkNet = Math.max(0, num(bulkPreview.netCash) + num(logisticsPreview.netCash || 0))

const totalBulkNet2x = Math.max(0, num(bulkPreview2x.netCash) + num(logisticsPreview2x.netCash || 0))

const totalBulkCount = Math.max(
  0,
  Math.trunc(num(bulkPreview.collectedCount)) + Math.trunc(num(logisticsPreview.collectedCount || 0)),
)
const ctaUpgradePrimary = companyUpgrade?.maxReached
  ? `Lv ${fmt(upgradeCurrentLevel)} MAX`
  : `Lv ${fmt(upgradeCurrentLevel)}→${fmt(upgradeNextLevel)}`
const ctaUpgradeSecondary = companyUpgrade?.maxReached
  ? 'Seviye tamam'
  : mustBuyNextUnlockFirst && nextCompanyUnlock
    ? `Önce ${nextCompanyUnlock.name}`
    : `Nakit ${fmt(upgradeCostValue)}`
const ctaBulkPrimary = totalBulkCount > 0
  ? `${premiumBoostActive ? '2x ' : ''}+${fmt(premiumBoostActive ? totalBulkNet2x : totalBulkNet)} net`
  : 'Toplanacak gelir yok'
const ctaBulkSecondary = totalBulkCount > 0
  ? `Hazır ${fmt(totalBulkCount)}`
  : 'Saat bekleniyor'
const ctaSetupPrimary = nextCompanyUnlock
  ? String(nextCompanyUnlock.name || 'İş Kur')
  : 'Tüm alanlar açık'
const ctaSetupSecondary = nextCompanyUnlock
  ? `Maliyet ${fmt(nextCompanyUnlock.cost || 0)}`
  : 'Yeni alan yok'

const warehouseCards = useMemo(
  () =>
    DEPOT_CATALOG.map((item) => {
      const sourceIds = Array.isArray(item.sourceIds) && item.sourceIds.length
        ? item.sourceIds
        : [item.id]
      const fromInventory = sourceIds.reduce((total, sourceId) => total + Math.max(0, num(inventoryById[sourceId])), 0)
      const walletAmount = item.fromWallet ? Math.max(0, Math.trunc(num(overview?.profile?.wallet))) : 0
      const reputationAmount = item.fromReputation ? Math.max(0, Math.trunc(num(overview?.profile?.reputation))) : 0
      const quantity = Math.max(
        fromInventory,
        walletAmount,
        reputationAmount,
        Math.max(0, Math.trunc(num(item.baseQuantity))),
      )
      return {
        ...item,
        quantity,
      }
    }),
  [inventoryById, overview?.profile?.wallet, overview?.profile?.reputation],
)

const warehouseDisplayCards = useMemo(
  () =>
    warehouseCards.filter((item) => {
      const itemId = String(item?.id || '').trim()
      const shouldHide =
        item?.fromWallet === true ||
        item?.fromReputation === true ||
        itemId === 'cash' ||
        itemId === 'diamond'
      return !shouldHide
    }),
  [warehouseCards],
)

const warehouseTotalQuantity = useMemo(
  () =>
    warehouseCards.reduce(
      (sum, item) => {
        const itemId = String(item?.id || '').trim()
        const shouldExclude =
          item?.fromWallet === true ||
          item?.fromReputation === true ||
          itemId === 'cash' ||
          itemId === 'diamond'
        if (shouldExclude) return sum
        return sum + Math.max(0, Math.trunc(num(item.quantity || 0)))
      },
      0,
    ),
  [warehouseCards],
)

  return {
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
  }
}
