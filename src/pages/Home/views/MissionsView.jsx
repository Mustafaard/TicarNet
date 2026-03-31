import {
  fmt,
  formatCountdownClock,
  num,
} from '../utils.js'

export function renderMissionsView(hp) {
  const {
    busy,
    claimDailyMissionAction,
    missionBatchIndex,
    missionBatchSize,
    missionCashIconPng,
    missionClaimedCount,
    missionItems,
    missionProgressMeta,
    missionRewardItems,
    missionSeasonPointsTotal,
    missionSlotRemainingMs,
    missionXpIconPng,
    missions,
    openTab,
  } = hp

return (
  <section className="panel-stack home-sections missions-screen">
    <article className="card missions-card">
      <div className="missions-header">
        <div>
          <h3 style={{ margin: 0 }}>Görevler</h3>
          <p className="muted missions-subtitle">
            Ödülünü aldığın görev 4 saat sonra yenilenir.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home')}>
          Şehir
        </button>
      </div>

      {missions === null ? (
        <p className="empty" style={{ marginTop: 16 }}>
          Yükleniyor...
        </p>
      ) : missionItems.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>
          Görev bulunamadı.
        </p>
      ) : (
        <div className="missions-layout">
          <div className="missions-summary">
            <span className="missions-summary-pill">
              Seri #{fmt(missionBatchIndex)} · {fmt(missionClaimedCount)}/{fmt(missionBatchSize)} tamamlandı
            </span>
            <span className="missions-summary-pill">Sezon puanı: {fmt(missionSeasonPointsTotal)}</span>
            <span className="missions-summary-pill">Her görev ödülünde +10 sezon puanı kazanırsın.</span>
          </div>

          <div className="missions-grid-pro">
            {missionItems.map((mission, index) => {
              const missionId = String(mission?.id || '').trim() || `mission-${index}`
              const title = String(mission?.title || 'Görev').trim() || 'Görev'
              const description = String(mission?.description || '').trim()
              const progressMeta = missionProgressMeta(mission)
              const missionTimerRemainingMs = missionSlotRemainingMs(mission)
              const showMissionTimer = progressMeta.isClaimed
              const rewardCash = Math.max(
                0,
                Math.trunc(num(mission?.rewardCash ?? mission?.reward?.cash ?? 0)),
              )
              const rewardXp = Math.max(
                0,
                Math.trunc(num(mission?.rewardXp ?? mission?.reward?.xp ?? 0)),
              )
              const rewardItems = missionRewardItems(mission)
              const isClaiming = busy === `claim-mission:${missionId}`

              return (
                <article key={missionId} className="mission-card-pro">
                  <div className="mission-card-head">
                    <div className="mission-card-title-wrap">
                      <span className="mission-order-chip">#{index + 1}</span>
                      <div>
                        <p className="mission-card-title">{title}</p>
                        {description ? <p className="mission-card-desc">{description}</p> : null}
                      </div>
                    </div>
                    <div className="mission-head-meta">
                      {showMissionTimer ? (
                        <span className="mission-slot-timer" title="Yeni görev için kalan süre">
                          {formatCountdownClock(missionTimerRemainingMs)}
                        </span>
                      ) : null}
                      <span
                        className={`mission-status-chip ${progressMeta.isClaimed ? 'is-claimed' : progressMeta.isClaimable ? 'is-claimable' : 'is-active'}`}
                      >
                        {progressMeta.statusText}
                      </span>
                    </div>
                  </div>

                  <div className="mission-progress-wrap" aria-label="Görev ilerleme">
                    <div className="mission-progress-track" aria-hidden="true">
                      <div className="mission-progress-fill" style={{ width: `${progressMeta.percent}%` }} />
                    </div>
                    <p className="mission-progress-meta">
                      {fmt(progressMeta.progress)} / {fmt(progressMeta.target)} · %{fmt(progressMeta.percent)}
                    </p>
                  </div>

                  <div className="mission-reward-wrap">
                    <div className="mission-money-row">
                      <span className="mission-money-pill">
                        <img
                          src={missionCashIconPng}
                          alt=""
                          aria-hidden="true"
                          onError={(event) => {
                            event.currentTarget.src = '/home/icons/depot/cash.webp'
                          }}
                        />
                        <span>Nakit +{fmt(rewardCash)}</span>
                      </span>
                      <span className="mission-money-pill mission-money-pill-xp">
                        <img
                          src={missionXpIconPng}
                          alt=""
                          aria-hidden="true"
                          onError={(event) => {
                            event.currentTarget.src = '/home/ui/hud/xp-icon.webp'
                          }}
                        />
                        <span>XP +{fmt(rewardXp)}</span>
                      </span>
                    </div>
                    {rewardItems.length > 0 ? (
                      <div className="mission-reward-items">
                        {rewardItems.map((entry) => (
                          <span key={`${missionId}:${entry.itemId}`} className="mission-reward-item">
                            <img
                              src={entry.icon}
                              alt=""
                              aria-hidden="true"
                              onError={(event) => {
                                event.currentTarget.src = '/home/icons/v2/nav-missions.png'
                              }}
                            />
                            <span className="mission-reward-amount">{fmt(entry.amount)}</span>
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {progressMeta.isClaimable ? (
                    <div className="mission-claim-slot">
                      <button
                        type="button"
                        className="todo-go is-primary mission-claim-btn"
                        onClick={() => void claimDailyMissionAction(missionId)}
                        disabled={isClaiming}
                      >
                        {isClaiming ? 'Alınıyor...' : 'Ödülü Al'}
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      )}
    </article>
  </section>
)
}
