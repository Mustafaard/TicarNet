import { updateDb } from '../server/src/db.js'

const timestamp = new Date().toISOString()
let changed = 0

await updateDb((db) => {
  const profiles = Array.isArray(db?.gameProfiles) ? db.gameProfiles : []
  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object') continue
    if (!profile.league || typeof profile.league !== 'object') profile.league = { dailyPoints: 0, weeklyPoints: 0, seasonPoints: 0 }
    if (Number(profile.league.seasonPoints || 0) !== 0) {
      profile.league.seasonPoints = 0
      profile.updatedAt = timestamp
      changed += 1
    }
  }
  return db
})

console.log(`[season-reset] seasonPoints reset. profiles updated: ${changed}`)

