/**
 * chestApi.js — Sandıklar
 * Sezon sandıklarını açma işlemleri.
 */
import { gameRequest } from '../apiBase.js'

/** Belirtilen sezon sandığını açar ve içeriğini döner. */
export async function openLeagueSeasonChest(chestId) {
  return gameRequest('/game/league/chest/open', {
    method: 'POST',
    body: { chestId },
  })
}
