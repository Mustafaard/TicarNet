import WebSocket, { WebSocketServer } from 'ws'
import { verifyAccessToken } from '../services/auth.js'
import { onSessionActivated } from '../services/sessionEvents.js'
import { config } from '../config.js'
import { getClientIp } from '../utils.js'
import { evaluateAccessByIp, resolveAccessIp } from '../services/accessPolicy.js'
import { onMessageCenterRefresh } from './events.js'

const WS_SESSION_REPLACED_CODE = 4001
const SESSION_REPLACED_REASON = 'session_replaced'
const SESSION_REPLACED_MESSAGE =
  'HesabÄ±nÄ±z baÅŸka bir cihazda aÃ§Ä±ldÄ±. Bu cihazdaki oturum kapatÄ±ldÄ±.'

const WS_MAX_TOKEN_LENGTH = 4096
const WS_MAX_MESSAGE_BYTES = 12 * 1024
const WS_RATE_WINDOW_MS = 10_000
const WS_RATE_MAX_MESSAGES = 60
const WS_HEARTBEAT_MS = 25_000

function parseUrl(requestUrl) {
  try {
    return new URL(requestUrl || '', 'http://localhost')
  } catch {
    return null
  }
}

function parseTokenFromProtocols(rawProtocols) {
  const joined = Array.isArray(rawProtocols)
    ? rawProtocols.join(',')
    : String(rawProtocols || '')
  if (!joined.trim()) return ''

  const protocols = joined
    .split(',')
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)

  for (const protocol of protocols) {
    if (protocol.startsWith('ticarnet-token.')) {
      return protocol.slice('ticarnet-token.'.length).trim()
    }
  }

  return ''
}

function normalizeWsToken(value) {
  const token = String(value || '').trim()
  if (!token) return ''
  if (token.length > WS_MAX_TOKEN_LENGTH) return ''
  return token
}

function canAcceptSocketMessage(meta, rawValue) {
  const payloadSize = Buffer.byteLength(rawValue?.toString?.() || '', 'utf8')
  if (payloadSize > WS_MAX_MESSAGE_BYTES) {
    return { ok: false, reason: 'payload_too_large' }
  }

  const now = Date.now()
  if (now > Number(meta?.rateWindowEndsAt || 0)) {
    meta.rateWindowEndsAt = now + WS_RATE_WINDOW_MS
    meta.rateWindowCount = 0
  }

  meta.rateWindowCount = Number(meta.rateWindowCount || 0) + 1
  if (meta.rateWindowCount > WS_RATE_MAX_MESSAGES) {
    return { ok: false, reason: 'rate_limited' }
  }

  return { ok: true, reason: '' }
}

function parseToken(request, parsedUrl) {
  const protocolToken = parseTokenFromProtocols(request?.headers?.['sec-websocket-protocol'])
  if (protocolToken) return normalizeWsToken(protocolToken)

  const authHeader = request.headers.authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    return normalizeWsToken(authHeader.slice('Bearer '.length).trim())
  }

  if (config.wsAllowQueryToken) {
    const queryToken = parsedUrl.searchParams.get('token') || ''
    if (queryToken) return normalizeWsToken(queryToken)
  }

  return ''
}

function wsSend(target, payload) {
  if (!target || target.readyState !== WebSocket.OPEN) return
  target.send(JSON.stringify(payload))
}

