import {
  COLLECTION_TAX_PERCENT,
} from '../../constants.js'
import {
  fmt,
} from '../../utils.js'

export function renderBusinessSetupModals(hp) {
  const {
  activeMarketModelOptions,
  activeModelFilter,
  businessModal,
  busy,
  buyCompanyBusiness,
  canUpgradeBusinessLevel,
  collectBulkAction,
  companyUpgrade,
  hasPropertyFleet,
  marketFilterForm,
  mustBuyNextUnlockFirst,
  nextCompanyUnlock,
  premiumActive,
  premiumMultiplier,
  resetMarketFilters,
  setBusinessModal,
  setMarketFilterForm,
  setupVisibleRows,
  totalBulkCount,
  totalBulkEnergyFuel,
  totalBulkIncome,
  totalBulkNet,
  totalBulkNet2x,
  totalBulkOilFuel,
  totalBulkTax,
  totalBulkXp,
  upBiz,
  upgradeAnchorBusinessId,
  upgradeCostValue,
  upgradeCurrentLevel,
  upgradeMaxLevel,
  upgradeMissingCashValue,
  upgradeNextLevel,
  upgradeProgressPercent,
  upgradeStatusLabel,
} = hp

  return (
    <>
  {businessModal === 'upgrade' ? (
  <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
    <article className="warehouse-modal fleet-modal fleet-upgrade-modal" onClick={(event) => event.stopPropagation()}>
      <h3>İşletmeyi Geliştir</h3>
      <p className="fleet-modal-subtitle">Şirket seviyeni artırarak yeni işletme alanlarının kilidini aç ve aktif işletme limitini büyüt.</p>
      {companyUpgrade ? (
        <>
          <div className="fleet-upgrade-box">
            <div className="fleet-upgrade-head">
              <span className="fleet-upgrade-eyebrow">Şirket Seviyesi</span>
              <strong className="fleet-upgrade-level">{fmt(upgradeCurrentLevel)} / {fmt(upgradeMaxLevel)}</strong>
              <p className="fleet-upgrade-target">
                {companyUpgrade.maxReached
                  ? 'Maksimum seviyeye ulaştın.'
                  : `Sonraki hedef: ${fmt(upgradeNextLevel)}. seviye`}
              </p>
            </div>
            <div className="fleet-upgrade-track">
              <span style={{ width: `${upgradeProgressPercent}%` }} />
            </div>
            <div className="fleet-upgrade-metrics">
              <article className="fleet-upgrade-metric">
                <span>Mevcut Seviye</span>
                <strong className="is-ok">{fmt(upgradeCurrentLevel)}</strong>
              </article>
              <article className="fleet-upgrade-metric">
                <span>Sonraki Seviye</span>
                <strong>{fmt(upgradeNextLevel)}</strong>
              </article>
              <article className="fleet-upgrade-metric">
                <span>Geliştirme Maliyeti</span>
                <strong className={upgradeMissingCashValue > 0 ? 'is-missing' : 'is-ok'}>
                  {companyUpgrade.maxReached ? 'Yok' : fmt(upgradeCostValue)}
                </strong>
              </article>
            </div>
            <div className="fleet-upgrade-remain">
              <span
                className={
                  companyUpgrade.maxReached || canUpgradeBusinessLevel || mustBuyNextUnlockFirst
                    ? 'is-ok'
                    : 'is-missing'
                }
              >
                Durum: {upgradeStatusLabel}
              </span>
              <span className={upgradeMissingCashValue > 0 ? 'is-missing' : 'is-ok'}>
                Kalan nakit: {fmt(upgradeMissingCashValue)}
              </span>
            </div>
          </div>
          <p className="fleet-upgrade-next-note">{nextCompanyUnlock
            ? mustBuyNextUnlockFirst
              ? `Önce İş Kur bölümünden ${nextCompanyUnlock.name} satın alınmalı.`
              : `Sonraki açılacak alan: ${nextCompanyUnlock.name}.`
            : 'Tüm işletme alanları satın alındı.'}
          </p>
        </>
      ) : (
        <>
          <p>İşletme seviyesi bilgisi yüklenemedi.</p>
          <p>Lütfen sayfayı yenileyip tekrar dene.</p>
        </>
      )}
      <div className="fleet-modal-actions">
        <button
          className="btn btn-success full"
          onClick={() => {
            if (mustBuyNextUnlockFirst) {
              setBusinessModal('setup')
              return
            }
            if (upgradeAnchorBusinessId) upBiz(upgradeAnchorBusinessId)
          }}
          disabled={
            Boolean(busy) ||
            !companyUpgrade ||
            companyUpgrade.maxReached ||
            (upgradeMissingCashValue > 0 && !mustBuyNextUnlockFirst) ||
            (!mustBuyNextUnlockFirst && !upgradeAnchorBusinessId)
          }
        >
          {mustBuyNextUnlockFirst
            ? "Önce İş Kur'dan Satın Al"
            : busy === `upbiz:${upgradeAnchorBusinessId}`
              ? 'Yükseltiliyor...'
              : companyUpgrade?.maxReached
                ? 'Maksimum Seviye'
                : upgradeMissingCashValue > 0
                  ? 'Nakit Yetersiz'
                  : `Seviyeyi Yükselt (${fmt(upgradeCostValue)})`}
        </button>
        <button className="btn btn-danger full" onClick={() => setBusinessModal('')}>Kapat</button>
      </div>
    </article>
  </section>
  ) : null}

  {businessModal === 'setup' ? (
  <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
    <article className="warehouse-modal fleet-modal fleet-setup-modal" onClick={(event) => event.stopPropagation()}>
      <div className="fleet-subheader">
        <h3>İş Kur</h3>
        <p className="fleet-modal-subtitle">Sıradaki işletmeni açarak yeni araç tipleri ve gelir kaynakları ekle.</p>
        <div className="fleet-subheader-actions">
          <button className="btn btn-accent" onClick={() => setBusinessModal('')}>Merkez</button>
          <button className="btn btn-danger" onClick={() => setBusinessModal('')}>Geri</button>
        </div>
      </div>
      <div className="fleet-setup-grid">
        <div className="unlock-tree">
          {setupVisibleRows.length ? setupVisibleRows.map((entry, index) => (
            <article
              key={entry.key}
              className={`fleet-setup-card unlock-node${entry.unlocked ? ' unlocked' : ''}${entry.isNextUnlock ? ' next' : ''}`}
            >
              <div className="unlock-node-head">
                <span className="unlock-node-step">{fmt(entry.order || index + 1)}</span>
                <strong>{entry.title}</strong>
              </div>
              <span className="fleet-setup-image" data-broken={entry.icon ? '0' : '1'}>
                {entry.icon ? (
                  <img
                    src={entry.icon}
                    alt={entry.title}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-setup-fallback">İŞ</span>
              </span>
              <p>{entry.description}</p>
              <small>{entry.lockReason}</small>
              <div className="unlock-node-metrics">
                <p className="fleet-summary-line">
                  <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                  Açılış maliyeti: <strong>{fmt(entry.cost)}</strong>
                </p>
              </div>
              {entry.canUnlockNow ? (
                <button
                  className="btn btn-success"
                  onClick={() => buyCompanyBusiness(entry.key)}
                  disabled={Boolean(busy)}
                >
                  {busy === `buybiz:${entry.key}` ? 'Satın alınıyor...' : 'Nakit ile Satın Al'}
                </button>
              ) : entry.isNextUnlock ? (
                <button
                  className="btn btn-accent"
                  onClick={() => setBusinessModal('upgrade')}
                  disabled={Boolean(busy)}
                >
                  Geliştirerek Aç
                </button>
              ) : (
                <button className="btn" disabled>Sıradaki Alanı Bekle</button>
              )}
              {index < setupVisibleRows.length - 1 ? (
                <span className="unlock-node-link" aria-hidden="true">v</span>
              ) : null}
            </article>
          )) : (
            <article className="fleet-note-panel">
              <p>Tüm işletme alanları açıldı.</p>
              <p>İş Kur ekranında bekleyen yeni alan bulunmuyor.</p>
            </article>
          )}
        </div>
      </div>
    </article>
  </section>
  ) : null}

  {businessModal === 'filter' ? (
  <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
    <article className="warehouse-modal fleet-modal fleet-filter-modal" onClick={(event) => event.stopPropagation()}>
      <h3>İlan Filtrele</h3>
      <p className="fleet-listing-modal-subtitle">
        Model, fiyat ve seviye aralığı ile ilanları daralt.
      </p>
      <label>
        Model seçin
        <select value={activeModelFilter} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, model: event.target.value }))}>
          <option value="all">Tüm Modeller</option>
          {(activeMarketModelOptions || []).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        Minimum fiyat
        <input className="qty-input" placeholder="Örn: 300000" value={marketFilterForm.minPrice} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, minPrice: event.target.value }))} />
      </label>
      <label>
        Maksimum fiyat
        <input className="qty-input" placeholder="Örn: 25000000" value={marketFilterForm.maxPrice} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, maxPrice: event.target.value }))} />
      </label>
      <label>
        Minimum seviye
        <input className="qty-input" placeholder="1" value={marketFilterForm.minLevel} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, minLevel: event.target.value.replace(/[^\d]/g, '') }))} />
      </label>
      <label>
        Maksimum seviye
        <input className="qty-input" placeholder="20" value={marketFilterForm.maxLevel} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, maxLevel: event.target.value.replace(/[^\d]/g, '') }))} />
      </label>
      <div className="fleet-modal-actions">
        <button className="btn btn-primary full" onClick={() => setBusinessModal('')}>Filtreyi Uygula</button>
        <button className="btn btn-accent full" onClick={resetMarketFilters}>Temizle</button>
        <button className="btn btn-danger full" onClick={() => setBusinessModal('')}>Kapat</button>
      </div>
    </article>
  </section>
  ) : null}

  {businessModal === 'bulk' ? (
  <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
    <article className="warehouse-modal fleet-modal fleet-bulk-modal" onClick={(event) => event.stopPropagation()}>
      <h3>Toplu Tahsilat</h3>
      <p className="fleet-bulk-intro">60 dakikada bir tüm kiralama işletmelerinden tahsilat alabilirsin.</p>
      <p className="fleet-bulk-note">Bu ekranda işletmeler genelindeki gelir, yakıt, enerji ve vergi kesintisi görünür.</p>
      <section className="fleet-bulk-kpis" aria-label="Toplu tahsilat özeti">
        <article className="fleet-bulk-kpi">
          <span>Hazır İşletmeler</span>
          <strong>{fmt(totalBulkCount)}</strong>
        </article>
        <article className="fleet-bulk-kpi">
          <span>Tahsilat Aralığı</span>
          <strong>60 dk</strong>
        </article>
      </section>
      <div className="fleet-modal-actions fleet-modal-actions-bulk">
        <button
          className="btn btn-success btn-collect-main"
          onClick={() => void collectBulkAction()}
          disabled={Boolean(busy) || totalBulkCount <= 0}
        >
          <span className="btn-icon">
            <img
              src={premiumActive && premiumMultiplier > 1 ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.webp'}
              alt=""
              aria-hidden="true"
            />
          </span>
          <span className="btn-label">
            {busy === 'collect-bulk'
              ? premiumActive && premiumMultiplier > 1
                ? '2x toplu tahsilat yapılıyor...'
                : 'Toplu tahsilat yapılıyor...'
              : totalBulkCount > 0
                ? premiumActive && premiumMultiplier > 1
                  ? `2x Toplu Tahsilat (+${fmt(totalBulkNet2x)} net)`
                  : `Toplu Tahsilat Yap (+${fmt(totalBulkNet)} net)`
                : 'Tahsilat Hazır Değil'}
          </span>
        </button>
      </div>
      <article className="fleet-bulk-summary fleet-accountant-summary">
        <p className="fleet-summary-line positive">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Normal Net Tahsilat: +{fmt(totalBulkNet)}
        </p>
        <p className="fleet-summary-line positive">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Premium ile 2x Net Tahsilat: +{fmt(totalBulkNet2x)}
        </p>
        <p className="fleet-summary-line positive">
          <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
          + {fmt(totalBulkXp)} Deneyim
        </p>
        <hr />
        <p className="fleet-summary-line negative">
          <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
          - {fmt(totalBulkOilFuel)} Yakıt
        </p>
        {hasPropertyFleet ? (
          <p className="fleet-summary-line negative">
            <img src="/home/icons/depot/enerji.png" alt="" aria-hidden="true" />
            - {fmt(totalBulkEnergyFuel)} Enerji
          </p>
        ) : null}
        <p className="fleet-summary-line negative">
          <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
          - {fmt(totalBulkTax)} Vergi (%{COLLECTION_TAX_PERCENT})
        </p>
        <p className="fleet-net-row fleet-summary-line net">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Brüt Tahsilat: {fmt(totalBulkIncome)}
        </p>
      </article>
      <button className="btn btn-danger fleet-modal-close" onClick={() => setBusinessModal('')}>Kapat</button>
    </article>
  </section>
  ) : null}
    </>
  )
}
