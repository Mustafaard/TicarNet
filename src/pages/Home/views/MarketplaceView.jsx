import {
  MARKETPLACE_SELL_MAX_PRICE_MULTIPLIER,
  MARKETPLACE_SELL_MIN_PRICE_MULTIPLIER,
  MARKETPLACE_SYSTEM_STOCK_CAP,
} from '../constants.js'
import {
  fmt,
  num,
} from '../utils.js'

export function renderMarketplaceView(hp) {
  const {
  NakitLabel,
  busy,
  cancelOrderBookOrder,
  cashIconSrc,
  fail,
  inventoryById,
  loadMarket,
  loadOverview,
  loadProfile,
  market,
  marketplaceFilter,
  marketplaceMaxQty,
  marketplaceNoCapacity,
  marketplaceTab,
  openProfileModal,
  openTab,
  overview,
  placeOrderBookOrder,
  sellForm,
  setBusy,
  setMarketplaceBuyModal,
  setMarketplaceBuyModalQty,
  setMarketplaceFilter,
  setMarketplaceTab,
  setNotice,
  setNoticeIsSuccess,
  setSellForm,
  tradeableDepotItems,
  walletCashValue,
  walletGoldValue,
} = hp

return (
  <section className="panel-stack home-sections marketplace-screen marketplace-glass">
    <article className="card marketplace-panel marketplace-panel-glass">
      <div className="marketplace-top">
        <div className="marketplace-top-left">
          <img src="/home/icons/pazaryeri.webp" alt="" className="marketplace-title-icon" onError={(e) => { e.target.style.display = 'none' }} />
          <div>
            <h3 className="marketplace-title">Pazar Yeri</h3>
            <p className="marketplace-subtitle">Ürün Pazarı · Vergi: %10</p>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home', { tab: 'home' })}>Şehir</button>
      </div>
      {marketplaceNoCapacity && (
        <div className="marketplace-no-capacity-banner card" role="alert" style={{ background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
          <p style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>
            Alım satım yapabilmek için en az bir tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.
          </p>
        </div>
      )}
      <div className="marketplace-wallet-row">
        <span className="marketplace-wallet-item">
          <img src={cashIconSrc} alt="" className="marketplace-wallet-icon" onError={(e) => { e.target.style.display = 'none' }} />
          <span>{walletCashValue} Nakit</span>
        </span>
        <span className="marketplace-wallet-item">
          <img src="/home/icons/depot/diamond.webp" alt="" className="marketplace-wallet-icon" onError={(e) => { e.target.style.display = 'none' }} />
          <span>{walletGoldValue} Elmas</span>
        </span>
      </div>
      <div className="marketplace-section marketplace-section-tabs">
        <div className="marketplace-tabs">
          <button type="button" className={`marketplace-tab ${marketplaceTab === 'pazar' ? 'active' : ''}`} onClick={() => setMarketplaceTab('pazar')}><span className="marketplace-tab-emoji" aria-hidden>🏪</span> Pazar Yeri</button>
          <button type="button" className={`marketplace-tab ${marketplaceTab === 'sat' ? 'active' : ''}`} onClick={() => setMarketplaceTab('sat')}><span className="marketplace-tab-emoji" aria-hidden>🏷️</span> Satış İlanı</button>
          <button type="button" className={`marketplace-tab ${marketplaceTab === 'ilanlarim' ? 'active' : ''}`} onClick={() => setMarketplaceTab('ilanlarim')}><span className="marketplace-tab-emoji" aria-hidden>📋</span> İlanlarım ({(market?.openOrders || []).filter((o) => o.status === 'open' && o.side === 'sell').length})</button>
        </div>
      </div>
      {marketplaceTab === 'pazar' && (
        <div className="marketplace-tab-content marketplace-section marketplace-section-content">
          <div className="marketplace-block marketplace-block-filters">
            <div className="marketplace-filters">
            <button type="button" className={`marketplace-filter-pill ${marketplaceFilter === 'all' ? 'active' : ''}`} onClick={() => setMarketplaceFilter('all')}><span className="marketplace-filter-emoji" aria-hidden>📦</span> Tümü</button>
            {tradeableDepotItems.map((item) => (
              <button key={item.id} type="button" className={`marketplace-filter-pill ${marketplaceFilter === item.id ? 'active' : ''}`} onClick={() => setMarketplaceFilter(item.id)}>
                {item.png ? <img src={item.png} alt="" className="marketplace-filter-icon" onError={(e) => { e.target.style.display = 'none' }} /> : <span className="marketplace-filter-emoji" aria-hidden>📦</span>}
                {item.label}
              </button>
            ))}
            </div>
          </div>
          <div className="marketplace-block marketplace-block-capacity">
            <p className="marketplace-capacity-hint">
              <img src="/home/icons/depot/capacity.png" alt="" className="marketplace-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
              {marketplaceNoCapacity
                ? 'Tır kapasitesi olmadan pazar alım satımı yapılamaz.'
                : <>Satın alımda en fazla <strong>{fmt(marketplaceMaxQty)} adet</strong> alabilirsin (toplam tır kapasitesi).</>}
            </p>
          </div>
          <div className="marketplace-block marketplace-block-list">
          <div className="marketplace-list">
            {(() => {
              const sellOrders = market?.sellOrders || []
              const items = (market?.items || []).filter(
                (m) => tradeableDepotItems.some((t) => t.id === m.id) && (marketplaceFilter === 'all' || m.id === marketplaceFilter)
              )
              const rows = []
              for (const item of items) {
                const meta = tradeableDepotItems.find((t) => t.id === item.id)
                const ordersForItem = sellOrders.filter((o) => o.itemId === item.id)
                if (!ordersForItem.length) {
                  rows.push({
                    type: 'market',
                    key: `system-fallback:${item.id}`,
                    orderId: '',
                    itemId: item.id,
                    itemName: item.name || meta?.label || item.id,
                    price: Math.max(1, Math.trunc(num(item?.price || item?.buyPrice || 0))),
                    stock: Math.min(MARKETPLACE_SYSTEM_STOCK_CAP, Math.max(0, Math.trunc(num(item?.stock || 0)))),
                    sellerName: 'Sistem Pazarı',
                    sellerUserId: '',
                    isSystem: true,
                    icon: meta?.png,
                  })
                  continue
                }
                for (const o of ordersForItem) {
                  const isSystemOrder = Boolean(o?.isSystem) || String(o?.source || '').trim().toLowerCase() === 'system'
                  const rawStock = Math.max(0, Math.trunc(num(o?.quantity || 0)))
                  const stock = isSystemOrder ? Math.min(MARKETPLACE_SYSTEM_STOCK_CAP, rawStock) : rawStock
                  rows.push({
                    type: isSystemOrder ? 'market' : 'order',
                    key: o.orderId || `${isSystemOrder ? 'system' : 'order'}:${o.itemId}`,
                    orderId: o.orderId,
                    itemId: o.itemId,
                    itemName: o.itemName || meta?.label || o.itemId,
                    price: o.limitPrice,
                    stock,
                    sellerName: o.sellerName,
                    sellerUserId: o.sellerUserId,
                    isSystem: isSystemOrder,
                    icon: meta?.png,
                  })
                }
              }
              rows.sort((left, right) => {
                const priceDiff = Math.max(0, Math.trunc(num(left?.price || 0))) - Math.max(0, Math.trunc(num(right?.price || 0)))
                if (priceDiff !== 0) return priceDiff
                const itemDiff = String(left?.itemId || '').localeCompare(String(right?.itemId || ''), 'tr')
                if (itemDiff !== 0) return itemDiff
                const stockDiff = Math.max(0, Math.trunc(num(right?.stock || 0))) - Math.max(0, Math.trunc(num(left?.stock || 0)))
                if (stockDiff !== 0) return stockDiff
                return String(left?.sellerName || '').localeCompare(String(right?.sellerName || ''), 'tr')
              })
              if (rows.length === 0) {
                return (
                  <div className="marketplace-list-empty card">
                    <p className="muted" style={{ margin: 0 }}>Bu filtrede aktif ilan görünmüyor. Başka kategori seçebilirsin.</p>
                  </div>
                )
              }
              const wallet = Math.max(0, Math.trunc(num(overview?.profile?.wallet ?? 0)))
              return (
                <div className="marketplace-buy-list marketplace-buy-list-clean">
                  {rows.map((row) => {
                    const maxBuy = Math.min(marketplaceMaxQty, row.stock)
                    const canAfford = row.price <= wallet
                    const insufficientFunds = row.stock > 0 && !canAfford
                    return (
                      <div key={row.key} className="marketplace-buy-card-clean card">
                        <img src={row.icon || '/home/icons/depot/cash.webp'} alt="" className="marketplace-buy-card-clean-icon" />
                        <div className="marketplace-buy-card-clean-info">
                          <span className="marketplace-buy-card-clean-name">{row.itemName}</span>
                          <span className="marketplace-buy-card-clean-stock">{fmt(row.stock)} adet</span>
                          <span className="marketplace-buy-card-seller">
                            Satıcı:{' '}
                            {row.sellerUserId ? (
                              <button
                                type="button"
                                className="marketplace-seller-link"
                                onClick={() => {
                                  void openProfileModal(row.sellerUserId, {
                                    username: row.sellerName,
                                    displayName: row.sellerName,
                                  })
                                }}
                              >
                                {row.sellerName}
                              </button>
                            ) : (
                              row.sellerName
                            )}
                          </span>
                          {row.isSystem ? (
                            <span className="marketplace-system-badge" aria-label="Sistem ilanı">🤖 Sistem İlanı</span>
                          ) : null}
                          {insufficientFunds && (
                            <span className="marketplace-buy-card-warning" role="alert">Yetersiz bakiye</span>
                          )}
                          {canAfford && maxBuy < row.stock && (
                            <span className="marketplace-buy-card-hint">En fazla {fmt(maxBuy)} adet (kapasite)</span>
                          )}
                        </div>
                        <div className="marketplace-buy-card-clean-price-wrap">
                          <span className="marketplace-buy-card-clean-price">
                            <img src={cashIconSrc} alt="" className="marketplace-nakit-icon" onError={(e) => { e.target.style.display = 'none' }} />
                            {fmt(row.price)} Nakit
                          </span>
                          <span className="marketplace-buy-card-clean-price-label">adet fiyatı</span>
                        </div>
                        <button
                          type="button"
                          className="btn marketplace-buy-btn-clean"
                          disabled={marketplaceNoCapacity || row.stock <= 0 || !canAfford || busy === `marketplace-buy:${row.key}`}
                          onClick={() => {
                            const defaultQty = Math.max(1, Math.min(marketplaceMaxQty, row.stock))
                            setMarketplaceBuyModal({
                              type: row.type,
                              orderId: row.orderId,
                              itemId: row.itemId,
                              itemName: row.itemName,
                              price: row.price,
                              stock: row.stock,
                              sellerName: row.sellerName,
                              icon: row.icon,
                            })
                            setMarketplaceBuyModalQty(String(defaultQty))
                          }}
                        >
                          {busy === `marketplace-buy:${row.key}` ? '...' : 'SATIN AL'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
          </div>
        </div>
      )}
      {marketplaceTab === 'sat' && (
        <div className="marketplace-tab-content marketplace-section marketplace-section-content">
        <div className="marketplace-block marketplace-sell-form card">
            <h4 className="marketplace-sell-form-title"><span className="marketplace-tab-emoji" aria-hidden>🏷️</span> Ürün Satışa Koy</h4>
            <p className="marketplace-sell-limit-hint">
              Genel ilanda limit yok. Özel ilanda aynı anda en fazla <strong>10 aktif ilan</strong> açabilirsin.
            </p>
            <div className="marketplace-sell-form-row">
              <label className="marketplace-sell-form-label">Ürün</label>
              <select
                className="marketplace-sell-form-select"
                value={sellForm.itemId}
                onChange={(e) => {
                  const itemId = e.target.value
                  const item = tradeableDepotItems.find((i) => i.id === itemId)
                  const stock = item ? Math.max(0, Math.trunc(num(inventoryById[itemId] || 0))) : 0
                  const marketItem = market?.items?.find((i) => i.id === itemId)
                  const price = marketItem?.price != null ? Math.max(1, Math.trunc(num(marketItem.price))) : 100
                  setSellForm((prev) => ({ ...prev, itemId, quantity: String(Math.min(marketplaceMaxQty, Math.max(1, stock))), unitPrice: String(price) }))
                }}
              >
                <option value="">Ürün seç</option>
                {tradeableDepotItems
                  .filter((i) => Math.max(0, Math.trunc(num(inventoryById[i.id] || 0))) > 0)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label} (Stok: {fmt(Math.max(0, Math.trunc(num(inventoryById[i.id] || 0))))})
                    </option>
                  ))}
              </select>
            </div>
            <div className="marketplace-sell-form-row">
              <label className="marketplace-sell-form-label">Miktar</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Miktar"
                value={sellForm.quantity}
                onChange={(e) => setSellForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 8) }))}
                onBlur={() => {
                  if (!sellForm.itemId) return
                  const stock = Math.max(0, Math.trunc(num(inventoryById[sellForm.itemId] || 0)))
                  const maxQ = Math.min(marketplaceMaxQty, stock)
                  const parsed = Math.trunc(num(sellForm.quantity)) || 0
                  const clamped = Math.max(1, Math.min(maxQ, parsed))
                  setSellForm((prev) => ({ ...prev, quantity: String(clamped) }))
                }}
                className="marketplace-sell-form-input"
              />
              <span className="marketplace-sell-form-hint">
                {marketplaceNoCapacity ? 'Tır kapasitesi yok; satışa koyamazsınız.' : `Max: ${fmt(marketplaceMaxQty)} adet (toplam tır kapasitesi)`}
              </span>
              {(Math.trunc(num(sellForm.quantity)) || 0) > marketplaceMaxQty && (
                <p className="marketplace-capacity-warning" role="alert">
                  Kapasite yetersiz. Tır kapasiteniz {fmt(marketplaceMaxQty)} adet; en fazla {fmt(marketplaceMaxQty)} adet satışa koyabilirsiniz.
                </p>
              )}
            </div>
            <div className="marketplace-sell-form-row">
              <label className="marketplace-sell-form-label">Adet Fiyatı (Nakit)</label>
              <input
                type="number"
                min={1}
                value={sellForm.unitPrice}
                onChange={(e) => setSellForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                className="marketplace-sell-form-input"
                placeholder="Adet fiyatı"
              />
              {sellForm.itemId && (() => {
                const marketItem = market?.items?.find((i) => i.id === sellForm.itemId)
                const price = marketItem?.price != null ? Math.max(1, Math.trunc(num(marketItem.price))) : 100
                const minP = Math.max(1, Math.round(price * MARKETPLACE_SELL_MIN_PRICE_MULTIPLIER))
                const maxP = Math.max(minP, Math.round(price * MARKETPLACE_SELL_MAX_PRICE_MULTIPLIER))
                return <span className="marketplace-sell-form-hint">Adet başı min: {fmt(minP)} Nakit · max: {fmt(maxP)} Nakit</span>
              })()}
            </div>
            <div className="marketplace-sell-form-total">
              Toplam: <strong><NakitLabel value={(() => { const q = Math.max(0, Math.min(marketplaceMaxQty, Math.trunc(num(sellForm.quantity)) || 0)); const p = Math.max(0, Math.trunc(num(sellForm.unitPrice) || 0)); return q * p; })()} /></strong>
            </div>
            <p className="marketplace-sell-form-tax">
              Uyarı: İlan eşleşince yüzde 10 vergi kesilir. İlan, İlanlarım sekmesinden kaldırılabilir.
            </p>
            <button
              type="button"
              className="btn marketplace-sell-submit"
              disabled={marketplaceNoCapacity || !sellForm.itemId || !String(sellForm.quantity).trim() || !String(sellForm.unitPrice).trim() || busy === 'marketplace-sell' || (Math.trunc(num(sellForm.quantity)) || 0) > marketplaceMaxQty}
              onClick={async () => {
                if (busy || !sellForm.itemId) return
                const qty = Math.max(1, Math.min(marketplaceMaxQty, Math.trunc(num(sellForm.quantity)) || 1))
                const stock = Math.max(0, Math.trunc(num(inventoryById[sellForm.itemId] || 0)))
                if (qty > stock) {
                  fail(null, 'Depoda yeterli ürün yok.')
                  return
                }
                const unitPrice = Math.max(1, Math.trunc(num(sellForm.unitPrice) || 0))
                const marketItem = market?.items?.find((i) => i.id === sellForm.itemId)
                const marketUnitPrice = marketItem?.price != null ? Math.max(1, Math.trunc(num(marketItem.price))) : 100
                const minAllowed = Math.max(1, Math.round(marketUnitPrice * MARKETPLACE_SELL_MIN_PRICE_MULTIPLIER))
                const maxAllowed = Math.max(minAllowed, Math.round(marketUnitPrice * MARKETPLACE_SELL_MAX_PRICE_MULTIPLIER))
                if (unitPrice < minAllowed || unitPrice > maxAllowed) {
                  fail(
                    null,
                    `Adet fiyatı ${fmt(minAllowed)} ile ${fmt(maxAllowed)} arasında olmalı.`,
                  )
                  return
                }
                setBusy('marketplace-sell')
                try {
                  const response = await placeOrderBookOrder({
                    itemId: sellForm.itemId,
                    side: 'sell',
                    quantity: qty,
                    limitPrice: unitPrice,
                    expiresMinutes: 180,
                  })
                  if (!response?.success) {
                    fail(response, response?.errors?.global || 'İlan açılamadı.')
                    return
                  }
                  setNotice(response.message || `${fmt(qty)} adet satış ilanı açıldı. İlanlarım sekmesinden takip edebilirsin.`)
                  setNoticeIsSuccess(true)
                  await Promise.all([loadOverview(), loadMarket(), loadProfile()])
                } finally {
                  setBusy('')
                }
              }}
            >
              <img src="/home/icons/depot/cash.webp" alt="" className="marketplace-sell-submit-icon" />
              {busy === 'marketplace-sell' ? 'İşleniyor...' : 'Satışa Koy'}
            </button>
          </div>
        </div>
      )}
      {marketplaceTab === 'ilanlarim' && (
        <div className="marketplace-tab-content marketplace-section marketplace-section-content">
          <div className="marketplace-block marketplace-block-list">
          <div className="marketplace-list">
            {(() => {
              const openListings = (market?.openOrders || []).filter((o) => o.status === 'open' && o.side === 'sell')
              if (openListings.length === 0) {
                return (
                  <div className="marketplace-list-empty card">
                    <p className="muted" style={{ margin: 0 }}><span className="marketplace-tab-emoji" aria-hidden>🏷️</span> Aktif ilanın yok. Satış İlanı sekmesinden ilan verebilirsin.</p>
                  </div>
                )
              }
              const formatListingDate = (iso) => {
                try {
                  const d = new Date(iso)
                  const day = String(d.getDate()).padStart(2, '0')
                  const month = String(d.getMonth() + 1).padStart(2, '0')
                  const year = d.getFullYear()
                  const hour = String(d.getHours()).padStart(2, '0')
                  const min = String(d.getMinutes()).padStart(2, '0')
                  return `${day}.${month}.${year} ${hour}:${min}`
                } catch (_) { return '' }
              }
              return (
                <div className="marketplace-listings-list">
                  {openListings.map((order) => {
                    const meta = tradeableDepotItems.find((t) => t.id === order.itemId)
                    const remaining = Math.max(0, order.remainingQuantity ?? (order.quantity - (order.filledQuantity || 0)))
                    const total = remaining * Math.max(0, order.limitPrice || 0)
                    return (
                      <div key={order.id} className="marketplace-listing-card card">
                        <div className="marketplace-listing-main">
                          <img src={meta?.png || '/home/icons/depot/cash.webp'} alt="" className="marketplace-listing-icon" />
                          <div className="marketplace-listing-info">
                            <span className="marketplace-listing-name">{order.itemName || order.itemId}</span>
                            <span className="marketplace-listing-date">{formatListingDate(order.createdAt)}</span>
                            <span className="marketplace-listing-qty-total">{fmt(remaining)} adet ⬢ Toplam: <NakitLabel value={total} /></span>
                          </div>
                          <div className="marketplace-listing-price-wrap">
                            <span className="marketplace-listing-unit-price"><NakitLabel value={order.limitPrice || 0} /></span>
                            <span className="marketplace-listing-price-label">birim fiyat ⬢ {fmt(remaining)} adet</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn marketplace-listing-remove"
                          disabled={busy === `marketplace-remove:${order.id}`}
                          onClick={async () => {
                            setBusy(`marketplace-remove:${order.id}`)
                            try {
                              const response = await cancelOrderBookOrder(order.id)
                              if (!response?.success) {
                                fail(response, response?.errors?.global || 'İlan kaldırılamadı.')
                                return
                              }
                              setNotice(response.message || 'İlan kaldırıldı.')
                              setNoticeIsSuccess(true)
                              await Promise.all([loadOverview(), loadMarket(), loadProfile()])
                            } finally {
                              setBusy('')
                            }
                          }}
                        >
                          <span className="marketplace-listing-remove-icon" aria-hidden>🗑</span>
                          {busy === `marketplace-remove:${order.id}` ? 'Kaldırılıyor...' : 'Kaldır'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
          </div>
        </div>
      )}
    </article>
  </section>
)
}
