import {
  fmtRemainShort,
} from '../utils.js'

export function renderPenalizedView(hp) {
  const {
    penalizedUsers,
  } = hp

return (
  <section className="panel-stack home-sections penalized-screen">
    <article className="card module-card penalized-users-card">
      <h4 className="menu-section-title">Cezalı Kullanıcılar</h4>
      <p className="penalized-users-subtitle">Ceza uygulanan kullanıcıların listesi</p>
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
