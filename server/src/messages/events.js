import { EventEmitter } from 'node:events'

const MESSAGE_CENTER_REFRESH_EVENT = 'message_center_refresh'
const eventBus = new EventEmitter()

eventBus.setMaxListeners(200)

export function emitMessageCenterRefresh(userId, reason = 'update') {
  const safeUserId = String(userId || '').trim()
  if (!safeUserId) return

  eventBus.emit(MESSAGE_CENTER_REFRESH_EVENT, {
    userId: safeUserId,
    reason: String(reason || 'update').trim() || 'update',
    timestamp: new Date().toISOString(),
  })
}

export function onMessageCenterRefresh(listener) {
  if (typeof listener !== 'function') return () => {}
  eventBus.on(MESSAGE_CENTER_REFRESH_EVENT, listener)
  return () => {
    eventBus.off(MESSAGE_CENTER_REFRESH_EVENT, listener)
  }
}
