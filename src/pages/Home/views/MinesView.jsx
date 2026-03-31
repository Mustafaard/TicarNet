import {
  factoryItemMeta,
  fmt,
  formatCollectionCountdown,
  mineDisplayName,
  resolveMineImage,
} from '../utils.js'

export function renderMinesView(hp) {
  const {
    busy,
    fail,
    minesBaseMaxOutput,
    minesBaseMinOutput,
    minesCooldownMinutes,
    minesDigDurationSeconds,
    minesList,
    minesPremiumMaxOutput,
    minesPremiumMinOutput,
    openTab,
    setError,
    setMineConfirmModal,
  } = hp

return (
  <section className="panel-stack home-sections mines-screen">
    <article className="card">
      <div className="mines-head">
        <h3 className="mines-title">Madenler</h3>
        <button type="button" className="btn btn-ghost btn-sm mines-back-btn" onClick={() => void openTab('home', { tab: 'home' })}>Şehir</button>
      </div>
      <p className="muted mines-summary">
        Her maden için kazı süresi {fmt(minesDigDurationSeconds)} saniye, bekleme süresi {fmt(minesCooldownMinutes)} dakikadır. Standart üyeler {fmt(minesBaseMinOutput)}-{fmt(minesBaseMaxOutput)}, Premium üyeler {fmt(minesPremiumMinOutput)}-{fmt(minesPremiumMaxOutput)} arası rastgele kaynak kazanır. Kazı tamamlanınca ödül otomatik depoya aktarılır.
      </p>
      {minesList.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>Yükleniyor...</p>
      ) : (
        <div className="mines-grid">
          {minesList.map((mine) => {
            const meta = factoryItemMeta(mine.outputItemId)
            const safeMineName = mineDisplayName(mine)
            const busyDig = busy === `mine-dig:${mine.id}`
            const isBusy = busyDig
            const liveNextDigRemainingMs = mine.nextDigAt
              ? Math.max(0, new Date(mine.nextDigAt).getTime() - Date.now())
              : 0
            return (
              <article key={mine.id} className="card mine-card" data-mine-id={mine.id}>
                <div className="mine-card-hero-wrap">
                  <div className="mine-card-hero" data-broken="0">
                    <img
                      src={resolveMineImage(mine)}
                      alt=""
                      loading="lazy"
                      onError={(e) => { e.currentTarget?.parentElement?.setAttribute('data-broken', '1') }}
                    />
                    <span className="mine-card-hero-fallback">
                      <img src={meta?.icon || '/home/icons/depot/cash.webp'} alt="" aria-hidden />
                    </span>
                  </div>
                </div>
                <h4 className="mine-card-name">{safeMineName}</h4>
                {mine.isDigging && (
                  <p className="mine-card-hint mine-card-hint-digging">
                    Kazı sürüyor · Kalan <span style={{ color: '#ffd28d', fontWeight: 700 }}>{formatCollectionCountdown(mine.digRemainingMs)}</span>
                  </p>
                )}
                {mine.canCollect && <p className="mine-card-hint mine-card-hint-ready">Kazı tamamlandı, depoya aktarılıyor...</p>}
                {!mine.isDigging && !mine.canCollect && liveNextDigRemainingMs <= 0 && (
                  <p className="mine-card-hint mine-card-hint-start">Kazıyı başlatmak için dokun.</p>
                )}
                {!mine.isDigging && !mine.canCollect && liveNextDigRemainingMs > 0 && (
                  <div className="mine-card-countdown">
                    Sonraki kazı: {formatCollectionCountdown(liveNextDigRemainingMs)}
                  </div>
                )}
                <div className="mine-card-actions">
                  {mine.isDigging ? (
                    <button type="button" className="btn btn-ghost mine-card-action-full" disabled>Kazı Sürüyor</button>
                  ) : null}
                  {mine.canCollect ? (
                    <button type="button" className="btn btn-ghost mine-card-action-full" disabled>
                      Depoya Aktarılıyor
                    </button>
                  ) : null}
                  {!mine.isDigging && !mine.canCollect ? (
                    <button
                      type="button"
                      className="btn btn-accent mine-card-action-full"
                      onClick={() => {
                        if (mine && !mine.hasEnoughCash) {
                          fail(null, `Yetersiz nakit. ${safeMineName} kazısı için ${fmt(mine.costCash)} nakit gerekir.`)
                          setError(`Yetersiz nakit. ${safeMineName} kazısı için ${fmt(mine.costCash)} nakit gerekir.`)
                          return
                        }
                        if (mine && !mine.canStartDig) return
                        setMineConfirmModal(mine)
                      }}
                      disabled={Boolean(isBusy) || !mine.canStartDig}
                    >
                      {!mine.hasEnoughCash ? `Yetersiz nakit (${fmt(mine.costCash)})` : 'Kazıyı Başlat'}
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </article>
  </section>
)
}
