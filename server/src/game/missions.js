export const MISSION_BATCH_SIZE = 5
export const MISSION_BATCH_COOLDOWN_MS = 4 * 60 * 60 * 1000

const MISSION_CASH_MULTIPLIER = 5
const MISSION_XP_MULTIPLIER = 0.36
const MISSION_REWARD_BALANCE_VERSION = '2026-03-20-reward-v5'
const MISSION_PREVIOUS_REWARD_BALANCE_VERSION = '2026-03-19-reward-v4'
const MISSION_PREVIOUS_REWARD_BALANCE_V3 = '2026-03-19-reward-v3'
const MISSION_PREVIOUS_REWARD_BALANCE_V2 = '2026-03-19-reward-v2'
const MISSION_REBALANCE_CASH_FROM_V4_FACTOR = 0.9
const MISSION_REBALANCE_CASH_FACTOR = 1.75
const MISSION_REBALANCE_XP_FACTOR = 0.4
const MISSION_REBALANCE_XP_FROM_V2_FACTOR = 1 / 3
const MISSION_CASH_DIFFICULTY_MIN_SCALE = 0.62
const MISSION_CASH_DIFFICULTY_MAX_SCALE = 1.14
const MISSION_RESOURCE_BASE_REDUCTION_FACTOR = 0.5
const MISSION_RESOURCE_DIFFICULTY_MIN_SCALE = 0.58
const MISSION_RESOURCE_DIFFICULTY_MAX_SCALE = 1.2
const MISSION_BUSINESS_COUNT_MAX_TARGET = 4
const MISSION_BANK_TERM_OPEN_MAX_TARGET = 4
const MISSION_DEFAULT_ICON = '/home/icons/v2/nav-missions.png'
const TR_NUMBER_FORMAT = new Intl.NumberFormat('tr-TR')

