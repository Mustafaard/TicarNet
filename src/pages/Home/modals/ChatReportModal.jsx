import {
  normalizeMojibakeText,
} from '../utils.js'

export function renderChatReportModal(hp) {
  const {
  busy,
  chatReportModal,
  closeChatReportModal,
  submitChatReportAction,
} = hp

  return (
    <section className="chat-report-overlay" role="dialog" aria-modal="true" onClick={closeChatReportModal}>
      <article className="chat-report-modal" onClick={(event) => event.stopPropagation()}>
        <div className="chat-report-header">
          <h3>Mesajı Bildir</h3>
          <button
            type="button"
            className="chat-report-close"
            onClick={closeChatReportModal}
            disabled={busy === 'chat-report'}
          >
            Kapat
          </button>
        </div>
        <p className="chat-report-question">Bu mesajı yetkililere bildirmek istiyor musun?</p>
        <p className="chat-report-preview">{normalizeMojibakeText(chatReportModal.text)}</p>
        <div className="chat-report-actions">
          <button
            type="button"
            className="chat-report-cancel"
            onClick={closeChatReportModal}
            disabled={busy === 'chat-report'}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="chat-report-confirm"
            onClick={() => { void submitChatReportAction() }}
            disabled={busy === 'chat-report'}
          >
            {busy === 'chat-report' ? 'Bildiriliyor...' : 'Evet, Bildir'}
          </button>
        </div>
      </article>
    </section>
  )
}
