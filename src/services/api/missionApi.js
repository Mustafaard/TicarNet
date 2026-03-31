/**
 * missionApi.js — Görevler
 * Aktif görev listesi ve ödül talepleri.
 */
import { gameRequest } from '../apiBase.js'

/** Tüm aktif ve tamamlanan görevleri döner. */
export async function getMissionsState() {
  return gameRequest('/game/missions')
}

/** Tamamlanan görevin ödülünü talep eder. */
export async function claimMissionReward(missionId) {
  return gameRequest(`/game/missions/${missionId}/claim`, {
    method: 'POST',
  })
}
