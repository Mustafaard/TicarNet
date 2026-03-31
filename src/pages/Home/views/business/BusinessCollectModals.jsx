import {
  COLLECTION_TAX_PERCENT,
} from '../../constants.js'
import {
  fmt,
} from '../../utils.js'

export function renderBusinessCollectModals(hp) {
  const {
    businessModal,
    busy,
    collectModalBusiness,
    collectModalFuelEnough,
    collectModalFuelMeta,
    collectModalMeta,
    collectModalPreview,
    collectModalPreviewBase,
    confirmCollectFromModal,
    confirmLogisticsCollectFromModal,
    confirmScrapFromListingModal,
    fleetHelpLabel,
    fleetHelpOrderLabel,
    fleetHelpSecondHandLabel,
    fleetHelpUnit,
    inventoryById,
    listingDraft,
    logisticsPreview,
    logisticsPreviewActive,
    logisticsPreviewFuelEnough,
    premiumBoostActive,
    premiumMultiplier,
    setBusinessModal,
    setCollectTargetBusinessId,
  } = hp

  return (
    <>
  {businessModal === 'scrap-confirm' && listingDraft ? (
  <section className="warehouse-overlay fleet-sub-overlay" onClick={() => setBusinessModal('vehicle-actions')}>
    <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-listing-modal-scrap fleet-sub-modal" onClick={(event) => event.stopPropagation()}>
      <h3>
        {listingDraft.templateId === 'moto-rental'
          ? 'Motoru Parçala'
          : listingDraft.templateId === 'property-rental'
            ? 'Mülkü Parçala'
          : listingDraft.kind === 'logistics'
            ? 'Tırı Parçala'
            : 'Aracı Parçala'}
      </h3>
      <p className="fleet-listing-modal-subtitle">
        Bu işlem geri alınamaz. Onaylarsan araç kalıcı olarak parçalanır.
      </p>
      <article className="fleet-note-panel fleet-scrap-preview">
        <p className="fleet-scrap-title">
          %2 iade garantisi:
          {' '}
          <strong>+{fmt(listingDraft.scrapEngineKits || 0)} Motor</strong>
          {' | '}
          <strong>+{fmt(listingDraft.scrapSpareParts || 0)} Yedek Parça</strong>
        </p>
        <p className="fleet-scrap-title">
          Parçalanınca depoya anında eklenir.
        </p>
        <div className="fleet-scrap-grid">
          <p>
            <img src="/home/icons/depot/spare-parts.webp" alt="" aria-hidden="true" />
            Motor İadesi: <strong>{fmt(listingDraft.scrapEngineKits || 0)}</strong>
            <small>Toplam maliyet: {fmt(listingDraft.engineKits || 0)}</small>
          </p>
          <p>
            <img src="/home/icons/depot/yedekparca.webp" alt="" aria-hidden="true" />
            Yedek Parça İadesi: <strong>{fmt(listingDraft.scrapSpareParts || 0)}</strong>
            <small>Toplam maliyet: {fmt(listingDraft.spareParts || 0)}</small>
          </p>
        </div>
      </article>
      <button
        className="btn btn-warning full fleet-modal-cta-scrap"
        onClick={() => void confirmScrapFromListingModal()}
        disabled={Boolean(busy)}
      >
        {busy === (listingDraft.kind === 'logistics'
          ? `scraplog:${listingDraft.truckId}`
          : `scrapbiz:${listingDraft.businessId}:${listingDraft.vehicleId}`)
          ? 'Parçalanıyor...'
          : 'Parçala ve Depoya Ekle'}
      </button>
      <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={() => setBusinessModal('vehicle-actions')}>Kapat</button>
    </article>
  </section>
  ) : null}

  {businessModal === 'collect' ? (
  <section className="warehouse-overlay" onClick={() => {
    setBusinessModal('')
    setCollectTargetBusinessId('')
  }}>
    <article className="warehouse-modal fleet-modal fleet-accountant-modal" onClick={(event) => event.stopPropagation()}>
      <h3 className="fleet-accountant-title">Muhasebeci</h3>
      <p className="fleet-accountant-subtitle">
        {collectModalMeta?.label || 'Kiralama işletmesi'} için saatlik tahsilat özeti hazır.
      </p>
      <div className="fleet-accountant-cta-card">
        <button
          className="btn btn-success full btn-collect-inline"
          onClick={() => void confirmCollectFromModal()}
          disabled={Boolean(busy) || !collectModalFuelEnough}
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
              {busy === `collect:${collectModalBusiness?.id}`
                ? 'Kasaya aktarılıyor...'
                : !collectModalFuelEnough
                  ? `${collectModalFuelMeta.label} Yetersiz`
                  : premiumBoostActive
                    ? `2x Tahsilat Yap (+${fmt(collectModalPreview.netCash)})`
                    : `Net Tahsilat Yap (+${fmt(collectModalPreview.netCash)})`}
            </span>
            {premiumBoostActive ? (
              <small>{premiumMultiplier}x Premium uygulanıyor</small>
            ) : null}
          </span>
        </button>
      </div>
      <article className="fleet-bulk-summary fleet-accountant-summary">
        <p className="fleet-accountant-summary-title">Tahsilat özeti</p>
        <p className="fleet-summary-line positive">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Normal Net Tahsilat: +{fmt(collectModalPreviewBase.netCash)}
        </p>
        {premiumBoostActive ? (
          <p className="fleet-summary-line net">
            <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
            Premium ile 2x Net Tahsilat: +{fmt(collectModalPreview.netCash)}
          </p>
        ) : null}
        <p className="fleet-summary-line positive">
          <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
          + {fmt(collectModalPreview.xpGain)} XP
        </p>
        <hr />
        <p className="fleet-summary-line negative">
          <img src={collectModalFuelMeta.icon} alt="" aria-hidden="true" />
          - {fmt(collectModalPreview.fuelConsumed)} {collectModalPreview.fuelItemName}
        </p>
        <p className="fleet-summary-line negative">
          <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
          Vergi - {fmt(collectModalPreview.taxAmount)} (%{COLLECTION_TAX_PERCENT})
        </p>
        <p className="fleet-net-row fleet-summary-line net">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Brüt Tahsilat: {fmt(collectModalPreview.grossAfterFuel)}
        </p>
        <small className="fleet-accountant-footnote">
          Yakıt durumu: {fmt(collectModalPreview.fuelAvailable)} / {fmt(collectModalPreview.fuelNeeded)} {collectModalPreview.fuelItemName}
        </small>
      </article>
      <div className="fleet-accountant-footer">
        <button
          className="btn btn-danger fleet-modal-close fleet-accountant-close"
          onClick={() => {
            setBusinessModal('')
            setCollectTargetBusinessId('')
          }}
        >
          Kapat
        </button>
      </div>
    </article>
  </section>
  ) : null}

  {businessModal === 'logistics-collect' ? (
  <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
    <article className="warehouse-modal fleet-modal fleet-accountant-modal" onClick={(event) => event.stopPropagation()}>
      <h3 className="fleet-accountant-title">Muhasebeci</h3>
      <p className="fleet-accountant-subtitle">
        Tır kiralama için saatlik tahsilat özeti hazır.
      </p>
      <div className="fleet-accountant-cta-card">
        <button
          className="btn btn-success full btn-collect-inline"
          onClick={() => void confirmLogisticsCollectFromModal()}
          disabled={Boolean(busy) || !logisticsPreviewFuelEnough}
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
                ? 'Kasaya aktarılıyor...'
                : !logisticsPreviewFuelEnough
                  ? 'Petrol Yetersiz'
                  : premiumBoostActive
                    ? `2x Tahsilat Yap (+${fmt(logisticsPreviewActive.netCash || 0)})`
                    : `Net Tahsilat Yap (+${fmt(logisticsPreviewActive.netCash || 0)})`}
            </span>
            {premiumBoostActive ? (
              <small>{premiumMultiplier}x Premium uygulanıyor</small>
            ) : null}
          </span>
        </button>
      </div>
      <article className="fleet-bulk-summary fleet-accountant-summary">
        <p className="fleet-accountant-summary-title">Tahsilat özeti</p>
        <p className="fleet-summary-line positive">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Normal Net Tahsilat: +{fmt(logisticsPreview.netCash || 0)}
        </p>
        {premiumBoostActive ? (
          <p className="fleet-summary-line net">
            <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
            Premium ile 2x Net Tahsilat: +{fmt(logisticsPreviewActive.netCash || 0)}
          </p>
        ) : null}
        <p className="fleet-summary-line positive">
          <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
          + {fmt(logisticsPreviewActive.xpGain || 0)} XP
        </p>
        <hr />
        <p className="fleet-summary-line negative">
          <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
          - {fmt(logisticsPreviewActive.fuelConsumed || 0)} {String(logisticsPreviewActive.fuelItemName || 'Petrol')}
        </p>
        <p className="fleet-summary-line negative">
          <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
          Vergi - {fmt(logisticsPreviewActive.taxAmount || 0)} (%{COLLECTION_TAX_PERCENT})
        </p>
        <p className="fleet-net-row fleet-summary-line net">
          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
          Brüt Tahsilat: {fmt(logisticsPreviewActive.grossCash || 0)}
        </p>
        <small className="fleet-accountant-footnote">
          Depodaki yakıt: {fmt(inventoryById[String(logisticsPreviewActive.fuelItemId || 'oil')] || 0)} {String(logisticsPreviewActive.fuelItemName || 'Petrol')}
        </small>
      </article>
      <div className="fleet-accountant-footer">
        <button className="btn btn-danger fleet-modal-close fleet-accountant-close" onClick={() => setBusinessModal('')}>Kapat</button>
      </div>
    </article>
  </section>
  ) : null}

  {businessModal === 'fleet-help' ? (
  <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
    <article className="warehouse-modal fleet-modal fleet-bulk-modal" onClick={(event) => event.stopPropagation()}>
      <h3>İşletme Bilgisi</h3>
      <p><strong>{fleetHelpLabel}</strong> için kısa kullanım özeti:</p>
      <article className="fleet-note-panel">
        <p>1. {fleetHelpOrderLabel} bölümünden yeni {fleetHelpUnit} al.</p>
        <p>2. {fleetHelpSecondHandLabel} bölümünden uygun fiyatlı alım/satım yap.</p>
        <p>3. Tahsilat aralığı 60 dakikadır, süre dolunca toplu tahsilat butonuna bas.</p>
        <p>4. Yakıt azsa gelir düşer; depoda petrol/malzeme tut.</p>
        <p>5. Tahsilatta net gelir, vergi ve yakıt kesintisi muhasebeci ekranında görünür.</p>
      </article>
      <button className="btn btn-danger fleet-modal-close" onClick={() => setBusinessModal('')}>Kapat</button>
    </article>
  </section>
  ) : null}

    </>
  )
}
