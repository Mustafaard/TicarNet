import {
  VEHICLE_LIFETIME_MONTHS_TOTAL,
} from '../../constants.js'
import {
  fleetFuelUnitsByModelLevel,
  fleetOrderCostRows,
  fmt,
  num,
  resolveVehicleImage,
  toDisplayOrderCostRows,
  vehicleEmojiByTier,
} from '../../utils.js'
import {
  AssetMetric,
} from '../../ui-components.jsx'

export function renderBusinessGallery(hp) {
  const {
  businessScene,
  busy,
  companyLegalLabel,
  inventoryById,
  produceBizVehicle,
  selectedBuildRows,
  selectedBusiness,
  selectedBusinessFuelMeta,
  selectedBusinessGalleryTitle,
  selectedCanOrderNow,
  selectedHasCapacityForOrder,
  selectedOrderCountdown,
  selectedOrderRemainingMs,
  selectedUnlockedModelLevel,
  setBusinessScene,
  walletNow,
  weeklyEventsRuntimeState,
} = hp

  return (
    <>
  {businessScene === 'gallery' && selectedBusiness?.templateId === 'moto-rental' ? (
    <article className="card fleet-detail-card fleet-fullscreen-card fleet-order-screen moto-order-screen">
      <div className="fleet-subheader">
        <div className="fleet-subheader-copy">
          <p className="fleet-subheader-owner">{companyLegalLabel}</p>
          <h3 className="fleet-subheader-title">{selectedBusinessGalleryTitle}</h3>
        </div>
        <div className="fleet-subheader-actions">
          <button className="btn btn-danger" onClick={() => setBusinessScene('detail')}>Geri</button>
        </div>
      </div>
      <div className="fleet-gallery-note fleet-order-gallery-note moto-gallery-note">
        <p>{selectedHasCapacityForOrder ? 'Siparişe hazır.' : 'Kapasite dolu. Yeni sipariş için önce yer aç.'}</p>
        <p className="fleet-live-countdown">Canlı sipariş geri sayımı: {selectedOrderCountdown}</p>
      </div>
      <div className="fleet-vehicle-list fleet-order-list moto-order-list">
        {selectedBuildRows.map((vehicle, vehicleIndex) => {
          const costRows = fleetOrderCostRows(vehicle, walletNow, inventoryById)
          const displayCostRows = toDisplayOrderCostRows(costRows, { requiredOnly: true })
          const orderFuelCost = Math.max(0, Math.trunc(num(vehicle?.fuel || 0)))
          const oilInInventory = Math.max(0, Math.trunc(num(inventoryById?.oil || 0)))
          const hasEnoughFuelForOrder = oilInInventory >= orderFuelCost
          const hasEnoughMaterials = costRows.every((entry) => entry.enough) && hasEnoughFuelForOrder
          const modelLevelRequired = num(vehicle.requiredLevel || 1)
          const lockedByLevel = modelLevelRequired > selectedUnlockedModelLevel
          const blockedByMaterials = !hasEnoughMaterials && !lockedByLevel && selectedCanOrderNow
          const modelOrderLevel = Math.max(1, vehicleIndex + 1)
          const fuelLevel = Math.max(1, Math.trunc(num(modelLevelRequired || modelOrderLevel)))
                const hourlyFuelNeed = fleetFuelUnitsByModelLevel(fuelLevel, 'moto-rental', {
                  weeklyEvents: weeklyEventsRuntimeState,
                })
          return (
            <article key={`${selectedBusiness.id}-moto-build-${vehicle.id}`} className="fleet-vehicle-row fleet-order-card moto-order-card">
              <div className="fleet-vehicle-head">
                <strong>{vehicle.name}</strong>
              </div>
              <div className="fleet-vehicle-body">
                <span className="fleet-vehicle-media" data-broken={resolveVehicleImage(vehicle, 'moto-rental') ? '0' : '1'}>
                  {resolveVehicleImage(vehicle, 'moto-rental') ? <img src={resolveVehicleImage(vehicle, 'moto-rental')} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                  <span className="fleet-vehicle-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, 'moto-rental')}</span>
                </span>
                <div className="fleet-vehicle-specs">
                  <div className="asset-metric-grid fleet-order-metric-grid moto-order-metric-grid">
                    <AssetMetric
                      icon="/home/ui/hud/level-icon.webp"
                      label="Seviye"
                      value={`${fmt(modelLevelRequired || 1)} Seviye`}
                      status={lockedByLevel ? 'fail' : 'ok'}
                      statusHint={lockedByLevel ? `Gereken seviye: ${fmt(modelLevelRequired || 1)}` : 'Yeterli'}
                    />
                    {displayCostRows.map((row) => (
                      <AssetMetric
                        key={`${vehicle.id}-moto-${row.label}`}
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
              <div className="fleet-order-summary moto-order-summary">
                <div className="fleet-order-summary-item moto-order-summary-item is-income">
                  <span className="fleet-order-summary-label">
                    <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" loading="lazy" />
                    Saatlik Gelir
                  </span>
                  <span className="fleet-order-summary-value">+ {fmt(vehicle.rentPerHour || 0)}</span>
                </div>
                <div className="fleet-order-summary-item moto-order-summary-item is-fuel">
                  <span className="fleet-order-summary-label">
                    <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" loading="lazy" />
                    Benzin Gideri
                  </span>
                  <span className="fleet-order-summary-value">- {fmt(hourlyFuelNeed)} Petrol</span>
                </div>
                <div className="fleet-order-summary-item moto-order-summary-item is-xp">
                  <span className="fleet-order-summary-label">
                    <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" loading="lazy" />
                    XP Kazancı
                  </span>
                  <span className="fleet-order-summary-value">+ {fmt(vehicle.xp || 0)}</span>
                </div>
                <div className="fleet-order-summary-item moto-order-summary-item is-lifetime">
                  <span className="fleet-order-summary-label">
                    <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" loading="lazy" />
                    Toplam Ömür
                  </span>
                  <span className="fleet-order-summary-value">{VEHICLE_LIFETIME_MONTHS_TOTAL} Ay</span>
                </div>
              </div>
              <button
                className={`btn fleet-order-action ${blockedByMaterials ? 'btn-danger' : 'btn-success'} moto-order-action${selectedOrderRemainingMs > 0 ? ' is-cooldown' : ' is-ready'}`}
                onClick={() => produceBizVehicle(selectedBusiness.id, vehicle.id)}
                disabled={
                  Boolean(busy) ||
                  !selectedCanOrderNow ||
                  lockedByLevel ||
                  !hasEnoughMaterials
                }
              >
                {busy === `prodbiz:${selectedBusiness.id}:${vehicle.id}`
                  ? 'Üretiliyor...'
                  : selectedOrderRemainingMs > 0
                    ? `Kalan: ${selectedOrderCountdown}`
                    : lockedByLevel
                      ? `Seviye ${fmt(modelLevelRequired)}`
                      : !hasEnoughMaterials
                        ? 'Malzeme Yetersiz'
                        : 'Sipariş Ver'}
              </button>
            </article>
          )
        })}
      </div>
    </article>
  ) : null}
  {businessScene === 'gallery' && ['auto-rental', 'property-rental'].includes(String(selectedBusiness?.templateId || '')) ? (
    <article className="card fleet-detail-card fleet-fullscreen-card fleet-order-screen auto-order-screen">
      <div className="fleet-subheader">
        <div className="fleet-subheader-copy">
          <p className="fleet-subheader-owner">{companyLegalLabel}</p>
          <h3 className="fleet-subheader-title">{selectedBusinessGalleryTitle}</h3>
        </div>
        <div className="fleet-subheader-actions">
          <button className="btn btn-danger" onClick={() => setBusinessScene('detail')}>Geri</button>
        </div>
      </div>
      <div className="fleet-gallery-note fleet-order-gallery-note auto-gallery-note">
        <p>{selectedHasCapacityForOrder ? 'Siparişe hazır.' : 'Kapasite dolu. Yeni sipariş için önce yer aç.'}</p>
        <p className="fleet-live-countdown">Canlı sipariş geri sayımı: {selectedOrderCountdown}</p>
      </div>
      <div className="fleet-vehicle-list fleet-order-list auto-order-list">
        {selectedBuildRows.map((vehicle, vehicleIndex) => {
          const costRows = fleetOrderCostRows(vehicle, walletNow, inventoryById)
          const displayCostRows = toDisplayOrderCostRows(costRows, { requiredOnly: true })
          const orderFuelCost = Math.max(0, Math.trunc(num(
            selectedBusinessFuelMeta.id === 'energy' ? (vehicle?.energy || 0) : (vehicle?.fuel || 0),
          )))
          const fuelInInventory = Math.max(0, Math.trunc(num(inventoryById?.[selectedBusinessFuelMeta.id] || 0)))
          const hasEnoughFuelForOrder = fuelInInventory >= orderFuelCost
          const hasEnoughMaterials = costRows.every((entry) => entry.enough) && hasEnoughFuelForOrder
          const modelLevelRequired = num(vehicle.requiredLevel || 1)
          const lockedByLevel = modelLevelRequired > selectedUnlockedModelLevel
          const blockedByMaterials = !hasEnoughMaterials && !lockedByLevel && selectedCanOrderNow
          const modelOrderLevel = Math.max(1, vehicleIndex + 1)
          const fuelLevel = Math.max(1, Math.trunc(num(modelLevelRequired || modelOrderLevel)))
                const hourlyFuelNeed = fleetFuelUnitsByModelLevel(
                  fuelLevel,
                  selectedBusiness?.templateId || 'auto-rental',
                  { weeklyEvents: weeklyEventsRuntimeState },
                )
          return (
            <article key={`${selectedBusiness.id}-auto-build-${vehicle.id}`} className="fleet-vehicle-row fleet-order-card auto-order-card">
              <div className="fleet-vehicle-head">
                <strong>{vehicle.name}</strong>
              </div>
              <div className="fleet-vehicle-body">
                <span className="fleet-vehicle-media" data-broken={resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? '0' : '1'}>
                  {resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? <img src={resolveVehicleImage(vehicle, selectedBusiness?.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                  <span className="fleet-vehicle-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, selectedBusiness?.templateId)}</span>
                </span>
                <div className="fleet-vehicle-specs">
                  <div className="asset-metric-grid fleet-order-metric-grid auto-order-metric-grid">
                    <AssetMetric
                      icon="/home/ui/hud/level-icon.webp"
                      label="Seviye"
                      value={`${fmt(modelLevelRequired || 1)} Seviye`}
                      status={lockedByLevel ? 'fail' : 'ok'}
                      statusHint={lockedByLevel ? `Gereken seviye: ${fmt(modelLevelRequired || 1)}` : 'Yeterli'}
                    />
                    {displayCostRows.map((row) => (
                      <AssetMetric
                        key={`${vehicle.id}-auto-${row.label}`}
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
              <div className="fleet-order-summary auto-order-summary">
                <div className="fleet-order-summary-item auto-order-summary-item is-income">
                  <span className="fleet-order-summary-label">
                    <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" loading="lazy" />
                    Saatlik Gelir
                  </span>
                  <span className="fleet-order-summary-value">+ {fmt(vehicle.rentPerHour || 0)}</span>
                </div>
                <div className="fleet-order-summary-item auto-order-summary-item is-fuel">
                  <span className="fleet-order-summary-label">
                    <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" loading="lazy" />
                    {selectedBusinessFuelMeta.expenseLabel}
                  </span>
                  <span className="fleet-order-summary-value">- {fmt(hourlyFuelNeed)} {selectedBusinessFuelMeta.label}</span>
                </div>
                <div className="fleet-order-summary-item auto-order-summary-item is-xp">
                  <span className="fleet-order-summary-label">
                    <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" loading="lazy" />
                    XP Kazancı
                  </span>
                  <span className="fleet-order-summary-value">+ {fmt(vehicle.xp || 0)}</span>
                </div>
                <div className="fleet-order-summary-item auto-order-summary-item is-lifetime">
                  <span className="fleet-order-summary-label">
                    <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" loading="lazy" />
                    Toplam Ömür
                  </span>
                  <span className="fleet-order-summary-value">{VEHICLE_LIFETIME_MONTHS_TOTAL} Ay</span>
                </div>
              </div>
              <button
                className={`btn fleet-order-action ${blockedByMaterials ? 'btn-danger' : 'btn-success'} auto-order-action${selectedOrderRemainingMs > 0 ? ' is-cooldown' : ' is-ready'}`}
                onClick={() => produceBizVehicle(selectedBusiness.id, vehicle.id)}
                disabled={
                  Boolean(busy) ||
                  !selectedCanOrderNow ||
                  lockedByLevel ||
                  !hasEnoughMaterials
                }
              >
                {busy === `prodbiz:${selectedBusiness.id}:${vehicle.id}`
                  ? 'Üretiliyor...'
                  : selectedOrderRemainingMs > 0
                    ? `Kalan: ${selectedOrderCountdown}`
                    : lockedByLevel
                      ? `Seviye ${fmt(modelLevelRequired)}`
                      : !hasEnoughMaterials
                        ? 'Malzeme Yetersiz'
                        : 'Sipariş Ver'}
              </button>
            </article>
          )
        })}
      </div>
    </article>
  ) : null}
    </>
  )
}
