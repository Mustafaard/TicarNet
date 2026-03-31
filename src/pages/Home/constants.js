import { Capacitor } from '@capacitor/core'

export const NAV = [
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

export const MARKET_TABS = ['buy', 'sell', 'orderbook', 'auction', 'chart']
export const BUSINESS_DETAIL_TABS = ['garage', 'market']
export const CHAT_ROOM = 'global'
export const CHAT_PRUNE_KEEP_COUNT = 30
export const DEFAULT_CHAT_AVATAR = '/splash/logo.webp'
export const MARKETPLACE_SELL_MIN_PRICE_MULTIPLIER = 0.6
export const MARKETPLACE_SELL_MAX_PRICE_MULTIPLIER = 12
export const MESSAGE_FILTERS = [
  { id: 'all', label: 'Hepsi' },
  { id: 'message', label: 'Mesaj' },
  { id: 'trade', label: 'Ticaret' },
  { id: 'other', label: 'Di\u011fer' },
  { id: 'alert', label: 'Uyar\u0131' },
]
export const MESSAGE_ICONS = {
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
export const CHAT_COMMUNITY_TAB_ITEMS = [
  { id: 'sohbet', label: 'Sohbet', icon: '💬', iconSrc: '/home/icons/sohbet.png', type: 'panel' },
  { id: 'haberler', label: 'Haberler', icon: '📰', iconSrc: '/home/icons/messages/bildirim.webp', type: 'panel' },
  { id: 'kurallar', label: 'Kurallar', icon: '📜', iconSrc: '/home/icons/custom/kurallarim.webp', type: 'panel' },
]
export const CHAT_NEWS_MAX_ITEMS = 70
export const MARKETPLACE_SYSTEM_STOCK_CAP = 5000

export const CHAT_SEED = {
  global: [],
}
export const EMPTY_CHAT_RESTRICTIONS = {
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
export const EMPTY_USER_MODERATION = {
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
export const EMPTY_MESSAGE_UNREAD = Object.freeze({
  total: 0,
  direct: 0,
  notifications: 0,
  alerts: 0,
  friendRequests: 0,
  announcements: 0,
  transactions: 0,
})

export const AVATAR_CROP_PREVIEW_SIZE = 248
export const AVATAR_CROP_OUTPUT_SIZE = 512
export const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024
export const AVATAR_MAX_FILE_MB = Math.round(AVATAR_MAX_FILE_BYTES / (1024 * 1024))
export const AVATAR_CHANGE_COST_DIAMONDS = 10
export const USERNAME_CHANGE_COST_DIAMONDS = 25
export const AVATAR_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
])
export const COLLECTION_TAX_RATE = 0.01
export const COLLECTION_TAX_PERCENT = Math.round(COLLECTION_TAX_RATE * 100)
export const VEHICLE_MARKET_COMMISSION_RATE = 0.05
export const VEHICLE_MARKET_COMMISSION_PERCENT = Math.round(VEHICLE_MARKET_COMMISSION_RATE * 100)
export const VEHICLE_SCRAP_RETURN_RATE = 0.02
export const VEHICLE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000
export const VEHICLE_LIFETIME_MONTHS_TOTAL = 6
export const LISTING_PRICE_PROFILE = {
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
export const MESSAGES_DISABLED = false
export const WS_SESSION_REPLACED_CODE = 4001
export const AUTH_FORCE_LOGOUT_EVENT = 'ticarnet:auth-force-logout'
export const SESSION_REPLACED_NOTICE =
  'Hesabınız başka bir cihazda açıldı. Bu cihazdaki oturum güvenlik nedeniyle kapatıldı.'
export const NAV_THEME_STORAGE_KEY = 'ticarnet-mobile-nav-theme'
export const NAV_THEME_DEFAULT = 'default'
export const NAV_THEMES = ['default', 'dark', 'ocean', 'fire', 'gold']
export const PROFILE_THEME_OPTIONS = [
  { id: 'default', label: 'Varsayılan Tema', description: 'Klasik oyun görünümü' },
  { id: 'dark', label: 'Koyu Tema', description: 'Sade ve dengeli koyu palet' },
  { id: 'ocean', label: 'Okyanus Tema', description: 'Mavi ve ferah görünüm' },
  { id: 'fire', label: 'Ateş Tema', description: 'Sıcak kırmızı/turuncu palet' },
  { id: 'gold', label: 'Altın Tema', description: 'Premium altın vurgulu görünüm' },
]
export const IS_NATIVE_ANDROID_RUNTIME =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
export const DIAMOND_WELCOME_PACK_ID = 'welcome-pack-5000'
export const DIAMOND_CASH_PACKAGES = [
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
export const FOREX_TRADE_FEE_RATE = 0.003
export const FOREX_TRADE_MAX_TOTAL_QUANTITY = 10000000
export const FOREX_TRADE_MAX_QUANTITY = FOREX_TRADE_MAX_TOTAL_QUANTITY
export const FOREX_TRADE_MAX_QUANTITY_DIGITS = String(FOREX_TRADE_MAX_QUANTITY).length
export const FOREX_CURRENCY_ID_PATTERN = /^[a-z0-9_-]{2,24}$/
export const FOREX_TRADE_SIDE_OPTIONS = [
  { value: 'buy', label: 'AL', description: 'Nakit ile TCT al', tone: 'buy' },
  { value: 'sell', label: 'BOZDUR', description: 'TCT bozdur, nakit al', tone: 'sell' },
]
export const FOREX_CHART_RANGE_OPTIONS = [
  { id: '24h', label: '24 Saat', seconds: 24 * 60 * 60, candleCount: 24 },
  { id: '72h', label: '3 Gün', seconds: 72 * 60 * 60, candleCount: 48 },
  { id: '168h', label: '7 Gün', seconds: 168 * 60 * 60, candleCount: 72 },
]
export const FOREX_CLIENT_POLL_INTERVAL_MS = 5000
export const MOBILE_LAYOUT_MAX_WIDTH = 430
export const FOREX_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-doviz-menu.webp'
export const FOREX_MENU_ICON_FALLBACK_SRC = '/home/icons/depot/cash.png'
export const FOREX_HEADER_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-doviz-header.webp'
export const FOREX_HEADER_ICON_FALLBACK_SRC = '/home/icons/depot/cash.png'
export const BANK_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-bank-menu.webp'
export const BANK_MENU_ICON_FALLBACK_SRC = '/home/icons/depot/cash.webp'
export const BANK_HEADER_ICON_PRIMARY_SRC = '/home/icons/custom/ticarnet-bank-menu.webp'
export const BANK_HEADER_ICON_FALLBACK_SRC = '/home/icons/depot/cash.webp'
export const EVENTS_MENU_ICON_PRIMARY_SRC = '/home/icons/etkinlikler.webp'
export const EVENTS_MENU_ICON_FALLBACK_SRC = '/home/icons/v2/nav-missions.png'
export const ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/duyuruu.webp'
export const ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC = '/home/icons/messages/icon-duyuru.webp'
export const DIAMOND_MARKET_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/elmasmarket.webp'
export const DIAMOND_MARKET_MENU_ICON_FALLBACK_SRC = '/home/icons/depot/diamond.webp'
export const SEASON_CHESTS_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/sandiklarim.webp'
export const SEASON_CHESTS_MENU_ICON_FALLBACK_SRC = '/home/icons/leaderboard/chest-gold.webp'
export const RULES_MENU_ICON_PRIMARY_SRC = '/home/icons/custom/kurallarim.webp'
export const RULES_MENU_ICON_FALLBACK_SRC = '/home/icons/v2/nav-uyari.png'
export const HOME_CRITICAL_ASSET_SOURCES = [
  '/home/backgrounds/game-main-bg.webp',
  '/home/icons/depot/premium.webp',
  '/home/icons/liderlik.webp',
  '/home/icons/sehir.webp',
  '/home/icons/mesajlar.webp',
  '/home/icons/sohbet.png',
  '/home/icons/depom.webp',
  '/home/icons/isletmeler.webp',
  '/home/icons/businesses/fabrikam.webp',
  '/home/icons/madenler.webp',
  '/home/icons/pazaryeri.webp',
  '/home/icons/ozel-ilanlar.png',
  '/home/icons/ayarlar.webp',
  '/home/icons/depot/cash.webp',
  '/home/icons/depot/diamond.webp',
  '/home/icons/depot/cash.png',
  '/home/ui/hud/level-icon.webp',
  '/home/ui/hud/level-icon.png',
  FOREX_MENU_ICON_PRIMARY_SRC,
  FOREX_MENU_ICON_FALLBACK_SRC,
  BANK_MENU_ICON_PRIMARY_SRC,
  BANK_MENU_ICON_FALLBACK_SRC,
  EVENTS_MENU_ICON_PRIMARY_SRC,
  EVENTS_MENU_ICON_FALLBACK_SRC,
  ANNOUNCEMENTS_MENU_ICON_PRIMARY_SRC,
  ANNOUNCEMENTS_MENU_ICON_FALLBACK_SRC,
  DIAMOND_MARKET_MENU_ICON_PRIMARY_SRC,
  DIAMOND_MARKET_MENU_ICON_FALLBACK_SRC,
  SEASON_CHESTS_MENU_ICON_PRIMARY_SRC,
  SEASON_CHESTS_MENU_ICON_FALLBACK_SRC,
  RULES_MENU_ICON_PRIMARY_SRC,
  RULES_MENU_ICON_FALLBACK_SRC,
]
export const ANNOUNCEMENT_TYPE_ANNOUNCEMENT = 'announcement'
export const ANNOUNCEMENT_TYPE_UPDATE = 'update'
export const TUTORIAL_PENDING_KEY = 'ticarnet_tutorial_pending'
export const TUTORIAL_COMPLETED_KEY = 'ticarnet_tutorial_completed'
export const TUTORIAL_STEP_KEY = 'ticarnet_tutorial_step'
export const TUTORIAL_TASKS_KEY = 'ticarnet_tutorial_tasks'
export const TUTORIAL_ASSISTANT_IMAGE_SRC = '/home/tutorial/asistan.webp'
export const TUTORIAL_SPOTLIGHT_CLASS = 'tutorial-target-spotlight'
export const TUTORIAL_STEPS = [
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

export const TUTORIAL_STEP_IMAGE_BY_ID = {
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

export const CITY_RULES_GUIDE = {
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

export const FLEET_CARD_META = {
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

export const BUSINESS_UNLOCK_ICON_BY_KEY = {
  'moto-rental': '/home/icons/businesses/moto-kiralama.webp',
  'auto-rental': '/home/icons/businesses/oto-kiralama.webp',
  'property-rental': '/home/icons/businesses/mulkum.webp',
  logistics: '/home/icons/businesses/lojistik-kiralama.webp',
}

export const BUSINESS_UNLOCK_LABEL_BY_KEY = {
  'moto-rental': 'Motor Kiralama',
  'auto-rental': 'Araba Kiralama',
  'property-rental': 'Mülk Kiralama',
  logistics: 'Tır Kiralama',
}

export const FACTORY_CARD_ORDER = [
  'engine-factory',
  'spare-parts-factory',
  'timber-factory',
  'cement-factory',
  'brick-factory',
  'energy-factory',
  'oil-refinery',
]
export const FACTORY_SHOP_IMAGE_BY_ID = {
  'engine-factory': '/home/icons/businesses/motorfab.webp',
  'spare-parts-factory': '/home/icons/businesses/yedekfab.webp',
  'timber-factory': '/home/icons/businesses/kerestefab.webp',
  'cement-factory': '/home/icons/businesses/cimentofab.webp',
  'brick-factory': '/home/icons/businesses/tuglafab.webp',
  'energy-factory': '/home/icons/businesses/enerjifab.webp',
  'oil-refinery': '/home/icons/businesses/petrolfab.webp',
}
export const FACTORY_ITEM_META = {
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

export const MINE_IMAGE_BY_ID = {
  'gold-mine': '/home/icons/mines/altınmaden.png',
  'steel-mine': '/home/icons/mines/demirmaden.webp',
  'copper-mine': '/home/icons/mines/bakırmaden.png',
  'coal-mine': '/home/icons/mines/kömürmaden.png',
}

export const MINE_NAME_BY_ID = Object.freeze({
  'gold-mine': 'Altın Madeni',
  'steel-mine': 'Demir Madeni',
  'copper-mine': 'Bakır Madeni',
  'coal-mine': 'Kömür Madeni',
})

export const MINE_OUTPUT_LABEL_BY_ITEM_ID = Object.freeze({
  gold: 'Altın',
  steel: 'Demir',
  copper: 'Bakır',
  coal: 'Kömür',
})

export const DEPOT_CATALOG = [
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
export const DEPOT_META_BY_ID = new Map(
  DEPOT_CATALOG.map((entry) => [String(entry?.id || '').trim(), entry]),
)
export const DAILY_LOGIN_TOTAL_DAYS = 7
export const DAILY_LOGIN_ITEM_PRIORITY = ['cash', 'oil', 'energy', 'spare-parts', 'engine-kit']
export const DAILY_LOGIN_STATE_SEED = {
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

export const MOTO_LEVEL_IMAGE_BY_LEVEL = {
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
export const MOTO_LEVEL_KEYS = Object.keys(MOTO_LEVEL_IMAGE_BY_LEVEL)
  .map((key) => Math.max(1, Math.trunc(Number(key) || 1)))
  .sort((a, b) => a - b)
export const TRUCK_IMAGE_BY_MODEL_ID = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => {
    const modelNo = index + 1
    const modelId = `truck-${String(modelNo).padStart(2, '0')}`
    return [modelId, `/home/vehicles/truck/tir${modelNo}.png`]
  }),
)
export const TRUCK_IMAGE_BY_NAME = Object.fromEntries([
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

export const DAILY_LOGIN_ICON_BY_ITEM_ID = {
  cash: '/home/icons/depot/cash.png',
  oil: '/home/icons/depot/oil.png',
  energy: '/home/icons/depot/enerji.png',
  'spare-parts': '/home/icons/depot/yedekparca.webp',
  'engine-kit': '/home/icons/depot/spare-parts.png',
}

export const WEEKLY_EVENT_DAY_LABELS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
export const WEEKLY_EVENT_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
export const WEEKLY_EVENT_DAY_MS = 24 * 60 * 60 * 1000
export const WEEKLY_EVENT_WEEK_MS = 7 * WEEKLY_EVENT_DAY_MS
export const WEEKLY_EVENT_START_OFFSET_MS = ((23 * 60) + 59) * 60 * 1000
export const WEEKLY_EVENT_WINDOW_DURATION_MS = (2 * WEEKLY_EVENT_DAY_MS) + (60 * 1000)
export const TURKIYE_UTC_OFFSET_MS = 3 * 60 * 60 * 1000
export const TURKIYE_TIMEZONE = 'Europe/Istanbul'
export const WEEKLY_EVENT_ICON_BY_TYPE = {
  xp: '/home/ui/hud/xp-icon.png',
  discount: '/home/icons/depot/cash.png',
  standard: '/home/icons/v2/nav-home.png',
}
export const WEEKLY_EVENT_FALLBACK_SCHEDULE = [
  { dayIndex: 1, eventType: 'standard', title: 'Standart Gün', description: 'Ek haftalık bonus bulunmuyor.', bonusLabel: 'Standart' },
  { dayIndex: 2, eventType: 'discount', title: 'Tahsilat Gider İndirimi', description: 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.', bonusLabel: '-%25 Gider' },
  { dayIndex: 3, eventType: 'discount', title: 'Tahsilat Gider İndirimi', description: 'İşletme ve fabrika tahsilatlarında giderler %25 düşer.', bonusLabel: '-%25 Gider' },
  { dayIndex: 4, eventType: 'standard', title: 'Standart Gün', description: 'Ek haftalık bonus bulunmuyor.', bonusLabel: 'Standart' },
  { dayIndex: 5, eventType: 'standard', title: 'Standart Gün', description: 'Ek haftalık bonus bulunmuyor.', bonusLabel: 'Standart' },
  { dayIndex: 6, eventType: 'xp', title: 'Tahsilat XP Etkinliği', description: 'Fabrika ve işletme tahsilatlarında 2x XP kazanılır.', bonusLabel: '2x XP' },
  { dayIndex: 0, eventType: 'xp', title: 'Tahsilat XP Etkinliği', description: 'Fabrika ve işletme tahsilatlarında 2x XP kazanılır.', bonusLabel: '2x XP' },
]

export const FUEL_MULTIPLIER_BY_TEMPLATE = {
  'moto-rental': 1,
  'auto-rental': 2,
  'property-rental': 3,
  logistics: 4,
}
export const BUSINESS_EXPENSE_MULTIPLIER = 3

export const NEWS_HIDDEN_TRANSACTION_KINDS = new Set([
  'factory_upgrade_speedup',
  'factory_build_speedup',
])

export const MOJIBAKE_TEXT_PATTERN =
  /(?:\u00c3[\u0080-\u00bf]|\u00c4[\u0080-\u00bf]|\u00c5[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2\u20ac[\u0080-\u00bf]|\u00e2\u20ac\u2122|\u00e2\u20ac\u00a2|\ufffd)/
export const MOJIBAKE_REPLACEMENTS = new Map([
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
