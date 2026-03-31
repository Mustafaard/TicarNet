import { renderPremiumSection } from './PremiumSection.jsx'
import { renderDiamondMarketSection } from './DiamondMarketSection.jsx'
import { fmt, fmtLevel, num } from '../utils.js'
import { DEFAULT_CHAT_AVATAR, PROFILE_THEME_OPTIONS } from '../constants.js';

export function renderProfileContent(hp) {
  const {
  _loadLeague,
  accountEmail,
  accountLastLoginAt,
  applySettingsTheme,
  avatarDisplaySrc,
  avatarIsGif,
  avatarSrc,
  avatarTypeLabel,
  busy,
  cGold,
  deleteOwnAccountAction,
  isStaffUser,
  leaderboardHighlightKey,
  leaderboardListRows,
  leaderboardMeRow,
  leaderboardMetricSafe,
  leaderboardPageCount,
  leaderboardPageSafe,
  leaderboardRowDomId,
  leaderboardRowsResolved,
  leaderboardSeasonReset,
  leaderboardTotalCount,
  lv,
  maskedAccountId,
  name,
  navTheme,
  onLogout,
  openProfileModal,
  openTab,
  profileAccountForm,
  profileAccountUsername,
  profileTab,
  role,
  selectedThemeOption,
  sendSupportRequestAction,
  setAvatarFailedSrc,
  setLeaderboardPage,
  setLeaderboardSearchError,
  setLeaderboardSearchOpen,
  setProfileAccountForm,
  setSeasonRewardsOpen,
  setSettingsThemeModalOpen,
  setSupportForm,
  settingsThemeModalOpen,
  startTutorial,
  supportDescriptionLength,
  supportForm,
  supportTitleLength,
  triggerAvatarFilePicker,
  updateProfilePasswordAction,
  updateProfileUsernameAction,
} = hp


  const premiumContent = renderPremiumSection(hp)
  const diamondMarketContent = renderDiamondMarketSection(hp)

const profileContent = profileTab === 'premium'
  ? premiumContent
  : profileTab === 'diamond-market'
    ? diamondMarketContent
  : profileTab === 'profile'
    ? (
    <article className="card settings-screen-card">
      <header className="settings-screen-head">
        <h3>Ayarlar</h3>
        <p>Hesabını yönet • kullanıcı adı, şifre, avatar, e-posta, tema ve destek talebi.</p>
      </header>

      <section className="settings-section-card">
        <h4>1) Kullanıcı Adı (25 Elmas)</h4>
        <label className="settings-field-label" htmlFor="settings-username-input">Yeni kullanıcı adı</label>
        <input
          id="settings-username-input"
          className="qty-input settings-input"
          type="text"
          value={profileAccountForm.username}
          onChange={(event) => {
            const normalized = String(event.target.value || '')
              .replace(/[^A-Za-z0-9\u00c7\u011e\u0130\u00d6\u015e\u00dc\u00e7\u011f\u0131\u00f6\u015f\u00fc ]/g, '')
              .replace(/\s{2,}/g, ' ')
              .replace(/^\s+/, '')
              .slice(0, 15)
            setProfileAccountForm((prev) => ({ ...prev, username: normalized }))
          }}
          placeholder={profileAccountUsername}
          maxLength={15}
          autoComplete="username"
        />
        <p className="settings-helper-text">
          3-15 karakter • harf/rakam/boşluk • emoji/özel karakter kullanılamaz.
        </p>
        <p className="settings-helper-text">
          Ücret: 25 Elmas • Mevcut Elmas: {fmt(cGold)}
        </p>
        <button
          type="button"
          className="btn btn-primary settings-action-btn"
          onClick={() => void updateProfileUsernameAction()}
          disabled={Boolean(busy)}
        >
          {busy === 'profile-username' ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </section>

      <section className="settings-section-card">
        <h4>2) Şifre Güncelle</h4>
        <label className="settings-field-label" htmlFor="settings-password-new">Yeni şifre</label>
        <input
          id="settings-password-new"
          className="qty-input settings-input"
          type="password"
          value={profileAccountForm.newPassword}
          onChange={(event) =>
            setProfileAccountForm((prev) => ({ ...prev, newPassword: event.target.value }))
          }
          placeholder="Yeni şifre"
          autoComplete="new-password"
        />
        <label className="settings-field-label" htmlFor="settings-password-confirm">Yeni şifre (tekrar)</label>
        <input
          id="settings-password-confirm"
          className="qty-input settings-input"
          type="password"
          value={profileAccountForm.confirmPassword}
          onChange={(event) =>
            setProfileAccountForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
          }
          placeholder="Yeni şifre (tekrar)"
          autoComplete="new-password"
        />
        <p className="settings-helper-text">
          Güvenlik kuralı: 8-64 karakter, en az bir küçük harf ve bir rakam.
          Mevcut şifre sorulmaz.
        </p>
        <button
          type="button"
          className="btn btn-primary settings-action-btn"
          onClick={() => void updateProfilePasswordAction()}
          disabled={Boolean(busy)}
        >
          {busy === 'profile-password' ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </section>

      <section className="settings-section-card">
        <h4>3) Avatar Bilgileri</h4>
        <div className="settings-avatar-row">
          <div className="profile-avatar-update-preview">
            <img
              className={avatarIsGif ? 'is-gif' : ''}
              src={avatarDisplaySrc}
              alt={name}
              onError={() => {
                if (avatarSrc !== DEFAULT_CHAT_AVATAR) setAvatarFailedSrc(avatarSrc)
              }}
            />
          </div>
          <div className="settings-avatar-copy">
            <strong>{profileAccountUsername}</strong>
            <small>{fmtLevel(lv.level)}</small>
            <small>Avatar Türü: {avatarTypeLabel}</small>
            <small className="settings-avatar-note">GIF desteği aktif</small>
          </div>
        </div>
        <p className="settings-helper-text">
          Avatarını PNG, JPG, WEBP veya GIF olarak güncelleyebilirsin (en fazla 2 MB).
        </p>
        <p className="settings-helper-text">
          Ücret: 10 Elmas • Mevcut Elmas: {fmt(cGold)}
        </p>
        <div className="settings-inline-actions">
          <button
            type="button"
            className="btn btn-accent settings-inline-btn"
            onClick={triggerAvatarFilePicker}
            disabled={Boolean(busy)}
          >
            Dosyadan Yükle
          </button>
        </div>
      </section>

      <section className="settings-section-card">
        <h4>4) Destek Talebi</h4>
        <label className="settings-field-label" htmlFor="settings-support-title">Destek başlığı</label>
        <input
          id="settings-support-title"
          className="qty-input settings-input"
          type="text"
          value={supportForm.title}
          onChange={(event) =>
            setSupportForm((prev) => ({ ...prev, title: String(event.target.value || '').slice(0, 120) }))
          }
          placeholder="Örn: Satın alma sorunu"
          maxLength={120}
        />
        <label className="settings-field-label" htmlFor="settings-support-description">Destek açıklaması</label>
        <textarea
          id="settings-support-description"
          className="settings-textarea"
          value={supportForm.description}
          onChange={(event) =>
            setSupportForm((prev) => ({ ...prev, description: String(event.target.value || '').slice(0, 2500) }))
          }
          placeholder="Sorunu detaylı yaz (en az 10 karakter)..."
          rows={5}
        />
        <div className="profile-input-meta">
          <span className="profile-input-counter">{supportTitleLength}/120 başlık</span>
          <span className="profile-input-counter-hint">{supportDescriptionLength}/2500 açıklama</span>
        </div>
        <button
          type="button"
          className="btn btn-primary settings-action-btn"
          onClick={() => void sendSupportRequestAction()}
          disabled={Boolean(busy)}
        >
          {busy === 'support-request' ? 'Gönderiliyor...' : 'Destek Gönder'}
        </button>
      </section>

      <section className="settings-section-card">
        <h4>5) Tema Seç</h4>
        <div className="settings-theme-current">
          <span className="settings-theme-icon" aria-hidden="true">
            <img
              src="/home/icons/custom/tema.webp"
              alt=""
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') return
                node.dataset.fallbackApplied = '1'
                node.src = '/home/icons/v2/settings.png'
              }}
            />
          </span>
          <div className="settings-theme-copy">
            <strong>Seçili: {selectedThemeOption?.label || 'Varsayılan Tema'}</strong>
            <small>{selectedThemeOption?.description || 'Klasik oyun görünümü'}</small>
          </div>
          <button
            type="button"
            className="btn btn-primary settings-inline-btn"
            onClick={() => setSettingsThemeModalOpen(true)}
          >
            Seç
          </button>
        </div>
        <p className="settings-helper-text">
          Seçimin kaydedildiğinde tüm oyun görünümü güncellenir. Eski görünüme dönmek için
          <strong> Varsayılan Tema</strong> seçebilirsin.
        </p>
      </section>

      <section className="settings-section-card settings-security-card">
        <h4>6) Hesap Güvenliği ve Oturum</h4>
        <div className="settings-security-meta" role="group" aria-label="Hesap bilgileri">
          <p className="settings-security-row">
            <span className="settings-security-label">E-posta</span>
            <strong>{accountEmail}</strong>
          </p>
          <p className="settings-security-row">
            <span className="settings-security-label">Son giriş</span>
            <strong>{accountLastLoginAt}</strong>
          </p>
          <p className="settings-security-row">
            <span className="settings-security-label">Hesap kimliği</span>
            <strong>{maskedAccountId}</strong>
          </p>
        </div>
        <div className="settings-security-actions" role="group" aria-label="Oturum işlemleri">
          <button
            type="button"
            className="btn btn-ghost settings-action-btn"
            onClick={async () => {
              startTutorial()
              await openTab('home', { tab: 'home' })
            }}
            disabled={Boolean(busy)}
          >
            Oyun Rehberini Yeniden Başlat
          </button>
          {isStaffUser ? (
            <button
              type="button"
              className="btn btn-primary settings-action-btn"
              onClick={() => window.location.assign('/admin')}
              disabled={Boolean(busy)}
            >
              {role === 'admin' ? 'Admin Paneline Geç' : 'Moderatör Paneline Geç'}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-accent settings-action-btn profile-logout-action"
            onClick={() => onLogout('Güvenli çıkış yapıldı. Tekrar görüşmek üzere.')}
            disabled={Boolean(busy)}
          >
            Güvenli Çıkış Yap
          </button>
        </div>
      </section>

      <section className="settings-section-card settings-danger-card">
        <h4>7) Hesabı Kalıcı Sil</h4>
        <p className="settings-danger-text">
          Bu işlem geri alınamaz. Hesabın, envanterin, mesajların ve ilişkili oyun verilerin kalıcı olarak silinir.
        </p>
        <label className="settings-field-label" htmlFor="settings-account-delete-email">Kayıtlı e-postanı tekrar gir</label>
        <input
          id="settings-account-delete-email"
          className="qty-input settings-input"
          type="email"
          value={profileAccountForm.deleteEmail}
          onChange={(event) => {
            setProfileAccountForm((prev) => ({ ...prev, deleteEmail: String(event.target.value || '').slice(0, 120) }))
          }}
          placeholder="Kayıtlı e-posta adresin"
          autoComplete="email"
        />
        <label className="settings-field-label" htmlFor="settings-account-delete-password">Şifreni tekrar gir</label>
        <input
          id="settings-account-delete-password"
          className="qty-input settings-input"
          type="password"
          value={profileAccountForm.deletePassword}
          onChange={(event) => {
            setProfileAccountForm((prev) => ({ ...prev, deletePassword: String(event.target.value || '').slice(0, 128) }))
          }}
          placeholder="Mevcut şifre"
          autoComplete="current-password"
        />
        <button
          type="button"
          className="btn btn-danger settings-action-btn"
          onClick={() => void deleteOwnAccountAction()}
          disabled={Boolean(busy)}
        >
          {busy === 'profile-delete-account' ? 'Hesap Siliniyor...' : 'Hesabı Kalıcı Sil'}
        </button>
      </section>

      {settingsThemeModalOpen ? (
        <section className="settings-theme-overlay" onClick={() => setSettingsThemeModalOpen(false)}>
          <article className="settings-theme-modal" onClick={(event) => event.stopPropagation()}>
            <header className="settings-theme-modal-head">
              <h5>Tema Seç</h5>
              <button
                type="button"
                className="btn btn-small settings-theme-close"
                onClick={() => setSettingsThemeModalOpen(false)}
              >
                Kapat
              </button>
            </header>
            <div className="settings-theme-modal-list">
              {PROFILE_THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`settings-theme-option${navTheme === option.id ? ' is-active' : ''}`}
                  onClick={() => applySettingsTheme(option.id)}
                >
                  <span className="settings-theme-option-copy">
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span className="settings-theme-option-state">
                    {navTheme === option.id ? 'Seçili' : 'Seç'}
                  </span>
                </button>
              ))}
            </div>
            <p className="settings-theme-modal-note">
              Seçimin kaydedilince tema güncellenir. Eski görünüm için Varsayılan Tema'yı seç.
            </p>
          </article>
        </section>
      ) : null}
    </article>
    )
    : profileTab === 'leaderboard'
      ? (
      <article className="card leaderboard-card leaderboard-card-modern">
        <div className="leaderboard-top">
          <div className="leaderboard-title">
            <h3>SIRALAMA</h3>
            <p className="leaderboard-head-note">Sezon sıralaması. Her ayın 1'inde 00:00 (TR) puanlar sıfırlanır.</p>
          </div>
          <div className="leaderboard-top-actions">
            <button type="button" className="leaderboard-search-btn" onClick={() => {
              setLeaderboardSearchError('')
              setLeaderboardSearchOpen(true)
              window.setTimeout(() => {
                const input = document.getElementById('leaderboard-search-input')
                if (input && typeof input.focus === 'function') input.focus()
              }, 30)
            }}>
              Oyuncu Ara
            </button>
          </div>
        </div>

        <div className="leaderboard-hero-row">
          <section className="leaderboard-countdown-card" aria-label="Aylık sezon bitimine kalan">
            <p className="leaderboard-countdown-title">AYLIK SEZON BİTİMİNE KALAN</p>
            <p className="leaderboard-countdown-sub">Ayın 1'i 00:00 (TR) sıfırlanır</p>
            <div className="leaderboard-countdown-grid">
              <div className="leaderboard-countdown-slot"><strong>{String(leaderboardSeasonReset.days).padStart(2, '0')}</strong><span>GÜN</span></div>
              <div className="leaderboard-countdown-slot"><strong>{String(leaderboardSeasonReset.hours).padStart(2, '0')}</strong><span>SAAT</span></div>
              <div className="leaderboard-countdown-slot"><strong>{String(leaderboardSeasonReset.minutes).padStart(2, '0')}</strong><span>DAKİKA</span></div>
              <div className="leaderboard-countdown-slot"><strong>{String(leaderboardSeasonReset.seconds).padStart(2, '0')}</strong><span>SANİYE</span></div>
            </div>
          </section>

          <button
            type="button"
            className="leaderboard-rewards-btn"
            onClick={async () => {
              await _loadLeague().catch(() => {})
              setSeasonRewardsOpen(true)
            }}
          >
            🎁 Ödüller
          </button>
        </div>

        {leaderboardRowsResolved.length ? (
          <>
            {leaderboardMeRow ? (
              <div className="leaderboard-me-bar">
                <span>Senin Sıran: <strong>#{fmt(leaderboardMeRow.rank)}</strong></span>
                <span className="leaderboard-me-right" title={`Sezon Puanı: ${fmt(leaderboardMeRow.value)}`}>Sezon Puanı: {fmt(leaderboardMeRow.value)}</span>
              </div>
            ) : null}
            <div className="leaderboard-pager">
              <span className="leaderboard-pager-meta">Toplam {fmt(leaderboardTotalCount)} kayıt ⬢ Sayfa {fmt(leaderboardPageSafe)} / {fmt(leaderboardPageCount)}</span>
              <div className="leaderboard-pager-actions">
                <button type="button" className="leaderboard-pager-btn" onClick={() => setLeaderboardPage(1)} disabled={leaderboardPageSafe <= 1}>İlk</button>
                <button type="button" className="leaderboard-pager-btn" onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))} disabled={leaderboardPageSafe <= 1}>← Önceki</button>
                <button type="button" className="leaderboard-pager-btn is-primary" onClick={() => setLeaderboardPage((p) => Math.min(leaderboardPageCount, p + 1))} disabled={leaderboardPageSafe >= leaderboardPageCount}>Sonraki →</button>
                <button type="button" className="leaderboard-pager-btn" onClick={() => setLeaderboardPage(leaderboardPageCount)} disabled={leaderboardPageSafe >= leaderboardPageCount}>Son</button>
              </div>
            </div>
            <div className="leaderboard-table-wrap">
              <ul className="simple-list leaderboard-list-modern">
                {leaderboardListRows.map((entry) => {
                  const playerLabel = entry.displayName || entry.username || 'Oyuncu'
                  const domId = leaderboardRowDomId(leaderboardMetricSafe, entry)
                  const isHighlighted = Boolean(leaderboardHighlightKey && leaderboardHighlightKey === domId)
                  const rank = Math.max(1, Math.trunc(num(entry.rank || 1)))
                  const rankToneClass = rank === 1 ? ' is-rank-1' : rank === 2 ? ' is-rank-2' : rank === 3 ? ' is-rank-3' : ''
                  const rankIconSrc =
                    rank === 1 ? '/home/icons/leaderboard/rank-1.webp'
                    : rank === 2 ? '/home/icons/leaderboard/rank-2.webp'
                    : rank === 3 ? '/home/icons/leaderboard/rank-3.webp'
                    : ''
                  return (
                    <li
                      id={domId}
                      key={`leader-row-${leaderboardMetricSafe}-${entry.userId || entry.username}-${entry.rank}`}
                      className={`leaderboard-row-modern${entry.isMe ? ' is-me' : ''}${isHighlighted ? ' is-highlighted' : ''}${rankToneClass}`}
                    >
                      <div className="leaderboard-row-main">
                        <span className={`leaderboard-rank-badge${rankIconSrc ? ' has-rank-icon' : ''}`} aria-label={`Sıra ${rank}`}>
                          {rankIconSrc ? (
                            <img
                              src={rankIconSrc}
                              alt={`${rank}. sıra`}
                              className="leaderboard-rank-icon"
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ) : (
                            rank
                          )}
                        </span>
                        <div
                          className="leaderboard-player-cell"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (!entry.userId) return
                            void openProfileModal(entry.userId, {
                              username: entry.username,
                              displayName: entry.displayName || entry.username,
                              avatarUrl: entry.avatarUrl,
                              level: entry.level,
                              role: entry.role,
                              roleLabel: entry.roleLabel,
                              premium: entry.premium,
                              disallowSelf: true,
                              selfBlockedMessage: 'Sıralamada kendi profilini açamazsın. Kendi profiline şehir ekranından bakabilirsin.',
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (!entry.userId) return
                              void openProfileModal(entry.userId, {
                                username: entry.username,
                                displayName: entry.displayName || entry.username,
                                avatarUrl: entry.avatarUrl,
                                level: entry.level,
                                role: entry.role,
                                roleLabel: entry.roleLabel,
                                premium: entry.premium,
                                disallowSelf: true,
                                selfBlockedMessage: 'Sıralamada kendi profilini açamazsın. Kendi profiline şehir ekranından bakabilirsin.',
                              })
                            }
                          }}
                        >
                          <img
                            src={entry.avatarUrl || '/splash/logo.png'}
                            alt={playerLabel}
                            className="leaderboard-row-avatar"
                            onError={(event) => {
                              event.currentTarget.src = '/splash/logo.png'
                            }}
                          />
                          <div className="leaderboard-player-meta">
                            <div className="leaderboard-username">
                              {playerLabel}
                              {entry.isMe ? ' (Sen)' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="leaderboard-score-block">
                        <strong className="leaderboard-row-score" title={`${fmt(entry.value)} sezon puanı`}>
                        {fmt(entry.value)}
                        </strong>
                        <span className="leaderboard-row-score-label">
                        Sezon Puanı
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        ) : (
          <p className="empty">Sıralama listesi yükleniyor veya boş.</p>
        )}
      </article>
      )
      : (
        <article className="card">
          <h3>Profil</h3>
          <p className="empty">Bu bölüm boş.</p>
        </article>
      )

  return profileContent
}

