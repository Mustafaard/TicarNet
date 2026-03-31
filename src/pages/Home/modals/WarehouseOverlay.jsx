import {
  fmt,
} from '../utils.js'

export function renderWarehouseOverlay(hp) {
  const {
    setWarehouseOpen,
    warehouseDisplayCards,
    warehouseTotalQuantity,
  } = hp

  return (
    <section className="warehouse-overlay warehouse-overlay-fullscreen" onClick={() => setWarehouseOpen(false)}>
      <article className="warehouse-modal warehouse-modal-fullscreen" onClick={(event) => event.stopPropagation()}>
        <div className="warehouse-head">
          <h3>Deponuzdaki ürünler</h3>
          <button className="warehouse-x" onClick={() => setWarehouseOpen(false)}>X</button>
        </div>

        <div className="warehouse-total-line">
          <span>Toplam stok</span>
          <strong>{fmt(warehouseTotalQuantity)} adet</strong>
        </div>

        <div className="warehouse-grid">
          {warehouseDisplayCards.map((item) => (
            <article key={item.id} className="warehouse-item">
              <span className="warehouse-item-icon" data-broken={item.forceEmoji ? '1' : '0'}>
                {!item.forceEmoji ? (
                  <img
                    src={item.png}
                    alt={item.label}
                    loading="lazy"
                    onError={(event) => {
                      const holder = event.currentTarget.parentElement
                      if (holder) holder.setAttribute('data-broken', '1')
                    }}
                  />
                ) : null}
                <span className="warehouse-item-icon-fallback">{item.icon}</span>
              </span>
              <p className="warehouse-item-name">{item.label}</p>
              <strong className="warehouse-item-qty">{fmt(item.quantity)}</strong>
              <small className="warehouse-item-unit">Adet</small>
            </article>
          ))}
        </div>
        <div className="warehouse-foot">
          <button className="btn btn-danger" onClick={() => setWarehouseOpen(false)}>Kapat</button>
        </div>
      </article>
    </section>
  )
}
