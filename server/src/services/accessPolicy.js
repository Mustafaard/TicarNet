import { config } from '../config.js'

const ipIntelCache = new Map()

export function normalizeIp(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'unknown'
  if (raw.startsWith('::ffff:')) return raw.slice('::ffff:'.length)
  return raw
}

function isLikelyIp(value) {
  const ip = normalizeIp(value)
  if (ip === 'unknown') return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return true
  if (/^[a-fA-F0-9:]+$/.test(ip) && ip.includes(':')) return true
  return false
}

export function isPrivateOrLoopbackIp(value) {
  const ip = normalizeIp(value)
  if (ip === 'unknown') return false

  if (ip === '127.0.0.1' || ip === '::1') return true
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true
  if (ip.startsWith('169.254.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true

  if (ip.includes(':')) {
    const lowered = ip.toLowerCase()
    if (lowered.startsWith('fc') || lowered.startsWith('fd')) return true
    if (lowered.startsWith('fe80:')) return true
  }

  return false
}

function getCache(ip) {
  const cached = ipIntelCache.get(ip)
  if (!cached) return null
  const now = Date.now()

  if (cached.expiresAt >= now) {
    return { value: cached.value, stale: false }
  }

  if (cached.staleExpiresAt >= now) {
    return { value: cached.value, stale: true }
  }

  ipIntelCache.delete(ip)
  return null
}

function setCache(ip, value) {
  const ttlMs = Math.max(1000, config.geo.cacheTtlMs)
  const staleAllowMs = Math.max(0, Number(config.geo.staleAllowMs || 0))
  const now = Date.now()
  const expiresAt = now + ttlMs
  ipIntelCache.set(ip, {
    value,
    expiresAt,
    staleExpiresAt: expiresAt + staleAllowMs,
  })
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    Math.max(500, config.geo.lookupTimeoutMs),
  )

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TicarNet-GeoGuard/1.0',
      },
    })

    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

async function lookupIpApi(ip) {
  const safeIp = encodeURIComponent(ip)
  const data = await fetchJson(
    `http://ip-api.com/json/${safeIp}?fields=status,countryCode,proxy,hosting,mobile,query,message`,
  )

  if (!data || data.status !== 'success') return null
  return {
    ip: String(data.query || ip),
    countryCode: String(data.countryCode || '').toUpperCase(),
    isProxy: Boolean(data.proxy),
    isHosting: Boolean(data.hosting),
    isMobile: Boolean(data.mobile),
    source: 'ip-api',
  }
}

async function lookupIpApiCo(ip) {
  const safeIp = encodeURIComponent(ip)
  const data = await fetchJson(`https://ipapi.co/${safeIp}/json/`)
  if (!data || data.error) return null

  return {
    ip: String(data.ip || ip),
    countryCode: String(data.country_code || '').toUpperCase(),
    isProxy: false,
    isHosting: false,
    isMobile: false,
    source: 'ipapi.co',
  }
}

function mergeIntel(primary, secondary, ip) {
  if (!primary && !secondary) return null

  const merged = {
    ip,
    countryCode: '',
    isProxy: false,
    isHosting: false,
    isMobile: false,
    source: '',
  }

  for (const item of [primary, secondary]) {
    if (!item) continue
    if (!merged.countryCode && item.countryCode) {
      merged.countryCode = item.countryCode
    }
    merged.isProxy = merged.isProxy || Boolean(item.isProxy)
    merged.isHosting = merged.isHosting || Boolean(item.isHosting)
    merged.isMobile = merged.isMobile || Boolean(item.isMobile)
    merged.source = merged.source ? `${merged.source}+${item.source}` : item.source
  }

  return merged
}

function buildDeniedResult(reason, message, intel) {
  return {
    allowed: false,
    reason,
    message,
    countryCode: intel?.countryCode || '',
    isProxy: Boolean(intel?.isProxy),
    isHosting: Boolean(intel?.isHosting),
    source: intel?.source || '',
  }
}

