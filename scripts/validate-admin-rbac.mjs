import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jwt from 'jsonwebtoken'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const nowIso = new Date().toISOString()
const tmpDir = path.resolve(rootDir, 'server/data/tmp-admin-rbac-test')
const tmpDbPath = path.resolve(tmpDir, 'db.json')

process.env.DB_FILE_PATH = tmpDbPath
process.env.ADMIN_DIAMOND_GRANT_ENABLED = 'true'
process.env.ADMIN_PANEL_OWNER_EMAIL = 'mustafaard76@gmail.com'

const { config } = await import('../server/src/config.js')
const { readDb, updateDb, writeDb } = await import('../server/src/db.js')
const { verifyAccessToken } = await import('../server/src/services/auth.js')
const {
  deleteAdminChatMessage,
  deleteAdminDirectMessage,
  getAdminCapabilities,
  getAdminLogs,
  grantAdminCash,
  grantAdminDiamonds,
  revokeAdminCash,
  revokeAdminDiamonds,
  resolveAdminUser,
  searchAdminUsers,
  setAdminChatBlock,
  setAdminMessageBlock,
  setAdminMute,
  setAdminTempBan,
  setAdminUserRole,
} = await import('../server/src/services/admin.js')
const { createChatMessage } = await import('../server/src/chat/service.js')
const { requireModerator } = await import('../server/src/middleware/admin.js')
const {
  staffBlockMessages,
  staffDeleteChatMessage,
  staffDeleteDirectMessage,
} = await import('../server/src/services/gameModeration.js')
const { sendDirectMessage } = await import('../server/src/game/service.js')

const users = {
  admin: {
    id: 'u-admin',
    username: 'Admin Prime',
    email: 'mustafaard76@gmail.com',
    role: 'admin',
  },
  moderator: {
    id: 'u-mod',
    username: 'Mod Prime',
    email: 'modprime@gmail.com',
    role: 'moderator',
  },
  player: {
    id: 'u-player',
    username: 'Player One',
    email: 'playerone@gmail.com',
    role: 'player',
  },
  targetA: {
    id: 'u-target-a',
    username: 'Target User',
    email: 'targetuser@gmail.com',
    role: 'player',
  },
  targetB: {
    id: 'u-target-b',
    username: 'Target Master',
    email: 'targetmaster@gmail.com',
    role: 'player',
  },
}

function reqId() {
  return crypto.randomUUID()
}

function assertFailure(result, reason) {
  assert.equal(result?.success, false, `Expected failure, got: ${JSON.stringify(result)}`)
  assert.equal(result?.reason, reason, `Expected reason '${reason}', got '${result?.reason}'`)
}

function createResponseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
  }
}

await fs.rm(tmpDir, { recursive: true, force: true })
await fs.mkdir(tmpDir, { recursive: true })

await writeDb({
  users: Object.values(users).map((user) => ({
    ...user,
    passwordHash: 'not-needed-for-this-validation',
    createdAt: nowIso,
    updatedAt: nowIso,
    lastLoginAt: nowIso,
    activeSessionId: `session-${user.id}`,
    adminBlocked: false,
    adminBlockedAt: '',
    adminBlockedReason: '',
    tempBanUntil: '',
    tempBanReason: '',
    chatBlockedUntil: '',
    chatBlockedReason: '',
    dmBlockedUntil: '',
    dmBlockedReason: '',
    chatMuteUntil: '',
    chatMuteReason: '',
    moderatorWeeklySalaryPaidAt: '',
  })),
  passwordResetTokens: [],
  accountDeletionRequests: [],
  gameProfiles: [
    {
      userId: users.targetA.id,
      username: users.targetA.username,
      wallet: 1000,
      reputation: 25,
      xpTotal: 750,
      updatedAt: nowIso,
    },
    {
      userId: users.targetB.id,
      username: users.targetB.username,
      wallet: 500,
      reputation: 15,
      xpTotal: 500,
      updatedAt: nowIso,
    },
    {
      userId: users.player.id,
      username: users.player.username,
      wallet: 450,
      reputation: 5,
      xpTotal: 200,
      updatedAt: nowIso,
    },
  ],
  marketState: null,
  forexState: null,
  globalAnnouncements: [],
  chatState: {
    rooms: { global: [], trade: [], clan: [] },
    userMeta: {},
  },
  directMessages: [],
  friendRequests: [],
  adminAuditLogs: [],
  adminActionRequests: [],
})

