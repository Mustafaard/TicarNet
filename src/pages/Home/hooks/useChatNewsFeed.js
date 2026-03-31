import {
  CHAT_NEWS_MAX_ITEMS,
  TURKIYE_TIMEZONE,
} from '../constants.js'
import {
  dedupeFeedEntries,
  extractForexRateLabel,
  fmt,
  formatHourMinuteTurkey,
  isHiddenNewsTransactionKind,
  normalizeMojibakeText,
  parseFactoryNewsMeta,
  pruneNewsRecords,
} from '../utils.js'

export function useChatNewsFeed({
  chatRecentPlayers,
  cityAnnouncements,
  messageNotificationItems,
  overview,
  user,
}) {
const formatMessageDate = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const datePart = d.toLocaleDateString('tr-TR', {
      timeZone: TURKIYE_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
    })
    const timePart = formatHourMinuteTurkey(iso)
    return `${datePart} ${timePart}`.trim()
  } catch (_) { return '' }
}

const formatMessageTimeAgo = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso).getTime()
    const now = Date.now()
    const diffMs = now - d
    if (diffMs < 0) return formatMessageDate(iso)
    const sec = Math.floor(diffMs / 1000)
    const min = Math.floor(sec / 60)
    const hour = Math.floor(min / 60)
    const day = Math.floor(hour / 24)
    if (day > 0) return `${day} gün önce`
    if (hour > 0) return `${hour} saat önce`
    if (min > 0) return `${min} dk önce`
    if (sec <= 1) return '1 sn önce'
    return `${sec} sn önce`
  } catch (_) { return '' }
}

const chatPlayerNewsFeed = pruneNewsRecords(chatRecentPlayers, CHAT_NEWS_MAX_ITEMS)
  .map((entry, index) => {
    const userId = String(entry?.userId || '').trim()
    const username = normalizeMojibakeText(String(entry?.username || 'Oyuncu').trim() || 'Oyuncu')
    const avatarUrl = String(entry?.avatarUrl || '').trim()
    const createdAt = String(entry?.createdAt || '').trim()
    const createdAtMs = Date.parse(createdAt)
    const safeCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : 0
    const itemId = `join:${userId || 'anon'}:${createdAt || index}`
    return {
      id: itemId,
      kind: 'join',
      userId,
      username,
      avatarUrl,
      createdAt,
      createdAtMs: safeCreatedAtMs,
      title: 'Yeni oyuncu aramıza katıldı!',
      promptLabel: 'Dokun',
      detailIntro: 'Aramıza katılan oyuncu:',
      timeLabel: formatMessageTimeAgo(createdAt) || 'Az önce',
      dateLabel: '',
    }
  })

