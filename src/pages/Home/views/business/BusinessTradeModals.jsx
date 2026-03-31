import {
  VEHICLE_MARKET_COMMISSION_PERCENT,
} from '../../constants.js'
import {
  fmt,
  formatDateTime,
  formatLifetimeWithTotal,
  resolveVehicleImage,
  vehicleEmojiByTier,
} from '../../utils.js'

export function renderBusinessTradeModals(hp) {
  const {
  businessModal,
  busy,
  buyVehicleFromMarket,
  cancelListingFromModal,
  closeListingModal,
  closeMarketListingDetail,
  closeMarketPurchaseResult,
  confirmListingModal,
  goToMyListingsFromPurchase,
  goToOwnedFleetFromPurchase,
  listingDraft,
  listingDraftCancelBusyKey,
  listingDraftIsListed,
  listingDraftLiveLifetime,
  listingDraftSafeListingId,
  listingFriends,
  listingFriendsLoading,
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
  openListingPriceModal,
  openScrapConfirmModal,
  setBusinessModal,
  setListingDraft,
  walletNow,
} = hp

  return (
    <>
  {marketDetailDraft && businessModal === 'market-detail' ? (
  <section className="warehouse-overlay" onClick={closeMarketListingDetail}>
    <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-detail-modal" onClick={(event) => event.stopPropagation()}>
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
      <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={closeMarketListingDetail}>Kapat</button>
    </article>
  </section>
  ) : null}

  {marketPurchaseResult && businessModal === 'market-buy-success' ? (
  <section className="warehouse-overlay" onClick={closeMarketPurchaseResult}>
    <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-purchase-modal" onClick={(event) => event.stopPropagation()}>
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
            Satıcı Net: {fmt(marketPurchaseResult.sellerPayout || 0)}
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
      <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={closeMarketPurchaseResult}>Kapat</button>
    </article>
  </section>
  ) : null}

  {listingDraft && ['vehicle-actions', 'list-sale', 'scrap-confirm'].includes(businessModal) ? (
  <section className="warehouse-overlay" onClick={closeListingModal}>
    <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-listing-modal-actions" onClick={(event) => event.stopPropagation()}>
      <h3>
        {listingDraftIsListed
          ? (listingDraft.templateId === 'moto-rental'
            ? 'Motor Satış Detayı'
            : listingDraft.templateId === 'property-rental'
              ? 'Mülk Satış Detayı'
            : listingDraft.kind === 'logistics'
              ? 'Tır Satış Detayı'
              : 'Araç Satış Detayı')
          : (listingDraft.templateId === 'moto-rental'
            ? 'Motor Detayı'
            : listingDraft.templateId === 'property-rental'
              ? 'Mülk Detayı'
            : listingDraft.kind === 'logistics'
              ? 'Tır Detayı'
              : 'Araç Detayı')}
      </h3>
      <p className="fleet-listing-modal-subtitle">
        {listingDraftIsListed
          ? 'Aktif satışı inceleyip satıştan vazgeçebilirsin.'
          : 'İlana ekleyebilir veya parçalayabilirsin.'}
      </p>
      <article className="fleet-listing-preview">
        <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(listingDraft, listingDraft.templateId) ? '0' : '1'}>
          {resolveVehicleImage(listingDraft, listingDraft.templateId) ? (
            <img
              src={resolveVehicleImage(listingDraft, listingDraft.templateId)}
              alt={listingDraft.name}
              loading="lazy"
              onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
            />
          ) : null}
          <span className="fleet-active-fallback">
            {listingDraft.emoji || vehicleEmojiByTier('', listingDraft.templateId)}
          </span>
        </span>
        <div className="fleet-listing-copy">
          <strong>{listingDraft.name}</strong>
          <p className="fleet-listing-subline">
            <span className="level-text">Seviye {fmt(listingDraft.level)}</span>
            {' | '}
            {listingDraftIsListed
              ? `Satış Fiyatı ${fmt(listingDraft.listingPrice || listingDraft.price || 0)}`
              : `+${fmt(listingDraft.xp || 0)} XP`}
          </p>
          <div className="fleet-listing-stat-grid">
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                Gelir
              </span>
              <strong>{fmt(listingDraft.income)}</strong>
            </p>
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                XP Geliri
              </span>
              <strong>{fmt(listingDraft.xp || 0)}</strong>
            </p>
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                Seviye
              </span>
              <strong>{fmt(listingDraft.level)}</strong>
            </p>
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/icons/v2/market.png" alt="" aria-hidden="true" />
                Piyasa Adedi
              </span>
              <strong>{fmt(listingDraft.marketCount || 0)}</strong>
            </p>
            {listingDraft.kind === 'logistics' ? (
              <>
                <p className="fleet-listing-stat-item">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/icons/depot/capacity.png" alt="" aria-hidden="true" />
                    Kapasite
                  </span>
                  <strong>{fmt(listingDraft.capacity)}</strong>
                </p>
              </>
            ) : null}
            <p className="fleet-listing-stat-item is-wide">
              <span className="fleet-listing-stat-label">
                <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                Ömür
              </span>
              <strong>{formatLifetimeWithTotal(listingDraftLiveLifetime)}</strong>
            </p>
          </div>
        </div>
      </article>
      {listingDraftIsListed ? (
        <article className="fleet-note-panel fleet-scrap-preview">
          <p className="fleet-scrap-title">
            İlan tarihi: <strong>{formatDateTime(listingDraft?.listedAt || '')}</strong>
          </p>
          <p className="fleet-scrap-title">
            <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
            Komisyon (%{VEHICLE_MARKET_COMMISSION_PERCENT}):
            {' '}
            <strong>-{fmt(listingDraft?.commissionAmount || 0)}</strong>
            {' | '}
            Satıcı Net:
            {' '}
            <strong>{fmt(listingDraft?.sellerPayout || 0)}</strong>
          </p>
        </article>
      ) : (
        <article className="fleet-note-panel fleet-scrap-preview">
          <p className="fleet-scrap-title">
            %2 iade garantisi:
            {' '}
            <strong>+{fmt(listingDraft.scrapEngineKits || 0)} Motor</strong>
            {' | '}
            <strong>+{fmt(listingDraft.scrapSpareParts || 0)} Yedek Parça</strong>
          </p>
        </article>
      )}
      {listingDraftIsListed ? (
        <button
          className="btn btn-danger full fleet-modal-cta-sale"
          onClick={() => void cancelListingFromModal()}
          disabled={Boolean(busy) || !listingDraftSafeListingId}
        >
          {busy === listingDraftCancelBusyKey ? 'İptal Ediliyor...' : 'Satıştan Vazgeç'}
        </button>
      ) : (
        <div className="fleet-listing-action-grid">
          <button
            className="btn btn-success full fleet-modal-cta-sale"
            onClick={openListingPriceModal}
            disabled={Boolean(busy)}
          >
            İlana Ekle
          </button>
          <button
            className="btn btn-warning full fleet-modal-cta-scrap"
            onClick={openScrapConfirmModal}
            disabled={Boolean(busy)}
          >
            Parçala
          </button>
        </div>
      )}
      <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={closeListingModal}>Kapat</button>
    </article>
  </section>
  ) : null}

  {businessModal === 'list-sale' && listingDraft ? (
  <section className="warehouse-overlay fleet-sub-overlay" onClick={() => setBusinessModal('vehicle-actions')}>
    <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-listing-modal-sale fleet-sub-modal" onClick={(event) => event.stopPropagation()}>
      <h3>
        {listingDraft.templateId === 'moto-rental'
          ? 'Motoru Sat'
          : listingDraft.templateId === 'property-rental'
            ? 'Mülkü Sat'
          : listingDraft.kind === 'logistics'
            ? 'Tırı Sat'
            : 'Aracı Sat'}
      </h3>
      <p className="fleet-listing-modal-subtitle">
        Satış tutarını gir ve onayla.
      </p>
      <article className="fleet-listing-preview">
        <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(listingDraft, listingDraft.templateId) ? '0' : '1'}>
          {resolveVehicleImage(listingDraft, listingDraft.templateId) ? (
            <img
              src={resolveVehicleImage(listingDraft, listingDraft.templateId)}
              alt={listingDraft.name}
              loading="lazy"
              onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
            />
          ) : null}
          <span className="fleet-active-fallback">
            {listingDraft.emoji || vehicleEmojiByTier('', listingDraft.templateId)}
          </span>
        </span>
        <div className="fleet-listing-copy">
          <strong>{listingDraft.name}</strong>
          <p className="fleet-listing-subline">
            <span className="level-text">Seviye {fmt(listingDraft.level)}</span>
            {' | '}
            Gelir {fmt(listingDraft.income)}
            {' | '}
            +{fmt(listingDraft.xp || 0)} XP
          </p>
          <div className="fleet-listing-stat-grid">
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                Gelir
              </span>
              <strong>{fmt(listingDraft.income)}</strong>
            </p>
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                XP Geliri
              </span>
              <strong>{fmt(listingDraft.xp || 0)}</strong>
            </p>
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                Seviye
              </span>
              <strong>{fmt(listingDraft.level)}</strong>
            </p>
            <p className="fleet-listing-stat-item">
              <span className="fleet-listing-stat-label">
                <img src="/home/icons/v2/market.png" alt="" aria-hidden="true" />
                Piyasa Adedi
              </span>
              <strong>{fmt(listingDraft.marketCount || 0)}</strong>
            </p>
            {listingDraft.kind === 'logistics' ? (
              <>
                <p className="fleet-listing-stat-item">
                  <span className="fleet-listing-stat-label">
                    <img src="/home/icons/depot/capacity.png" alt="" aria-hidden="true" />
                    Kapasite
                  </span>
                  <strong>{fmt(listingDraft.capacity)}</strong>
                </p>
              </>
            ) : null}
            <p className="fleet-listing-stat-item is-wide">
              <span className="fleet-listing-stat-label">
                <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                Ömür
              </span>
              <strong>{formatLifetimeWithTotal(listingDraftLiveLifetime)}</strong>
            </p>
          </div>
        </div>
      </article>
      <article className="fleet-note-panel fleet-listing-ranges">
        <p className="fleet-listing-range-line">
          <span className="fleet-listing-range-label">
            <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
            Minimum satış:
          </span>
          <strong>{fmt(listingDraft.minPrice)}</strong>
        </p>
        <p className="fleet-listing-range-line">
          <span className="fleet-listing-range-label">
            <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
            Maksimum satış:
          </span>
          <strong>{fmt(listingDraft.maxPrice)}</strong>
        </p>
      </article>
      <label className="fleet-listing-target-field">
        <span>Satılacak kişi</span>
        <select
          className="fleet-listing-target-select"
          value={String(listingDraft?.visibility || 'public')}
          onChange={(event) => {
            const nextVisibility = String(event.target.value || 'public').trim()
            setListingDraft((prev) =>
              prev
                ? {
                    ...prev,
                    visibility: nextVisibility === 'custom' ? 'custom' : 'public',
                    recipientUserId:
                      nextVisibility === 'custom'
                        ? String(prev.recipientUserId || listingFriends?.[0]?.userId || '').trim()
                        : '',
                  }
                : prev,
            )
          }}
        >
          <option value="public">Herkes Alabilir</option>
          <option value="custom">Sadece Seçtiğim Arkadaş</option>
        </select>
        {String(listingDraft?.visibility || 'public').toLowerCase() === 'custom' ? (
          <select
            className="fleet-listing-target-select"
            value={String(listingDraft?.recipientUserId || '').trim()}
            onChange={(event) => {
              const nextUserId = String(event.target.value || '').trim()
              setListingDraft((prev) => (prev ? { ...prev, recipientUserId: nextUserId } : prev))
            }}
            disabled={listingFriendsLoading}
          >
            {listingFriendsLoading ? (
              <option value="">Arkadaşlar yükleniyor...</option>
            ) : (listingFriends || []).length ? (
              (listingFriends || []).map((friend) => (
                <option key={friend.userId} value={friend.userId}>
                  {friend.username || friend.userId} (Lv {friend.level || 1})
                </option>
              ))
            ) : (
              <option value="">Arkadaş bulunamadı</option>
            )}
          </select>
        ) : null}
      </label>
      {(() => {
        const customVisibility = String(listingDraft?.visibility || 'public').toLowerCase() === 'custom'
        return (
          <p className="fleet-listing-limit-hint">
            {customVisibility
              ? 'Özel ilanda aynı anda en fazla 10 aktif ilan açabilirsin.'
              : 'Genel ilanda limit yok.'}
          </p>
        )
      })()}
      <label className="fleet-listing-price-field">
        <span>Satış fiyatı</span>
        <input
          className="qty-input"
          inputMode="numeric"
          value={String(listingDraft.price || '')}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 15)
            setListingDraft((prev) => (prev ? { ...prev, price: digits } : prev))
          }}
          placeholder="Miktarı yazınız"
        />
      </label>
      <button
        className="btn btn-success full fleet-modal-cta-sale"
        onClick={() => void confirmListingModal()}
        disabled={
          Boolean(busy) ||
          (String(listingDraft?.visibility || 'public').trim().toLowerCase() === 'custom' &&
            (!String(listingDraft?.recipientUserId || '').trim() || listingFriendsLoading))
        }
      >
        {busy === (listingDraft.kind === 'logistics'
          ? `listlog:${listingDraft.truckId}`
          : `listbiz:${listingDraft.businessId}:${listingDraft.vehicleId}`)
          ? 'İlana ekleniyor...'
          : 'Satışa Koy'}
      </button>
      <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={() => setBusinessModal('vehicle-actions')}>Kapat</button>
    </article>
  </section>
  ) : null}

    </>
  )
}
