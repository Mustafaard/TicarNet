/**
 * storeApi.js — Mağaza (Köprü)
 * Eski importların kırılmaması için premiumApi ve diamondApi'yi re-export eder.
 */
export {
  purchasePremium,
  getDailyLoginReward,
  claimDailyLoginReward,
} from './premiumApi.js'

export {
  getDailyStore,
  purchaseDailyOffer,
  consumeDiamondWelcomePack,
} from './diamondApi.js'
