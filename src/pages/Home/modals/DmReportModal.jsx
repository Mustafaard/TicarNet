import {
  normalizeMojibakeText,
} from '../utils.js'

export function renderDmReportModal(hp) {
  const {
  busy,
  closeDmReportModal,
  dmReportMessages,
  dmReportModal,
  dmReportReasonLength,
  dmReportSelectedMessage,
  setDmReportModal,
  submitDmReportAction,
} = hp

  return (
    <section className="chat-report-overlay dm-report-overlay" role="dialog" aria-modal="true" onClick={closeDmReportModal}>
      <article className="chat-report-modal dm-report-modal" onClick={(event) => event.stopPropagation()}>
        <div className="chat-report-header">
          <h3>Özel Mesajı Bildir</h3>
          <button
            type="button"
            className="chat-report-close"
            onClick={closeDmReportModal}
            disabled={busy === 'dm-report'}
          >
            Kapat
          </button>
        </div>
        <p className="chat-report-question">
          {dmReportModal.targetUsername} ile konuşmandan bir mesaj seçin ve açıklama ekleyin.
        </p>
        <label className="dm-report-field">
          <span>Mesaj seç</span>
          <select
            className="dm-report-select"
            value={String(dmReportModal.selectedMessageId || '')}
            onChange={(event) => {
              const value = String(event.target.value || '').trim()
              setDmReportModal((prev) => (prev ? { ...prev, selectedMessageId: value } : prev))
            }}
            disabled={busy === 'dm-report'}
          >
            <option value="">Mesaj seçin...</option>
            {dmReportMessages.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <p className="chat-report-preview dm-report-preview">
          {normalizeMojibakeText(dmReportSelectedMessage?.text || 'Mesaj seçin...')}
        </p>
        <label className="dm-report-field">
          <span>Şikâyet açıklaması</span>
          <textarea
            className="dm-report-textarea"
            value={String(dmReportModal.reason || '')}
            onChange={(event) => {
              const value = String(event.target.value || '').slice(0, 500)
              setDmReportModal((prev) => (prev ? { ...prev, reason: value } : prev))
            }}
            placeholder="Küfür, tehdit, dolandırıcılık, spam vb."
            maxLength={500}
            disabled={busy === 'dm-report'}
          />
        </label>
        <p className="dm-report-hint">Bildirim, yönetici kayıtlarına iletilir.</p>
        <div className="chat-report-actions">
          <button
            type="button"
            className="chat-report-cancel"
            onClick={closeDmReportModal}
            disabled={busy === 'dm-report'}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="chat-report-confirm"
            onClick={() => { void submitDmReportAction() }}
            disabled={
              busy === 'dm-report' ||
              !String(dmReportModal.selectedMessageId || '').trim() ||
              dmReportReasonLength < 5
            }
          >
            {busy === 'dm-report' ? 'Gönderiliyor...' : 'Bildir'}
          </button>
        </div>
      </article>
    </section>
  )
}
