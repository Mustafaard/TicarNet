import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireTurkeyAccess } from '../middleware/accessPolicy.js'
import { requireModerator } from '../middleware/admin.js'
import {
  clearAdminBan,
  clearAdminUserLogos,
  createAdminAnnouncement,
  clearAdminMessageBlock,
  deleteAdminUserAccount,
  deleteAdminChatMessage,
  deleteAdminAnnouncement,
  deleteAdminDirectMessage,
  getAdminAnnouncements,
  getAdminCapabilities,
  getAdminLogs,
  getAdminSystemStatus,
  getModerationQueues,
  listAdminUsers,
  grantAdminCash,
  grantAdminDiamonds,
  grantAdminResource,
  revokeAdminCash,
  revokeAdminDiamonds,
  revokeAdminResource,
  restoreAdminAnnouncement,
  resolveAdminUser,
  searchAdminUsers,
  setAdminChatBlock,
  setAdminMute,
  setAdminMessageBlock,
  setAdminTempBan,
  updateAdminUserEmail,
  updateAdminUserPassword,
  setAdminUserRole,
} from '../services/admin.js'

const adminRouter = Router()

const STATUS_BY_REASON = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  duplicate: 409,
}

function sendResult(res, result) {
  if (result?.success) {
    res.json(result)
    return
  }
  const status = STATUS_BY_REASON[result?.reason] || 400
  res.status(status).json(
    result || {
      success: false,
      reason: 'unknown_error',
      errors: { global: 'İşlem tamamlanamadı.' },
    },
  )
}

adminRouter.use(requireAuth, requireTurkeyAccess, requireModerator)

adminRouter.get('/capabilities', async (req, res, next) => {
  try {
    const result = await getAdminCapabilities(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/users', async (req, res, next) => {
  try {
    const result = await searchAdminUsers(req.auth.userId, {
      query: req.query?.query || req.query?.username || '',
      limit: req.query?.limit,
      includeStaff: req.query?.includeStaff,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/users/all', async (req, res, next) => {
  try {
    const result = await listAdminUsers(req.auth.userId, {
      query: req.query?.query || req.query?.username || req.query?.email || '',
      limit: req.query?.limit,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/users/resolve', async (req, res, next) => {
  try {
    const result = await resolveAdminUser(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/users/email', async (req, res, next) => {
  try {
    const result = await updateAdminUserEmail(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/users/password', async (req, res, next) => {
  try {
    const result = await updateAdminUserPassword(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/users/delete', async (req, res, next) => {
  try {
    const result = await deleteAdminUserAccount(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/users/logos/clear', async (req, res, next) => {
  try {
    const result = await clearAdminUserLogos(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/economy/cash/grant', async (req, res, next) => {
  try {
    const result = await grantAdminCash(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/economy/diamond/grant', async (req, res, next) => {
  try {
    const result = await grantAdminDiamonds(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/economy/cash/revoke', async (req, res, next) => {
  try {
    const result = await revokeAdminCash(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/economy/diamond/revoke', async (req, res, next) => {
  try {
    const result = await revokeAdminDiamonds(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/economy/resource/grant', async (req, res, next) => {
  try {
    const result = await grantAdminResource(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/economy/resource/revoke', async (req, res, next) => {
  try {
    const result = await revokeAdminResource(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/moderation/chat-block', async (req, res, next) => {
  try {
    const result = await setAdminChatBlock(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/moderation/mute', async (req, res, next) => {
  try {
    const result = await setAdminMute(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/moderation/message-block', async (req, res, next) => {
  try {
    const result = await setAdminMessageBlock(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/moderation/message-block/clear', async (req, res, next) => {
  try {
    const result = await clearAdminMessageBlock(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/moderation/temp-ban', async (req, res, next) => {
  try {
    const result = await setAdminTempBan(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/moderation/ban/clear', async (req, res, next) => {
  try {
    const result = await clearAdminBan(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/moderation/queues', async (req, res, next) => {
  try {
    const result = await getModerationQueues(req.auth.userId, {
      scope: req.query?.scope,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/messages/chat/:messageId', async (req, res, next) => {
  try {
    const result = await deleteAdminChatMessage(req.auth.userId, {
      ...(req.body || {}),
      messageId: req.params.messageId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/messages/dm/:messageId', async (req, res, next) => {
  try {
    const result = await deleteAdminDirectMessage(req.auth.userId, {
      ...(req.body || {}),
      messageId: req.params.messageId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/users/role', async (req, res, next) => {
  try {
    const result = await setAdminUserRole(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/logs', async (req, res, next) => {
  try {
    const result = await getAdminLogs(req.auth.userId, {
      limit: req.query?.limit,
      action: req.query?.action,
      status: req.query?.status,
      actorRole: req.query?.actorRole,
      targetQuery: req.query?.targetQuery || req.query?.targetUsername || req.query?.targetEmail,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/system/status', async (req, res, next) => {
  try {
    const result = await getAdminSystemStatus(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/announcements', async (req, res, next) => {
  try {
    const result = await getAdminAnnouncements(req.auth.userId, {
      limit: req.query?.limit,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/announcements', async (req, res, next) => {
  try {
    const result = await createAdminAnnouncement(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/announcements/:announcementId', async (req, res, next) => {
  try {
    const result = await deleteAdminAnnouncement(req.auth.userId, {
      ...(req.body || {}),
      announcementId: req.params.announcementId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/announcements/restore', async (req, res, next) => {
  try {
    const result = await restoreAdminAnnouncement(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

export default adminRouter

