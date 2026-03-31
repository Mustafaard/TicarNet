import { useEffect, useRef, useState } from 'react'
import { num, fmt, fmtCountdown, formatCountdownWithDaysTr } from './utils.js'

export function Chart({ points = [] }) {
  if (!points.length) return <p className="empty">Grafik verisi yok.</p>
  const vals = points.map(num)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const rg = Math.max(1, max - min)
  const w = 320
  const h = 170
  const d = vals
    .map((v, i) => {
      const x = i * (w / Math.max(1, vals.length - 1))
      const y = h - ((v - min) / rg) * (h - 12) - 6
      return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart">
        <path d={`${d} L ${w} ${h} L 0 ${h} Z`} className="chart-area" />
        <path d={d} className="chart-line" />
      </svg>
      <div className="chart-meta">
        <span>Min {fmt(min)}</span>
        <span>Maks {fmt(max)}</span>
      </div>
    </div>
  )
}

export function AssetMetric({ icon, label, value, status = '', statusHint = '' }) {
  const safeStatus = status === 'ok' || status === 'fail' ? status : ''
  const metricClassName = safeStatus ? `asset-metric is-${safeStatus}` : 'asset-metric'
  const statusLabel = safeStatus === 'ok' ? 'Yeterli' : safeStatus === 'fail' ? 'Yetersiz' : ''
  const statusIcon = safeStatus === 'ok' ? '✓' : safeStatus === 'fail' ? '×' : ''
  const isLevelMetric = String(label || '').toLocaleLowerCase('tr-TR').includes('seviye')

  return (
    <div className={metricClassName}>
      <span className="asset-metric-icon">
        <img src={icon} alt={label} loading="lazy" />
      </span>
      <div className="asset-metric-copy">
        <small>{label}</small>
        <strong className={isLevelMetric ? 'level-text' : ''}>{value}</strong>
      </div>
      {safeStatus ? (
        <span className={`asset-metric-state is-${safeStatus}`} aria-label={statusHint || statusLabel} title={statusHint || statusLabel}>
          {statusIcon}
        </span>
      ) : null}
    </div>
  )
}

export function ForexCountdownText({ nextUpdateMs, onElapsed }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const elapsedFiredRef = useRef(false)

  useEffect(() => {
    elapsedFiredRef.current = false
    setNowMs(Date.now())
  }, [nextUpdateMs])

  useEffect(() => {
    if (!Number.isFinite(nextUpdateMs) || typeof window === 'undefined') return undefined
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [nextUpdateMs])

  useEffect(() => {
    if (!Number.isFinite(nextUpdateMs) || typeof onElapsed !== 'function') return
    if (nowMs < nextUpdateMs || elapsedFiredRef.current) return
    elapsedFiredRef.current = true
    onElapsed()
  }, [nextUpdateMs, nowMs, onElapsed])

  if (!Number.isFinite(nextUpdateMs)) return '--:--:--'
  return fmtCountdown(Math.max(0, nextUpdateMs - nowMs))
}

export function BankCountdownText({ active, initialRemainingMs, onElapsed }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, Math.trunc(num(initialRemainingMs || 0))))
  const elapsedFiredRef = useRef(false)

  useEffect(() => {
    elapsedFiredRef.current = false
    setRemainingMs(Math.max(0, Math.trunc(num(initialRemainingMs || 0))))
  }, [active, initialRemainingMs])

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined
    const intervalId = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [active])

  useEffect(() => {
    if (!active || typeof onElapsed !== 'function' || elapsedFiredRef.current) return
    if (remainingMs > 0) return
    elapsedFiredRef.current = true
    onElapsed()
  }, [active, onElapsed, remainingMs])

  if (!active) return '--'
  if (remainingMs <= 0) return 'Vade doldu'
  return formatCountdownWithDaysTr(remainingMs)
}