function rejectUpgrade(socket, statusCode, statusText) {
  if (!socket || socket.destroyed) return
  const code = Number(statusCode) || 400
  const text = String(statusText || 'Bad Request')
  socket.end(
    `HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  )
}

export function attachMessageSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true })
  const metaByClient = new WeakMap()
  const clientsByUser = new Map()

  const detachSessionListener = config.singleSessionEnforced
    ? onSessionActivated((event) => {
      const safeUserId = String(event?.userId || '').trim()
      const activeSessionId = String(event?.sessionId || '').trim()
      if (!safeUserId || !activeSessionId) return

      for (const client of wss.clients) {
        if (!client || client.readyState === WebSocket.CLOSED) continue
        const meta = metaByClient.get(client)
        if (!meta || meta.userId !== safeUserId) continue
        if (String(meta.sessionId || '').trim() === activeSessionId) continue

        wsSend(client, {
          type: 'auth:force-logout',
          reason: SESSION_REPLACED_REASON,
          message: SESSION_REPLACED_MESSAGE,
        })
        client.close(WS_SESSION_REPLACED_CODE, SESSION_REPLACED_REASON)
      }
    })
    : () => {}

  const detachRefreshListener = onMessageCenterRefresh((event) => {
    const safeUserId = String(event?.userId || '').trim()
    if (!safeUserId) return
    const clients = clientsByUser.get(safeUserId)
    if (!clients || clients.size === 0) return

    const payload = {
      type: 'messages:refresh',
      reason: event.reason || 'update',
      timestamp: event.timestamp || new Date().toISOString(),
    }

    for (const client of clients) {
      wsSend(client, payload)
    }
  })

  function registerClient(client, userId, sessionId) {
    const safeUserId = String(userId || '').trim()
    if (!safeUserId) return
    const safeSessionId = String(sessionId || '').trim()
    metaByClient.set(client, {
      userId: safeUserId,
      sessionId: safeSessionId,
      rateWindowEndsAt: 0,
      rateWindowCount: 0,
      abuseScore: 0,
    })
    const existing = clientsByUser.get(safeUserId) || new Set()
    existing.add(client)
    clientsByUser.set(safeUserId, existing)
  }

  function unregisterClient(client) {
    const meta = metaByClient.get(client)
    if (!meta?.userId) return
    const existing = clientsByUser.get(meta.userId)
    if (!existing) return
    existing.delete(client)
    if (existing.size === 0) {
      clientsByUser.delete(meta.userId)
    }
  }

  wss.on('connection', (client, request) => {
    const userId = request?.auth?.userId
    registerClient(client, userId, request?.auth?.sessionId || '')
    client.isAlive = true
    client.on('pong', () => {
      client.isAlive = true
    })
    wsSend(client, { type: 'messages:ready' })

    client.on('message', (rawValue) => {
      const meta = metaByClient.get(client)
      if (!meta) return
      const guard = canAcceptSocketMessage(meta, rawValue)
      if (!guard.ok) {
        meta.abuseScore = Number(meta.abuseScore || 0) + 1
        wsSend(client, {
          type: 'messages:error',
          reason: guard.reason,
          errors: {
            global:
              guard.reason === 'payload_too_large'
                ? 'Mesaj boyutu limiti aþýldý.'
                : 'Çok hýzlý istek gönderdiniz. Lütfen yavaþlayýn.',
          },
        })
        if (guard.reason === 'payload_too_large' || meta.abuseScore >= 3) {
          client.close(1008, guard.reason)
        }
        return
      }

      let payload
      try {
        payload = JSON.parse(rawValue.toString())
      } catch {
        wsSend(client, {
          type: 'messages:error',
          reason: 'validation',
          errors: { global: 'Geçersiz mesaj formatý.' },
        })
        return
      }

      if (payload?.type === 'messages:sync') {
        wsSend(client, {
          type: 'messages:refresh',
          reason: 'manual_sync',
          timestamp: new Date().toISOString(),
        })
      }
    })

    client.on('close', () => {
      unregisterClient(client)
    })

    client.on('error', () => {
      unregisterClient(client)
    })
  })

  const heartbeatTimer = setInterval(() => {
    for (const client of wss.clients) {
      if (!client || client.readyState !== WebSocket.OPEN) continue
      if (client.isAlive === false) {
        client.terminate()
        continue
      }
      client.isAlive = false
      try {
        client.ping()
      } catch {
        client.terminate()
      }
    }
  }, WS_HEARTBEAT_MS)

  server.on('upgrade', (request, socket, head) => {
    void (async () => {
      try {
        const parsedUrl = parseUrl(request.url)
        if (!parsedUrl || parsedUrl.pathname !== '/api/messages/ws') return

        const token = parseToken(request, parsedUrl)
        const payload = await verifyAccessToken(token)
        if (!payload?.sub) {
          rejectUpgrade(socket, 401, 'Unauthorized')
          return
        }

        const accessIp = resolveAccessIp({
          directIp: getClientIp(request),
        })
        const access = await evaluateAccessByIp(accessIp)
        if (!access.allowed) {
          const accessReason = String(access?.reason || '').trim()
          const canSoftAllow =
            Boolean(payload?.sub) &&
            accessReason === 'geo_unverified'

          if (!canSoftAllow) {
            rejectUpgrade(socket, 403, 'Forbidden')
            return
          }
        }

        request.auth = {
          userId: payload.sub,
          sessionId: payload.jti || '',
        }

        wss.handleUpgrade(request, socket, head, (client) => {
          wss.emit('connection', client, request)
        })
      } catch {
        rejectUpgrade(socket, 500, 'Internal Server Error')
      }
    })()
  })

  server.on('close', () => {
    clearInterval(heartbeatTimer)
    detachRefreshListener()
    detachSessionListener()
  })

  return wss
}

