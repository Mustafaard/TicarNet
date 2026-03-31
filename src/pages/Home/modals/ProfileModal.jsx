import {
  BUSINESS_UNLOCK_LABEL_BY_KEY,
  FACTORY_CARD_ORDER,
} from '../constants.js'
import {
  fleetFuelUnitsByModelLevel,
  fmt,
  formatDateTime,
  fuelItemMeta,
  num,
  resolveFactoryShopImage,
  resolveVehicleImage,
  roleLabelFromValue,
  vehicleEmojiByTier,
} from '../utils.js'

export function renderProfileModal(hp) {
  const {
  _removeFriendAction,
  _respondFriendRequestAction,
  _sendFriendRequestAction,
  _sendProfileTeklif,
  _toggleBlockAction,
  allVehicleListings,
  busy,
  chatClockMs,
  loadDirectMessageThread,
  loadMessageCenter,
  logisticsUnlocked,
  messageReplyTargetRef,
  openMarketListingDetail,
  openTab,
  playerLevelNow,
  profileModalBusinessExpand,
  profileModalData,
  profileModalDisplayName,
  profileModalLeagueRanks,
  profileModalLoading,
  profileModalMembershipLabel,
  profileModalPremiumActive,
  profileModalSeasonBadge,
  profileModalShowHandle,
  profileModalStaffRole,
  profileModalUserId,
  profileModalUsername,
  profileTeklifSending,
  setBusinessDetailTab,
  setBusinessScene,
  setError,
  setGaragePanel,
  setLogisticsDetailTab,
  setLogisticsScene,
  setMessageForm,
  setMessageReplyTarget,
  setMessageViewTab,
  setProfileModalBusinessExpand,
  setProfileModalUserId,
  setSelectedBusinessId,
  tab,
  unlockedBusinesses,
  unlockedFleetTemplateIdSet,
  unlockedModelLevelByTemplate,
  user,
  vehicleListingById,
  weeklyEventsRuntimeState,
} = hp

  return (
    <section
      className="player-profile-overlay"
      aria-modal="true"
      role="dialog"
      onClick={() => { setProfileModalUserId(null); setProfileModalBusinessExpand(null) }}
    >
      <article
        className="player-profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="player-profile-close"
          onClick={() => { setProfileModalUserId(null); setProfileModalBusinessExpand(null) }}
          aria-label="Kapat"
        >
          Kapat
        </button>
        {profileModalData ? (
          <div className="player-profile-body">
            {profileModalLoading ? (
              <div className="player-profile-updating">Profil bilgileri güncelleniyor...</div>
            ) : null}
            <div className="player-profile-header">
              <div className="player-profile-header-main">
                <div className="player-profile-header-media">
                  <div className="player-profile-avatar-wrap">
                    <img
                      src={profileModalData.avatar?.url || '/splash/logo.png'}
                      alt=""
                      className="player-profile-avatar"
                      onError={(e) => { e.target.src = '/splash/logo.png' }}
                    />
                  </div>
                  {profileModalSeasonBadge ? (
                    <div className={`player-profile-earned-badge is-${profileModalSeasonBadge.tier || 'gold'}`}>
                      <img
                        src={profileModalSeasonBadge.icon}
                        alt=""
                        aria-hidden
                        className="player-profile-earned-badge-icon"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                      <span className="player-profile-earned-badge-copy">
                        <strong>{profileModalSeasonBadge.label || 'Sezon Rozeti'}</strong>
                        {profileModalSeasonBadge.awardedForSeasonKey ? (
                          <small>{profileModalSeasonBadge.awardedForSeasonKey}</small>
                        ) : null}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="player-profile-header-copy">
                  {profileModalData.levelInfo?.level || profileModalData.companyLevel ? (
                    <div className="player-profile-rozet">
                      {profileModalData.levelInfo?.level ? (
                        <span className="player-profile-rozet-badge" title="Seviye">LV {profileModalData.levelInfo.level}</span>
                      ) : null}
                      {profileModalData.companyLevel ? (
                        <span className="player-profile-rozet-badge" title="İşletme Seviyesi">İş. {profileModalData.companyLevel}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <h2 className="player-profile-name">
                    {profileModalDisplayName}
                    {(() => {
                      const lastActiveIso = profileModalData.lastSeenAt || profileModalData.updatedAt || ''
                      const lastActiveMs = lastActiveIso ? Date.parse(lastActiveIso) : 0
                      const liveNowMsSafe = chatClockMs || Date.now()
                      const isOnline = lastActiveMs && liveNowMsSafe - lastActiveMs < 90 * 1000
                      if (!lastActiveMs) return null
                      const diffSeconds = Math.max(0, Math.floor((liveNowMsSafe - lastActiveMs) / 1000))
                      const diffMinutes = Math.floor(diffSeconds / 60)
                      const diffHours = Math.floor(diffMinutes / 60)
                      const diffDays = Math.floor(diffHours / 24)
                      let inactiveLabel = `${Math.max(1, diffSeconds)} saniye`
                      if (diffDays > 0) inactiveLabel = `${diffDays} gün`
                      else if (diffHours > 0) inactiveLabel = `${diffHours} saat`
                      else if (diffMinutes > 0) inactiveLabel = `${diffMinutes} dakika`
                      const statusText = isOnline ? 'Çevrim içi' : `Çevrim dışı · ${inactiveLabel}`
                      return (
                        <span
                          className={`player-profile-status-badge ${isOnline ? 'is-online' : 'is-offline'}`}
                        >
                          <span className="player-profile-status-dot" />
                          {statusText}
                        </span>
                      )
                    })()}
                  </h2>
                  {profileModalShowHandle ? (
                    <p className="player-profile-handle">@{profileModalUsername}</p>
                  ) : null}
                  <p className="player-profile-unvan">
                    {profileModalData.levelInfo?.level
                      ? `Seviye ${profileModalData.levelInfo.level}`
                      : ''}
                    {profileModalData.companyLevel
                      ? ` · İşletme Seviyesi ${profileModalData.companyLevel}`
                      : ''}
                    {!(profileModalData.levelInfo?.level || profileModalData.companyLevel) ? 'Oyuncu' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="player-profile-stats player-profile-stats-large">
              <div className="player-profile-stat">
                <span className="player-profile-stat-icon">
                  <img src="/home/ui/hud/level-icon.webp" alt="" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                </span>
                <span className="player-profile-stat-value">{profileModalData.levelInfo?.level ?? '-'}</span>
                <span className="player-profile-stat-label">Seviye</span>
              </div>
              <div className="player-profile-stat">
                <span className="player-profile-stat-icon">
                  <img src="/home/icons/depot/cash.webp" alt="" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                </span>
                <span className="player-profile-stat-value">
                  {profileModalData.wallet != null ? fmt(profileModalData.wallet) : '---'}
                </span>
                <span className="player-profile-stat-label">Nakit</span>
              </div>
            </div>
            <div className="player-profile-premium-row player-profile-leaderboard-row">
              <span className="player-profile-premium-label">Sezon sıralaması</span>
              <span className="player-profile-premium-value">
                #{profileModalLeagueRanks.seasonRank ?? '-'}
              </span>
            </div>
            {profileModalStaffRole ? (
              <div className="player-profile-premium-row player-profile-role-row">
                <span className="player-profile-premium-label">Rol</span>
                <span className={`player-profile-premium-value is-role ${profileModalStaffRole.className}`.trim()}>
                  {profileModalStaffRole.text}
                </span>
              </div>
            ) : null}
            <div className="player-profile-premium-row player-profile-membership-row">
              <span className="player-profile-premium-label">Üyelik</span>
              <span className={`player-profile-premium-value ${profileModalPremiumActive ? 'is-premium' : 'is-standard'}`.trim()}>
                {profileModalMembershipLabel}
              </span>
            </div>
            {profileModalUserId && user?.id && String(profileModalUserId) !== String(user.id) && profileModalData?.username ? (() => {
              const relationship = profileModalData.relationship || {}
              const isFriend = Boolean(relationship.isFriend)
              const outgoingRequestId = String(relationship.outgoingRequest?.id || '').trim()
              const hasOutgoingRequest = Boolean(relationship.outgoingRequest?.id)
              const hasIncomingRequest = Boolean(relationship.incomingRequest?.id)
              const blockedByMe = Boolean(relationship.blockedByMe)
              const blockedMe = Boolean(relationship.blockedMe)
              const canSendMessage = relationship.canSendMessage !== false
              const targetUserId = String(profileModalData.userId || profileModalUserId || '').trim()
              return (
                <div className="player-profile-actions">
                  <p className="player-profile-actions-title">Hızlı İşlemler</p>
                  <button
                    type="button"
                    className="btn btn-primary player-profile-message-btn"
                    disabled={!canSendMessage || Boolean(busy)}
                    onClick={() => {
                      const target = {
                        userId: targetUserId || null,
                        username: profileModalData.username,
                        replyToId: null,
                        avatarUrl: String(profileModalData.avatar?.url || '').trim(),
                        level: profileModalData.levelInfo?.level ?? null,
                        levelLabel: profileModalData.levelInfo?.level
                          ? `Seviye ${profileModalData.levelInfo.level}`
                          : '',
                        role: profileModalData.role || 'player',
                        roleLabel: profileModalData.roleLabel || roleLabelFromValue(profileModalData.role || 'player'),
                        premium: Boolean(profileModalData?.premium?.active),
                        seasonBadge: profileModalData?.seasonBadge || null,
                        relationship: profileModalData.relationship || null,
                      }
                      setMessageReplyTarget(target)
                      messageReplyTargetRef.current = target
                      setMessageForm((prev) => ({ ...prev, toUsername: profileModalData.username, text: '' }))
                      setMessageViewTab('mesajlar')
                      void loadDirectMessageThread(profileModalData.username)
                      void openTab('messages', { messageFilter: 'all' })
                      setProfileModalUserId(null)
                      setProfileModalBusinessExpand(null)
                    }}
                  >
                    <span className="player-profile-btn-icon" aria-hidden>{canSendMessage ? '✉️' : '🔕'}</span>
                    <span>{canSendMessage ? 'Mesaj Gönder' : 'Mesaj Kapalı'}</span>
                  </button>
                  <div className="player-profile-social-actions">
                    {isFriend ? (
                      <button
                        type="button"
                        className="btn btn-ghost player-profile-social-btn"
                        disabled={Boolean(busy)}
                        onClick={() => { void _removeFriendAction() }}
                      >
                        <span className="player-profile-btn-icon" aria-hidden>🗑️</span>
                        <span>Arkadaşı Kaldır</span>
                      </button>
                    ) : hasOutgoingRequest ? (
                      <button
                        type="button"
                        className="btn btn-ghost player-profile-social-btn"
                        disabled={Boolean(busy) || !outgoingRequestId}
                        onClick={() => { void _respondFriendRequestAction(outgoingRequestId, 'cancel') }}
                      >
                        <span className="player-profile-btn-icon" aria-hidden>⏹️</span>
                        <span>İsteği Kaldır</span>
                      </button>
                    ) : hasIncomingRequest ? (
                      <button
                        type="button"
                        className="btn btn-ghost player-profile-social-btn"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          setMessageViewTab('bildirimler')
                          void loadMessageCenter('all')
                          void openTab('messages', { messageFilter: 'all' })
                          setProfileModalUserId(null)
                          setProfileModalBusinessExpand(null)
                        }}
                      >
                        <span className="player-profile-btn-icon" aria-hidden>✅</span>
                        <span>İsteği Yanıtla</span>
                      </button>
                    ) : (!blockedByMe && !blockedMe) ? (
                      <button
                        type="button"
                        className="btn btn-ghost player-profile-social-btn"
                        disabled={Boolean(busy)}
                        onClick={() => { void _sendFriendRequestAction() }}
                      >
                        <span className="player-profile-btn-icon" aria-hidden>🤝</span>
                        <span>Arkadaş Ekle</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className={`btn btn-ghost player-profile-social-btn ${blockedByMe ? 'is-danger' : ''}`}
                      disabled={Boolean(busy)}
                      onClick={() => { void _toggleBlockAction(!blockedByMe) }}
                    >
                      <span className="player-profile-btn-icon" aria-hidden>{blockedByMe ? '🔓' : '⛔'}</span>
                      <span>{blockedByMe ? 'Engeli Kaldır' : 'Kullanıcıyı Engelle'}</span>
                    </button>
                  </div>
                  {blockedMe ? (
                    <p className="player-profile-social-note">Bu kullanıcı seni engellemiş.</p>
                  ) : null}
                </div>
              )
            })() : null}
            <div className="player-profile-section">
              <h4 className="player-profile-section-title">İşletmeler</h4>
              {(() => {
                const order = ['moto-rental', 'auto-rental', 'logistics', 'property-rental']
                const allBusinessesRaw = Array.isArray(profileModalData.businesses) ? profileModalData.businesses : []
                const allBusinesses = allBusinessesRaw.filter((entry) => entry && entry.unlocked !== false)
                const isOtherUser =
                  profileModalUserId &&
                  user?.id &&
                  String(profileModalUserId) !== String(user.id) &&
                  profileModalData?.username

                const businessCards = order.flatMap((templateId) => {
                  if (templateId === 'logistics') {
                    const lf = profileModalData.logisticsFleet && typeof profileModalData.logisticsFleet === 'object'
                      ? profileModalData.logisticsFleet
                      : null
                    const trucks = lf
                      ? (lf.owned || lf.trucks || [])
                      : []
                    const truckCount = Math.max(
                      0,
                      Math.trunc(num(lf?.truckCount || lf?.summary?.truckCount || trucks.length || 0)),
                    )
                    const hasLogisticsBusiness =
                      allBusinesses.some((entry) => entry.templateId === 'logistics') ||
                      truckCount > 0
                    if (!hasLogisticsBusiness) return []

                    const openLogisticsPanel = () => {
                      if (isOtherUser) {
                        setGaragePanel({
                          open: true,
                          username: profileModalData.username,
                          displayName: profileModalData.displayName || profileModalData.username || 'Oyuncu',
                          avatarUrl: profileModalData.avatar?.url || '/splash/logo.png',
                          levelLabel: profileModalData.levelInfo?.level
                            ? `Seviye ${profileModalData.levelInfo.level}`
                            : '',
                          businessName: 'Tır Kiralama',
                          templateId: 'logistics',
                          assetTypeLabel: 'Tır',
                          garageTypeLabel: 'Tır Garajı',
                          vehicles: (Array.isArray(trucks) ? trucks : []).map((t) => ({ id: t.id, name: t.name || 'Tır', image: t.image })),
                          isLogistics: true,
                        })
                        return
                      }
                      setProfileModalUserId(null)
                      setProfileModalBusinessExpand(null)
                      openTab('businesses')
                    }

                    return (
                      <button
                        key="logistics"
                        type="button"
                        className="player-profile-business-card"
                        onClick={openLogisticsPanel}
                      >
                        <span className="player-profile-business-card-img-wrap">
                          <img src="/home/icons/businesses/lojistik-kiralama.webp" alt="" onError={(e) => { e.target.src = '/splash/logo.png' }} />
                        </span>
                        <span className="player-profile-business-card-name">
                          Tır Kiralama
                        </span>
                      </button>
                    )
                  }

                  const b = allBusinesses.find((x) => x.templateId === templateId)
                  if (!b) return []

                  const img = b.heroImage || '/home/icons/businesses/moto-kiralama.webp'
                  const vehicles = b?.vehicles || []
                  const businessTemplateId = String(b?.templateId || '').trim()
                  const assetTypeLabel = businessTemplateId === 'moto-rental'
                    ? 'Motor'
                    : businessTemplateId === 'auto-rental'
                      ? 'Araba'
                      : businessTemplateId === 'property-rental'
                        ? 'Mülk'
                        : 'Araç'
                  const garageTypeLabel = businessTemplateId === 'moto-rental'
                    ? 'Motor Garajı'
                    : businessTemplateId === 'auto-rental'
                      ? 'Araba Garajı'
                      : businessTemplateId === 'property-rental'
                        ? 'Mülk Portföyü'
                        : 'Garaj'
                  const businessDisplayName =
                    BUSINESS_UNLOCK_LABEL_BY_KEY[businessTemplateId] || b.name || b.templateId || 'İşletme'

                  const openGaragePanel = () => {
                    if (isOtherUser) {
                      setGaragePanel({
                        open: true,
                        username: profileModalData.username,
                        displayName: profileModalData.displayName || profileModalData.username || 'Oyuncu',
                        avatarUrl: profileModalData.avatar?.url || '/splash/logo.png',
                          levelLabel: profileModalData.levelInfo?.level
                            ? `Seviye ${profileModalData.levelInfo.level}`
                            : '',
                        businessName: businessDisplayName,
                        templateId: businessTemplateId,
                        assetTypeLabel,
                        garageTypeLabel,
                        vehicles: vehicles.map((v) => ({ id: v.id, name: v.name || assetTypeLabel, image: v.image })),
                        isLogistics: businessTemplateId === 'logistics',
                      })
                      return
                    }
                    setProfileModalUserId(null)
                    setProfileModalBusinessExpand(null)
                    openTab('businesses')
                  }

                  return (
                    <button
                      key={b.id || b.templateId}
                      type="button"
                      className="player-profile-business-card"
                      onClick={openGaragePanel}
                    >
                      <span className="player-profile-business-card-img-wrap">
                        <img src={img} alt="" onError={(e) => { e.target.src = '/splash/logo.png' }} />
                      </span>
                      <span className="player-profile-business-card-name">
                        {businessDisplayName}
                      </span>
                    </button>
                  )
                })

                if (businessCards.length === 0) {
                  return (
                    <p className="player-profile-empty-text">
                      {isOtherUser ? 'Bu oyuncu henüz işletme satın almamış.' : 'Henüz işletme satın almadın.'}
                    </p>
                  )
                }

                return (
                  <div className="player-profile-business-grid">
                    {businessCards}
                  </div>
                )
              })()}
            </div>

            <div className="player-profile-section">
              <h4 className="player-profile-section-title">Fabrikalar</h4>
              {Array.isArray(profileModalData.factories) && profileModalData.factories.filter((f) => f && f.owned).length > 0 ? (
                <div className="player-profile-factory-grid">
                  {profileModalData.factories
                    .filter((f) => f && f.owned)
                    .slice()
                    // Once level'e gore (yuksekten dusuge), esitse FACTORY_CARD_ORDER'a gore sirala
                    .sort((left, right) => {
                      const leftLevel = Math.max(1, Number(left?.level || 1))
                      const rightLevel = Math.max(1, Number(right?.level || 1))
                      if (leftLevel !== rightLevel) return rightLevel - leftLevel
                      const leftId = String(left?.id || '').trim()
                      const rightId = String(right?.id || '').trim()
                      const leftIndex = FACTORY_CARD_ORDER.indexOf(leftId)
                      const rightIndex = FACTORY_CARD_ORDER.indexOf(rightId)
                      const safeLeft = leftIndex === -1 ? FACTORY_CARD_ORDER.length : leftIndex
                      const safeRight = rightIndex === -1 ? FACTORY_CARD_ORDER.length : rightIndex
                      return safeLeft - safeRight
                    })
                    .map((factory) => (
                      <div key={factory.id} className="player-profile-factory-card">
                        <span className="player-profile-factory-img-wrap factory-shop-hero-wrap">
                          <img
                            src={resolveFactoryShopImage(factory) || factory.icon || '/home/icons/businesses/fabrikam.webp'}
                            alt={factory.name || factory.id}
                            loading="lazy"
                            onError={(e) => { e.currentTarget.src = '/splash/logo.png' }}
                          />
                          <span className="factory-level-badge player-profile-factory-level-badge" title={`Seviye ${fmt(Math.max(1, Number(factory.level || 1)))}`}>
                            ★{fmt(Math.max(1, Number(factory.level || 1)))}
                          </span>
                        </span>
                        <div className="player-profile-factory-meta">
                          <span className="player-profile-factory-name">{factory.name || 'Fabrika'}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="player-profile-empty-text">Henüz fabrika kurulmadı.</p>
              )}
            </div>

            {profileModalUserId && user?.id && String(profileModalUserId) !== String(user.id) && profileModalData?.username ? (
              <div className="player-profile-section">
                <h4 className="player-profile-section-title">Satılık İlanlar</h4>
                {(() => {
                  const modalProfileUserId = String(profileModalData?.userId || '').trim()
                  const listingRows = Array.isArray(profileModalData.vehicleListings)
                    ? profileModalData.vehicleListings
                      .filter((entry) => {
                        const listingId = String(entry?.id || '').trim()
                        if (!listingId) return false
                        const liveListing = vehicleListingById.get(listingId)
                        if (!liveListing) return false
                        if (!modalProfileUserId) return true
                        return String(liveListing?.sellerUserId || '').trim() === modalProfileUserId
                      })
                      .slice()
                      .sort((left, right) => {
                        const leftAt = Date.parse(left?.listedAt || '') || 0
                        const rightAt = Date.parse(right?.listedAt || '') || 0
                        return rightAt - leftAt
                      })
                    : []

                  if (!listingRows.length) {
                    return <p className="player-profile-empty-text">Bu oyuncunun henüz ilanı yok.</p>
                  }

                  return (
                    <div className="player-profile-sale-grid">
                      {listingRows.map((listing) => {
                        const templateId = String(listing?.templateId || '').trim()
                        const image = resolveVehicleImage(listing, templateId)
                        const listingName = String(listing?.name || '').trim() || (
                          templateId === 'logistics'
                            ? 'Tır'
                            : templateId === 'property-rental'
                              ? 'Mülk'
                              : templateId === 'moto-rental'
                                ? 'Motor'
                                : 'Araç'
                        )
                        const listingTypeLabel = BUSINESS_UNLOCK_LABEL_BY_KEY[templateId] || 'Kiralama'
                        const listingPrice = Math.max(1, Math.trunc(num(listing?.marketPrice || listing?.price || 0)))
                        const listingIncome = Math.max(1, Math.trunc(num(listing?.marketIncome || listing?.rentPerHour || 0)))
                        const listingXp = Math.max(1, Math.trunc(num(listing?.xp || 0)))
                        const listingRequiredLevel = Math.max(
                          1,
                          Math.trunc(num(listing?.marketLevel || listing?.requiredLevel || 1)),
                        )
                        const listingCapacity = Math.max(1, Math.trunc(num(listing?.capacity || 1)))
                        const listingFuelMeta = templateId === 'property-rental'
                          ? fuelItemMeta('energy')
                          : fuelItemMeta('oil')
                        const listingFuelNeed = fleetFuelUnitsByModelLevel(
                          listingRequiredLevel,
                          templateId || 'moto-rental',
                          { weeklyEvents: weeklyEventsRuntimeState },
                        )
                        const listingCurrentLevel = templateId === 'logistics'
                          ? playerLevelNow
                          : Math.max(1, Math.trunc(num(unlockedModelLevelByTemplate[templateId] || 1)))
                        const listingHasBusinessAccess = templateId === 'logistics'
                          ? logisticsUnlocked
                          : unlockedFleetTemplateIdSet.has(templateId)
                        const listingLockedByBusiness = !listingHasBusinessAccess
                        const listingLockedByLevel = listingRequiredLevel > listingCurrentLevel
                        const listingLocked = listingLockedByBusiness || listingLockedByLevel
                        const listingId = String(listing?.id || `${templateId}-${listingName}`).trim()
                        const handleOpenListing = async (event) => {
                          if (event) {
                            event.preventDefault()
                            event.stopPropagation()
                            event.nativeEvent?.stopImmediatePropagation?.()
                          }
                          const safeTemplateId = String(listing?.templateId || '').trim()
                          const safeListingName = String(listing?.name || '').trim().toLocaleLowerCase('tr-TR')
                          const safeListingPrice = Math.max(1, Math.trunc(num(listing?.marketPrice || listing?.price || 0)))
                          const safeListingListedAt = Date.parse(String(listing?.listedAt || '').trim() || '')
                          const profileUserId = String(profileModalData?.userId || '').trim()
                          const activeListingId = String(listing?.id || '').trim()
                          const resolvedListing = activeListingId
                            ? (
                              allVehicleListings.find(
                                (entry) => String(entry?.id || '').trim() === activeListingId,
                              ) || null
                            )
                            : (
                              allVehicleListings.find((entry) => {
                                if (!entry || typeof entry !== 'object') return false
                                const entryId = String(entry?.id || '').trim()
                                if (!entryId) return false
                                const entryTemplateId = String(entry?.templateId || '').trim()
                                if (safeTemplateId && entryTemplateId !== safeTemplateId) return false
                                if (profileUserId && String(entry?.sellerUserId || '').trim() !== profileUserId) return false
                                const entryName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
                                if (safeListingName && entryName !== safeListingName) return false
                                const entryPrice = Math.max(1, Math.trunc(num(entry?.marketPrice || entry?.price || 0)))
                                if (entryPrice !== safeListingPrice) return false
                                if (!Number.isNaN(safeListingListedAt)) {
                                  const entryListedAt = Date.parse(String(entry?.listedAt || '').trim() || '')
                                  if (!Number.isNaN(entryListedAt) && Math.abs(entryListedAt - safeListingListedAt) > 120000) {
                                    return false
                                  }
                                }
                                return true
                              }) || null
                            )

                          if (!resolvedListing) {
                            setError('Bu ilan satılmış veya kaldırılmış olabilir. Lütfen listeyi yenileyip tekrar deneyin.')
                            return
                          }
                          const resolvedTemplateId = String(
                            resolvedListing?.templateId || safeTemplateId || '',
                          ).trim()
                          if (tab !== 'businesses') {
                            await openTab('businesses', { tab: 'businesses' })
                          }
                          if (resolvedTemplateId === 'logistics') {
                            setBusinessScene('logistics')
                            setLogisticsScene('market')
                            setLogisticsDetailTab('market')
                          } else {
                            const targetBusiness = unlockedBusinesses.find(
                              (entry) =>
                                entry &&
                                entry.unlocked !== false &&
                                String(entry.templateId || '').trim() === resolvedTemplateId,
                            )
                            if (targetBusiness?.id) {
                              setSelectedBusinessId(targetBusiness.id)
                            }
                            setBusinessScene('market')
                            setBusinessDetailTab('market')
                          }
                          if (!openMarketListingDetail(resolvedListing)) {
                            setError('İlan detayı açılamadı. Lütfen 2. el pazarından tekrar deneyin.')
                            return
                          }
                          setProfileModalUserId(null)
                          setProfileModalBusinessExpand(null)
                        }

                        return (
                          <article
                            key={listingId}
                            className={`fleet-market-row fleet-market-listable${listingLocked ? ' is-locked' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={(event) => { void handleOpenListing(event) }}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return
                              event.preventDefault()
                              void handleOpenListing(event)
                            }}
                          >
                            <span className="fleet-compact-thumb" data-broken={image ? '0' : '1'}>
                              {image ? (
                                <img
                                  src={image}
                                  alt={listingName}
                                  onError={(event) => {
                                    event.target.style.display = 'none'
                                    event.target.parentElement?.setAttribute('data-broken', '1')
                                  }}
                                />
                              ) : null}
                              <span className="fleet-active-fallback">
                                {vehicleEmojiByTier(listing?.tier, templateId)}
                              </span>
                            </span>
                            <div className="fleet-market-copy">
                              <strong>{listingName}</strong>
                              <div className="fleet-market-meta-line">
                                <span className="fleet-market-level">{listingTypeLabel}</span>
                                <span className="fleet-market-level">Seviye {fmt(listingRequiredLevel)}</span>
                              </div>
                              {templateId === 'logistics' ? (
                                <small className="fleet-market-truck-meta">
                                  <img src="/home/icons/depot/capacity.png" alt="" className="fleet-market-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                                  Kapasite: {fmt(listingCapacity)}
                                </small>
                              ) : null}
                            </div>
                            <div className="fleet-market-price">
                              <span>Satış Fiyatı</span>
                              <strong>
                                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                                {fmt(listingPrice)}
                              </strong>
                            </div>
                            <div className="fleet-market-footer">
                              <div className="fleet-compact-metrics fleet-market-metrics">
                                <span className="fleet-compact-metric">
                                  <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                                  Gelir +{fmt(listingIncome)}
                                </span>
                                <span className="fleet-compact-metric">
                                  <img src={templateId === 'logistics' ? '/home/icons/depot/oil.webp' : listingFuelMeta.icon} alt="" aria-hidden="true" />
                                  {(templateId === 'logistics' ? 'Benzin Gideri' : listingFuelMeta.expenseLabel)} -{fmt(listingFuelNeed)}
                                </span>
                                <span className="fleet-compact-metric">
                                  <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                                  XP +{fmt(listingXp)}
                                </span>
                              </div>
                              {listingLockedByBusiness ? (
                                <small className="fleet-market-lock">
                                  Kilitli: {listingTypeLabel} açık değil.
                                </small>
                              ) : listingLockedByLevel ? (
                                <small className="fleet-market-lock">
                                  Kilitli: Gereken seviye {fmt(listingRequiredLevel)} | {templateId === 'logistics' ? 'Oyuncu seviyesi' : 'Açılan seviye'} {fmt(listingCurrentLevel)}
                                </small>
                              ) : (
                                <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            ) : null}

            {profileModalBusinessExpand ? (
              <div className="player-profile-expand-section">
                <div className="player-profile-expand-head">
                  <div className="player-profile-expand-avatar-block">
                    <button
                      type="button"
                      className="player-profile-expand-back"
                      onClick={() => setProfileModalBusinessExpand(null)}
                    >
                      ← Profile Dön
                    </button>
                    <div className="player-profile-expand-avatar-wrap">
                      <img
                        src={profileModalData.avatar?.url || '/splash/logo.png'}
                        alt=""
                        className="player-profile-expand-avatar"
                        onError={(e) => { e.target.src = '/splash/logo.png' }}
                      />
                      <div className="player-profile-expand-meta">
                        <div className="player-profile-expand-name">
                          {profileModalData.displayName || profileModalData.username || 'Oyuncu'}
                        </div>
                        <div className="player-profile-expand-sub">
                          {(() => {
                            const tpl = String(profileModalBusinessExpand || '').trim()
                            if (tpl === 'moto-rental') return 'Motor Garajı'
                            if (tpl === 'auto-rental') return 'Araba Garajı'
                            if (tpl === 'logistics') return 'Tır Garajı'
                            if (tpl === 'property-rental') return 'Mülk Portföyü'
                            return 'Garaj'
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  {profileModalUserId && user?.id && String(profileModalUserId) !== String(user.id) && profileModalData?.username ? (() => {
                    const hasVehicles = profileModalBusinessExpand === 'logistics'
                      ? (() => {
                          const lf = profileModalData.logisticsFleet || {}
                          const trucks = lf.owned || lf.trucks || []
                          return trucks.length > 0
                        })()
                      : (() => {
                          const b = profileModalData.businesses?.find((x) => x.templateId === profileModalBusinessExpand)
                          const vehicles = b?.vehicles || []
                          return vehicles.length > 0
                        })()
                    if (!hasVehicles) return null
                    return (
                      <button
                        type="button"
                        className="player-profile-teklif-btn"
                        disabled={profileTeklifSending}
                        onClick={() => _sendProfileTeklif(
                          profileModalData.username,
                          profileModalBusinessExpand === 'logistics'
                            ? 'Tır Kiralama'
                            : (BUSINESS_UNLOCK_LABEL_BY_KEY[profileModalBusinessExpand] || profileModalBusinessExpand),
                        )}
                      >
                        {profileTeklifSending ? 'Açılıyor...' : 'DM ile Teklif'}
                      </button>
                    )
                  })() : null}
                </div>
                {profileModalBusinessExpand === 'logistics' ? (
                  (() => {
                    const lf = profileModalData.logisticsFleet || {}
                    const trucks = lf.owned || lf.trucks || []
                    if (trucks.length === 0) return null
                    return (
                      <div className="player-profile-vehicle-list">
                        <h5 className="player-profile-expand-title">Tırlar</h5>
                        <ul className="player-profile-vehicle-ul">
                          {trucks.map((t) => (
                            <li key={t.id} className="player-profile-vehicle-li">
                              <img src={t.image || '/splash/logo.png'} alt="" className="player-profile-vehicle-thumb" onError={(e) => { e.target.src = '/splash/logo.png' }} />
                              <span>{t.name || 'Tır'}</span>
                              {profileModalUserId && user?.id && String(profileModalUserId) !== String(user.id) && profileModalData?.username ? (
                                <button type="button" className="btn btn-small player-profile-vehicle-teklif" onClick={() => _sendProfileTeklif(profileModalData.username, `${t.name || 'Tır'} (Tır Kiralama)`)} disabled={profileTeklifSending}>
                                  {profileTeklifSending ? 'Açılıyor...' : 'DM ile Teklif'}
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })()
                ) : (
                  (() => {
                    const b = profileModalData.businesses?.find((x) => x.templateId === profileModalBusinessExpand)
                    const vehicles = b?.vehicles || []
                    const expandedTemplateId = String(profileModalBusinessExpand || '').trim()
                    const defaultVehicleLabel = expandedTemplateId === 'moto-rental'
                      ? 'Motor'
                      : expandedTemplateId === 'auto-rental'
                        ? 'Araba'
                        : expandedTemplateId === 'property-rental'
                          ? 'Mülk'
                          : 'Araç'
                    const fallbackTitle = expandedTemplateId === 'moto-rental'
                      ? 'Motorlar'
                      : expandedTemplateId === 'auto-rental'
                        ? 'Arabalar'
                        : expandedTemplateId === 'property-rental'
                          ? 'Mülkler'
                          : 'Araçlar'
                    const title = BUSINESS_UNLOCK_LABEL_BY_KEY[expandedTemplateId] || b?.name || fallbackTitle
                    if (vehicles.length === 0) return null
                    return (
                      <div className="player-profile-vehicle-list">
                        <h5 className="player-profile-expand-title">{title}</h5>
                        <ul className="player-profile-vehicle-ul">
                          {vehicles.map((v) => (
                            <li key={v.id} className="player-profile-vehicle-li">
                              <img src={v.image || '/splash/logo.png'} alt="" className="player-profile-vehicle-thumb" onError={(e) => { e.target.src = '/splash/logo.png' }} />
                              <span>{v.name || defaultVehicleLabel}</span>
                              {profileModalUserId && user?.id && String(profileModalUserId) !== String(user.id) && profileModalData?.username ? (
                                <button type="button" className="btn btn-small player-profile-vehicle-teklif" onClick={() => _sendProfileTeklif(profileModalData.username, `${v.name || defaultVehicleLabel} (${title})`)} disabled={profileTeklifSending}>
                                  {profileTeklifSending ? 'Açılıyor...' : 'DM ile Teklif'}
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })()
                )}
              </div>
            ) : null}
            <div className="player-profile-meta">
              {profileModalData.createdAt ? (
                <p className="player-profile-meta-row">
                  <span className="player-profile-meta-label">Kayıt Tarihi</span>
                  <span>{formatDateTime(profileModalData.createdAt)}</span>
                </p>
              ) : null}
              {profileModalData.updatedAt ? (
                <p className="player-profile-meta-row">
                  <span className="player-profile-meta-label">Aktiflik</span>
                  <span>{formatDateTime(profileModalData.updatedAt)}</span>
                </p>
              ) : null}
            </div>
          </div>
        ) : profileModalLoading ? (
          <div className="player-profile-loading">Yükleniyor...</div>
        ) : (
          <div className="player-profile-loading">Profil yüklenemedi.</div>
        )}
      </article>
    </section>
  )
}
