import {
  CITY_RULES_GUIDE,
} from '../constants.js'

export function renderRulesView(_hp) {
return (
  <section className="panel-stack rules-screen">
    <article className="card module-card rules-intro-card">
      <div className="rules-intro-icon" aria-hidden>📜</div>
      <h3 className="rules-intro-title">{CITY_RULES_GUIDE.title}</h3>
      <div className="rules-intro-text-wrap">
        {CITY_RULES_GUIDE.subtitleLines.map((line) => (
          <p key={line} className="rules-intro-text">{line}</p>
        ))}
      </div>
    </article>

    {CITY_RULES_GUIDE.groups.map((group) => (
      <article key={group.id} className="card module-card rules-group-card" aria-labelledby={`rules-group-${group.id}`}>
        <header className="rules-group-head">
          <h4 id={`rules-group-${group.id}`} className="rules-group-title">
            <span className="rules-group-emoji" aria-hidden>{group.icon}</span>
            <span>{group.title}</span>
          </h4>
          <p className="rules-group-subtitle">{group.description}</p>
        </header>
        <div className="rules-group-divider" />
        <div className="rules-group-list" role="list">
          {group.rules.map((entry, ruleIndex) => (
            <article
              key={`${group.id}-rule-${ruleIndex + 1}`}
              className={`rules-penalty-card tone-${entry.tone || 'red'}`}
              role="listitem"
            >
              <div className="rules-penalty-topline">
                <span className="rules-penalty-index">{`Kural ${ruleIndex + 1}`}</span>
              </div>
              <p className="rules-penalty-text">{entry.text}</p>
              <p className="rules-penalty-chip">
                <span className="rules-penalty-chip-icon" aria-hidden>⏱️</span>
                <span>{entry.penalty}</span>
              </p>
              {entry.note ? <p className="rules-penalty-note">{entry.note}</p> : null}
            </article>
          ))}
        </div>
      </article>
    ))}

    <article className="card module-card rules-final-card">
      <div className="rules-final-icon" aria-hidden>⚖️</div>
      <p className="rules-final-text">{CITY_RULES_GUIDE.finalNote}</p>
    </article>
  </section>
)
}
