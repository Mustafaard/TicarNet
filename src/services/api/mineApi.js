/**
 * mineApi.js — Madenler
 * Maden durumu, kazma başlatma ve kaynak tahsilatı.
 */
import { gameRequest } from '../apiBase.js'

/** Tüm madenlerin durumunu ve geri sayımlarını döner. */
export async function getMinesState() {
  return gameRequest('/game/mines')
}

/** Belirtilen madende kazma işlemi başlatır. */
export async function startMineDig(mineId) {
  const safeId = encodeURIComponent(String(mineId || '').trim())
  return gameRequest(`/game/mines/${safeId}/dig`, {
    method: 'POST',
    body: {},
  })
}

/** Madenden kazılan kaynakları depoya aktarır. */
export async function collectMine(mineId) {
  const safeId = encodeURIComponent(String(mineId || '').trim())
  return gameRequest(`/game/mines/${safeId}/collect`, {
    method: 'POST',
    body: {},
  })
}