// 1) Oyuncu paneli gormemeli
const playerCaps = await getAdminCapabilities(users.player.id)
assertFailure(playerCaps, 'forbidden')

// 2) Moderator paneli gorebilir ancak ekonomi islemleri yapamaz
const moderatorCaps = await getAdminCapabilities(users.moderator.id)
assert.equal(moderatorCaps?.success, true)
assert.equal(moderatorCaps?.actor?.role, 'moderator')

const moderatorGrantAttempt = await grantAdminCash(users.moderator.id, {
  requestId: reqId(),
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 100,
  reason: 'Deneme',
})
assertFailure(moderatorGrantAttempt, 'forbidden')

// 3) Admin kullanici arama ve dogrulama
const adminSearch = await searchAdminUsers(users.admin.id, { query: 'Target', limit: 20 })
assert.equal(adminSearch?.success, true)
assert.equal((adminSearch?.users || []).length >= 2, true)

const adminSearchByEmail = await searchAdminUsers(users.admin.id, {
  query: users.targetA.email,
  limit: 20,
})
assert.equal(adminSearchByEmail?.success, true)
assert.equal(
  (adminSearchByEmail?.users || []).some((entry) => entry.id === users.targetA.id),
  true,
)

const wrongResolve = await resolveAdminUser(users.admin.id, {
  targetUsername: users.targetA.username,
  targetUserId: users.targetB.id,
})
assertFailure(wrongResolve, 'validation')

const resolvedTarget = await resolveAdminUser(users.admin.id, {
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
})
assert.equal(resolvedTarget?.success, true)
assert.equal(resolvedTarget?.user?.id, users.targetA.id)

// 4) Admin nakit gonderebilir + duplicate korumasi
const cashRequestId = reqId()
const cashGrant = await grantAdminCash(users.admin.id, {
  requestId: cashRequestId,
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 250,
  reason: 'Etkinlik odulu',
})
assert.equal(cashGrant?.success, true)

const cashGrantDuplicate = await grantAdminCash(users.admin.id, {
  requestId: cashRequestId,
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 250,
  reason: 'Etkinlik odulu',
})
assertFailure(cashGrantDuplicate, 'duplicate')

// 5) Admin elmas ekleyebilir
const diamondGrant = await grantAdminDiamonds(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 50,
  reason: 'Turnuva odulu',
})
assert.equal(diamondGrant?.success, true)

const dbAfterEconomy = await readDb()
const targetAEconomyProfile = dbAfterEconomy.gameProfiles.find((entry) => entry.userId === users.targetA.id)
assert.ok(targetAEconomyProfile, 'Target A profile should exist after economy ops')
assert.equal(
  (targetAEconomyProfile.notifications || []).some((entry) => String(entry?.message || '').includes('nakit')),
  true,
  'Cash grant should create a target notification',
)
assert.equal(
  (targetAEconomyProfile.notifications || []).some((entry) => String(entry?.message || '').includes('elmas')),
  true,
  'Diamond grant should create a target notification',
)
assert.equal(
  (targetAEconomyProfile.pushCenter?.inbox || []).length > 0,
  true,
  'Economy ops should write push inbox entries',
)

// 6) Admin nakit/elmas dusurebilir
const cashRevoke = await revokeAdminCash(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 50,
  reason: 'Yanlis transfer duzeltme',
})
assert.equal(cashRevoke?.success, true)

const diamondRevoke = await revokeAdminDiamonds(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 5,
  reason: 'Hatali odul duzeltme',
})
assert.equal(diamondRevoke?.success, true)