const currentChatProfileName = normalizeMojibakeText(
  String(
    overview?.profile?.username
    || overview?.profile?.displayName
    || user?.username
    || user?.displayName
    || 'Oyuncu',
  ).trim() || 'Oyuncu',
)
const currentChatProfileUserId = String(
  overview?.profile?.userId
  || user?.id
  || '',
).trim()
const chatActivityNewsFeed = dedupeFeedEntries(
  pruneNewsRecords(messageNotificationItems, CHAT_NEWS_MAX_ITEMS * 3)
    .map((entry, index) => {
      const source = String(entry?.source || '').trim().toLowerCase()
      const type = String(entry?.type || '').trim().toLowerCase()
      const kindRaw = String(entry?.kind || '').trim().toLowerCase()
      const rawDetail = normalizeMojibakeText(
        String(entry?.message ?? entry?.detail ?? entry?.preview ?? '').trim(),
      )
      const detailLower = rawDetail.toLocaleLowerCase('tr')
      const inferredKind = (() => {
        if (kindRaw) return kindRaw
        if (type === 'market') {
          if (/d[öo]viz\s+kuru\s+g[üu]ncellendi|yeni\s+kur/.test(detailLower)) return 'forex_rate_update'
          if (/sat[ıi][şs]|sat[ıi]ld[ıi]/.test(detailLower)) return 'market_sell'
          if (/al[ıi]m|sat[ıi]n al[ıi]nd[ıi]/.test(detailLower)) return 'market_buy'
        }
        if (type === 'factory') {
          if (/h[ıi]zland[ıi]r/.test(detailLower)) return 'factory_speedup'
          if (/sat[ıi]n al[ıi]nd[ıi]|kuruld/.test(detailLower)) return 'factory_buy'
          if (/y[üu]kselt/.test(detailLower)) return 'factory_upgrade_start'
        }
        if (type === 'business' && /sat[ıi]ld[ıi]/.test(detailLower)) return 'vehicle_market_sell'
        return ''
      })()
      const createdAt = String(entry?.createdAt || '').trim()
      const createdAtMs = Date.parse(createdAt)
      const safeCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : 0
      const amount = Number(entry?.amount)
      const hasAmount = Number.isFinite(amount) && Math.trunc(amount) !== 0
      const amountInt = hasAmount ? Math.trunc(amount) : 0
      let newsKind = ''
      let title = ''
      let detailIntro = rawDetail
      let username = currentChatProfileName
      let userId = currentChatProfileUserId

      if (source === 'transaction') {
        if (isHiddenNewsTransactionKind(inferredKind) || inferredKind === 'factory_speedup') return null
        const factoryMeta = parseFactoryNewsMeta(rawDetail)
        if (inferredKind === 'market_buy') {
          newsKind = 'activity-market-buy'
          title = 'Pazarda alım işlemi yapıldı!'
        } else if (inferredKind === 'market_sell') {
          newsKind = 'activity-market-sell'
          title = 'Pazarda satış işlemi yapıldı!'
        } else if (inferredKind === 'factory_buy') {
          newsKind = 'activity-factory-buy'
          title = 'Yeni fabrika kuruldu!'
        } else if (inferredKind === 'factory_upgrade_start') {
          newsKind = 'activity-factory-upgrade'
          title = 'Fabrika geliştirildi!'
        } else if (inferredKind === 'business_vehicle_build' || inferredKind === 'logistics_truck_buy') {
          newsKind = 'activity-business-build'
          title = 'İşletmede üretim tamamlandı!'
        } else if (inferredKind === 'vehicle_market_sell') {
          newsKind = 'activity-vehicle-market-sell'
          title = 'İlanlı araç satışı gerçekleşti!'
        }
        if (!newsKind) return null
        if (inferredKind === 'market_buy') {
          const fromSystem = !/satıcı\s*:/.test(detailLower)
          detailIntro = detailIntro
            ? (fromSystem
              ? `${currentChatProfileName} pazar yerinden alım yaptı. ${detailIntro}`
              : `${currentChatProfileName}: ${detailIntro}`)
            : `${currentChatProfileName} pazar yerinden alım yaptı.`
        } else if (inferredKind === 'market_sell') {
          detailIntro = detailIntro
            ? `${currentChatProfileName}: ${detailIntro}`
            : `${currentChatProfileName} pazarda satış işlemi yaptı.`
        } else if (inferredKind === 'factory_buy') {
          detailIntro = `${currentChatProfileName}, ${factoryMeta.factoryName} kurdu (Seviye 1).`
        } else if (inferredKind === 'factory_upgrade_start') {
          if (factoryMeta.fromLevel && factoryMeta.toLevel) {
            detailIntro = `${currentChatProfileName}, ${factoryMeta.factoryName} seviyesini ${factoryMeta.fromLevel}'den ${factoryMeta.toLevel}'ye yükseltti.`
          } else if (factoryMeta.toLevel) {
            detailIntro = `${currentChatProfileName}, ${factoryMeta.factoryName} seviyesini ${factoryMeta.toLevel}. seviyeye yükseltti.`
          } else {
            detailIntro = `${currentChatProfileName}, ${factoryMeta.factoryName} seviyesini yükseltti.`
          }
        } else {
          detailIntro = detailIntro
            ? `${currentChatProfileName}: ${detailIntro}`
            : `${currentChatProfileName} yeni bir işlem gerçekleştirdi.`
        }
      } else if (source === 'notification' || source === 'push') {
        const isMineEvent = type === 'mine' || /maden|kaz[ıi]/.test(detailLower)
        const isMessagePenalty = /mesaj engeli|sustur|k[üu]f[üu]r/.test(detailLower)
        const isForexRateUpdate = type === 'market' && /d[öo]viz\s+kuru\s+g[üu]ncellendi|yeni\s+kur/.test(detailLower)
        if (isMineEvent) {
          newsKind = 'activity-mine'
          title = 'Maden üretimi tamamlandı!'
          username = currentChatProfileName
          userId = currentChatProfileUserId
        } else if (isForexRateUpdate) {
          const rateLabel = extractForexRateLabel(rawDetail)
          newsKind = 'activity-forex-update'
          title = 'Döviz kuru yenilendi!'
          username = 'Pazar'
          userId = ''
          detailIntro = rateLabel
            ? `Güncel kur: ${rateLabel}`
            : (detailIntro || 'Döviz kuru bilgisi güncellendi.')
        } else if (isMessagePenalty) {
          newsKind = 'activity-message-penalty'
          title = 'Mesaj engeli bildirimi geldi!'
          username = 'Yönetim'
          userId = ''
        } else {
          return null
        }
        detailIntro = detailIntro || 'Detay bilgisi bulunamadı.'
      } else {
        return null
      }

      if (hasAmount && ['market_buy', 'market_sell', 'vehicle_market_sell'].includes(inferredKind)) {
        const cashLabel = amountInt > 0
          ? `Kazanılan nakit: +${fmt(amountInt)}`
          : `Harcanan nakit: -${fmt(Math.abs(amountInt))}`
        detailIntro = `${detailIntro}${detailIntro ? ' • ' : ''}${cashLabel}`
      }

      return {
        id: `activity:${String(entry?.id || index)}`,
        kind: newsKind,
        source,
        type,
        userId,
        username,
        avatarUrl: '',
        createdAt,
        createdAtMs: safeCreatedAtMs,
        title,
        promptLabel: 'Dokun',
        detailIntro,
        timeLabel: formatMessageTimeAgo(createdAt) || 'Az önce',
        dateLabel: '',
      }
    })
    .filter(Boolean),
  CHAT_NEWS_MAX_ITEMS * 2,
)

