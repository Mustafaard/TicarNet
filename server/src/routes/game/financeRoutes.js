export function registerFinanceRoutes(gameRouter, deps) {
  const {
    sendResult,
    getForex,
    buyForexCurrency,
    sellForexCurrency,
    getBank,
    depositBankCash,
    withdrawBankCash,
    openBankTermDeposit,
    claimBankTermDeposit,
  } = deps

  gameRouter.get('/forex', async (req, res, next) => {
    try {
      const result = await getForex(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/forex/buy', async (req, res, next) => {
    try {
      const result = await buyForexCurrency(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/forex/sell', async (req, res, next) => {
    try {
      const result = await sellForexCurrency(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.get('/bank', async (req, res, next) => {
    try {
      const result = await getBank(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/bank/deposit', async (req, res, next) => {
    try {
      const result = await depositBankCash(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/bank/withdraw', async (req, res, next) => {
    try {
      const result = await withdrawBankCash(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/bank/term/open', async (req, res, next) => {
    try {
      const result = await openBankTermDeposit(req.auth.userId, req.body || {})
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })

  gameRouter.post('/bank/term/claim', async (req, res, next) => {
    try {
      const result = await claimBankTermDeposit(req.auth.userId)
      sendResult(res, result)
    } catch (error) {
      next(error)
    }
  })
}