import { Router } from 'express'
import fs from 'node:fs/promises'
import { requireAuth } from '../middleware/auth.js'
import { requireTurkeyAccess } from '../middleware/accessPolicy.js'
import { requireModerator } from '../middleware/admin.js'
import { readDb, updateDb } from '../db.js'
import { config } from '../config.js'
import {
  buyFromSellOrder,
  buyMarketItem,
  buyBusiness,
  buyFactory,
  buyVehicleListing,
  cancelLimitOrder,
  cancelVehicleListing,
  claimLeague,
  openLeagueSeasonChest,
  scrapBusinessVehicle,
  scrapLogisticsTruck,
  scrapVehicleListing,
  claimMission,
  claimShipment,
  collectLogisticsIncome,
  collectBusiness,
  collectBusinessesBulk,
  collectFactory,
  collectFactoriesBulk,
  collectMine,
  createMarketAuction,
  createPushPriceAlert,
  createContract,
  createShipment,
  getContracts,
  getDirectMessageThread,
  getMessageCenter,
  getBusinesses,
  getFactories,
  getGameOverview,
  getLeague,
  getLogistics,
  getMarket,
  getForex,
  getMines,
  getMissions,
  getOrderBook,
  getProfileDetails,
  getPublicProfile,
  getFriendsState,
  getPushCenter,
  listBusinessVehicleForSale,
  listLogisticsTruckForSale,
  markMessageCenterRead,
  markMessageCenterNotificationsRead,
  markPushNotificationRead,
  placeLimitOrder,
  placeMarketAuctionBid,
  purchaseLogisticsTruck,
  produceBusinessVehicle,
  registerPushDevice,
  respondContract,
  respondFriendRequest,
  removeFriend,
  reportDirectMessage,
  sendFriendRequest,
  sendDirectMessage,
  setBlockStatus,
  sellMarketItem,
  buyForexCurrency,
  claimBankTermDeposit,
  depositBankCash,
  getBank,
  sellForexCurrency,
  openBankTermDeposit,
  withdrawBankCash,
  speedupFactoryBuild,
  speedupFactoryUpgrade,
  startMineDig,
  unregisterPushDevice,
  updateProfileAvatarUpload,
  updateProfileAvatarUrl,
  updateProfileDisplayName,
  updatePushPreferences,
  upgradeFactory,
  upgradeBusiness,
  getDailyStore,
  getDailyLoginReward,
  consumeDiamondWelcomePack,
  claimDailyLoginReward,
  purchaseDailyOffer,
  purchasePremium,
} from '../game/service.js'
import { createChatMessage, getChatRoomMessages, reportChatMessage } from '../chat/service.js'
import {
  staffBlockMessages,
  staffClearMessageBlock,
  staffDeleteChatMessage,
  staffDeleteDirectMessage,
} from '../services/gameModeration.js'
import {
  AVATAR_MAX_FILE_SIZE,
  avatarUpload,
  buildAvatarPublicUrl,
  downloadAvatarFromUrl,
  resolveAvatarPathFromPublicUrl,
} from '../services/avatarUpload.js'
import { sendSupportRequestEmail } from '../services/mailer.js'
import { getPenalizedUsers } from '../services/admin.js'
import { getClientIp } from '../utils.js'

const gameRouter = Router()

const STATUS_BY_REASON = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  service_unavailable: 503,
  duplicate: 409,
  insufficient_stock: 409,
  insufficient_funds: 409,
  insufficient_inventory: 409,
  nothing_to_collect: 409,
  not_ready: 409,
  already_claimed: 409,
}

function uploadErrorPayload(message) {
  return {
    success: false,
    reason: 'validation',
    errors: { global: message },
  }
}

async function deleteFileSafe(filePath) {
  if (!filePath) return
  try {
    await fs.unlink(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('[AVATAR_DELETE_FAILED]', error)
    }
  }
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
      errors: { global: '\u0130\u015flem tamamlanamadi.' },
    },
  )
}

function resolveSupportEmailStatus(error) {
  const code = String(error?.code || '').trim().toUpperCase()
  if (code === 'EAUTH' || code === 'EENVELOPE') {
    return 'failed'
  }

  const message = String(error?.message || '').trim().toLowerCase()
  if (
    message.includes('smtp ayar')
    || message.includes('smtp')
    || message.includes('invalid login')
    || message.includes('missing')
  ) {
    return 'failed'
  }

  return 'queued'
}

