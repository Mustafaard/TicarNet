import {
  factoryItemMeta,
  fmt,
  mineDisplayName,
  mineOutputLabel,
  num,
  resolveMineImage,
} from '../utils.js'

export function renderMineConfirmModal(hp) {
  const {
    DEFAULT_MINE_DIG_DURATION_SEC,
    busy,
    mineConfirmModal,
    mineDigAction,
    premiumActive,
    setMineConfirmModal,
  } = hp

  return (
    <section className="mine-dig-overlay" aria-modal="true" role="dialog" onClick={() => setMineConfirmModal(null)}>
      <article className="mine-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="mine-confirm-title">{mineDisplayName(mineConfirmModal)}</h3>
        <div className="mine-confirm-hero">
          <img src={resolveMineImage(mineConfirmModal)} alt="" />
        </div>
        <div className="mine-confirm-details">
          <p className="mine-confirm-row">
            <span className="mine-confirm-label">Maliyet</span>
            <strong className="mine-confirm-value">
              <img src="/home/icons/depot/cash.webp" alt="" className="mine-confirm-row-icon" aria-hidden />
              {fmt(mineConfirmModal.costCash)} nakit
            </strong>
          </p>
          <p className="mine-confirm-row">
            <span className="mine-confirm-label">Kazanılacak kaynak</span>
            <strong className="mine-confirm-value">
              {premiumActive && (
                <span className="mine-confirm-2x" title="Premium: 2x kaynak">
                  <img src="/home/icons/depot/diamond.webp" alt="" className="mine-confirm-row-icon" aria-hidden />
                  2×
                </span>
              )}
              <img src={factoryItemMeta(mineConfirmModal.outputItemId)?.icon || '/home/icons/depot/cash.webp'} alt="" className="mine-confirm-row-icon" aria-hidden />
              {premiumActive ? mineConfirmModal.minOutput * 2 : mineConfirmModal.minOutput} – {premiumActive ? mineConfirmModal.maxOutput * 2 : mineConfirmModal.maxOutput} {mineOutputLabel(mineConfirmModal)} (rastgele)
            </strong>
          </p>
          <p className="mine-confirm-row">
            <span className="mine-confirm-label">Kazanılacak XP</span>
            <strong className="mine-confirm-value">
              <img src="/home/ui/hud/xp-icon.webp" alt="" className="mine-confirm-row-icon" aria-hidden />
              +{fmt(mineConfirmModal.xpPerCollect || 10)} XP
            </strong>
          </p>
        </div>
        <p className="mine-confirm-note">
          {premiumActive ? (
            <>
              <span className="mine-confirm-premium-note">
                <img src="/home/icons/depot/diamond.webp" alt="" className="mine-confirm-row-icon" aria-hidden />
                Premium aktif: Kazanacağın kaynak 2× olarak depoya aktarılır.
              </span>
              <br />
            </>
          ) : (
            'Premium ile kazı başına 2× kaynak kazanırsın. '
          )}
          Kazıyı başlattıktan sonra {Math.max(1, Math.trunc(num(DEFAULT_MINE_DIG_DURATION_SEC)))} saniyelik işlem gösterilir. Süre tamamlanınca kaynak otomatik olarak depoya aktarılır.
        </p>
        <div className="mine-confirm-footer">
          <div className="mine-confirm-actions">
            <button type="button" className="btn btn-primary mine-confirm-submit" onClick={() => { setMineConfirmModal(null); mineDigAction(mineConfirmModal.id) }} disabled={!mineConfirmModal.hasEnoughCash || Boolean(busy)}>
              Kazıyı Başlat
            </button>
            <button type="button" className="btn btn-ghost mine-confirm-cancel" onClick={() => setMineConfirmModal(null)}>Vazgeç</button>
          </div>
        </div>
      </article>
    </section>
  )
}
