export function renderGaragePanel(hp) {
  const {
  _sendProfileTeklif,
  garagePanel,
  profileTeklifSending,
  setGaragePanel,
} = hp

  return (
    <section
      className="garage-teklif-overlay"
      aria-modal="true"
      role="dialog"
      onClick={() => setGaragePanel((p) => ({ ...p, open: false }))}
    >
      <article className="garage-teklif-panel" onClick={(e) => e.stopPropagation()}>
        <div className="garage-teklif-head">
          <button
            type="button"
            className="garage-teklif-back"
            onClick={() => setGaragePanel((p) => ({ ...p, open: false }))}
          >
            ← Profile Dön
          </button>
          <h3 className="garage-teklif-title">{garagePanel.businessName || 'Garaj'}</h3>
        </div>
        <div className="garage-teklif-body">
          {(() => {
            const panelTemplateId = String(garagePanel.templateId || '').trim()
            const assetTypeLabel = String(garagePanel.assetTypeLabel || '').trim()
              || (
                panelTemplateId === 'logistics'
                  ? 'Tır'
                  : panelTemplateId === 'moto-rental'
                    ? 'Motor'
                    : panelTemplateId === 'auto-rental'
                      ? 'Araba'
                      : panelTemplateId === 'property-rental'
                        ? 'Mülk'
                        : 'Araç'
              )
            const garageTypeLabel = String(garagePanel.garageTypeLabel || '').trim()
              || (
                panelTemplateId === 'logistics'
                  ? 'Tır Garajı'
                  : panelTemplateId === 'moto-rental'
                    ? 'Motor Garajı'
                    : panelTemplateId === 'auto-rental'
                      ? 'Araba Garajı'
                      : panelTemplateId === 'property-rental'
                        ? 'Mülk Portföyü'
                        : 'Garaj'
              )
            const assetEmoji = panelTemplateId === 'moto-rental'
              ? '🏍️'
              : panelTemplateId === 'auto-rental'
                ? '🚗'
                : panelTemplateId === 'logistics'
                  ? '🚚'
                  : panelTemplateId === 'property-rental'
                    ? '🏢'
                    : '📦'

            return (
              <>
                <div className="garage-teklif-profile-card">
                  <div className="garage-teklif-profile">
                    <div className="player-profile-avatar-wrap garage-teklif-avatar-wrap">
                      <img
                        src={garagePanel.avatarUrl || '/splash/logo.png'}
                        alt=""
                        className="player-profile-avatar"
                        onError={(e) => { e.target.src = '/splash/logo.png' }}
                      />
                    </div>
                    <div className="garage-teklif-profile-text">
                      <h4 className="garage-teklif-player-name">{garagePanel.displayName || garagePanel.username}</h4>
                      <p className="garage-teklif-player-meta">
                        {garagePanel.levelLabel || 'Oyuncu'} · {garageTypeLabel}
                      </p>
                    </div>
                  </div>
                  <p className="garage-teklif-subtitle">
                    {assetTypeLabel} listesi. Teklif için <strong>DM ile Teklif</strong> butonunu kullan.
                  </p>
                </div>
                {garagePanel.vehicles.length === 0 ? (
                  <div className="garage-teklif-empty">
                    <span className="garage-teklif-empty-icon" aria-hidden>{assetEmoji}</span>
                    <p className="garage-teklif-empty-title">Henüz {assetTypeLabel.toLocaleLowerCase('tr-TR')} yok.</p>
                    <p className="garage-teklif-empty-sub">Bu işletmede listelenecek bir varlık görünmüyor.</p>
                  </div>
                ) : (
                  <ul className="garage-teklif-list">
                    {garagePanel.vehicles.map((v) => {
                      const vehicleName = String(v.name || '').trim() || assetTypeLabel
                      const offerTargetLabel = `${vehicleName} (${garagePanel.businessName || garageTypeLabel})`
                      return (
                        <li key={v.id || v.name} className="garage-teklif-li">
                          <img src={v.image || '/splash/logo.png'} alt={vehicleName} className="garage-teklif-thumb" onError={(e) => { e.target.src = '/splash/logo.png' }} />
                          <div className="garage-teklif-item-meta">
                            <span className="garage-teklif-name">{vehicleName}</span>
                            <span className="garage-teklif-asset-badge">{assetTypeLabel}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-small garage-teklif-btn"
                            onClick={() => _sendProfileTeklif(garagePanel.username, offerTargetLabel)}
                            disabled={profileTeklifSending}
                          >
                            <span className="garage-teklif-btn-icon" aria-hidden>💬</span>
                            <span>{profileTeklifSending ? 'Açılıyor...' : 'DM ile Teklif'}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )
          })()}
        </div>
      </article>
    </section>
  )
}
