import {
  BUSINESS_DETAIL_TABS,
} from '../../constants.js'
import {
  fleetFuelUnitsByModelLevel,
  fmt,
  formatDateTime,
  formatLifetimeWithTotal,
  num,
  resolveVehicleImage,
  resolveVehicleLifetime,
  vehicleEmojiByTier,
} from '../../utils.js'

export function renderBusinessDetail(hp) {
  const {
  businessDetailTab,
  businessScene,
  busy,
  companyLegalLabel,
  detailVehiclesView,
  liveNowMs,
  openActiveListingModal,
  openBusinessGallery,
  openBusinessHub,
  openBusinessMarket,
  openCollectPreview,
  openFleetHelp,
  openVehicleListingModal,
  ownedTabLabel,
  premiumBoostActive,
  premiumMultiplier,
  selectedBusiness,
  selectedBusinessFuelMeta,
  selectedBusinessHeaderTitle,
  selectedBusinessMeta,
  selectedCollectCooldownLabel,
  selectedCollectLocked,
  selectedCollectPreview,
  selectedMyListings,
  selectedSoldListingRows,
  setBusinessDetailTab,
  weeklyEventsRuntimeState,
} = hp

  return (
    <>
  {businessScene === 'detail' && selectedBusiness ? (
    <article className="card fleet-detail-card fleet-fullscreen-card">
      <div className="fleet-subheader">
        <div className="fleet-subheader-copy">
          <p className="fleet-subheader-owner">{companyLegalLabel}</p>
          <h3 className="fleet-subheader-title">{selectedBusinessHeaderTitle}</h3>
        </div>
        <div className="fleet-subheader-actions">
          <button className="btn btn-accent" onClick={openFleetHelp}>Bilgi</button>
          <button className="btn btn-danger" onClick={openBusinessHub}>Geri</button>
        </div>
      </div>
      <div className="fleet-detail-hero">
        <span className="fleet-hero-media" data-broken={selectedBusiness.heroImage ? '0' : '1'}>
          {selectedBusiness.heroImage ? (
            <img
              src={selectedBusiness.heroImage}
              alt={selectedBusiness.name}
              loading="lazy"
              onError={(event) => {
                const holder = event.currentTarget.parentElement
                if (holder) holder.setAttribute('data-broken', '1')
              }}
            />
          ) : null}
          <span className="fleet-hero-fallback">{selectedBusinessMeta?.fallback || 'OTO'}</span>
        </span>
        <div className="fleet-detail-main">
          <div className="fleet-detail-kpi">
            <p className="fleet-detail-kpi-label">{selectedBusinessMeta?.unitLabel || 'Araç'} Sayısı</p>
            <strong className="fleet-detail-kpi-value">{fmt(selectedBusiness.fleetCount)} / {fmt(selectedBusiness.fleetCapacity)}</strong>
          </div>
          <div className="fleet-company-actions fleet-company-actions-inline">
            <button className="btn btn-accent full" onClick={openBusinessMarket}>{selectedBusinessMeta?.secondHandLabel || 'İkinci El Pazarı'}</button>
            <button className="btn btn-accent full" onClick={openBusinessGallery}>{selectedBusinessMeta?.newOrderLabel || 'Sıfır Araba Siparişi'}</button>
          </div>
          {selectedBusiness?.fleetCount > 0 ? (
            <button
              className={`btn full fleet-collect-action ${selectedCollectLocked ? 'btn-danger fleet-collect-done' : 'btn-success'}`.trim()}
              onClick={() => openCollectPreview(selectedBusiness.id)}
              disabled={Boolean(busy) || selectedCollectLocked}
            >
              <span className="btn-icon">
                <img
                  src={premiumBoostActive ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.png'}
                  alt=""
                  aria-hidden="true"
                />
              </span>
              <span className="btn-label btn-label-stack">
                <span>
                  {busy === `collect:${selectedBusiness.id}`
                    ? 'Tahsilat hazırlanıyor...'
                    : selectedCollectLocked
                      ? `Tahsilat Beklemede: ${selectedCollectCooldownLabel}`
                      : selectedCollectPreview.netCash > 0
                        ? premiumBoostActive
                          ? `2x Tahsilat Yap (+${fmt(selectedCollectPreview.netCash)})`
                          : `Tahsilat Yap (+${fmt(selectedCollectPreview.netCash)})`
                        : 'Tahsilat Yap'}
                </span>
                {!selectedCollectLocked && busy !== `collect:${selectedBusiness.id}` && selectedCollectPreview.netCash > 0 ? (
                  <small>{premiumBoostActive ? `${premiumMultiplier}x Premium tahsilat aktif` : 'Saatlik net tahsilat'}</small>
                ) : null}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="tab-strip two fleet-tier-strip">
        {BUSINESS_DETAIL_TABS.map((item) => (
          <button key={item} className={businessDetailTab === item ? 'on' : ''} onClick={() => setBusinessDetailTab(item)}>
            {item === 'garage' ? ownedTabLabel : 'Satışlarım'}
          </button>
        ))}
      </div>

      {businessDetailTab === 'market' ? (
        <div className="fleet-owned-list">
          <h4>Satışlarım</h4>
          <p className="fleet-market-inline-note">
            {ownedTabLabel} sekmesinde araç kartına dokunarak ilana ekleyebilir veya parçalayabilirsin. Bu alanda sadece ilan iptali yapabilirsin.
          </p>
          <p className="fleet-market-inline-note">
            Aktif satış ilanı: {fmt(selectedMyListings.length)} | Satılan ilan: {fmt(selectedSoldListingRows.length)}
          </p>
          {selectedMyListings.length ? (
            selectedMyListings.map((vehicle) => {
              const requiredLevel = Math.max(1, Math.trunc(num(vehicle.requiredLevel || vehicle.marketLevel || 1)))
              const hourlyFuelNeed = fleetFuelUnitsByModelLevel(
                requiredLevel,
                selectedBusiness?.templateId || vehicle.templateId || 'auto-rental',
                { weeklyEvents: weeklyEventsRuntimeState },
              )
              return (
              <article
                key={`my-listing-${vehicle.id}`}
                className="fleet-owned-row fleet-owned-row-listing fleet-owned-row-modal"
                role="button"
                tabIndex={0}
                onClick={() => openActiveListingModal(vehicle, selectedBusiness?.templateId)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  openActiveListingModal(vehicle, selectedBusiness?.templateId)
                }}
              >
                <span className="fleet-owned-thumb" data-broken={resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? '0' : '1'}>
                  {resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? <img src={resolveVehicleImage(vehicle, selectedBusiness?.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                  <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, selectedBusiness?.templateId)}</span>
                </span>
                <div className="fleet-owned-main">
                  <div className="fleet-owned-mainline">
                    <strong>{vehicle.name}</strong>
                    <span className="fleet-owned-price">{fmt(vehicle.price)}</span>
                  </div>
                  <p className="fleet-owned-subline">
                    <span className="level-text">{fmt(requiredLevel)}. Seviye</span>
                    {' | '}
                    Aktif ilan
                  </p>
                  <div className="fleet-compact-metrics fleet-owned-metrics">
                    <span className="fleet-compact-metric">
                      <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                      Gelir +{fmt(vehicle.rentPerHour)}
                    </span>
                    <span className="fleet-compact-metric">
                      <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" />
                      {selectedBusinessFuelMeta.expenseLabel} -{fmt(hourlyFuelNeed)}
                    </span>
                    <span className="fleet-compact-metric">
                      <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                      XP +{fmt(vehicle.xp || 0)}
                    </span>
                  </div>
                  <small className="fleet-owned-expand-hint">Satışa bakmak için dokun.</small>
                </div>
              </article>
              )
            })
          ) : (
            <p className="empty">Bu işletme için aktif satış ilanın bulunmuyor.</p>
          )}
          <div className="fleet-sold-list">
            <h5>Satılan İlanlar</h5>
            {selectedSoldListingRows.length ? (
              selectedSoldListingRows.map((entry) => (
                <article key={`sold-fleet-${entry.id}`} className="fleet-sold-row">
                  <div className="fleet-sold-copy">
                    <strong>{String(entry?.detail || 'İlan satışı tamamlandı.').trim()}</strong>
                    <small>{formatDateTime(entry?.createdAt || '')}</small>
                  </div>
                  <strong className="fleet-sold-amount">+{fmt(entry?.amount || 0)}</strong>
                </article>
              ))
            ) : (
              <p className="empty">Henüz satılan ilan kaydı bulunmuyor.</p>
            )}
          </div>
        </div>
      ) : null}

      {businessDetailTab !== 'market' ? (
        <div className="fleet-vehicle-list">
          <h4>{ownedTabLabel}</h4>
          {detailVehiclesView.length ? (
            detailVehiclesView.map((vehicle) => {
              const lifetime = resolveVehicleLifetime(vehicle, liveNowMs)
              return (
              <article
                key={`${vehicle.isListed ? 'listed' : 'owned'}-${vehicle.id}`}
                className={`fleet-compact-row${vehicle.isListed ? '' : ' fleet-compact-listable'}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (vehicle.isListed) {
                    const activeListing =
                      selectedMyListings.find((entry) =>
                        String(entry?.id || '').trim() === String(vehicle?.listingId || '').trim(),
                      ) ||
                      selectedMyListings.find((entry) =>
                        String(entry?.vehicleId || entry?.id || '').trim() === String(vehicle?.id || '').trim(),
                      ) ||
                      vehicle
                    openActiveListingModal(activeListing, selectedBusiness?.templateId)
                    return
                  }
                  openVehicleListingModal(selectedBusiness.id, vehicle)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  if (vehicle.isListed) {
                    const activeListing =
                      selectedMyListings.find((entry) =>
                        String(entry?.id || '').trim() === String(vehicle?.listingId || '').trim(),
                      ) ||
                      selectedMyListings.find((entry) =>
                        String(entry?.vehicleId || entry?.id || '').trim() === String(vehicle?.id || '').trim(),
                      ) ||
                      vehicle
                    openActiveListingModal(activeListing, selectedBusiness?.templateId)
                    return
                  }
                  openVehicleListingModal(selectedBusiness.id, vehicle)
                }}
              >
                <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? '0' : '1'}>
                  {resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? <img src={resolveVehicleImage(vehicle, selectedBusiness?.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                  <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, selectedBusiness?.templateId)}</span>
                </span>
                <div className="fleet-compact-meta">
                  <strong>{vehicle.name}</strong>
                  <p>
                    {`Seviye ${fmt(vehicle.requiredLevel || 1)}`}
                  </p>
                  <div className="fleet-compact-metrics">
                    <span className="fleet-compact-metric">
                      <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                      Saatlik Gelir {fmt(vehicle.rentPerHour)}
                    </span>
                    <span className="fleet-compact-metric">
                      <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" />
                        {selectedBusinessFuelMeta.expenseLabel} - {fmt(fleetFuelUnitsByModelLevel(
                          vehicle.requiredLevel || 1,
                          selectedBusiness?.templateId,
                          { weeklyEvents: weeklyEventsRuntimeState },
                        ))}
                    </span>
                    <span className="fleet-compact-metric">
                      <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                      +{fmt(vehicle.xp || 0)} XP
                    </span>
                    <span className={`fleet-compact-metric is-lifetime${lifetime.expired ? ' is-expired' : ''}`}>
                      <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                      Ömür {formatLifetimeWithTotal(lifetime)}
                    </span>
                  </div>
                  <small className="fleet-listing-hint" aria-live="polite">
                    {vehicle.isListed ? (
                      <span className="fleet-listing-hint-state is-listed">İlanda: satıştan vazgeçmek için karta dokun.</span>
                    ) : busy === `listbiz:${selectedBusiness.id}:${vehicle.id}` ? (
                      <span className="fleet-listing-hint-state is-busy">İlan işlemi hazırlanıyor...</span>
                    ) : (
                      <span className="fleet-listing-hint-actions">
                        <span className="fleet-listing-hint-chip is-sale">İlana Ekle</span>
                        <span className="fleet-listing-hint-chip is-scrap">Parçala</span>
                        <span className="fleet-listing-hint-tip">Karta dokun</span>
                      </span>
                    )}
                  </small>
                </div>
              </article>
              )
            })
          ) : (
            <p className="empty">Bu sekmede gösterilecek araç yok.</p>
          )}
        </div>
      ) : null}
    </article>
  ) : null}
    </>
  )
}
