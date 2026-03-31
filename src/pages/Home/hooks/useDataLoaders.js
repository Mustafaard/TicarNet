import { useCallback, useRef } from 'react'
import {
  normalizeUserModeration,
} from '../utils.js'
import { getGameOverview, getProfileState } from '../../../services/api/profileApi.js'
import { getMarketState } from '../../../services/api/marketApi.js'
import { getMissionsState } from '../../../services/api/missionApi.js'
import { getBusinessesState, getFactoriesState, getMinesState } from '../../../services/api/inventoryApi.js'
import { getBankState, getForexState } from '../../../services/api/financeApi.js'

export function useDataLoaders({
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
}) {
const loadMarksRef = useRef({
  overview: 0,
  market: 0,
  forex: 0,
  business: 0,
  factories: 0,
  mines: 0,
  missions: 0,
  profile: 0,
})

const shouldSkipLoad = useCallback((key, minIntervalMs, force) => {
  if (force) return false
  const now = Date.now()
  const lastAt = Number(loadMarksRef.current[key] || 0)
  return now - lastAt < minIntervalMs
}, [])

const markLoad = useCallback((key) => {
  loadMarksRef.current[key] = Date.now()
}, [])

const loadOverview = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('overview', 2500, force)) return true
  if (overviewLoadInFlightRef.current) return
  overviewLoadInFlightRef.current = true
  try {
    const response = await getGameOverview()
    if (!response?.success) return fail(response, 'Ana sayfa verileri alınamadı.')
    const oldLv = overviewLevelRef.current
    const newLv = response?.profile?.levelInfo?.level || 0
    if (newLv > oldLv) {
      setLevelFx(true)
      clearTimeout(fxTimer.current)
      fxTimer.current = window.setTimeout(() => setLevelFx(false), 520)
    }
    overviewLevelRef.current = newLv
    setOverview(response)
    markLoad('overview')
    setMessageCenter((prev) => ({
      ...prev,
      moderation: normalizeUserModeration(response?.profile?.moderation),
    }))
    return true
  } finally {
    overviewLoadInFlightRef.current = false
  }
}, [fail, fxTimer, markLoad, overviewLevelRef, overviewLoadInFlightRef, setLevelFx, setMessageCenter, setOverview, shouldSkipLoad])

const loadMarket = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('market', 3500, force)) return true
  const response = await getMarketState()
  if (!response?.success) return fail(response, 'Pazar verileri alınamadı.')
  setMarket(response)
  markLoad('market')
  setHistory((prev) => {
    const next = { ...prev }
    for (const item of response.items || []) {
      next[item.id] = [...(next[item.id] || []), item.price].slice(-32)
    }
    return next
  })
  if (!chartItemId && response.items?.length) setChartItemId(response.items[0].id)
  if (!bookItemId && response.items?.length) setBookItemId(response.items[0].id)
  if (!priceAlertForm.itemId && response.items?.length) {
    setPriceAlertForm((prev) => ({ ...prev, itemId: response.items[0].id }))
  }
  if (!auctionForm.itemId && response.items?.length) {
    setAuctionForm((prev) => ({ ...prev, itemId: response.items[0].id }))
  }
  return true
}, [
  auctionForm.itemId,
  bookItemId,
  chartItemId,
  fail,
  markLoad,
  priceAlertForm.itemId,
  setAuctionForm,
  setBookItemId,
  setChartItemId,
  setHistory,
  setMarket,
  setPriceAlertForm,
  shouldSkipLoad,
])

const loadForex = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('forex', 5000, force)) return true
  const response = await getForexState()
  if (!response?.success) return fail(response, 'Döviz piyasası verileri alınamadı.')
  setForex(response)
  markLoad('forex')
  return response
}, [fail, markLoad, setForex, shouldSkipLoad])

const loadBank = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  const nowMs = Date.now()
  if (!force && (nowMs - bankLastLoadedAtRef.current) < 900) {
    return bankStateRef.current
  }
  if (bankLoadInFlightRef.current) {
    return bankStateRef.current
  }
  bankLoadInFlightRef.current = true
  try {
    const response = await getBankState()
    if (!response?.success) return fail(response, 'Banka verileri alınamadı.')
    const nextBank = response?.bank || null
    setBankState(nextBank)
    bankStateRef.current = nextBank
    bankLastLoadedAtRef.current = Date.now()
    markLoad('bank')
    if (Array.isArray(nextBank?.termOptions) && nextBank.termOptions.length > 0) {
      const defaultDays = String(nextBank.termOptions[0]?.days || '1')
      setBankForm((prev) => {
        const safeCurrent = String(prev?.termDays || '').trim()
        const matched = nextBank.termOptions.some((entry) => String(entry?.days) === safeCurrent)
        if (matched) return prev
        return { ...prev, termDays: defaultDays }
      })
    }
    return nextBank
  } finally {
    bankLoadInFlightRef.current = false
  }
}, [bankLastLoadedAtRef, bankLoadInFlightRef, bankStateRef, fail, markLoad, setBankForm, setBankState])

const loadBusiness = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('business', 5000, force)) return true
  const response = await getBusinessesState()
  if (!response?.success) return fail(response, 'İşletme verileri alınamadı.')
  setBusiness(response)
  markLoad('business')
  return true
}, [fail, markLoad, setBusiness, shouldSkipLoad])

const loadFactories = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('factories', 4500, force)) return true
  const response = await getFactoriesState()
  if (!response?.success) return fail(response, 'Fabrika verileri alınamadı.')
  setFactories(response)
  markLoad('factories')
  return true
}, [fail, markLoad, setFactories, shouldSkipLoad])

const loadMines = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('mines', 4500, force)) return true
  const response = await getMinesState()
  if (!response?.success) return fail(response, 'Maden verileri alınamadı.')
  setMines(response)
  markLoad('mines')
  return true
}, [fail, markLoad, setMines, shouldSkipLoad])

const loadMissions = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('missions', 7000, force)) return true
  const response = await getMissionsState()
  if (!response?.success) return fail(response, 'Görev verileri alınamadı.')
  setMissions(response)
  markLoad('missions')
  return true
}, [fail, markLoad, setMissions, shouldSkipLoad])

const loadProfile = useCallback(async (options = {}) => {
  const force = Boolean(options?.force)
  if (shouldSkipLoad('profile', 4000, force)) return true
  const response = await getProfileState()
  if (!response?.success) return fail(response, 'Profil verileri alınamadı.')
  setProfile(response)
  markLoad('profile')
  const currentUserId = String(user?.id || '').trim()
  const avatarUrl = String(response?.profile?.avatar?.url || '').trim()
  if (currentUserId) {
    setChatUsers((prev) =>
      prev.map((entry) => (
        entry?.userId === currentUserId
          ? { ...entry, avatarUrl }
          : entry
      )),
    )
  }
  return true
}, [fail, markLoad, setChatUsers, setProfile, shouldSkipLoad, user?.id])

  return {
    loadBank,
    loadBusiness,
    loadFactories,
    loadForex,
    loadMarket,
    loadMines,
    loadMissions,
    loadOverview,
    loadProfile,
  }
}
