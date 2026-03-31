import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getDeviceId } from './auth.js'
import { registerPushDevice, unregisterPushDevice } from './api/notificationApi.js'

let listenersReady = false
let setupPromise = null
let lastToken = ''
let disabledPushWarned = false

function pushPlatform() {
  const platform = Capacitor.getPlatform()
  if (platform === 'android') return platform
  return 'web'
}

export function isNativePushRuntime() {
  return Capacitor.isNativePlatform() && pushPlatform() === 'android'
}

function isTruthyEnv(value) {
  const safe = String(value || '').trim().toLowerCase()
  return safe === '1' || safe === 'true' || safe === 'yes' || safe === 'on'
}

function isNativePushEnabled() {
  // Safety switch:
  // If Firebase native setup (google-services.json) is missing,
  // keep this false to prevent crash on PushNotifications.register().
  return isTruthyEnv(import.meta.env.VITE_NATIVE_PUSH_ENABLED)
}

function canUsePushPlugin() {
  return Capacitor.isPluginAvailable('PushNotifications')
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
    console.warn('[PUSH] Device token sync failed:', response?.reason || 'unknown')
  }
}

function attachPushListeners() {
  if (listenersReady) return
  listenersReady = true

  try {
    PushNotifications.addListener('registration', (token) => {
      void syncDeviceToken(token?.value || '')
    })

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[PUSH] Native registration failed:', error)
    })

    PushNotifications.addListener('pushNotificationReceived', () => {
      // Notification arrived; in-game inbox is managed in backend.
    })

    PushNotifications.addListener('pushNotificationActionPerformed', () => {
      // Tap event can be wired to route handling when needed.
    })
  } catch (error) {
    listenersReady = false
    console.warn('[PUSH] Listener attach skipped:', error?.message || error)
  }
}

export async function bootstrapNativePush() {
  if (!isNativePushRuntime()) {
    return { success: false, reason: 'web' }
  }
  if (!isNativePushEnabled()) {
    if (!disabledPushWarned) {
      disabledPushWarned = true
      console.warn('[PUSH] Native push disabled (VITE_NATIVE_PUSH_ENABLED is not true).')
    }
    return { success: false, reason: 'disabled' }
  }
  if (!canUsePushPlugin()) {
    return { success: false, reason: 'plugin_unavailable' }
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
      const message = String(error?.message || '').toLowerCase()
      if (message.includes('default firebaseapp is not initialized')) {
        console.warn('[PUSH] Firebase is not initialized in native build. Push disabled.')
        return { success: false, reason: 'firebase_not_initialized' }
      }
      console.error('[PUSH] Native push bootstrap failed:', error)
      return { success: false, reason: 'native_setup_failed', message: error?.message || '' }
    } finally {
      setupPromise = null
    }
  })()

  return setupPromise
}

export async function unregisterNativePush() {
  if (!isNativePushRuntime()) return { success: false, reason: 'web' }
  if (!isNativePushEnabled()) return { success: false, reason: 'disabled' }
  if (!canUsePushPlugin()) return { success: false, reason: 'plugin_unavailable' }

  const response = await unregisterPushDevice({
    token: lastToken,
    deviceId: getDeviceId(),
  })

  if (!response?.success) {
    console.warn('[PUSH] Device unregister failed:', response?.reason || 'unknown')
    return { success: false, reason: response?.reason || 'api_error' }
  }

  return { success: true, reason: null }
}
