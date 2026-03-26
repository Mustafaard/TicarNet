import { useEffect, useState } from 'react'
import ProgressBar from '../../components/ui/ProgressBar.jsx'
import './SplashPage.css'

const SPLASH_DURATION_MS = 2200

function getConnectionMessage(progress) {
  if (progress < 25) return 'Sunucu bağlantısı kuruluyor'
  if (progress < 50) return 'Pazar sistemi hazırlanıyor'
  if (progress < 75) return 'Veriler senkronize ediliyor'
  if (progress < 100) return 'Oyun dünyası yükleniyor'
  return 'Başlangıç tamamlandı'
}

function SplashPage({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [logoLoadError, setLogoLoadError] = useState(false)
  const connectionMessage = getConnectionMessage(progress)

  useEffect(() => {
    let cancelled = false
    let frameId = 0
    let completed = false
    const startTime = performance.now()

    const step = (now) => {
      if (cancelled) return

      const elapsed = Math.max(0, now - startTime)
      const nextProgress = Math.min(100, Math.floor((elapsed / SPLASH_DURATION_MS) * 100))

      setProgress((current) => (current === nextProgress ? current : nextProgress))

      if (nextProgress >= 100) {
        if (!completed && typeof onComplete === 'function') {
          completed = true
          onComplete()
        }
        return
      }

      frameId = requestAnimationFrame(step)
    }

    frameId = requestAnimationFrame(step)

    return () => {
      cancelled = true
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [onComplete])

  return (
    <main className="splash-page">
      <div className="splash-ambient" aria-hidden="true">
        <span className="ambient-orb orb-a" />
        <span className="ambient-orb orb-b" />
        <span className="ambient-orb orb-c" />
      </div>
      <div className="splash-overlay">
        <div className="brand-mark">
          <span className="brand-ring" aria-hidden="true" />
          {logoLoadError ? (
            <div className="brand-logo" aria-label="TicarNet Logosu">
              TN
            </div>
          ) : (
            <img
              className="brand-logo-image"
              src="/splash/logo.webp"
              alt="TicarNet Logosu"
              onError={() => setLogoLoadError(true)}
            />
          )}
        </div>
        <h1 className="brand-title">TicarNet Online</h1>
        <p className="brand-subtitle">Ticaret ağına bağlanıyorsunuz...</p>
        <div className="status-row">
          <p className="status-line">
            <span className="status-dot" />
            {connectionMessage}
          </p>
          <span className="status-badge">{progress < 100 ? 'Piyasa hazırlanıyor' : 'Giriş yapılıyor'}</span>
        </div>
        <ProgressBar progress={progress} />
      </div>
    </main>
  )
}

export default SplashPage
