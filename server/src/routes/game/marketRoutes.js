export function registerMarketRoutes(gameRouter, deps) {
  const {
    sendResult,
    getMarket,
    getOrderBook,
    placeLimitOrder,
    cancelLimitOrder,
    buyMarketItem,
    buyFromSellOrder,
    sellMarketItem,
    createMarketAuction,
    placeMarketAuctionBid,
  } = deps

  gameRouter.get('/market', async (req, res, next) => {
    try {
      const result = await getMarket(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.get('/market/orderbook', async (req, res, next) => {
    try {
      const result = await getOrderBook(req.auth.userId, req.query.itemId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/orderbook/orders', async (req, res, next) => {
    try {
      const result = await placeLimitOrder(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/orderbook/orders/:orderId/cancel', async (req, res, next) => {
    try {
      const result = await cancelLimitOrder(req.auth.userId, req.params.orderId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/buy', async (req, res, next) => {
    try {
      const result = await buyMarketItem(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/buy-from-order', async (req, res, next) => {
    try {
      const result = await buyFromSellOrder(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/sell', async (req, res, next) => {
    try {
      const result = await sellMarketItem(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/auctions', async (req, res, next) => {
    try {
      const result = await createMarketAuction(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/market/auctions/:auctionId/bid', async (req, res, next) => {
    try {
      const result = await placeMarketAuctionBid(
        req.auth.userId,
        req.params.auctionId,
        req.body || {},
      )
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })
}