// 7) Admin moderator rol atayabilir ve geri alabilir
const promoteModerator = await setAdminUserRole(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetB.username,
  targetUserId: users.targetB.id,
  role: 'moderator',
  reason: 'Deneme gorevlendirmesi',
})
assert.equal(promoteModerator?.success, true)
assert.equal(promoteModerator?.user?.role, 'moderator')

const staffSearch = await searchAdminUsers(users.admin.id, {
  query: users.targetB.username,
  includeStaff: 'true',
  limit: 10,
})
assert.equal(staffSearch?.success, true)
assert.equal(
  (staffSearch?.users || []).some((entry) => entry.id === users.targetB.id && entry.role === 'moderator'),
  true,
)

const resolveModerator = await resolveAdminUser(users.admin.id, {
  targetUsername: users.targetB.username,
  targetUserId: users.targetB.id,
})
assert.equal(resolveModerator?.success, true)
assert.equal(resolveModerator?.user?.role, 'moderator')

const demoteModerator = await setAdminUserRole(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetB.username,
  targetUserId: users.targetB.id,
  role: 'player',
  reason: 'Gorev sonlandirma',
})
assert.equal(demoteModerator?.success, true)
assert.equal(demoteModerator?.user?.role, 'player')

// 8) Moderator oyun icinden chat/DM moderasyonu yapabilir
const chatMessage = await createChatMessage(users.targetA.id, {
  room: 'global',
  text: 'Bu mesaj moderator tarafindan silinecek.',
})
assert.equal(chatMessage?.success, true)

const deleteChat = await staffDeleteChatMessage(users.moderator.id, {
  requestId: reqId(),
  messageId: chatMessage.message.id,
  room: 'global',
  reason: 'Kural ihlali',
})
assert.equal(deleteChat?.success, true)

const dmId = 'dm-test-1'
await updateDb((db) => {
  if (!Array.isArray(db.directMessages)) db.directMessages = []
  db.directMessages.push({
    id: dmId,
    fromUserId: users.targetA.id,
    toUserId: users.player.id,
    text: 'Silinecek DM icerigi',
    createdAt: nowIso,
  })
  return db
})

const deleteDm = await staffDeleteDirectMessage(users.moderator.id, {
  requestId: reqId(),
  messageId: dmId,
  reason: 'Hakaret',
})
assert.equal(deleteDm?.success, true)

const modMessageBlock = await staffBlockMessages(users.moderator.id, {
  requestId: reqId(),
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  durationMinutes: 30,
  reason: 'Spam',
})
assert.equal(modMessageBlock?.success, true)

const mutedChatAttempt = await createChatMessage(users.targetA.id, {
  room: 'global',
  text: 'Mute test mesaji',
})
assertFailure(mutedChatAttempt, 'not_ready')

// 9) Admin mesaj engeli, chat engeli ve temp ban uygulayabilir
const messageBlockResult = await setAdminMessageBlock(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetB.username,
  targetUserId: users.targetB.id,
  durationMinutes: 45,
  reason: 'DM spam',
})
assert.equal(messageBlockResult?.success, true)

const blockedDirectMessageAttempt = await sendDirectMessage(users.targetB.id, {
  toUsername: users.targetA.username,
  text: 'Mesaj engeli test metni',
})
assertFailure(blockedDirectMessageAttempt, 'not_ready')

const chatBlockResult = await setAdminChatBlock(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.targetB.username,
  targetUserId: users.targetB.id,
  durationMinutes: 45,
  reason: 'Flood',
})
assert.equal(chatBlockResult?.success, true)

const chatBlockedAttempt = await createChatMessage(users.targetB.id, {
  room: 'global',
  text: 'Chat block test mesaji',
})
assertFailure(chatBlockedAttempt, 'not_ready')
assert.equal(String(chatBlockedAttempt?.errors?.global || '').includes('Sohbet engelin aktif'), true)

const tempBanResult = await setAdminTempBan(users.admin.id, {
  requestId: reqId(),
  targetUsername: users.player.username,
  targetUserId: users.player.id,
  durationMinutes: 90,
  reason: 'Kural ihlali',
})
assert.equal(tempBanResult?.success, true)

