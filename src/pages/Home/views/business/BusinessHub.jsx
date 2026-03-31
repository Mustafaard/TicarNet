import {
  fmt,
} from '../../utils.js'

export function renderBusinessHub(hp) {
  const {
  activeBusinessCards,
  businessScene,
  busy,
  companyBootstrapped,
  companyBusinessCount,
  companyBusinessLimit,
  companyLegalLabel,
  companyLevel,
  companyUpgrade,
  ctaBulkPrimary,
  ctaBulkSecondary,
  ctaSetupPrimary,
  ctaSetupSecondary,
  ctaUpgradePrimary,
  ctaUpgradeSecondary,
  nextCompanyUnlock,
  openBusinessDetail,
  openLogisticsCenter,
  openTab,
  premiumBoostActive,
  runBulkCollectPreview,
  setBusinessModal,
  totalBulkCount,
} = hp

  return (
    <>
  {businessScene === 'hub' ? (
    <article className="card fleet-overview-card">
      <div className="fleet-company-shell">
        <div className="fleet-overview-head">
          <h3>İşletmelerim</h3>
          <p className="fleet-overview-sub">Şirket seviyeni ve aktif işletme sınırını buradan takip edebilirsin.</p>
        </div>
        <div className="fleet-company-card">
          <div className="fleet-company-top">
            <div className="fleet-company-title">
              <small>Şirket ünvanı</small>
              <h4>{companyLegalLabel}</h4>
            </div>
            <button className="fleet-info-btn" type="button" onClick={() => void openTab('home', { tab: 'home' })}>Şehir</button>
          </div>
          <div className="fleet-company-main">
            <span className="fleet-hero-media" data-broken="0">
            <img
              src="/home/icons/isletmeler.webp"
              alt={companyLegalLabel}
              loading="lazy"
              onError={(event) => {
                const holder = event.currentTarget.parentElement
                if (holder) holder.setAttribute('data-broken', '1')
              }}
            />
            <span className="fleet-hero-fallback">İŞ</span>
            </span>
            <div className="fleet-company-meta">
              <small>İŞLETME SEVİYESİ</small>
              <strong className="level-text">{fmt(companyLevel)}. Seviye</strong>
              <small>AKTİF İŞLETME SEVİYESİ</small>
              <strong>{fmt(companyBusinessCount)} / {fmt(companyBusinessLimit)}</strong>
              <p>
                {companyBootstrapped
                  ? 'İşletmeni geliştir, ardından İş Kur bölümünden yeni işletme satın al.'
                  : 'Henüz aktif işletme yok. İş Kur bölümünden ilk işletmeni satın al.'}
              </p>
            </div>
          </div>
          <div className="fleet-company-actions">
            <button className="btn fleet-company-cta is-upgrade" onClick={() => setBusinessModal('upgrade')} disabled={Boolean(busy)}>
              <span className="fleet-company-cta-head">
                <span className="fleet-company-cta-title-wrap">
                  <span className="fleet-company-cta-title">Geliştir</span>
                </span>
                <span className={`fleet-company-cta-badge ${companyUpgrade?.maxReached ? 'is-muted' : 'is-live'}`.trim()}>
                  {companyUpgrade?.maxReached ? 'MAX' : 'Lv'}
                </span>
              </span>
              <strong className="fleet-company-cta-value">{ctaUpgradePrimary}</strong>
              <p className="fleet-company-cta-meta">{ctaUpgradeSecondary}</p>
            </button>
            <button className="btn fleet-company-cta is-bulk" onClick={runBulkCollectPreview} disabled={Boolean(busy)}>
              <span className="fleet-company-cta-head">
                <span className="fleet-company-cta-title-wrap">
                  <span className="fleet-company-cta-title">Toplu Tahsilat</span>
                </span>
                <span className={`fleet-company-cta-badge ${totalBulkCount > 0 ? 'is-live' : 'is-muted'}`.trim()}>
                  {premiumBoostActive ? '2x' : 'Net'}
                </span>
              </span>
              <strong className="fleet-company-cta-value">{ctaBulkPrimary}</strong>
              <p className="fleet-company-cta-meta">{ctaBulkSecondary}</p>
            </button>
            <button className="btn fleet-company-cta is-setup" onClick={() => setBusinessModal('setup')} disabled={Boolean(busy)}>
              <span className="fleet-company-cta-head">
                <span className="fleet-company-cta-title-wrap">
                  <span className="fleet-company-cta-title">İş Kur</span>
                </span>
                <span className={`fleet-company-cta-badge ${nextCompanyUnlock ? 'is-live' : 'is-muted'}`.trim()}>
                  {nextCompanyUnlock ? 'Yeni' : 'Tamam'}
                </span>
              </span>
              <strong className="fleet-company-cta-value">{ctaSetupPrimary}</strong>
              <p className="fleet-company-cta-meta">{ctaSetupSecondary}</p>
            </button>
          </div>
        </div>
      </div>
    </article>
  ) : null}
  {businessScene === 'hub' ? (
    <>
      <article className="card fleet-active-card">
        <div className="fleet-active-head">
          <h3>Aktif İşletmelerim</h3>
          <p className="fleet-section-hint">Gelir üreten tüm kiralama işletmelerin ve lojistik merkezini burada takip edebilirsin.</p>
        </div>
        <div className="fleet-secretary-box">
          <h4>Sekreter Notları</h4>
          <ul className="fleet-secretary-list">
            <li><strong>Tahsilat süresi:</strong> Tüm kiralama işletmelerinde tahsilat aralığı 60 dakikadır (saatlik).</li>
            <li><strong>Araç siparişi:</strong> Her işletme için 4 saatte bir yeni araç siparişi verilebilir.</li>
            <li><strong>Kapasite:</strong> Kapasite dolduğunda yeni araç üretimi otomatik olarak durur.</li>
            <li><strong>Sıfır siparişler:</strong> Yalnızca seviye ve depo şartları sağlandığında açılır.</li>
            <li><strong>Depo durumu:</strong> Depo malzemeleri yetersizse üretim başlatılamaz.</li>
          </ul>
        </div>
        {companyBootstrapped ? (
          <div className="fleet-active-grid">
            {activeBusinessCards.length ? activeBusinessCards.map((entry) => (
              <article key={entry.id} className="fleet-active-tile">
                <button
                  className="fleet-active-open"
                  onClick={() => {
                    if (entry.kind === 'logistics') {
                      void openLogisticsCenter()
                      return
                    }
                    openBusinessDetail(entry.id)
                  }}
                  disabled={Boolean(busy)}
                >
                  <span className="fleet-active-thumb" data-broken={entry.image ? '0' : '1'}>
                    {entry.image ? (
                      <img
                        src={entry.image}
                        alt={entry.name}
                        loading="lazy"
                        onError={(event) => {
                          const holder = event.currentTarget.parentElement
                          if (holder) holder.setAttribute('data-broken', '1')
                        }}
                      />
                    ) : null}
                    <span className="fleet-active-fallback">{entry.icon}</span>
                  </span>
                  <strong>{entry.name}</strong>
                  {entry.timerLabel ? <small className="fleet-active-timer">{entry.timerLabel}</small> : null}
                </button>
                <button
                  className="fleet-cash-btn"
                  onClick={() => {
                    if (entry.kind === 'logistics') {
                      void openLogisticsCenter()
                      return
                    }
                    openBusinessDetail(entry.id)
                  }}
                  disabled={Boolean(busy)}
                >
                  {entry.actionLabel}
                </button>
              </article>
            )) : <p className="empty">Henüz açılmış işletme yok. Geliştir ve İş Kur adımlarını tamamla.</p>}
          </div>
        ) : (
          <article className="fleet-note-panel">
            <p>Henüz aktif işletme yok.</p>
            <p>Soldaki <strong>Geliştir</strong> ile ilk işletmeni aç, ardından sağdaki <strong>İş Kur</strong> bölümünü kullan.</p>
          </article>
        )}
      </article>
    </>
  ) : null}
    </>
  )
}
