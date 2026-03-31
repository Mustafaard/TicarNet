export function registerOperationsRoutes(gameRouter, deps) {
  const {
    sendResult,
    getBusinesses,
    getFactories,
    buyFactory,
    collectFactoriesBulk,
    collectFactory,
    upgradeFactory,
    speedupFactoryUpgrade,
    speedupFactoryBuild,
    getMines,
    startMineDig,
    collectMine,
    getLogistics,
    createShipment,
    purchaseLogisticsTruck,
    listLogisticsTruckForSale,
    claimShipment,
    collectLogisticsIncome,
    buyBusiness,
    upgradeBusiness,
    produceBusinessVehicle,
    listBusinessVehicleForSale,
    scrapBusinessVehicle,
    buyVehicleListing,
    cancelVehicleListing,
    scrapVehicleListing,
    scrapLogisticsTruck,
    collectBusiness,
    collectBusinessesBulk,
  } = deps

  gameRouter.get('/businesses', async (req, res, next) => {
    try {
      const result = await getBusinesses(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.get('/factories', async (req, res, next) => {
    try {
      const result = await getFactories(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/factories/buy', async (req, res, next) => {
    try {
      const result = await buyFactory(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/factories/collect/bulk', async (req, res, next) => {
    try {
      const result = await collectFactoriesBulk(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/factories/:factoryId/collect', async (req, res, next) => {
    try {
      const result = await collectFactory(req.auth.userId, req.params.factoryId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/factories/:factoryId/upgrade', async (req, res, next) => {
    try {
      const result = await upgradeFactory(req.auth.userId, req.params.factoryId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/factories/:factoryId/speedup', async (req, res, next) => {
    try {
      const result = await speedupFactoryUpgrade(req.auth.userId, req.params.factoryId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/factories/:factoryId/speedup-build', async (req, res, next) => {
    try {
      const result = await speedupFactoryBuild(req.auth.userId, req.params.factoryId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.get('/mines', async (req, res, next) => {
    try {
      const result = await getMines(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/mines/:mineId/dig', async (req, res, next) => {
    try {
      const result = await startMineDig(req.auth.userId, req.params.mineId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/mines/:mineId/collect', async (req, res, next) => {
    try {
      const result = await collectMine(req.auth.userId, req.params.mineId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.get('/logistics', async (req, res, next) => {
    try {
      const result = await getLogistics(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/logistics', async (req, res, next) => {
    try {
      const result = await createShipment(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/logistics/trucks', async (req, res, next) => {
    try {
      const result = await purchaseLogisticsTruck(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/logistics/trucks/:truckId/list', async (req, res, next) => {
    try {
      const result = await listLogisticsTruckForSale(req.auth.userId, req.params.truckId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/logistics/:shipmentId/claim', async (req, res, next) => {
    try {
      const result = await claimShipment(req.auth.userId, req.params.shipmentId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/logistics/collect', async (req, res, next) => {
    try {
      const result = await collectLogisticsIncome(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/buy', async (req, res, next) => {
    try {
      const result = await buyBusiness(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/:businessId/upgrade', async (req, res, next) => {
    try {
      const result = await upgradeBusiness(req.auth.userId, req.params.businessId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/:businessId/produce-vehicle', async (req, res, next) => {
    try {
      const result = await produceBusinessVehicle(req.auth.userId, req.params.businessId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/:businessId/list-vehicle', async (req, res, next) => {
    try {
      const result = await listBusinessVehicleForSale(req.auth.userId, req.params.businessId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/:businessId/scrap-vehicle', async (req, res, next) => {
    try {
      const result = await scrapBusinessVehicle(req.auth.userId, req.params.businessId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/vehicle-market/:listingId/buy', async (req, res, next) => {
    try {
      const result = await buyVehicleListing(req.auth.userId, req.params.listingId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/vehicle-market/:listingId/cancel', async (req, res, next) => {
    try {
      const result = await cancelVehicleListing(req.auth.userId, req.params.listingId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/vehicle-market/:listingId/scrap', async (req, res, next) => {
    try {
      const result = await scrapVehicleListing(req.auth.userId, req.params.listingId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/logistics/:truckId/scrap-truck', async (req, res, next) => {
    try {
      const result = await scrapLogisticsTruck(req.auth.userId, req.params.truckId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/:businessId/collect', async (req, res, next) => {
    try {
      const result = await collectBusiness(req.auth.userId, req.params.businessId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/businesses/collect/bulk', async (req, res, next) => {
    try {
      const result = await collectBusinessesBulk(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })
}