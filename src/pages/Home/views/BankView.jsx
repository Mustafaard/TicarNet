import {
  BANK_HEADER_ICON_FALLBACK_SRC,
  BANK_HEADER_ICON_PRIMARY_SRC,
} from '../constants.js'
import {
  digitsOnly,
  fmt,
  fmtFixed,
  fmtTry,
  formatDateTime,
  num,
} from '../utils.js'
import {
  BankCountdownText,
} from '../ui-components.jsx'

export function renderBankView(hp) {
  const {
    bankBusyDepositKey,
    bankBusyTermClaimKey,
    bankBusyTermOpenKey,
    bankBusyWithdrawKey,
    bankDepositFeePreview,
    bankDepositFeeRatePctLabel,
    bankDepositNetPreview,
    bankDepositSubmitBlocked,
    bankForm,
    bankHistoryRows,
    bankMainBalance,
    bankSelectedTermDays,
    bankTermClaimSubmitBlocked,
    bankTermLive,
    bankTermLiveEstimatedProfit,
    bankTermLiveExpectedPayout,
    bankTermLivePrincipal,
    bankTermLiveTotalRatePct,
    bankTermMatured,
    bankTermMaxAllowedNow,
    bankTermMaxPrincipal,
    bankTermOpenSubmitBlocked,
    bankTermOpenedAtLabel,
    bankTermOptions,
    bankTermPayoutPreview,
    bankTermProfitPreview,
    bankTermRateCapPct,
    bankTermRemainingLiveMs,
    bankTermStatusLabel,
    bankTermTotalRatePct,
    bankTermUnlockAtLabel,
    bankTotalAssetsNow,
    bankTransferMinAmount,
    bankWalletNow,
    bankWithdrawFeePreview,
    bankWithdrawNetPreview,
    bankWithdrawSubmitBlocked,
    busy,
    handleBankCountdownElapsed,
    openTab,
    runBankDepositAction,
    runBankTermClaimAction,
    runBankTermOpenAction,
    runBankWithdrawAction,
    setBankForm,
  } = hp

return (
  <section className="panel-stack home-sections bank-screen">
    <article className="card bank-panel">
      <div className="bank-hero">
        <div className="bank-hero-main">
          <span className="bank-hero-icon-wrap">
            <img
              src={BANK_HEADER_ICON_PRIMARY_SRC}
              alt="Banka"
              className="bank-hero-icon"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  const fallback = node.nextElementSibling
                  if (fallback) fallback.style.display = 'inline-flex'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = BANK_HEADER_ICON_FALLBACK_SRC
              }}
            />
            <span className="bank-hero-icon-fallback" style={{ display: 'none' }} aria-hidden>🏦</span>
          </span>
          <div className="bank-hero-copy">
            <h3 className="bank-hero-title">Merkez Bankası</h3>
            <p className="bank-hero-subtitle">Paranı güvende biriktir, istersen vadeli faizle büyüt.</p>
          </div>
        </div>
        <div className="bank-hero-actions">
          <span className={`bank-status-pill ${bankTermMatured ? 'is-ready' : bankTermLive.active ? 'is-active' : ''}`.trim()}>
            {bankTermStatusLabel}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void openTab('home')}
            disabled={Boolean(busy)}
          >
            Şehir
          </button>
        </div>
      </div>

      <div className="bank-stats-grid">
        <article className="bank-stat-card">
          <small>Nakit</small>
          <strong>{fmt(bankWalletNow)}</strong>
          <span>Cüzdandaki kullanılabilir tutar</span>
        </article>
        <article className="bank-stat-card is-strong">
          <small>Banka</small>
          <strong>{fmt(bankMainBalance)}</strong>
          <span>Banka hesabındaki hazır bakiye</span>
        </article>
        <article className={`bank-stat-card ${bankTermLive.active ? 'is-term' : ''}`.trim()}>
          <small>Vadeli</small>
          <strong>{bankTermLive.active ? fmt(bankTermLiveExpectedPayout) : fmt(0)}</strong>
          <span>
            {bankTermLive.active
              ? `${fmt(Math.max(1, Math.trunc(num(bankTermLive.days || 0))))} gün vadeli`
              : 'Aktif vadeli hesap yok'}
          </span>
        </article>
        <article className="bank-stat-card">
          <small>Toplam</small>
          <strong>{fmt(bankTotalAssetsNow)}</strong>
          <span>Nakit + banka + vadeli ana para</span>
        </article>
      </div>

      <div className="bank-ops-grid">
        <section className="bank-block">
          <div className="bank-block-head">
            <h4>Nakitten Bankaya Yatır</h4>
            <span className="bank-block-tag">Komisyon %5</span>
          </div>
          <p className="bank-block-subtitle">Kasadaki nakdi bankaya aktarırken %{fmtFixed(bankDepositFeeRatePctLabel, 2)} komisyon kesilir.</p>
          <label className="bank-field-label" htmlFor="bank-deposit-amount">Yatırılacak Miktar</label>
          <div className="bank-field-row">
            <input
              id="bank-deposit-amount"
              className="bank-field-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Örn: 50.000"
              value={bankForm.depositAmount}
              onChange={(event) => {
                const digits = digitsOnly(event.target.value, 16)
                setBankForm((prev) => ({ ...prev, depositAmount: digits }))
              }}
              disabled={Boolean(busy)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm bank-max-btn"
              onClick={() => setBankForm((prev) => ({ ...prev, depositAmount: bankWalletNow > 0 ? String(bankWalletNow) : '' }))}
              disabled={Boolean(busy) || bankWalletNow < bankTransferMinAmount}
            >
              Maks
            </button>
          </div>
          <div className="bank-preview-grid">
            <article className="bank-preview-card">
              <small>Komisyon</small>
              <strong>{fmtTry(bankDepositFeePreview)}</strong>
            </article>
            <article className="bank-preview-card">
              <small>Bankaya Geçecek (Net)</small>
              <strong>{fmtTry(bankDepositNetPreview)}</strong>
            </article>
          </div>
          <button
            type="button"
            className="btn btn-success full"
            onClick={() => void runBankDepositAction()}
            disabled={bankDepositSubmitBlocked}
          >
            {busy === bankBusyDepositKey ? 'Aktarılıyor...' : 'Bankaya Yatır'}
          </button>
        </section>

        <section className="bank-block">
          <div className="bank-block-head">
            <h4>Bankadan Nakit Çek</h4>
            <span className="bank-block-tag">Komisyonsuz Çekim</span>
          </div>
          <p className="bank-block-subtitle">
            Çekimlerde komisyon kesilmez. Girilen tutarın tamamı nakit hesabına geçer.
          </p>
          <label className="bank-field-label" htmlFor="bank-withdraw-amount">Çekilecek Miktar</label>
          <div className="bank-field-row">
            <input
              id="bank-withdraw-amount"
              className="bank-field-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Örn: 100.000"
              value={bankForm.withdrawAmount}
              onChange={(event) => {
                const digits = digitsOnly(event.target.value, 16)
                setBankForm((prev) => ({ ...prev, withdrawAmount: digits }))
              }}
              disabled={Boolean(busy)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm bank-max-btn"
              onClick={() => setBankForm((prev) => ({ ...prev, withdrawAmount: bankMainBalance > 0 ? String(bankMainBalance) : '' }))}
              disabled={Boolean(busy) || bankMainBalance < bankTransferMinAmount}
            >
              Maks
            </button>
          </div>
          <div className="bank-preview-grid">
            <article className="bank-preview-card">
              <small>Komisyon</small>
              <strong>{fmtTry(bankWithdrawFeePreview)}</strong>
            </article>
            <article className="bank-preview-card">
              <small>Net Geçecek (Nakit)</small>
              <strong>{fmtTry(bankWithdrawNetPreview)}</strong>
            </article>
          </div>
          <button
            type="button"
            className="btn btn-warning full"
            onClick={() => void runBankWithdrawAction()}
            disabled={bankWithdrawSubmitBlocked}
          >
            {busy === bankBusyWithdrawKey ? 'Çekiliyor...' : 'Bankadan Çek'}
          </button>
        </section>
      </div>

      <section className="bank-block bank-block-term">
        <div className="bank-block-head">
          <h4>Vadeli Mevduat</h4>
          <span className="bank-block-tag">Kilitle ve Büyüt</span>
        </div>
        <p className="bank-block-subtitle">
          Bankadaki paranı seçtiğin gün kadar kilitle. Seçili plan: {fmt(bankSelectedTermDays)} gün, toplam %{fmtFixed(bankTermTotalRatePct, 0)} getiri.
          Faiz üst sınırı %{fmtFixed(bankTermRateCapPct, 0)} ve maksimum vadeli anapara {fmtTry(bankTermMaxPrincipal)}.
        </p>

        <div className="bank-term-form-grid">
          <div>
            <label className="bank-field-label" htmlFor="bank-term-amount">Faize Yatırılacak Miktar</label>
            <input
              id="bank-term-amount"
              className="bank-field-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Örn: 250.000"
              value={bankForm.termAmount}
              onChange={(event) => {
                const digits = digitsOnly(event.target.value, 16)
                setBankForm((prev) => ({ ...prev, termAmount: digits }))
              }}
              disabled={Boolean(busy) || Boolean(bankTermLive.active)}
            />
            <p className="bank-field-hint">
              Üst limit: {fmtTry(bankTermMaxPrincipal)} · Anlık yatırılabilir: {fmtTry(bankTermMaxAllowedNow)}
            </p>
          </div>
          <div>
            <label className="bank-field-label" htmlFor="bank-term-days">Vade (Gün)</label>
            <select
              id="bank-term-days"
              className="bank-field-input bank-term-select"
              value={String(bankSelectedTermDays)}
              onChange={(event) => {
                const safeDays = Math.max(1, Math.trunc(num(event.target.value || 1)))
                setBankForm((prev) => ({ ...prev, termDays: String(safeDays) }))
              }}
              disabled={Boolean(busy) || Boolean(bankTermLive.active)}
            >
              {bankTermOptions.map((option) => (
                <option key={`bank-term-option-${option.days}`} value={option.days}>
                  {`${fmt(option.days)} gün · günlük %${fmtFixed(option.dailyRatePct, 0)} · toplam %${fmtFixed(option.totalRatePct, 0)}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bank-preview-grid bank-preview-grid-term">
          <article className="bank-preview-card">
            <small>Tahmini Toplam Ödeme</small>
            <strong>{fmtTry(bankTermPayoutPreview)}</strong>
          </article>
          <article className="bank-preview-card is-positive">
            <small>Tahmini Kar</small>
            <strong>{fmtTry(bankTermProfitPreview)}</strong>
          </article>
        </div>

        <div className="bank-term-actions">
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => void runBankTermOpenAction()}
            disabled={bankTermOpenSubmitBlocked}
          >
            {busy === bankBusyTermOpenKey ? 'Vadeli Açılıyor...' : 'Faize Yatır'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setBankForm((prev) => ({ ...prev, termAmount: bankTermMaxAllowedNow > 0 ? String(bankTermMaxAllowedNow) : '' }))}
            disabled={Boolean(busy) || bankTermMaxAllowedNow < bankTransferMinAmount || Boolean(bankTermLive.active)}
          >
            Hızlı Doldur
          </button>
        </div>

        <article className={`bank-term-live-card ${bankTermLive.active ? 'is-active' : ''}`.trim()}>
          <div className="bank-term-live-head">
            <strong>{bankTermLive.active ? 'Aktif Vadeli Hesap' : 'Aktif Vadeli Hesap Yok'}</strong>
            <span className={`bank-status-pill ${bankTermMatured ? 'is-ready' : bankTermLive.active ? 'is-active' : ''}`.trim()}>
              <BankCountdownText
                active={Boolean(bankTermLive.active)}
                initialRemainingMs={bankTermRemainingLiveMs}
                onElapsed={handleBankCountdownElapsed}
              />
            </span>
          </div>

          {bankTermLive.active ? (
            <>
              <div className="bank-term-live-grid">
                <article>
                  <small>Ana Para</small>
                  <strong>{fmtTry(bankTermLivePrincipal)}</strong>
                  <span>Vade: {fmt(Math.max(1, Math.trunc(num(bankTermLive.days || 0))))} gün</span>
                </article>
                <article>
                  <small>Beklenen Ödeme</small>
                  <strong>{fmtTry(bankTermLiveExpectedPayout)}</strong>
                  <span>Toplam %{fmtFixed(bankTermLiveTotalRatePct, 0)} getiri (maksimum %{fmtFixed(bankTermRateCapPct, 0)})</span>
                </article>
                <article>
                  <small>Tahmini Kar</small>
                  <strong>{fmtTry(bankTermLiveEstimatedProfit)}</strong>
                  <span>Günlük %{fmtFixed(num(bankTermLive.dailyRatePct || 0), 0)} faiz</span>
                </article>
                <article>
                  <small>Açılış / Bitiş</small>
                  <strong>{bankTermOpenedAtLabel}</strong>
                  <span>{bankTermUnlockAtLabel}</span>
                </article>
              </div>
              <button
                type="button"
                className="btn btn-success full"
                onClick={() => void runBankTermClaimAction()}
                disabled={bankTermClaimSubmitBlocked}
              >
                {busy === bankBusyTermClaimKey ? 'Tahsil Ediliyor...' : 'Vadeyi Tahsil Et'}
              </button>
            </>
          ) : (
            <p className="bank-empty-state">
              Şu an aktif vadeli işlemin yok. Miktar girip vade seçerek anında açabilirsin.
            </p>
          )}
        </article>
      </section>

      <section className="bank-block bank-block-history">
        <div className="bank-block-head">
          <h4>Vadeli Geçmişi</h4>
          <span className="bank-block-tag">Son İşlemler</span>
        </div>
        {bankHistoryRows.length === 0 ? (
          <p className="bank-empty-state">Henüz tamamlanan vadeli işlemin yok.</p>
        ) : (
          <div className="bank-history-list">
            {bankHistoryRows.slice(0, 15).map((row, index) => {
              const claimedAtLabel = formatDateTime(row?.claimedAt || row?.unlockAt || row?.openedAt || '')
              const rowPrincipal = Math.max(0, Math.trunc(num(row?.principal || 0)))
              const rowPayout = Math.max(0, Math.trunc(num(row?.payout || 0)))
              const rowProfit = Math.max(0, Math.trunc(num(row?.profit || (rowPayout - rowPrincipal))))
              const rowDays = Math.max(1, Math.trunc(num(row?.days || 1)))
              const rowDailyPct = Math.max(0, num(row?.dailyRatePct || 0))
              const rowTotalPct = Math.max(
                0,
                Math.min(
                  bankTermRateCapPct,
                  num(row?.totalRatePct || (rowDailyPct * rowDays)),
                ),
              )
              return (
                <article key={`${String(row?.id || 'history')}-${index}`} className="bank-history-row">
                  <div className="bank-history-head">
                    <strong>{`${fmt(rowDays)} gün · günlük %${fmtFixed(rowDailyPct, 0)} · toplam %${fmtFixed(rowTotalPct, 0)}`}</strong>
                    <span>{claimedAtLabel}</span>
                  </div>
                  <div className="bank-history-grid">
                    <p>Ana Para <strong>{fmtTry(rowPrincipal)}</strong></p>
                    <p>Net Ödeme <strong>{fmtTry(rowPayout)}</strong></p>
                    <p className="is-positive">Kar <strong>{fmtTry(rowProfit)}</strong></p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </article>
  </section>
)
}
