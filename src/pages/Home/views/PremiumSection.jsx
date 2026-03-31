import { fmt, num } from '../utils.js'

export function renderPremiumSection(hp) {
  const {
  avatarDisplaySrc,
  avatarIsGif,
  busy,
  dailyResetInfoLabel,
  dailyResetLabel,
  dailyStore,
  name,
  openDiamondMarketHub,
  premiumActive,
  premiumBestValuePlan,
  premiumCountdownLabel,
  premiumDiamond,
  premiumMultiplier,
  premiumPlanList,
  purchaseDailyOfferAction,
  purchasePremiumPlan,
} = hp

  return (
  <section className="panel-stack premium-screen">
    <article className="card premium-card">
      <div className="premium-hero">
        <div className="premium-title">
          <span className="premium-avatar-chip">
            <img
              className={avatarIsGif ? 'is-gif' : ''}
              src={avatarDisplaySrc}
              alt={`${name} avatarı`}
            />
          </span>
          <div className="premium-title-main">
            <h3 className="premium-brand-title">Premium Durumu</h3>
            <div className="premium-title-meta">
              <p className="muted premium-brand-sub">{name}</p>
            </div>
          </div>
        </div>

        <div className="premium-balance-pill">
          <span className="label">BAKİYE</span>
          <strong>
            <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
            {fmt(premiumDiamond)}
          </strong>
        </div>

        <div className={`premium-status ${premiumActive ? 'on' : 'off'}`}>
          <span className="premium-status-mark" aria-hidden>
            <img src="/home/icons/depot/premium.webp" alt="" />
          </span>
          <div className="premium-status-copy">
            <span className="premium-status-title">
              PRO ÜYELİK
            </span>
            <span className="premium-status-sub">
              {premiumActive
                ? 'Aktif'
                : 'Aktif değil'}
            </span>
            <span className="premium-status-meta">
              {premiumActive
                ? (premiumCountdownLabel || `${premiumMultiplier}x çarpan aktif`)
                : `Toplu tahsilatta ${premiumMultiplier}x için üyelik al.`}
            </span>
          </div>
        </div>
      </div>

      <div className="premium-hero-footer">
        <button
          type="button"
          className="premium-market-link premium-market-link-inline"
          onClick={() => void openDiamondMarketHub()}
          disabled={Boolean(busy)}
        >
          Elmas Marketine Git
        </button>
      </div>

      <article className="card premium-daily-card">
      <div className="premium-daily-head">
        <h4>Sınırlı Fırsatlar</h4>
        <p className="muted">
          Paketler her gün 00:00'dan sonra yeniden alınabilir. Çarpan sadece 20 gün tamamlanınca 2x artar.
          Para paketi en fazla 50.000.000, kaynak paketi en fazla 400.000 adede ulaşır.
        </p>
      </div>
      <div className="premium-daily-grid">
        {dailyStore.offers.map((offer) => {
          const isPurchased = offer.purchased
          const price = Math.max(0, Math.trunc(num(offer.price || 0)))
          const canAfford = !isPurchased && premiumDiamond >= price
          const busyKey = busy && busy.startsWith('daily:') ? busy : ''
          const isBusy = busyKey === `daily:${offer.id}`
          const actionLocked = Boolean(busy) && !isBusy
          const dailyOfferIcon = offer.id === 'daily-cash-1m'
            ? '/home/icons/depot/cash.webp'
            : '/home/icons/depot/diamond.webp'

          return (
            <div key={offer.id} className="premium-daily-offer">
              <div className="premium-daily-main">
                <span className="badge">GÜNLÜK</span>
                <div className="premium-daily-title">
                  <img src={dailyOfferIcon} alt="" aria-hidden="true" />
                  <strong>{offer.title}</strong>
                </div>
                <p>{offer.description}</p>
              </div>
              <div className="premium-daily-footer">
                <div className="premium-daily-price">
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  <span>{fmt(price)}</span>
                </div>
                <p className={`premium-daily-reset${isPurchased ? ' is-active' : ''}`}>
                  {isPurchased ? `Yeni hak: ${dailyResetLabel}` : dailyResetInfoLabel}
                </p>
                <button
                  className="btn full premium-gold-btn"
                  disabled={isPurchased || actionLocked}
                  onClick={() => {
                    if (canAfford) {
                      void purchaseDailyOfferAction(offer.id)
                      return
                    }
                    void openDiamondMarketHub()
                  }}
                >
                  {isPurchased
                    ? 'Bugün kullanıldı'
                    : isBusy
                      ? 'Yükleniyor...'
                      : canAfford
                        ? 'Satın Al'
                        : 'Elmas Marketi'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      </article>

      <div className="premium-plans">
        <div className="premium-plans-head">
          <h4>Premium Paketler</h4>
          <p className="muted">Süreler birikir, mevcut üyelik üzerine eklenir.</p>
        </div>
        <div className="premium-plan-grid">
          {premiumPlanList.map((plan) => {
            const planId = String(plan?.id || '').trim()
            const planDays = Math.max(1, Math.trunc(num(plan?.days || 0)))
            const planLabel = String(plan?.label || `${planDays} Gün`)
            const planPrice = Math.max(0, Math.trunc(num(plan?.price || 0)))
            const canAfford = premiumDiamond >= planPrice && Boolean(planId)
            const planKey = planId || planLabel
            const planDailyCost = Math.max(0, Math.round(planPrice / Math.max(1, planDays)))
            const balanceAfterPurchase = Math.max(0, premiumDiamond - planPrice)
            const isBestValue = Boolean(premiumBestValuePlan && planId && premiumBestValuePlan.id === planId)
            const actionLocked = Boolean(busy) && busy !== `premium:${planId}`

            let badgeLabel = ''
            if (isBestValue) badgeLabel = 'En Verimli'
            else if (planDays <= 7) badgeLabel = 'Popüler'
            else if (planDays >= 365) badgeLabel = 'Çok Avantajlı'
            else if (planDays >= 90) badgeLabel = 'Avantajlı'

            return (
              <article
                key={planKey}
                className={`premium-plan${badgeLabel ? ' is-featured' : ''}`}
              >
                <div className="premium-plan-head">
                  <strong>{planLabel}</strong>
                  {badgeLabel ? <span className="premium-plan-tag">{badgeLabel}</span> : null}
                </div>
                <p className="premium-plan-copy">
                  Toplu tahsilata {premiumMultiplier}x nakit kazandırır ve ek avantajlar sağlar.
                </p>
                <p className="premium-plan-copy">
                  Günlük maliyet: {fmt(planDailyCost)} elmas.
                </p>
                <div className="premium-plan-price">
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  <span>{fmt(planPrice)}</span>
                </div>
                <p className="premium-plan-copy">
                  {canAfford
                    ? `Satın alım sonrası bakiye: ${fmt(balanceAfterPurchase)} elmas`
                    : `Eksik bakiye: ${fmt(Math.max(0, planPrice - premiumDiamond))} elmas`}
                </p>
                <button
                  className="btn full premium-gold-btn"
                  disabled={actionLocked}
                  onClick={() => {
                    if (canAfford) {
                      void purchasePremiumPlan(planId)
                      return
                    }
                    void openDiamondMarketHub()
                  }}
                >
                  {busy === `premium:${planId}` ? 'Yükleniyor...' : canAfford ? 'Satın Al' : 'Elmas Marketi'}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </article>
  </section>
  )
}
