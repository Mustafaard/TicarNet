/**
 * homeApi.js — Ana Menü
 * Genel oyun durumu, seviye bilgisi, duyurular ve günlük giriş ödülü.
 */
import { gameRequest } from '../apiBase.js'

/** Ana oyun durumunu döner: cüzdan, seviye, bildirim sayıları, moderasyon. */
export async function getGameOverview() {
  return gameRequest('/game/overview')
}
