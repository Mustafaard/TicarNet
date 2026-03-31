import { useCallback, useEffect, useMemo } from 'react'
import {
  FOREX_CHART_RANGE_OPTIONS,
  FOREX_TRADE_FEE_RATE,
  FOREX_TRADE_MAX_QUANTITY,
  FOREX_TRADE_MAX_QUANTITY_DIGITS,
  FOREX_TRADE_MAX_TOTAL_QUANTITY,
} from '../constants.js'
import {
  clamp,
  num,
} from '../utils.js'

export function useForexChart({
  activeTabRef,
  busy,
  forex,
  forexBoundaryRetryTimerRef,
  forexChartRangeId,
  forexHoverPendingRef,
  forexHoverRafRef,
  forexTradeForm,
  forexViewportWidth,
  loadBank,
  loadForex,
  overview,
  setForexChartHoverIndex,
}) {
const forexMarket = useMemo(() => {
  if (forex?.market && typeof forex.market === 'object') return forex.market
  return null
}, [forex])

const forexHolding = useMemo(() => {
  if (forex?.holding && typeof forex.holding === 'object') return forex.holding
  return {
    quantity: 0,
    costTry: 0,
    marketValueTry: 0,
    unrealizedPnlTry: 0,
    unrealizedPnlPercent: 0,
    realizedPnlTry: 0,
  }
}, [forex])

const forexTradeQuantityRaw = String(forexTradeForm.quantity || '').replace(/[^\d]/g, '')
const forexTradeQuantity = Math.max(0, Math.trunc(num(forexTradeQuantityRaw)))
const forexTradeQuantityTooHigh = (
  forexTradeQuantityRaw.length > FOREX_TRADE_MAX_QUANTITY_DIGITS
  || forexTradeQuantity > FOREX_TRADE_MAX_QUANTITY
)
const forexTradeSide = String(forexTradeForm.side || '').trim().toLowerCase() === 'sell'
  ? 'sell'
  : 'buy'
const forexTradeRate = forexTradeSide === 'sell'
  ? num(forexMarket?.sellRate)
  : num(forexMarket?.buyRate)
const forexTradeRateValid = Number.isFinite(forexTradeRate) && forexTradeRate > 0
const forexTradeGrossPreview = forexTradeRateValid
  ? Math.max(0, Math.round(forexTradeQuantity * forexTradeRate))
  : 0
const forexTradeFeePreview = forexTradeGrossPreview > 0
  ? Math.max(0, Math.round(forexTradeGrossPreview * FOREX_TRADE_FEE_RATE))
  : 0
const forexTradeTotalPreview = forexTradeSide === 'buy'
  ? forexTradeGrossPreview + forexTradeFeePreview
  : Math.max(0, forexTradeGrossPreview - forexTradeFeePreview)
const forexWalletTry = Math.max(0, Math.trunc(num(overview?.profile?.wallet || 0)))
const forexHoldingQuantity = Math.max(0, Math.trunc(num(forexHolding?.quantity || 0)))
const forexHoldingCostTry = Math.max(0, num(forexHolding?.costTry || 0))
const forexHoldingMarketValueTry = Math.max(
  0,
  num(forexHolding?.marketValueTry || (forexHoldingQuantity * Math.max(0, num(forexMarket?.sellRate || 0)))),
)
const forexHoldingUnrealizedPnlTry = num(forexHolding?.unrealizedPnlTry || (forexHoldingMarketValueTry - forexHoldingCostTry))
const forexHoldingUnrealizedPnlPercent = forexHoldingCostTry > 0
  ? ((forexHoldingUnrealizedPnlTry / forexHoldingCostTry) * 100)
  : 0
const forexHoldingAverageBuyRate = forexHoldingQuantity > 0
  ? (forexHoldingCostTry / forexHoldingQuantity)
  : 0
const forexHoldingRemainingCapacity = Math.max(0, FOREX_TRADE_MAX_TOTAL_QUANTITY - forexHoldingQuantity)
const forexTradeInsufficientHoldings = (
  forexTradeSide === 'sell'
  && (forexHoldingQuantity + 0.000001) < forexTradeQuantity
)
const forexTradeExceedsTotalHoldingCap = (
  forexTradeSide === 'buy'
  && forexTradeQuantity > forexHoldingRemainingCapacity
)
const forexTradeInsufficientWallet = (
  forexTradeSide === 'buy'
  && forexTradeTotalPreview > forexWalletTry
)
const forexTradeMaxQuantity = forexTradeSide === 'buy'
  ? (
    forexTradeRateValid
      ? Math.max(
        0,
        Math.min(
          FOREX_TRADE_MAX_QUANTITY,
          forexHoldingRemainingCapacity,
          Math.trunc(forexWalletTry / Math.max(1, forexTradeRate * (1 + FOREX_TRADE_FEE_RATE))),
        ),
      )
      : 0
  )
  : Math.max(0, Math.min(FOREX_TRADE_MAX_QUANTITY, forexHoldingQuantity))
const forexTradeSubmitBlocked = (
  Boolean(busy)
  || !forexMarket
  || !forexTradeRateValid
  || forexTradeQuantity < 1
  || forexTradeQuantityTooHigh
  || forexTradeInsufficientHoldings
  || forexTradeExceedsTotalHoldingCap
  || forexTradeInsufficientWallet
)
const forexDayChangePercent = num(forexMarket?.dayChangePercent || 0)
const forexTrendDirection = forexDayChangePercent >= 0 ? 'up' : 'down'
const forexSpreadTry = Math.max(
  0,
  Math.round(Math.max(0, num(forexMarket?.buyRate || forexMarket?.rate || 0) - num(forexMarket?.sellRate || 0))),
)
const forexIsMobileView = forexViewportWidth <= 760
const forexChartInteractionEnabled = true
const forexChartRange = FOREX_CHART_RANGE_OPTIONS.find((option) => option.id === forexChartRangeId) || FOREX_CHART_RANGE_OPTIONS[1]

const formatForexChartAxisLabel = (value, rangeSeconds = 60) => {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--'
  const year = dt.getFullYear()
  const month = `${dt.getMonth() + 1}`.padStart(2, '0')
  const day = `${dt.getDate()}`.padStart(2, '0')
  const hour = `${dt.getHours()}`.padStart(2, '0')
  const minute = `${dt.getMinutes()}`.padStart(2, '0')
  const second = `${dt.getSeconds()}`.padStart(2, '0')
  if (forexIsMobileView) {
    if (rangeSeconds <= (24 * 60 * 60)) {
      return `${hour}:${minute}`
    }
    if (rangeSeconds <= (3 * 24 * 60 * 60)) {
      return `${day}.${month} ${hour}:${minute}`
    }
    return `${day}.${month}`
  }
  if (rangeSeconds <= 3600) {
    return `${hour}:${minute}:${second}`
  }
  if (rangeSeconds <= (3 * 24 * 60 * 60)) {
    return `${day}.${month} ${hour}:${minute}`
  }
  return `${year}-${month}-${day} ${hour}:${minute}`
}

const formatForexChartUpdatedAt = (value) => {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--:--:--'
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, '0')}-${`${dt.getDate()}`.padStart(2, '0')} ${`${dt.getHours()}`.padStart(2, '0')}:${`${dt.getMinutes()}`.padStart(2, '0')}:${`${dt.getSeconds()}`.padStart(2, '0')}`
}
const formatForexChartUpdatedAtCompact = (value) => {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return '--.-- --:--'
  return `${`${dt.getDate()}`.padStart(2, '0')}.${`${dt.getMonth() + 1}`.padStart(2, '0')} ${`${dt.getHours()}`.padStart(2, '0')}:${`${dt.getMinutes()}`.padStart(2, '0')}`
}
const forexLastUpdateRaw = String(forexMarket?.updatedAt || '').trim()
const forexLastUpdateLabel = forexLastUpdateRaw
  ? (forexIsMobileView ? formatForexChartUpdatedAtCompact(forexLastUpdateRaw) : formatForexChartUpdatedAt(forexLastUpdateRaw))
  : '--'
const forexUpdateIntervalMs = Math.max(1000, Math.trunc(num(forexMarket?.updateIntervalMs || (3 * 60 * 60 * 1000))))
const forexNextUpdateAtRaw = String(forexMarket?.nextUpdateAt || '').trim()
const forexNextUpdateMsFromServer = new Date(forexNextUpdateAtRaw).getTime()
const forexLastUpdatedMs = new Date(String(forexMarket?.updatedAt || '').trim()).getTime()
const forexNextUpdateMs = Number.isFinite(forexNextUpdateMsFromServer)
  ? forexNextUpdateMsFromServer
  : (Number.isFinite(forexLastUpdatedMs) ? (forexLastUpdatedMs + forexUpdateIntervalMs) : NaN)
const forexNextUpdateLabel = Number.isFinite(forexNextUpdateMs)
  ? (
    forexIsMobileView
      ? formatForexChartUpdatedAtCompact(new Date(forexNextUpdateMs).toISOString())
      : formatForexChartUpdatedAt(new Date(forexNextUpdateMs).toISOString())
  )
  : '--'
const handleForexCountdownElapsed = useCallback(() => {
  if (activeTabRef.current !== 'forex') return
  const previousUpdatedAt = String(forexLastUpdateRaw || '').trim()
  const maxAttempts = 8
  let attempts = 0

  const refreshUntilAdvanced = async () => {
    if (activeTabRef.current !== 'forex') return
    attempts += 1
    const response = await loadForex()
    const nextUpdatedAt = String(response?.market?.updatedAt || '').trim()
    if (nextUpdatedAt && nextUpdatedAt !== previousUpdatedAt) return
    if (attempts >= maxAttempts || typeof window === 'undefined') return
    clearTimeout(forexBoundaryRetryTimerRef.current)
    forexBoundaryRetryTimerRef.current = window.setTimeout(() => {
      void refreshUntilAdvanced()
    }, 2500)
  }

  clearTimeout(forexBoundaryRetryTimerRef.current)
  void refreshUntilAdvanced()
}, [activeTabRef, forexBoundaryRetryTimerRef, forexLastUpdateRaw, loadForex])

const handleBankCountdownElapsed = useCallback(() => {
  if (activeTabRef.current !== 'bank') return
  void loadBank({ force: true })
}, [activeTabRef, loadBank])

const buildSmoothForexPath = useCallback((points) => {
  if (!Array.isArray(points) || points.length === 0) return ''
  if (points.length === 1) {
    const point = points[0]
    return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] || p2

    const cp1x = p1.x + ((p2.x - p0.x) / 6)
    const cp1y = p1.y + ((p2.y - p0.y) / 6)
    const cp2x = p2.x - ((p3.x - p1.x) / 6)
    const cp2y = p2.y - ((p3.y - p1.y) / 6)

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  return d
}, [])

const buildFallbackForexHistory = useCallback((baseRateValue, anchorMs = 0) => {
  const safeBaseRate = Math.max(0.0001, num(baseRateValue) || 3750000)
  const pointCount = 72
  const fallbackStepMs = 3 * 60 * 60 * 1000
  const safeAnchorMs = Number.isFinite(anchorMs) ? anchorMs : 0
  const seed = Math.trunc(safeBaseRate * 1000)
  const pseudoNoise = (index, salt = 0) => {
    const x = Math.sin(((index + 1) * 12.9898) + ((seed + salt) * 78.233)) * 43758.5453
    return x - Math.floor(x)
  }

  const rows = []
  let rate = safeBaseRate
  let velocity = 0

  for (let index = 0; index < pointCount; index += 1) {
    const volRegime = 0.00022 + (pseudoNoise(index, 7) * 0.0007)
    const drift = (pseudoNoise(index, 19) - 0.5) * 0.00035
    const shock = (pseudoNoise(index, 31) - 0.5) * volRegime
    velocity = (velocity * 0.64) + shock + drift
    rate = Math.max(0.0001, rate * (1 + velocity))
    rows.push({
      at: new Date(safeAnchorMs - ((pointCount - 1 - index) * fallbackStepMs)).toISOString(),
      rate: Math.round(rate * 10000) / 10000,
    })
  }

  return rows
}, [])

const forexChartData = useMemo(() => {
  const rawSource = Array.isArray(forexMarket?.history) ? forexMarket.history.slice(-500) : []
  const fallbackAnchorMs = new Date(String(forexMarket?.updatedAt || '').trim()).getTime()
  const safeFallbackAnchorMs = Number.isFinite(fallbackAnchorMs) ? fallbackAnchorMs : 0
  const normalizedSource = rawSource
    .map((entry, index) => {
      const rate = Math.max(0.0001, num(entry?.rate ?? entry?.close ?? entry?.price))
      const rawAt = String(entry?.at || entry?.time || entry?.ts || '').trim()
      const parsedMs = new Date(rawAt).getTime()
      const atMs = Number.isFinite(parsedMs)
        ? parsedMs
        : (safeFallbackAnchorMs - ((rawSource.length - 1 - index) * (3 * 60 * 60 * 1000)))
      return {
        at: new Date(atMs).toISOString(),
        rate,
      }
    })
    .filter((entry) => Number.isFinite(entry.rate) && entry.rate > 0)

  const seedSource = normalizedSource.length >= 8
    ? normalizedSource
    : buildFallbackForexHistory(forexMarket?.rate, safeFallbackAnchorMs)
  if (!seedSource.length) return null
  const rangeSeconds = Math.max(60, Math.trunc(num(forexChartRange?.seconds || 60)))
  const latestMs = new Date(seedSource[seedSource.length - 1]?.at || '').getTime()
  const cutoffMs = Number.isFinite(latestMs) ? latestMs - (rangeSeconds * 1000) : 0
  const rangeSource = seedSource.filter((entry) => new Date(entry?.at || '').getTime() >= cutoffMs)
  const source = rangeSource.length >= 8
    ? rangeSource
    : seedSource.slice(-Math.max(8, Math.trunc(num(forexChartRange?.candleCount || 24))))
  if (!source.length) return null

  const maxPointCount = clamp(
    Math.trunc(num(forexChartRange?.candleCount || 24)) + 8,
    16,
    72,
  )
  const sampleStep = Math.max(1, Math.ceil(source.length / maxPointCount))
  const sampled = source.filter((_, index) => (index % sampleStep) === 0 || index === source.length - 1)
  if (sampled.length < 2) return null

  const width = 696
  const height = 332
  const padLeft = forexIsMobileView ? 66 : 90
  const padRight = forexIsMobileView ? 18 : 24
  const padTop = forexIsMobileView ? 14 : 18
  const padBottom = forexIsMobileView ? 94 : 104
  const innerWidth = width - (padLeft + padRight)
  const innerHeight = height - (padTop + padBottom)
  const rates = sampled.map((entry) => Math.max(0.0001, num(entry?.rate)))
  const minDataRate = Math.min(...rates)
  const maxDataRate = Math.max(...rates)
  let minRate = minDataRate
  let maxRate = maxDataRate
  const axisSpanRaw = Math.abs(maxRate - minRate)
  if (axisSpanRaw < 0.0001) {
    const delta = Math.max(0.4, maxRate * 0.0035)
    minRate -= delta
    maxRate += delta
  } else {
    const padding = Math.max(0.18, axisSpanRaw * 0.14)
    minRate -= padding
    maxRate += padding
  }
  minRate = Math.max(0.0001, minRate)
  maxRate = Math.max(minRate + 0.0001, maxRate)

  const chartFloorY = height - padBottom
  const rateSpan = Math.max(0.0001, maxRate - minRate)
  const rateToY = (value) => padTop + (((maxRate - Math.max(0.0001, num(value))) / rateSpan) * innerHeight)

  const points = sampled.map((entry, index) => {
    const x = padLeft + ((index / Math.max(1, sampled.length - 1)) * innerWidth)
    const rate = Math.max(0.0001, num(entry?.rate))
    const y = rateToY(rate)
    const previousRate = index > 0 ? Math.max(0.0001, num(sampled[index - 1]?.rate)) : rate
    const changePercent = previousRate > 0 ? ((rate - previousRate) / previousRate) * 100 : 0
    return {
      x,
      y,
      rate,
      at: entry?.at || '',
      changePercent,
    }
  })
  if (!points.length) return null

  const smoothLinePath = buildSmoothForexPath(points)
  const firstPoint = points[0]
  const latestPoint = points[points.length - 1]
  const smoothAreaPath = smoothLinePath
    ? `${smoothLinePath} L ${latestPoint.x.toFixed(2)} ${chartFloorY.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${chartFloorY.toFixed(2)} Z`
    : ''

  const xTickCount = forexIsMobileView
    ? (rangeSeconds >= (6 * 24 * 60 * 60) ? 5 : 4)
    : (rangeSeconds >= (6 * 24 * 60 * 60)
      ? 8
      : (rangeSeconds >= (24 * 60 * 60) ? 7 : 6))
  const xTickIndexes = Array.from(
    new Set(
      Array.from({ length: xTickCount }, (_, index) => (
        Math.round((points.length - 1) * (index / Math.max(1, xTickCount - 1)))
      )),
    ),
  ).filter((index) => index >= 0 && index < points.length)

  const xTicks = xTickIndexes
    .map((pointIndex, tickIndex) => {
      const point = points[pointIndex]
      if (!point) return null
      const total = xTickIndexes.length
      let x = point.x
      let anchor = 'end'
      if (forexIsMobileView) {
        if (tickIndex === 0) {
          x = point.x + 4
          anchor = 'start'
        } else if (tickIndex === (total - 1)) {
          x = point.x - 2
          anchor = 'end'
        } else {
          anchor = 'middle'
        }
      }
      return {
        x,
        label: formatForexChartAxisLabel(point.at, rangeSeconds),
        anchor,
      }
    })
    .filter(Boolean)

  const yTickCount = forexIsMobileView ? 5 : 6
  const yTicks = Array.from({ length: yTickCount }, (_, index) => {
    const ratio = index / Math.max(1, yTickCount - 1)
    const rate = maxRate - (rateSpan * ratio)
    const y = padTop + (innerHeight * ratio)
    return { y, rate }
  })

  const minPoint = points.reduce((lowest, point) => (point.rate < lowest.rate ? point : lowest), points[0])
  const maxPoint = points.reduce((highest, point) => (point.rate > highest.rate ? point : highest), points[0])
  const latestPointRef = points[points.length - 1]

  const currentRate = latestPointRef?.rate || 0
  const startRate = points[0]?.rate || 0
  const changePercent = startRate > 0 ? ((currentRate - startRate) / startRate) * 100 : 0

  const firstMs = new Date(source[0]?.at).getTime()
  const lastMs = new Date(source[source.length - 1]?.at).getTime()
  const spanSeconds = Number.isFinite(firstMs) && Number.isFinite(lastMs)
    ? Math.max(1, Math.round((lastMs - firstMs) / 1000))
    : Math.max(1, source.length - 1)

  const latestLabelWidth = forexIsMobileView ? 118 : 142
  const latestLabelHeight = forexIsMobileView ? 26 : 30
  const latestLabelX = clamp(
    latestPointRef.x - (latestLabelWidth / 2),
    padLeft + 6,
    width - padRight - latestLabelWidth - 6,
  )
  const latestLabelY = clamp(
    latestPointRef.y - latestLabelHeight - 10,
    padTop + 4,
    chartFloorY - latestLabelHeight - 4,
  )

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    chartFloorY,
    smoothLinePath,
    smoothAreaPath,
    points,
    latestPriceLineY: latestPointRef.y,
    xTicks,
    yTicks,
    minPoint: minPoint ? { x: minPoint.x, y: minPoint.y } : null,
    maxPoint: maxPoint ? { x: maxPoint.x, y: maxPoint.y } : null,
    latestPoint: latestPointRef ? { x: latestPointRef.x, y: latestPointRef.y } : null,
    latestLabelX,
    latestLabelY,
    latestLabelWidth,
    latestLabelHeight,
    summary: {
      currentRate,
      minRate: minDataRate,
      maxRate: maxDataRate,
      changePercent,
      spanSeconds,
      updatedAt: source[source.length - 1]?.at || '',
    },
  }
}, [buildFallbackForexHistory, buildSmoothForexPath, forexChartRange, forexIsMobileView, forexMarket, formatForexChartAxisLabel])

useEffect(() => {
  setForexChartHoverIndex(-1)
  if (typeof window !== 'undefined' && forexHoverRafRef.current) {
    window.cancelAnimationFrame(forexHoverRafRef.current)
    forexHoverRafRef.current = 0
  }
  forexHoverPendingRef.current = null
}, [forexChartRangeId, forexMarket?.id])

useEffect(() => {
  if (!forexChartData?.points?.length) {
    setForexChartHoverIndex(-1)
    return
  }
  setForexChartHoverIndex((prev) => (prev >= 0 && prev < forexChartData.points.length ? prev : -1))
}, [forexChartData])

const setForexHoverByClientX = useCallback((clientX, currentTarget) => {
  if (!forexChartInteractionEnabled || !forexChartData?.points?.length || !currentTarget) return
  const rect = currentTarget.getBoundingClientRect()
  if (!rect.width) return
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
  const cursorX = forexChartData.padLeft + ((forexChartData.width - (forexChartData.padLeft + forexChartData.padRight)) * ratio)
  const points = forexChartData.points
  let low = 0
  let high = points.length - 1
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const midX = num(points[mid]?.x)
    if (midX < cursorX) {
      low = mid + 1
    } else {
      high = mid
    }
  }
  let bestIndex = low
  if (bestIndex > 0) {
    const prevX = num(points[bestIndex - 1]?.x)
    const nextX = num(points[bestIndex]?.x)
    if (Math.abs(prevX - cursorX) <= Math.abs(nextX - cursorX)) {
      bestIndex -= 1
    }
  }
  setForexChartHoverIndex((prev) => (prev === bestIndex ? prev : bestIndex))
}, [forexChartData, forexChartInteractionEnabled, setForexChartHoverIndex])

const queueForexTouchHoverByClientX = useCallback((clientX, currentTarget) => {
  if (!forexIsMobileView || !forexChartInteractionEnabled || !forexChartData?.points?.length || !currentTarget) return
  if (typeof window === 'undefined') return
  forexHoverPendingRef.current = { clientX, currentTarget }
  if (forexHoverRafRef.current) return
  forexHoverRafRef.current = window.requestAnimationFrame(() => {
    forexHoverRafRef.current = 0
    const pending = forexHoverPendingRef.current
    if (!pending) return
    setForexHoverByClientX(pending.clientX, pending.currentTarget)
  })
}, [forexChartData, forexChartInteractionEnabled, forexHoverPendingRef, forexHoverRafRef, forexIsMobileView, setForexHoverByClientX])

  return {
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
  }
}
