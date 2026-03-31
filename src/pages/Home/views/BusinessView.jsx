import {
  BUSINESS_DETAIL_TABS,
  COLLECTION_TAX_PERCENT,
  VEHICLE_LIFETIME_MONTHS_TOTAL,
  VEHICLE_MARKET_COMMISSION_PERCENT,
} from '../constants.js'
import { renderBusinessHub } from './business/BusinessHub.jsx'
import { renderBusinessDetail } from './business/BusinessDetail.jsx'
import { renderBusinessGallery } from './business/BusinessGallery.jsx'
import { renderBusinessMarket } from './business/BusinessMarket.jsx'
import { renderBusinessLogistics } from './business/BusinessLogistics.jsx'
import { renderBusinessModals } from './business/BusinessModals.jsx'

export function renderBusinessView(hp) {
  const { businessScene, renderWeeklyEventInlineCard } = hp

  return (
    <section className={`panel-stack business-screen${businessScene !== 'hub' ? ' is-focused' : ''}`}>
      {renderWeeklyEventInlineCard('İşletme ve Lojistik Tahsilat Ekranı')}
      {renderBusinessHub(hp)}
      {renderBusinessDetail(hp)}
      {renderBusinessGallery(hp)}
      {renderBusinessMarket(hp)}
      {renderBusinessLogistics(hp)}
      {renderBusinessModals(hp)}
    </section>
  )
}
