import {
  ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC,
  ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC,
} from '../constants.js'
import {
  announcementTypeMeta,
  fmtRemainShort,
  formatAnnouncementDateTime,
} from '../utils.js'

export function renderAnnouncementsView(hp) {
  const {
    cityAnnouncements,
    penalizedUsers,
  } = hp

return (
  <section className="announcements-screen">
    <article className="announcements-board">
      <header className="announcements-board-head">
        <div className="announcements-board-kicker">
          <span className="announcements-hero-badge">
            <img
              src={ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC
              }}
            />
            <span>DUYURU</span>
          </span>
          <h3 className="announcements-hero-title">DUYURULAR</h3>
        </div>
        <p className="announcements-hero-subtitle">RESMİ DUYURULAR</p>
      </header>

      {cityAnnouncements.length > 0 ? (
        <div className="announcements-board-scroll">
          {cityAnnouncements.map((entry) => {
            const typeMeta = announcementTypeMeta(entry.announcementType ?? entry.announcementTag)
            return (
              <article key={entry.id} className={`announcement-entry is-${typeMeta.className}`}>
                <header className="announcement-entry-head">
                  <span className={`announcement-card-tag is-${typeMeta.className}`}>
                    <img
                      src={ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        const node = event.currentTarget
                        if (node.dataset.fallbackApplied === '1') {
                          node.style.display = 'none'
                          return
                        }
                        node.dataset.fallbackApplied = '1'
                        node.src = ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC
                      }}
                    />
                    <span>{entry.announcementTag || typeMeta.label}</span>
                  </span>
                  <h4 className="announcement-entry-title">{entry.title || 'Duyuru'}</h4>
                </header>
                <div className="announcement-entry-body">
                  {(() => {
                    const lines = String(entry.body || '')
                      .split(/\n+/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                    if (!lines.length) {
                      return <p className="announcement-entry-body-empty">Detay metni bulunmuyor.</p>
                    }
                    return lines.map((line, index) => (
                      <p key={`${entry.id}-line-${index + 1}`}>{line}</p>
                    ))
                  })()}
                </div>
                <footer className="announcement-entry-footer">
                  <span className="announcement-card-author">[{entry.createdByUsername || 'Admin'}]</span>
                  <span className="announcement-card-time">
                    {formatAnnouncementDateTime(entry.createdAt || '')}
                  </span>
                </footer>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="announcements-board-empty">
          <p>Henüz resmi bir duyuru paylaşılmadı.</p>
        </div>
      )}
    </article>

    <article className="card module-card penalized-users-card">
      <h4 className="menu-section-title">Cezalı Kullanıcılar</h4>
      {penalizedUsers.length > 0 ? (
        <div className="penalized-users-list">
          {penalizedUsers.map((entry) => (
            <div key={entry.userId} className="penalized-user-row">
              <span className="penalized-user-avatar">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <span className="penalized-user-avatar-fallback" aria-hidden>👤</span>
                )}
              </span>
              <span className="penalized-user-name">{entry.username}</span>
              <span className="penalized-user-penalties">
                {entry.penalties.map((p, i) => (
                  <span key={i} className={`penalized-badge penalized-badge-${p.type}`}>
                    {p.label}{p.remainingMs > 0 ? ` · ${fmtRemainShort(p.remainingMs)}` : ''}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="penalized-users-empty">Şu an ceza uygulanan kullanıcı yok.</p>
      )}
    </article>
  </section>
)
}
