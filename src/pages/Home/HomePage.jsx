import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import {
  createMarketAuction,
  buyItem,
  buyFromSellOrder,
  cancelOrderBookOrder,
  claimLeagueReward,
  openLeagueSeasonChest,
  collectBusinessesBulk,
  collectBusinessIncome,
  collectLogisticsIncome,
  collectFactory,
  collectFactoriesBulk,
  createPriceAlert,
  buyBusiness,
  buyFactory,
  getBusinessesState,
  getFactoriesState,
  getMinesState,
  startMineDig,
  collectMine,
  getChatRoomState,
  getGameOverview,
  getLeagueState,
  getLogisticsState,
  getMessageCenterState,
  getDirectMessageThread,
  getMarketState,
  getForexState,
  getBankState,
  depositBankCash,
  withdrawBankCash,
  openBankTermDeposit,
  claimBankTermDeposit,
  getMissionsState,
  claimMissionReward,
  getOrderBookState,
  getProfileState,
  getPublicProfileState,
  getFriendsState,
  sendFriendRequestToUser,
  respondFriendRequest,
  removeFriendFromUser,
  setUserBlocked,
  getPushCenterState,
  markMessageCenterItemRead,
  purchaseLogisticsTruck,
  listLogisticsTruckForSale,
  getRealtimeMessagesUrl,
  getRealtimeChatUrl,
  getRealtimeSocketProtocols,
  listBusinessVehicle,
  buyBusinessVehicleListing,
  cancelBusinessVehicleListing,
  scrapBusinessVehicleListing,
  scrapBusinessVehicle,
  scrapLogisticsTruck,
  placeOrderBookOrder,
  placeAuctionBid,
    readPushNotification,
    moderateBlockMessages,
    moderateDeleteChatMessage,
    moderateDeleteDirectMessage,
    reportChatMessage,
    reportDirectMessage,
    sendDirectMessageToUser,
  sendChatRoomMessage,
  sellItem,
  buyForexCurrency,
  sellForexCurrency,
  purchasePremium,
  getDailyLoginReward,
  claimDailyLoginReward,
  getDailyStore,
  purchaseDailyOffer,
  consumeDiamondWelcomePack,
  updatePushSettings,
  submitSupportRequest,
  uploadProfileAvatarFile,
  produceBusinessVehicle,
  speedupFactoryBuild,
  speedupFactoryUpgrade,
  upgradeFactory,
  upgradeBusinessLevel,
} from '../../services/game.js'
import {
  changeCurrentUserUsername,
  changeCurrentUserPassword,
  consumeAuthNotice,
  getStoredUser,
  shouldForceLogoutFromResult,
} from '../../services/auth.js'
import './HomePage.css'

const NAV = [
  {
    id: 'nav-profile',
    label: 'Premium',
    icon: '/home/icons/depot/premium.webp',
    fallbackIcon: '/home/icons/v2/settings.png',
    target: { tab: 'profile', profileTab: 'premium' },
  },
  {
    id: 'nav-leaderboard',
    label: 'Liderlik',
    icon: '/home/icons/liderlik.webp',
    fallbackIcon: '/home/icons/v2/clan.png',
    target: { tab: 'profile', profileTab: 'leaderboard' },
  },
  {
    id: 'nav-home',
    label: 'Şehir',
    icon: '/home/icons/sehir.webp',
    fallbackIcon: '/home/icons/v2/nav-home.png',
    center: true,
    target: { tab: 'home' },
  },
  {
    id: 'nav-chat-trade',
    label: 'Mesajlar',
    icon: '/home/icons/mesajlar.webp',
    fallbackIcon: '/home/icons/v2/nav-message.png',
    target: { tab: 'messages', messageFilter: 'all' },
  },
  {
    id: 'nav-chat-global',
    label: 'Sohbet',
    icon: '/home/icons/sohbet.png',
    fallbackIcon: '/home/icons/v2/team-lobby.png',
    target: { tab: 'chat' },
  },
]

const MARKET_TABS = ['buy', 'sell', 'orderbook', 'auction', 'chart']
const BUSINESS_DETAIL_TABS = ['garage', 'market']
const CHAT_ROOM = 'global'
const CHAT_PRUNE_TRIGGER = 25
const CHAT_PRUNE_KEEP_COUNT = 25
const DEFAULT_CHAT_AVATAR = '/splash/logo.webp'
const MESSAGE_FILTERS = [
  { id: 'all', label: 'Hepsi' },
  { id: 'message', label: 'Mesaj' },
  { id: 'trade', label: 'Ticaret' },
  { id: 'other', label: 'Di\u011fer' },
  { id: 'alert', label: 'Uyar\u0131' },
]
const MESSAGE_ICONS = {
  default: '/home/icons/v2/nav-message.png',
  defaultFallback: '/home/icons/v2/nav-message.png',
  message: '/home/icons/v2/nav-mesajlar.png',
  messageFallback: '/home/icons/v2/nav-message.png',
  trade: '/home/icons/v2/market.png',
  tradeFallback: '/home/icons/v2/quick-start.png',
  alert: '/home/icons/v2/nav-uyari.png',
  alertFallback: '/home/icons/v2/ranked-match.png',
  other: '/home/icons/v2/settings.png',
  otherFallback: '/home/icons/v2/nav-message.png',
}

const CHAT_SEED = {
  global: [],
}
const EMPTY_CHAT_RESTRICTIONS = {
  canSend: true,
  mute: {
    active: false,
    reason: '',
    reasonCode: '',
    mutedUntil: '',
    remainingMs: 0,
    strikeCount: 0,
    lastViolationAt: '',
  },
  block: {
    active: false,
    reason: '',
    blockedUntil: '',
    remainingMs: 0,
  },
  cooldown: {
    active: false,
    remainingMs: 0,
    waitSeconds: 0,
    lastSentAt: '',
    availableAt: '',
  },
}
const EMPTY_USER_MODERATION = {
  chatBlock: {
    active: false,
    blockedUntil: '',
    reason: '',
    remainingMs: 0,
  },
  dmBlock: {
    active: false,
    blockedUntil: '',
    reason: '',
    remainingMs: 0,
  },
  mute: {
    active: false,
    mutedUntil: '',
    reason: '',
    remainingMs: 0,
  },
}

const AVATAR_CROP_PREVIEW_SIZE = 248
const AVATAR_CROP_OUTPUT_SIZE = 512
const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024
const AVATAR_MAX_FILE_MB = Math.round(AVATAR_MAX_FILE_BYTES / (1024 * 1024))
const COLLECTION_TAX_RATE = 0.01
const COLLECTION_TAX_PERCENT = Math.round(COLLECTION_TAX_RATE * 100)
const VEHICLE_MARKET_COMMISSION_RATE = 0.05
const VEHICLE_MARKET_COMMISSION_PERCENT = Math.round(VEHICLE_MARKET_COMMISSION_RATE * 100)
const VEHICLE_SCRAP_RETURN_RATE = 0.02
const VEHICLE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000
const VEHICLE_LIFETIME_MONTHS_TOTAL = 6
const LISTING_PRICE_PROFILE = {
  'moto-rental': {
    minFloor: 300000,
    minStepByLevel: 45000,
    maxFloor: 25000000,
    maxStepByLevel: 1500000,
  },
  'auto-rental': {
    minFloor: 900000,
    minStepByLevel: 90000,
    maxFloor: 45000000,
    maxStepByLevel: 2300000,
  },
  'property-rental': {
    minFloor: 1800000,
    minStepByLevel: 130000,
    maxFloor: 120000000,
    maxStepByLevel: 5200000,
  },
  logistics: {
    minFloor: 1800000,
    minStepByLevel: 140000,
    maxFloor: 85000000,
    maxStepByLevel: 3800000,
  },
}
const MESSAGES_DISABLED = false
const WS_SESSION_REPLACED_CODE = 4001
const SESSION_REPLACED_NOTICE =
  'Hesabınız başka bir cihazda açıldı. Bu cihazdaki oturum güvenlik nedeniyle kapatıldı.'
const NAV_THEME_STORAGE_KEY = 'ticarnet-mobile-nav-theme'
const NAV_THEME_DEFAULT = 'default'
const NAV_THEMES = ['default', 'dark', 'ocean', 'fire', 'gold']
const PROFILE_THEME_OPTIONS = [
  { id: 'default', label: 'Varsayılan Tema', description: 'Klasik oyun görünümü' },
  { id: 'dark', label: 'Koyu Tema', description: 'Sade ve dengeli koyu palet' },
  { id: 'ocean', label: 'Okyanus Tema', description: 'Mavi ve ferah görünüm' },
  { id: 'fire', label: 'Ateş Tema', description: 'Sıcak kırmızı/turuncu palet' },
  { id: 'gold', label: 'Altın Tema', description: 'Premium altın vurgulu görünüm' },
]
const IS_NATIVE_ANDROID_RUNTIME =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
const DIAMOND_WELCOME_PACK_ID = 'welcome-pack-5000'
const DIAMOND_CASH_PACKAGES = [
  {
    id: DIAMOND_WELCOME_PACK_ID,
    diamonds: 5000,
    priceTry: 2499.99,
    welcomeOnly: true,
    title: '5.000 Elmas (Hoş Geldin Paketi)',
    ribbon: 'HOŞ GELDİN',
    note: 'Yeni oyuncuya özel',
  },
  { id: 'pack-100', diamonds: 100, priceTry: 99.99, title: '100 Elmas Paketi' },
  { id: 'pack-300', diamonds: 300, priceTry: 299.99, title: '300 Elmas Paketi' },
  { id: 'pack-1000', diamonds: 1000, priceTry: 899.99, title: '1.000 Elmas Paketi' },
  { id: 'pack-3000', diamonds: 3000, priceTry: 2399.99, title: '3.000 Elmas Paketi' },
  { id: 'pack-5000', diamonds: 5000, priceTry: 3499.99, title: '5.000 Elmas Paketi' },
  { id: 'pack-7500', diamonds: 7500, priceTry: 4999.99, title: '7.500 Elmas Paketi' },
  { id: 'pack-10000', diamonds: 10000, priceTry: 6399.99, title: '10.000 Elmas Paketi' },
  { id: 'pack-25000', diamonds: 25000, priceTry: 14999.99, title: '25.000 Elmas Paketi' },
]
const FOREX_TRADE_FEE_RATE = 0.003
const FOREX_TRADE_MAX_TOTAL_QUANTITY = 10000000
const FOREX_TRADE_MAX_QUANTITY = FOREX_TRADE_MAX_TOTAL_QUANTITY
const FOREX_TRADE_MAX_QUANTITY_DIGITS = String(FOREX_TRADE_MAX_QUANTITY).length
const FOREX_CURRENCY_ID_PATTERN = /^[a-z0-9_-]{2,24}$/
const FOREX_TRADE_SIDE_OPTIONS = [
  { value: 'buy', label: 'AL', description: 'Nakit ile TCT al', tone: 'buy' },
  { value: 'sell', label: 'BOZDUR', description: 'TCT bozdur, nakit al', tone: 'sell' },
]
const FOREX_CHART_RANGE_OPTIONS = [
  { id: '24h', label: '24 Saat', seconds: 24 * 60 * 60, candleCount: 24 },
  { id: '72h', label: '3 Gün', seconds: 72 * 60 * 60, candleCount: 48 },
  { id: '168h', label: '7 Gün', seconds: 168 * 60 * 60, candleCount: 72 },
]
const FOREX_CLIENT_POLL_INTERVAL_MS = 5000
const FOREX_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-doviz-menu.webp'
const FOREX_MENU_ICON_FALLBACK_SRC = '/home/icons/depot/cash.png'
const FOREX_HEADER_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-doviz-header.webp'
const FOREX_HEADER_ICON_FALLBACK_SRC = '/home/icons/depot/cash.png'
const BANK_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-bank-menu.webp'
const BANK_MENU_ICON_FALLBACK_SRC = '/home/icons/depot/cash.webp'
const BANK_HEADER_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-bank-menu.webp'
const BANK_HEADER_ICON_FALLBACK_SRC = '/home/icons/depot/cash.webp'
const EVENTS_MENU_ICON_PRIMARY_SRC = '/home/icons/etkinlikler.webp'
const EVENTS_MENU_ICON_FALLBACK_SRC = '/home/icons/v2/nav-missions.png'
const ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/duyuruu.webp'
const ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC = '/home/icons/messages/icon-duyuru.webp'
const DIAMOND_MARKET_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/elmasmarket.webp'
const DIAMOND_MARKET_MENU_ICON_FALLBACK_SRC = '/home/icons/depot/diamond.webp'
const SEASON_CHESTS_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/sandiklarim.webp'
const SEASON_CHESTS_MENU_ICON_FALLBACK_SRC = '/home/icons/leaderboard/chest-gold.webp'
const RULES_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/kurallarim.webp'
const RULES_MENU_ICON_FALLBACK_SRC = '/home/icons/v2/nav-uyari.png'
const ANNOUNCEMENT_TYPE_ANNOUNCEMENT = 'announcement'
const ANNOUNCEMENT_TYPE_UPDATE = 'update'
const TUTORIAL_PENDING_KEY = 'ticarnet_tutorial_pending'
const TUTORIAL_COMPLETED_KEY = 'ticarnet_tutorial_completed'
const TUTORIAL_STEP_KEY = 'ticarnet_tutorial_step'
const TUTORIAL_TASKS_KEY = 'ticarnet_tutorial_tasks'
const TUTORIAL_ASSISTANT_IMAGE_SRC = '/home/tutorial/asistan.webp'
const TUTORIAL_SPOTLIGHT_CLASS = 'tutorial-target-spotlight'
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Hoş Geldin',
    body:
      "TicarNet Online'a hoş geldin. Bu adımda oyunun ana menüsündeki bölümlerin ne işe yaradığını kısa ve net şekilde açıklıyorum.",
    objective:
      'Şehir menüsündeki 5 ana bölümü tanı: Depom, Üretim ve Gelişim, Ticaret ve Finans, Bilgilendirme ve Yönetim, Ödüller ve Premium.',
    actionPlan: [
      'Şehir ekranındaki bölüm başlıklarını sırayla incele.',
      'Önce Depom, sonra Üretim ve Ticaret modüllerini bir kez aç-kapat yap.',
      'Bugün için mini hedef belirle: 1 tahsilat + 1 satış + 1 görev ödülü.',
    ],
    kpi: 'İlk 10 dakikada en az 1 tahsilat ve 1 ticaret işlemi.',
    pitfall: 'Tüm nakdi tek hamlede harcama; her zaman operasyon nakdi bırak.',
    highlights: ['Şehir menüsü artık kategori bazlı gruplu.', 'İstediğin an Ayarlardan yeniden başlatabilirsin.'],
    target: { tab: 'home', selector: '.city-menu-stack', focusLabel: 'Şehir Menüsü' },
  },
  {
    id: 'depot',
    title: 'Depo ve Kaynaklar',
    body:
      'Depom ekranında nakit, elmas ve tüm kaynaklarını görürsün. Satın alma, üretim ve satış kararlarını önce depo stokuna göre ver.',
    objective: 'Kaynak ve nakit görünürlüğünü netleştirmek.',
    actionPlan: [
      'Düşük kalan 2-3 kritik kaynağı belirle (ör: petrol, enerji).',
      'Satışa çıkarmadan önce minimum operasyon stoğu ayarla.',
      'Nakit + stok birlikte izleyerek al-sat kararını ver.',
    ],
    kpi: 'Stokta kritik ürünlerin sıfıra düşmemesi.',
    pitfall: 'Tüm stokları satıp üretim zincirini kilitleme.',
    highlights: ['Stok düşükse önce maden/fabrika dengesini kur.', 'Nakit akışını depodaki kaynaklarla birlikte yönet.'],
    target: { tab: 'home', selector: '.module-btn-depot', focusLabel: 'Depo Karti' },
  },
  {
    id: 'businesses',
    title: 'İşletmeler',
    body: 'İşletmeler bölümünde iş kurar, araç filonu büyütür ve düzenli gelir toplarsın.',
    objective: 'Düzenli gelir akışı kurmak.',
    target: { tab: 'businesses', selector: '.business-screen', focusLabel: 'İşletmeler Ekranı' },
  },
  {
    id: 'factories',
    title: 'Fabrikalar',
    body:
      'Fabrikalar ham maddeyi daha değerli ürünlere çevirir. Yükseltme ve hızlandırma ile üretim verimini artırabilirsin.',
    objective: 'Ham maddeyi yüksek katma değerli çıktıya çevirmek.',
    actionPlan: [
      'Maliyeti düşük, talebi yüksek ürünleri hedefle.',
      'Yükseltme kararını geri ödeme süresine göre ver.',
      'Toplu tahsilatla zaman kazanıp ritmi koru.',
    ],
    kpi: 'Üretim başına net kâr ve düzenli çalışma süresi.',
    pitfall: 'Talep zayıf üründe aşırı üretim yapma.',
    highlights: ['Üretim maliyetini depo stokuna göre ayarla.', 'Toplu tahsilatla zaman kazanıyorsun.'],
    target: { tab: 'factories', selector: '.factory-screen', focusLabel: 'Fabrika Paneli' },
  },
  {
    id: 'mines',
    title: 'Madenler',
    body:
      'Madenler, fabrika ve pazar döngüsünü besleyen temel kaynak alanıdır. Düzenli kazı, maliyetini düşürür.',
    objective: 'Üretim zinciri için taban kaynak güvencesi sağlamak.',
    actionPlan: [
      'Fabrikada en çok tükettiğin kaynağa öncelik ver.',
      'Kazı takvimini boş saatlerine sabitle.',
      'Çıkan kaynakları doğrudan maliyet düşürmede kullan.',
    ],
    kpi: 'Fabrikada kaynak yokluğu nedeniyle duruş yaşamamak.',
    pitfall: 'Tek kaynağa odaklanıp diğer kritik kalemleri bitirme.',
    highlights: ['Maden çıktıları fabrika maliyetini azaltır.', 'Kaynak dengesini bozma, tek ürüne aşırı yüklenme.'],
    target: { tab: 'mines', selector: '.mines-screen', focusLabel: 'Maden Kartlari' },
  },
  {
    id: 'market',
    title: 'Pazar ve Emir Defteri',
    body:
      'Pazarda anlık alım-satım yaparsın. Emir defterinde limit emir açarak daha iyi fiyatlardan işlem yapabilirsin.',
    objective: 'Alım-satım marjını profesyonel şekilde optimize etmek.',
    actionPlan: [
      'Anlık ihtiyaç için pazar, fiyat avantajı için limit emir kullan.',
      'İlan veya emir açmadan önce toplam maliyet ve vergi etkisini hesapla.',
      'Düşük hacimli üründe agresif pozisyon alma.',
    ],
    kpi: 'İşlem sonu net marjin pozitif kalmalı.',
    pitfall: 'Komisyon/vergiyi hesaba katmadan fiyat belirleme.',
    highlights: ['Acele alımda pazar, stratejik alımda emir defteri daha iyi olur.', 'Kâr marjı için birim fiyat ve vergi etkisini birlikte hesapla.'],
    target: { tab: 'marketplace', selector: '.marketplace-screen', focusLabel: 'Pazar Paneli' },
  },
  {
    id: 'bank',
    title: 'Banka ve Nakit Yönetimi',
    body:
      'Bankada para yatırır/çeker, vadelide getiriyi büyütürsün. Büyük alımlardan önce bankadaki ve eldeki nakdi birlikte planla.',
    objective: 'Likiditeyi korurken getiriyi artırmak.',
    actionPlan: [
      'Operasyon için gerekli nakdi elde tut, fazlayı bankaya aktar.',
      'Vadeli açmadan önce yakın dönem harcamalarını kontrol et.',
      'Büyük alımdan önce bankadan çekim planını hazırla.',
    ],
    kpi: 'Likidite sıkışıklığı yaşamadan düzenli getiri.',
    pitfall: 'Tüm parayı vadeliye bağlayıp işlem kabiliyetini kaybetme.',
    highlights: ['Vadeli hesapta para kilitlenir, zamanlamayı doğru seç.', 'Likiditeyi sıfıra düşürme; her zaman işlem nakdi bırak.'],
    target: { tab: 'bank', selector: '.bank-screen', focusLabel: 'Banka İşlemleri' },
  },
  {
    id: 'missions',
    title: 'Görevler ve Etkinlikler',
    body:
      'Görevler düzenli ek ödül verir. Etkinlikler ise belirli günlerde bonus çarpanı açarak ilerlemeni hızlandırır.',
    objective: 'Ödül çarpanı ile ilerleme hızını artırmak.',
    actionPlan: [
      'Günlük oturumda önce kolay görevleri temizle.',
      'Etkinlik penceresinde tahsilat/üretim aksiyonlarını öne çek.',
      'Ödülleri bir sonraki büyüme adımı için kullan.',
    ],
    kpi: 'Her oturumda görev ödüllerinden net kazanç.',
    pitfall: 'Etkinlik zamanlarını takip etmeden rutin oynamak.',
    highlights: ['Görevleri günlük rutine bağla.', 'Etkinlik saatlerinde tahsilat almak daha verimli olur.'],
    target: { tab: 'missions', selector: '.missions-screen', focusLabel: 'Görev Listesi' },
  },
  {
    id: 'announcements',
    title: 'Duyurular ve Kurallar',
    body:
      'Bilgilendirme ve Yönetim bölümünde resmi duyuruları, etkinlik takvimini ve oyun kurallarını takip edersin.',
    objective: 'Güncel bilgi ve kuralları düzenli takip ederek hatasız ilerlemek.',
    actionPlan: [
      'Duyurular ekranını açıp en güncel bildiriyi oku.',
      'Etkinlikler sekmesinden günlük takvimi kontrol et.',
      'Kurallar bölümünde özellikle ticaret ve hesap güvenliği maddelerini gözden geçir.',
    ],
    kpi: 'Her oturumda en az 1 duyuru ve 1 etkinlik bilgisi kontrolü.',
    pitfall: 'Duyuru okumadan işlem yapıp güncel değişiklikleri kaçırmak.',
    highlights: ['Kurallar ihlallerinde sistemsel yaptırım uygulanır.', 'Duyurular ekranı resmi kaynak olarak kullanılmalı.'],
    target: { tab: 'home', selector: '.module-btn-announcements', focusLabel: 'Bilgilendirme Modülleri' },
  },
  {
    id: 'rewards',
    title: 'Sandıklar ve Premium',
    body:
      'Ödüller ve Premium bölümünde sezon sandıklarını açar, Elmas Marketi üzerinden premium paketlere erişirsin.',
    objective: 'Sezon ödüllerini zamanında toplamak ve premium kaynak planını doğru yönetmek.',
    actionPlan: [
      'Sandıklar kartından bekleyen sezon ödüllerini kontrol et.',
      'Elmas Marketi fiyatlarını alım öncesi karşılaştır.',
      'Ödül ve premium harcamasını haftalık hedefe göre planla.',
    ],
    kpi: 'Bekleyen sandık bırakmamak ve planlı premium kullanımı.',
    pitfall: 'Ödülleri geciktirip sezon kazanımlarını atıl bırakmak.',
    highlights: ['Sandıklar birikimli tutulabilir.', 'Elmas alımlarında bütçe/disiplin önemli.'],
    target: { tab: 'home', selector: '.module-btn-season-chest', focusLabel: 'Ödül ve Premium Modülleri' },
  },
  {
    id: 'social',
    title: 'Mesajlar ve Sohbet',
    body:
      'Mesajlar ekranında bildirim ve özel mesajlarını yönetirsin. Sohbetten oyuncularla ticaret ve bilgi akışına katılabilirsin.',
    objective: 'Bilgi ve ticaret akışını verimli yönetmek.',
    actionPlan: [
      'Önemli bildirimleri düzenli oku ve aksiyon al.',
      'DM tekliflerinde fiyat, miktar ve güven dengesini kontrol et.',
      'Sohbette gereksiz riskli teklifleri filtrele.',
    ],
    kpi: 'Bildirim kaçırmadan zamanında geri dönüş.',
    pitfall: 'Detayı okumadan teklife hızlı onay vermek.',
    highlights: ['Önemli sistem bildirimlerini kaçırma.', 'Ticaret tekliflerinde fiyat/teslim dengesine dikkat et.'],
    target: {
      tab: 'messages',
      messageFilter: 'all',
      selector: '.message-screen',
      focusLabel: 'Mesaj ve Bildirim Merkezi',
    },
  },
  {
    id: 'profile',
    title: 'Profil ve Ayarlar',
    body:
      'Profil ekranından hesap güvenliği, profil bilgileri ve kişisel tercihlerini yönetirsin. Rehberi bu alandan dilediğin zaman yeniden başlatabilirsin.',
    objective: 'Hesabı güvenli, düzenli ve kontrol edilebilir biçimde yönetmek.',
    actionPlan: [
      'Şifreyi güçlü tut ve düzenli aralıklarla güncelle.',
      'Profil adı ve avatar bilgilerini düzenli kontrol et.',
      'Takıldığında rehberi Ayarlar bölümünden yeniden başlat.',
    ],
    kpi: 'Güncel profil bilgileri + güvenli hesap yönetimi.',
    pitfall: 'Güvenlik adımlarını ertelemek ve eski şifreyi uzun süre kullanmak.',
    highlights: ['Şifre yenileme ve güvenlik seçenekleri bu sayfada.', 'Rehberi yeniden başlat butonu Ayarlar bölümünde.'],
    target: {
      tab: 'profile',
      profileTab: 'profile',
      selector: '.profile-account-info-card',
      focusLabel: 'Profil Ayarları',
    },
  },
]

const TUTORIAL_STEP_IMAGE_BY_ID = {
  welcome: '/home/tutorial/asistan.webp',
  depot: '/home/icons/depom.webp',
  businesses: '/home/icons/isletmeler.webp',
  factories: '/home/icons/businesses/fabrikam.webp',
  mines: '/home/icons/madenler.webp',
  market: '/home/icons/pazaryeri.webp',
  bank: '/home/icons/custom/ticarnet-bank-menu.webp',
  missions: '/home/icons/v2/nav-missions.png',
  announcements: '/home/icons/custom/duyuruu.webp',
  rewards: '/home/icons/custom/sandiklarim.webp',
  social: '/home/icons/mesajlar.webp',
  profile: '/home/icons/ayarlar.webp',
}

const CITY_RULES_GUIDE = {
  title: 'TİCARNET RESMÎ OYUN KURALLARI',
  subtitleLines: [
    'Bu sayfa, TicarNet şehir ekonomisi ve topluluk düzeni için zorunlu kuralları içerir.',
    'Kural ihlallerinde sistemsel veya yönetim onaylı yaptırımlar uygulanır.',
  ],
  groups: [
    {
      id: 'community',
      icon: '🗣️',
      title: 'İLETİŞİM VE TOPLULUK DÜZENİ',
      description: 'Sohbet, mesajlaşma ve oyuncu etkileşimlerinde saygı esastır.',
      rules: [
        {
          text: 'Küfür, hakaret, aşağılayıcı hitap ve kışkırtıcı dil kullanımı yasaktır.',
          penalty: 'İlk ihlal: 12 saat sohbet kısıtı',
          note: 'İkinci ihlalde ceza süresi 72 saate yükseltilir.',
          tone: 'amber',
        },
        {
          text: 'Tehdit, taciz, şantaj ve kişisel bilgileri ifşa etmeye yönelik içerik yasaktır.',
          penalty: '24 saat oyun erişim kısıtı + sohbet engeli',
          note: 'Ağır ihlallerde hesap kalıcı olarak kapatılır.',
          tone: 'red',
        },
        {
          text: 'Spam, flood, otomatik tekrar mesajı ve reklam amaçlı içerik paylaşımı yasaktır.',
          penalty: '6 saat sohbet kısıtı + mesaj gönderim limiti',
          note: 'Tekrar eden spam ihlallerinde 24 saat erişim kısıtı uygulanır.',
          tone: 'green',
        },
      ],
    },
    {
      id: 'economy',
      icon: '💼',
      title: 'TİCARET VE EKONOMİ KURALLARI',
      description: 'Pazar, ticaret ve varlık transferlerinde adil rekabet zorunludur.',
      rules: [
        {
          text: 'Pazar fiyatlarını organize şekilde manipüle ederek haksız kazanç oluşturmak yasaktır.',
          penalty: '48 saat pazar erişim yasağı + işlemlerin geri alınması',
          tone: 'red',
        },
        {
          text: 'Çoklu hesaplarla aynı oyuncuya avantaj sağlayan ticari aktarım zinciri kurmak yasaktır.',
          penalty: '7 gün ticaret blokesi + varlık incelemesi',
          note: 'İnceleme sonucuna göre kalıcı yaptırım uygulanabilir.',
          tone: 'amber',
        },
        {
          text: 'Oyun içi dolandırıcılık, sahte vaatle eşya/para alma veya anlaşma ihlali yasaktır.',
          penalty: 'Hesabınız kalıcı olarak banlanır',
          note: 'Doğrulanan vakalarda haksız kazanımlar tamamen silinir.',
          tone: 'red',
        },
      ],
    },
    {
      id: 'security',
      icon: '🔐',
      title: 'HESAP VE GÜVENLİK KURALLARI',
      description: 'Hesap bütünlüğünü bozacak her girişim ağır ihlal kapsamında değerlendirilir.',
      rules: [
        {
          text: 'Hesap paylaşımı, hesap devri ve hesap satışı kesin olarak yasaktır.',
          penalty: '72 saat hesap kilidi + kimlik doğrulama zorunluluğu',
          tone: 'amber',
        },
        {
          text: 'Başka oyuncu hesabına izinsiz erişim denemesi, parola ele geçirme veya sosyal mühendislik yasaktır.',
          penalty: 'Süresiz hesap kapatma + IP engeli',
          tone: 'red',
        },
        {
          text: 'Üçüncü taraf yazılım, script, bot veya otomatik makro kullanımı yasaktır.',
          penalty: '30 gün hesap askıya alma + sezon puanlarının sıfırlanması',
          note: 'Tekrar eden ihlallerde kalıcı ban uygulanır.',
          tone: 'red',
        },
      ],
    },
    {
      id: 'technical',
      icon: '🧪',
      title: 'TEKNİK İSTİSMAR KURALLARI',
      description: 'Açık yönetimi ve istemci bütünlüğü oyun dengesini korumak için denetlenir.',
      rules: [
        {
          text: 'Bug veya açık tespit edildiğinde raporlamak yerine kişisel çıkar için kullanmak yasaktır.',
          penalty: '14 gün erişim yasağı + haksız kazanımların silinmesi',
          tone: 'red',
        },
        {
          text: 'İstemci dosyalarını değiştirerek avantaj sağlayan müdahale ve bellek hilesi yasaktır.',
          penalty: 'Kalıcı hesap kapatma',
          tone: 'red',
        },
        {
          text: 'Bot farm, otomatik görev döngüsü ve sunucu yükünü artıran yapay trafik oluşturmak yasaktır.',
          penalty: '15 gün erişim kısıtı + elde edilen gelirlerin geri alınması',
          tone: 'green',
        },
      ],
    },
    {
      id: 'governance',
      icon: '📜',
      title: 'YÖNETİM VE İTİRAZ SÜRECİ',
      description: 'Yaptırım kararları kayıt altındadır ve belirli koşullarda itiraz edilebilir.',
      rules: [
        {
          text: 'Yönetim kararlarını yanıltmak için sahte kanıt üretmek veya yanlış rapor zinciri oluşturmak yasaktır.',
          penalty: '7 gün raporlama özelliği kapatma + 24 saat sohbet kısıtı',
          tone: 'amber',
        },
        {
          text: 'Yönetim işlemlerini engellemeye yönelik organize davranışlar yasaktır.',
          penalty: '72 saat hesap askıya alma',
          note: 'Ağır ihlaller kalıcı yasakla sonuçlanabilir.',
          tone: 'red',
        },
        {
          text: 'Yaptırım itirazları, karar bildiriminden sonra 72 saat içinde yapılmalıdır.',
          penalty: 'Süre aşımında karar kesinleşir',
          tone: 'green',
        },
      ],
    },
  ],
  finalNote:
    'Önemli: Tüm kurallar TicarNet yönetimi tarafından uygulanır ve gerektiğinde güncellenir. Kurallarda açıkça yazmasa bile oyun dengesini bozan her eylem yaptırım kapsamına alınabilir. Her oyuncu kuralları okumak ve uymakla yükümlüdür.',
}

const FLEET_CARD_META = {
  'moto-rental': {
    icon: '/home/icons/v2/nav-sehir.png',
    fallback: 'MTR',
    label: 'Motor Kiralama',
    unitLabel: 'Motor',
    secondHandLabel: 'İkinci El Motor Pazarı',
    newOrderLabel: 'Sıfır Motor Siparişi',
    marketTitle: 'İkinci El Motor Pazarı',
    galleryTitle: 'Sıfır Motor Siparişi',
    companySuffix: 'Motor Kiralama',
    ownedTitle: 'Motorlarım',
  },
  'auto-rental': {
    icon: '/home/icons/v2/market.png',
    fallback: 'OTO',
    label: 'Araba Kiralama',
    unitLabel: 'Araç',
    secondHandLabel: 'İkinci El Araba Pazarı',
    newOrderLabel: 'Sıfır Araba Siparişi',
    marketTitle: 'İkinci El Araba Pazarı',
    galleryTitle: 'Sıfır Araba Siparişi',
    companySuffix: 'Araba Kiralama',
    ownedTitle: 'Arabalarım',
  },
  'property-rental': {
    icon: '/home/icons/businesses/mulkum.webp',
    fallback: 'MLK',
    label: 'Mülk Kiralama',
    unitLabel: 'Mülk',
    secondHandLabel: 'İkinci El Mülk Pazarı',
    newOrderLabel: 'Yeni Mülk Siparişi',
    marketTitle: 'İkinci El Mülk Pazarı',
    galleryTitle: 'Yeni Mülk Siparişi',
    companySuffix: 'Mülk Kiralama',
    ownedTitle: 'Mülklerim',
  },
}

const BUSINESS_UNLOCK_ICON_BY_KEY = {
  'moto-rental': '/home/icons/businesses/moto-kiralama.webp',
  'auto-rental': '/home/icons/businesses/oto-kiralama.webp',
  'property-rental': '/home/icons/businesses/mulkum.webp',
  logistics: '/home/icons/businesses/lojistik-kiralama.webp',
}

const BUSINESS_UNLOCK_LABEL_BY_KEY = {
  'moto-rental': 'Motor Kiralama',
  'auto-rental': 'Araba Kiralama',
  'property-rental': 'Mülk Kiralama',
  logistics: 'Tır Kiralama',
}

const FACTORY_CARD_ORDER = [
  'engine-factory',
  'spare-parts-factory',
  'timber-factory',
  'cement-factory',
  'brick-factory',
  'energy-factory',
  'oil-refinery',
]
const FACTORY_SHOP_IMAGE_BY_ID = {
  'engine-factory': '/home/icons/businesses/motorfab.webp',
  'spare-parts-factory': '/home/icons/businesses/yedekfab.webp',
  'timber-factory': '/home/icons/businesses/kerestefab.webp',
  'cement-factory': '/home/icons/businesses/cimentofab.webp',
  'brick-factory': '/home/icons/businesses/tuglafab.webp',
  'energy-factory': '/home/icons/businesses/enerjifab.webp',
  'oil-refinery': '/home/icons/businesses/petrolfab.webp',
}
const FACTORY_ITEM_META = {
  'engine-kit': { label: 'Motor', icon: '/home/icons/depot/spare-parts.webp' },
  'spare-parts': { label: 'Yedek Parça', icon: '/home/icons/depot/yedekparca.webp' },
  timber: { label: 'Kereste', icon: '/home/icons/depot/timber.webp' },
  cement: { label: 'Çimento', icon: '/home/icons/depot/cement.webp' },
  brick: { label: 'Tuğla', icon: '/home/icons/depot/brick.webp' },
  oil: { label: 'Petrol', icon: '/home/icons/depot/oil.webp' },
  energy: { label: 'Enerji', icon: '/home/icons/depot/enerji.png' },
  gold: { label: 'Altın', icon: '/home/icons/depot/gold.webp' },
  copper: { label: 'Bakır', icon: '/home/icons/depot/copper.webp' },
  steel: { label: 'Demir', icon: '/home/icons/depot/steel.webp' },
  coal: { label: 'Kömür', icon: '/home/icons/depot/coal.webp' },
}

/** Maden kartı görselleri: public/home/icons/mines/ — altınmaden.png, demirmaden.png, bakırmaden.png, kömürmaden.png */
const MINE_IMAGE_BY_ID = {
  'gold-mine': '/home/icons/mines/altınmaden.png',
  'steel-mine': '/home/icons/mines/demirmaden.webp',
  'copper-mine': '/home/icons/mines/bakırmaden.png',
  'coal-mine': '/home/icons/mines/kömürmaden.png',
}

const resolveMineImage = (mine) => {
  const safeId = String(mine?.id || '').trim()
  if (MINE_IMAGE_BY_ID[safeId]) return MINE_IMAGE_BY_ID[safeId]
  const meta = factoryItemMeta(mine?.outputItemId)
  return meta?.icon || '/home/icons/depot/cash.webp'
}

const factoryItemMeta = (itemId) => {
  const safeId = String(itemId || '').trim()
  if (FACTORY_ITEM_META[safeId]) return FACTORY_ITEM_META[safeId]
  return {
    label: safeId || 'Kaynak',
    icon: '/home/icons/depot/cash.webp',
  }
}

const resolveFactoryShopImage = (factory) => {
  const safeId = String(factory?.id || '').trim()
  if (FACTORY_SHOP_IMAGE_BY_ID[safeId]) return FACTORY_SHOP_IMAGE_BY_ID[safeId]
  const rawImage = String(factory?.image || '').trim()
  if (rawImage.includes('motorfab')) return '/home/icons/businesses/motorfab.webp'
  if (rawImage.includes('yedekfab')) return '/home/icons/businesses/yedekfab.webp'
  if (rawImage.includes('kerestefab')) return '/home/icons/businesses/kerestefab.webp'
  if (rawImage.includes('cimentofab') || rawImage.includes('cement')) return '/home/icons/businesses/cimentofab.webp'
  if (rawImage.includes('tuglafab') || rawImage.includes('brick')) return '/home/icons/businesses/tuglafab.webp'
  if (rawImage.includes('enerjifab')) return '/home/icons/businesses/enerjifab.webp'
  if (rawImage.includes('petrolfab')) return '/home/icons/businesses/petrolfab.webp'
  if (rawImage.includes('fabrikam')) return '/home/icons/businesses/fabrikam-shop.webp?v=20260314b'
  return rawImage || String(factory?.icon || '').trim() || '/home/icons/businesses/fabrikam-shop.webp?v=20260314b'
}

const factoryPurchaseRowsFromFactory = (factory) => {
  if (!factory || typeof factory !== 'object') return []
  return [
    {
      key: 'cash',
      label: 'Nakit',
      icon: '/home/icons/depot/cash.webp',
      required: Math.max(0, Math.trunc(num(factory.purchaseCostCash || 0))),
      missing: Math.max(0, Math.trunc(num(factory.missingPurchaseCash || 0))),
    },
    ...((factory.purchaseCostRows || []).map((row) => ({
      key: row.itemId,
      label: row.meta.label,
      icon: row.meta.icon,
      required: Math.max(0, Math.trunc(num(row.amount || 0))),
      missing: Math.max(0, Math.trunc(num(row.missing || 0))),
    }))),
  ]
}

const DEPOT_CATALOG = [
  {
    id: 'cash',
    label: 'Nakit',
    icon: 'NKT',
    png: '/home/icons/depot/cash.webp',
    category: 'Değerli',
    quality: 'elite',
    sourceIds: [],
    fromWallet: true,
    baseQuantity: 5000,
  },
  {
    id: 'diamond',
    label: 'Elmas',
    icon: 'ELM',
    png: '/home/icons/depot/diamond.webp',
    category: 'Değerli',
    quality: 'elite',
    sourceIds: ['diamond'],
    fromReputation: true,
  },
  { id: 'gold', label: 'Altın', icon: 'ALT', png: '/home/icons/depot/gold.webp', category: 'Maden', quality: 'elite' },
  { id: 'steel', label: 'Demir', icon: 'DMR', png: '/home/icons/depot/steel.webp', category: 'Maden', quality: 'standard' },
  { id: 'copper', label: 'Bakır', icon: 'BKR', png: '/home/icons/depot/copper.webp', category: 'Maden', quality: 'standard' },
  {
    id: 'coal',
    label: 'Kömür',
    icon: 'KMR',
    png: '/home/icons/depot/coal.webp',
    category: 'Maden',
    quality: 'standard',
    sourceIds: ['coal'],
  },
  { id: 'cement', label: 'Çimento', icon: 'CIM', png: '/home/icons/depot/cement.webp', category: 'İnşaat', quality: 'standard' },
  { id: 'timber', label: 'Kereste', icon: 'KER', png: '/home/icons/depot/timber.webp', category: 'İnşaat', quality: 'standard' },
  {
    id: 'brick',
    label: 'Tuğla',
    icon: 'TUG',
    png: '/home/icons/depot/brick.webp',
    category: 'İnşaat',
    quality: 'standard',
    sourceIds: ['brick'],
  },
  {
    id: 'oil',
    label: 'Petrol',
    icon: 'PTR',
    png: '/home/icons/depot/oil.webp',
    category: 'Enerji',
    quality: 'premium',
    sourceIds: ['oil'],
  },
  {
    id: 'energy',
    label: 'Enerji',
    icon: 'NRJ',
    png: '/home/icons/depot/enerji.png',
    category: 'Enerji',
    quality: 'premium',
    sourceIds: ['energy'],
  },
  {
    id: 'spare-parts',
    label: 'Yedek Parça',
    icon: 'YDK',
    png: '/home/icons/depot/yedekparca.webp',
    category: 'Sanayi',
    quality: 'premium',
    sourceIds: ['spare-parts'],
  },
  {
    id: 'engine-kit',
    label: 'Motor',
    icon: 'MTR',
    png: '/home/icons/depot/spare-parts.webp',
    category: 'Sanayi',
    quality: 'premium',
    sourceIds: ['engine-kit'],
  },
]
const DEPOT_META_BY_ID = new Map(
  DEPOT_CATALOG.map((entry) => [String(entry?.id || '').trim(), entry]),
)
const DAILY_LOGIN_TOTAL_DAYS = 7
const DAILY_LOGIN_ITEM_PRIORITY = ['cash', 'oil', 'energy', 'spare-parts', 'engine-kit']
const DAILY_LOGIN_STATE_SEED = {
  totalDays: DAILY_LOGIN_TOTAL_DAYS,
  claimedToday: false,
  canClaim: false,
  nextClaimDay: 1,
  nextResetAt: '',
  remainingMs: 0,
  series: {
    current: 0,
    total: DAILY_LOGIN_TOTAL_DAYS,
    label: `0/${DAILY_LOGIN_TOTAL_DAYS}`,
  },
  days: [],
  nextReward: {
    day: 1,
    cash: 0,
    items: {},
  },
  lastClaim: null,
}

const MOTO_LEVEL_IMAGE_BY_LEVEL = {
  1: '/home/vehicles/moto/levels/motor1level.webp',
  4: '/home/vehicles/moto/levels/motor4level.webp',
  7: '/home/vehicles/moto/levels/motor7level.webp',
  10: '/home/vehicles/moto/levels/motor10level.webp',
  14: '/home/vehicles/moto/levels/motor14level.webp',
  18: '/home/vehicles/moto/levels/motor18level.webp',
  22: '/home/vehicles/moto/levels/motor22level.webp',
  26: '/home/vehicles/moto/levels/motor26level.webp',
  31: '/home/vehicles/moto/levels/motor31level.webp',
  36: '/home/vehicles/moto/levels/motor36level.webp',
  42: '/home/vehicles/moto/levels/motor42level.webp',
  48: '/home/vehicles/moto/levels/motor48level.webp',
  55: '/home/vehicles/moto/levels/motor55level.webp',
  62: '/home/vehicles/moto/levels/motor62level.webp',
  69: '/home/vehicles/moto/levels/motor69level.webp',
  76: '/home/vehicles/moto/levels/motor76level.webp',
  83: '/home/vehicles/moto/levels/motor83level.webp',
  89: '/home/vehicles/moto/levels/motor89level.webp',
  95: '/home/vehicles/moto/levels/motor95level.webp',
  100: '/home/vehicles/moto/levels/motor100level.webp',
}
const MOTO_LEVEL_KEYS = Object.keys(MOTO_LEVEL_IMAGE_BY_LEVEL)
  .map((key) => Math.max(1, Math.trunc(Number(key) || 1)))
  .sort((a, b) => a - b)
const TRUCK_IMAGE_BY_MODEL_ID = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => {
    const modelNo = index + 1
    const modelId = `truck-${String(modelNo).padStart(2, '0')}`
    return [modelId, `/home/vehicles/truck/tir${modelNo}.png`]
  }),
)
const TRUCK_IMAGE_BY_NAME = Object.fromEntries([
  ['ford cargo 1833', 1],
  ['mercedes atego 1518', 2],
  ['isuzu npr 3d', 3],
  ['bmc pro 827', 4],
  ['man tgl 12.250', 5],
  ['scania p280', 6],
  ['iveco eurocargo 120e', 7],
  ['daf lf 260', 8],
  ['renault d wide', 9],
  ['volvo fl 250', 10],
  ['mercedes axor 1840', 11],
  ['ford f-max 500', 12],
  ['man tgx 18.510', 13],
  ['scania r 500', 14],
  ['volvo fh 500', 15],
  ['mercedes actros 2545', 16],
  ['renault t high 480', 17],
  ['iveco s-way 570', 18],
  ['daf xg+ 530', 19],
  ['scania s 770 v8', 20],
].map(([name, modelNo]) => [name, `/home/vehicles/truck/tir${modelNo}.png`]))

const resolveTruckImage = (entry) => {
  const safeModelId = String(entry?.modelId || entry?.id || '').trim()
  if (TRUCK_IMAGE_BY_MODEL_ID[safeModelId]) {
    return TRUCK_IMAGE_BY_MODEL_ID[safeModelId]
  }
  const safeName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
  if (TRUCK_IMAGE_BY_NAME[safeName]) {
    return TRUCK_IMAGE_BY_NAME[safeName]
  }
  return ''
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const buildTutorialTasksForStep = (step) => {
  const stepId = String(step?.id || 'step').trim() || 'step'
  const actionPlan = Array.isArray(step?.actionPlan)
    ? step.actionPlan.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []
  return actionPlan.map((entry, index) => ({
    id: `${stepId}-task-${index + 1}`,
    label: entry,
  }))
}
const digitsOnly = (value, maxLength = 16) =>
  String(value || '')
    .replace(/[^\d]/g, '')
    .slice(0, Math.max(1, Math.trunc(num(maxLength)) || 1))
const roundTo = (value, digits = 0) => {
  const safeDigits = Math.max(0, Math.trunc(num(digits)))
  const factor = 10 ** safeDigits
  return Math.round(num(value) * factor) / factor
}
const fmt = (v) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(num(v))
const toBigIntOrNull = (value) => {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return BigInt(Math.trunc(value))
  }
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (/^[+-]?\d+$/.test(raw)) {
    try {
      return BigInt(raw)
    } catch {
      return null
    }
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return BigInt(Math.trunc(parsed))
}
const formatBigIntTr = (value) => {
  const safe = typeof value === 'bigint' ? value : toBigIntOrNull(value)
  if (safe === null) return '0'
  const negative = safe < 0n
  const absText = (negative ? -safe : safe).toString()
  const grouped = absText.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return negative ? `-${grouped}` : grouped
}
const fmtTry = (v) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num(v))
const fmtFixed = (value, digits = 2) =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num(value))
const fmtFxRate = (value) => fmtFixed(value, 2)
const fmtTrySigned = (value) => `${num(value) > 0 ? '+' : ''}${fmtTry(value)}`
const fmtCountdown = (totalMs) => {
  const safeMs = Math.max(0, Math.trunc(num(totalMs)))
  const totalSec = Math.floor(safeMs / 1000)
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
const fmtPctSigned = (value, digits = 2) => {
  const safe = num(value)
  return `${safe > 0 ? '+' : ''}${safe.toFixed(digits)}%`
}
const fmtLevel = (value) => `${fmt(value)}. Seviye`
const sanitizeNavTheme = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return NAV_THEMES.includes(normalized) ? normalized : NAV_THEME_DEFAULT
}
const loadStoredNavTheme = () => {
  if (typeof window === 'undefined') return NAV_THEME_DEFAULT
  try {
    return sanitizeNavTheme(window.localStorage.getItem(NAV_THEME_STORAGE_KEY))
  } catch {
    return NAV_THEME_DEFAULT
  }
}
const metricLengthClass = (value) => {
  const len = String(value || '').trim().length
  if (len >= 34) return 'is-mega'
  if (len >= 26) return 'is-xxlong'
  if (len >= 18) return 'is-xlong'
  if (len >= 12) return 'is-long'
  return ''
}
const safeUiText = (value, depth = 0) => {
  if (value == null) return ''
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return ''
    if (text === '[object Object]') return ''
    return text
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = safeUiText(entry, depth + 1)
      if (candidate) return candidate
    }
    return ''
  }
  if (typeof value === 'object' && depth < 3) {
    const priorityKeys = ['global', 'message', 'error', 'detail', 'reason', 'title']
    for (const key of priorityKeys) {
      const candidate = safeUiText(value?.[key], depth + 1)
      if (candidate) return candidate
    }
    for (const entry of Object.values(value || {})) {
      const candidate = safeUiText(entry, depth + 1)
      if (candidate) return candidate
    }
  }
  return ''
}
const errText = (errors, fallback) => {
  const direct = safeUiText(errors?.global || errors?.message || errors?.error)
  if (direct) return direct
  for (const value of Object.values(errors || {})) {
    const candidate = safeUiText(value)
    if (candidate) return candidate
  }
  return safeUiText(fallback) || 'İşlem sırasında bir hata oluştu.'
}
const resolveVehicleImage = (entry, templateId = '') => {
  const safeTemplateId = String(templateId || entry?.templateId || '').trim()
  const directImage = String(entry?.image || '').trim()
  if (safeTemplateId === 'moto-rental') {
    const requiredLevel = Math.max(1, Math.trunc(num(entry?.requiredLevel || entry?.levelRequired || 1)))
    let targetLevel = MOTO_LEVEL_KEYS[0] || 1
    for (const level of MOTO_LEVEL_KEYS) {
      if (requiredLevel >= level) {
        targetLevel = level
        continue
      }
      break
    }
    return MOTO_LEVEL_IMAGE_BY_LEVEL[targetLevel] || directImage || '/home/icons/businesses/moto-kiralama.webp'
  }
  if (safeTemplateId === 'auto-rental') {
    return directImage || '/home/icons/businesses/oto-kiralama.webp'
  }
  if (safeTemplateId === 'property-rental') {
    return directImage || '/home/icons/businesses/mulkum.webp'
  }
  if (safeTemplateId === 'logistics') {
    const mappedTruckImage = resolveTruckImage(entry)
    return mappedTruckImage || directImage || '/home/icons/businesses/lojistik-kiralama.webp'
  }
  return directImage
}

const fuelItemMeta = (itemId = 'oil') => {
  const safeItemId = String(itemId || 'oil').trim().toLowerCase()
  if (safeItemId === 'energy') {
    return {
      id: 'energy',
      label: 'Enerji',
      expenseLabel: 'Enerji Gideri',
      icon: '/home/icons/depot/enerji.png',
    }
  }
  if (safeItemId === 'oil') {
    return {
      id: 'oil',
      label: 'Petrol',
      expenseLabel: 'Benzin Gideri',
      icon: '/home/icons/depot/oil.webp',
    }
  }
  return {
    id: safeItemId || 'oil',
    label: safeItemId || 'Yakıt',
    expenseLabel: 'Yakıt Gideri',
    icon: '/home/icons/depot/oil.webp',
  }
}

const normalizeDailyLoginRewardItems = (rawItems) => {
  const normalized = {}
  if (!rawItems || typeof rawItems !== 'object') return normalized
  for (const [itemIdRaw, quantityRaw] of Object.entries(rawItems)) {
    const itemId = String(itemIdRaw || '').trim()
    const quantity = Math.max(0, Math.trunc(num(quantityRaw)))
    if (!itemId || quantity <= 0) continue
    normalized[itemId] = quantity
  }
  return normalized
}

const DAILY_LOGIN_ICON_BY_ITEM_ID = {
  cash: '/home/icons/depot/cash.png',
  oil: '/home/icons/depot/oil.png',
  energy: '/home/icons/depot/enerji.png',
  'spare-parts': '/home/icons/depot/yedekparca.webp',
  'engine-kit': '/home/icons/depot/spare-parts.png',
}

const dailyLoginItemMeta = (itemId) => {
  const safeId = String(itemId || '').trim()
  if (!safeId) {
    return {
      id: 'cash',
      label: 'Nakit',
      icon: DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      short: 'NKT',
    }
  }
  if (safeId === 'cash') {
    return {
      id: 'cash',
      label: 'Nakit',
      icon: DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      short: 'NKT',
    }
  }
  const depotMeta = DEPOT_META_BY_ID.get(safeId)
  if (depotMeta) {
    return {
      id: safeId,
      label: String(depotMeta.label || safeId).trim() || safeId,
      icon: String(
        DAILY_LOGIN_ICON_BY_ITEM_ID[safeId] ||
        depotMeta.png ||
        DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      ).trim() || DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
      short: String(depotMeta.icon || safeId.slice(0, 3).toUpperCase()).trim(),
    }
  }
  return {
    id: safeId,
    label: safeId,
    icon: DAILY_LOGIN_ICON_BY_ITEM_ID[safeId] || DAILY_LOGIN_ICON_BY_ITEM_ID.cash,
    short: safeId.slice(0, 3).toUpperCase(),
  }
}

const dailyLoginRewardEntries = (rewardRaw) => {
  const reward = rewardRaw && typeof rewardRaw === 'object' ? rewardRaw : {}
  const cash = Math.max(0, Math.trunc(num(reward.cash || 0)))
  const normalizedItems = normalizeDailyLoginRewardItems(reward.items)
  const itemRows = Object.entries(normalizedItems)
    .map(([itemId, quantity]) => ({
      itemId,
      quantity,
      ...dailyLoginItemMeta(itemId),
      isCash: false,
    }))
    .sort((left, right) => {
      const leftPriority = DAILY_LOGIN_ITEM_PRIORITY.indexOf(left.itemId)
      const rightPriority = DAILY_LOGIN_ITEM_PRIORITY.indexOf(right.itemId)
      const safeLeftPriority = leftPriority === -1 ? DAILY_LOGIN_ITEM_PRIORITY.length : leftPriority
      const safeRightPriority = rightPriority === -1 ? DAILY_LOGIN_ITEM_PRIORITY.length : rightPriority
      if (safeLeftPriority !== safeRightPriority) return safeLeftPriority - safeRightPriority
      return String(left.label || '').localeCompare(String(right.label || ''), 'tr')
    })

  const rows = []
  if (cash > 0) {
    rows.push({
      itemId: 'cash',
      quantity: cash,
      ...dailyLoginItemMeta('cash'),
      isCash: true,
    })
  }
  rows.push(...itemRows)
  return rows
}

const normalizeDailyLoginPayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  const totalDays = Math.max(1, Math.trunc(num(source.totalDays || DAILY_LOGIN_TOTAL_DAYS)))
  const seriesRaw = source.series && typeof source.series === 'object' ? source.series : {}
  const seriesCurrent = clamp(Math.trunc(num(seriesRaw.current || 0)), 0, totalDays)
  const normalizedDays = (Array.isArray(source.days) ? source.days : [])
    .map((entry, index) => {
      const reward = entry?.reward && typeof entry.reward === 'object' ? entry.reward : {}
      const safeDay = clamp(Math.trunc(num(entry?.day || (index + 1))), 1, totalDays)
      const status = String(entry?.status || '').trim() || 'locked'
      const items = normalizeDailyLoginRewardItems(reward.items)
      return {
        day: safeDay,
        status,
        isBonus: entry?.isBonus === true || safeDay === totalDays,
        reward: {
          cash: Math.max(0, Math.trunc(num(reward.cash || 0))),
          items,
        },
      }
    })
    .sort((left, right) => left.day - right.day)
  const nextClaimDay = clamp(Math.trunc(num(source.nextClaimDay || 1)), 1, totalDays)
  const nextRewardRaw = source.nextReward && typeof source.nextReward === 'object'
    ? source.nextReward
    : { day: nextClaimDay, cash: 0, items: {} }
  const nextReward = {
    day: clamp(Math.trunc(num(nextRewardRaw.day || nextClaimDay)), 1, totalDays),
    cash: Math.max(0, Math.trunc(num(nextRewardRaw.cash || 0))),
    items: normalizeDailyLoginRewardItems(nextRewardRaw.items),
  }
  const claimedToday = source.claimedToday === true
  const canClaim = source.canClaim === true && !claimedToday
  return {
    totalDays,
    claimedToday,
    canClaim,
    nextClaimDay,
    nextResetAt: String(source.nextResetAt || ''),
    remainingMs: Math.max(0, Math.trunc(num(source.remainingMs || 0))),
    series: {
      current: seriesCurrent,
      total: totalDays,
      label: `${seriesCurrent}/${totalDays}`,
    },
    days: normalizedDays,
    nextReward,
    lastClaim: source.lastClaim && typeof source.lastClaim === 'object'
      ? {
          day: clamp(Math.trunc(num(source.lastClaim.day || 0)), 0, totalDays),
          dayKey: String(source.lastClaim.dayKey || ''),
          claimedAt: String(source.lastClaim.claimedAt || ''),
        }
      : null,
  }
}

const WEEKLY_EVENT_DAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const WEEKLY_EVENT_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEKLY_EVENT_DAY_MS = 24 * 60 * 60 * 1000
const WEEKLY_EVENT_WEEK_MS = 7 * WEEKLY_EVENT_DAY_MS
const WEEKLY_EVENT_START_OFFSET_MS = ((23 * 60) + 59) * 60 * 1000
const WEEKLY_EVENT_WINDOW_DURATION_MS = (2 * WEEKLY_EVENT_DAY_MS) + (60 * 1000)
const TURKIYE_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
const TURKIYE_TIMEZONE = 'Europe/Istanbul'
const WEEKLY_EVENT_ICON_BY_TYPE = {
  xp: '/home/ui/hud/xp-icon.png',
  discount: '/home/icons/depot/cash.png',
  standard: '/home/icons/v2/nav-home.png',
}
const WEEKLY_EVENT_FALLBACK_SCHEDULE = [
  { dayIndex: 1, eventType: 'standard', title: 'Standart Gün', description: 'Ek haftalık bonus bulunmuyor.', bonusLabel: 'Standart' },
  { dayIndex: 2, eventType: 'discount', title: 'Tahsilat Gider İndirimi', description: 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.', bonusLabel: '-%25 Gider' },
  { dayIndex: 3, eventType: 'discount', title: 'Tahsilat Gider İndirimi', description: 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.', bonusLabel: '-%25 Gider' },
  { dayIndex: 4, eventType: 'standard', title: 'Standart Gün', description: 'Ek haftalık bonus bulunmuyor.', bonusLabel: 'Standart' },
  { dayIndex: 5, eventType: 'standard', title: 'Standart Gün', description: 'Ek haftalık bonus bulunmuyor.', bonusLabel: 'Standart' },
  { dayIndex: 6, eventType: 'xp', title: 'Tahsilat XP Etkinliği', description: 'Fabrika ve işletme tahsilatlarında 2x XP kazanılır.', bonusLabel: '2x XP' },
  { dayIndex: 0, eventType: 'xp', title: 'Tahsilat XP Etkinliği', description: 'Fabrika ve işletme tahsilatlarında 2x XP kazanılır.', bonusLabel: '2x XP' },
]

const turkiyeDayStartMs = (nowMs = Date.now()) => {
  const safeNowMs = Math.max(0, Math.trunc(num(nowMs)))
  const shiftedMs = safeNowMs + TURKIYE_UTC_OFFSET_MS
  const shiftedDayStart = Math.floor(shiftedMs / WEEKLY_EVENT_DAY_MS) * WEEKLY_EVENT_DAY_MS
  return shiftedDayStart - TURKIYE_UTC_OFFSET_MS
}

const weeklyEventWindowByStartDay = (startDayIndex, nowMs = Date.now()) => {
  const safeNowMs = Math.max(0, Math.trunc(num(nowMs)))
  const dayStartMs = turkiyeDayStartMs(safeNowMs)
  const dayIndex = new Date(safeNowMs + TURKIYE_UTC_OFFSET_MS).getUTCDay()
  const safeStartDayIndex = clamp(Math.trunc(num(startDayIndex)), 0, 6)

  const referenceStartMs =
    dayStartMs +
    ((safeStartDayIndex - dayIndex) * WEEKLY_EVENT_DAY_MS) +
    WEEKLY_EVENT_START_OFFSET_MS
  const candidates = [
    referenceStartMs - WEEKLY_EVENT_WEEK_MS,
    referenceStartMs,
    referenceStartMs + WEEKLY_EVENT_WEEK_MS,
  ]
  let activeStartMs = 0
  for (const candidateStartMs of candidates) {
    if (safeNowMs >= candidateStartMs && safeNowMs < (candidateStartMs + WEEKLY_EVENT_WINDOW_DURATION_MS)) {
      activeStartMs = candidateStartMs
      break
    }
  }
  if (!activeStartMs) {
    return {
      active: false,
      remainingMs: 0,
      endsAt: '',
      startAt: '',
    }
  }

  const endExclusiveMs = activeStartMs + WEEKLY_EVENT_WINDOW_DURATION_MS
  const remainingMs = endExclusiveMs > safeNowMs ? Math.max(0, endExclusiveMs - safeNowMs) : 0
  return {
    active: remainingMs > 0,
    remainingMs,
    endsAt: remainingMs > 0 ? new Date(Math.max(0, endExclusiveMs - 1000)).toISOString() : '',
    startAt: new Date(activeStartMs).toISOString(),
  }
}

const weeklyEventLocalWindow = (eventId, nowMs = Date.now()) => {
  if (eventId === 'weekend-xp') return weeklyEventWindowByStartDay(5, nowMs) // Cuma 23:59
  if (eventId === 'midweek-discount') return weeklyEventWindowByStartDay(1, nowMs) // Pazartesi 23:59
  return {
    active: false,
    remainingMs: 0,
    endsAt: '',
    startAt: '',
  }
}

const normalizeWeeklyEventsPayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  const clientDayIndex = (() => {
    const parsed = new Date().getDay()
    return Number.isFinite(parsed) ? clamp(Math.trunc(parsed), 0, 6) : 0
  })()
  const sourceDayIndexRaw = Math.trunc(num(source.dayIndex))
  const sourceDayIndex = sourceDayIndexRaw >= 0 && sourceDayIndexRaw <= 6 ? sourceDayIndexRaw : clientDayIndex
  const sourceSchedule = Array.isArray(source.schedule) && source.schedule.length > 0
    ? source.schedule
    : WEEKLY_EVENT_FALLBACK_SCHEDULE
  const parsedSchedule = sourceSchedule.map((entry, index) => {
    const fallback = WEEKLY_EVENT_FALLBACK_SCHEDULE[index] || WEEKLY_EVENT_FALLBACK_SCHEDULE[0]
    const safeDayIndexRaw = Math.trunc(num(entry?.dayIndex))
    const dayIndex = safeDayIndexRaw >= 0 && safeDayIndexRaw <= 6 ? safeDayIndexRaw : fallback.dayIndex
    const eventTypeRaw = String(entry?.eventType || fallback.eventType || 'standard').trim().toLowerCase()
    const eventType = ['xp', 'discount', 'standard'].includes(eventTypeRaw) ? eventTypeRaw : 'standard'
    const dayName = String(entry?.dayName || WEEKLY_EVENT_DAY_LABELS[dayIndex] || '').trim() || (WEEKLY_EVENT_DAY_LABELS[dayIndex] || '')
    return {
      dayIndex,
      dayName,
      eventType,
      title: String(entry?.title || fallback.title || 'Standart Gün').trim() || 'Standart Gün',
      description: String(entry?.description || fallback.description || '').trim(),
      bonusLabel: String(entry?.bonusLabel || fallback.bonusLabel || 'Standart').trim() || 'Standart',
      isToday: entry?.isToday === true || dayIndex === sourceDayIndex,
      isActive: entry?.isActive === true,
    }
  })
  const scheduleOrder = new Map(WEEKLY_EVENT_DAY_ORDER.map((dayIndex, index) => [dayIndex, index]))
  const schedule = parsedSchedule
    .slice()
    .sort((left, right) => {
      const leftRank = scheduleOrder.has(left.dayIndex) ? scheduleOrder.get(left.dayIndex) : 999
      const rightRank = scheduleOrder.has(right.dayIndex) ? scheduleOrder.get(right.dayIndex) : 999
      return leftRank - rightRank
    })

  const weekendRaw = source.weekendXp && typeof source.weekendXp === 'object' ? source.weekendXp : {}
  const midweekRaw = source.midweekDiscount && typeof source.midweekDiscount === 'object' ? source.midweekDiscount : {}
  const xpMultiplier = Math.max(1, Math.trunc(num(source.xpMultiplier || weekendRaw.multiplier || 1)))
  const costMultiplierRaw = num(source.costMultiplier || midweekRaw.multiplier || 1)
  const costMultiplier = costMultiplierRaw > 0 ? costMultiplierRaw : 1
  const discountPercentFromMultiplier = Math.max(0, Math.round((1 - costMultiplier) * 100))
  const costDiscountPercent = Math.max(
    0,
    Math.trunc(num(source.costDiscountPercent || midweekRaw.discountPercent || discountPercentFromMultiplier)),
  )
  const activeEventIds = Array.isArray(source.activeEventIds)
    ? source.activeEventIds.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []

  return {
    timezone: String(source.timezone || 'Europe/Istanbul').trim() || 'Europe/Istanbul',
    nowAt: String(source.nowAt || '').trim(),
    dayIndex: sourceDayIndex,
    dayName: String(source.dayName || WEEKLY_EVENT_DAY_LABELS[sourceDayIndex] || '').trim() || (WEEKLY_EVENT_DAY_LABELS[sourceDayIndex] || ''),
    xpMultiplier,
    costMultiplier,
    costDiscountPercent,
    activeEventIds,
    weekendXp: {
      id: 'weekend-xp',
      active: weekendRaw.active === true,
      title: String(weekendRaw.title || 'Cumartesi-Pazar Tahsilat XP').trim() || 'Cumartesi-Pazar Tahsilat XP',
      description: String(weekendRaw.description || 'Fabrika ve işletme tahsilatlarında 2x XP kazanılır.').trim(),
      endsAt: String(weekendRaw.endsAt || '').trim(),
      bonusLabel: `2x XP`,
    },
    midweekDiscount: {
      id: 'midweek-discount',
      active: midweekRaw.active === true,
      title: String(midweekRaw.title || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi').trim() || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi',
      description: String(midweekRaw.description || 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.').trim(),
      endsAt: String(midweekRaw.endsAt || '').trim(),
      bonusLabel: `-%${Math.max(0, Math.trunc(num(midweekRaw.discountPercent || costDiscountPercent || 25)))} Gider`,
    },
    schedule,
  }
}

const listingPriceProfile = (templateId = 'moto-rental') => {
  const safeTemplateId = String(templateId || '').trim()
  return LISTING_PRICE_PROFILE[safeTemplateId] || LISTING_PRICE_PROFILE['moto-rental']
}
const listingBounds = (basePrice, options = {}) => {
  const safeBase = Math.max(1, Math.trunc(num(basePrice)))
  const requiredLevel = Math.max(1, Math.trunc(num(options?.requiredLevel || 1)))
  const profile = listingPriceProfile(options?.templateId)
  const levelOffset = Math.max(0, requiredLevel - 1)
  const dynamicMinFloor = Math.max(1, profile.minFloor + profile.minStepByLevel * levelOffset)
  const dynamicMaxFloor = Math.max(dynamicMinFloor + 1, profile.maxFloor + profile.maxStepByLevel * levelOffset)
  const minPrice = Math.max(dynamicMinFloor, Math.floor(safeBase * 0.6))
  const maxPrice = Math.max(minPrice + 1, dynamicMaxFloor, Math.floor(safeBase * 4.5))
  return {
    minPrice,
    maxPrice,
    suggestedPrice: clamp(safeBase, minPrice, maxPrice),
  }
}
const listingCommissionPreview = (priceValue, explicitRate = VEHICLE_MARKET_COMMISSION_RATE) => {
  const safeRate = Math.max(0, num(explicitRate))
  const listingPrice = Math.max(1, Math.trunc(num(priceValue)))
  const commissionAmount = Math.max(0, Math.floor(listingPrice * safeRate))
  const sellerPayout = Math.max(0, listingPrice - commissionAmount)
  const totalCost = listingPrice
  return {
    rate: safeRate,
    amount: commissionAmount,
    totalCost,
    sellerPayout,
  }
}
const fleetListingBounds = (vehicle, templateId = 'moto-rental') => {
  const buildCash = Math.max(0, Math.trunc(num(vehicle?.cost?.cash || vehicle?.cash || 0)))
  const hourlyIncome = Math.max(0, Math.trunc(num(vehicle?.rentPerHour || 0)))
  const requiredLevel = Math.max(1, Math.trunc(num(vehicle?.requiredLevel || vehicle?.levelRequired || 1)))
  const basePrice = Math.max(1, Math.round(Math.max(buildCash * 0.9, hourlyIncome * 140)))
  return listingBounds(basePrice, {
    templateId: String(templateId || 'moto-rental').trim() || 'moto-rental',
    requiredLevel,
  })
}
const logisticsListingBounds = (truck) => {
  const purchaseCash = Math.max(0, Math.trunc(num(truck?.cash || 0)))
  const runIncome = Math.max(0, Math.trunc(num(truck?.incomePerRun || truck?.rentPerHour || 0)))
  const requiredLevel = Math.max(1, Math.trunc(num(truck?.levelRequired || truck?.requiredLevel || 1)))
  const basePrice = Math.max(1, Math.round(Math.max(purchaseCash * 0.82, runIncome * 160)))
  return listingBounds(basePrice, {
    templateId: 'logistics',
    requiredLevel,
  })
}
const scrapReturnAmount = (requiredAmount) => {
  const source = Math.max(0, Math.trunc(num(requiredAmount)))
  if (source <= 0) return 0
  return Math.max(1, Math.round(source * VEHICLE_SCRAP_RETURN_RATE))
}
const scrapPreviewForEntry = (entry) => ({
  engineKits: scrapReturnAmount(entry?.engineKits ?? entry?.cost?.engineKits ?? 0),
  spareParts: scrapReturnAmount(entry?.spareParts ?? entry?.cost?.spareParts ?? 0),
})
const formatScrapNotice = (scrapReturn) => {
  const engineKits = Math.max(0, Math.trunc(num(scrapReturn?.engineKits || 0)))
  const spareParts = Math.max(0, Math.trunc(num(scrapReturn?.spareParts || 0)))
  return `+${fmt(engineKits)} Motor | +${fmt(spareParts)} Yedek Parça depoya eklendi.`
}
const resolveVehicleLifetime = (entry, nowMs = Date.now()) => {
  const explicitExpiry = String(entry?.expiresAt || '').trim()
  const referenceIso = explicitExpiry ||
    String(entry?.producedAt || entry?.purchasedAt || entry?.acquiredAt || '').trim()
  const referenceMs = new Date(referenceIso).getTime()
  if (Number.isNaN(referenceMs)) {
    return {
      remainingMs: 0,
      expired: false,
      text: 'Ömür bilgisi yok',
      expiresAt: '',
    }
  }

  const expiresAtMs = explicitExpiry ? referenceMs : referenceMs + VEHICLE_LIFETIME_MS
  const safeNowMs = Math.max(0, Math.trunc(num(nowMs)))
  const remainingMs = Math.max(0, expiresAtMs - safeNowMs)
  return {
    remainingMs,
    expired: remainingMs <= 0,
    text: remainingMs > 0 ? formatLifetimeDetailedTr(remainingMs) : 'Süresi doldu',
    expiresAt: new Date(expiresAtMs).toISOString(),
  }
}

function useTicker(value, ms = 450) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const from = num(previous.current)
    const to = num(value)
    if (from === to) return
    const start = performance.now()

    const step = (now) => {
      const p = clamp((now - start) / ms, 0, 1)
      const eased = 1 - (1 - p) ** 3
      setDisplay(from + (to - from) * eased)
      if (p < 1) {
        raf.current = requestAnimationFrame(step)
        return
      }
      previous.current = to
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, ms])

  return display
}

function Chart({ points = [] }) {
  if (!points.length) return <p className="empty">Grafik verisi yok.</p>
  const vals = points.map(num)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const rg = Math.max(1, max - min)
  const w = 320
  const h = 170
  const d = vals
    .map((v, i) => {
      const x = i * (w / Math.max(1, vals.length - 1))
      const y = h - ((v - min) / rg) * (h - 12) - 6
      return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart">
        <path d={`${d} L ${w} ${h} L 0 ${h} Z`} className="chart-area" />
        <path d={d} className="chart-line" />
      </svg>
      <div className="chart-meta">
        <span>Min {fmt(min)}</span>
        <span>Maks {fmt(max)}</span>
      </div>
    </div>
  )
}

function marketTabLabel(tab) {
  if (tab === 'buy') return 'Satın Al'
  if (tab === 'sell') return 'Sat'
  if (tab === 'orderbook') return 'Emir Defteri'
  if (tab === 'auction') return 'Açık Artırma'
  return 'Grafik'
}

function parseSafeDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function chatSnippet(value, max = 76) {
  const text = normalizeMojibakeText(String(value || '')).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function normalizeRoleValue(value) {
  const role = String(value || '').trim().toLowerCase()
  if (role === 'admin' || role === 'moderator') return role
  return 'player'
}

function roleLabelFromValue(role, fallback = '') {
  const safeRole = normalizeRoleValue(role)
  if (safeRole === 'admin') return 'Admin'
  if (safeRole === 'moderator') return 'Moderatör'
  const safeFallback = String(fallback || '').trim()
  return safeFallback || 'Oyuncu'
}

function normalizeSeasonBadgeMeta(seasonBadge) {
  if (!seasonBadge || typeof seasonBadge !== 'object') return null
  const tierRaw = String(seasonBadge.tier || '').trim().toLowerCase()
  const tier = ['gold', 'silver', 'bronze', 'common'].includes(tierRaw) ? tierRaw : 'gold'
  const label = String(seasonBadge.label || 'Sezon Rozeti').trim() || 'Sezon Rozeti'
  const icon = String(seasonBadge.icon || '').trim()
  if (!icon) return null
  return {
    tier,
    label,
    icon,
    awardedForSeasonKey: String(seasonBadge.awardedForSeasonKey || '').trim(),
    visibleSeasonKey: String(seasonBadge.visibleSeasonKey || '').trim(),
    awardedAt: String(seasonBadge.awardedAt || '').trim(),
  }
}

function roleBadgeMeta(role, isPremium = false, fallbackLabel = '', seasonBadge = null) {
  const safeRole = normalizeRoleValue(role)
  if (safeRole === 'admin') {
    return {
      className: 'staff-admin',
      tierClass: '',
      text: 'Admin',
      fullText: 'Admin',
      roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
      icon: '/home/icons/v2/nav-uyari.png',
      isStaff: true,
    }
  }
  if (safeRole === 'moderator') {
    return {
      className: 'staff-moderator',
      tierClass: '',
      text: 'Moderat\u00f6r',
      fullText: 'Moderat\u00f6r',
      roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
      icon: '/home/icons/v2/nav-uyari.png',
      isStaff: true,
    }
  }

  const normalizedSeasonBadge = normalizeSeasonBadgeMeta(seasonBadge)
  if (normalizedSeasonBadge) {
    return {
      className: 'season',
      tierClass: normalizedSeasonBadge.tier !== 'gold' ? `is-${normalizedSeasonBadge.tier}` : '',
      text: normalizedSeasonBadge.label,
      fullText: normalizedSeasonBadge.label,
      roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
      icon: normalizedSeasonBadge.icon,
      seasonBadge: normalizedSeasonBadge,
      isStaff: false,
    }
  }

  return {
    className: isPremium ? 'premium' : 'normal',
    tierClass: '',
    text: isPremium ? 'Premium \u00dcye' : 'Standart \u00dcye',
    fullText: isPremium ? 'Premium \u00dcye' : 'Standart \u00dcye',
    roleLabel: roleLabelFromValue(safeRole, fallbackLabel),
    icon: isPremium ? '/home/icons/depot/premium.webp' : '',
    isStaff: false,
  }
}

function _relativeChatTime(value) {
  const date = parseSafeDate(value)
  if (!date) return '--'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMin < 1) return 'Şimdi'
  if (diffMin < 60) return `${diffMin} dk önce`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} saat önce`
  if (diffHour < 48) return 'Dün'

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 8) return `${diffDay} gün önce`

  return date.toLocaleDateString('tr-TR', {
    timeZone: TURKIYE_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function _formatChatDateTime(value) {
  const date = parseSafeDate(value)
  if (!date) return '--.--.-- --:--'
  return date.toLocaleString('tr-TR', {
    timeZone: TURKIYE_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function pruneChatMessages(list) {
  const safeList = Array.isArray(list) ? list.filter((entry) => entry && entry.id) : []
  if (safeList.length < CHAT_PRUNE_TRIGGER) return safeList
  return safeList.slice(-CHAT_PRUNE_KEEP_COUNT)
}

function safeIsoDate(value) {
  const parsed = parseSafeDate(value)
  return parsed ? parsed.toISOString() : ''
}

function normalizeChatRestrictions(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_CHAT_RESTRICTIONS

  const muteRaw = raw.mute && typeof raw.mute === 'object' ? raw.mute : {}
  const blockRaw = raw.block && typeof raw.block === 'object' ? raw.block : {}
  const cooldownRaw = raw.cooldown && typeof raw.cooldown === 'object' ? raw.cooldown : {}

  const mutedUntil = safeIsoDate(muteRaw.mutedUntil)
  const blockedUntil = safeIsoDate(blockRaw.blockedUntil)
  const availableAt = safeIsoDate(cooldownRaw.availableAt)
  const lastSentAt = safeIsoDate(cooldownRaw.lastSentAt)

  return {
    canSend: Boolean(raw.canSend),
    mute: {
      active: Boolean(muteRaw.active),
      reason: String(muteRaw.reason || '').trim(),
      reasonCode: String(muteRaw.reasonCode || '').trim(),
      mutedUntil,
      remainingMs: Math.max(0, Math.trunc(num(muteRaw.remainingMs))),
      strikeCount: Math.max(0, Math.trunc(num(muteRaw.strikeCount))),
      lastViolationAt: safeIsoDate(muteRaw.lastViolationAt),
    },
    block: {
      active: Boolean(blockRaw.active),
      reason: String(blockRaw.reason || '').trim(),
      blockedUntil,
      remainingMs: Math.max(0, Math.trunc(num(blockRaw.remainingMs))),
    },
    cooldown: {
      active: Boolean(cooldownRaw.active),
      remainingMs: Math.max(0, Math.trunc(num(cooldownRaw.remainingMs))),
      waitSeconds: Math.max(0, Math.trunc(num(cooldownRaw.waitSeconds))),
      lastSentAt,
      availableAt,
    },
  }
}

function normalizeUserModeration(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_USER_MODERATION

  const chatBlockRaw = raw.chatBlock && typeof raw.chatBlock === 'object' ? raw.chatBlock : {}
  const dmBlockRaw = raw.dmBlock && typeof raw.dmBlock === 'object' ? raw.dmBlock : {}
  const muteRaw = raw.mute && typeof raw.mute === 'object' ? raw.mute : {}

  return {
    chatBlock: {
      active: Boolean(chatBlockRaw.active),
      blockedUntil: safeIsoDate(chatBlockRaw.blockedUntil),
      reason: String(chatBlockRaw.reason || '').trim(),
      remainingMs: Math.max(0, Math.trunc(num(chatBlockRaw.remainingMs))),
    },
    dmBlock: {
      active: Boolean(dmBlockRaw.active),
      blockedUntil: safeIsoDate(dmBlockRaw.blockedUntil),
      reason: String(dmBlockRaw.reason || '').trim(),
      remainingMs: Math.max(0, Math.trunc(num(dmBlockRaw.remainingMs))),
    },
    mute: {
      active: Boolean(muteRaw.active),
      mutedUntil: safeIsoDate(muteRaw.mutedUntil),
      reason: String(muteRaw.reason || '').trim(),
      remainingMs: Math.max(0, Math.trunc(num(muteRaw.remainingMs))),
    },
  }
}

function remainingMsFromIso(isoValue, nowMs) {
  const parsed = parseSafeDate(isoValue)
  if (!parsed) return 0
  return Math.max(0, parsed.getTime() - nowMs)
}

function formatCountdownTr(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  if (safeMs <= 0) return 'hazır'

  const totalSeconds = Math.max(1, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours} saat ${minutes} dakika ${seconds} saniye`
  }
  if (minutes > 0) {
    return `${minutes} dakika ${seconds} saniye`
  }
  return `${seconds} saniye`
}

function formatLifetimeDetailedTr(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  if (safeMs <= 0) return 'Süresi doldu'
  const totalSeconds = Math.max(1, Math.ceil(safeMs / 1000))
  const monthSeconds = 30 * 24 * 60 * 60
  const daySeconds = 24 * 60 * 60
  const hourSeconds = 60 * 60
  const minuteSeconds = 60

  let remaining = totalSeconds
  const months = Math.floor(remaining / monthSeconds)
  remaining -= months * monthSeconds
  const days = Math.floor(remaining / daySeconds)
  remaining -= days * daySeconds
  const hours = Math.floor(remaining / hourSeconds)
  remaining -= hours * hourSeconds
  const minutes = Math.floor(remaining / minuteSeconds)
  remaining -= minutes * minuteSeconds
  const seconds = remaining

  return `${months} Ay ${days} Gün ${hours} Saat ${minutes} Dakika ${seconds} Saniye`
}

function formatLifetimeWithTotal(lifetime) {
  const remaining = String(lifetime?.text || 'Ömür bilgisi yok')
  return `Toplam ${VEHICLE_LIFETIME_MONTHS_TOTAL} Ay | ${remaining}`
}

function formatCountdownClock(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatCountdownWithDaysTr(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days} gün ${String(hours).padStart(2, '0')} saat ${String(minutes).padStart(2, '0')} dakika ${String(seconds).padStart(2, '0')} saniye`
}

function formatCollectionCountdown(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours} saat ${minutes} dakika ${seconds} saniye`
}

/** İnşaat süresi için kısa format: "0 saat 30 dk 0 sn" → "30 dakika" */
function formatBuildDuration(valueMs) {
  const safeMs = Math.max(0, Math.trunc(num(valueMs)))
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours} saat`)
  if (minutes > 0) parts.push(`${minutes} dakika`)
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} saniye`)
  return parts.join(' ').trim() || '0 saniye'
}

function isGifUrl(value) {
  const safeValue = String(value || '').trim().toLowerCase()
  if (!safeValue) return false
  if (safeValue.startsWith('data:image/gif')) return true
  const clean = safeValue.split('?')[0].split('#')[0]
  return clean.endsWith('.gif')
}

function formatDateTime(value, options = {}) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  const includeWeekday = options?.includeWeekday === true

  const formatterOptions = {
    timeZone: TURKIYE_TIMEZONE,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }
  if (includeWeekday) {
    formatterOptions.weekday = 'long'
  }

  const formatter = new Intl.DateTimeFormat('tr-TR', formatterOptions)

  const parts = formatter.formatToParts(parsed)
  const values = {}
  for (const part of parts) {
    if (!part?.type || part.type === 'literal') continue
    values[part.type] = part.value
  }

  const day = values.day || '--'
  const month = values.month || '--'
  const year = values.year || '----'
  const weekday = values.weekday || ''
  const hour = values.hour || '00'
  const minute = values.minute || '00'
  const second = values.second || '00'
  const timestamp = `${hour}:${minute}:${second}`

  if (includeWeekday && weekday) {
    return `${day} ${month} ${year} ${weekday} ${timestamp}`
  }
  return `${day} ${month} ${year} ${timestamp}`
}

function formatAnnouncementDateTime(value) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed
    .toLocaleString('tr-TR', {
      timeZone: TURKIYE_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '')
}

function normalizeAnnouncementType(value) {
  const safe = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (['update', 'guncelleme', 'güncelleme', 'patch', 'bakim'].includes(safe)) {
    return ANNOUNCEMENT_TYPE_UPDATE
  }
  return ANNOUNCEMENT_TYPE_ANNOUNCEMENT
}

function announcementTypeMeta(value) {
  const type = normalizeAnnouncementType(value)
  if (type === ANNOUNCEMENT_TYPE_UPDATE) {
    return {
      type,
      className: 'update',
      label: 'G\u00dcNCELLEME',
    }
  }
  return {
    type: ANNOUNCEMENT_TYPE_ANNOUNCEMENT,
    className: 'announcement',
    label: 'DUYURU',
  }
}

function vehicleEmojiByTier(tier, templateId = 'auto-rental') {
  const safeTemplateId = String(templateId || '').trim()
  if (safeTemplateId === 'moto-rental') {
    return 'MTR'
  }
  if (safeTemplateId === 'logistics') {
    return 'TIR'
  }
  return 'OTO'
}

function vehicleCostScore(vehicle) {
  return (
    num(vehicle?.cash) +
    num(vehicle?.engineKits) * 1200 +
    num(vehicle?.spareParts) * 900 +
    num(vehicle?.fuel) * 450 +
    num(vehicle?.energy) * 350
  )
}

function sortByVehicleCostAsc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    vehicleCostScore(a) - vehicleCostScore(b) ||
    num(a?.requiredLevel) - num(b?.requiredLevel) ||
    String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'),
  )
}

function sortByVehicleIncomeDesc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    num(b?.rentPerHour) - num(a?.rentPerHour) ||
    num(b?.requiredLevel) - num(a?.requiredLevel) ||
    String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'),
  )
}

const FUEL_MULTIPLIER_BY_TEMPLATE = {
  'moto-rental': 1,
  'auto-rental': 2,
  'property-rental': 3,
  logistics: 4,
}
const BUSINESS_EXPENSE_MULTIPLIER = 3

function fuelMultiplierByTemplateId(templateId) {
  const safeTemplateId = String(templateId || '').trim()
  return FUEL_MULTIPLIER_BY_TEMPLATE[safeTemplateId] || 1
}

function fleetFuelUnitsByModelLevel(level, templateId = 'moto-rental', options = {}) {
  const safeLevel = Math.max(1, Math.trunc(num(level)))
  const fuelMultiplier = Math.max(1, Math.trunc(num(fuelMultiplierByTemplateId(templateId))))
  const baseFuelCost = Math.max(2, Math.round(safeLevel * 2 * fuelMultiplier * BUSINESS_EXPENSE_MULTIPLIER))
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : null
  const costMultiplierRaw = num(weeklyEvents?.costMultiplier || 1)
  const costMultiplier = costMultiplierRaw > 0 ? costMultiplierRaw : 1
  if (costMultiplier >= 0.999) return baseFuelCost
  return Math.max(1, Math.round(baseFuelCost * costMultiplier))
}

function truckCostScore(truck) {
  return (
    num(truck?.cash) +
    num(truck?.engineKits) * 1200 +
    num(truck?.spareParts) * 900
  )
}

function sortByTruckCostAsc(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    truckCostScore(a) - truckCostScore(b) ||
    num(a?.levelRequired) - num(b?.levelRequired) ||
    String(a?.name || '').localeCompare(String(b?.name || ''), 'tr'),
  )
}

function fleetCollectPreview(entry, inventoryById = {}, options = {}) {
  const multiplier = Math.max(1, Math.trunc(num(options?.multiplier || 1)))
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : null
  const scope = String(options?.scope || 'pending').trim().toLowerCase() === 'hourly'
    ? 'hourly'
    : 'pending'
  const fleetCount = Math.max(0, Math.trunc(num(entry?.fleetCount)))
  const pendingIncome = Math.max(0, Math.floor(num(entry?.pendingIncome)))
  const hourlyIncome = Math.max(0, Math.trunc(num(entry?.hourlyIncome)))
  const hourlyXpFromVehicles = Array.isArray(entry?.vehicles)
    ? entry.vehicles.reduce((sum, vehicle) => sum + Math.max(0, Math.trunc(num(vehicle?.xp))), 0)
    : 0
  const hourlyXpBase = Math.max(0, Math.trunc(num(
    entry?.hourlyXpBase ||
    (hourlyXpFromVehicles > 0 ? hourlyXpFromVehicles : entry?.hourlyXp || 0),
  )))
  const collectableCycles = Math.max(0, Math.trunc(num(entry?.collectableCycles)))
  const estimatedHours = hourlyIncome > 0 ? pendingIncome / hourlyIncome : 0
  const costMultiplierRaw = num(weeklyEvents?.costMultiplier || 1)
  const costMultiplier = costMultiplierRaw > 0 ? costMultiplierRaw : 1
  const xpMultiplierRaw = Math.trunc(num(weeklyEvents?.xpMultiplier || 1))
  const xpMultiplier = clamp(xpMultiplierRaw || 1, 1, 2)
  const incomeBase = scope === 'hourly'
    ? hourlyIncome
    : pendingIncome
  const elapsedHours = scope === 'hourly'
    ? 1
    : (collectableCycles > 0 ? collectableCycles : estimatedHours)
  const fuelNeedPerHour = Math.max(0, Math.trunc(num(entry?.fuelNeedPerHour)))
  const baseFuelNeeded = fuelNeedPerHour > 0 ? Math.max(0, Math.floor(fuelNeedPerHour * elapsedHours)) : 0
  const fuelNeeded = baseFuelNeeded > 0
    ? Math.max(1, Math.round(baseFuelNeeded * costMultiplier))
    : 0
  const fuelItemId = String(entry?.fuelItemId || 'oil')
  const fuelItemName = String(entry?.fuelItemName || 'Yakıt')
  const fuelInventory = options?.fuelInventory && typeof options.fuelInventory === 'object'
    ? options.fuelInventory
    : null
  const fuelAvailable = Math.max(0, Math.trunc(num(
    fuelInventory ? fuelInventory?.[fuelItemId] : inventoryById?.[fuelItemId],
  )))
  const hasEnoughFuel = fuelNeeded <= 0 || fuelAvailable >= fuelNeeded
  const fuelConsumed = hasEnoughFuel ? fuelNeeded : 0
  const fuelCoverage = hasEnoughFuel ? 1 : 0
  const grossAfterFuel = Math.max(0, Math.floor(incomeBase * multiplier * fuelCoverage))
  const xpBase = scope === 'hourly'
    ? hourlyXpBase
    : Math.max(0, Math.floor(hourlyXpBase * elapsedHours))
  const xpBaseWithEvents = Math.max(0, Math.floor(xpBase * xpMultiplier))
  const taxAmount = Math.max(0, Math.floor(grossAfterFuel * COLLECTION_TAX_RATE))
  const netCash = Math.max(0, grossAfterFuel - taxAmount)
  const xpGain = Math.max(0, Math.floor(xpBaseWithEvents * fuelCoverage))

  if (fuelInventory) {
    fuelInventory[fuelItemId] = Math.max(0, fuelAvailable - fuelConsumed)
  }

  return {
    fleetCount,
    pendingIncome,
    hourlyIncome,
    hourlyXp: hourlyXpBase,
    collectableCycles,
    estimatedHours,
    fuelItemId,
    fuelItemName,
    fuelNeeded,
    fuelAvailable,
    fuelConsumed,
    fuelCoverage,
    grossAfterFuel,
    taxAmount,
    netCash,
    xpGain,
  }
}

function bulkCollectPreview(entries, inventoryById = {}, options = {}) {
  const multiplier = Math.max(1, Math.trunc(num(options?.multiplier || 1)))
  const weeklyEvents = options?.weeklyEvents && typeof options.weeklyEvents === 'object'
    ? options.weeklyEvents
    : null
  const fuelInventory = { ...inventoryById }
  const summary = {
    grossCash: 0,
    taxAmount: 0,
    netCash: 0,
    xpGain: 0,
    fuelConsumed: 0,
    fuelConsumedByItem: {},
    collectedCount: 0,
  }

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || entry.unlocked === false) continue
    const preview = fleetCollectPreview(entry, inventoryById, { fuelInventory, multiplier, weeklyEvents })
    if (preview.fleetCount <= 0 || preview.pendingIncome <= 0) continue
    summary.grossCash += preview.grossAfterFuel
    summary.taxAmount += preview.taxAmount
    summary.netCash += preview.netCash
    summary.xpGain += preview.xpGain
    summary.fuelConsumed += preview.fuelConsumed
    if (preview.fuelConsumed > 0) {
      const fuelItemId = String(preview.fuelItemId || 'oil').trim() || 'oil'
      summary.fuelConsumedByItem[fuelItemId] =
        Math.max(0, num(summary.fuelConsumedByItem[fuelItemId])) + preview.fuelConsumed
    }
    summary.collectedCount += 1
  }

  return summary
}

function messageIconMeta(item) {
  const filter = String(item?.filter || '').trim().toLowerCase()
  if (filter === 'alert') {
    return {
      src: MESSAGE_ICONS.alert,
      fallback: MESSAGE_ICONS.alertFallback,
      label: 'Uyarı',
    }
  }
  if (filter === 'trade') {
    return {
      src: MESSAGE_ICONS.trade,
      fallback: MESSAGE_ICONS.tradeFallback,
      label: 'Ticaret',
    }
  }
  if (filter === 'message') {
    return {
      src: MESSAGE_ICONS.message,
      fallback: MESSAGE_ICONS.messageFallback,
      label: 'Mesaj',
    }
  }
  if (filter === 'other') {
    return {
      src: MESSAGE_ICONS.other,
      fallback: MESSAGE_ICONS.otherFallback,
      label: 'Sistem',
    }
  }
  return {
    src: MESSAGE_ICONS.default,
    fallback: MESSAGE_ICONS.defaultFallback,
    label: 'Bildirim',
  }
}

const MOJIBAKE_TEXT_PATTERN =
  /(?:\u00c3[\u0080-\u00bf]|\u00c4[\u0080-\u00bf]|\u00c5[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2\u20ac[\u0080-\u00bf]|\u00e2\u20ac\u2122|\u00e2\u20ac\u00a2|\ufffd)/
const MOJIBAKE_REPLACEMENTS = new Map([
  ['Ã§', 'ç'],
  ['Ã‡', 'Ç'],
  ['Ã¶', 'ö'],
  ['Ã–', 'Ö'],
  ['Ã¼', 'ü'],
  ['Ãœ', 'Ü'],
  ['Ä±', 'ı'],
  ['Ä°', 'İ'],
  ['ÄŸ', 'ğ'],
  ['Äž', 'Ğ'],
  ['ÅŸ', 'ş'],
  ['Åž', 'Ş'],
  ['â€™', '\''],
  ['â€œ', '"'],
  ['â€¦', '...'],
  ['Â', ''],
])

function replaceCommonMojibake(value) {
  let output = String(value ?? '')
  for (const [broken, fixed] of MOJIBAKE_REPLACEMENTS.entries()) {
    output = output.split(broken).join(fixed)
  }
  return output
}

function normalizeMojibakeText(value) {
  const safeValue = String(value ?? '')
  if (!safeValue || !MOJIBAKE_TEXT_PATTERN.test(safeValue)) return safeValue

  if (typeof TextDecoder === 'function') {
    try {
      const bytes = new Uint8Array(safeValue.length)
      for (let i = 0; i < safeValue.length; i += 1) {
        bytes[i] = safeValue.charCodeAt(i) & 0xff
      }
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      if (decoded && decoded !== safeValue) {
        return replaceCommonMojibake(decoded)
      }
    } catch {}
  }

  return replaceCommonMojibake(safeValue)
}

function AssetMetric({ icon, label, value, status = '', statusHint = '' }) {
  const safeStatus = status === 'ok' || status === 'fail' ? status : ''
  const metricClassName = safeStatus ? `asset-metric is-${safeStatus}` : 'asset-metric'
  const statusLabel = safeStatus === 'ok' ? 'Yeterli' : safeStatus === 'fail' ? 'Yetersiz' : ''
  const statusIcon = safeStatus === 'ok' ? '✓' : safeStatus === 'fail' ? '×' : ''
  const isLevelMetric = String(label || '').toLocaleLowerCase('tr-TR').includes('seviye')

  return (
    <div className={metricClassName}>
      <span className="asset-metric-icon">
        <img src={icon} alt={label} loading="lazy" />
      </span>
      <div className="asset-metric-copy">
        <small>{label}</small>
        <strong className={isLevelMetric ? 'level-text' : ''}>{value}</strong>
      </div>
      {safeStatus ? (
        <span className={`asset-metric-state is-${safeStatus}`} aria-label={statusHint || statusLabel} title={statusHint || statusLabel}>
          {statusIcon}
        </span>
      ) : null}
    </div>
  )
}

function createCostAvailabilityRow({ label, icon, required, available }) {
  const safeRequired = Math.max(0, Math.trunc(num(required)))
  const safeAvailable = Math.max(0, Math.trunc(num(available)))
  const enough = safeAvailable >= safeRequired
  const missing = Math.max(0, safeRequired - safeAvailable)
  return {
    label,
    icon,
    required: safeRequired,
    available: safeAvailable,
    enough,
    missing,
    value: `${fmt(safeRequired)} / ${fmt(safeAvailable)}`,
    statusHint: enough ? 'Yeterli' : `Eksik: ${fmt(missing)}`,
  }
}

function fleetOrderCostRows(vehicle, walletNow, inventoryById = {}) {
  const rows = [
    createCostAvailabilityRow({
      label: 'Nakit Maliyet',
      icon: '/home/icons/depot/cash.webp',
      required: vehicle?.cash || 0,
      available: walletNow,
    }),
  ]

  const engineKitRequired = Math.max(0, Math.trunc(num(vehicle?.engineKits || 0)))
  if (engineKitRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Motor Maliyeti',
      icon: '/home/icons/depot/spare-parts.webp',
      required: engineKitRequired,
      available: inventoryById['engine-kit'] || 0,
    }))
  }

  const sparePartsRequired = Math.max(0, Math.trunc(num(vehicle?.spareParts || 0)))
  if (sparePartsRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Yedek Parça Maliyeti',
      icon: '/home/icons/depot/yedekparca.webp',
      required: sparePartsRequired,
      available: inventoryById['spare-parts'] || 0,
    }))
  }

  const cementRequired = Math.max(0, Math.trunc(num(vehicle?.cement || 0)))
  if (cementRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Çimento Maliyeti',
      icon: '/home/icons/depot/cement.webp',
      required: cementRequired,
      available: inventoryById.cement || 0,
    }))
  }

  const timberRequired = Math.max(0, Math.trunc(num(vehicle?.timber || 0)))
  if (timberRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Kereste Maliyeti',
      icon: '/home/icons/depot/timber.webp',
      required: timberRequired,
      available: inventoryById.timber || 0,
    }))
  }

  const brickRequired = Math.max(0, Math.trunc(num(vehicle?.brick || 0)))
  if (brickRequired > 0) {
    rows.push(createCostAvailabilityRow({
      label: 'Tuğla Maliyeti',
      icon: '/home/icons/depot/brick.webp',
      required: brickRequired,
      available: inventoryById.brick || 0,
    }))
  }

  return rows
}

function logisticsOrderCostRows(truck, walletNow, inventoryById = {}) {
  return [
    createCostAvailabilityRow({
      label: 'Nakit Maliyet',
      icon: '/home/icons/depot/cash.webp',
      required: truck?.cash || 0,
      available: walletNow,
    }),
    createCostAvailabilityRow({
      label: 'Motor Maliyeti',
      icon: '/home/icons/depot/spare-parts.webp',
      required: truck?.engineKits || 0,
      available: inventoryById['engine-kit'] || 0,
    }),
    createCostAvailabilityRow({
      label: 'Yedek Parça Maliyeti',
      icon: '/home/icons/depot/yedekparca.webp',
      required: truck?.spareParts || 0,
      available: inventoryById['spare-parts'] || 0,
    }),
  ]
}

function normalizeRequiredCostLabel(label) {
  if (label === 'Nakit Maliyet') return 'Gereken Para'
  if (label === 'Motor Maliyeti') return 'Gereken Motor'
  if (label === 'Yedek Parça Maliyeti') return 'Gereken Yedek Parça'
  if (label === 'Çimento Maliyeti') return 'Gereken Çimento'
  if (label === 'Kereste Maliyeti') return 'Gereken Kereste'
  if (label === 'Tuğla Maliyeti') return 'Gereken Tuğla'
  return label
}

function toDisplayOrderCostRows(rows, options = {}) {
  const requiredOnly = options?.requiredOnly !== false
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    label: normalizeRequiredCostLabel(row?.label),
    value: requiredOnly ? fmt(row?.required || 0) : String(row?.value || ''),
  }))
}

function ForexCountdownText({ nextUpdateMs, onElapsed }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const elapsedFiredRef = useRef(false)

  useEffect(() => {
    elapsedFiredRef.current = false
    setNowMs(Date.now())
  }, [nextUpdateMs])

  useEffect(() => {
    if (!Number.isFinite(nextUpdateMs) || typeof window === 'undefined') return undefined
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [nextUpdateMs])

  useEffect(() => {
    if (!Number.isFinite(nextUpdateMs) || typeof onElapsed !== 'function') return
    if (nowMs < nextUpdateMs || elapsedFiredRef.current) return
    elapsedFiredRef.current = true
    onElapsed()
  }, [nextUpdateMs, nowMs, onElapsed])

  if (!Number.isFinite(nextUpdateMs)) return '--:--:--'
  return fmtCountdown(Math.max(0, nextUpdateMs - nowMs))
}

function BankCountdownText({ active, initialRemainingMs, onElapsed }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, Math.trunc(num(initialRemainingMs || 0))))
  const elapsedFiredRef = useRef(false)

  useEffect(() => {
    elapsedFiredRef.current = false
    setRemainingMs(Math.max(0, Math.trunc(num(initialRemainingMs || 0))))
  }, [active, initialRemainingMs])

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined
    const intervalId = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [active])

  useEffect(() => {
    if (!active || typeof onElapsed !== 'function' || elapsedFiredRef.current) return
    if (remainingMs > 0) return
    elapsedFiredRef.current = true
    onElapsed()
  }, [active, onElapsed, remainingMs])

  if (!active) return '--'
  if (remainingMs <= 0) return 'Vade doldu'
  return formatCountdownWithDaysTr(remainingMs)
}

function isPageVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

function HomePage({ user, onLogout }) {
  const [tab, setTab] = useState('home')
  const [marketTab, setMarketTab] = useState('buy')
  const [profileTab, setProfileTab] = useState('profile')
  const role = normalizeRoleValue(user?.role)
  const isStaffUser = role === 'admin' || role === 'moderator'
  const selfRoleLabel = roleLabelFromValue(role, user?.roleLabel || '')
  const leaderboardMetricSafe = 'season'
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [leaderboardTick, setLeaderboardTick] = useState(0)
  const [leaderboardSearchOpen, setLeaderboardSearchOpen] = useState(false)
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('')
  const [leaderboardSearchError, setLeaderboardSearchError] = useState('')
  const [leaderboardHighlightKey, setLeaderboardHighlightKey] = useState('')
  const [marketplaceTab, setMarketplaceTab] = useState('pazar')
  const [marketplaceFilter, setMarketplaceFilter] = useState('all')
  const [sellForm, setSellForm] = useState({ itemId: '', quantity: '50', unitPrice: '' })
  const [marketplaceBuyModal, setMarketplaceBuyModal] = useState(null)
  const [marketplaceBuyModalQty, setMarketplaceBuyModalQty] = useState('1')
  const [navTheme, setNavTheme] = useState(() => loadStoredNavTheme())
  const [messageFilter, setMessageFilter] = useState('all')
  const [messageViewTab, setMessageViewTab] = useState('bildirimler')
  const [overview, setOverview] = useState(null)
  const [market, setMarket] = useState(null)
  const [forex, setForex] = useState(null)
  const [bankState, setBankState] = useState(null)
  const [bankForm, setBankForm] = useState({
    depositAmount: '',
    withdrawAmount: '',
    termAmount: '',
    termDays: '1',
  })
  const [forexTradeForm, setForexTradeForm] = useState({
    quantity: '',
    side: 'buy',
  })
  const [forexChartRangeId, setForexChartRangeId] = useState('24h')
  const [forexChartHoverIndex, setForexChartHoverIndex] = useState(-1)
  const [forexViewportWidth, setForexViewportWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth : 1280
  ))
  const [business, setBusiness] = useState(null)
  const [factories, setFactories] = useState(null)
  const [mines, setMines] = useState(null)
  const [mineDigModal, setMineDigModal] = useState(null)
  const [mineDigCountdownSec, setMineDigCountdownSec] = useState(10)
  const [mineCollectResult, setMineCollectResult] = useState(null)
  const [mineConfirmModal, setMineConfirmModal] = useState(null)
  const [_minesClockTick, setMinesClockTick] = useState(0)
  const [noticeIsSuccess, setNoticeIsSuccess] = useState(false)
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [businessScene, setBusinessScene] = useState('hub')
  const [businessDetailTab, setBusinessDetailTab] = useState('garage')
  const [logisticsDetailTab, setLogisticsDetailTab] = useState('garage')
  const [logisticsScene, setLogisticsScene] = useState('detail')
  const [businessModal, setBusinessModal] = useState('')
  const [factoryPurchaseModalId, setFactoryPurchaseModalId] = useState('')
  const [factoryBulkModalOpen, setFactoryBulkModalOpen] = useState(false)
  const [factoryCollectModalId, setFactoryCollectModalId] = useState('')
  const [factoryUpgradeModalId, setFactoryUpgradeModalId] = useState('')
  const [listingDraft, setListingDraft] = useState(null)
  const [listingFriends, setListingFriends] = useState([])
  const [listingFriendsLoading, setListingFriendsLoading] = useState(false)
  const [marketDetailDraft, setMarketDetailDraft] = useState(null)
  const [marketPurchaseResult, setMarketPurchaseResult] = useState(null)

  useEffect(() => {
    if (!listingDraft || String(listingDraft.visibility || 'public').trim().toLowerCase() !== 'custom') return
    const currentRecipientUserId = String(listingDraft.recipientUserId || '').trim()
    const hasCurrent = Array.isArray(listingFriends) && listingFriends.some((f) => String(f?.userId || '').trim() === currentRecipientUserId)
    const firstFriendUserId = Array.isArray(listingFriends) && listingFriends.length ? String(listingFriends[0]?.userId || '').trim() : ''
    if (!hasCurrent && firstFriendUserId) {
      setListingDraft((prev) => (prev ? { ...prev, recipientUserId: firstFriendUserId } : prev))
    }
  }, [listingFriends, listingDraft, setListingDraft])
  const [collectTargetBusinessId, setCollectTargetBusinessId] = useState('')
  const [marketFilterForm, setMarketFilterForm] = useState({
    model: 'all',
    minPrice: '',
    maxPrice: '',
    minLevel: '',
    maxLevel: '',
  })
  const [missions, setMissions] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orderBook, setOrderBook] = useState(null)
  const [logistics, setLogistics] = useState(null)
  const [league, setLeague] = useState(null)
  const [seasonRewardsOpen, setSeasonRewardsOpen] = useState(false)
  const [seasonChestsOpen, setSeasonChestsOpen] = useState(false)
  const [, setPushCenter] = useState(null)
  const [history, setHistory] = useState({})
  const [chartItemId, setChartItemId] = useState('')
  const [bookItemId, setBookItemId] = useState('')
  const [qty, setQty] = useState({})
  const [orderForm, setOrderForm] = useState({
    side: 'buy',
    quantity: '25',
    limitPrice: '100',
    expiresMinutes: '30',
  })
  const [priceAlertForm, setPriceAlertForm] = useState({
    itemId: '',
    direction: 'below',
    targetPrice: '100',
  })
  const [auctionForm, setAuctionForm] = useState({
    itemId: '',
    quantity: '20',
    startBid: '1500',
    minIncrement: '100',
    durationMinutes: '30',
  })
  const [auctionBidById, setAuctionBidById] = useState({})
  const [chat, setChat] = useState(CHAT_SEED)
  const [chatUsers, setChatUsers] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatReplyTarget, setChatReplyTarget] = useState(null)
  const [chatFirstUnreadId, setChatFirstUnreadId] = useState('')
  const [chatSocketState, setChatSocketState] = useState('offline')
  const [chatRestrictions, setChatRestrictions] = useState(EMPTY_CHAT_RESTRICTIONS)
  const [chatClockMs, setChatClockMs] = useState(() => new Date().getTime())
  const [, setMessageSocketState] = useState('offline')
  const [messageCenter, setMessageCenter] = useState({
    filter: 'all',
    counts: { all: 0, message: 0, trade: 0, other: 0, alert: 0 },
    unreadCount: 0,
    spotlight: null,
    items: [],
    moderation: EMPTY_USER_MODERATION,
  })
  const [messageThread, setMessageThread] = useState([])
  const [messageForm, setMessageForm] = useState({ toUsername: '', text: '' })
  const [messageReplyTarget, setMessageReplyTarget] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(() => consumeAuthNotice())
  const [error, setError] = useState('')
  const [levelFx, setLevelFx] = useState(false)
  const [bursts, setBursts] = useState([])
  const [avatarFailedSrc, setAvatarFailedSrc] = useState('')
  const [profileModalUserId, setProfileModalUserId] = useState(null)
  const [profileModalData, setProfileModalData] = useState(null)
  const [profileModalLoading, setProfileModalLoading] = useState(false)
  const [profileModalBusinessExpand, setProfileModalBusinessExpand] = useState(null)
  const [profileTeklifSending, setProfileTeklifSending] = useState(false)
  const [chatReportModal, setChatReportModal] = useState(null)
  const [dmReportModal, setDmReportModal] = useState(null)
  const [garagePanel, setGaragePanel] = useState({
    open: false,
    username: null,
    displayName: null,
    avatarUrl: null,
    levelLabel: null,
    businessName: null,
    templateId: '',
    assetTypeLabel: 'Araç',
    garageTypeLabel: 'Garaj',
    vehicles: [],
    isLogistics: false,
  })
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarCropSource, setAvatarCropSource] = useState('')
  const [avatarCropFile, setAvatarCropFile] = useState(null)
  const [avatarCropFileName, setAvatarCropFileName] = useState('')
  const [avatarCropMode, setAvatarCropMode] = useState('crop')
  const [avatarCropZoom, setAvatarCropZoom] = useState(1)
  const [avatarCropOffsetX, setAvatarCropOffsetX] = useState(0)
  const [avatarCropOffsetY, setAvatarCropOffsetY] = useState(0)
  const [avatarCropNatural, setAvatarCropNatural] = useState({ width: 0, height: 0 })
  const [warehouseOpen, setWarehouseOpen] = useState(false)
  const [profileAccountForm, setProfileAccountForm] = useState(() => ({
    username: String(user?.username || '').trim(),
    avatarUrl: '',
    newPassword: '',
    confirmPassword: '',
  }))
  const [supportForm, setSupportForm] = useState({
    title: '',
    description: '',
  })
  const [settingsThemeModalOpen, setSettingsThemeModalOpen] = useState(false)
  const [dailyStore, setDailyStore] = useState({ offers: [], nextResetAt: '', remainingMs: 0 })
  const [dailyLoginReward, setDailyLoginReward] = useState(DAILY_LOGIN_STATE_SEED)
  const [dailyRewardOpen, setDailyRewardOpen] = useState(false)
  const [dailyRewardResult, setDailyRewardResult] = useState(null)
  const [tutorialEnabled, setTutorialEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return (
        window.localStorage.getItem(TUTORIAL_PENDING_KEY) === '1' ||
        window.localStorage.getItem(TUTORIAL_COMPLETED_KEY) === '1' ||
        window.localStorage.getItem(TUTORIAL_STEP_KEY) !== null ||
        window.localStorage.getItem('ticarnet_live_narrator_welcome') === '1'
      )
    } catch {
      return false
    }
  })
  const [tutorialPending, setTutorialPending] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return (
        window.localStorage.getItem(TUTORIAL_PENDING_KEY) === '1' ||
        window.localStorage.getItem('ticarnet_live_narrator_welcome') === '1'
      )
    } catch {
      return false
    }
  })
  const [tutorialCompleted, setTutorialCompleted] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(TUTORIAL_COMPLETED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [tutorialActive, setTutorialActive] = useState(false)
  const [tutorialStepIndex, setTutorialStepIndex] = useState(() => {
    if (typeof window === 'undefined') return 0
    try {
      const raw = Math.trunc(num(window.localStorage.getItem(TUTORIAL_STEP_KEY) || 0))
      return clamp(raw, 0, Math.max(0, TUTORIAL_STEPS.length - 1))
    } catch {
      return 0
    }
  })
  const [tutorialTaskState, setTutorialTaskState] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      const parsed = JSON.parse(window.localStorage.getItem(TUTORIAL_TASKS_KEY) || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
      const normalized = {}
      Object.entries(parsed).forEach(([stepId, stepTasks]) => {
        if (!stepTasks || typeof stepTasks !== 'object' || Array.isArray(stepTasks)) return
        const safeStepId = String(stepId || '').trim()
        if (!safeStepId) return
        normalized[safeStepId] = Object.fromEntries(
          Object.entries(stepTasks).map(([taskId, done]) => [String(taskId || '').trim(), Boolean(done)]),
        )
      })
      return normalized
    } catch {
      return {}
    }
  })
  const [tutorialNavPending, setTutorialNavPending] = useState(false)
  const fxTimer = useRef(0)
  const forexBoundaryRetryTimerRef = useRef(0)
  const forexHoverRafRef = useRef(0)
  const forexHoverPendingRef = useRef(null)
  const overviewLevelRef = useRef(0)
  const burstCounter = useRef(0)
  const chatSocketRef = useRef(null)
  const marketDetailJustOpenedAtRef = useRef(0)
  const chatReconnectTimer = useRef(0)
  const chatReconnectEnabled = useRef(true)
  const chatConnectRef = useRef(() => {})
  const chatThreadRef = useRef(null)
  const chatMessageRefs = useRef({})
  const chatInitReadyRef = useRef(false)
  const activeTabRef = useRef('home')
  const mineDigCollectedRef = useRef(false)
  const pageScrollRef = useRef(null)
  const factoryPurchaseOverlayRef = useRef(null)
  const avatarCropImageRef = useRef(null)
  const avatarCropSourceRef = useRef('')
  const avatarFileInputRef = useRef(null)
  const messageFilterRef = useRef('all')
  const messageSocketRef = useRef(null)
  const messageReconnectTimer = useRef(0)
  const messageReconnectEnabled = useRef(true)
  const messageConnectRef = useRef(() => {})
  const messageReplyTargetRef = useRef(null)
  const messageViewTabRef = useRef('bildirimler')
  const liveMessageRefreshTimerRef = useRef(0)
  const liveMessageRefreshInFlightRef = useRef(false)
  const notificationsMarkedRef = useRef(false)
  const notificationsMarkingInFlightRef = useRef(false)
  const logoutTriggeredRef = useRef(false)
  const missionSlotRefreshInFlightRef = useRef(false)
  const dailyLoginResetSyncKeyRef = useRef('')
  const bankLoadInFlightRef = useRef(false)
  const bankLastLoadedAtRef = useRef(0)
  const bankStateRef = useRef(null)
  const openTabRef = useRef(async () => {})
  const tutorialAutoTriedRef = useRef(false)
  const tutorialSpotlightTimerRef = useRef(0)

  useEffect(() => () => {
    clearTimeout(fxTimer.current)
    clearTimeout(forexBoundaryRetryTimerRef.current)
    clearTimeout(tutorialSpotlightTimerRef.current)
    clearTimeout(liveMessageRefreshTimerRef.current)
    if (typeof window !== 'undefined' && forexHoverRafRef.current) {
      window.cancelAnimationFrame(forexHoverRafRef.current)
      forexHoverRafRef.current = 0
    }
    forexHoverPendingRef.current = null
    clearTimeout(chatReconnectTimer.current)
    clearTimeout(messageReconnectTimer.current)
    chatReconnectEnabled.current = false
    messageReconnectEnabled.current = false
    if (chatSocketRef.current) {
      chatSocketRef.current.close(1000, 'component_unmount')
      chatSocketRef.current = null
    }
    if (messageSocketRef.current) {
      messageSocketRef.current.close(1000, 'component_unmount')
      messageSocketRef.current = null
    }
  }, [])

  useEffect(() => {
    activeTabRef.current = tab
  }, [tab])

  useEffect(() => {
    bankStateRef.current = bankState
  }, [bankState])

  // BİLDİRİMLER sekmesine girildiğinde mevcut bildirimleri okundu say (DM sayaçları etkilenmez)
  useEffect(() => {
    if (MESSAGES_DISABLED) return
    if (tab !== 'messages' || messageViewTab !== 'bildirimler') {
      notificationsMarkedRef.current = false
      notificationsMarkingInFlightRef.current = false
      return
    }
    if (notificationsMarkedRef.current || notificationsMarkingInFlightRef.current) return

    const items = messageCenter?.items || []
    const unreadNotificationIds = items
      .filter((item) => !(item?.source === 'direct' || item?.filter === 'message'))
      .filter((item) => item?.read !== true && item?.id)
      .map((item) => String(item.id || '').trim())
      .filter(Boolean)

    if (unreadNotificationIds.length === 0) {
      notificationsMarkedRef.current = true
      return
    }

    notificationsMarkedRef.current = true
    notificationsMarkingInFlightRef.current = true
    ;(async () => {
      try {
        const responses = await Promise.all(
          unreadNotificationIds.map((id) => markMessageCenterItemRead(id)),
        )
        const hasFailure = responses.some((response) => !response?.success)
        if (hasFailure) {
          notificationsMarkedRef.current = false
        }
      } finally {
        notificationsMarkingInFlightRef.current = false
        await loadMessageCenter('all')
      }
    })()
  }, [MESSAGES_DISABLED, messageViewTab, messageCenter, tab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(NAV_THEME_STORAGE_KEY, sanitizeNavTheme(navTheme))
    } catch {
      // ignore storage errors
    }
  }, [navTheme])

  useEffect(() => {
    if (marketplaceBuyModal && tab === 'marketplace') {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev || '' }
    }
  }, [marketplaceBuyModal, tab])

  useEffect(() => {
    if (tab === 'marketplace') return
    if (!marketplaceBuyModal) return
    setMarketplaceBuyModal(null)
    setMarketplaceBuyModalQty('1')
  }, [marketplaceBuyModal, tab])

  useEffect(() => {
    if (tab === 'factories') return
    if (!factoryPurchaseModalId) return
    setFactoryPurchaseModalId('')
  }, [factoryPurchaseModalId, tab])

  useEffect(() => {
    if (tab !== 'bank' || typeof document === 'undefined') return
    // Hard reset any stale page lock that could block scroll/typing in bank screen.
    if (document.body?.style?.overflow === 'hidden') {
      document.body.style.overflow = ''
    }
  }, [tab])

  const clearTutorialPendingFlag = useCallback(() => {
    try {
      window.localStorage.removeItem(TUTORIAL_PENDING_KEY)
      window.localStorage.removeItem('ticarnet_live_narrator_welcome')
    } catch {
      // ignore storage errors
    }
    setTutorialEnabled(true)
    setTutorialPending(false)
  }, [])

  const markTutorialCompleted = useCallback(() => {
    try {
      window.localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1')
      window.localStorage.removeItem(TUTORIAL_PENDING_KEY)
      window.localStorage.removeItem(TUTORIAL_STEP_KEY)
      window.localStorage.removeItem(TUTORIAL_TASKS_KEY)
      window.localStorage.removeItem('ticarnet_live_narrator_welcome')
    } catch {
      // ignore storage errors
    }
    setTutorialTaskState({})
    setTutorialEnabled(true)
    setTutorialCompleted(true)
    setTutorialPending(false)
    setTutorialActive(false)
  }, [])

  const getTutorialStepMetaByIndex = useCallback((index) => {
    const safeIndex = clamp(Math.trunc(num(index || 0)), 0, Math.max(0, TUTORIAL_STEPS.length - 1))
    const step = TUTORIAL_STEPS[safeIndex] || TUTORIAL_STEPS[0] || {}
    const rawStepId = String(step?.id || `step-${safeIndex + 1}`).trim()
    const stepId = rawStepId || `step-${safeIndex + 1}`
    const tasks = buildTutorialTasksForStep(step)
    return { safeIndex, step, stepId, tasks }
  }, [])

  const startTutorial = useCallback((options = {}) => {
    const lastIndex = Math.max(0, TUTORIAL_STEPS.length - 1)
    const initialStep = clamp(Math.trunc(num(options?.step || 0)), 0, lastIndex)
    const resetProgress = options?.resetProgress !== false
    try {
      window.localStorage.removeItem(TUTORIAL_COMPLETED_KEY)
      window.localStorage.removeItem(TUTORIAL_PENDING_KEY)
      window.localStorage.setItem(TUTORIAL_STEP_KEY, String(initialStep))
      if (resetProgress) {
        window.localStorage.removeItem(TUTORIAL_TASKS_KEY)
      }
      window.localStorage.removeItem('ticarnet_live_narrator_welcome')
    } catch {
      // ignore storage errors
    }
    if (resetProgress) {
      setTutorialTaskState({})
    }
    setTutorialEnabled(true)
    setTutorialPending(false)
    setTutorialCompleted(false)
    setTutorialStepIndex(initialStep)
    setTutorialActive(true)
    tutorialAutoTriedRef.current = true
  }, [])

  const closeTutorial = useCallback(() => {
    setTutorialActive(false)
  }, [])

  const focusTutorialTarget = useCallback((target) => {
    if (typeof document === 'undefined') return
    const selector = String(target?.selector || '').trim()
    if (!selector) return
    clearTimeout(tutorialSpotlightTimerRef.current)
    let attempts = 0
    const tryFocus = () => {
      const node = document.querySelector(selector)
      if (!node) {
        if (attempts >= 14) return
        attempts += 1
        tutorialSpotlightTimerRef.current = window.setTimeout(tryFocus, 130)
        return
      }
      if (node?.scrollIntoView) {
        node.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        })
      }
      node.classList.add(TUTORIAL_SPOTLIGHT_CLASS)
      tutorialSpotlightTimerRef.current = window.setTimeout(() => {
        node.classList.remove(TUTORIAL_SPOTLIGHT_CLASS)
      }, 1700)
    }
    tryFocus()
  }, [])

  const openTutorialTargetForStep = useCallback(async (stepIndex, options = {}) => {
    const { step } = getTutorialStepMetaByIndex(stepIndex)
    const target = step?.target
    if (!target?.tab || tutorialNavPending) return false
    setTutorialNavPending(true)
    try {
      await openTabRef.current(target.tab, target)
      if (options.closeOverlay === true) {
        setTutorialActive(false)
      }
      focusTutorialTarget(target)
      if (options.announce !== false) {
        const focusLabel = String(target?.focusLabel || '').trim()
        const focusText = focusLabel ? `${focusLabel} odağına yönlendirildin.` : 'Hedef bölüme yönlendirildin.'
        setNotice(
          `${step?.title || 'Rehber'} adımı açıldı. ${focusText} Bu bölümdeki adımları tamamladıktan sonra üstteki "Sonraki" düğmesiyle devam edebilirsin.`,
        )
        setNoticeIsSuccess(true)
      }
      return true
    } finally {
      setTutorialNavPending(false)
    }
  }, [
    focusTutorialTarget,
    getTutorialStepMetaByIndex,
    tutorialNavPending,
  ])

  const goTutorialPrev = useCallback(() => {
    const prevIndex = Math.max(0, tutorialStepIndex - 1)
    if (prevIndex === tutorialStepIndex) return
    setTutorialStepIndex(prevIndex)
    void openTutorialTargetForStep(prevIndex, { closeOverlay: false, announce: true })
  }, [openTutorialTargetForStep, tutorialStepIndex])

  const goTutorialNext = useCallback(() => {
    const lastIndex = Math.max(0, TUTORIAL_STEPS.length - 1)
    if (tutorialStepIndex >= lastIndex) {
      markTutorialCompleted()
      setNotice('Rehber başarıyla tamamlandı.')
      return
    }
    const nextIndex = Math.min(lastIndex, tutorialStepIndex + 1)
    setTutorialStepIndex(nextIndex)
    void openTutorialTargetForStep(nextIndex, { closeOverlay: false, announce: true })
  }, [
    markTutorialCompleted,
    openTutorialTargetForStep,
    tutorialStepIndex,
  ])

  useEffect(() => {
    if (!tutorialEnabled || tutorialCompleted) return
    try {
      const safe = clamp(Math.trunc(num(tutorialStepIndex)), 0, Math.max(0, TUTORIAL_STEPS.length - 1))
      window.localStorage.setItem(TUTORIAL_STEP_KEY, String(safe))
    } catch {
      // ignore storage errors
    }
  }, [tutorialCompleted, tutorialEnabled, tutorialStepIndex])

  useEffect(() => {
    if (!tutorialEnabled || tutorialCompleted) return
    try {
      window.localStorage.setItem(TUTORIAL_TASKS_KEY, JSON.stringify(tutorialTaskState || {}))
    } catch {
      // ignore storage errors
    }
  }, [tutorialCompleted, tutorialEnabled, tutorialTaskState])

  useEffect(() => {
    if (!tutorialPending || tutorialCompleted) return undefined
    if (tutorialAutoTriedRef.current) return undefined
    tutorialAutoTriedRef.current = true
    const timeoutId = window.setTimeout(() => {
      if (tab !== 'home') {
        setTab('home')
      }
      setTutorialStepIndex(0)
      setTutorialActive(true)
      clearTutorialPendingFlag()
    }, 120)
    return () => window.clearTimeout(timeoutId)
  }, [clearTutorialPendingFlag, tab, tutorialCompleted, tutorialPending])

  useEffect(() => {
    if (!tutorialActive || typeof window === 'undefined') return undefined
    const onKeyDown = (event) => {
      const targetTag = String(event?.target?.tagName || '').toLowerCase()
      const isTypingField = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select'
      if (isTypingField) return
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTutorial()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTutorialNext()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTutorialPrev()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeTutorial, goTutorialNext, goTutorialPrev, tutorialActive])

  const reloadProfileModal = useCallback(async (options = {}) => {
    if (!profileModalUserId) {
      setProfileModalData(null)
      setProfileModalLoading(false)
      return false
    }
    const showLoading = options?.showLoading !== false
    if (showLoading) {
      setProfileModalLoading(true)
    }
    const isSelf = user?.id && String(profileModalUserId) === String(user.id)
    const response = isSelf ? await getProfileState() : await getPublicProfileState(profileModalUserId)
    if (response?.success && response?.profile) {
      setProfileModalData(response.profile)
      if (showLoading) setProfileModalLoading(false)
      return true
    }
    setProfileModalData((prev) => {
      const prevUserId = String(prev?.userId || '').trim()
      const currentUserId = String(profileModalUserId || '').trim()
      if (prev && prevUserId && currentUserId && prevUserId === currentUserId) {
        return prev
      }
      return null
    })
    if (showLoading) setProfileModalLoading(false)
    return false
  }, [profileModalUserId, user?.id])

  useEffect(() => {
    if (!profileModalUserId) {
      setProfileModalData(null)
      setProfileModalLoading(false)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      const ok = await reloadProfileModal({ showLoading: true })
      if (!ok && !cancelled) {
        setProfileModalLoading(false)
      }
    })()

    const timer = window.setInterval(() => {
      if (cancelled) return
      void reloadProfileModal({ showLoading: false })
    }, 12000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [profileModalUserId, reloadProfileModal])

  const profileOverviewDisplayName = overview?.profile?.displayName
  const profileOverviewUsername = overview?.profile?.username

  useEffect(() => {
    if (profileTab !== 'profile') return undefined

    const timerId = window.setTimeout(() => {
      setProfileAccountForm((prev) => ({
        ...prev,
        username: String(profileOverviewUsername ?? prev.username ?? '').trim(),
      }))
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [profileOverviewUsername, profileTab])

  const handleForcedLogout = useCallback((message) => {
    if (logoutTriggeredRef.current) return
    logoutTriggeredRef.current = true
    const safeMessage = String(message || '').trim() || SESSION_REPLACED_NOTICE
    onLogout(safeMessage)
  }, [onLogout])

  const fail = useCallback((response, fallback) => {
    if (shouldForceLogoutFromResult(response)) {
      handleForcedLogout(errText(response?.errors, SESSION_REPLACED_NOTICE))
      return false
    }
    setError(errText(response?.errors, fallback))
    return false
  }, [handleForcedLogout])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (logoutTriggeredRef.current) return
      void (async () => {
        const activeUser = await getStoredUser()
        if (!activeUser) {
          handleForcedLogout(SESSION_REPLACED_NOTICE)
        }
      })()
    }, 12000)

    return () => window.clearInterval(intervalId)
  }, [handleForcedLogout])

  const applyChatRestrictions = useCallback((rawState) => {
    if (!rawState || typeof rawState !== 'object') return
    setChatRestrictions(normalizeChatRestrictions(rawState))
    setChatClockMs(Date.now())
  }, [])

  useEffect(() => {
    if (!error && !notice) return undefined
    const timeoutMs = error ? 8500 : 5200
    const timer = window.setTimeout(() => {
      if (error) setError('')
      if (notice) {
        setNotice('')
        setNoticeIsSuccess(false)
      }
    }, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [error, notice])

  useEffect(() => {
    if (!mineDigModal) return undefined
    if (mineCollectResult) return undefined
    if (mineDigCountdownSec <= 0) {
      if (mineDigCollectedRef.current) return undefined
      mineDigCollectedRef.current = true
      const mineId = mineDigModal.mine?.id
      if (!mineId) {
        mineDigCollectedRef.current = false
        setMineDigModal(null)
        setMineDigCountdownSec(10)
        return undefined
      }
      let cancelled = false
      collectMine(mineId).then((response) => {
        if (cancelled) return
        if (response?.success && response?.collected) {
          setMineCollectResult(response.collected)
          setMines((prev) => (response.mines ? { ...prev, mines: response.mines, updatedAt: response.updatedAt } : prev))
          const label = factoryItemMeta(response.collected.itemId)?.label || response.collected.itemId
          setNoticeIsSuccess(true)
          setNotice(`Elde ettiğin kaynak: ${response.collected.quantity} ${label} depoya aktarıldı.`)
          loadProfile().catch(() => {})
          loadOverview().catch(() => {})
        } else {
          fail(response, response?.errors?.global || 'Tahsilat alınamadı.')
          setMineDigModal(null)
        }
        setMineDigCountdownSec(10)
      }).catch(() => {
        if (!cancelled) setMineDigModal(null)
        setMineDigCountdownSec(10)
      })
      const t = window.setTimeout(() => {
        if (!cancelled) {
          setMineDigModal(null)
          setMineCollectResult(null)
          mineDigCollectedRef.current = false
        }
      }, 2500)
      return () => { cancelled = true; window.clearTimeout(t) }
    }
    const interval = window.setInterval(() => {
      setMineDigCountdownSec((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [mineDigModal, mineDigCountdownSec, mineCollectResult])

  useEffect(() => {
    if (tab !== 'mines' || !Array.isArray(mines?.mines) || mines.mines.length === 0) return undefined
    const interval = window.setInterval(() => setMinesClockTick((t) => t + 1), 1000)
    return () => window.clearInterval(interval)
  }, [tab, mines?.mines?.length])

  const loadOverview = useCallback(async () => {
    const response = await getGameOverview()
    if (!response?.success) return fail(response, 'Ana sayfa verileri alınamadı.')
    const oldLv = overviewLevelRef.current
    const newLv = response?.profile?.levelInfo?.level || 0
    if (newLv > oldLv) {
      setLevelFx(true)
      clearTimeout(fxTimer.current)
      fxTimer.current = window.setTimeout(() => setLevelFx(false), 520)
    }
    overviewLevelRef.current = newLv
    setOverview(response)
    setMessageCenter((prev) => ({
      ...prev,
      moderation: normalizeUserModeration(response?.profile?.moderation),
    }))
    return true
  }, [fail])

  const loadMarket = useCallback(async () => {
    const response = await getMarketState()
    if (!response?.success) return fail(response, 'Pazar verileri alınamadı.')
    setMarket(response)
    setHistory((prev) => {
      const next = { ...prev }
      for (const item of response.items || []) {
        next[item.id] = [...(next[item.id] || []), item.price].slice(-32)
      }
      return next
    })
    if (!chartItemId && response.items?.length) setChartItemId(response.items[0].id)
    if (!bookItemId && response.items?.length) setBookItemId(response.items[0].id)
    if (!priceAlertForm.itemId && response.items?.length) {
      setPriceAlertForm((prev) => ({ ...prev, itemId: response.items[0].id }))
    }
    if (!auctionForm.itemId && response.items?.length) {
      setAuctionForm((prev) => ({ ...prev, itemId: response.items[0].id }))
    }
    return true
  }, [
    auctionForm.itemId,
    bookItemId,
    chartItemId,
    fail,
    priceAlertForm.itemId,
  ])

  const loadForex = useCallback(async () => {
    const response = await getForexState()
    if (!response?.success) return fail(response, 'Döviz piyasası verileri alınamadı.')
    setForex(response)
    return response
  }, [fail])

  const loadBank = useCallback(async (options = {}) => {
    const force = Boolean(options?.force)
    const nowMs = Date.now()
    if (!force && (nowMs - bankLastLoadedAtRef.current) < 900) {
      return bankStateRef.current
    }
    if (bankLoadInFlightRef.current) {
      return bankStateRef.current
    }
    bankLoadInFlightRef.current = true
    try {
      const response = await getBankState()
      if (!response?.success) return fail(response, 'Banka verileri alınamadı.')
      const nextBank = response?.bank || null
      setBankState(nextBank)
      bankStateRef.current = nextBank
      bankLastLoadedAtRef.current = Date.now()
      if (Array.isArray(nextBank?.termOptions) && nextBank.termOptions.length > 0) {
        const defaultDays = String(nextBank.termOptions[0]?.days || '1')
        setBankForm((prev) => {
          const safeCurrent = String(prev?.termDays || '').trim()
          const matched = nextBank.termOptions.some((entry) => String(entry?.days) === safeCurrent)
          if (matched) return prev
          return { ...prev, termDays: defaultDays }
        })
      }
      return nextBank
    } finally {
      bankLoadInFlightRef.current = false
    }
  }, [fail])

  const loadBusiness = useCallback(async () => {
    const response = await getBusinessesState()
    if (!response?.success) return fail(response, 'İşletme verileri alınamadı.')
    setBusiness(response)
    return true
  }, [fail])

  const loadFactories = useCallback(async () => {
    const response = await getFactoriesState()
    if (!response?.success) return fail(response, 'Fabrika verileri alınamadı.')
    setFactories(response)
    return true
  }, [fail])

  const loadMines = useCallback(async () => {
    const response = await getMinesState()
    if (!response?.success) return fail(response, 'Maden verileri alınamadı.')
    setMines(response)
    return true
  }, [fail])

  const loadMissions = useCallback(async () => {
    const response = await getMissionsState()
    if (!response?.success) return fail(response, 'Görev verileri alınamadı.')
    setMissions(response)
    return true
  }, [fail])

  const loadProfile = useCallback(async () => {
    const response = await getProfileState()
    if (!response?.success) return fail(response, 'Profil verileri alınamadı.')
    setProfile(response)
    const currentUserId = String(user?.id || '').trim()
    const avatarUrl = String(response?.profile?.avatar?.url || '').trim()
    if (currentUserId) {
      setChatUsers((prev) =>
        prev.map((entry) => (
          entry?.userId === currentUserId
            ? { ...entry, avatarUrl }
            : entry
        )),
      )
    }
    return true
  }, [fail, user?.id])

  const triggerLiveStateRefresh = useCallback(() => {
    const runRefresh = async () => {
      if (liveMessageRefreshInFlightRef.current) return
      liveMessageRefreshInFlightRef.current = true
      try {
        const tasks = [
          loadOverview(),
          loadProfile(),
          loadBank({ force: true }),
        ]
        if (tab === 'missions') {
          tasks.push(loadMissions())
        }
        await Promise.allSettled(tasks)
      } finally {
        liveMessageRefreshInFlightRef.current = false
      }
    }

    if (typeof window === 'undefined') {
      void runRefresh()
      return
    }

    clearTimeout(liveMessageRefreshTimerRef.current)
    liveMessageRefreshTimerRef.current = window.setTimeout(() => {
      void runRefresh()
    }, 160)
  }, [loadBank, loadMissions, loadOverview, loadProfile, tab])

  const loadDailyStoreState = useCallback(async () => {
    const response = await getDailyStore()
    if (!response?.success) return fail(response, '12 saatlik fırsatlar alınamadı.')
    setDailyStore({
      offers: Array.isArray(response.offers) ? response.offers : [],
      nextResetAt: String(response.nextResetAt || ''),
      remainingMs: Math.max(0, Math.trunc(num(response.remainingMs || 0))),
    })
    return true
  }, [fail])

  const loadDailyLoginRewardState = useCallback(async () => {
    const response = await getDailyLoginReward()
    if (!response?.success) return fail(response, 'Günlük ödül verileri alınamadı.')
    setDailyLoginReward(normalizeDailyLoginPayload(response))
    return true
  }, [fail])

  const loadOrderBook = useCallback(async (itemId) => {
    const safeItemId = String(itemId || bookItemId || '').trim()
    const response = await getOrderBookState(safeItemId)
    if (!response?.success) return fail(response, 'Emir defteri verileri alınamadı.')
    setOrderBook(response)
    return true
  }, [bookItemId, fail])

  const loadLogistics = useCallback(async () => {
    const response = await getLogisticsState()
    if (!response?.success) return fail(response, 'Lojistik verileri alınamadı.')
    setLogistics(response)
    return true
  }, [fail])

  const _loadLeague = useCallback(async () => {
    const response = await getLeagueState()
    if (!response?.success) return fail(response, 'Lig verileri alınamadı.')
    const standings = (response?.standings && typeof response.standings === 'object')
      ? response.standings
      : {}
    setLeague({
      ...response,
      daily: Array.isArray(response?.daily) ? response.daily : (Array.isArray(standings?.daily) ? standings.daily : []),
      weekly: Array.isArray(response?.weekly) ? response.weekly : (Array.isArray(standings?.weekly) ? standings.weekly : []),
      season: Array.isArray(response?.season) ? response.season : (Array.isArray(standings?.season) ? standings.season : []),
      cash: Array.isArray(response?.cash) ? response.cash : (Array.isArray(standings?.cash) ? standings.cash : []),
      level: Array.isArray(response?.level) ? response.level : (Array.isArray(standings?.level) ? standings.level : []),
    })
    return true
  }, [fail])

  useEffect(() => {
    if (tab !== 'profile' || profileTab !== 'leaderboard') return
    void _loadLeague()
  }, [tab, profileTab, _loadLeague])

  useEffect(() => {
    if (tab === 'profile') void _loadLeague().catch(() => {})
  }, [tab, _loadLeague])

  useEffect(() => {
    void _loadLeague().catch(() => {})
  }, [_loadLeague])

  const loadPush = useCallback(async () => {
    const response = await getPushCenterState()
    if (!response?.success) return fail(response, 'Bildirim merkezi verileri alınamadı.')
    setPushCenter(response)
    return true
  }, [fail])

  const loadMessageCenter = useCallback(async (filter) => {
    if (MESSAGES_DISABLED) {
      setMessageCenter({
        filter: 'all',
        counts: { all: 0, message: 0, trade: 0, other: 0, alert: 0 },
        unreadCount: 0,
        spotlight: null,
        items: [],
        moderation: EMPTY_USER_MODERATION,
      })
      return true
    }
    const targetFilter = String(filter || 'all').trim().toLowerCase() || 'all'
    const response = await getMessageCenterState(targetFilter, 25)
    if (!response?.success) return fail(response, 'Mesaj merkezi y\u00fcklenemedi.')
    setMessageCenter({
      filter: response.filter || targetFilter,
      counts: response.counts || { all: 0, message: 0, trade: 0, other: 0, alert: 0 },
      unreadCount: Number(response.unreadCount || 0),
      spotlight: response.spotlight || null,
      items: Array.isArray(response.items) ? response.items : [],
      moderation: normalizeUserModeration(response.moderation),
    })
    return true
  }, [fail])

  const loadDirectMessageThread = useCallback(async (username) => {
    if (MESSAGES_DISABLED) {
      setMessageThread([])
      return true
    }
    const safeUsername = String(username || '').trim()
    if (!safeUsername) {
      setMessageThread([])
      return true
    }
    const response = await getDirectMessageThread(safeUsername, 25)
    if (!response?.success) {
      fail(response, response?.errors?.global || 'Mesaj geçmişi yüklenemedi.')
      setMessageThread([])
      return false
    }
    setMessageThread(Array.isArray(response.items) ? response.items : [])
    const latestCounterpart = Array.isArray(response.items)
      ? [...response.items].reverse().find((entry) => entry?.counterpart) || null
      : null
    setMessageReplyTarget((prev) => {
      if (!prev) return prev
      if (String(prev.username || '').trim().toLowerCase() !== safeUsername.toLowerCase()) return prev
      const next = {
        ...prev,
        userId: response.userId || prev.userId || null,
        avatarUrl: String(latestCounterpart?.counterpart?.avatarUrl || prev.avatarUrl || '').trim(),
        level: latestCounterpart?.counterpart?.level ?? prev.level ?? null,
        role: latestCounterpart?.counterpart?.role || prev.role || 'player',
        roleLabel: latestCounterpart?.counterpart?.roleLabel || prev.roleLabel || '',
        premium: latestCounterpart?.counterpart?.premium ?? prev.premium ?? false,
        seasonBadge: latestCounterpart?.counterpart?.seasonBadge || prev.seasonBadge || null,
        relationship: response.relationship || prev.relationship || null,
        moderation: normalizeUserModeration(response.moderation),
      }
      messageReplyTargetRef.current = next
      return next
    })
    setMessageCenter((prev) => ({
      ...prev,
      moderation: normalizeUserModeration(response.moderation),
    }))
    return true
  }, [fail])

  const loadChatRoom = useCallback(async (room) => {
    if (MESSAGES_DISABLED) {
      const safeRoom = String(room || CHAT_ROOM || 'global').trim() || 'global'
      setChat((prev) => ({ ...prev, [safeRoom]: [] }))
      setChatRestrictions(EMPTY_CHAT_RESTRICTIONS)
      setChatClockMs(Date.now())
      return true
    }
    const response = await getChatRoomState(room, 25)
    if (!response?.success) return fail(response, 'Sohbet verileri alınamadı.')
    const safeRoom = response.room || String(room || 'global').trim() || 'global'
    setChat((prev) => ({ ...prev, [safeRoom]: pruneChatMessages(response.messages || []) }))
    applyChatRestrictions(response.chatState)
    return true
  }, [applyChatRestrictions, fail])

  const connectChatSocket = useCallback(() => {
    if (typeof window === 'undefined') return
    if (MESSAGES_DISABLED) {
      setChatSocketState('offline')
      return
    }
    if (chatSocketRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(chatSocketRef.current.readyState)) {
      return
    }

    clearTimeout(chatReconnectTimer.current)
    const wsUrl = getRealtimeChatUrl('global')
    if (!wsUrl) {
      setChatSocketState('offline')
      return
    }

    setChatSocketState('connecting')
    const socketProtocols = getRealtimeSocketProtocols()
    const socket = socketProtocols.length > 0
      ? new WebSocket(wsUrl, socketProtocols)
      : new WebSocket(wsUrl)
    chatSocketRef.current = socket

    socket.onopen = () => {
      if (chatSocketRef.current !== socket) {
        socket.close(1000, 'stale_socket')
        return
      }
      setChatSocketState('online')
      socket.send(JSON.stringify({ type: 'join', room: CHAT_ROOM }))
    }

    socket.onmessage = (event) => {
      if (chatSocketRef.current !== socket) return
      let payload
      try {
        payload = JSON.parse(String(event.data || '{}'))
      } catch {
        return
      }

      if (payload?.type === 'auth:force-logout') {
        handleForcedLogout(String(payload?.message || '').trim() || SESSION_REPLACED_NOTICE)
        return
      }

      if (payload?.type === 'chat:init') {
        const room = String(payload.room || 'global')
        const incomingMessages = pruneChatMessages(payload.messages || [])
        setChat((prev) => ({ ...prev, [room]: incomingMessages }))
        applyChatRestrictions(payload.chatState)
        if (chatInitReadyRef.current && activeTabRef.current !== 'chat') {
          const firstUnread = incomingMessages.find((entry) => entry && !entry.own)?.id || ''
          setChatFirstUnreadId(firstUnread)
        }
        chatInitReadyRef.current = true
        return
      }

      if (payload?.type === 'chat:message' && payload.message?.id) {
        const room = String(payload.room || payload.message.room || 'global')
        setChat((prev) => {
          const current = Array.isArray(prev[room]) ? prev[room] : []
          if (current.some((entry) => entry.id === payload.message.id)) return prev
          return { ...prev, [room]: pruneChatMessages([...current, payload.message]) }
        })
        if (activeTabRef.current !== 'chat' && !payload.message.own) {
          setChatFirstUnreadId((prev) => prev || payload.message.id)
        }
        return
      }

      if (payload?.type === 'chat:presence') {
        setChatUsers(Array.isArray(payload.users) ? payload.users : [])
        return
      }

      if (payload?.type === 'chat:error') {
        setError(errText(payload.errors, 'Sohbet hatası oluştu.'))
        applyChatRestrictions(payload.chatState)
        return
      }

      if (payload?.type === 'chat:state') {
        applyChatRestrictions(payload.chatState)
      }
    }

    socket.onclose = (event) => {
      if (chatSocketRef.current !== socket) return
      chatSocketRef.current = null
      setChatSocketState('offline')
      if (event?.code === WS_SESSION_REPLACED_CODE) {
        handleForcedLogout(SESSION_REPLACED_NOTICE)
        return
      }
      if (!chatReconnectEnabled.current) return
      chatReconnectTimer.current = window.setTimeout(() => {
        chatConnectRef.current()
      }, 1600)
    }

    socket.onerror = () => {
      if (chatSocketRef.current !== socket) return
      setChatSocketState('offline')
    }
  }, [applyChatRestrictions, handleForcedLogout])

  useEffect(() => {
    chatConnectRef.current = connectChatSocket
  }, [connectChatSocket])

  useEffect(() => {
    messageFilterRef.current = messageFilter
  }, [messageFilter])

  useEffect(() => {
    messageViewTabRef.current = messageViewTab
  }, [messageViewTab])

  const connectMessageSocket = useCallback(() => {
    if (typeof window === 'undefined') return
    if (MESSAGES_DISABLED) {
      setMessageSocketState('offline')
      return
    }
    if (
      messageSocketRef.current &&
      [WebSocket.OPEN, WebSocket.CONNECTING].includes(messageSocketRef.current.readyState)
    ) {
      return
    }

    clearTimeout(messageReconnectTimer.current)
    const wsUrl = getRealtimeMessagesUrl()
    if (!wsUrl) {
      setMessageSocketState('offline')
      return
    }

    setMessageSocketState('connecting')
    const socketProtocols = getRealtimeSocketProtocols()
    const socket = socketProtocols.length > 0
      ? new WebSocket(wsUrl, socketProtocols)
      : new WebSocket(wsUrl)
    messageSocketRef.current = socket

    socket.onopen = () => {
      if (messageSocketRef.current !== socket) {
        socket.close(1000, 'stale_socket')
        return
      }
      setMessageSocketState('online')
      socket.send(JSON.stringify({ type: 'messages:sync' }))
    }

    socket.onmessage = (event) => {
      if (messageSocketRef.current !== socket) return
      let payload
      try {
        payload = JSON.parse(String(event.data || '{}'))
      } catch {
        return
      }

      if (payload?.type === 'auth:force-logout') {
        handleForcedLogout(String(payload?.message || '').trim() || SESSION_REPLACED_NOTICE)
        return
      }

      if (payload?.type === 'messages:ready') {
        const refreshFilter = messageViewTabRef.current === 'bildirimler'
          ? 'all'
          : (messageFilterRef.current || 'all')
        void loadMessageCenter(refreshFilter)
        void triggerLiveStateRefresh()
        return
      }

      if (payload?.type === 'messages:refresh') {
        const refreshFilter = messageViewTabRef.current === 'bildirimler'
          ? 'all'
          : (messageFilterRef.current || 'all')
        void loadMessageCenter(refreshFilter)
        if (messageReplyTargetRef.current?.username) {
          void loadDirectMessageThread(messageReplyTargetRef.current.username)
        }
        void triggerLiveStateRefresh()
        return
      }

      if (payload?.type === 'messages:error') {
        setError(errText(payload.errors, 'Mesaj bağlantı hatası oluştu.'))
      }
    }

    socket.onclose = (event) => {
      if (messageSocketRef.current !== socket) return
      messageSocketRef.current = null
      setMessageSocketState('offline')
      if (event?.code === WS_SESSION_REPLACED_CODE) {
        handleForcedLogout(SESSION_REPLACED_NOTICE)
        return
      }
      if (!messageReconnectEnabled.current) return
      messageReconnectTimer.current = window.setTimeout(() => {
        messageConnectRef.current()
      }, 1600)
    }

    socket.onerror = () => {
      if (messageSocketRef.current !== socket) return
      setMessageSocketState('offline')
    }
  }, [handleForcedLogout, loadDirectMessageThread, loadMessageCenter, triggerLiveStateRefresh])

  useEffect(() => {
    messageConnectRef.current = connectMessageSocket
  }, [connectMessageSocket])

  const refreshAll = useCallback(async (options = {}) => {
    const force = Boolean(options?.force)
    await Promise.all([
      loadOverview(),
      loadMarket(),
      loadBusiness(),
      loadFactories(),
      loadMissions(),
      loadProfile(),
      loadDailyLoginRewardState(),
    ])

    const runSecondaryRefresh = () => {
      if (!force && !isPageVisible()) return
      void Promise.all([
        loadForex(),
        loadBank(),
        loadLogistics(),
        loadChatRoom('global'),
        loadMessageCenter('all'),
        loadDailyStoreState(),
      ]).catch((err) => {
        console.error('[HomePage] secondary refresh failed:', err)
      })
    }

    if (typeof window === 'undefined') {
      runSecondaryRefresh()
      return
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runSecondaryRefresh, { timeout: 3000 })
      return
    }

    window.setTimeout(runSecondaryRefresh, 240)
  }, [loadBank, loadBusiness, loadChatRoom, loadDailyLoginRewardState, loadDailyStoreState, loadFactories, loadForex, loadLogistics, loadMarket, loadMessageCenter, loadMissions, loadOverview, loadProfile])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setError('')
      try {
        await refreshAll({ force: true })
      } catch (err) {
        console.error('[HomePage] refreshAll failed:', err)
        setError(err?.message || 'Veriler yüklenirken hata oluştu.')
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [refreshAll])

  useEffect(() => {
    if (tab !== 'market') return undefined
    const intervalId = setInterval(() => {
      if (!isPageVisible()) return
      void loadMarket()
      if (marketTab === 'orderbook') {
        void loadOrderBook(bookItemId)
      }
    }, 8000)
    return () => clearInterval(intervalId)
  }, [bookItemId, loadMarket, loadOrderBook, marketTab, tab])

  useEffect(() => {
    if (tab !== 'marketplace') return undefined
    void loadMarket()
    const intervalId = setInterval(() => {
      if (!isPageVisible()) return
      void loadMarket()
    }, 18000)
    return () => clearInterval(intervalId)
  }, [loadMarket, tab])

  useEffect(() => {
    if (tab !== 'forex') return undefined
    void loadForex()
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadForex()
    }, FOREX_CLIENT_POLL_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [loadForex, tab])

  useEffect(() => {
    if (tab === 'forex') return
    clearTimeout(forexBoundaryRetryTimerRef.current)
  }, [tab])

  useEffect(() => {
    if (tab !== 'forex' || typeof window === 'undefined' || typeof document === 'undefined') return undefined

    const refreshForex = () => {
      void loadForex()
    }
    const onVisibilityChange = () => {
      if (document.hidden) return
      refreshForex()
    }

    window.addEventListener('focus', refreshForex)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('focus', refreshForex)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [loadForex, tab])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setForexViewportWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    chatReconnectEnabled.current = true
    const connectTimer = window.setTimeout(() => {
      chatConnectRef.current()
    }, 0)
    return () => {
      window.clearTimeout(connectTimer)
      clearTimeout(chatReconnectTimer.current)
      chatReconnectEnabled.current = false
      if (chatSocketRef.current) {
        chatSocketRef.current.close(1000, 'reconnect_cleanup')
        chatSocketRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    messageReconnectEnabled.current = true
    const connectTimer = window.setTimeout(() => {
      messageConnectRef.current()
    }, 0)
    return () => {
      window.clearTimeout(connectTimer)
      clearTimeout(messageReconnectTimer.current)
      messageReconnectEnabled.current = false
      if (messageSocketRef.current) {
        messageSocketRef.current.close(1000, 'reconnect_cleanup')
        messageSocketRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (tab !== 'chat') return undefined
    if (chatSocketRef.current?.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(JSON.stringify({ type: 'join', room: CHAT_ROOM }))
      return undefined
    }
    const loadTimer = window.setTimeout(() => {
      void loadChatRoom(CHAT_ROOM)
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadChatRoom, tab])

  useEffect(() => {
    if (tab !== 'chat') return
    if (!chatThreadRef.current) return
    const frame = window.requestAnimationFrame(() => {
      if (!chatThreadRef.current) return
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [chat, tab])

  useEffect(() => {
    if (tab !== 'chat' || !chatFirstUnreadId) return undefined
    const timer = window.setTimeout(() => {
      setChatFirstUnreadId('')
    }, 4200)
    return () => window.clearTimeout(timer)
  }, [chatFirstUnreadId, tab])

  useEffect(() => {
    const FAST_TABS = new Set(['chat', 'messages'])
    const MEDIUM_TABS = new Set(['missions', 'home', 'events', 'businesses', 'factories', 'mines'])
    const intervalMs = tab === 'bank' ? 9000 : FAST_TABS.has(tab) ? 1000 : MEDIUM_TABS.has(tab) ? 2500 : 5000
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      setChatClockMs(Date.now())
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [tab])

  useEffect(() => {
    if (tab !== 'messages') return undefined
    const loadTimer = window.setTimeout(() => {
      void loadMessageCenter(messageFilter)
    }, 0)
    return () => {
      window.clearTimeout(loadTimer)
    }
  }, [loadMessageCenter, messageFilter, tab])

  useEffect(() => {
    if (tab !== 'messages') return undefined
    const safeUsername = String(messageReplyTarget?.username || '').trim()
    if (!safeUsername) return undefined

    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      const activeUsername = String(messageReplyTargetRef.current?.username || '').trim()
      if (!activeUsername) return
      void loadDirectMessageThread(activeUsername)
    }, 6500)

    return () => window.clearInterval(intervalId)
  }, [loadDirectMessageThread, messageReplyTarget?.username, tab])

  const openTab = async (next, options = {}) => {
    if (next !== tab) {
      setBusinessModal('')
      setListingDraft(null)
      setMarketDetailDraft(null)
      setMarketPurchaseResult(null)
      setCollectTargetBusinessId('')
      setMarketplaceBuyModal(null)
      setMarketplaceBuyModalQty('1')
      setFactoryPurchaseModalId('')
      setProfileModalUserId(null)
      setProfileModalBusinessExpand(null)
      setGaragePanel((prev) => ({ ...prev, open: false }))
      setWarehouseOpen(false)
      setAvatarCropOpen(false)
      setMineConfirmModal(null)
      setMineDigModal(null)
      setDailyRewardOpen(false)
      setDailyRewardResult(null)
    }
    setTab(next)
    setError('')
    if (next !== tab || options.forceTop === true) {
      if (pageScrollRef.current?.scrollTo) {
        pageScrollRef.current.scrollTo({ top: 0, behavior: 'auto' })
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }
    if (options.marketTab) setMarketTab(options.marketTab)
    if (options.profileTab) setProfileTab(options.profileTab)
    if (options.messageFilter) setMessageFilter(options.messageFilter)

    if (next === 'businesses') {
      await Promise.all([loadBusiness(), loadLogistics(), loadMarket()])
    }
    if (next === 'private-listings') {
      await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile()])
    }
    if (next === 'marketplace') {
      await loadMarket()
    }
    if (next === 'forex') {
      await loadForex()
    }
    if (next === 'bank') {
      await Promise.all([loadOverview(), loadProfile(), loadBank({ force: true })])
    }
    if (next === 'factories') {
      await Promise.all([loadFactories(), loadProfile()])
    }
    if (next === 'mines') {
      await loadMines()
    }
    if (next === 'chat') {
      await loadChatRoom(CHAT_ROOM)
    }
    if (next === 'messages') {
      const targetFilter = options.messageFilter || messageFilter
      await loadMessageCenter(targetFilter)
    }
    if (next === 'home' && !missions) {
      await loadMissions()
    }
    if (next === 'missions') {
      await loadMissions()
    }
    if (next === 'events') {
      await Promise.all([loadOverview(), loadBusiness(), loadFactories()])
    }
    if (next === 'announcements') {
      await loadOverview()
    }
    if (next === 'profile') {
      await loadProfile()
      if (options.profileTab === 'leaderboard') _loadLeague().catch(() => {})
    }
  }

  useEffect(() => {
    openTabRef.current = openTab
  }, [openTab])

  useEffect(() => {
    if (pageScrollRef.current?.scrollTo) {
      const frameId = window.requestAnimationFrame(() => {
        pageScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
      })
      return () => window.cancelAnimationFrame(frameId)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
    return undefined
  }, [tab])

  useEffect(() => {
    if (tutorialActive || tutorialCompleted || !tutorialEnabled) return
    const { step } = getTutorialStepMetaByIndex(tutorialStepIndex)
    const target = step?.target
    if (!target?.tab || target.tab !== tab) return
    focusTutorialTarget(target)
  }, [
    focusTutorialTarget,
    getTutorialStepMetaByIndex,
    tab,
    tutorialActive,
    tutorialCompleted,
    tutorialEnabled,
    tutorialStepIndex,
  ])

  // Missions: countdown and batch refresh should feel live while this tab is open.
  useEffect(() => {
    if (tab !== 'missions') return undefined
    const refreshMs = 30000
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void loadMissions()
    }, refreshMs)
    return () => window.clearInterval(intervalId)
  }, [tab, loadMissions])

  useEffect(() => {
    if (tab !== 'bank') return undefined
    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void loadBank()
    }, 30000)
    return () => window.clearInterval(intervalId)
  }, [loadBank, tab])

  useEffect(() => {
    if (tab !== 'bank' || typeof document === 'undefined') return undefined
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void loadBank({ force: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [loadBank, tab])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const intervalId = window.setInterval(() => {
      if (!isPageVisible()) return
      void triggerLiveStateRefresh()
      if (tab === 'profile' && profileTab === 'leaderboard') {
        void _loadLeague()
      }
    }, 9000)
    return () => window.clearInterval(intervalId)
  }, [_loadLeague, profileTab, tab, triggerLiveStateRefresh])

  const openDiamondMarketHub = async () => {
    await openTab('profile', { profileTab: 'diamond-market' })
  }

  const openPremiumHub = async () => {
    await openTab('profile', { profileTab: 'premium' })
  }

  const openDiamondCashCheckout = async (pack) => {
    const safePackId = String(pack?.id || pack || '').trim()
    if (!safePackId) return

    if (IS_NATIVE_ANDROID_RUNTIME) {
      setNotice('Android sürümünde satın alma işlemleri Google Play Faturalandırma ile sunulacaktır.')
      return
    }

    const baseUrl = String(import.meta.env.VITE_DIAMOND_CHECKOUT_URL || '').trim()
    if (!baseUrl) {
      setNotice('Elmas Marketi hazır. Ödeme entegrasyonu tamamlandığında satın alma aktif olacaktır.')
      return
    }

    const isWelcomePack = Boolean(pack?.welcomeOnly) || safePackId === DIAMOND_WELCOME_PACK_ID
    if (isWelcomePack) {
      if (welcomePackPurchased) {
        setNotice('Hoş geldin paketi bu hesapta daha önce kullanıldı.')
        return
      }
      if (busy) return
      setBusy(`diamond-welcome:${safePackId}`)
      try {
        const response = await consumeDiamondWelcomePack(safePackId)
        if (!response?.success) {
          if (response?.reason === 'already_claimed') {
            setNotice('Hoş geldin paketi bu hesapta daha önce kullanıldı.')
            await loadOverview()
            return
          }
          fail(response, 'Hoş geldin paketi işlemi tamamlanamadı.')
          return
        }
        await loadOverview()
      } finally {
        setBusy('')
      }
    }

    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}pack=${encodeURIComponent(safePackId)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const doTrade = async (itemId, side) => {
    if (busy) return
    const quantity = Math.max(0, Math.trunc(num(qty[itemId] || 0)))
    if (quantity <= 0) return setError('Miktar en az 1 olmalı.')
    setBusy(`${side}:${itemId}`)
    setError('')
    const response = side === 'buy' ? await buyItem(itemId, quantity) : await sellItem(itemId, quantity)
    setBusy('')
    if (!response?.success) return fail(response, side === 'buy' ? 'Satın alma başarısız.' : 'Satış başarısız.')
    setNotice(response.message || 'Pazar işlemi tamamlandı.')
    await Promise.all([loadOverview(), loadMarket(), loadMissions(), loadProfile()])
    if (bookItemId) await loadOrderBook(bookItemId)
  }

  const upBiz = async (id) => {
    if (busy) return
    if (nextCompanyUnlock && Math.max(0, Math.trunc(num(nextCompanyUnlock?.missingCompanyLevel || 0))) <= 0) {
      setError(`Önce İş Kur bölümünden ${nextCompanyUnlock.name || 'sıradaki işletmeyi'} satın al.`)
      return
    }
    if (!companyUpgrade) {
      setError('İşletme seviyesi bilgisi alınamadı.')
      return
    }
    if (companyUpgrade.maxReached) {
      setError('İşletme seviyesi zaten maksimumda.')
      return
    }
    if (companyUpgrade.missingCash > 0) {
      setError(`İşletme seviyesi yükseltmek için ${fmt(companyUpgrade.cost || 0)} nakit gerekli. Kalan: ${fmt(companyUpgrade.missingCash)}.`)
      return
    }
    setBusy(`upbiz:${id}`)
    const response = await upgradeBusinessLevel(id)
    setBusy('')
    if (!response?.success) return fail(response, 'İşletme geliştirme işlemi tamamlanamadı.')
    setNotice(response.message || 'İşletme seviyesi yükseltildi.')
    await Promise.all([loadOverview(), loadBusiness(), loadProfile()])
  }

  const buyCompanyBusiness = async (unlockKey) => {
    if (busy) return
    const safeUnlockKey = String(unlockKey || '').trim()
    if (!safeUnlockKey) return
    setBusy(`buybiz:${safeUnlockKey}`)
    const response = await buyBusiness(safeUnlockKey)
    setBusy('')
    if (!response?.success) return fail(response, 'İşletme satın alma işlemi tamamlanamadı.')
    setNotice(response.message || 'İşletme satın alındı.')
    await Promise.all([loadOverview(), loadBusiness(), loadProfile()])
  }

  const buyFactoryAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-buy:${safeFactoryId}`)
    const response = await buyFactory(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Fabrika satın alma işlemi tamamlanamadı.')
    setNotice(response.message || 'Fabrika satın alındı.')
    setFactoryPurchaseModalId('')
    await Promise.all([loadOverview(), loadFactories(), loadProfile(), loadMarket()])
  }

  const collectFactoryAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-collect:${safeFactoryId}`)
    const response = await collectFactory(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Fabrika tahsilatı yapılamadı.')
    setNotice(response.message || 'Fabrika tahsilatı tamamlandı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview(), loadMarket()])
  }

  const collectFactoriesBulkAction = async () => {
    if (busy) return
    setBusy('factory-collect-bulk')
    const response = await collectFactoriesBulk()
    setBusy('')
    if (!response?.success) return fail(response, 'Fabrikalar için toplu tahsilat yapılamadı.')
    const collectedCount = Math.max(0, Math.trunc(num(response?.collected?.count || 0)))
    setNotice(response.message || `Fabrika toplu tahsilat tamamlandı (${fmt(collectedCount)}).`)
    await Promise.all([loadFactories(), loadProfile(), loadOverview(), loadMarket()])
  }

  const confirmFactoryBulkCollectFromModal = () => {
    setFactoryBulkModalOpen(false)
    void collectFactoriesBulkAction()
  }

  const confirmFactoryCollectFromModal = async () => {
    const id = String(factoryCollectModalId || '').trim()
    if (!id || busy) return
    setFactoryCollectModalId('')
    await collectFactoryAction(id)
  }

  const confirmFactoryUpgradeFromModal = async () => {
    const id = String(factoryUpgradeModalId || '').trim()
    if (!id || busy) return
    const factory = factoryRows.find((f) => String(f?.id || '') === id)
    if (!factory) return
    const blockedByOtherUpgrade = !factory.isUpgrading && !canStartAnotherFactoryUpgrade
    if (blockedByOtherUpgrade) {
      setError(
        maxFactorySlots <= 1
          ? 'Yükseltme yuvası dolu. Aktif inşaat/yükseltme tamamlanınca tekrar deneyin.'
          : `Yükseltme yuvaları dolu (${fmt(maxFactorySlots)} / ${fmt(maxFactorySlots)}).`,
      )
      return
    }
    if (!factory?.nextUpgrade?.canUpgradeNow || factory?.nextUpgrade?.maxReached) return
    setFactoryUpgradeModalId('')
    await upgradeFactoryAction(id)
  }

  const upgradeFactoryAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-upgrade:${safeFactoryId}`)
    const response = await upgradeFactory(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Fabrika yükseltmesi başlatılamadı.')
    setNotice(response.message || 'Fabrika yükseltmesi başlatıldı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview(), loadMarket()])
  }

  const speedupFactoryBuildAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-speedup-build:${safeFactoryId}`)
    const response = await speedupFactoryBuild(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'İnşaat hızlandırılamadı.')
    setNotice(response.message || 'Fabrika inşaatı hızlandırıldı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview()])
  }

  const speedupFactoryUpgradeAction = async (factoryId) => {
    if (busy) return
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setBusy(`factory-speedup:${safeFactoryId}`)
    const response = await speedupFactoryUpgrade(safeFactoryId)
    setBusy('')
    if (!response?.success) return fail(response, 'Yükseltme hızlandırılamadı.')
    setNotice(response.message || 'Yükseltme hızlandırıldı.')
    await Promise.all([loadFactories(), loadProfile(), loadOverview()])
  }

  const openFactoryPurchaseModal = (factoryId) => {
    const safeFactoryId = String(factoryId || '').trim()
    if (!safeFactoryId) return
    setFactoryPurchaseModalId(safeFactoryId)
  }

  const closeFactoryPurchaseModal = () => {
    setFactoryPurchaseModalId('')
  }

  useEffect(() => {
    if (!factoryPurchaseModalId) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (String(busy || '').startsWith('factory-buy:')) return
      setFactoryPurchaseModalId('')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, factoryPurchaseModalId])

  useEffect(() => {
    if (!factoryPurchaseModalId) return
    const raf = requestAnimationFrame(() => {
      factoryPurchaseOverlayRef.current?.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [factoryPurchaseModalId])

  const produceBizVehicle = async (id, modelId) => {
    if (busy) return
    setBusy(`prodbiz:${id}:${modelId || 'next'}`)
    const response = await produceBusinessVehicle(id, modelId ? { modelId } : {})
    setBusy('')
    if (!response?.success) return fail(response, 'Araç üretimi başarısız.')
    const producedName = String(response?.cost?.vehicleName || '').trim() || 'Araç'
    setNotice(`${producedName} başarıyla filoya eklendi.`)
    await Promise.all([loadOverview(), loadBusiness(), loadProfile(), loadMarket()])
  }

  const listBizVehicle = async (businessId, vehicleId, price = 0, visibility = 'public', recipientUserId = '') => {
    if (busy) return
    setBusy(`listbiz:${businessId}:${vehicleId}`)
    const safePrice = Math.max(0, Math.trunc(num(price)))
    const safeVisibility = visibility === 'custom' ? 'custom' : 'public'
    const safeRecipientUserId = safeVisibility === 'custom' ? String(recipientUserId || '').trim() : ''
    const payload = safePrice > 0
      ? { vehicleId, price: safePrice, visibility: safeVisibility, recipientUserId: safeRecipientUserId }
      : { vehicleId, visibility: safeVisibility, recipientUserId: safeRecipientUserId }
    const response = await listBusinessVehicle(businessId, payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Araç ilana eklenemedi.')
    setNotice(response.message || 'Araç ikinci el pazarına eklendi.')
    await Promise.all([loadBusiness(), loadOverview(), loadProfile()])
  }

  const listLogisticsTruckAction = async (truckId, price = 0, visibility = 'public', recipientUserId = '') => {
    if (busy) return
    const safeTruckId = String(truckId || '').trim()
    if (!safeTruckId) return
    setBusy(`listlog:${safeTruckId}`)
    const safePrice = Math.max(0, Math.trunc(num(price)))
    const safeVisibility = visibility === 'custom' ? 'custom' : 'public'
    const safeRecipientUserId = safeVisibility === 'custom' ? String(recipientUserId || '').trim() : ''
    const payload = safePrice > 0
      ? { price: safePrice, visibility: safeVisibility, recipientUserId: safeRecipientUserId }
      : { visibility: safeVisibility, recipientUserId: safeRecipientUserId }
    const response = await listLogisticsTruckForSale(safeTruckId, payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Tır ilana eklenemedi.')
    setNotice(response.message || 'Tır ikinci el pazarına eklendi.')
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile()])
  }

  const openVehicleListingModal = (businessId, vehicle) => {
    if (!vehicle || !businessId) return
    const templateId = String(selectedBusiness?.templateId || '').trim()
    const bounds = fleetListingBounds(vehicle, templateId)
    const scrapPreview = scrapPreviewForEntry(vehicle)
    const lifetime = resolveVehicleLifetime(vehicle, liveNowMs)
    const safeModelId = String(vehicle?.modelId || '').trim()
    const safeName = String(vehicle?.name || '').trim().toLocaleLowerCase('tr-TR')
    const marketPrices = (selectedBusinessListings || [])
      .filter((entry) => {
        const entryModelId = String(entry?.modelId || '').trim()
        const entryName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
        if (safeModelId && entryModelId) return entryModelId === safeModelId
        return safeName && entryName === safeName
      })
      .map((entry) => Math.max(1, Math.trunc(num(entry?.price || 0))))
      .filter((price) => price > 0)
      .sort((a, b) => a - b)
    const marketCount = marketPrices.length
    const marketMinPrice = marketCount ? marketPrices[0] : 0
    const marketMaxPrice = marketCount ? marketPrices[marketCount - 1] : 0
    const marketAvgPrice = marketCount
      ? Math.round(marketPrices.reduce((sum, price) => sum + price, 0) / marketCount)
      : 0
    setListingDraft({
      kind: 'fleet',
      isListed: false,
      listingId: '',
      businessId: String(businessId || '').trim(),
      vehicleId: String(vehicle.id || '').trim(),
      name: String(vehicle.name || 'Araç').trim() || 'Araç',
      image: resolveVehicleImage(vehicle, templateId),
      emoji: String(vehicle.emoji || '').trim(),
      templateId,
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      suggestedPrice: bounds.suggestedPrice,
      price: String(bounds.suggestedPrice),
      income: Math.max(1, Math.trunc(num(vehicle.rentPerHour || 0))),
      xp: Math.max(1, Math.trunc(num(vehicle.xp || 0))),
      level: Math.max(1, Math.trunc(num(vehicle.requiredLevel || 1))),
      requiredLevel: Math.max(1, Math.trunc(num(vehicle.requiredLevel || 1))),
      engineKits: Math.max(0, Math.trunc(num(vehicle?.cost?.engineKits || vehicle?.engineKits || 0))),
      spareParts: Math.max(0, Math.trunc(num(vehicle?.cost?.spareParts || vehicle?.spareParts || 0))),
      scrapEngineKits: scrapPreview.engineKits,
      scrapSpareParts: scrapPreview.spareParts,
      marketCount,
      marketMinPrice,
      marketAvgPrice,
      marketMaxPrice,
      lifetimeRemainingMs: lifetime.remainingMs,
      lifetimeLabel: formatLifetimeWithTotal(lifetime),
      expiresAt: lifetime.expiresAt,
      visibility: 'public',
      recipientUserId: '',
    })
    setBusinessModal('vehicle-actions')
  }

  const openTruckListingModal = (truck) => {
    if (!truck) return
    const safeTruckId = String(truck.id || '').trim()
    if (!safeTruckId) return
    const bounds = logisticsListingBounds(truck)
    const scrapPreview = scrapPreviewForEntry(truck)
    const lifetime = resolveVehicleLifetime(truck, liveNowMs)
    const safeModelId = String(truck?.modelId || '').trim()
    const safeName = String(truck?.name || '').trim().toLocaleLowerCase('tr-TR')
    const marketPrices = (logisticsMarketListings || [])
      .filter((entry) => {
        const entryModelId = String(entry?.modelId || '').trim()
        const entryName = String(entry?.name || '').trim().toLocaleLowerCase('tr-TR')
        if (safeModelId && entryModelId) return entryModelId === safeModelId
        return safeName && entryName === safeName
      })
      .map((entry) => Math.max(1, Math.trunc(num(entry?.price || 0))))
      .filter((price) => price > 0)
      .sort((a, b) => a - b)
    const marketCount = marketPrices.length
    const marketMinPrice = marketCount ? marketPrices[0] : 0
    const marketMaxPrice = marketCount ? marketPrices[marketCount - 1] : 0
    const marketAvgPrice = marketCount
      ? Math.round(marketPrices.reduce((sum, price) => sum + price, 0) / marketCount)
      : 0
    setListingDraft({
      kind: 'logistics',
      isListed: false,
      listingId: '',
      truckId: safeTruckId,
      name: String(truck.name || 'Tır').trim() || 'Tır',
      image: resolveVehicleImage(truck, 'logistics'),
      emoji: String(truck.emoji || '').trim(),
      templateId: 'logistics',
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      suggestedPrice: bounds.suggestedPrice,
      price: String(bounds.suggestedPrice),
      income: Math.max(1, Math.trunc(num(truck.incomePerRun || 0))),
      xp: Math.max(1, Math.trunc(num(truck.xpPerRun || 0))),
      level: Math.max(1, Math.trunc(num(truck.levelRequired || 1))),
      levelRequired: Math.max(1, Math.trunc(num(truck.levelRequired || 1))),
      capacity: Math.max(1, Math.trunc(num(truck.capacity || 1))),
      upkeep: Math.max(1, Math.trunc(num(truck.upkeepPerRun || 1))),
      engineKits: Math.max(0, Math.trunc(num(truck?.engineKits || 0))),
      spareParts: Math.max(0, Math.trunc(num(truck?.spareParts || 0))),
      scrapEngineKits: scrapPreview.engineKits,
      scrapSpareParts: scrapPreview.spareParts,
      marketCount,
      marketMinPrice,
      marketAvgPrice,
      marketMaxPrice,
      lifetimeRemainingMs: lifetime.remainingMs,
      lifetimeLabel: formatLifetimeWithTotal(lifetime),
      expiresAt: lifetime.expiresAt,
      visibility: 'public',
      recipientUserId: '',
    })
    setBusinessModal('vehicle-actions')
  }

  const openActiveListingModal = (listing, templateIdHint = '') => {
    if (!listing) return
    const safeTemplateId = String(listing?.templateId || templateIdHint || selectedBusiness?.templateId || '').trim()
    const templateId = safeTemplateId || 'auto-rental'
    const isLogistics = templateId === 'logistics'
    const listingId = String(listing?.listingId || listing?.id || '').trim()
    if (!listingId) {
      setError('İlan kaydı bulunamadı.')
      return
    }
    const requiredLevel = Math.max(
      1,
      Math.trunc(
        num(
          listing?.requiredLevel ||
          listing?.marketLevel ||
          listing?.levelRequired ||
          1,
        ),
      ),
    )
    const hourlyIncome = Math.max(
      1,
      Math.trunc(
        num(
          listing?.rentPerHour ||
          listing?.marketIncome ||
          listing?.incomePerRun ||
          listing?.income ||
          0,
        ),
      ),
    )
    const xpGain = Math.max(
      1,
      Math.trunc(
        num(
          listing?.xp ||
          listing?.xpPerRun ||
          0,
        ),
      ),
    )
    const listingPrice = Math.max(1, Math.trunc(num(listing?.price || listing?.marketPrice || 0)))
    const commissionRate = Math.max(0, num(listing?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE))
    const commissionAmount = Math.max(
      0,
      Math.trunc(
        num(
          listing?.commissionAmount ||
          Math.floor(listingPrice * commissionRate),
        ),
      ),
    )
    const sellerPayout = Math.max(
      0,
      Math.trunc(
        num(
          listing?.sellerPayout ||
          (listingPrice - commissionAmount),
        ),
      ),
    )
    const lifetime = resolveVehicleLifetime(listing, liveNowMs)
    const scrapPreview = scrapPreviewForEntry(listing)

    setListingDraft({
      kind: isLogistics ? 'logistics' : 'fleet',
      isListed: true,
      listingId,
      businessId: isLogistics
        ? ''
        : String(selectedBusiness?.id || listing?.businessId || '').trim(),
      vehicleId: String(listing?.vehicleId || listing?.id || '').trim(),
      truckId: isLogistics
        ? String(listing?.truckId || listing?.vehicleId || listing?.id || '').trim()
        : '',
      name: String(listing?.name || (isLogistics ? 'Tır' : 'Araç')).trim() || (isLogistics ? 'Tır' : 'Araç'),
      image: resolveVehicleImage(listing, templateId),
      emoji: String(listing?.emoji || '').trim(),
      templateId,
      minPrice: Math.max(1, Math.trunc(num(listing?.minPrice || 1))),
      maxPrice: Math.max(2, Math.trunc(num(listing?.maxPrice || 2))),
      suggestedPrice: listingPrice,
      price: String(listingPrice),
      listingPrice,
      listedAt: String(listing?.listedAt || '').trim(),
      income: hourlyIncome,
      xp: xpGain,
      level: requiredLevel,
      requiredLevel,
      levelRequired: requiredLevel,
      engineKits: Math.max(0, Math.trunc(num(listing?.cost?.engineKits || listing?.engineKits || 0))),
      spareParts: Math.max(0, Math.trunc(num(listing?.cost?.spareParts || listing?.spareParts || 0))),
      scrapEngineKits: scrapPreview.engineKits,
      scrapSpareParts: scrapPreview.spareParts,
      marketCount: Math.max(0, Math.trunc(num(listing?.marketCount || 0))),
      marketMinPrice: Math.max(0, Math.trunc(num(listing?.marketMinPrice || 0))),
      marketAvgPrice: Math.max(0, Math.trunc(num(listing?.marketAvgPrice || 0))),
      marketMaxPrice: Math.max(0, Math.trunc(num(listing?.marketMaxPrice || 0))),
      commissionRate,
      commissionAmount,
      sellerPayout,
      capacity: Math.max(1, Math.trunc(num(listing?.capacity || 1))),
      upkeep: Math.max(1, Math.trunc(num(listing?.upkeep || listing?.upkeepPerRun || 1))),
      lifetimeRemainingMs: lifetime.remainingMs,
      lifetimeLabel: formatLifetimeWithTotal(lifetime),
      expiresAt: lifetime.expiresAt,
    })
    setBusinessModal('vehicle-actions')
  }

  const openListingPriceModal = async () => {
    if (!listingDraft) return
    setListingDraft((prev) => (prev ? { ...prev, price: '' } : prev))
    setBusinessModal('list-sale')

    if (listingFriendsLoading) return
    if (Array.isArray(listingFriends) && listingFriends.length > 0) return

    setListingFriendsLoading(true)
    try {
      const response = await getFriendsState()
      if (!response?.success) {
        const globalError = response?.errors?.global || response?.reason || 'Arkadaş listesi yüklenemedi.'
        setError(globalError)
        setListingFriends([])
        return
      }
      setListingFriends(Array.isArray(response?.friends) ? response.friends : [])
    } finally {
      setListingFriendsLoading(false)
    }
  }

  const openScrapConfirmModal = () => {
    if (!listingDraft) return
    setBusinessModal('scrap-confirm')
  }

  const closeListingModal = () => {
    setBusinessModal('')
    setListingDraft(null)
  }

  const cancelListingFromModal = async () => {
    if (busy || !listingDraft?.isListed) return
    const safeListingId = String(listingDraft?.listingId || '').trim()
    if (!safeListingId) {
      setError('İlan kaydı bulunamadı.')
      return
    }
    closeListingModal()
    await cancelVehicleListingAction(safeListingId)
  }

  const confirmListingModal = async () => {
    if (busy || !listingDraft) return
    const minPrice = Math.max(1, Math.trunc(num(listingDraft.minPrice || 1)))
    const maxPrice = Math.max(minPrice + 1, Math.trunc(num(listingDraft.maxPrice || minPrice + 1)))
    const rawPrice = Math.max(0, Math.trunc(num(String(listingDraft.price || '').replace(/[^\d]/g, ''))))
    if (rawPrice <= 0) {
      setError('Satış fiyatı girmelisiniz.')
      return
    }
    if (rawPrice < minPrice || rawPrice > maxPrice) {
      setError(`Satış fiyatı ${fmt(minPrice)} ile ${fmt(maxPrice)} arasında olmalı.`)
      return
    }
    const currentDraft = { ...listingDraft }
    closeListingModal()

    const visibility = currentDraft?.visibility === 'custom' ? 'custom' : 'public'
    const recipientUserId = visibility === 'custom' ? String(currentDraft?.recipientUserId || '').trim() : ''
    if (visibility === 'custom' && !recipientUserId) {
      setError('Özel ilan için satılacak kişi seçmelisin.')
      return
    }

    if (currentDraft.kind === 'logistics') {
      await listLogisticsTruckAction(currentDraft.truckId, rawPrice, visibility, recipientUserId)
      return
    }
    await listBizVehicle(currentDraft.businessId, currentDraft.vehicleId, rawPrice, visibility, recipientUserId)
  }

  const scrapBizVehicleAction = async (businessId, vehicleId) => {
    if (busy) return
    const safeBusinessId = String(businessId || '').trim()
    const safeVehicleId = String(vehicleId || '').trim()
    if (!safeBusinessId || !safeVehicleId) return
    setBusy(`scrapbiz:${safeBusinessId}:${safeVehicleId}`)
    const response = await scrapBusinessVehicle(safeBusinessId, { vehicleId: safeVehicleId })
    setBusy('')
    if (!response?.success) return fail(response, 'Araç parçalanamadı.')
    setNotice(`${response.message || 'Araç parçalandı.'} ${formatScrapNotice(response?.scrapReturn)}`)
    await Promise.all([loadBusiness(), loadOverview(), loadProfile(), loadMarket()])
  }

  const scrapLogisticsTruckAction = async (truckId) => {
    if (busy) return
    const safeTruckId = String(truckId || '').trim()
    if (!safeTruckId) return
    setBusy(`scraplog:${safeTruckId}`)
    const response = await scrapLogisticsTruck(safeTruckId)
    setBusy('')
    if (!response?.success) return fail(response, 'Tır parçalanamadı.')
    setNotice(`${response.message || 'Tır parçalandı.'} ${formatScrapNotice(response?.scrapReturn)}`)
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const confirmScrapFromListingModal = async () => {
    if (busy || !listingDraft) return
    const currentDraft = { ...listingDraft }
    closeListingModal()
    if (currentDraft.kind === 'logistics') {
      await scrapLogisticsTruckAction(currentDraft.truckId)
      return
    }
    await scrapBizVehicleAction(currentDraft.businessId, currentDraft.vehicleId)
  }

  const marketAssetLabel = (templateId) => {
    const safeTemplateId = String(templateId || '').trim()
    if (safeTemplateId === 'moto-rental') {
      return {
        singular: 'Motor',
        buyAction: 'Motoru Satın Al',
        successText: 'Motor başarıyla satın alındı.',
        ownedTabLabel: 'Motorlarım',
      }
    }
    if (safeTemplateId === 'logistics') {
      return {
        singular: 'Tır',
        buyAction: 'Tırı Satın Al',
        successText: 'Tır başarıyla satın alındı.',
        ownedTabLabel: 'Tırlarım',
      }
    }
    if (safeTemplateId === 'property-rental') {
      return {
        singular: 'Mülk',
        buyAction: 'Mülkü Satın Al',
        successText: 'Mülk başarıyla satın alındı.',
        ownedTabLabel: 'Mülklerim',
      }
    }
    return {
      singular: 'Araç',
      buyAction: 'Aracı Satın Al',
      successText: 'Araç başarıyla satın alındı.',
      ownedTabLabel: 'Arabalarım',
    }
  }

  const resetMarketFilters = () => {
    setMarketFilterForm({
      model: 'all',
      minPrice: '',
      maxPrice: '',
      minLevel: '',
      maxLevel: '',
    })
  }

  const openMarketListingDetail = (listing) => {
    try {
      if (!listing) return false
      // Overlay click ile hemen kapanmayı engellemek için zamanı erken kaydedelim.
      marketDetailJustOpenedAtRef.current = Date.now()
      const safeListingId = String(listing?.id || listing?.listingId || '').trim()
      if (!safeListingId) return false
      const safeTemplateId = String(listing?.templateId || selectedBusiness?.templateId || '').trim() || 'moto-rental'
      const safePrice = Math.max(1, Math.trunc(num(listing?.marketPrice || listing?.price || 0)))
      const safeIncome = Math.max(1, Math.trunc(num(listing?.marketIncome || listing?.rentPerHour || 0)))
      const safeXp = Math.max(1, Math.trunc(num(listing?.xp || 0)))
      const safeRequiredLevel = Math.max(
        1,
        Math.trunc(
          num(listing?.marketLevel || listing?.requiredLevel || listing?.levelRequired || 1),
        ),
      )
      const commission = listingCommissionPreview(
        safePrice,
        num(listing?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE),
      )
      setMarketDetailDraft({
        ...listing,
        id: safeListingId,
        templateId: safeTemplateId,
        marketPrice: safePrice,
        marketIncome: safeIncome,
        xp: safeXp,
        marketLevel: safeRequiredLevel,
        requiredLevel: safeRequiredLevel,
        commissionRate: commission.rate,
        commissionAmount: commission.amount,
        totalCost: commission.totalCost,
        sellerPayout: commission.sellerPayout,
        image: resolveVehicleImage(listing, safeTemplateId),
        sellerName: String(listing?.sellerName || 'Oyuncu').trim() || 'Oyuncu',
        listingOpenedAt: new Date().toISOString(),
      })
      setMarketPurchaseResult(null)
      setBusinessModal('market-detail')
      return true
    } catch (e) {
      console.error('[private_listing_detail_open_failed]', e)
      setError('Özel ilan detayı açılamadı. Tekrar dene.')
      return false
    }
  }

  const tapPrivateListing = (listing) => {
    const safeListingId = String(listing?.id || listing?.listingId || '').trim()
    if (!safeListingId) {
      setError('Özel ilan detayı için ilan bulunamadı.')
      return false
    }
    // Aynı modal zaten açıkken tekrar açmaya çalışma (mobilde click/tap çift tetiklenebiliyor).
    const currentId = String(marketDetailDraft?.id || marketDetailDraft?.listingId || '').trim()
    if (businessModal === 'market-detail' && currentId && currentId === safeListingId) return false
    const ok = openMarketListingDetail(listing)
    if (!ok) setError('Özel ilan detayı açılamadı. Tekrar dene.')
    return ok
  }

  const closeMarketListingDetail = () => {
    const dt = Date.now() - (marketDetailJustOpenedAtRef.current || 0)
    // Mobilde aynı dokunuş hem kartı hem de overlay click'i tetikleyebiliyor;
    // kısa süre içinde gelen close isteklerini tamamen yutalım.
    if (dt < 1500) return
    if (businessModal === 'market-detail') setBusinessModal('')
    setMarketDetailDraft(null)
  }

  const closeMarketPurchaseResult = () => {
    if (businessModal === 'market-buy-success') setBusinessModal('')
    setMarketPurchaseResult(null)
  }

  const goToOwnedFleetFromPurchase = () => {
    const templateId = String(marketPurchaseResult?.templateId || marketDetailDraft?.templateId || '').trim()
    closeMarketPurchaseResult()
    closeMarketListingDetail()
    if (templateId === 'logistics') {
      setBusinessScene('logistics')
      setLogisticsScene('detail')
      setLogisticsDetailTab('garage')
      return
    }
    setBusinessScene('detail')
    setBusinessDetailTab('garage')
  }

  const goToMyListingsFromPurchase = () => {
    const templateId = String(marketPurchaseResult?.templateId || marketDetailDraft?.templateId || '').trim()
    closeMarketPurchaseResult()
    closeMarketListingDetail()
    if (templateId === 'logistics') {
      setBusinessScene('logistics')
      setLogisticsScene('detail')
      setLogisticsDetailTab('market')
      return
    }
    setBusinessScene('detail')
    setBusinessDetailTab('market')
  }

  const buyVehicleFromMarket = async (listingId, listingPreview = null) => {
    const safeListingId = String(listingId || '').trim()
    if (!safeListingId || busy) return
    const preview = listingPreview || marketDetailDraft
    setBusy(`buy-listing:${safeListingId}`)
    const response = await buyBusinessVehicleListing(safeListingId)
    setBusy('')
    if (!response?.success) return fail(response, 'İkinci el araç satın alınamadı.')
    setNotice(response.message || 'Araç ikinci el pazardan satın alındı.')
    const purchase = response?.purchase || {}
    setMarketPurchaseResult(preview
      ? {
          id: safeListingId,
          name: String(preview?.name || 'Araç').trim() || 'Araç',
          templateId: String(preview?.templateId || '').trim() || 'moto-rental',
          marketPrice: Math.max(1, Math.trunc(num(purchase?.listingPrice || preview?.marketPrice || preview?.price || 0))),
          commissionRate: Math.max(0, num(purchase?.commissionRate || preview?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
          commissionAmount: Math.max(0, Math.trunc(num(purchase?.commissionAmount || preview?.commissionAmount || 0))),
          totalCost: Math.max(
            1,
            Math.trunc(
              num(
                purchase?.totalCost ||
                preview?.totalCost ||
                Math.max(1, Math.trunc(num(purchase?.listingPrice || preview?.marketPrice || preview?.price || 0))),
              ),
            ),
          ),
          sellerPayout: Math.max(
            0,
            Math.trunc(
              num(
                purchase?.sellerPayout ||
                preview?.sellerPayout ||
                (
                  Math.max(1, Math.trunc(num(purchase?.listingPrice || preview?.marketPrice || preview?.price || 0))) -
                  Math.max(0, Math.trunc(num(purchase?.commissionAmount || preview?.commissionAmount || 0)))
                ),
              ),
            ),
          ),
          image: resolveVehicleImage(preview, preview?.templateId),
        }
      : null)
    setMarketDetailDraft(null)
    setBusinessModal('market-buy-success')
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const cancelVehicleListingAction = async (listingId) => {
    const safeListingId = String(listingId || '').trim()
    if (!safeListingId || busy) return
    setBusy(`cancel-listing:${safeListingId}`)
    const response = await cancelBusinessVehicleListing(safeListingId)
    setBusy('')
    if (!response?.success) return fail(response, 'İlan iptal edilemedi.')
    setNotice(response.message || 'İlan iptal edildi ve araç filoya geri eklendi.')
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const _scrapVehicleListingAction = async (listingId) => {
    const safeListingId = String(listingId || '').trim()
    if (!safeListingId || busy) return
    setBusy(`scrap-listing:${safeListingId}`)
    const response = await scrapBusinessVehicleListing(safeListingId)
    setBusy('')
    if (!response?.success) return fail(response, 'İlan parçalanamadı.')
    setNotice(`${response.message || 'İlan parçalandı.'} ${formatScrapNotice(response?.scrapReturn)}`)
    await Promise.all([loadBusiness(), loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const burst = (event) => {
    const bid = `burst_${burstCounter.current}`
    burstCounter.current += 1
    const vectors = [[-92, -126], [-66, -158], [-34, -140], [-10, -168], [10, -146], [36, -160], [62, -132], [86, -154], [-48, -118], [48, -118]]
    const particles = vectors.map((vector, i) => ({ id: `${bid}_${i}`, dx: vector[0], dy: vector[1] }))
    setBursts((prev) => [...prev, { id: bid, x: event.clientX, y: event.clientY, particles }])
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== bid)), 900)
  }

  const collectBiz = async (id, event) => {
    if (busy) return
    if (event?.clientX && event?.clientY) {
      burst(event)
    }
    setBusy(`collect:${id}`)
    const response = await collectBusinessIncome(id)
    setBusy('')
    if (!response?.success) return fail(response, 'Toplama başarısız.')
    const collectedCash = fmt(response?.collected?.cash || 0)
    const collectedXp = fmt(response?.collected?.xpGain || 0)
    const taxAmount = Math.max(0, Math.trunc(num(response?.collected?.taxAmount || 0)))
    const fuelConsumed = Math.max(0, Math.trunc(num(response?.collected?.fuelConsumed || 0)))
    const fuelName = String(response?.collected?.fuelItemName || 'Yakıt').trim() || 'Yakıt'
    const appliedMultiplier = Math.max(
      1,
      Math.trunc(num(response?.collected?.multiplier || (premiumBoostActive ? premiumMultiplier : 1))),
    )
    const breakdown = [
      `+${collectedCash} nakit`,
      `+${collectedXp} XP`,
      `-${fmt(fuelConsumed)} ${fuelName}`,
      `-${fmt(taxAmount)} vergi`,
    ]
    setNotice(`${appliedMultiplier > 1 ? '2x tahsilat tamamlandı' : 'Tahsilat tamamlandı'}: ${breakdown.join(' | ')}.`)
    await Promise.all([loadOverview(), loadBusiness(), loadMissions(), loadProfile(), loadMarket()])
  }

  const openCollectPreview = (businessId) => {
    const safeBusinessId = String(businessId || selectedBusiness?.id || '').trim()
    if (!safeBusinessId) {
      setError('Tahsilat yapılacak işletme bulunamadı.')
      return
    }
    const targetBusiness = unlockedBusinesses.find((entry) => String(entry?.id || '').trim() === safeBusinessId)
    if (!targetBusiness) {
      setError('Tahsilat yapılacak işletme bulunamadı.')
      return
    }
    if (Math.max(0, Math.trunc(num(targetBusiness.fleetCount))) <= 0) {
      const unitLabel = targetBusiness.templateId === 'moto-rental'
        ? 'motosiklet'
        : targetBusiness.templateId === 'auto-rental'
          ? 'araç'
          : targetBusiness.templateId === 'property-rental'
            ? 'mülk'
            : 'tır'
      setError(`Tahsilat yapabilmek için önce en az bir ${unitLabel} edinmelisin.`)
      return
    }
    const collectRemainingMs = remainingMsFromIso(targetBusiness.nextCollectAt || '', liveNowMs)
    if (collectRemainingMs > 0) {
      setError(`Tahsilat henüz hazır değil. Kalan süre: ${formatCollectionCountdown(collectRemainingMs)}`)
      return
    }
    const preview = fleetCollectPreview(targetBusiness, inventoryById, { weeklyEvents: weeklyEventsRuntimeState })
    if (Math.max(0, Math.trunc(num(preview.fuelNeeded))) > Math.max(0, Math.trunc(num(preview.fuelAvailable)))) {
      const fuelName = String(preview.fuelItemName || 'Yakıt').trim() || 'Yakıt'
      setError(`${fuelName} yetersiz. Gerekli: ${fmt(preview.fuelNeeded)}, Depodaki: ${fmt(preview.fuelAvailable)}.`)
      return
    }
    setCollectTargetBusinessId(safeBusinessId)
    setBusinessModal('collect')
  }

  const confirmCollectFromModal = async () => {
    if (busy) return
    const safeBusinessId = String(collectTargetBusinessId || '').trim()
    if (!safeBusinessId) return
    setBusinessModal('')
    setCollectTargetBusinessId('')
    await collectBiz(safeBusinessId)
  }

  const openLogisticsCollectPreview = () => {
    const truckCount = Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0)))
    if (truckCount <= 0) {
      setError('Tahsilat yapabilmek için önce en az bir tır edinmelisin.')
      return
    }
    const collectRemainingMs = remainingMsFromIso(logistics?.collectPreview?.nextCollectAt || '', liveNowMs)
    if (collectRemainingMs > 0) {
      setError(`Tahsilat henüz hazır değil. Kalan süre: ${formatCollectionCountdown(collectRemainingMs)}`)
      return
    }
    const fuelItemId = String(logistics?.collectPreview?.fuelItemId || 'oil')
    const fuelNeeded = Math.max(0, Math.trunc(num(logistics?.collectPreview?.fuelNeeded || 0)))
    const fuelAvailable = Math.max(0, Math.trunc(num(inventoryById[fuelItemId] || 0)))
    if (fuelNeeded > fuelAvailable) {
      setError(`Petrol yetersiz. Gerekli: ${fmt(fuelNeeded)}, Depodaki: ${fmt(fuelAvailable)}.`)
      return
    }
    setBusinessModal('logistics-collect')
  }

  const confirmLogisticsCollectFromModal = async () => {
    if (busy) return
    setBusinessModal('')
    await collectLogisticsAction()
  }

  const openBusinessHub = () => {
    setBusinessScene('hub')
    setBusinessDetailTab('garage')
    setLogisticsScene('detail')
    setCollectTargetBusinessId('')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openBusinessDetail = (businessId) => {
    const targetBusiness = (business?.businesses || []).find((entry) => entry.id === businessId)
    if (!targetBusiness) {
      setError('İşletme bulunamadı.')
      return
    }
    if (targetBusiness.unlocked === false) {
      setError('Bu işletme kilitli. İşletmeni geliştirerek önce işletmeyi açmalısın.')
      return
    }
    setSelectedBusinessId(businessId)
    setBusinessScene('detail')
    setBusinessDetailTab('garage')
    setCollectTargetBusinessId('')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openBusinessGallery = () => {
    setBusinessScene('gallery')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openBusinessMarket = () => {
    setBusinessScene('market')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openFleetHelp = () => {
    setBusinessModal('fleet-help')
  }

  const openLogisticsCenter = async () => {
    if (!(business?.companyUnlock?.logisticsUnlocked === true || logistics?.unlocked === true)) {
      setError('Tır Kiralama kilitli. İşletmeni geliştirerek önce bu alanı açmalısın.')
      return
    }
    await Promise.all([loadLogistics(), loadMarket()])
    setBusinessScene('logistics')
    setLogisticsScene('detail')
    setLogisticsDetailTab('garage')
    setCollectTargetBusinessId('')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openLogisticsDetail = () => {
    setLogisticsScene('detail')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openLogisticsMarket = () => {
    setLogisticsScene('market')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const openLogisticsGallery = () => {
    setLogisticsScene('gallery')
    setBusinessModal('')
    setListingDraft(null)
    setMarketDetailDraft(null)
    setMarketPurchaseResult(null)
  }

  const runBulkCollectPreview = () => {
    const totalFleetUnits = unlockedBusinesses.reduce((sum, entry) => sum + Math.max(0, num(entry.fleetCount)), 0)
    const totalTruckUnits = Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0)))
    if (totalFleetUnits + totalTruckUnits <= 0) {
      setError('Tahsilat için hazır gelir bulunamadı veya yakıt yetersiz.')
      return
    }
    setBusinessModal('bulk')
  }

  const collectBulkAction = async () => {
    if (busy) return
    setBusy('collect-bulk')
    const requestedMultiplier = premiumActive ? premiumMultiplier : 1
    const response = await collectBusinessesBulk({ multiplier: requestedMultiplier })
    setBusy('')
    if (!response?.success) return fail(response, 'Toplu tahsilat yapılamadı.')
    const collectedCash = fmt(response?.collected?.cash || 0)
    const collectedXp = fmt(response?.collected?.xpGain || 0)
    const appliedMultiplier = Math.max(1, Math.trunc(num(response?.collected?.multiplier || 1)))
    const isBoosted = appliedMultiplier > 1
    setNotice(
      isBoosted
        ? `2x toplu tahsilat tamamlandı: +${collectedCash} nakit | +${collectedXp} XP.`
        : `Toplu tahsilat tamamlandı: +${collectedCash} nakit | +${collectedXp} XP.`,
    )
    if (response?.logistics && typeof response.logistics === 'object') {
      setLogistics((prev) => {
        const base = prev && typeof prev === 'object' ? prev : {}
        return {
          ...base,
          ...response.logistics,
          wallet: Math.max(0, Math.trunc(num(response?.wallet || base?.wallet || 0))),
        }
      })
      setChatClockMs((prev) => prev + 1)
    }
    setBusinessModal('')
    await Promise.all([loadOverview(), loadBusiness(), loadLogistics(), loadProfile(), loadMissions(), loadMarket()])
  }

  const purchasePremiumPlan = async (planId) => {
    const safePlanId = String(planId || '').trim()
    if (!safePlanId || busy) return
    setBusy(`premium:${safePlanId}`)
    const response = await purchasePremium(safePlanId)
    setBusy('')
    if (!response?.success) return fail(response, 'Premium satın alınamadı.')
    setNotice('Premium üyelik güncellendi.')
    await Promise.all([loadOverview(), loadProfile()])
  }

  const purchaseDailyOfferAction = async (offerId) => {
    const safeOfferId = String(offerId || '').trim()
    if (!safeOfferId || busy) return
    setBusy(`daily:${safeOfferId}`)
    const response = await purchaseDailyOffer(safeOfferId)
    setBusy('')
    if (!response?.success) return fail(response, '12 saatlik fırsat alınamadı.')
    setNotice(String(response.message || '12 saatlik fırsat başarıyla alındı.'))
    if (Array.isArray(response.inventory)) {
      setMarket((prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...prev,
          inventory: response.inventory,
        }
      })
    }
    setDailyStore({
      offers: Array.isArray(response.offers) ? response.offers : [],
      nextResetAt: String(response.nextResetAt || ''),
      remainingMs: Math.max(0, Math.trunc(num(response.remainingMs || 0))),
    })
    await Promise.all([loadOverview(), loadProfile(), loadMarket()])
  }

  const claimDailyLoginRewardAction = async () => {
    if (busy) return
    if (!dailyLoginReward?.canClaim) {
      setNotice('Bugünkü günlük ödülü zaten aldın. Yeni ödül Türkiye saatine göre 00:00\'da açılır.')
      return
    }
    setBusy('daily-login:claim')
    const response = await claimDailyLoginReward()
    setBusy('')
    if (!response?.success) return fail(response, 'Günlük ödül alınamadı.')
    setDailyLoginReward(normalizeDailyLoginPayload(response))
    setDailyRewardResult(response?.reward && typeof response.reward === 'object' ? response.reward : null)
    setNotice(String(response.message || 'Günlük ödül hesabına eklendi.'))
    if (Array.isArray(response.inventory)) {
      setMarket((prev) => {
        if (!prev || typeof prev !== 'object') return prev
        return {
          ...prev,
          inventory: response.inventory,
        }
      })
    }
    await Promise.all([loadOverview(), loadProfile(), loadMarket(), loadDailyLoginRewardState()])
  }

  const placeLimitOrderAction = async () => {
    if (busy) return
    const itemId = bookItemId || market?.items?.[0]?.id
    if (!itemId) return setError('Emir defteri için ürün seçilmedi.')

    const quantity = Math.max(1, Math.trunc(num(orderForm.quantity)))
    const limitPrice = Math.max(1, Math.trunc(num(orderForm.limitPrice)))
    const expiresMinutes = clamp(Math.trunc(num(orderForm.expiresMinutes)), 5, 180)

    setBusy('place-orderbook')
    const response = await placeOrderBookOrder({
      itemId,
      side: orderForm.side,
      quantity,
      limitPrice,
      expiresMinutes,
    })
    setBusy('')

    if (!response?.success) return fail(response, 'Limit emir oluşturulamadı.')
    setNotice(response.message || 'Limit emir açıldı.')
    await Promise.all([loadOrderBook(itemId), loadMarket(), loadProfile()])
  }

  const cancelLimitOrderAction = async (orderId) => {
    if (busy) return
    setBusy(`cancel-order:${orderId}`)
    const response = await cancelOrderBookOrder(orderId)
    setBusy('')
    if (!response?.success) return fail(response, 'Limit emir iptal edilemedi.')
    setNotice(response.message || 'Limit emir iptal edildi.')
    await Promise.all([loadOrderBook(bookItemId), loadMarket(), loadProfile()])
  }

  const createAuctionAction = async () => {
    if (busy) return
    const payload = {
      itemId: auctionForm.itemId,
      quantity: Math.max(1, Math.trunc(num(auctionForm.quantity))),
      startBid: Math.max(1, Math.trunc(num(auctionForm.startBid))),
      minIncrement: Math.max(1, Math.trunc(num(auctionForm.minIncrement))),
      durationMinutes: clamp(Math.trunc(num(auctionForm.durationMinutes)), 5, 180),
    }
    if (!payload.itemId) return setError('Açık artırma için ürün seçin.')

    setBusy('create-auction')
    const response = await createMarketAuction(payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Açık artırma oluşturulamadı.')
    setNotice(response.message || 'Açık artırma açıldı.')
    await Promise.all([loadMarket(), loadProfile()])
  }

  const bidAuctionAction = async (auction) => {
    if (busy) return
    const safeAuction = auction && typeof auction === 'object' ? auction : null
    if (!safeAuction?.id) return
    const bidValueRaw = auctionBidById[safeAuction.id]
    const fallbackValue = safeAuction.minNextBid || safeAuction.currentBid + safeAuction.minIncrement
    const amount = Math.max(1, Math.trunc(num(bidValueRaw || fallbackValue)))

    setBusy(`bid-auction:${safeAuction.id}`)
    const response = await placeAuctionBid(safeAuction.id, amount)
    setBusy('')
    if (!response?.success) return fail(response, 'Teklif verilemedi.')
    setNotice(response.message || 'Teklif verildi.')
    await Promise.all([loadMarket(), loadProfile()])
  }

  const collectLogisticsAction = async () => {
    if (busy) return
    setBusy('collect-logistics')
    const response = await collectLogisticsIncome()
    setBusy('')
    if (!response?.success) return fail(response, 'Tır tahsilatı yapılamadı.')
    const netCash = fmt(response?.netCash || 0)
    const taxAmount = Math.max(0, Math.trunc(num(response?.taxAmount || 0)))
    const xpGain = Math.max(0, Math.trunc(num(response?.xpGain || 0)))
    const fuelConsumed = Math.max(0, Math.trunc(num(response?.fuelConsumed || 0)))
    const fuelItemName = String(response?.fuelItemName || 'Petrol').trim() || 'Petrol'
    const appliedMultiplier = Math.max(
      1,
      Math.trunc(num(response?.multiplier || (premiumBoostActive ? premiumMultiplier : 1))),
    )
    const lines = [`${appliedMultiplier > 1 ? '2x tır tahsilatı tamamlandı.' : (response.message || 'Tır tahsilatı tamamlandı.')} +${netCash} nakit`]
    if (taxAmount > 0) lines.push(`-${fmt(taxAmount)} vergi`)
    if (fuelConsumed > 0) lines.push(`-${fmt(fuelConsumed)} ${fuelItemName}`)
    if (xpGain > 0) lines.push(`+${fmt(xpGain)} XP`)
    setNotice(lines.join(' | '))
    if (response?.logisticsFleet || response?.collectPreview) {
      setLogistics((prev) => {
        const base = prev && typeof prev === 'object' ? prev : {}
        return {
          ...base,
          wallet: Math.max(0, Math.trunc(num(response?.wallet || base?.wallet || 0))),
          unlocked: true,
          logisticsFleet: response?.logisticsFleet || base?.logisticsFleet,
          collectPreview: response?.collectPreview || base?.collectPreview,
        }
      })
      setChatClockMs((prev) => prev + 1)
    }
    await Promise.all([loadLogistics(), loadOverview(), loadProfile(), loadBusiness(), loadMarket()])
  }

  const buyTruckAction = async (modelId) => {
    if (busy) return
    setBusy(`buy-truck:${modelId}`)
    const response = await purchaseLogisticsTruck({ modelId })
    setBusy('')
    if (!response?.success) return fail(response, 'Tır satın alımı başarısız.')
    const safeModelId = String(modelId || '').trim()
    const truckName = (logistics?.logisticsFleet?.catalog || []).find((entry) => entry.id === safeModelId)?.name || 'Tır'
    setNotice(response.message || `${truckName} lojistik filona eklendi.`)
    await Promise.all([loadLogistics(), loadOverview(), loadProfile(), loadMarket()])
  }

  const _claimLeagueAction = async (period) => {
    if (busy) return
    setBusy(`claim-league:${period}`)
    const response = await claimLeagueReward(period)
    setBusy('')
    if (!response?.success) return fail(response, 'Lig ödülü alınamadı.')
    setNotice(response.message || 'Lig ödülü alındı.')
    await Promise.all([loadOverview(), loadProfile()])
  }

  const _openSeasonChestAction = async (chestId) => {
    const safeChestId = String(chestId || '').trim()
    if (!safeChestId || busy) return
    setBusy(`season-chest-open:${safeChestId}`)
    const response = await openLeagueSeasonChest(safeChestId)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Sandık açılamadı.')
    setNotice(response?.message || 'Sandık açıldı, ödül hesabına eklendi.')
    if (response?.seasonPrizes) {
      setLeague((prev) => (prev && typeof prev === 'object'
        ? { ...prev, seasonPrizes: response.seasonPrizes }
        : prev))
    }
    await Promise.all([loadOverview(), loadProfile(), _loadLeague()])
  }

  const _savePushSettingsAction = async (nextSettings) => {
    if (busy) return
    setBusy('push-settings')
    const response = await updatePushSettings(nextSettings)
    setBusy('')
    if (!response?.success) return fail(response, 'Bildirim ayarları kaydedilemedi.')
    setPushCenter(response)
    setNotice('Bildirim ayarları güncellendi.')
  }

  const _createPriceAlertAction = async () => {
    if (busy) return
    const payload = {
      itemId: priceAlertForm.itemId,
      direction: priceAlertForm.direction,
      targetPrice: Math.max(1, Math.trunc(num(priceAlertForm.targetPrice))),
    }
    if (!payload.itemId) return setError('Alarm için ürün seçin.')

    setBusy('create-alert')
    const response = await createPriceAlert(payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Fiyat alarmı oluşturulamadı.')
    setNotice(response.message || 'Fiyat alarmı eklendi.')
    await loadPush()
  }

  const _readPushAction = async (pushId) => {
    if (busy) return
    setBusy(`read-push:${pushId}`)
    const response = await readPushNotification(pushId)
    setBusy('')
    if (!response?.success) return fail(response, 'Bildirim okunamadı.')
    setPushCenter(response)
  }

  const clearAvatarCropSource = useCallback(() => {
    const currentSource = avatarCropSourceRef.current
    if (currentSource) {
      URL.revokeObjectURL(currentSource)
      avatarCropSourceRef.current = ''
    }
  }, [])

  const closeAvatarCrop = useCallback(() => {
    clearAvatarCropSource()
    setAvatarCropOpen(false)
    setAvatarCropSource('')
    setAvatarCropFile(null)
    setAvatarCropFileName('')
    setAvatarCropMode('crop')
    setAvatarCropZoom(1)
    setAvatarCropOffsetX(0)
    setAvatarCropOffsetY(0)
    setAvatarCropNatural({ width: 0, height: 0 })
  }, [clearAvatarCropSource])

  useEffect(() => () => {
    clearAvatarCropSource()
  }, [clearAvatarCropSource])

  useEffect(() => {
    if (!avatarCropOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && busy !== 'avatar-upload') {
        closeAvatarCrop()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [avatarCropOpen, busy, closeAvatarCrop])

  const openAvatarCropFromFile = useCallback((event) => {
    const file = event.target?.files?.[0]
    if (!file) return
    clearAvatarCropSource()
    const url = URL.createObjectURL(file)
    avatarCropSourceRef.current = url
    setAvatarCropSource(url)
    setAvatarCropFile(file)
    setAvatarCropFileName(file.name)
    setAvatarCropMode(String(file.type || '').toLowerCase() === 'image/gif' ? 'gif' : 'crop')
    setAvatarCropZoom(1)
    setAvatarCropOffsetX(0)
    setAvatarCropOffsetY(0)
    setAvatarCropNatural({ width: 0, height: 0 })
    setAvatarCropOpen(true)
    event.target.value = ''
  }, [clearAvatarCropSource])

  const triggerAvatarFilePicker = useCallback(() => {
    if (busy) return
    avatarFileInputRef.current?.click()
  }, [busy])

  const applyAvatarCropAction = async () => {
    if (!avatarCropFile || busy) return

    setBusy('avatar-upload')
    setError('')

    let uploadFile = avatarCropFile
    if (avatarCropMode !== 'gif') {
      const imageNode = avatarCropImageRef.current
      if (!imageNode || !avatarCropLayout.ready) {
        setBusy('')
        setError('Kırpma önizlemesi henüz hazır değil. Biraz bekleyip tekrar dene.')
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = AVATAR_CROP_OUTPUT_SIZE
      canvas.height = AVATAR_CROP_OUTPUT_SIZE
      const context = canvas.getContext('2d')
      if (!context) {
        setBusy('')
        setError('Kırpma motoru başlatılamadı.')
        return
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'

      context.drawImage(
        imageNode,
        avatarCropLayout.sourceX,
        avatarCropLayout.sourceY,
        avatarCropLayout.sourceSize,
        avatarCropLayout.sourceSize,
        0,
        0,
        AVATAR_CROP_OUTPUT_SIZE,
        AVATAR_CROP_OUTPUT_SIZE,
      )

      const blob = await new Promise((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png')
      })
      if (!blob) {
        setBusy('')
        setError('Kırpılmış avatar oluşturulamadı.')
        return
      }

      const fileStem = String(avatarCropFileName || 'avatar')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 42) || 'avatar'

      uploadFile = new File([blob], `${fileStem}-crop.png`, { type: 'image/png' })
    }

    const response = await uploadProfileAvatarFile(uploadFile)
    setBusy('')
    if (!response?.success) return fail(response, 'Avatar dosyası yüklenemedi.')

    setAvatarFailedSrc('')
    closeAvatarCrop()
    setNotice(response.message || 'Profil resmi yüklendi.')
    await Promise.all([loadOverview(), loadProfile()])
  }

  const updateProfilePasswordAction = async () => {
    if (busy) return
    const payload = {
      newPassword: String(profileAccountForm.newPassword || ''),
      confirmPassword: String(profileAccountForm.confirmPassword || ''),
    }

    if (!payload.newPassword || !payload.confirmPassword) {
      setError('Yeni şifre ve şifre tekrarı alanları zorunludur.')
      return
    }

    setBusy('profile-password')
    setError('')
    const response = await changeCurrentUserPassword(payload)
    setBusy('')
    if (!response?.success) return fail(response, 'Şifre güncellenemedi.')

    setProfileAccountForm((prev) => ({
      ...prev,
      newPassword: '',
      confirmPassword: '',
    }))
    setNotice(response.message || 'Şifreniz başarıyla güncellendi.')
    setNoticeIsSuccess(true)
  }

  const updateProfileUsernameAction = async () => {
    if (busy) return
    const username = String(profileAccountForm.username || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15)

    if (!username) {
      setError('Yeni kullanıcı adı zorunludur.')
      return
    }

    setBusy('profile-username')
    setError('')
    const response = await changeCurrentUserUsername(username)
    setBusy('')
    if (!response?.success) return fail(response, 'Kullanıcı adı güncellenemedi.')

    const nextUsername = String(response?.user?.username || username).trim()
    setProfileAccountForm((prev) => ({
      ...prev,
      username: nextUsername,
    }))
    setNotice(response.message || 'Kullanıcı adı güncellendi.')
    setNoticeIsSuccess(true)
    await Promise.all([loadOverview(), loadProfile()])
  }

  const sendSupportRequestAction = async () => {
    if (busy) return
    const title = String(supportForm.title || '').replace(/\s+/g, ' ').trim()
    const description = String(supportForm.description || '').replace(/\r\n/g, '\n').trim()

    if (title.length < 4 || title.length > 120) {
      setError('Destek başlığı 4-120 karakter arasında olmalıdır.')
      return
    }

    if (description.length < 10 || description.length > 2500) {
      setError('Destek açıklaması 10-2500 karakter arasında olmalıdır.')
      return
    }

    setBusy('support-request')
    setError('')
    const response = await submitSupportRequest({ title, description })
    setBusy('')
    if (!response?.success) return fail(response, 'Destek talebi gönderilemedi.')

    setSupportForm({ title: '', description: '' })
    setNotice(response.message || 'Destek talebiniz başarıyla gönderildi.')
    setNoticeIsSuccess(true)
  }

  const applySettingsTheme = (themeId) => {
    const safeTheme = sanitizeNavTheme(themeId)
    setNavTheme(safeTheme)
    setSettingsThemeModalOpen(false)
    const themeLabel =
      PROFILE_THEME_OPTIONS.find((entry) => entry.id === safeTheme)?.label || 'Tema'
    setNotice(`${themeLabel} aktif edildi.`)
    setNoticeIsSuccess(true)
  }

  const promptStaffReason = (title) => {
    const raw = String(
      typeof window !== 'undefined'
        ? window.prompt(`${title} (en az 3 karakter):`, '') || ''
        : '',
    ).trim()
    if (!raw) return { cancelled: true, value: '' }
    if (raw.length < 3) {
      setError('Neden en az 3 karakter olmalı.')
      return { cancelled: false, value: '' }
    }
    return { cancelled: false, value: raw.slice(0, 160) }
  }

  const promptStaffDurationHours = (title, defaultHours = 1) => {
    const raw = String(
      typeof window !== 'undefined'
        ? window.prompt(`${title} (saat):`, String(defaultHours)) || ''
        : '',
    ).trim()
    if (!raw) return { cancelled: true, value: 0 }
    const hours = Math.max(0, Math.trunc(num(raw)))
    if (hours <= 0) {
      setError('Süre saat cinsinden 1 veya daha büyük olmalı.')
      return { cancelled: false, value: 0 }
    }
    return { cancelled: false, value: hours * 60 }
  }

  const staffDeleteChatMessageAction = async (message) => {
    if (!isStaffUser || busy) return
    const messageId = String(message?.id || '').trim()
    if (!messageId) return

    setBusy('staff-chat-delete')
    const response = await moderateDeleteChatMessage(messageId, CHAT_ROOM, '')
    setBusy('')
    if (!response?.success) return fail(response, 'Sohbet mesajı silinemedi.')
    setNotice(response.message || 'Sohbet mesajı silindi.')
    await Promise.all([
      loadChatRoom(CHAT_ROOM),
      loadMessageCenter(messageFilterRef.current || 'all'),
    ])
  }

  const staffBlockMessagesAction = async (message) => {
    if (!isStaffUser || busy) return
    const targetUserId = String(message?.userId || '').trim()
    const targetLookup = String(message?.u || '').trim()
    if (!targetUserId || !targetLookup) {
      setError('Hedef kullanıcı bilgisi bulunamadı.')
      return
    }
    const minutesPrompt = promptStaffDurationHours('Mesaj engeli süresi', 2)
    if (minutesPrompt.cancelled) return
    if (!minutesPrompt.value) return
    const reasonPrompt = promptStaffReason('Mesaj engeli nedeni')
    if (reasonPrompt.cancelled) return
    if (!reasonPrompt.value) return

    setBusy('staff-message-block')
    const response = await moderateBlockMessages(
      targetUserId,
      targetLookup,
      minutesPrompt.value,
      reasonPrompt.value,
    )
    setBusy('')
    if (!response?.success) return fail(response, 'Mesaj engeli uygulanamadı.')
    setNotice(response.message || 'Kullanıcıya mesaj engeli uygulandı.')
    await Promise.all([
      loadChatRoom(CHAT_ROOM),
      loadMessageCenter(messageFilterRef.current || 'all'),
    ])
  }

  const staffDeleteDirectMessageAction = async (entry) => {
    if (!isStaffUser || busy) return
    const messageId = String(entry?.id || '').trim()
    if (!messageId || String(messageId).startsWith('dm-local-')) return

    setBusy('staff-dm-delete')
    const response = await moderateDeleteDirectMessage(messageId, '')
    setBusy('')
    if (!response?.success) return fail(response, 'DM mesajı silinemedi.')
    setNotice(response.message || 'DM mesajı silindi.')
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      messageReplyTargetRef.current?.username
        ? loadDirectMessageThread(messageReplyTargetRef.current.username)
        : Promise.resolve(true),
    ])
  }

  const openChatReportModal = (message, resolvedRole = '') => {
    const messageId = String(message?.id || '').trim()
    const targetUserId = String(message?.userId || '').trim()
    const targetUsername = String(message?.u || '').trim()
    const text = String(message?.t || '').replace(/\s+/g, ' ').trim()
    const isOwnMessage = Boolean(message?.own)
    const targetRole = normalizeRoleValue(resolvedRole || message?.userRole || 'player')

    if (targetRole === 'admin') {
      setError('Admin kullanıcıları raporlanamaz.')
      return
    }
    if (!messageId || !targetUserId || !targetUsername || !text || isOwnMessage) return
    setChatReportModal({
      messageId,
      room: CHAT_ROOM,
      targetUserId,
      targetUsername,
      text: text.slice(0, 280),
    })
  }

  const closeChatReportModal = () => {
    if (busy === 'chat-report') return
    setChatReportModal(null)
  }

  const submitChatReportAction = async () => {
    if (!chatReportModal || busy) return
    const messageId = String(chatReportModal?.messageId || '').trim()
    if (!messageId) return

    setBusy('chat-report')
    const response = await reportChatMessage(messageId, chatReportModal.room || CHAT_ROOM)
    setBusy('')
    if (!response?.success) return fail(response, 'Mesaj bildirimi gönderilemedi.')

    setChatReportModal(null)
    setNotice(response.message || 'Mesaj yetkililere bildirildi.')
  }

  const openDmReportModal = () => {
    if (busy) return
    const targetUserId = String(messageReplyTarget?.userId || '').trim()
    const targetUsername = String(messageReplyTarget?.username || '').trim()
    const targetRole = normalizeRoleValue(messageReplyTarget?.role || 'player')
    if (!targetUserId || !targetUsername) {
      setError('Bildirim hedefi bulunamadı.')
      return
    }
    if (targetRole === 'admin') {
      setError('Admin kullanıcıları raporlanamaz.')
      return
    }

    const reportableMessages = (Array.isArray(messageThread) ? messageThread : [])
      .filter((entry) => entry && typeof entry === 'object')
      .filter((entry) => !entry.own)
      .map((entry) => {
        const id = String(entry?.id || '').trim()
        const text = String(entry?.text || '').replace(/\s+/g, ' ').trim()
        const createdAt = String(entry?.createdAt || '').trim()
        const at = String(entry?.at || '').trim()
        const isLocal = id.startsWith('dm-local-')
        return {
          id,
          text,
          createdAt,
          at,
          isLocal,
          label: `${at || '--:--'} - ${text.slice(0, 80)}`,
        }
      })
      .filter((entry) => entry.id && entry.text && !entry.isLocal)

    if (!reportableMessages.length) {
      setError('Bildirmek için seçilebilir mesaj bulunamadı.')
      return
    }

    const defaultMessage = reportableMessages[reportableMessages.length - 1]
    setDmReportModal({
      targetUserId,
      targetUsername,
      messages: reportableMessages,
      selectedMessageId: defaultMessage.id,
      reason: '',
    })
  }

  const closeDmReportModal = () => {
    if (busy === 'dm-report') return
    setDmReportModal(null)
  }

  const submitDmReportAction = async () => {
    if (!dmReportModal || busy) return
    const selectedMessageId = String(dmReportModal?.selectedMessageId || '').trim()
    const reason = String(dmReportModal?.reason || '').replace(/\s+/g, ' ').trim()

    if (!selectedMessageId) {
      setError('Bildirim için bir mesaj seçmelisin.')
      return
    }
    if (reason.length < 5) {
      setError('Şikâyet açıklaması en az 5 karakter olmalı.')
      return
    }

    setBusy('dm-report')
    const response = await reportDirectMessage(selectedMessageId, reason)
    setBusy('')
    if (!response?.success) return fail(response, 'DM bildirimi gönderilemedi.')

    setDmReportModal(null)
    setNotice(response.message || 'DM bildirimi yetkililere iletildi.')
    setNoticeIsSuccess(true)
  }

  const _sendChat = (event) => {
    event.preventDefault()
    if (MESSAGES_DISABLED) {
      setError('Sohbet mesajları geçici olarak kapalı.')
      return
    }
    const text = chatInput.trim()
    if (!text) return
    if (chatMuteActive) {
      setError(`Mesaj engelin aktif: ${chatMuteReasonLabel}. Kalan süre: ${formatCountdownTr(chatMuteRemainingMs)}.`)
      return
    }
    if (chatBlockActive) {
      setError(`Sohbet engelin aktif: ${chatBlockReasonLabel}. Kalan süre: ${formatCountdownTr(chatBlockRemainingMs)}.`)
      return
    }
    if (chatCooldownActive) {
      setError(`Yeni mesaj için ${Math.max(1, Math.ceil(chatCooldownRemainingMs / 1000))} saniye beklemelisin.`)
      return
    }
    const replyToId = String(chatReplyTarget?.id || '').trim()
    if (chatSocketRef.current?.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(
        JSON.stringify({
          type: 'send',
          room: CHAT_ROOM,
          text,
          replyToId: replyToId || undefined,
        }),
      )
      setChatInput('')
      setChatReplyTarget(null)
      return
    }

    void (async () => {
      const response = await sendChatRoomMessage(CHAT_ROOM, text, {
        replyToId,
      })
      if (!response?.success) {
        applyChatRestrictions(response?.chatState)
        fail(response, 'Mesaj g\u00f6nderilemedi.')
        return
      }
      applyChatRestrictions(response?.chatState)
      setChatInput('')
      setChatReplyTarget(null)
      await loadChatRoom(CHAT_ROOM)
    })()
  }

  const _openChatReply = (message) => {
    if (MESSAGES_DISABLED) return
    const safeId = String(message?.id || '').trim()
    if (!safeId) return
    const username = String(message?.u || 'Oyuncu').trim() || 'Oyuncu'
    const avatarSource = String(message?.avatar || DEFAULT_CHAT_AVATAR).trim() || DEFAULT_CHAT_AVATAR
    setChatReplyTarget({
      id: safeId,
      username,
      preview: chatSnippet(message?.t, 90),
      avatar: avatarSource,
      initial: username.slice(0, 1).toUpperCase(),
    })
  }

  const _clearChatReply = () => {
    setChatReplyTarget(null)
  }

  const _jumpToChatMessage = (messageId) => {
    const safeId = String(messageId || '').trim()
    if (!safeId) return
    const target = chatMessageRefs.current[safeId]
    if (!target) return
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    target.classList.remove('chat-jump-flash')
    void target.offsetWidth
    target.classList.add('chat-jump-flash')
  }

  const _openReplyToMessage = (item) => {
    if (MESSAGES_DISABLED) return
    const username = String(item?.counterpart?.username || '').trim()
    if (!username) return
    const rawReplyId = String(item?.id || '').replace(/^dm:/, '').trim()
    const avatarUrl = String(item?.counterpart?.avatarUrl || '').trim()
    const levelLabel = item?.counterpart?.levelLabel || ''
    const roleLabel = item?.counterpart?.roleLabel || ''
    const target = {
      userId: item?.counterpart?.userId || null,
      username,
      replyToId: rawReplyId || null,
      avatarUrl: avatarUrl || '',
      level: item?.counterpart?.level ?? null,
      levelLabel: levelLabel || '',
      role: item?.counterpart?.role || 'player',
      roleLabel: roleLabel || '',
      premium: Boolean(item?.counterpart?.premium),
      seasonBadge: item?.counterpart?.seasonBadge || null,
      relationship: item?.relationship || null,
      moderation: normalizeUserModeration(messageCenter?.moderation),
    }
    setMessageReplyTarget(target)
    messageReplyTargetRef.current = target
    setMessageForm((prev) => ({ ...prev, toUsername: username }))
    setNotice(`${username} için cevap penceresi hazır.`)
    void loadDirectMessageThread(username)
    if (item?.id) {
      void _readMessageItemAction(item.id)
    }
  }

  const _clearReplyTarget = () => {
    setMessageReplyTarget(null)
    messageReplyTargetRef.current = null
    setDmReportModal(null)
  }

  const _readMessageItemAction = async (itemId) => {
    if (MESSAGES_DISABLED) {
      setError('Mesaj merkezi geçici olarak kapalı.')
      return
    }
    const safeId = String(itemId || '').trim()
    if (!safeId || busy) return
    setBusy(`read-message:${safeId}`)
    const response = await markMessageCenterItemRead(safeId)
    setBusy('')
    if (!response?.success) return fail(response, 'Mesaj okundu olarak işaretlenemedi.')
    const targetFilter = String(messageFilterRef.current || messageFilter || 'all').trim().toLowerCase() || 'all'
    await loadMessageCenter(targetFilter)
  }

  const _sendFriendRequestAction = async () => {
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy('social:friend-request')
    const response = await sendFriendRequestToUser(targetUserId)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Arkadaşlık isteği gönderilemedi.')
    setNotice(response.message || 'Arkadaşlık isteği gönderildi.')
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      if (!prevUserId || prevUserId !== targetUserId) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _respondFriendRequestAction = async (requestId, action) => {
    const safeRequestId = String(requestId || '').trim()
    const safeAction = String(action || '').trim().toLowerCase()
    if (!safeRequestId || !['accept', 'reject', 'cancel'].includes(safeAction) || busy) return
    setBusy(`social:friend-request:${safeAction}:${safeRequestId}`)
    const response = await respondFriendRequest(safeRequestId, safeAction)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Arkadaşlık isteği yanıtlanamadı.')
    setNotice(response.message || 'Arkadaşlık isteği güncellendi.')
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _removeFriendAction = async () => {
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy('social:friend-remove')
    const response = await removeFriendFromUser(targetUserId)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Arkadaş kaldırılamadı.')
    setNotice(response.message || 'Arkadaş listenden kaldırıldı.')
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      if (!prevUserId || prevUserId !== targetUserId) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _toggleBlockAction = async (shouldBlock) => {
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    const targetUsername = String(profileModalData?.username || '').trim().toLowerCase()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy(`social:block:${shouldBlock ? 'on' : 'off'}`)
    const response = await setUserBlocked(targetUserId, shouldBlock)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Engel durumu güncellenemedi.')
    setNotice(response.message || (shouldBlock ? 'Kullanıcı engellendi.' : 'Kullanıcı engeli kaldırıldı.'))
    setNoticeIsSuccess(true)
    setProfileModalData((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      if (!prevUserId || prevUserId !== targetUserId) return prev
      return {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
    })
    setMessageReplyTarget((prev) => {
      if (!prev) return prev
      const prevUserId = String(prev.userId || '').trim()
      const prevUsername = String(prev.username || '').trim().toLowerCase()
      const matchesById = Boolean(prevUserId && prevUserId === targetUserId)
      const matchesByUsername = Boolean(targetUsername && prevUsername && prevUsername === targetUsername)
      if (!matchesById && !matchesByUsername) return prev
      const next = {
        ...prev,
        userId: prev.userId || targetUserId || null,
        relationship: response.relationship || prev.relationship || null,
      }
      messageReplyTargetRef.current = next
      return next
    })
    await Promise.all([
      loadMessageCenter(messageFilterRef.current || 'all'),
      reloadProfileModal({ showLoading: false }),
    ])
  }

  const _toggleBlockByMessageTargetAction = async (shouldBlock) => {
    const targetUserId = String(messageReplyTarget?.userId || '').trim()
    if (!targetUserId || String(targetUserId) === String(user?.id || '')) return
    if (busy) return
    setBusy(`social:dm-block:${shouldBlock ? 'on' : 'off'}`)
    const response = await setUserBlocked(targetUserId, shouldBlock)
    setBusy('')
    if (!response?.success) return fail(response, response?.errors?.global || 'Engel durumu güncellenemedi.')
    setNotice(response.message || (shouldBlock ? 'Kullanıcı engellendi.' : 'Kullanıcı engeli kaldırıldı.'))
    setNoticeIsSuccess(true)
    setMessageReplyTarget((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        relationship: response.relationship || prev.relationship || null,
      }
      messageReplyTargetRef.current = next
      return next
    })
    await loadMessageCenter(messageFilterRef.current || 'all')
  }

  const _sendDirectMessageAction = async (event) => {
    event.preventDefault()
    if (MESSAGES_DISABLED) {
      setError('Mesaj gönderimi geçici olarak kapalı.')
      return
    }
    if (busy) return
    const toUsername = String(messageReplyTarget?.username || messageForm.toUsername || '').trim()
    const text = String(messageForm.text || '').trim()
    if (!toUsername || !text) {
      setError('Alıcı kullanıcı adı ve mesaj metni gerekli.')
      return
    }
    if (dmMessageBlockActive) {
      setError(
        `DM mesaj engelin aktif: ${dmMessageBlockReasonLabel}. Bitiş: ${dmMessageBlockEndLabel || '-'}. Kalan süre: ${formatCountdownTr(dmMessageBlockRemainingMs)}.`,
      )
      return
    }
    if (messageReplyTarget?.relationship?.blockedByMe) {
      setError('Engellediğin kullanıcıya mesaj gönderemezsin.')
      return
    }
    if (messageReplyTarget?.relationship?.blockedMe) {
      setError('Bu kullanıcı seni engellediği için mesaj gönderemezsin.')
      return
    }

    const now = new Date()
    const optimisticId = `dm-local-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticEntry = {
      id: optimisticId,
      text,
      own: true,
      at: `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`,
      createdAt: now.toISOString(),
      readAt: now.toISOString(),
      counterpart: {
        userId: messageReplyTarget?.userId || null,
        username: toUsername,
        avatarUrl: messageReplyTarget?.avatarUrl || '',
      },
    }

    setMessageThread((prev) => [...prev, optimisticEntry])
    setMessageForm((prev) => ({ ...prev, toUsername, text: '' }))
    setBusy('message-send')
    setError('')
    const response = await sendDirectMessageToUser({
      toUsername,
      text,
      subject: messageReplyTarget ? 'Cevap' : 'Mesaj',
      replyToId: messageReplyTarget?.replyToId || '',
    })
    setBusy('')
    if (!response?.success) {
      setMessageThread((prev) => prev.filter((entry) => entry?.id !== optimisticId))
      if (messageReplyTargetRef.current?.username) {
        void loadDirectMessageThread(messageReplyTargetRef.current.username)
      }
      return fail(response, 'Mesaj gönderilemedi.')
    }

    setNotice(response.message || 'Mesaj gönderildi.')
    await loadMessageCenter(messageFilter)
    if (messageReplyTargetRef.current?.username) {
      void loadDirectMessageThread(messageReplyTargetRef.current.username)
    }
  }

  const _sendProfileTeklif = async (toUsername, offerTargetLabel) => {
    if (MESSAGES_DISABLED || !toUsername) return
    const safeUsername = String(toUsername).trim()
    if (!safeUsername) return

    const safeOfferTargetLabel = String(offerTargetLabel || '').trim() || 'varlığınız'
    setProfileTeklifSending(true)
    try {
      setProfileModalUserId(null)
      setProfileModalBusinessExpand(null)
      setGaragePanel((p) => ({ ...p, open: false }))

      const text = `Merhaba, ${safeOfferTargetLabel} için teklif vermek istiyorum. Uygunsa fiyat paylaşır mısınız?`
      const target = {
        username: safeUsername,
        replyToId: null,
        avatarUrl: '',
        levelLabel: '',
        roleLabel: '',
        seasonBadge: null,
        userId: null,
      }
      setMessageReplyTarget(target)
      messageReplyTargetRef.current = target
      setMessageForm((prev) => ({ ...prev, toUsername: safeUsername, text }))
      setMessageViewTab('mesajlar')
      setMessageFilter('message')
      await openTab('messages', { messageFilter: 'message' })
      await loadMessageCenter('message')
      void loadDirectMessageThread(safeUsername)
    } finally {
      setProfileTeklifSending(false)
    }
  }

  const name = overview?.profile?.username || user?.username || 'Oyuncu'
  const lv = overview?.profile?.levelInfo || { level: 1, currentXp: 0, nextLevelXp: 500, progressPercent: 0 }
  const playerLevelNow = Math.max(1, Math.trunc(num(lv?.level || overview?.profile?.levelInfo?.level || 1)))
  const isPlayerMaxLevel = Boolean(lv?.isMaxLevel) || playerLevelNow >= 1000
  const liveNowMs = chatClockMs
  const companyUnlock = business?.companyUnlock || {}
  const companyUpgrade = companyUnlock.upgrade || null
  const logisticsUnlocked = companyUnlock.logisticsUnlocked === true || logistics?.unlocked === true
  const nextCompanyUnlock = companyUnlock.nextUnlock || null
  const companyUnlockFlowRaw = Array.isArray(companyUnlock.flow) ? companyUnlock.flow : []
  const businesses = business?.businesses || []
  const unlockedBusinesses = businesses.filter((entry) => entry?.unlocked !== false)
  const selectedBusiness = unlockedBusinesses.find((entry) => entry.id === selectedBusinessId) || unlockedBusinesses[0] || null
  const selectedBusinessMeta = FLEET_CARD_META[selectedBusiness?.templateId] || null
  const companyLegalLabel = `${name} Ltd. Şti.`
  const selectedBusinessHeaderTitle = selectedBusinessMeta?.label || selectedBusiness?.name || 'Kiralama İşletmesi'
  const selectedBusinessMarketTitle = selectedBusinessMeta?.marketTitle || 'İkinci El Pazarı'
  const selectedBusinessGalleryTitle = selectedBusinessMeta?.galleryTitle
    || (selectedBusiness?.templateId === 'moto-rental'
      ? 'Sıfır Motor Siparişi'
      : selectedBusiness?.templateId === 'property-rental'
        ? 'Yeni Mülk Siparişi'
        : 'Sıfır Araba Siparişi')
  const selectedBusinessFuelMeta = fuelItemMeta(
    selectedBusiness?.fuelItemId || (selectedBusiness?.templateId === 'property-rental' ? 'energy' : 'oil'),
  )
  const ownedTabLabel = selectedBusinessMeta?.ownedTitle
    || (selectedBusiness?.templateId === 'logistics' ? 'Tırlarım' : 'Varlıklarım')
  const logisticsTruckCatalog = sortByTruckCostAsc(logistics?.logisticsFleet?.catalog || [])
  const allVehicleListings = Array.isArray(business?.vehicleListings) ? business.vehicleListings : []
  const vehicleListingById = new Map(
    allVehicleListings
      .map((entry) => {
        const id = String(entry?.id || '').trim()
        if (!id) return null
        return [id, entry]
      })
      .filter(Boolean),
  )
  const allMyVehicleListings = Array.isArray(business?.myVehicleListings) ? business.myVehicleListings : []
  const myListingIdSet = new Set(
    allMyVehicleListings
      .map((entry) => String(entry?.id || '').trim())
      .filter(Boolean),
  )
  const selectedBusinessListings = allVehicleListings.filter(
    (entry) => entry.templateId === selectedBusiness?.templateId,
  )
  const selectedMyListings = allMyVehicleListings.filter(
    (entry) => entry.templateId === selectedBusiness?.templateId,
  )
  const logisticsMarketRowsSource = allVehicleListings
    .filter((entry) => entry.templateId === 'logistics')
    .map((entry) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry.price))),
      marketIncome: Math.max(1, Math.round(num(entry.rentPerHour))),
      marketLevel: Math.max(1, Math.round(num(entry.requiredLevel || 1))),
      commissionRate: Math.max(0, num(entry?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
      commissionAmount: Math.max(
        0,
        Math.trunc(
          num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE)),
        ),
      ),
      totalCost: Math.max(
        1,
        Math.trunc(
          num(
            entry?.totalCost ||
            Math.max(1, Math.round(num(entry.price))),
          ),
        ),
      ),
      sellerPayout: Math.max(
        0,
        Math.trunc(
          num(
            entry?.sellerPayout ||
            (
              Math.max(1, Math.round(num(entry.price))) -
              Math.max(
                0,
                Math.trunc(num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE))),
              )
            ),
          ),
        ),
      ),
      capacity: Math.max(1, Math.round(num(entry.capacity || 1))),
      upkeep: Math.max(1, Math.round(num(entry.upkeepPerRun || 1))),
      isMine: myListingIdSet.has(String(entry?.id || '').trim()),
    }))
    .sort((a, b) =>
      num(a.marketPrice) - num(b.marketPrice) ||
      num(a.marketLevel) - num(b.marketLevel) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )
  const selectedVehicleCatalogBase = selectedBusiness?.vehicleCatalog || []
  const selectedVehicleCatalog =
    selectedBusiness && selectedBusiness.fleetCount >= selectedVehicleCatalogBase.length && selectedBusiness.nextVehicle
      ? [...selectedVehicleCatalogBase, selectedBusiness.nextVehicle]
      : selectedVehicleCatalogBase
  const selectedCatalogModelOptions = [...new Set(
    selectedVehicleCatalog
      .map((vehicle) => String(vehicle?.name || '').trim())
      .filter(Boolean),
  )]
  const selectedMarketModelOptions = [...new Set(
    [...selectedCatalogModelOptions, ...selectedBusinessListings.map((vehicle) => String(vehicle?.name || '').trim())]
      .filter(Boolean),
  )]
  const logisticsCatalogModelOptions = [...new Set(
    logisticsTruckCatalog
      .map((truck) => String(truck?.name || '').trim())
      .filter(Boolean),
  )]
  const logisticsMarketModelOptions = [...new Set(
    [...logisticsCatalogModelOptions, ...logisticsMarketRowsSource.map((entry) => String(entry?.name || '').trim())]
      .filter(Boolean),
  )]
  const filterInLogisticsMarket = businessScene === 'logistics' && logisticsScene === 'market'
  const activeMarketModelOptions = filterInLogisticsMarket ? logisticsMarketModelOptions : selectedMarketModelOptions
  const activeModelFilter = activeMarketModelOptions.includes(String(marketFilterForm.model || 'all'))
    ? String(marketFilterForm.model || 'all')
    : 'all'
  const selectedBuildRows = sortByVehicleCostAsc(selectedVehicleCatalog)
  const selectedMarketRows = selectedBusinessListings
    .map((vehicle, index) => ({
      ...vehicle,
      marketPrice: Math.max(1, Math.round(num(vehicle.price))),
      marketIncome: Math.max(1, Math.round(num(vehicle.rentPerHour))),
      marketLevel: Math.max(1, num(vehicle.requiredLevel) || index + 1),
      commissionRate: Math.max(0, num(vehicle?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
      commissionAmount: Math.max(
        0,
        Math.trunc(
          num(vehicle?.commissionAmount || Math.floor(Math.max(1, Math.round(num(vehicle.price))) * VEHICLE_MARKET_COMMISSION_RATE)),
        ),
      ),
      totalCost: Math.max(
        1,
        Math.trunc(
          num(
            vehicle?.totalCost ||
            Math.max(1, Math.round(num(vehicle.price))),
          ),
        ),
      ),
      sellerPayout: Math.max(
        0,
        Math.trunc(
          num(
            vehicle?.sellerPayout ||
            (
              Math.max(1, Math.round(num(vehicle.price))) -
              Math.max(
                0,
                Math.trunc(num(vehicle?.commissionAmount || Math.floor(Math.max(1, Math.round(num(vehicle.price))) * VEHICLE_MARKET_COMMISSION_RATE))),
              )
            ),
          ),
        ),
      ),
      isMine: myListingIdSet.has(String(vehicle?.id || '').trim()),
    }))
    .filter((vehicle) => {
      const modelValue = String(vehicle?.name || '').trim()
      const modelOk = activeModelFilter === 'all' || modelValue === activeModelFilter
      const minPriceOk = !marketFilterForm.minPrice || num(vehicle.marketPrice) >= num(marketFilterForm.minPrice)
      const maxPriceOk = !marketFilterForm.maxPrice || num(vehicle.marketPrice) <= num(marketFilterForm.maxPrice)
      const minLevelOk = !marketFilterForm.minLevel || num(vehicle.marketLevel) >= num(marketFilterForm.minLevel)
      const maxLevelOk = !marketFilterForm.maxLevel || num(vehicle.marketLevel) <= num(marketFilterForm.maxLevel)
      return modelOk && minPriceOk && maxPriceOk && minLevelOk && maxLevelOk
    })
    .sort((a, b) =>
      num(a.marketPrice) - num(b.marketPrice) ||
      num(a.marketLevel) - num(b.marketLevel) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )
  const selectedMarketPublicRows = selectedMarketRows.filter(
    (vehicle) =>
      !myListingIdSet.has(String(vehicle?.id || '').trim()) &&
      String(vehicle?.visibility || 'public').trim().toLowerCase() === 'public',
  )
  const logisticsMarketListings = logisticsMarketRowsSource
    .filter((vehicle) => {
      const modelValue = String(vehicle?.name || '').trim()
      const modelOk = activeModelFilter === 'all' || modelValue === activeModelFilter
      const minPriceOk = !marketFilterForm.minPrice || num(vehicle.marketPrice) >= num(marketFilterForm.minPrice)
      const maxPriceOk = !marketFilterForm.maxPrice || num(vehicle.marketPrice) <= num(marketFilterForm.maxPrice)
      const minLevelOk = !marketFilterForm.minLevel || num(vehicle.marketLevel) >= num(marketFilterForm.minLevel)
      const maxLevelOk = !marketFilterForm.maxLevel || num(vehicle.marketLevel) <= num(marketFilterForm.maxLevel)
      return modelOk && minPriceOk && maxPriceOk && minLevelOk && maxLevelOk
    })
    .sort((a, b) =>
      num(a.marketPrice) - num(b.marketPrice) ||
      num(a.marketLevel) - num(b.marketLevel) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )
  const logisticsPublicListings = logisticsMarketListings.filter(
    (entry) =>
      !myListingIdSet.has(String(entry?.id || '').trim()) &&
      String(entry?.visibility || 'public').trim().toLowerCase() === 'public',
  )

  const privateCustomFleetRows = allVehicleListings
    .filter((entry) => {
      const visibility = String(entry?.visibility || 'public').trim().toLowerCase()
      const templateId = String(entry?.templateId || '').trim()
      if (visibility !== 'custom') return false
      if (templateId === 'logistics') return false
      return !myListingIdSet.has(String(entry?.id || '').trim())
    })
    .map((entry, index) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry?.price || 0))),
      marketIncome: Math.max(1, Math.round(num(entry?.rentPerHour || 0))),
      marketLevel: Math.max(1, Math.trunc(num(entry?.requiredLevel || 1) || index + 1)),
    }))
    .sort(
      (a, b) =>
        num(a.marketPrice) - num(b.marketPrice) ||
        num(a.marketLevel) - num(b.marketLevel) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )

  const privateCustomLogisticsRows = allVehicleListings
    .filter((entry) => {
      const visibility = String(entry?.visibility || 'public').trim().toLowerCase()
      const templateId = String(entry?.templateId || '').trim()
      if (visibility !== 'custom') return false
      if (templateId !== 'logistics') return false
      return !myListingIdSet.has(String(entry?.id || '').trim())
    })
    .map((entry) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry?.price || 0))),
      marketIncome: Math.max(1, Math.round(num(entry?.rentPerHour || 0))),
      marketLevel: Math.max(1, Math.trunc(num(entry?.requiredLevel || entry?.levelRequired || 1) || 1)),
    }))
    .sort(
      (a, b) =>
        num(a.marketPrice) - num(b.marketPrice) ||
        num(a.marketLevel) - num(b.marketLevel) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'tr'),
    )

  const logisticsMyListings = allMyVehicleListings
    .filter((entry) => entry.templateId === 'logistics')
    .map((entry) => ({
      ...entry,
      marketPrice: Math.max(1, Math.round(num(entry.price))),
      marketIncome: Math.max(1, Math.round(num(entry.rentPerHour))),
      marketLevel: Math.max(1, Math.round(num(entry.requiredLevel || 1))),
      commissionRate: Math.max(0, num(entry?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE)),
      commissionAmount: Math.max(
        0,
        Math.trunc(
          num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE)),
        ),
      ),
      totalCost: Math.max(
        1,
        Math.trunc(
          num(
            entry?.totalCost ||
            Math.max(1, Math.round(num(entry.price))),
          ),
        ),
      ),
      sellerPayout: Math.max(
        0,
        Math.trunc(
          num(
            entry?.sellerPayout ||
            (
              Math.max(1, Math.round(num(entry.price))) -
              Math.max(
                0,
                Math.trunc(num(entry?.commissionAmount || Math.floor(Math.max(1, Math.round(num(entry.price))) * VEHICLE_MARKET_COMMISSION_RATE))),
              )
            ),
          ),
        ),
      ),
      capacity: Math.max(1, Math.round(num(entry.capacity || 1))),
      upkeep: Math.max(1, Math.round(num(entry.upkeepPerRun || 1))),
      isMine: true,
    }))
    .sort(
      (a, b) =>
        new Date(String(b?.listedAt || '')).getTime() -
        new Date(String(a?.listedAt || '')).getTime(),
    )
  const detailVehicles = sortByVehicleIncomeDesc(selectedBusiness?.vehicles || [])
  const detailVehicleIdSet = new Set(detailVehicles.map((vehicle) => String(vehicle?.id || '').trim()))
  const listedDetailVehicles = selectedMyListings
    .map((vehicle) => ({
      ...vehicle,
      id: String(vehicle?.vehicleId || vehicle?.id || '').trim() || String(vehicle?.id || '').trim(),
      isListed: true,
      listingId: String(vehicle?.id || '').trim(),
      requiredLevel: Math.max(1, Math.trunc(num(vehicle?.requiredLevel || 1))),
      rentPerHour: Math.max(1, Math.trunc(num(vehicle?.rentPerHour || 0))),
      xp: Math.max(1, Math.trunc(num(vehicle?.xp || 0))),
      tier: ['standard', 'rare', 'luxury'].includes(String(vehicle?.tier || '').trim())
        ? String(vehicle?.tier || '').trim()
        : 'standard',
    }))
    .filter((vehicle) => String(vehicle.id || '').trim() && !detailVehicleIdSet.has(String(vehicle.id || '').trim()))
  const detailVehiclesView = [...detailVehicles, ...listedDetailVehicles]
  const selectedCollectRemainingMs = remainingMsFromIso(selectedBusiness?.nextCollectAt || '', liveNowMs)
  const selectedOrderRemainingMs = remainingMsFromIso(selectedBusiness?.nextVehicleOrderAt || '', liveNowMs)
  const _selectedCollectCountdown = selectedCollectRemainingMs > 0 ? formatCollectionCountdown(selectedCollectRemainingMs) : 'Hazır'
  const selectedCollectCooldownLabel = selectedCollectRemainingMs > 0 ? formatCollectionCountdown(selectedCollectRemainingMs) : ''
  const selectedOrderCountdown = selectedOrderRemainingMs > 0 ? formatCountdownClock(selectedOrderRemainingMs) : 'Hazır'
  const selectedUnlockedModelLevel = Math.max(1, num(selectedBusiness?.vehicleOrderUnlockLevel || selectedBusiness?.level || 1))
  const unlockedModelLevelByTemplate = unlockedBusinesses.reduce((acc, entry) => {
    const templateId = String(entry?.templateId || '').trim()
    if (!templateId) return acc
    const unlockedLevel = Math.max(1, Math.trunc(num(entry?.vehicleOrderUnlockLevel || entry?.level || 1)))
    const previousLevel = Math.max(1, Math.trunc(num(acc[templateId] || 1)))
    acc[templateId] = Math.max(previousLevel, unlockedLevel)
    return acc
  }, {})
  const unlockedFleetTemplateIdSet = new Set(
    unlockedBusinesses
      .map((entry) => String(entry?.templateId || '').trim())
      .filter(Boolean),
  )
  const selectedHasCapacityForOrder = Boolean(selectedBusiness) &&
    num(selectedBusiness?.fleetCount) < num(selectedBusiness?.fleetCapacity)
  const selectedCollectLocked = Boolean(selectedBusiness) &&
    num(selectedBusiness?.fleetCount) > 0 &&
    selectedCollectRemainingMs > 0
  const selectedCanOrderNow = Boolean(selectedBusiness) &&
    selectedHasCapacityForOrder &&
    selectedOrderRemainingMs <= 0
  const logisticsOrderRemainingMs = remainingMsFromIso(
    logistics?.logisticsFleet?.summary?.nextTruckOrderAt || '',
    liveNowMs,
  )
  const logisticsOrderCountdown = logisticsOrderRemainingMs > 0
    ? formatCountdownClock(logisticsOrderRemainingMs)
    : 'Hazır'
  const logisticsUnlockedModelLevel = Math.max(
    1,
    num(
      logistics?.logisticsFleet?.summary?.truckOrderUnlockLevel ||
      logistics?.logisticsFleet?.summary?.vehicleOrderUnlockLevel ||
      logistics?.logisticsFleet?.summary?.level ||
      overview?.profile?.levelInfo?.level ||
      1,
    ),
  )
  const canOrderTruckNow = logistics?.logisticsFleet?.summary?.canOrderTruckNow === true
  const logisticsCollectRemainingMs = remainingMsFromIso(
    logistics?.collectPreview?.nextCollectAt || '',
    liveNowMs,
  )
  const logisticsCollectLocked =
    Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0))) > 0 &&
    logisticsCollectRemainingMs > 0
  const logisticsCollectCountdown = logisticsCollectRemainingMs > 0
    ? formatCollectionCountdown(logisticsCollectRemainingMs)
    : 'Hazır'
  const listingDraftLiveLifetime = listingDraft
    ? resolveVehicleLifetime(listingDraft, liveNowMs)
    : null
  const listingDraftIsListed = Boolean(listingDraft?.isListed)
  const listingDraftSafeListingId = String(listingDraft?.listingId || '').trim()
  const listingDraftCancelBusyKey = listingDraftSafeListingId
    ? `cancel-listing:${listingDraftSafeListingId}`
    : ''
  const logisticsViewIsDetail = logisticsScene === 'detail'
  const logisticsViewIsMarket = logisticsScene === 'market'
  const logisticsViewIsGallery = logisticsScene === 'gallery'
  const fleetHelpLabel = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'Tır Kiralama'
    : (selectedBusinessMeta?.label || selectedBusiness?.name || 'Kiralama İşletmesi')
  const fleetHelpUnit = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'tır'
    : (selectedBusinessMeta?.unitLabel || 'araç').toLowerCase()
  const fleetHelpSecondHandLabel = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'İkinci El Tır Pazarı'
    : (selectedBusinessMeta?.secondHandLabel || 'İkinci El Pazarı')
  const fleetHelpOrderLabel = logisticsViewIsDetail && businessScene === 'logistics'
    ? 'Sıfır Tır Siparişi'
    : (selectedBusinessMeta?.newOrderLabel || 'Sıfır Araba Siparişi')
  const logisticsScreenSectionTitle = logisticsViewIsGallery
    ? 'Sıfır Tır Siparişi'
    : logisticsViewIsMarket
      ? 'İkinci El Tır Pazarı'
      : 'Tır Kiralama'
  const unlockedTemplateIds = Array.isArray(companyUnlock.unlockedFleetTemplates)
    ? companyUnlock.unlockedFleetTemplates
    : []
  const companyLevel = Math.max(1, Math.trunc(num(companyUnlock.companyLevel || 1)))
  const companyBusinessCount = unlockedBusinesses.length + (logisticsUnlocked ? 1 : 0)
  const companyBootstrapped = companyBusinessCount > 0
  const companyBusinessLimit = Math.max(3, Math.trunc(num(companyUnlockFlowRaw.length || 3)))
  const upgradeAnchorBusinessId = selectedBusiness?.id || businesses[0]?.id || ''
  const walletNow = Math.max(0, Math.trunc(num(overview?.profile?.wallet || 0)))
  const marketDetailLiveLifetime = marketDetailDraft
    ? resolveVehicleLifetime(marketDetailDraft, liveNowMs)
    : null
  const marketDetailTemplateId = String(marketDetailDraft?.templateId || '').trim()
  const marketDetailRequiredLevel = Math.max(
    1,
    Math.trunc(num(marketDetailDraft?.marketLevel || marketDetailDraft?.requiredLevel || 1)),
  )
  const marketDetailIsLogistics = marketDetailTemplateId === 'logistics'
  const marketDetailHasBusinessAccess = marketDetailIsLogistics
    ? logisticsUnlocked
    : unlockedFleetTemplateIdSet.has(marketDetailTemplateId)
  const marketDetailLevelCurrent = marketDetailIsLogistics
    ? playerLevelNow
    : Math.max(1, Math.trunc(num(unlockedModelLevelByTemplate[marketDetailTemplateId] || 1)))
  const marketDetailLevelCurrentLabel = marketDetailIsLogistics
    ? 'Oyuncu Seviyen'
    : 'Açılan Model Seviyen'
  const marketDetailBusinessLabel = marketDetailIsLogistics
    ? 'Tır Kiralama'
    : (FLEET_CARD_META[marketDetailTemplateId]?.label || 'İşletme')
  const marketDetailCanBuyByLevel = marketDetailRequiredLevel <= marketDetailLevelCurrent
  const marketDetailPrice = Math.max(1, Math.trunc(num(marketDetailDraft?.marketPrice || marketDetailDraft?.price || 0)))
  const marketDetailCommissionRate = Math.max(
    0,
    num(marketDetailDraft?.commissionRate || VEHICLE_MARKET_COMMISSION_RATE),
  )
  const marketDetailCommissionAmount = Math.max(
    0,
    Math.trunc(
      num(
        marketDetailDraft?.commissionAmount ||
        Math.floor(marketDetailPrice * marketDetailCommissionRate),
      ),
    ),
  )
  const marketDetailTotalCost = Math.max(
    marketDetailPrice,
    Math.trunc(
      num(
        marketDetailDraft?.totalCost ||
        marketDetailPrice,
      ),
    ),
  )
  const marketDetailSellerPayout = Math.max(
    0,
    Math.trunc(
      num(
        marketDetailDraft?.sellerPayout ||
        (marketDetailPrice - marketDetailCommissionAmount),
      ),
    ),
  )
  const marketDetailCanAfford = walletNow >= marketDetailTotalCost
  const _marketDetailCanBuyNow = Boolean(marketDetailDraft) &&
    marketDetailHasBusinessAccess &&
    marketDetailCanBuyByLevel &&
    marketDetailCanAfford
  const marketDetailAssetMeta = marketAssetLabel(marketDetailTemplateId)
  const soldListingRowsAll = (overview?.profile?.transactions || [])
    .filter((entry) => String(entry?.kind || '').trim() === 'vehicle_market_sell')
  const matchesSoldTemplate = (entry, templateId) => {
    const safeTemplateId = String(templateId || '').trim()
    if (!safeTemplateId) return true
    const detail = String(entry?.detail || '').toLocaleLowerCase('tr-TR')
    if (!detail) return false
    if (safeTemplateId === 'logistics') {
      return detail.includes('[kategori: tır]') || detail.includes(' tır ')
    }
    if (safeTemplateId === 'moto-rental') {
      return (
        detail.includes('[kategori: motor]') ||
        detail.includes(' motosiklet ') ||
        detail.includes(' motor ') ||
        detail.includes(' araç ')
      )
    }
    if (safeTemplateId === 'auto-rental') {
      return (
        detail.includes('[kategori: araba]') ||
        detail.includes(' araba ') ||
        detail.includes(' araç ')
      )
    }
    if (safeTemplateId === 'property-rental') {
      return (
        detail.includes('[kategori: mülk]') ||
        detail.includes('[kategori: mulk]') ||
        detail.includes(' mülk ') ||
        detail.includes(' mulk ') ||
        detail.includes(' daire ') ||
        detail.includes(' villa ') ||
        detail.includes(' ofis ')
      )
    }
    return true
  }
  const selectedSoldListingRows = soldListingRowsAll
    .filter((entry) => matchesSoldTemplate(entry, selectedBusiness?.templateId))
    .slice(0, 8)
  const logisticsSoldListingRows = soldListingRowsAll
    .filter((entry) => matchesSoldTemplate(entry, 'logistics'))
    .slice(0, 8)
  const fallbackUnlockFlow = [
    { key: 'moto-rental', kind: 'fleet', name: 'Motor Kiralama', cost: 500000, requiredLevel: 1, requiredCompanyLevel: 1 },
    { key: 'auto-rental', kind: 'fleet', name: 'Araba Kiralama', cost: 1000000, requiredLevel: 1, requiredCompanyLevel: 2 },
    { key: 'logistics', kind: 'logistics', name: 'Tır Kiralama', cost: 3000000, requiredLevel: 1, requiredCompanyLevel: 3 },
    { key: 'property-rental', kind: 'fleet', name: 'Mülk Kiralama', cost: 12000000, requiredLevel: 1, requiredCompanyLevel: 4 },
  ]
  const unlockFlowSource = companyUnlockFlowRaw.length ? companyUnlockFlowRaw : fallbackUnlockFlow
  const setupBusinessRows = unlockFlowSource.map((entry, index) => {
    const safeKey = String(entry?.key || '').trim()
    const unlocked = entry?.unlocked === true || (
      safeKey === 'logistics'
        ? logisticsUnlocked
        : unlockedTemplateIds.includes(safeKey)
    )
    const previousUnlocked = index === 0
      ? true
      : unlockFlowSource.slice(0, index).every((prev) => {
        const prevKey = String(prev?.key || '').trim()
        return prev?.unlocked === true || (
          prevKey === 'logistics'
            ? logisticsUnlocked
            : unlockedTemplateIds.includes(prevKey)
        )
      })
    const cost = Math.max(1, Math.trunc(num(entry?.cost || 0)))
    const requiredLevel = 1
    const requiredCompanyLevel = Math.max(1, Math.trunc(num(entry?.requiredCompanyLevel ?? (index + 1))))
    const missingCash = Math.max(0, Math.trunc(num(entry?.missingCash ?? (cost - walletNow))))
    const missingLevel = 0
    const missingCompanyLevel = Math.max(0, Math.trunc(num(entry?.missingCompanyLevel ?? (requiredCompanyLevel - companyLevel))))
    const isNextUnlock = String(nextCompanyUnlock?.key || '').trim() === safeKey
    const canUnlockNow =
      entry?.canUnlockNow === true ||
      (!unlocked && previousUnlocked && missingCompanyLevel <= 0 && missingCash <= 0 && missingLevel <= 0 && isNextUnlock)
    let lockReason = String(entry?.lockReason || '').trim()
    if (!lockReason) {
      if (unlocked) {
        lockReason = 'Durum: Açık'
      } else if (!previousUnlocked) {
        const previousName = BUSINESS_UNLOCK_LABEL_BY_KEY[String(unlockFlowSource[index - 1]?.key || '').trim()] || unlockFlowSource[index - 1]?.name || 'Önceki alan'
        lockReason = `Önce ${previousName} açılmalı.`
      } else if (missingCompanyLevel > 0) {
        lockReason = `İşletme seviyesi yetersiz. Gereken seviye: ${fmt(requiredCompanyLevel)}.`
      } else if (missingCash > 0) {
        lockReason = `Nakit yetersiz. Gereken tutar: ${fmt(cost)}.`
      } else {
        lockReason = 'Açılmaya hazır.'
      }
    }
    return {
      key: safeKey,
      title: BUSINESS_UNLOCK_LABEL_BY_KEY[safeKey] || String(entry?.name || 'İşletme Alanı'),
      description: safeKey === 'moto-rental'
        ? 'Motor kiralama ve ikinci el operasyonları.'
        : safeKey === 'auto-rental'
          ? 'Araba kiralama ve filo yönetimi.'
          : safeKey === 'property-rental'
            ? 'Mülk kiralama ve portföy yönetimi.'
            : 'Tır kiralama, sevkiyat ve lojistik yönetimi.',
      icon: BUSINESS_UNLOCK_ICON_BY_KEY[safeKey] || '',
      unlocked,
      previousUnlocked,
      isNextUnlock,
      canUnlockNow,
      cost,
      requiredLevel,
      requiredCompanyLevel,
      missingCash,
      missingLevel,
      missingCompanyLevel,
      lockReason,
      order: index + 1,
    }
  })
  const setupPendingRows = setupBusinessRows.filter((entry) => !entry.unlocked)
  const setupVisibleRows = setupPendingRows.slice(0, 1)
  const nextUnlockRequiredCompanyLevel = Math.max(1, Math.trunc(num(nextCompanyUnlock?.requiredCompanyLevel || 0)))
  const nextUnlockMissingCompanyLevel = nextCompanyUnlock
    ? Math.max(0, nextUnlockRequiredCompanyLevel - companyLevel)
    : 0
  const mustBuyNextUnlockFirst = Boolean(nextCompanyUnlock) && nextUnlockMissingCompanyLevel <= 0
  const canUpgradeBusinessLevel =
    Boolean(companyUpgrade) &&
    !companyUpgrade.maxReached &&
    num(companyUpgrade?.missingCash || 0) <= 0 &&
    !mustBuyNextUnlockFirst
  const upgradeCurrentLevel = Math.max(1, Math.trunc(num(companyUpgrade?.companyLevel || companyLevel)))
  const upgradeNextLevel = companyUpgrade?.maxReached
    ? upgradeCurrentLevel
    : Math.max(upgradeCurrentLevel + 1, Math.trunc(num(companyUpgrade?.nextLevel || (upgradeCurrentLevel + 1))))
  const upgradeMissingCashValue = companyUpgrade?.maxReached
    ? 0
    : Math.max(0, Math.trunc(num(companyUpgrade?.missingCash || 0)))
  const upgradeCostValue = companyUpgrade?.maxReached
    ? 0
    : Math.max(0, Math.trunc(num(companyUpgrade?.cost || 0)))
  const upgradeMaxLevel = Math.max(
    upgradeCurrentLevel,
    upgradeNextLevel,
    unlockFlowSource.reduce(
      (max, entry) => Math.max(max, Math.max(1, Math.trunc(num(entry?.requiredCompanyLevel || 1)))),
      1,
    ),
  )
  const upgradeProgressPercent = clamp(
    Math.round((upgradeCurrentLevel / Math.max(1, upgradeMaxLevel)) * 100),
    0,
    100,
  )
  const upgradeStatusLabel = companyUpgrade?.maxReached
    ? 'Maksimum Seviye'
    : mustBuyNextUnlockFirst
      ? 'Önce İş Kur'
      : upgradeMissingCashValue > 0
        ? 'Nakit Yetersiz'
        : 'Yükseltmeye Hazır'
  const logisticsTruckCount = Math.max(0, Math.trunc(num(logistics?.logisticsFleet?.summary?.truckCount || 0)))
  const logisticsTotalCapacityNow = Math.max(
    0,
    Math.trunc(num(
      logistics?.logisticsFleet?.summary?.totalCapacity
      || (logistics?.logisticsFleet?.owned || []).reduce(
        (sum, truck) => sum + Math.max(0, num(truck?.capacity || 0)),
        0,
      ),
    )),
  )
  const activeBusinessCards = [
    ...unlockedBusinesses.map((entry) => {
      const fleetCount = Math.max(0, Math.trunc(num(entry?.fleetCount || 0)))
      const collectRemainingMs = remainingMsFromIso(entry?.nextCollectAt || '', liveNowMs)
      const collectCountdown = collectRemainingMs > 0 ? formatCollectionCountdown(collectRemainingMs) : 'Hazır'
      return {
        id: entry.id,
        kind: 'fleet',
        templateId: String(entry?.templateId || '').trim(),
        name: FLEET_CARD_META[entry.templateId]?.label || entry.name,
        image: entry.heroImage || resolveVehicleImage(entry.vehicles?.[0], entry.templateId) || '',
        icon: FLEET_CARD_META[entry.templateId]?.fallback || '?',
        actionLabel: 'Giriş',
        timerLabel: fleetCount > 0 ? `Tahsilat: ${collectCountdown}` : '',
      }
    }),
    ...(logisticsUnlocked ? [{
      id: 'logistics-center',
      kind: 'logistics',
      templateId: 'logistics',
      name: 'Tır Kiralama',
      image: '/home/icons/businesses/lojistik-kiralama.webp',
      icon: 'TIR',
      actionLabel: 'Giriş',
      timerLabel: logisticsTruckCount > 0 ? `Tahsilat: ${logisticsCollectCountdown}` : '',
    }] : []),
  ]
    .sort((left, right) => {
      const order = ['moto-rental', 'auto-rental', 'logistics', 'property-rental']
      const leftIndex = order.indexOf(String(left?.templateId || '').trim())
      const rightIndex = order.indexOf(String(right?.templateId || '').trim())
      const safeLeft = leftIndex === -1 ? order.length : leftIndex
      const safeRight = rightIndex === -1 ? order.length : rightIndex
      if (safeLeft !== safeRight) return safeLeft - safeRight
      return String(left?.name || '').localeCompare(String(right?.name || ''), 'tr')
    })
  const chartItem = (market?.items || []).find((item) => item.id === chartItemId) || (market?.items || [])[0]
  const chartPoints = chartItem ? history[chartItem.id] || [] : []
  const cWallet = useTicker(overview?.profile?.wallet || 0)
  const cGold = useTicker(overview?.profile?.reputation || 0)
  const netWorthBreakdown = overview?.profile?.netWorthBreakdown || {}
  const bankSnapshot = bankState && typeof bankState === 'object' ? bankState : {}
  const bankWalletNow = Math.max(0, Math.trunc(num(bankSnapshot.wallet ?? overview?.profile?.wallet ?? 0)))
  const bankMainBalance = Math.max(
    0,
    Math.trunc(num(bankSnapshot.bank ?? netWorthBreakdown.bank ?? overview?.profile?.bank ?? 0)),
  )
  const bankTransferMinAmount = Math.max(1, Math.trunc(num(bankSnapshot.minTransferAmount || 1)))
  const bankDepositFeeRate = clamp(num(bankSnapshot.depositFeeRate ?? 0.05), 0, 0.99)
  const bankDepositFeeRatePctLabel = roundTo(bankDepositFeeRate * 100, 2)
  const bankWithdrawFeeRate = clamp(num(bankSnapshot.withdrawFeeRate ?? 0), 0, 0.99)
  const bankTermRateCapPct = Math.max(1, Math.trunc(num(bankSnapshot.termRateCapPct || 10)))
  const bankTermOptions = Array.isArray(bankSnapshot.termOptions) && bankSnapshot.termOptions.length
    ? bankSnapshot.termOptions
      .map((entry) => ({
        days: Math.max(1, Math.trunc(num(entry?.days || 1))),
        dailyRatePct: Math.max(0, num(entry?.dailyRatePct || 0)),
        totalRatePct: clamp(
          num(
            entry?.totalRatePct ??
            (num(entry?.dailyRatePct || 0) * Math.max(1, Math.trunc(num(entry?.days || 1)))),
          ),
          0,
          bankTermRateCapPct,
        ),
      }))
      .sort((left, right) => left.days - right.days)
    : [
      { days: 1, dailyRatePct: 2, totalRatePct: 2 },
      { days: 2, dailyRatePct: 3, totalRatePct: 6 },
      { days: 3, dailyRatePct: 3, totalRatePct: 9 },
      { days: 4, dailyRatePct: 3, totalRatePct: 10 },
    ]
  const bankSelectedTermDays = Math.max(
    1,
    Math.trunc(
      num(
        bankForm.termDays ||
        bankTermOptions[0]?.days ||
        1,
      ),
    ),
  )
  const bankSelectedTerm = bankTermOptions.find((entry) => entry.days === bankSelectedTermDays) || bankTermOptions[0]
  const bankTermDailyRatePct = Math.max(0, num(bankSelectedTerm?.dailyRatePct || 0))
  const bankTermTotalRatePct = Math.max(0, num(bankSelectedTerm?.totalRatePct || (bankTermDailyRatePct * bankSelectedTermDays)))
  const bankTermLive = bankSnapshot?.term && typeof bankSnapshot.term === 'object'
    ? bankSnapshot.term
    : {
      active: false,
      principal: 0,
      expectedPayout: 0,
      days: 0,
      dailyRatePct: 0,
      unlockAt: '',
      openedAt: '',
      matured: false,
    }
  const bankTermRemainingLiveMs = bankTermLive.active
    ? Math.max(0, Math.trunc(num(bankTermLive.remainingMs || 0)))
    : 0
  const bankTermMatured = Boolean(bankTermLive.active) && (
    Boolean(bankTermLive.matured)
    || bankTermRemainingLiveMs <= 0
  )
  const bankTermCountdownLabel = bankTermLive.active
    ? (bankTermMatured ? 'Vade doldu' : formatCountdownWithDaysTr(bankTermRemainingLiveMs))
    : '--'
  const bankHistoryRows = Array.isArray(bankSnapshot.history) ? bankSnapshot.history : []
  const bankDepositInputDigits = String(bankForm.depositAmount || '').replace(/[^\d]/g, '')
  const bankWithdrawInputDigits = String(bankForm.withdrawAmount || '').replace(/[^\d]/g, '')
  const bankTermInputDigits = String(bankForm.termAmount || '').replace(/[^\d]/g, '')
  const bankDepositAmount = Math.max(0, Math.trunc(num(bankDepositInputDigits || 0)))
  const bankWithdrawAmount = Math.max(0, Math.trunc(num(bankWithdrawInputDigits || 0)))
  const bankTermAmount = Math.max(0, Math.trunc(num(bankTermInputDigits || 0)))
  const bankTermMaxPrincipal = Math.max(
    bankTransferMinAmount,
    Math.trunc(num(bankSnapshot.termMaxPrincipal || 200000000)),
  )
  const bankTermMaxAllowedNow = Math.max(0, Math.min(bankMainBalance, bankTermMaxPrincipal))
  const bankDepositFeePreview = Math.max(0, Math.floor(bankDepositAmount * bankDepositFeeRate))
  const bankDepositNetPreview = Math.max(0, bankDepositAmount - bankDepositFeePreview)
  const bankWithdrawFeePreview = Math.max(0, Math.floor(bankWithdrawAmount * bankWithdrawFeeRate))
  const bankWithdrawNetPreview = Math.max(0, bankWithdrawAmount - bankWithdrawFeePreview)
  const bankTermPayoutPreview = bankTermAmount > 0
    ? Math.max(
      bankTermAmount,
      Math.floor(bankTermAmount * (1 + (bankTermTotalRatePct / 100))),
    )
    : 0
  const bankTermProfitPreview = Math.max(0, bankTermPayoutPreview - bankTermAmount)
  const bankBusyDepositKey = 'bank-deposit'
  const bankBusyWithdrawKey = 'bank-withdraw'
  const bankBusyTermOpenKey = 'bank-term-open'
  const bankBusyTermClaimKey = 'bank-term-claim'
  const bankTermLivePrincipal = Math.max(0, Math.trunc(num(bankTermLive.principal || 0)))
  const bankTermLiveExpectedPayout = Math.max(0, Math.trunc(num(bankTermLive.expectedPayout || bankTermLivePrincipal)))
  const bankTermLiveEstimatedProfit = Math.max(
    0,
    Math.trunc(num(bankTermLive.estimatedProfit || (bankTermLiveExpectedPayout - bankTermLivePrincipal))),
  )
  const bankTermLiveTotalRatePct = Math.max(
    0,
    Math.min(
      bankTermRateCapPct,
      num(
        bankTermLive.totalRatePct ||
        (num(bankTermLive.dailyRatePct || 0) * Math.max(0, Math.trunc(num(bankTermLive.days || 0)))),
      ),
    ),
  )
  const bankTotalAssetsNow = Math.max(0, bankWalletNow + bankMainBalance + bankTermLivePrincipal)
  const bankDepositSubmitBlocked = (
    Boolean(busy)
    || bankDepositAmount < bankTransferMinAmount
    || bankDepositAmount > bankWalletNow
  )
  const bankWithdrawSubmitBlocked = (
    Boolean(busy)
    || bankWithdrawAmount < bankTransferMinAmount
    || bankWithdrawAmount > bankMainBalance
  )
  const bankTermOpenSubmitBlocked = (
    Boolean(busy)
    || Boolean(bankTermLive.active)
    || bankTermAmount < bankTransferMinAmount
    || bankTermAmount > bankMainBalance
    || bankTermAmount > bankTermMaxPrincipal
  )
  const bankTermClaimSubmitBlocked = Boolean(busy) || !bankTermLive.active || !bankTermMatured
  const bankTermOpenedAtLabel = bankTermLive.active ? formatDateTime(bankTermLive.openedAt || '') : '-'
  const bankTermUnlockAtLabel = bankTermLive.active ? formatDateTime(bankTermLive.unlockAt || '') : '-'
  const bankTermStatusLabel = bankTermLive.active
    ? (bankTermMatured ? 'Tahsile Hazır' : 'Aktif Vade')
    : 'Aktif Vade Yok'
  const levelProgress = clamp(lv.progressPercent || 0, 0, 100)
  const premiumInfo = overview?.premium || {}
  const premiumStatus = overview?.profile?.premium || premiumInfo || {}
  const premiumActive = Boolean(premiumInfo.active ?? premiumStatus.active)
  const selfBadge = roleBadgeMeta(role, premiumActive, selfRoleLabel, overview?.profile?.seasonBadge || null)
  const premiumUntil = String(premiumInfo.until || premiumStatus.until || '').trim()
  const premiumMultiplier = Math.max(1, Math.trunc(num(premiumInfo.bulkMultiplier || premiumStatus.bulkMultiplier || 2)))
  const premiumBoostActive = premiumActive && premiumMultiplier > 1
  const premiumPlans = Array.isArray(premiumInfo.plans) ? premiumInfo.plans : []
  const premiumDiamond = Math.max(0, Math.trunc(num(overview?.profile?.reputation || 0)))
  const diamondStoreState = overview?.profile?.diamondStore || {}
  const welcomePackPurchased = Boolean(diamondStoreState?.welcomePackPurchased)
  const diamondMarketPackages = DIAMOND_CASH_PACKAGES.filter(
    (pack) => !(pack?.welcomeOnly && welcomePackPurchased),
  )
  const defaultPremiumPlans = [
    { id: 'premium-7', days: 7, price: 100, label: '7 Gün' },
    { id: 'premium-14', days: 14, price: 180, label: '14 Gün' },
    { id: 'premium-32', days: 32, price: 360, label: '32 Gün' },
    { id: 'premium-365', days: 365, price: 2400, label: '365 Gün' },
  ]
  const premiumRemainingMs = premiumActive && premiumUntil ? remainingMsFromIso(premiumUntil, liveNowMs) : 0
  const premiumCountdownLabel = premiumActive && premiumRemainingMs > 0
    ? formatLifetimeDetailedTr(premiumRemainingMs)
    : premiumActive
      ? 'Süre bilgisi bekleniyor'
      : ''
  const resolvedPremiumPlans = premiumPlans.length ? premiumPlans : defaultPremiumPlans
  const premiumPlanList = [...resolvedPremiumPlans].sort((a, b) => num(a?.days) - num(b?.days))
  const premiumBestValuePlan = premiumPlanList.reduce((best, plan) => {
    const days = Math.max(1, Math.trunc(num(plan?.days || 1)))
    const price = Math.max(0, Math.trunc(num(plan?.price || 0)))
    const perDay = price / days
    if (!best || perDay < best.perDay) return { id: String(plan?.id || ''), label: String(plan?.label || `${days} Gün`), perDay }
    return best
  }, null)
  const dailyResetRemainingMs = remainingMsFromIso(dailyStore.nextResetAt || '', liveNowMs)
  const dailyResetLabel = dailyResetRemainingMs > 0 ? formatCountdownClock(dailyResetRemainingMs) : '00:00:00'
  const dailyResetInfoLabel = 'Türkiye saatine göre her 12 saatte bir (00:00 / 12:00) yenilenir'
  const dailyLoginState = dailyLoginReward || DAILY_LOGIN_STATE_SEED
  const dailyLoginSeriesLabel = String(dailyLoginState?.series?.label || `0/${DAILY_LOGIN_TOTAL_DAYS}`)
  const dailyLoginCanClaim = Boolean(dailyLoginState?.canClaim) && !dailyLoginState?.claimedToday
  const dailyLoginNextResetMs = remainingMsFromIso(dailyLoginState?.nextResetAt || '', liveNowMs)
  const dailyLoginNextResetLabel = dailyLoginNextResetMs > 0 ? formatCountdownClock(dailyLoginNextResetMs) : '00:00:00'
  const dailyLoginDayRows = Array.isArray(dailyLoginState?.days) ? dailyLoginState.days : []
  const dailyLoginLoaded = dailyLoginDayRows.length > 0
  const dailyLoginQuickStatus = !dailyLoginLoaded
    ? 'Günlük ödül bilgisi yükleniyor...'
    : dailyLoginCanClaim
      ? 'Bugünkü ödül seni bekliyor'
      : `Bugünkü ödül alındı · ${dailyLoginNextResetLabel}`
  const dailyLoginTopStripVisible = tab === 'home' && dailyLoginCanClaim
  const dailyLoginClaimBusy = busy === 'daily-login:claim'
  const dailyLoginClaimButtonLabel = dailyLoginCanClaim
    ? 'Ödülü Al'
    : 'Bugünkü Ödülü Aldın'
  const weeklyEventsState = normalizeWeeklyEventsPayload(
    overview?.events || business?.events || factories?.events || null,
  )
  const weekendLocalWindow = weeklyEventLocalWindow('weekend-xp', liveNowMs)
  const midweekLocalWindow = weeklyEventLocalWindow('midweek-discount', liveNowMs)
  const runtimeDayIndex = new Date(liveNowMs + TURKIYE_UTC_OFFSET_MS).getUTCDay()
  const runtimeDayName = String(WEEKLY_EVENT_DAY_LABELS[runtimeDayIndex] || weeklyEventsState.dayName || '').trim()
  const runtimeSchedule = (Array.isArray(weeklyEventsState.schedule) ? weeklyEventsState.schedule : []).map((entry) => {
    const dayIndexRaw = Math.trunc(num(entry?.dayIndex))
    const dayIndex = dayIndexRaw >= 0 && dayIndexRaw <= 6 ? dayIndexRaw : 0
    const eventType = String(entry?.eventType || 'standard').trim().toLowerCase()
    const isToday = dayIndex === runtimeDayIndex
    const isActive = isToday && (
      (eventType === 'xp' && weekendLocalWindow.active) ||
      (eventType === 'discount' && midweekLocalWindow.active)
    )
    return {
      ...entry,
      dayIndex,
      dayName: String(entry?.dayName || WEEKLY_EVENT_DAY_LABELS[dayIndex] || '').trim() || (WEEKLY_EVENT_DAY_LABELS[dayIndex] || ''),
      isToday,
      isActive,
    }
  })
  const runtimeXpMultiplier = weekendLocalWindow.active
    ? Math.max(1, Math.trunc(num(weeklyEventsState.xpMultiplier || 2)))
    : 1
  const runtimeCostMultiplier = midweekLocalWindow.active
    ? Math.max(0.01, num(weeklyEventsState.costMultiplier || 0.75))
    : 1
  const weeklyEventsRuntimeState = {
    ...weeklyEventsState,
    dayIndex: runtimeDayIndex,
    dayName: runtimeDayName || weeklyEventsState.dayName,
    schedule: runtimeSchedule,
    xpMultiplier: runtimeXpMultiplier,
    costMultiplier: runtimeCostMultiplier,
    weekendXp: {
      ...weeklyEventsState.weekendXp,
      active: weekendLocalWindow.active,
      endsAt: weekendLocalWindow.endsAt || weeklyEventsState.weekendXp.endsAt || '',
    },
    midweekDiscount: {
      ...weeklyEventsState.midweekDiscount,
      active: midweekLocalWindow.active,
      endsAt: midweekLocalWindow.endsAt || weeklyEventsState.midweekDiscount.endsAt || '',
    },
  }
  const weeklyEventsPrimary = weeklyEventsRuntimeState.weekendXp.active
    ? weeklyEventsRuntimeState.weekendXp
    : (weeklyEventsRuntimeState.midweekDiscount.active ? weeklyEventsRuntimeState.midweekDiscount : null)
  const weeklyEventsRemainingMs = weeklyEventsPrimary
    ? remainingMsFromIso(weeklyEventsPrimary.endsAt || '', liveNowMs)
    : 0
  const weeklyEventsRemainingLabel = weeklyEventsRemainingMs > 0
    ? formatCountdownWithDaysTr(weeklyEventsRemainingMs)
    : '0 gün 00 saat 00 dakika 00 saniye'
  const weeklyEventsStripVisible = tab === 'home' && Boolean(weeklyEventsPrimary)
  const weeklyEventsStripSubtitle = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Haftalık Etkinlik'} · ${weeklyEventsPrimary.bonusLabel || 'Etkinlik'}`
    : 'Haftalık takvimi görüntüle'
  const weeklyEventsStripCountdown = weeklyEventsPrimary
    ? `Kalan süre: ${weeklyEventsRemainingLabel}`
    : 'Etkinlik yok'
  const weeklyEventsHomeHint = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Etkinlik'} aktif`
    : 'Haftalık takvimi incele'
  const weeklyEventStatusCards = [
    {
      id: 'weekend-xp',
      kind: 'xp',
      active: weeklyEventsRuntimeState.weekendXp.active === true,
      title: String(weeklyEventsRuntimeState.weekendXp.title || 'Cumartesi-Pazar Tahsilat XP').trim() || 'Cumartesi-Pazar Tahsilat XP',
      description: String(weeklyEventsRuntimeState.weekendXp.description || '').trim(),
      effectLabel: '2x XP',
      windowLabel: 'Cuma 23:59 · Pazar 23:59',
      endsAt: String(weeklyEventsRuntimeState.weekendXp.endsAt || '').trim(),
    },
    {
      id: 'midweek-discount',
      kind: 'discount',
      active: weeklyEventsRuntimeState.midweekDiscount.active === true,
      title: String(weeklyEventsRuntimeState.midweekDiscount.title || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi').trim() || 'Salı-Çarşamba İşletme ve Fabrika Gider İndirimi',
      description: String(weeklyEventsRuntimeState.midweekDiscount.description || '').trim(),
      effectLabel: `-%${Math.max(0, Math.trunc(num(weeklyEventsRuntimeState.costDiscountPercent || 25)))} Gider`,
      windowLabel: 'Pazartesi 23:59 · Çarşamba 23:59',
      endsAt: String(weeklyEventsRuntimeState.midweekDiscount.endsAt || '').trim(),
    },
  ].map((entry) => {
    const remainingMs = entry.active ? remainingMsFromIso(entry.endsAt, liveNowMs) : 0
    const countdownLabel = entry.active
      ? (remainingMs > 0 ? formatCountdownWithDaysTr(remainingMs) : '0 gün 00 saat 00 dakika 00 saniye')
      : 'Etkinlik günü bekleniyor'
    return {
      ...entry,
      remainingMs,
      countdownLabel,
    }
  })
  const weeklyEventRangeCards = [
    {
      ...weeklyEventStatusCards.find((entry) => entry.id === 'midweek-discount'),
      id: 'midweek-discount-range',
      dayRange: 'Salı Çarşamba',
      subtitle: 'İşletme ve Fabrika Tahsilat Gider İndirimi',
      iconEmoji: '💰',
      timeWindow: 'Pazartesi 23:59 · Çarşamba 23:59',
      inactiveNote: 'Pazartesi 23:59 sonrası otomatik devreye girer.',
      rangeDays: [2, 3],
    },
    {
      ...weeklyEventStatusCards.find((entry) => entry.id === 'weekend-xp'),
      id: 'weekend-xp-range',
      dayRange: 'Cumartesi Pazar',
      subtitle: 'İşletme ve Fabrika XP',
      iconEmoji: '💰',
      timeWindow: 'Cuma 23:59 · Pazar 23:59',
      inactiveNote: 'Cuma 23:59 sonrası otomatik devreye girer.',
      rangeDays: [6, 0],
    },
  ]
    .filter((entry) => entry && entry.kind)
    .map((entry) => {
      const rangeDays = Array.isArray(entry.rangeDays) ? entry.rangeDays : []
      const todayInRange = entry.active || rangeDays.includes(runtimeDayIndex)
      return {
        ...entry,
        todayInRange,
        rangeBadge: todayInRange ? 'BUGÜN' : 'TAKVİM',
      }
    })
  const weeklyEventsTodaySummary = weeklyEventsPrimary
    ? `${weeklyEventsPrimary.title || 'Etkinlik'} · ${weeklyEventsPrimary.bonusLabel || 'Aktif'}`
    : 'Bugün aktif etkinlik bulunmuyor.'
  const weeklyEventsPrimaryWindowLabel = weeklyEventsPrimary
    ? (weeklyEventsPrimary.id === 'weekend-xp' ? 'Cuma 23:59 · Pazar 23:59' : 'Pazartesi 23:59 · Çarşamba 23:59')
    : ''
  const weeklyEventsTodayDetail = weeklyEventsPrimary
    ? `Zaman: ${weeklyEventsPrimaryWindowLabel} · Kalan süre: ${weeklyEventsRemainingLabel}`
    : 'Sonraki etkinlikler takvime göre otomatik başlar.'
  const cityAnnouncements = (Array.isArray(overview?.announcements) ? overview.announcements : [])
    .map((entry) => {
      const id = String(entry?.id || '').trim()
      const title = String(entry?.title || 'Duyuru').trim() || 'Duyuru'
      const body = String(entry?.body || '').replace(/\r/g, '').trim()
      const typeMeta = announcementTypeMeta(entry?.announcementType ?? entry?.type ?? entry?.announcementTag)
      if (!id) return null
      return {
        id,
        title,
        body: body || title,
        announcementType: typeMeta.type,
        announcementTag: typeMeta.label,
        createdAt: String(entry?.createdAt || '').trim(),
        createdByUsername: String(entry?.createdByUsername || 'Yönetim').trim() || 'Yönetim',
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(String(left?.createdAt || ''))
      const rightTime = Date.parse(String(right?.createdAt || ''))
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
        return rightTime - leftTime
      }
      if (Number.isFinite(rightTime) && !Number.isFinite(leftTime)) return 1
      if (Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return -1
      return String(right?.id || '').localeCompare(String(left?.id || ''), 'tr')
    })
    .slice(0, 30)
  const activeWeeklyEventStatusCards = weeklyEventStatusCards.filter((entry) => entry.active)
  const renderWeeklyEventInlineCard = (surfaceLabel = 'Haftalık Etkinlikler') => {
    if (activeWeeklyEventStatusCards.length <= 0) return null
    return (
      <article className="weekly-event-inline-card" aria-live="polite">
        <div className="weekly-event-inline-head">
          <strong>Aktif Etkinlik Takibi</strong>
          <small>{surfaceLabel}</small>
        </div>
        <div className="weekly-event-inline-grid">
          {activeWeeklyEventStatusCards.map((entry) => (
            <article
              key={`${surfaceLabel}-${entry.id}`}
              className={`weekly-event-inline-item ${entry.kind === 'xp' ? 'is-xp' : 'is-discount'} is-active`.trim()}
            >
              <p className="weekly-event-inline-title">{entry.title}</p>
              <p className="weekly-event-inline-effect">{entry.effectLabel}</p>
              <p className="weekly-event-inline-desc">{entry.description || 'Etkinlik açıklaması bulunmuyor.'}</p>
              <small className="weekly-event-inline-window">{entry.windowLabel || ''}</small>
              <small className="weekly-event-inline-countdown">Kalan: {entry.countdownLabel}</small>
            </article>
          ))}
        </div>
      </article>
    )
  }

  useEffect(() => {
    if (!dailyLoginState?.claimedToday) {
      dailyLoginResetSyncKeyRef.current = ''
      return
    }
    if (dailyLoginNextResetMs > 0) return
    const syncKey = String(dailyLoginState?.nextResetAt || '').trim()
    if (!syncKey || dailyLoginResetSyncKeyRef.current === syncKey) return
    dailyLoginResetSyncKeyRef.current = syncKey
    void loadDailyLoginRewardState().catch(() => {
      dailyLoginResetSyncKeyRef.current = ''
    })
  }, [
    dailyLoginState?.claimedToday,
    dailyLoginState?.nextResetAt,
    dailyLoginNextResetMs,
    loadDailyLoginRewardState,
  ])
  const walletCashValue = fmt(cWallet)
  const walletGoldValue = fmt(cGold)
  const currentLevelXpBig = (() => {
    const parsed = toBigIntOrNull(lv.currentXp)
    if (parsed === null || parsed < 0n) return 0n
    return parsed
  })()
  const nextLevelXpBig = (() => {
    const parsed = toBigIntOrNull(lv.nextLevelXp)
    if (parsed === null || parsed < currentLevelXpBig) return currentLevelXpBig
    return parsed
  })()
  const xpToNextLevelBig = nextLevelXpBig - currentLevelXpBig
  const xpToNextLevelValue = formatBigIntTr(xpToNextLevelBig)
  const walletCashClass = metricLengthClass(walletCashValue)
  const walletGoldClass = metricLengthClass(walletGoldValue)
  const avatar = profile?.profile?.avatar || overview?.profile?.avatar || { url: '', type: 'default' }
  const avatarSrc = String(avatar.url || DEFAULT_CHAT_AVATAR).trim() || DEFAULT_CHAT_AVATAR
  const avatarLoadError = avatarFailedSrc === avatarSrc
  const avatarDisplaySrc = avatarLoadError ? DEFAULT_CHAT_AVATAR : avatarSrc
  const avatarIsGif = isGifUrl(avatarDisplaySrc)
  const avatarTypeLabel =
    avatar.type === 'upload' ? 'Yüklenen Görsel' : avatar.type === 'url' ? 'Harici Bağlantı' : 'Varsayılan'
  const profileAccountUsername =
    String(profileOverviewUsername || '').trim() ||
    String(user?.username || '').trim() ||
    'Oyuncu'
  const selectedThemeOption =
    PROFILE_THEME_OPTIONS.find((entry) => entry.id === navTheme) || PROFILE_THEME_OPTIONS[0]
  const supportTitleLength = String(supportForm.title || '').length
  const supportDescriptionLength = String(supportForm.description || '').length
  const accountEmail = String(user?.email || '').trim() || '-'
  const accountLastLoginAt = formatDateTime(user?.lastLoginAt || '', { includeWeekday: true })
  const accountUserId = String(user?.id || overview?.profile?.userId || '-')
  const maskedAccountId =
    accountUserId && accountUserId !== '-'
      ? `${accountUserId.slice(0, 8)}...${accountUserId.slice(-6)}`
      : '-'
  const openProfileModal = useCallback((targetUserId, options = {}) => {
    const safeUserId = String(targetUserId || '').trim()
    if (!safeUserId) return false

    const isSelfTarget = Boolean(user?.id) && safeUserId === String(user.id)
    if (options?.disallowSelf && isSelfTarget) {
      const blockedMessage = String(options?.selfBlockedMessage || '').trim()
      if (blockedMessage) {
        setError(blockedMessage)
      }
      return false
    }

    const parseProfileLevel = (value) => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return null
      return Math.max(1, Math.trunc(parsed))
    }

    let previewProfile = null

    if (isSelfTarget) {
      const selfProfile = overview?.profile && typeof overview.profile === 'object'
        ? overview.profile
        : {}
      const selfUsername = String(selfProfile?.username || user?.username || '').trim()
      const selfDisplayName = String(selfProfile?.displayName || selfUsername).trim()
      const selfAvatarUrl = String(selfProfile?.avatar?.url || user?.avatarUrl || '').trim()
      const selfLevel = parseProfileLevel(selfProfile?.levelInfo?.level || selfProfile?.level || options?.level)

      previewProfile = {
        ...selfProfile,
        userId: safeUserId,
        username: selfUsername || 'Oyuncu',
        displayName: selfDisplayName || selfUsername || 'Oyuncu',
        avatar: {
          ...(selfProfile?.avatar && typeof selfProfile.avatar === 'object' ? selfProfile.avatar : {}),
          url: selfAvatarUrl || '/splash/logo.png',
        },
        levelInfo: selfLevel ? { level: selfLevel } : selfProfile?.levelInfo,
        role,
        roleLabel: selfRoleLabel,
        seasonBadge: selfProfile?.seasonBadge || options?.seasonBadge || null,
        premium: {
          ...(selfProfile?.premium && typeof selfProfile.premium === 'object' ? selfProfile.premium : {}),
          active: Boolean(premiumActive || selfProfile?.premium?.active),
        },
      }
    } else {
      const username = String(options?.username || '').trim()
      const displayName = String(options?.displayName || username).trim()
      const avatarUrl = String(options?.avatarUrl || '').trim()
      const levelValue = parseProfileLevel(options?.level)
      const roleValue = normalizeRoleValue(options?.role || 'player')

      previewProfile = {
        userId: safeUserId,
        username,
        displayName: displayName || username || 'Oyuncu',
        avatar: avatarUrl ? { url: avatarUrl } : { url: '/splash/logo.png' },
        levelInfo: levelValue ? { level: levelValue } : undefined,
        role: roleValue,
        roleLabel: String(options?.roleLabel || roleLabelFromValue(roleValue)).trim(),
        seasonBadge: options?.seasonBadge || null,
        premium: {
          active: Boolean(options?.premium),
        },
      }
    }

    setProfileModalBusinessExpand(null)
    setProfileModalData(previewProfile)
    setProfileModalLoading(true)
    setProfileModalUserId(safeUserId)
    return true
  }, [overview?.profile, premiumActive, role, selfRoleLabel, user?.avatarUrl, user?.id, user?.username])
  const avatarCropSourceWidth = Math.max(0, Math.trunc(num(avatarCropNatural.width)))
  const avatarCropSourceHeight = Math.max(0, Math.trunc(num(avatarCropNatural.height)))
  const avatarCropReady = avatarCropSourceWidth > 0 && avatarCropSourceHeight > 0
  let avatarCropDrawWidth = 0
  let avatarCropDrawHeight = 0
  let avatarCropDrawX = 0
  let avatarCropDrawY = 0
  let avatarCropSourceX = 0
  let avatarCropSourceY = 0
  let avatarCropSourceSize = 0

  if (avatarCropReady) {
    const frameSize = AVATAR_CROP_PREVIEW_SIZE
    const baseScale = Math.max(frameSize / avatarCropSourceWidth, frameSize / avatarCropSourceHeight)
    const scale = baseScale * clamp(num(avatarCropZoom), 1, 3)
    avatarCropDrawWidth = avatarCropSourceWidth * scale
    avatarCropDrawHeight = avatarCropSourceHeight * scale
    const maxPanX = Math.max(0, (avatarCropDrawWidth - frameSize) / 2)
    const maxPanY = Math.max(0, (avatarCropDrawHeight - frameSize) / 2)
    const panX = (clamp(num(avatarCropOffsetX), -100, 100) / 100) * maxPanX
    const panY = (clamp(num(avatarCropOffsetY), -100, 100) / 100) * maxPanY
    avatarCropDrawX = (frameSize - avatarCropDrawWidth) / 2 + panX
    avatarCropDrawY = (frameSize - avatarCropDrawHeight) / 2 + panY

    const sourceSizeRaw = frameSize / scale
    avatarCropSourceSize = Math.min(
      avatarCropSourceWidth,
      avatarCropSourceHeight,
      Math.max(1, sourceSizeRaw),
    )
    const sourceMaxX = Math.max(0, avatarCropSourceWidth - avatarCropSourceSize)
    const sourceMaxY = Math.max(0, avatarCropSourceHeight - avatarCropSourceSize)
    avatarCropSourceX = clamp((-avatarCropDrawX) / scale, 0, sourceMaxX)
    avatarCropSourceY = clamp((-avatarCropDrawY) / scale, 0, sourceMaxY)
  }

  const avatarCropLayout = {
    ready: avatarCropReady,
    drawWidth: avatarCropDrawWidth,
    drawHeight: avatarCropDrawHeight,
    drawX: avatarCropDrawX,
    drawY: avatarCropDrawY,
    sourceX: avatarCropSourceX,
    sourceY: avatarCropSourceY,
    sourceSize: avatarCropSourceSize,
  }
  const avatarCropImageStyle = avatarCropReady
    ? {
        width: `${avatarCropDrawWidth}px`,
        height: `${avatarCropDrawHeight}px`,
        transform: `translate(${avatarCropDrawX}px, ${avatarCropDrawY}px)`,
      }
    : { opacity: 0 }
  const logisticsOwnedTrucks = [...(logistics?.logisticsFleet?.owned || [])].sort((a, b) =>
    num(b?.capacity) - num(a?.capacity) ||
    num(b?.levelRequired) - num(a?.levelRequired),
  )
  const logisticsOwnedTruckIdSet = new Set(
    logisticsOwnedTrucks.map((truck) => String(truck?.id || '').trim()).filter(Boolean),
  )
  const logisticsListedTrucks = logisticsMyListings
    .map((truck) => {
      const listingId = String(truck?.id || '').trim()
      const truckId = String(truck?.vehicleId || truck?.id || '').trim()
      const truckLevelRequired = Math.max(
        1,
        Math.trunc(num(truck?.requiredLevel || truck?.marketLevel || 1)),
      )
      return {
        ...truck,
        id: truckId,
        modelId: String(truck?.modelId || '').trim(),
        listingId,
        isListed: true,
        levelRequired: truckLevelRequired,
        incomePerRun: Math.max(1, Math.trunc(num(truck?.rentPerHour || truck?.incomePerRun || 0))),
        xpPerRun: Math.max(1, Math.trunc(num(truck?.xp || truck?.xpPerRun || 0))),
        upkeepPerRun: Math.max(1, Math.trunc(num(truck?.upkeepPerRun || truck?.upkeep || 1))),
      }
    })
    .filter((truck) => String(truck?.id || '').trim() && !logisticsOwnedTruckIdSet.has(String(truck?.id || '').trim()))
  const logisticsGarageTrucks = [...logisticsOwnedTrucks, ...logisticsListedTrucks]
  const chatMuteUntil = chatRestrictions?.mute?.mutedUntil || ''
  const chatMuteRemainingMs = remainingMsFromIso(chatMuteUntil, chatClockMs)
  const chatMuteActive = chatMuteRemainingMs > 0
  const chatMuteReasonLabel = String(chatRestrictions?.mute?.reason || '').trim() || 'Mesaj kısıtı'
  const chatMuteEndLabel = formatDateTime(chatMuteUntil)

  const chatBlockUntil = chatRestrictions?.block?.blockedUntil || ''
  const chatBlockRemainingMs = remainingMsFromIso(chatBlockUntil, chatClockMs)
  const chatBlockActive = chatBlockRemainingMs > 0
  const chatBlockReasonLabel = String(chatRestrictions?.block?.reason || '').trim() || 'Yönetici mesaj engeli'
  const chatBlockEndLabel = formatDateTime(chatBlockUntil)
  const chatHardRestrictionActive = chatMuteActive || chatBlockActive

  const chatCooldownUntil = chatRestrictions?.cooldown?.availableAt || ''
  const chatCooldownRemainingMs = remainingMsFromIso(chatCooldownUntil, chatClockMs)
  const chatCooldownActive = !chatHardRestrictionActive && chatCooldownRemainingMs > 0
  const _chatSendBlocked = MESSAGES_DISABLED || chatHardRestrictionActive || chatCooldownActive || Boolean(busy === 'chat-send')

  const _chatCooldownHint = MESSAGES_DISABLED
    ? 'Sohbet mesajları kapalı.'
    : chatBlockActive
      ? `Sohbet engelin var. Kalan süre: ${formatCountdownTr(chatBlockRemainingMs)}.`
    : chatCooldownActive
      ? `${Math.max(1, Math.ceil(chatCooldownRemainingMs / 1000))} saniye sonra tekrar yazabilirsin.`
      : '5 saniyede bir mesaj gönderebilirsin.'
  const chatRestrictionTitle = chatBlockActive
    ? 'Mesaj engelin aktif'
    : chatMuteActive
      ? 'Mesaj kısıtı aktif'
      : ''
  const chatRestrictionReason = chatBlockActive
    ? chatBlockReasonLabel
    : chatMuteActive
      ? chatMuteReasonLabel
      : ''
  const chatRestrictionRemainingMs = chatBlockActive ? chatBlockRemainingMs : chatMuteRemainingMs
  const chatRestrictionEndLabel = chatBlockActive ? chatBlockEndLabel : chatMuteEndLabel
  const floatingErrorText = safeUiText(error)
  const floatingNoticeText = safeUiText(notice)
  const floatingFeedbackText = floatingErrorText || floatingNoticeText
  const floatingFeedbackType = floatingErrorText ? 'error' : floatingNoticeText ? (noticeIsSuccess ? 'success' : 'notice') : ''

  const activeChatMessages = useMemo(
    () => (MESSAGES_DISABLED ? [] : (Array.isArray(chat[CHAT_ROOM]) ? chat[CHAT_ROOM] : [])),
    [chat],
  )
  const _chatUsersById = useMemo(
    () =>
      chatUsers.reduce((acc, entry) => {
        if (entry?.userId) acc[entry.userId] = entry
        return acc
      }, {}),
    [chatUsers],
  )
  const _chatTimeline = useMemo(() => {
    return activeChatMessages
      .filter((message) => message && message.id)
      .map((message) => ({
        type: 'message',
        id: `msg:${message.id}`,
        message,
      }))
  }, [activeChatMessages])
  const _messageCounts = MESSAGES_DISABLED
    ? { all: 0, message: 0, trade: 0, other: 0, alert: 0 }
    : (messageCenter?.counts || { all: 0, message: 0, trade: 0, other: 0, alert: 0 })
  const _messageItems = MESSAGES_DISABLED ? [] : (messageCenter?.items || [])
  const messageSpotlight = MESSAGES_DISABLED ? null : (messageCenter?.spotlight || null)
  const _unreadMessageCountRaw = MESSAGES_DISABLED ? 0 : Number(messageCenter?.unreadCount || 0)
  const _unreadMessageCount = Number.isFinite(_unreadMessageCountRaw) && _unreadMessageCountRaw > 0
    ? Math.min(99, Math.max(1, Math.trunc(_unreadMessageCountRaw)))
    : 0
  const messageFilterResolved = MESSAGES_DISABLED ? messageFilter : (messageCenter?.filter || messageFilter)
  const _messageSpotlightIcon = messageIconMeta(messageSpotlight)
  const [starterDetailOpen, setStarterDetailOpen] = useState(false)

  const inventoryById = useMemo(() => {
    const map = {}
    const mergeRows = (rows) => {
      for (const entry of rows || []) {
        const itemId = String(entry?.itemId || '').trim()
        if (!itemId) continue
        const quantity = Math.max(0, Math.trunc(num(entry.quantity)))
        map[itemId] = Math.max(quantity, Math.max(0, Math.trunc(num(map[itemId] || 0))))
      }
    }
    mergeRows(profile?.profile?.inventory)
    mergeRows(market?.inventory)
    return map
  }, [market, profile])

  const factoryRows = (Array.isArray(factories?.factories) ? factories.factories : [])
    .slice()
    .sort((left, right) => {
      const leftId = String(left?.id || '').trim()
      const rightId = String(right?.id || '').trim()
      const leftIndex = FACTORY_CARD_ORDER.indexOf(leftId)
      const rightIndex = FACTORY_CARD_ORDER.indexOf(rightId)
      const safeLeft = leftIndex === -1 ? FACTORY_CARD_ORDER.length : leftIndex
      const safeRight = rightIndex === -1 ? FACTORY_CARD_ORDER.length : rightIndex
      if (safeLeft !== safeRight) return safeLeft - safeRight
      return String(left?.name || '').localeCompare(String(right?.name || ''), 'tr')
    })
    .map((entry) => {
      const safeId = String(entry?.id || '').trim()
      const owned = entry?.owned === true
      const level = Math.max(0, Math.trunc(num(entry?.level || 0)))
      const hasLevelCap = entry?.hasLevelCap === true
      const FACTORY_MAX_LEVEL = 200
      const maxLevel = hasLevelCap ? FACTORY_MAX_LEVEL : 0
      const isBuilding = entry?.isBuilding === true
      const isUpgrading = entry?.upgrading?.active === true
      const buildRemainingByIso = remainingMsFromIso(entry?.buildEndsAt || '', liveNowMs)
      const buildRemainingMs = isBuilding
        ? Math.max(0, buildRemainingByIso > 0 ? buildRemainingByIso : Math.trunc(num(entry?.buildRemainingMs || 0)))
        : 0
      const upgradeRemainingByIso = remainingMsFromIso(entry?.upgrading?.endsAt || '', liveNowMs)
      const upgradeRemainingMs = isUpgrading
        ? Math.max(0, upgradeRemainingByIso > 0 ? upgradeRemainingByIso : Math.trunc(num(entry?.upgrading?.remainingMs || 0)))
        : 0
      const collectRemainingByIso = remainingMsFromIso(entry?.collectReadyAt || '', liveNowMs)
      const collectRemainingMs = owned && !isBuilding
        ? Math.max(0, collectRemainingByIso > 0 ? collectRemainingByIso : Math.trunc(num(entry?.collectRemainingMs || 0)))
        : 0
      const outputMeta = factoryItemMeta(entry?.outputItemId || '')
      const energyMeta = factoryItemMeta(entry?.energyItemId || 'energy')
      const buildDurationMinutes = Math.max(1, Math.trunc(num(entry?.buildDurationMinutes || 30)))
      const speedupDiamondCost = Math.max(0, Math.trunc(num(entry?.upgrading?.speedupDiamondCost || 0)))
      const xpPerCollect = Math.max(0, Math.trunc(num(entry?.xpPerCollect || 0)))
      const nextUpgradeCostCash = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.costCash || 0)))
      const missingUpgradeCash = Math.max(0, Math.trunc(num(entry?.nextUpgrade?.missingCash || 0)))
      const upgradeCostRows = Object.entries(entry?.nextUpgrade?.costByItem || {})
        .map(([itemId, amount]) => ({
          itemId,
          amount: Math.max(0, Math.trunc(num(amount || 0))),
          missing: Math.max(0, Math.trunc(num(entry?.nextUpgrade?.missingByItem?.[itemId] || 0))),
          available: Math.max(0, Math.trunc(num(inventoryById[itemId] || 0))),
          meta: factoryItemMeta(itemId),
        }))
        .filter((row) => row.amount > 0)
      const purchaseCostRows = Object.entries(entry?.purchaseCostByItem || {})
        .map(([itemId, amount]) => ({
          itemId,
          amount: Math.max(0, Math.trunc(num(amount || 0))),
          missing: Math.max(0, Math.trunc(num(entry?.purchaseMissingByItem?.[itemId] || 0))),
          available: Math.max(0, Math.trunc(num(inventoryById[itemId] || 0))),
          meta: factoryItemMeta(itemId),
        }))
        .filter((row) => row.amount > 0)

      return {
        ...entry,
        id: safeId,
        owned,
        level,
        hasLevelCap,
        maxLevel,
        isBuilding,
        isUpgrading,
        buildRemainingMs,
        upgradeRemainingMs,
        collectRemainingMs,
        buildDurationMinutes,
        outputMeta,
        energyMeta,
        xpPerCollect,
        nextUpgradeCostCash,
        missingUpgradeCash,
        speedupDiamondCost,
        purchaseCostRows,
        upgradeCostRows,
      }
    })

  const factoriesOwnedCount = factoryRows.filter((entry) => entry.owned).length
  const factoriesReadyCount = factoryRows.filter((entry) => entry.canCollectNow).length
  const factoriesUpgradingCount = factoryRows.filter((entry) => entry.isUpgrading).length
  const factoryBulkPreview = useMemo(() => {
    const ready = factoryRows.filter((entry) => entry.canCollectNow)
    const byItem = {}
    const energyByItem = {}
    let totalXp = 0
    ready.forEach((f) => {
      const itemId = String(f?.outputItemId || '').trim()
      if (itemId) {
        byItem[itemId] = (byItem[itemId] || 0) + Math.max(0, Math.trunc(num(f?.outputPerCollect || 0)))
      }
      totalXp += Math.max(0, Math.trunc(num(f?.xpPerCollect || 0)))
      const eId = String(f?.energyItemId || 'energy').trim()
      if (eId) {
        energyByItem[eId] = (energyByItem[eId] || 0) + Math.max(0, Math.trunc(num(f?.energyCostPerCollect || 0)))
      }
    })
    const mult = premiumActive && premiumMultiplier > 1 ? premiumMultiplier : 1
    const byItem2x = {}
    Object.entries(byItem).forEach(([id, qty]) => { byItem2x[id] = Math.max(0, Math.trunc(qty * mult)) })
    return { byItem: byItem2x, totalXp, energyByItem, count: ready.length, is2x: mult > 1 }
  }, [factoryRows, premiumActive, premiumMultiplier])
  const buildingFactoryRows = factoryRows
    .filter((entry) => entry.isBuilding)
    .slice()
    .sort((left, right) => Math.max(0, num(left?.buildRemainingMs || 0)) - Math.max(0, num(right?.buildRemainingMs || 0)))
  const _activeBuildingFactory = buildingFactoryRows[0] || null
  const upgradingFactoryRows = factoryRows
    .filter((entry) => entry.isUpgrading)
    .slice()
    .sort((left, right) => Math.max(0, num(left?.upgradeRemainingMs || 0)) - Math.max(0, num(right?.upgradeRemainingMs || 0)))
  const _activeUpgradingFactory = upgradingFactoryRows[0] || null
  const factorySlotsUsed = buildingFactoryRows.length + upgradingFactoryRows.length
  const maxFactorySlots = premiumActive ? 2 : 1
  const canStartAnotherFactoryBuild = factorySlotsUsed < maxFactorySlots
  const canStartAnotherFactoryUpgrade = factorySlotsUsed < maxFactorySlots
  const ownedFactoryRows = factoryRows.filter((entry) => entry.owned)
  const lockedFactoryRows = factoryRows.filter((entry) => !entry.owned && !entry.isBuilding)
  const factoryPurchaseModal = lockedFactoryRows.find(
    (entry) => String(entry?.id || '').trim() === String(factoryPurchaseModalId || '').trim(),
  ) || null
  const factoryPurchaseModalRows = factoryPurchaseRowsFromFactory(factoryPurchaseModal)
  const factoryPurchaseModalMissingRows = factoryPurchaseModalRows.filter((row) => row.missing > 0)
  const factoryPurchaseBusyKey = factoryPurchaseModal ? `factory-buy:${factoryPurchaseModal.id}` : ''
  const factoryCollectModal = factoryRows.find((f) => String(f?.id || '') === String(factoryCollectModalId || '').trim()) || null
  const factoryUpgradeModal = factoryRows.find((f) => String(f?.id || '') === String(factoryUpgradeModalId || '').trim()) || null
  const factoryUpgradeModalBlockedBySlot = Boolean(
    factoryUpgradeModal &&
    !factoryUpgradeModal.isUpgrading &&
    !canStartAnotherFactoryUpgrade,
  )
  const factoryPurchaseModalCanBuyNow = Boolean(
    factoryPurchaseModal &&
    canStartAnotherFactoryBuild &&
    factoryPurchaseModal.canPurchaseNow,
  )

  const collectModalBusiness = unlockedBusinesses.find(
    (entry) => String(entry?.id || '').trim() === String(collectTargetBusinessId || '').trim(),
  ) || null
  const collectModalPreviewBase = fleetCollectPreview(collectModalBusiness, inventoryById, {
    multiplier: 1,
    weeklyEvents: weeklyEventsRuntimeState,
  })
  const collectModalPreview = fleetCollectPreview(
    collectModalBusiness,
    inventoryById,
    {
      multiplier: premiumBoostActive ? premiumMultiplier : 1,
      weeklyEvents: weeklyEventsRuntimeState,
    },
  )
  const collectModalFuelMeta = fuelItemMeta(collectModalPreview.fuelItemId || collectModalBusiness?.fuelItemId || 'oil')
  const collectModalMeta = FLEET_CARD_META[collectModalBusiness?.templateId] || null
  const selectedCollectPreview = fleetCollectPreview(
    selectedBusiness,
    inventoryById,
    {
      multiplier: premiumBoostActive ? premiumMultiplier : 1,
      weeklyEvents: weeklyEventsRuntimeState,
    },
  )
  const bulkPreview = bulkCollectPreview(unlockedBusinesses, inventoryById, {
    multiplier: 1,
    weeklyEvents: weeklyEventsRuntimeState,
  })
  const bulkPreview2x = bulkCollectPreview(unlockedBusinesses, inventoryById, {
    multiplier: premiumMultiplier,
    weeklyEvents: weeklyEventsRuntimeState,
  })
  const logisticsPreview = logistics?.collectPreview || {}
  const logisticsPreview2x = logistics?.collectPreview2x || {}
  const logisticsPreviewActive = premiumBoostActive ? logisticsPreview2x : logisticsPreview
  const logisticsCollectNet = Math.max(0, Math.trunc(num(logisticsPreviewActive?.netCash || 0)))
  const collectModalFuelEnough =
    Math.max(0, Math.trunc(num(collectModalPreview.fuelNeeded))) <= 0 ||
    Math.max(0, Math.trunc(num(collectModalPreview.fuelAvailable))) >= Math.max(0, Math.trunc(num(collectModalPreview.fuelNeeded)))
  const logisticsPreviewFuelEnough =
    Math.max(0, Math.trunc(num(logisticsPreviewActive.fuelNeeded || 0))) <= 0 ||
    Math.max(0, Math.trunc(num(inventoryById[String(logisticsPreviewActive.fuelItemId || 'oil')] || 0))) >= Math.max(0, Math.trunc(num(logisticsPreviewActive.fuelNeeded || 0)))

  const totalBulkIncome = Math.max(0, num(bulkPreview.grossCash) + num(logisticsPreview.grossCash || 0))
  const bulkFuelByItem = bulkPreview?.fuelConsumedByItem && typeof bulkPreview.fuelConsumedByItem === 'object'
    ? bulkPreview.fuelConsumedByItem
    : {}
  const hasPropertyFleet = unlockedBusinesses.some(
    (entry) => String(entry?.templateId || '').trim() === 'property-rental' && Math.max(0, Math.trunc(num(entry?.fleetCount || 0))) > 0,
  )
  const totalBulkOilFuel = Math.max(0, num(bulkFuelByItem.oil) + num(logisticsPreview.fuelConsumed || 0))
  const totalBulkEnergyFuel = Math.max(0, num(bulkFuelByItem.energy))
  const totalBulkXp = Math.max(0, num(bulkPreview.xpGain) + num(logisticsPreview.xpGain || 0))
  const totalBulkTax = Math.max(0, num(bulkPreview.taxAmount) + num(logisticsPreview.taxAmount || 0))
  const totalBulkNet = Math.max(0, num(bulkPreview.netCash) + num(logisticsPreview.netCash || 0))

  const totalBulkNet2x = Math.max(0, num(bulkPreview2x.netCash) + num(logisticsPreview2x.netCash || 0))

  const totalBulkCount = Math.max(
    0,
    Math.trunc(num(bulkPreview.collectedCount)) + Math.trunc(num(logisticsPreview.collectedCount || 0)),
  )
  const ctaUpgradePrimary = companyUpgrade?.maxReached
    ? `Seviye ${fmt(upgradeCurrentLevel)} ⬢ MAX`
    : `Seviye ${fmt(upgradeCurrentLevel)} -> ${fmt(upgradeNextLevel)}`
  const ctaUpgradeSecondary = companyUpgrade?.maxReached
    ? 'Yeni seviye kilidi yok'
    : mustBuyNextUnlockFirst && nextCompanyUnlock
      ? `${nextCompanyUnlock.name} satın alınmalı`
      : `${fmt(upgradeCostValue)} nakit gerekli`
  const ctaBulkPrimary = totalBulkCount > 0
    ? `${premiumBoostActive ? '2x ' : ''}+${fmt(premiumBoostActive ? totalBulkNet2x : totalBulkNet)} net`
    : 'Toplanacak gelir yok'
  const ctaBulkSecondary = totalBulkCount > 0
    ? `Hazır işletme: ${fmt(totalBulkCount)}`
    : 'Tahsilat saati bekleniyor'
  const ctaSetupPrimary = nextCompanyUnlock
    ? String(nextCompanyUnlock.name || 'İş Kur')
    : 'Tüm alanlar açık'
  const ctaSetupSecondary = nextCompanyUnlock
    ? `${fmt(nextCompanyUnlock.cost || 0)} nakit ile satın al`
    : 'Yeni alan yok'

  const warehouseCards = useMemo(
    () =>
      DEPOT_CATALOG.map((item) => {
        const sourceIds = Array.isArray(item.sourceIds) && item.sourceIds.length
          ? item.sourceIds
          : [item.id]
        const fromInventory = sourceIds.reduce((total, sourceId) => total + Math.max(0, num(inventoryById[sourceId])), 0)
        const walletAmount = item.fromWallet ? Math.max(0, Math.trunc(num(overview?.profile?.wallet))) : 0
        const reputationAmount = item.fromReputation ? Math.max(0, Math.trunc(num(overview?.profile?.reputation))) : 0
        const quantity = Math.max(
          fromInventory,
          walletAmount,
          reputationAmount,
          Math.max(0, Math.trunc(num(item.baseQuantity))),
        )
        return {
          ...item,
          quantity,
        }
      }),
    [inventoryById, overview?.profile?.wallet, overview?.profile?.reputation],
  )

  const warehouseTotalQuantity = useMemo(
    () =>
      warehouseCards.reduce(
        (sum, item) => sum + Math.max(0, Math.trunc(num(item.quantity || 0))),
        0,
      ),
    [warehouseCards],
  )

  const leaderboardPageSize = 100

  const buildLeaderboardRows = useCallback((metric) => {
    const safeMetric = metric === 'level' ? 'level' : (metric === 'season' ? 'season' : 'cash')
    const rawRows = Array.isArray(league?.[safeMetric])
      ? league[safeMetric]
      : (Array.isArray(league?.standings?.[safeMetric]) ? league.standings[safeMetric] : [])

    return rawRows
      .map((entry, index) => {
        const walletValue = Math.max(0, Math.trunc(num(entry?.wallet || 0)))
        const levelValue = Math.max(
          1,
          Math.trunc(
            num(
              entry?.level ||
              entry?.levelInfo?.level ||
              (safeMetric === 'level' ? entry?.points : 1),
            ),
          ),
        )
        const seasonValue = Math.max(
          0,
          Math.trunc(
            num(
              entry?.seasonPoints ??
              entry?.seasonScore ??
              entry?.points ??
              entry?.score ??
              entry?.season ??
              0,
            ),
          ),
        )
        const value = safeMetric === 'level'
          ? levelValue
          : (safeMetric === 'season' ? seasonValue : walletValue)
        return {
          rank: Math.max(1, Math.trunc(num(entry?.rank || (index + 1)))),
          userId: String(entry?.userId || '').trim(),
          username: String(entry?.username || '').trim() || 'Oyuncu',
          displayName: String(entry?.displayName || '').trim(),
          avatarUrl: String(entry?.avatar?.url || entry?.avatarUrl || '').trim(),
          seasonBadge: entry?.seasonBadge || null,
          wallet: walletValue,
          level: levelValue,
          seasonPoints: seasonValue,
          value,
          isMe: Boolean(entry?.isMe) || String(entry?.userId || '').trim() === String(user?.id || '').trim(),
        }
      })
      .sort((left, right) => {
        const primary = Number(right.value || 0) - Number(left.value || 0)
        if (primary !== 0) return primary
        return String(left.username || '').localeCompare(String(right.username || ''), 'tr')
      })
      .map((mapped, mappedIndex) => ({
        ...mapped,
        rank: mappedIndex + 1,
      }))
  }, [league, user?.id])

  const leaderboardRowsSeason = useMemo(() => buildLeaderboardRows('season'), [buildLeaderboardRows])
  const leaderboardRowsResolved = leaderboardRowsSeason
  const leaderboardMeRow = leaderboardRowsResolved.find((entry) => entry.isMe) || null
  const leagueSeasonPrizes = league?.seasonPrizes && typeof league.seasonPrizes === 'object'
    ? league.seasonPrizes
    : {}
  const leagueSeasonRewardCatalog = Array.isArray(leagueSeasonPrizes.rewardCatalog)
    ? leagueSeasonPrizes.rewardCatalog
    : []
  const leagueSeasonRewardCatalogResolved = useMemo(() => (
    leagueSeasonRewardCatalog.length
      ? leagueSeasonRewardCatalog
      : [
          {
            rank: 1,
            tier: 'gold',
            chestLabel: 'Altın Sandık',
            badgeLabel: 'Sezon Şampiyonu',
            badgeIcon: '/home/icons/leaderboard/badge-season-1.webp',
            chestIcon: '/home/icons/leaderboard/chest-gold.webp',
            cashAmount: 10000000,
            resourceAmount: 750000,
            rewardMultiplier: 1,
            rewardMultiplierMax: 5,
          },
          {
            rank: 2,
            tier: 'silver',
            chestLabel: 'Gümüş Sandık',
            badgeLabel: 'Sezon İkincisi',
            badgeIcon: '/home/icons/leaderboard/badge-season-2.webp',
            chestIcon: '/home/icons/leaderboard/chest-silver.webp',
            cashAmount: 5000000,
            resourceAmount: 375000,
            rewardMultiplier: 1,
            rewardMultiplierMax: 5,
          },
          {
            rank: 3,
            tier: 'bronze',
            chestLabel: 'Bronz Sandık',
            badgeLabel: 'Sezon Üçüncüsü',
            badgeIcon: '/home/icons/leaderboard/badge-season-3.webp',
            chestIcon: '/home/icons/leaderboard/chest-bronze.webp',
            cashAmount: 2500000,
            resourceAmount: 187500,
            rewardMultiplier: 1,
            rewardMultiplierMax: 5,
          },
          {
            rank: 4,
            rankMin: 4,
            rankMax: 25,
            tier: 'common',
            chestLabel: 'Sıradan Sandık',
            chestIcon: '/home/icons/leaderboard/chestsiradan.webp',
            cashAmount: 1000000,
            resourceAmount: 50000,
            rewardMultiplier: 1,
            rewardMultiplierMax: 5,
          },
        ]
  ), [leagueSeasonRewardCatalog])
  const leagueSeasonRewardForRank = useCallback((rankValue) => {
    const safeRank = Math.max(1, Math.trunc(num(rankValue || 1)))
    let rangedFallback = null
    for (const entry of leagueSeasonRewardCatalogResolved) {
      const rankMin = Math.max(
        1,
        Math.trunc(num(entry?.rankMin ?? entry?.rank ?? 1)),
      )
      const rankMax = Math.max(
        rankMin,
        Math.trunc(num(entry?.rankMax ?? entry?.rank ?? rankMin)),
      )
      if (safeRank < rankMin || safeRank > rankMax) continue
      if (rankMin === rankMax && safeRank === rankMin) return entry
      rangedFallback = entry
    }
    return rangedFallback
  }, [leagueSeasonRewardCatalogResolved])
  const leaguePendingSeasonChests = useMemo(() => {
    const rows = Array.isArray(leagueSeasonPrizes.pendingChests)
      ? leagueSeasonPrizes.pendingChests
      : []
    return [...rows].sort((left, right) => {
      const leftRank = Math.max(1, Math.trunc(num(left?.rank || 1)))
      const rightRank = Math.max(1, Math.trunc(num(right?.rank || 1)))
      if (leftRank !== rightRank) return leftRank - rightRank
      const leftAwardedAtMs = Date.parse(left?.awardedAt || '') || 0
      const rightAwardedAtMs = Date.parse(right?.awardedAt || '') || 0
      return leftAwardedAtMs - rightAwardedAtMs
    })
  }, [leagueSeasonPrizes.pendingChests])
  const leagueOpenedSeasonChests = useMemo(() => {
    const rows = Array.isArray(leagueSeasonPrizes.openedChests)
      ? leagueSeasonPrizes.openedChests
      : []
    return [...rows].sort(
      (left, right) =>
        (Date.parse(right?.openedAt || right?.awardedAt || '') || 0) -
        (Date.parse(left?.openedAt || left?.awardedAt || '') || 0),
    )
  }, [leagueSeasonPrizes.openedChests])
  useEffect(() => {
    if (tab !== 'profile' || profileTab !== 'leaderboard') return undefined
    const id = window.setInterval(() => setLeaderboardTick((t) => (t + 1) % 1_000_000), 1000)
    return () => window.clearInterval(id)
  }, [tab, profileTab])

  const leaderboardSeasonReset = useMemo(() => {
    void leaderboardTick
    const tz = 'Europe/Istanbul'
    const fmtParts = (d) => {
      const parts = new Intl.DateTimeFormat('tr-TR', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(d)
      const get = (type) => parts.find((p) => p.type === type)?.value
      return {
        year: Number(get('year') || 0),
        month: Number(get('month') || 1),
        day: Number(get('day') || 1),
        hour: Number(get('hour') || 0),
        minute: Number(get('minute') || 0),
        second: Number(get('second') || 0),
      }
    }
    const nowParts = fmtParts(new Date())
    const nowPseudo = Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, nowParts.hour, nowParts.minute, nowParts.second)
    const nextMonthYear = nowParts.month === 12 ? nowParts.year + 1 : nowParts.year
    const nextMonth = nowParts.month === 12 ? 1 : nowParts.month + 1
    const targetPseudo = Date.UTC(nextMonthYear, nextMonth - 1, 1, 0, 0, 0)
    const diffMs = Math.max(0, targetPseudo - nowPseudo)
    const totalSeconds = Math.floor(diffMs / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return { days, hours, minutes, seconds }
  }, [leaderboardTick])

  useEffect(() => {
    setLeaderboardPage(1)
  }, [leaderboardMetricSafe])

  const leaderboardTotalCount = leaderboardRowsResolved.length
  const leaderboardPageCount = Math.max(1, Math.ceil(leaderboardTotalCount / leaderboardPageSize))
  const leaderboardPageSafe = clamp(leaderboardPage, 1, leaderboardPageCount)
  const leaderboardPageStart = (leaderboardPageSafe - 1) * leaderboardPageSize
  const leaderboardPageEnd = leaderboardPageStart + leaderboardPageSize
  const leaderboardPageRows = leaderboardRowsResolved.slice(leaderboardPageStart, leaderboardPageEnd)
  const leaderboardListRows = leaderboardPageRows

  const leaderboardRowDomId = useCallback((metric, entry) => {
    const stableId = entry?.userId || entry?.username || entry?.rank || ''
    const safeMetric = metric === 'level' ? 'level' : (metric === 'season' ? 'season' : 'cash')
    return `leader-row-${safeMetric}-${String(stableId).replaceAll(' ', '_')}`
  }, [])

  const runLeaderboardSearch = useCallback(() => {
    const normalizeSearchValue = (value) => String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('tr-TR')

    const q = String(leaderboardSearchQuery || '').trim()
    if (!q) {
      setLeaderboardSearchError('Oyuncu adını yaz.')
      return
    }

    const needle = normalizeSearchValue(q)
    const scored = leaderboardRowsResolved
      .map((entry) => {
        const displayName = normalizeSearchValue(entry?.displayName || '')
        const username = normalizeSearchValue(entry?.username || '')

        let score = 0
        if (username && username === needle) score = 400
        else if (displayName && displayName === needle) score = 300
        else if (username && username.startsWith(needle)) score = 220
        else if (displayName && displayName.startsWith(needle)) score = 180
        else if (username && username.includes(needle)) score = 120
        else if (displayName && displayName.includes(needle)) score = 90

        return { entry, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        const byScore = b.score - a.score
        if (byScore !== 0) return byScore
        return Number(a.entry?.rank || 0) - Number(b.entry?.rank || 0)
      })

    const match = scored[0]?.entry || null

    if (!match) {
      setLeaderboardSearchError('Eşleşen oyuncu bulunamadı.')
      return
    }

    const id = leaderboardRowDomId(leaderboardMetricSafe, match)
    const usernameLower = normalizeSearchValue(match?.username || '')
    const isExactUsername = Boolean(usernameLower && usernameLower === needle)

    setLeaderboardSearchOpen(false)
    setLeaderboardSearchError('')

    if (isExactUsername && match.userId) {
      const opened = openProfileModal(match.userId, {
        username: match.username,
        displayName: match.displayName || match.username,
        avatarUrl: match.avatarUrl,
        level: match.level,
        role: match.role,
        roleLabel: match.roleLabel,
        premium: match.premium,
        disallowSelf: true,
        selfBlockedMessage: 'Sıralamada kendi profilini açamazsın. Kendi profiline şehir ekranından bakabilirsin.',
      })
      if (opened) return
    }

    setLeaderboardHighlightKey(id)
    window.setTimeout(() => setLeaderboardHighlightKey(''), 4500)

    const index = leaderboardRowsResolved.findIndex((entry) => (
      (match?.userId && String(entry.userId || '').trim() === String(match.userId || '').trim())
      || (match?.username && String(entry.username || '').trim().toLowerCase() === String(match.username || '').trim().toLowerCase())
    ))
    if (index >= 0) {
      const page = Math.floor(index / leaderboardPageSize) + 1
      setLeaderboardPage(page)
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    })
  }, [leaderboardMetricSafe, leaderboardPageSize, leaderboardRowDomId, leaderboardRowsResolved, leaderboardSearchQuery, openProfileModal])

  const profileModalLeagueRanks = useMemo(() => {
    if (!profileModalData) return { seasonRank: null }
    const targetUserId = String(profileModalData?.userId || profileModalUserId || '').trim()
    const targetUsername = String(profileModalData?.username || '').trim().toLowerCase()

    const findRank = (rows) => {
      const found = rows.find((entry) => (
        (targetUserId && String(entry.userId || '').trim() === targetUserId)
        || (targetUsername && String(entry.username || '').trim().toLowerCase() === targetUsername)
      ))
      return found?.rank ?? null
    }

    return {
      seasonRank: findRank(leaderboardRowsSeason),
    }
  }, [leaderboardRowsSeason, profileModalData, profileModalUserId])

  const minesList = Array.isArray(mines?.mines) ? mines.mines : []
  const mineDigAction = async (mineId) => {
    const mine = minesList.find((m) => m.id === mineId)
    if (mine && !mine.hasEnoughCash) {
      fail(null, `Yetersiz nakit. ${mine.name} kazısı için ${fmt(mine.costCash)} nakit gerekir.`)
      return
    }
    const key = `mine-dig:${mineId}`
    setBusy(key)
    try {
      const response = await startMineDig(mineId)
      if (!response?.success) {
        fail(response, response?.errors?.global || 'Kazı başlatılamadı.')
        if (response?.reason === 'insufficient_funds') setError(response?.errors?.global || 'Yetersiz nakit.')
        return
      }
      setMines((prev) => (response.mines ? { ...prev, mines: response.mines, updatedAt: response.updatedAt } : prev))
      if (response.wallet != null) loadOverview().catch(() => {})
      mineDigCollectedRef.current = false
      setMineCollectResult(null)
      setMineDigCountdownSec(10)
      const updatedMine = response.mines?.find((m) => m.id === mineId) || mine || minesList.find((m) => m.id === mineId)
      setMineDigModal(updatedMine ? { mine: updatedMine } : null)
    } finally {
      setBusy('')
    }
  }
  const mineCollectAction = async (mineId) => {
    const key = `mine-collect:${mineId}`
    setBusy(key)
    try {
      const response = await collectMine(mineId)
      if (!response?.success) return fail(response, response?.errors?.global || 'Tahsilat yapılamadı.')
      setMines((prev) => (response.mines ? { ...prev, mines: response.mines, updatedAt: response.updatedAt } : prev))
      if (response.collected) setNotice(`${response.collected.quantity} ${factoryItemMeta(response.collected.itemId)?.label || response.collected.itemId} depoya eklendi.`)
      if (response.inventory) loadProfile().catch(() => {})
    } finally {
      setBusy('')
    }
  }

  const minesView = (
    <section className="panel-stack home-sections mines-screen">
      <article className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Madenler</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home', { tab: 'home' })}>Şehir</button>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>
          Her maden 10 sn kazı, 30 dk bekleme. 10—1000 arası rastgele kaynak; Premium üyeler 2x kazanır. Nakit maliyeti kartta; yetersizse uyarı verilir.
        </p>
        {minesList.length === 0 ? (
          <p className="empty" style={{ marginTop: 16 }}>Yükleniyor...</p>
        ) : (
          <div className="mines-grid">
            {minesList.map((mine) => {
              const meta = factoryItemMeta(mine.outputItemId)
              const busyDig = busy === `mine-dig:${mine.id}`
              const busyCollect = busy === `mine-collect:${mine.id}`
              const isBusy = busyDig || busyCollect
              const liveNextDigRemainingMs = mine.nextDigAt
                ? Math.max(0, new Date(mine.nextDigAt).getTime() - Date.now())
                : 0
              return (
                <article key={mine.id} className="card mine-card" data-mine-id={mine.id}>
                  <div className="mine-card-hero-wrap">
                    <div className="mine-card-hero" data-broken="0">
                      <img
                        src={resolveMineImage(mine)}
                        alt=""
                        loading="lazy"
                        onError={(e) => { e.currentTarget?.parentElement?.setAttribute('data-broken', '1') }}
                      />
                      <span className="mine-card-hero-fallback">
                        <img src={meta?.icon || '/home/icons/depot/cash.webp'} alt="" aria-hidden />
                      </span>
                    </div>
                  </div>
                  <h4 className="mine-card-name">{mine.name}</h4>
                  {mine.isDigging && (
                    <p className="mine-card-hint">
                      Kazı sürüyor · Kalan <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatCollectionCountdown(mine.digRemainingMs)}</span>
                    </p>
                  )}
                  {mine.canCollect && <p className="mine-card-hint">Tahsilat hazır</p>}
                  {!mine.isDigging && !mine.canCollect && liveNextDigRemainingMs <= 0 && (
                    <p className="mine-card-hint">Kazı Başlat&apos;a tıkla</p>
                  )}
                  {!mine.isDigging && !mine.canCollect && liveNextDigRemainingMs > 0 && (
                    <div className="mine-card-countdown">
                      Sonraki kazı: {formatCollectionCountdown(liveNextDigRemainingMs)}
                    </div>
                  )}
                  <div className="mine-card-actions">
                    {mine.isDigging ? (
                      <button type="button" className="btn btn-ghost mine-card-action-full" disabled>Bekle</button>
                    ) : null}
                    {mine.canCollect ? (
                      <button
                        type="button"
                        className="btn btn-primary mine-card-action-full"
                        onClick={() => void mineCollectAction(mine.id)}
                        disabled={Boolean(isBusy)}
                      >
                        {busyCollect ? 'Tahsil ediliyor...' : 'Tahsil Et'}
                      </button>
                    ) : null}
                    {!mine.isDigging && !mine.canCollect ? (
                      <button
                        type="button"
                        className="btn btn-accent mine-card-action-full"
                        onClick={() => {
                          if (mine && !mine.hasEnoughCash) {
                            fail(null, `Yetersiz nakit. ${mine.name} kazısı için ${fmt(mine.costCash)} nakit gerekir.`)
                            setError(`Yetersiz nakit. ${mine.name} kazısı için ${fmt(mine.costCash)} nakit gerekir.`)
                            return
                          }
                          if (mine && !mine.canStartDig) return
                          setMineConfirmModal(mine)
                        }}
                        disabled={Boolean(isBusy) || !mine.canStartDig}
                      >
                        {!mine.hasEnoughCash ? `Yetersiz nakit (${fmt(mine.costCash)})` : 'Kazı Başlat'}
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </article>
    </section>
  )

  const missionItems = Array.isArray(missions?.missions)
    ? missions.missions.slice(0, 5)
    : []
  const missionBatchMeta =
    missions?.missionBatch && typeof missions.missionBatch === 'object'
      ? missions.missionBatch
      : null
  const missionBatchSize = Math.max(
    1,
    Math.trunc(num(missionBatchMeta?.size || missionItems.length || 5)),
  )
  const missionClaimedCount = Math.max(
    0,
    Math.trunc(
      num(
        missionBatchMeta?.claimedCount ||
          missionItems.filter((item) => String(item?.status || '').trim().toLowerCase() === 'claimed').length,
      ),
    ),
  )
  const missionBatchIndex = Math.max(1, Math.trunc(num(missionBatchMeta?.batchIndex || 1)))
  const missionSeasonPointsTotal = Math.max(0, Math.trunc(num(missions?.seasonPoints || 0)))
  const missionCashIconPng = '/home/icons/depot/cash.png'
  const missionXpIconPng = '/home/ui/hud/xp-icon.png'
  const missionSlotCooldownMs = Math.max(
    1000,
    Math.trunc(num(missionBatchMeta?.refreshCooldownMs || 4 * 60 * 60 * 1000)),
  )

  const missionProgressMeta = (mission) => {
    const target = Math.max(1, Math.trunc(num(mission?.target || 1)))
    const progress = Math.max(0, Math.min(target, Math.trunc(num(mission?.progress || 0))))
    const status = String(mission?.status || '').trim().toLowerCase()
    const isClaimed = status === 'claimed' || Boolean(mission?.claimedAt)
    const isClaimable = !isClaimed && (status === 'claimable' || progress >= target)
    const percent = Math.max(0, Math.min(100, Math.round((progress / target) * 100)))
    return {
      progress,
      target,
      percent,
      isClaimed,
      isClaimable,
      statusText: isClaimed ? 'Ödül alındı' : isClaimable ? 'Tamamlandı' : 'Devam ediyor',
    }
  }

  const missionSlotRemainingMs = (mission) => {
    const status = String(mission?.status || '').trim().toLowerCase()
    const isClaimed = status === 'claimed' || Boolean(mission?.claimedAt)
    if (!isClaimed) return 0

    const claimRefIso = String(
      mission?.claimedAt || mission?.updatedAt || mission?.createdAt || '',
    ).trim()
    if (!claimRefIso) return 0

    const claimRefMs = new Date(claimRefIso).getTime()
    if (Number.isNaN(claimRefMs) || claimRefMs <= 0) return 0

    const nowMs = chatClockMs || Date.now()
    return Math.max(0, claimRefMs + missionSlotCooldownMs - nowMs)
  }

  useEffect(() => {
    if (tab !== 'missions') return
    if (!Array.isArray(missionItems) || missionItems.length === 0) return
    if (missionSlotRefreshInFlightRef.current) return

    const dueClaimedMissionExists = missionItems.some((mission) => {
      const status = String(mission?.status || '').trim().toLowerCase()
      if (status !== 'claimed' && !mission?.claimedAt) return false
      return missionSlotRemainingMs(mission) <= 0
    })
    if (!dueClaimedMissionExists) return

    missionSlotRefreshInFlightRef.current = true
    void loadMissions().finally(() => {
      missionSlotRefreshInFlightRef.current = false
    })
  }, [tab, missionItems, chatClockMs, loadMissions])

  const missionRewardItems = (mission) => {
    const rewardSources = [
      mission?.rewardItems,
      mission?.reward?.rewardItems,
      mission?.reward,
    ]
    const merged = new Map()
    for (const source of rewardSources) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) continue
      for (const [itemId, amountValue] of Object.entries(source)) {
        const safeItemId = String(itemId || '').trim()
        const safeAmount = Math.max(0, Math.trunc(num(amountValue)))
        if (!safeItemId || safeAmount <= 0) continue
        if (
          safeItemId === 'cash' ||
          safeItemId === 'xp' ||
          safeItemId === 'reputation' ||
          safeItemId === 'title' ||
          safeItemId === 'rewardItems'
        ) {
          continue
        }
        const meta = DEPOT_CATALOG.find((entry) => String(entry.id || '').trim() === safeItemId)
        if (!meta) continue
        if (meta.fromWallet || meta.fromReputation) continue
        const current = merged.get(safeItemId)
        merged.set(safeItemId, {
          itemId: safeItemId,
          label: meta.label,
          icon: meta.png || meta.icon || '/home/icons/v2/nav-missions.png',
          amount: (current?.amount || 0) + safeAmount,
        })
      }
    }
    return Array.from(merged.values())
  }

  const claimDailyMissionAction = async (missionId) => {
    const safeId = String(missionId || '').trim()
    if (!safeId || busy) return
    setBusy(`claim-mission:${safeId}`)
    try {
      const response = await claimMissionReward(safeId)
      if (!response?.success) return fail(response, response?.errors?.global || 'Ödül alınamadı.')
      const seasonPointsGained = Math.max(0, Math.trunc(num(response?.seasonPointsGained || 0)))
      setNotice(
        response?.message ||
          (seasonPointsGained > 0
            ? `Görev ödülü alındı. +${fmt(seasonPointsGained)} sezon puanı kazandın.`
            : 'Görev ödülü alındı.'),
      )
      setNoticeIsSuccess(true)
      await Promise.all([loadMissions(), loadOverview(), loadProfile()])
    } finally {
      setBusy('')
    }
  }

  const forexMarket = useMemo(() => {
    if (forex?.market && typeof forex.market === 'object') return forex.market
    return null
  }, [forex])

  const forexHolding = useMemo(() => {
    if (forex?.holding && typeof forex.holding === 'object') return forex.holding
    return {
      quantity: 0,
      costTry: 0,
      marketValueTry: 0,
      unrealizedPnlTry: 0,
      unrealizedPnlPercent: 0,
      realizedPnlTry: 0,
    }
  }, [forex])

  const forexTradeQuantityRaw = String(forexTradeForm.quantity || '').replace(/[^\d]/g, '')
  const forexTradeQuantity = Math.max(0, Math.trunc(num(forexTradeQuantityRaw)))
  const forexTradeQuantityTooHigh = (
    forexTradeQuantityRaw.length > FOREX_TRADE_MAX_QUANTITY_DIGITS
    || forexTradeQuantity > FOREX_TRADE_MAX_QUANTITY
  )
  const forexTradeSide = String(forexTradeForm.side || '').trim().toLowerCase() === 'sell'
    ? 'sell'
    : 'buy'
  const forexTradeRate = forexTradeSide === 'sell'
    ? num(forexMarket?.sellRate)
    : num(forexMarket?.buyRate)
  const forexTradeRateValid = Number.isFinite(forexTradeRate) && forexTradeRate > 0
  const forexTradeGrossPreview = forexTradeRateValid
    ? Math.max(0, Math.round(forexTradeQuantity * forexTradeRate))
    : 0
  const forexTradeFeePreview = forexTradeGrossPreview > 0
    ? Math.max(0, Math.round(forexTradeGrossPreview * FOREX_TRADE_FEE_RATE))
    : 0
  const forexTradeTotalPreview = forexTradeSide === 'buy'
    ? forexTradeGrossPreview + forexTradeFeePreview
    : Math.max(0, forexTradeGrossPreview - forexTradeFeePreview)
  const forexWalletTry = Math.max(0, Math.trunc(num(overview?.profile?.wallet || 0)))
  const forexHoldingQuantity = Math.max(0, Math.trunc(num(forexHolding?.quantity || 0)))
  const forexHoldingCostTry = Math.max(0, num(forexHolding?.costTry || 0))
  const forexHoldingMarketValueTry = Math.max(
    0,
    num(forexHolding?.marketValueTry || (forexHoldingQuantity * Math.max(0, num(forexMarket?.sellRate || 0)))),
  )
  const forexHoldingUnrealizedPnlTry = num(forexHolding?.unrealizedPnlTry || (forexHoldingMarketValueTry - forexHoldingCostTry))
  const forexHoldingUnrealizedPnlPercent = forexHoldingCostTry > 0
    ? ((forexHoldingUnrealizedPnlTry / forexHoldingCostTry) * 100)
    : 0
  const forexHoldingAverageBuyRate = forexHoldingQuantity > 0
    ? (forexHoldingCostTry / forexHoldingQuantity)
    : 0
  const forexHoldingRemainingCapacity = Math.max(0, FOREX_TRADE_MAX_TOTAL_QUANTITY - forexHoldingQuantity)
  const forexTradeInsufficientHoldings = (
    forexTradeSide === 'sell'
    && (forexHoldingQuantity + 0.000001) < forexTradeQuantity
  )
  const forexTradeExceedsTotalHoldingCap = (
    forexTradeSide === 'buy'
    && forexTradeQuantity > forexHoldingRemainingCapacity
  )
  const forexTradeInsufficientWallet = (
    forexTradeSide === 'buy'
    && forexTradeTotalPreview > forexWalletTry
  )
  const forexTradeMaxQuantity = forexTradeSide === 'buy'
    ? (
      forexTradeRateValid
        ? Math.max(
          0,
          Math.min(
            FOREX_TRADE_MAX_QUANTITY,
            forexHoldingRemainingCapacity,
            Math.trunc(forexWalletTry / Math.max(1, forexTradeRate * (1 + FOREX_TRADE_FEE_RATE))),
          ),
        )
        : 0
    )
    : Math.max(0, Math.min(FOREX_TRADE_MAX_QUANTITY, forexHoldingQuantity))
  const forexTradeSubmitBlocked = (
    Boolean(busy)
    || !forexMarket
    || !forexTradeRateValid
    || forexTradeQuantity < 1
    || forexTradeQuantityTooHigh
    || forexTradeInsufficientHoldings
    || forexTradeExceedsTotalHoldingCap
    || forexTradeInsufficientWallet
  )
  const forexDayChangePercent = num(forexMarket?.dayChangePercent || 0)
  const forexTrendDirection = forexDayChangePercent >= 0 ? 'up' : 'down'
  const forexSpreadTry = Math.max(
    0,
    Math.round(Math.max(0, num(forexMarket?.buyRate || forexMarket?.rate || 0) - num(forexMarket?.sellRate || 0))),
  )
  const forexIsMobileView = forexViewportWidth <= 760
  const forexChartInteractionEnabled = true
  const forexChartRange = FOREX_CHART_RANGE_OPTIONS.find((option) => option.id === forexChartRangeId) || FOREX_CHART_RANGE_OPTIONS[1]

  const formatForexChartAxisLabel = (value, rangeSeconds = 60) => {
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '--'
    const year = dt.getFullYear()
    const month = `${dt.getMonth() + 1}`.padStart(2, '0')
    const day = `${dt.getDate()}`.padStart(2, '0')
    const hour = `${dt.getHours()}`.padStart(2, '0')
    const minute = `${dt.getMinutes()}`.padStart(2, '0')
    const second = `${dt.getSeconds()}`.padStart(2, '0')
    if (forexIsMobileView) {
      if (rangeSeconds <= (24 * 60 * 60)) {
        return `${hour}:${minute}`
      }
      if (rangeSeconds <= (3 * 24 * 60 * 60)) {
        return `${day}.${month} ${hour}:${minute}`
      }
      return `${day}.${month}`
    }
    if (rangeSeconds <= 3600) {
      return `${hour}:${minute}:${second}`
    }
    if (rangeSeconds <= (3 * 24 * 60 * 60)) {
      return `${day}.${month} ${hour}:${minute}`
    }
    return `${year}-${month}-${day} ${hour}:${minute}`
  }

  const formatForexChartUpdatedAt = (value) => {
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '--:--:--'
    return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, '0')}-${`${dt.getDate()}`.padStart(2, '0')} ${`${dt.getHours()}`.padStart(2, '0')}:${`${dt.getMinutes()}`.padStart(2, '0')}:${`${dt.getSeconds()}`.padStart(2, '0')}`
  }
  const formatForexChartUpdatedAtCompact = (value) => {
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '--.-- --:--'
    return `${`${dt.getDate()}`.padStart(2, '0')}.${`${dt.getMonth() + 1}`.padStart(2, '0')} ${`${dt.getHours()}`.padStart(2, '0')}:${`${dt.getMinutes()}`.padStart(2, '0')}`
  }
  const forexLastUpdateRaw = String(forexMarket?.updatedAt || '').trim()
  const forexLastUpdateLabel = forexLastUpdateRaw
    ? (forexIsMobileView ? formatForexChartUpdatedAtCompact(forexLastUpdateRaw) : formatForexChartUpdatedAt(forexLastUpdateRaw))
    : '--'
  const forexUpdateIntervalMs = Math.max(1000, Math.trunc(num(forexMarket?.updateIntervalMs || (3 * 60 * 60 * 1000))))
  const forexNextUpdateAtRaw = String(forexMarket?.nextUpdateAt || '').trim()
  const forexNextUpdateMsFromServer = new Date(forexNextUpdateAtRaw).getTime()
  const forexLastUpdatedMs = new Date(String(forexMarket?.updatedAt || '').trim()).getTime()
  const forexNextUpdateMs = Number.isFinite(forexNextUpdateMsFromServer)
    ? forexNextUpdateMsFromServer
    : (Number.isFinite(forexLastUpdatedMs) ? (forexLastUpdatedMs + forexUpdateIntervalMs) : NaN)
  const forexNextUpdateLabel = Number.isFinite(forexNextUpdateMs)
    ? (
      forexIsMobileView
        ? formatForexChartUpdatedAtCompact(new Date(forexNextUpdateMs).toISOString())
        : formatForexChartUpdatedAt(new Date(forexNextUpdateMs).toISOString())
    )
    : '--'
  const handleForexCountdownElapsed = useCallback(() => {
    if (activeTabRef.current !== 'forex') return
    const previousUpdatedAt = String(forexLastUpdateRaw || '').trim()
    const maxAttempts = 8
    let attempts = 0

    const refreshUntilAdvanced = async () => {
      if (activeTabRef.current !== 'forex') return
      attempts += 1
      const response = await loadForex()
      const nextUpdatedAt = String(response?.market?.updatedAt || '').trim()
      if (nextUpdatedAt && nextUpdatedAt !== previousUpdatedAt) return
      if (attempts >= maxAttempts || typeof window === 'undefined') return
      clearTimeout(forexBoundaryRetryTimerRef.current)
      forexBoundaryRetryTimerRef.current = window.setTimeout(() => {
        void refreshUntilAdvanced()
      }, 2500)
    }

    clearTimeout(forexBoundaryRetryTimerRef.current)
    void refreshUntilAdvanced()
  }, [forexLastUpdateRaw, loadForex])

  const handleBankCountdownElapsed = useCallback(() => {
    if (activeTabRef.current !== 'bank') return
    void loadBank({ force: true })
  }, [loadBank])

  const buildSmoothForexPath = useCallback((points) => {
    if (!Array.isArray(points) || points.length === 0) return ''
    if (points.length === 1) {
      const point = points[0]
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    }

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[index - 1] || points[index]
      const p1 = points[index]
      const p2 = points[index + 1]
      const p3 = points[index + 2] || p2

      const cp1x = p1.x + ((p2.x - p0.x) / 6)
      const cp1y = p1.y + ((p2.y - p0.y) / 6)
      const cp2x = p2.x - ((p3.x - p1.x) / 6)
      const cp2y = p2.y - ((p3.y - p1.y) / 6)

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    }

    return d
  }, [])

  const buildFallbackForexHistory = useCallback((baseRateValue) => {
    const safeBaseRate = Math.max(0.0001, num(baseRateValue) || 3750000)
    const pointCount = 72
    const fallbackStepMs = 3 * 60 * 60 * 1000
    const nowMs = Date.now()
    const seed = Math.trunc(safeBaseRate * 1000)
    const pseudoNoise = (index, salt = 0) => {
      const x = Math.sin(((index + 1) * 12.9898) + ((seed + salt) * 78.233)) * 43758.5453
      return x - Math.floor(x)
    }

    const rows = []
    let rate = safeBaseRate
    let velocity = 0

    for (let index = 0; index < pointCount; index += 1) {
      const volRegime = 0.00022 + (pseudoNoise(index, 7) * 0.0007)
      const drift = (pseudoNoise(index, 19) - 0.5) * 0.00035
      const shock = (pseudoNoise(index, 31) - 0.5) * volRegime
      velocity = (velocity * 0.64) + shock + drift
      rate = Math.max(0.0001, rate * (1 + velocity))
      rows.push({
        at: new Date(nowMs - ((pointCount - 1 - index) * fallbackStepMs)).toISOString(),
        rate: Math.round(rate * 10000) / 10000,
      })
    }

    return rows
  }, [])

  const forexChartData = useMemo(() => {
    const rawSource = Array.isArray(forexMarket?.history) ? forexMarket.history.slice(-500) : []
    const nowMs = Date.now()
    const normalizedSource = rawSource
      .map((entry, index) => {
        const rate = Math.max(0.0001, num(entry?.rate ?? entry?.close ?? entry?.price))
        const rawAt = String(entry?.at || entry?.time || entry?.ts || '').trim()
        const parsedMs = new Date(rawAt).getTime()
        const atMs = Number.isFinite(parsedMs) ? parsedMs : (nowMs - ((rawSource.length - 1 - index) * (3 * 60 * 60 * 1000)))
        return {
          at: new Date(atMs).toISOString(),
          rate,
        }
      })
      .filter((entry) => Number.isFinite(entry.rate) && entry.rate > 0)

    const seedSource = normalizedSource.length >= 8 ? normalizedSource : buildFallbackForexHistory(forexMarket?.rate)
    if (!seedSource.length) return null
    const rangeSeconds = Math.max(60, Math.trunc(num(forexChartRange?.seconds || 60)))
    const latestMs = new Date(seedSource[seedSource.length - 1]?.at || '').getTime()
    const cutoffMs = Number.isFinite(latestMs) ? latestMs - (rangeSeconds * 1000) : 0
    const rangeSource = seedSource.filter((entry) => new Date(entry?.at || '').getTime() >= cutoffMs)
    const source = rangeSource.length >= 8
      ? rangeSource
      : seedSource.slice(-Math.max(8, Math.trunc(num(forexChartRange?.candleCount || 24))))
    if (!source.length) return null

    const maxPointCount = clamp(
      Math.trunc(num(forexChartRange?.candleCount || 24)) + 8,
      16,
      72,
    )
    const sampleStep = Math.max(1, Math.ceil(source.length / maxPointCount))
    const sampled = source.filter((_, index) => (index % sampleStep) === 0 || index === source.length - 1)
    if (sampled.length < 2) return null

    const width = 696
    const height = 332
    const padLeft = forexIsMobileView ? 66 : 90
    const padRight = forexIsMobileView ? 18 : 24
    const padTop = forexIsMobileView ? 14 : 18
    const padBottom = forexIsMobileView ? 94 : 104
    const innerWidth = width - (padLeft + padRight)
    const innerHeight = height - (padTop + padBottom)
    const rates = sampled.map((entry) => Math.max(0.0001, num(entry?.rate)))
    const minDataRate = Math.min(...rates)
    const maxDataRate = Math.max(...rates)
    let minRate = minDataRate
    let maxRate = maxDataRate
    const axisSpanRaw = Math.abs(maxRate - minRate)
    if (axisSpanRaw < 0.0001) {
      const delta = Math.max(0.4, maxRate * 0.0035)
      minRate -= delta
      maxRate += delta
    } else {
      const padding = Math.max(0.18, axisSpanRaw * 0.14)
      minRate -= padding
      maxRate += padding
    }
    minRate = Math.max(0.0001, minRate)
    maxRate = Math.max(minRate + 0.0001, maxRate)

    const chartFloorY = height - padBottom
    const rateSpan = Math.max(0.0001, maxRate - minRate)
    const rateToY = (value) => padTop + (((maxRate - Math.max(0.0001, num(value))) / rateSpan) * innerHeight)

    const points = sampled.map((entry, index) => {
      const x = padLeft + ((index / Math.max(1, sampled.length - 1)) * innerWidth)
      const rate = Math.max(0.0001, num(entry?.rate))
      const y = rateToY(rate)
      const previousRate = index > 0 ? Math.max(0.0001, num(sampled[index - 1]?.rate)) : rate
      const changePercent = previousRate > 0 ? ((rate - previousRate) / previousRate) * 100 : 0
      return {
        x,
        y,
        rate,
        at: entry?.at || '',
        changePercent,
      }
    })
    if (!points.length) return null

    const smoothLinePath = buildSmoothForexPath(points)
    const firstPoint = points[0]
    const latestPoint = points[points.length - 1]
    const smoothAreaPath = smoothLinePath
      ? `${smoothLinePath} L ${latestPoint.x.toFixed(2)} ${chartFloorY.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${chartFloorY.toFixed(2)} Z`
      : ''

    const xTickCount = forexIsMobileView
      ? (rangeSeconds >= (6 * 24 * 60 * 60) ? 5 : 4)
      : (rangeSeconds >= (6 * 24 * 60 * 60)
        ? 8
        : (rangeSeconds >= (24 * 60 * 60) ? 7 : 6))
    const xTickIndexes = Array.from(
      new Set(
        Array.from({ length: xTickCount }, (_, index) => (
          Math.round((points.length - 1) * (index / Math.max(1, xTickCount - 1)))
        )),
      ),
    ).filter((index) => index >= 0 && index < points.length)

    const xTicks = xTickIndexes
      .map((pointIndex, tickIndex) => {
        const point = points[pointIndex]
        if (!point) return null
        const total = xTickIndexes.length
        let x = point.x
        let anchor = 'end'
        if (forexIsMobileView) {
          if (tickIndex === 0) {
            x = point.x + 4
            anchor = 'start'
          } else if (tickIndex === (total - 1)) {
            x = point.x - 2
            anchor = 'end'
          } else {
            anchor = 'middle'
          }
        }
        return {
          x,
          label: formatForexChartAxisLabel(point.at, rangeSeconds),
          anchor,
        }
      })
      .filter(Boolean)

    const yTickCount = forexIsMobileView ? 5 : 6
    const yTicks = Array.from({ length: yTickCount }, (_, index) => {
      const ratio = index / Math.max(1, yTickCount - 1)
      const rate = maxRate - (rateSpan * ratio)
      const y = padTop + (innerHeight * ratio)
      return { y, rate }
    })

    const minPoint = points.reduce((lowest, point) => (point.rate < lowest.rate ? point : lowest), points[0])
    const maxPoint = points.reduce((highest, point) => (point.rate > highest.rate ? point : highest), points[0])
    const latestPointRef = points[points.length - 1]

    const currentRate = latestPointRef?.rate || 0
    const startRate = points[0]?.rate || 0
    const changePercent = startRate > 0 ? ((currentRate - startRate) / startRate) * 100 : 0

    const firstMs = new Date(source[0]?.at).getTime()
    const lastMs = new Date(source[source.length - 1]?.at).getTime()
    const spanSeconds = Number.isFinite(firstMs) && Number.isFinite(lastMs)
      ? Math.max(1, Math.round((lastMs - firstMs) / 1000))
      : Math.max(1, source.length - 1)

    const latestLabelWidth = forexIsMobileView ? 118 : 142
    const latestLabelHeight = forexIsMobileView ? 26 : 30
    const latestLabelX = clamp(
      latestPointRef.x - (latestLabelWidth / 2),
      padLeft + 6,
      width - padRight - latestLabelWidth - 6,
    )
    const latestLabelY = clamp(
      latestPointRef.y - latestLabelHeight - 10,
      padTop + 4,
      chartFloorY - latestLabelHeight - 4,
    )

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      chartFloorY,
      smoothLinePath,
      smoothAreaPath,
      points,
      latestPriceLineY: latestPointRef.y,
      xTicks,
      yTicks,
      minPoint: minPoint ? { x: minPoint.x, y: minPoint.y } : null,
      maxPoint: maxPoint ? { x: maxPoint.x, y: maxPoint.y } : null,
      latestPoint: latestPointRef ? { x: latestPointRef.x, y: latestPointRef.y } : null,
      latestLabelX,
      latestLabelY,
      latestLabelWidth,
      latestLabelHeight,
      summary: {
        currentRate,
        minRate: minDataRate,
        maxRate: maxDataRate,
        changePercent,
        spanSeconds,
        updatedAt: source[source.length - 1]?.at || '',
      },
    }
  }, [buildFallbackForexHistory, buildSmoothForexPath, forexChartRange, forexIsMobileView, forexMarket])

  useEffect(() => {
    setForexChartHoverIndex(-1)
    if (typeof window !== 'undefined' && forexHoverRafRef.current) {
      window.cancelAnimationFrame(forexHoverRafRef.current)
      forexHoverRafRef.current = 0
    }
    forexHoverPendingRef.current = null
  }, [forexChartRangeId, forexMarket?.id])

  useEffect(() => {
    if (!forexChartData?.points?.length) {
      setForexChartHoverIndex(-1)
      return
    }
    setForexChartHoverIndex((prev) => (prev >= 0 && prev < forexChartData.points.length ? prev : -1))
  }, [forexChartData])

  const setForexHoverByClientX = useCallback((clientX, currentTarget) => {
    if (!forexChartInteractionEnabled || !forexChartData?.points?.length || !currentTarget) return
    const rect = currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    const cursorX = forexChartData.padLeft + ((forexChartData.width - (forexChartData.padLeft + forexChartData.padRight)) * ratio)
    const points = forexChartData.points
    let low = 0
    let high = points.length - 1
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      const midX = num(points[mid]?.x)
      if (midX < cursorX) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    let bestIndex = low
    if (bestIndex > 0) {
      const prevX = num(points[bestIndex - 1]?.x)
      const nextX = num(points[bestIndex]?.x)
      if (Math.abs(prevX - cursorX) <= Math.abs(nextX - cursorX)) {
        bestIndex -= 1
      }
    }
    setForexChartHoverIndex((prev) => (prev === bestIndex ? prev : bestIndex))
  }, [forexChartData, forexChartInteractionEnabled])

  const queueForexTouchHoverByClientX = useCallback((clientX, currentTarget) => {
    if (!forexIsMobileView || !forexChartInteractionEnabled || !forexChartData?.points?.length || !currentTarget) return
    if (typeof window === 'undefined') return
    forexHoverPendingRef.current = { clientX, currentTarget }
    if (forexHoverRafRef.current) return
    forexHoverRafRef.current = window.requestAnimationFrame(() => {
      forexHoverRafRef.current = 0
      const pending = forexHoverPendingRef.current
      if (!pending) return
      setForexHoverByClientX(pending.clientX, pending.currentTarget)
    })
  }, [forexChartData, forexChartInteractionEnabled, forexIsMobileView, setForexHoverByClientX])

  const runForexTradeAction = async () => {
    if (busy || !forexMarket) return
    if (forexTradeQuantityTooHigh) {
      setError(`Güvenlik limiti: en fazla ${fmt(FOREX_TRADE_MAX_QUANTITY)} adet işlem yapabilirsin.`)
      return
    }
    if (forexTradeQuantity < 1) {
      setError('Minimum işlem miktarı 1 adet olmalıdır.')
      return
    }
    if (!Number.isSafeInteger(forexTradeQuantity)) {
      setError('Geçersiz işlem miktarı algılandı. Lütfen tekrar deneyin.')
      return
    }

    if (!forexTradeRateValid || !Number.isFinite(forexTradeTotalPreview) || forexTradeTotalPreview <= 0) {
      setError('Kur verisi güncelleniyor. Birkaç saniye sonra tekrar deneyin.')
      return
    }
    if (forexTradeSide === 'buy' && forexTradeInsufficientWallet) {
      setError(`Yetersiz nakit. Bu işlem için ${fmtTry(forexTradeTotalPreview)} gerekiyor.`)
      return
    }
    if (forexTradeSide === 'buy' && forexTradeExceedsTotalHoldingCap) {
      setError(`Maksimum toplam TCT limiti ${fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} adet. Kalan kapasite: ${fmt(forexHoldingRemainingCapacity)}.`)
      return
    }
    if (forexTradeSide === 'sell' && forexTradeInsufficientHoldings) {
      setError('Bozum için yeterli TCT bakiyesi yok.')
      return
    }

    const safeQuantity = Math.max(
      1,
      Math.min(
        FOREX_TRADE_MAX_QUANTITY,
        forexTradeSide === 'buy' ? forexHoldingRemainingCapacity : FOREX_TRADE_MAX_QUANTITY,
        forexTradeQuantity,
      ),
    )
    const rawCurrencyId = String(forexMarket?.id || 'tct').trim().toLowerCase()
    const safeCurrencyId = FOREX_CURRENCY_ID_PATTERN.test(rawCurrencyId) ? rawCurrencyId : 'tct'
    const busyKey = forexTradeSide === 'buy' ? 'forex-buy' : 'forex-sell'
    setBusy(busyKey)
    try {
      const response = forexTradeSide === 'buy'
        ? await buyForexCurrency(safeQuantity, safeCurrencyId)
        : await sellForexCurrency(safeQuantity, safeCurrencyId)

      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Döviz işlemi başarısız.')
      }

      setNotice(
        response?.message
          || (forexTradeSide === 'buy' ? 'TCT alımı tamamlandı.' : 'TCT bozumu tamamlandı.'),
      )
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadForex()])
    } finally {
      setBusy('')
    }
  }

  const runBankDepositAction = async () => {
    if (busy) return
    if (bankDepositAmount < bankTransferMinAmount) {
      setError(`Yatırılacak tutar en az ${fmt(bankTransferMinAmount)} olmalıdır.`)
      return
    }
    if (bankDepositAmount > bankWalletNow) {
      setError(`Yetersiz nakit. En fazla ${fmt(bankWalletNow)} yatırabilirsin.`)
      return
    }
    setBusy(bankBusyDepositKey)
    try {
      const response = await depositBankCash(bankDepositAmount)
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Bankaya yatırma işlemi başarısız.')
      }
      setBankState(response?.bank || null)
      setBankForm((prev) => ({ ...prev, depositAmount: '' }))
      setNotice(response?.message || 'Nakit bankaya başarıyla aktarıldı.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const runBankWithdrawAction = async () => {
    if (busy) return
    if (bankWithdrawAmount < bankTransferMinAmount) {
      setError(`Çekilecek tutar en az ${fmt(bankTransferMinAmount)} olmalıdır.`)
      return
    }
    if (bankWithdrawAmount > bankMainBalance) {
      setError(`Banka bakiyesi yetersiz. En fazla ${fmt(bankMainBalance)} çekebilirsin.`)
      return
    }
    setBusy(bankBusyWithdrawKey)
    try {
      const response = await withdrawBankCash(bankWithdrawAmount)
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Bankadan çekim işlemi başarısız.')
      }
      setBankState(response?.bank || null)
      setBankForm((prev) => ({ ...prev, withdrawAmount: '' }))
      setNotice(response?.message || 'Bankadan nakit çekme işlemi tamamlandı.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const runBankTermOpenAction = async () => {
    if (busy) return
    if (bankTermLive.active) {
      setError('Aktif bir vadeli hesabın var. Önce mevcut vadeyi tahsil etmelisin.')
      return
    }
    if (bankMainBalance < bankTransferMinAmount) {
      setError('Vadeli açmak için önce bankaya para yatırmalısın.')
      return
    }
    if (bankTermAmount < bankTransferMinAmount) {
      setError(`Vadeli için en az ${fmt(bankTransferMinAmount)} yatırmalısın.`)
      return
    }
    if (bankTermAmount > bankMainBalance) {
      setError(`Vadeli açmak için banka bakiyesi yetersiz. En fazla ${fmt(bankMainBalance)} yatırabilirsin.`)
      return
    }
    if (bankTermAmount > bankTermMaxPrincipal) {
      setError(`Vadeli yatırım üst limiti ${fmt(bankTermMaxPrincipal)}. Daha yüksek tutar giremezsin.`)
      return
    }
    const safeDays = Math.max(1, Math.trunc(num(bankSelectedTermDays || 1)))
    setBusy(bankBusyTermOpenKey)
    try {
      const response = await openBankTermDeposit(bankTermAmount, safeDays)
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Vadeli hesap açılamadı.')
      }
      setBankState(response?.bank || null)
      setBankForm((prev) => ({ ...prev, termAmount: '' }))
      setNotice(response?.message || 'Vadeli faiz hesabı açıldı.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const runBankTermClaimAction = async () => {
    if (busy) return
    if (!bankTermLive.active) {
      setError('Tahsil edilecek aktif vadeli hesap bulunmuyor.')
      return
    }
    if (!bankTermMatured) {
      setError(`Vade henüz dolmadı. Kalan süre: ${bankTermCountdownLabel}.`)
      return
    }
    setBusy(bankBusyTermClaimKey)
    try {
      const response = await claimBankTermDeposit()
      if (!response?.success) {
        return fail(response, response?.errors?.global || 'Vadeli tahsilatı yapılamadı.')
      }
      setBankState(response?.bank || null)
      setNotice(response?.message || 'Vadeli faiz tahsil edildi.')
      setNoticeIsSuccess(true)
      await Promise.all([loadOverview(), loadProfile(), loadBank()])
    } finally {
      setBusy('')
    }
  }

  const forexHoveredCandle = (
    forexChartData
    && forexChartHoverIndex >= 0
    && forexChartHoverIndex < forexChartData.points.length
  )
    ? forexChartData.points[forexChartHoverIndex]
    : null

  const missionsView = (
    <section className="panel-stack home-sections missions-screen">
      <article className="card missions-card">
        <div className="missions-header">
          <div>
            <h3 style={{ margin: 0 }}>Görevler</h3>
            <p className="muted missions-subtitle">
              Ödülünü aldığın görev 4 saat sonra yenilenir.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home')}>
            Şehir
          </button>
        </div>

        {missions === null ? (
          <p className="empty" style={{ marginTop: 16 }}>
            Yükleniyor...
          </p>
        ) : missionItems.length === 0 ? (
          <p className="empty" style={{ marginTop: 16 }}>
            Görev bulunamadı.
          </p>
        ) : (
          <div className="missions-layout">
            <div className="missions-summary">
              <span className="missions-summary-pill">
                Seri #{fmt(missionBatchIndex)} · {fmt(missionClaimedCount)}/{fmt(missionBatchSize)} tamamlandı
              </span>
              <span className="missions-summary-pill">Sezon puanı: {fmt(missionSeasonPointsTotal)}</span>
              <span className="missions-summary-pill">Her görev ödülünde +10 sezon puanı kazanırsın.</span>
            </div>

            <div className="missions-grid-pro">
              {missionItems.map((mission, index) => {
                const missionId = String(mission?.id || '').trim() || `mission-${index}`
                const title = String(mission?.title || 'Görev').trim() || 'Görev'
                const description = String(mission?.description || '').trim()
                const progressMeta = missionProgressMeta(mission)
                const missionTimerRemainingMs = missionSlotRemainingMs(mission)
                const showMissionTimer = progressMeta.isClaimed
                const rewardCash = Math.max(
                  0,
                  Math.trunc(num(mission?.rewardCash ?? mission?.reward?.cash ?? 0)),
                )
                const rewardXp = Math.max(
                  0,
                  Math.trunc(num(mission?.rewardXp ?? mission?.reward?.xp ?? 0)),
                )
                const rewardItems = missionRewardItems(mission)
                const isClaiming = busy === `claim-mission:${missionId}`

                return (
                  <article key={missionId} className="mission-card-pro">
                    <div className="mission-card-head">
                      <div className="mission-card-title-wrap">
                        <span className="mission-order-chip">#{index + 1}</span>
                        <div>
                          <p className="mission-card-title">{title}</p>
                          {description ? <p className="mission-card-desc">{description}</p> : null}
                        </div>
                      </div>
                      <div className="mission-head-meta">
                        {showMissionTimer ? (
                          <span className="mission-slot-timer" title="Yeni görev için kalan süre">
                            {formatCountdownClock(missionTimerRemainingMs)}
                          </span>
                        ) : null}
                        <span
                          className={`mission-status-chip ${progressMeta.isClaimed ? 'is-claimed' : progressMeta.isClaimable ? 'is-claimable' : 'is-active'}`}
                        >
                          {progressMeta.statusText}
                        </span>
                      </div>
                    </div>

                    <div className="mission-progress-wrap" aria-label="Görev ilerleme">
                      <div className="mission-progress-track" aria-hidden="true">
                        <div className="mission-progress-fill" style={{ width: `${progressMeta.percent}%` }} />
                      </div>
                      <p className="mission-progress-meta">
                        {fmt(progressMeta.progress)} / {fmt(progressMeta.target)} · %{fmt(progressMeta.percent)}
                      </p>
                    </div>

                    <div className="mission-reward-wrap">
                      <div className="mission-money-row">
                        <span className="mission-money-pill">
                          <img
                            src={missionCashIconPng}
                            alt=""
                            aria-hidden="true"
                            onError={(event) => {
                              event.currentTarget.src = '/home/icons/depot/cash.webp'
                            }}
                          />
                          <span>Nakit +{fmt(rewardCash)}</span>
                        </span>
                        <span className="mission-money-pill mission-money-pill-xp">
                          <img
                            src={missionXpIconPng}
                            alt=""
                            aria-hidden="true"
                            onError={(event) => {
                              event.currentTarget.src = '/home/ui/hud/xp-icon.webp'
                            }}
                          />
                          <span>XP +{fmt(rewardXp)}</span>
                        </span>
                      </div>
                      {rewardItems.length > 0 ? (
                        <div className="mission-reward-items">
                          {rewardItems.map((entry) => (
                            <span key={`${missionId}:${entry.itemId}`} className="mission-reward-item">
                              <img
                                src={entry.icon}
                                alt=""
                                aria-hidden="true"
                                onError={(event) => {
                                  event.currentTarget.src = '/home/icons/v2/nav-missions.png'
                                }}
                              />
                              <span className="mission-reward-amount">{fmt(entry.amount)}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {progressMeta.isClaimable ? (
                      <div className="mission-claim-slot">
                        <button
                          type="button"
                          className="todo-go is-primary mission-claim-btn"
                          onClick={() => void claimDailyMissionAction(missionId)}
                          disabled={isClaiming}
                        >
                          {isClaiming ? 'Alınıyor...' : 'Ödülü Al'}
                        </button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </article>
    </section>
  )

  const tradeableDepotItems = (DEPOT_CATALOG || []).filter(
    (d) => !d.fromWallet && !d.fromReputation && d.id !== 'water-right' && d.label !== 'Su'
  )
  const marketplaceMaxQty = logisticsTotalCapacityNow > 0 ? logisticsTotalCapacityNow : 0
  const marketplaceNoCapacity = logisticsTotalCapacityNow <= 0
  const cashIconSrc = '/home/icons/depot/cash.webp'
  const NakitLabel = ({ value, showIcon = true }) => (
    <span className="marketplace-nakit-inline">
      {showIcon && <img src={cashIconSrc} alt="" className="marketplace-nakit-icon" onError={(e) => { e.target.style.display = 'none' }} />}
      <span>{typeof value === 'number' ? fmt(value) : String(value ?? '')}</span>
      <span className="marketplace-nakit-text"> Nakit</span>
    </span>
  )
  const marketplaceView = (
    <section className="panel-stack home-sections marketplace-screen marketplace-glass">
      <article className="card marketplace-panel marketplace-panel-glass">
        <div className="marketplace-top">
          <div className="marketplace-top-left">
            <img src="/home/icons/pazaryeri.webp" alt="" className="marketplace-title-icon" onError={(e) => { e.target.style.display = 'none' }} />
            <div>
              <h3 className="marketplace-title">Pazar Yeri</h3>
              <p className="marketplace-subtitle">Ürün Pazarı · Vergi: %10</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home', { tab: 'home' })}>Şehir</button>
        </div>
        {marketplaceNoCapacity && (
          <div className="marketplace-no-capacity-banner card" role="alert" style={{ background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
            <p style={{ margin: 0, color: '#dc2626', fontWeight: 600 }}>
              Alım satım yapabilmek için en az bir tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.
            </p>
          </div>
        )}
        <div className="marketplace-wallet-row">
          <span className="marketplace-wallet-item">
            <img src={cashIconSrc} alt="" className="marketplace-wallet-icon" onError={(e) => { e.target.style.display = 'none' }} />
            <span>{walletCashValue} Nakit</span>
          </span>
          <span className="marketplace-wallet-item">
            <img src="/home/icons/depot/diamond.webp" alt="" className="marketplace-wallet-icon" onError={(e) => { e.target.style.display = 'none' }} />
            <span>{walletGoldValue} Elmas</span>
          </span>
        </div>
        <div className="marketplace-section marketplace-section-tabs">
          <div className="marketplace-tabs">
            <button type="button" className={`marketplace-tab ${marketplaceTab === 'pazar' ? 'active' : ''}`} onClick={() => setMarketplaceTab('pazar')}><span className="marketplace-tab-emoji" aria-hidden>🏪</span> Pazar Yeri</button>
            <button type="button" className={`marketplace-tab ${marketplaceTab === 'sat' ? 'active' : ''}`} onClick={() => setMarketplaceTab('sat')}><span className="marketplace-tab-emoji" aria-hidden>🏷️</span> Satış İlanı</button>
            <button type="button" className={`marketplace-tab ${marketplaceTab === 'ilanlarim' ? 'active' : ''}`} onClick={() => setMarketplaceTab('ilanlarim')}><span className="marketplace-tab-emoji" aria-hidden>📋</span> İlanlarım ({(market?.openOrders || []).filter((o) => o.status === 'open' && o.side === 'sell').length})</button>
          </div>
        </div>
        {marketplaceTab === 'pazar' && (
          <div className="marketplace-tab-content marketplace-section marketplace-section-content">
            <div className="marketplace-block marketplace-block-filters">
              <div className="marketplace-filters">
              <button type="button" className={`marketplace-filter-pill ${marketplaceFilter === 'all' ? 'active' : ''}`} onClick={() => setMarketplaceFilter('all')}><span className="marketplace-filter-emoji" aria-hidden>📦</span> Tümü</button>
              {tradeableDepotItems.map((item) => (
                <button key={item.id} type="button" className={`marketplace-filter-pill ${marketplaceFilter === item.id ? 'active' : ''}`} onClick={() => setMarketplaceFilter(item.id)}>
                  {item.png ? <img src={item.png} alt="" className="marketplace-filter-icon" onError={(e) => { e.target.style.display = 'none' }} /> : <span className="marketplace-filter-emoji" aria-hidden>📦</span>}
                  {item.label}
                </button>
              ))}
              </div>
            </div>
            <div className="marketplace-block marketplace-block-capacity">
              <p className="marketplace-capacity-hint">
                <img src="/home/icons/depot/capacity.png" alt="" className="marketplace-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                {marketplaceNoCapacity
                  ? 'Tır kapasitesi olmadan pazar alım satımı yapılamaz.'
                  : <>Satın alımda en fazla <strong>{fmt(marketplaceMaxQty)} adet</strong> alabilirsin (toplam tır kapasitesi).</>}
              </p>
            </div>
            <div className="marketplace-block marketplace-block-list">
            <div className="marketplace-list">
              {(() => {
                const sellOrders = market?.sellOrders || []
                const items = (market?.items || []).filter(
                  (m) => tradeableDepotItems.some((t) => t.id === m.id) && (marketplaceFilter === 'all' || m.id === marketplaceFilter)
                )
                const rows = []
                for (const item of items) {
                  const meta = tradeableDepotItems.find((t) => t.id === item.id)
                  const ordersForItem = sellOrders.filter((o) => o.itemId === item.id)
                  for (const o of ordersForItem) {
                    rows.push({
                      type: 'order',
                      key: o.orderId,
                      orderId: o.orderId,
                      itemId: o.itemId,
                      itemName: o.itemName || meta?.label || o.itemId,
                      price: o.limitPrice,
                      stock: o.quantity,
                      sellerName: o.sellerName,
                      sellerUserId: o.sellerUserId,
                      icon: meta?.png,
                    })
                  }
                }
                if (rows.length === 0) {
                  return (
                    <div className="marketplace-list-empty card">
                      <p className="muted" style={{ margin: 0 }}>Bu filtrede oyuncu ilanı yok. Satış İlanı sekmesinden ilan verebilir veya başka kategori seçebilirsin.</p>
                    </div>
                  )
                }
                const wallet = Math.max(0, Math.trunc(num(overview?.profile?.wallet ?? 0)))
                return (
                  <div className="marketplace-buy-list marketplace-buy-list-clean">
                    {rows.map((row) => {
                      const maxBuy = Math.min(marketplaceMaxQty, row.stock)
                      const canAfford = row.price <= wallet
                      const insufficientFunds = row.stock > 0 && !canAfford
                      return (
                        <div key={row.key} className="marketplace-buy-card-clean card">
                          <img src={row.icon || '/home/icons/depot/cash.webp'} alt="" className="marketplace-buy-card-clean-icon" />
                          <div className="marketplace-buy-card-clean-info">
                            <span className="marketplace-buy-card-clean-name">{row.itemName}</span>
                            <span className="marketplace-buy-card-clean-stock">{fmt(row.stock)} adet</span>
                            <span className="marketplace-buy-card-seller">
                              Satıcı:{' '}
                              {row.sellerUserId ? (
                                <button
                                  type="button"
                                  className="marketplace-seller-link"
                                  onClick={() => {
                                    void openProfileModal(row.sellerUserId, {
                                      username: row.sellerName,
                                      displayName: row.sellerName,
                                    })
                                  }}
                                >
                                  {row.sellerName}
                                </button>
                              ) : (
                                row.sellerName
                              )}
                            </span>
                            {insufficientFunds && (
                              <span className="marketplace-buy-card-warning" role="alert">Yetersiz bakiye</span>
                            )}
                            {canAfford && maxBuy < row.stock && (
                              <span className="marketplace-buy-card-hint">En fazla {fmt(maxBuy)} adet (kapasite)</span>
                            )}
                          </div>
                          <div className="marketplace-buy-card-clean-price-wrap">
                            <span className="marketplace-buy-card-clean-price">
                              <img src={cashIconSrc} alt="" className="marketplace-nakit-icon" onError={(e) => { e.target.style.display = 'none' }} />
                              {fmt(row.price)} Nakit
                            </span>
                            <span className="marketplace-buy-card-clean-price-label">adet fiyatı</span>
                          </div>
                          <button
                            type="button"
                            className="btn marketplace-buy-btn-clean"
                            disabled={marketplaceNoCapacity || row.stock <= 0 || !canAfford || busy === `marketplace-buy:${row.key}`}
                            onClick={() => {
                              const defaultQty = Math.max(1, Math.min(marketplaceMaxQty, row.stock))
                              setMarketplaceBuyModal({
                                type: row.type,
                                orderId: row.orderId,
                                itemId: row.itemId,
                                itemName: row.itemName,
                                price: row.price,
                                stock: row.stock,
                                sellerName: row.sellerName,
                                icon: row.icon,
                              })
                              setMarketplaceBuyModalQty(String(defaultQty))
                            }}
                          >
                            {busy === `marketplace-buy:${row.key}` ? '...' : 'SATIN AL'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            </div>
          </div>
        )}
        {marketplaceTab === 'sat' && (
          <div className="marketplace-tab-content marketplace-section marketplace-section-content">
          <div className="marketplace-block marketplace-sell-form card">
              <h4 className="marketplace-sell-form-title"><span className="marketplace-tab-emoji" aria-hidden>🏷️</span> Ürün Satışa Koy</h4>
              {(() => {
                const sellLimit = market?.sellListingsLimit ?? 8
                const sellUsed = market?.sellListingsUsedToday ?? 0
                const remaining = Math.max(0, sellLimit - sellUsed)
                const limitReached = remaining <= 0
                const nextReset = market?.sellListingsNextResetAt
                let resetLabel = 'Limit Türkiye saatine göre her 12 saatte bir (00:00 / 12:00) yenilenir.'
                if (nextReset) {
                  try {
                    const d = new Date(nextReset)
                    resetLabel = `Limit ${d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (Türkiye) yenilenir.`
                  } catch (_) {}
                }
                return (
                  <p className="marketplace-sell-limit-hint">
                    Kalan satış ilanı: <strong>{remaining}/{sellLimit}</strong>. {resetLabel}
                    {limitReached && (
                      <span className="marketplace-sell-limit-reached" role="alert"> Limit bitti.</span>
                    )}
                  </p>
                )
              })()}
              <div className="marketplace-sell-form-row">
                <label className="marketplace-sell-form-label">Ürün</label>
                <select
                  className="marketplace-sell-form-select"
                  value={sellForm.itemId}
                  onChange={(e) => {
                    const itemId = e.target.value
                    const item = tradeableDepotItems.find((i) => i.id === itemId)
                    const stock = item ? Math.max(0, Math.trunc(num(inventoryById[itemId] || 0))) : 0
                    const marketItem = market?.items?.find((i) => i.id === itemId)
                    const price = marketItem?.price != null ? Math.max(1, Math.trunc(num(marketItem.price))) : 100
                    setSellForm((prev) => ({ ...prev, itemId, quantity: String(Math.min(marketplaceMaxQty, Math.max(1, stock))), unitPrice: String(price) }))
                  }}
                >
                  <option value="">Ürün seç</option>
                  {tradeableDepotItems
                    .filter((i) => Math.max(0, Math.trunc(num(inventoryById[i.id] || 0))) > 0)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label} (Stok: {fmt(Math.max(0, Math.trunc(num(inventoryById[i.id] || 0))))})
                      </option>
                    ))}
                </select>
              </div>
              <div className="marketplace-sell-form-row">
                <label className="marketplace-sell-form-label">Miktar</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Miktar"
                  value={sellForm.quantity}
                  onChange={(e) => setSellForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 8) }))}
                  onBlur={() => {
                    if (!sellForm.itemId) return
                    const stock = Math.max(0, Math.trunc(num(inventoryById[sellForm.itemId] || 0)))
                    const maxQ = Math.min(marketplaceMaxQty, stock)
                    const parsed = Math.trunc(num(sellForm.quantity)) || 0
                    const clamped = Math.max(1, Math.min(maxQ, parsed))
                    setSellForm((prev) => ({ ...prev, quantity: String(clamped) }))
                  }}
                  className="marketplace-sell-form-input"
                />
                <span className="marketplace-sell-form-hint">
                  {marketplaceNoCapacity ? 'Tır kapasitesi yok; satışa koyamazsınız.' : `Max: ${fmt(marketplaceMaxQty)} adet (toplam tır kapasitesi)`}
                </span>
                {(Math.trunc(num(sellForm.quantity)) || 0) > marketplaceMaxQty && (
                  <p className="marketplace-capacity-warning" role="alert">
                    Kapasite yetersiz. Tır kapasiteniz {fmt(marketplaceMaxQty)} adet; en fazla {fmt(marketplaceMaxQty)} adet satışa koyabilirsiniz.
                  </p>
                )}
              </div>
              <div className="marketplace-sell-form-row">
                <label className="marketplace-sell-form-label">Adet Fiyatı (Nakit)</label>
                <input
                  type="number"
                  min={1}
                  value={sellForm.unitPrice}
                  onChange={(e) => setSellForm((prev) => ({ ...prev, unitPrice: e.target.value }))}
                  className="marketplace-sell-form-input"
                  placeholder="Adet fiyatı"
                />
                {sellForm.itemId && (() => {
                  const marketItem = market?.items?.find((i) => i.id === sellForm.itemId)
                  const price = marketItem?.price != null ? Math.max(1, Math.trunc(num(marketItem.price))) : 100
                  const minP = Math.max(1, Math.round(price * 0.6))
                  const maxP = Math.max(minP, Math.round(price * 1.5))
                  return <span className="marketplace-sell-form-hint">Adet başı min: {fmt(minP)} Nakit · max: {fmt(maxP)} Nakit</span>
                })()}
              </div>
              <div className="marketplace-sell-form-total">
                Toplam: <strong><NakitLabel value={(() => { const q = Math.max(0, Math.min(marketplaceMaxQty, Math.trunc(num(sellForm.quantity)) || 0)); const p = Math.max(0, Math.trunc(num(sellForm.unitPrice) || 0)); return q * p; })()} /></strong>
              </div>
              <p className="marketplace-sell-form-tax">
                Uyari: Ilan eslesince yuzde 10 vergi kesilir. Ilan, Ilanlarim sekmesinden kaldirilabilir.
              </p>
              <button
                type="button"
                className="btn marketplace-sell-submit"
                disabled={marketplaceNoCapacity || !sellForm.itemId || !String(sellForm.quantity).trim() || !String(sellForm.unitPrice).trim() || busy === 'marketplace-sell' || (Math.trunc(num(sellForm.quantity)) || 0) > marketplaceMaxQty || ((market?.sellListingsUsedToday ?? 0) >= (market?.sellListingsLimit ?? 8))}
                onClick={async () => {
                  if (busy || !sellForm.itemId) return
                  if ((market?.sellListingsUsedToday ?? 0) >= (market?.sellListingsLimit ?? 8)) {
                    fail(null, 'Satış ilanı limitine ulaştınız. Limit Türkiye saatine göre her 12 saatte bir (00:00 / 12:00) yenilenir.')
                    return
                  }
                  const qty = Math.max(1, Math.min(marketplaceMaxQty, Math.trunc(num(sellForm.quantity)) || 1))
                  const stock = Math.max(0, Math.trunc(num(inventoryById[sellForm.itemId] || 0)))
                  if (qty > stock) {
                    fail(null, 'Depoda yeterli ürün yok.')
                    return
                  }
                  const unitPrice = Math.max(1, Math.trunc(num(sellForm.unitPrice) || 0))
                  setBusy('marketplace-sell')
                  try {
                    const response = await placeOrderBookOrder({
                      itemId: sellForm.itemId,
                      side: 'sell',
                      quantity: qty,
                      limitPrice: unitPrice,
                      expiresMinutes: 180,
                    })
                    if (!response?.success) {
                      fail(response, response?.errors?.global || 'İlan açılamadı.')
                      return
                    }
                    setNotice(response.message || `${fmt(qty)} adet satış ilanı açıldı. İlanlarım sekmesinden takip edebilirsin.`)
                    setNoticeIsSuccess(true)
                    await Promise.all([loadOverview(), loadMarket(), loadProfile()])
                  } finally {
                    setBusy('')
                  }
                }}
              >
                <img src="/home/icons/depot/cash.webp" alt="" className="marketplace-sell-submit-icon" />
                {busy === 'marketplace-sell' ? 'İşleniyor...' : 'Satışa Koy'}
              </button>
            </div>
          </div>
        )}
        {marketplaceTab === 'ilanlarim' && (
          <div className="marketplace-tab-content marketplace-section marketplace-section-content">
            <div className="marketplace-block marketplace-block-list">
            <div className="marketplace-list">
              {(() => {
                const openListings = (market?.openOrders || []).filter((o) => o.status === 'open' && o.side === 'sell')
                if (openListings.length === 0) {
                  return (
                    <div className="marketplace-list-empty card">
                      <p className="muted" style={{ margin: 0 }}><span className="marketplace-tab-emoji" aria-hidden>🏷️</span> Aktif ilanın yok. Satış İlanı sekmesinden ilan verebilirsin.</p>
                    </div>
                  )
                }
                const formatListingDate = (iso) => {
                  try {
                    const d = new Date(iso)
                    const day = String(d.getDate()).padStart(2, '0')
                    const month = String(d.getMonth() + 1).padStart(2, '0')
                    const year = d.getFullYear()
                    const hour = String(d.getHours()).padStart(2, '0')
                    const min = String(d.getMinutes()).padStart(2, '0')
                    return `${day}.${month}.${year} ${hour}:${min}`
                  } catch (_) { return '' }
                }
                return (
                  <div className="marketplace-listings-list">
                    {openListings.map((order) => {
                      const meta = tradeableDepotItems.find((t) => t.id === order.itemId)
                      const remaining = Math.max(0, order.remainingQuantity ?? (order.quantity - (order.filledQuantity || 0)))
                      const total = remaining * Math.max(0, order.limitPrice || 0)
                      return (
                        <div key={order.id} className="marketplace-listing-card card">
                          <div className="marketplace-listing-main">
                            <img src={meta?.png || '/home/icons/depot/cash.webp'} alt="" className="marketplace-listing-icon" />
                            <div className="marketplace-listing-info">
                              <span className="marketplace-listing-name">{order.itemName || order.itemId}</span>
                              <span className="marketplace-listing-date">{formatListingDate(order.createdAt)}</span>
                              <span className="marketplace-listing-qty-total">{fmt(remaining)} adet ⬢ Toplam: <NakitLabel value={total} /></span>
                            </div>
                            <div className="marketplace-listing-price-wrap">
                              <span className="marketplace-listing-unit-price"><NakitLabel value={order.limitPrice || 0} /></span>
                              <span className="marketplace-listing-price-label">birim fiyat ⬢ {fmt(remaining)} adet</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn marketplace-listing-remove"
                            disabled={busy === `marketplace-remove:${order.id}`}
                            onClick={async () => {
                              setBusy(`marketplace-remove:${order.id}`)
                              try {
                                const response = await cancelOrderBookOrder(order.id)
                                if (!response?.success) {
                                  fail(response, response?.errors?.global || 'İlan kaldırılamadı.')
                                  return
                                }
                                setNotice(response.message || 'İlan kaldırıldı.')
                                setNoticeIsSuccess(true)
                                await Promise.all([loadOverview(), loadMarket(), loadProfile()])
                              } finally {
                                setBusy('')
                              }
                            }}
                          >
                            <span className="marketplace-listing-remove-icon" aria-hidden>🗑</span>
                            {busy === `marketplace-remove:${order.id}` ? 'Kaldırılıyor...' : 'Kaldır'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            </div>
          </div>
        )}
      </article>
    </section>
  )

  const forexView = (
    <section className="panel-stack home-sections forex-screen">
      <article className="card forex-panel forex-panel-solo">
        <div className="forex-solo-head">
          <div className="forex-solo-title-wrap">
            <img
              src={FOREX_HEADER_ICON_PRIMARY_SRC}
              alt=""
              className="forex-solo-icon"
              onError={(event) => {
                const node = event.currentTarget
                if (node.dataset.fallbackApplied === '1') {
                  node.style.display = 'none'
                  return
                }
                node.dataset.fallbackApplied = '1'
                node.src = FOREX_HEADER_ICON_FALLBACK_SRC
              }}
            />
            <div>
              <h3 className="forex-solo-title">TicarNet Döviz Kuru</h3>
              <p className="forex-solo-subtitle">TCT oyun dövizini alıp bozdurabilirsiniz.</p>
            </div>
          </div>
          <div className="forex-solo-head-actions">
            <span className={`forex-solo-trend-pill ${forexTrendDirection === 'up' ? 'is-up' : 'is-down'}`.trim()}>
              {forexTrendDirection === 'up' ? 'Yükseliş' : 'Düşüş'} {fmtPctSigned(forexDayChangePercent)}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openTab('home', { tab: 'home' })}>
              Şehir
            </button>
          </div>
        </div>

        <div className="forex-solo-card forex-solo-metrics-grid">
          <article className="forex-solo-metric is-rate">
            <small>1 TCT Değeri</small>
            <strong>{fmtTry(forexMarket?.rate || 0)}</strong>
            <span>Alış kuru</span>
          </article>
          <article className="forex-solo-metric is-sell">
            <small>Bozdurma Değeri</small>
            <strong>{fmtTry(forexMarket?.sellRate || 0)}</strong>
            <span>Makas: {fmtTry(forexSpreadTry)}</span>
          </article>
          <article className="forex-solo-metric is-balance">
            <small>TCT Bakiyeniz</small>
            <strong>{fmt(forexHoldingQuantity)} Adet</strong>
            <span>Maks kapasite: {fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} adet</span>
          </article>
          <article className={`forex-solo-metric ${forexTrendDirection === 'up' ? 'is-up' : 'is-down'}`}>
            <small>Günlük Değişim</small>
            <strong>{fmtPctSigned(forexDayChangePercent)}</strong>
            <span>24 saat trend</span>
          </article>
        </div>

        <section className="forex-chart-card">
          <div className="forex-chart-head">
            <h4 className="forex-chart-title">Grafik</h4>
            <div className="forex-chart-head-meta">
              <div className="forex-chart-range-group" role="tablist" aria-label="Grafik aralığı">
                {FOREX_CHART_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`forex-chart-range-btn ${forexChartRangeId === option.id ? 'is-active' : ''}`.trim()}
                    onClick={() => setForexChartRangeId(option.id)}
                    aria-pressed={forexChartRangeId === option.id}
                    disabled={Boolean(busy)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="forex-chart-updated">
                Son güncelleme: {forexLastUpdateLabel}
              </span>
              <span className="forex-chart-updated">
                Sonraki güncelleme: {forexNextUpdateLabel}
              </span>
              <span className="forex-chart-window-pill">
                Canlı geri sayım: <ForexCountdownText nextUpdateMs={forexNextUpdateMs} onElapsed={handleForexCountdownElapsed} />
              </span>
            </div>
          </div>
          {forexChartData ? (
            <>
              <div className="forex-chart-wrap">
                <div className="forex-chart-legend" aria-hidden>
                  <span className="forex-chart-legend-swatch" />
                  <span className="forex-chart-legend-label">Döviz Değeri</span>
                </div>
                <svg
                  className="forex-chart-svg"
                  viewBox={`0 0 ${forexChartData.width} ${forexChartData.height}`}
                  role="img"
                  aria-label="TCT döviz değeri çizgi grafiği"
                >
                  <defs>
                    <linearGradient id="forex-area-fill-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(56, 194, 255, 0.30)" />
                      <stop offset="100%" stopColor="rgba(56, 194, 255, 0.02)" />
                    </linearGradient>
                    <linearGradient id="forex-line-stroke-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2ec4ff" />
                      <stop offset="100%" stopColor="#50d4ff" />
                    </linearGradient>
                    <radialGradient id="forex-live-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(66, 195, 255, 0.8)" />
                      <stop offset="100%" stopColor="rgba(66, 195, 255, 0)" />
                    </radialGradient>
                  </defs>
                  {forexChartData.yTicks.map((tick, index) => (
                    <line
                      key={`y-${index}`}
                      x1={forexChartData.padLeft}
                      y1={tick.y}
                      x2={forexChartData.width - forexChartData.padRight}
                      y2={tick.y}
                      className="forex-grid-line"
                    />
                  ))}
                  {forexChartData.xTicks.map((tick, index) => (
                    <line
                      key={`x-${index}`}
                      x1={tick.x}
                      y1={forexChartData.padTop}
                      x2={tick.x}
                      y2={forexChartData.chartFloorY}
                      className="forex-grid-line"
                    />
                  ))}
                  {forexChartData.smoothAreaPath ? (
                    <path d={forexChartData.smoothAreaPath} className="forex-area-fill" />
                  ) : null}
                  {forexChartData.smoothLinePath ? (
                    <path d={forexChartData.smoothLinePath} className="forex-line" />
                  ) : null}
                  {forexChartData.points.map((point, index) => (
                    <circle key={`pt-${index}`} cx={point.x} cy={point.y} r="2.6" className="forex-point" />
                  ))}
                  {forexChartData.minPoint ? (
                    <circle cx={forexChartData.minPoint.x} cy={forexChartData.minPoint.y} r="3.4" className="forex-min-point" />
                  ) : null}
                  {forexChartData.maxPoint ? (
                    <circle cx={forexChartData.maxPoint.x} cy={forexChartData.maxPoint.y} r="3.4" className="forex-max-point" />
                  ) : null}
                  {forexChartData.latestPoint ? (
                    <>
                      <line
                        x1={forexChartData.padLeft}
                        y1={forexChartData.latestPriceLineY}
                        x2={forexChartData.width - forexChartData.padRight}
                        y2={forexChartData.latestPriceLineY}
                        className="forex-live-line"
                      />
                      <circle cx={forexChartData.latestPoint.x} cy={forexChartData.latestPoint.y} r="12" className="forex-live-point-glow" />
                      <circle cx={forexChartData.latestPoint.x} cy={forexChartData.latestPoint.y} r="4.2" className="forex-live-point" />
                      <rect
                        x={forexChartData.latestLabelX}
                        y={forexChartData.latestLabelY}
                        width={forexChartData.latestLabelWidth}
                        height={forexChartData.latestLabelHeight}
                        rx="6"
                        className="forex-live-badge"
                      />
                      <text
                        x={forexChartData.latestLabelX + (forexChartData.latestLabelWidth / 2)}
                        y={forexChartData.latestLabelY + (forexIsMobileView ? 18 : 21)}
                        className="forex-live-badge-text"
                        textAnchor="middle"
                      >
                        {fmtFxRate(forexChartData.summary.currentRate)}
                      </text>
                    </>
                  ) : null}
                  {forexChartInteractionEnabled && forexHoveredCandle ? (
                    <>
                      <line
                        x1={forexHoveredCandle.x}
                        y1={forexChartData.padTop}
                        x2={forexHoveredCandle.x}
                        y2={forexChartData.chartFloorY}
                        className="forex-hover-line"
                      />
                      {(() => {
                        const tooltipWidth = forexIsMobileView ? 160 : 188
                        const tooltipHeight = forexIsMobileView ? 58 : 66
                        const tooltipX = clamp(
                          forexHoveredCandle.x + 12,
                          forexChartData.padLeft + 6,
                          forexChartData.width - forexChartData.padRight - tooltipWidth - 6,
                        )
                        const tooltipY = clamp(
                          forexHoveredCandle.y - tooltipHeight - 8,
                          forexChartData.padTop + 4,
                          forexChartData.chartFloorY - tooltipHeight - 4,
                        )
                        const changeSigned = `${forexHoveredCandle.changePercent >= 0 ? '+' : ''}${forexHoveredCandle.changePercent.toFixed(2)}%`
                        return (
                          <>
                            <rect
                              x={tooltipX}
                              y={tooltipY}
                              width={tooltipWidth}
                              height={tooltipHeight}
                              rx="8"
                              className="forex-hover-tooltip"
                            />
                            <text x={tooltipX + 10} y={tooltipY + 20} className="forex-hover-tooltip-title">
                              {formatForexChartAxisLabel(
                                forexHoveredCandle.at,
                                Math.max(60, Math.trunc(num(forexChartRange?.seconds || 60))),
                              )}
                            </text>
                            <text x={tooltipX + 10} y={tooltipY + 38} className="forex-hover-tooltip-line">
                              {forexIsMobileView
                                ? `Değer: ${fmtFxRate(forexHoveredCandle.rate)} | ${changeSigned}`
                                : `Değer: ${fmtFxRate(forexHoveredCandle.rate)} • Değişim: ${changeSigned}`}
                            </text>
                          </>
                        )
                      })()}
                    </>
                  ) : null}
                  <rect
                    x={forexChartData.padLeft}
                    y={forexChartData.padTop}
                    width={forexChartData.width - (forexChartData.padLeft + forexChartData.padRight)}
                    height={forexChartData.chartFloorY - forexChartData.padTop}
                    className="forex-hit-area"
                    onMouseMove={(!forexIsMobileView && forexChartInteractionEnabled) ? (event) => setForexHoverByClientX(event.clientX, event.currentTarget) : undefined}
                    onMouseLeave={(!forexIsMobileView && forexChartInteractionEnabled) ? () => setForexChartHoverIndex(-1) : undefined}
                    onTouchStart={(forexIsMobileView && forexChartInteractionEnabled) ? ((event) => {
                      const touch = event.touches?.[0]
                      if (!touch) return
                      queueForexTouchHoverByClientX(touch.clientX, event.currentTarget)
                    }) : undefined}
                    onTouchMove={(forexIsMobileView && forexChartInteractionEnabled) ? ((event) => {
                      const touch = event.touches?.[0]
                      if (!touch) return
                      queueForexTouchHoverByClientX(touch.clientX, event.currentTarget)
                    }) : undefined}
                    onTouchEnd={undefined}
                    onTouchCancel={undefined}
                  />
                  {forexChartData.yTicks.map((tick, index) => (
                    <text
                      key={`yl-${index}`}
                      x={forexChartData.padLeft - (forexIsMobileView ? 8 : 12)}
                      y={tick.y + 5}
                      className="forex-axis-text forex-axis-text-y"
                      textAnchor="end"
                    >
                      {forexIsMobileView ? fmt(tick.rate) : fmtFxRate(tick.rate)}
                    </text>
                  ))}
                  {forexChartData.xTicks.map((tick, index) => (
                    <text
                      key={`xl-${index}`}
                      x={tick.x}
                      y={forexChartData.height - (forexIsMobileView ? 8 : 14)}
                      className="forex-axis-text forex-axis-text-x"
                      textAnchor={tick.anchor || 'middle'}
                      transform={`rotate(${forexIsMobileView ? -30 : -42} ${tick.x} ${forexChartData.height - (forexIsMobileView ? 8 : 14)})`}
                    >
                      {tick.label}
                    </text>
                  ))}
                </svg>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Grafik hazırlanıyor...</p>
          )}
        </section>

        <section className="forex-trade-minimal">
          <input
            id="forex-quantity-input"
            className="qty-input"
            inputMode="decimal"
            aria-label="Adet miktarı girin"
            placeholder="Adet miktarı girin"
            value={forexTradeForm.quantity}
            onChange={(event) => setForexTradeForm((prev) => ({
              ...prev,
              quantity: event.target.value.replace(/[^\d]/g, '').slice(0, FOREX_TRADE_MAX_QUANTITY_DIGITS),
            }))}
          />

          <div className="forex-qty-quick-row">
            <button
              type="button"
              className="forex-qty-quick-btn"
              onClick={() => setForexTradeForm((prev) => ({ ...prev, quantity: '1' }))}
              disabled={Boolean(busy)}
            >
              Min 1
            </button>
            <button
              type="button"
              className="forex-qty-quick-btn"
              onClick={() => setForexTradeForm((prev) => ({
                ...prev,
                quantity: forexTradeMaxQuantity > 0 ? String(forexTradeMaxQuantity) : '',
              }))}
              disabled={Boolean(busy) || forexTradeMaxQuantity < 1}
            >
              Maks
            </button>
          </div>

          <label className="forex-form-label" id="forex-trade-side-label">İşlem Seçin</label>
          <div className="forex-trade-side-grid" role="radiogroup" aria-labelledby="forex-trade-side-label">
            {FOREX_TRADE_SIDE_OPTIONS.map((option) => {
              const active = forexTradeSide === option.value
              const optionDisabled = option.value === 'sell' && forexHoldingQuantity < 1
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`forex-trade-side-btn ${option.tone} ${active ? 'is-active' : ''}`.trim()}
                  aria-pressed={active}
                  disabled={Boolean(busy) || optionDisabled}
                  onClick={() => setForexTradeForm((prev) => ({ ...prev, side: option.value }))}
                >
                  <span className="forex-trade-side-title">{option.label}</span>
                  <span className="forex-trade-side-desc">{option.description}</span>
                </button>
              )
            })}
          </div>

          <div className="forex-trade-preview">
            <p>Kur: <strong>{fmtFxRate(forexTradeRate || 0)}</strong></p>
            <p>Komisyon: <strong>{fmtTry(forexTradeFeePreview)}</strong></p>
            <p>{forexTradeSide === 'buy' ? 'Toplam Maliyet' : 'Tahmini Net'}: <strong>{fmtTry(forexTradeTotalPreview)}</strong></p>
            <p>Toplam Kapasite: <strong>{fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} Adet</strong></p>
            <p>Portföy Durumu: <strong>{fmt(forexHoldingQuantity)} / {fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} Adet</strong></p>
            <p>Alışta Kalan Limit: <strong>{fmt(forexHoldingRemainingCapacity)} Adet</strong></p>
            <p>Satışta Kullanılabilir: <strong>{fmt(forexHoldingQuantity)} Adet</strong></p>
            <p>Ortalama Alış: <strong>{forexHoldingQuantity > 0 ? fmtFxRate(forexHoldingAverageBuyRate) : '--'}</strong></p>
            <p>
              Kar / Zarar:
              <strong> {fmtTrySigned(forexHoldingUnrealizedPnlTry)} ({fmtPctSigned(forexHoldingUnrealizedPnlPercent)})</strong>
            </p>
            <p>Gerçekleşen Kar / Zarar: <strong>{fmtTrySigned(forexHolding?.realizedPnlTry || 0)}</strong></p>
          </div>
          {forexTradeQuantityTooHigh && (
            <p className="forex-trade-warning" role="alert">
              Güvenlik limiti: en fazla {fmt(FOREX_TRADE_MAX_QUANTITY)} adet girebilirsin.
            </p>
          )}
          {!forexTradeRateValid && (
            <p className="forex-trade-warning" role="alert">
              Kur verisi güncelleniyor, birkaç saniye sonra tekrar dene.
            </p>
          )}
          {forexTradeSide === 'buy' && forexTradeQuantity > 0 && forexTradeInsufficientWallet && (
            <p className="forex-trade-warning" role="alert">
              Yetersiz nakit. Bu işlem için {fmtTry(forexTradeTotalPreview)} gerekiyor, bakiyen {fmtTry(forexWalletTry)}.
            </p>
          )}
          {forexTradeSide === 'buy' && forexTradeQuantity > 0 && forexTradeExceedsTotalHoldingCap && (
            <p className="forex-trade-warning" role="alert">
              Toplam TCT limiti {fmt(FOREX_TRADE_MAX_TOTAL_QUANTITY)} adet. En fazla {fmt(forexHoldingRemainingCapacity)} adet daha alabilirsin.
            </p>
          )}
          {forexTradeSide === 'sell' && forexTradeQuantity > 0 && forexTradeInsufficientHoldings && (
            <p className="forex-trade-warning" role="alert">
              Yetersiz TCT bakiyesi. En fazla {fmt(forexHoldingQuantity)} adet bozdurabilirsin.
            </p>
          )}

          <button
            type="button"
            className={`btn full ${forexTradeSide === 'buy' ? 'btn-success' : 'btn-danger'}`}
            onClick={() => void runForexTradeAction()}
            disabled={forexTradeSubmitBlocked}
          >
            {busy === 'forex-buy' || busy === 'forex-sell'
              ? 'İşlem gerçekleşiyor...'
              : forexTradeSide === 'buy'
                ? 'TCT AL'
                : 'TCT BOZDUR'}
          </button>

          <p className="forex-solo-note">
            {String(forex?.investmentNote || 'Geleceğe yatırım yaparken risk yönetimini unutma.')}
          </p>
        </section>
      </article>
    </section>
  )

  const bankView = (
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
              {bankHistoryRows.slice(0, 10).map((row, index) => {
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

  const tutorialStepCount = Math.max(1, TUTORIAL_STEPS.length)
  const tutorialStepSafeIndex = Math.max(0, Math.min(tutorialStepCount - 1, Math.trunc(num(tutorialStepIndex))))
  const tutorialCurrentStep = TUTORIAL_STEPS[tutorialStepSafeIndex] || TUTORIAL_STEPS[0]
  const tutorialCurrentStepId = String(tutorialCurrentStep?.id || `step-${tutorialStepSafeIndex + 1}`).trim() || `step-${tutorialStepSafeIndex + 1}`
  const tutorialProgressPct = Math.max(0, Math.min(100, Math.round(((tutorialStepSafeIndex + 1) / tutorialStepCount) * 100)))
  const tutorialCurrentTargetLabel = String(tutorialCurrentStep?.target?.focusLabel || '').trim()
  const tutorialPurposeText = String(tutorialCurrentStep?.objective || tutorialCurrentStep?.body || '').trim()
  const tutorialStepImageSrc =
    String(TUTORIAL_STEP_IMAGE_BY_ID[tutorialCurrentStepId] || '').trim() || TUTORIAL_ASSISTANT_IMAGE_SRC
  const homeView = (
    <section className="panel-stack home-sections city-menu-stack">
      <article className="card module-card module-card-split">
        <h4 className="menu-section-title">Depom</h4>
        <div className="module-grid city-module-grid city-module-grid-single">
          <button
            className="module-btn module-btn-depot"
            onClick={() => setWarehouseOpen(true)}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/depom.webp" alt="Depom" />
            </span>
            <span className="module-copy">
              <span className="module-label">Depom</span>
              <span className="module-desc">Malzeme ve Stok</span>
            </span>
          </button>
        </div>
      </article>

      <article className="card module-card module-card-split">
        <h4 className="menu-section-title">Üretim ve Gelişim</h4>
        <div className="module-grid city-module-grid">
          <button
            className="module-btn module-btn-business"
            onClick={() => void openTab('businesses', { tab: 'businesses' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/isletmeler.webp" alt="İşletmeler" />
            </span>
            <span className="module-copy">
              <span className="module-label">İşletmeler</span>
              <span className="module-desc">İş kurup düzenli gelir toplarsın</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-business"
            onClick={() => void openTab('factories', { tab: 'factories' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/businesses/fabrikam.webp" alt="Fabrikalar" />
            </span>
            <span className="module-copy">
              <span className="module-label">Fabrikalar</span>
              <span className="module-desc">Üretim ve Gelişim</span>
              <span className="module-desc module-desc-sub">Üretimi Yönet</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-business module-btn-mines"
            onClick={() => void openTab('mines', { tab: 'mines' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/madenler.webp" alt="Madenler" />
            </span>
            <span className="module-copy">
              <span className="module-label">Madenler</span>
              <span className="module-desc">Kazı Yap</span>
              <span className="module-desc module-desc-sub">Kaynak Topla, Fabrikada Kullan</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-business"
            onClick={() => void openTab('missions', { tab: 'missions' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/v2/nav-missions.png" alt="Görevler" />
            </span>
            <span className="module-copy">
              <span className="module-label">Görevler</span>
              <span className="module-desc">5 görev serisi</span>
              <span className="module-desc module-desc-sub">Tamamla, ödülü al</span>
            </span>
          </button>
        </div>
      </article>

      <article className="card module-card module-card-split">
        <h4 className="menu-section-title">Ticaret ve Finans</h4>
        <div className="module-grid city-module-grid">
          <button
            className="module-btn module-btn-marketplace"
            onClick={() => void openTab('marketplace', { tab: 'marketplace' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/pazaryeri.webp" alt="Pazar Yeri" onError={(e) => { e.target.style.display = 'none'; const next = e.target.nextElementSibling; if (next) next.style.display = 'inline-block'; }} />
              <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🏪</span>
            </span>
            <span className="module-copy">
              <span className="module-label">Pazar Yeri</span>
              <span className="module-desc">Ticaret Alım Satım</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-marketplace module-btn-private"
            onClick={() => void openTab('private-listings', { tab: 'private-listings' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/ozel-ilanlar.png" alt="Özel İlanlar" />
            </span>
            <span className="module-copy">
              <span className="module-label">Özel İlanlar</span>
              <span className="module-desc">Sadece seçtiklerin</span>
              <span className="module-desc module-desc-sub">Arkadaşına özel al</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-marketplace module-btn-forex"
            onClick={() => void openTab('forex', { tab: 'forex' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img
                src={FOREX_MENU_ICON_PRIMARY_SRC}
                alt="Döviz İşlemleri"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    const next = node.nextElementSibling
                    if (next) next.style.display = 'inline-block'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = FOREX_MENU_ICON_FALLBACK_SRC
                }}
              />
              <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>💱</span>
            </span>
            <span className="module-copy">
              <span className="module-label">Döviz İşlemleri</span>
              <span className="module-desc">TicarNet Döviz Kuru</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-marketplace module-btn-bank"
            onClick={() => void openTab('bank', { tab: 'bank' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img
                src={BANK_MENU_ICON_PRIMARY_SRC}
                alt="Banka"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    const next = node.nextElementSibling
                    if (next) next.style.display = 'inline-block'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = BANK_MENU_ICON_FALLBACK_SRC
                  const next = node.nextElementSibling
                  if (next) next.style.display = 'inline-block'
                }}
              />
              <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🏦</span>
            </span>
            <span className="module-copy">
              <span className="module-label">Banka</span>
              <span className="module-desc">Paranı güvende biriktir</span>
              <span className="module-desc module-desc-sub">Banka hesabında</span>
            </span>
          </button>
        </div>
      </article>

      <article className="card module-card module-card-split">
        <h4 className="menu-section-title">Bilgilendirme ve Yönetim</h4>
        <div className="module-grid city-module-grid">
          <button
            className="module-btn module-btn-announcements"
            onClick={() => void openTab('announcements', { tab: 'announcements' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img
                src={ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC}
                alt="Duyurular"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC
                }}
              />
            </span>
            <span className="module-copy">
              <span className="module-label">Duyurular</span>
              <span className="module-desc">Resmi Bildiriler</span>
              <span className="module-desc module-desc-sub">Yetkili duyurular</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-events"
            onClick={() => void openTab('events', { tab: 'events' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img
                src={EVENTS_MENU_ICON_PRIMARY_SRC}
                alt="Etkinlikler"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = EVENTS_MENU_ICON_FALLBACK_SRC
                }}
              />
            </span>
            <span className="module-copy">
              <span className="module-label">Etkinlikler</span>
              <span className="module-desc">Takvim</span>
              <span className="module-desc module-desc-sub">{weeklyEventsHomeHint}</span>
            </span>
          </button>
          <button
            className="module-btn"
            onClick={() => void openTab('rules', { tab: 'rules' })}
            disabled={Boolean(busy)}
            aria-label="Oyun kurallarını görüntüle"
          >
            <span className="module-icon">
              <img
                src={RULES_MENU_ICON_PRIMARY_SRC}
                alt="Kurallar"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    const next = node.nextElementSibling
                    if (next) next.style.display = 'inline-block'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = RULES_MENU_ICON_FALLBACK_SRC
                }}
              />
              <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🛡️</span>
            </span>
            <span className="module-copy">
              <span className="module-label">Kurallar</span>
              <span className="module-desc">Oyun Kuralları</span>
            </span>
          </button>
          <button
            className="module-btn module-btn-settings"
            onClick={() => void openTab('profile', { profileTab: 'profile' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img src="/home/icons/ayarlar.webp" alt="Ayarlar" />
            </span>
            <span className="module-copy">
              <span className="module-label">Ayarlar</span>
              <span className="module-desc">Hesap ve Profil</span>
            </span>
          </button>
        </div>
      </article>

      <article className="card module-card module-card-split">
        <h4 className="menu-section-title">Ödüller ve Premium</h4>
        <div className="module-grid city-module-grid">
          <button
            className="module-btn module-btn-season-chest"
            onClick={async () => {
              await _loadLeague().catch(() => {})
              setSeasonChestsOpen(true)
            }}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img
                src={SEASON_CHESTS_MENU_ICON_PRIMARY_SRC}
                alt="Sezon Sandıkları"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    const next = node.nextElementSibling
                    if (next) next.style.display = 'inline-block'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = SEASON_CHESTS_MENU_ICON_FALLBACK_SRC
                  const next = node.nextElementSibling
                  if (next) next.style.display = 'inline-block'
                }}
              />
              <span className="module-icon-fallback" style={{ display: 'none' }} aria-hidden>🎁</span>
            </span>
            <span className="module-copy">
              <span className="module-label">Sandıklar</span>
              <span className="module-desc">
                {leaguePendingSeasonChests.length > 0
                  ? `${fmt(leaguePendingSeasonChests.length)} adet hazır`
                  : 'Sezon ödülleri'}
              </span>
            </span>
          </button>
          <button
            id="module-diamond-market"
            className="module-btn module-btn-diamond"
            onClick={() => void openTab('profile', { profileTab: 'diamond-market' })}
            disabled={Boolean(busy)}
          >
            <span className="module-icon">
              <img
                src={DIAMOND_MARKET_MENU_ICON_PRIMARY_SRC}
                alt="Elmas Marketi"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = DIAMOND_MARKET_MENU_ICON_FALLBACK_SRC
                }}
              />
            </span>
            <span className="module-copy">
              <span className="module-label">Elmas Marketi</span>
              <span className="module-desc">Gerçek Ödeme</span>
            </span>
          </button>
        </div>
      </article>

    </section>
  )

  const announcementsView = (
    <section className="announcements-screen">
      <article className="announcements-board">
        <header className="announcements-board-head">
          <div className="announcements-board-kicker">
            <span className="announcements-hero-badge">
              <img
                src={ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  const node = event.currentTarget
                  if (node.dataset.fallbackApplied === '1') {
                    node.style.display = 'none'
                    return
                  }
                  node.dataset.fallbackApplied = '1'
                  node.src = ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC
                }}
              />
              <span>DUYURU</span>
            </span>
            <h3 className="announcements-hero-title">DUYURULAR</h3>
          </div>
          <p className="announcements-hero-subtitle">RESMİ DUYURULAR</p>
        </header>

        {cityAnnouncements.length > 0 ? (
          <div className="announcements-board-scroll">
            {cityAnnouncements.map((entry) => {
              const typeMeta = announcementTypeMeta(entry.announcementType ?? entry.announcementTag)
              return (
                <article key={entry.id} className={`announcement-entry is-${typeMeta.className}`}>
                  <header className="announcement-entry-head">
                    <span className={`announcement-card-tag is-${typeMeta.className}`}>
                      <img
                        src={ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          const node = event.currentTarget
                          if (node.dataset.fallbackApplied === '1') {
                            node.style.display = 'none'
                            return
                          }
                          node.dataset.fallbackApplied = '1'
                          node.src = ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC
                        }}
                      />
                      <span>{entry.announcementTag || typeMeta.label}</span>
                    </span>
                    <h4 className="announcement-entry-title">{entry.title || 'Duyuru'}</h4>
                  </header>
                  <div className="announcement-entry-body">
                    {(() => {
                      const lines = String(entry.body || '')
                        .split(/\n+/)
                        .map((line) => line.trim())
                        .filter(Boolean)
                      if (!lines.length) {
                        return <p className="announcement-entry-body-empty">Detay metni bulunmuyor.</p>
                      }
                      return lines.map((line, index) => (
                        <p key={`${entry.id}-line-${index + 1}`}>{line}</p>
                      ))
                    })()}
                  </div>
                  <footer className="announcement-entry-footer">
                    <span className="announcement-card-author">[{entry.createdByUsername || 'Admin'}]</span>
                    <span className="announcement-card-time">
                      {formatAnnouncementDateTime(entry.createdAt || '')}
                    </span>
                  </footer>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="announcements-board-empty">
            <p>Henüz resmi bir duyuru paylaşılmadı.</p>
          </div>
        )}
      </article>
    </section>
  )

  const rulesView = (
    <section className="panel-stack rules-screen">
      <article className="card module-card rules-intro-card">
        <div className="rules-intro-icon" aria-hidden>📜</div>
        <h3 className="rules-intro-title">{CITY_RULES_GUIDE.title}</h3>
        <div className="rules-intro-text-wrap">
          {CITY_RULES_GUIDE.subtitleLines.map((line) => (
            <p key={line} className="rules-intro-text">{line}</p>
          ))}
        </div>
      </article>

      {CITY_RULES_GUIDE.groups.map((group) => (
        <article key={group.id} className="card module-card rules-group-card" aria-labelledby={`rules-group-${group.id}`}>
          <header className="rules-group-head">
            <h4 id={`rules-group-${group.id}`} className="rules-group-title">
              <span className="rules-group-emoji" aria-hidden>{group.icon}</span>
              <span>{group.title}</span>
            </h4>
            <p className="rules-group-subtitle">{group.description}</p>
          </header>
          <div className="rules-group-divider" />
          <div className="rules-group-list" role="list">
            {group.rules.map((entry, ruleIndex) => (
              <article
                key={`${group.id}-rule-${ruleIndex + 1}`}
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

      <article className="card module-card rules-final-card">
        <div className="rules-final-icon" aria-hidden>⚖️</div>
        <p className="rules-final-text">{CITY_RULES_GUIDE.finalNote}</p>
      </article>
    </section>
  )

  const eventsView = (
    <section className="panel-stack weekly-events-screen">
      {weeklyEventsPrimary ? (
        <article className="card module-card weekly-events-hero-card">
          <div className="weekly-events-head">
            <div>
              <p className="weekly-events-overline">HAFTALIK TAKVİM</p>
              <h3 className="weekly-events-title">Etkinlik Duyuruları</h3>
              <p className="weekly-events-subtitle">
                {`${weeklyEventsPrimary.title || 'Haftalık etkinlik'} · ${weeklyEventsPrimary.bonusLabel || 'Aktif'}`}
              </p>
            </div>
            <span className="weekly-events-active-pill is-active">
              {weeklyEventsPrimary.bonusLabel || 'Aktif'}
            </span>
          </div>
          <p className="weekly-events-countdown">
            {`Zaman: ${weeklyEventsPrimaryWindowLabel} · Bitiş: ${formatDateTime(weeklyEventsPrimary.endsAt || '')} · Kalan: ${weeklyEventsRemainingLabel}`}
          </p>
          <article className="weekly-events-today-card">
            <span className="weekly-events-today-dot is-active" />
            <div className="weekly-events-today-copy">
              <strong>Bugün: {weeklyEventsRuntimeState.dayName}</strong>
              <small>{weeklyEventsTodaySummary}</small>
              <small>{weeklyEventsTodayDetail}</small>
            </div>
          </article>
        </article>
      ) : null}

      {weeklyEventRangeCards.length > 0 ? (
        <article className="card module-card weekly-events-grid-card">
          <div className="weekly-events-grid">
            {weeklyEventRangeCards.map((entry) => {
            const cardClasses = [
              'weekly-event-day-card',
              'weekly-event-range-card',
              entry?.active ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')
              const iconEmoji = String(entry?.iconEmoji || '').trim()
              const icon = String(entry?.icon || WEEKLY_EVENT_ICON_BY_TYPE.standard).trim() || WEEKLY_EVENT_ICON_BY_TYPE.standard
            return (
              <article key={`weekly-event-range-${entry.id}`} className={cardClasses}>
                <header className="weekly-event-day-head">
                  <div className="weekly-event-range-topline">
                    <strong className="weekly-event-range-day">{entry.dayRange}</strong>
                    <span className={`weekly-event-range-badge ${entry.todayInRange ? 'is-today' : ''}`}>
                      {entry.rangeBadge}
                    </span>
                  </div>
                  <span className="weekly-event-day-icon">
                    {iconEmoji ? (
                      <span className="weekly-event-day-icon-emoji" aria-hidden>{iconEmoji}</span>
                    ) : (
                      <img
                        src={icon}
                        alt=""
                        aria-hidden
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    )}
                  </span>
                  <div className="weekly-event-day-meta weekly-event-range-meta">
                    <strong>{entry.subtitle || entry.title}</strong>
                    <small>{entry.active ? 'Etkinlik şu an aktif' : 'Takvimde planlı etkinlik'}</small>
                  </div>
                </header>
                <p className="weekly-event-day-desc">{entry.description || 'Etkinlik açıklaması bulunmuyor.'}</p>
                <p className="weekly-event-day-window">{entry.timeWindow}</p>
                <div className="weekly-event-day-foot">
                  <span className="weekly-event-day-bonus">{entry.effectLabel}</span>
                  <span className="weekly-event-day-state">{entry.active ? 'Aktif' : 'Takvim'}</span>
                </div>
                <p className="weekly-event-day-countdown">
                  {entry.active ? `Kalan: ${entry.countdownLabel}` : (entry.inactiveNote || 'Etkinlik günü bekleniyor.')}
                </p>
              </article>
            )
            })}
          </div>
        </article>
      ) : null}

    </section>
  )

  const _renderFactoryCard = (factory) => {
    const busyBuyKey = `factory-buy:${factory.id}`
    const busyCollectKey = `factory-collect:${factory.id}`
    const busyUpgradeKey = `factory-upgrade:${factory.id}`
    const busySpeedupKey = `factory-speedup:${factory.id}`
    const canSpeedupNow = factory.isUpgrading && premiumDiamond >= factory.speedupDiamondCost
    const collectButtonLabel = busy === busyCollectKey
      ? 'Tahsilat...'
      : factory.canCollectNow
        ? 'Tahsilat Yap'
        : factory.collectRemainingMs > 0
          ? `Kalan ${formatCollectionCountdown(factory.collectRemainingMs)}`
          : factory.collectEnergyMissing > 0
            ? `${factory.energyMeta.label} Eksik`
            : 'Tahsilat Beklemede'
    const blockedByOtherUpgrade = !factory.isUpgrading && !canStartAnotherFactoryUpgrade
    const isPurchaseCard = !factory.owned && !factory.isBuilding
    const purchaseRequirementRows = factoryPurchaseRowsFromFactory(factory)
    const purchaseMissingRows = purchaseRequirementRows.filter((row) => row.missing > 0)

    return (
      <article
        key={factory.id}
        className={`factory-card${factory.owned ? ' is-owned' : ''}${factory.isBuilding ? ' is-building' : ''}${factory.isUpgrading ? ' is-upgrading' : ''}${isPurchaseCard ? ' is-shop-card' : ''}`.trim()}
      >
        <div className="factory-card-head">
          <span className="factory-card-icon" data-broken="0">
            <img
              src={factory.icon || '/home/icons/businesses/fabrikam.webp'}
              alt={factory.name}
              loading="lazy"
              onError={(event) => {
                const holder = event.currentTarget.parentElement
                if (holder) holder.setAttribute('data-broken', '1')
              }}
            />
            <span className="factory-card-icon-fallback">FB</span>
          </span>
          <div className="factory-card-title">
            <h4>{factory.name}</h4>
            <small>
              {factory.owned
                ? factory.hasLevelCap
                  ? `Seviye ${fmt(factory.level)} / ${fmt(factory.maxLevel)}`
                  : `Seviye ${fmt(factory.level)} (sınırsız yükseltme)`
                : `Kurulum: ${fmt(factory.purchaseCostCash)} nakit`}
            </small>
          </div>
          <span className={`factory-state-badge ${
            factory.isBuilding
              ? 'is-building'
              : factory.isUpgrading
                ? 'is-upgrading'
                : factory.owned
                  ? 'is-active'
                  : 'is-locked'
          }`.trim()}>
            {factory.isBuilding
              ? 'İNŞA'
              : factory.isUpgrading
                ? 'YÜKSELİYOR'
                : factory.owned
                  ? 'AKTİF'
                  : 'KİLİTLİ'}
          </span>
        </div>

        {isPurchaseCard ? (
          <div className="factory-shop-hero" data-broken="0">
            <img
              src={resolveFactoryShopImage(factory)}
              alt={factory.name}
              loading="lazy"
              onError={(event) => {
                const holder = event.currentTarget.parentElement
                if (holder) holder.setAttribute('data-broken', '1')
              }}
            />
            <span className="factory-shop-hero-fallback">FAB</span>
          </div>
        ) : null}

        <div className="factory-production-row">
          <div className="factory-production-item">
            <small>Üretim</small>
            <strong>
              <img src={factory.outputMeta.icon} alt="" aria-hidden="true" />
              +{fmt(factory.outputPerCollect)} {factory.outputMeta.label}
            </strong>
          </div>
          <div className="factory-production-item">
            <small>Enerji</small>
            <strong>
              <img src={factory.energyMeta.icon} alt="" aria-hidden="true" />
              -{fmt(factory.energyCostPerCollect)} {factory.energyMeta.label}
            </strong>
          </div>
          <div className="factory-production-item">
            <small>XP</small>
            <strong>
              <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
              +{fmt(factory.xpPerCollect)} XP
            </strong>
          </div>
        </div>

        {factory.isBuilding ? (
          <p className="factory-status-line">
            İnşa sürüyor: <strong>{formatCollectionCountdown(factory.buildRemainingMs)}</strong>
          </p>
        ) : factory.isUpgrading ? (
          <p className="factory-status-line">
            Yükseltme tamamlanmasına kalan: <strong>{formatCollectionCountdown(factory.upgradeRemainingMs)}</strong>
          </p>
        ) : factory.owned ? (
          <p className="factory-status-line">
            {factory.collectRemainingMs > 0
              ? `Tahsilat hazır olmasına kalan: ${formatCollectionCountdown(factory.collectRemainingMs)}`
              : 'Tahsilat hazır. Toplayabilirsin.'}
          </p>
        ) : null}

        {isPurchaseCard ? (
          <div className="factory-upgrade-costs factory-upgrade-costs-purchase">
            <div className="factory-purchase-meta-grid">
              <article className="factory-purchase-meta-card">
                <small>Kurulum Süresi</small>
                <strong>{formatBuildDuration(factory.buildDurationMinutes * 60 * 1000)}</strong>
              </article>
              <article className="factory-purchase-meta-card">
                <small>Tahsilat Döngüsü</small>
                <strong>{fmt(factory.collectIntervalMinutes)} dk</strong>
              </article>
              <article className="factory-purchase-meta-card is-wide">
                <small>Tahsilat Verimi</small>
                <strong>-{fmt(factory.energyCostPerCollect)} {factory.energyMeta.label} | +{fmt(factory.xpPerCollect)} XP</strong>
              </article>
            </div>
            <span className="factory-cost-title">Kurulum kaynak maliyetleri</span>
            <div className="factory-purchase-cost-list">
              {purchaseRequirementRows.map((row) => (
                <article
                  key={`${factory.id}-buy-row-${row.key}`}
                  className={`factory-purchase-cost-row ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}
                >
                  <span className="factory-purchase-cost-main">
                    <img src={row.icon} alt="" aria-hidden="true" />
                    {row.label}
                  </span>
                  <strong>{fmt(row.required)}</strong>
                  <span className="factory-purchase-cost-state">
                    {row.missing > 0 ? 'Eksik' : 'Yeterli'}
                  </span>
                </article>
              ))}
            </div>
            {purchaseMissingRows.length ? (
              <span className="factory-cost-title factory-cost-title-missing">
                Toplam eksik: {purchaseMissingRows
                  .map((row) => `${row.label} ${fmt(row.missing)}`)
                  .join(', ')}
              </span>
            ) : (
              <span className="factory-max-label">Kurulum için tüm maliyetler hazır.</span>
            )}
          </div>
        ) : null}

        {factory.owned && factory.hasLevelCap && factory.maxLevel ? (
          <div className="factory-level-progress-wrap">
            <small className="factory-level-progress-label">Seviye {fmt(factory.level)} / {fmt(factory.maxLevel)}</small>
            <div className="factory-level-progress" role="progressbar" aria-valuenow={factory.level} aria-valuemin={1} aria-valuemax={factory.maxLevel} title={`Seviye ${fmt(factory.level)} / ${fmt(factory.maxLevel)}`}>
              <div className="factory-level-progress-fill" style={{ width: `${Math.min(100, Math.max(0, (factory.level / factory.maxLevel) * 100))}%` }} />
            </div>
          </div>
        ) : null}

        {factory.owned && !factory.isBuilding ? (
          <div className="factory-upgrade-costs">
            {factory.nextUpgrade?.maxReached ? (
              <span className="factory-max-label">Maximum oldu (200. seviye)</span>
            ) : (
              <>
                <span className="factory-cost-title">
                  Sonraki seviye maliyeti ({fmt(factory.nextUpgrade?.nextLevel || (factory.level + 1))}) - Süre: {formatCollectionCountdown((factory.nextUpgrade?.durationMinutes || 0) * 60 * 1000)}
                </span>
                <div className="factory-cost-grid">
                  <div className={`factory-cost-chip ${factory.missingUpgradeCash > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                    <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                    <span>Nakit: {fmt(factory.nextUpgradeCostCash)}</span>
                  </div>
                  {factory.upgradeCostRows.map((row) => (
                    <div key={`${factory.id}-${row.itemId}`} className={`factory-cost-chip ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                      <img src={row.meta.icon} alt="" aria-hidden="true" />
                      <span>{row.meta.label}: {fmt(row.amount)}</span>
                    </div>
                  ))}
                </div>
                {factory.missingUpgradeCash > 0 ? (
                  <span className="factory-cost-title factory-cost-title-missing">
                    Eksik nakit: {fmt(factory.missingUpgradeCash)}
                  </span>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div className="factory-actions">
          {!factory.owned ? (
            factory.isBuilding ? (
              <button
                type="button"
                className="btn btn-secondary factory-action-btn factory-action-btn-wide"
                disabled
              >
                İnşa Sürüyor
              </button>
            ) : (
              <button
                type="button"
                className={`btn factory-buy-btn factory-action-btn factory-action-btn-wide ${canStartAnotherFactoryBuild && factory.canPurchaseNow ? 'btn-gold' : 'btn-secondary'}`.trim()}
                onClick={() => void buyFactoryAction(factory.id)}
                disabled={Boolean(busy) || !canStartAnotherFactoryBuild || !factory.canPurchaseNow}
              >
                {busy === busyBuyKey
                  ? 'Kuruluyor...'
                  : !canStartAnotherFactoryBuild
                    ? 'Fabrika kurulurken başka fabrika kurulamaz'
                    : factory.canPurchaseNow
                      ? 'İnşa Et'
                      : 'Malzeme Yetersiz'}
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary factory-action-btn"
                onClick={() => void collectFactoryAction(factory.id)}
                disabled={Boolean(busy) || !factory.canCollectNow}
              >
                {collectButtonLabel}
              </button>
              <button
                type="button"
                className="btn btn-secondary factory-action-btn"
                onClick={() => void upgradeFactoryAction(factory.id)}
                disabled={Boolean(busy) || blockedByOtherUpgrade || factory.nextUpgrade?.maxReached || factory.isUpgrading || !factory.nextUpgrade?.canUpgradeNow}
              >
                {busy === busyUpgradeKey
                  ? 'Başlatılıyor...'
                  : factory.isUpgrading
                    ? 'Yükseltiliyor'
                    : blockedByOtherUpgrade
                      ? 'Başka Yükseltme Aktif'
                      : factory.nextUpgrade?.maxReached
                        ? 'Maximum oldu'
                        : 'Yükselt'}
              </button>
              {factory.isUpgrading ? (
                <button
                  type="button"
                  className="btn btn-ghost factory-action-btn factory-action-btn-wide"
                  onClick={() => void speedupFactoryUpgradeAction(factory.id)}
                  disabled={Boolean(busy) || !canSpeedupNow}
                >
                  {busy === busySpeedupKey
                    ? 'Hızlandırılıyor...'
                    : `%30 Hızlandır (${fmt(factory.speedupDiamondCost)} elmas)`}
                </button>
              ) : null}
            </>
          )}
        </div>
      </article>
    )
  }

  const factoriesView = (
    <section className="panel-stack factory-screen">
      <article className="card factory-hub-card">
        <div className="factory-head">
          <h3>Fabrikalar</h3>
          <p>
            Sahip olduğun fabrikaları üst alanda anlık süre ile takip et, süre bitince tahsilat yap. Yeni fabrika kurulumlarını aşağıdaki listeden inşa edip başlat.
          </p>
        </div>
        {renderWeeklyEventInlineCard('Fabrika Tahsilat Ekranı')}

        <div className="factory-kpi-grid">
          <article className="factory-kpi">
            <small>Aktif Fabrika</small>
            <strong>{fmt(factoriesOwnedCount)}</strong>
          </article>
          <article className="factory-kpi">
            <small>Hazır Tahsilat</small>
            <strong>{fmt(factoriesReadyCount)}</strong>
          </article>
          <article className="factory-kpi">
            <small>Yükseltme</small>
            <strong>{fmt(factoriesUpgradingCount)}</strong>
          </article>
        </div>

        {buildingFactoryRows.length > 0 ? buildingFactoryRows.map((buildingFactory) => (
          <div key={buildingFactory.id} className="factory-build-banner">
            <div className="factory-build-banner-copy">
              <small>Fabrika İnşaat Ediliyor</small>
              <strong>{buildingFactory.name}</strong>
              <span>{buildingFactoryRows.length >= 2 ? `${buildingFactoryRows.length} fabrika inşaatta. Kurulum bitince Fabrikalarım'a geçer.` : 'Kurulum tamamlanınca otomatik olarak Fabrikalarım alanına geçer.'}</span>
            </div>
            <div className="factory-banner-right">
              <div className="factory-build-countdown">
                <small>Kalan Süre</small>
                <strong>{formatCollectionCountdown(buildingFactory.buildRemainingMs)}</strong>
              </div>
              <button
                type="button"
                className="btn btn-accent factory-build-speedup-btn"
                onClick={() => void speedupFactoryBuildAction(buildingFactory.id)}
                disabled={Boolean(busy) || premiumDiamond < Math.max(0, buildingFactory.buildSpeedupDiamondCost || 0)}
              >
                {busy === `factory-speedup-build:${buildingFactory.id}` ? 'Hızlandırılıyor...' : `%${Math.round((buildingFactory.buildSpeedupRatio || 0.3) * 100)} Hızlandır (${fmt(buildingFactory.buildSpeedupDiamondCost || 40)} elmas)`}
              </button>
            </div>
          </div>
        )) : null}

        {upgradingFactoryRows.length > 0 ? upgradingFactoryRows.map((upgradingFactory) => (
          <div key={upgradingFactory.id} className="factory-upgrade-banner">
            <div className="factory-build-banner-copy">
              <small>Fabrika Yükseltme Sürüyor</small>
              <strong>{upgradingFactory.name}</strong>
              <span>{upgradingFactoryRows.length >= 2 ? `${upgradingFactoryRows.length} fabrika yükseltmede.` : 'Bu süre bitmeden başka fabrika yükseltmesi başlatılamaz.'}</span>
            </div>
            <div className="factory-banner-right">
              <div className="factory-build-countdown is-upgrade">
                <small>Kalan Süre</small>
                <strong>{formatCollectionCountdown(upgradingFactory.upgradeRemainingMs)}</strong>
              </div>
              <button
                type="button"
                className="btn btn-accent factory-build-speedup-btn"
                onClick={() => void speedupFactoryUpgradeAction(upgradingFactory.id)}
                disabled={Boolean(busy) || premiumDiamond < Math.max(0, upgradingFactory.speedupDiamondCost || 0)}
              >
                {busy === `factory-speedup:${upgradingFactory.id}` ? 'Hızlandırılıyor...' : `%30 Hızlandır (${fmt(upgradingFactory.speedupDiamondCost || 40)} elmas)`}
              </button>
            </div>
          </div>
        )) : null}

        <div className="factory-hub-toolbar">
          <div className="factory-hub-summary">
            <small>Toplu Tahsilat</small>
            <strong>{factoriesReadyCount > 0 ? `${factoryBulkPreview.is2x ? '2x ' : ''}${fmt(factoriesReadyCount)} fabrika hazır` : 'Hazır tahsilat bekleniyor'}</strong>
            <span>
              {factoriesReadyCount > 0
                ? (() => {
                    const parts = Object.entries(factoryBulkPreview.byItem)
                      .map(([itemId, amount]) => {
                        const meta = factoryItemMeta(itemId)
                        return `+${fmt(amount)} ${meta?.label || itemId}`
                      })
                      .filter(Boolean)
                    if (factoryBulkPreview.totalXp > 0) parts.push(`+${fmt(factoryBulkPreview.totalXp)} XP`)
                    const costParts = Object.entries(factoryBulkPreview.energyByItem || {})
                      .filter(([, q]) => q > 0)
                      .map(([eId, amount]) => {
                        const meta = factoryItemMeta(eId)
                        return `-${fmt(amount)} ${meta?.label || eId}`
                      })
                    if (costParts.length) parts.push(`Gider: ${costParts.join(', ')}`)
                    const prefix = factoryBulkPreview.is2x ? '2x tahsilat: ' : 'Tahsilat: '
                    return parts.length ? `${prefix}${parts.join(', ')}. Kasayı topla ile al.` : 'Sayaç bitince toplu tahsilat yapabilirsin.'
                  })()
                : 'Sayaç kartlarda anlık akıyor. Süre bitince tek tek veya toplu toplayabilirsin.'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary factory-hub-collect-btn"
            onClick={() => factoriesReadyCount > 0 && setFactoryBulkModalOpen(true)}
            disabled={Boolean(busy) || factoriesReadyCount <= 0}
          >
            {factoriesReadyCount > 0
              ? (factoryBulkPreview.is2x ? `2x Kasayı topla (${fmt(factoriesReadyCount)})` : `Kasayı topla (${fmt(factoriesReadyCount)})`)
              : `Toplu Tahsilat (0)`}
          </button>
        </div>

        <section className="factory-section">
          <div className="factory-section-head">
            <h4>Fabrikalarım</h4>
            <p>Anlık durum, geri sayım ve tahsilat. Kartlara dokunup tahsilat veya yükseltme yapabilirsin.</p>
          </div>
          {ownedFactoryRows.length > 0 ? (
            <div className="factory-summary-stats">
              {factoriesReadyCount > 0 ? (
                <>
                  <span className="factory-summary-label">Hazır tahsilat:</span>
                  <span className="factory-summary-value">
                    {fmt(factoriesReadyCount)} fabrika
                    {Object.entries(factoryBulkPreview.byItem || {}).filter(([, q]) => q > 0).length > 0 && (
                      <> · {Object.entries(factoryBulkPreview.byItem || {}).filter(([, q]) => q > 0).map(([itemId, amount]) => {
                        const meta = factoryItemMeta(itemId)
                        return `+${fmt(amount)} ${meta?.label || itemId}`
                      }).join(', ')}</>
                    )}
                    {Object.entries(factoryBulkPreview.energyByItem || {}).filter(([, q]) => q > 0).length > 0 && (
                      <> · Gider: {Object.entries(factoryBulkPreview.energyByItem || {}).filter(([, q]) => q > 0).map(([eId, amount]) => {
                        const meta = factoryItemMeta(eId)
                        return `-${fmt(amount)} ${meta?.label || eId}`
                      }).join(', ')}</>
                    )}
                    {factoryBulkPreview.totalXp > 0 && <> · +{fmt(factoryBulkPreview.totalXp)} XP</>}
                  </span>
                </>
              ) : (
                <>
                  <span className="factory-summary-label">Aktif fabrika:</span>
                  <span className="factory-summary-value">{fmt(factoriesOwnedCount)} fabrika</span>
                </>
              )}
            </div>
          ) : null}
          <div className="factory-grid factory-grid-shop factory-grid-owned">
            {ownedFactoryRows.length ? ownedFactoryRows.map((factory) => {
              const busyCollectKey = `factory-collect:${factory.id}`
              const busyUpgradeKey = `factory-upgrade:${factory.id}`
              const blockedByOtherUpgrade = !factory.isUpgrading && !canStartAnotherFactoryUpgrade
              const hint = factory.isUpgrading
                ? `Yükseltiliyor · ${formatCollectionCountdown(factory.upgradeRemainingMs)}`
                : factory.canCollectNow
                  ? `Seviye ${fmt(factory.level)} · Tahsilat hazır`
                  : factory.collectRemainingMs > 0
                    ? `Seviye ${fmt(factory.level)} · Kalan ${formatCollectionCountdown(factory.collectRemainingMs)}`
                    : factory.collectEnergyMissing > 0
                      ? `Seviye ${fmt(factory.level)} · ${factory.energyMeta?.label || 'Enerji'} eksik`
                      : `Seviye ${fmt(factory.level)}`
              return (
                <article key={factory.id} className="factory-card is-owned is-shop-card is-shop-summary-card" data-factory-id={factory.id}>
                  <div className="factory-shop-card-open-wrap">
                    <div className="factory-shop-hero-wrap">
                      <div className="factory-shop-hero" data-broken="0">
                        <img
                          src={resolveFactoryShopImage(factory)}
                          alt={factory.name}
                          loading="lazy"
                          onError={(e) => { const el = e.currentTarget.parentElement; if (el) el.setAttribute('data-broken', '1') }}
                        />
                        <span className="factory-shop-hero-fallback">FAB</span>
                      </div>
                      <span className="factory-level-badge" title={`Seviye ${fmt(factory.level)}`}>
                        ★{fmt(factory.level)}
                      </span>
                    </div>
                    <strong className="factory-shop-card-name">{factory.name}</strong>
                    <small className="factory-shop-card-hint">{hint}</small>
                  </div>
                  <div className="factory-owned-actions">
                    <button
                      type="button"
                      className="btn btn-primary factory-action-btn factory-buy-btn"
                      onClick={() => factory.canCollectNow && setFactoryCollectModalId(factory.id)}
                      disabled={Boolean(busy) || !factory.canCollectNow}
                    >
                      {busy === busyCollectKey ? 'Tahsilat...' : factory.canCollectNow ? 'Tahsilat Yap' : 'Bekle'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary factory-action-btn factory-buy-btn"
                      onClick={() => !factory.isUpgrading && !blockedByOtherUpgrade && !factory.nextUpgrade?.maxReached && factory.nextUpgrade?.canUpgradeNow && setFactoryUpgradeModalId(factory.id)}
                      disabled={Boolean(busy) || factory.isUpgrading || blockedByOtherUpgrade || factory.nextUpgrade?.maxReached || !factory.nextUpgrade?.canUpgradeNow}
                    >
                      {busy === busyUpgradeKey ? 'Başlatılıyor...' : factory.isUpgrading ? 'Yükseltiliyor' : blockedByOtherUpgrade ? 'Slot dolu' : factory.nextUpgrade?.maxReached ? 'Maximum oldu' : 'Yükselt'}
                    </button>
                  </div>
                </article>
              )
            }) : (
              <p className="empty">Henüz aktif bir fabrika yok. Aşağıdan satın alıp kurabilirsin.</p>
            )}
          </div>
        </section>

        {lockedFactoryRows.length > 0 ? (
          <section className="factory-section">
            <div className="factory-section-head">
              <h4>Satın alabileceğiniz fabrikalar</h4>
              <p>{canStartAnotherFactoryBuild ? 'Kartlara dokunup kurulum detayını açabilirsin' : 'Fabrika kurulurken başka fabrika kurulamaz'}</p>
            </div>
            <div className="factory-grid factory-grid-shop">
              {lockedFactoryRows.map((factory) => {
                const rows = factoryPurchaseRowsFromFactory(factory)
                const missing = rows.filter((r) => r.missing > 0)
                const hint = !canStartAnotherFactoryBuild
                  ? 'İnşaat devam ediyor'
                  : missing.length
                    ? `${missing.length} kaynak eksik`
                    : 'İnşa etmeye hazır'
                return (
                  <article key={factory.id} className="factory-card is-shop-card is-shop-summary-card" data-factory-id={factory.id}>
                    <button
                      type="button"
                      className="factory-shop-card-open"
                      onClick={() => openFactoryPurchaseModal(factory.id)}
                      disabled={Boolean(busy)}
                    >
                      <div className="factory-shop-hero" data-broken="0">
                        <img
                          src={resolveFactoryShopImage(factory)}
                          alt={factory.name}
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget.parentElement
                            if (el) el.setAttribute('data-broken', '1')
                          }}
                        />
                        <span className="factory-shop-hero-fallback">FAB</span>
                      </div>
                      <strong className="factory-shop-card-name">{factory.name}</strong>
                      <small className="factory-shop-card-hint">{hint}</small>
                    </button>
                    <button
                      type="button"
                      className={`btn factory-buy-btn factory-action-btn factory-action-btn-wide ${factory.canPurchaseNow && canStartAnotherFactoryBuild ? 'btn-success' : 'btn-secondary'}`.trim()}
                      onClick={() => openFactoryPurchaseModal(factory.id)}
                      disabled={Boolean(busy)}
                    >
                      {busy === `factory-buy:${factory.id}` ? 'Kuruluyor...' : 'İnşa Et'}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}
        <div className="factory-scroll-spacer" aria-hidden="true" />

        {factoryPurchaseModal && createPortal(
          <section
            ref={factoryPurchaseOverlayRef}
            className="factory-purchase-overlay"
            onClick={closeFactoryPurchaseModal}
            aria-modal="true"
            role="dialog"
          >
            <article
              className="factory-purchase-modal"
              aria-labelledby="factory-purchase-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="factory-purchase-modal-title" className="factory-purchase-modal-title">{factoryPurchaseModal.name}</h2>
              <p className="factory-purchase-modal-subtitle">Kurulum bilgilerini inceleyip fabrikayı kurabilirsin.</p>

              <div className="factory-purchase-modal-preview">
                <span className="factory-purchase-modal-thumb" data-broken="0">
                  <img src={resolveFactoryShopImage(factoryPurchaseModal)} alt="" loading="lazy" onError={(e) => e.currentTarget.parentElement?.setAttribute('data-broken', '1')} />
                  <span className="factory-purchase-modal-thumb-fallback">FAB</span>
                </span>
                <div className="factory-purchase-modal-preview-copy">
                  <p>Kurulum: {fmt(factoryPurchaseModal.purchaseCostCash)} nakit</p>
                  <p>İnşaat: {formatBuildDuration(factoryPurchaseModal.buildDurationMinutes * 60 * 1000)} · Tahsilat: {fmt(factoryPurchaseModal.collectIntervalMinutes)} dk</p>
                </div>
              </div>

              <div className="factory-purchase-modal-stats">
                <div className="factory-purchase-stat is-income">
                  <img src={factoryPurchaseModal.outputMeta.icon} alt="" aria-hidden="true" />
                  <span>+{fmt(factoryPurchaseModal.outputPerCollect)} {factoryPurchaseModal.outputMeta.label}</span>
                </div>
                <div className="factory-purchase-stat is-energy">
                  <img src={factoryPurchaseModal.energyMeta.icon} alt="" aria-hidden="true" />
                  <span>-{fmt(factoryPurchaseModal.energyCostPerCollect)} {factoryPurchaseModal.energyMeta.label}</span>
                </div>
                <div className="factory-purchase-stat is-xp">
                  <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                  <span>+{fmt(factoryPurchaseModal.xpPerCollect)} XP</span>
                </div>
              </div>

              <div className="factory-purchase-modal-costs">
                <span className="factory-cost-title">Kurulum kaynak maliyetleri</span>
                <div className="factory-purchase-cost-list">
                  {factoryPurchaseModalRows.map((row) => (
                    <article key={`${factoryPurchaseModal.id}-row-${row.key}`} className={`factory-purchase-cost-row ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                      <span className="factory-purchase-cost-main"><img src={row.icon} alt="" aria-hidden="true" />{row.label}</span>
                      <strong>{fmt(row.required)}</strong>
                      <span className="factory-purchase-cost-state">{row.missing > 0 ? `Eksik ${fmt(row.missing)}` : 'Yeterli'}</span>
                    </article>
                  ))}
                </div>
                {factoryPurchaseModalMissingRows.length ? (
                  <span className="factory-cost-title factory-cost-title-missing">
                    Toplam eksik: {factoryPurchaseModalMissingRows.map((row) => `${row.label} ${fmt(row.missing)}`).join(', ')}
                  </span>
                ) : (
                  <span className="factory-max-label">Kurulum için tüm maliyetler hazır.</span>
                )}
              </div>

              <div className="factory-purchase-modal-actions">
                <button
                  type="button"
                  className={`btn factory-buy-btn ${factoryPurchaseModalCanBuyNow ? 'btn-success' : 'btn-secondary'}`.trim()}
                  onClick={() => void buyFactoryAction(factoryPurchaseModal.id)}
                  disabled={Boolean(busy) || !factoryPurchaseModalCanBuyNow}
                >
                  {busy === factoryPurchaseBusyKey ? 'Kuruluyor...' : !canStartAnotherFactoryBuild ? 'Fabrika kurulurken başka fabrika kurulamaz' : factoryPurchaseModal.canPurchaseNow ? 'Fabrikayı Kur' : 'Maliyet Yetersiz'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeFactoryPurchaseModal}>Kapat</button>
              </div>
            </article>
          </section>,
          document.body
        )}

        {factoryBulkModalOpen && createPortal(
          <section className="warehouse-overlay" onClick={() => setFactoryBulkModalOpen(false)}>
            <article className="warehouse-modal fleet-modal fleet-bulk-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Fabrika Toplu Tahsilat</h3>
              <p className="fleet-bulk-intro">Tahsilat süresi dolan fabrikalardan üretim kaynağı ve XP toplayabilirsin.</p>
              <p className="fleet-bulk-note">Bu ekranda toplanacak kaynaklar, deneyim ve enerji maliyeti görünür.</p>
              <section className="fleet-bulk-kpis" aria-label="Toplu tahsilat özeti">
                <article className="fleet-bulk-kpi">
                  <span>Hazır Fabrika</span>
                  <strong>{fmt(factoriesReadyCount)}</strong>
                </article>
                <article className="fleet-bulk-kpi">
                  <span>Tahsilat Aralığı</span>
                  <strong>30 dk</strong>
                </article>
              </section>
              <div className="fleet-modal-actions fleet-modal-actions-bulk">
                <button
                  className="btn btn-success btn-collect-main"
                  onClick={() => void confirmFactoryBulkCollectFromModal()}
                  disabled={Boolean(busy) || factoriesReadyCount <= 0}
                >
                  <span className="btn-icon">
                    <img src={premiumActive && factoryBulkPreview.is2x ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.webp'} alt="" aria-hidden="true" />
                  </span>
                  <span className="btn-label">
                    {busy === 'factory-collect-bulk'
                      ? (factoryBulkPreview.is2x ? '2x toplanıyor...' : 'Toplanıyor...')
                      : factoriesReadyCount > 0
                        ? (factoryBulkPreview.is2x ? `2x Kasayı topla (${fmt(factoriesReadyCount)})` : `Kasayı topla (${fmt(factoriesReadyCount)})`)
                        : 'Tahsilat Hazır Değil'}
                  </span>
                </button>
              </div>
              <article className="fleet-bulk-summary fleet-accountant-summary">
                {Object.entries(factoryBulkPreview.byItem || {}).map(([itemId, amount]) => {
                  const meta = factoryItemMeta(itemId)
                  return amount > 0 ? (
                    <p key={itemId} className="fleet-summary-line positive">
                      <img src={meta?.icon || '/home/icons/depot/cash.webp'} alt="" aria-hidden="true" />
                      +{fmt(amount)} {meta?.label || itemId}
                    </p>
                  ) : null
                })}
                <p className="fleet-summary-line positive">
                  <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                  + {fmt(factoryBulkPreview.totalXp)} Deneyim
                </p>
                <hr />
                {Object.entries(factoryBulkPreview.energyByItem || {}).map(([eId, amount]) => {
                  const meta = factoryItemMeta(eId)
                  return amount > 0 ? (
                    <p key={eId} className="fleet-summary-line negative">
                      <img src={meta?.icon || '/home/icons/depot/oil.webp'} alt="" aria-hidden="true" />
                      - {fmt(amount)} {meta?.label || eId}
                    </p>
                  ) : null
                })}
              </article>
              <button type="button" className="btn btn-danger fleet-modal-close" onClick={() => setFactoryBulkModalOpen(false)}>Kapat</button>
            </article>
          </section>,
          document.body
        )}

        {factoryCollectModal && createPortal(
          <section className="warehouse-overlay" onClick={() => setFactoryCollectModalId('')}>
            <article className="warehouse-modal fleet-modal fleet-accountant-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Muhasebeci</h3>
              <p>{factoryCollectModal.name} için tahsilat dökümü hazır.</p>
              <button
                className="btn btn-success full btn-collect-inline"
                onClick={() => void confirmFactoryCollectFromModal()}
                disabled={Boolean(busy)}
              >
                <span className="btn-icon">
                  <img src={premiumActive && factoryBulkPreview.is2x ? '/home/icons/depot/diamond.webp' : factoryCollectModal.outputMeta?.icon || '/home/icons/depot/cash.webp'} alt="" aria-hidden="true" />
                </span>
                <span className="btn-label">
                  {busy === `factory-collect:${factoryCollectModal.id}` ? 'Kasaya aktarılıyor...' : `Tahsilat Yap (+${fmt(factoryCollectModal.outputPerCollect || 0)} ${factoryCollectModal.outputMeta?.label || ''})`}
                </span>
              </button>
              <article className="fleet-bulk-summary fleet-accountant-summary">
                <p className="fleet-summary-line positive">
                  <img src={factoryCollectModal.outputMeta?.icon} alt="" aria-hidden="true" />
                  +{fmt(premiumActive && premiumMultiplier > 1 ? Math.round((factoryCollectModal.outputPerCollect || 0) * premiumMultiplier) : factoryCollectModal.outputPerCollect || 0)} {factoryCollectModal.outputMeta?.label}
                </p>
                <p className="fleet-summary-line positive">
                  <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                  + {fmt(factoryCollectModal.xpPerCollect || 0)} XP
                </p>
                <hr />
                <p className="fleet-summary-line negative">
                  <img src={factoryCollectModal.energyMeta?.icon} alt="" aria-hidden="true" />
                  - {fmt(factoryCollectModal.energyCostPerCollect || 0)} {factoryCollectModal.energyMeta?.label}
                </p>
                <small>Depodaki {factoryCollectModal.energyMeta?.label}: {fmt(inventoryById[factoryCollectModal.energyItemId] || 0)}</small>
              </article>
              <button type="button" className="btn btn-danger fleet-modal-close" onClick={() => setFactoryCollectModalId('')}>Kapat</button>
            </article>
          </section>,
          document.body
        )}

        {factoryUpgradeModal && createPortal(
          <section className="warehouse-overlay" onClick={() => setFactoryUpgradeModalId('')}>
            <article className="warehouse-modal fleet-modal factory-upgrade-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Fabrika Yükseltme</h3>
              <p>{factoryUpgradeModal.name} · Seviye {fmt(factoryUpgradeModal.level)} → {fmt(factoryUpgradeModal.nextUpgrade?.nextLevel || factoryUpgradeModal.level + 1)}</p>
              <div className="factory-upgrade-modal-preview">
                <h4>Yükseltme sonrası kazanç</h4>
                <p className="fleet-summary-line positive">
                  <img src={factoryUpgradeModal.outputMeta?.icon} alt="" aria-hidden="true" />
                  Üretim: +{fmt(Math.round(num(factoryUpgradeModal.outputPerCollect || 0) * (factoryUpgradeModal.nextUpgrade?.nextLevel || factoryUpgradeModal.level + 1) / Math.max(1, factoryUpgradeModal.level)))} {factoryUpgradeModal.outputMeta?.label} / tahsilat
                </p>
                <p className="fleet-summary-line negative">
                  <img src={factoryUpgradeModal.energyMeta?.icon} alt="" aria-hidden="true" />
                  Enerji maliyeti: -{fmt(Math.round(num(factoryUpgradeModal.energyCostPerCollect || 0) * (factoryUpgradeModal.nextUpgrade?.nextLevel || factoryUpgradeModal.level + 1) / Math.max(1, factoryUpgradeModal.level)))} {factoryUpgradeModal.energyMeta?.label} / tahsilat
                </p>
                <p className="fleet-summary-line positive">
                  <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                  XP: artacak
                </p>
              </div>
              <div className="factory-upgrade-modal-costs">
                <h4>Yükseltme maliyeti (artmış)</h4>
                <div className="factory-cost-grid">
                  <div className={`factory-cost-chip ${factoryUpgradeModal.missingUpgradeCash > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                    <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                    <span>Nakit: {fmt(factoryUpgradeModal.nextUpgradeCostCash || 0)}</span>
                  </div>
                  {(factoryUpgradeModal.upgradeCostRows || []).map((row) => (
                    <div key={row.itemId} className={`factory-cost-chip ${row.missing > 0 ? 'is-missing' : 'is-ready'}`.trim()}>
                      <img src={row.meta?.icon} alt="" aria-hidden="true" />
                      <span>{row.meta?.label}: {fmt(row.amount)}</span>
                    </div>
                  ))}
                </div>
                <p className="fleet-gallery-note-hint">Süre: {formatBuildDuration((factoryUpgradeModal.nextUpgrade?.durationMinutes || 0) * 60 * 1000)}</p>
                {factoryUpgradeModalBlockedBySlot ? (
                  <p className="fleet-gallery-note-hint">
                    Yükseltme yuvası dolu: Aktif inşaat/yükseltme tamamlanınca yeniden açılır.
                  </p>
                ) : null}
              </div>
              <div className="fleet-modal-actions">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => void confirmFactoryUpgradeFromModal()}
                  disabled={
                    Boolean(busy) ||
                    factoryUpgradeModalBlockedBySlot ||
                    !factoryUpgradeModal.nextUpgrade?.canUpgradeNow ||
                    factoryUpgradeModal.nextUpgrade?.maxReached
                  }
                >
                  {busy === `factory-upgrade:${factoryUpgradeModal.id}`
                    ? 'Başlatılıyor...'
                    : factoryUpgradeModalBlockedBySlot
                      ? 'Slot dolu'
                      : factoryUpgradeModal.nextUpgrade?.maxReached
                        ? 'Maximum oldu'
                        : 'Yükselt'}
                </button>
                <button type="button" className="btn btn-danger fleet-modal-close" onClick={() => setFactoryUpgradeModalId('')}>Kapat</button>
              </div>
            </article>
          </section>,
          document.body
        )}
      </article>
    </section>
  )

  const businessView = (
    <section className={`panel-stack business-screen${businessScene !== 'hub' ? ' is-focused' : ''}`}>
      {renderWeeklyEventInlineCard('İşletme ve Lojistik Tahsilat Ekranı')}
      {businessScene === 'hub' ? (
        <article className="card fleet-overview-card">
          <div className="fleet-company-shell">
            <div className="fleet-overview-head">
              <h3>İşletmelerim</h3>
              <p className="fleet-overview-sub">Şirket seviyeni ve aktif işletme sınırını buradan takip edebilirsin.</p>
            </div>
            <div className="fleet-company-card">
              <div className="fleet-company-top">
                <div className="fleet-company-title">
                  <small>Şirket ünvanı</small>
                  <h4>{companyLegalLabel}</h4>
                </div>
                <button className="fleet-info-btn" type="button" onClick={() => void openTab('home', { tab: 'home' })}>Şehir</button>
              </div>
              <div className="fleet-company-main">
                <span className="fleet-hero-media" data-broken="0">
                <img
                  src="/home/icons/isletmeler.webp"
                  alt={companyLegalLabel}
                  loading="lazy"
                  onError={(event) => {
                    const holder = event.currentTarget.parentElement
                    if (holder) holder.setAttribute('data-broken', '1')
                  }}
                />
                <span className="fleet-hero-fallback">İŞ</span>
                </span>
                <div className="fleet-company-meta">
                  <small>İŞLETME SEVİYESİ</small>
                  <strong className="level-text">{fmt(companyLevel)}. Seviye</strong>
                  <small>AKTİF İŞLETME SEVİYESİ</small>
                  <strong>{fmt(companyBusinessCount)} / {fmt(companyBusinessLimit)}</strong>
                  <p>
                    {companyBootstrapped
                      ? 'İşletmeni geliştir, ardından İş Kur bölümünden yeni işletme satın al.'
                      : 'Henüz aktif işletme yok. İş Kur bölümünden ilk işletmeni satın al.'}
                  </p>
                </div>
              </div>
              <div className="fleet-company-actions">
                <button className="btn fleet-company-cta is-upgrade" onClick={() => setBusinessModal('upgrade')} disabled={Boolean(busy)}>
                  <span className="fleet-company-cta-head">
                    <span className="fleet-company-cta-title-wrap">
                      <span className="fleet-company-cta-title">Geliştir</span>
                    </span>
                    <span className={`fleet-company-cta-badge ${companyUpgrade?.maxReached ? 'is-muted' : 'is-live'}`.trim()}>
                      {companyUpgrade?.maxReached ? 'MAX' : 'Lv'}
                    </span>
                  </span>
                  <strong className="fleet-company-cta-value">{ctaUpgradePrimary}</strong>
                  <p className="fleet-company-cta-meta">{ctaUpgradeSecondary}</p>
                </button>
                <button className="btn fleet-company-cta is-bulk" onClick={runBulkCollectPreview} disabled={Boolean(busy)}>
                  <span className="fleet-company-cta-head">
                    <span className="fleet-company-cta-title-wrap">
                      <span className="fleet-company-cta-title">Toplu Tahsilat</span>
                    </span>
                    <span className={`fleet-company-cta-badge ${totalBulkCount > 0 ? 'is-live' : 'is-muted'}`.trim()}>
                      {premiumBoostActive ? '2x' : 'Net'}
                    </span>
                  </span>
                  <strong className="fleet-company-cta-value">{ctaBulkPrimary}</strong>
                  <p className="fleet-company-cta-meta">{ctaBulkSecondary}</p>
                </button>
                <button className="btn fleet-company-cta is-setup" onClick={() => setBusinessModal('setup')} disabled={Boolean(busy)}>
                  <span className="fleet-company-cta-head">
                    <span className="fleet-company-cta-title-wrap">
                      <span className="fleet-company-cta-title">İş Kur</span>
                    </span>
                    <span className={`fleet-company-cta-badge ${nextCompanyUnlock ? 'is-live' : 'is-muted'}`.trim()}>
                      {nextCompanyUnlock ? 'Yeni' : 'Tamam'}
                    </span>
                  </span>
                  <strong className="fleet-company-cta-value">{ctaSetupPrimary}</strong>
                  <p className="fleet-company-cta-meta">{ctaSetupSecondary}</p>
                </button>
              </div>
            </div>
          </div>
        </article>
      ) : null}

      {businessScene === 'hub' ? (
        <>
          <article className="card fleet-active-card">
            <div className="fleet-active-head">
              <h3>Aktif İşletmelerim</h3>
              <p className="fleet-section-hint">Gelir üreten tüm kiralama işletmelerin ve lojistik merkezini burada takip edebilirsin.</p>
            </div>
            <div className="fleet-secretary-box">
              <h4>Sekreter Notları</h4>
              <ul className="fleet-secretary-list">
                <li><strong>Tahsilat süresi:</strong> Tüm kiralama işletmelerinde tahsilat aralığı 60 dakikadır (saatlik).</li>
                <li><strong>Araç siparişi:</strong> Her işletme için 4 saatte bir yeni araç siparişi verilebilir.</li>
                <li><strong>Kapasite:</strong> Kapasite dolduğunda yeni araç üretimi otomatik olarak durur.</li>
                <li><strong>Sıfır siparişler:</strong> Yalnızca seviye ve depo şartları sağlandığında açılır.</li>
                <li><strong>Depo durumu:</strong> Depo malzemeleri yetersizse üretim başlatılamaz.</li>
              </ul>
            </div>
            {companyBootstrapped ? (
              <div className="fleet-active-grid">
                {activeBusinessCards.length ? activeBusinessCards.map((entry) => (
                  <article key={entry.id} className="fleet-active-tile">
                    <button
                      className="fleet-active-open"
                      onClick={() => {
                        if (entry.kind === 'logistics') {
                          void openLogisticsCenter()
                          return
                        }
                        openBusinessDetail(entry.id)
                      }}
                      disabled={Boolean(busy)}
                    >
                      <span className="fleet-active-thumb" data-broken={entry.image ? '0' : '1'}>
                        {entry.image ? (
                          <img
                            src={entry.image}
                            alt={entry.name}
                            loading="lazy"
                            onError={(event) => {
                              const holder = event.currentTarget.parentElement
                              if (holder) holder.setAttribute('data-broken', '1')
                            }}
                          />
                        ) : null}
                        <span className="fleet-active-fallback">{entry.icon}</span>
                      </span>
                      <strong>{entry.name}</strong>
                      {entry.timerLabel ? <small className="fleet-active-timer">{entry.timerLabel}</small> : null}
                    </button>
                    <button
                      className="fleet-cash-btn"
                      onClick={() => {
                        if (entry.kind === 'logistics') {
                          void openLogisticsCenter()
                          return
                        }
                        openBusinessDetail(entry.id)
                      }}
                      disabled={Boolean(busy)}
                    >
                      {entry.actionLabel}
                    </button>
                  </article>
                )) : <p className="empty">Henüz açılmış işletme yok. Geliştir ve İş Kur adımlarını tamamla.</p>}
              </div>
            ) : (
              <article className="fleet-note-panel">
                <p>Henüz aktif işletme yok.</p>
                <p>Soldaki <strong>Geliştir</strong> ile ilk işletmeni aç, ardından sağdaki <strong>İş Kur</strong> bölümünü kullan.</p>
              </article>
            )}
          </article>
        </>
      ) : null}

      {businessScene === 'detail' && selectedBusiness ? (
        <article className="card fleet-detail-card fleet-fullscreen-card">
          <div className="fleet-subheader">
            <div className="fleet-subheader-copy">
              <p className="fleet-subheader-owner">{companyLegalLabel}</p>
              <h3 className="fleet-subheader-title">{selectedBusinessHeaderTitle}</h3>
            </div>
            <div className="fleet-subheader-actions">
              <button className="btn btn-accent" onClick={openFleetHelp}>Bilgi</button>
              <button className="btn btn-danger" onClick={openBusinessHub}>Geri</button>
            </div>
          </div>
          <div className="fleet-detail-hero">
            <span className="fleet-hero-media" data-broken={selectedBusiness.heroImage ? '0' : '1'}>
              {selectedBusiness.heroImage ? (
                <img
                  src={selectedBusiness.heroImage}
                  alt={selectedBusiness.name}
                  loading="lazy"
                  onError={(event) => {
                    const holder = event.currentTarget.parentElement
                    if (holder) holder.setAttribute('data-broken', '1')
                  }}
                />
              ) : null}
              <span className="fleet-hero-fallback">{selectedBusinessMeta?.fallback || 'OTO'}</span>
            </span>
            <div className="fleet-detail-main">
              <div className="fleet-detail-kpi">
                <p className="fleet-detail-kpi-label">{selectedBusinessMeta?.unitLabel || 'Araç'} Sayısı</p>
                <strong className="fleet-detail-kpi-value">{fmt(selectedBusiness.fleetCount)} / {fmt(selectedBusiness.fleetCapacity)}</strong>
              </div>
              <div className="fleet-company-actions fleet-company-actions-inline">
                <button className="btn btn-accent full" onClick={openBusinessMarket}>{selectedBusinessMeta?.secondHandLabel || 'İkinci El Pazarı'}</button>
                <button className="btn btn-accent full" onClick={openBusinessGallery}>{selectedBusinessMeta?.newOrderLabel || 'Sıfır Araba Siparişi'}</button>
              </div>
              {selectedBusiness?.fleetCount > 0 ? (
                <button
                  className={`btn full fleet-collect-action ${selectedCollectLocked ? 'btn-danger fleet-collect-done' : 'btn-success'}`.trim()}
                  onClick={() => openCollectPreview(selectedBusiness.id)}
                  disabled={Boolean(busy) || selectedCollectLocked}
                >
                  <span className="btn-icon">
                    <img
                      src={premiumBoostActive ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.png'}
                      alt=""
                      aria-hidden="true"
                    />
                  </span>
                  <span className="btn-label btn-label-stack">
                    <span>
                      {busy === `collect:${selectedBusiness.id}`
                        ? 'Tahsilat hazırlanıyor...'
                        : selectedCollectLocked
                          ? `Tahsilat Beklemede: ${selectedCollectCooldownLabel}`
                          : selectedCollectPreview.netCash > 0
                            ? premiumBoostActive
                              ? `2x Tahsilat Yap (+${fmt(selectedCollectPreview.netCash)})`
                              : `Tahsilat Yap (+${fmt(selectedCollectPreview.netCash)})`
                            : 'Tahsilat Yap'}
                    </span>
                    {!selectedCollectLocked && busy !== `collect:${selectedBusiness.id}` && selectedCollectPreview.netCash > 0 ? (
                      <small>{premiumBoostActive ? `${premiumMultiplier}x Premium tahsilat aktif` : 'Saatlik net tahsilat'}</small>
                    ) : null}
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="tab-strip two fleet-tier-strip">
            {BUSINESS_DETAIL_TABS.map((item) => (
              <button key={item} className={businessDetailTab === item ? 'on' : ''} onClick={() => setBusinessDetailTab(item)}>
                {item === 'garage' ? ownedTabLabel : 'Satışlarım'}
              </button>
            ))}
          </div>

          {businessDetailTab === 'market' ? (
            <div className="fleet-owned-list">
              <h4>Satışlarım</h4>
              <p className="fleet-market-inline-note">
                {ownedTabLabel} sekmesinde araç kartına dokunarak ilana ekleyebilir veya parçalayabilirsin. Bu alanda sadece ilan iptali yapabilirsin.
              </p>
              <p className="fleet-market-inline-note">
                Aktif satış ilanı: {fmt(selectedMyListings.length)} | Satılan ilan: {fmt(selectedSoldListingRows.length)}
              </p>
              {selectedMyListings.length ? (
                selectedMyListings.map((vehicle) => {
                  const requiredLevel = Math.max(1, Math.trunc(num(vehicle.requiredLevel || vehicle.marketLevel || 1)))
                  const hourlyFuelNeed = fleetFuelUnitsByModelLevel(
                    requiredLevel,
                    selectedBusiness?.templateId || vehicle.templateId || 'auto-rental',
                    { weeklyEvents: weeklyEventsRuntimeState },
                  )
                  return (
                  <article
                    key={`my-listing-${vehicle.id}`}
                    className="fleet-owned-row fleet-owned-row-listing fleet-owned-row-modal"
                    role="button"
                    tabIndex={0}
                    onClick={() => openActiveListingModal(vehicle, selectedBusiness?.templateId)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      openActiveListingModal(vehicle, selectedBusiness?.templateId)
                    }}
                  >
                    <span className="fleet-owned-thumb" data-broken={resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? '0' : '1'}>
                      {resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? <img src={resolveVehicleImage(vehicle, selectedBusiness?.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                      <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, selectedBusiness?.templateId)}</span>
                    </span>
                    <div className="fleet-owned-main">
                      <div className="fleet-owned-mainline">
                        <strong>{vehicle.name}</strong>
                        <span className="fleet-owned-price">{fmt(vehicle.price)}</span>
                      </div>
                      <p className="fleet-owned-subline">
                        <span className="level-text">{fmt(requiredLevel)}. Seviye</span>
                        {' | '}
                        Aktif ilan
                      </p>
                      <div className="fleet-compact-metrics fleet-owned-metrics">
                        <span className="fleet-compact-metric">
                          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                          Gelir +{fmt(vehicle.rentPerHour)}
                        </span>
                        <span className="fleet-compact-metric">
                          <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" />
                          {selectedBusinessFuelMeta.expenseLabel} -{fmt(hourlyFuelNeed)}
                        </span>
                        <span className="fleet-compact-metric">
                          <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                          XP +{fmt(vehicle.xp || 0)}
                        </span>
                      </div>
                      <small className="fleet-owned-expand-hint">Satışa bakmak için dokun.</small>
                    </div>
                  </article>
                  )
                })
              ) : (
                <p className="empty">Bu işletme için aktif satış ilanın bulunmuyor.</p>
              )}
              <div className="fleet-sold-list">
                <h5>Satılan İlanlar</h5>
                {selectedSoldListingRows.length ? (
                  selectedSoldListingRows.map((entry) => (
                    <article key={`sold-fleet-${entry.id}`} className="fleet-sold-row">
                      <div className="fleet-sold-copy">
                        <strong>{String(entry?.detail || 'İlan satışı tamamlandı.').trim()}</strong>
                        <small>{formatDateTime(entry?.createdAt || '')}</small>
                      </div>
                      <strong className="fleet-sold-amount">+{fmt(entry?.amount || 0)}</strong>
                    </article>
                  ))
                ) : (
                  <p className="empty">Henüz satılan ilan kaydı bulunmuyor.</p>
                )}
              </div>
            </div>
          ) : null}

          {businessDetailTab !== 'market' ? (
            <div className="fleet-vehicle-list">
              <h4>{ownedTabLabel}</h4>
              {detailVehiclesView.length ? (
                detailVehiclesView.map((vehicle) => {
                  const lifetime = resolveVehicleLifetime(vehicle, liveNowMs)
                  return (
                  <article
                    key={`${vehicle.isListed ? 'listed' : 'owned'}-${vehicle.id}`}
                    className={`fleet-compact-row${vehicle.isListed ? '' : ' fleet-compact-listable'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (vehicle.isListed) {
                        const activeListing =
                          selectedMyListings.find((entry) =>
                            String(entry?.id || '').trim() === String(vehicle?.listingId || '').trim(),
                          ) ||
                          selectedMyListings.find((entry) =>
                            String(entry?.vehicleId || entry?.id || '').trim() === String(vehicle?.id || '').trim(),
                          ) ||
                          vehicle
                        openActiveListingModal(activeListing, selectedBusiness?.templateId)
                        return
                      }
                      openVehicleListingModal(selectedBusiness.id, vehicle)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      if (vehicle.isListed) {
                        const activeListing =
                          selectedMyListings.find((entry) =>
                            String(entry?.id || '').trim() === String(vehicle?.listingId || '').trim(),
                          ) ||
                          selectedMyListings.find((entry) =>
                            String(entry?.vehicleId || entry?.id || '').trim() === String(vehicle?.id || '').trim(),
                          ) ||
                          vehicle
                        openActiveListingModal(activeListing, selectedBusiness?.templateId)
                        return
                      }
                      openVehicleListingModal(selectedBusiness.id, vehicle)
                    }}
                  >
                    <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? '0' : '1'}>
                      {resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? <img src={resolveVehicleImage(vehicle, selectedBusiness?.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                      <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, selectedBusiness?.templateId)}</span>
                    </span>
                    <div className="fleet-compact-meta">
                      <strong>{vehicle.name}</strong>
                      <p>
                        {`Seviye ${fmt(vehicle.requiredLevel || 1)}`}
                      </p>
                      <div className="fleet-compact-metrics">
                        <span className="fleet-compact-metric">
                          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                          Saatlik Gelir {fmt(vehicle.rentPerHour)}
                        </span>
                        <span className="fleet-compact-metric">
                          <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" />
                            {selectedBusinessFuelMeta.expenseLabel} - {fmt(fleetFuelUnitsByModelLevel(
                              vehicle.requiredLevel || 1,
                              selectedBusiness?.templateId,
                              { weeklyEvents: weeklyEventsRuntimeState },
                            ))}
                        </span>
                        <span className="fleet-compact-metric">
                          <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                          +{fmt(vehicle.xp || 0)} XP
                        </span>
                        <span className={`fleet-compact-metric is-lifetime${lifetime.expired ? ' is-expired' : ''}`}>
                          <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                          Ömür {formatLifetimeWithTotal(lifetime)}
                        </span>
                      </div>
                      <small className="fleet-listing-hint" aria-live="polite">
                        {vehicle.isListed ? (
                          <span className="fleet-listing-hint-state is-listed">İlanda: satıştan vazgeçmek için karta dokun.</span>
                        ) : busy === `listbiz:${selectedBusiness.id}:${vehicle.id}` ? (
                          <span className="fleet-listing-hint-state is-busy">İlan işlemi hazırlanıyor...</span>
                        ) : (
                          <span className="fleet-listing-hint-actions">
                            <span className="fleet-listing-hint-chip is-sale">İlana Ekle</span>
                            <span className="fleet-listing-hint-chip is-scrap">Parçala</span>
                            <span className="fleet-listing-hint-tip">Karta dokun</span>
                          </span>
                        )}
                      </small>
                    </div>
                  </article>
                  )
                })
              ) : (
                <p className="empty">Bu sekmede gösterilecek araç yok.</p>
              )}
            </div>
          ) : null}
        </article>
      ) : null}

      {businessScene === 'gallery' && selectedBusiness?.templateId === 'moto-rental' ? (
        <article className="card fleet-detail-card fleet-fullscreen-card fleet-order-screen moto-order-screen">
          <div className="fleet-subheader">
            <div className="fleet-subheader-copy">
              <p className="fleet-subheader-owner">{companyLegalLabel}</p>
              <h3 className="fleet-subheader-title">{selectedBusinessGalleryTitle}</h3>
            </div>
            <div className="fleet-subheader-actions">
              <button className="btn btn-danger" onClick={() => setBusinessScene('detail')}>Geri</button>
            </div>
          </div>
          <div className="fleet-gallery-note fleet-order-gallery-note moto-gallery-note">
            <p>{selectedHasCapacityForOrder ? 'Siparişe hazır.' : 'Kapasite dolu. Yeni sipariş için önce yer aç.'}</p>
            <p className="fleet-live-countdown">Canlı sipariş geri sayımı: {selectedOrderCountdown}</p>
          </div>
          <div className="fleet-vehicle-list fleet-order-list moto-order-list">
            {selectedBuildRows.map((vehicle, vehicleIndex) => {
              const costRows = fleetOrderCostRows(vehicle, walletNow, inventoryById)
              const displayCostRows = toDisplayOrderCostRows(costRows, { requiredOnly: true })
              const orderFuelCost = Math.max(0, Math.trunc(num(vehicle?.fuel || 0)))
              const oilInInventory = Math.max(0, Math.trunc(num(inventoryById?.oil || 0)))
              const hasEnoughFuelForOrder = oilInInventory >= orderFuelCost
              const hasEnoughMaterials = costRows.every((entry) => entry.enough) && hasEnoughFuelForOrder
              const modelLevelRequired = num(vehicle.requiredLevel || 1)
              const lockedByLevel = modelLevelRequired > selectedUnlockedModelLevel
              const blockedByMaterials = !hasEnoughMaterials && !lockedByLevel && selectedCanOrderNow
              const modelOrderLevel = Math.max(1, vehicleIndex + 1)
              const fuelLevel = Math.max(1, Math.trunc(num(modelLevelRequired || modelOrderLevel)))
                    const hourlyFuelNeed = fleetFuelUnitsByModelLevel(fuelLevel, 'moto-rental', {
                      weeklyEvents: weeklyEventsRuntimeState,
                    })
              return (
                <article key={`${selectedBusiness.id}-moto-build-${vehicle.id}`} className="fleet-vehicle-row fleet-order-card moto-order-card">
                  <div className="fleet-vehicle-head">
                    <strong>{vehicle.name}</strong>
                  </div>
                  <div className="fleet-vehicle-body">
                    <span className="fleet-vehicle-media" data-broken={resolveVehicleImage(vehicle, 'moto-rental') ? '0' : '1'}>
                      {resolveVehicleImage(vehicle, 'moto-rental') ? <img src={resolveVehicleImage(vehicle, 'moto-rental')} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                      <span className="fleet-vehicle-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, 'moto-rental')}</span>
                    </span>
                    <div className="fleet-vehicle-specs">
                      <div className="asset-metric-grid fleet-order-metric-grid moto-order-metric-grid">
                        <AssetMetric
                          icon="/home/ui/hud/level-icon.webp"
                          label="Seviye"
                          value={`${fmt(modelLevelRequired || 1)} Seviye`}
                          status={lockedByLevel ? 'fail' : 'ok'}
                          statusHint={lockedByLevel ? `Gereken seviye: ${fmt(modelLevelRequired || 1)}` : 'Yeterli'}
                        />
                        {displayCostRows.map((row) => (
                          <AssetMetric
                            key={`${vehicle.id}-moto-${row.label}`}
                            icon={row.icon}
                            label={row.label}
                            value={row.value}
                            status={row.enough ? 'ok' : 'fail'}
                            statusHint={row.statusHint}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="fleet-order-summary moto-order-summary">
                    <div className="fleet-order-summary-item moto-order-summary-item is-income">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" loading="lazy" />
                        Saatlik Gelir
                      </span>
                      <span className="fleet-order-summary-value">+ {fmt(vehicle.rentPerHour || 0)}</span>
                    </div>
                    <div className="fleet-order-summary-item moto-order-summary-item is-fuel">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" loading="lazy" />
                        Benzin Gideri
                      </span>
                      <span className="fleet-order-summary-value">- {fmt(hourlyFuelNeed)} Petrol</span>
                    </div>
                    <div className="fleet-order-summary-item moto-order-summary-item is-xp">
                      <span className="fleet-order-summary-label">
                        <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" loading="lazy" />
                        XP Kazancı
                      </span>
                      <span className="fleet-order-summary-value">+ {fmt(vehicle.xp || 0)}</span>
                    </div>
                    <div className="fleet-order-summary-item moto-order-summary-item is-lifetime">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" loading="lazy" />
                        Toplam Ömür
                      </span>
                      <span className="fleet-order-summary-value">{VEHICLE_LIFETIME_MONTHS_TOTAL} Ay</span>
                    </div>
                  </div>
                  <button
                    className={`btn fleet-order-action ${blockedByMaterials ? 'btn-danger' : 'btn-success'} moto-order-action${selectedOrderRemainingMs > 0 ? ' is-cooldown' : ' is-ready'}`}
                    onClick={() => produceBizVehicle(selectedBusiness.id, vehicle.id)}
                    disabled={
                      Boolean(busy) ||
                      !selectedCanOrderNow ||
                      lockedByLevel ||
                      !hasEnoughMaterials
                    }
                  >
                    {busy === `prodbiz:${selectedBusiness.id}:${vehicle.id}`
                      ? 'Üretiliyor...'
                      : selectedOrderRemainingMs > 0
                        ? `Kalan: ${selectedOrderCountdown}`
                        : lockedByLevel
                          ? `Seviye ${fmt(modelLevelRequired)}`
                          : !hasEnoughMaterials
                            ? 'Malzeme Yetersiz'
                            : 'Sipariş Ver'}
                  </button>
                </article>
              )
            })}
          </div>
        </article>
      ) : null}

      {businessScene === 'gallery' && ['auto-rental', 'property-rental'].includes(String(selectedBusiness?.templateId || '')) ? (
        <article className="card fleet-detail-card fleet-fullscreen-card fleet-order-screen auto-order-screen">
          <div className="fleet-subheader">
            <div className="fleet-subheader-copy">
              <p className="fleet-subheader-owner">{companyLegalLabel}</p>
              <h3 className="fleet-subheader-title">{selectedBusinessGalleryTitle}</h3>
            </div>
            <div className="fleet-subheader-actions">
              <button className="btn btn-danger" onClick={() => setBusinessScene('detail')}>Geri</button>
            </div>
          </div>
          <div className="fleet-gallery-note fleet-order-gallery-note auto-gallery-note">
            <p>{selectedHasCapacityForOrder ? 'Siparişe hazır.' : 'Kapasite dolu. Yeni sipariş için önce yer aç.'}</p>
            <p className="fleet-live-countdown">Canlı sipariş geri sayımı: {selectedOrderCountdown}</p>
          </div>
          <div className="fleet-vehicle-list fleet-order-list auto-order-list">
            {selectedBuildRows.map((vehicle, vehicleIndex) => {
              const costRows = fleetOrderCostRows(vehicle, walletNow, inventoryById)
              const displayCostRows = toDisplayOrderCostRows(costRows, { requiredOnly: true })
              const orderFuelCost = Math.max(0, Math.trunc(num(
                selectedBusinessFuelMeta.id === 'energy' ? (vehicle?.energy || 0) : (vehicle?.fuel || 0),
              )))
              const fuelInInventory = Math.max(0, Math.trunc(num(inventoryById?.[selectedBusinessFuelMeta.id] || 0)))
              const hasEnoughFuelForOrder = fuelInInventory >= orderFuelCost
              const hasEnoughMaterials = costRows.every((entry) => entry.enough) && hasEnoughFuelForOrder
              const modelLevelRequired = num(vehicle.requiredLevel || 1)
              const lockedByLevel = modelLevelRequired > selectedUnlockedModelLevel
              const blockedByMaterials = !hasEnoughMaterials && !lockedByLevel && selectedCanOrderNow
              const modelOrderLevel = Math.max(1, vehicleIndex + 1)
              const fuelLevel = Math.max(1, Math.trunc(num(modelLevelRequired || modelOrderLevel)))
                    const hourlyFuelNeed = fleetFuelUnitsByModelLevel(
                      fuelLevel,
                      selectedBusiness?.templateId || 'auto-rental',
                      { weeklyEvents: weeklyEventsRuntimeState },
                    )
              return (
                <article key={`${selectedBusiness.id}-auto-build-${vehicle.id}`} className="fleet-vehicle-row fleet-order-card auto-order-card">
                  <div className="fleet-vehicle-head">
                    <strong>{vehicle.name}</strong>
                  </div>
                  <div className="fleet-vehicle-body">
                    <span className="fleet-vehicle-media" data-broken={resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? '0' : '1'}>
                      {resolveVehicleImage(vehicle, selectedBusiness?.templateId) ? <img src={resolveVehicleImage(vehicle, selectedBusiness?.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                      <span className="fleet-vehicle-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, selectedBusiness?.templateId)}</span>
                    </span>
                    <div className="fleet-vehicle-specs">
                      <div className="asset-metric-grid fleet-order-metric-grid auto-order-metric-grid">
                        <AssetMetric
                          icon="/home/ui/hud/level-icon.webp"
                          label="Seviye"
                          value={`${fmt(modelLevelRequired || 1)} Seviye`}
                          status={lockedByLevel ? 'fail' : 'ok'}
                          statusHint={lockedByLevel ? `Gereken seviye: ${fmt(modelLevelRequired || 1)}` : 'Yeterli'}
                        />
                        {displayCostRows.map((row) => (
                          <AssetMetric
                            key={`${vehicle.id}-auto-${row.label}`}
                            icon={row.icon}
                            label={row.label}
                            value={row.value}
                            status={row.enough ? 'ok' : 'fail'}
                            statusHint={row.statusHint}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="fleet-order-summary auto-order-summary">
                    <div className="fleet-order-summary-item auto-order-summary-item is-income">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" loading="lazy" />
                        Saatlik Gelir
                      </span>
                      <span className="fleet-order-summary-value">+ {fmt(vehicle.rentPerHour || 0)}</span>
                    </div>
                    <div className="fleet-order-summary-item auto-order-summary-item is-fuel">
                      <span className="fleet-order-summary-label">
                        <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" loading="lazy" />
                        {selectedBusinessFuelMeta.expenseLabel}
                      </span>
                      <span className="fleet-order-summary-value">- {fmt(hourlyFuelNeed)} {selectedBusinessFuelMeta.label}</span>
                    </div>
                    <div className="fleet-order-summary-item auto-order-summary-item is-xp">
                      <span className="fleet-order-summary-label">
                        <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" loading="lazy" />
                        XP Kazancı
                      </span>
                      <span className="fleet-order-summary-value">+ {fmt(vehicle.xp || 0)}</span>
                    </div>
                    <div className="fleet-order-summary-item auto-order-summary-item is-lifetime">
                      <span className="fleet-order-summary-label">
                        <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" loading="lazy" />
                        Toplam Ömür
                      </span>
                      <span className="fleet-order-summary-value">{VEHICLE_LIFETIME_MONTHS_TOTAL} Ay</span>
                    </div>
                  </div>
                  <button
                    className={`btn fleet-order-action ${blockedByMaterials ? 'btn-danger' : 'btn-success'} auto-order-action${selectedOrderRemainingMs > 0 ? ' is-cooldown' : ' is-ready'}`}
                    onClick={() => produceBizVehicle(selectedBusiness.id, vehicle.id)}
                    disabled={
                      Boolean(busy) ||
                      !selectedCanOrderNow ||
                      lockedByLevel ||
                      !hasEnoughMaterials
                    }
                  >
                    {busy === `prodbiz:${selectedBusiness.id}:${vehicle.id}`
                      ? 'Üretiliyor...'
                      : selectedOrderRemainingMs > 0
                        ? `Kalan: ${selectedOrderCountdown}`
                        : lockedByLevel
                          ? `Seviye ${fmt(modelLevelRequired)}`
                          : !hasEnoughMaterials
                            ? 'Malzeme Yetersiz'
                            : 'Sipariş Ver'}
                  </button>
                </article>
              )
            })}
          </div>
        </article>
      ) : null}

      {businessScene === 'market' && selectedBusiness ? (
        <article className="card fleet-detail-card fleet-fullscreen-card">
          <div className="fleet-subheader">
            <div className="fleet-subheader-copy">
              <p className="fleet-subheader-owner">{companyLegalLabel}</p>
              <h3 className="fleet-subheader-title">{selectedBusinessMarketTitle}</h3>
            </div>
            <div className="fleet-subheader-actions">
              <button className="btn btn-danger" onClick={() => setBusinessScene('detail')}>Geri</button>
            </div>
          </div>
          <div className="fleet-detail-hero fleet-market-hero">
            <span className="fleet-hero-media" data-broken={selectedBusiness.heroImage ? '0' : '1'}>
              {selectedBusiness.heroImage ? <img src={selectedBusiness.heroImage} alt={selectedBusiness.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
              <span className="fleet-hero-fallback">{selectedBusinessMeta?.fallback || 'OTO'}</span>
            </span>
            <div className="fleet-detail-main">
              <p>Aktif ilan sayısı</p>
              <strong>{fmt(selectedMarketPublicRows.length)}</strong>
            </div>
          </div>
          <button className="btn btn-primary full fleet-filter-launch" onClick={() => setBusinessModal('filter')}>
            İlan Filtrele
          </button>
          <div className="fleet-market-list">
                {selectedMarketPublicRows.length ? (
                  selectedMarketPublicRows.map((vehicle, index) => {
                    const requiredLevel = Math.max(1, Math.trunc(num(vehicle.marketLevel || vehicle.requiredLevel || 1)))
                    const lockedByLevel = requiredLevel > selectedUnlockedModelLevel
                        const hourlyFuelNeed = fleetFuelUnitsByModelLevel(
                          requiredLevel,
                          vehicle.templateId || selectedBusiness?.templateId || 'moto-rental',
                          { weeklyEvents: weeklyEventsRuntimeState },
                        )
                    return (
                <article
                  key={`${selectedBusiness.id}-market-${vehicle.id}-${index}`}
                  className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMarketListingDetail(vehicle)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    openMarketListingDetail(vehicle)
                  }}
                >
                  <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(vehicle, vehicle.templateId) ? '0' : '1'}>
                    {resolveVehicleImage(vehicle, vehicle.templateId) ? <img src={resolveVehicleImage(vehicle, vehicle.templateId)} alt={vehicle.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                    <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, vehicle.templateId)}</span>
                  </span>
                  <div className="fleet-market-copy">
                    <strong>{vehicle.name}</strong>
                    <div className="fleet-market-meta-line">
                      <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                    </div>
                  </div>
                  <div className="fleet-market-price">
                    <span>Satış Fiyatı</span>
                    <strong>
                      <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                      {fmt(vehicle.marketPrice)}
                    </strong>
                  </div>
                  <div className="fleet-market-footer">
                    <div className="fleet-compact-metrics fleet-market-metrics">
                      <span className="fleet-compact-metric">
                        <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                        Gelir +{fmt(vehicle.marketIncome)}
                      </span>
                      <span className="fleet-compact-metric">
                        <img src={selectedBusinessFuelMeta.icon} alt="" aria-hidden="true" />
                        {selectedBusinessFuelMeta.expenseLabel} -{fmt(hourlyFuelNeed)}
                      </span>
                      <span className="fleet-compact-metric">
                        <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                        XP +{fmt(vehicle.xp)}
                      </span>
                    </div>
                    {lockedByLevel ? (
                      <small className="fleet-market-lock">
                        Kilitli: Gereken seviye {fmt(requiredLevel)} | Açılan seviye {fmt(selectedUnlockedModelLevel)}
                      </small>
                    ) : (
                      <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                    )}
                  </div>
                </article>
                )
              })
            ) : (
              <p className="empty">Bu işletmeye ait satın alınabilir ikinci el ilanı bulunmuyor.</p>
            )}
          </div>
        </article>
      ) : null}

      {businessScene === 'logistics' ? (
        <article className={`card fleet-detail-card fleet-fullscreen-card${logisticsViewIsGallery ? ' fleet-order-screen truck-order-screen' : ''}`}>
          <div className="fleet-subheader">
            <div className="fleet-subheader-copy">
              <p className="fleet-subheader-owner">{companyLegalLabel}</p>
              <h3 className="fleet-subheader-title">{logisticsScreenSectionTitle}</h3>
            </div>
            <div className="fleet-subheader-actions">
              <button className="btn btn-accent" onClick={openFleetHelp}>Bilgi</button>
              <button
                className="btn btn-danger"
                onClick={logisticsViewIsDetail ? openBusinessHub : openLogisticsDetail}
              >
                Geri
              </button>
            </div>
          </div>
          {logisticsViewIsDetail ? (
            <div className="fleet-detail-hero">
              <span className="fleet-hero-media" data-broken="0">
                <img
                  src="/home/icons/businesses/lojistik-kiralama.webp"
                  alt="Tır Kiralama"
                  loading="lazy"
                  onError={(event) => {
                    const holder = event.currentTarget.parentElement
                    if (holder) holder.setAttribute('data-broken', '1')
                  }}
                />
                <span className="fleet-hero-fallback">TIR</span>
              </span>
              <div className="fleet-detail-main">
                <div className="fleet-detail-kpi">
                  <p className="fleet-detail-kpi-label">Tır Sayısı</p>
                  <strong className="fleet-detail-kpi-value">
                    {fmt(logistics?.logisticsFleet?.summary?.truckCount || 0)} / {fmt(logistics?.logisticsFleet?.summary?.truckSlotCapacity || 0)}
                  </strong>
                  <p className="fleet-detail-kpi-label fleet-detail-kpi-capacity">
                    <img src="/home/icons/depot/capacity.png" alt="" className="fleet-detail-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                    Toplam Kapasite: <strong>{fmt(logisticsTotalCapacityNow)}</strong>
                  </p>
                </div>
                <div className="fleet-company-actions fleet-company-actions-inline">
                  <button className="btn btn-accent full" onClick={openLogisticsMarket}>
                    İkinci El Tır Pazarı
                  </button>
                  <button className="btn btn-accent full" onClick={openLogisticsGallery}>
                    Sıfır Tır Siparişi
                  </button>
                </div>
                {logisticsTruckCount > 0 ? (
                  <button
                    className={`btn full fleet-collect-action ${logisticsCollectLocked ? 'btn-danger fleet-collect-done' : 'btn-success'}`.trim()}
                    onClick={openLogisticsCollectPreview}
                    disabled={Boolean(busy) || logisticsCollectLocked}
                  >
                    <span className="btn-icon">
                      <img
                        src={premiumBoostActive ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.png'}
                        alt=""
                        aria-hidden="true"
                      />
                    </span>
                    <span className="btn-label btn-label-stack">
                      <span>
                        {busy === 'collect-logistics'
                          ? 'Tahsilat hazırlanıyor...'
                          : logisticsCollectLocked
                            ? `Tahsilat Beklemede: ${logisticsCollectCountdown}`
                            : logisticsCollectNet > 0
                              ? premiumBoostActive
                                ? `2x Tahsilat Yap (+${fmt(logisticsCollectNet)})`
                                : `Tahsilat Yap (+${fmt(logisticsCollectNet)})`
                              : 'Tahsilat Yap'}
                      </span>
                      {!logisticsCollectLocked && busy !== 'collect-logistics' && logisticsCollectNet > 0 ? (
                        <small>{premiumBoostActive ? `${premiumMultiplier}x Premium tahsilat aktif` : 'Saatlik net tahsilat'}</small>
                      ) : null}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {logisticsViewIsGallery ? (
            <>
              <div className="fleet-gallery-note fleet-order-gallery-note truck-gallery-note">
                <p>
                  {(logistics?.logisticsFleet?.summary?.truckCount ?? 0) < (logistics?.logisticsFleet?.summary?.truckSlotCapacity ?? 1)
                    ? 'Siparişe hazır.'
                    : 'Kapasite dolu. Yeni sipariş için önce yer aç.'}
                </p>
                <p className="fleet-live-countdown">Canlı sipariş geri sayımı: {logisticsOrderCountdown}</p>
                <p className="fleet-gallery-note-hint">Tır modelleri düşük maliyetten yüksek maliyete sıralanır.</p>
              </div>
              <div className="fleet-vehicle-list fleet-order-list logistics-truck-list">
                {logisticsTruckCatalog.map((truck) => {
                  const costRows = logisticsOrderCostRows(truck, walletNow, inventoryById)
                  const displayCostRows = toDisplayOrderCostRows(costRows, { requiredOnly: true })
                  const orderFuelCost = Math.max(0, Math.trunc(num(truck?.fuel || 0)))
                  const oilInInventory = Math.max(0, Math.trunc(num(inventoryById?.oil || 0)))
                  const hasEnoughFuelForOrder = oilInInventory >= orderFuelCost
                  const hasEnoughMaterials = costRows.every((entry) => entry.enough) && hasEnoughFuelForOrder
                  const truckLevelRequired = Math.max(1, Math.trunc(num(truck.levelRequired || 1)))
                  const truckLockedByLevel = truckLevelRequired > logisticsUnlockedModelLevel
                  const blockedByMaterials = !hasEnoughMaterials && canOrderTruckNow && !truckLockedByLevel
                    const hourlyFuelNeed = fleetFuelUnitsByModelLevel(truckLevelRequired, 'logistics', {
                      weeklyEvents: weeklyEventsRuntimeState,
                    })
                  return (
                    <article key={truck.id} className="fleet-vehicle-row fleet-order-card truck-order-card">
                      <div className="fleet-vehicle-head">
                        <strong>{truck.name}</strong>
                      </div>
                      <div className="fleet-vehicle-body">
                        <span className="fleet-vehicle-media" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                          {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                          <span className="fleet-vehicle-fallback">{vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                        </span>
                        <div className="fleet-vehicle-specs-column">
                          <div className="fleet-order-truck-capacity-block">
                            <img src="/home/icons/depot/capacity.png" alt="" aria-hidden="true" className="fleet-order-capacity-icon" onError={(e) => { e.target.style.display = 'none' }} />
                            <span className="fleet-order-truck-capacity-value">Kapasite: <strong>{fmt(Math.max(0, Math.trunc(num(truck?.capacity || 0))))} adet</strong></span>
                          </div>
                          <div className="fleet-vehicle-specs">
                          <div className="asset-metric-grid fleet-order-metric-grid truck-order-metric-grid">
                            <AssetMetric
                              icon="/home/ui/hud/level-icon.webp"
                              label="Seviye"
                              value={`${fmt(truckLevelRequired)} Seviye`}
                              status={truckLockedByLevel ? 'fail' : 'ok'}
                              statusHint={truckLockedByLevel ? `Gereken seviye: ${fmt(truckLevelRequired)}` : 'Yeterli'}
                            />
                            <AssetMetric
                              icon="/home/icons/depot/capacity.png"
                              label="Kapasite"
                              value={`${fmt(Math.max(0, Math.trunc(num(truck?.capacity || 0))))} adet`}
                              status="ok"
                              statusHint="Yük kapasitesi"
                            />
                            {displayCostRows.map((row) => (
                              <AssetMetric
                                key={`${truck.id}-truck-${row.label}`}
                                icon={row.icon}
                                label={row.label}
                                value={row.value}
                                status={row.enough ? 'ok' : 'fail'}
                                statusHint={row.statusHint}
                              />
                            ))}
                          </div>
                        </div>
                        </div>
                      </div>
                      <div className="fleet-order-summary truck-order-summary">
                        <div className="fleet-order-summary-item truck-order-summary-item is-income">
                          <span className="fleet-order-summary-label">
                            <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" loading="lazy" />
                            Saatlik Gelir
                          </span>
                          <span className="fleet-order-summary-value">+ {fmt(truck.incomePerRun || 0)}</span>
                        </div>
                        <div className="fleet-order-summary-item truck-order-summary-item is-fuel">
                          <span className="fleet-order-summary-label">
                            <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" loading="lazy" />
                            Benzin Gideri
                          </span>
                          <span className="fleet-order-summary-value">- {fmt(hourlyFuelNeed)} Petrol</span>
                        </div>
                        <div className="fleet-order-summary-item truck-order-summary-item is-xp">
                          <span className="fleet-order-summary-label">
                            <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" loading="lazy" />
                            XP Kazancı
                          </span>
                          <span className="fleet-order-summary-value">+ {fmt(truck.xpPerRun || 0)}</span>
                        </div>
                        <div className="fleet-order-summary-item truck-order-summary-item is-lifetime">
                          <span className="fleet-order-summary-label">
                            <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" loading="lazy" />
                            Toplam Ömür
                          </span>
                          <span className="fleet-order-summary-value">{VEHICLE_LIFETIME_MONTHS_TOTAL} Ay</span>
                        </div>
                      </div>
                      <button
                        className={`btn fleet-order-action ${blockedByMaterials ? 'btn-danger' : 'btn-accent'} truck-order-action${canOrderTruckNow ? ' is-ready' : ' is-cooldown'}`}
                        onClick={() => buyTruckAction(truck.id)}
                        disabled={Boolean(busy) || !canOrderTruckNow || truckLockedByLevel || !hasEnoughMaterials}
                      >
                        {busy === `buy-truck:${truck.id}`
                          ? 'Satın alınıyor...'
                          : !canOrderTruckNow
                            ? `Kalan: ${logisticsOrderCountdown}`
                            : truckLockedByLevel
                              ? `Seviye ${fmt(truckLevelRequired)}`
                            : !hasEnoughMaterials
                              ? 'Malzeme Yetersiz'
                              : 'Tırı Satın Al'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </>
          ) : null}

          {logisticsViewIsDetail ? (
            <>
              <div className="tab-strip two fleet-tier-strip">
                <button className={logisticsDetailTab === 'garage' ? 'on' : ''} onClick={() => setLogisticsDetailTab('garage')}>
                  Tırlarım
                </button>
                <button className={logisticsDetailTab === 'market' ? 'on' : ''} onClick={() => setLogisticsDetailTab('market')}>
                  Satışlarım
                </button>
              </div>
              {logisticsDetailTab === 'garage' ? (
                <>
                  <h4>Tırlarım</h4>
                  <div className="fleet-vehicle-list logistics-truck-list">
                    {logisticsGarageTrucks.length ? (
                      logisticsGarageTrucks.map((truck) => {
                        const truckLevelRequired = Math.max(
                          1,
                          Math.trunc(num(truck.levelRequired || truck.requiredLevel || 1)),
                        )
                        const activeListing =
                          logisticsMyListings.find((entry) =>
                            String(entry?.id || '').trim() === String(truck?.listingId || '').trim(),
                          ) ||
                          logisticsMyListings.find((entry) =>
                            String(entry?.vehicleId || entry?.id || '').trim() === String(truck?.id || '').trim(),
                          ) ||
                          truck
                        const lifetime = resolveVehicleLifetime(truck, liveNowMs)
                        return (
                        <article
                          key={`${truck.isListed ? 'listed' : 'owned'}-${truck.id}-${truck.listingId || ''}`}
                          className="fleet-compact-row fleet-compact-listable"
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (truck.isListed) {
                              openActiveListingModal(activeListing, 'logistics')
                              return
                            }
                            openTruckListingModal(truck)
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            if (truck.isListed) {
                              openActiveListingModal(activeListing, 'logistics')
                              return
                            }
                            openTruckListingModal(truck)
                          }}
                        >
                          <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                            {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                            <span className="fleet-active-fallback">{vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                          </span>
                          <div className="fleet-compact-meta">
                            <strong>{truck.name}</strong>
                            <p className="fleet-compact-capacity-line">
                              <img src="/home/icons/depot/capacity.png" alt="" className="fleet-compact-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                              Kapasite {fmt(truck.capacity)}
                              {' | '}
                              <span className="level-text">Seviye {fmt(truckLevelRequired)}</span>
                            </p>
                            <div className="fleet-compact-metrics">
                              <span className="fleet-compact-metric">
                                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                                Saatlik Gelir {fmt(truck.incomePerRun || truck.rentPerHour || 0)}
                              </span>
                              <span className="fleet-compact-metric">
                                <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                                Benzin Gideri - {fmt(fleetFuelUnitsByModelLevel(
                                  truckLevelRequired,
                                  'logistics',
                                  { weeklyEvents: weeklyEventsRuntimeState },
                                ))}
                              </span>
                              <span className="fleet-compact-metric">
                                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                                +{fmt(truck.xpPerRun || truck.xp || 0)} XP
                              </span>
                              <span className={`fleet-compact-metric is-lifetime${lifetime.expired ? ' is-expired' : ''}`}>
                                <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                                Ömür {formatLifetimeWithTotal(lifetime)}
                              </span>
                            </div>
                            <small className="fleet-listing-hint" aria-live="polite">
                              {truck.isListed ? (
                                <span className="fleet-listing-hint-state is-listed">İlanda: satıştan vazgeçmek için karta dokun.</span>
                              ) : busy === `listlog:${truck.id}` ? (
                                <span className="fleet-listing-hint-state is-busy">İlan işlemi hazırlanıyor...</span>
                              ) : (
                                <span className="fleet-listing-hint-actions">
                                  <span className="fleet-listing-hint-chip is-sale">İlana Ekle</span>
                                  <span className="fleet-listing-hint-chip is-scrap">Parçala</span>
                                  <span className="fleet-listing-hint-tip">Karta dokun</span>
                                </span>
                              )}
                            </small>
                          </div>
                        </article>
                        )
                      })
                    ) : (
                      <p className="empty">Henüz satın alınmış veya ilana konulmuş tır bulunmuyor.</p>
                    )}
                  </div>
                </>
              ) : null}
              {logisticsDetailTab === 'market' ? (
                <>
                  <h4>Satışlarım</h4>
                <p className="fleet-market-inline-note">
                  Tırlarım sekmesinde tır kartına dokunarak ilana ekleyebilir veya parçalayabilirsin. Bu alanda sadece ilan iptali yapabilirsin.
                </p>
                <p className="fleet-market-inline-note">
                  Aktif satış ilanı: {fmt(logisticsMyListings.length)} | Satılan ilan: {fmt(logisticsSoldListingRows.length)}
                </p>
                <div className="fleet-owned-list">
                    {logisticsMyListings.length ? (
                      logisticsMyListings.map((truck) => {
                        const requiredLevel = Math.max(1, Math.trunc(num(truck.marketLevel || truck.requiredLevel || 1)))
                        const hourlyFuelNeed = fleetFuelUnitsByModelLevel(requiredLevel, 'logistics', {
                          weeklyEvents: weeklyEventsRuntimeState,
                        })
                        return (
                        <article
                          key={`my-log-listing-${truck.id}`}
                          className="fleet-owned-row fleet-owned-row-listing fleet-owned-row-modal"
                          role="button"
                          tabIndex={0}
                          onClick={() => openActiveListingModal(truck, 'logistics')}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            openActiveListingModal(truck, 'logistics')
                          }}
                        >
                          <span className="fleet-owned-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                            {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                            <span className="fleet-active-fallback">{truck.emoji || vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                          </span>
                          <div className="fleet-owned-main">
                            <div className="fleet-owned-mainline">
                              <strong>{truck.name}</strong>
                              <span className="fleet-owned-price">{fmt(truck.price)}</span>
                            </div>
                            <p className="fleet-owned-subline">
                              <img src="/home/icons/depot/capacity.png" alt="" className="fleet-owned-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                              <span className="level-text">{fmt(requiredLevel)}. Seviye</span>
                              {' | '}
                              Kapasite {fmt(truck.capacity ?? 0)}
                              {' | '}
                              Aktif ilan
                            </p>
                            <div className="fleet-compact-metrics fleet-owned-metrics">
                              <span className="fleet-compact-metric">
                                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                                Gelir +{fmt(truck.rentPerHour)}
                              </span>
                              <span className="fleet-compact-metric">
                                <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                                Benzin Gideri -{fmt(hourlyFuelNeed)}
                              </span>
                              <span className="fleet-compact-metric">
                                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                                XP +{fmt(truck.xp || 0)}
                              </span>
                            </div>
                            <small className="fleet-owned-expand-hint">Satışa bakmak için dokun.</small>
                          </div>
                        </article>
                        )
                      })
                    ) : (
                      <p className="empty">Lojistik için aktif satış ilanın bulunmuyor.</p>
                    )}
                    <div className="fleet-sold-list">
                      <h5>Satılan İlanlar</h5>
                      {logisticsSoldListingRows.length ? (
                        logisticsSoldListingRows.map((entry) => (
                          <article key={`sold-log-${entry.id}`} className="fleet-sold-row">
                            <div className="fleet-sold-copy">
                              <strong>{String(entry?.detail || 'İlan satışı tamamlandı.').trim()}</strong>
                              <small>{formatDateTime(entry?.createdAt || '')}</small>
                            </div>
                            <strong className="fleet-sold-amount">+{fmt(entry?.amount || 0)}</strong>
                          </article>
                        ))
                      ) : (
                        <p className="empty">Henüz satılan ilan kaydı bulunmuyor.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {logisticsViewIsMarket ? (
            <>
              <h4>İkinci El Tır Pazarı</h4>
              <button className="btn btn-primary full fleet-filter-launch" onClick={() => setBusinessModal('filter')}>
                İlan Filtrele
              </button>
              <div className="fleet-market-list">
                {logisticsPublicListings.length ? (
                  logisticsPublicListings.map((truck, index) => {
                    const requiredLevel = Math.max(1, Math.trunc(num(truck.marketLevel || truck.requiredLevel || 1)))
                    const lockedByLevel = requiredLevel > playerLevelNow
                    const hourlyFuelNeed = fleetFuelUnitsByModelLevel(requiredLevel, 'logistics', {
                      weeklyEvents: weeklyEventsRuntimeState,
                    })
                    return (
                    <article
                      key={`logistics-market-${truck.id}-${index}`}
                      className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openMarketListingDetail(truck)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        openMarketListingDetail(truck)
                      }}
                    >
                      <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                        {resolveVehicleImage(truck, 'logistics') ? <img src={resolveVehicleImage(truck, 'logistics')} alt={truck.name} loading="lazy" onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')} /> : null}
                        <span className="fleet-active-fallback">{truck.emoji || vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                      </span>
                      <div className="fleet-market-copy">
                        <strong>{truck.name}</strong>
                        <div className="fleet-market-meta-line">
                          <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                        </div>
                        <small className="fleet-market-truck-meta">
                          <img src="/home/icons/depot/capacity.png" alt="" className="fleet-market-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                          Kapasite: {fmt(truck.capacity)}
                        </small>
                      </div>
                      <div className="fleet-market-price">
                        <span>Satış Fiyatı</span>
                        <strong>
                          <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                          {fmt(truck.marketPrice)}
                        </strong>
                      </div>
                      <div className="fleet-market-footer">
                        <div className="fleet-compact-metrics fleet-market-metrics">
                          <span className="fleet-compact-metric">
                            <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                            Gelir +{fmt(truck.marketIncome)}
                          </span>
                          <span className="fleet-compact-metric">
                            <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                            Benzin Gideri -{fmt(hourlyFuelNeed)}
                          </span>
                          <span className="fleet-compact-metric">
                            <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                            XP +{fmt(truck.xp || 0)}
                          </span>
                        </div>
                        {lockedByLevel ? (
                          <small className="fleet-market-lock">
                            Kilitli: Gereken seviye {fmt(requiredLevel)} | Oyuncu seviyesi {fmt(playerLevelNow)}
                          </small>
                        ) : (
                          <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                        )}
                      </div>
                    </article>
                    )
                  })
                ) : (
                  <p className="empty">Satın alınabilir ikinci el tır ilanı bulunmuyor.</p>
                )}
              </div>
            </>
          ) : null}

          <p className="muted">
            Tır kiralama sistemi araba/motor ile aynı saatlik gelir modelinde çalışır. Filo büyüdükçe maliyet, kapasite ve gelir artar.
          </p>
        </article>
      ) : null}

      {marketDetailDraft && businessModal === 'market-detail' ? (
        <section className="warehouse-overlay" onClick={closeMarketListingDetail}>
          <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-detail-modal" onClick={(event) => event.stopPropagation()}>
            <h3>İlan Detayları</h3>
            <p className="fleet-listing-modal-subtitle">
              Satın almadan önce ilan bilgilerini kontrol et.
            </p>
            <article className="fleet-listing-preview fleet-market-detail-preview">
              <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(marketDetailDraft, marketDetailTemplateId) ? '0' : '1'}>
                {resolveVehicleImage(marketDetailDraft, marketDetailTemplateId) ? (
                  <img
                    src={resolveVehicleImage(marketDetailDraft, marketDetailTemplateId)}
                    alt={marketDetailDraft.name}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-active-fallback">
                  {marketDetailDraft.emoji || vehicleEmojiByTier(marketDetailDraft.tier, marketDetailTemplateId)}
                </span>
              </span>
              <div className="fleet-listing-copy">
                <strong>{marketDetailDraft.name}</strong>
                <p className="fleet-market-detail-seller">
                  Satıcı: <span>{marketDetailDraft.sellerName || 'Oyuncu'}</span>
                </p>
                <div className="fleet-listing-stat-grid">
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                      Gereken Seviye
                    </span>
                    <strong>{fmt(marketDetailRequiredLevel)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                      {marketDetailLevelCurrentLabel}
                    </span>
                    <strong>{fmt(marketDetailLevelCurrent)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                      Saatlik Gelir
                    </span>
                    <strong>+{fmt(marketDetailDraft.marketIncome || 0)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                      XP Kazancı
                    </span>
                    <strong>+{fmt(marketDetailDraft.xp || 0)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item is-wide">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                      Kalan Ömür
                    </span>
                    <strong>{formatLifetimeWithTotal(marketDetailLiveLifetime)}</strong>
                  </p>
                </div>
              </div>
            </article>
            <article className="fleet-note-panel fleet-market-detail-price">
              <p className="fleet-listing-range-line">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  Satış Fiyatı
                </span>
                <strong>{fmt(marketDetailPrice)}</strong>
              </p>
              <p className="fleet-listing-range-line">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                  Komisyon (%{fmt(Math.round(marketDetailCommissionRate * 100))})
                </span>
                <strong>- {fmt(marketDetailCommissionAmount)}</strong>
              </p>
              <p className="fleet-listing-range-line is-total">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  Satıcı Net Kazanç
                </span>
                <strong>{fmt(marketDetailSellerPayout)}</strong>
              </p>
              {!marketDetailHasBusinessAccess ? (
                <p className="fleet-market-detail-warning">
                  {marketDetailBusinessLabel} açık değil. Önce bu işletmeyi açmalısın.
                </p>
              ) : null}
              {!marketDetailCanBuyByLevel ? (
                <p className="fleet-market-detail-warning">
                  Seviye yetersiz. Gereken seviye: {fmt(marketDetailRequiredLevel)} | {marketDetailLevelCurrentLabel}: {fmt(marketDetailLevelCurrent)}
                </p>
              ) : null}
              {!marketDetailCanAfford ? (
                <p className="fleet-market-detail-warning">
                  Nakit yetersiz. Gerekli tutar: {fmt(marketDetailTotalCost)} | Kasandaki: {fmt(walletNow)}
                </p>
              ) : null}
            </article>
            <button
              className="btn btn-success full fleet-modal-cta-sale"
              onClick={() => void buyVehicleFromMarket(marketDetailDraft.id, marketDetailDraft)}
              disabled={Boolean(busy) || !marketDetailDraft}
            >
              {busy === `buy-listing:${marketDetailDraft.id}`
                ? 'Satın Alınıyor...'
                : marketDetailAssetMeta.buyAction}
            </button>
            <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={closeMarketListingDetail}>Kapat</button>
          </article>
        </section>
      ) : null}

      {marketPurchaseResult && businessModal === 'market-buy-success' ? (
        <section className="warehouse-overlay" onClick={closeMarketPurchaseResult}>
          <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-purchase-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fleet-market-purchase-hero">
              <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" loading="lazy" />
              <p>{marketAssetLabel(marketPurchaseResult.templateId).successText}</p>
              <strong>Tebrikler.</strong>
            </div>
            <article className="fleet-listing-preview fleet-market-purchase-preview">
              <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId) ? '0' : '1'}>
                {resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId) ? (
                  <img
                    src={resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId)}
                    alt={marketPurchaseResult.name}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-active-fallback">
                  {marketPurchaseResult.emoji || vehicleEmojiByTier(marketPurchaseResult.tier, marketPurchaseResult.templateId)}
                </span>
              </span>
              <div className="fleet-listing-copy">
                <strong>{marketPurchaseResult.name}</strong>
                <p className="fleet-listing-subline">
                  İlan fiyatı: {fmt(marketPurchaseResult.marketPrice || 0)}
                  {' | '}
                  Komisyon: {fmt(marketPurchaseResult.commissionAmount || 0)}
                  {' | '}
                  Satıcı Net: {fmt(marketPurchaseResult.sellerPayout || 0)}
                </p>
              </div>
            </article>
            <div className="fleet-market-purchase-actions">
              <button className="btn btn-danger" onClick={closeMarketPurchaseResult}>Önceki Sayfa</button>
              <button className="btn btn-accent" onClick={goToOwnedFleetFromPurchase}>
                {marketAssetLabel(marketPurchaseResult.templateId).ownedTabLabel}
              </button>
              <button className="btn btn-success" onClick={goToMyListingsFromPurchase}>Satışlarım</button>
            </div>
            <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={closeMarketPurchaseResult}>Kapat</button>
          </article>
        </section>
      ) : null}

      {listingDraft && ['vehicle-actions', 'list-sale', 'scrap-confirm'].includes(businessModal) ? (
        <section className="warehouse-overlay" onClick={closeListingModal}>
          <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-listing-modal-actions" onClick={(event) => event.stopPropagation()}>
            <h3>
              {listingDraftIsListed
                ? (listingDraft.templateId === 'moto-rental'
                  ? 'Motor Satış Detayı'
                  : listingDraft.templateId === 'property-rental'
                    ? 'Mülk Satış Detayı'
                  : listingDraft.kind === 'logistics'
                    ? 'Tır Satış Detayı'
                    : 'Araç Satış Detayı')
                : (listingDraft.templateId === 'moto-rental'
                  ? 'Motor Detayı'
                  : listingDraft.templateId === 'property-rental'
                    ? 'Mülk Detayı'
                  : listingDraft.kind === 'logistics'
                    ? 'Tır Detayı'
                    : 'Araç Detayı')}
            </h3>
            <p className="fleet-listing-modal-subtitle">
              {listingDraftIsListed
                ? 'Aktif satışı inceleyip satıştan vazgeçebilirsin.'
                : 'İlana ekleyebilir veya parçalayabilirsin.'}
            </p>
            <article className="fleet-listing-preview">
              <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(listingDraft, listingDraft.templateId) ? '0' : '1'}>
                {resolveVehicleImage(listingDraft, listingDraft.templateId) ? (
                  <img
                    src={resolveVehicleImage(listingDraft, listingDraft.templateId)}
                    alt={listingDraft.name}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-active-fallback">
                  {listingDraft.emoji || vehicleEmojiByTier('', listingDraft.templateId)}
                </span>
              </span>
              <div className="fleet-listing-copy">
                <strong>{listingDraft.name}</strong>
                <p className="fleet-listing-subline">
                  <span className="level-text">Seviye {fmt(listingDraft.level)}</span>
                  {' | '}
                  {listingDraftIsListed
                    ? `Satış Fiyatı ${fmt(listingDraft.listingPrice || listingDraft.price || 0)}`
                    : `+${fmt(listingDraft.xp || 0)} XP`}
                </p>
                <div className="fleet-listing-stat-grid">
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                      Gelir
                    </span>
                    <strong>{fmt(listingDraft.income)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                      XP Geliri
                    </span>
                    <strong>{fmt(listingDraft.xp || 0)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                      Seviye
                    </span>
                    <strong>{fmt(listingDraft.level)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/v2/market.png" alt="" aria-hidden="true" />
                      Piyasa Adedi
                    </span>
                    <strong>{fmt(listingDraft.marketCount || 0)}</strong>
                  </p>
                  {listingDraft.kind === 'logistics' ? (
                    <>
                      <p className="fleet-listing-stat-item">
                        <span className="fleet-listing-stat-label">
                          <img src="/home/icons/depot/capacity.png" alt="" aria-hidden="true" />
                          Kapasite
                        </span>
                        <strong>{fmt(listingDraft.capacity)}</strong>
                      </p>
                    </>
                  ) : null}
                  <p className="fleet-listing-stat-item is-wide">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                      Ömür
                    </span>
                    <strong>{formatLifetimeWithTotal(listingDraftLiveLifetime)}</strong>
                  </p>
                </div>
              </div>
            </article>
            {listingDraftIsListed ? (
              <article className="fleet-note-panel fleet-scrap-preview">
                <p className="fleet-scrap-title">
                  İlan tarihi: <strong>{formatDateTime(listingDraft?.listedAt || '')}</strong>
                </p>
                <p className="fleet-scrap-title">
                  <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                  Komisyon (%{VEHICLE_MARKET_COMMISSION_PERCENT}):
                  {' '}
                  <strong>-{fmt(listingDraft?.commissionAmount || 0)}</strong>
                  {' | '}
                  Satıcı Net:
                  {' '}
                  <strong>{fmt(listingDraft?.sellerPayout || 0)}</strong>
                </p>
              </article>
            ) : (
              <article className="fleet-note-panel fleet-scrap-preview">
                <p className="fleet-scrap-title">
                  %2 iade garantisi:
                  {' '}
                  <strong>+{fmt(listingDraft.scrapEngineKits || 0)} Motor</strong>
                  {' | '}
                  <strong>+{fmt(listingDraft.scrapSpareParts || 0)} Yedek Parça</strong>
                </p>
              </article>
            )}
            {listingDraftIsListed ? (
              <button
                className="btn btn-danger full fleet-modal-cta-sale"
                onClick={() => void cancelListingFromModal()}
                disabled={Boolean(busy) || !listingDraftSafeListingId}
              >
                {busy === listingDraftCancelBusyKey ? 'İptal Ediliyor...' : 'Satıştan Vazgeç'}
              </button>
            ) : (
              <div className="fleet-listing-action-grid">
                <button
                  className="btn btn-success full fleet-modal-cta-sale"
                  onClick={openListingPriceModal}
                  disabled={Boolean(busy)}
                >
                  İlana Ekle
                </button>
                <button
                  className="btn btn-warning full fleet-modal-cta-scrap"
                  onClick={openScrapConfirmModal}
                  disabled={Boolean(busy)}
                >
                  Parçala
                </button>
              </div>
            )}
            <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={closeListingModal}>Kapat</button>
          </article>
        </section>
      ) : null}

      {businessModal === 'list-sale' && listingDraft ? (
        <section className="warehouse-overlay fleet-sub-overlay" onClick={() => setBusinessModal('vehicle-actions')}>
          <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-listing-modal-sale fleet-sub-modal" onClick={(event) => event.stopPropagation()}>
            <h3>
              {listingDraft.templateId === 'moto-rental'
                ? 'Motoru Sat'
                : listingDraft.templateId === 'property-rental'
                  ? 'Mülkü Sat'
                : listingDraft.kind === 'logistics'
                  ? 'Tırı Sat'
                  : 'Aracı Sat'}
            </h3>
            <p className="fleet-listing-modal-subtitle">
              Satış tutarını gir ve onayla.
            </p>
            <article className="fleet-listing-preview">
              <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(listingDraft, listingDraft.templateId) ? '0' : '1'}>
                {resolveVehicleImage(listingDraft, listingDraft.templateId) ? (
                  <img
                    src={resolveVehicleImage(listingDraft, listingDraft.templateId)}
                    alt={listingDraft.name}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-active-fallback">
                  {listingDraft.emoji || vehicleEmojiByTier('', listingDraft.templateId)}
                </span>
              </span>
              <div className="fleet-listing-copy">
                <strong>{listingDraft.name}</strong>
                <p className="fleet-listing-subline">
                  <span className="level-text">Seviye {fmt(listingDraft.level)}</span>
                  {' | '}
                  Gelir {fmt(listingDraft.income)}
                  {' | '}
                  +{fmt(listingDraft.xp || 0)} XP
                </p>
                <div className="fleet-listing-stat-grid">
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                      Gelir
                    </span>
                    <strong>{fmt(listingDraft.income)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                      XP Geliri
                    </span>
                    <strong>{fmt(listingDraft.xp || 0)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                      Seviye
                    </span>
                    <strong>{fmt(listingDraft.level)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/v2/market.png" alt="" aria-hidden="true" />
                      Piyasa Adedi
                    </span>
                    <strong>{fmt(listingDraft.marketCount || 0)}</strong>
                  </p>
                  {listingDraft.kind === 'logistics' ? (
                    <>
                      <p className="fleet-listing-stat-item">
                        <span className="fleet-listing-stat-label">
                          <img src="/home/icons/depot/capacity.png" alt="" aria-hidden="true" />
                          Kapasite
                        </span>
                        <strong>{fmt(listingDraft.capacity)}</strong>
                      </p>
                    </>
                  ) : null}
                  <p className="fleet-listing-stat-item is-wide">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                      Ömür
                    </span>
                    <strong>{formatLifetimeWithTotal(listingDraftLiveLifetime)}</strong>
                  </p>
                </div>
              </div>
            </article>
            <article className="fleet-note-panel fleet-listing-ranges">
              <p className="fleet-listing-range-line">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  Minimum satış:
                </span>
                <strong>{fmt(listingDraft.minPrice)}</strong>
              </p>
              <p className="fleet-listing-range-line">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  Maksimum satış:
                </span>
                <strong>{fmt(listingDraft.maxPrice)}</strong>
              </p>
            </article>
            <label className="fleet-listing-target-field">
              <span>Satılacak kişi</span>
              <select
                className="fleet-listing-target-select"
                value={String(listingDraft?.visibility || 'public')}
                onChange={(event) => {
                  const nextVisibility = String(event.target.value || 'public').trim()
                  setListingDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          visibility: nextVisibility === 'custom' ? 'custom' : 'public',
                          recipientUserId:
                            nextVisibility === 'custom'
                              ? String(prev.recipientUserId || listingFriends?.[0]?.userId || '').trim()
                              : '',
                        }
                      : prev,
                  )
                }}
              >
                <option value="public">Herkes Alabilir</option>
                <option value="custom">Sadece Seçtiğim Arkadaş</option>
              </select>
              {String(listingDraft?.visibility || 'public').toLowerCase() === 'custom' ? (
                <select
                  className="fleet-listing-target-select"
                  value={String(listingDraft?.recipientUserId || '').trim()}
                  onChange={(event) => {
                    const nextUserId = String(event.target.value || '').trim()
                    setListingDraft((prev) => (prev ? { ...prev, recipientUserId: nextUserId } : prev))
                  }}
                  disabled={listingFriendsLoading}
                >
                  {listingFriendsLoading ? (
                    <option value="">Arkadaşlar yükleniyor...</option>
                  ) : (listingFriends || []).length ? (
                    (listingFriends || []).map((friend) => (
                      <option key={friend.userId} value={friend.userId}>
                        {friend.username || friend.userId} (Lv {friend.level || 1})
                      </option>
                    ))
                  ) : (
                    <option value="">Arkadaş bulunamadı</option>
                  )}
                </select>
              ) : null}
            </label>
            <label className="fleet-listing-price-field">
              <span>Satış fiyatı</span>
              <input
                className="qty-input"
                inputMode="numeric"
                value={String(listingDraft.price || '')}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 15)
                  setListingDraft((prev) => (prev ? { ...prev, price: digits } : prev))
                }}
                placeholder="Miktarı yazınız"
              />
            </label>
            <button
              className="btn btn-success full fleet-modal-cta-sale"
              onClick={() => void confirmListingModal()}
              disabled={
                Boolean(busy) ||
                (String(listingDraft?.visibility || 'public').trim().toLowerCase() === 'custom' &&
                  (!String(listingDraft?.recipientUserId || '').trim() || listingFriendsLoading))
              }
            >
              {busy === (listingDraft.kind === 'logistics'
                ? `listlog:${listingDraft.truckId}`
                : `listbiz:${listingDraft.businessId}:${listingDraft.vehicleId}`)
                ? 'İlana ekleniyor...'
                : 'Satışa Koy'}
            </button>
            <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={() => setBusinessModal('vehicle-actions')}>Kapat</button>
          </article>
        </section>
      ) : null}

      {businessModal === 'scrap-confirm' && listingDraft ? (
        <section className="warehouse-overlay fleet-sub-overlay" onClick={() => setBusinessModal('vehicle-actions')}>
          <article className="warehouse-modal fleet-modal fleet-listing-modal fleet-listing-modal-scrap fleet-sub-modal" onClick={(event) => event.stopPropagation()}>
            <h3>
              {listingDraft.templateId === 'moto-rental'
                ? 'Motoru Parçala'
                : listingDraft.templateId === 'property-rental'
                  ? 'Mülkü Parçala'
                : listingDraft.kind === 'logistics'
                  ? 'Tırı Parçala'
                  : 'Aracı Parçala'}
            </h3>
            <p className="fleet-listing-modal-subtitle">
              Bu işlem geri alınamaz. Onaylarsan araç kalıcı olarak parçalanır.
            </p>
            <article className="fleet-note-panel fleet-scrap-preview">
              <p className="fleet-scrap-title">
                %2 iade garantisi:
                {' '}
                <strong>+{fmt(listingDraft.scrapEngineKits || 0)} Motor</strong>
                {' | '}
                <strong>+{fmt(listingDraft.scrapSpareParts || 0)} Yedek Parça</strong>
              </p>
              <p className="fleet-scrap-title">
                Parçalanınca depoya anında eklenir.
              </p>
              <div className="fleet-scrap-grid">
                <p>
                  <img src="/home/icons/depot/spare-parts.webp" alt="" aria-hidden="true" />
                  Motor İadesi: <strong>{fmt(listingDraft.scrapEngineKits || 0)}</strong>
                  <small>Toplam maliyet: {fmt(listingDraft.engineKits || 0)}</small>
                </p>
                <p>
                  <img src="/home/icons/depot/yedekparca.webp" alt="" aria-hidden="true" />
                  Yedek Parça İadesi: <strong>{fmt(listingDraft.scrapSpareParts || 0)}</strong>
                  <small>Toplam maliyet: {fmt(listingDraft.spareParts || 0)}</small>
                </p>
              </div>
            </article>
            <button
              className="btn btn-warning full fleet-modal-cta-scrap"
              onClick={() => void confirmScrapFromListingModal()}
              disabled={Boolean(busy)}
            >
              {busy === (listingDraft.kind === 'logistics'
                ? `scraplog:${listingDraft.truckId}`
                : `scrapbiz:${listingDraft.businessId}:${listingDraft.vehicleId}`)
                ? 'Parçalanıyor...'
                : 'Parçala ve Depoya Ekle'}
            </button>
            <button className="btn btn-danger fleet-modal-close fleet-modal-cta-back" onClick={() => setBusinessModal('vehicle-actions')}>Kapat</button>
          </article>
        </section>
      ) : null}

      {businessModal === 'collect' ? (
        <section className="warehouse-overlay" onClick={() => {
          setBusinessModal('')
          setCollectTargetBusinessId('')
        }}>
          <article className="warehouse-modal fleet-modal fleet-accountant-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Muhasebeci</h3>
            <p>
              {collectModalMeta?.label || 'Kiralama işletmesi'} için saatlik tahsilat dökümü hazır.
            </p>
              <button
                className="btn btn-success full btn-collect-inline"
                onClick={() => void confirmCollectFromModal()}
                disabled={Boolean(busy) || !collectModalFuelEnough}
              >
                <span className="btn-icon">
                  <img
                    src={premiumBoostActive ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.png'}
                    alt=""
                    aria-hidden="true"
                  />
                </span>
                <span className="btn-label btn-label-stack">
                  <span>
                    {busy === `collect:${collectModalBusiness?.id}`
                      ? 'Kasaya aktarılıyor...'
                      : !collectModalFuelEnough
                        ? `${collectModalFuelMeta.label} Yetersiz`
                        : premiumBoostActive
                          ? `2x Tahsilat Yap (+${fmt(collectModalPreview.netCash)})`
                          : `Net Tahsilat Yap (+${fmt(collectModalPreview.netCash)})`}
                  </span>
                  {premiumBoostActive ? (
                    <small>{premiumMultiplier}x Premium uygulanıyor</small>
                  ) : null}
                </span>
              </button>
            <article className="fleet-bulk-summary fleet-accountant-summary">
              <p className="fleet-summary-line positive">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Normal Net Tahsilat: +{fmt(collectModalPreviewBase.netCash)}
              </p>
              {premiumBoostActive ? (
                <p className="fleet-summary-line net">
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  Premium ile 2x Net Tahsilat: +{fmt(collectModalPreview.netCash)}
                </p>
              ) : null}
              <p className="fleet-summary-line positive">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                + {fmt(collectModalPreview.xpGain)} XP
              </p>
              <hr />
              <p className="fleet-summary-line negative">
                <img src={collectModalFuelMeta.icon} alt="" aria-hidden="true" />
                - {fmt(collectModalPreview.fuelConsumed)} {collectModalPreview.fuelItemName}
              </p>
              <p className="fleet-summary-line negative">
                <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                Vergi - {fmt(collectModalPreview.taxAmount)} (%{COLLECTION_TAX_PERCENT})
              </p>
              <p className="fleet-net-row fleet-summary-line net">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Brüt Tahsilat: {fmt(collectModalPreview.grossAfterFuel)}
              </p>
              <small>
                Yakıt durumu: {fmt(collectModalPreview.fuelAvailable)} / {fmt(collectModalPreview.fuelNeeded)} {collectModalPreview.fuelItemName}
              </small>
            </article>
            <button
              className="btn btn-danger fleet-modal-close"
              onClick={() => {
                setBusinessModal('')
                setCollectTargetBusinessId('')
              }}
            >
              Kapat
            </button>
          </article>
        </section>
      ) : null}

      {businessModal === 'logistics-collect' ? (
        <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
          <article className="warehouse-modal fleet-modal fleet-accountant-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Muhasebeci</h3>
            <p>
              Tır kiralama için saatlik tahsilat dökümü hazır.
            </p>
            <button
              className="btn btn-success full btn-collect-inline"
              onClick={() => void confirmLogisticsCollectFromModal()}
              disabled={Boolean(busy) || !logisticsPreviewFuelEnough}
            >
              <span className="btn-icon">
                <img
                  src={premiumBoostActive ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.png'}
                  alt=""
                  aria-hidden="true"
                />
              </span>
              <span className="btn-label btn-label-stack">
                <span>
                  {busy === 'collect-logistics'
                    ? 'Kasaya aktarılıyor...'
                    : !logisticsPreviewFuelEnough
                      ? 'Petrol Yetersiz'
                      : premiumBoostActive
                        ? `2x Tahsilat Yap (+${fmt(logisticsPreviewActive.netCash || 0)})`
                        : `Net Tahsilat Yap (+${fmt(logisticsPreviewActive.netCash || 0)})`}
                </span>
                {premiumBoostActive ? (
                  <small>{premiumMultiplier}x Premium uygulanıyor</small>
                ) : null}
              </span>
            </button>
            <article className="fleet-bulk-summary fleet-accountant-summary">
              <p className="fleet-summary-line positive">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Normal Net Tahsilat: +{fmt(logisticsPreview.netCash || 0)}
              </p>
              {premiumBoostActive ? (
                <p className="fleet-summary-line net">
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  Premium ile 2x Net Tahsilat: +{fmt(logisticsPreviewActive.netCash || 0)}
                </p>
              ) : null}
              <p className="fleet-summary-line positive">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                + {fmt(logisticsPreviewActive.xpGain || 0)} XP
              </p>
              <hr />
              <p className="fleet-summary-line negative">
                <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                - {fmt(logisticsPreviewActive.fuelConsumed || 0)} {String(logisticsPreviewActive.fuelItemName || 'Petrol')}
              </p>
              <p className="fleet-summary-line negative">
                <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                Vergi - {fmt(logisticsPreviewActive.taxAmount || 0)} (%{COLLECTION_TAX_PERCENT})
              </p>
              <p className="fleet-net-row fleet-summary-line net">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Brüt Tahsilat: {fmt(logisticsPreviewActive.grossCash || 0)}
              </p>
              <small>
                Depodaki yakıt: {fmt(inventoryById[String(logisticsPreviewActive.fuelItemId || 'oil')] || 0)} {String(logisticsPreviewActive.fuelItemName || 'Petrol')}
              </small>
            </article>
            <button className="btn btn-danger fleet-modal-close" onClick={() => setBusinessModal('')}>Kapat</button>
          </article>
        </section>
      ) : null}

      {businessModal === 'fleet-help' ? (
        <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
          <article className="warehouse-modal fleet-modal fleet-bulk-modal" onClick={(event) => event.stopPropagation()}>
            <h3>İşletme Bilgisi</h3>
            <p><strong>{fleetHelpLabel}</strong> için kısa kullanım özeti:</p>
            <article className="fleet-note-panel">
              <p>1. {fleetHelpOrderLabel} bölümünden yeni {fleetHelpUnit} al.</p>
              <p>2. {fleetHelpSecondHandLabel} bölümünden uygun fiyatlı alım/satım yap.</p>
              <p>3. Tahsilat aralığı 60 dakikadır, süre dolunca toplu tahsilat butonuna bas.</p>
              <p>4. Yakıt azsa gelir düşer; depoda petrol/malzeme tut.</p>
              <p>5. Tahsilatta net gelir, vergi ve yakıt kesintisi muhasebeci ekranında görünür.</p>
            </article>
            <button className="btn btn-danger fleet-modal-close" onClick={() => setBusinessModal('')}>Kapat</button>
          </article>
        </section>
      ) : null}

      {businessModal === 'upgrade' ? (
        <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
          <article className="warehouse-modal fleet-modal fleet-upgrade-modal" onClick={(event) => event.stopPropagation()}>
            <h3>İşletmeyi Geliştir</h3>
            <p className="fleet-modal-subtitle">Şirket seviyeni artırarak yeni işletme alanlarının kilidini aç ve aktif işletme limitini büyüt.</p>
            {companyUpgrade ? (
              <>
                <div className="fleet-upgrade-box">
                  <div className="fleet-upgrade-head">
                    <span className="fleet-upgrade-eyebrow">Şirket Seviyesi</span>
                    <strong className="fleet-upgrade-level">{fmt(upgradeCurrentLevel)} / {fmt(upgradeMaxLevel)}</strong>
                    <p className="fleet-upgrade-target">
                      {companyUpgrade.maxReached
                        ? 'Maksimum seviyeye ulaştın.'
                        : `Sonraki hedef: ${fmt(upgradeNextLevel)}. seviye`}
                    </p>
                  </div>
                  <div className="fleet-upgrade-track">
                    <span style={{ width: `${upgradeProgressPercent}%` }} />
                  </div>
                  <div className="fleet-upgrade-metrics">
                    <article className="fleet-upgrade-metric">
                      <span>Mevcut Seviye</span>
                      <strong className="is-ok">{fmt(upgradeCurrentLevel)}</strong>
                    </article>
                    <article className="fleet-upgrade-metric">
                      <span>Sonraki Seviye</span>
                      <strong>{fmt(upgradeNextLevel)}</strong>
                    </article>
                    <article className="fleet-upgrade-metric">
                      <span>Geliştirme Maliyeti</span>
                      <strong className={upgradeMissingCashValue > 0 ? 'is-missing' : 'is-ok'}>
                        {companyUpgrade.maxReached ? 'Yok' : fmt(upgradeCostValue)}
                      </strong>
                    </article>
                  </div>
                  <div className="fleet-upgrade-remain">
                    <span
                      className={
                        companyUpgrade.maxReached || canUpgradeBusinessLevel || mustBuyNextUnlockFirst
                          ? 'is-ok'
                          : 'is-missing'
                      }
                    >
                      Durum: {upgradeStatusLabel}
                    </span>
                    <span className={upgradeMissingCashValue > 0 ? 'is-missing' : 'is-ok'}>
                      Kalan nakit: {fmt(upgradeMissingCashValue)}
                    </span>
                  </div>
                </div>
                <p className="fleet-upgrade-next-note">{nextCompanyUnlock
                  ? mustBuyNextUnlockFirst
                    ? `Önce İş Kur bölümünden ${nextCompanyUnlock.name} satın alınmalı.`
                    : `Sonraki açılacak alan: ${nextCompanyUnlock.name}.`
                  : 'Tüm işletme alanları satın alındı.'}
                </p>
              </>
            ) : (
              <>
                <p>İşletme seviyesi bilgisi yüklenemedi.</p>
                <p>Lütfen sayfayı yenileyip tekrar dene.</p>
              </>
            )}
            <div className="fleet-modal-actions">
              <button
                className="btn btn-success full"
                onClick={() => {
                  if (mustBuyNextUnlockFirst) {
                    setBusinessModal('setup')
                    return
                  }
                  if (upgradeAnchorBusinessId) upBiz(upgradeAnchorBusinessId)
                }}
                disabled={
                  Boolean(busy) ||
                  !companyUpgrade ||
                  companyUpgrade.maxReached ||
                  (upgradeMissingCashValue > 0 && !mustBuyNextUnlockFirst) ||
                  (!mustBuyNextUnlockFirst && !upgradeAnchorBusinessId)
                }
              >
                {mustBuyNextUnlockFirst
                  ? "Önce İş Kur'dan Satın Al"
                  : busy === `upbiz:${upgradeAnchorBusinessId}`
                    ? 'Yükseltiliyor...'
                    : companyUpgrade?.maxReached
                      ? 'Maksimum Seviye'
                      : upgradeMissingCashValue > 0
                        ? 'Nakit Yetersiz'
                        : `Seviyeyi Yükselt (${fmt(upgradeCostValue)})`}
              </button>
              <button className="btn btn-danger full" onClick={() => setBusinessModal('')}>Kapat</button>
            </div>
          </article>
        </section>
      ) : null}

      {businessModal === 'setup' ? (
        <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
          <article className="warehouse-modal fleet-modal fleet-setup-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fleet-subheader">
              <h3>İş Kur</h3>
              <p className="fleet-modal-subtitle">Sıradaki işletmeni açarak yeni araç tipleri ve gelir kaynakları ekle.</p>
              <div className="fleet-subheader-actions">
                <button className="btn btn-accent" onClick={() => setBusinessModal('')}>Merkez</button>
                <button className="btn btn-danger" onClick={() => setBusinessModal('')}>Geri</button>
              </div>
            </div>
            <div className="fleet-setup-grid">
              <div className="unlock-tree">
                {setupVisibleRows.length ? setupVisibleRows.map((entry, index) => (
                  <article
                    key={entry.key}
                    className={`fleet-setup-card unlock-node${entry.unlocked ? ' unlocked' : ''}${entry.isNextUnlock ? ' next' : ''}`}
                  >
                    <div className="unlock-node-head">
                      <span className="unlock-node-step">{fmt(entry.order || index + 1)}</span>
                      <strong>{entry.title}</strong>
                    </div>
                    <span className="fleet-setup-image" data-broken={entry.icon ? '0' : '1'}>
                      {entry.icon ? (
                        <img
                          src={entry.icon}
                          alt={entry.title}
                          loading="lazy"
                          onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                        />
                      ) : null}
                      <span className="fleet-setup-fallback">İŞ</span>
                    </span>
                    <p>{entry.description}</p>
                    <small>{entry.lockReason}</small>
                    <div className="unlock-node-metrics">
                      <p className="fleet-summary-line">
                        <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                        Açılış maliyeti: <strong>{fmt(entry.cost)}</strong>
                      </p>
                    </div>
                    {entry.canUnlockNow ? (
                      <button
                        className="btn btn-success"
                        onClick={() => buyCompanyBusiness(entry.key)}
                        disabled={Boolean(busy)}
                      >
                        {busy === `buybiz:${entry.key}` ? 'Satın alınıyor...' : 'Nakit ile Satın Al'}
                      </button>
                    ) : entry.isNextUnlock ? (
                      <button
                        className="btn btn-accent"
                        onClick={() => setBusinessModal('upgrade')}
                        disabled={Boolean(busy)}
                      >
                        Geliştirerek Aç
                      </button>
                    ) : (
                      <button className="btn" disabled>Sıradaki Alanı Bekle</button>
                    )}
                    {index < setupVisibleRows.length - 1 ? (
                      <span className="unlock-node-link" aria-hidden="true">v</span>
                    ) : null}
                  </article>
                )) : (
                  <article className="fleet-note-panel">
                    <p>Tüm işletme alanları açıldı.</p>
                    <p>İş Kur ekranında bekleyen yeni alan bulunmuyor.</p>
                  </article>
                )}
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {businessModal === 'filter' ? (
        <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
          <article className="warehouse-modal fleet-modal fleet-filter-modal" onClick={(event) => event.stopPropagation()}>
            <h3>İlan Filtrele</h3>
            <p className="fleet-listing-modal-subtitle">
              Model, fiyat ve seviye aralığı ile ilanları daralt.
            </p>
            <label>
              Model seçin
              <select value={activeModelFilter} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, model: event.target.value }))}>
                <option value="all">Tüm Modeller</option>
                {(activeMarketModelOptions || []).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Minimum fiyat
              <input className="qty-input" placeholder="Örn: 300000" value={marketFilterForm.minPrice} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, minPrice: event.target.value }))} />
            </label>
            <label>
              Maksimum fiyat
              <input className="qty-input" placeholder="Örn: 25000000" value={marketFilterForm.maxPrice} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, maxPrice: event.target.value }))} />
            </label>
            <label>
              Minimum seviye
              <input className="qty-input" placeholder="1" value={marketFilterForm.minLevel} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, minLevel: event.target.value.replace(/[^\d]/g, '') }))} />
            </label>
            <label>
              Maksimum seviye
              <input className="qty-input" placeholder="20" value={marketFilterForm.maxLevel} onChange={(event) => setMarketFilterForm((prev) => ({ ...prev, maxLevel: event.target.value.replace(/[^\d]/g, '') }))} />
            </label>
            <div className="fleet-modal-actions">
              <button className="btn btn-primary full" onClick={() => setBusinessModal('')}>Filtreyi Uygula</button>
              <button className="btn btn-accent full" onClick={resetMarketFilters}>Temizle</button>
              <button className="btn btn-danger full" onClick={() => setBusinessModal('')}>Kapat</button>
            </div>
          </article>
        </section>
      ) : null}

      {businessModal === 'bulk' ? (
        <section className="warehouse-overlay" onClick={() => setBusinessModal('')}>
          <article className="warehouse-modal fleet-modal fleet-bulk-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Toplu Tahsilat</h3>
            <p className="fleet-bulk-intro">60 dakikada bir tüm kiralama işletmelerinden tahsilat alabilirsin.</p>
            <p className="fleet-bulk-note">Bu ekranda işletmeler genelindeki gelir, yakıt, enerji ve vergi kesintisi görünür.</p>
            <section className="fleet-bulk-kpis" aria-label="Toplu tahsilat özeti">
              <article className="fleet-bulk-kpi">
                <span>Hazır İşletmeler</span>
                <strong>{fmt(totalBulkCount)}</strong>
              </article>
              <article className="fleet-bulk-kpi">
                <span>Tahsilat Aralığı</span>
                <strong>60 dk</strong>
              </article>
            </section>
            <div className="fleet-modal-actions fleet-modal-actions-bulk">
              <button
                className="btn btn-success btn-collect-main"
                onClick={() => void collectBulkAction()}
                disabled={Boolean(busy) || totalBulkCount <= 0}
              >
                <span className="btn-icon">
                  <img
                    src={premiumActive && premiumMultiplier > 1 ? '/home/icons/depot/diamond.webp' : '/home/icons/depot/cash.webp'}
                    alt=""
                    aria-hidden="true"
                  />
                </span>
                <span className="btn-label">
                  {busy === 'collect-bulk'
                    ? premiumActive && premiumMultiplier > 1
                      ? '2x toplu tahsilat yapılıyor...'
                      : 'Toplu tahsilat yapılıyor...'
                    : totalBulkCount > 0
                      ? premiumActive && premiumMultiplier > 1
                        ? `2x Toplu Tahsilat (+${fmt(totalBulkNet2x)} net)`
                        : `Toplu Tahsilat Yap (+${fmt(totalBulkNet)} net)`
                      : 'Tahsilat Hazır Değil'}
                </span>
              </button>
            </div>
            <article className="fleet-bulk-summary fleet-accountant-summary">
              <p className="fleet-summary-line positive">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Normal Net Tahsilat: +{fmt(totalBulkNet)}
              </p>
              <p className="fleet-summary-line positive">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Premium ile 2x Net Tahsilat: +{fmt(totalBulkNet2x)}
              </p>
              <p className="fleet-summary-line positive">
                <img src="/home/ui/hud/xp-icon.webp" alt="" aria-hidden="true" />
                + {fmt(totalBulkXp)} Deneyim
              </p>
              <hr />
              <p className="fleet-summary-line negative">
                <img src="/home/icons/depot/oil.webp" alt="" aria-hidden="true" />
                - {fmt(totalBulkOilFuel)} Yakıt
              </p>
              {hasPropertyFleet ? (
                <p className="fleet-summary-line negative">
                  <img src="/home/icons/depot/enerji.png" alt="" aria-hidden="true" />
                  - {fmt(totalBulkEnergyFuel)} Enerji
                </p>
              ) : null}
              <p className="fleet-summary-line negative">
                <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                - {fmt(totalBulkTax)} Vergi (%{COLLECTION_TAX_PERCENT})
              </p>
              <p className="fleet-net-row fleet-summary-line net">
                <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                Brüt Tahsilat: {fmt(totalBulkIncome)}
              </p>
            </article>
            <button className="btn btn-danger fleet-modal-close" onClick={() => setBusinessModal('')}>Kapat</button>
          </article>
        </section>
      ) : null}
    </section>
  )

  const _marketView = (
    <section className="panel-stack">
      <article className="card">
        <div className="tab-strip five">
          {MARKET_TABS.map((m) => (
            <button key={m} className={marketTab === m ? 'on' : ''} onClick={() => setMarketTab(m)}>
              {marketTabLabel(m)}
            </button>
          ))}
        </div>

        {marketTab === 'auction' ? (
          <section className="panel-stack">
            <article className="tile">
              <h4>Yeni Açık Artırma</h4>
              <div className="grid two">
                <label>
                  Ürün
                  <select
                    value={auctionForm.itemId}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, itemId: e.target.value }))}
                  >
                    {(market?.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>
                  Miktar
                  <input
                    className="qty-input"
                    value={auctionForm.quantity}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 4) || '0' }))}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Başlangıç Teklifi
                  <input
                    className="qty-input"
                    value={auctionForm.startBid}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, startBid: e.target.value.replace(/[^\d]/g, '').slice(0, 7) || '0' }))}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Min Artış
                  <input
                    className="qty-input"
                    value={auctionForm.minIncrement}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, minIncrement: e.target.value.replace(/[^\d]/g, '').slice(0, 6) || '0' }))}
                    inputMode="numeric"
                  />
                </label>
                <label>
                  Süre (dk)
                  <input
                    className="qty-input"
                    value={auctionForm.durationMinutes}
                    onChange={(e) => setAuctionForm((prev) => ({ ...prev, durationMinutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3) || '30' }))}
                    inputMode="numeric"
                  />
                </label>
              </div>
              <button className="btn btn-primary full" onClick={createAuctionAction} disabled={Boolean(busy)}>
                {busy === 'create-auction' ? 'Açılıyor...' : 'Açık Artırmayı Başlat'}
              </button>
            </article>

            <div className="grid two">
              {(market?.activeAuctions || []).slice(0, 8).map((auction) => {
                const isMine = Boolean(auction.myAuction)
                const suggestedBid = auction.minNextBid || (num(auction.currentBid) + num(auction.minIncrement))
                const bidValue = auctionBidById[auction.id] || String(Math.max(1, Math.trunc(num(suggestedBid))))
                return (
                  <article key={auction.id} className="tile">
                    <strong>{auction.title}</strong>
                    <p>Satıcı {auction.sellerName || 'Oyuncu'} | Miktar {fmt(auction.quantity || 0)}</p>
                    <p>Teklif {fmt(auction.currentBid || 0)} | Min sonraki {fmt(suggestedBid)}</p>
                    <p>
                      Bitiş{' '}
                      {new Date(auction.endAt).toLocaleString('tr-TR', {
                        timeZone: TURKIYE_TIMEZONE,
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </p>
                    {isMine ? (
                      <p className="muted">Bu artırma sana ait.</p>
                    ) : (
                      <div className="row gap-sm">
                        <input
                          className="qty-input"
                          value={bidValue}
                          onChange={(e) => setAuctionBidById((prev) => ({ ...prev, [auction.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 7) || '0' }))}
                          inputMode="numeric"
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => void bidAuctionAction(auction)}
                          disabled={Boolean(busy)}
                        >
                          {busy === `bid-auction:${auction.id}` ? 'Teklif...' : 'Teklif Ver'}
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ) : null}

        {marketTab === 'orderbook' ? (
          <section className="panel-stack">
            <div className="row gap-sm">
              <label htmlFor="book-item">Ürün</label>
              <select id="book-item" value={bookItemId} onChange={(e) => {
                const nextId = e.target.value
                setBookItemId(nextId)
                void loadOrderBook(nextId)
              }}>
                {(market?.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button className="btn" onClick={() => void loadOrderBook(bookItemId)} disabled={Boolean(busy)}>Yenile</button>
            </div>
            <div className="orderbook-grid">
              <article className="tile">
                <h4>Alış Defteri</h4>
                <ul className="simple-list">
                  {(orderBook?.orderBook?.bids || []).map((bid, index) => (
                    <li key={`bid-${index}`} className="row">
                      <span>{fmt(bid.quantity)}</span>
                      <strong>{fmt(bid.price)}</strong>
                      <small>{bid.source}</small>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="tile">
                <h4>Satış Defteri</h4>
                <ul className="simple-list">
                  {(orderBook?.orderBook?.asks || []).map((ask, index) => (
                    <li key={`ask-${index}`} className="row">
                      <span>{fmt(ask.quantity)}</span>
                      <strong>{fmt(ask.price)}</strong>
                      <small>{ask.source}</small>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <article className="tile">
              <h4>Limit Emir Ver</h4>
              <div className="grid two">
                <label>
                  Yönü
                  <select value={orderForm.side} onChange={(e) => setOrderForm((prev) => ({ ...prev, side: e.target.value }))}>
                    <option value="buy">Alış</option>
                    <option value="sell">Satış</option>
                  </select>
                </label>
                <label>
                  Miktar
                  <input className="qty-input" value={orderForm.quantity} onChange={(e) => setOrderForm((prev) => ({ ...prev, quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 4) || '0' }))} inputMode="numeric" />
                </label>
                <label>
                  Limit Fiyat
                  <input className="qty-input" value={orderForm.limitPrice} onChange={(e) => setOrderForm((prev) => ({ ...prev, limitPrice: e.target.value.replace(/[^\d]/g, '').slice(0, 6) || '0' }))} inputMode="numeric" />
                </label>
                <label>
                  Süre (dk)
                  <input className="qty-input" value={orderForm.expiresMinutes} onChange={(e) => setOrderForm((prev) => ({ ...prev, expiresMinutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3) || '30' }))} inputMode="numeric" />
                </label>
              </div>
              <button className="btn btn-primary full" onClick={placeLimitOrderAction} disabled={Boolean(busy)}>
                {busy === 'place-orderbook' ? 'Emir oluşturuluyor...' : 'Limit Emri Aç'}
              </button>
            </article>
            <article className="tile">
              <h4>Açık Emirlerin</h4>
              <ul className="simple-list">
                {(orderBook?.openOrders || []).filter((entry) => entry.status === 'open').map((entry) => (
                  <li key={entry.id} className="tile">
                    <div className="row"><strong>{entry.itemName}</strong><span>{entry.side === 'buy' ? 'ALIŞ' : 'SATIŞ'}</span></div>
                    <p>Fiyat {fmt(entry.limitPrice)} | Kalan {fmt(entry.remainingQuantity)}</p>
                    <button className="btn btn-danger" onClick={() => cancelLimitOrderAction(entry.id)} disabled={Boolean(busy)}>
                      {busy === `cancel-order:${entry.id}` ? 'İptal...' : 'Emri İptal Et'}
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}

        {marketTab === 'chart' ? (
          <div>
            <div className="row"><label htmlFor="chart-item">Kaynak</label><select id="chart-item" value={chartItem?.id || ''} onChange={(e) => setChartItemId(e.target.value)}>{(market?.items || []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
            <Chart points={chartPoints} />
            {chartItem ? <p className="muted">{chartItem.name} anlık fiyat {fmt(chartItem.price)}</p> : null}
          </div>
        ) : null}

        {marketTab === 'buy' || marketTab === 'sell' ? (
          <div className="simple-list">
            {(market?.items || []).map((i) => {
              const q = qty[i.id] ?? '10'
              const side = marketTab === 'buy' ? 'buy' : 'sell'
              return <article key={i.id} className="tile">
                <div className="row"><strong>{i.name}</strong><span className={`trend ${i.changePercent >= 0 ? 'up' : 'down'}`}>{`${i.changePercent > 0 ? '+' : ''}${num(i.changePercent).toFixed(2)}%`}</span></div>
                <p>Fiyat {fmt(i.price)} | Stok {fmt(i.stock)} | Envanter {fmt(i.owned)}</p>
                <div className="row gap-sm">
                  <input className="qty-input" value={q} onChange={(e) => setQty((p) => ({ ...p, [i.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }))} inputMode="numeric" />
                  <button className={`btn ${side === 'buy' ? 'btn-success' : 'btn-danger'}`} onClick={() => doTrade(i.id, side)} disabled={Boolean(busy)}>
                    {busy === `${side}:${i.id}` ? 'İşleniyor...' : side === 'buy' ? `Al (${fmt(i.buyPrice)})` : `Sat (${fmt(i.sellPrice)})`}
                  </button>
                </div>
              </article>
            })}
          </div>
        ) : null}
      </article>
    </section>
  )

  const formatMessageDate = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const hour = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${day}.${month} ${hour}:${min}`
    } catch (_) { return '' }
  }

  const formatMessageTimeAgo = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso).getTime()
      const now = Date.now()
      const diffMs = now - d
      if (diffMs < 0) return formatMessageDate(iso)
      const sec = Math.floor(diffMs / 1000)
      const min = Math.floor(sec / 60)
      const hour = Math.floor(min / 60)
      const day = Math.floor(hour / 24)
      if (day > 0) return `${day} gün önce`
      if (hour > 0) return `${hour} saat önce`
      if (min > 0) return `${min} dakika önce`
      if (sec <= 1) return '1 saniye önce'
      return `${sec} saniye önce`
    } catch (_) { return '' }
  }

  const chatView = (
    <section className="panel-stack chat-screen chat-screen-pro">
      <article className="card chat-card chat-card-pro chat-card-clean">
        <div className="chat-feed-head chat-feed-head-pro chat-feed-head-clean">
          <h3 className="chat-title-pro">Oyun Sohbet</h3>
          <span className={`chat-live chat-live-pro ${chatSocketState === 'online' ? 'on' : 'off'}`}>
            {chatSocketState === 'online' ? 'CANLI' : 'KAPALI'}
          </span>
        </div>
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
          <form className="chat-send-form chat-send-form-clean" onSubmit={_sendChat}>
            <input
              type="text"
              className="chat-send-input chat-send-input-clean"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
              placeholder={chatHardRestrictionActive || chatCooldownActive ? 'Bekle...' : 'Mesaj yaz...'}
              disabled={chatHardRestrictionActive || chatCooldownActive || busy === 'chat-send'}
              maxLength={500}
              autoComplete="off"
            />
            <button
              type="submit"
              className="chat-send-btn-clean"
              disabled={!chatInput.trim() || chatHardRestrictionActive || chatCooldownActive || busy === 'chat-send'}
            >
              Gönder
            </button>
          </form>
        ) : null}
      </article>
    </section>
  )

  const messageItemTag = (typeOrKind) => {
    const t = String(typeOrKind || '').toLowerCase()
    if (t === 'market' || t === 'trade') return 'PAZAR'
    if (t === 'business') return 'İşletmeler'
    if (t === 'factory') return 'Fabrikalar'
    if (t === 'mine') return 'Madenler'
    return 'BİLDİRİM'
  }
  const messageItemIcon = () => '/home/icons/messages/bildirim.webp'
  const dmRelationship = messageReplyTarget?.relationship || null
  const dmBlockedByMe = Boolean(dmRelationship?.blockedByMe)
  const dmBlockedMe = Boolean(dmRelationship?.blockedMe)
  const dmModeration = normalizeUserModeration(
    messageReplyTarget?.moderation || messageCenter?.moderation || overview?.profile?.moderation,
  )
  const dmMessageBlockUntil = dmModeration?.dmBlock?.blockedUntil || ''
  const dmMessageBlockRemainingMs = remainingMsFromIso(dmMessageBlockUntil, chatClockMs)
  const dmMessageBlockActive = dmMessageBlockRemainingMs > 0
  const dmMessageBlockReasonLabel = String(dmModeration?.dmBlock?.reason || '').trim() || 'Yönetici mesaj engeli'
  const dmMessageBlockEndLabel = formatDateTime(dmMessageBlockUntil)
  const dmCanSend = !(dmBlockedByMe || dmBlockedMe || dmMessageBlockActive)
  const dmTargetRole = normalizeRoleValue(messageReplyTarget?.role || 'player')
  const canReportDmTarget = dmTargetRole !== 'admin' && role !== 'admin'
  const staffCanModerateDmTarget = role === 'admin' || dmTargetRole === 'player'
  const dmPlaceholder = dmMessageBlockActive
    ? 'DM mesaj engelin aktif.'
    : dmBlockedByMe
    ? 'Engellediğin kullanıcıya mesaj gönderemezsin.'
    : dmBlockedMe
      ? 'Bu kullanıcı seni engelledi.'
      : 'Mesaj yaz...'
  const dmReportMessages = Array.isArray(dmReportModal?.messages) ? dmReportModal.messages : []
  const dmReportSelectedMessage = dmReportMessages.find(
    (entry) => String(entry?.id || '').trim() === String(dmReportModal?.selectedMessageId || '').trim(),
  ) || null
  const dmReportReasonLength = String(dmReportModal?.reason || '').length

  const messagesView = (
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
            MESAJLAR
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
            BİLDİRİMLER
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
                  >
                    <span aria-hidden>←</span>
                  </button>
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
                    <span className="message-sohbet-label">
                      {messageReplyTarget.roleLabel || 'Oyuncu'}
                    </span>
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
                {(_messageItems.filter((item) => item?.source === 'direct' || item?.filter === 'message')).length === 0 ? (
                  <div className="message-gold-empty">
                    <img src="/splash/logo.png" alt="" className="message-gold-empty-icon" onError={(e) => { e.target.style.display = 'none' }} />
                    <p className="message-gold-empty-text">Özel mesajlar burada listelenir.</p>
                    <p className="message-gold-empty-muted">Şu anda mesaj yok.</p>
                  </div>
                ) : (
                  _messageItems
                    .filter((item) => item?.source === 'direct' || item?.filter === 'message')
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
              {_messageItems.filter((item) => !(item?.source === 'direct' || item?.filter === 'message')).length === 0 ? (
                <div className="message-gold-empty">
                  <img src="/home/icons/messages/bildirim.webp" alt="" className="message-gold-empty-icon" onError={(e) => { e.target.style.display = 'none' }} />
                  <p className="message-gold-empty-text">Bildirimler burada listelenir.</p>
                  <p className="message-gold-empty-muted">Şu anda bildirim yok.</p>
                </div>
              ) : (
              _messageItems
                .filter((item) => !(item?.source === 'direct' || item?.filter === 'message'))
                .map((item) => {
                  const sourceType = item?.type ?? item?.kind ?? item?.filter ?? 'other'
                  const friendRequest = item?.source === 'friend_request' ? item?.request : null
                  const isIncomingFriendRequest =
                    Boolean(friendRequest?.incoming) && String(friendRequest?.status || '').toLowerCase() === 'pending'
                  const tag = isIncomingFriendRequest ? 'ARKADAŞLIK' : messageItemTag(sourceType)
                  const iconSrc = messageItemIcon()
                  const rawDetail = normalizeMojibakeText(
                    String(item?.message ?? item?.detail ?? item?.body ?? item?.text ?? '').trim()
                      || (item?.title ? `${item.title}: ${item.message || ''}`.trim() : '')
                      || 'Bildirim',
                  )
                  const dateStr = formatMessageDate(item?.createdAt || item?.sentAt || item?.updatedAt)
                  const isUnread = Boolean(item?.read !== true && item?.unread !== false)
                  // Başlangıç sermayesi bildirimi: hoş geldin + detaylar için buraya tıklayabilirsin metni
                  const isStarterNotice =
                    /TicarNet'e hoş geldin/i.test(rawDetail) ||
                    /Detaylar için buraya tıklayabilirsin/i.test(rawDetail) ||
                    /Başlangıç sermayen/i.test(rawDetail) ||
                    /Başlangıç paketin tanımlandı/i.test(rawDetail)
                  const detail = isStarterNotice
                    ? "TicarNet'e hoş geldin. Başlangıç paketin verildi: 2.000.000 Nakit, 500 Petrol, 200 Enerji, 3.000 Motor, 3.000 Yedek Parça. Detaylar için tıkla."
                    : rawDetail
                  const handleClick = () => {
                    if (isIncomingFriendRequest) return
                    if (isStarterNotice) {
                      setStarterDetailOpen(true)
                    }
                    item?.id && _readMessageItemAction(item.id)
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

  const premiumContent = (
    <section className="panel-stack premium-screen">
      <article className="card premium-card">
        <div className="premium-hero">
          <div className="premium-title">
            <span className="premium-avatar-chip">
              <img
                className={avatarIsGif ? 'is-gif' : ''}
                src={avatarDisplaySrc}
                alt={`${name} avatarı`}
              />
            </span>
            <div className="premium-title-main">
              <h3 className="premium-brand-title">Premium Durumu</h3>
              <div className="premium-title-meta">
                <p className="muted premium-brand-sub">{name}</p>
              </div>
            </div>
          </div>

          <div className="premium-balance-pill">
            <span className="label">BAKİYE</span>
            <strong>
              <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
              {fmt(premiumDiamond)}
            </strong>
          </div>

          <div className={`premium-status ${premiumActive ? 'on' : 'off'}`}>
            <span className="premium-status-mark" aria-hidden>
              <img src="/home/icons/depot/premium.webp" alt="" />
            </span>
            <div className="premium-status-copy">
              <span className="premium-status-title">
                PRO ÜYELİK
              </span>
              <span className="premium-status-sub">
                {premiumActive
                  ? 'Aktif'
                  : 'Aktif değil'}
              </span>
              <span className="premium-status-meta">
                {premiumActive
                  ? (premiumCountdownLabel || `${premiumMultiplier}x çarpan aktif`)
                  : `Toplu tahsilatta ${premiumMultiplier}x için üyelik al.`}
              </span>
            </div>
          </div>
        </div>

        <div className="premium-hero-footer">
          <button
            type="button"
            className="premium-market-link premium-market-link-inline"
            onClick={() => void openDiamondMarketHub()}
            disabled={Boolean(busy)}
          >
            Elmas Marketine Git
          </button>
        </div>

        <article className="card premium-daily-card">
        <div className="premium-daily-head">
          <h4>12 Saatlik Sınırlı Fırsatlar</h4>
          <p className="muted">
            Türkiye saatine göre her 12 saatte bir (00:00 / 12:00) yenilenen özel elmas teklifleri. Her paket periyot başına bir kez alınabilir.
          </p>
        </div>
        <div className="premium-daily-grid">
          {dailyStore.offers.map((offer) => {
            const isPurchased = offer.purchased
            const price = Math.max(0, Math.trunc(num(offer.price || 0)))
            const canAfford = !isPurchased && premiumDiamond >= price
            const busyKey = busy && busy.startsWith('daily:') ? busy : ''
            const isBusy = busyKey === `daily:${offer.id}`
            const actionLocked = Boolean(busy) && !isBusy
            const dailyOfferIcon = offer.id === 'daily-cash-1m'
              ? '/home/icons/depot/cash.webp'
              : '/home/icons/depot/diamond.webp'

            return (
              <div key={offer.id} className="premium-daily-offer">
                <div className="premium-daily-main">
                  <span className="badge">12 SAAT</span>
                  <div className="premium-daily-title">
                    <img src={dailyOfferIcon} alt="" aria-hidden="true" />
                    <strong>{offer.title}</strong>
                  </div>
                  <p>{offer.description}</p>
                </div>
                <div className="premium-daily-price">
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  <span>{fmt(price)}</span>
                </div>
                <p className={`premium-daily-reset${isPurchased ? ' is-active' : ''}`}>
                  {isPurchased ? `Yenilenme: ${dailyResetLabel}` : dailyResetInfoLabel}
                </p>
                <button
                  className="btn full premium-gold-btn"
                  disabled={isPurchased || actionLocked}
                  onClick={() => {
                    if (canAfford) {
                      void purchaseDailyOfferAction(offer.id)
                      return
                    }
                    void openDiamondMarketHub()
                  }}
                >
                  {isPurchased
                    ? 'Bu periyotta kullanıldı'
                    : isBusy
                      ? 'Yükleniyor...'
                      : canAfford
                        ? 'Satın Al'
                        : 'Elmas Marketi'}
                </button>
              </div>
            )
          })}
        </div>
        </article>

        <div className="premium-plans">
          <div className="premium-plans-head">
            <h4>Premium Paketler</h4>
            <p className="muted">Süreler birikir, mevcut üyelik üzerine eklenir.</p>
          </div>
          <div className="premium-plan-grid">
            {premiumPlanList.map((plan) => {
              const planId = String(plan?.id || '').trim()
              const planDays = Math.max(1, Math.trunc(num(plan?.days || 0)))
              const planLabel = String(plan?.label || `${planDays} Gün`)
              const planPrice = Math.max(0, Math.trunc(num(plan?.price || 0)))
              const canAfford = premiumDiamond >= planPrice && Boolean(planId)
              const planKey = planId || planLabel
              const planDailyCost = Math.max(0, Math.round(planPrice / Math.max(1, planDays)))
              const balanceAfterPurchase = Math.max(0, premiumDiamond - planPrice)
              const isBestValue = Boolean(premiumBestValuePlan && planId && premiumBestValuePlan.id === planId)
              const actionLocked = Boolean(busy) && busy !== `premium:${planId}`

              let badgeLabel = ''
              if (isBestValue) badgeLabel = 'En Verimli'
              else if (planDays <= 7) badgeLabel = 'Popüler'
              else if (planDays >= 365) badgeLabel = 'Çok Avantajlı'
              else if (planDays >= 90) badgeLabel = 'Avantajlı'

              return (
                <article
                  key={planKey}
                  className={`premium-plan${badgeLabel ? ' is-featured' : ''}`}
                >
                  <div className="premium-plan-head">
                    <strong>{planLabel}</strong>
                    {badgeLabel ? <span className="premium-plan-tag">{badgeLabel}</span> : null}
                  </div>
                  <p className="premium-plan-copy">
                    Toplu tahsilata {premiumMultiplier}x nakit kazandırır ve ek avantajlar sağlar.
                  </p>
                  <p className="premium-plan-copy">
                    Günlük maliyet: {fmt(planDailyCost)} elmas.
                  </p>
                  <div className="premium-plan-price">
                    <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                    <span>{fmt(planPrice)}</span>
                  </div>
                  <p className="premium-plan-copy">
                    {canAfford
                      ? `Satın alım sonrası bakiye: ${fmt(balanceAfterPurchase)} elmas`
                      : `Eksik bakiye: ${fmt(Math.max(0, planPrice - premiumDiamond))} elmas`}
                  </p>
                  <button
                    className="btn full premium-gold-btn"
                    disabled={actionLocked}
                    onClick={() => {
                      if (canAfford) {
                        void purchasePremiumPlan(planId)
                        return
                      }
                      void openDiamondMarketHub()
                    }}
                  >
                    {busy === `premium:${planId}` ? 'Yükleniyor...' : canAfford ? 'Satın Al' : 'Elmas Marketi'}
                  </button>
                </article>
              )
            })}
          </div>
        </div>
      </article>
    </section>
  )

  const diamondMarketContent = (
    <section className="panel-stack diamond-market-screen">
      <article className="card premium-card">
        <div className="diamond-market-hero">
          <div>
            <h3>Elmas Marketi</h3>
            <p className="muted">Google Play Faturalandırma altyapısına uyumlu Türkçe elmas paketleri.</p>
          </div>
          <div className="premium-balance-pill">
            <span className="label">MEVCUT BAKİYE</span>
            <strong>
              <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
              {fmt(premiumDiamond)}
            </strong>
          </div>
        </div>

        {welcomePackPurchased ? (
          <p className="diamond-market-flag">Hoş geldin paketi bu hesapta kullanıldı.</p>
        ) : null}

        <div className="diamond-market-grid">
          {diamondMarketPackages.map((pack) => {
            const isWelcomePack = Boolean(pack.ribbon)
            const totalDiamonds = Math.max(0, Math.trunc(num(pack.diamonds || 0)))
            const perDiamondPrice = totalDiamonds > 0 ? num(pack.priceTry) / totalDiamonds : 0
            const packTitle = String(pack.title || `${fmt(totalDiamonds)} Elmas Paketi`).trim()
            return (
              <article key={pack.id} className={`diamond-pack${isWelcomePack ? ' is-welcome' : ''}`}>
                {isWelcomePack ? <span className="diamond-pack-ribbon">{pack.ribbon}</span> : null}
                <span className="diamond-pack-chip">
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  Elmas
                </span>
                <p className="diamond-pack-name">{packTitle}</p>
                <p className="diamond-pack-amount">{fmt(totalDiamonds)}</p>
                <p className="diamond-pack-unit">Tanesi {fmtTry(perDiamondPrice)}</p>
                {pack.note ? (
                  <p className="diamond-pack-note">{pack.note}</p>
                ) : (
                  <span className="diamond-pack-note-spacer" aria-hidden="true" />
                )}
                <button
                  type="button"
                  className="btn full premium-gold-btn diamond-pack-buy"
                  onClick={() => { void openDiamondCashCheckout(pack) }}
                  disabled={Boolean(busy)}
                >
                  <img src="/home/icons/depot/diamond.webp" alt="" aria-hidden="true" />
                  <span>{fmtTry(pack.priceTry)}</span>
                </button>
              </article>
            )
          })}
        </div>

        <p className="muted diamond-market-note">
          {IS_NATIVE_ANDROID_RUNTIME
            ? 'Not: Android sürümünde dijital içerik satın alımları yalnızca Google Play Faturalandırma ile yapılır.'
            : 'Not: Web test akışı için `VITE_DIAMOND_CHECKOUT_URL` tanımlandığında butonlar ödeme sayfasına yönlendirir.'}
        </p>
      </article>
    </section>
  )

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
          <h4>1) Kullanıcı Adı (100 Elmas)</h4>
          <label className="settings-field-label" htmlFor="settings-username-input">Yeni kullanıcı adı</label>
          <input
            id="settings-username-input"
            className="qty-input settings-input"
            type="text"
            value={profileAccountForm.username}
            onChange={(event) => {
              const raw = String(event.target.value || '')
                .replace(/[^A-Za-z\u00c7\u011e\u0130\u00d6\u015e\u00dc\u00e7\u011f\u0131\u00f6\u015f\u00fc ]/g, '')
                .replace(/^\s+/, '')
                .slice(0, 15)
              const normalized = raw
                ? `${raw[0].toLocaleUpperCase('tr-TR')}${raw.slice(1)}`
                : ''
              setProfileAccountForm((prev) => ({ ...prev, username: normalized }))
            }}
            placeholder={profileAccountUsername}
            maxLength={15}
            autoComplete="username"
          />
          <p className="settings-helper-text">
            3-15 karakter • sadece harf/boşluk • emoji/özel karakter kullanılamaz.
          </p>
          <p className="settings-helper-text">
            Ücret: 100 Elmas • Mevcut Elmas: {fmt(cGold)}
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

  const privateListingsView = (
    <>
      <section className="panel-stack home-sections private-listings-screen">
      <article className="card fleet-detail-card fleet-fullscreen-card">
        <div className="fleet-subheader">
          <div className="fleet-subheader-copy">
            <p className="fleet-subheader-owner">{companyLegalLabel}</p>
            <h3 className="fleet-subheader-title">Özel İlanlar</h3>
            <p className="fleet-subheader-subtitle">Sadece seçtiğin arkadaşların ilanları</p>
          </div>
          <div className="fleet-subheader-actions">
            <button className="btn btn-danger" onClick={() => void openTab('home', { tab: 'home' })}>Geri</button>
          </div>
        </div>

        <div className="fleet-detail-hero fleet-market-hero">
          <span className="fleet-hero-media" data-broken="0">
            <img
              src="/home/icons/ozel-ilanlar.png"
              alt="Özel İlanlar"
              loading="lazy"
              onError={(event) => {
                const holder = event.currentTarget.parentElement
                if (holder) holder.setAttribute('data-broken', '1')
              }}
            />
            <span className="fleet-hero-fallback">ÖZEL</span>
          </span>
          <div className="fleet-detail-main">
            <p>Özel ilan sayısı</p>
            <strong>{fmt(privateCustomFleetRows.length + privateCustomLogisticsRows.length)}</strong>
          </div>
        </div>

        <div className="fleet-market-list">
          {privateCustomFleetRows.length || privateCustomLogisticsRows.length ? (
            <>
              {privateCustomFleetRows.length ? (
                <>
                  <h4>Özel Araç İlanları</h4>
                  {privateCustomFleetRows.map((vehicle, index) => {
                    const templateId = String(vehicle?.templateId || '').trim()
                    const requiredLevel = Math.max(1, Math.trunc(num(vehicle?.marketLevel || vehicle?.requiredLevel || 1)))
                    const unlockedModelLevel = Math.max(1, Math.trunc(num(unlockedModelLevelByTemplate?.[templateId] || 1)))
                    const lockedByLevel = requiredLevel > unlockedModelLevel
                    return (
                      <button
                        key={`private-fleet-${vehicle.id}-${index}`}
                        className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                        type="button"
                        onClick={() => void tapPrivateListing(vehicle)}
                        onPointerUp={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          void tapPrivateListing(vehicle)
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          event.preventDefault()
                          void tapPrivateListing(vehicle)
                        }}
                      >
                        <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(vehicle, templateId) ? '0' : '1'}>
                          {resolveVehicleImage(vehicle, templateId) ? (
                            <img
                              src={resolveVehicleImage(vehicle, templateId)}
                              alt={vehicle.name}
                              loading="lazy"
                              onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                            />
                          ) : null}
                          <span className="fleet-active-fallback">{vehicle.emoji || vehicleEmojiByTier(vehicle.tier, templateId)}</span>
                        </span>
                        <div className="fleet-market-copy">
                          <small className="fleet-market-private-badge">Özel</small>
                          <strong>{vehicle.name}</strong>
                          <div className="fleet-market-meta-line">
                            <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                          </div>
                          {lockedByLevel ? (
                            <small className="fleet-market-lock">Kilitli</small>
                          ) : (
                            <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                          )}
                        </div>
                        <div className="fleet-market-price">
                          <span>Satış Fiyatı</span>
                          <strong>
                            <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                            {fmt(vehicle.marketPrice)}
                          </strong>
                        </div>
                      </button>
                    )
                  })}
                </>
              ) : null}

              {privateCustomLogisticsRows.length ? (
                <>
                  <h4>Özel İkinci El Tır İlanları</h4>
                  {privateCustomLogisticsRows.map((truck, index) => {
                    const requiredLevel = Math.max(1, Math.trunc(num(truck?.marketLevel || truck?.requiredLevel || 1)))
                    const lockedByLevel = requiredLevel > playerLevelNow
                    return (
                      <button
                        key={`private-log-${truck.id}-${index}`}
                        className={`fleet-market-row fleet-market-listable${lockedByLevel ? ' is-locked' : ''}`}
                        type="button"
                        onClick={() => void tapPrivateListing(truck)}
                        onPointerUp={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          void tapPrivateListing(truck)
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return
                          event.preventDefault()
                          void tapPrivateListing(truck)
                        }}
                      >
                        <span className="fleet-compact-thumb" data-broken={resolveVehicleImage(truck, 'logistics') ? '0' : '1'}>
                          {resolveVehicleImage(truck, 'logistics') ? (
                            <img
                              src={resolveVehicleImage(truck, 'logistics')}
                              alt={truck.name}
                              loading="lazy"
                              onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                            />
                          ) : null}
                          <span className="fleet-active-fallback">{truck.emoji || vehicleEmojiByTier(truck.tier, 'logistics')}</span>
                        </span>
                        <div className="fleet-market-copy">
                          <small className="fleet-market-private-badge">Özel</small>
                          <strong>{truck.name}</strong>
                          <div className="fleet-market-meta-line">
                            <span className="fleet-market-level">Seviye {fmt(requiredLevel)}</span>
                          </div>
                          <small className="fleet-market-truck-meta">
                            <img src="/home/icons/depot/capacity.png" alt="" className="fleet-market-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                            Kapasite: {fmt(truck.capacity)}
                          </small>
                          {lockedByLevel ? (
                            <small className="fleet-market-lock">Kilitli</small>
                          ) : (
                            <small className="fleet-market-tap-hint">Satışa bakmak için dokun.</small>
                          )}
                        </div>
                        <div className="fleet-market-price">
                          <span>Satış Fiyatı</span>
                          <strong>
                            <img src="/home/icons/depot/cash.webp" alt="" aria-hidden="true" />
                            {fmt(truck.marketPrice)}
                          </strong>
                        </div>
                      </button>
                    )
                  })}
                </>
              ) : null}
            </>
          ) : (
            <p className="empty">Arkadaşlarından özel ilan bulunmuyor.</p>
          )}
        </div>
      </article>
      </section>

      {marketDetailDraft && businessModal === 'market-detail' ? (
        <section className="warehouse-overlay" onClick={closeMarketListingDetail}>
          <article
            className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>İlan Detayları</h3>
            <p className="fleet-listing-modal-subtitle">
              Satın almadan önce ilan bilgilerini kontrol et.
            </p>
            <article className="fleet-listing-preview fleet-market-detail-preview">
              <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(marketDetailDraft, marketDetailTemplateId) ? '0' : '1'}>
                {resolveVehicleImage(marketDetailDraft, marketDetailTemplateId) ? (
                  <img
                    src={resolveVehicleImage(marketDetailDraft, marketDetailTemplateId)}
                    alt={marketDetailDraft.name}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-active-fallback">
                  {marketDetailDraft.emoji || vehicleEmojiByTier(marketDetailDraft.tier, marketDetailTemplateId)}
                </span>
              </span>
              <div className="fleet-listing-copy">
                <strong>{marketDetailDraft.name}</strong>
                <p className="fleet-market-detail-seller">
                  Satıcı: <span>{marketDetailDraft.sellerName || 'Oyuncu'}</span>
                </p>
                <div className="fleet-listing-stat-grid">
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                      Gereken Seviye
                    </span>
                    <strong>{fmt(marketDetailRequiredLevel)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/level-icon.png" alt="" aria-hidden="true" />
                      {marketDetailLevelCurrentLabel}
                    </span>
                    <strong>{fmt(marketDetailLevelCurrent)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                      Saatlik Gelir
                    </span>
                    <strong>+{fmt(marketDetailDraft.marketIncome || 0)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/ui/hud/xp-icon.png" alt="" aria-hidden="true" />
                      XP Kazancı
                    </span>
                    <strong>+{fmt(marketDetailDraft.xp || 0)}</strong>
                  </p>
                  <p className="fleet-listing-stat-item is-wide">
                    <span className="fleet-listing-stat-label">
                      <img src="/home/icons/depot/zamanlayici.webp" alt="" aria-hidden="true" />
                      Kalan Ömür
                    </span>
                    <strong>{formatLifetimeWithTotal(marketDetailLiveLifetime)}</strong>
                  </p>
                </div>
              </div>
            </article>
            <article className="fleet-note-panel fleet-market-detail-price">
              <p className="fleet-listing-range-line">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  Satış Fiyatı
                </span>
                <strong>{fmt(marketDetailPrice)}</strong>
              </p>
              <p className="fleet-listing-range-line">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/vergi.webp" alt="" aria-hidden="true" />
                  Komisyon (%{fmt(Math.round(marketDetailCommissionRate * 100))})
                </span>
                <strong>- {fmt(marketDetailCommissionAmount)}</strong>
              </p>
              <p className="fleet-listing-range-line is-total">
                <span className="fleet-listing-range-label">
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  Satıcı Net Kazanç
                </span>
                <strong>{fmt(marketDetailSellerPayout)}</strong>
              </p>
              {!marketDetailHasBusinessAccess ? (
                <p className="fleet-market-detail-warning">
                  {marketDetailBusinessLabel} açık değil. Önce bu işletmeyi açmalısın.
                </p>
              ) : null}
              {!marketDetailCanBuyByLevel ? (
                <p className="fleet-market-detail-warning">
                  Seviye yetersiz. Gereken seviye: {fmt(marketDetailRequiredLevel)} | {marketDetailLevelCurrentLabel}: {fmt(marketDetailLevelCurrent)}
                </p>
              ) : null}
              {!marketDetailCanAfford ? (
                <p className="fleet-market-detail-warning">
                  Nakit yetersiz. Gerekli tutar: {fmt(marketDetailTotalCost)} | Kasandaki: {fmt(walletNow)}
                </p>
              ) : null}
            </article>
            <button
              className="btn btn-success full fleet-modal-cta-sale"
              onClick={() => void buyVehicleFromMarket(marketDetailDraft.id, marketDetailDraft)}
              disabled={Boolean(busy) || !marketDetailDraft}
            >
              {busy === `buy-listing:${marketDetailDraft.id}`
                ? 'Satın Alınıyor...'
                : marketDetailAssetMeta.buyAction}
            </button>
            <button
              className="btn btn-danger fleet-modal-close fleet-modal-cta-back"
              onClick={closeMarketListingDetail}
            >
              Kapat
            </button>
          </article>
        </section>
      ) : null}

      {marketPurchaseResult && businessModal === 'market-buy-success' ? (
        <section className="warehouse-overlay" onClick={closeMarketPurchaseResult}>
          <article
            className="warehouse-modal fleet-modal fleet-listing-modal fleet-market-purchase-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fleet-market-purchase-hero">
              <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" loading="lazy" />
              <p>{marketAssetLabel(marketPurchaseResult.templateId).successText}</p>
              <strong>Tebrikler.</strong>
            </div>
            <article className="fleet-listing-preview fleet-market-purchase-preview">
              <span className="fleet-owned-thumb fleet-listing-thumb" data-broken={resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId) ? '0' : '1'}>
                {resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId) ? (
                  <img
                    src={resolveVehicleImage(marketPurchaseResult, marketPurchaseResult.templateId)}
                    alt={marketPurchaseResult.name}
                    loading="lazy"
                    onError={(event) => event.currentTarget.parentElement?.setAttribute('data-broken', '1')}
                  />
                ) : null}
                <span className="fleet-active-fallback">
                  {marketPurchaseResult.emoji || vehicleEmojiByTier(marketPurchaseResult.tier, marketPurchaseResult.templateId)}
                </span>
              </span>
              <div className="fleet-listing-copy">
                <strong>{marketPurchaseResult.name}</strong>
                <p className="fleet-listing-subline">
                  İlan fiyatı: {fmt(marketPurchaseResult.marketPrice || 0)}
                  {' | '}
                  Komisyon: {fmt(marketPurchaseResult.commissionAmount || 0)}
                  {' | '}
                  Satıcı Net Kazanç: {fmt(marketPurchaseResult.sellerPayout || 0)}
                </p>
              </div>
            </article>
            <div className="fleet-market-purchase-actions">
              <button className="btn btn-danger" onClick={closeMarketPurchaseResult}>Önceki Sayfa</button>
              <button className="btn btn-accent" onClick={goToOwnedFleetFromPurchase}>
                {marketAssetLabel(marketPurchaseResult.templateId).ownedTabLabel}
              </button>
              <button className="btn btn-success" onClick={goToMyListingsFromPurchase}>Satışlarım</button>
            </div>
            <button
              className="btn btn-danger fleet-modal-close fleet-modal-cta-back"
              onClick={closeMarketPurchaseResult}
            >
              Kapat
            </button>
          </article>
        </section>
      ) : null}
    </>
  )

  let content = homeView
  if (tab === 'factories') content = factoriesView
  if (tab === 'businesses') content = businessView
  if (tab === 'missions') content = missionsView
  if (tab === 'events') content = eventsView
  if (tab === 'announcements') content = announcementsView
  if (tab === 'rules') content = rulesView
  if (tab === 'mines') content = minesView
  if (tab === 'marketplace') content = marketplaceView
  if (tab === 'forex') content = forexView
  if (tab === 'bank') content = bankView
  if (tab === 'private-listings') content = privateListingsView
  if (tab === 'chat') content = chatView
  if (tab === 'messages') content = messagesView
  if (tab === 'profile') {
    content = (
      <section className="panel-stack profile-screen">
        {profileContent}
      </section>
    )
  }
  const contentViewKey = `${tab}:${tab === 'profile' ? profileTab : ''}:${tab === 'messages' ? messageFilterResolved : ''}`
  const _chatLikeTab = tab === 'chat' || tab === 'messages'
  const chatOnlyLayout = tab === 'chat' || (tab === 'messages' && Boolean(messageReplyTarget))
  const walletHiddenTab =
    tab === 'chat' ||
    tab === 'profile' ||
    tab === 'rules' ||
    tab === 'missions' ||
    (tab === 'messages' && Boolean(messageReplyTarget))
  const navMetaById = {
    'nav-profile': {
      hint: 'Store',
      badge: premiumActive
        ? { label: 'PRE', tone: 'is-ready' }
        : { label: 'Pasif' },
    },
    'nav-leaderboard': {
      hint: 'Sıralama',
      badge: { label: 'TOP' },
    },
    'nav-home': {
      hint: 'Ana Menü',
      badge: null,
    },
    'nav-chat-trade': {
      hint: 'Bildirimler',
      badge: _unreadMessageCount > 0
        ? {
            label: String(_unreadMessageCount),
            tone: 'is-alert',
          }
        : null,
    },
    'nav-chat-global': {
      hint: 'Oyuncu Sohbeti',
      badge: null,
    },
  }
  const homePageClassName = [
    'home-page',
    tab === 'home' ? 'home-tab-active' : '',
    tab === 'bank' ? 'bank-tab-active' : '',
    tab === 'chat' || (tab === 'messages' && Boolean(messageReplyTarget)) ? 'chat-tab-active' : '',
    tab === 'messages' && Boolean(messageReplyTarget) ? 'dm-fullscreen-active' : '',
    tab === 'profile' && profileTab === 'leaderboard' ? 'leaderboard-tab-active' : '',
    tab === 'missions' ? 'missions-tab-active' : '',
    tab === 'announcements' ? 'announcements-tab-active' : '',
    chatOnlyLayout ? 'chat-only-page' : '',
    walletHiddenTab ? 'wallet-hidden-page' : '',
    (tab === 'factories' && factoryPurchaseModal) ? 'factory-modal-open' : '',
    (tab === 'marketplace' && marketplaceBuyModal) ? 'marketplace-modal-open' : '',
    `nav-theme-${navTheme}`,
    tab === 'businesses' ? 'business-only-page' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const homeShellClassName = ['home-shell', levelFx ? 'levelup' : '', chatOnlyLayout ? 'chat-only-shell' : '', tab === 'businesses' ? 'business-only-shell' : '', tab === 'messages' ? 'messages-tab-shell' : '', tab === 'missions' ? 'missions-shell' : '', tab === 'announcements' ? 'announcements-shell' : '']
    .filter(Boolean)
    .join(' ')

  const leaderboardSearchModal = leaderboardSearchOpen && createPortal(
    <section className="warehouse-overlay leaderboard-search-overlay" onClick={() => setLeaderboardSearchOpen(false)}>
      <article className="warehouse-modal leaderboard-search-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Oyuncu Ara</h3>
        <p className="leaderboard-search-sub">İsim veya kullanıcı adı yaz; listede bulup seni oraya götürelim.</p>
        <form
          className="leaderboard-search-form"
          onSubmit={(e) => {
            e.preventDefault()
            runLeaderboardSearch()
          }}
        >
          <input
            id="leaderboard-search-input"
            value={leaderboardSearchQuery}
            onChange={(e) => {
              setLeaderboardSearchQuery(e.target.value)
              if (leaderboardSearchError) setLeaderboardSearchError('')
            }}
            placeholder="OyuncuAdı"
            autoComplete="off"
            className="leaderboard-search-input"
          />
          {leaderboardSearchError ? <p className="leaderboard-search-error">{leaderboardSearchError}</p> : null}
          <div className="leaderboard-search-actions">
            <button type="submit" className="btn btn-primary full">Ara</button>
            <button type="button" className="btn btn-ghost full" onClick={() => setLeaderboardSearchOpen(false)}>Kapat</button>
          </div>
        </form>
      </article>
    </section>,
    document.body
  )

  const seasonRankIconByRank = {
    1: '/home/icons/leaderboard/rank-1.webp',
    2: '/home/icons/leaderboard/rank-2.webp',
    3: '/home/icons/leaderboard/rank-3.webp',
  }
  const seasonChestIconByRank = {
    1: '/home/icons/leaderboard/chest-gold.webp',
    2: '/home/icons/leaderboard/chest-silver.webp',
    3: '/home/icons/leaderboard/chest-bronze.webp',
  }
  const seasonBadgeIconByRank = {
    1: '/home/icons/leaderboard/badge-season-1.webp',
    2: '/home/icons/leaderboard/badge-season-2.webp',
    3: '/home/icons/leaderboard/badge-season-3.webp',
  }
  const seasonBadgeLabelByRank = {
    1: 'Sezon Şampiyonu',
    2: 'Sezon İkincisi',
    3: 'Sezon Üçüncüsü',
  }
  const seasonRewardMultiplierText = (multiplierValue, multiplierMaxValue) => {
    const rewardMultiplier = Math.max(1, Math.trunc(num(multiplierValue ?? 1)))
    const rewardMultiplierMax = Math.max(
      rewardMultiplier,
      Math.trunc(num(multiplierMaxValue ?? rewardMultiplier)),
    )
    if (rewardMultiplier >= rewardMultiplierMax) return `x${rewardMultiplier} (Maksimum)`
    return `x${rewardMultiplier} / x${rewardMultiplierMax}`
  }

  const seasonRewardsModal = seasonRewardsOpen && createPortal(
    <section className="warehouse-overlay season-rewards-overlay" onClick={() => setSeasonRewardsOpen(false)}>
      <article className="warehouse-modal season-rewards-modal" onClick={(e) => e.stopPropagation()}>
        <header className="season-modal-head">
          <div className="season-modal-head-copy">
            <h3>Sezon Ödülleri</h3>
            <p className="season-rewards-sub">
              Sezon sonunda ilk 3 oyuncu özel sandık ve sezon rozeti kazanır. 4-25 sıralaması Sıradan Sandık alır. Sandıklarını sınırsız biriktirip istediğin zaman tek tek açabilirsin.
            </p>
          </div>
          <button type="button" className="btn btn-ghost season-modal-close" onClick={() => setSeasonRewardsOpen(false)}>
            Kapat
          </button>
        </header>
        <div className="season-rewards-grid">
          {leagueSeasonRewardCatalogResolved.map((entry) => {
            const rankMin = Math.max(1, Math.trunc(num(entry?.rankMin ?? entry?.rank ?? 1)))
            const rankMax = Math.max(rankMin, Math.trunc(num(entry?.rankMax ?? rankMin)))
            const rankDisplay = rankMax > rankMin ? `${rankMin}-${rankMax}` : `${rankMin}`
            const rankForVisual = rankMin
            const tier = String(entry?.tier || '').trim().toLowerCase()
            const isCommonTier = tier === 'common' || rankMin >= 4
            const isTopRankBadge = rankForVisual <= 3
            const multiplierText = seasonRewardMultiplierText(
              entry?.rewardMultiplier,
              entry?.rewardMultiplierMax,
            )
            const rankIcon = rankForVisual <= 3 ? (seasonRankIconByRank[rankForVisual] || '') : ''
            const chestIcon = isCommonTier
              ? '/home/icons/leaderboard/chestsiradan.webp'
              : (
                String(seasonChestIconByRank[rankForVisual] || entry.chestIcon || '/home/icons/leaderboard/chest-gold.webp').trim() ||
                '/home/icons/leaderboard/chest-gold.webp'
              )
            const badgeIcon = isTopRankBadge
              ? (
                String(entry?.badgeIcon || seasonBadgeIconByRank[rankForVisual] || '').trim() ||
                String(seasonBadgeIconByRank[rankForVisual] || '').trim()
              )
              : ''
            const badgeLabel = isTopRankBadge
              ? (
                String(entry?.badgeLabel || seasonBadgeLabelByRank[rankForVisual] || 'Sezon Rozeti').trim() ||
                'Sezon Rozeti'
              )
              : ''
            return (
              <article
                key={`season-reward-${rankDisplay}`}
                className={`season-reward-card is-${tier || 'gold'}`}
              >
                <div className="season-reward-head">
                  <div className="season-reward-rank-wrap">
                    {rankIcon ? (
                      <img
                        src={rankIcon}
                        alt={`${rankDisplay}. sıra`}
                        className="season-reward-rank-icon"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <strong>#{rankDisplay}</strong>
                  </div>
                  <span className="season-reward-tier-label">{entry.chestLabel}</span>
                </div>
                <div className="season-reward-visuals">
                  <div className="season-reward-visual-item">
                    <img
                      src={chestIcon}
                      alt={entry.chestLabel || 'Sandık'}
                      className="season-reward-visual-icon"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                    <small>Sandık</small>
                  </div>
                  {isTopRankBadge && badgeIcon ? (
                    <div className="season-reward-visual-item">
                      <img
                        src={badgeIcon}
                        alt={badgeLabel}
                        className="season-reward-visual-icon season-reward-visual-icon-badge"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                      <small>{badgeLabel}</small>
                    </div>
                  ) : null}
                </div>
                <p className="season-reward-line"><span>Nakit ödülü</span><strong>{fmt(entry.cashAmount || 0)}</strong></p>
                <p className="season-reward-line"><span>Kaynak ödülü</span><strong>{fmt(entry.resourceAmount || 0)}</strong></p>
                <p className="season-reward-line season-reward-line-multiplier"><span>Ödül katı</span><strong>{multiplierText}</strong></p>
              </article>
            )
          })}
        </div>
      </article>
    </section>,
    document.body,
  )

  const seasonChestsModal = seasonChestsOpen && createPortal(
    <section className="warehouse-overlay season-chests-overlay" onClick={() => setSeasonChestsOpen(false)}>
      <article className="warehouse-modal season-chests-modal" onClick={(e) => e.stopPropagation()}>
        <header className="season-modal-head">
          <div className="season-modal-head-copy">
            <h3>Sezon Sandıkları</h3>
            <p className="season-rewards-sub season-rewards-sub-compact">
              Sandıklarını burada sınırsız biriktirebilir, istediğin sırada tek tek açabilirsin.
            </p>
          </div>
          <button type="button" className="btn btn-ghost season-modal-close" onClick={() => setSeasonChestsOpen(false)}>
            Kapat
          </button>
        </header>
        <div className="season-chests-stats">
          <span>Bekleyen: <strong>{fmt(leaguePendingSeasonChests.length)}</strong></span>
          <span>Açılan: <strong>{fmt(leagueOpenedSeasonChests.length)}</strong></span>
        </div>

        {leaguePendingSeasonChests.length ? (
          <div className="season-chests-list">
            {leaguePendingSeasonChests.map((chest) => {
              const openBusyKey = `season-chest-open:${chest.id}`
              const rank = Math.max(1, Math.trunc(num(chest.rank || 1)))
              const rewardMeta = leagueSeasonRewardForRank(rank) || null
              const cashAmount = Math.max(
                0,
                Math.trunc(num(chest.cashAmount ?? rewardMeta?.cashAmount ?? 0)),
              )
              const resourceAmount = Math.max(
                0,
                Math.trunc(num(chest.resourceAmount ?? rewardMeta?.resourceAmount ?? 0)),
              )
              const tier = String(chest.tier || rewardMeta?.tier || '').trim().toLowerCase()
              const isCommonTier = tier === 'common' || rank >= 4
              const isTopRankBadge = rank <= 3
              const multiplierText = seasonRewardMultiplierText(
                chest?.rewardMultiplier ?? rewardMeta?.rewardMultiplier,
                chest?.rewardMultiplierMax ?? rewardMeta?.rewardMultiplierMax,
              )
              const rankIcon = rank <= 3 ? (seasonRankIconByRank[rank] || '') : ''
              const chestIcon = isCommonTier
                ? '/home/icons/leaderboard/chestsiradan.webp'
                : (
                  String(
                    seasonChestIconByRank[rank] ||
                    chest.chestIcon ||
                    rewardMeta?.chestIcon ||
                    '/home/icons/leaderboard/chest-gold.webp',
                  ).trim() || '/home/icons/leaderboard/chest-gold.webp'
                )
              const badgeIcon = isTopRankBadge
                ? (
                  String(chest.badgeIcon || rewardMeta?.badgeIcon || seasonBadgeIconByRank[rank] || '').trim() ||
                  String(seasonBadgeIconByRank[rank] || '').trim()
                )
                : ''
              const badgeLabel = isTopRankBadge
                ? (
                  String(chest.badgeLabel || rewardMeta?.badgeLabel || seasonBadgeLabelByRank[rank] || 'Sezon Rozeti').trim() ||
                  'Sezon Rozeti'
                )
                : ''
              return (
                <article key={chest.id} className={`season-chest-row is-${tier || 'gold'}`}>
                  <div className="season-chest-row-top">
                    <span className="season-chest-row-order">#{rank}</span>
                    <span className="season-chest-row-season">{chest.seasonKey || '-'}</span>
                  </div>
                  <div className="season-chest-row-main">
                    {rankIcon ? (
                      <img
                        src={rankIcon}
                        alt={`${rank}. sıra`}
                        className="season-chest-rank-icon"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : null}
                    <div className="season-chest-icon-wrap">
                      <div className="season-chest-amounts">
                        <span className="season-chest-amount-pill is-cash">Nakit: {fmt(cashAmount)}</span>
                        <span className="season-chest-amount-pill is-resource">Kaynak: {fmt(resourceAmount)}</span>
                      </div>
                      <img
                        src={chestIcon}
                        alt={chest.chestLabel || 'Sandık'}
                        className="season-chest-icon"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    </div>
                    <div className="season-chest-copy">
                      <strong>{chest.chestLabel || 'Sezon Sandığı'}</strong>
                      <span>Sezon: {chest.seasonKey || '-'}</span>
                      <span className="season-chest-multiplier">Ödül katı: {multiplierText}</span>
                      {isTopRankBadge && badgeIcon ? (
                        <span className="season-chest-badge-line">
                          <img
                            src={badgeIcon}
                            alt=""
                            className="season-chest-badge-icon"
                            aria-hidden
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                          {badgeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy === openBusyKey}
                    onClick={() => void _openSeasonChestAction(chest.id)}
                  >
                    {busy === openBusyKey ? 'Açılıyor...' : 'Sandığı Aç'}
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="season-chests-empty">
            <span className="season-chests-empty-icon" aria-hidden>🎁</span>
            <strong>Bekleyen sezon sandığın yok.</strong>
            <small>Sezon sonunda kazandığın sandıklar burada görünecek.</small>
          </div>
        )}

        {leagueOpenedSeasonChests.length ? (
          <div className="season-chests-history">
            <h4>Açılan Sandıklar</h4>
            {leagueOpenedSeasonChests.map((chest) => {
              const rank = Math.max(1, Math.trunc(num(chest.rank || 1)))
              const rewardMeta = leagueSeasonRewardForRank(rank) || null
              const tier = String(chest.tier || rewardMeta?.tier || '').trim().toLowerCase()
              const isCommonTier = tier === 'common' || rank >= 4
              const isTopRankBadge = rank <= 3
              const multiplierText = seasonRewardMultiplierText(
                chest?.rewardMultiplier ?? rewardMeta?.rewardMultiplier,
                chest?.rewardMultiplierMax ?? rewardMeta?.rewardMultiplierMax,
              )
              const rankIcon = rank <= 3 ? (seasonRankIconByRank[rank] || '') : ''
              const chestIcon = isCommonTier
                ? '/home/icons/leaderboard/chestsiradan.webp'
                : (
                  String(seasonChestIconByRank[rank] || chest.chestIcon || rewardMeta?.chestIcon || '/home/icons/leaderboard/chest-gold.webp').trim() ||
                  '/home/icons/leaderboard/chest-gold.webp'
                )
              const badgeIcon = isTopRankBadge
                ? (
                  String(chest.badgeIcon || rewardMeta?.badgeIcon || seasonBadgeIconByRank[rank] || '').trim() ||
                  String(seasonBadgeIconByRank[rank] || '').trim()
                )
                : ''
              const badgeLabel = isTopRankBadge
                ? (
                  String(chest.badgeLabel || rewardMeta?.badgeLabel || seasonBadgeLabelByRank[rank] || 'Sezon Rozeti').trim() ||
                  'Sezon Rozeti'
                )
                : ''
              return (
                <article key={`opened-${chest.id}`} className="season-chest-history-row">
                  <div className="season-chest-history-main">
                    {rankIcon ? (
                      <img
                        src={rankIcon}
                        alt=""
                        className="season-chest-history-rank-icon"
                        aria-hidden
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                    <img
                      src={chestIcon}
                      alt=""
                      className="season-chest-history-icon"
                      aria-hidden
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="season-chest-history-copy">
                      <span>{chest.chestLabel}</span>
                      <span className="season-chest-multiplier">Ödül katı: {multiplierText}</span>
                      {isTopRankBadge && badgeIcon ? (
                        <span className="season-chest-badge-line">
                          <img
                            src={badgeIcon}
                            alt=""
                            className="season-chest-badge-icon"
                            aria-hidden
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                          {badgeLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <strong>{chest?.reward?.amountText || 'Ödül alındı'}</strong>
                </article>
              )
            })}
          </div>
        ) : null}

      </article>
    </section>,
    document.body,
  )

  const dailyRewardModal = dailyRewardOpen && createPortal(
    <section className="warehouse-overlay warehouse-overlay-fullscreen daily-login-overlay" onClick={() => setDailyRewardOpen(false)}>
      <article className="warehouse-modal warehouse-modal-fullscreen daily-login-modal" onClick={(event) => event.stopPropagation()}>
        <div className="daily-login-header">
          <h3>Günlük Ödül</h3>
          <button
            type="button"
            className="btn btn-danger daily-login-close-btn"
            onClick={() => setDailyRewardOpen(false)}
          >
            Kapat
          </button>
        </div>
        <article className="daily-login-hero">
          <span className="daily-login-hero-icon">
            <img
              src="/home/icons/gift-box.svg"
              alt=""
              aria-hidden
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </span>
          <div className="daily-login-hero-copy">
            <strong>Günlük Giriş Ödülü</strong>
            <p>Her gün giriş yap, artan ödülleri al. Bir gün kaçırırsan seri sıfırlanır.</p>
            <span className="daily-login-hero-streak">🔥 Seri: {dailyLoginSeriesLabel}</span>
          </div>
        </article>

        <div className="daily-login-days-scroll">
          <div className="daily-login-days-grid">
            {dailyLoginDayRows.map((entry) => {
              const status = String(entry?.status || 'locked').trim()
              const rewards = dailyLoginRewardEntries(entry?.reward || {})
              const isClaimed = status === 'claimed' || status === 'today-claimed'
              const isTodayClaimed = status === 'today-claimed'
              const isAvailable = status === 'available'
              return (
                <article
                  key={`daily-login-day-${entry.day}`}
                  className={`daily-login-day-card ${isClaimed ? 'is-claimed' : ''} ${isTodayClaimed ? 'is-today' : ''} ${isAvailable ? 'is-available' : ''}`.trim()}
                >
                  <div className="daily-login-day-top">
                    <span className="daily-login-day-index">{entry.day}. Gün</span>
                    {entry.isBonus ? <span className="daily-login-day-bonus">Bonus</span> : null}
                  </div>
                  <div className="daily-login-reward-list">
                    {rewards.map((rewardEntry) => (
                      <div key={`daily-reward-row-${entry.day}-${rewardEntry.itemId}`} className="daily-login-reward-row">
                        <img
                          src={rewardEntry.icon}
                          alt={rewardEntry.label}
                          onError={(event) => {
                            const node = event.currentTarget
                            if (node.dataset.fallbackApplied === '1') return
                            node.dataset.fallbackApplied = '1'
                            node.src = '/home/icons/depot/cash.webp'
                          }}
                        />
                        <span>{rewardEntry.label}</span>
                        <strong>{fmt(rewardEntry.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  <span className="daily-login-day-state">
                    {isTodayClaimed
                      ? 'Bugün alındı'
                      : isClaimed
                        ? 'Tamamlandı'
                        : isAvailable
                          ? 'Alınabilir'
                          : 'Kilitli'}
                  </span>
                </article>
              )
            })}
          </div>
        </div>

        <div className="daily-login-foot">
          <p className="daily-login-reset-note">
            Sıfırlanma: <strong>{dailyLoginNextResetLabel}</strong> (Türkiye saati 00:00)
          </p>
          <button
            type="button"
            className="btn btn-primary full daily-login-claim-btn"
            onClick={() => void claimDailyLoginRewardAction()}
            disabled={Boolean(busy) || !dailyLoginCanClaim}
          >
            {dailyLoginClaimBusy ? 'Ödül Alınıyor...' : dailyLoginClaimButtonLabel}
          </button>
        </div>
      </article>
    </section>,
    document.body,
  )

  const dailyRewardResultRows = dailyRewardResult ? dailyLoginRewardEntries(dailyRewardResult) : []
  const dailyRewardResultModal = dailyRewardResult && createPortal(
    <section className="warehouse-overlay daily-login-result-overlay" onClick={() => setDailyRewardResult(null)}>
      <article className="warehouse-modal daily-login-result-modal" onClick={(event) => event.stopPropagation()}>
        <span className="daily-login-result-icon">
          <img
            src="/home/icons/gift-box.svg"
            alt=""
            aria-hidden
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </span>
        <h3>Ödül Kazandın!</h3>
        <p className="daily-login-result-headline">Günlük giriş ödülün hesabına eklendi.</p>
        <div className="daily-login-result-list">
          {dailyRewardResultRows.map((entry) => (
            <p key={`daily-result-${entry.itemId}`} className="daily-login-result-row">
              <img src={entry.icon} alt="" aria-hidden />
              <strong className="daily-login-result-value">+{fmt(entry.quantity)}</strong>
              <span className="daily-login-result-label">{entry.label}</span>
            </p>
          ))}
        </div>
        <button type="button" className="btn btn-primary full" onClick={() => setDailyRewardResult(null)}>
          Devam Et
        </button>
      </article>
    </section>,
    document.body,
  )

  return (
    <main ref={pageScrollRef} className={homePageClassName}>
      {mineConfirmModal && createPortal(
        <section className="mine-dig-overlay" aria-modal="true" role="dialog" onClick={() => setMineConfirmModal(null)}>
          <article className="mine-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="mine-confirm-title">{mineConfirmModal.name}</h3>
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
                  {premiumActive ? mineConfirmModal.minOutput * 2 : mineConfirmModal.minOutput} – {premiumActive ? mineConfirmModal.maxOutput * 2 : mineConfirmModal.maxOutput} {mineConfirmModal.outputItemName} (rastgele)
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
              Kazıyı başlattıktan sonra 10 saniye animasyon gösterilir, süre bitince kaynak depoya aktarılır.
            </p>
            <div className="mine-confirm-actions">
              <button type="button" className="btn btn-primary" onClick={() => { setMineConfirmModal(null); mineDigAction(mineConfirmModal.id) }} disabled={!mineConfirmModal.hasEnoughCash || Boolean(busy)}>
                Kazıyı gerçekleştir
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMineConfirmModal(null)}>Kapat</button>
            </div>
          </article>
        </section>,
        document.body,
      )}

      {leaderboardSearchModal}
      {seasonRewardsModal}
      {seasonChestsModal}
      {dailyRewardModal}
      {dailyRewardResultModal}

      {mineDigModal && createPortal(
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
                  <div className="mine-dig-progress" style={{ width: `${Math.max(0, 10 - mineDigCountdownSec) * 10}%` }} />
                </div>
                <p className="mine-dig-countdown">Kalan süre <strong>{mineDigCountdownSec} sn</strong></p>
                <p className="mine-dig-note">Not: Süre dolmadan işlem tamamlanmaz. (10 saniye beklemeniz zorunludur.)</p>
              </>
            )}
          </article>
        </section>,
        document.body,
      )}

      {marketplaceBuyModal && createPortal(
        <div className="marketplace-modal-backdrop" onClick={() => setMarketplaceBuyModal(null)} role="dialog" aria-modal="true" aria-labelledby="marketplace-modal-title">
          <div className="marketplace-buy-modal card marketplace-buy-modal-centered" onClick={(e) => e.stopPropagation()}>
            <div className="marketplace-buy-modal-header">
              <img src={marketplaceBuyModal.icon || cashIconSrc} alt="" className="marketplace-buy-modal-product-icon" onError={(e) => { e.currentTarget.src = cashIconSrc }} />
              <h4 id="marketplace-modal-title" className="marketplace-buy-modal-title">Satın Al — Onay</h4>
            </div>
            <div className="marketplace-buy-modal-product-name">{marketplaceBuyModal.itemName}</div>
            <div className="marketplace-buy-modal-row">
              <span className="marketplace-buy-modal-label">Adet fiyatı</span>
              <span className="marketplace-buy-modal-value"><NakitLabel value={marketplaceBuyModal.price} /></span>
            </div>
            <div className="marketplace-buy-modal-row">
              <span className="marketplace-buy-modal-label">Satıcı</span>
              <span className="marketplace-buy-modal-value">{marketplaceBuyModal.sellerName}</span>
            </div>
            <div className="marketplace-buy-modal-row">
              <span className="marketplace-buy-modal-label">Stok</span>
              <span className="marketplace-buy-modal-value">{fmt(marketplaceBuyModal.stock)} adet</span>
            </div>
            <div className="marketplace-sell-form-row">
              <label className="marketplace-sell-form-label">Adet</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Adet"
                value={marketplaceBuyModalQty}
                onChange={(e) => setMarketplaceBuyModalQty(e.target.value.replace(/[^\d]/g, '').slice(0, 8))}
                onBlur={() => {
                  const maxQ = Math.min(marketplaceBuyModal.stock, marketplaceMaxQty)
                  const parsed = Math.trunc(num(marketplaceBuyModalQty)) || 0
                  const clamped = Math.max(1, Math.min(maxQ, parsed))
                  setMarketplaceBuyModalQty(String(clamped))
                }}
                className="marketplace-sell-form-input"
              />
              {marketplaceNoCapacity && (
                <p className="marketplace-capacity-warning marketplace-capacity-warning-modal" role="alert">
                  Alım satım için tır kapasitesi gerekir. Tır Kiralama bölümünden tır kirala.
                </p>
              )}
              {!marketplaceNoCapacity && (Math.trunc(num(marketplaceBuyModalQty)) || 0) > marketplaceMaxQty && (
                <p className="marketplace-capacity-warning marketplace-capacity-warning-modal" role="alert">
                  Kapasite yetersiz. Tır kapasiteniz {fmt(marketplaceMaxQty)} adet; en fazla {fmt(marketplaceMaxQty)} adet alabilirsiniz.
                </p>
              )}
            </div>
            {(() => {
              const buyModalTotal = marketplaceBuyModal.price * (Math.max(0, Math.min(marketplaceBuyModal.stock, marketplaceMaxQty, Math.trunc(num(marketplaceBuyModalQty)) || 0)))
              const buyModalWallet = Math.max(0, Math.trunc(num(overview?.profile?.wallet ?? 0)))
              const buyModalInsufficientFunds = buyModalTotal > buyModalWallet
              return (
                <>
                  <div className="marketplace-buy-modal-row marketplace-buy-modal-row-total">
                    <span className="marketplace-buy-modal-label">Toplam</span>
                    <span className="marketplace-buy-modal-value marketplace-buy-modal-value-total"><NakitLabel value={buyModalTotal} /></span>
                  </div>
                  <div className="marketplace-buy-modal-row">
                    <span className="marketplace-buy-modal-label">Bakiyeniz</span>
                    <span className="marketplace-buy-modal-value"><NakitLabel value={buyModalWallet} /></span>
                  </div>
                  <p className="marketplace-buy-modal-capacity-hint">
                    <img src="/home/icons/depot/capacity.png" alt="" className="marketplace-buy-modal-capacity-icon" aria-hidden onError={(e) => { e.target.style.display = 'none' }} />
                    En fazla alım: <strong>{fmt(marketplaceMaxQty)}</strong> adet (toplam tır kapasitesi)
                  </p>
                  {buyModalInsufficientFunds && (
                    <p className="marketplace-capacity-warning marketplace-capacity-warning-modal" role="alert">
                      Yetersiz bakiye. Bu alım için <NakitLabel value={buyModalTotal} /> gerekir; elinizde <NakitLabel value={buyModalWallet} /> var.
                    </p>
                  )}
                </>
              )
            })()}
            <p className="marketplace-sell-form-tax marketplace-buy-modal-tax">Her satıştan %10 vergi kesilir.</p>
            <div className="marketplace-buy-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setMarketplaceBuyModal(null)}>İptal</button>
              <button
                type="button"
                className="btn marketplace-buy-btn"
                disabled={marketplaceNoCapacity || busy === 'marketplace-buy-modal' || (Math.trunc(num(marketplaceBuyModalQty)) || 0) > marketplaceMaxQty || (() => { const tot = marketplaceBuyModal.price * (Math.max(0, Math.min(marketplaceBuyModal.stock, marketplaceMaxQty, Math.trunc(num(marketplaceBuyModalQty)) || 0))); return tot > Math.max(0, Math.trunc(num(overview?.profile?.wallet ?? 0))) })()}
                onClick={async () => {
                  if (!marketplaceBuyModal || busy) return
                  const requested = Math.trunc(num(marketplaceBuyModalQty)) || 1
                  const qty = Math.max(1, Math.min(Math.min(marketplaceBuyModal.stock, marketplaceMaxQty), requested))
                  setBusy('marketplace-buy-modal')
                  try {
                    const response =
                      marketplaceBuyModal.type === 'order'
                        ? await buyFromSellOrder(marketplaceBuyModal.orderId, qty)
                        : await buyItem(marketplaceBuyModal.itemId, qty)
                    if (!response?.success) {
                      fail(response, response?.errors?.global || 'Satın alınamadı.')
                      return
                    }
                    setMarketplaceBuyModal(null)
                    setNotice(response.message || `${fmt(qty)} adet satın alındı.`)
                    setNoticeIsSuccess(true)
                    await Promise.all([loadOverview(), loadMarket(), loadProfile()])
                  } finally {
                    setBusy('')
                  }
                }}
              >
                {busy === 'marketplace-buy-modal' ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {tutorialActive ? (
        <section
          className="tutorial-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeTutorial}
        >
          <article className="tutorial-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tutorial-layout">
              <aside className="tutorial-assistant-pane" aria-hidden="true">
                <img src={TUTORIAL_ASSISTANT_IMAGE_SRC} alt="" />
              </aside>
              <div className="tutorial-main-pane">
                <div className="tutorial-head">
                  <div className="tutorial-head-left">
                    <strong className="tutorial-title-main">TicarNet Hızlı Rehber</strong>
                    <span className="tutorial-step-badge">{`Adım ${tutorialStepSafeIndex + 1}/${tutorialStepCount}`}</span>
                  </div>
                  <div className="tutorial-head-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={goTutorialPrev}
                      disabled={tutorialStepSafeIndex <= 0 || tutorialNavPending}
                    >
                      Geri
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={goTutorialNext}
                      disabled={tutorialNavPending}
                    >
                      {tutorialStepSafeIndex >= tutorialStepCount - 1 ? 'Bitir' : 'Sonraki'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={closeTutorial}>
                      Rehberi Kapat
                    </button>
                  </div>
                </div>
                <div className="tutorial-progress" aria-hidden="true">
                  <span style={{ width: `${tutorialProgressPct}%` }} />
                </div>
                <h4>{tutorialCurrentStep?.title || 'Rehber'}</h4>
                <div className="tutorial-purpose-card">
                  <span className="tutorial-purpose-media" aria-hidden="true">
                    <img
                      src={tutorialStepImageSrc}
                      alt=""
                      onError={(event) => {
                        const node = event.currentTarget
                        if (node.dataset.fallbackApplied === '1') return
                        node.dataset.fallbackApplied = '1'
                        node.src = TUTORIAL_ASSISTANT_IMAGE_SRC
                      }}
                    />
                  </span>
                  <div className="tutorial-purpose-copy">
                    <small>Bu bölüm ne işe yarar?</small>
                    <p className="tutorial-lead">{tutorialCurrentStep?.body || tutorialPurposeText || ''}</p>
                    {tutorialPurposeText && tutorialPurposeText !== tutorialCurrentStep?.body ? (
                      <p className="tutorial-purpose-extra">
                        <strong>Hedef:</strong> {tutorialPurposeText}
                      </p>
                    ) : null}
                    {tutorialCurrentTargetLabel ? (
                      <p className="tutorial-target-hint">
                        <strong>Odak:</strong> {tutorialCurrentTargetLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="tutorial-target-action-note">
                  "Sonraki" veya "Geri" düğmesine bastığında rehber seni ilgili bölüme otomatik olarak yönlendirir.
                </p>
              </div>
            </div>
          </article>
        </section>
      ) : null}
      <section className={homeShellClassName}>
        {!walletHiddenTab ? (
          <section className="wallet-dock" aria-label="Cüzdan Özeti">
            <article className="hud-pill wallet-pill cash" aria-label="Nakit">
              <span className="hud-pill-icon" aria-hidden="true">
                <img className="stat-icon-img" src="/home/icons/depot/cash.webp" alt="" />
              </span>
              <span className="wallet-pill-copy">
                <small>Nakit</small>
                <strong className={`wallet-pill-value ${walletCashClass}`.trim()}>{walletCashValue}</strong>
              </span>
            </article>
            <article className="hud-pill wallet-pill gem" aria-label="Elmas">
              <span className="hud-pill-icon" aria-hidden="true">
                <img className="stat-icon-img" src="/home/icons/depot/diamond.webp" alt="" />
              </span>
              <span className="wallet-pill-copy">
                <small>Elmas</small>
                <strong className={`wallet-pill-value ${walletGoldClass}`.trim()}>{walletGoldValue}</strong>
              </span>
            </article>
          </section>
        ) : null}

        <input
          ref={avatarFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="profile-avatar-file-input"
          onChange={openAvatarCropFromFile}
          aria-label="Avatar dosyası seç"
        />

        {tab === 'home' ? (
          <header className="hud">
            <article className="hero-card">
              <div className="hero-main">
                <div
                  className={`hero-avatar is-interactive${busy ? ' is-busy' : ''}`}
                  role="button"
                  tabIndex={busy ? -1 : 0}
                  aria-label="Avatarı değiştir"
                  onClick={triggerAvatarFilePicker}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    triggerAvatarFilePicker()
                  }}
                >
                  <img
                    className={avatarIsGif ? 'is-gif' : ''}
                    src={avatarDisplaySrc}
                    alt={name}
                    onError={() => {
                      if (avatarSrc !== DEFAULT_CHAT_AVATAR) setAvatarFailedSrc(avatarSrc)
                    }}
                  />
                </div>
                <div className="hero-info">
                  <div className="hero-name-row">
                    <div className="hero-name-stack">
                      <span className="hero-name-label">Oyuncu Profili</span>
                      <button
                        type="button"
                        className="hero-username-btn"
                        onClick={() => {
                          if (!user?.id) return
                          void openProfileModal(user.id, {
                            username: name,
                            displayName: profileOverviewDisplayName || name,
                            avatarUrl: avatarDisplaySrc,
                            level: lv.level,
                            role,
                            roleLabel: selfRoleLabel,
                            premium: premiumActive,
                          })
                        }}
                      >
                        <h1 className="hero-username">{name}</h1>
                      </button>
                      <small className="hero-user-handle">{profileAccountUsername}</small>
                    </div>
                    <button
                      type="button"
                      className={`hero-premium-pill ${selfBadge.className === 'staff-admin' || selfBadge.className === 'staff-moderator' ? 'staff' : (premiumActive ? 'on' : 'off')}`}
                      onClick={() => void openPremiumHub()}
                      onTouchEnd={(event) => {
                        event.preventDefault()
                        void openPremiumHub()
                      }}
                    >
                      {selfBadge.isStaff ? (
                        <span className="hero-premium-icon hero-premium-icon-staff" aria-hidden="true">
                          {selfBadge.icon ? (
                            <img
                              src={selfBadge.icon}
                              alt=""
                              className="hero-premium-icon-staff-img"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            selfBadge.className === 'staff-admin' ? 'ADM' : 'MOD'
                          )}
                        </span>
                      ) : (
                        <span className="hero-premium-icon">
                          <img src="/home/icons/depot/premium.webp" alt="" aria-hidden="true" />
                        </span>
                      )}
                      <span className="hero-premium-status">
                        {selfBadge.isStaff ? selfBadge.fullText : selfBadge.text}
                      </span>
                    </button>
                  </div>
                  <div className="hero-level-line">
                    <span className="hero-level-chip">
                      <img className="hero-level-icon" src="/home/ui/hud/level-icon.webp" alt="" aria-hidden="true" />
                      <strong className="level-text">{fmtLevel(lv.level)}</strong>
                    </span>
                  </div>
                  <div className="meter hero-meter"><span style={{ width: `${levelProgress}%` }} /></div>
                  <p className="hero-xp-progress">Seviye İlerlemesi: %{Math.round(levelProgress)}</p>
                  <p className="hero-xp-remaining">
                    {isPlayerMaxLevel
                      ? 'Maksimum seviyeye ulaştınız.'
                      : xpToNextLevelBig > 0n
                        ? `Sonraki seviyeye ${xpToNextLevelValue} XP kaldı`
                        : 'Sonraki seviye için hazırsınız.'}
                  </p>
                </div>
              </div>
            </article>
          </header>
        ) : null}

        {dailyLoginTopStripVisible ? (
          <section className="home-daily-claim-strip-wrap">
            <button
              type="button"
              className="home-daily-claim-strip"
              onClick={() => setDailyRewardOpen(true)}
              disabled={Boolean(busy)}
            >
              <span className="home-daily-claim-icon">
                <img
                  src="/home/icons/gift-box.svg"
                  alt="Günlük Ödül"
                  onError={(event) => {
                    const node = event.currentTarget
                    node.style.display = 'none'
                  }}
                />
              </span>
              <span className="home-daily-claim-copy">
                <strong>Günlük Ödül</strong>
                <small>{dailyLoginQuickStatus}</small>
              </span>
              <span className="home-daily-claim-action">AL</span>
            </button>
          </section>
        ) : null}

        {weeklyEventsStripVisible ? (
          <section className="home-daily-claim-strip-wrap">
            <button
              type="button"
              className="home-daily-claim-strip home-weekly-event-strip"
              onClick={() => void openTab('events', { tab: 'events' })}
              disabled={Boolean(busy)}
            >
              <span className="home-daily-claim-icon home-weekly-event-icon">
                <img
                  src={EVENTS_MENU_ICON_PRIMARY_SRC}
                  alt="Etkinlikler"
                  onError={(event) => {
                    const node = event.currentTarget
                    if (node.dataset.fallbackApplied === '1') {
                      node.style.display = 'none'
                      return
                    }
                    node.dataset.fallbackApplied = '1'
                    node.src = EVENTS_MENU_ICON_FALLBACK_SRC
                  }}
                />
              </span>
              <span className="home-daily-claim-copy">
                <strong>Haftalık Etkinlik</strong>
                <small>{weeklyEventsStripSubtitle}</small>
                <small className="home-weekly-event-countdown">{weeklyEventsStripCountdown}</small>
              </span>
              <span className="home-daily-claim-action home-weekly-event-action">Takvim</span>
            </button>
          </section>
        ) : null}

        {floatingFeedbackText ? (
          <aside className={`home-floating-alert ${floatingFeedbackType === 'error' ? 'is-error' : floatingFeedbackType === 'success' ? 'is-success' : 'is-notice'}`} role="status" aria-live="polite">
            <span className="home-floating-alert-text">{floatingFeedbackText}</span>
            <button
              type="button"
              className="home-floating-alert-close"
              onClick={() => {
                setError('')
                setNotice('')
                setNoticeIsSuccess(false)
              }}
            >
              Kapat
            </button>
          </aside>
        ) : null}
        <section key={contentViewKey} className="tab-content-layer">{content ?? homeView}</section>
      </section>

      {profileModalUserId ? (
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
                  <div className="player-profile-avatar-wrap">
                    <img
                      src={profileModalData.avatar?.url || '/splash/logo.png'}
                      alt=""
                      className="player-profile-avatar"
                      onError={(e) => { e.target.src = '/splash/logo.png' }}
                    />
                  </div>
                  {profileModalData.levelInfo?.level || profileModalData.companyLevel || profileModalData?.seasonBadge ? (
                    <div className="player-profile-rozet">
                      {profileModalData.levelInfo?.level ? (
                        <span className="player-profile-rozet-badge" title="Seviye">LV {profileModalData.levelInfo.level}</span>
                      ) : null}
                      {profileModalData.companyLevel ? (
                        <span className="player-profile-rozet-badge" title="İşletme Seviyesi">İş. {profileModalData.companyLevel}</span>
                      ) : null}
                      {profileModalData?.seasonBadge ? (() => {
                        const seasonBadge = profileModalData.seasonBadge
                        return (
                          <span
                            className={`player-profile-rozet-badge season is-${String(seasonBadge.tier || '').trim().toLowerCase() || 'gold'}`}
                            title={`${seasonBadge.label || 'Sezon Rozeti'} ⬢ ${seasonBadge.awardedForSeasonKey || ''}`.trim()}
                          >
                            {seasonBadge.icon ? (
                              <img
                                src={seasonBadge.icon}
                                alt=""
                                className="player-profile-rozet-badge-icon"
                                aria-hidden
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : null}
                            <span className="player-profile-rozet-badge-copy">
                              <span>{seasonBadge.label || 'Sezon Rozeti'}</span>
                            </span>
                          </span>
                        )
                      })() : null}
                    </div>
                  ) : null}
                  <h2 className="player-profile-name">
                    {profileModalData.displayName || profileModalData.username || 'Oyuncu'}
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
                  {profileModalData?.username ? (
                    <p className="player-profile-handle">{profileModalData.username}</p>
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
                {(() => {
                  const isSelf = profileModalUserId && user?.id && String(profileModalUserId) === String(user.id)
                  const modalRole = isSelf ? role : normalizeRoleValue(profileModalData?.role || 'player')
                  const modalBadge = roleBadgeMeta(
                    modalRole,
                    isSelf ? premiumActive : Boolean(profileModalData?.premium?.active),
                    isSelf ? selfRoleLabel : profileModalData?.roleLabel,
                    profileModalData?.seasonBadge || null,
                  )
                  return (
                  <div className="player-profile-premium-row">
                    <span className="player-profile-premium-label">Rol / Üyelik</span>
                    <span className={`player-profile-premium-value ${modalBadge.className === 'premium' ? 'is-premium' : ''} ${modalBadge.className === 'season' ? 'is-season' : ''} ${modalBadge.isStaff ? 'is-staff' : ''}`}>
                      {modalBadge.icon ? (
                        <img
                          src={modalBadge.icon}
                          alt=""
                          className={`player-profile-role-badge-icon ${modalBadge.isStaff ? 'role' : ''}`}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : null}
                      {modalBadge.isStaff ? modalBadge.fullText : modalBadge.text}
                    </span>
                  </div>
                  )
                })()}
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
                        const hasLogisticsBusiness = allBusinesses.some((entry) => entry.templateId === 'logistics')
                        if (!hasLogisticsBusiness) return []
                        const lf = profileModalData.logisticsFleet
                        if (!lf) return []
                        const trucks = lf.owned || lf.trucks || []

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
                          openTab('businesses', { tab: 'businesses', subTab: 'logistics' })
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
                        openBusinessDetail(b.id)
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
                              <span className="factory-level-badge" title={`Seviye ${fmt(Math.max(1, Number(factory.level || 1)))}`}>
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
      ) : null}

      {garagePanel.open && garagePanel.username ? (
        <section
          className="garage-teklif-overlay"
          aria-modal="true"
          role="dialog"
          onClick={() => setGaragePanel((p) => ({ ...p, open: false }))}
        >
          <article className="garage-teklif-panel" onClick={(e) => e.stopPropagation()}>
            <div className="garage-teklif-head">
              <button
                type="button"
                className="garage-teklif-back"
                onClick={() => setGaragePanel((p) => ({ ...p, open: false }))}
              >
                ← Profile Dön
              </button>
              <h3 className="garage-teklif-title">{garagePanel.businessName || 'Garaj'}</h3>
            </div>
            <div className="garage-teklif-body">
              {(() => {
                const panelTemplateId = String(garagePanel.templateId || '').trim()
                const assetTypeLabel = String(garagePanel.assetTypeLabel || '').trim()
                  || (
                    panelTemplateId === 'logistics'
                      ? 'Tır'
                      : panelTemplateId === 'moto-rental'
                        ? 'Motor'
                        : panelTemplateId === 'auto-rental'
                          ? 'Araba'
                          : panelTemplateId === 'property-rental'
                            ? 'Mülk'
                            : 'Araç'
                  )
                const garageTypeLabel = String(garagePanel.garageTypeLabel || '').trim()
                  || (
                    panelTemplateId === 'logistics'
                      ? 'Tır Garajı'
                      : panelTemplateId === 'moto-rental'
                        ? 'Motor Garajı'
                        : panelTemplateId === 'auto-rental'
                          ? 'Araba Garajı'
                          : panelTemplateId === 'property-rental'
                            ? 'Mülk Portföyü'
                            : 'Garaj'
                  )
                const assetEmoji = panelTemplateId === 'moto-rental'
                  ? '🏍️'
                  : panelTemplateId === 'auto-rental'
                    ? '🚗'
                    : panelTemplateId === 'logistics'
                      ? '🚚'
                      : panelTemplateId === 'property-rental'
                        ? '🏢'
                        : '📦'

                return (
                  <>
                    <div className="garage-teklif-profile-card">
                      <div className="garage-teklif-profile">
                        <div className="player-profile-avatar-wrap garage-teklif-avatar-wrap">
                          <img
                            src={garagePanel.avatarUrl || '/splash/logo.png'}
                            alt=""
                            className="player-profile-avatar"
                            onError={(e) => { e.target.src = '/splash/logo.png' }}
                          />
                        </div>
                        <div className="garage-teklif-profile-text">
                          <h4 className="garage-teklif-player-name">{garagePanel.displayName || garagePanel.username}</h4>
                          <p className="garage-teklif-player-meta">
                            {garagePanel.levelLabel || 'Oyuncu'} · {garageTypeLabel}
                          </p>
                        </div>
                      </div>
                      <p className="garage-teklif-subtitle">
                        {assetTypeLabel} listesi. Teklif için <strong>DM ile Teklif</strong> butonunu kullan.
                      </p>
                    </div>
                    {garagePanel.vehicles.length === 0 ? (
                      <div className="garage-teklif-empty">
                        <span className="garage-teklif-empty-icon" aria-hidden>{assetEmoji}</span>
                        <p className="garage-teklif-empty-title">Henüz {assetTypeLabel.toLocaleLowerCase('tr-TR')} yok.</p>
                        <p className="garage-teklif-empty-sub">Bu işletmede listelenecek bir varlık görünmüyor.</p>
                      </div>
                    ) : (
                      <ul className="garage-teklif-list">
                        {garagePanel.vehicles.map((v) => {
                          const vehicleName = String(v.name || '').trim() || assetTypeLabel
                          const offerTargetLabel = `${vehicleName} (${garagePanel.businessName || garageTypeLabel})`
                          return (
                            <li key={v.id || v.name} className="garage-teklif-li">
                              <img src={v.image || '/splash/logo.png'} alt={vehicleName} className="garage-teklif-thumb" onError={(e) => { e.target.src = '/splash/logo.png' }} />
                              <div className="garage-teklif-item-meta">
                                <span className="garage-teklif-name">{vehicleName}</span>
                                <span className="garage-teklif-asset-badge">{assetTypeLabel}</span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-small garage-teklif-btn"
                                onClick={() => _sendProfileTeklif(garagePanel.username, offerTargetLabel)}
                                disabled={profileTeklifSending}
                              >
                                <span className="garage-teklif-btn-icon" aria-hidden>💬</span>
                                <span>{profileTeklifSending ? 'Açılıyor...' : 'DM ile Teklif'}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </>
                )
              })()}
            </div>
          </article>
        </section>
      ) : null}

      {warehouseOpen ? (
        <section className="warehouse-overlay warehouse-overlay-fullscreen" onClick={() => setWarehouseOpen(false)}>
          <article className="warehouse-modal warehouse-modal-fullscreen" onClick={(event) => event.stopPropagation()}>
            <div className="warehouse-head">
              <h3>Deponuzdaki ürünler</h3>
              <button className="warehouse-x" onClick={() => setWarehouseOpen(false)}>X</button>
            </div>

            <div className="warehouse-total-line">
              <span>Toplam stok</span>
              <strong>{fmt(warehouseTotalQuantity)} adet</strong>
            </div>

            <div className="warehouse-grid">
              {warehouseCards.map((item) => (
                <article key={item.id} className="warehouse-item">
                  <span className="warehouse-item-icon" data-broken={item.forceEmoji ? '1' : '0'}>
                    {!item.forceEmoji ? (
                      <img
                        src={item.png}
                        alt={item.label}
                        loading="lazy"
                        onError={(event) => {
                          const holder = event.currentTarget.parentElement
                          if (holder) holder.setAttribute('data-broken', '1')
                        }}
                      />
                    ) : null}
                    <span className="warehouse-item-icon-fallback">{item.icon}</span>
                  </span>
                  <p className="warehouse-item-name">{item.label}</p>
                  <strong className="warehouse-item-qty">{fmt(item.quantity)}</strong>
                  <small className="warehouse-item-unit">Adet</small>
                </article>
              ))}
            </div>
            <div className="warehouse-foot">
              <button className="btn btn-danger" onClick={() => setWarehouseOpen(false)}>Kapat</button>
            </div>
          </article>
        </section>
      ) : null}

      {avatarCropOpen ? (
        <section
          className="avatar-crop-overlay"
          onClick={() => {
            if (busy === 'avatar-upload') return
            closeAvatarCrop()
          }}
        >
          <article className="avatar-crop-modal" onClick={(event) => event.stopPropagation()}>
            <div className="avatar-crop-head">
              <h3>Avatar Kırp</h3>
              <button
                type="button"
                className="warehouse-x"
                onClick={() => {
                  if (busy === 'avatar-upload') return
                  closeAvatarCrop()
                }}
              >
                X
              </button>
            </div>

            <p className="muted avatar-crop-note">
              {avatarCropMode === 'gif'
                ? `GIF seçildi. Animasyonu korumak için kırpma kapalı, orijinal dosya yüklenecek (en fazla ${AVATAR_MAX_FILE_MB} MB).`
                : 'Kare alanı ayarlayıp avatarını daha temiz hale getir.'}
            </p>

            <div className="avatar-crop-stage">
              <div className="avatar-crop-frame">
                {avatarCropSource ? (
                  <img
                    ref={avatarCropImageRef}
                    src={avatarCropSource}
                    alt="Avatar önizleme"
                    className={`avatar-crop-image${avatarCropMode === 'gif' ? ' gif' : ''}`}
                    style={avatarCropMode === 'gif' ? undefined : avatarCropImageStyle}
                    onLoad={(event) => {
                      const naturalWidth = Number(event.currentTarget.naturalWidth || 0)
                      const naturalHeight = Number(event.currentTarget.naturalHeight || 0)
                      setAvatarCropNatural({
                        width: naturalWidth,
                        height: naturalHeight,
                      })
                    }}
                  />
                ) : null}
                <span className="avatar-crop-grid" />
              </div>
            </div>

            {avatarCropMode !== 'gif' ? (
              <div className="avatar-crop-controls">
                <label>
                  Yakınlaştır: {num(avatarCropZoom).toFixed(2)}x
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={avatarCropZoom}
                    onChange={(event) => setAvatarCropZoom(num(event.target.value))}
                    disabled={busy === 'avatar-upload'}
                  />
                </label>
                <label>
                  Sağa / Sola
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={avatarCropOffsetX}
                    onChange={(event) => setAvatarCropOffsetX(num(event.target.value))}
                    disabled={busy === 'avatar-upload'}
                  />
                </label>
                <label>
                  Yukarı / Aşağı
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={avatarCropOffsetY}
                    onChange={(event) => setAvatarCropOffsetY(num(event.target.value))}
                    disabled={busy === 'avatar-upload'}
                  />
                </label>
              </div>
            ) : null}

            <div className="avatar-crop-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeAvatarCrop}
                disabled={busy === 'avatar-upload'}
              >
                İptal
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void applyAvatarCropAction()}
                disabled={busy === 'avatar-upload'}
              >
                {busy === 'avatar-upload'
                  ? 'Yükleniyor...'
                  : avatarCropMode === 'gif'
                    ? 'GIF Yükle'
                    : 'Kırp ve Yükle'}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      <nav className="mobile-nav">
        <div className="mobile-nav-grid">
          {NAV.map((n) => {
            const target = n.target || { tab: 'home' }
            const isProfileTarget = target.tab === 'profile' && Boolean(target.profileTab)
            const isMessageTarget = target.tab === 'messages'
            const isRulesAsHome = n.id === 'nav-home' && tab === 'rules'
            const isActive = isProfileTarget
              ? tab === 'profile' && profileTab === target.profileTab
              : isMessageTarget
                ? tab === 'messages'
                : tab === target.tab || isRulesAsHome
            const buttonClassName = [
              isActive ? 'active' : '',
              n.center ? 'is-center' : '',
              isProfileTarget ? 'is-profile-link' : '',
              n.id === 'nav-leaderboard' ? 'is-leaderboard-link' : '',
              target.tab === 'chat' ? 'is-chat-link' : '',
              target.tab === 'messages' ? 'is-message-link' : '',
            ].filter(Boolean).join(' ')
            const navMeta = navMetaById[n.id] || {}
            const navHint = String(navMeta?.hint || '').trim()
            const navBadge = navMeta?.badge || null
            const hasBadge = Boolean(navBadge) && (Boolean(navBadge.dot) || Boolean(String(navBadge.label || '').trim()))
            const navBadgeClassName = hasBadge
              ? [
                  'mobile-nav-badge',
                  String(navBadge?.tone || '').trim(),
                  navBadge?.dot ? 'is-dot' : '',
                ].filter(Boolean).join(' ')
              : ''

            return (
              <button
                key={n.id}
                className={buttonClassName}
                onClick={() => void openTab(target.tab, target)}
              >
                <span className="mobile-nav-icon-wrap">
                  <img
                    src={n.icon}
                    alt={n.label}
                    onError={(event) => {
                      const node = event.currentTarget
                      if (node.dataset.fallbackApplied === '1') return
                      const fallback = n.fallbackIcon
                      if (!fallback) return
                      node.dataset.fallbackApplied = '1'
                      node.src = fallback
                    }}
                  />
                  {hasBadge ? (
                    <span className={navBadgeClassName} aria-hidden="true">
                      {navBadge?.dot ? '' : String(navBadge?.label || '').trim()}
                    </span>
                  ) : null}
                </span>
                <span className="mobile-nav-label">{n.label}</span>
                <span className="mobile-nav-hint">{navHint}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {chatReportModal ? (
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
      ) : null}

      {dmReportModal ? (
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
      ) : null}

      {starterDetailOpen ? (
        <section className="starter-detail-overlay" role="dialog" aria-modal="true" onClick={() => setStarterDetailOpen(false)}>
          <article className="starter-detail-modal" onClick={(e) => e.stopPropagation()}>
            <header className="starter-detail-header">
              <h3 className="starter-detail-title">Başlangıç Sermayen</h3>
            </header>
            <div className="starter-detail-body">
              <p className="starter-detail-text">Oyuna başlarken hesabına aktarılan varlıklar:</p>
              <ul className="starter-detail-list">
                <li>
                  <img src="/home/icons/depot/cash.png" alt="" aria-hidden="true" />
                  <span className="starter-detail-label">Nakit</span>
                  <span className="starter-detail-value">2.000.000</span>
                </li>
                <li>
                  <img src="/home/icons/depot/oil.png" alt="" aria-hidden="true" />
                  <span className="starter-detail-label">Petrol</span>
                  <span className="starter-detail-value">500</span>
                </li>
                <li>
                  <img src="/home/icons/depot/enerji.png" alt="" aria-hidden="true" />
                  <span className="starter-detail-label">Enerji</span>
                  <span className="starter-detail-value">200</span>
                </li>
                <li>
                  <img src="/home/icons/depot/spare-parts.png" alt="" aria-hidden="true" />
                  <span className="starter-detail-label">Motor</span>
                  <span className="starter-detail-value">3.000</span>
                </li>
                <li>
                  <img src="/home/icons/depot/yedekparca.webp" alt="" aria-hidden="true" />
                  <span className="starter-detail-label">Yedek Parça</span>
                  <span className="starter-detail-value">3.000</span>
                </li>
              </ul>
              <button type="button" className="starter-detail-close" onClick={() => setStarterDetailOpen(false)}>
                Tamam
              </button>
            </div>
          </article>
        </section>
      ) : null}

      <div className="coin-layer" aria-hidden>
        {bursts.map((b) => b.particles.map((p) => <span key={p.id} className="coin" style={{ left: `${b.x}px`, top: `${b.y}px`, '--dx': `${p.dx}px`, '--dy': `${p.dy}px` }}>$</span>))}
      </div>
    </main>
  )
}

export default HomePage


