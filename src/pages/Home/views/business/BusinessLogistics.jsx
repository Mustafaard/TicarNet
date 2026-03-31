import {
  VEHICLE_LIFETIME_MONTHS_TOTAL,
} from '../../constants.js'
import {
  fleetFuelUnitsByModelLevel,
  fmt,
  formatDateTime,
  formatLifetimeWithTotal,
  logisticsOrderCostRows,
  num,
  resolveVehicleImage,
  resolveVehicleLifetime,
  toDisplayOrderCostRows,
  vehicleEmojiByTier,
} from '../../utils.js'
import {
  AssetMetric,
} from '../../ui-components.jsx'

export function renderBusinessLogistics(hp) {
  const {
  businessScene,
  busy,
  buyTruckAction,
  canOrderTruckNow,
  companyLegalLabel,
  inventoryById,
  liveNowMs,
  logistics,
  logisticsCollectCountdown,
  logisticsCollectLocked,
  logisticsCollectNet,
  logisticsDetailTab,
  logisticsGarageTrucks,
  logisticsMyListings,
  logisticsOrderCountdown,
  logisticsPublicListings,
  logisticsScreenSectionTitle,
  logisticsSoldListingRows,
  logisticsTotalCapacityNow,
  logisticsTruckCatalog,
  logisticsTruckCount,
  logisticsUnlockedModelLevel,
  logisticsViewIsDetail,
  logisticsViewIsGallery,
  logisticsViewIsMarket,
  openActiveListingModal,
  openBusinessHub,
  openFleetHelp,
  openLogisticsCollectPreview,
  openLogisticsDetail,
  openLogisticsGallery,
  openLogisticsMarket,
  openMarketListingDetail,
  openTruckListingModal,
  playerLevelNow,
  premiumBoostActive,
  premiumMultiplier,
  setBusinessModal,
  setLogisticsDetailTab,
  walletNow,
  weeklyEventsRuntimeState,
} = hp

  return (
    <>
  {businessScene === 'logistics' ? (
    <article className={`card fleet-detail-card fleet-fullscreen-card${logisticsViewIsGallery ? ' fleet-order-screen truck-order-screen' : ''}`}>
      <div className="fleet-subheader">
        <div className="fleet-subheader-copy">
          <p className="fleet-subheader-owner">{companyLegalLabel}</p>
          <h3 className="fleet-subheader-title">{logisticsScreenSectionTitle}</h3>
        </div>
        <div className="fleet-subheader-actions">
          <button className="btn btn-accent" onClick={openFleetHelp}>Bilgi</button>
          <button
            className="btn btn-danger"
            onClick={logisticsViewIsDetail ? openBusinessHub : openLogisticsDetail}
          >
            Geri
          </button>
        </div>
      </div>
      {logisticsViewIsDetail ? (
        <div className="fleet-detail-hero">
          <span className="fleet-hero-media" data-broken="0">
            <img
              src="/home/icons/businesses/lojistik-kiralama.webp"
              alt="Tır Kiralama"
              loading="lazy"
              onError={(event) => {
                const holder = event.currentTarget.parentElement
                if (holder) holder.setAttribute('data-broken', '1')
              }}
            />
            <span className="fleet-hero-fallback">TIR</span>
          </span>
          <div className="fleet-detail-main">
            <div className="fleet-detail-kpi">
              <p className="fleet-detail-kpi-label">Tır Sayısı</p>
              <strong className="fleet-detail-kpi-value">
                {fmt(logistics?.logisticsFleet?.summary?.truckCount || 0)} / {fmt(logistics?.logisticsFleet?.summary?.truckSlotCapacity || 0)}
              </strong>
              <p className="fleet-detail-kpi-label fleet-detail-kpi-capacity">
                <img src="/home/icons/depot/capacity.png" alt="" className="fleet-detail-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                Toplam Kapasite: <strong>{fmt(logisticsTotalCapacityNow)}</strong>
              </p>
            </div>
            <div className="fleet-company-actions fleet-company-actions-inline">
              <button className="btn btn-accent full" onClick={openLogisticsMarket}>
                İkinci El Tır Pazarı
              </button>
              <button className="btn btn-accent full" onClick={openLogisticsGallery}>
                Sıfır Tır Siparişi
              </button>
            </div>
            {logisticsTruckCount > 0 ? (
              <button
                className={`btn full fleet-collect-action ${logisticsCollectLocked ? 'btn-danger fleet-collect-done' : 'btn-success'}`.trim()}
                onClick={openLogisticsCollectPreview}
                disabled={Boolean(busy) || logisticsCollectLocked}
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
                    {busy === 'collect-logistics'
                      ? 'Tahsilat hazırlanıyor...'
                      : logisticsCollectLocked
                        ? `Tahsilat Beklemede: ${logisticsCollectCountdown}`
                        : logisticsCollectNet > 0
                          ? premiumBoostActive
                            ? `2x Tahsilat Yap (+${fmt(logisticsCollectNet)})`
                            : `Tahsilat Yap (+${fmt(logisticsCollectNet)})`
                          : 'Tahsilat Yap'}
                  </span>
                  {!logisticsCollectLocked && busy !== 'collect-logistics' && logisticsCollectNet > 0 ? (
                    <small>{premiumBoostActive ? `${premiumMultiplier}x Premium tahsilat aktif` : 'Saatlik net tahsilat'}</small>
                  ) : null}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {logisticsViewIsGallery ? (
        <>
          <div className="fleet-gallery-note fleet-order-gallery-note truck-gallery-note">
            <p>
              {(logistics?.logisticsFleet?.summary?.truckCount ?? 0) < (logistics?.logisticsFleet?.summary?.truckSlotCapacity ?? 1)
                ? 'Siparişe hazır.'
                : 'Kapasite dolu. Yeni sipariş için önce yer aç.'}
            </p>
            <p className="fleet-live-countdown">Canlı sipariş geri sayımı: {logisticsOrderCountdown}</p>
            <p className="fleet-gallery-note-hint">Tır modelleri düşük maliyetten yüksek maliyete sıralanır.</p>
          </div>
          <div className="fleet-vehicle-list fleet-order-list logistics-truck-list">
            {logisticsTruckCatalog.map((truck) => {
              const costRows = logisticsOrderCostRows(truck, walletNow, inventoryById)
              const displayCostRows = toDisplayOrderCostRows(costRows, { requiredOnly: true })
              const orderFuelCost = Math.max(0, Math.trunc(num(truck?.fuel || 0)))
              const oilInInventory = Math.max(0, Math.trunc(num(inventoryById?.oil || 0)))
              const hasEnoughFuelForOrder = oilInInventory >= orderFuelCost
              const hasEnoughMaterials = costRows.every((entry) => entry.enough) && hasEnoughFuelForOrder
              const truckLevelRequired = Math.max(1, Math.trunc(num(truck.levelRequired || 1)))
              const truckLockedByLevel = truckLevelRequired > logisticsUnlockedModelLevel
              const blockedByMaterials = !hasEnoughMaterials && canOrderTruckNow && !truckLockedByLevel
                const hourlyFuelNeed = fleetFuelUnitsByModelLevel(truckLevelRequired, 'logistics', {
                  weeklyEvents: weeklyEventsRuntimeState,
                })
              return (
                <article key={truck.id} className="fleet-vehicle-row fleet-order-card truck-order-card">
                  <div className="fleet-vehicle-head">
                    <strong>{truck.name}</strong>
                  </div>
                  <div className="fleet-vehicle-body">
                    <span className="fleet-vehicle-media" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                      {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                      <span className="fleet-vehicle-fallback">{vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                    </span>
                    <div className="fleet-vehicle-specs-column">
                      <div className="fleet-order-truck-capacity-block">
                        <img src="/home/icons/depot/capacity.png" alt="" aria-hidden="true" className="fleet-order-capacity-icon" onError={(e) => { e.target.style.display = 'none' }} />
                        <span className="fleet-order-truck-capacity-value">Kapasite: <strong>{fmt(Math.max(0, Math.trunc(num(truck?.capacity || 0))))} adet</strong></span>
                      </div>
                      <div className="fleet-vehicle-specs">
                      <div className="asset-metric-grid fleet-order-metric-grid truck-order-metric-grid">
                        <AssetMetric
                          icon="/home/ui/hud/level-icon.webp"
                          label="Seviye"
                          value={`${fmt(truckLevelRequired)} Seviye`}
                          status={truckLockedByLevel ? 'fail' : 'ok'}
                          statusHint={truckLockedByLevel ? `Gereken seviye: ${fmt(truckLevelRequired)}` : 'Yeterli'}
                        />
                        <AssetMetric
                          icon="/home/icons/depot/capacity.png"
                          label="Kapasite"
                          value={`${fmt(Math.max(0, Math.trunc(num(truck?.capacity || 0))))} adet`}
                          status="ok"
                          statusHint="Yük kapasitesi"
                        />
                        {displayCostRows.map((row) => (
                          <AssetMetric
                            key={`${truck.id}-truck-${row.label}`}
                            icon={row.icon}
                            label={row.label}
                            value={row.value}
                            status={row.enough ? 'ok' : 'fail'}
                            statusHint={row.statusHint}
                          />
                        ))}
                      </div>
                    </div>
                    </div>
                  </div>
                  <div className="fleet-order-summary truck-order-summary">
                    <div className="fleet-order-summary-item truck-order-summary-item is-income">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" loading="lazy" />
                        Saatlik Gelir
                      </span>
                      <span className="fleet-order-summary-value">+ {fmt(truck.incomePerRun || 0)}</span>
                    </div>
                    <div className="fleet-order-summary-item truck-order-summary-item is-fuel">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" loading="lazy" />
                        Benzin Gideri
                      </span>
                      <span className="fleet-order-summary-value">- {fmt(hourlyFuelNeed)} Petrol</span>
                    </div>
                    <div className="fleet-order-summary-item truck-order-summary-item is-xp">
                      <span className="fleet-order-summary-label">
                        <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" loading="lazy" />
                        XP Kazancı
                      </span>
                      <span className="fleet-order-summary-value">+ {fmt(truck.xpPerRun || 0)}</span>
                    </div>
                    <div className="fleet-order-summary-item truck-order-summary-item is-lifetime">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" loading="lazy" />
                        Toplam Ömür
                      </span>
                      <span className="fleet-order-summary-value">{VEHICLE_LIFETIME_MONTHS_TOTAL} Ay</span>
                    </div>
                  </div>
                  <button
                    className={`btn fleet-order-action ${blockedByMaterials ? 'btn-danger' : 'btn-accent'} truck-order-action${canOrderTruckNow ? ' is-ready' : ' is-cooldown'}`}
                    onClick={() => buyTruckAction(truck.id)}
                    disabled={Boolean(busy) || !canOrderTruckNow || truckLockedByLevel || !hasEnoughMaterials}
                  >
                    {busy === `buy-truck:${truck.id}`
                      ? 'Satın alınıyor...'
                      : !canOrderTruckNow
                        ? `Kalan: ${logisticsOrderCountdown}`
                        : truckLockedByLevel
                          ? `Seviye ${fmt(truckLevelRequired)}`
                        : !hasEnoughMaterials
                          ? 'Malzeme Yetersiz'
                          : 'Tırı Satın Al'}
                  </button>
                </article>
              )
            })}
          </div>
        </>
      ) : null}

      {logisticsViewIsDetail ? (
        <>
          <div className="tab-strip two fleet-tier-strip">
            <button className={logisticsDetailTab === 'garage' ? 'on' : ''} onClick={() => setLogisticsDetailTab('garage')}>
              Tırlarım
            </button>
            <button className={logisticsDetailTab === 'market' ? 'on' : ''} onClick={() => setLogisticsDetailTab('market')}>
              Satışlarım
            </button>
          </div>
          {logisticsDetailTab === 'garage' ? (
            <>
              <h4>Tırlarım</h4>
              <div className="fleet-vehicle-list logistics-truck-list">
                {logisticsGarageTrucks.length ? (
                  logisticsGarageTrucks.map((truck) => {
                    const truckLevelRequired = Math.max(
                      1,
                      Math.trunc(num(truck.levelRequired || truck.requiredLevel || 1)),
                    )
                    const activeListing =
                      logisticsMyListings.find((entry) =>
                        String(entry?.id || '').trim() === String(truck?.listingId || '').trim(),
                      ) ||
                      logisticsMyListings.find((entry) =>
                        String(entry?.vehicleId || entry?.id || '').trim() === String(truck?.id || '').trim(),
                      ) ||
                      truck
                    const lifetime = resolveVehicleLifetime(truck, liveNowMs)
                    return (
                    <article
                      key={`${truck.isListed ? 'listed' : 'owned'}-${truck.id}-${truck.listingId || ''}`}
                      className="fleet-compact-row fleet-compact-listable"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (truck.isListed) {
                          openActiveListingModal(activeListing, 'logistics')
                          return
                        }
                        openTruckListingModal(truck)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        if (truck.isListed) {
                          openActiveListingModal(activeListing, 'logistics')
                          return
                        }
                        openTruckListingModal(truck)
                      }}
                    >
                      <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                        {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                        <span className="fleet-active-fallback">{vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                      </span>
                      <div className="fleet-compact-meta">
                        <strong>{truck.name}</strong>
                        <p className="fleet-compact-capacity-line">
                          <img src="/home/icons/depot/capacity.png" alt="" className="fleet-compact-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                          Kapasite {fmt(truck.capacity)}
                          {' | '}
                          <span className="level-text">Seviye {fmt(truckLevelRequired)}</span>
                        </p>
                        <div className="fleet-compact-metrics">
                          <span className="fleet-compact-metric">
                            <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                            Saatlik Gelir {fmt(truck.incomePerRun || truck.rentPerHour || 0)}
                          </span>
                          <span className="fleet-compact-metric">
                            <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                            Benzin Gideri - {fmt(fleetFuelUnitsByModelLevel(
                              truckLevelRequired,
                              'logistics',
                              { weeklyEvents: weeklyEventsRuntimeState },
                            ))}
                          </span>
                          <span className="fleet-compact-metric">
                            <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                            +{fmt(truck.xpPerRun || truck.xp || 0)} XP
                          </span>
                          <span className={`fleet-compact-metric is-lifetime${lifetime.expired ? ' is-expired' : ''}`}>
                            <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                            Ömür {formatLifetimeWithTotal(lifetime)}
                          </span>
                        </div>
                        <small className="fleet-listing-hint" aria-live="polite">
                          {truck.isListed ? (
                            <span className="fleet-listing-hint-state is-listed">İlanda: satıştan vazgeçmek için karta dokun.</span>
                          ) : busy === `listlog:${truck.id}` ? (
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
                  <p className="empty">Henüz satın alınmış veya ilana konulmuş tır bulunmuyor.</p>
                )}
              </div>
            </>
          ) : null}
          {logisticsDetailTab === 'market' ? (
            <>
              <h4>Satışlarım</h4>
            <p className="fleet-market-inline-note">
              Tırlarım sekmesinde tır kartına dokunarak ilana ekleyebilir veya parçalayabilirsin. Bu alanda sadece ilan iptali yapabilirsin.
            </p>
            <p className="fleet-market-inline-note">
              Aktif satış ilanı: {fmt(logisticsMyListings.length)} | Satılan ilan: {fmt(logisticsSoldListingRows.length)}
            </p>
            <div className="fleet-owned-list">
                {logisticsMyListings.length ? (
                  logisticsMyListings.map((truck) => {
                    const requiredLevel = Math.max(1, Math.trunc(num(truck.marketLevel || truck.requiredLevel || 1)))
                    const hourlyFuelNeed = fleetFuelUnitsByModelLevel(requiredLevel, 'logistics', {
                      weeklyEvents: weeklyEventsRuntimeState,
                    })
                    return (
                    <article
                      key={`my-log-listing-${truck.id}`}
                      className="fleet-owned-row fleet-owned-row-listing fleet-owned-row-modal"
                      role="button"
                      tabIndex={0}
                      onClick={() => openActiveListingModal(truck, 'logistics')}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        openActiveListingModal(truck, 'logistics')
                      }}
                    >
                      <span className="fleet-owned-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                        {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                        <span className="fleet-active-fallback">{truck.emoji || vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                      </span>
                      <div className="fleet-owned-main">
                        <div className="fleet-owned-mainline">
                          <strong>{truck.name}</strong>
                          <span className="fleet-owned-price">{fmt(truck.price)}</span>
                        </div>
                        <p className="fleet-owned-subline">
                          <img src="/home/icons/depot/capacity.png" alt="" className="fleet-owned-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                          <span className="level-text">{fmt(requiredLevel)}. Seviye</span>
                          {' | '}
                          Kapasite {fmt(truck.capacity ?? 0)}
                          {' | '}
                          Aktif ilan
                        </p>
                        <div className="fleet-compact-metrics fleet-owned-metrics">
                          <span className="fleet-compact-metric">
                            <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                            Gelir +{fmt(truck.rentPerHour)}
                          </span>
                          <span className="fleet-compact-metric">
                            <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                            Benzin Gideri -{fmt(hourlyFuelNeed)}
                          </span>
                          <span className="fleet-compact-metric">
                            <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                            XP +{fmt(truck.xp || 0)}
                          </span>
                        </div>
                        <small className="fleet-owned-expand-hint">Satışa bakmak için dokun.</small>
                      </div>
                    </article>
                    )
                  })
                ) : (
                  <p className="empty">Lojistik için aktif satış ilanın bulunmuyor.</p>
                )}
                <div className="fleet-sold-list">
                  <h5>Satılan İlanlar</h5>
                  {logisticsSoldListingRows.length ? (
                    logisticsSoldListingRows.map((entry) => (
                      <article key={`sold-log-${entry.id}`} className="fleet-sold-row">
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
            </>
          ) : null}
        </>
      ) : null}

      {logisticsViewIsMarket ? (
        <>
          <h4>İkinci El Tır Pazarı</h4>
          <button className="btn btn-primary full fleet-filter-launch" onClick={() => setBusinessModal('filter')}>
            İlan Filtrele
          </button>
          <div className="fleet-market-list">
            {logisticsPublicListings.length ? (
              logisticsPublicListings.map((truck, index) => {
                const requiredLevel = Math.max(1, Math.trunc(num(truck.marketLevel || truck.requiredLevel || 1)))
                const lockedByLevel = requiredLevel > playerLevelNow
                const hourlyFuelNeed = fleetFuelUnitsByModelLevel(requiredLevel, 'logistics', {
                  weeklyEvents: weeklyEventsRuntimeState,
                })
                return (
                <article
                  key={`logistics-market-${truck.id}-${index}`}
                  className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMarketListingDetail(truck)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    openMarketListingDetail(truck)
                  }}
                >
                  <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                    {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                    <span className="fleet-active-fallback">{truck.emoji || vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                  </span>
                  <div className="fleet-market-copy">
                    <strong>{truck.name}</strong>
                    <div className="fleet-market-meta-line">
                      <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                    </div>
                    <small className="fleet-market-truck-meta">
                      <img src="/home/icons/depot/capacity.png" alt="" className="fleet-market-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                      Kapasite: {fmt(truck.capacity)}
                    </small>
                  </div>
                  <div className="fleet-market-price">
                    <span>Satış Fiyatı</span>
                    <strong>
                      <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                      {fmt(truck.marketPrice)}
                    </strong>
                  </div>
                  <div className="fleet-market-footer">
                    <div className="fleet-compact-metrics fleet-market-metrics">
                      <span className="fleet-compact-metric">
                        <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                        Gelir +{fmt(truck.marketIncome)}
                      </span>
                      <span className="fleet-compact-metric">
                        <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                        Benzin Gideri -{fmt(hourlyFuelNeed)}
                      </span>
                      <span className="fleet-compact-metric">
                        <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                        XP +{fmt(truck.xp || 0)}
                      </span>
                    </div>
                    {lockedByLevel ? (
                      <small className="fleet-market-lock">
                        Kilitli: Gereken seviye {fmt(requiredLevel)} | Oyuncu seviyesi {fmt(playerLevelNow)}
                      </small>
                    ) : (
                      <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                    )}
                  </div>
                </article>
                )
              })
            ) : (
              <p className="empty">Satın alınabilir ikinci el tır ilanı bulunmuyor.</p>
            )}
          </div>
        </>
      ) : null}

      <p className="muted">
        Tır kiralama sistemi araba/motor ile aynı saatlik gelir modelinde çalışır. Filo büyüdükçe maliyet, kapasite ve gelir artar.
      </p>
    </article>
  ) : null}
    </>
  )
}
