/**
 * notificationApi.js — Bildirimler (Köprü)
 * Eski importların kırılmaması için messageApi'yi re-export eder.
 */
export {
  getPushCenterState,
  updatePushSettings,
  createPriceAlert,
  registerPushDevice,
  unregisterPushDevice,
  readPushNotification,
} from './messageApi.js'
