import { useCallback, useEffect, useRef, startTransition } from 'react'
import {
  CHAT_ROOM,
  MESSAGES_DISABLED,
  SESSION_REPLACED_NOTICE,
  WS_SESSION_REPLACED_CODE,
} from '../constants.js'
import {
  errText,
  pruneChatMessages,
} from '../utils.js'
import { getRealtimeChatUrl, getRealtimeMessagesUrl, getRealtimeSocketProtocols } from '../../../services/api/realtimeApi.js'

export function useSockets({
  activeTabRef,
  applyChatRestrictions,
  chatConnectRef,
  chatInitReadyRef,
  chatReconnectEnabled,
  chatReconnectTimer,
  chatSocketRef,
  handleForcedLogout,
  loadDirectMessageThread,
  loadMessageCenter,
  messageConnectRef,
  messageFilter,
  messageFilterRef,
  messageReconnectEnabled,
  messageReconnectTimer,
  messageReplyTargetRef,
  messageSocketRef,
  messageViewTab,
  messageViewTabRef,
  setChat,
  setChatFirstUnreadId,
  setChatSocketState,
  setChatUsers,
  setError,
  setMessageSocketState,
  triggerLiveStateRefresh,
}) {
const messageRefreshTimerRef = useRef(0)
const messageRefreshQueuedRef = useRef(false)
const messageRefreshNeedThreadRef = useRef(false)
const messageRefreshInFlightRef = useRef(false)

// Cleanup all pending message-refresh timers when the hook unmounts.
useEffect(() => {
  return () => {
    if (messageRefreshTimerRef.current) {
      clearTimeout(messageRefreshTimerRef.current)
      messageRefreshTimerRef.current = 0
    }
    messageRefreshQueuedRef.current = false
    messageRefreshNeedThreadRef.current = false
    messageRefreshInFlightRef.current = false
  }
}, [])

const runMessageRefresh = useCallback(async () => {
  if (messageRefreshInFlightRef.current) {
    messageRefreshQueuedRef.current = true
    return
  }

  messageRefreshInFlightRef.current = true
  const needsThreadRefresh = messageRefreshNeedThreadRef.current
  messageRefreshNeedThreadRef.current = false

  try {
    const refreshFilter = messageViewTabRef.current === 'bildirimler'
      ? 'all'
      : (messageFilterRef.current || 'all')

    await loadMessageCenter(refreshFilter)
    if (needsThreadRefresh && messageReplyTargetRef.current?.username) {
      await loadDirectMessageThread(messageReplyTargetRef.current.username)
    }
    await triggerLiveStateRefresh()
  } finally {
    messageRefreshInFlightRef.current = false
    if (messageRefreshQueuedRef.current) {
      messageRefreshQueuedRef.current = false
      messageRefreshTimerRef.current = window.setTimeout(() => {
        messageRefreshTimerRef.current = 0
        void runMessageRefresh()
      }, 240)
    }
  }
}, [loadDirectMessageThread, loadMessageCenter, messageFilterRef, messageReplyTargetRef, messageViewTabRef, triggerLiveStateRefresh])

const enqueueMessageRefresh = useCallback((needsThreadRefresh = false) => {
  if (needsThreadRefresh) {
    messageRefreshNeedThreadRef.current = true
  }
  messageRefreshQueuedRef.current = true
  if (messageRefreshTimerRef.current) return

  messageRefreshTimerRef.current = window.setTimeout(() => {
    messageRefreshTimerRef.current = 0
    messageRefreshQueuedRef.current = false
    void runMessageRefresh()
  }, 160)
}, [runMessageRefresh])

useEffect(() => {
  messageFilterRef.current = messageFilter
}, [messageFilter, messageFilterRef])

useEffect(() => {
  messageViewTabRef.current = messageViewTab
}, [messageViewTab, messageViewTabRef])

const connectChatSocket = useCallback(() => {
  if (typeof window === 'undefined') return
  if (MESSAGES_DISABLED) {
    setChatSocketState('offline')
    return
  }
  // Reuse an already-open or connecting socket — never stack connections.
  if (chatSocketRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(chatSocketRef.current.readyState)) {
    return
  }

  clearTimeout(chatReconnectTimer.current)
  const wsUrl = getRealtimeChatUrl('global')
  if (!wsUrl) {
    setChatSocketState('offline')
    return
  }

  setChatSocketState('connecting')
  const socketProtocols = getRealtimeSocketProtocols()
  const socket = socketProtocols.length > 0
    ? new WebSocket(wsUrl, socketProtocols)
    : new WebSocket(wsUrl)
  chatSocketRef.current = socket

  socket.onopen = () => {
    // Guard against stale socket instances that were replaced.
    if (chatSocketRef.current !== socket) {
      socket.close(1000, 'stale_socket')
      return
    }
    startTransition(() => setChatSocketState('online'))
    socket.send(JSON.stringify({ type: 'join', room: CHAT_ROOM }))
  }

  socket.onmessage = (event) => {
    if (chatSocketRef.current !== socket) return
    let payload
    try {
      payload = JSON.parse(String(event.data || '{}'))
    } catch {
      return
    }

    if (payload?.type === 'auth:force-logout') {
      handleForcedLogout(String(payload?.message || '').trim() || SESSION_REPLACED_NOTICE)
      return
    }

    if (payload?.type === 'chat:init') {
      const room = String(payload.room || 'global')
      const incomingMessages = pruneChatMessages(payload.messages || [])
      startTransition(() => {
        setChat((prev) => ({ ...prev, [room]: incomingMessages }))
        applyChatRestrictions(payload.chatState)
        if (chatInitReadyRef.current && activeTabRef.current !== 'chat') {
          const firstUnread = incomingMessages.find((entry) => entry && !entry.own)?.id || ''
          setChatFirstUnreadId(firstUnread)
        }
      })
      chatInitReadyRef.current = true
      return
    }

    if (payload?.type === 'chat:message' && payload.message?.id) {
      const room = String(payload.room || payload.message.room || 'global')
      startTransition(() => {
        setChat((prev) => {
          const current = Array.isArray(prev[room]) ? prev[room] : []
          if (current.some((entry) => entry.id === payload.message.id)) return prev
          return { ...prev, [room]: pruneChatMessages([...current, payload.message]) }
        })
        if (activeTabRef.current !== 'chat' && !payload.message.own) {
          setChatFirstUnreadId((prev) => prev || payload.message.id)
        }
      })
      return
    }

    if (payload?.type === 'chat:presence') {
      startTransition(() => setChatUsers(Array.isArray(payload.users) ? payload.users : []))
      return
    }

    if (payload?.type === 'chat:error') {
      startTransition(() => {
        setError(errText(payload.errors, 'Sohbet hatası oluştu.'))
        applyChatRestrictions(payload.chatState)
      })
      return
    }

    if (payload?.type === 'chat:state') {
      startTransition(() => applyChatRestrictions(payload.chatState))
    }
  }

  socket.onclose = (event) => {
    if (chatSocketRef.current !== socket) return
    chatSocketRef.current = null
    startTransition(() => setChatSocketState('offline'))
    if (event?.code === WS_SESSION_REPLACED_CODE) {
      handleForcedLogout(SESSION_REPLACED_NOTICE)
      return
    }
    if (!chatReconnectEnabled.current) return
    chatReconnectTimer.current = window.setTimeout(() => {
      chatConnectRef.current()
    }, 1600)
  }

  socket.onerror = () => {
    if (chatSocketRef.current !== socket) return
    startTransition(() => setChatSocketState('offline'))
  }
}, [
  activeTabRef,
  applyChatRestrictions,
  chatConnectRef,
  chatInitReadyRef,
  chatReconnectEnabled,
  chatReconnectTimer,
  chatSocketRef,
  handleForcedLogout,
  setChat,
  setChatFirstUnreadId,
  setChatSocketState,
  setChatUsers,
  setError,
])

useEffect(() => {
  chatConnectRef.current = connectChatSocket
}, [chatConnectRef, connectChatSocket])

const connectMessageSocket = useCallback(() => {
  if (typeof window === 'undefined') return
  if (MESSAGES_DISABLED) {
    setMessageSocketState('offline')
    return
  }
  // Reuse an already-open or connecting socket — never stack connections.
  if (
    messageSocketRef.current &&
    [WebSocket.OPEN, WebSocket.CONNECTING].includes(messageSocketRef.current.readyState)
  ) {
    return
  }

  clearTimeout(messageReconnectTimer.current)
  const wsUrl = getRealtimeMessagesUrl()
  if (!wsUrl) {
    setMessageSocketState('offline')
    return
  }

  setMessageSocketState('connecting')
  const socketProtocols = getRealtimeSocketProtocols()
  const socket = socketProtocols.length > 0
    ? new WebSocket(wsUrl, socketProtocols)
    : new WebSocket(wsUrl)
  messageSocketRef.current = socket

  socket.onopen = () => {
    // Guard against stale socket instances that were replaced.
    if (messageSocketRef.current !== socket) {
      socket.close(1000, 'stale_socket')
      return
    }
    startTransition(() => setMessageSocketState('online'))
    socket.send(JSON.stringify({ type: 'messages:sync' }))
  }

  socket.onmessage = (event) => {
    if (messageSocketRef.current !== socket) return
    let payload
    try {
      payload = JSON.parse(String(event.data || '{}'))
    } catch {
      return
    }

    if (payload?.type === 'auth:force-logout') {
      handleForcedLogout(String(payload?.message || '').trim() || SESSION_REPLACED_NOTICE)
      return
    }

    if (payload?.type === 'messages:ready') {
      enqueueMessageRefresh(false)
      return
    }

    if (payload?.type === 'messages:refresh') {
      enqueueMessageRefresh(true)
      return
    }

    if (payload?.type === 'messages:error') {
      startTransition(() => setError(errText(payload.errors, 'Mesaj bağlantı hatası oluştu.')))
    }
  }

  socket.onclose = (event) => {
    if (messageSocketRef.current !== socket) return
    messageSocketRef.current = null
    startTransition(() => setMessageSocketState('offline'))
    if (event?.code === WS_SESSION_REPLACED_CODE) {
      handleForcedLogout(SESSION_REPLACED_NOTICE)
      return
    }
    if (!messageReconnectEnabled.current) return
    messageReconnectTimer.current = window.setTimeout(() => {
      messageConnectRef.current()
    }, 1600)
  }

  socket.onerror = () => {
    if (messageSocketRef.current !== socket) return
    startTransition(() => setMessageSocketState('offline'))
  }
}, [
  enqueueMessageRefresh,
  handleForcedLogout,
  messageConnectRef,
  messageReconnectEnabled,
  messageReconnectTimer,
  messageSocketRef,
  setError,
  setMessageSocketState,
])

  return {
    connectChatSocket,
    connectMessageSocket,
  }
}
