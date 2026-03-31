import { factoryItemMeta, factoryPurchaseRowsFromFactory, fmt, formatBuildDuration, formatCollectionCountdown, resolveFactoryShopImage } from '../utils.js'
import { createPortal } from 'react-dom';

export function renderFactoriesView(hp) {
  const {
  buildingFactoryRows,
  busy,
  buyFactoryAction,
  canStartAnotherFactoryBuild,
  canStartAnotherFactoryUpgrade,
  closeFactoryBulkCollectModal,
  closeFactoryCollectModal,
  closeFactoryPurchaseModal,
  collectFactoryAction,
  confirmFactoryBulkCollectFromModal,
  confirmFactoryCollectFromModal,
  confirmFactoryUpgradeFromModal,
  factoriesEnergyBlockedCount,
  factoriesOwnedCount,
  factoriesReadyCount,
  factoriesUpgradingCount,
  factoryBulkModalError,
  factoryBulkModalOpen,
  factoryBulkPreview,
  factoryCollectModal,
  factoryCollectModalBlockedReason,
  factoryCollectModalBusyKey,
  factoryCollectModalError,
  factoryPurchaseBusyKey,
  factoryPurchaseModal,
  factoryPurchaseModalCanBuyNow,
  factoryPurchaseModalMissingRows,
  factoryPurchaseModalRows,
  factoryPurchaseOverlayRef,
  factoryUpgradeModal,
  factoryUpgradeModalBlockedBySlot,
  factoryUpgradeModalHasMissingCost,
  factoryUpgradeModalMissingRows,
  inventoryById,
  lockedFactoryRows,
  openFactoryBulkCollectModal,
  openFactoryCollectModal,
  openFactoryPurchaseModal,
  ownedFactoryRows,
  premiumActive,
  premiumBoostActive,
  premiumDiamond,
  premiumMultiplier,
  renderWeeklyEventInlineCard,
  setFactoryUpgradeModalId,
  speedupFactoryBuildAction,
  speedupFactoryUpgradeAction,
  upgradingFactoryRows,
} = hp


const _renderFactoryCard = (factory) => {
  const busyBuyKey = `factory-buy:${factory.id}`
  const busyCollectKey = `factory-collect:${factory.id}`
  const busyUpgradeKey = `factory-upgrade:${factory.id}`
  const busySpeedupKey = `factory-speedup:${factory.id}`
  const canSpeedupNow = factory.isUpgrading && premiumDiamond >= factory.speedupDiamondCost
  const _collectBase = factory.outputPerCollect || 0
  const _collectWith2x = premiumBoostActive && _collectBase > 0 ? _collectBase * premiumMultiplier : 0
  const collectButtonLabel = busy === busyCollectKey
    ? 'Tahsilat...'
    : factory.canCollectNow
      ? premiumBoostActive && _collectWith2x > 0
        ? `+${fmt(_collectWith2x)} (2x)`
        : `+${fmt(_collectBase)} ${factory.outputMeta?.label || ''}`
      : factory.collectRemainingMs > 0
        ? `Kalan ${formatCollectionCountdown(factory.collectRemainingMs)}`
        : factory.collectEnergyMissing > 0
          ? `${factory.energyMeta.label} Eksik`
          : 'Tahsilat Beklemede'
  const blockedByOtherUpgrade = !factory.isUpgrading && !canStartAnotherFactoryUpgrade
  const isPurchaseCard = !factory.owned && !factory.isBuilding
  const purchaseRequirementRows = factoryPurchaseRowsFromFactory(factory)
  const purchaseMissingRows = purchaseRequirementRows.filter((row) => row.missing > 0)

  return (
    <article
      key={factory.id}
      className={`factory-card${factory.owned ? ' is-owned' : ''}${factory.isBuilding ? ' is-building' : ''}${factory.isUpgrading ? ' is-upgrading' : ''}${isPurchaseCard ? ' is-shop-card' : ''}`.trim()}
    >
      <div className="factory-card-head">
        <span className="factory-card-icon" data-broken="0">
          <img
            src={factory.icon || '/home/icons/businesses/fabrikam.webp'}
            alt={factory.name}
            loading="lazy"
            onError={(event) => {
              const holder = event.currentTarget.parentElement
              if (holder) holder.setAttribute('data-broken', '1')
            }}
          />
          <span className="factory-card-icon-fallback">FB</span>
        </span>
        <div className="factory-card-title">
          <h4>{factory.name}</h4>
          <small>
            {factory.owned
              ? factory.hasLevelCap
                ? `Seviye ${fmt(factory.level)} / ${fmt(factory.maxLevel)}`
                : `Seviye ${fmt(factory.level)} (sınırsız yükseltme)`
              : `Kurulum: ${fmt(factory.purchaseCostCash)} nakit`}
          </small>
        </div>
        <span className={`factory-state-badge ${
          factory.isBuilding
            ? 'is-building'
            : factory.isUpgrading
              ? 'is-upgrading'
              : factory.owned
                ? 'is-active'
                : 'is-locked'
        }`.trim()}>
          {factory.isBuilding
            ? 'İNŞA'
            : factory.isUpgrading
              ? 'YÜKSELİYOR'
              : factory.owned
                ? 'AKTİF'
                : 'KİLİTLİ'}
        </span>
      </div>

      {isPurchaseCard ? (
        <div className="factory-shop-hero" data-broken="0">
          <img
            src={resolveFactoryShopImage(factory)}
            alt={factory.name}
            loading="lazy"
            onError={(event) => {
              const holder = event.currentTarget.parentElement
              if (holder) holder.setAttribute('data-broken', '1')
            }}
          />
          <span className="factory-shop-hero-fallback">FAB</span>
        </div>
      ) : null}

      <div className="factory-production-row">
        <div className="factory-production-item">
          <small>Üretim</small>
          <strong>
            <img src={factory.outputMeta.icon} alt="" aria-hidden="true" />
            +{fmt(factory.outputPerCollect)} {factory.outputMeta.label}
          </strong>
        </div>
        <div className="factory-production-item">
          <small>Enerji</small>
          <strong>
            <img src={factory.energyMeta.icon} alt="" aria-hidden="true" />
            -{fmt(factory.energyCostPerCollect)} {factory.energyMeta.label}
          </strong>
        </div>
        <div className="factory-production-item">
          <small>XP</small>
          <strong>
            <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
            +{fmt(factory.xpPerCollect)} XP
          </strong>
        </div>
      </div>

      {factory.isBuilding ? (
        <p className="factory-status-line">
          İnşa sürüyor: <strong>{formatCollectionCountdown(factory.buildRemainingMs)}</strong>
        </p>
      ) : factory.isUpgrading ? (
        <p className="factory-status-line">
          Yükseltme tamamlanmasına kalan: <strong>{formatCollectionCountdown(factory.upgradeRemainingMs)}</strong>
        </p>
      ) : factory.owned ? (
        <p className="factory-status-line">
          {factory.collectRemainingMs > 0
            ? `Tahsilat hazır olmasına kalan: ${formatCollectionCountdown(factory.collectRemainingMs)}`
            : 'Tahsilat hazır. Toplayabilirsin.'}
        </p>
      ) : null}

      {isPurchaseCard ? (
        <div className="factory-upgrade-costs factory-upgrade-costs-purchase">
          <div className="factory-purchase-meta-grid">
            <article className="factory-purchase-meta-card">
              <small>Kurulum Süresi</small>
              <strong>{formatBuildDuration(factory.buildDurationMinutes * 60 * 1000)}</strong>
            </article>
            <article className="factory-purchase-meta-card">
              <small>Tahsilat Döngüsü</small>
              <strong>{fmt(factory.collectIntervalMinutes)} dk</strong>
            </article>
            <article className="factory-purchase-meta-card is-wide">
              <small>Tahsilat Verimi</small>
              <strong>-{fmt(factory.energyCostPerCollect)} {factory.energyMeta.label} | +{fmt(factory.xpPerCollect)} XP</strong>
            </article>
          </div>
          <span className="factory-cost-title">Kurulum kaynak maliyetleri</span>
          <div className="factory-purchase-cost-list">
            {purchaseRequirementRows.map((row) => (
              <article
                key={`${factory.id}-buy-row-${row.key}`}
                className={`factory-purchase-cost-row ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}
              >
                <span className="factory-purchase-cost-main">
                  <img src={row.icon} alt="" aria-hidden="true" />
                  {row.label}
                </span>
                <strong>{fmt(row.required)}</strong>
                <span className="factory-purchase-cost-state">
                  {row.missing > 0 ? 'Eksik' : 'Yeterli'}
                </span>
              </article>
            ))}
          </div>
          {purchaseMissingRows.length ? (
            <span className="factory-cost-title factory-cost-title-missing">
              Toplam eksik: {purchaseMissingRows
                .map((row) => `${row.label} ${fmt(row.missing)}`)
                .join(', ')}
            </span>
          ) : (
            <span className="factory-max-label">Kurulum için tüm maliyetler hazır.</span>
          )}
        </div>
      ) : null}

      {factory.owned && factory.hasLevelCap && factory.maxLevel ? (
        <div className="factory-level-progress-wrap">
          <small className="factory-level-progress-label">Seviye {fmt(factory.level)} / {fmt(factory.maxLevel)}</small>
          <div className="factory-level-progress" role="progressbar" aria-valuenow={factory.level} aria-valuemin={1} aria-valuemax={factory.maxLevel} title={`Seviye ${fmt(factory.level)} / ${fmt(factory.maxLevel)}`}>
            <div className="factory-level-progress-fill" style={{ width: `${Math.min(100, Math.max(0, (factory.level / factory.maxLevel) * 100))}%` }} />
          </div>
        </div>
      ) : null}

      {factory.owned && !factory.isBuilding ? (
        <div className="factory-upgrade-costs">
          {factory.nextUpgrade?.maxReached ? (
            <span className="factory-max-label">Maksimum seviyeye ulaşıldı (200. seviye)</span>
          ) : (
            <>
              <span className="factory-cost-title">
                Sonraki seviye maliyeti ({fmt(factory.nextUpgrade?.nextLevel || (factory.level + 1))}) - Süre: {formatCollectionCountdown((factory.nextUpgrade?.durationMinutes || 0) * 60 * 1000)}
              </span>
              <div className="factory-cost-grid">
                <div className={`factory-cost-chip ${factory.missingUpgradeCash > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                  <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                  <span>Nakit: {fmt(factory.nextUpgradeCostCash)}</span>
                </div>
                {factory.upgradeCostRows.map((row) => (
                  <div key={`${factory.id}-${row.itemId}`} className={`factory-cost-chip ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                    <img src={row.meta.icon} alt="" aria-hidden="true" />
                    <span>{row.meta.label}: {fmt(row.amount)}</span>
                  </div>
                ))}
              </div>
              <span className="factory-cost-title">
                Sonraki tahsilat: +{fmt(factory.nextUpgradeOutputPerCollect || 0)} {factory.outputMeta.label} · -{fmt(factory.nextUpgradeEnergyCostPerCollect || 0)} {factory.energyMeta.label} · +{fmt(factory.nextUpgradeXpPerCollect || 0)} XP
              </span>
              {factory.missingUpgradeCash > 0 ? (
                <span className="factory-cost-title factory-cost-title-missing">
                  Eksik nakit: {fmt(factory.missingUpgradeCash)}
                </span>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="factory-actions">
        {!factory.owned ? (
          factory.isBuilding ? (
            <button
              type="button"
              className="btn btn-secondary factory-action-btn factory-action-btn-wide"
              disabled
            >
              İnşa Sürüyor
            </button>
          ) : (
            <button
              type="button"
              className={`btn factory-buy-btn factory-action-btn factory-action-btn-wide ${canStartAnotherFactoryBuild && factory.canPurchaseNow ? 'btn-gold' : 'btn-secondary'}`.trim()}
              onClick={() => void buyFactoryAction(factory.id)}
              disabled={Boolean(busy) || !canStartAnotherFactoryBuild || !factory.canPurchaseNow}
            >
              {busy === busyBuyKey
                ? 'Kuruluyor...'
                : !canStartAnotherFactoryBuild
                  ? 'Fabrika kurulurken başka fabrika kurulamaz'
                  : factory.canPurchaseNow
                    ? 'İnşa Et'
                    : 'Malzeme Yetersiz'}
            </button>
          )
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary factory-action-btn"
              onClick={() => void collectFactoryAction(factory.id)}
              disabled={Boolean(busy) || !factory.canCollectNow}
            >
              {collectButtonLabel}
            </button>
            <button
              type="button"
              className="btn btn-secondary factory-action-btn"
              onClick={() => setFactoryUpgradeModalId(factory.id)}
              disabled={Boolean(busy) || factory.nextUpgrade?.maxReached || factory.isUpgrading}
            >
              {busy === busyUpgradeKey
                ? 'Başlatılıyor...'
                : factory.isUpgrading
                  ? 'Yükseltiliyor'
                  : blockedByOtherUpgrade
                    ? 'Başka Yükseltme Aktif'
                    : factory.nextUpgrade?.maxReached
                      ? 'Maksimum seviyede'
                      : 'Yükselt'}
            </button>
            {factory.isUpgrading ? (
              <button
                type="button"
                className="btn btn-ghost factory-action-btn factory-action-btn-wide"
                onClick={() => void speedupFactoryUpgradeAction(factory.id)}
                disabled={Boolean(busy) || !canSpeedupNow}
              >
                  {busy === busySpeedupKey
                    ? 'Hızlandırılıyor...'
                    : `%15 Hızlandır (${fmt(factory.speedupDiamondCost)} elmas)`}
              </button>
            ) : null}
          </>
        )}
      </div>
    </article>
  )
}


return (
  <section className="panel-stack factory-screen">
    <article className="card factory-hub-card">
      <div className="factory-head">
        <h3>Fabrikalar</h3>
        <p>
          Sahip olduğun fabrikaları üst alanda anlık süre ile takip et, süre bitince tahsilat yap. Yeni fabrika kurulumlarını aşağıdaki listeden inşa edip başlat.
        </p>
      </div>
      {renderWeeklyEventInlineCard('Fabrika Tahsilat Ekranı')}

      <div className="factory-kpi-grid">
        <article className="factory-kpi">
          <small>Aktif Fabrika</small>
          <strong>{fmt(factoriesOwnedCount)}</strong>
        </article>
        <article className="factory-kpi">
          <small>Hazır Tahsilat</small>
          <strong>{fmt(factoriesReadyCount)}</strong>
        </article>
        <article className="factory-kpi">
          <small>Yükseltme</small>
          <strong>{fmt(factoriesUpgradingCount)}</strong>
        </article>
      </div>

      {buildingFactoryRows.length > 0 ? buildingFactoryRows.map((buildingFactory) => (
        <div key={buildingFactory.id} className="factory-build-banner">
          <div className="factory-build-banner-copy">
            <small>Fabrika İnşaat Ediliyor</small>
            <strong>{buildingFactory.name}</strong>
            <span>{buildingFactoryRows.length >= 2 ? `${buildingFactoryRows.length} fabrika inşaatta. Kurulum bitince Fabrikalarım'a geçer.` : 'Kurulum tamamlanınca otomatik olarak Fabrikalarım alanına geçer.'}</span>
          </div>
          <div className="factory-banner-right">
            <div className="factory-build-countdown">
              <small>Kalan Süre</small>
              <strong>{formatCollectionCountdown(buildingFactory.buildRemainingMs)}</strong>
            </div>
            <button
              type="button"
              className="btn btn-accent factory-build-speedup-btn"
              onClick={() => void speedupFactoryBuildAction(buildingFactory.id)}
              disabled={Boolean(busy) || premiumDiamond < Math.max(0, buildingFactory.buildSpeedupDiamondCost || 0)}
            >
              {busy === `factory-speedup-build:${buildingFactory.id}` ? 'Hızlandırılıyor...' : `%15 Hızlandır (${fmt(buildingFactory.buildSpeedupDiamondCost || 80)} elmas)`}
            </button>
          </div>
        </div>
      )) : null}

      {upgradingFactoryRows.length > 0 ? upgradingFactoryRows.map((upgradingFactory) => (
        <div key={upgradingFactory.id} className="factory-upgrade-banner">
          <div className="factory-build-banner-copy">
            <small>Fabrika Yükseltme Sürüyor</small>
            <strong>{upgradingFactory.name}</strong>
            <span>{upgradingFactoryRows.length >= 2 ? `${upgradingFactoryRows.length} fabrika yükseltmede.` : 'Bu süre bitmeden başka fabrika yükseltmesi başlatılamaz.'}</span>
          </div>
          <div className="factory-banner-right">
            <div className="factory-build-countdown is-upgrade">
              <small>Kalan Süre</small>
              <strong>{formatCollectionCountdown(upgradingFactory.upgradeRemainingMs)}</strong>
            </div>
            <button
              type="button"
              className="btn btn-accent factory-build-speedup-btn"
              onClick={() => void speedupFactoryUpgradeAction(upgradingFactory.id)}
              disabled={Boolean(busy) || premiumDiamond < Math.max(0, upgradingFactory.speedupDiamondCost || 0)}
            >
              {busy === `factory-speedup:${upgradingFactory.id}` ? 'Hızlandırılıyor...' : `%15 Hızlandır (${fmt(upgradingFactory.speedupDiamondCost || 80)} elmas)`}
            </button>
          </div>
        </div>
      )) : null}

      <div className="factory-hub-toolbar">
        <div className="factory-hub-summary">
          <small>Toplu Tahsilat</small>
          <strong>{factoriesReadyCount > 0 ? `${factoryBulkPreview.is2x ? '2x ' : ''}${fmt(factoriesReadyCount)} fabrika hazır` : 'Hazır tahsilat bekleniyor'}</strong>
          <span>
            {factoriesReadyCount > 0
              ? (() => {
                  const parts = Object.entries(factoryBulkPreview.byItem)
                    .map(([itemId, amount]) => {
                      const meta = factoryItemMeta(itemId)
                      return `+${fmt(amount)} ${meta?.label || itemId}`
                    })
                    .filter(Boolean)
                  if (factoryBulkPreview.totalXp > 0) parts.push(`+${fmt(factoryBulkPreview.totalXp)} XP`)
                  const costParts = Object.entries(factoryBulkPreview.energyByItem || {})
                    .filter(([, q]) => q > 0)
                    .map(([eId, amount]) => {
                      const meta = factoryItemMeta(eId)
                      return `-${fmt(amount)} ${meta?.label || eId}`
                    })
                  if (costParts.length) parts.push(`Gider: ${costParts.join(', ')}`)
                  const prefix = factoryBulkPreview.is2x ? '2x tahsilat: ' : 'Tahsilat: '
                  return parts.length ? `${prefix}${parts.join(', ')}. Kasayı topla ile al.` : 'Sayaç bitince toplu tahsilat yapabilirsin.'
                })()
              : 'Sayaç kartlarda anlık akıyor. Süre bitince tek tek veya toplu toplayabilirsin.'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary factory-hub-collect-btn factory-btn-bulk"
          onClick={() => factoriesReadyCount > 0 && openFactoryBulkCollectModal()}
          disabled={Boolean(busy) || factoriesReadyCount <= 0}
        >
          {factoriesReadyCount > 0
            ? (factoryBulkPreview.is2x ? `2x Kasayı topla (${fmt(factoriesReadyCount)})` : `Kasayı topla (${fmt(factoriesReadyCount)})`)
            : `Toplu Tahsilat (0)`}
        </button>
      </div>

      <section className="factory-section">
        <div className="factory-section-head">
          <h4>Fabrikalarım</h4>
          <p>Anlık durum, geri sayım ve tahsilat. Kartlara dokunup tahsilat veya yükseltme yapabilirsin.</p>
        </div>
        {ownedFactoryRows.length > 0 ? (
          <div className="factory-summary-stats">
            {factoriesReadyCount > 0 ? (
              <>
                <span className="factory-summary-label">Hazır tahsilat:</span>
                <span className="factory-summary-value">
                  {fmt(factoriesReadyCount)} fabrika
                  {Object.entries(factoryBulkPreview.byItem || {}).filter(([, q]) => q > 0).length > 0 && (
                    <> · {Object.entries(factoryBulkPreview.byItem || {}).filter(([, q]) => q > 0).map(([itemId, amount]) => {
                      const meta = factoryItemMeta(itemId)
                      return `+${fmt(amount)} ${meta?.label || itemId}`
                    }).join(', ')}</>
                  )}
                  {Object.entries(factoryBulkPreview.energyByItem || {}).filter(([, q]) => q > 0).length > 0 && (
                    <> · Gider: {Object.entries(factoryBulkPreview.energyByItem || {}).filter(([, q]) => q > 0).map(([eId, amount]) => {
                      const meta = factoryItemMeta(eId)
                      return `-${fmt(amount)} ${meta?.label || eId}`
                    }).join(', ')}</>
                  )}
                  {factoryBulkPreview.totalXp > 0 && <> · +{fmt(factoryBulkPreview.totalXp)} XP</>}
                </span>
              </>
            ) : (
              <>
                <span className="factory-summary-label">Aktif fabrika:</span>
                <span className="factory-summary-value">{fmt(factoriesOwnedCount)} fabrika</span>
              </>
            )}
          </div>
        ) : null}
        <div className="factory-grid factory-grid-shop factory-grid-owned">
          {ownedFactoryRows.length ? ownedFactoryRows.map((factory) => {
            const busyCollectKey = `factory-collect:${factory.id}`
            const busyUpgradeKey = `factory-upgrade:${factory.id}`
            const blockedByOtherUpgrade = !factory.isUpgrading && !canStartAnotherFactoryUpgrade
            const upgradeButtonLabel = busy === busyUpgradeKey
              ? 'Başlıyor...'
              : factory.isUpgrading
                ? 'Yükseliyor'
                : blockedByOtherUpgrade
                  ? 'Yuva Dolu'
                  : factory.nextUpgrade?.maxReached
                    ? 'Maksimum'
                    : 'Yükselt'
            const upgradeButtonTitle = factory.isUpgrading
              ? 'Bu fabrikanın yükseltmesi devam ediyor.'
              : blockedByOtherUpgrade
                ? 'Aynı anda yalnızca bir fabrika yükseltilebilir.'
                : factory.nextUpgrade?.maxReached
                  ? 'Bu fabrika maksimum seviyeye ulaştı.'
                  : 'Fabrikayı bir üst seviyeye yükselt.'
            const hint = factory.isUpgrading
              ? `Yükseltiliyor · ${formatCollectionCountdown(factory.upgradeRemainingMs)}`
              : factory.canCollectNow
                ? `Seviye ${fmt(factory.level)} · Tahsilat hazır`
                : factory.collectRemainingMs > 0
                  ? `Seviye ${fmt(factory.level)} · Kalan ${formatCollectionCountdown(factory.collectRemainingMs)}`
                  : factory.collectEnergyMissing > 0
                    ? `Seviye ${fmt(factory.level)} · ${factory.energyMeta?.label || 'Enerji'} eksik`
                    : `Seviye ${fmt(factory.level)}`
            return (
              <article key={factory.id} className="factory-card is-owned is-shop-card is-shop-summary-card" data-factory-id={factory.id}>
                <div className="factory-shop-card-open-wrap">
                  <div className="factory-shop-hero-wrap">
                    <div className="factory-shop-hero" data-broken="0">
                      <img
                        src={resolveFactoryShopImage(factory)}
                        alt={factory.name}
                        loading="lazy"
                        onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.setAttribute('data-broken', '1') }}
                      />
                      <span className="factory-shop-hero-fallback">FAB</span>
                    </div>
                    <span className="factory-level-badge factory-level-badge-owned" title={`Seviye ${fmt(factory.level)}`}>
                      ★{fmt(factory.level)}
                    </span>
                  </div>
                  <strong className="factory-shop-card-name">{factory.name}</strong>
                  <small className="factory-shop-card-hint">{hint}</small>
                </div>
                <div className="factory-owned-actions">
                  <button
                    type="button"
                    className="btn btn-primary factory-action-btn factory-buy-btn factory-btn-collect"
                    onClick={() => factory.canCollectNow && openFactoryCollectModal(factory.id)}
                    disabled={Boolean(busy) || !factory.canCollectNow}
                  >
                    {busy === busyCollectKey ? 'Alınıyor...' : factory.canCollectNow ? 'Tahsil Et' : 'Bekle'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary factory-action-btn factory-buy-btn factory-btn-upgrade"
                    onClick={() => !factory.isUpgrading && !blockedByOtherUpgrade && !factory.nextUpgrade?.maxReached && setFactoryUpgradeModalId(factory.id)}
                    title={upgradeButtonTitle}
                    disabled={Boolean(busy) || factory.isUpgrading || blockedByOtherUpgrade || factory.nextUpgrade?.maxReached}
                  >
                    {upgradeButtonLabel}
                  </button>
                </div>
              </article>
            )
          }) : (
            <p className="empty">Henüz aktif bir fabrika yok. Aşağıdan satın alıp kurabilirsin.</p>
          )}
        </div>
      </section>

      {lockedFactoryRows.length > 0 ? (
        <section className="factory-section">
          <div className="factory-section-head">
            <h4>Fabrika Kur</h4>
            <p>{canStartAnotherFactoryBuild ? 'Kartlara dokunup kurulum detayını açabilirsin' : 'Fabrika kurulurken başka fabrika kurulamaz'}</p>
          </div>
          <div className="factory-grid factory-grid-shop">
            {lockedFactoryRows.map((factory) => {
              const rows = factoryPurchaseRowsFromFactory(factory)
              const missing = rows.filter((r) => r.missing > 0)
              const hint = !canStartAnotherFactoryBuild
                ? 'İnşaat devam ediyor'
                : missing.length
                  ? `${missing.length} kaynak eksik`
                  : 'İnşa etmeye hazır'
              return (
                <article key={factory.id} className="factory-card is-shop-card is-shop-summary-card" data-factory-id={factory.id}>
                  <button
                    type="button"
                    className="factory-shop-card-open"
                    onClick={() => openFactoryPurchaseModal(factory.id)}
                    disabled={Boolean(busy)}
                  >
                    <div className="factory-shop-hero" data-broken="0">
                      <img
                        src={resolveFactoryShopImage(factory)}
                        alt={factory.name}
                        loading="lazy"
                        onError={(e) => {
                          const el = e.currentTarget.parentElement
                          if (el) el.setAttribute('data-broken', '1')
                        }}
                      />
                      <span className="factory-shop-hero-fallback">FAB</span>
                    </div>
                    <strong className="factory-shop-card-name">{factory.name}</strong>
                    <small className="factory-shop-card-hint">{hint}</small>
                  </button>
                  <button
                    type="button"
                    className={`btn factory-buy-btn factory-action-btn factory-action-btn-wide ${factory.canPurchaseNow && canStartAnotherFactoryBuild ? 'btn-success' : 'btn-secondary'}`.trim()}
                    onClick={() => openFactoryPurchaseModal(factory.id)}
                    disabled={Boolean(busy)}
                  >
                    {busy === `factory-buy:${factory.id}` ? 'İnşaat Ediliyor...' : 'İnşaat Et'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
      <div className="factory-scroll-spacer" aria-hidden="true" />

      {factoryPurchaseModal && createPortal(
        <section
          ref={factoryPurchaseOverlayRef}
          className="factory-purchase-overlay"
          onClick={closeFactoryPurchaseModal}
          aria-modal="true"
          role="dialog"
        >
          <article
            className="factory-purchase-modal"
            aria-labelledby="factory-purchase-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="factory-purchase-modal-title" className="factory-purchase-modal-title">{factoryPurchaseModal.name}</h2>
            <p className="factory-purchase-modal-subtitle">Kurulum maliyetini inceleyip fabrikanın inşaatını başlatabilirsin.</p>

            <div className="factory-purchase-modal-preview">
              <span className="factory-purchase-modal-thumb" data-broken="0">
                <img src={resolveFactoryShopImage(factoryPurchaseModal)} alt="" loading="lazy" onError={(e) => e.currentTarget.parentElement?.setAttribute('data-broken', '1')} />
                <span className="factory-purchase-modal-thumb-fallback">FAB</span>
              </span>
              <div className="factory-purchase-modal-preview-copy">
                <p>Kurulum: {fmt(factoryPurchaseModal.purchaseCostCash)} nakit</p>
                <p>İnşaat: {formatBuildDuration(factoryPurchaseModal.buildDurationMinutes * 60 * 1000)} · Tahsilat: {fmt(factoryPurchaseModal.collectIntervalMinutes)} dk</p>
              </div>
            </div>

            <div className="factory-purchase-modal-stats">
              <div className="factory-purchase-stat is-income">
                <img src={factoryPurchaseModal.outputMeta.icon} alt="" aria-hidden="true" />
                <span>+{fmt(factoryPurchaseModal.outputPerCollect)} {factoryPurchaseModal.outputMeta.label}</span>
              </div>
              <div className="factory-purchase-stat is-energy">
                <img src={factoryPurchaseModal.energyMeta.icon} alt="" aria-hidden="true" />
                <span>-{fmt(factoryPurchaseModal.energyCostPerCollect)} {factoryPurchaseModal.energyMeta.label}</span>
              </div>
              <div className="factory-purchase-stat is-xp">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                <span>+{fmt(factoryPurchaseModal.xpPerCollect)} XP</span>
              </div>
            </div>

            <div className="factory-purchase-modal-costs">
              <span className="factory-cost-title">Kurulum kaynak maliyetleri</span>
              <div className="factory-purchase-cost-list">
                {factoryPurchaseModalRows.map((row) => (
                  <article key={`${factoryPurchaseModal.id}-row-${row.key}`} className={`factory-purchase-cost-row ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                    <span className="factory-purchase-cost-main"><img src={row.icon} alt="" aria-hidden="true" />{row.label}</span>
                    <strong>{fmt(row.required)}</strong>
                    <span className="factory-purchase-cost-state">{row.missing > 0 ? 'Yetersiz' : 'Yeterli'}</span>
                  </article>
                ))}
              </div>
              {factoryPurchaseModalMissingRows.length ? (
                <span className="factory-cost-title factory-cost-title-missing">
                  Toplam eksik: {factoryPurchaseModalMissingRows.map((row) => `${row.label} ${fmt(row.missing)}`).join(', ')}
                </span>
              ) : (
                <span className="factory-max-label">Kurulum için tüm maliyetler hazır.</span>
              )}
            </div>

            <div className="factory-purchase-modal-actions">
              <button
                type="button"
                className={`btn factory-buy-btn ${factoryPurchaseModalCanBuyNow ? 'btn-success' : 'btn-secondary'}`.trim()}
                onClick={() => void buyFactoryAction(factoryPurchaseModal.id)}
                disabled={Boolean(busy) || !factoryPurchaseModalCanBuyNow}
              >
                {busy === factoryPurchaseBusyKey ? 'İnşaat Ediliyor...' : !canStartAnotherFactoryBuild ? 'Fabrika kurulurken başka fabrika kurulamaz' : factoryPurchaseModal.canPurchaseNow ? 'İnşaat Et' : 'Maliyet Yetersiz'}
              </button>
              <button type="button" className="btn btn-danger" onClick={closeFactoryPurchaseModal}>Kapat</button>
            </div>
          </article>
        </section>,
        document.body
      )}

      {factoryBulkModalOpen && createPortal(
        <section className="warehouse-overlay" onClick={closeFactoryBulkCollectModal}>
          <article className="warehouse-modal fleet-modal fleet-bulk-modal factory-bulk-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Fabrika Toplu Tahsilat</h3>
            <p className="fleet-bulk-intro">Tahsilat süresi dolan fabrikalardan üretim kaynağı ve XP toplayabilirsin.</p>
            <p className="fleet-bulk-note">Bu ekranda toplanacak kaynaklar, deneyim ve enerji maliyeti görünür.</p>
            {factoriesEnergyBlockedCount > 0 ? (
              <p className="factory-modal-note">
                Enerji yetersizliği nedeniyle {fmt(factoriesEnergyBlockedCount)} fabrikada tahsilat beklemede.
              </p>
            ) : null}
            {factoryBulkModalError ? (
              <p className="factory-modal-error" role="alert">{factoryBulkModalError}</p>
            ) : null}
            <section className="fleet-bulk-kpis" aria-label="Toplu tahsilat özeti">
              <article className="fleet-bulk-kpi">
                <span>Hazır Fabrika</span>
                <strong>{fmt(factoriesReadyCount)}</strong>
              </article>
              <article className="fleet-bulk-kpi">
                <span>Tahsilat Aralığı</span>
                <strong>30 dk</strong>
              </article>
            </section>
            <div className="fleet-modal-actions fleet-modal-actions-bulk">
              <button
                className="btn btn-success btn-collect-main factory-modal-primary-btn"
                onClick={() => void confirmFactoryBulkCollectFromModal()}
                disabled={Boolean(busy) || factoriesReadyCount <= 0}
              >
                <span className="btn-icon">
                  <img src={premiumActive && factoryBulkPreview.is2x ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.webp'} alt="" aria-hidden="true" />
                </span>
                <span className="btn-label">
                  {busy === 'factory-collect-bulk'
                    ? (factoryBulkPreview.is2x ? '2x toplanıyor...' : 'Toplanıyor...')
                    : factoriesReadyCount > 0
                      ? (factoryBulkPreview.is2x ? `2x Kasayı topla (${fmt(factoriesReadyCount)})` : `Kasayı topla (${fmt(factoriesReadyCount)})`)
                      : 'Tahsilat Hazır Değil'}
                </span>
              </button>
            </div>
            <article className="fleet-bulk-summary fleet-accountant-summary">
              {Object.entries(factoryBulkPreview.byItem || {}).map(([itemId, amount]) => {
                const meta = factoryItemMeta(itemId)
                return amount > 0 ? (
                  <p key={itemId} className="fleet-summary-line positive">
                    <img src={meta?.icon || '/home/icons/depot/cash.webp'} alt="" aria-hidden="true" />
                    +{fmt(amount)} {meta?.label || itemId}
                  </p>
                ) : null
              })}
              <p className="fleet-summary-line positive">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                + {fmt(factoryBulkPreview.totalXp)} Deneyim
              </p>
              <hr />
              {Object.entries(factoryBulkPreview.energyByItem || {}).map(([eId, amount]) => {
                const meta = factoryItemMeta(eId)
                return amount > 0 ? (
                  <p key={eId} className="fleet-summary-line negative">
                    <img src={meta?.icon || '/home/icons/depot/oil.webp'} alt="" aria-hidden="true" />
                    - {fmt(amount)} {meta?.label || eId}
                  </p>
                ) : null
              })}
            </article>
            <button type="button" className="btn btn-danger fleet-modal-close factory-modal-close-btn" onClick={closeFactoryBulkCollectModal}>Kapat</button>
          </article>
        </section>,
        document.body
      )}

      {factoryCollectModal && createPortal(
        <section className="warehouse-overlay" onClick={closeFactoryCollectModal}>
          <article className="warehouse-modal fleet-modal fleet-accountant-modal factory-collect-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="fleet-accountant-title">Muhasebeci</h3>
            <p className="fleet-accountant-subtitle">{factoryCollectModal.name} için tahsilat özeti hazır.</p>
            {factoryCollectModalBlockedReason ? (
              <p className="factory-modal-note">{factoryCollectModalBlockedReason}</p>
            ) : null}
            {factoryCollectModalError ? (
              <p className="factory-modal-error" role="alert">{factoryCollectModalError}</p>
            ) : null}
            <div className="fleet-accountant-cta-card">
              <button
                className="btn btn-success full btn-collect-inline factory-modal-primary-btn"
                onClick={() => void confirmFactoryCollectFromModal()}
                disabled={Boolean(busy) || !factoryCollectModal.canCollectNow}
              >
                <span className="btn-icon">
                  <img src={premiumActive && factoryBulkPreview.is2x ? '/home/icons/depot/diamond.webp' : factoryCollectModal.outputMeta?.icon || '/home/icons/depot/cash.webp'} alt="" aria-hidden="true" />
                </span>
                <span className="btn-label">
                  {busy === factoryCollectModalBusyKey
                    ? 'Kasaya aktarılıyor...'
                    : !factoryCollectModal.canCollectNow
                      ? 'Tahsilat Hazır Değil'
                      : `Tahsilatı Topla (+${fmt(factoryCollectModal.outputPerCollect || 0)} ${factoryCollectModal.outputMeta?.label || ''})`}
                </span>
              </button>
            </div>
            <article className="fleet-bulk-summary fleet-accountant-summary">
              <p className="fleet-accountant-summary-title">Tahsilat özeti</p>
              <p className="fleet-summary-line positive">
                <img src={factoryCollectModal.outputMeta?.icon} alt="" aria-hidden="true" />
                +{fmt(premiumActive && premiumMultiplier > 1 ? Math.round((factoryCollectModal.outputPerCollect || 0) * premiumMultiplier) : factoryCollectModal.outputPerCollect || 0)} {factoryCollectModal.outputMeta?.label}
              </p>
              <p className="fleet-summary-line positive">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                + {fmt(factoryCollectModal.xpPerCollect || 0)} XP
              </p>
              <hr />
              <p className="fleet-summary-line negative">
                <img src={factoryCollectModal.energyMeta?.icon} alt="" aria-hidden="true" />
                - {fmt(factoryCollectModal.energyCostPerCollect || 0)} {factoryCollectModal.energyMeta?.label}
              </p>
              <small className="fleet-accountant-footnote">Depodaki {factoryCollectModal.energyMeta?.label}: {fmt(inventoryById[factoryCollectModal.energyItemId] || 0)}</small>
            </article>
            <div className="fleet-accountant-footer">
              <button type="button" className="btn btn-danger fleet-modal-close fleet-accountant-close factory-modal-close-btn" onClick={closeFactoryCollectModal}>Kapat</button>
            </div>
          </article>
        </section>,
        document.body
      )}

      {factoryUpgradeModal && createPortal(
        <section className="warehouse-overlay" onClick={() => setFactoryUpgradeModalId('')}>
          <article className="warehouse-modal fleet-modal factory-upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Fabrika Yükseltme</h3>
            <p>{factoryUpgradeModal.name} · Seviye {fmt(factoryUpgradeModal.level)} → {fmt(factoryUpgradeModal.nextUpgrade?.nextLevel || factoryUpgradeModal.level + 1)}</p>
            <div className="factory-upgrade-modal-preview">
              <h4>Yükseltme tamamlandığında</h4>
              <p className="fleet-summary-line positive">
                <img src={factoryUpgradeModal.outputMeta?.icon} alt="" aria-hidden="true" />
                Üretim: {fmt(factoryUpgradeModal.outputPerCollect || 0)} → {fmt(factoryUpgradeModal.nextUpgradeOutputPerCollect > 0 ? factoryUpgradeModal.nextUpgradeOutputPerCollect : Math.round((factoryUpgradeModal.outputPerCollect || 0) * 2))} {factoryUpgradeModal.outputMeta?.label} / tahsilat
              </p>
              <p className="fleet-summary-line negative">
                <img src={factoryUpgradeModal.energyMeta?.icon} alt="" aria-hidden="true" />
                Enerji gideri: {fmt(factoryUpgradeModal.energyCostPerCollect || 0)} → {fmt(factoryUpgradeModal.nextUpgradeEnergyCostPerCollect > 0 ? factoryUpgradeModal.nextUpgradeEnergyCostPerCollect : Math.round((factoryUpgradeModal.energyCostPerCollect || 0) * 2))} {factoryUpgradeModal.energyMeta?.label} / tahsilat
              </p>
              <p className="fleet-summary-line positive">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                XP: {fmt(factoryUpgradeModal.xpPerCollect || 0)} → {fmt(factoryUpgradeModal.nextUpgradeXpPerCollect > 0 ? factoryUpgradeModal.nextUpgradeXpPerCollect : Math.round((factoryUpgradeModal.xpPerCollect || 0) * 2))} XP / tahsilat
              </p>
            </div>
            <div className="factory-upgrade-modal-costs">
              <h4>Gerekli maliyet</h4>
              <div className="factory-cost-grid">
                <div className={`factory-cost-chip ${factoryUpgradeModal.missingUpgradeCash > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                  <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                  <span>Nakit: {fmt(factoryUpgradeModal.nextUpgradeCostCash || 0)}</span>
                  <em className={`factory-cost-chip-status ${factoryUpgradeModal.missingUpgradeCash > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                    {factoryUpgradeModal.missingUpgradeCash > 0 ? 'Yetersiz' : 'Yeterli'}
                  </em>
                </div>
                {(factoryUpgradeModal.upgradeCostRows || []).map((row) => (
                  <div key={row.itemId} className={`factory-cost-chip ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                    <img src={row.meta?.icon} alt="" aria-hidden="true" />
                    <span>{row.meta?.label}: {fmt(row.amount)}</span>
                    <em className={`factory-cost-chip-status ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                      {row.missing > 0 ? 'Yetersiz' : 'Yeterli'}
                    </em>
                  </div>
                ))}
              </div>
              <p className="fleet-gallery-note-hint">Süre: {formatBuildDuration((factoryUpgradeModal.nextUpgrade?.durationMinutes || 0) * 60 * 1000)}</p>
              {factoryUpgradeModalHasMissingCost ? (
                <p className="factory-upgrade-note is-missing">
                  Eksik kaynak: {factoryUpgradeModalMissingRows.map((row) => `${row.label} ${fmt(row.missing)}`).join(' • ')}
                </p>
              ) : (
                <p className="factory-upgrade-note is-ready">Yükseltme için tüm maliyetler hazır.</p>
              )}
              {factoryUpgradeModalBlockedBySlot ? (
                <p className="fleet-gallery-note-hint">
                  Yükseltme yuvası dolu. Aktif inşaat veya yükseltme tamamlandığında yeniden deneyebilirsin.
                </p>
              ) : null}
            </div>
            <div className="fleet-modal-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={() => void confirmFactoryUpgradeFromModal()}
                disabled={
                  Boolean(busy) ||
                  factoryUpgradeModalBlockedBySlot ||
                  factoryUpgradeModal.nextUpgrade?.maxReached
                }
              >
                {busy === `factory-upgrade:${factoryUpgradeModal.id}`
                  ? 'Başlatılıyor...'
                  : factoryUpgradeModalBlockedBySlot
                    ? 'Yuva dolu'
                    : factoryUpgradeModal.nextUpgrade?.maxReached
                      ? 'Maksimum seviyede'
                      : 'Yükseltmeyi Başlat'}
              </button>
              <button type="button" className="btn btn-danger fleet-modal-close" onClick={() => setFactoryUpgradeModalId('')}>Kapat</button>
            </div>
          </article>
        </section>,
        document.body
      )}
    </article>
  </section>
)
}
