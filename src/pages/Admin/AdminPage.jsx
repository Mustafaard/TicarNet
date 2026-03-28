
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  clearAdminBan,
  clearAdminUserLogos,
  createAdminAnnouncement,
  clearAdminMessageBlock,
  deleteAdminUserAccount,
  deleteAdminAnnouncement,
  getAdminAnnouncements,
  getAdminCapabilities,
  getAdminLogs,
  getAdminSystemStatus,
  listAdminUsers,
  getModerationQueues,
  grantAdminCash,
  grantAdminDiamonds,
  grantAdminResource,
  resolveAdminUser,
  restoreAdminAnnouncement,
  revokeAdminCash,
  revokeAdminDiamonds,
  revokeAdminResource,
  searchAdminUsers,
  setAdminChatBlock,
  setAdminMute,
  setAdminMessageBlock,
  setAdminTempBan,
  updateAdminUserEmail,
  updateAdminUserPassword,
  setAdminUserRole,
} from '../../services/admin.js'
import './AdminPage.css'

const EMPTY_QUEUES = {
  now: '',
  messageBlocks: [],
  chatBlocks: [],
  tempBans: [],
  permanentBans: [],
  moderators: [],
  counts: {
    messageBlocks: 0,
    chatBlocks: 0,
    tempBans: 0,
    permanentBans: 0,
    moderators: 0,
  },
}

const ANNOUNCEMENT_TYPE_OPTIONS = [
  { value: 'announcement', label: 'Duyuru' },
  { value: 'update', label: 'G\u00fcncelleme' },
]

function toInt(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function roleOf(v) {
  const r = String(v || '').trim().toLowerCase()
  return r === 'admin' || r === 'moderator' || r === 'player' ? r : 'player'
}

function normalizeAnnouncementType(value) {
  const safe = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (['update', 'guncelleme', 'guncelle', 'patch', 'bakim'].includes(safe)) return 'update'
  return 'announcement'
}

function announcementTypeLabel(value) {
  return normalizeAnnouncementType(value) === 'update' ? 'G\u00fcncelleme' : 'Duyuru'
}

function msgText(res, fallback) {
  return String(res?.errors?.global || fallback || 'İşlem başarısız.')
}

function fmtDate(v) {
  const ms = new Date(v || '').getTime()
  if (!Number.isFinite(ms)) return '-'
  return new Date(ms).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
}

function fmtRemain(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return 'Bitti'
  const min = Math.max(1, Math.ceil(n / 60000))
  if (min < 60) return `${min} dk`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h < 24) return m ? `${h} sa ${m} dk` : `${h} sa`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh ? `${d} g ${rh} sa` : `${d} g`
}

function hoursToMinutes(value, { allowZero = false, fallbackHours = 1 } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) return allowZero ? 0 : Math.max(1, toInt(fallbackHours, 1)) * 60
  const safeHours = Math.max(0, toInt(raw, allowZero ? 0 : fallbackHours))
  if (allowZero && safeHours === 0) return 0
  return Math.max(1, safeHours) * 60
}

function fmtPenaltyDuration(minutesValue) {
  const minutes = Math.max(0, toInt(minutesValue, 0))
  if (minutes <= 0) return 'kalıcı'
  if (minutes < 60) return `${minutes} dakika`
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return remainMinutes > 0 ? `${hours} saat ${remainMinutes} dakika` : `${hours} saat`
}

