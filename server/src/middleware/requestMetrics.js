import { config } from '../config.js'

const metricsState = {
  startedAt: new Date().toISOString(),
  totalRequests: 0,
  totalErrors: 0,
  totalDurationMs: 0,
  methods: {},
  statuses: {},
  routes: new Map(),
}

function routeKey(req) {
  const raw = `${String(req.method || 'GET').toUpperCase()} ${String(req.baseUrl || '')}${String(req.route?.path || req.path || req.url || '/')}`
  return raw
    .replace(/\/[0-9]+/g, '/:id')
    .replace(/\/[a-f0-9-]{8,}/gi, '/:id')
    .slice(0, 140)
}

function incrementCounter(target, key) {
  if (!target[key]) target[key] = 0
  target[key] += 1
}

function upsertRouteMetric(key, statusCode, durationMs) {
  const current = metricsState.routes.get(key) || {
    count: 0,
    errors: 0,
    avgMs: 0,
    maxMs: 0,
    totalMs: 0,
    lastStatus: 0,
    lastAt: '',
  }

  current.count += 1
  current.totalMs += durationMs
  current.avgMs = Number((current.totalMs / current.count).toFixed(2))
  current.maxMs = Math.max(current.maxMs, durationMs)
  current.lastStatus = statusCode
  current.lastAt = new Date().toISOString()
  if (statusCode >= 400) current.errors += 1

  metricsState.routes.set(key, current)
}

export function requestMetricsMiddleware(req, res, next) {
  if (!config.requestMetricsEnabled) {
    next()
    return
  }

  const startedAt = process.hrtime.bigint()
  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startedAt
    const durationMs = Number(elapsedNs / 1_000_000n)
    const statusCode = Number(res.statusCode || 0)

    metricsState.totalRequests += 1
    metricsState.totalDurationMs += durationMs
    if (statusCode >= 400) metricsState.totalErrors += 1

    incrementCounter(metricsState.methods, String(req.method || 'GET').toUpperCase())
    incrementCounter(metricsState.statuses, String(statusCode || 0))
    upsertRouteMetric(routeKey(req), statusCode, durationMs)
  })

  next()
}

export function getRequestMetricsSummary() {
  const topLimit = Math.max(1, Number(config.requestMetricsTopRoutes) || 12)
  const routes = Array.from(metricsState.routes.entries())
    .map(([route, data]) => ({ route, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topLimit)

  const avgMs = metricsState.totalRequests > 0
    ? Number((metricsState.totalDurationMs / metricsState.totalRequests).toFixed(2))
    : 0

  return {
    enabled: Boolean(config.requestMetricsEnabled),
    startedAt: metricsState.startedAt,
    totalRequests: metricsState.totalRequests,
    totalErrors: metricsState.totalErrors,
    avgMs,
    methods: { ...metricsState.methods },
    statuses: { ...metricsState.statuses },
    routes,
  }
}
