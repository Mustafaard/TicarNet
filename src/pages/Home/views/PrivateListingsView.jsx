import {
  fmt,
  formatLifetimeWithTotal,
  num,
  resolveVehicleImage,
  vehicleEmojiByTier,
} from '../utils.js'

export function renderPrivateListingsView(hp) {
  const {
  businessModal,
  busy,
  buyVehicleFromMarket,
  closeMarketListingDetail,
  closeMarketPurchaseResult,
  companyLegalLabel,
  goToMyListingsFromPurchase,
  goToOwnedFleetFromPurchase,
  marketAssetLabel,
  marketDetailAssetMeta,
  marketDetailBusinessLabel,
  marketDetailCanAfford,
  marketDetailCanBuyByLevel,
  marketDetailCommissionAmount,
  marketDetailCommissionRate,
  marketDetailDraft,
  marketDetailHasBusinessAccess,
  marketDetailLevelCurrent,
  marketDetailLevelCurrentLabel,
  marketDetailLiveLifetime,
  marketDetailPrice,
  marketDetailRequiredLevel,
  marketDetailSellerPayout,
  marketDetailTemplateId,
  marketDetailTotalCost,
  marketPurchaseResult,
  openTab,
  playerLevelNow,
  privateCustomFleetRows,
  privateCustomLogisticsRows,
  tapPrivateListing,
  unlockedModelLevelByTemplate,
  walletNow,
} = hp

return (
  <>
    <section className="panel-stack home-sections private-listings-screen">
    <article className="card fleet-detail-card fleet-fullscreen-card">
      <div className="fleet-subheader">
        <div className="fleet-subheader-copy">
          <p className="fleet-subheader-owner">{companyLegalLabel}</p>
          <h3 className="fleet-subheader-title">Özel İlanlar</h3>
          <p className="fleet-subheader-subtitle">Sadece seçtiğin arkadaşların ilanları</p>
        </div>
        <div className="fleet-subheader-actions">
          <button className="btn btn-danger" onClick={() => void openTab('home', { tab: 'home' })}>Geri</button>
        </div>
      </div>

      <div className="fleet-detail-hero fleet-market-hero">
        <span className="fleet-hero-media" data-broken="0">
          <img
            src="/home/icons/ozel-ilanlar.png"
            alt="Özel İlanlar"
            loading="lazy"
            onError={(event) => {
              const holder = event.currentTarget.parentElement
              if (holder) holder.setAttribute('data-broken', '1')
            }}
          />
          <span className="fleet-hero-fallback">ÖZEL</span>
        </span>
        <div className="fleet-detail-main">
          <p>Özel ilan sayısı</p>
          <strong>{fmt(privateCustomFleetRows.length + privateCustomLogisticsRows.length)}</strong>
        </div>
      </div>

      <div className="fleet-market-list">
        {privateCustomFleetRows.length || privateCustomLogisticsRows.length ? (
          <>
            {privateCustomFleetRows.length ? (
              <>
                <h4>Özel Araç İlanları</h4>
                {privateCustomFleetRows.map((vehicle, index) => {
                  const templateId = String(vehicle?.templateId || '').trim()
                  const requiredLevel = Math.max(1, Math.trunc(num(vehicle?.marketLevel || vehicle?.requiredLevel || 1)))
                  const unlockedModelLevel = Math.max(1, Math.trunc(num(unlockedModelLevelByTemplate?.[templateId] || 1)))
                  const lockedByLevel = requiredLevel > unlockedModelLevel
                  return (
                    <button
                      key={`private-fleet-${vehicle.id}-${index}`}
                      className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                      type="button"
                      onClick={() => void tapPrivateListing(vehicle)}
                      onPointerUp={(event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        void tapPrivateListing(vehicle)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        void tapPrivateListing(vehicle)
                      }}
                    >
                      <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(vehicle, templateId) ? '0' : '1'}>
                        {resolveVehicleImage(vehicle, templateId) ? (
                          <img
                            src={resolveVehicleImage(vehicle, templateId)}
                            alt={vehicle.name}
                            loading="lazy"
                            onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                          />
                        ) : null}
                        <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, templateId)}</span>
                      </span>
                      <div className="fleet-market-copy">
                        <small className="fleet-market-private-badge">Özel</small>
                        <strong>{vehicle.name}</strong>
                        <div className="fleet-market-meta-line">
                          <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                        </div>
                        {lockedByLevel ? (
                          <small className="fleet-market-lock">Kilitli</small>
                        ) : (
                          <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                        )}
                      </div>
                      <div className="fleet-market-price">
                        <span>Satış Fiyatı</span>
                        <strong>
                          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                          {fmt(vehicle.marketPrice)}
                        </strong>
                      </div>
                    </button>
                  )
                })}
              </>
            ) : null}

            {privateCustomLogisticsRows.length ? (
              <>
                <h4>Özel İkinci El Tır İlanları</h4>
                {privateCustomLogisticsRows.map((truck, index) => {
                  const requiredLevel = Math.max(1, Math.trunc(num(truck?.marketLevel || truck?.requiredLevel || 1)))
                  const lockedByLevel = requiredLevel > playerLevelNow
                  return (
                    <button
                      key={`private-log-${truck.id}-${index}`}
                      className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                      type="button"
                      onClick={() => void tapPrivateListing(truck)}
                      onPointerUp={(event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        void tapPrivateListing(truck)
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        void tapPrivateListing(truck)
                      }}
                    >
                      <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                        {resolveVehicleImage(truck, 'logistics') ? (
                          <img
                            src={resolveVehicleImage(truck, 'logistics')}
                            alt={truck.name}
                            loading="lazy"
                            onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                          />
                        ) : null}
                        <span className="fleet-active-fallback">{truck.emoji || vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                      </span>
                      <div className="fleet-market-copy">
                        <small className="fleet-market-private-badge">Özel</small>
                        <strong>{truck.name}</strong>
                        <div className="fleet-market-meta-line">
                          <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                        </div>
                        <small className="fleet-market-truck-meta">
                          <img src="/home/icons/depot/capacity.png" alt="" className="fleet-market-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                          Kapasite: {fmt(truck.capacity)}
                        </small>
                        {lockedByLevel ? (
                          <small className="fleet-market-lock">Kilitli</small>
                        ) : (
                          <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                        )}
                      </div>
                      <div className="fleet-market-price">
                        <span>Satış Fiyatı</span>
                        <strong>
                          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                          {fmt(truck.marketPrice)}
                        </strong>
                      </div>
                    </button>
                  )
                })}
              </>
            ) : null}
          </>
        ) : (
          <p className="empty">Arkadaşlarından özel ilan bulunmuyor.</p>
        )}
      </div>
    </article>
    </section>

    {marketDetailDraft && businessModal === 'market-detail' ? (
      <section className="warehouse-overlay" onClick={closeMarketListingDetail}>
        <article
          className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-detail-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <h3>İlan Detayları</h3>
          <p className="fleet-listing-modal-subtitle">
            Satın almadan önce ilan bilgilerini kontrol et.
          </p>
          <article className="fleet-listing-preview fleet-market-detail-preview">
            <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(marketDetailDraft, marketDetailTemplateId) ? '0' : '1'}>
              {resolveVehicleImage(marketDetailDraft, marketDetailTemplateId) ? (
                <img
                  src={resolveVehicleImage(marketDetailDraft, marketDetailTemplateId)}
                  alt={marketDetailDraft.name}
                  loading="lazy"
                  onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                />
              ) : null}
              <span className="fleet-active-fallback">
                {marketDetailDraft.emoji || vehicleEmojiByTier(marketDetailDraft.tier, marketDetailTemplateId)}
              </span>
            </span>
            <div className="fleet-listing-copy">
              <strong>{marketDetailDraft.name}</strong>
              <p className="fleet-market-detail-seller">
                Satıcı: <span>{marketDetailDraft.sellerName || 'Oyuncu'}</span>
              </p>
              <div className="fleet-listing-stat-grid">
                <p className="fleet-listing-stat-item">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                    Gereken Seviye
                  </span>
                  <strong>{fmt(marketDetailRequiredLevel)}</strong>
                </p>
                <p className="fleet-listing-stat-item">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                    {marketDetailLevelCurrentLabel}
                  </span>
                  <strong>{fmt(marketDetailLevelCurrent)}</strong>
                </p>
                <p className="fleet-listing-stat-item">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                    Saatlik Gelir
                  </span>
                  <strong>+{fmt(marketDetailDraft.marketIncome || 0)}</strong>
                </p>
                <p className="fleet-listing-stat-item">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                    XP Kazancı
                  </span>
                  <strong>+{fmt(marketDetailDraft.xp || 0)}</strong>
                </p>
                <p className="fleet-listing-stat-item is-wide">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                    Kalan Ömür
                  </span>
                  <strong>{formatLifetimeWithTotal(marketDetailLiveLifetime)}</strong>
                </p>
              </div>
            </div>
          </article>
          <article className="fleet-note-panel fleet-market-detail-price">
            <p className="fleet-listing-range-line">
              <span className="fleet-listing-range-label">
                <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                Satış Fiyatı
              </span>
              <strong>{fmt(marketDetailPrice)}</strong>
            </p>
            <p className="fleet-listing-range-line">
              <span className="fleet-listing-range-label">
                <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                Komisyon (%{fmt(Math.round(marketDetailCommissionRate * 100))})
              </span>
              <strong>- {fmt(marketDetailCommissionAmount)}</strong>
            </p>
            <p className="fleet-listing-range-line is-total">
              <span className="fleet-listing-range-label">
                <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                Satıcı Net Kazanç
              </span>
              <strong>{fmt(marketDetailSellerPayout)}</strong>
            </p>
            {!marketDetailHasBusinessAccess ? (
              <p className="fleet-market-detail-warning">
                {marketDetailBusinessLabel} açık değil. Önce bu işletmeyi açmalısın.
              </p>
            ) : null}
            {!marketDetailCanBuyByLevel ? (
              <p className="fleet-market-detail-warning">
                Seviye yetersiz. Gereken seviye: {fmt(marketDetailRequiredLevel)} | {marketDetailLevelCurrentLabel}: {fmt(marketDetailLevelCurrent)}
              </p>
            ) : null}
            {!marketDetailCanAfford ? (
              <p className="fleet-market-detail-warning">
                Nakit yetersiz. Gerekli tutar: {fmt(marketDetailTotalCost)} | Kasandaki: {fmt(walletNow)}
              </p>
            ) : null}
          </article>
          <button
            className="btn btn-success full fleet-modal-cta-sale"
            onClick={() => void buyVehicleFromMarket(marketDetailDraft.id, marketDetailDraft)}
            disabled={Boolean(busy) || !marketDetailDraft}
          >
            {busy === `buy-listing:${marketDetailDraft.id}`
              ? 'Satın Alınıyor...'
              : marketDetailAssetMeta.buyAction}
          </button>
          <button
            className="btn btn-danger fleet-modal-close fleet-modal-cta-back"
            onClick={closeMarketListingDetail}
          >
            Kapat
          </button>
        </article>
      </section>
    ) : null}

    {marketPurchaseResult && businessModal === 'market-buy-success' ? (
      <section className="warehouse-overlay" onClick={closeMarketPurchaseResult}>
        <article
          className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-purchase-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="fleet-market-purchase-hero">
            <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" loading="lazy" />
            <p>{marketAssetLabel(marketPurchaseResult.templateId).successText}</p>
            <strong>Tebrikler.</strong>
          </div>
          <article className="fleet-listing-preview fleet-market-purchase-preview">
            <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId) ? '0' : '1'}>
              {resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId) ? (
                <img
                  src={resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId)}
                  alt={marketPurchaseResult.name}
                  loading="lazy"
                  onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                />
              ) : null}
              <span className="fleet-active-fallback">
                {marketPurchaseResult.emoji || vehicleEmojiByTier(marketPurchaseResult.tier, marketPurchaseResult.templateId)}
              </span>
            </span>
            <div className="fleet-listing-copy">
              <strong>{marketPurchaseResult.name}</strong>
              <p className="fleet-listing-subline">
                İlan fiyatı: {fmt(marketPurchaseResult.marketPrice || 0)}
                {' | '}
                Komisyon: {fmt(marketPurchaseResult.commissionAmount || 0)}
                {' | '}
                Satıcı Net Kazanç: {fmt(marketPurchaseResult.sellerPayout || 0)}
              </p>
            </div>
          </article>
          <div className="fleet-market-purchase-actions">
            <button className="btn btn-danger" onClick={closeMarketPurchaseResult}>Önceki Sayfa</button>
            <button className="btn btn-accent" onClick={goToOwnedFleetFromPurchase}>
              {marketAssetLabel(marketPurchaseResult.templateId).ownedTabLabel}
            </button>
            <button className="btn btn-success" onClick={goToMyListingsFromPurchase}>Satışlarım</button>
          </div>
          <button
            className="btn btn-danger fleet-modal-close fleet-modal-cta-back"
            onClick={closeMarketPurchaseResult}
          >
            Kapat
          </button>
        </article>
      </section>
    ) : null}
  </>
)
}