function AdminPage({ user, onLogout }) {
  const initializedRef = useRef(false)
  const seededLogRoleRef = useRef(false)

  const [cap, setCap] = useState(null)
  const [users, setUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [queues, setQueues] = useState(EMPTY_QUEUES)
  const [logs, setLogs] = useState([])

  const [searchQuery, setSearchQuery] = useState('')
  const [allUsersQuery, setAllUsersQuery] = useState('')
  const [includeStaff, setIncludeStaff] = useState(false)
  const [searchHint, setSearchHint] = useState('Kullanıcı adı veya e-posta yazarak ara.')
  const [allUsersHint, setAllUsersHint] = useState('')

  const [cashAdd, setCashAdd] = useState('')
  const [cashAddReason, setCashAddReason] = useState('')
  const [cashSub, setCashSub] = useState('')
  const [cashSubReason, setCashSubReason] = useState('')
  const [diaAdd, setDiaAdd] = useState('')
  const [diaAddReason, setDiaAddReason] = useState('')
  const [diaSub, setDiaSub] = useState('')
  const [diaSubReason, setDiaSubReason] = useState('')
  const [resourceItemId, setResourceItemId] = useState('')
  const [resourceAddAmount, setResourceAddAmount] = useState('')
  const [resourceAddReason, setResourceAddReason] = useState('')
  const [resourceSubAmount, setResourceSubAmount] = useState('')
  const [resourceSubReason, setResourceSubReason] = useState('')

  const [chatHours, setChatHours] = useState('1')
  const [chatReason, setChatReason] = useState('')
  const [msgHours, setMsgHours] = useState('2')
  const [msgReason, setMsgReason] = useState('')
  const [banHours, setBanHours] = useState('')
  const [banReason, setBanReason] = useState('')

  const [emailNext, setEmailNext] = useState('')
  const [emailReason, setEmailReason] = useState('')
  const [passwordNext, setPasswordNext] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordReason, setPasswordReason] = useState('')
  const [quickActionReason, setQuickActionReason] = useState('')
  const [quickMuteHours, setQuickMuteHours] = useState('1')
  const [quickTempBanHours, setQuickTempBanHours] = useState('4')

  const [roleReason, setRoleReason] = useState('')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [announcementType, setAnnouncementType] = useState('announcement')
  const [announcements, setAnnouncements] = useState([])
  const [lastDeletedAnnouncementId, setLastDeletedAnnouncementId] = useState('')
  const [lastDeletedAnnouncementTitle, setLastDeletedAnnouncementTitle] = useState('')
  const [lastDeletedAnnouncementUndoUntil, setLastDeletedAnnouncementUndoUntil] = useState('')
  const [systemStatus, setSystemStatus] = useState(null)

  const [logAction, setLogAction] = useState('')
  const [logStatus, setLogStatus] = useState('')
  const [logTarget, setLogTarget] = useState('')
  const [logActorRole, setLogActorRole] = useState('')

  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const perms = useMemo(() => new Set(Array.isArray(cap?.permissions) ? cap.permissions : []), [cap])
  const role = roleOf(cap?.actor?.role || user?.role)
  const actorUserId = String(cap?.actor?.id || user?.id || '').trim()
  const isAdmin = role === 'admin'
  const isModerator = role === 'moderator'

  const canSearch = perms.has('search_user')
  const canViewLogs = perms.has('view_logs')
  const canChatBlock = perms.has('chat_block')
  const canMsgBlock = perms.has('message_block')
  const canTempBan = perms.has('temp_ban')
  const canCashGrant = perms.has('cash_grant')
  const canDiaGrant = perms.has('diamond_grant') && Boolean(cap?.flags?.diamondGrantEnabled)
  const canCashRevoke = perms.has('cash_revoke')
  const canDiaRevoke = perms.has('diamond_revoke')
  const canResourceGrant = perms.has('resource_grant')
  const canResourceRevoke = perms.has('resource_revoke')
  const canCredentialManage = perms.has('user_credentials_manage')
  const canRoleManage = perms.has('role_manage')
  const canAnnouncementManage = perms.has('announcement_manage')
  const resourceCatalog = useMemo(
    () => (Array.isArray(cap?.resourceCatalog) ? cap.resourceCatalog : []),
    [cap],
  )

  const normalizedQuery = String(searchQuery || '').trim()
  const effectiveLogRole = isAdmin ? String(logActorRole || '').trim().toLowerCase() : ''

  const visibleMsgBlocks = useMemo(() => {
    const all = Array.isArray(queues?.messageBlocks) ? queues.messageBlocks : []
    if (!isModerator) return all
    return all.filter((x) => {
      const by = String(x?.issuedBy?.userId || '').trim()
      return !by || by === actorUserId
    })
  }, [actorUserId, isModerator, queues])

  const clearFeedback = useCallback(() => {
    setError('')
    setNotice('')
  }, [])

  const closePanel = useCallback((message = 'Panel yetkin sonlandı.') => {
    onLogout?.(message)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (String(window.location.pathname || '').toLowerCase().startsWith('/admin')) {
          window.location.assign('/')
        }
      }, 60)
    }
  }, [onLogout])

  const handleAccessLoss = useCallback((res, fallback) => {
    const reason = String(res?.reason || '').trim().toLowerCase()
    if (reason === 'forbidden' || reason === 'unauthorized') {
      setError(msgText(res, fallback))
      closePanel('Panel yetkin kapatıldı. Tekrar giriş yap.')
      return true
    }
    return false
  }, [closePanel])

  const loadCaps = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    const res = await getAdminCapabilities()
    if (!silent) setLoading(false)

    if (!res?.success) {
      if (!handleAccessLoss(res, 'Yetki bilgileri yüklenemedi.')) setError(msgText(res, 'Yetki bilgileri yüklenemedi.'))
      return null
    }

    if (!seededLogRoleRef.current) {
      seededLogRoleRef.current = true
      setLogActorRole('')
    }

    setCap(res)
    return res
  }, [handleAccessLoss])

  const loadUsers = useCallback(async (queryOverride = null, includeStaffOverride = null) => {
    if (!canSearch) return false
    const q = String(queryOverride ?? searchQuery ?? '').trim()
    const withStaff = isAdmin && (includeStaffOverride == null ? includeStaff : Boolean(includeStaffOverride))

    if (!q) {
      setUsers([])
      setSelected(null)
      setSearchHint('Kullanıcı seçmek için önce arama yap.')
      return true
    }
    if (q.length < 2) {
      setUsers([])
      setSearchHint('Arama için en az 2 karakter yaz.')
      return false
    }

    const res = await searchAdminUsers({ query: q, limit: 30, includeStaff: withStaff })
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Kullanıcı arama başarısız.')) setError(msgText(res, 'Kullanıcı arama başarısız.'))
      return false
    }

    const list = Array.isArray(res.users) ? res.users : []
    setUsers(list)
    setSearchHint(String(res.hint || (list.length ? '' : 'Uygun kullanıcı bulunamadı.')))
    if (list.length === 0) setSelected(null)
    return true
  }, [canSearch, handleAccessLoss, includeStaff, isAdmin, searchQuery])

  const loadAllUsers = useCallback(async (queryOverride = null) => {
    if (!isAdmin || !canCredentialManage) {
      setAllUsers([])
      setAllUsersHint('')
      return false
    }
    const q = String(queryOverride ?? allUsersQuery ?? '').trim()
    const res = await listAdminUsers({ query: q, limit: 300 })
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Kullanıcı listesi yüklenemedi.')) {
        setError(msgText(res, 'Kullanıcı listesi yüklenemedi.'))
      }
      return false
    }
    const list = Array.isArray(res.users) ? res.users : []
    setAllUsers(list)
    setAllUsersHint(String(res.hint || (list.length ? '' : 'Kullanıcı bulunamadı.')))
    return true
  }, [allUsersQuery, canCredentialManage, handleAccessLoss, isAdmin])

  const loadQueues = useCallback(async () => {
    const res = await getModerationQueues()
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Liste yüklenemedi.')) setError(msgText(res, 'Liste yüklenemedi.'))
      return false
    }
    setQueues({ ...EMPTY_QUEUES, ...(res || {}) })
    return true
  }, [handleAccessLoss])

  const loadLogs = useCallback(async (roleOverride = '') => {
    if (!canViewLogs) return false
    const res = await getAdminLogs({
      limit: 120,
      action: logAction,
      status: logStatus,
      targetQuery: logTarget,
      actorRole: String(roleOverride || effectiveLogRole || '').trim().toLowerCase(),
    })
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Loglar yüklenemedi.')) setError(msgText(res, 'Loglar yüklenemedi.'))
      return false
    }
    setLogs(Array.isArray(res.logs) ? res.logs : [])
    return true
  }, [canViewLogs, effectiveLogRole, handleAccessLoss, logAction, logStatus, logTarget])

  const loadAnnouncements = useCallback(async () => {
    if (!canAnnouncementManage) {
      setAnnouncements([])
      return false
    }
    const res = await getAdminAnnouncements(80)
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Duyuru listesi yüklenemedi.')) {
        setError(msgText(res, 'Duyuru listesi yüklenemedi.'))
      }
      return false
    }
    setAnnouncements(Array.isArray(res.announcements) ? res.announcements : [])
    return true
  }, [canAnnouncementManage, handleAccessLoss])

  const loadSystemStatus = useCallback(async () => {
    if (!isAdmin) {
      setSystemStatus(null)
      return false
    }
    const res = await getAdminSystemStatus()
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Sistem durumu yüklenemedi.')) {
        setError(msgText(res, 'Sistem durumu yüklenemedi.'))
      }
      return false
    }
    setSystemStatus(res)
    return true
  }, [handleAccessLoss, isAdmin])

  const refreshSelected = useCallback(async () => {
    if (!selected?.id || !selected?.username) return true
    const res = await resolveAdminUser(selected.username, selected.id)
    if (!res?.success) {
      if (handleAccessLoss(res, 'Kullanıcı kartı yenilenemedi.')) return false
      setSelected(null)
      return false
    }
    setSelected(res.user || null)
    return true
  }, [handleAccessLoss, selected])

  const reloadAll = useCallback(async () => {
    await Promise.all([
      loadUsers(normalizedQuery || selected?.username || '', includeStaff),
      loadAllUsers(),
      loadQueues(),
      loadLogs(),
      loadAnnouncements(),
      loadSystemStatus(),
      refreshSelected(),
    ])
  }, [includeStaff, loadAllUsers, loadAnnouncements, loadLogs, loadQueues, loadSystemStatus, loadUsers, normalizedQuery, refreshSelected, selected])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    void (async () => {
      const c = await loadCaps()
      if (!c) return
      await Promise.all([
        loadAllUsers(),
        loadQueues(),
        loadLogs(roleOf(c?.actor?.role) === 'admin' ? logActorRole : ''),
        loadSystemStatus(),
      ])
    })()
  }, [loadAllUsers, loadCaps, loadLogs, loadQueues, loadSystemStatus, logActorRole])

  useEffect(() => {
    if (!cap) return undefined
    const t = window.setInterval(() => {
      void loadCaps({ silent: true })
    }, 5000)
    return () => window.clearInterval(t)
  }, [cap, loadCaps])

  useEffect(() => {
    if (!cap) return undefined
    const t = window.setInterval(() => {
      void loadQueues()
    }, 20000)
    return () => window.clearInterval(t)
  }, [cap, loadQueues])

  useEffect(() => {
    if (!cap || !isAdmin) {
      setSystemStatus(null)
      return undefined
    }
    void loadSystemStatus()
    const t = window.setInterval(() => {
      void loadSystemStatus()
    }, 20000)
    return () => window.clearInterval(t)
  }, [cap, isAdmin, loadSystemStatus])

  useEffect(() => {
    if (!cap || !canAnnouncementManage) {
      setAnnouncements([])
      return undefined
    }
    void loadAnnouncements()
    const t = window.setInterval(() => {
      void loadAnnouncements()
    }, 20000)
    return () => window.clearInterval(t)
  }, [canAnnouncementManage, cap, loadAnnouncements])

  useEffect(() => {
    if (!error && !notice) return undefined
    const t = window.setTimeout(() => {
      setError('')
      setNotice('')
    }, 7000)
    return () => window.clearTimeout(t)
  }, [error, notice])

  useEffect(() => {
    setEmailNext(String(selected?.email || '').trim())
    setEmailReason('')
    setPasswordNext('')
    setPasswordConfirm('')
    setPasswordReason('')
  }, [selected?.id, selected?.email])

  useEffect(() => {
    if (!resourceCatalog.length) {
      setResourceItemId('')
      return
    }
    const exists = resourceCatalog.some((entry) => String(entry?.id || '').trim() === resourceItemId)
    if (!exists) {
      setResourceItemId(String(resourceCatalog[0]?.id || '').trim())
    }
  }, [resourceCatalog, resourceItemId])

  const selectUser = async (entry) => {
    if (!entry) return
    clearFeedback()
    setBusy('resolve-user')
    const res = await resolveAdminUser(entry.username, entry.id)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Kullanıcı doğrulanamadı.')) setError(msgText(res, 'Kullanıcı doğrulanamadı.'))
      return
    }
    setSelected(res.user || null)
    setNotice('Kullanıcı doğrulandı.')
  }

  const runEconomy = async (mode, kind) => {
    if (!selected || busy) return
    clearFeedback()

    const grant = mode === 'grant'
    const cash = kind === 'cash'
    const amountRaw = cash ? (grant ? cashAdd : cashSub) : (grant ? diaAdd : diaSub)
    const reasonRaw = cash ? (grant ? cashAddReason : cashSubReason) : (grant ? diaAddReason : diaSubReason)

    const amount = toInt(amountRaw, 0)
    const reason = String(reasonRaw || '').trim()
    if (amount <= 0) return void setError('Miktar sıfırdan büyük olmalı.')

    const ok = window.confirm(`${selected.username} için ${amount} ${cash ? 'nakit' : 'elmas'} işlemi onaylansın mı?`)
    if (!ok) return

    const fn = cash ? (grant ? grantAdminCash : revokeAdminCash) : (grant ? grantAdminDiamonds : revokeAdminDiamonds)
    const busyKey = `${cash ? 'cash' : 'dia'}-${grant ? 'grant' : 'revoke'}`

    setBusy(busyKey)
    const res = await fn(selected.username, selected.id, amount, reason)
    setBusy('')

    if (!res?.success) {
      if (!handleAccessLoss(res, 'Ekonomi işlemi başarısız.')) setError(msgText(res, 'Ekonomi işlemi başarısız.'))
      return
    }

    if (cash) {
      if (grant) {
        setCashAdd('')
        setCashAddReason('')
      } else {
        setCashSub('')
        setCashSubReason('')
      }
    } else if (grant) {
      setDiaAdd('')
      setDiaAddReason('')
    } else {
      setDiaSub('')
      setDiaSubReason('')
    }

    setNotice(res.message || 'İşlem tamamlandı.')
    await reloadAll()
  }

  const runResourceInventory = async (mode) => {
    if (!selected || busy) return
    clearFeedback()

    const isGrant = mode === 'grant'
    const amountRaw = isGrant ? resourceAddAmount : resourceSubAmount
    const reasonRaw = isGrant ? resourceAddReason : resourceSubReason
    const amount = toInt(amountRaw, 0)
    const reason = String(reasonRaw || '').trim()
    const itemId = String(resourceItemId || '').trim()
    const itemName = String(
      resourceCatalog.find((entry) => String(entry?.id || '').trim() === itemId)?.name || itemId || 'kaynak',
    ).trim()

    if (!itemId) return void setError('Önce bir kaynak seçmelisin.')
    if (amount <= 0) return void setError('Miktar sıfırdan büyük olmalı.')

    const confirmText = isGrant
      ? `${selected.username} deposuna ${amount} ${itemName} eklensin mi?`
      : `${selected.username} deposundan ${amount} ${itemName} düşürülsün mü?`
    if (!window.confirm(confirmText)) return

    const fn = isGrant ? grantAdminResource : revokeAdminResource
    const busyKey = isGrant ? 'resource-grant' : 'resource-revoke'
    setBusy(busyKey)
    const res = await fn(selected.username, selected.id, itemId, amount, reason)
    setBusy('')

    if (!res?.success) {
      if (!handleAccessLoss(res, 'Depo işlemi başarısız.')) setError(msgText(res, 'Depo işlemi başarısız.'))
      return
    }

    if (isGrant) {
      setResourceAddAmount('')
      setResourceAddReason('')
    } else {
      setResourceSubAmount('')
      setResourceSubReason('')
    }

    setNotice(res.message || 'Depo işlemi tamamlandı.')
    await reloadAll()
  }

  const applyPenalty = async (type) => {
    if (!selected || busy) return
    clearFeedback()

    let minutes = 0
    let reason = ''
    let fn = null
    let busyKey = ''
    let confirmText = ''

    if (type === 'chat' && canChatBlock) {
      minutes = hoursToMinutes(chatHours, { fallbackHours: 1 })
      reason = String(chatReason || '').trim()
      if (minutes <= 0) return void setError('Sohbet engeli süresi en az 1 saat olmalı.')
      fn = setAdminChatBlock
      busyKey = 'chat-block'
      confirmText = `${selected.username} kullanıcısına ${fmtPenaltyDuration(minutes)} sohbet engeli verilsin mi?`
    } else if (type === 'message' && canMsgBlock) {
      minutes = hoursToMinutes(msgHours, { fallbackHours: 2 })
      reason = String(msgReason || '').trim()
      if (minutes <= 0) return void setError('Mesaj engeli süresi en az 1 saat olmalı.')
      fn = setAdminMessageBlock
      busyKey = 'message-block'
      confirmText = `${selected.username} kullanıcısına ${fmtPenaltyDuration(minutes)} DM + sohbet engeli verilsin mi?`
    } else if (type === 'ban' && canTempBan) {
      minutes = hoursToMinutes(banHours, { allowZero: true })
      reason = String(banReason || '').trim()
      fn = setAdminTempBan
      busyKey = 'temp-ban'
      confirmText = minutes > 0
        ? `${selected.username} kullanıcısına ${fmtPenaltyDuration(minutes)} geçici ban verilsin mi?`
        : `${selected.username} kullanıcısına kalıcı ban verilsin mi?`
    }

    if (!fn) return
    if (reason.length < 3) return void setError('Ceza nedeni en az 3 karakter olmalı.')
    if (!window.confirm(confirmText)) return

    setBusy(busyKey)
    const res = await fn(selected.username, selected.id, minutes, reason)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Ceza işlemi başarısız.')) setError(msgText(res, 'Ceza işlemi başarısız.'))
      return
    }

    setNotice(res.message || 'Ceza işlemi tamamlandı.')
    await reloadAll()
  }

  const clearMsgBlock = async (target = null) => {
    const t = target || selected
    if (!t || !canMsgBlock || busy) return
    clearFeedback()

    if (!window.confirm(`${t.username} kullanıcısının mesaj engeli kaldırılsın mı?`)) return

    setBusy(`msg-clear:${t.id || t.userId}`)
    const res = await clearAdminMessageBlock(t.username, t.id || t.userId)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Mesaj engeli kaldırılamadı.')) setError(msgText(res, 'Mesaj engeli kaldırılamadı.'))
      return
    }

    setNotice(res.message || 'Mesaj engeli kaldırıldı.')
    await reloadAll()
  }

  const clearBan = async (target, mode) => {
    if (!target || !canTempBan || busy) return
    const safeMode = mode === 'perm' ? 'perm' : 'temp'
    const id = target.id || target.userId
    clearFeedback()

    const txt = safeMode === 'perm'
      ? `${target.username} kullanıcısındaki kalıcı ban kaldırılsın mı?`
      : `${target.username} kullanıcısındaki geçici ban kaldırılsın mı?`
    if (!window.confirm(txt)) return

    setBusy(`ban-clear:${safeMode}:${id}`)
    const res = await clearAdminBan(target.username, id, safeMode)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Ban kaldırılamadı.')) setError(msgText(res, 'Ban kaldırılamadı.'))
      return
    }

    setNotice(res.message || 'Ban kaldırıldı.')
    await reloadAll()
  }

  const changeRole = async (nextRole, target = null) => {
    const t = target || selected
    if (!t || !canRoleManage || busy) return
    clearFeedback()

    const toRole = String(nextRole || '').trim().toLowerCase()
    const curRole = roleOf(t.role)
    if (!['player', 'moderator'].includes(toRole)) return void setError('Geçersiz rol.')
    if (curRole === 'admin') return void setError('Admin rolü değiştirilemez.')
    if (toRole === curRole) return void setError('Kullanıcı zaten bu rolde.')

    const reason = String(roleReason || '').trim()
    if (reason && reason.length < 3) return void setError('Rol nedeni ya boş olmalı ya da en az 3 karakter olmalı.')

    if (!window.confirm(`${t.username} rolü ${curRole} -> ${toRole} olsun mu?`)) return

    const id = t.id || t.userId
    setBusy(`role:${toRole}:${id}`)
    const res = await setAdminUserRole(t.username, id, toRole, reason)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Rol değişimi başarısız.')) setError(msgText(res, 'Rol değişimi başarısız.'))
      return
    }

    setRoleReason('')
    setNotice(res.message || 'Rol güncellendi.')
    await reloadAll()
  }

  const publishAnnouncement = async () => {
    if (!canAnnouncementManage || busy) return
    clearFeedback()

    const title = String(announcementTitle || '').replace(/\s+/g, ' ').trim()
    const body = String(announcementBody || '').replace(/\r/g, '').trim()
    if (!title && !body) {
      setError('Duyuru için başlık veya metin girmelisin.')
      return
    }

    const safeType = normalizeAnnouncementType(announcementType)
    setBusy('announcement-create')
    const res = await createAdminAnnouncement(title, body, safeType)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Duyuru yayınlanamadı.')) setError(msgText(res, 'Duyuru yayınlanamadı.'))
      return
    }

    setAnnouncementTitle('')
    setAnnouncementBody('')
    setNotice(
      res.message || (
        safeType === 'update'
          ? 'G\u00fcncelleme duyurusu yay\u0131nland\u0131.'
          : 'Duyuru yay\u0131nland\u0131.'
      ),
    )
    await loadAnnouncements()
  }

  const removeAnnouncement = async (entry) => {
    if (!canAnnouncementManage || busy) return
    const id = String(entry?.id || '').trim()
    if (!id) return
    clearFeedback()

    const title = String(entry?.title || 'Duyuru').trim() || 'Duyuru'
    if (!window.confirm(`"${title}" duyurusu silinsin mi?`)) return

    setBusy(`announcement-delete:${id}`)
    const res = await deleteAdminAnnouncement(id)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Duyuru silinemedi.')) setError(msgText(res, 'Duyuru silinemedi.'))
      return
    }

    setNotice(res.message || 'Duyuru silindi.')
    setLastDeletedAnnouncementId(String(res?.deletedAnnouncementId || '').trim())
    setLastDeletedAnnouncementTitle(String(entry?.title || 'Duyuru').trim() || 'Duyuru')
    setLastDeletedAnnouncementUndoUntil(String(res?.undoUntil || '').trim())
    await loadAnnouncements()
  }

  const undoRemoveAnnouncement = async () => {
    if (!canAnnouncementManage || busy) return
    const deletedId = String(lastDeletedAnnouncementId || '').trim()
    if (!deletedId) return

    clearFeedback()
    setBusy('announcement-restore')
    const res = await restoreAdminAnnouncement(deletedId)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Duyuru geri alınamadı.')) {
        setError(msgText(res, 'Duyuru geri alınamadı.'))
      }
      return
    }

    setLastDeletedAnnouncementId('')
    setLastDeletedAnnouncementTitle('')
    setLastDeletedAnnouncementUndoUntil('')
    setNotice(res.message || 'Duyuru geri alındı.')
    await loadAnnouncements()
  }

  const onAllUsersSubmit = (e) => {
    e.preventDefault()
    clearFeedback()
    void loadAllUsers()
  }

  const applyEmailUpdate = async () => {
    if (!isAdmin || !canCredentialManage || !selected || busy) return
    clearFeedback()

    const nextEmail = String(emailNext || '').trim().toLowerCase()
    const reason = String(emailReason || '').trim()
    if (!nextEmail) return void setError('Yeni e-posta zorunlu.')
    if (nextEmail === String(selected?.email || '').trim().toLowerCase()) {
      return void setError('Yeni e-posta mevcut e-posta ile aynı olamaz.')
    }
    if (reason && reason.length < 3) return void setError('Neden boş bırakılabilir veya en az 3 karakter olmalı.')

    if (!window.confirm(`${selected.username} kullanıcısının e-posta adresi güncellensin mi?`)) return

    setBusy('user-email-update')
    const res = await updateAdminUserEmail(selected.username, selected.id, nextEmail, reason)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'E-posta güncellenemedi.')) setError(msgText(res, 'E-posta güncellenemedi.'))
      return
    }

    setNotice(res.message || 'E-posta güncellendi.')
    setEmailReason('')
    await reloadAll()
  }

  const applyPasswordUpdate = async () => {
    if (!isAdmin || !canCredentialManage || !selected || busy) return
    clearFeedback()

    const nextPassword = String(passwordNext || '')
    const confirm = String(passwordConfirm || '')
    const reason = String(passwordReason || '').trim()

    if (!nextPassword) return void setError('Yeni şifre zorunlu.')
    if (!confirm) return void setError('Şifre tekrarı zorunlu.')
    if (nextPassword !== confirm) return void setError('Şifreler birbiriyle eşleşmiyor.')
    if (reason && reason.length < 3) return void setError('Neden boş bırakılabilir veya en az 3 karakter olmalı.')

    if (!window.confirm(`${selected.username} kullanıcısının şifresi yenilensin mi?`)) return

    setBusy('user-password-update')
    const res = await updateAdminUserPassword(selected.username, selected.id, nextPassword, confirm, reason)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Şifre güncellenemedi.')) setError(msgText(res, 'Şifre güncellenemedi.'))
      return
    }

    setPasswordNext('')
    setPasswordConfirm('')
    setPasswordReason('')
    setNotice(res.message || 'Şifre güncellendi.')
    await reloadAll()
  }

  const clearSelectedUserLogos = async () => {
    if (!isAdmin || !canCredentialManage || !selected || busy) return
    clearFeedback()
    if (!window.confirm(`${selected.username} kullanıcısının logo/avatar dosyaları temizlensin mi?`)) return

    setBusy('user-logo-clear')
    const res = await clearAdminUserLogos(selected.username, selected.id)
    setBusy('')
    if (!res?.success) {
      if (!handleAccessLoss(res, 'Logo temizleme işlemi başarısız.')) {
        setError(msgText(res, 'Logo temizleme işlemi başarısız.'))
      }
      return
    }

    setNotice(res.message || 'Logo/avatar temizleme işlemi tamamlandı.')
    await reloadAll()
  }

  const runQuickAction = async (mode, targetEntry) => {
    const target = targetEntry || selected
    if (!isAdmin || !target || busy) return
    clearFeedback()

    const reason = String(quickActionReason || '').trim()
    if (reason.length < 3) return void setError('Hızlı işlem nedeni en az 3 karakter olmalı.')

    const targetLookup = target.username
    const targetUserId = target.id || target.userId
    if (!targetLookup || !targetUserId) return

    let response = null
    if (mode === 'mute') {
      const minutes = hoursToMinutes(quickMuteHours, { fallbackHours: 1 })
      if (!window.confirm(`${targetLookup} kullanıcısı ${fmtPenaltyDuration(minutes)} susturulsun mu?`)) return
      setBusy(`quick:mute:${targetUserId}`)
      response = await setAdminMute(targetLookup, targetUserId, minutes, reason)
      setBusy('')
    } else if (mode === 'temp-ban') {
      const minutes = hoursToMinutes(quickTempBanHours, { fallbackHours: 4 })
      if (!window.confirm(`${targetLookup} kullanıcısı ${fmtPenaltyDuration(minutes)} geçici banlansın mı?`)) return
      setBusy(`quick:temp-ban:${targetUserId}`)
      response = await setAdminTempBan(targetLookup, targetUserId, minutes, reason)
      setBusy('')
    } else if (mode === 'perm-ban') {
      if (!window.confirm(`${targetLookup} kullanıcısına kalıcı ban uygulansın mı?`)) return
      setBusy(`quick:perm-ban:${targetUserId}`)
      response = await setAdminTempBan(targetLookup, targetUserId, 0, reason)
      setBusy('')
    } else if (mode === 'delete-account') {
      if (!window.confirm(`${targetLookup} kullanıcısının hesabı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return
      setBusy(`quick:delete:${targetUserId}`)
      response = await deleteAdminUserAccount(targetLookup, targetUserId, reason)
      setBusy('')
    } else {
      return
    }

    if (!response?.success) {
      if (!handleAccessLoss(response, 'Hızlı işlem başarısız.')) setError(msgText(response, 'Hızlı işlem başarısız.'))
      return
    }

    if (mode === 'delete-account' && selected?.id === targetUserId) {
      setSelected(null)
    }
    setNotice(response.message || 'İşlem tamamlandı.')
    await reloadAll()
  }

  const onSearchSubmit = (e) => {
    e.preventDefault()
    clearFeedback()
    void loadUsers()
  }

  const onToggleStaff = (e) => {
    if (!isAdmin) return
    const checked = Boolean(e?.target?.checked)
    setIncludeStaff(checked)
    if (normalizedQuery.length >= 2) {
      void loadUsers(normalizedQuery, checked)
    } else {
      setUsers([])
      setSelected(null)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>{isAdmin ? 'Yönetim Paneli' : 'Moderatör Paneli'}</h1>
          <p>Giriş: <strong>{user?.email || user?.username || '-'}</strong></p>
          <p className="admin-owner-note">Rol: {role}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="btn-secondary" onClick={() => void reloadAll()} disabled={Boolean(busy)}>Yenile</button>
          <button type="button" className="btn-secondary" onClick={() => window.location.assign('/')}>Oyuna Dön</button>
          <button type="button" className="btn-danger" onClick={() => onLogout?.('')}>Çıkış Yap</button>
        </div>
      </header>

      {error ? <p className="admin-feedback admin-error">{error}</p> : null}
      {notice ? <p className="admin-feedback admin-notice">{notice}</p> : null}

      <section className="admin-card">
        <h2>1) Kullanıcı Ara</h2>
        <form className="admin-search-row" onSubmit={onSearchSubmit}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kullanıcı adı veya e-posta"
            disabled={!canSearch || loading}
            autoComplete="off"
          />
          <button type="submit" disabled={!canSearch || loading || normalizedQuery.length < 2}>{loading ? 'Yükleniyor...' : 'Ara'}</button>
        </form>
        {isAdmin ? (
          <div className="admin-search-tools">
            <label className="admin-toggle">
              <input type="checkbox" checked={includeStaff} onChange={onToggleStaff} disabled={!canSearch || loading} />
              <span>Moderatör sonuçlarını da getir</span>
            </label>
          </div>
        ) : null}
        {searchHint ? <p className="admin-meta">{searchHint}</p> : null}
        <div className="admin-user-grid">
          {users.map((entry) => (
            <article key={entry.id} className={`admin-user-card ${selected?.id === entry.id ? 'is-selected' : ''}`}>
              <div className="admin-user-main">
                <h3>{entry.username}</h3>
                <p>{entry.email}</p>
                <p className="admin-meta">Rol: <strong>{entry.role}</strong> | Nakit: {entry.wallet} | Elmas: {entry.diamonds}</p>
              </div>
              <button type="button" onClick={() => void selectUser(entry)} disabled={busy === 'resolve-user'}>
                {busy === 'resolve-user' ? 'Doğrulanıyor...' : selected?.id === entry.id ? 'Seçildi' : 'Kullanıcıyı Seç'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>2) Doğrulama Kartı</h2>
        {selected ? (
          <div className="admin-user-main">
            <h3>{selected.username}</h3>
            <p>{selected.email}</p>
            <p className="admin-meta">ID: {selected.id}</p>
            <p className="admin-meta">Rol: <strong>{selected.role}</strong> | Nakit: {selected.wallet} | Elmas: {selected.diamonds} | XP: {selected.xp}</p>
            <p className="admin-meta">
              Aktif: {selected?.moderation?.chatBlockUntil ? `Chat ${fmtDate(selected.moderation.chatBlockUntil)}; ` : ''}
              {selected?.moderation?.messageBlockUntil ? `Mesaj ${fmtDate(selected.moderation.messageBlockUntil)}; ` : ''}
              {selected?.moderation?.tempBanUntil ? `Temp Ban ${fmtDate(selected.moderation.tempBanUntil)}; ` : ''}
              {selected?.moderation?.permanentBan ? 'Kalıcı Ban; ' : ''}
              {!selected?.moderation?.chatBlockUntil && !selected?.moderation?.messageBlockUntil && !selected?.moderation?.tempBanUntil && !selected?.moderation?.permanentBan ? 'Yok' : ''}
            </p>
            {isAdmin && canCredentialManage ? (
              <div className="admin-verify-actions">
                <button
                  type="button"
                  className="btn-danger"
                  disabled={busy === 'user-logo-clear'}
                  onClick={() => void clearSelectedUserLogos()}
                >
                  {busy === 'user-logo-clear' ? 'Temizleniyor...' : 'Logoları Temizle'}
                </button>
              </div>
            ) : null}
          </div>
        ) : <p className="admin-meta">İşlem yapmadan önce kullanıcıyı seç.</p>}
      </section>

      {isAdmin && canCredentialManage ? (
        <section className="admin-card">
          <h2>Hesap Yönetimi</h2>
          <p className="admin-meta">
            Güvenlik nedeniyle mevcut şifreler düz metin olarak gösterilmez. Bu bölümden yalnızca yeni şifre atanabilir.
          </p>
          <div className="admin-row">
            <input
              type="email"
              value={emailNext}
              onChange={(e) => setEmailNext(e.target.value)}
              placeholder="Yeni e-posta (herhangi bir sağlayıcı)"
              autoComplete="off"
            />
            <input
              type="text"
              value={emailReason}
              onChange={(e) => setEmailReason(e.target.value)}
              placeholder="E-posta değişim nedeni (opsiyonel)"
              maxLength={160}
            />
            <button
              type="button"
              disabled={!selected || busy === 'user-email-update'}
              onClick={() => void applyEmailUpdate()}
            >
              {busy === 'user-email-update' ? 'İşleniyor...' : 'E-postayı Güncelle'}
            </button>
          </div>

          <div className="admin-row">
            <input
              type="password"
              value={passwordNext}
              onChange={(e) => setPasswordNext(e.target.value)}
              placeholder="Yeni şifre"
              autoComplete="new-password"
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Yeni şifre (tekrar)"
              autoComplete="new-password"
            />
            <input
              type="text"
              value={passwordReason}
              onChange={(e) => setPasswordReason(e.target.value)}
              placeholder="Şifre değişim nedeni (opsiyonel)"
              maxLength={160}
            />
            <button
              type="button"
              className="btn-danger"
              disabled={!selected || busy === 'user-password-update'}
              onClick={() => void applyPasswordUpdate()}
            >
              {busy === 'user-password-update' ? 'İşleniyor...' : 'Şifreyi Yenile'}
            </button>
          </div>

          <form className="admin-search-row" onSubmit={onAllUsersSubmit}>
            <input
              type="text"
              value={allUsersQuery}
              onChange={(e) => setAllUsersQuery(e.target.value)}
              placeholder="Tüm kullanıcılarda e-posta/kullanıcı adı ara"
              autoComplete="off"
            />
            <button type="submit">Listeyi Filtrele</button>
          </form>

          <div className="admin-row admin-quick-row">
            <input
              type="text"
              value={quickActionReason}
              onChange={(e) => setQuickActionReason(e.target.value)}
              placeholder="Hızlı işlem nedeni (zorunlu, min. 3 karakter)"
              maxLength={160}
            />
            <input
              type="number"
              min="1"
              value={quickMuteHours}
              onChange={(e) => setQuickMuteHours(e.target.value)}
              placeholder="Susturma (saat)"
            />
            <input
              type="number"
              min="1"
              value={quickTempBanHours}
              onChange={(e) => setQuickTempBanHours(e.target.value)}
              placeholder="Geçici ban (saat)"
            />
          </div>

          {allUsersHint ? <p className="admin-meta">{allUsersHint}</p> : null}
          <div className="admin-user-grid">
            {allUsers.map((entry) => (
              <article key={`all:${entry.id}`} className="admin-user-card">
                <div className="admin-user-main">
                  <h3>{entry.username}</h3>
                  <p>{entry.email}</p>
                  <p className="admin-meta">
                    Rol: <strong>{entry.role}</strong> | Son giriş: {fmtDate(entry.lastLoginAt)}
                  </p>
                  <p className="admin-meta">
                    Şifre: {String(entry?.credentials?.passwordStatus || 'Gizli')}
                  </p>
                </div>
                <button type="button" onClick={() => void selectUser(entry)} disabled={busy === 'resolve-user'}>
                  {busy === 'resolve-user' ? 'Doğrulanıyor...' : selected?.id === entry.id ? 'Seçili' : 'Kullanıcıyı Seç'}
                </button>
                <div className="admin-user-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy === `quick:mute:${entry.id}`}
                    onClick={() => void runQuickAction('mute', entry)}
                  >
                    {busy === `quick:mute:${entry.id}` ? 'İşleniyor...' : 'Sustur'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy === `quick:temp-ban:${entry.id}`}
                    onClick={() => void runQuickAction('temp-ban', entry)}
                  >
                    {busy === `quick:temp-ban:${entry.id}` ? 'İşleniyor...' : 'Geçici Ban'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={busy === `quick:perm-ban:${entry.id}`}
                    onClick={() => void runQuickAction('perm-ban', entry)}
                  >
                    {busy === `quick:perm-ban:${entry.id}` ? 'İşleniyor...' : 'Kalıcı Ban'}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={busy === `quick:delete:${entry.id}`}
                    onClick={() => void runQuickAction('delete-account', entry)}
                  >
                    {busy === `quick:delete:${entry.id}` ? 'İşleniyor...' : 'Hesabı Sil'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isAdmin && (canCashGrant || canDiaGrant || canCashRevoke || canDiaRevoke || canResourceGrant || canResourceRevoke) ? (
        <section className="admin-card">
          <h2>3) Ekonomi İşlemleri</h2>
          <p className="admin-reason-flag">Neden alanı opsiyoneldir. Dilersen boş bırakabilirsin.</p>
          <div className="admin-economy-grid">
            {(canCashGrant || canCashRevoke) ? (
              <article className="admin-economy-card">
                <div className="admin-economy-head"><img className="admin-economy-icon" src="/home/icons/depot/cash.webp" alt="" /><h3>Nakit</h3></div>
                {canCashGrant ? (
                  <div className="admin-row admin-row-compact">
                    <input type="number" value={cashAdd} onChange={(e) => setCashAdd(e.target.value)} placeholder="Eklenecek nakit" />
                    <input type="text" className="admin-reason-input" value={cashAddReason} onChange={(e) => setCashAddReason(e.target.value)} placeholder="Neden (opsiyonel)" maxLength={160} />
                    <button type="button" disabled={!selected || busy === 'cash-grant'} onClick={() => void runEconomy('grant', 'cash')}>{busy === 'cash-grant' ? 'İşleniyor...' : 'Nakit Ekle'}</button>
                  </div>
                ) : null}
                {canCashRevoke ? (
                  <div className="admin-row admin-row-compact">
                    <input type="number" value={cashSub} onChange={(e) => setCashSub(e.target.value)} placeholder="Düşülecek nakit" />
                    <input type="text" className="admin-reason-input" value={cashSubReason} onChange={(e) => setCashSubReason(e.target.value)} placeholder="Neden (opsiyonel)" maxLength={160} />
                    <button type="button" className="btn-danger" disabled={!selected || busy === 'cash-revoke'} onClick={() => void runEconomy('revoke', 'cash')}>{busy === 'cash-revoke' ? 'İşleniyor...' : 'Nakit Düş'}</button>
                  </div>
                ) : null}
              </article>
            ) : null}

            {(canDiaGrant || canDiaRevoke) ? (
              <article className="admin-economy-card">
                <div className="admin-economy-head"><img className="admin-economy-icon" src="/home/icons/depot/diamond.webp" alt="" /><h3>Elmas</h3></div>
                {canDiaGrant ? (
                  <div className="admin-row admin-row-compact">
                    <input type="number" value={diaAdd} onChange={(e) => setDiaAdd(e.target.value)} placeholder="Eklenecek elmas" />
                    <input type="text" className="admin-reason-input" value={diaAddReason} onChange={(e) => setDiaAddReason(e.target.value)} placeholder="Neden (opsiyonel)" maxLength={160} />
                    <button type="button" disabled={!selected || busy === 'dia-grant'} onClick={() => void runEconomy('grant', 'diamond')}>{busy === 'dia-grant' ? 'İşleniyor...' : 'Elmas Ekle'}</button>
                  </div>
                ) : <p className="admin-inline-note">Elmas ekleme bu hesapta kapalı.</p>}
                {canDiaRevoke ? (
                  <div className="admin-row admin-row-compact">
                    <input type="number" value={diaSub} onChange={(e) => setDiaSub(e.target.value)} placeholder="Düşülecek elmas" />
                    <input type="text" className="admin-reason-input" value={diaSubReason} onChange={(e) => setDiaSubReason(e.target.value)} placeholder="Neden (opsiyonel)" maxLength={160} />
                    <button type="button" className="btn-danger" disabled={!selected || busy === 'dia-revoke'} onClick={() => void runEconomy('revoke', 'diamond')}>{busy === 'dia-revoke' ? 'İşleniyor...' : 'Elmas Düş'}</button>
                  </div>
                ) : null}
              </article>
            ) : null}

            {(canResourceGrant || canResourceRevoke) ? (
              <article className="admin-economy-card">
                <div className="admin-economy-head"><img className="admin-economy-icon" src="/home/icons/depot/capacity.png" alt="" /><h3>Depo Kaynakları</h3></div>
                {resourceCatalog.length ? (
                  <>
                    <div className="admin-resource-row">
                      <label htmlFor="admin-resource-item">Kaynak Seçimi</label>
                      <select
                        id="admin-resource-item"
                        value={resourceItemId}
                        onChange={(event) => setResourceItemId(event.target.value)}
                      >
                        {resourceCatalog.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.name} ({entry.id})</option>
                        ))}
                      </select>
                    </div>

                    {canResourceGrant ? (
                      <div className="admin-row admin-row-compact">
                        <input type="number" value={resourceAddAmount} onChange={(e) => setResourceAddAmount(e.target.value)} placeholder="Eklenecek miktar" />
                        <input type="text" className="admin-reason-input" value={resourceAddReason} onChange={(e) => setResourceAddReason(e.target.value)} placeholder="Neden (opsiyonel)" maxLength={160} />
                        <button type="button" disabled={!selected || busy === 'resource-grant'} onClick={() => void runResourceInventory('grant')}>{busy === 'resource-grant' ? 'İşleniyor...' : 'Kaynak Ekle'}</button>
                      </div>
                    ) : null}

                    {canResourceRevoke ? (
                      <div className="admin-row admin-row-compact">
                        <input type="number" value={resourceSubAmount} onChange={(e) => setResourceSubAmount(e.target.value)} placeholder="Düşülecek miktar" />
                        <input type="text" className="admin-reason-input" value={resourceSubReason} onChange={(e) => setResourceSubReason(e.target.value)} placeholder="Neden (opsiyonel)" maxLength={160} />
                        <button type="button" className="btn-danger" disabled={!selected || busy === 'resource-revoke'} onClick={() => void runResourceInventory('revoke')}>{busy === 'resource-revoke' ? 'İşleniyor...' : 'Kaynak Düş'}</button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="admin-inline-note">Kaynak kataloğu yüklenemedi.</p>
                )}
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {(canMsgBlock || canChatBlock || canTempBan) ? (
        <section className="admin-card">
          <h2>{isAdmin ? '4) Ceza İşlemleri' : '3) Moderatör Ceza İşlemleri'}</h2>
          <p className="admin-inline-note">Süreler saat cinsinden girilir; sistem arka planda dakikaya çevirir.</p>
          {isAdmin && canChatBlock ? (
            <div className="admin-row">
              <input type="number" min="1" value={chatHours} onChange={(e) => setChatHours(e.target.value)} placeholder="Sohbet engeli (saat)" />
              <input type="text" value={chatReason} onChange={(e) => setChatReason(e.target.value)} placeholder="Chat engel nedeni" maxLength={160} />
              <button type="button" disabled={!selected || busy === 'chat-block'} onClick={() => void applyPenalty('chat')}>{busy === 'chat-block' ? 'Uygulaniyor...' : 'Chat Engeli Ver'}</button>
            </div>
          ) : null}
          {canMsgBlock ? (
            <div className="admin-row">
              <input type="number" min="1" value={msgHours} onChange={(e) => setMsgHours(e.target.value)} placeholder="Mesaj engeli (saat)" />
              <input type="text" value={msgReason} onChange={(e) => setMsgReason(e.target.value)} placeholder="Mesaj engeli nedeni" maxLength={160} />
              <button type="button" disabled={!selected || busy === 'message-block'} onClick={() => void applyPenalty('message')}>{busy === 'message-block' ? 'Uygulaniyor...' : 'DM + Chat Engeli Ver'}</button>
              <button type="button" className="btn-secondary" disabled={!selected || busy === 'message-block-clear'} onClick={() => void clearMsgBlock()}>{busy === 'message-block-clear' ? 'Kaldırılıyor...' : 'Mesaj Engelini Kaldır'}</button>
            </div>
          ) : null}
          {isAdmin && canTempBan ? (
            <div className="admin-row">
              <input type="number" min="0" value={banHours} onChange={(e) => setBanHours(e.target.value)} placeholder="Ban (saat, 0=kalıcı)" />
              <input type="text" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Ban nedeni" maxLength={160} />
              <button type="button" className="btn-danger" disabled={!selected || busy === 'temp-ban'} onClick={() => void applyPenalty('ban')}>{busy === 'temp-ban' ? 'Uygulaniyor...' : 'Ban Uygula'}</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isAdmin && canRoleManage ? (
        <section className="admin-card">
          <h2>5) Moderatör Yönetimi</h2>
          <p className="admin-meta">Admin panelinde moderatör listesi ve moderatörlükten Çıkarma işlemi buradan yapılır.</p>
          <div className="admin-row">
            <input type="text" value={roleReason} onChange={(e) => setRoleReason(e.target.value)} placeholder="Rol değişim nedeni (opsiyonel)" maxLength={160} />
            <div className="admin-role-actions">
              <button type="button" disabled={!selected || roleOf(selected?.role) === 'moderator' || busy === `role:moderator:${selected?.id || ''}`} onClick={() => void changeRole('moderator')}>Moderatör Yap</button>
              <button type="button" className="btn-secondary" disabled={!selected || roleOf(selected?.role) === 'player' || busy === `role:player:${selected?.id || ''}`} onClick={() => void changeRole('player')}>Moderatörlükten Çıkar</button>
            </div>
          </div>
          <div className="admin-queue-grid">
            {(Array.isArray(queues.moderators) ? queues.moderators : []).map((m) => (
              <article key={m.userId} className="admin-queue-card">
                <div>
                  <h3>{m.username}</h3>
                  <p className="admin-meta">{m.email}</p>
                  <p className="admin-meta">Son giriş: {fmtDate(m.lastLoginAt)}</p>
                  <p className="admin-meta">Son haftalık maaş: {fmtDate(m.moderatorWeeklySalaryPaidAt)}</p>
                </div>
                <button type="button" className="btn-danger" disabled={busy === `role:player:${m.userId}`} onClick={() => void changeRole('player', { userId: m.userId, username: m.username, role: 'moderator' })}>{busy === `role:player:${m.userId}` ? 'İşleniyor...' : 'Moderatörlükten Çıkar'}</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="admin-card">
          <h2>6) Sistem Durumu</h2>
          <div className="admin-queue-meta-row">
            <span className="admin-chip">DB kullanıcı: {toInt(systemStatus?.db?.users, 0)}</span>
            <span className="admin-chip">DB profil: {toInt(systemStatus?.db?.profiles, 0)}</span>
            <span className="admin-chip">Yedek: {systemStatus?.backup?.ok ? 'Sağlam' : 'Hata'}</span>
            <span className="admin-chip">İstek: {toInt(systemStatus?.requestMetrics?.totalRequests, 0)}</span>
            <span className="admin-chip">Hata: {toInt(systemStatus?.requestMetrics?.totalErrors, 0)}</span>
            <span className="admin-chip">Uptime: {String(systemStatus?.process?.uptimeHuman || '-')}</span>
          </div>
          <p className="admin-meta">Aktif DB: {String(systemStatus?.db?.path || '-')}</p>
          <p className="admin-meta">
            Rolling yedek: {String(systemStatus?.backup?.files?.rollingBackup?.path || '-')}
          </p>
          <p className="admin-meta">
            Son kontrol: {fmtDate(systemStatus?.checkedAt || '')}
          </p>
        </section>
      ) : null}

      {isAdmin && canAnnouncementManage ? (
        <section className="admin-card">
          <h2>7) Duyuru Yönetimi</h2>
          <p className="admin-meta">Buradan yayınlanan duyurular şehir ekranındaki "Duyurular" alanında görünür.</p>
          <div className="admin-announcement-form">
            <select
              value={announcementType}
              onChange={(e) => setAnnouncementType(normalizeAnnouncementType(e.target.value))}
            >
              {ANNOUNCEMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="Duyuru başlığı (opsiyonel)"
              maxLength={80}
            />
            <textarea
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              placeholder="Duyuru metni"
              rows={5}
              maxLength={2400}
            />
            <div className="admin-announcement-actions">
              <button
                type="button"
                disabled={busy === 'announcement-create'}
                onClick={() => void publishAnnouncement()}
              >
                {busy === 'announcement-create'
                  ? 'Yay\u0131nlan\u0131yor...'
                  : (normalizeAnnouncementType(announcementType) === 'update' ? 'G\u00fcncelleme Yay\u0131nla' : 'Duyuru Yay\u0131nla')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!lastDeletedAnnouncementId || busy === 'announcement-restore'}
                onClick={() => void undoRemoveAnnouncement()}
              >
                {busy === 'announcement-restore' ? 'Geri Alınıyor...' : 'Son Silmeyi Geri Al'}
              </button>
            </div>
            {lastDeletedAnnouncementId ? (
              <p className="admin-meta">
                Son silinen: <strong>{lastDeletedAnnouncementTitle || 'Duyuru'}</strong>
                {lastDeletedAnnouncementUndoUntil ? ` | Geri alma bitişi: ${fmtDate(lastDeletedAnnouncementUndoUntil)}` : ''}
              </p>
            ) : null}
          </div>
          <div className="admin-announcement-list">
            {announcements.length === 0 ? <p className="admin-meta">Henüz duyuru bulunmuyor.</p> : null}
            {announcements.map((entry) => {
              const entryId = String(entry?.id || '').trim()
              const entryKey = entryId || `${String(entry?.createdAt || '').trim()}:${String(entry?.title || '').trim()}`
              const entryType = normalizeAnnouncementType(entry?.announcementType ?? entry?.type)
              const entryTypeLabel = announcementTypeLabel(entryType)
              return (
                <article key={entryKey} className="admin-announcement-card">
                  <div className="admin-announcement-top">
                    <h3>
                      <span className={`admin-chip admin-announcement-chip is-${entryType}`}>{entryTypeLabel}</span>
                      {' '}
                      {entry?.title || 'Duyuru'}
                    </h3>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={busy === `announcement-delete:${entryId}`}
                      onClick={() => void removeAnnouncement(entry)}
                    >
                      {busy === `announcement-delete:${entryId}` ? 'Siliniyor...' : 'Sil'}
                    </button>
                  </div>
                  <p className="admin-announcement-body">{entry?.body || '-'}</p>
                  <p className="admin-meta">
                    [{entry?.createdByUsername || 'Yönetim'}] | {fmtDate(entry?.createdAt || '')}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="admin-card">
        <h2>{isAdmin ? '8) Aktif Engeller' : '4) Verdiğin Mesaj Engelleri'}</h2>
        <div className="admin-queue-meta-row">
          <span className="admin-chip">Mesaj engeli: {visibleMsgBlocks.length}</span>
          {isAdmin ? <span className="admin-chip">Chat engeli: {toInt(queues?.counts?.chatBlocks, 0)}</span> : null}
          {isAdmin ? <span className="admin-chip">Geçici ban: {toInt(queues?.counts?.tempBans, 0)}</span> : null}
          {isAdmin ? <span className="admin-chip">Kalıcı ban: {toInt(queues?.counts?.permanentBans, 0)}</span> : null}
          <span className="admin-chip">Liste zamanı: {fmtDate(queues?.now)}</span>
        </div>

        <h3 className="admin-subtitle">Mesaj Engeli Listesi (DM + Chat)</h3>
        {visibleMsgBlocks.length === 0 ? <p className="admin-meta">Aktif mesaj engeli yok.</p> : null}
        <div className="admin-queue-grid">
          {visibleMsgBlocks.map((x) => (
            <article key={`msg:${x.userId}`} className="admin-queue-card">
              <div>
                <h3>{x.username}</h3>
                <p className="admin-meta">{x.email}</p>
                <p className="admin-meta">Kalan süre: {fmtRemain(x.remainingMs)} | Bitiş: {fmtDate(x.until)}</p>
                <p className="admin-meta">Durum: Chat={x.chatActive ? 'açık' : 'kapalı'} / DM={x.dmActive ? 'açık' : 'kapalı'}</p>
                <p className="admin-meta">Neden: {x.reason || '-'}</p>
              </div>
              <button type="button" className="btn-secondary" disabled={busy === `msg-clear:${x.userId}`} onClick={() => void clearMsgBlock({ userId: x.userId, username: x.username })}>{busy === `msg-clear:${x.userId}` ? 'Kaldırılıyor...' : 'Mesaj Engelini Kaldır'}</button>
            </article>
          ))}
        </div>

        {isAdmin ? (
          <>
            <h3 className="admin-subtitle">Sohbet Engeli Listesi</h3>
            {(Array.isArray(queues.chatBlocks) ? queues.chatBlocks : []).length === 0 ? <p className="admin-meta">Aktif chat engeli yok.</p> : null}
            <div className="admin-queue-grid">
              {(Array.isArray(queues.chatBlocks) ? queues.chatBlocks : []).map((x) => (
                <article key={`chat:${x.userId}`} className="admin-queue-card">
                  <div>
                    <h3>{x.username}</h3>
                    <p className="admin-meta">{x.email}</p>
                    <p className="admin-meta">Kalan süre: {fmtRemain(x.remainingMs)} | Bitiş: {fmtDate(x.until)}</p>
                    <p className="admin-meta">Neden: {x.reason || '-'}</p>
                  </div>
                </article>
              ))}
            </div>

            <h3 className="admin-subtitle">Geçici Ban Listesi</h3>
            {(Array.isArray(queues.tempBans) ? queues.tempBans : []).length === 0 ? <p className="admin-meta">Aktif geçici ban yok.</p> : null}
            <div className="admin-queue-grid">
              {(Array.isArray(queues.tempBans) ? queues.tempBans : []).map((x) => (
                <article key={`temp:${x.userId}`} className="admin-queue-card">
                  <div>
                    <h3>{x.username}</h3>
                    <p className="admin-meta">{x.email}</p>
                    <p className="admin-meta">Kalan süre: {fmtRemain(x.remainingMs)} | Bitiş: {fmtDate(x.until)}</p>
                    <p className="admin-meta">Neden: {x.reason || '-'}</p>
                  </div>
                  <button type="button" className="btn-secondary" disabled={busy === `ban-clear:temp:${x.userId}`} onClick={() => void clearBan(x, 'temp')}>{busy === `ban-clear:temp:${x.userId}` ? 'Kaldırılıyor...' : 'Geçici Banı Kaldır'}</button>
                </article>
              ))}
            </div>

            <h3 className="admin-subtitle">Kalıcı Ban Listesi</h3>
            {(Array.isArray(queues.permanentBans) ? queues.permanentBans : []).length === 0 ? <p className="admin-meta">Kalıcı ban yok.</p> : null}
            <div className="admin-queue-grid">
              {(Array.isArray(queues.permanentBans) ? queues.permanentBans : []).map((x) => (
                <article key={`perm:${x.userId}`} className="admin-queue-card">
                  <div>
                    <h3>{x.username}</h3>
                    <p className="admin-meta">{x.email}</p>
                    <p className="admin-meta">Engel zamanı: {fmtDate(x.blockedAt)}</p>
                    <p className="admin-meta">Neden: {x.reason || '-'}</p>
                  </div>
                  <button type="button" className="btn-secondary" disabled={busy === `ban-clear:perm:${x.userId}`} onClick={() => void clearBan(x, 'perm')}>{busy === `ban-clear:perm:${x.userId}` ? 'Kaldırılıyor...' : 'Kalıcı Banı Kaldır'}</button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {canViewLogs ? (
        <section className="admin-card">
          <h2>{isAdmin ? '9) Loglar' : '5) Loglar'}</h2>
          <div className="admin-row admin-log-filter-row">
            <input type="text" value={logAction} onChange={(e) => setLogAction(e.target.value)} placeholder="Aksiyon filtresi" />
            <input type="text" value={logStatus} onChange={(e) => setLogStatus(e.target.value)} placeholder="Durum filtresi" />
            <input type="text" value={logTarget} onChange={(e) => setLogTarget(e.target.value)} placeholder="Hedef kullanıcı/e-posta" />
            {isAdmin ? (
              <select value={logActorRole} onChange={(e) => setLogActorRole(e.target.value)}>
                <option value="">Tüm roller</option>
                <option value="moderator">Sadece moderatör işlemleri</option>
                <option value="admin">Sadece admin işlemleri</option>
              </select>
            ) : <input type="text" value="Tüm roller" disabled />}
            <button type="button" onClick={() => void loadLogs()} disabled={busy === 'logs'}>Log Yenile</button>
          </div>

          <div className="admin-log-grid">
            {logs.map((l) => (
              <article key={l.id} className="admin-log-card">
                <div className="admin-log-top">
                  <p className="admin-log-title">{String(l.action || '-')}</p>
                  <span className={`admin-log-status admin-log-status-${String(l.status || '').toLowerCase() || 'failed'}`}>{l.status || '-'}</span>
                </div>
                <p className="admin-meta">Yapan: {l.actorUsername || l.actorEmail || '-'} ({l.actorRole || '-'})</p>
                <p className="admin-meta">Hedef: {l.targetUsername || '-'} {l.targetEmail ? `(${l.targetEmail})` : ''}</p>
                <p className="admin-meta">Mesaj: {l.message || '-'}</p>
                <p className="admin-meta">Zaman: {fmtDate(l.createdAt)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default AdminPage


