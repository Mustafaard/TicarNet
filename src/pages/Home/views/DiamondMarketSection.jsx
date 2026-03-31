import {
  IS_NATIVE_ANDROID_RUNTIME,
} from '../constants.js'
import {
  fmt,
  fmtTry,
  num,
} from '../utils.js'

export function renderDiamondMarketSection(hp) {
  const {
  busy,
  diamondMarketPackages,
  openDiamondCashCheckout,
  premiumDiamond,
  welcomePackPurchased,
} = hp

  return (
  <section className="panel-stack diamond-market-screen">
    <article className="card premium-card">
      <div className="diamond-market-hero">
        <div>
          <h3>Elmas Marketi</h3>
          <p className="muted">Google Play Faturalandırma altyapısına uyumlu Türkçe elmas paketleri.</p>
        </div>
        <div className="premium-balance-pill">
          <span className="label">MEVCUT BAKİYE</span>
          <strong>
            <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
            {fmt(premiumDiamond)}
          </strong>
        </div>
      </div>

      {welcomePackPurchased ? (
        <p className="diamond-market-flag">Hoş geldin paketi bu hesapta kullanıldı.</p>
      ) : null}

      <div className="diamond-market-grid">
        {diamondMarketPackages.map((pack) => {
          const isWelcomePack = Boolean(pack.ribbon)
          const totalDiamonds = Math.max(0, Math.trunc(num(pack.diamonds || 0)))
          const perDiamondPrice = totalDiamonds > 0 ? num(pack.priceTry) / totalDiamonds : 0
          const packTitle = String(pack.title || `${fmt(totalDiamonds)} Elmas Paketi`).trim()
          return (
            <article key={pack.id} className={`diamond-pack${isWelcomePack ? ' is-welcome' : ''}`}>
              {isWelcomePack ? <span className="diamond-pack-ribbon">{pack.ribbon}</span> : null}
              <span className="diamond-pack-chip">
                <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                Elmas
              </span>
              <p className="diamond-pack-name">{packTitle}</p>
              <p className="diamond-pack-amount">{fmt(totalDiamonds)}</p>
              <p className="diamond-pack-unit">Tanesi {fmtTry(perDiamondPrice)}</p>
              {pack.note ? (
                <p className="diamond-pack-note">{pack.note}</p>
              ) : (
                <span className="diamond-pack-note-spacer" aria-hidden="true" />
              )}
              <button
                type="button"
                className="btn full premium-gold-btn diamond-pack-buy"
                onClick={() => { void openDiamondCashCheckout(pack) }}
                disabled={Boolean(busy)}
              >
                <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                <span>{fmtTry(pack.priceTry)}</span>
              </button>
            </article>
          )
        })}
      </div>

      <p className="muted diamond-market-note">
        {IS_NATIVE_ANDROID_RUNTIME
          ? 'Not: Android sürümünde dijital içerik satın alımları yalnızca Google Play Faturalandırma ile yapılır.'
          : 'Not: Web test akışı için `VITE_DIAMOND_CHECKOUT_URL` tanımlandığında butonlar ödeme sayfasına yönlendirir.'}
      </p>
    </article>
  </section>
  )
}
