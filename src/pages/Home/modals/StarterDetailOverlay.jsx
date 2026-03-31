export function renderStarterDetailOverlay(hp) {
  const {
  setStarterDetailOpen,
} = hp

  return (
    <section className="starter-detail-overlay" role="dialog" aria-modal="true" onClick={() => setStarterDetailOpen(false)}>
      <article className="starter-detail-modal" onClick={(e) => e.stopPropagation()}>
        <header className="starter-detail-header">
          <h3 className="starter-detail-title">Başlangıç Sermayen</h3>
        </header>
        <div className="starter-detail-body">
          <p className="starter-detail-text">Oyuna başlarken hesabına aktarılan varlıklar:</p>
          <ul className="starter-detail-list">
            <li>
              <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
              <span className="starter-detail-label">Nakit</span>
              <span className="starter-detail-value">2.000.000</span>
            </li>
            <li>
              <img src="/home/icons/depot/oil.png" alt="" aria-hidden="true" />
              <span className="starter-detail-label">Petrol</span>
              <span className="starter-detail-value">500</span>
            </li>
            <li>
              <img src="/home/icons/depot/enerji.png" alt="" aria-hidden="true" />
              <span className="starter-detail-label">Enerji</span>
              <span className="starter-detail-value">200</span>
            </li>
            <li>
              <img src="/home/icons/depot/spare-parts.png" alt="" aria-hidden="true" />
              <span className="starter-detail-label">Motor</span>
              <span className="starter-detail-value">3.000</span>
            </li>
            <li>
              <img src="/home/icons/depot/yedekparca.webp" alt="" aria-hidden="true" />
              <span className="starter-detail-label">Yedek Parça</span>
              <span className="starter-detail-value">3.000</span>
            </li>
          </ul>
          <button type="button" className="starter-detail-close" onClick={() => setStarterDetailOpen(false)}>
            Tamam
          </button>
        </div>
      </article>
    </section>
  )
}
