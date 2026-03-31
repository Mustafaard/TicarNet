/**
 * leaderboardApi.js — Liderlik Tablosu
 * Sezon sıralaması, ödül talepleri.
 */
import { gameRequest } from '../apiBase.js'

/** Güncel lig/liderlik durumunu döner: sıralama, sezon ödülleri, sandıklar. */
export async function getLeagueState() {
  return gameRequest('/game/league')
}

/** Belirtilen döneme ait sezon ödülünü talep eder. */
export async function claimLeagueReward(period) {
  return gameRequest('/game/league/claim', {
    method: 'POST',
    body: { period },
  })
}
