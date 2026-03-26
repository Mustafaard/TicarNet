import { EventEmitter } from 'node:events'

const EVENT_SESSION_ACTIVATED = 'session:activated'
const emitter = new EventEmitter()
emitter.setMaxListeners(100)

function normalizeText(value) {
  return String(value || '').trim()
}

export function emitSessionActivated(payload = {}) {
  const userId = normalizeText(payload.userId)
  const sessionId = normalizeText(payload.sessionId)
  if (!userId || !sessionId) return

  const eventPayload = {
    userId,
    sessionId,
    source: normalizeText(payload.source) || 'unknown',
    triggeredAt: new Date().toISOString(),
  }

  try {
    emitter.emit(EVENT_SESSION_ACTIVATED, eventPayload)
  } catch (error) {
    console.error('[AUTH] Session event emit failed:', error)
  }
}

export function onSessionActivated(listener) {
  if (typeof listener !== 'function') return () => {}

  const wrapped = (eventPayload) => {
    try {
      listener(eventPayload)
    } catch (error) {
      console.error('[AUTH] Session event listener failed:', error)
    }
  }

  emitter.on(EVENT_SESSION_ACTIVATED, wrapped)
  return () => {
    emitter.off(EVENT_SESSION_ACTIVATED, wrapped)
  }
}
