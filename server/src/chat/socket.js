import WebSocket, { WebSocketServer } from 'ws'
import { verifyAccessToken } from '../services/auth.js'
import { onSessionActivated } from '../services/sessionEvents.js'
import { config } from '../config.js'
import { getClientIp } from '../utils.js'
import { evaluateAccessByIp, resolveAccessIp } from '../services/accessPolicy.js'
import { createChatMessage, getChatRoomMessages, getChatRoomRoster, isChatRoom } from './service.js'

const WS_SESSION_REPLACED_CODE = 4001
const SESSION_REPLACED_REASON = 'session_replaced'
const SESSION_REPLACED_MESSAGE =
  'Hesabınız başka bir cihazda açıldı. Bu cihazdaki oturum kapatıldı.'

const WS_MAX_TOKEN_LENGTH = 4096
const WS_MAX_MESSAGE_BYTES = 16 * 1024
const WS_RATE_WINDOW_MS = 10_000
const WS_RATE_MAX_MESSAGES = 40
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

export function attachChatSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true })
  const metaByClient = new WeakMap()
  const roomPresenceMap = new Map()

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

  function increasePresence(room, userId) {
    const safeRoom = String(room || '').trim()
    const safeUserId = String(userId || '').trim()
    if (!safeRoom || !safeUserId) return

    const roomPresence = roomPresenceMap.get(safeRoom) || new Map()
    const currentCount = Number(roomPresence.get(safeUserId) || 0)
    roomPresence.set(safeUserId, currentCount + 1)
    roomPresenceMap.set(safeRoom, roomPresence)
  }

  function decreasePresence(room, userId) {
    const safeRoom = String(room || '').trim()
    const safeUserId = String(userId || '').trim()
    if (!safeRoom || !safeUserId) return

    const roomPresence = roomPresenceMap.get(safeRoom)
    if (!roomPresence) return
    const currentCount = Number(roomPresence.get(safeUserId) || 0)
    if (currentCount <= 1) {
      roomPresence.delete(safeUserId)
    } else {
      roomPresence.set(safeUserId, currentCount - 1)
    }

    if (roomPresence.size === 0) {
      roomPresenceMap.delete(safeRoom)
    }
  }

  function onlineUserIdsForRoom(room) {
    const roomPresence = roomPresenceMap.get(String(room || '').trim())
    if (!roomPresence) return []
    return [...roomPresence.keys()]
  }

  async function joinRoom(client, room) {
    const meta = metaByClient.get(client)
    if (!meta) return false

    const roomResult = await getChatRoomMessages(meta.userId, room, 25)
    if (!roomResult?.success) {
      wsSend(client, {
        type: 'chat:error',
        reason: roomResult?.reason || 'unknown_error',
        errors: roomResult?.errors || { global: 'Sohbet odasi y\u00fcklenemedi.' },
      })
      return false
    }

    const previousRoom = meta.room
    const nextRoom = roomResult.room

    if (previousRoom !== nextRoom) {
      if (previousRoom) {
        decreasePresence(previousRoom, meta.userId)
      }
      increasePresence(nextRoom, meta.userId)
    }

    meta.room = nextRoom
    wsSend(client, {
      type: 'chat:init',
      room: nextRoom,
      messages: roomResult.messages || [],
      chatState: roomResult.chatState || null,
    })

    await broadcastPresence(nextRoom)
    if (previousRoom && previousRoom !== nextRoom) {
      await broadcastPresence(previousRoom)
    }
    return true
  }

  function broadcastRoom(room, payload) {
    const serialized = JSON.stringify(payload)
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue
      const meta = metaByClient.get(client)
      if (!meta || meta.room !== room) continue
      client.send(serialized)
    }
  }

  async function broadcastPresence(room) {
    const roomName = String(room || '').trim()
    if (!roomName) return

    const roster = await getChatRoomRoster(roomName, onlineUserIdsForRoom(roomName))
    if (!roster?.success) return

    broadcastRoom(roomName, {
      type: 'chat:presence',
      room: roomName,
      users: Array.isArray(roster.users) ? roster.users : [],
    })
  }

  wss.on('connection', async (client, request) => {
    const userId = request?.auth?.userId
    const sessionId = request?.auth?.sessionId || ''
    const initialRoom = request?.auth?.room || 'global'
    metaByClient.set(client, {
      userId,
      sessionId,
      room: '',
      rateWindowEndsAt: 0,
      rateWindowCount: 0,
      abuseScore: 0,
    })
    client.isAlive = true
    client.on('pong', () => {
      client.isAlive = true
    })

    const joined = await joinRoom(client, initialRoom)
    if (!joined) {
      client.close(1008, 'join_failed')
      return
    }

    wsSend(client, { type: 'chat:ready' })

    client.on('message', async (rawValue) => {
      const meta = metaByClient.get(client)
      if (!meta) return
      const guard = canAcceptSocketMessage(meta, rawValue)
      if (!guard.ok) {
        meta.abuseScore = Number(meta.abuseScore || 0) + 1
        wsSend(client, {
          type: 'chat:error',
          reason: guard.reason,
          errors: {
            global:
              guard.reason === 'payload_too_large'
                ? 'Mesaj boyutu limiti asildi.'
                : 'Cok hizli mesaj gonderdiniz. Lutfen yavaslayin.',
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
          type: 'chat:error',
          reason: 'validation',
          errors: { global: 'Ge\u00e7ersiz mesaj formatı.' },
        })
        return
      }

      if (payload?.type === 'join') {
        const nextRoom = isChatRoom(payload.room) ? payload.room : 'global'
        await joinRoom(client, nextRoom)
        return
      }

      if (payload?.type === 'send') {
        const meta = metaByClient.get(client)
        const targetRoom = isChatRoom(payload.room) ? payload.room : meta?.room || 'global'
        const sendResult = await createChatMessage(meta?.userId, {
          room: targetRoom,
          text: payload.text,
          replyToId: payload.replyToId,
        })

        if (!sendResult?.success) {
        wsSend(client, {
          type: 'chat:error',
          reason: sendResult?.reason || 'validation',
          errors: sendResult?.errors || { global: 'Mesaj g\u00f6nderilemedi.' },
          chatState: sendResult?.chatState || null,
        })
        return
      }

      broadcastRoom(sendResult.room, {
        type: 'chat:message',
        room: sendResult.room,
        message: sendResult.message,
      })
      wsSend(client, {
        type: 'chat:state',
        room: sendResult.room,
        chatState: sendResult?.chatState || null,
      })
      await broadcastPresence(sendResult.room)
      }
    })

    client.on('close', () => {
      const meta = metaByClient.get(client)
      if (!meta?.room || !meta?.userId) return
      const prevRoom = meta.room
      decreasePresence(prevRoom, meta.userId)
      meta.room = ''
      void broadcastPresence(prevRoom)
    })

    client.on('error', () => {
      const meta = metaByClient.get(client)
      if (!meta?.room || !meta?.userId) return
      const prevRoom = meta.room
      decreasePresence(prevRoom, meta.userId)
      meta.room = ''
      void broadcastPresence(prevRoom)
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
        if (!parsedUrl || parsedUrl.pathname !== '/api/chat') return

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
          room: parsedUrl.searchParams.get('room') || 'global',
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
    detachSessionListener()
  })

  return wss
}
