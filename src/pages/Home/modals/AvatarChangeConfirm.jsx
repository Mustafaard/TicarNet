import {
  AVATAR_CHANGE_COST_DIAMONDS,
} from '../constants.js'
import {
  fmt,
  num,
} from '../utils.js'

export function renderAvatarChangeConfirm(hp) {
  const {
  confirmAvatarFilePicker,
  overview,
  setAvatarChangeConfirmOpen,
} = hp

  return (
    <section
      className="avatar-confirm-overlay"
      aria-modal="true"
      role="dialog"
      onClick={() => setAvatarChangeConfirmOpen(false)}
    >
      <article className="avatar-confirm-modal" onClick={(event) => event.stopPropagation()}>
        <h3>Avatar Değişim Onayı</h3>
        <p>
          Bu işlem için <strong>{fmt(AVATAR_CHANGE_COST_DIAMONDS)} elmas</strong> harcanacak.
          Devam etmek istiyor musunuz?
        </p>
        <p className="avatar-confirm-balance">
          Mevcut elmasınız: <strong>{fmt(Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0))))}</strong>
        </p>
        <div className="avatar-confirm-actions">
          <button type="button" className="btn btn-primary" onClick={confirmAvatarFilePicker}>
            Evet
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setAvatarChangeConfirmOpen(false)}>
            Hayır
          </button>
        </div>
      </article>
    </section>
  )
}
