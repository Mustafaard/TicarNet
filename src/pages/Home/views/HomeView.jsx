import {
  ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC,
  ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC,
  BANK_MENU_ICON_FALLBACK_SRC,
  BANK_MENU_ICON_PRIMARY_SRC,
  DIAMOND_MARKET_MENU_ICON_FALLBACK_SRC,
  DIAMOND_MARKET_MENU_ICON_PRIMARY_SRC,
  EVENTS_MENU_ICON_FALLBACK_SRC,
  EVENTS_MENU_ICON_PRIMARY_SRC,
  FOREX_MENU_ICON_FALLBACK_SRC,
  FOREX_MENU_ICON_PRIMARY_SRC,
  RULES_MENU_ICON_FALLBACK_SRC,
  RULES_MENU_ICON_PRIMARY_SRC,
  SEASON_CHESTS_MENU_ICON_FALLBACK_SRC,
  SEASON_CHESTS_MENU_ICON_PRIMARY_SRC,
} from '../constants.js'
import {
  fmt,
} from '../utils.js'

export function renderHomeView(hp) {
  const {
    _loadLeague,
    busy,
    leaguePendingSeasonChests,
    openTab,
    setSeasonChestsOpen,
    setWarehouseOpen,
    weeklyEventsHomeHint,
  } = hp

return (
  <section className="panel-stack home-sections city-menu-stack">
    <article className="card module-card module-card-split">
      <h4 className="menu-section-title">Depom</h4>
      <div className="module-grid city-module-grid city-module-grid-single">
        <button
          className="module-btn module-btn-depot"
          onClick={() => setWarehouseOpen(true)}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/depom.webp" alt="Depom" />
          </span>
          <span className="module-copy">
            <span className="module-label">Depom</span>
            <span className="module-desc">Malzeme ve Stok</span>
          </span>
        </button>
      </div>
    </article>

    <article className="card module-card module-card-split">
      <h4 className="menu-section-title">Üretim ve Gelişim</h4>
      <div className="module-grid city-module-grid">
        <button
          className="module-btn module-btn-business"
          onClick={() => void openTab('businesses', { tab: 'businesses' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/isletmeler.webp" alt="İşletmeler" />
          </span>
          <span className="module-copy">
            <span className="module-label">İşletmeler</span>
            <span className="module-desc">İş kurup düzenli gelir toplarsın</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-business"
          onClick={() => void openTab('factories', { tab: 'factories' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/businesses/fabrikam.webp" alt="Fabrikalar" />
          </span>
          <span className="module-copy">
            <span className="module-label">Fabrikalar</span>
            <span className="module-desc">Üretim ve Gelişim</span>
            <span className="module-desc module-desc-sub">Üretimi Yönet</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-business module-btn-mines"
          onClick={() => void openTab('mines', { tab: 'mines' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/madenler.webp" alt="Madenler" />
          </span>
          <span className="module-copy">
            <span className="module-label">Madenler</span>
            <span className="module-desc">Kazı Yap</span>
            <span className="module-desc module-desc-sub">Kaynak Topla, Fabrikada Kullan</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-business"
          onClick={() => void openTab('missions', { tab: 'missions' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/v2/nav-missions.png" alt="Görevler" />
          </span>
          <span className="module-copy">
            <span className="module-label">Görevler</span>
            <span className="module-desc">5 görev serisi</span>
            <span className="module-desc module-desc-sub">Tamamla, ödülü al</span>
          </span>
        </button>
      </div>
    </article>

    <article className="card module-card module-card-split">
      <h4 className="menu-section-title">Ticaret ve Finans</h4>
      <div className="module-grid city-module-grid">
        <button
          className="module-btn module-btn-marketplace"
          onClick={() => void openTab('marketplace', { tab: 'marketplace' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/pazaryeri.webp" alt="Pazar Yeri" onError={(e) => { e.target.style.display = 'none'; const next = e.target.nextElementSibling; if (next) next.style.display = 'inline-block'; }} />
            <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🏪</span>
          </span>
          <span className="module-copy">
            <span className="module-label">Pazar Yeri</span>
            <span className="module-desc">Ticaret Alım Satım</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-marketplace module-btn-private"
          onClick={() => void openTab('private-listings', { tab: 'private-listings' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/ozel-ilanlar.png" alt="Özel İlanlar" />
          </span>
          <span className="module-copy">
            <span className="module-label">Özel İlanlar</span>
            <span className="module-desc">Sadece seçtiklerin</span>
            <span className="module-desc module-desc-sub">Arkadaşına özel al</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-marketplace module-btn-forex"
          onClick={() => void openTab('forex', { tab: 'forex' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img
              src={FOREX_MENU_ICON_PRIMARY_SRC}
              alt="Döviz İşlemleri"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  const next = node.nextElementSibling
                  if (next) next.style.display = 'inline-block'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = FOREX_MENU_ICON_FALLBACK_SRC
              }}
            />
            <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>💱</span>
          </span>
          <span className="module-copy">
            <span className="module-label">Döviz İşlemleri</span>
            <span className="module-desc">TicarNet Döviz Kuru</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-marketplace module-btn-bank"
          onClick={() => void openTab('bank', { tab: 'bank' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img
              src={BANK_MENU_ICON_PRIMARY_SRC}
              alt="Banka"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  const next = node.nextElementSibling
                  if (next) next.style.display = 'inline-block'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = BANK_MENU_ICON_FALLBACK_SRC
                const next = node.nextElementSibling
                if (next) next.style.display = 'inline-block'
              }}
            />
            <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🏦</span>
          </span>
          <span className="module-copy">
            <span className="module-label">Banka</span>
            <span className="module-desc">Paranı güvende biriktir</span>
            <span className="module-desc module-desc-sub">Banka hesabında</span>
          </span>
        </button>
      </div>
    </article>

    <article className="card module-card module-card-split">
      <h4 className="menu-section-title">Bilgilendirme ve Yönetim</h4>
      <div className="module-grid city-module-grid">
        <button
          className="module-btn module-btn-announcements"
          onClick={() => void openTab('announcements', { tab: 'announcements' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img
              src={ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC}
              alt="Duyurular"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC
              }}
            />
          </span>
          <span className="module-copy">
            <span className="module-label">Duyurular</span>
            <span className="module-desc">Resmi Bildiriler</span>
            <span className="module-desc module-desc-sub">Yetkili duyurular</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-events"
          onClick={() => void openTab('events', { tab: 'events' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img
              src={EVENTS_MENU_ICON_PRIMARY_SRC}
              alt="Etkinlikler"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = EVENTS_MENU_ICON_FALLBACK_SRC
              }}
            />
          </span>
          <span className="module-copy">
            <span className="module-label">Etkinlikler</span>
            <span className="module-desc">Takvim</span>
            <span className="module-desc module-desc-sub">{weeklyEventsHomeHint}</span>
          </span>
        </button>
        <button
          className="module-btn"
          onClick={() => void openTab('rules', { tab: 'rules' })}
          disabled={Boolean(busy)}
          aria-label="Oyun kurallarını görüntüle"
        >
          <span className="module-icon">
            <img
              src={RULES_MENU_ICON_PRIMARY_SRC}
              alt="Kurallar"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  const next = node.nextElementSibling
                  if (next) next.style.display = 'inline-block'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = RULES_MENU_ICON_FALLBACK_SRC
              }}
            />
            <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🛡️</span>
          </span>
          <span className="module-copy">
            <span className="module-label">Kurallar</span>
            <span className="module-desc">Oyun Kuralları</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-penalized"
          onClick={() => void openTab('penalized', { tab: 'penalized' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon" aria-hidden>🚫</span>
          <span className="module-copy">
            <span className="module-label">Cezalı Kullanıcılar</span>
            <span className="module-desc">Ceza alan kullanıcılar</span>
          </span>
        </button>
        <button
          className="module-btn module-btn-settings"
          onClick={() => void openTab('profile', { profileTab: 'profile' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img src="/home/icons/ayarlar.webp" alt="Ayarlar" />
          </span>
          <span className="module-copy">
            <span className="module-label">Ayarlar</span>
            <span className="module-desc">Hesap ve Profil</span>
          </span>
        </button>
      </div>
    </article>

    <article className="card module-card module-card-split">
      <h4 className="menu-section-title">Ödüller ve Premium</h4>
      <div className="module-grid city-module-grid">
        <button
          className="module-btn module-btn-season-chest"
          onClick={async () => {
            await _loadLeague().catch(() => {})
            setSeasonChestsOpen(true)
          }}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img
              src={SEASON_CHESTS_MENU_ICON_PRIMARY_SRC}
              alt="Sezon Sandıkları"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  const next = node.nextElementSibling
                  if (next) next.style.display = 'inline-block'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = SEASON_CHESTS_MENU_ICON_FALLBACK_SRC
                const next = node.nextElementSibling
                if (next) next.style.display = 'inline-block'
              }}
            />
            <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🎁</span>
          </span>
          <span className="module-copy">
            <span className="module-label">Sandıklar</span>
            <span className="module-desc">
              {leaguePendingSeasonChests.length > 0
                ? `${fmt(leaguePendingSeasonChests.length)} adet hazır`
                : 'Sezon ödülleri'}
            </span>
          </span>
        </button>
        <button
          id="module-diamond-market"
          className="module-btn module-btn-diamond"
          onClick={() => void openTab('profile', { profileTab: 'diamond-market' })}
          disabled={Boolean(busy)}
        >
          <span className="module-icon">
            <img
              src={DIAMOND_MARKET_MENU_ICON_PRIMARY_SRC}
              alt="Elmas Marketi"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = DIAMOND_MARKET_MENU_ICON_FALLBACK_SRC
              }}
            />
          </span>
          <span className="module-copy">
            <span className="module-label">Elmas Marketi</span>
            <span className="module-desc">Gerçek Ödeme</span>
          </span>
        </button>
      </div>
    </article>

  </section>
)
}
