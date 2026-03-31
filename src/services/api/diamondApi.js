/**
 * diamondApi.js — Elmas Marketi
 * Günlük mağaza teklifleri, elmas hoş geldin paketi, fiyat alarmları.
 */
import { gameRequest } from '../apiBase.js'

/** Günlük mağaza tekliflerini ve sıfırlanma zamanını döner. */
export async function getDailyStore() {
  return gameRequest('/game/store/daily')
}

/** Günlük mağazadaki bir teklifi satın alır. */
export async function purchaseDailyOffer(offerId) {
  return gameRequest('/game/store/daily/purchase', {
    method: 'POST',
    body: { offerId },
  })
}

/**
 * Elmas hoş geldin paketini aktif eder (bir kez kullanılabilir).
 * @param {string} packId  Varsayılan: 'welcome-pack-5000'
 */
export async function consumeDiamondWelcomePack(packId = 'welcome-pack-5000') {
  return gameRequest('/game/store/diamond/welcome/consume', {
    method: 'POST',
    body: { packId },
  })
}
