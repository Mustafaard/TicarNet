import {
  FOREX_CHART_RANGE_OPTIONS,
  FOREX_HEADER_ICON_FALLBACK_SRC,
  FOREX_HEADER_ICON_PRIMARY_SRC,
  FOREX_TRADE_MAX_QUANTITY,
  FOREX_TRADE_MAX_QUANTITY_DIGITS,
  FOREX_TRADE_MAX_TOTAL_QUANTITY,
  FOREX_TRADE_SIDE_OPTIONS,
} from '../constants.js'
import {
  clamp,
  fmt,
  fmtFxRate,
  fmtPctSigned,
  fmtTry,
  fmtTrySigned,
  num,
} from '../utils.js'
import {
  ForexCountdownText,
} from '../ui-components.jsx'

export function renderForexView(hp) {
  const {
    busy,
    forex,
    forexChartData,
    forexChartInteractionEnabled,
    forexChartRange,
    forexChartRangeId,
    forexDayChangePercent,
    forexHolding,
    forexHoldingAverageBuyRate,
    forexHoldingQuantity,
    forexHoldingRemainingCapacity,
    forexHoldingUnrealizedPnlPercent,
    forexHoldingUnrealizedPnlTry,
    forexHoveredCandle,
    forexIsMobileView,
    forexLastUpdateLabel,
    forexMarket,
    forexNextUpdateLabel,
    forexNextUpdateMs,
    forexSpreadTry,
    forexTradeExceedsTotalHoldingCap,
    forexTradeFeePreview,
    forexTradeForm,
    forexTradeInsufficientHoldings,
    forexTradeInsufficientWallet,
    forexTradeMaxQuantity,
    forexTradeQuantity,
    forexTradeQuantityTooHigh,
    forexTradeRate,
    forexTradeRateValid,
    forexTradeSide,
    forexTradeSubmitBlocked,
    forexTradeTotalPreview,
    forexTrendDirection,
    forexWalletTry,
    formatForexChartAxisLabel,
    handleForexCountdownElapsed,
    openTab,
    queueForexTouchHoverByClientX,
    runForexTradeAction,
    setForexChartHoverIndex,
    setForexChartRangeId,
    setForexHoverByClientX,
    setForexTradeForm,
  } = hp

return (
  <section className="panel-stack home-sections forex-screen">
    <article className="card forex-panel forex-panel-solo">
      <div className="forex-solo-head">
        <div className="forex-solo-title-wrap">
          <img
            src={FOREX_HEADER_ICON_PRIMARY_SRC}
            alt=""
            className="forex-solo-icon"
            onError={(event) => {
              const node = event.currentTarget
              if (node.dataset.fallbackApplied === '1') {
                node.style.display = 'none'
                return
              }
              node.dataset.fallbackApplied = '1'
              node.src = FOREX_HEADER_ICON_FALLBACK_SRC
            }}
          />
          <div>
            <h3 className="forex-solo-title">TicarNet Döviz Kuru</h3>
            <p className="forex-solo-subtitle">TCT oyun dövizini alıp bozdurabilirsiniz.</p>
          </div>
        </div>
        <div className="forex-solo-head-actions">
          <span className={`forex-solo-trend-pill ${forexTrendDirection === 'up' ? 'is-up' : 'is-down'}`.trim()}>
            {forexTrendDirection === 'up' ? 'Yükseliş' : 'Düşüş'} {fmtPctSigned(forexDayChangePercent)}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home', { tab: 'home' })}>
            Şehir
          </button>
        </div>
      </div>

      <div className="forex-solo-card forex-solo-metrics-grid">
        <article className="forex-solo-metric is-rate">
          <small>1 TCT Değeri</small>
          <strong>{fmtTry(forexMarket?.rate || 0)}</strong>
          <span>Alış kuru</span>
        </article>
        <article className="forex-solo-metric is-sell">
          <small>Bozdurma Değeri</small>
          <strong>{fmtTry(forexMarket?.sellRate || 0)}</strong>
          <span>Makas: {fmtTry(forexSpreadTry)}</span>
        </article>
        <article className="forex-solo-metric is-balance">
          <small>TCT Bakiyeniz</small>
          <strong>{fmt(forexHoldingQuantity)} Adet</strong>
          <span>Maks kapasite: {fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} adet</span>
        </article>
        <article className={`forex-solo-metric ${forexTrendDirection === 'up' ? 'is-up' : 'is-down'}`}>
          <small>Günlük Değişim</small>
          <strong>{fmtPctSigned(forexDayChangePercent)}</strong>
          <span>24 saat trend</span>
        </article>
      </div>

      <section className="forex-chart-card">
        <div className="forex-chart-head">
          <h4 className="forex-chart-title">Grafik</h4>
          <div className="forex-chart-head-meta">
            <div className="forex-chart-range-group" role="tablist" aria-label="Grafik aralığı">
              {FOREX_CHART_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`forex-chart-range-btn ${forexChartRangeId === option.id ? 'is-active' : ''}`.trim()}
                  onClick={() => setForexChartRangeId(option.id)}
                  aria-pressed={forexChartRangeId === option.id}
                  disabled={Boolean(busy)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="forex-chart-updated">
              Son güncelleme: {forexLastUpdateLabel}
            </span>
            <span className="forex-chart-updated">
              Sonraki güncelleme: {forexNextUpdateLabel}
            </span>
            <span className="forex-chart-window-pill">
              Canlı geri sayım: <ForexCountdownText nextUpdateMs={forexNextUpdateMs} onElapsed={handleForexCountdownElapsed} />
            </span>
          </div>
        </div>
        {forexChartData ? (
          <>
            <div className="forex-chart-wrap">
              <div className="forex-chart-legend" aria-hidden>
                <span className="forex-chart-legend-swatch" />
                <span className="forex-chart-legend-label">Döviz Değeri</span>
              </div>
              <svg
                className="forex-chart-svg"
                viewBox={`0 0 ${forexChartData.width} ${forexChartData.height}`}
                role="img"
                aria-label="TCT döviz değeri çizgi grafiği"
              >
                <defs>
                  <linearGradient id="forex-area-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(56, 194, 255, 0.30)" />
                    <stop offset="100%" stopColor="rgba(56, 194, 255, 0.02)" />
                  </linearGradient>
                  <linearGradient id="forex-line-stroke-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2ec4ff" />
                    <stop offset="100%" stopColor="#50d4ff" />
                  </linearGradient>
                  <radialGradient id="forex-live-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(66, 195, 255, 0.8)" />
                    <stop offset="100%" stopColor="rgba(66, 195, 255, 0)" />
                  </radialGradient>
                </defs>
                {forexChartData.yTicks.map((tick, index) => (
                  <line
                    key={`y-${index}`}
                    x1={forexChartData.padLeft}
                    y1={tick.y}
                    x2={forexChartData.width - forexChartData.padRight}
                    y2={tick.y}
                    className="forex-grid-line"
                  />
                ))}
                {forexChartData.xTicks.map((tick, index) => (
                  <line
                    key={`x-${index}`}
                    x1={tick.x}
                    y1={forexChartData.padTop}
                    x2={tick.x}
                    y2={forexChartData.chartFloorY}
                    className="forex-grid-line"
                  />
                ))}
                {forexChartData.smoothAreaPath ? (
                  <path d={forexChartData.smoothAreaPath} className="forex-area-fill" />
                ) : null}
                {forexChartData.smoothLinePath ? (
                  <path d={forexChartData.smoothLinePath} className="forex-line" />
                ) : null}
                {forexChartData.points.map((point, index) => (
                  <circle key={`pt-${index}`} cx={point.x} cy={point.y} r="2.6" className="forex-point" />
                ))}
                {forexChartData.minPoint ? (
                  <circle cx={forexChartData.minPoint.x} cy={forexChartData.minPoint.y} r="3.4" className="forex-min-point" />
                ) : null}
                {forexChartData.maxPoint ? (
                  <circle cx={forexChartData.maxPoint.x} cy={forexChartData.maxPoint.y} r="3.4" className="forex-max-point" />
                ) : null}
                {forexChartData.latestPoint ? (
                  <>
                    <line
                      x1={forexChartData.padLeft}
                      y1={forexChartData.latestPriceLineY}
                      x2={forexChartData.width - forexChartData.padRight}
                      y2={forexChartData.latestPriceLineY}
                      className="forex-live-line"
                    />
                    <circle cx={forexChartData.latestPoint.x} cy={forexChartData.latestPoint.y} r="12" className="forex-live-point-glow" />
                    <circle cx={forexChartData.latestPoint.x} cy={forexChartData.latestPoint.y} r="4.2" className="forex-live-point" />
                    <rect
                      x={forexChartData.latestLabelX}
                      y={forexChartData.latestLabelY}
                      width={forexChartData.latestLabelWidth}
                      height={forexChartData.latestLabelHeight}
                      rx="6"
                      className="forex-live-badge"
                    />
                    <text
                      x={forexChartData.latestLabelX + (forexChartData.latestLabelWidth / 2)}
                      y={forexChartData.latestLabelY + (forexIsMobileView ? 18 : 21)}
                      className="forex-live-badge-text"
                      textAnchor="middle"
                    >
                      {fmtFxRate(forexChartData.summary.currentRate)}
                    </text>
                  </>
                ) : null}
                {forexChartInteractionEnabled && forexHoveredCandle ? (
                  <>
                    <line
                      x1={forexHoveredCandle.x}
                      y1={forexChartData.padTop}
                      x2={forexHoveredCandle.x}
                      y2={forexChartData.chartFloorY}
                      className="forex-hover-line"
                    />
                    {(() => {
                      const tooltipWidth = forexIsMobileView ? 160 : 188
                      const tooltipHeight = forexIsMobileView ? 58 : 66
                      const tooltipX = clamp(
                        forexHoveredCandle.x + 12,
                        forexChartData.padLeft + 6,
                        forexChartData.width - forexChartData.padRight - tooltipWidth - 6,
                      )
                      const tooltipY = clamp(
                        forexHoveredCandle.y - tooltipHeight - 8,
                        forexChartData.padTop + 4,
                        forexChartData.chartFloorY - tooltipHeight - 4,
                      )
                      const changeSigned = `${forexHoveredCandle.changePercent >= 0 ? '+' : ''}${forexHoveredCandle.changePercent.toFixed(2)}%`
                      return (
                        <>
                          <rect
                            x={tooltipX}
                            y={tooltipY}
                            width={tooltipWidth}
                            height={tooltipHeight}
                            rx="8"
                            className="forex-hover-tooltip"
                          />
                          <text x={tooltipX + 10} y={tooltipY + 20} className="forex-hover-tooltip-title">
                            {formatForexChartAxisLabel(
                              forexHoveredCandle.at,
                              Math.max(60, Math.trunc(num(forexChartRange?.seconds || 60))),
                            )}
                          </text>
                          <text x={tooltipX + 10} y={tooltipY + 38} className="forex-hover-tooltip-line">
                            {forexIsMobileView
                              ? `Değer: ${fmtFxRate(forexHoveredCandle.rate)} | ${changeSigned}`
                              : `Değer: ${fmtFxRate(forexHoveredCandle.rate)} • Değişim: ${changeSigned}`}
                          </text>
                        </>
                      )
                    })()}
                  </>
                ) : null}
                <rect
                  x={forexChartData.padLeft}
                  y={forexChartData.padTop}
                  width={forexChartData.width - (forexChartData.padLeft + forexChartData.padRight)}
                  height={forexChartData.chartFloorY - forexChartData.padTop}
                  className="forex-hit-area"
                  onMouseMove={(!forexIsMobileView && forexChartInteractionEnabled) ? (event) => setForexHoverByClientX(event.clientX, event.currentTarget) : undefined}
                  onMouseLeave={(!forexIsMobileView && forexChartInteractionEnabled) ? () => setForexChartHoverIndex(-1) : undefined}
                  onTouchStart={(forexIsMobileView && forexChartInteractionEnabled) ? ((event) => {
                    const touch = event.touches?.[0]
                    if (!touch) return
                    queueForexTouchHoverByClientX(touch.clientX, event.currentTarget)
                  }) : undefined}
                  onTouchMove={(forexIsMobileView && forexChartInteractionEnabled) ? ((event) => {
                    const touch = event.touches?.[0]
                    if (!touch) return
                    queueForexTouchHoverByClientX(touch.clientX, event.currentTarget)
                  }) : undefined}
                  onTouchEnd={undefined}
                  onTouchCancel={undefined}
                />
                {forexChartData.yTicks.map((tick, index) => (
                  <text
                    key={`yl-${index}`}
                    x={forexChartData.padLeft - (forexIsMobileView ? 8 : 12)}
                    y={tick.y + 5}
                    className="forex-axis-text forex-axis-text-y"
                    textAnchor="end"
                  >
                    {forexIsMobileView ? fmt(tick.rate) : fmtFxRate(tick.rate)}
                  </text>
                ))}
                {forexChartData.xTicks.map((tick, index) => (
                  <text
                    key={`xl-${index}`}
                    x={tick.x}
                    y={forexChartData.height - (forexIsMobileView ? 8 : 14)}
                    className="forex-axis-text forex-axis-text-x"
                    textAnchor={tick.anchor || 'middle'}
                    transform={`rotate(${forexIsMobileView ? -30 : -42} ${tick.x} ${forexChartData.height - (forexIsMobileView ? 8 : 14)})`}
                  >
                    {tick.label}
                  </text>
                ))}
              </svg>
            </div>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Grafik hazırlanıyor...</p>
        )}
      </section>

      <section className="forex-trade-minimal">
        <input
          id="forex-quantity-input"
          className="qty-input"
          inputMode="decimal"
          aria-label="Adet miktarı girin"
          placeholder="Adet miktarı girin"
          value={forexTradeForm.quantity}
          onChange={(event) => setForexTradeForm((prev) => ({
            ...prev,
            quantity: event.target.value.replace(/[^\d]/g, '').slice(0, FOREX_TRADE_MAX_QUANTITY_DIGITS),
          }))}
        />

        <div className="forex-qty-quick-row">
          <button
            type="button"
            className="forex-qty-quick-btn"
            onClick={() => setForexTradeForm((prev) => ({ ...prev, quantity: '1' }))}
            disabled={Boolean(busy)}
          >
            Min 1
          </button>
          <button
            type="button"
            className="forex-qty-quick-btn"
            onClick={() => setForexTradeForm((prev) => ({
              ...prev,
              quantity: forexTradeMaxQuantity > 0 ? String(forexTradeMaxQuantity) : '',
            }))}
            disabled={Boolean(busy) || forexTradeMaxQuantity < 1}
          >
            Maks
          </button>
        </div>

        <label className="forex-form-label" id="forex-trade-side-label">İşlem Seçin</label>
        <div className="forex-trade-side-grid" role="radiogroup" aria-labelledby="forex-trade-side-label">
          {FOREX_TRADE_SIDE_OPTIONS.map((option) => {
            const active = forexTradeSide === option.value
            const optionDisabled = option.value === 'sell' && forexHoldingQuantity < 1
            return (
              <button
                key={option.value}
                type="button"
                className={`forex-trade-side-btn ${option.tone} ${active ? 'is-active' : ''}`.trim()}
                aria-pressed={active}
                disabled={Boolean(busy) || optionDisabled}
                onClick={() => setForexTradeForm((prev) => ({ ...prev, side: option.value }))}
              >
                <span className="forex-trade-side-title">{option.label}</span>
                <span className="forex-trade-side-desc">{option.description}</span>
              </button>
            )
          })}
        </div>

        <div className="forex-trade-preview">
          <p>Kur: <strong>{fmtFxRate(forexTradeRate || 0)}</strong></p>
          <p>Komisyon: <strong>{fmtTry(forexTradeFeePreview)}</strong></p>
          <p>{forexTradeSide === 'buy' ? 'Toplam Maliyet' : 'Tahmini Net'}: <strong>{fmtTry(forexTradeTotalPreview)}</strong></p>
          <p>Toplam Kapasite: <strong>{fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} Adet</strong></p>
          <p>Portföy Durumu: <strong>{fmt(forexHoldingQuantity)} / {fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} Adet</strong></p>
          <p>Alışta Kalan Limit: <strong>{fmt(forexHoldingRemainingCapacity)} Adet</strong></p>
          <p>Satışta Kullanılabilir: <strong>{fmt(forexHoldingQuantity)} Adet</strong></p>
          <p>Ortalama Alış: <strong>{forexHoldingQuantity > 0 ? fmtFxRate(forexHoldingAverageBuyRate) : '--'}</strong></p>
          <p>
            Kar / Zarar:
            <strong> {fmtTrySigned(forexHoldingUnrealizedPnlTry)} ({fmtPctSigned(forexHoldingUnrealizedPnlPercent)})</strong>
          </p>
          <p>Gerçekleşen Kar / Zarar: <strong>{fmtTrySigned(forexHolding?.realizedPnlTry || 0)}</strong></p>
        </div>
        {forexTradeQuantityTooHigh && (
          <p className="forex-trade-warning" role="alert">
            Güvenlik limiti: en fazla {fmt(FOREX_TRADE_MAX_QUANTITY)} adet girebilirsin.
          </p>
        )}
        {!forexTradeRateValid && (
          <p className="forex-trade-warning" role="alert">
            Kur verisi güncelleniyor, birkaç saniye sonra tekrar dene.
          </p>
        )}
        {forexTradeSide === 'buy' && forexTradeQuantity > 0 && forexTradeInsufficientWallet && (
          <p className="forex-trade-warning" role="alert">
            Yetersiz nakit. Bu işlem için {fmtTry(forexTradeTotalPreview)} gerekiyor, bakiyen {fmtTry(forexWalletTry)}.
          </p>
        )}
        {forexTradeSide === 'buy' && forexTradeQuantity > 0 && forexTradeExceedsTotalHoldingCap && (
          <p className="forex-trade-warning" role="alert">
            Toplam TCT limiti {fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} adet. En fazla {fmt(forexHoldingRemainingCapacity)} adet daha alabilirsin.
          </p>
        )}
        {forexTradeSide === 'sell' && forexTradeQuantity > 0 && forexTradeInsufficientHoldings && (
          <p className="forex-trade-warning" role="alert">
            Yetersiz TCT bakiyesi. En fazla {fmt(forexHoldingQuantity)} adet bozdurabilirsin.
          </p>
        )}

        <button
          type="button"
          className={`btn full ${forexTradeSide === 'buy' ? 'btn-success' : 'btn-danger'}`}
          onClick={() => void runForexTradeAction()}
          disabled={forexTradeSubmitBlocked}
        >
          {busy === 'forex-buy' || busy === 'forex-sell'
            ? 'İşlem gerçekleşiyor...'
            : forexTradeSide === 'buy'
              ? 'TCT AL'
              : 'TCT BOZDUR'}
        </button>

        <p className="forex-solo-note">
          {String(forex?.investmentNote || 'Geleceğe yatırım yaparken risk yönetimini unutma.')}
        </p>
      </section>
    </article>
  </section>
)
}
