/**
 * financeApi.js — Finans (Banka & Döviz)
 * Banka işlemleri, vadeli hesap ve döviz alım/satımı.
 */
import { gameRequest } from '../apiBase.js'

// ─── Banka ────────────────────────────────────────────────────────────────────

/** Banka durumunu döner: bakiye, vadeli hesap, faiz seçenekleri. */
export async function getBankState() {
  return gameRequest('/game/bank')
}

/** Belirtilen tutarı bankaya yatırır. */
export async function depositBankCash(amount) {
  return gameRequest('/game/bank/deposit', {
    method: 'POST',
    body: { amount },
  })
}

/** Bankadan para çeker. */
export async function withdrawBankCash(amount) {
  return gameRequest('/game/bank/withdraw', {
    method: 'POST',
    body: { amount },
  })
}

/** Vadeli hesap açar. */
export async function openBankTermDeposit(amount, days) {
  return gameRequest('/game/bank/term/open', {
    method: 'POST',
    body: { amount, days },
  })
}

/** Vadeli hesap faizini tahsil eder. */
export async function claimBankTermDeposit() {
  return gameRequest('/game/bank/term/claim', {
    method: 'POST',
  })
}

// ─── Döviz ────────────────────────────────────────────────────────────────────

/** Döviz piyasasını döner: kur, geçmiş, portföy. */
export async function getForexState() {
  return gameRequest('/game/forex')
}

/**
 * Döviz satın alır.
 * @param {number} quantity
 * @param {string} currencyId  Varsayılan: 'tct'
 */
export async function buyForexCurrency(quantity, currencyId = 'tct') {
  return gameRequest('/game/forex/buy', {
    method: 'POST',
    body: { currencyId, quantity },
  })
}

/**
 * Döviz satar.
 * @param {number} quantity
 * @param {string} currencyId  Varsayılan: 'tct'
 */
export async function sellForexCurrency(quantity, currencyId = 'tct') {
  return gameRequest('/game/forex/sell', {
    method: 'POST',
    body: { currencyId, quantity },
  })
}
