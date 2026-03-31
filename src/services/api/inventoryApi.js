/**
 * inventoryApi.js — Envanter (Köprü)
 * useDataLoaders.js ve diğer eski importların kırılmaması için
 * businessApi, factoryApi ve mineApi'yi burada toplu re-export eder.
 */
export {
  getBusinessesState,
  buyBusiness,
  collectBusinessIncome,
  collectBusinessesBulk,
  upgradeBusinessLevel,
  produceBusinessVehicle,
  listBusinessVehicle,
  buyBusinessVehicleListing,
  cancelBusinessVehicleListing,
  scrapBusinessVehicleListing,
  scrapBusinessVehicle,
  getLogisticsState,
  createLogisticsShipment,
  purchaseLogisticsTruck,
  listLogisticsTruckForSale,
  claimLogisticsShipment,
  collectLogisticsIncome,
  scrapLogisticsTruck,
} from './businessApi.js'

export {
  getFactoriesState,
  buyFactory,
  collectFactory,
  collectFactoriesBulk,
  upgradeFactory,
  speedupFactoryUpgrade,
  speedupFactoryBuild,
} from './factoryApi.js'

export {
  getMinesState,
  startMineDig,
  collectMine,
} from './mineApi.js'
