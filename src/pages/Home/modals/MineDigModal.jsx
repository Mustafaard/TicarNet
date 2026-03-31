import {
  factoryItemMeta,
  fmt,
  resolveMineImage,
} from '../utils.js'

export function renderMineDigModal(hp) {
  const {
    mineCollectResult,
    mineDigCollectedRef,
    mineDigCountdownSec,
    mineDigDurationForModal,
    mineDigModal,
    mineDigProgressPercent,
    setMineCollectResult,
    setMineDigModal,
  } = hp

  return (
    <section className="mine-dig-overlay" aria-modal="true" role="dialog">
      <article className="mine-dig-modal" onClick={(e) => e.stopPropagation()}>
        {mineCollectResult ? (
          <>
            <button
              type="button"
              className="mine-dig-modal-close"
              onClick={() => { setMineDigModal(null); setMineCollectResult(null); mineDigCollectedRef.current = false }}
              aria-label="Kapat"
            >
              Kapat
            </button>
            <h3 className="mine-dig-modal-title">Kazı tamamlandı!</h3>
            <p className="mine-dig-modal-done">Deponuza aktarıldı</p>
            <div className="mine-dig-modal-result">
              <img src={factoryItemMeta(mineCollectResult.itemId)?.icon || '/home/icons/depot/cash.webp'} alt="" />
              <strong>+{fmt(mineCollectResult.quantity)} {factoryItemMeta(mineCollectResult.itemId)?.label || mineCollectResult.itemId}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="mine-dig-modal-hero">
              <img src={resolveMineImage(mineDigModal.mine)} alt="" />
            </div>
            <h3 className="mine-dig-modal-title">Lütfen bekleyin</h3>
            <p className="mine-dig-modal-msg">Kazı yapılıyor... Sayfayı kapatmayın.</p>
            <div className="mine-dig-progress-wrap">
              <div className="mine-dig-progress" style={{ width: `${mineDigProgressPercent}%` }} />
            </div>
            <p className="mine-dig-countdown">Kalan süre <strong>{mineDigCountdownSec} sn</strong></p>
            <p className="mine-dig-note">Not: Süre dolmadan işlem tamamlanmaz. ({mineDigDurationForModal} saniye beklemeniz zorunludur.)</p>
          </>
        )}
      </article>
    </section>
  )
}
