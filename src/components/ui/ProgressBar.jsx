import './ProgressBar.css'

function ProgressBar({ progress }) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0))

  return (
    <div className="progress-wrapper">
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Yükleme ilerlemesi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgress}
      >
        <div className="progress-fill" style={{ width: `${safeProgress}%` }} />
        <span className="progress-glow" aria-hidden="true" />
      </div>
      <p className="progress-label">%{safeProgress}</p>
    </div>
  )
}

export default ProgressBar
