import {
  fleetFuelUnitsByModelLevel,
  fmt,
  num,
  resolveVehicleImage,
  vehicleEmojiByTier,
} from '../../utils.js'

export function renderBusinessMarket(hp) {
  const {
  businessScene,
  companyLegalLabel,
  openMarketListingDetail,
  selectedBusiness,
  selectedBusinessFuelMeta,
  selectedBusinessMarketTitle,
  selectedBusinessMeta,
  selectedMarketPublicRows,
  selectedUnlockedModelLevel,
  setBusinessModal,
  setBusinessScene,
  weeklyEventsRuntimeState,
} = hp

  return (
    <>
  {businessScene === 'market' && selectedBusiness ? (
    <article className="card fleet-detail-card fleet-fullscreen-card">
      <div className="fleet-subheader">
        <div className="fleet-subheader-copy">
          <p className="fleet-subheader-owner">{companyLegalLabel}</p>
          <h3 className="fleet-subheader-title">{selectedBusinessMarketTitle}</h3>
        </div>
        <div className="fleet-subheader-actions">
          <button className="btn btn-danger" onClick={() => setBusinessScene('detail')}>Geri</button>
        </div>
      </div>
      <div className="fleet-detail-hero fleet-market-hero">
        <span className="fleet-hero-media" data-broken={selectedBusiness.heroImage ? '0' : '1'}>
          {selectedBusiness.heroImage ? <img src={selectedBusiness.heroImage} alt={selectedBusiness.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
          <span className="fleet-hero-fallback">{selectedBusinessMeta?.fallback || 'OTO'}</span>
        </span>
        <div className="fleet-detail-main">
          <p>Aktif ilan sayısı</p>
          <strong>{fmt(selectedMarketPublicRows.length)}</strong>
        </div>
      </div>
      <button className="btn btn-primary full fleet-filter-launch" onClick={() => setBusinessModal('filter')}>
        İlan Filtrele
      </button>
      <div className="fleet-market-list">
            {selectedMarketPublicRows.length ? (
              selectedMarketPublicRows.map((vehicle, index) => {
                const requiredLevel = Math.max(1, Math.trunc(num(vehicle.marketLevel || vehicle.requiredLevel || 1)))
                const lockedByLevel = requiredLevel > selectedUnlockedModelLevel
                    const hourlyFuelNeed = fleetFuelUnitsByModelLevel(
                      requiredLevel,
                      vehicle.templateId || selectedBusiness?.templateId || 'moto-rental',
                      { weeklyEvents: weeklyEventsRuntimeState },
                    )
                return (
            <article
              key={`${selectedBusiness.id}-market-${vehicle.id}-${index}`}
              className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => openMarketListingDetail(vehicle)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                openMarketListingDetail(vehicle)
              }}
            >
              <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(vehicle, vehicle.templateId) ? '0' : '1'}>
                {resolveVehicleImage(vehicle, vehicle.templateId) ? <img src={resolveVehicleImage(vehicle, vehicle.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, vehicle.templateId)}</span>
              </span>
              <div className="fleet-market-copy">
                <strong>{vehicle.name}</strong>
                <div className="fleet-market-meta-line">
                  <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                </div>
              </div>
              <div className="fleet-market-price">
                <span>Satış Fiyatı</span>
                <strong>
                  <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                  {fmt(vehicle.marketPrice)}
                </strong>
              </div>
              <div className="fleet-market-footer">
                <div className="fleet-compact-metrics fleet-market-metrics">
                  <span className="fleet-compact-metric">
                    <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                    Gelir +{fmt(vehicle.marketIncome)}
                  </span>
                  <span className="fleet-compact-metric">
                    <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" />
                    {selectedBusinessFuelMeta.expenseLabel} -{fmt(hourlyFuelNeed)}
                  </span>
                  <span className="fleet-compact-metric">
                    <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                    XP +{fmt(vehicle.xp)}
                  </span>
                </div>
                {lockedByLevel ? (
                  <small className="fleet-market-lock">
                    Kilitli: Gereken seviye {fmt(requiredLevel)} | Açılan seviye {fmt(selectedUnlockedModelLevel)}
                  </small>
                ) : (
                  <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                )}
              </div>
            </article>
            )
          })
        ) : (
          <p className="empty">Bu işletmeye ait satın alınabilir ikinci el ilanı bulunmuyor.</p>
        )}
      </div>
    </article>
  ) : null}
    </>
  )
}
