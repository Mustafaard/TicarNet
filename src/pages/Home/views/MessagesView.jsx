import { fmt, formatCountdownTr, normalizeMineLabel, normalizeMojibakeText, normalizeRoleValue, roleBadgeMeta } from '../utils.js'

export function renderMessagesView(hp) {
  const {
  _clearReplyTarget,
  _openReplyToMessage,
  _readMessageItemAction,
  _respondFriendRequestAction,
  _sendDirectMessageAction,
  _toggleBlockByMessageTargetAction,
  _unreadDirectCount,
  _unreadNotificationCount,
  busy,
  canReportDmTarget,
  dmBlockedByMe,
  dmCanSend,
  dmMessageBlockActive,
  dmMessageBlockEndLabel,
  dmMessageBlockReasonLabel,
  dmMessageBlockRemainingMs,
  dmPlaceholder,
  formatMessageDate,
  isStaffUser,
  loadMessageCenter,
  messageDirectItems,
  messageForm,
  messageItemIcon,
  messageItemTag,
  messageNotificationItems,
  messageReplyTarget,
  messageThread,
  messageViewTab,
  openDmReportModal,
  openProfileModal,
  openTab,
  overview,
  premiumActive,
  role,
  selfRoleLabel,
  setMessageFilter,
  setMessageForm,
  setMessageViewTab,
  setStarterDetailOpen,
  staffBlockMessagesAction,
  staffCanModerateDmTarget,
  staffDeleteDirectMessageAction,
  user,
} = hp

return (
  <section className="panel-stack message-screen message-screen-gold">
    <article className="card message-gold-card">
      <header className="message-gold-header message-gold-header-clean">
        <h2 className="message-gold-title">
          <span className="message-gold-title-icon" aria-hidden>
            <img src="/home/icons/messages/bildirim.webp" alt="" onError={(e) => { e.target.style.display = 'none' }} />
          </span>
          İLETİŞİM
        </h2>
        <p className="message-gold-subtitle">Mesajlar ve bildirimleriniz tek yerde</p>
      </header>
      <div className="message-gold-tabs">
        <button
          type="button"
          className={`message-gold-tab ${messageViewTab === 'mesajlar' ? 'active' : ''}`}
          onClick={() => {
            setMessageViewTab('mesajlar')
            setMessageFilter('message')
            loadMessageCenter('message')
          }}
        >
          <span>MESAJLAR</span>
          {_unreadDirectCount > 0 ? (
            <span className="message-gold-tab-badge" aria-label={`${_unreadDirectCount} okunmamış DM`}>
              {_unreadDirectCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={`message-gold-tab message-gold-tab-notifications ${messageViewTab === 'bildirimler' ? 'active' : ''}`}
          onClick={() => {
            setMessageViewTab('bildirimler')
            setMessageFilter('all')
            loadMessageCenter('all')
          }}
        >
          <span className="message-gold-tab-icon" aria-hidden>
            <img src="/home/icons/messages/bildirim.webp" alt="" onError={(e) => { e.target.style.display = 'none' }} />
          </span>
          <span>BİLDİRİMLER</span>
          {_unreadNotificationCount > 0 ? (
            <span className="message-gold-tab-badge" aria-label={`${_unreadNotificationCount} okunmamış bildirim`}>
              {_unreadNotificationCount}
            </span>
          ) : null}
        </button>
      </div>
      <div className="message-gold-content">
        {messageViewTab === 'mesajlar' ? (
          messageReplyTarget ? (
            <div className="message-sohbet-penceresi">
              <header className="message-sohbet-header">
                <button
                  type="button"
                  className="message-sohbet-back"
                  onClick={_clearReplyTarget}
                  aria-label="Geri"
                  title="Mesaj listesine dön"
                >
                  <span className="message-sohbet-back-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M14.8 5.6L8.4 12l6.4 6.4" />
                      <path d="M9 12h8.2" />
                    </svg>
                  </span>
                </button>
                <div className="message-sohbet-user">
                  <button
                    type="button"
                    className="message-sohbet-avatar-wrap message-sohbet-avatar-trigger"
                    onClick={() => {
                      const targetUserId = messageReplyTarget.userId || messageReplyTarget.id
                      if (!targetUserId) return
                      void openProfileModal(targetUserId, {
                        username: messageReplyTarget.username,
                        displayName: messageReplyTarget.displayName || messageReplyTarget.username,
                        avatarUrl: messageReplyTarget.avatarUrl,
                        level: messageReplyTarget.level,
                        role: messageReplyTarget.role,
                        roleLabel: messageReplyTarget.roleLabel,
                        premium: messageReplyTarget.premium,
                        seasonBadge: messageReplyTarget.seasonBadge || null,
                      })
                    }}
                    aria-label={`${messageReplyTarget.username || 'Oyuncu'} profili`}
                  >
                    <img
                      src={messageReplyTarget.avatarUrl || '/splash/logo.png'}
                      alt={messageReplyTarget.username}
                      className="message-sohbet-avatar"
                      onError={(e) => { e.target.src = '/splash/logo.png' }}
                    />
                  </button>
                  <div className="message-sohbet-info">
                    <button
                      type="button"
                      className="message-sohbet-username"
                      onClick={() => {
                        const targetUserId = messageReplyTarget.userId || messageReplyTarget.id
                        if (!targetUserId) return
                        void openProfileModal(targetUserId, {
                          username: messageReplyTarget.username,
                          displayName: messageReplyTarget.displayName || messageReplyTarget.username,
                          avatarUrl: messageReplyTarget.avatarUrl,
                          level: messageReplyTarget.level,
                          role: messageReplyTarget.role,
                          roleLabel: messageReplyTarget.roleLabel,
                          premium: messageReplyTarget.premium,
                          seasonBadge: messageReplyTarget.seasonBadge || null,
                        })
                      }}
                    >
                      {messageReplyTarget.username}
                    </button>
                  </div>
                </div>
                <div className="message-sohbet-actions">
                  {isStaffUser ? (
                    <>
                      {staffCanModerateDmTarget ? (
                        <>
                          <button
                            type="button"
                            className="message-sohbet-chip message-sohbet-chip-danger"
                            onClick={() => {
                              if (!messageReplyTarget?.userId || !messageReplyTarget?.username) return
                              void staffBlockMessagesAction({
                                userId: messageReplyTarget.userId,
                                u: messageReplyTarget.username,
                              })
                            }}
                            disabled={Boolean(busy) || !messageReplyTarget?.userId}
                          >
                            Mesaj Engeli
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {canReportDmTarget ? (
                    <button
                      type="button"
                      className="message-sohbet-chip message-sohbet-chip-report"
                      onClick={openDmReportModal}
                      disabled={Boolean(busy) || !messageReplyTarget?.userId}
                    >
                      Bildir
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="message-sohbet-chip message-sohbet-chip-secondary"
                    onClick={() => {
                      if (!messageReplyTarget?.userId) return
                      void _toggleBlockByMessageTargetAction(!dmBlockedByMe)
                    }}
                    disabled={Boolean(busy) || !messageReplyTarget?.userId}
                  >
                    {dmBlockedByMe ? 'Engeli Kaldır' : 'Engelle'}
                  </button>
                </div>
              </header>
              {dmMessageBlockActive ? (
                <div className="message-sohbet-lock-banner">
                  <strong>DM mesaj engelin aktif</strong>
                  <p>Neden: {dmMessageBlockReasonLabel}</p>
                  <small>
                    Bitiş: {dmMessageBlockEndLabel || '-'} | Kalan: {formatCountdownTr(dmMessageBlockRemainingMs)}
                  </small>
                </div>
              ) : null}
              <div className="message-sohbet-body">
                {messageThread.length === 0 ? (
                  <div className="message-sohbet-empty">
                    <p className="message-sohbet-empty-text">Henüz mesaj yok. İlk mesajı gönder.</p>
                  </div>
                ) : (
                  <div className="message-sohbet-thread">
                    {messageThread.map((entry) => {
                      const isOwn = Boolean(entry.own)
                      const ownAvatarUrl = String(overview?.profile?.avatar?.url || '').trim() || '/splash/logo.png'
                      const otherAvatarUrl =
                        String(entry.counterpart?.avatarUrl || messageReplyTarget.avatarUrl || '').trim() ||
                        '/splash/logo.png'
                      const avatarUrl = isOwn ? ownAvatarUrl : otherAvatarUrl
                      const headerName = isOwn ? 'SEN' : (entry.counterpart?.username || messageReplyTarget.username)
                      const ownLevel = overview?.profile?.levelInfo?.level
                      const counterpartLevel = entry.counterpart?.level ?? messageReplyTarget.level
                      const levelLabel = isOwn
                        ? (ownLevel != null ? `Lv.${ownLevel}` : 'Lv.1')
                        : (counterpartLevel != null ? `Lv.${counterpartLevel}` : (messageReplyTarget.levelLabel || 'Lv.1'))
                      const bubbleRole = isOwn
                        ? role
                        : normalizeRoleValue(entry.counterpart?.role || messageReplyTarget.roleLabel || 'player')
                      const bubblePremium = isOwn
                        ? Boolean(premiumActive)
                        : Boolean(entry.counterpart?.premium)
                      const bubbleSeasonBadge = isOwn
                        ? (overview?.profile?.seasonBadge || null)
                        : (entry.counterpart?.seasonBadge || messageReplyTarget?.seasonBadge || null)
                      const bubbleBadge = roleBadgeMeta(
                        bubbleRole,
                        bubblePremium,
                        isOwn ? selfRoleLabel : (entry.counterpart?.roleLabel || messageReplyTarget.roleLabel || ''),
                        bubbleSeasonBadge,
                      )

                      return (
                        <div
                          key={entry.id}
                          className={`message-sohbet-bubble ${isOwn ? 'own' : 'other'}`}
                        >
                          {!isOwn ? (
                            <button
                              type="button"
                              className="message-sohbet-avatar-bubble"
                              onClick={(e) => {
                                e.stopPropagation()
                                const targetUserId = entry.counterpart?.userId || messageReplyTarget.userId || messageReplyTarget.id
                                if (!targetUserId) return
                                void openProfileModal(targetUserId, {
                                  username: entry.counterpart?.username || messageReplyTarget.username,
                                  displayName: entry.counterpart?.displayName || entry.counterpart?.username || messageReplyTarget.username,
                                  avatarUrl,
                                  level: counterpartLevel,
                                  role: bubbleRole,
                                  roleLabel: entry.counterpart?.roleLabel || messageReplyTarget.roleLabel,
                                  premium: bubblePremium,
                                  seasonBadge: bubbleSeasonBadge,
                                })
                              }}
                              aria-label={`${headerName} profilini aç`}
                            >
                              <img
                                src={avatarUrl}
                                alt={headerName}
                                onError={(e) => { e.target.src = '/splash/logo.png' }}
                              />
                            </button>
                          ) : null}
                          <div className="message-sohbet-bubble-inner">
                            <div className="message-sohbet-head">
                              {isOwn ? (
                                <span className="message-sohbet-head-name">{headerName}</span>
                              ) : (
                                <button
                                  type="button"
                                  className="message-sohbet-head-name"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const targetUserId = entry.counterpart?.userId || messageReplyTarget.userId || messageReplyTarget.id
                                    if (!targetUserId) return
                                    void openProfileModal(targetUserId, {
                                      username: entry.counterpart?.username || messageReplyTarget.username,
                                      displayName: entry.counterpart?.displayName || entry.counterpart?.username || messageReplyTarget.username,
                                      avatarUrl,
                                      level: counterpartLevel,
                                      role: bubbleRole,
                                      roleLabel: entry.counterpart?.roleLabel || messageReplyTarget.roleLabel,
                                      premium: bubblePremium,
                                      seasonBadge: bubbleSeasonBadge,
                                    })
                                  }}
                                >
                                  {headerName}
                                </button>
                              )}
                              <span className="message-sohbet-badge message-sohbet-badge-level">{levelLabel}</span>
                              <span className={`message-sohbet-badge message-sohbet-badge-${bubbleBadge.className} ${bubbleBadge.tierClass || ''}`}>
                                {bubbleBadge.icon ? (
                                  <img
                                    src={bubbleBadge.icon}
                                    alt=""
                                    className={`message-sohbet-badge-icon ${bubbleBadge.isStaff ? 'role' : ''}`}
                                    onError={(e) => { e.target.style.display = 'none' }}
                                  />
                                ) : null}
                                {bubbleBadge.text}
                              </span>
                            </div>
                            <p className="message-sohbet-text">{normalizeMojibakeText(entry.text)}</p>
                            <span className="message-sohbet-meta">
                              <span className="message-sohbet-time">{entry.at}</span>
                              {isOwn ? (
                                <span className="message-sohbet-status">Gönderildi</span>
                              ) : null}
                              {isStaffUser ? (
                                <button
                                  type="button"
                                  className="message-sohbet-mod-action"
                                  onClick={() => { void staffDeleteDirectMessageAction(entry) }}
                                >
                                  Sil
                                </button>
                              ) : null}
                              {!isOwn && !entry.readAt ? (
                                <span className="message-sohbet-unread-dot" aria-label="Okunmadı" />
                              ) : null}
                            </span>
                          </div>
                          {isOwn ? (
                            <button
                              type="button"
                              className="message-sohbet-avatar-bubble own"
                              onClick={(e) => {
                                e.stopPropagation()
                                const targetUserId = user?.id || entry.userId || entry.senderId
                                if (!targetUserId) return
                                void openProfileModal(targetUserId, {
                                  username: overview?.profile?.username || user?.username || 'Oyuncu',
                                  displayName: overview?.profile?.displayName || overview?.profile?.username || user?.username || 'Oyuncu',
                                  avatarUrl,
                                  level: ownLevel,
                                  role,
                                  roleLabel: selfRoleLabel,
                                  premium: premiumActive,
                                })
                              }}
                              aria-label="Kendi profilini aç"
                            >
                              <img
                                src={avatarUrl}
                                alt={headerName}
                                onError={(e) => { e.target.src = '/splash/logo.webp' }}
                              />
                            </button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <form className="message-sohbet-form" onSubmit={(e) => { e.preventDefault(); _sendDirectMessageAction(e) }}>
                <input
                  type="text"
                  className="message-sohbet-input"
                  placeholder={dmPlaceholder}
                  value={messageForm.text}
                  onChange={(e) => setMessageForm((prev) => ({ ...prev, text: e.target.value.slice(0, 500) }))}
                  maxLength={500}
                  autoComplete="off"
                  disabled={!dmCanSend || busy === 'message-send'}
                />
                <button
                  type="submit"
                  className="message-sohbet-send"
                  disabled={!dmCanSend || !messageForm.text?.trim() || busy === 'message-send'}
                >
                  {busy === 'message-send' ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </form>
            </div>
          ) : (
          <>
            <div className="message-gold-list">
              {messageDirectItems.length === 0 ? (
                <div className="message-gold-empty">
                  <img src="/splash/logo.png" alt="" className="message-gold-empty-icon" onError={(e) => { e.target.style.display = 'none' }} />
                  <p className="message-gold-empty-text">Özel mesajlar burada listelenir.</p>
                  <p className="message-gold-empty-muted">Şu anda mesaj yok.</p>
                </div>
              ) : (
                messageDirectItems
                  .map((item) => {
                    const detail =
                      normalizeMojibakeText(String(item?.message ?? item?.preview ?? '').trim()) || 'Mesaj'
                    const dateStr = formatMessageDate(item?.createdAt)
                    const fallbackUnread = item?.read === true ? 0 : 1
                    const unreadCountRaw = Number(
                      item?.unreadCount != null
                        ? item.unreadCount
                        : fallbackUnread,
                    )
                    const unreadCount = Number.isFinite(unreadCountRaw) && unreadCountRaw > 0
                      ? Math.min(99, Math.max(1, Math.trunc(unreadCountRaw)))
                      : 0
                    const hasUnreadCount = unreadCount > 0
                    const isUnread = hasUnreadCount || Boolean(item?.read !== true)
                    const counterpartName = item?.counterpart?.username || item?.title?.replace(/ mesaj gönderdi$/, '').replace(/ kullanıcısına yazdın$/, '') || 'Oyuncu'
                    const counterpartRole = normalizeRoleValue(item?.counterpart?.role || 'player')
                    const counterpartBadge = roleBadgeMeta(
                      counterpartRole,
                      Boolean(item?.counterpart?.premium),
                      item?.counterpart?.roleLabel || '',
                      item?.counterpart?.seasonBadge || null,
                    )
                    const counterpartAvatarUrl = String(item?.counterpart?.avatarUrl || '').trim()
                    const avatarUrl = counterpartAvatarUrl || '/splash/logo.png'
                    return (
                      <div
                        key={item?.id || `dm-${Math.random()}`}
                        className={`message-gold-item message-gold-item-card ${isUnread ? 'unread' : ''} ${messageReplyTarget?.username === counterpartName ? 'selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (item?.source === 'direct' && item?.counterpart?.username) {
                            _openReplyToMessage(item)
                          } else {
                            item?.id && _readMessageItemAction(item.id)
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item?.counterpart?.username && _openReplyToMessage(item) } }}
                      >
                        <span className="message-gold-item-strip message-gold-item-strip-full" data-kind="message">
                          <img
                            src={avatarUrl}
                            alt={counterpartName}
                            className="message-gold-item-img"
                            aria-hidden
                            onError={(e) => { e.target.src = '/splash/logo.png' }}
                          />
                        </span>
                        <div className="message-gold-item-body">
                          <div className="message-gold-item-meta">
                            <span className="message-gold-item-tag">{counterpartName}</span>
                            <span className={`message-gold-item-membership message-gold-item-membership-${counterpartBadge.className} ${counterpartBadge.tierClass || ''}`}>
                              {counterpartBadge.icon ? (
                                <img
                                  src={counterpartBadge.icon}
                                  alt=""
                                  className={`message-gold-item-membership-icon ${counterpartBadge.isStaff ? 'role' : ''}`}
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              ) : null}
                              {counterpartBadge.text}
                            </span>
                            <div className="message-gold-item-meta-right">
                              {dateStr ? <span className="message-gold-item-date">{dateStr}</span> : null}
                              {hasUnreadCount ? (
                                <span className="message-gold-item-badge" aria-label={`${unreadCount} okunmamış mesaj`}>
                                  {unreadCount}
                                </span>
                              ) : isUnread ? (
                                <span className="message-gold-item-dot" aria-label="Okunmadı" />
                              ) : null}
                            </div>
                          </div>
                          <p className="message-gold-item-detail">{detail}</p>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </>
          )
        ) : (
          <div className="message-gold-list">
            {messageNotificationItems.length === 0 ? (
              <div className="message-gold-empty">
                <img src="/home/icons/messages/bildirim.webp" alt="" className="message-gold-empty-icon" onError={(e) => { e.target.style.display = 'none' }} />
                <p className="message-gold-empty-text">Bildirimler burada listelenir.</p>
                <p className="message-gold-empty-muted">Şu anda bildirim yok.</p>
              </div>
            ) : (
            messageNotificationItems
              .map((item) => {
                const sourceType = item?.type ?? item?.kind ?? item?.filter ?? 'other'
                const friendRequest = item?.source === 'friend_request' ? item?.request : null
                const isIncomingFriendRequest =
                  Boolean(friendRequest?.incoming) && String(friendRequest?.status || '').toLowerCase() === 'pending'
                const tag = isIncomingFriendRequest ? 'ARKADAŞLIK' : messageItemTag(sourceType)
                const iconSrc = messageItemIcon()
                const rawDetail = normalizeMineLabel(normalizeMojibakeText(
                  String(item?.message ?? item?.detail ?? item?.body ?? item?.text ?? '').trim()
                    || (item?.title ? `${item.title}: ${item.message || ''}`.trim() : '')
                    || 'Bildirim',
                ))
                const dateStr = formatMessageDate(item?.createdAt || item?.sentAt || item?.updatedAt)
                const isUnread = Boolean(item?.read !== true && item?.unread !== false)
                // Başlangıç sermayesi bildirimi: hoş geldin + detaylar için buraya tıklayabilirsin metni
                const isStarterNotice =
                  /TicarNet'e hoş geldin/i.test(rawDetail) ||
                  /Detaylar için buraya tıklayabilirsin/i.test(rawDetail) ||
                  /Başlangıç sermayen/i.test(rawDetail) ||
                  /Başlangıç paketin tanımlandı/i.test(rawDetail)
                const transactionAmountRaw = Number(item?.amount)
                const transactionAmount = Number.isFinite(transactionAmountRaw)
                  ? Math.trunc(transactionAmountRaw)
                  : 0
                const hasTransactionAmount = item?.source === 'transaction' && transactionAmount !== 0
                const transactionCashLabel = hasTransactionAmount
                  ? (transactionAmount > 0
                    ? `Kazanılan nakit: +${fmt(transactionAmount)}`
                    : `Harcanan nakit: -${fmt(Math.abs(transactionAmount))}`)
                  : ''
                const detail = isStarterNotice
                  ? "TicarNet'e hoş geldin. Başlangıç paketin verildi: 2.000.000 Nakit, 500 Petrol, 200 Enerji, 3.000 Motor, 3.000 Yedek Parça. Detaylar için tıkla."
                  : `${rawDetail}${transactionCashLabel ? ` • ${transactionCashLabel}` : ''}`
                const handleClick = () => {
                  if (isIncomingFriendRequest) return
                  const itemSource = String(item?.source || '').trim().toLowerCase()
                  const itemType = String(item?.type || '').trim().toLowerCase()
                  const targetTab = String(item?.targetTab || '').trim().toLowerCase()
                  const shouldOpenAnnouncements =
                    targetTab === 'announcements' ||
                    itemSource === 'announcement' ||
                    itemType === 'announcement'
                  if (isStarterNotice) {
                    setStarterDetailOpen(true)
                  }
                  if (shouldOpenAnnouncements) {
                    void openTab('announcements', { tab: 'announcements' })
                  }
                  if (itemSource !== 'announcement' && item?.id) {
                    void _readMessageItemAction(item.id)
                  }
                }
                const handleKeyDown = (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick()
                  }
                }
                return (
                  <div
                    key={item?.id || `msg-${Math.random()}`}
                    className={`message-gold-item message-gold-item-card ${isUnread ? 'unread' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={handleClick}
                    onKeyDown={handleKeyDown}
                  >
                    <span className="message-gold-item-strip message-gold-item-strip-full" data-kind={sourceType}>
                      <img src={iconSrc} alt="" className="message-gold-item-img" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                    </span>
                    <div className="message-gold-item-body">
                      <div className="message-gold-item-meta">
                        <span className="message-gold-item-tag">{tag}</span>
                        {dateStr ? <span className="message-gold-item-date">{dateStr}</span> : null}
                      </div>
                      <p className="message-gold-item-detail">{detail}</p>
                      {isIncomingFriendRequest ? (
                        <div className="message-gold-item-actions">
                          <button
                            type="button"
                            className="message-gold-item-action message-gold-item-action-accept"
                            disabled={Boolean(busy)}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void _respondFriendRequestAction(friendRequest?.id, 'accept')
                            }}
                          >
                            Kabul Et
                          </button>
                          <button
                            type="button"
                            className="message-gold-item-action message-gold-item-action-reject"
                            disabled={Boolean(busy)}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void _respondFriendRequestAction(friendRequest?.id, 'reject')
                            }}
                          >
                            Reddet
                          </button>
                        </div>
                      ) : null}
                      {isUnread ? <span className="message-gold-item-dot" aria-label="Okunmadı" /> : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </article>
  </section>
)
}
