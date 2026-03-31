/**
 * marketApi.js — Pazar & Ticaret
 * Eşya alım/satımı, limit order defteri ve açık artırmalar.
 */
import { gameRequest } from '../apiBase.js'

// ─── Pazar Durumu ─────────────────────────────────────────────────────────────

/** Tüm eşyaları, fiyatlarını ve envanteri döner. */
export async function getMarketState() {
  return gameRequest('/game/market')
}

/** Belirtilen eşya için limit order defterini döner. */
export async function getOrderBookState(itemId) {
  const search = itemId ? `?itemId=${encodeURIComponent(itemId)}` : ''
  return gameRequest(`/game/market/orderbook${search}`)
}

// ─── Alım / Satım ─────────────────────────────────────────────────────────────

/** Eşyayı piyasa fiyatından satın alır. */
export async function buyItem(itemId, quantity) {
  return gameRequest('/game/market/buy', {
    method: 'POST',
    body: { itemId, quantity },
  })
}

/** Belirli bir satış emrinden eşya satın alır. */
export async function buyFromSellOrder(orderId, quantity) {
  return gameRequest('/game/market/buy-from-order', {
    method: 'POST',
    body: { orderId, quantity },
  })
}

/** Eşyayı piyasa fiyatından satar. */
export async function sellItem(itemId, quantity) {
  return gameRequest('/game/market/sell', {
    method: 'POST',
    body: { itemId, quantity },
  })
}

// ─── Limit Order ──────────────────────────────────────────────────────────────

/** Yeni limit emir (alış veya satış) oluşturur. */
export async function placeOrderBookOrder(payload) {
  return gameRequest('/game/market/orderbook/orders', {
    method: 'POST',
    body: payload,
  })
}

/** Var olan bir limit emri iptal eder. */
export async function cancelOrderBookOrder(orderId) {
  return gameRequest(`/game/market/orderbook/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}

// ─── Açık Artırma ─────────────────────────────────────────────────────────────

/** Eşya için açık artırma başlatır. */
export async function createMarketAuction(payload) {
  return gameRequest('/game/market/auctions', {
    method: 'POST',
    body: payload,
  })
}

/** Açık artırmaya teklif verir. */
export async function placeAuctionBid(auctionId, amount) {
  const safeId = encodeURIComponent(String(auctionId || '').trim())
  return gameRequest(`/game/market/auctions/${safeId}/bid`, {
    method: 'POST',
    body: { amount },
  })
}
