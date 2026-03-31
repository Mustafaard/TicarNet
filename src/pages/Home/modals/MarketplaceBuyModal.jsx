import {
  fmt,
  num,
} from '../utils.js'
import { buyFromSellOrder, buyItem } from '../../../services/api/marketApi.js'

export function renderMarketplaceBuyModal(hp) {
  const {
    NakitLabel,
    busy,
    cashIconSrc,
    fail,
    loadMarket,
    loadOverview,
    loadProfile,
    marketplaceBuyModal,
    marketplaceBuyModalQty,
    marketplaceMaxQty,
    marketplaceNoCapacity,
    overview,
    setBusy,
    setMarketplaceBuyModal,
    setMarketplaceBuyModalQty,
    setNotice,
    setNoticeIsSuccess,
  } = hp

  return (
    <div className="marketplace-modal-backdrop" onClick={() => setMarketplaceBuyModal(null)} role="dialog" aria-modal="true" aria-labelledby="marketplace-modal-title">
      <div className="marketplace-buy-modal card marketplace-buy-modal-centered" onClick={(e) => e.stopPropagation()}>
        <div className="marketplace-buy-modal-header">
          <img src={marketplaceBuyModal.icon || cashIconSrc} alt="" className="marketplace-buy-modal-product-icon" onError={(e) => { e.currentTarget.src = cashIconSrc }} />
          <h4 id="marketplace-modal-title" className="marketplace-buy-modal-title">Satın Al — Onay</h4>
        </div>
        <div className="marketplace-buy-modal-product-name">{marketplaceBuyModal.itemName}</div>
        <div className="marketplace-buy-modal-row">
          <span className="marketplace-buy-modal-label">Adet fiyatı</span>
          <span className="marketplace-buy-modal-value"><NakitLabel value={marketplaceBuyModal.price} /></span>
        </div>
        <div className="marketplace-buy-modal-row">
          <span className="marketplace-buy-modal-label">Satıcı</span>
          <span className="marketplace-buy-modal-value">{marketplaceBuyModal.sellerName}</span>
        </div>
        <div className="marketplace-buy-modal-row">
          <span className="marketplace-buy-modal-label">Stok</span>
          <span className="marketplace-buy-modal-value">{fmt(marketplaceBuyModal.stock)} adet</span>
        </div>
        <div className="marketplace-sell-form-row">
          <label className="marketplace-sell-form-label">Adet</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Adet"
            value={marketplaceBuyModalQty}
            onChange={(e) => setMarketplaceBuyModalQty(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
            onBlur={() => {
              const maxQ = Math.min(marketplaceBuyModal.stock, marketplaceMaxQty)
              const parsed = Math.trunc(num(marketplaceBuyModalQty)) || 0
              const clamped = Math.max(1, Math.min(maxQ, parsed))
              setMarketplaceBuyModalQty(String(clamped))
            }}
            className="marketplace-sell-form-input"
          />
          {marketplaceNoCapacity && (
            <p className="marketplace-capacity-warning marketplace-capacity-warning-modal" role="alert">
              Alım satım için tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.
            </p>
          )}
          {!marketplaceNoCapacity && (Math.trunc(num(marketplaceBuyModalQty)) || 0) > marketplaceMaxQty && (
            <p className="marketplace-capacity-warning marketplace-capacity-warning-modal" role="alert">
              Kapasite yetersiz. Tır kapasiteniz {fmt(marketplaceMaxQty)} adet; en fazla {fmt(marketplaceMaxQty)} adet alabilirsiniz.
            </p>
          )}
        </div>
        {(() => {
          const buyModalTotal = marketplaceBuyModal.price * (Math.max(0, Math.min(marketplaceBuyModal.stock, marketplaceMaxQty, Math.trunc(num(marketplaceBuyModalQty)) || 0)))
          const buyModalWallet = Math.max(0, Math.trunc(num(overview?.profile?.wallet ?? 0)))
          const buyModalInsufficientFunds = buyModalTotal > buyModalWallet
          return (
            <>
              <div className="marketplace-buy-modal-row marketplace-buy-modal-row-total">
                <span className="marketplace-buy-modal-label">Toplam</span>
                <span className="marketplace-buy-modal-value marketplace-buy-modal-value-total"><NakitLabel value={buyModalTotal} /></span>
              </div>
              <div className="marketplace-buy-modal-row">
                <span className="marketplace-buy-modal-label">Bakiyeniz</span>
                <span className="marketplace-buy-modal-value"><NakitLabel value={buyModalWallet} /></span>
              </div>
              <p className="marketplace-buy-modal-capacity-hint">
                <img src="/home/icons/depot/capacity.png" alt="" className="marketplace-buy-modal-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                En fazla alım: <strong>{fmt(marketplaceMaxQty)}</strong> adet (toplam tır kapasitesi)
              </p>
              {buyModalInsufficientFunds && (
                <p className="marketplace-capacity-warning marketplace-capacity-warning-modal" role="alert">
                  Yetersiz bakiye. Bu alım için <NakitLabel value={buyModalTotal} /> gerekir; elinizde <NakitLabel value={buyModalWallet} /> var.
                </p>
              )}
            </>
          )
        })()}
        <p className="marketplace-sell-form-tax marketplace-buy-modal-tax">Her satıştan %10 vergi kesilir.</p>
        <div className="marketplace-buy-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setMarketplaceBuyModal(null)}>İptal</button>
          <button
            type="button"
            className="btn marketplace-buy-btn"
            disabled={marketplaceNoCapacity || busy === 'marketplace-buy-modal' || (Math.trunc(num(marketplaceBuyModalQty)) || 0) > marketplaceMaxQty || (() => { const tot = marketplaceBuyModal.price * (Math.max(0, Math.min(marketplaceBuyModal.stock, marketplaceMaxQty, Math.trunc(num(marketplaceBuyModalQty)) || 0))); return tot > Math.max(0, Math.trunc(num(overview?.profile?.wallet ?? 0))) })()}
            onClick={async () => {
              if (!marketplaceBuyModal || busy) return
              const requested = Math.trunc(num(marketplaceBuyModalQty)) || 1
              const qty = Math.max(1, Math.min(Math.min(marketplaceBuyModal.stock, marketplaceMaxQty), requested))
              setBusy('marketplace-buy-modal')
              try {
                const response =
                  marketplaceBuyModal.type === 'order'
                    ? await buyFromSellOrder(marketplaceBuyModal.orderId, qty)
                    : await buyItem(marketplaceBuyModal.itemId, qty)
                if (!response?.success) {
                  fail(response, response?.errors?.global || 'Satın alınamadı.')
                  return
                }
                setMarketplaceBuyModal(null)
                setNotice(response.message || `${fmt(qty)} adet satın alındı.`)
                setNoticeIsSuccess(true)
                await Promise.all([loadOverview(), loadMarket(), loadProfile()])
              } finally {
                setBusy('')
              }
            }}
          >
            {busy === 'marketplace-buy-modal' ? 'İşleniyor...' : 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  )
}
