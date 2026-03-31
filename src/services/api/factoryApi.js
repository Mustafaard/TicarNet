/**
 * factoryApi.js — Fabrikalar
 * Fabrika durumu, satın alma, üretim, toplu tahsilat ve hızlandırma.
 */
import { gameRequest } from '../apiBase.js'

/** Tüm fabrikaları ve üretim durumlarını döner. */
export async function getFactoriesState() {
  return gameRequest('/game/factories')
}

/** Yeni fabrika satın alır. */
export async function buyFactory(factoryId) {
  return gameRequest('/game/factories/buy', {
    method: 'POST',
    body: { factoryId },
  })
}

/** Belirtilen fabrikadan üretim tahsilatı yapar. */
export async function collectFactory(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/collect`, {
    method: 'POST',
  })
}

/** Tüm fabrikalardan toplu tahsilat yapar. */
export async function collectFactoriesBulk() {
  return gameRequest('/game/factories/collect/bulk', {
    method: 'POST',
  })
}

/** Fabrikanın seviyesini bir artırır. */
export async function upgradeFactory(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/upgrade`, {
    method: 'POST',
  })
}

/** Fabrika yükseltmesini elmasla hızlandırır. */
export async function speedupFactoryUpgrade(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/speedup`, {
    method: 'POST',
  })
}

/** Fabrika inşaatını elmasla hızlandırır. */
export async function speedupFactoryBuild(factoryId) {
  const safeId = encodeURIComponent(String(factoryId || '').trim())
  return gameRequest(`/game/factories/${safeId}/speedup-build`, {
    method: 'POST',
  })
}
