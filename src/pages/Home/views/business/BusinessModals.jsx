import { renderBusinessTradeModals } from './BusinessTradeModals.jsx'
import { renderBusinessCollectModals } from './BusinessCollectModals.jsx'
import { renderBusinessSetupModals } from './BusinessSetupModals.jsx'

export function renderBusinessModals(hp) {
  return (
    <>
      {renderBusinessTradeModals(hp)}
      {renderBusinessCollectModals(hp)}
      {renderBusinessSetupModals(hp)}
    </>
  )
}
