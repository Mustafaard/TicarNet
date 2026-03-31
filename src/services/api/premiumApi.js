/**
 * premiumApi.js — Premium Üyelik
 * Premium plan satın alma ve günlük giriş ödülleri.
 */
import { gameRequest } from '../apiBase.js'

/** Belirtilen premium planı satın alır. */
export async function purchasePremium(planId) {
  return gameRequest('/game/premium/purchase', {
    method: 'POST',
    body: { planId },
  })
}

/** Günlük giriş ödülünün mevcut durumunu döner. */
export async function getDailyLoginReward() {
  return gameRequest('/game/rewards/daily-login')
}

/** Günlük giriş ödülünü talep eder. */
export async function claimDailyLoginReward() {
  return gameRequest('/game/rewards/daily-login/claim', {
    method: 'POST',
    body: {},
  })
}
