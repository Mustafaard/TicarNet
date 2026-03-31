import {
  CHAT_COMMUNITY_TAB_ITEMS,
  CITY_RULES_GUIDE,
  DEFAULT_CHAT_AVATAR,
  MESSAGES_DISABLED,
} from '../constants.js'
import {
  chatSnippet,
  formatCountdownTr,
  normalizeRoleValue,
  num,
  roleBadgeMeta,
  roleLabelFromValue,
} from '../utils.js'

export function renderChatView(hp) {
  const {
  _chatTimeline,
  _chatUsersById,
  _sendChat,
  busy,
  chatCommunityTab,
  chatCommunityTitle,
  chatCooldownActive,
  chatHardRestrictionActive,
  chatInput,
  chatMessageRefs,
  chatNewsExpandedId,
  chatNewsFeed,
  chatRecentPlayersLoading,
  chatRestrictionEndLabel,
  chatRestrictionReason,
  chatRestrictionRemainingMs,
  chatRestrictionTitle,
  chatThreadRef,
  formatMessageDate,
  formatMessageTimeAgo,
  isSohbetCommunityTab,
  isStaffUser,
  openChatReportModal,
  openProfileModal,
  openTab,
  overview,
  role,
  setChatCommunityTab,
  setChatInput,
  setChatNewsExpandedId,
  staffBlockMessagesAction,
  staffDeleteChatMessageAction,
  user,
} = hp

return (
  <section className="panel-stack chat-screen chat-screen-pro">
    <article className={`card chat-card chat-card-pro chat-card-clean chat-community-surface ${isSohbetCommunityTab ? 'is-sohbet' : 'is-content-tab'}`.trim()}>
      <header className="chat-community-topbar">
        <button
          type="button"
          className="chat-community-topbar-back"
          aria-label="Şehre dön"
          onClick={() => void openTab('home', { tab: 'home' })}
        >
          <span className="chat-community-topbar-back-icon" aria-hidden>◀</span>
          <span className="chat-community-topbar-back-label">Şehir</span>
        </button>
        <h3 className="chat-community-topbar-title">{chatCommunityTitle}</h3>
        <span className="chat-community-topbar-spacer" aria-hidden />
      </header>
      <div className="chat-community-tabs" role="tablist" aria-label="Oyun sohbet menüsü">
        {CHAT_COMMUNITY_TAB_ITEMS.map((entry) => {
          const isActive = chatCommunityTab === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`chat-community-tab ${isActive ? 'is-active' : ''}`.trim()}
              onClick={() => setChatCommunityTab(entry.id)}
            >
              <span className="chat-community-tab-icon" aria-hidden>
                {entry.iconSrc ? (
                  <img
                    src={entry.iconSrc}
                    alt=""
                    className="chat-community-tab-icon-image"
                    onError={(event) => { event.currentTarget.remove() }}
                  />
                ) : null}
                <span className="chat-community-tab-icon-emoji">{entry.icon}</span>
              </span>
              <span>{entry.label}</span>
            </button>
          )
        })}
      </div>
      {chatCommunityTab === 'sohbet' ? (
        <>
          {chatHardRestrictionActive ? (
            <div className="chat-lock-banner mute">
              <strong>{chatRestrictionTitle}</strong>
              <p>Neden: {chatRestrictionReason || 'Yönetici işlemi'}</p>
              <small>
                Bitiş: {chatRestrictionEndLabel || '-'} | Kalan: {formatCountdownTr(chatRestrictionRemainingMs)}
              </small>
            </div>
          ) : null}
          <div className="chat-thread chat-thread-pro chat-thread-clean" ref={chatThreadRef}>
            {_chatTimeline.length === 0 ? (
              <p className="empty chat-empty-pro">Henüz mesaj yok. İlk mesajı sen yaz.</p>
            ) : (
              _chatTimeline.map((entry) => {
                if (entry.type !== 'message' || !entry.message) return null
                const msg = entry.message
                const msgId = String(msg.id || '').trim()
                const rawName = String(msg.u || 'Oyuncu').trim() || 'Oyuncu'
                const username = rawName.replace(/^\s*\d+\s*-\s*/, '').trim() || rawName
                const isOwn = Boolean(msg.own)
                const ownChatAvatar = String(overview?.profile?.avatar?.url || '').trim()
                const userMeta = msg.userId ? _chatUsersById[msg.userId] : null
                const userAvatar = String(userMeta?.avatarUrl || '').trim()
                const rawAvatar = String(msg.avatar || '').trim()
                const avatarSrc = isOwn && ownChatAvatar
                  ? ownChatAvatar
                  : (userAvatar || rawAvatar || DEFAULT_CHAT_AVATAR)
                const messageRole = normalizeRoleValue(msg.userRole || userMeta?.userRole || 'player')
                const canReportMessage = !isOwn && messageRole !== 'admin' && role !== 'admin'
                const staffCanModerateMessage = role === 'admin' || messageRole === 'player'
                const messageRoleLabel = roleLabelFromValue(
                  messageRole,
                  msg.userRoleLabel || userMeta?.userRoleLabel || '',
                )
                const chatBadge = roleBadgeMeta(
                  messageRole,
                  Boolean(msg.premium),
                  messageRoleLabel,
                  msg.seasonBadge || userMeta?.seasonBadge || null,
                )
                const level = Math.max(1, Math.trunc(num(msg.lv || 1)))
                const targetChatUserId = String(msg.userId || (isOwn ? user?.id : '')).trim()
                return (
                  <div
                    key={entry.id}
                    ref={(el) => { if (el && msgId) chatMessageRefs.current[msgId] = el }}
                    className={`chat-msg-clean ${isOwn ? 'own' : ''}`}
                  >
                    <div className="chat-msg-clean-body">
                      <div className="chat-msg-clean-row">
                        <button
                          type="button"
                          className="chat-msg-clean-avatar chat-msg-clean-avatar-frame"
                          aria-label={isOwn ? 'Kendi avatarın' : `${username} avatarı`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!targetChatUserId) return
                            void openProfileModal(targetChatUserId, {
                              username,
                              displayName: username,
                              avatarUrl: avatarSrc,
                              level,
                              role: messageRole,
                              roleLabel: messageRoleLabel,
                              premium: Boolean(msg.premium),
                              seasonBadge: msg.seasonBadge || userMeta?.seasonBadge || null,
                            })
                          }}
                        >
                          <span className="chat-msg-clean-avatar-inner">
                            <img src={avatarSrc || DEFAULT_CHAT_AVATAR} alt="" onError={(e) => { e.target.src = DEFAULT_CHAT_AVATAR }} />
                          </span>
                        </button>
                        <div className="chat-msg-clean-bubble">
                          <div className="chat-msg-clean-meta chat-msg-clean-meta-inside">
                            {isOwn ? (
                              <>
                                <span className="chat-msg-clean-role">Sen</span>
                                <span className="chat-msg-clean-level" title="Seviye">Lv.{level}</span>
                                <span className={`chat-msg-clean-badge ${chatBadge.className} ${chatBadge.tierClass || ''}`}>
                                  {chatBadge.icon ? (
                                    <img
                                      src={chatBadge.icon}
                                      alt=""
                                      className={`chat-msg-badge-icon ${chatBadge.isStaff ? 'role' : ''}`}
                                      onError={(e) => { e.target.style.display = 'none' }}
                                    />
                                  ) : null}
                                  {chatBadge.text}
                                </span>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="chat-msg-clean-name"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!targetChatUserId) return
                                    void openProfileModal(targetChatUserId, {
                                      username,
                                      displayName: username,
                                      avatarUrl: avatarSrc,
                                      level,
                                      role: messageRole,
                                      roleLabel: messageRoleLabel,
                                      premium: Boolean(msg.premium),
                                      seasonBadge: msg.seasonBadge || userMeta?.seasonBadge || null,
                                    })
                                  }}
                                >
                                  {username}
                                </button>
                                <span className="chat-msg-clean-level" title="Seviye">Lv.{level}</span>
                                <span className={`chat-msg-clean-badge ${chatBadge.className} ${chatBadge.tierClass || ''}`}>
                                  {chatBadge.icon ? (
                                    <img
                                      src={chatBadge.icon}
                                      alt=""
                                      className={`chat-msg-badge-icon ${chatBadge.isStaff ? 'role' : ''}`}
                                      onError={(e) => { e.target.style.display = 'none' }}
                                    />
                                  ) : null}
                                  {chatBadge.text}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="chat-msg-clean-text">{chatSnippet(msg.t, 400)}</p>
                          <div className="chat-msg-clean-footer">
                            <span className="chat-msg-clean-time">{formatMessageTimeAgo(msg.createdAt) || formatMessageDate(msg.createdAt)}</span>
                            {isStaffUser && msg.userId ? (
                              <span className="chat-msg-clean-actions">
                                {staffCanModerateMessage ? (
                                  <button type="button" className="chat-msg-clean-action danger" onClick={() => { void staffDeleteChatMessageAction(msg) }}>
                                    Sil
                                  </button>
                                ) : null}
                                {!isOwn && staffCanModerateMessage ? (
                                  <>
                                    <button type="button" className="chat-msg-clean-action" onClick={() => { void staffBlockMessagesAction(msg) }}>
                                      Mesaj Engeli
                                    </button>
                                  </>
                                ) : null}
                                {canReportMessage ? (
                                  <button type="button" className="chat-msg-clean-report" onClick={() => { openChatReportModal(msg, messageRole) }}>
                                    Bildir
                                  </button>
                                ) : null}
                              </span>
                            ) : isOwn ? (
                              <span className="chat-msg-clean-sent" aria-hidden>Gönderildi</span>
                            ) : msg.userId && canReportMessage ? (
                              <button type="button" className="chat-msg-clean-report" onClick={() => { openChatReportModal(msg, messageRole) }}>
                                Bildir
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {!MESSAGES_DISABLED ? (
            <form className={`chat-send-form chat-send-form-clean ${isSohbetCommunityTab ? 'is-sohbet' : ''}`.trim()} onSubmit={_sendChat}>
              <input
                type="text"
                className="chat-send-input chat-send-input-clean"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
                placeholder={chatHardRestrictionActive || chatCooldownActive ? 'Bekle...' : 'Mesajınızı yazın.'}
                disabled={chatHardRestrictionActive || chatCooldownActive || busy === 'chat-send'}
                maxLength={500}
                autoComplete="off"
              />
              <button
                type="submit"
                className="chat-send-btn-clean"
                aria-label="Mesaj gönder"
                disabled={!chatInput.trim() || chatHardRestrictionActive || chatCooldownActive || busy === 'chat-send'}
              >
                <span className="chat-send-btn-icon" aria-hidden>➤</span>
              </button>
            </form>
          ) : null}
        </>
      ) : null}
      {chatCommunityTab === 'kurallar' ? (
        <section className="chat-side-panel chat-rules-panel" aria-label="Oyun kuralları">
          <div className="chat-rules-scroll">
            <div className="rules-intro-icon" aria-hidden>📜</div>
            <h3 className="rules-intro-title">{CITY_RULES_GUIDE.title}</h3>
            <div className="rules-intro-text-wrap">
              {CITY_RULES_GUIDE.subtitleLines.map((line) => (
                <p key={line} className="rules-intro-text">{line}</p>
              ))}
            </div>
            {CITY_RULES_GUIDE.groups.map((group) => (
              <article key={group.id} className="card module-card rules-group-card" aria-labelledby={`chat-rules-group-${group.id}`}>
                <header className="rules-group-head">
                  <h4 id={`chat-rules-group-${group.id}`} className="rules-group-title">
                    <span className="rules-group-emoji" aria-hidden>{group.icon}</span>
                    <span>{group.title}</span>
                  </h4>
                  <p className="rules-group-subtitle">{group.description}</p>
                </header>
                <div className="rules-group-divider" />
                <div className="rules-group-list" role="list">
                  {group.rules.map((entry, ruleIndex) => (
                    <article
                      key={`chat-${group.id}-rule-${ruleIndex + 1}`}
                      className={`rules-penalty-card tone-${entry.tone || 'red'}`}
                      role="listitem"
                    >
                      <div className="rules-penalty-topline">
                        <span className="rules-penalty-index">{`Kural ${ruleIndex + 1}`}</span>
                      </div>
                      <p className="rules-penalty-text">{entry.text}</p>
                      <p className="rules-penalty-chip">
                        <span className="rules-penalty-chip-icon" aria-hidden>⏱️</span>
                        <span>{entry.penalty}</span>
                      </p>
                      {entry.note ? <p className="rules-penalty-note">{entry.note}</p> : null}
                    </article>
                  ))}
                </div>
              </article>
            ))}
            <div className="card module-card rules-final-card">
              <div className="rules-final-icon" aria-hidden>⚖️</div>
              <p className="rules-final-text">{CITY_RULES_GUIDE.finalNote}</p>
            </div>
          </div>
        </section>
      ) : null}
      {chatCommunityTab === 'haberler' ? (
        <section className="chat-side-panel chat-news-panel" aria-label="Oyun haberleri">
          <div className="chat-news-list">
            {chatRecentPlayersLoading && chatNewsFeed.length === 0 ? (
              <p className="chat-news-empty">Haber akışı yükleniyor...</p>
            ) : chatNewsFeed.length === 0 ? (
              <p className="chat-news-empty">Henüz haber kaydı görünmüyor.</p>
            ) : (
              chatNewsFeed.map((entry, index) => {
                const isExpanded = String(chatNewsExpandedId || '') === String(entry.id || '')
                const isJoinNews = String(entry?.kind || '') === 'join'
                const safeUsername = String(entry?.username || 'Oyuncu').trim() || 'Oyuncu'
                const detailRegionId = `chat-news-detail-${String(entry?.id || index).replace(/[^a-zA-Z0-9_-]/g, '-')}`
                return (
                  <article key={String(entry?.id || index)} className={`chat-news-item chat-news-row ${isExpanded ? 'is-expanded' : ''}`.trim()}>
                    <button
                      type="button"
                      className="chat-news-brief"
                      aria-expanded={isExpanded}
                      aria-controls={detailRegionId}
                      onClick={() => {
                        setChatNewsExpandedId((prev) => (String(prev || '') === String(entry.id || '') ? '' : String(entry.id || '')))
                      }}
                    >
                      <span className="chat-news-brief-main">
                        <span className="chat-news-strip-icon" aria-hidden>
                          <img
                            src={isJoinNews ? '/home/icons/messages/bildirim.webp' : '/home/icons/custom/duyuruu.webp'}
                            alt=""
                            onError={(event) => { event.currentTarget.style.display = 'none' }}
                          />
                          <span className="chat-news-strip-icon-fallback">📰</span>
                        </span>
                        <span className="chat-news-title chat-news-row-title">{entry.title}</span>
                      </span>
                      <span className={`chat-news-strip-action ${isExpanded ? 'is-open' : ''}`.trim()}>
                        {isExpanded ? 'Gizle' : (entry.promptLabel || 'Dokun')}
                      </span>
                    </button>
                    {isExpanded ? (
                      <div id={detailRegionId} className="chat-news-inline-detail" role="region" aria-label="Haber detayı">
                        {isJoinNews ? (
                          <p className="chat-news-text chat-news-row-subtitle">
                            {(entry.detailIntro || 'Aramıza katılan oyuncu:').replace(/\s*:\s*$/, ':')}{' '}
                            {entry.userId ? (
                              <button
                                type="button"
                                className="chat-news-name-link chat-news-name-highlight"
                                onClick={() => {
                                  void openProfileModal(entry.userId, {
                                    username: safeUsername,
                                    displayName: safeUsername,
                                    avatarUrl: entry.avatarUrl,
                                  })
                                }}
                              >
                                {safeUsername}
                              </button>
                            ) : (
                              <span className="chat-news-name-highlight">{safeUsername}</span>
                            )}
                          </p>
                        ) : (
                          <p className="chat-news-text chat-news-row-subtitle">{entry.detailIntro || 'Detay bulunamadı.'}</p>
                        )}
                        {isJoinNews ? (
                          <p className="chat-news-meta chat-news-row-meta">
                            {entry.timeLabel}
                          </p>
                        ) : (
                          <p className="chat-news-meta chat-news-row-meta">
                            {safeUsername} • {entry.timeLabel}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </article>
                )
              })
            )}
          </div>
        </section>
      ) : null}
    </article>
  </section>
)
}