const MISSION_BLUEPRINTS = [
  {
    id: 'biz-income-surge',
    metric: 'business_income',
    title: 'Nakit Akışı',
    description: 'İşletmelerden nakit tahsil et.',
    targetBase: 38000,
    targetPerLevel: 850,
    targetPerCompany: 9000,
    minTarget: 30000,
    maxTarget: 950000,
    rewardCashBase: 12000,
    rewardCashPerLevel: 620,
    rewardCashPerCompany: 4400,
    rewardXpBase: 90,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 14,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { brick: 30, energy: 18 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'biz-income-peak',
    metric: 'business_income',
    title: 'Şirket Tahsilatı',
    description: 'Şirketlerinden yüksek gelir topla.',
    targetBase: 68000,
    targetPerLevel: 1200,
    targetPerCompany: 11000,
    minTarget: 60000,
    maxTarget: 1250000,
    rewardCashBase: 15500,
    rewardCashPerLevel: 760,
    rewardCashPerCompany: 5200,
    rewardXpBase: 110,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 16,
    rewardRepBase: 9,
    rewardRepPerCompany: 2,
    rewardItems: { timber: 24, 'spare-parts': 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'biz-cashflow-drive',
    metric: 'business_income',
    title: 'Kasaya Akış',
    description: 'İşletme kasanı düzenli büyüt.',
    targetBase: 52000,
    targetPerLevel: 980,
    targetPerCompany: 10000,
    minTarget: 42000,
    maxTarget: 1150000,
    rewardCashBase: 13800,
    rewardCashPerLevel: 700,
    rewardCashPerCompany: 5000,
    rewardXpBase: 102,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 15,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 20, energy: 20, brick: 16 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'biz-revenue-marathon',
    metric: 'business_income',
    title: 'Gelir Maratonu',
    description: 'İşletme gelirinde istikrarı koru.',
    targetBase: 92000,
    targetPerLevel: 1600,
    targetPerCompany: 14000,
    minTarget: 76000,
    maxTarget: 1650000,
    rewardCashBase: 17400,
    rewardCashPerLevel: 820,
    rewardCashPerCompany: 5600,
    rewardXpBase: 126,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 17,
    rewardRepBase: 10,
    rewardRepPerCompany: 2,
    rewardItems: { 'spare-parts': 22, timber: 22 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'factory-cycle',
    metric: 'factory_output',
    title: 'Fabrika Üretimi',
    description: 'Fabrikadan ürün tahsil et.',
    targetBase: 160,
    targetPerLevel: 5,
    targetPerCompany: 45,
    minTarget: 120,
    maxTarget: 4200,
    rewardCashBase: 9500,
    rewardCashPerLevel: 480,
    rewardCashPerCompany: 3600,
    rewardXpBase: 80,
    rewardXpPerLevel: 2,
    rewardXpPerCompany: 12,
    rewardRepBase: 6,
    rewardRepPerCompany: 2,
    rewardItems: { cement: 28, timber: 22 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'factory-rush',
    metric: 'factory_output',
    title: 'Üretim Hattı',
    description: 'Fabrikalarda seri üretim yap.',
    targetBase: 280,
    targetPerLevel: 7,
    targetPerCompany: 70,
    minTarget: 180,
    maxTarget: 5200,
    rewardCashBase: 12500,
    rewardCashPerLevel: 520,
    rewardCashPerCompany: 4200,
    rewardXpBase: 92,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 12,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { cement: 35, brick: 26 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'factory-night-shift',
    metric: 'factory_output',
    title: 'Gece Vardiyası',
    description: 'Fabrikada ek üretim al.',
    targetBase: 220,
    targetPerLevel: 6,
    targetPerCompany: 58,
    minTarget: 150,
    maxTarget: 4700,
    rewardCashBase: 11400,
    rewardCashPerLevel: 500,
    rewardCashPerCompany: 3900,
    rewardXpBase: 88,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 12,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { cement: 30, energy: 20, brick: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'factory-masterline',
    metric: 'factory_output',
    title: 'Usta Üretim',
    description: 'Üretim hattını tam kapasite çalıştır.',
    targetBase: 360,
    targetPerLevel: 9,
    targetPerCompany: 84,
    minTarget: 240,
    maxTarget: 6200,
    rewardCashBase: 14800,
    rewardCashPerLevel: 620,
    rewardCashPerCompany: 4600,
    rewardXpBase: 108,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 14,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 12, 'spare-parts': 16, cement: 24 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'mine-dig',
    metric: 'mine_output',
    title: 'Maden Kazısı',
    description: 'Madenlerden kaynak topla.',
    targetBase: 140,
    targetPerLevel: 4,
    targetPerCompany: 36,
    minTarget: 100,
    maxTarget: 3600,
    rewardCashBase: 9800,
    rewardCashPerLevel: 460,
    rewardCashPerCompany: 3400,
    rewardXpBase: 78,
    rewardXpPerLevel: 2,
    rewardXpPerCompany: 11,
    rewardRepBase: 6,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 28, energy: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'mine-deep',
    metric: 'mine_output',
    title: 'Derin Kazma',
    description: 'Madenlerden daha fazla çıktı al.',
    targetBase: 240,
    targetPerLevel: 6,
    targetPerCompany: 52,
    minTarget: 170,
    maxTarget: 4200,
    rewardCashBase: 12200,
    rewardCashPerLevel: 520,
    rewardCashPerCompany: 3900,
    rewardXpBase: 92,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 12,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 34, 'engine-kit': 14 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'mine-shaft-expansion',
    metric: 'mine_output',
    title: 'Ocak Genişletme',
    description: 'Maden sahasından sürekli çıktı al.',
    targetBase: 190,
    targetPerLevel: 5,
    targetPerCompany: 44,
    minTarget: 130,
    maxTarget: 3900,
    rewardCashBase: 10800,
    rewardCashPerLevel: 500,
    rewardCashPerCompany: 3700,
    rewardXpBase: 84,
    rewardXpPerLevel: 2,
    rewardXpPerCompany: 11,
    rewardRepBase: 6,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 24, energy: 20, steel: 12 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'mine-heavy-yield',
    metric: 'mine_output',
    title: 'Yüksek Tenör',
    description: 'Madenden yüksek hacimli kaynak topla.',
    targetBase: 330,
    targetPerLevel: 8,
    targetPerCompany: 70,
    minTarget: 220,
    maxTarget: 5600,
    rewardCashBase: 14200,
    rewardCashPerLevel: 620,
    rewardCashPerCompany: 4600,
    rewardXpBase: 106,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 13,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 10, coal: 30, copper: 26 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'vehicle-buy',
    metric: 'vehicle_purchase',
    title: 'Araç Alımı',
    description: 'Filoya yeni araç ekle.',
    targetBase: 1,
    targetPerLevel: 0.04,
    targetPerCompany: 0.45,
    minTarget: 1,
    maxTarget: 14,
    rewardCashBase: 10500,
    rewardCashPerLevel: 430,
    rewardCashPerCompany: 3200,
    rewardXpBase: 86,
    rewardXpPerLevel: 2,
    rewardXpPerCompany: 12,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 16, 'spare-parts': 24 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'vehicle-fleet-upsize',
    metric: 'vehicle_purchase',
    title: 'Filo Büyütme',
    description: 'Filona yeni araçlar kazandır.',
    targetBase: 2,
    targetPerLevel: 0.05,
    targetPerCompany: 0.52,
    minTarget: 2,
    maxTarget: 16,
    rewardCashBase: 13000,
    rewardCashPerLevel: 520,
    rewardCashPerCompany: 3800,
    rewardXpBase: 96,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 13,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 18, 'spare-parts': 28, oil: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'vehicle-modernize',
    metric: 'vehicle_purchase',
    title: 'Filo Yenileme',
    description: 'Daha güçlü araçlarla filonu güncelle.',
    targetBase: 3,
    targetPerLevel: 0.06,
    targetPerCompany: 0.58,
    minTarget: 2,
    maxTarget: 18,
    rewardCashBase: 15200,
    rewardCashPerLevel: 610,
    rewardCashPerCompany: 4300,
    rewardXpBase: 112,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 14,
    rewardRepBase: 9,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 20, 'spare-parts': 32, energy: 18 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-buy',
    metric: 'buy_units',
    title: 'Pazar Alımı',
    description: 'Pazardan birim satın al.',
    targetBase: 85,
    targetPerLevel: 2,
    targetPerCompany: 30,
    minTarget: 60,
    maxTarget: 3200,
    rewardCashBase: 9200,
    rewardCashPerLevel: 430,
    rewardCashPerCompany: 3200,
    rewardXpBase: 76,
    rewardXpPerLevel: 2,
    rewardXpPerCompany: 11,
    rewardRepBase: 6,
    rewardRepPerCompany: 2,
    rewardItems: { timber: 20, brick: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-bulk',
    metric: 'buy_units',
    title: 'Toplu Sipariş',
    description: 'Pazardan toplu birim satın al.',
    targetBase: 150,
    targetPerLevel: 3,
    targetPerCompany: 40,
    minTarget: 100,
    maxTarget: 4400,
    rewardCashBase: 11600,
    rewardCashPerLevel: 500,
    rewardCashPerCompany: 3600,
    rewardXpBase: 88,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 12,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { cement: 22, energy: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-procurement',
    metric: 'buy_units',
    title: 'Tedarik Operasyonu',
    description: 'Pazardan düzenli stok girişi yap.',
    targetBase: 120,
    targetPerLevel: 3,
    targetPerCompany: 34,
    minTarget: 80,
    maxTarget: 3800,
    rewardCashBase: 10400,
    rewardCashPerLevel: 460,
    rewardCashPerCompany: 3400,
    rewardXpBase: 82,
    rewardXpPerLevel: 2,
    rewardXpPerCompany: 11,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { timber: 24, cement: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-demand-wave',
    metric: 'buy_units',
    title: 'Talep Dalgası',
    description: 'Pazardaki arzı fırsata çevir.',
    targetBase: 210,
    targetPerLevel: 4,
    targetPerCompany: 48,
    minTarget: 140,
    maxTarget: 5200,
    rewardCashBase: 13400,
    rewardCashPerLevel: 560,
    rewardCashPerCompany: 4000,
    rewardXpBase: 98,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 13,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { brick: 24, energy: 22, oil: 18 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'business-network',
    metric: 'business_count',
    title: 'İşletme Ağı',
    description: 'Belirli sayıda işletmeyi aktif tut.',
    targetBase: 2,
    targetPerLevel: 0.05,
    targetPerCompany: 0.34,
    minTarget: 2,
    maxTarget: 4,
    rewardCashBase: 14600,
    rewardCashPerLevel: 560,
    rewardCashPerCompany: 3200,
    rewardXpBase: 98,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 11,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { energy: 24, oil: 18 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'business-chain',
    metric: 'business_count',
    title: 'Şirket Zinciri',
    description: 'Daha fazla işletmeyi aynı anda aktif tut.',
    targetBase: 3,
    targetPerLevel: 0.06,
    targetPerCompany: 0.44,
    minTarget: 3,
    maxTarget: 4,
    rewardCashBase: 17200,
    rewardCashPerLevel: 640,
    rewardCashPerCompany: 3600,
    rewardXpBase: 118,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 12,
    rewardRepBase: 10,
    rewardRepPerCompany: 2,
    rewardItems: { 'spare-parts': 20, brick: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'business-portfolio',
    metric: 'business_count',
    title: 'Portföy Yönetimi',
    description: 'İşletme portföyünü istikrarlı şekilde koru.',
    targetBase: 2,
    targetPerLevel: 0.05,
    targetPerCompany: 0.4,
    minTarget: 2,
    maxTarget: 4,
    rewardCashBase: 15800,
    rewardCashPerLevel: 590,
    rewardCashPerCompany: 3400,
    rewardXpBase: 106,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 12,
    rewardRepBase: 9,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 22, energy: 22, 'spare-parts': 14 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-sell',
    metric: 'sell_value',
    title: 'Satış Hedefi',
    description: 'Pazarda satış hacmine ulaş.',
    targetBase: 95000,
    targetPerLevel: 2100,
    targetPerCompany: 25000,
    minTarget: 70000,
    maxTarget: 2200000,
    rewardCashBase: 13800,
    rewardCashPerLevel: 640,
    rewardCashPerCompany: 4600,
    rewardXpBase: 104,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 14,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { 'spare-parts': 22, oil: 24 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-turnover',
    metric: 'sell_value',
    title: 'Pazar Cirosu',
    description: 'Yüksek satış cirosu elde et.',
    targetBase: 165000,
    targetPerLevel: 2700,
    targetPerCompany: 36000,
    minTarget: 120000,
    maxTarget: 3600000,
    rewardCashBase: 16500,
    rewardCashPerLevel: 760,
    rewardCashPerCompany: 5200,
    rewardXpBase: 120,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 15,
    rewardRepBase: 9,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 14, 'spare-parts': 18, brick: 16 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-profit-lane',
    metric: 'sell_value',
    title: 'Kazanç Hattı',
    description: 'Pazarda satıştan nakit üret.',
    targetBase: 130000,
    targetPerLevel: 2300,
    targetPerCompany: 30000,
    minTarget: 90000,
    maxTarget: 2850000,
    rewardCashBase: 15200,
    rewardCashPerLevel: 700,
    rewardCashPerCompany: 4900,
    rewardXpBase: 112,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 14,
    rewardRepBase: 9,
    rewardRepPerCompany: 2,
    rewardItems: { 'spare-parts': 20, oil: 20, brick: 16 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'market-merchant-crown',
    metric: 'sell_value',
    title: 'Tüccar Tacı',
    description: 'Yüksek satış hacmiyle piyasaya hakim ol.',
    targetBase: 220000,
    targetPerLevel: 3100,
    targetPerCompany: 42000,
    minTarget: 150000,
    maxTarget: 4200000,
    rewardCashBase: 18200,
    rewardCashPerLevel: 820,
    rewardCashPerCompany: 5600,
    rewardXpBase: 130,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 16,
    rewardRepBase: 10,
    rewardRepPerCompany: 2,
    rewardItems: { 'engine-kit': 16, 'spare-parts': 20, oil: 24 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'bank-deposit-saver',
    metric: 'bank_deposit',
    title: 'Banka Tasarrufu',
    description: 'Banka hesabına net mevduat aktar.',
    targetBase: 90000,
    targetPerLevel: 2000,
    targetPerCompany: 26000,
    minTarget: 70000,
    maxTarget: 1700000,
    rewardCashBase: 11800,
    rewardCashPerLevel: 540,
    rewardCashPerCompany: 3900,
    rewardXpBase: 90,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 12,
    rewardRepBase: 7,
    rewardRepPerCompany: 2,
    rewardItems: { energy: 22, timber: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'bank-deposit-treasury',
    metric: 'bank_deposit',
    title: 'Hazine Birikimi',
    description: 'Bankada daha yüksek net birikim yap.',
    targetBase: 180000,
    targetPerLevel: 3000,
    targetPerCompany: 42000,
    minTarget: 130000,
    maxTarget: 2600000,
    rewardCashBase: 15000,
    rewardCashPerLevel: 700,
    rewardCashPerCompany: 5000,
    rewardXpBase: 112,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 14,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { 'spare-parts': 16, brick: 20, oil: 20 },
    icon: MISSION_DEFAULT_ICON,
  },
  {
    id: 'bank-term-starter',
    metric: 'bank_term_open',
    title: 'Vadeli Açılışı',
    description: 'Vadeli hesap açarak birikimini değerlendir.',
    targetBase: 1,
    targetPerLevel: 0.01,
    targetPerCompany: 0.14,
    minTarget: 1,
    maxTarget: 4,
    rewardCashBase: 14200,
    rewardCashPerLevel: 640,
    rewardCashPerCompany: 4200,
    rewardXpBase: 108,
    rewardXpPerLevel: 3,
    rewardXpPerCompany: 13,
    rewardRepBase: 8,
    rewardRepPerCompany: 2,
    rewardItems: { energy: 24, 'engine-kit': 10 },
    icon: MISSION_DEFAULT_ICON,
    minCompanyLevel: 2,
  },
  {
    id: 'logistics-cash-route',
    metric: 'logistics_income',
    title: 'Lojistik Tahsilatı',
    description: 'Tır kiralama gelirini topla.',
    targetBase: 180000,
    targetPerLevel: 3600,
    targetPerCompany: 48000,
    minTarget: 140000,
    maxTarget: 3400000,
    rewardCashBase: 15600,
    rewardCashPerLevel: 740,
    rewardCashPerCompany: 5200,
    rewardXpBase: 118,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 15,
    rewardRepBase: 9,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 26, energy: 22, 'spare-parts': 14 },
    icon: MISSION_DEFAULT_ICON,
    minCompanyLevel: 3,
  },
  {
    id: 'logistics-cash-fleet',
    metric: 'logistics_income',
    title: 'Filo Gelir Döngüsü',
    description: 'Lojistik filondan yüksek net tahsilat al.',
    targetBase: 320000,
    targetPerLevel: 5000,
    targetPerCompany: 70000,
    minTarget: 220000,
    maxTarget: 5200000,
    rewardCashBase: 18600,
    rewardCashPerLevel: 860,
    rewardCashPerCompany: 6200,
    rewardXpBase: 136,
    rewardXpPerLevel: 4,
    rewardXpPerCompany: 16,
    rewardRepBase: 10,
    rewardRepPerCompany: 2,
    rewardItems: { oil: 30, energy: 26, 'engine-kit': 12 },
    icon: MISSION_DEFAULT_ICON,
    minCompanyLevel: 3,
  },
]
const MISSION_BLUEPRINT_BY_ID = new Map(MISSION_BLUEPRINTS.map((entry) => [String(entry.id || '').trim(), entry]))

function toNumber(value, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function asInt(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback))
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function createdMs(value) {
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

function toIsoOrFallback(value, fallbackIso) {
  const ms = createdMs(value)
  if (ms <= 0) return fallbackIso
  return new Date(ms).toISOString()
}

function formatMetricAmount(value) {
  return TR_NUMBER_FORMAT.format(Math.max(0, asInt(value, 0)))
}

function missionActionText(metric, target) {
  const safeMetric = String(metric || '').trim()
  const safeTarget = Math.max(1, asInt(target, 1))
  if (safeMetric === 'business_income') {
    return `İşletmelerinden toplam ${formatMetricAmount(safeTarget)} nakit tahsil et`
  }
  if (safeMetric === 'factory_output') {
    return `Fabrikalardan toplam ${formatMetricAmount(safeTarget)} ürün tahsil et`
  }
  if (safeMetric === 'mine_output') {
    return `Madenlerden toplam ${formatMetricAmount(safeTarget)} kaynak topla`
  }
  if (safeMetric === 'vehicle_purchase') {
    return `Filona toplam ${formatMetricAmount(safeTarget)} yeni araç ekle`
  }
  if (safeMetric === 'buy_units') {
    return `Pazardan toplam ${formatMetricAmount(safeTarget)} birim satın al`
  }
  if (safeMetric === 'sell_value') {
    return `Pazarda toplam ${formatMetricAmount(safeTarget)} nakitlik satış yap`
  }
  if (safeMetric === 'business_count') {
    return `En az ${formatMetricAmount(safeTarget)} işletmeyi aktif tut`
  }
  if (safeMetric === 'bank_deposit') {
    return `Bankaya toplam ${formatMetricAmount(safeTarget)} net mevduat aktar`
  }
  if (safeMetric === 'bank_term_open') {
    return `Toplam ${formatMetricAmount(safeTarget)} adet vadeli hesap aç`
  }
  if (safeMetric === 'logistics_income') {
    return `Lojistikten toplam ${formatMetricAmount(safeTarget)} net tahsilat topla`
  }
  return ''
}

function missionDescriptionText(metric, target, fallbackDescription = '') {
  const actionText = missionActionText(metric, target)
  if (actionText) return `Hedef: ${actionText}.`
  const safeFallback = String(fallbackDescription || '').trim()
  if (safeFallback) return safeFallback
  return `Hedef: ${formatMetricAmount(target)} ilerleme tamamla.`
}

function normalizeTargetByMetric(metric, target) {
  const safeMetric = String(metric || '').trim()
  const safeTarget = Math.max(1, asInt(target, 1))
  if (safeMetric === 'business_count') {
    return clamp(safeTarget, 1, MISSION_BUSINESS_COUNT_MAX_TARGET)
  }
  if (safeMetric === 'bank_term_open') {
    return clamp(safeTarget, 1, MISSION_BANK_TERM_OPEN_MAX_TARGET)
  }
  return safeTarget
}

function missionDifficultyRatio(blueprint, target) {
  const minTarget = Math.max(1, asInt(blueprint?.minTarget, 1))
  const maxTarget = Math.max(minTarget, asInt(blueprint?.maxTarget, minTarget))
  if (maxTarget <= minTarget) return 0.5
  return clamp((Math.max(minTarget, asInt(target, minTarget)) - minTarget) / (maxTarget - minTarget), 0, 1)
}

function missionDifficultyRatioFromEntry(entry, target) {
  const blueprintId = String(entry?.blueprintId || '').trim()
  if (!blueprintId) return 0.5
  const blueprint = MISSION_BLUEPRINT_BY_ID.get(blueprintId)
  if (!blueprint) return 0.5
  return missionDifficultyRatio(blueprint, target)
}

function missionDifficultyScale(ratio, minScale, maxScale) {
  const safeRatio = clamp(toNumber(ratio, 0.5), 0, 1)
  return minScale + (maxScale - minScale) * safeRatio
}

function rebalanceMissionRewards(entry, rewardCash, rewardXp, difficultyRatio = 0.5) {
  const currentVersion = String(entry?.rewardBalanceVersion || '').trim()
  const cashDifficultyScale = missionDifficultyScale(
    difficultyRatio,
    MISSION_CASH_DIFFICULTY_MIN_SCALE,
    MISSION_CASH_DIFFICULTY_MAX_SCALE,
  )
  if (currentVersion === MISSION_REWARD_BALANCE_VERSION) {
    return {
      rewardCash: Math.max(0, asInt(rewardCash, 0)),
      rewardXp: Math.max(0, asInt(rewardXp, 0)),
      rewardRep: 0,
      rewardBalanceVersion: MISSION_REWARD_BALANCE_VERSION,
    }
  }
  if (currentVersion === MISSION_PREVIOUS_REWARD_BALANCE_VERSION) {
    return {
      rewardCash: Math.max(
        0,
        Math.round(
          Math.max(0, asInt(rewardCash, 0)) *
            MISSION_REBALANCE_CASH_FROM_V4_FACTOR *
            cashDifficultyScale,
        ),
      ),
      rewardXp: Math.max(0, asInt(rewardXp, 0)),
      rewardRep: 0,
      rewardBalanceVersion: MISSION_REWARD_BALANCE_VERSION,
    }
  }
  if (currentVersion === MISSION_PREVIOUS_REWARD_BALANCE_V3) {
    return {
      rewardCash: Math.max(0, Math.round(Math.max(0, asInt(rewardCash, 0)) * cashDifficultyScale)),
      rewardXp: Math.max(0, asInt(rewardXp, 0)),
      rewardRep: 0,
      rewardBalanceVersion: MISSION_REWARD_BALANCE_VERSION,
    }
  }
  if (currentVersion === MISSION_PREVIOUS_REWARD_BALANCE_V2) {
    return {
      rewardCash: Math.max(0, Math.round(Math.max(0, asInt(rewardCash, 0)) * cashDifficultyScale)),
      rewardXp: Math.max(0, Math.round(Math.max(0, asInt(rewardXp, 0)) * MISSION_REBALANCE_XP_FROM_V2_FACTOR)),
      rewardRep: 0,
      rewardBalanceVersion: MISSION_REWARD_BALANCE_VERSION,
    }
  }
  return {
    rewardCash: Math.max(
      0,
      Math.round(Math.max(0, asInt(rewardCash, 0)) * MISSION_REBALANCE_CASH_FACTOR * cashDifficultyScale),
    ),
    rewardXp: Math.max(0, Math.round(Math.max(0, asInt(rewardXp, 0)) * MISSION_REBALANCE_XP_FACTOR)),
    rewardRep: 0,
    rewardBalanceVersion: MISSION_REWARD_BALANCE_VERSION,
  }
}

function rebalanceMissionRewardItems(entry, rewardItems, difficultyRatio = 0.5) {
  const currentVersion = String(entry?.rewardBalanceVersion || '').trim()
  if (currentVersion === MISSION_REWARD_BALANCE_VERSION) {
    return scaleRewardItems(rewardItems, 1)
  }
  const resourceDifficultyScale = missionDifficultyScale(
    difficultyRatio,
    MISSION_RESOURCE_DIFFICULTY_MIN_SCALE,
    MISSION_RESOURCE_DIFFICULTY_MAX_SCALE,
  )
  return scaleRewardItems(
    rewardItems,
    MISSION_RESOURCE_BASE_REDUCTION_FACTOR * resourceDifficultyScale,
  )
}

function rawMissionRewards(entry, rewardCash, rewardXp) {
  return {
    rewardCash: Math.max(0, asInt(rewardCash, 0)),
    rewardXp: Math.max(0, asInt(rewardXp, 0)),
    rewardRep: Math.max(0, asInt(entry?.rewardRep, 0)),
    rewardBalanceVersion: String(entry?.rewardBalanceVersion || '').trim(),
  }
}

function shouldDelayClaimedMissionRebalance(entry, status, claimedAt, nowIso) {
  const safeStatus = String(status || '').trim().toLowerCase()
  if (safeStatus !== 'claimed' && !claimedAt) return false

  const nowMs = createdMs(nowIso)
  if (nowMs <= 0) return false

  const claimedMs =
    createdMs(claimedAt) ||
    createdMs(entry?.claimedAt) ||
    createdMs(entry?.updatedAt) ||
    createdMs(entry?.createdAt)
  if (claimedMs <= 0) return false

  return nowMs < claimedMs + MISSION_BATCH_COOLDOWN_MS
}

function scaleRewardItems(rewardItems, multiplier = 1) {
  if (!rewardItems || typeof rewardItems !== 'object' || Array.isArray(rewardItems)) return {}
  const mult = Math.max(0, toNumber(multiplier, 1))
  const out = {}
  for (const [itemId, qty] of Object.entries(rewardItems)) {
    const safeItemId = String(itemId || '').trim()
    if (!safeItemId) continue
    const safeQty = Math.max(0, Math.trunc(toNumber(qty, 0)))
    if (safeQty <= 0) continue
    const scaled = Math.max(0, Math.round(safeQty * mult))
    if (scaled <= 0) continue
    out[safeItemId] = scaled
  }
  return out
}

function hashSeedString(text) {
  const source = String(text || '')
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandomFactory(seed) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function randomBetween(rng, min, max) {
  if (max <= min) return min
  return min + rng() * (max - min)
}

function shuffleWithRng(list, rng) {
  const copy = list.slice()
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(rng() * (index + 1))
    if (pick === index) continue
    const temp = copy[index]
    copy[index] = copy[pick]
    copy[pick] = temp
  }
  return copy
}

function normalizeMissionStatus(rawStatus, progress, target, claimedAt) {
  const safeStatus = String(rawStatus || '').trim().toLowerCase()
  if (safeStatus === 'claimed' || claimedAt) return 'claimed'
  if (progress >= target) return 'claimable'
  return 'active'
}

function missionContext(options) {
  const level = Math.max(1, asInt(options?.level, 1))
  const companyLevel = Math.max(1, asInt(options?.companyLevel, 1))
  const businessCount = Math.max(0, asInt(options?.businessCount, 0))
  const batchIndex = Math.max(1, asInt(options?.batchIndex, 1))
  const userId = String(options?.userId || '').trim() || 'user'
  return {
    level,
    companyLevel,
    businessCount,
    batchIndex,
    userId,
  }
}

function blueprintMeetsContext(blueprint, context) {
  const minLevel = Math.max(1, asInt(blueprint?.minLevel, 1))
  const minCompanyLevel = Math.max(1, asInt(blueprint?.minCompanyLevel, 1))
  const maxCompanyLevelRaw = asInt(blueprint?.maxCompanyLevel, 0)
  const maxCompanyLevel =
    maxCompanyLevelRaw > 0 ? Math.max(minCompanyLevel, maxCompanyLevelRaw) : Number.POSITIVE_INFINITY

  if (context.level < minLevel) return false
  if (context.companyLevel < minCompanyLevel) return false
  if (context.companyLevel > maxCompanyLevel) return false
  return true
}

function pickBlueprints(options) {
  const count = Math.max(1, asInt(options?.count, MISSION_BATCH_SIZE))
  const context = missionContext(options)
  const seedSource = `${context.userId}|${context.batchIndex}|${context.level}|${context.companyLevel}|${context.businessCount}|${count}`
  const rng = seededRandomFactory(hashSeedString(seedSource))
  const eligibleBlueprints = MISSION_BLUEPRINTS.filter((blueprint) => blueprintMeetsContext(blueprint, context))
  const sourceBlueprints = eligibleBlueprints.length >= count ? eligibleBlueprints : MISSION_BLUEPRINTS

  const metricGroups = new Map()
  for (const blueprint of sourceBlueprints) {
    const metric = String(blueprint.metric || '').trim()
    if (!metric) continue
    if (!metricGroups.has(metric)) metricGroups.set(metric, [])
    metricGroups.get(metric).push(blueprint)
  }

  for (const [metric, entries] of metricGroups.entries()) {
    metricGroups.set(metric, shuffleWithRng(entries, rng))
  }

  const selected = []
  const selectedSet = new Set()
  const shuffledMetrics = shuffleWithRng(Array.from(metricGroups.keys()), rng)

  for (const metric of shuffledMetrics) {
    if (selected.length >= count) break
    const entries = metricGroups.get(metric) || []
    const next = entries.pop()
    if (!next) continue
    selected.push(next)
    selectedSet.add(next.id)
  }

  const remainingPool = shuffleWithRng(
    sourceBlueprints.filter((entry) => !selectedSet.has(entry.id)),
    rng,
  )
  for (const blueprint of remainingPool) {
    if (selected.length >= count) break
    selected.push(blueprint)
  }

  const previousBlueprintIds = Array.isArray(options?.previousBlueprintIds)
    ? options.previousBlueprintIds.map((value) => String(value || '').trim()).filter(Boolean)
    : []
  if (previousBlueprintIds.length >= count) {
    const currentIds = selected.slice(0, count).map((entry) => entry.id)
    const previousIds = previousBlueprintIds.slice(0, count)
    const previousKey = previousIds.join('|')
    const currentSetKey = currentIds.slice().sort().join('|')
    const previousSetKey = previousIds.slice().sort().join('|')
    if (currentSetKey === previousSetKey) {
      const previousSet = new Set(previousIds)
      const fallbackPool = shuffleWithRng(
        sourceBlueprints.filter((entry) => !currentIds.includes(entry.id)),
        rng,
      )
      const replacement = fallbackPool.find((entry) => !previousSet.has(entry.id)) || fallbackPool[0] || null
      if (replacement) {
        selected[0] = replacement
      }
      const nextKey = selected.slice(0, count).map((entry) => entry.id).join('|')
      if (nextKey === previousKey && selected.length > 1) {
        const first = selected.shift()
        if (first) selected.push(first)
      }
    }
  }

  return selected.slice(0, count)
}

function buildMissionFromBlueprint(blueprint, nowIso, slotIndex, options, rng) {
  const context = missionContext(options)
  const levelScale = 1 + Math.log2(context.level + 1) * 0.22
  const companyScale = 1 + (context.companyLevel - 1) * 0.18
  const totalScale = levelScale * companyScale

  const rawTarget =
    (toNumber(blueprint.targetBase, 1) +
      context.level * toNumber(blueprint.targetPerLevel, 0) +
      (context.companyLevel - 1) * toNumber(blueprint.targetPerCompany, 0)) *
    randomBetween(rng, 0.9, 1.16)
  const targetRaw = clamp(
    Math.max(1, Math.round(rawTarget)),
    Math.max(1, asInt(blueprint.minTarget, 1)),
    Math.max(1, asInt(blueprint.maxTarget, Math.max(1, Math.round(rawTarget)))),
  )
  const target = normalizeTargetByMetric(blueprint.metric, targetRaw)
  const difficultyRatio = missionDifficultyRatio(blueprint, target)
  const cashDifficultyScale = missionDifficultyScale(
    difficultyRatio,
    MISSION_CASH_DIFFICULTY_MIN_SCALE,
    MISSION_CASH_DIFFICULTY_MAX_SCALE,
  )
  const resourceDifficultyScale = missionDifficultyScale(
    difficultyRatio,
    MISSION_RESOURCE_DIFFICULTY_MIN_SCALE,
    MISSION_RESOURCE_DIFFICULTY_MAX_SCALE,
  )

  const rewardScale = randomBetween(rng, 0.92, 1.18)
  const rewardCashRaw =
    (toNumber(blueprint.rewardCashBase, 0) +
      context.level * toNumber(blueprint.rewardCashPerLevel, 0) +
      (context.companyLevel - 1) * toNumber(blueprint.rewardCashPerCompany, 0)) *
    rewardScale
  const rewardXpRaw =
    (toNumber(blueprint.rewardXpBase, 0) +
      context.level * toNumber(blueprint.rewardXpPerLevel, 0) +
      (context.companyLevel - 1) * toNumber(blueprint.rewardXpPerCompany, 0)) *
    randomBetween(rng, 0.95, 1.15)

  const rewardItems = scaleRewardItems(
    blueprint.rewardItems,
    Math.max(
      0.35,
      totalScale *
        randomBetween(rng, 0.88, 1.24) *
        MISSION_RESOURCE_BASE_REDUCTION_FACTOR *
        resourceDifficultyScale,
    ),
  )

  const missionId = `mission-${context.batchIndex}-${`${slotIndex + 1}`.padStart(2, '0')}-${blueprint.id}`
  const missionDescription = missionDescriptionText(
    blueprint.metric,
    target,
    blueprint.description,
  )

  return {
    id: missionId,
    blueprintId: blueprint.id,
    title: String(blueprint.title || 'Görev').trim() || 'Görev',
    description: missionDescription,
    icon: String(blueprint.icon || MISSION_DEFAULT_ICON).trim() || MISSION_DEFAULT_ICON,
    metric: String(blueprint.metric || '').trim(),
    target,
    progress: 0,
    rewardCash: Math.max(
      0,
      Math.round(rewardCashRaw * MISSION_CASH_MULTIPLIER * cashDifficultyScale),
    ),
    rewardXp: Math.max(0, Math.round(rewardXpRaw * MISSION_XP_MULTIPLIER)),
    rewardRep: 0,
    rewardItems,
    rewardBalanceVersion: MISSION_REWARD_BALANCE_VERSION,
    status: 'active',
    createdAt: nowIso,
    updatedAt: nowIso,
    claimedAt: null,
  }
}

function normalizeMissionEntry(entry, nowIso) {
  const safeId = String(entry?.id || '').trim()
  const safeMetric = String(entry?.metric || '').trim()
  const safeTarget = normalizeTargetByMetric(safeMetric, entry?.target)
  const safeProgress = clamp(asInt(entry?.progress, 0), 0, safeTarget)
  const safeClaimedAt = entry?.claimedAt ? toIsoOrFallback(entry.claimedAt, '') : ''
  const status = normalizeMissionStatus(entry?.status, safeProgress, safeTarget, safeClaimedAt)
  const difficultyRatio = missionDifficultyRatioFromEntry(entry, safeTarget)
  const rewardCash = Math.max(0, asInt(entry?.rewardCash, 0))
  const rewardXp = Math.max(0, asInt(entry?.rewardXp, 0))
  const delayClaimedRebalance = shouldDelayClaimedMissionRebalance(entry, status, safeClaimedAt, nowIso)
  const balancedRewards = delayClaimedRebalance
    ? rawMissionRewards(entry, rewardCash, rewardXp)
    : rebalanceMissionRewards(entry, rewardCash, rewardXp, difficultyRatio)
  const baseRewardItems = entry?.rewardItems || entry?.reward?.rewardItems || {}
  const balancedRewardItems = delayClaimedRebalance
    ? scaleRewardItems(baseRewardItems, 1)
    : rebalanceMissionRewardItems(entry, baseRewardItems, difficultyRatio)

  return {
    id: safeId,
    blueprintId: String(entry?.blueprintId || '').trim(),
    title: String(entry?.title || 'Görev').trim() || 'Görev',
    description: missionDescriptionText(
      safeMetric,
      safeTarget,
      String(entry?.description || '').trim(),
    ),
    icon: String(entry?.icon || MISSION_DEFAULT_ICON).trim() || MISSION_DEFAULT_ICON,
    metric: safeMetric,
    target: safeTarget,
    progress: status === 'claimed' ? safeTarget : safeProgress,
    rewardCash: balancedRewards.rewardCash,
    rewardXp: balancedRewards.rewardXp,
    rewardRep: balancedRewards.rewardRep,
    rewardItems: balancedRewardItems,
    rewardBalanceVersion: balancedRewards.rewardBalanceVersion,
    status,
    createdAt: toIsoOrFallback(entry?.createdAt, nowIso),
    updatedAt: toIsoOrFallback(entry?.updatedAt, nowIso),
    claimedAt: safeClaimedAt || null,
  }
}

export function createInitialMissions(nowIso, options = {}) {
  const safeNowIso = toIsoOrFallback(nowIso, new Date().toISOString())
  const context = missionContext(options)
  const seedSource = `${context.userId}|${context.batchIndex}|${context.level}|${context.companyLevel}|${context.businessCount}`
  const rng = seededRandomFactory(hashSeedString(seedSource))
  const picked = pickBlueprints(options)
  return picked.map((blueprint, index) => buildMissionFromBlueprint(blueprint, safeNowIso, index, options, rng))
}

export function normalizeMissions(missions, nowIso, options = {}) {
  const safeNowIso = toIsoOrFallback(nowIso, new Date().toISOString())
  const safeMaxCount = clamp(asInt(options?.maxCount, MISSION_BATCH_SIZE), 1, 20)
  if (!Array.isArray(missions)) return []

  const normalized = []
  for (const entry of missions) {
    const safeId = String(entry?.id || '').trim()
    const safeMetric = String(entry?.metric || '').trim()
    if (!safeId || !safeMetric) continue
    normalized.push(normalizeMissionEntry(entry, safeNowIso))
  }

  return normalized.slice(0, safeMaxCount)
}

export function syncBusinessCountMission(missions, businessCount, nowIso) {
  if (!Array.isArray(missions)) return
  const safeBusinessCount = Math.max(0, asInt(businessCount, 0))
  for (const mission of missions) {
    if (String(mission?.metric || '').trim() !== 'business_count') continue
    const status = String(mission?.status || '').trim().toLowerCase()
    if (!['active', 'claimable'].includes(status)) continue

    mission.progress = Math.min(Math.max(1, asInt(mission.target, 1)), Math.max(asInt(mission.progress, 0), safeBusinessCount))
    mission.updatedAt = nowIso
    if (mission.progress >= mission.target) {
      mission.status = 'claimable'
    }
  }
}

export function applyMissionProgress(missions, event, nowIso) {
  if (!Array.isArray(missions)) return
  const eventType = String(event?.type || '').trim()
  const eventValue = toNumber(event?.value, 0)
  if (!eventType || eventValue <= 0) return

  for (const mission of missions) {
    const status = String(mission?.status || '').trim().toLowerCase()
    if (!['active', 'claimable'].includes(status)) continue
    if (String(mission?.metric || '').trim() !== eventType) continue

    const target = Math.max(1, asInt(mission.target, 1))
    mission.progress = Math.min(target, Math.max(0, asInt(mission.progress, 0)) + eventValue)
    mission.updatedAt = nowIso
    if (mission.progress >= target) {
      mission.status = 'claimable'
    }
  }
}

export function claimMissionReward(missions, missionId, nowIso) {
  const safeMissionId = String(missionId || '').trim()
  const mission = Array.isArray(missions)
    ? missions.find((entry) => String(entry?.id || '').trim() === safeMissionId)
    : null

  if (!mission) {
    return {
      success: false,
      reason: 'not_found',
      errors: { global: 'Görev bulunamadı.' },
    }
  }

  if (String(mission.status || '').trim().toLowerCase() === 'claimed') {
    return {
      success: false,
      reason: 'already_claimed',
      errors: { global: 'Bu görev ödülü zaten alındı.' },
    }
  }

  if (String(mission.status || '').trim().toLowerCase() !== 'claimable') {
    return {
      success: false,
      reason: 'not_ready',
      errors: { global: 'Bu görev henüz tamamlanmadı.' },
    }
  }

  mission.status = 'claimed'
  mission.claimedAt = nowIso
  mission.updatedAt = nowIso

  return {
    success: true,
    reward: {
      cash: Math.max(0, asInt(mission.rewardCash, 0)),
      xp: Math.max(0, asInt(mission.rewardXp, 0)),
      reputation: Math.max(0, asInt(mission.rewardRep, 0)),
      title: mission.title,
      rewardItems: scaleRewardItems(mission.rewardItems, 1),
    },
  }
}