gameRouter.use(requireAuth, requireTurkeyAccess)

gameRouter.get('/overview', async (req, res, next) => {
  try {
    const result = await getGameOverview(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/market', async (req, res, next) => {
  try {
    const result = await getMarket(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/market/orderbook', async (req, res, next) => {
  try {
    const result = await getOrderBook(req.auth.userId, req.query.itemId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/orderbook/orders', async (req, res, next) => {
  try {
    const result = await placeLimitOrder(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/orderbook/orders/:orderId/cancel', async (req, res, next) => {
  try {
    const result = await cancelLimitOrder(req.auth.userId, req.params.orderId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/buy', async (req, res, next) => {
  try {
    const result = await buyMarketItem(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/buy-from-order', async (req, res, next) => {
  try {
    const result = await buyFromSellOrder(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/sell', async (req, res, next) => {
  try {
    const result = await sellMarketItem(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/auctions', async (req, res, next) => {
  try {
    const result = await createMarketAuction(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/market/auctions/:auctionId/bid', async (req, res, next) => {
  try {
    const result = await placeMarketAuctionBid(
      req.auth.userId,
      req.params.auctionId,
      req.body || {},
    )
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/forex', async (req, res, next) => {
  try {
    const result = await getForex(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/forex/buy', async (req, res, next) => {
  try {
    const result = await buyForexCurrency(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/forex/sell', async (req, res, next) => {
  try {
    const result = await sellForexCurrency(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/bank', async (req, res, next) => {
  try {
    const result = await getBank(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/bank/deposit', async (req, res, next) => {
  try {
    const result = await depositBankCash(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/bank/withdraw', async (req, res, next) => {
  try {
    const result = await withdrawBankCash(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/bank/term/open', async (req, res, next) => {
  try {
    const result = await openBankTermDeposit(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/bank/term/claim', async (req, res, next) => {
  try {
    const result = await claimBankTermDeposit(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/businesses', async (req, res, next) => {
  try {
    const result = await getBusinesses(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/factories', async (req, res, next) => {
  try {
    const result = await getFactories(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/factories/buy', async (req, res, next) => {
  try {
    const result = await buyFactory(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/factories/collect/bulk', async (req, res, next) => {
  try {
    const result = await collectFactoriesBulk(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/factories/:factoryId/collect', async (req, res, next) => {
  try {
    const result = await collectFactory(req.auth.userId, req.params.factoryId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/factories/:factoryId/upgrade', async (req, res, next) => {
  try {
    const result = await upgradeFactory(req.auth.userId, req.params.factoryId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/factories/:factoryId/speedup', async (req, res, next) => {
  try {
    const result = await speedupFactoryUpgrade(req.auth.userId, req.params.factoryId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/factories/:factoryId/speedup-build', async (req, res, next) => {
  try {
    const result = await speedupFactoryBuild(req.auth.userId, req.params.factoryId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/mines', async (req, res, next) => {
  try {
    const result = await getMines(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/mines/:mineId/dig', async (req, res, next) => {
  try {
    const result = await startMineDig(req.auth.userId, req.params.mineId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/mines/:mineId/collect', async (req, res, next) => {
  try {
    const result = await collectMine(req.auth.userId, req.params.mineId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/logistics', async (req, res, next) => {
  try {
    const result = await getLogistics(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/logistics', async (req, res, next) => {
  try {
    const result = await createShipment(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/logistics/trucks', async (req, res, next) => {
  try {
    const result = await purchaseLogisticsTruck(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/logistics/trucks/:truckId/list', async (req, res, next) => {
  try {
    const result = await listLogisticsTruckForSale(req.auth.userId, req.params.truckId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/logistics/:shipmentId/claim', async (req, res, next) => {
  try {
    const result = await claimShipment(req.auth.userId, req.params.shipmentId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/logistics/collect', async (req, res, next) => {
  try {
    const result = await collectLogisticsIncome(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/buy', async (req, res, next) => {
  try {
    const result = await buyBusiness(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/:businessId/upgrade', async (req, res, next) => {
  try {
    const result = await upgradeBusiness(req.auth.userId, req.params.businessId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/:businessId/produce-vehicle', async (req, res, next) => {
  try {
    const result = await produceBusinessVehicle(req.auth.userId, req.params.businessId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/:businessId/list-vehicle', async (req, res, next) => {
  try {
    const result = await listBusinessVehicleForSale(req.auth.userId, req.params.businessId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/:businessId/scrap-vehicle', async (req, res, next) => {
  try {
    const result = await scrapBusinessVehicle(req.auth.userId, req.params.businessId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/vehicle-market/:listingId/buy', async (req, res, next) => {
  try {
    const result = await buyVehicleListing(req.auth.userId, req.params.listingId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/vehicle-market/:listingId/cancel', async (req, res, next) => {
  try {
    const result = await cancelVehicleListing(req.auth.userId, req.params.listingId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/vehicle-market/:listingId/scrap', async (req, res, next) => {
  try {
    const result = await scrapVehicleListing(req.auth.userId, req.params.listingId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/logistics/:truckId/scrap-truck', async (req, res, next) => {
  try {
    const result = await scrapLogisticsTruck(req.auth.userId, req.params.truckId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/:businessId/collect', async (req, res, next) => {
  try {
    const result = await collectBusiness(req.auth.userId, req.params.businessId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/businesses/collect/bulk', async (req, res, next) => {
  try {
    const result = await collectBusinessesBulk(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/rewards/daily-login', async (req, res, next) => {
  try {
    const result = await getDailyLoginReward(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/rewards/daily-login/claim', async (req, res, next) => {
  try {
    const result = await claimDailyLoginReward(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/store/daily', async (req, res, next) => {
  try {
    const result = await getDailyStore(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/store/daily/purchase', async (req, res, next) => {
  try {
    const result = await purchaseDailyOffer(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/store/diamond/welcome/consume', async (req, res, next) => {
  try {
    const result = await consumeDiamondWelcomePack(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/premium/purchase', async (req, res, next) => {
  try {
    const result = await purchasePremium(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/missions', async (req, res, next) => {
  try {
    const result = await getMissions(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/missions/:missionId/claim', async (req, res, next) => {
  try {
    const result = await claimMission(req.auth.userId, req.params.missionId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/league', async (req, res, next) => {
  try {
    const result = await getLeague(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/league/claim', async (req, res, next) => {
  try {
    const result = await claimLeague(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/league/chest/open', async (req, res, next) => {
  try {
    const result = await openLeagueSeasonChest(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/push', async (req, res, next) => {
  try {
    const result = await getPushCenter(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/push/settings', async (req, res, next) => {
  try {
    const result = await updatePushPreferences(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/support/request', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim()
    const description = String(req.body?.description || '').trim()

    if (title.length < 4 || title.length > 120) {
      sendResult(res, {
        success: false,
        reason: 'validation',
        errors: { title: 'Destek başlığı 4-120 karakter arasında olmalıdır.' },
      })
      return
    }

    if (description.length < 10 || description.length > 2500) {
      sendResult(res, {
        success: false,
        reason: 'validation',
        errors: { description: 'Destek açıklaması 10-2500 karakter arasında olmalıdır.' },
      })
      return
    }

    const db = await readDb()
    const user = Array.isArray(db?.users)
      ? db.users.find((entry) => String(entry?.id || '').trim() === String(req.auth.userId || '').trim())
      : null

    const ticketId = `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const createdAt = new Date().toISOString()
    const ipAddress = String(getClientIp(req) || '').trim() || '-'
    const userAgent = String(req.headers['user-agent'] || '').trim() || '-'
    const ticket = {
      ticketId,
      username: user?.username || 'Oyuncu',
      email: user?.email || '-',
      userId: String(req.auth.userId || '').trim(),
      title,
      description,
      createdAt,
      ipAddress,
      userAgent,
      emailStatus: 'queued',
    }

    await updateDb((draft) => {
      if (!Array.isArray(draft.supportTickets)) {
        draft.supportTickets = []
      }
      draft.supportTickets.push(ticket)
      return draft
    })

    let emailStatus = 'queued'

    try {
      await sendSupportRequestEmail({
        to: config.supportInboxEmail,
        ticketId,
        username: ticket.username,
        email: ticket.email,
        userId: ticket.userId,
        title,
        description,
        createdAt,
        ipAddress,
        userAgent,
      })
      emailStatus = 'sent'
    } catch (mailError) {
      emailStatus = resolveSupportEmailStatus(mailError)
      console.error('[SUPPORT_REQUEST_EMAIL_FAILED]', {
        ticketId,
        emailStatus,
        message: mailError?.message,
        code: mailError?.code,
      })
    }

    if (emailStatus !== 'queued') {
      try {
        await updateDb((draft) => {
          if (!Array.isArray(draft.supportTickets)) return draft
          const index = draft.supportTickets.findIndex((entry) => entry?.ticketId === ticketId)
          if (index < 0) return draft
          draft.supportTickets[index] = {
            ...draft.supportTickets[index],
            emailStatus,
          }
          return draft
        })
      } catch (statusUpdateError) {
        console.error('[SUPPORT_TICKET_STATUS_UPDATE_FAILED]', {
          ticketId,
          emailStatus,
          message: statusUpdateError?.message,
        })
      }
    }

    sendResult(res, {
      success: true,
      message: `Destek talebiniz alındı. Referans kodu: ${ticketId}`,
      ticketId,
      referenceCode: ticketId,
      emailStatus,
      supportInbox: config.supportInboxEmail,
    })
  } catch (error) {
    next(error)
  }
})
gameRouter.post('/push/price-alert', async (req, res, next) => {
  try {
    const result = await createPushPriceAlert(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/push/device/register', async (req, res, next) => {
  try {
    const result = await registerPushDevice(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/push/device/unregister', async (req, res, next) => {
  try {
    const result = await unregisterPushDevice(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/push/:pushId/read', async (req, res, next) => {
  try {
    const result = await markPushNotificationRead(req.auth.userId, req.params.pushId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/profile', async (req, res, next) => {
  try {
    const result = await getProfileDetails(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/profile/friends', async (req, res, next) => {
  try {
    const result = await getFriendsState(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/profile/:userId', async (req, res, next) => {
  try {
    const targetUserId = String(req.params.userId || '').trim()
    if (targetUserId === req.auth.userId) {
      const result = await getProfileDetails(req.auth.userId)
      sendResult(res, result)
      return
    }
    const result = await getPublicProfile(req.auth.userId, targetUserId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/:userId/friend-request', async (req, res, next) => {
  try {
    const targetUserId = String(req.params.userId || '').trim()
    const result = await sendFriendRequest(req.auth.userId, targetUserId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/friend-requests/:requestId/respond', async (req, res, next) => {
  try {
    const result = await respondFriendRequest(
      req.auth.userId,
      req.params.requestId,
      req.body || {},
    )
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/:userId/friends/remove', async (req, res, next) => {
  try {
    const targetUserId = String(req.params.userId || '').trim()
    const result = await removeFriend(req.auth.userId, targetUserId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/:userId/block', async (req, res, next) => {
  try {
    const targetUserId = String(req.params.userId || '').trim()
    const result = await setBlockStatus(req.auth.userId, targetUserId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/chat', async (req, res, next) => {
  try {
    const result = await getChatRoomMessages(req.auth.userId, req.query.room, req.query.limit)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/chat', async (req, res, next) => {
  try {
    const result = await createChatMessage(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/chat/messages/:messageId/report', async (req, res, next) => {
  try {
    const result = await reportChatMessage(req.auth.userId, {
      ...(req.body || {}),
      messageId: req.params.messageId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/moderation/chat/messages/:messageId/delete', requireModerator, async (req, res, next) => {
  try {
    const result = await staffDeleteChatMessage(req.auth.userId, {
      ...(req.body || {}),
      messageId: req.params.messageId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/moderation/dm/messages/:messageId/delete', requireModerator, async (req, res, next) => {
  try {
    const result = await staffDeleteDirectMessage(req.auth.userId, {
      ...(req.body || {}),
      messageId: req.params.messageId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/moderation/users/:userId/message-block', requireModerator, async (req, res, next) => {
  try {
    const result = await staffBlockMessages(req.auth.userId, {
      ...(req.body || {}),
      targetUserId: req.params.userId,
      targetLookup:
        req.body?.targetLookup ||
        req.body?.targetIdentifier ||
        req.body?.targetUsername ||
        req.body?.targetEmail ||
        req.params.userId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/moderation/users/:userId/message-block/clear', requireModerator, async (req, res, next) => {
  try {
    const result = await staffClearMessageBlock(req.auth.userId, {
      ...(req.body || {}),
      targetUserId: req.params.userId,
      targetLookup:
        req.body?.targetLookup ||
        req.body?.targetIdentifier ||
        req.body?.targetUsername ||
        req.body?.targetEmail ||
        req.params.userId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/messages', async (req, res, next) => {
  try {
    const result = await getMessageCenter(req.auth.userId, {
      filter: req.query.filter,
      limit: req.query.limit,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/messages/thread', async (req, res, next) => {
  try {
    const result = await getDirectMessageThread(req.auth.userId, {
      username: req.query.username,
      limit: req.query.limit,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/messages/send', async (req, res, next) => {
  try {
    const result = await sendDirectMessage(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/messages/:messageId/report', async (req, res, next) => {
  try {
    const result = await reportDirectMessage(req.auth.userId, {
      ...(req.body || {}),
      messageId: req.params.messageId,
    })
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/messages/:messageId/read', async (req, res, next) => {
  try {
    const result = await markMessageCenterRead(req.auth.userId, req.params.messageId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/messages/read-notifications', async (req, res, next) => {
  try {
    const result = await markMessageCenterNotificationsRead(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/display-name', async (req, res, next) => {
  try {
    const result = await updateProfileDisplayName(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/avatar/url', async (req, res, next) => {
  try {
    const rawAvatarUrl = String(req.body?.avatarUrl || '').trim()

    if (!rawAvatarUrl) {
      const resetResult = await updateProfileAvatarUrl(req.auth.userId, { avatarUrl: '' })
      const previousUploadPath = resolveAvatarPathFromPublicUrl(resetResult?.previousUploadUrl)
      if (resetResult?.success && previousUploadPath) {
        await deleteFileSafe(previousUploadPath)
      }
      sendResult(res, resetResult)
      return
    }

    const downloadResult = await downloadAvatarFromUrl(rawAvatarUrl)
    if (!downloadResult.success) {
      res.status(400).json(uploadErrorPayload(downloadResult.message || 'Avatar linki indirilemedi.'))
      return
    }

    const saveResult = await updateProfileAvatarUpload(req.auth.userId, {
      avatarUrl: downloadResult.avatarUrl,
    })

    if (!saveResult?.success) {
      await deleteFileSafe(downloadResult.filePath)
      sendResult(res, saveResult)
      return
    }

    const previousUploadPath = resolveAvatarPathFromPublicUrl(saveResult.previousUploadUrl)
    if (previousUploadPath && previousUploadPath !== downloadResult.filePath) {
      await deleteFileSafe(previousUploadPath)
    }

    sendResult(res, {
      ...saveResult,
      message: 'Avatar linkten çekildi ve kaydedildi.',
      sourceUrl: rawAvatarUrl,
    })
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/profile/avatar/upload', (req, res, next) => {
  avatarUpload.single('avatar')(req, res, async (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      res
        .status(400)
        .json(uploadErrorPayload(`Avatar dosyasi en fazla ${Math.round(AVATAR_MAX_FILE_SIZE / (1024 * 1024))}MB olabilir.`))
      return
    }

    if (error?.message === 'unsupported_image_type') {
      res
        .status(400)
        .json(uploadErrorPayload('Sadece PNG, JPG, WEBP veya GIF y\u00fckleyebilirsin.'))
      return
    }

    if (error) {
      next(error)
      return
    }

    if (!req.file) {
      res.status(400).json(uploadErrorPayload('Y\u00fcklenecek avatar dosyasi secilmedi.'))
      return
    }

    try {
      const avatarUrl = buildAvatarPublicUrl(req.file.filename)
      const result = await updateProfileAvatarUpload(req.auth.userId, { avatarUrl })
      if (!result?.success) {
        await deleteFileSafe(req.file.path)
        sendResult(res, result)
        return
      }

      const previousUploadPath = resolveAvatarPathFromPublicUrl(result.previousUploadUrl)
      if (previousUploadPath && previousUploadPath !== req.file.path) {
        await deleteFileSafe(previousUploadPath)
      }

      sendResult(res, result)
    } catch (routeError) {
      await deleteFileSafe(req.file.path)
      next(routeError)
    }
  })
})

gameRouter.get('/contracts', async (req, res, next) => {
  try {
    const result = await getContracts(req.auth.userId)
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/contracts', async (req, res, next) => {
  try {
    const result = await createContract(req.auth.userId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.post('/contracts/:contractId/respond', async (req, res, next) => {
  try {
    const result = await respondContract(req.auth.userId, req.params.contractId, req.body || {})
    sendResult(res, result)
  } catch (error) {
    next(error)
  }
})

gameRouter.get('/penalized-users', async (req, res, next) => {
  try {
    const result = await getPenalizedUsers()
    res.json(result)
  } catch (error) {
    next(error)
  }
})

gameRouter.use((req, res) => {
  res.status(404).json({
    success: false,
    reason: 'not_found',
    errors: { global: 'İstenen oyun endpointi bulunamadı.' },
  })
})

export default gameRouter
