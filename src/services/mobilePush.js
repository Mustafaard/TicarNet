import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getDeviceId } from './auth.js'
import { registerPushDevice, unregisterPushDevice } from './game.js'

let listenersReady = false
let setupPromise = null
let lastToken = ''

function pushPlatform() {
  const platform = Capacitor.getPlatform()
  if (platform === 'android') return platform
  return 'web'
}

export function isNativePushRuntime() {
  return Capacitor.isNativePlatform() && pushPlatform() === 'android'
}

async function syncDeviceToken(tokenValue) {
  const token = String(tokenValue || '').trim()
  if (token.length < 20) return

  lastToken = token
  const response = await registerPushDevice({
    token,
    platform: pushPlatform(),
    deviceId: getDeviceId(),
    appVersion: import.meta.env.VITE_APP_VERSION || '',
  })

  if (!response?.success) {
    console.warn('[PUSH] Cihaz token kaydı başarısız:', response?.reason || 'unknown')
  }
}

function attachPushListeners() {
  if (listenersReady) return
  listenersReady = true

  PushNotifications.addListener('registration', (token) => {
    void syncDeviceToken(token?.value || '')
  })

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[PUSH] Cihaz push kaydı başarısız:', error)
  })

  PushNotifications.addListener('pushNotificationReceived', () => {
    // Bildirim ulaştı; oyun içi kutu ayrıca backend tarafında tutuluyor.
  })

  PushNotifications.addListener('pushNotificationActionPerformed', () => {
    // Bildirime tıklama event'i gerekirse bu noktadan ekran yönlendirmesine bağlanabilir.
  })
}

export async function bootstrapNativePush() {
  if (!isNativePushRuntime()) {
    return { success: false, reason: 'web' }
  }

  if (setupPromise) return setupPromise

  setupPromise = (async () => {
    try {
      attachPushListeners()

      let permission = await PushNotifications.checkPermissions()
      if (permission.receive !== 'granted') {
        permission = await PushNotifications.requestPermissions()
      }

      if (permission.receive !== 'granted') {
        return { success: false, reason: 'permission_denied' }
      }

      await PushNotifications.register()
      return { success: true, reason: null }
    } catch (error) {
      console.error('[PUSH] Native push başlatılamadı:', error)
      return { success: false, reason: 'native_setup_failed' }
    } finally {
      setupPromise = null
    }
  })()

  return setupPromise
}

export async function unregisterNativePush() {
  if (!isNativePushRuntime()) return { success: false, reason: 'web' }

  const response = await unregisterPushDevice({
    token: lastToken,
    deviceId: getDeviceId(),
  })

  if (!response?.success) {
    console.warn('[PUSH] Cihaz push kayıt silme başarısız:', response?.reason || 'unknown')
    return { success: false, reason: response?.reason || 'api_error' }
  }

  return { success: true, reason: null }
}