const chatAnnouncementFeed = pruneNewsRecords(cityAnnouncements, CHAT_NEWS_MAX_ITEMS)
  .map((entry, index) => {
    const createdAt = String(entry?.createdAt || '').trim()
    const createdAtMs = Date.parse(createdAt)
    const safeCreatedAtMs = Number.isFinite(createdAtMs) ? createdAtMs : 0
    const title = normalizeMojibakeText(String(entry?.title || '').trim() || 'TicarNet oyun haberi')
    const detailBody = normalizeMojibakeText(String(entry?.body || '').trim() || title)
    return {
      id: `announcement:${String(entry?.id || index)}`,
      kind: 'announcement',
      userId: '',
      username: normalizeMojibakeText(String(entry?.createdByUsername || 'Yönetim').trim() || 'Yönetim'),
      avatarUrl: '',
      createdAt,
      createdAtMs: safeCreatedAtMs,
      title,
      promptLabel: 'Dokun',
      detailIntro: detailBody,
      timeLabel: formatMessageTimeAgo(createdAt) || 'Az önce',
      dateLabel: '',
    }
  })

const chatNewsFeed = dedupeFeedEntries(
  [...chatPlayerNewsFeed, ...chatActivityNewsFeed, ...chatAnnouncementFeed]
    .sort((left, right) => {
      const diff = (right?.createdAtMs || 0) - (left?.createdAtMs || 0)
      if (diff !== 0) return diff
      return String(left?.id || '').localeCompare(String(right?.id || ''), 'tr')
    }),
  CHAT_NEWS_MAX_ITEMS,
)

  return {
    chatActivityNewsFeed,
    chatAnnouncementFeed,
    chatNewsFeed,
    chatPlayerNewsFeed,
    currentChatProfileName,
    currentChatProfileUserId,
    formatMessageDate,
    formatMessageTimeAgo,
  }
}
