import {
  WEEKLY_EVENT_ICON_BY_TYPE,
} from '../constants.js'

export function renderEventsView(hp) {
  const {
    weeklyEventRangeCards,
    weeklyEventsHeroBadge,
    weeklyEventsHeroCountdown,
    weeklyEventsHeroSubtitle,
    weeklyEventsPrimary,
    weeklyEventsRuntimeState,
    weeklyEventsTodayDetail,
    weeklyEventsTodaySummary,
  } = hp

return (
  <section className="panel-stack weekly-events-screen">
    <article className="card module-card weekly-events-hero-card">
      <div className="weekly-events-head">
        <div>
          <p className="weekly-events-overline">HAFTALIK TAKVİM</p>
          <h3 className="weekly-events-title">Etkinlik Duyuruları</h3>
          <p className="weekly-events-subtitle">{weeklyEventsHeroSubtitle}</p>
        </div>
        <span className={`weekly-events-active-pill${weeklyEventsPrimary ? ' is-active' : ''}`}>
          {weeklyEventsHeroBadge}
        </span>
      </div>
      <p className="weekly-events-countdown">{weeklyEventsHeroCountdown}</p>
      <article className="weekly-events-today-card">
        <span className={`weekly-events-today-dot${weeklyEventsPrimary ? ' is-active' : ''}`} />
        <div className="weekly-events-today-copy">
          <strong>Bugün: {weeklyEventsRuntimeState.dayName}</strong>
          <small>{weeklyEventsTodaySummary}</small>
          <small>{weeklyEventsTodayDetail}</small>
        </div>
      </article>
    </article>

    {weeklyEventRangeCards.length > 0 ? (
      <article className="card module-card weekly-events-grid-card">
        <div className="weekly-events-grid">
          {weeklyEventRangeCards.map((entry) => {
          const cardClasses = [
            'weekly-event-day-card',
            'weekly-event-range-card',
            entry?.active ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')
            const iconEmoji = String(entry?.iconEmoji || '').trim()
            const icon = String(entry?.icon || WEEKLY_EVENT_ICON_BY_TYPE.standard).trim() || WEEKLY_EVENT_ICON_BY_TYPE.standard
          return (
            <article key={`weekly-event-range-${entry.id}`} className={cardClasses}>
              <header className="weekly-event-day-head">
                <div className="weekly-event-range-topline">
                  <strong className="weekly-event-range-day">{entry.dayRange}</strong>
                  <span className={`weekly-event-range-badge ${entry.todayInRange ? 'is-today' : ''}`}>
                    {entry.rangeBadge}
                  </span>
                </div>
                <span className="weekly-event-day-icon">
                  {iconEmoji ? (
                    <span className="weekly-event-day-icon-emoji" aria-hidden>{iconEmoji}</span>
                  ) : (
                    <img
                      src={icon}
                      alt=""
                      aria-hidden
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </span>
                <div className="weekly-event-day-meta weekly-event-range-meta">
                  <strong>{entry.subtitle || entry.title}</strong>
                  <small>{entry.active ? 'Etkinlik şu an aktif' : 'Takvimde planlı etkinlik'}</small>
                </div>
              </header>
              <p className="weekly-event-day-desc">{entry.description || 'Etkinlik açıklaması bulunmuyor.'}</p>
              <p className="weekly-event-day-window">{entry.timeWindow}</p>
              <div className="weekly-event-day-foot">
                <span className="weekly-event-day-bonus">{entry.effectLabel}</span>
                <span className="weekly-event-day-state">{entry.active ? 'Aktif' : 'Takvim'}</span>
              </div>
              <p className="weekly-event-day-countdown">
                {entry.active ? `Kalan: ${entry.countdownLabel}` : (entry.inactiveNote || 'Etkinlik günü bekleniyor.')}
              </p>
            </article>
          )
          })}
        </div>
      </article>
    ) : null}

  </section>
)
}
