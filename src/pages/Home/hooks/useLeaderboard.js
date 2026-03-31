import { useCallback, useEffect, useMemo } from 'react'
import {
  clamp,
  num,
} from '../utils.js'

export function useLeaderboard({
  leaderboardMetricSafe,
  leaderboardPage,
  leaderboardSearchQuery,
  leaderboardTick,
  league,
  openProfileModal,
  profileModalData,
  profileModalUserId,
  profileTab,
  setLeaderboardHighlightKey,
  setLeaderboardPage,
  setLeaderboardSearchError,
  setLeaderboardSearchOpen,
  setLeaderboardTick,
  tab,
  user,
}) {
const leaderboardPageSize = 100

const buildLeaderboardRows = useCallback((metric) => {
  const safeMetric = metric === 'level' ? 'level' : (metric === 'season' ? 'season' : 'cash')
  const rawRows = Array.isArray(league?.[safeMetric])
    ? league[safeMetric]
    : (Array.isArray(league?.standings?.[safeMetric]) ? league.standings[safeMetric] : [])

  return rawRows
    .map((entry, index) => {
      const walletValue = Math.max(0, Math.trunc(num(entry?.wallet || 0)))
      const levelValue = Math.max(
        1,
        Math.trunc(
          num(
            entry?.level ||
            entry?.levelInfo?.level ||
            (safeMetric === 'level' ? entry?.points : 1),
          ),
        ),
      )
      const seasonValue = Math.max(
        0,
        Math.trunc(
          num(
            entry?.seasonPoints ??
            entry?.seasonScore ??
            entry?.points ??
            entry?.score ??
            entry?.season ??
            0,
          ),
        ),
      )
      const value = safeMetric === 'level'
        ? levelValue
        : (safeMetric === 'season' ? seasonValue : walletValue)
      return {
        rank: Math.max(1, Math.trunc(num(entry?.rank || (index + 1)))),
        userId: String(entry?.userId || '').trim(),
        username: String(entry?.username || '').trim() || 'Oyuncu',
        displayName: String(entry?.displayName || '').trim(),
        avatarUrl: String(entry?.avatar?.url || entry?.avatarUrl || '').trim(),
        seasonBadge: entry?.seasonBadge || null,
        wallet: walletValue,
        level: levelValue,
        seasonPoints: seasonValue,
        value,
        isMe: Boolean(entry?.isMe) || String(entry?.userId || '').trim() === String(user?.id || '').trim(),
      }
    })
    .sort((left, right) => {
      const primary = Number(right.value || 0) - Number(left.value || 0)
      if (primary !== 0) return primary
      return String(left.username || '').localeCompare(String(right.username || ''), 'tr')
    })
    .map((mapped, mappedIndex) => ({
      ...mapped,
      rank: mappedIndex + 1,
    }))
}, [league, user?.id])

const leaderboardRowsSeason = useMemo(() => buildLeaderboardRows('season'), [buildLeaderboardRows])
const leaderboardRowsResolved = leaderboardRowsSeason
const leaderboardMeRow = leaderboardRowsResolved.find((entry) => entry.isMe) || null
const leagueSeasonPrizes = league?.seasonPrizes && typeof league.seasonPrizes === 'object'
  ? league.seasonPrizes
  : {}
const leagueSeasonRewardCatalog = Array.isArray(leagueSeasonPrizes.rewardCatalog)
  ? leagueSeasonPrizes.rewardCatalog
  : []
const leagueSeasonRewardCatalogResolved = useMemo(() => (
  leagueSeasonRewardCatalog.length
    ? leagueSeasonRewardCatalog
    : [
        {
          rank: 1,
          tier: 'gold',
          chestLabel: 'Altın Sandık',
          badgeLabel: 'Sezon Şampiyonu',
          badgeIcon: '/home/icons/leaderboard/badge-season-1.webp',
          chestIcon: '/home/icons/leaderboard/chest-gold.webp',
          cashAmount: 10000000,
          resourceAmount: 750000,
          rewardMultiplier: 1,
          rewardMultiplierMax: 5,
        },
        {
          rank: 2,
          tier: 'silver',
          chestLabel: 'Gümüş Sandık',
          badgeLabel: 'Sezon İkincisi',
          badgeIcon: '/home/icons/leaderboard/badge-season-2.webp',
          chestIcon: '/home/icons/leaderboard/chest-silver.webp',
          cashAmount: 5000000,
          resourceAmount: 375000,
          rewardMultiplier: 1,
          rewardMultiplierMax: 5,
        },
        {
          rank: 3,
          tier: 'bronze',
          chestLabel: 'Bronz Sandık',
          badgeLabel: 'Sezon Üçüncüsü',
          badgeIcon: '/home/icons/leaderboard/badge-season-3.webp',
          chestIcon: '/home/icons/leaderboard/chest-bronze.webp',
          cashAmount: 2500000,
          resourceAmount: 187500,
          rewardMultiplier: 1,
          rewardMultiplierMax: 5,
        },
        {
          rank: 4,
          rankMin: 4,
          rankMax: 25,
          tier: 'common',
          chestLabel: 'Sıradan Sandık',
          chestIcon: '/home/icons/leaderboard/chestsiradan.webp',
          cashAmount: 1000000,
          resourceAmount: 50000,
          rewardMultiplier: 1,
          rewardMultiplierMax: 5,
        },
      ]
), [leagueSeasonRewardCatalog])
const leagueSeasonRewardForRank = useCallback((rankValue) => {
  const safeRank = Math.max(1, Math.trunc(num(rankValue || 1)))
  let rangedFallback = null
  for (const entry of leagueSeasonRewardCatalogResolved) {
    const rankMin = Math.max(
      1,
      Math.trunc(num(entry?.rankMin ?? entry?.rank ?? 1)),
    )
    const rankMax = Math.max(
      rankMin,
      Math.trunc(num(entry?.rankMax ?? entry?.rank ?? rankMin)),
    )
    if (safeRank < rankMin || safeRank > rankMax) continue
    if (rankMin === rankMax && safeRank === rankMin) return entry
    rangedFallback = entry
  }
  return rangedFallback
}, [leagueSeasonRewardCatalogResolved])
const leaguePendingSeasonChests = useMemo(() => {
  const rows = Array.isArray(leagueSeasonPrizes.pendingChests)
    ? leagueSeasonPrizes.pendingChests
    : []
  return [...rows].sort((left, right) => {
    const leftRank = Math.max(1, Math.trunc(num(left?.rank || 1)))
    const rightRank = Math.max(1, Math.trunc(num(right?.rank || 1)))
    if (leftRank !== rightRank) return leftRank - rightRank
    const leftAwardedAtMs = Date.parse(left?.awardedAt || '') || 0
    const rightAwardedAtMs = Date.parse(right?.awardedAt || '') || 0
    return leftAwardedAtMs - rightAwardedAtMs
  })
}, [leagueSeasonPrizes.pendingChests])
const leagueOpenedSeasonChests = useMemo(() => {
  const rows = Array.isArray(leagueSeasonPrizes.openedChests)
    ? leagueSeasonPrizes.openedChests
    : []
  return [...rows].sort(
    (left, right) =>
      (Date.parse(right?.openedAt || right?.awardedAt || '') || 0) -
      (Date.parse(left?.openedAt || left?.awardedAt || '') || 0),
  )
}, [leagueSeasonPrizes.openedChests])
useEffect(() => {
  if (tab !== 'profile' || profileTab !== 'leaderboard') return undefined
  const id = window.setInterval(() => setLeaderboardTick((t) => (t + 1) % 1_000_000), 1000)
  return () => window.clearInterval(id)
}, [tab, profileTab])

const leaderboardSeasonReset = useMemo(() => {
  void leaderboardTick
  const tz = 'Europe/Istanbul'
  const fmtParts = (d) => {
    const parts = new Intl.DateTimeFormat('tr-TR', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(d)
    const get = (type) => parts.find((p) => p.type === type)?.value
    return {
      year: Number(get('year') || 0),
      month: Number(get('month') || 1),
      day: Number(get('day') || 1),
      hour: Number(get('hour') || 0),
      minute: Number(get('minute') || 0),
      second: Number(get('second') || 0),
    }
  }
  const nowParts = fmtParts(new Date())
  const nowPseudo = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, nowParts.hour, nowParts.minute, nowParts.second)
  const nextMonthYear = nowParts.month === 12 ? nowParts.year + 1 : nowParts.year
  const nextMonth = nowParts.month === 12 ? 1 : nowParts.month + 1
  const targetPseudo = Date.UTC(nextMonthYear, nextMonth - 1, 1, 0, 0, 0)
  const diffMs = Math.max(0, targetPseudo - nowPseudo)
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}, [leaderboardTick])

useEffect(() => {
  setLeaderboardPage(1)
}, [leaderboardMetricSafe])

const leaderboardTotalCount = leaderboardRowsResolved.length
const leaderboardPageCount = Math.max(1, Math.ceil(leaderboardTotalCount / leaderboardPageSize))
const leaderboardPageSafe = clamp(leaderboardPage, 1, leaderboardPageCount)
const leaderboardPageStart = (leaderboardPageSafe - 1) * leaderboardPageSize
const leaderboardPageEnd = leaderboardPageStart + leaderboardPageSize
const leaderboardPageRows = leaderboardRowsResolved.slice(leaderboardPageStart, leaderboardPageEnd)
const leaderboardListRows = leaderboardPageRows

const leaderboardRowDomId = useCallback((metric, entry) => {
  const stableId = entry?.userId || entry?.username || entry?.rank || ''
  const safeMetric = metric === 'level' ? 'level' : (metric === 'season' ? 'season' : 'cash')
  return `leader-row-${safeMetric}-${String(stableId).replaceAll(' ', '_')}`
}, [])

const runLeaderboardSearch = useCallback(() => {
  const normalizeSearchValue = (value) => String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')

  const q = String(leaderboardSearchQuery || '').trim()
  if (!q) {
    setLeaderboardSearchError('Oyuncu adını yaz.')
    return
  }

  const needle = normalizeSearchValue(q)
  const scored = leaderboardRowsResolved
    .map((entry) => {
      const displayName = normalizeSearchValue(entry?.displayName || '')
      const username = normalizeSearchValue(entry?.username || '')

      let score = 0
      if (username && username === needle) score = 400
      else if (displayName && displayName === needle) score = 300
      else if (username && username.startsWith(needle)) score = 220
      else if (displayName && displayName.startsWith(needle)) score = 180
      else if (username && username.includes(needle)) score = 120
      else if (displayName && displayName.includes(needle)) score = 90

      return { entry, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      const byScore = b.score - a.score
      if (byScore !== 0) return byScore
      return Number(a.entry?.rank || 0) - Number(b.entry?.rank || 0)
    })

  const match = scored[0]?.entry || null

  if (!match) {
    setLeaderboardSearchError('Eşleşen oyuncu bulunamadı.')
    return
  }

  const id = leaderboardRowDomId(leaderboardMetricSafe, match)
  const usernameLower = normalizeSearchValue(match?.username || '')
  const isExactUsername = Boolean(usernameLower && usernameLower === needle)

  setLeaderboardSearchOpen(false)
  setLeaderboardSearchError('')

  if (isExactUsername && match.userId) {
    const opened = openProfileModal(match.userId, {
      username: match.username,
      displayName: match.displayName || match.username,
      avatarUrl: match.avatarUrl,
      level: match.level,
      role: match.role,
      roleLabel: match.roleLabel,
      premium: match.premium,
      disallowSelf: true,
      selfBlockedMessage: 'Sıralamada kendi profilini açamazsın. Kendi profiline şehir ekranından bakabilirsin.',
    })
    if (opened) return
  }

  setLeaderboardHighlightKey(id)
  window.setTimeout(() => setLeaderboardHighlightKey(''), 4500)

  const index = leaderboardRowsResolved.findIndex((entry) => (
    (match?.userId && String(entry.userId || '').trim() === String(match.userId || '').trim())
    || (match?.username && String(entry.username || '').trim().toLowerCase() === String(match.username || '').trim().toLowerCase())
  ))
  if (index >= 0) {
    const page = Math.floor(index / leaderboardPageSize) + 1
    setLeaderboardPage(page)
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const el = document.getElementById(id)
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  })
}, [leaderboardMetricSafe, leaderboardPageSize, leaderboardRowDomId, leaderboardRowsResolved, leaderboardSearchQuery, openProfileModal])

const profileModalLeagueRanks = useMemo(() => {
  if (!profileModalData) return { seasonRank: null }
  const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
  const targetUsername = String(profileModalData?.username || '').trim().toLowerCase()

  const findRank = (rows) => {
    const found = rows.find((entry) => (
      (targetUserId && String(entry.userId || '').trim() === targetUserId)
      || (targetUsername && String(entry.username || '').trim().toLowerCase() === targetUsername)
    ))
    return found?.rank ?? null
  }

  return {
    seasonRank: findRank(leaderboardRowsSeason),
  }
}, [leaderboardRowsSeason, profileModalData, profileModalUserId])

  return {
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
  }
}