export function resolveAccessIp(input = {}) {
  const directIp = normalizeIp(input.directIp)
  if (directIp === 'unknown') return 'unknown'
  if (!isLikelyIp(directIp)) return 'unknown'
  return directIp
}

export async function evaluateAccessByIp(clientIp) {
  const ip = normalizeIp(clientIp)
  const isPrivateIp = isPrivateOrLoopbackIp(ip)

  if (!config.geo.enforceTrOnly) {
    return { allowed: true, reason: 'disabled', countryCode: '', isProxy: false }
  }

  const allowPrivateBypass =
    isPrivateIp && (config.geo.allowPrivateIpBypass || config.nodeEnv !== 'production')

  if (allowPrivateBypass) {
    return {
      allowed: true,
      reason: 'private_ip_bypass',
      countryCode: config.geo.allowedCountryCode || 'TR',
      isProxy: false,
    }
  }

  if (ip === 'unknown') {
    if (config.geo.failClosed) {
      return buildDeniedResult(
        'geo_unverified',
        'Konum doğrulaması yapılamadı. Lütfen ağ bağlantınızı kontrol edin.',
        null,
      )
    }

    return { allowed: true, reason: 'unknown_ip_allow', countryCode: '', isProxy: false }
  }

  const cached = getCache(ip)
  if (cached && !cached.stale) return cached.value

  const [ipApiIntel, ipApiCoIntel] = await Promise.all([
    lookupIpApi(ip),
    lookupIpApiCo(ip),
  ])
  const intel = mergeIntel(ipApiIntel, ipApiCoIntel, ip)

  if (!intel?.countryCode) {
    if (config.geo.failClosed && cached?.stale && cached.value?.allowed) {
      const allowedCountry = String(config.geo.allowedCountryCode || 'TR').toUpperCase()
      const staleCountry = String(cached.value?.countryCode || '').toUpperCase()
      if (!staleCountry || staleCountry === allowedCountry) {
        return {
          ...cached.value,
          reason: 'geo_stale_allow',
          source: cached.value?.source
            ? `${cached.value.source}+stale`
            : 'stale',
        }
      }
    }

    const result = config.geo.failClosed
      ? buildDeniedResult(
        'geo_unverified',
        'Konum doğrulaması yapılamadı. Lütfen daha sonra tekrar deneyin.',
        intel,
      )
      : { allowed: true, reason: 'unverified_allow', countryCode: '', isProxy: false }
    setCache(ip, result)
    return result
  }

  const allowedCountry = String(config.geo.allowedCountryCode || 'TR').toUpperCase()
  if (intel.countryCode !== allowedCountry) {
    const result = buildDeniedResult(
      'geo_country_blocked',
      'Bu oyun yalnızca Türkiye içinden erişime açıktır.',
      intel,
    )
    setCache(ip, result)
    return result
  }

  if (config.geo.blockProxyVpn && (intel.isProxy || intel.isHosting)) {
    const result = buildDeniedResult(
      'geo_proxy_blocked',
      'VPN/Proxy veya veri merkezi hattı tespit edildi. Lütfen normal bağlantı ile tekrar deneyin.',
      intel,
    )
    setCache(ip, result)
    return result
  }

  const allowed = {
    allowed: true,
    reason: 'ok',
    countryCode: intel.countryCode,
    isProxy: Boolean(intel.isProxy),
    isHosting: Boolean(intel.isHosting),
    source: intel.source,
  }
  setCache(ip, allowed)
  return allowed
}

export function buildGeoBlockedPayload(result) {
  return {
    success: false,
    reason: 'geo_blocked',
    errors: {
      global:
        result?.message ||
        'Erişim engellendi. Konum veya bağlantı doğrulaması başarısız.',
    },
    access: {
      code: result?.reason || 'geo_blocked',
      countryCode: result?.countryCode || '',
      proxy: Boolean(result?.isProxy),
      hosting: Boolean(result?.isHosting),
      source: result?.source || '',
    },
  }
}
