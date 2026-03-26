import {
  clearStaffMessageBlock,
  deleteStaffChatMessage,
  deleteStaffDirectMessage,
  setStaffMessageBlock,
} from './admin.js'

export async function staffDeleteChatMessage(actorUserId, payload = {}) {
  return deleteStaffChatMessage(actorUserId, {
    ...payload,
    reason: String(payload?.reason || '').trim().slice(0, 160),
  })
}

export async function staffDeleteDirectMessage(actorUserId, payload = {}) {
  return deleteStaffDirectMessage(actorUserId, {
    ...payload,
    reason: String(payload?.reason || '').trim().slice(0, 160),
  })
}

export async function staffBlockMessages(actorUserId, payload = {}) {
  return setStaffMessageBlock(actorUserId, payload)
}

export async function staffClearMessageBlock(actorUserId, payload = {}) {
  return clearStaffMessageBlock(actorUserId, payload)
}
