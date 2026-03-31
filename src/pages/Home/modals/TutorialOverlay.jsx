import {
  TUTORIAL_ASSISTANT_IMAGE_SRC,
} from '../constants.js'

export function renderTutorialOverlay(hp) {
  const {
  closeTutorial,
  goTutorialNext,
  goTutorialPrev,
  tutorialCurrentStep,
  tutorialCurrentTargetLabel,
  tutorialNavPending,
  tutorialProgressPct,
  tutorialPurposeText,
  tutorialStepCount,
  tutorialStepImageSrc,
  tutorialStepSafeIndex,
} = hp

  return (
    <section
      className="tutorial-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closeTutorial}
    >
      <article className="tutorial-modal" onClick={(event) => event.stopPropagation()}>
        <div className="tutorial-layout">
          <aside className="tutorial-assistant-pane" aria-hidden="true">
            <img src={TUTORIAL_ASSISTANT_IMAGE_SRC} alt="" />
          </aside>
          <div className="tutorial-main-pane">
            <div className="tutorial-head">
              <div className="tutorial-head-left">
                <strong className="tutorial-title-main">TicarNet Hızlı Rehber</strong>
                <span className="tutorial-step-badge">{`Adım ${tutorialStepSafeIndex + 1}/${tutorialStepCount}`}</span>
              </div>
              <div className="tutorial-head-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={goTutorialPrev}
                  disabled={tutorialStepSafeIndex <= 0 || tutorialNavPending}
                >
                  Geri
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={goTutorialNext}
                  disabled={tutorialNavPending}
                >
                  {tutorialStepSafeIndex >= tutorialStepCount - 1 ? 'Bitir' : 'Sonraki'}
                </button>
                <button type="button" className="btn btn-danger" onClick={closeTutorial}>
                  Rehberi Kapat
                </button>
              </div>
            </div>
            <div className="tutorial-progress" aria-hidden="true">
              <span style={{ width: `${tutorialProgressPct}%` }} />
            </div>
            <h4>{tutorialCurrentStep?.title || 'Rehber'}</h4>
            <div className="tutorial-purpose-card">
              <span className="tutorial-purpose-media" aria-hidden="true">
                <img
                  src={tutorialStepImageSrc}
                  alt=""
                  onError={(event) => {
                    const node = event.currentTarget
                    if (node.dataset.fallbackApplied === '1') return
                    node.dataset.fallbackApplied = '1'
                    node.src = TUTORIAL_ASSISTANT_IMAGE_SRC
                  }}
                />
              </span>
              <div className="tutorial-purpose-copy">
                <small>Bu bölüm ne işe yarar?</small>
                <p className="tutorial-lead">{tutorialCurrentStep?.body || tutorialPurposeText || ''}</p>
                {tutorialPurposeText && tutorialPurposeText !== tutorialCurrentStep?.body ? (
                  <p className="tutorial-purpose-extra">
                    <strong>Hedef:</strong> {tutorialPurposeText}
                  </p>
                ) : null}
                {tutorialCurrentTargetLabel ? (
                  <p className="tutorial-target-hint">
                    <strong>Odak:</strong> {tutorialCurrentTargetLabel}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="tutorial-target-action-note">
              "Sonraki" veya "Geri" düğmesine bastığında rehber seni ilgili bölüme otomatik olarak yönlendirir.
            </p>
          </div>
        </div>
      </article>
    </section>
  )
}
