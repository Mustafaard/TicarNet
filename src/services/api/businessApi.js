/**
 * businessApi.js — İşletmeler & Lojistik
 * İşletme yönetimi, araç üretimi/satışı ve lojistik operasyonları.
 */
import { gameRequest } from '../apiBase.js'

// ─── İşletmeler ─────────────────────────────────────────────────────────────

/** Tüm işletmeleri ve araç galerisini döner. */
export async function getBusinessesState() {
  return gameRequest('/game/businesses')
}

/** Yeni işletme satın alır. */
export async function buyBusiness(templateId) {
  return gameRequest('/game/businesses/buy', {
    method: 'POST',
    body: { templateId },
  })
}

/** Belirtilen işletmeden gelir tahsilat yapar. */
export async function collectBusinessIncome(businessId) {
  return gameRequest(`/game/businesses/${businessId}/collect`, {
    method: 'POST',
  })
}

/** Birden fazla işletmeden toplu tahsilat yapar. */
export async function collectBusinessesBulk(payload = {}) {
  return gameRequest('/game/businesses/collect/bulk', {
    method: 'POST',
    body: payload,
  })
}

/** İşletme seviyesini artırır. */
export async function upgradeBusinessLevel(businessId) {
  return gameRequest(`/game/businesses/${businessId}/upgrade`, {
    method: 'POST',
  })
}

/** Yeni araç üretir. */
export async function produceBusinessVehicle(businessId, payload = {}) {
  return gameRequest(`/game/businesses/${businessId}/produce-vehicle`, {
    method: 'POST',
    body: payload,
  })
}

/** Bir aracı satışa çıkarır. */
export async function listBusinessVehicle(businessId, payload) {
  return gameRequest(`/game/businesses/${businessId}/list-vehicle`, {
    method: 'POST',
    body: payload,
  })
}

/** Araç pazarındaki satış ilanından araç satın alır. */
export async function buyBusinessVehicleListing(listingId) {
  const safeId = encodeURIComponent(String(listingId || '').trim())
  return gameRequest(`/game/businesses/vehicle-market/${safeId}/buy`, {
    method: 'POST',
  })
}

/** Araç satış ilanını iptal eder. */
export async function cancelBusinessVehicleListing(listingId) {
  const safeId = encodeURIComponent(String(listingId || '').trim())
  return gameRequest(`/game/businesses/vehicle-market/${safeId}/cancel`, {
    method: 'POST',
  })
}

/** Araç satış ilanını hurda eder. */
export async function scrapBusinessVehicleListing(listingId) {
  const safeId = encodeURIComponent(String(listingId || '').trim())
  return gameRequest(`/game/businesses/vehicle-market/${safeId}/scrap`, {
    method: 'POST',
  })
}

/** Garajdaki bir aracı hurda eder. */
export async function scrapBusinessVehicle(businessId, payload = {}) {
  return gameRequest(`/game/businesses/${businessId}/scrap-vehicle`, {
    method: 'POST',
    body: payload,
  })
}

// ─── Lojistik ────────────────────────────────────────────────────────────────

/** Lojistik durumunu, kamyonları ve gelirleri döner. */
export async function getLogisticsState() {
  return gameRequest('/game/logistics')
}

/** Yeni nakliye siparişi oluşturur. */
export async function createLogisticsShipment(payload) {
  return gameRequest('/game/logistics', {
    method: 'POST',
    body: payload,
  })
}

/** Yeni kamyon satın alır. */
export async function purchaseLogisticsTruck(payload) {
  return gameRequest('/game/logistics/trucks', {
    method: 'POST',
    body: payload,
  })
}

/** Bir kamyonu satışa çıkarır. */
export async function listLogisticsTruckForSale(truckId, payload = {}) {
  const safeId = encodeURIComponent(String(truckId || '').trim())
  return gameRequest(`/game/logistics/trucks/${safeId}/list`, {
    method: 'POST',
    body: payload,
  })
}

/** Teslim edilen nakliye siparişini tahsil eder. */
export async function claimLogisticsShipment(shipmentId) {
  return gameRequest(`/game/logistics/${shipmentId}/claim`, {
    method: 'POST',
  })
}

/** Lojistik gelirleri tahsil eder. */
export async function collectLogisticsIncome() {
  return gameRequest('/game/logistics/collect', {
    method: 'POST',
  })
}

/** Belirtilen kamyonu hurda eder. */
export async function scrapLogisticsTruck(truckId) {
  const safeId = encodeURIComponent(String(truckId || '').trim())
  return gameRequest(`/game/logistics/${safeId}/scrap-truck`, {
    method: 'POST',
  })
}