const dbAfterTempBan = await readDb()
const bannedUser = dbAfterTempBan.users.find((entry) => entry.id === users.player.id)
assert.ok(bannedUser, 'Temp ban user must exist')
const bannedToken = jwt.sign(
  {
    sub: bannedUser.id,
    jti: bannedUser.activeSessionId,
    role: bannedUser.role,
  },
  config.jwtSecret,
  { expiresIn: '1h' },
)
const verifiedBannedPayload = await verifyAccessToken(bannedToken)
assert.equal(verifiedBannedPayload, null)
// 10) Yetkisiz kullanıcı API/middleware ile de gecemez
const denyReq = { auth: { userId: users.player.id, role: 'player' } }
const denyRes = createResponseRecorder()
let denyNextCalled = false
await requireModerator(denyReq, denyRes, () => {
  denyNextCalled = true
})
assert.equal(denyNextCalled, false)
assert.equal(denyRes.statusCode, 403)

const allowReq = { auth: { userId: users.moderator.id, role: 'moderator' } }
const allowRes = createResponseRecorder()
let allowNextCalled = false
await requireModerator(allowReq, allowRes, () => {
  allowNextCalled = true
})
assert.equal(allowNextCalled, true)

const playerAdminAction = await grantAdminCash(users.player.id, {
  requestId: reqId(),
  targetUsername: users.targetA.username,
  targetUserId: users.targetA.id,
  amount: 10,
  reason: 'Yetkisiz deneme',
})
assertFailure(playerAdminAction, 'forbidden')

// 11) Tum islemler loglanmali
const logsPayload = await getAdminLogs(users.admin.id, { limit: 300 })
assert.equal(logsPayload?.success, true)
const logs = Array.isArray(logsPayload.logs) ? logsPayload.logs : []
assert.equal(logs.length > 0, true)

// getAdminLogs() suppresses user_search/user_resolve/logs_view and message delete actions
const requiredActions = [
  'cash_grant',
  'cash_revoke',
  'diamond_grant',
  'diamond_revoke',
  'user_role_update',
  'user_chat_block',
  'user_message_block',
  'user_temp_ban',
]
for (const action of requiredActions) {
  assert.equal(
    logs.some((entry) => String(entry?.action || '').trim() === action),
    true,
    `Missing log action: ${action}`,
  )
}
assert.equal(
  logs.some((entry) => String(entry?.action || '').trim() === 'cash_grant' && String(entry?.status || '').trim() === 'failed'),
  true,
  'Expected a failed cash_grant log entry',
)
assert.equal(
  logs.every((entry) => String(entry?.actorUserId || '').trim().length > 0),
  true,
  'All logs should have actorUserId',
)

const cashGrantLog = logs.find((entry) => entry.action === 'cash_grant' && entry.status === 'success')
assert.ok(cashGrantLog, 'Expected cash_grant success log')
assert.equal(typeof cashGrantLog?.meta?.amount, 'number')
assert.equal(cashGrantLog?.meta?.notificationSent, true)

const filteredLogsByTargetEmail = await getAdminLogs(users.admin.id, {
  limit: 200,
  targetQuery: users.targetA.email,
})
assert.equal(filteredLogsByTargetEmail?.success, true)
assert.equal(
  (filteredLogsByTargetEmail.logs || []).some((entry) => entry.targetUserId === users.targetA.id),
  true,
  'Target email filter should return target logs',
)

// 12) Frontend route gate: oyuncu gormemeli, admin ve moderator gorebilmeli
const appRouterSource = await fs.readFile(path.resolve(rootDir, 'src/app/AppRouter.jsx'), 'utf8')
assert.equal(
  appRouterSource.includes("currentRole === 'admin'"),
  true,
)
assert.equal(
  appRouterSource.includes("currentRole === 'admin' || currentRole === 'moderator'"),
  true,
)

console.log('RBAC validation passed.')
console.log(`DB used for validation: ${tmpDbPath}`)
