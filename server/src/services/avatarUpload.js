import crypto from 'node:crypto'
import dns from 'node:dns/promises'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import multer from 'multer'
import { config } from '../config.js'

const MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export const AVATAR_ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXT))
export const AVATAR_MAX_FILE_SIZE = config.avatarMaxFileBytes
const AVATAR_ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const MAX_REMOTE_REDIRECTS = 3

function ensureAvatarDirExists() {
  if (!fs.existsSync(config.avatarUploadDir)) {
    fs.mkdirSync(config.avatarUploadDir, { recursive: true })
  }
}

function normalizeExt(rawExt) {
  const ext = String(rawExt || '').trim().toLowerCase()
  if (ext === '.jpeg') return '.jpg'
  return ext
}

function extFromContentType(contentTypeHeader) {
  const mime = String(contentTypeHeader || '').split(';')[0].trim().toLowerCase()
  return MIME_TO_EXT[mime] || ''
}

function detectImageExtByMagic(fileBuffer) {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length < 12) return ''

  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (fileBuffer.subarray(0, 8).equals(pngSig)) return '.png'

  const gifHeader = fileBuffer.subarray(0, 6).toString('ascii')
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return '.gif'

  if (fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) {
    return '.jpg'
  }

  const riff = fileBuffer.subarray(0, 4).toString('ascii')
  const webp = fileBuffer.subarray(8, 12).toString('ascii')
  if (riff === 'RIFF' && webp === 'WEBP') return '.webp'

  return ''
}

function isLocalHostname(hostname) {
  const safeHostname = String(hostname || '').trim().toLowerCase()
  return (
    safeHostname === 'localhost' ||
    safeHostname.endsWith('.localhost') ||
    safeHostname.endsWith('.local')
  )
}

function isPrivateIpv4(address) {
  const parts = String(address || '')
    .split('.')
    .map((part) => Number(part))
  if (
    parts.length !== 4 ||
    parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)
  ) {
    return false
  }

  if (parts[0] === 10 || parts[0] === 127) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  return false
}

function isPrivateIpv6(address) {
  const safeAddress = String(address || '').trim().toLowerCase()
  return (
    safeAddress === '::1' ||
    safeAddress === '::' ||
    safeAddress.startsWith('fc') ||
    safeAddress.startsWith('fd') ||
    safeAddress.startsWith('fe80:')
  )
}

function isPrivateOrLoopbackAddress(address) {
  const safeAddress = String(address || '').trim()
  const family = net.isIP(safeAddress)
  if (family === 4) return isPrivateIpv4(safeAddress)
  if (family === 6) return isPrivateIpv6(safeAddress)
  return false
}

async function assertPublicRemoteUrl(inputUrl) {
  let parsed
  try {
    parsed = inputUrl instanceof URL ? inputUrl : new URL(String(inputUrl || '').trim())
  } catch {
    return {
      success: false,
      reason: 'invalid_url',
      message: 'Avatar ba\u011flant\u0131s\u0131 ge\u00e7ersiz. HTTP veya HTTPS ba\u011flant\u0131s\u0131 kullan\u0131n.',
    }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      success: false,
      reason: 'invalid_url',
      message: 'Avatar ba\u011flant\u0131s\u0131 ge\u00e7ersiz. Yaln\u0131zca HTTP veya HTTPS desteklenir.',
    }
  }

  if (parsed.username || parsed.password) {
    return {
      success: false,
      reason: 'invalid_url',
      message:
        'Avatar ba\u011flant\u0131s\u0131nda kullan\u0131c\u0131 ad\u0131 veya parola kullan\u0131lamaz.',
    }
  }

  const hostname = String(parsed.hostname || '').trim().toLowerCase()
  if (!hostname || isLocalHostname(hostname) || isPrivateOrLoopbackAddress(hostname)) {
    return {
      success: false,
      reason: 'forbidden_host',
      message: 'Yerel veya \u00f6zel a\u011f adreslerinden avatar y\u00fcklenemez.',
    }
  }

  let resolvedAddresses = []
  try {
    resolvedAddresses = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    return {
      success: false,
      reason: 'dns_failed',
      message: 'Avatar ba\u011flant\u0131s\u0131n\u0131n hedefi \u00e7\u00f6z\u00fcmlenemedi.',
    }
  }

  if (!resolvedAddresses.length) {
    return {
      success: false,
      reason: 'dns_failed',
      message: 'Avatar ba\u011flant\u0131s\u0131n\u0131n hedefi \u00e7\u00f6z\u00fcmlenemedi.',
    }
  }

  if (resolvedAddresses.some((entry) => isPrivateOrLoopbackAddress(entry?.address))) {
    return {
      success: false,
      reason: 'forbidden_host',
      message: 'Yerel veya \u00f6zel a\u011f adreslerinden avatar y\u00fcklenemez.',
    }
  }

  return { success: true, parsed }
}

async function fetchAvatarResponse(initialUrl, controller) {
  let currentUrl = initialUrl

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REMOTE_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'TicarNet-AvatarFetcher/1.0',
      },
    })

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { success: true, response, finalUrl: currentUrl }
    }

    if (redirectCount >= MAX_REMOTE_REDIRECTS) {
      return {
        success: false,
        reason: 'too_many_redirects',
        message: 'Avatar ba\u011flant\u0131s\u0131 \u00e7ok fazla y\u00f6nlendirme i\u00e7eriyor.',
      }
    }

    const location = String(response.headers.get('location') || '').trim()
    if (!location) {
      return {
        success: false,
        reason: 'fetch_failed',
        message: 'Avatar ba\u011flant\u0131s\u0131 eksik y\u00f6nlendirme bilgisi d\u00f6nd\u00fcrd\u00fc.',
      }
    }

    const redirectedUrl = new URL(location, currentUrl)
    const validatedRedirect = await assertPublicRemoteUrl(redirectedUrl)
    if (!validatedRedirect.success) {
      return validatedRedirect
    }

    currentUrl = validatedRedirect.parsed
  }

  return {
    success: false,
    reason: 'too_many_redirects',
    message: 'Avatar ba\u011flant\u0131s\u0131 \u00e7ok fazla y\u00f6nlendirme i\u00e7eriyor.',
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    try {
      ensureAvatarDirExists()
      callback(null, config.avatarUploadDir)
    } catch (error) {
      callback(error)
    }
  },
  filename: (_req, file, callback) => {
    const ext =
      MIME_TO_EXT[file.mimetype] ||
      path.extname(String(file.originalname || '').toLowerCase()) ||
      '.img'
    callback(null, `${Date.now()}-${crypto.randomUUID()}${ext}`)
  },
})

function fileFilter(_req, file, callback) {
  if (!AVATAR_ALLOWED_MIME_TYPES.has(String(file.mimetype || '').toLowerCase())) {
    callback(new Error('unsupported_image_type'))
    return
  }

  callback(null, true)
}

export const avatarUpload = multer({
  storage,
  limits: {
    fileSize: AVATAR_MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
})

export function buildAvatarPublicUrl(fileName) {
  const safeBase = String(config.avatarPublicBase || '/api/uploads/avatars').replace(/\/+$/, '')
  return `${safeBase}/${fileName}`
}

export function resolveAvatarPathFromPublicUrl(rawUrl) {
  const safeBase = String(config.avatarPublicBase || '/api/uploads/avatars').replace(/\/+$/, '')
  const safeUrl = String(rawUrl || '').trim().split('?')[0].split('#')[0]
  const prefix = `${safeBase}/`

  if (!safeUrl.startsWith(prefix)) return null

  const rawFileName = safeUrl.slice(prefix.length)
  const safeFileName = path.basename(rawFileName)
  if (!safeFileName || safeFileName !== rawFileName) return null

  return path.join(config.avatarUploadDir, safeFileName)
}

async function readResponseBuffer(response) {
  if (!response?.body?.getReader) {
    const fallbackArrayBuffer = await response.arrayBuffer()
    const fallbackBuffer = Buffer.from(fallbackArrayBuffer)
    if (fallbackBuffer.length > AVATAR_MAX_FILE_SIZE) {
      return { success: false, reason: 'file_too_large' }
    }

    return { success: true, buffer: fallbackBuffer }
  }

  const reader = response.body.getReader()
  const chunks = []
  let total = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = Buffer.from(value)
    total += chunk.length
    if (total > AVATAR_MAX_FILE_SIZE) {
      await reader.cancel('avatar_too_large').catch(() => {})
      return { success: false, reason: 'file_too_large' }
    }
    chunks.push(chunk)
  }

  return { success: true, buffer: Buffer.concat(chunks) }
}

export async function downloadAvatarFromUrl(rawUrl) {
  const safeUrl = String(rawUrl || '').trim()
  if (!safeUrl) {
    return {
      success: false,
      reason: 'invalid_url',
      message: 'Avatar ba\u011flant\u0131s\u0131 bo\u015f olamaz.',
    }
  }

  const validatedUrl = await assertPublicRemoteUrl(safeUrl)
  if (!validatedUrl.success) {
    return validatedUrl
  }
  const parsed = validatedUrl.parsed

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const responseResult = await fetchAvatarResponse(parsed, controller)
    if (!responseResult.success) {
      return responseResult
    }

    const { response, finalUrl } = responseResult

    if (!response.ok) {
      return {
        success: false,
        reason: 'fetch_failed',
        message: `Avatar ba\u011flant\u0131s\u0131na eri\u015filemedi (HTTP ${response.status}).`,
      }
    }

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (Number.isFinite(contentLength) && contentLength > AVATAR_MAX_FILE_SIZE) {
      return {
        success: false,
        reason: 'file_too_large',
        message: `Avatar dosyas\u0131 \u00e7ok b\u00fcy\u00fck. En fazla ${Math.round(AVATAR_MAX_FILE_SIZE / (1024 * 1024))} MB olabilir.`,
      }
    }

    const bufferResult = await readResponseBuffer(response)
    if (!bufferResult.success) {
      return {
        success: false,
        reason: bufferResult.reason,
        message:
          bufferResult.reason === 'file_too_large'
            ? `Avatar dosyas\u0131 \u00e7ok b\u00fcy\u00fck. En fazla ${Math.round(AVATAR_MAX_FILE_SIZE / (1024 * 1024))} MB olabilir.`
            : 'Avatar dosyas\u0131 indirilemedi.',
      }
    }

    const fileBuffer = bufferResult.buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      return {
        success: false,
        reason: 'empty_file',
        message:
          'Avatar ba\u011flant\u0131s\u0131ndan bo\u015f dosya geldi. Farkl\u0131 bir ba\u011flant\u0131 deneyin.',
      }
    }

    const extByMagic = detectImageExtByMagic(fileBuffer)
    const extByHeader = normalizeExt(extFromContentType(response.headers.get('content-type')))
    const extByUrl = normalizeExt(path.extname(finalUrl?.pathname || parsed.pathname || ''))

    const finalExt =
      extByMagic ||
      (AVATAR_ALLOWED_EXTENSIONS.has(extByHeader) ? extByHeader : '') ||
      (AVATAR_ALLOWED_EXTENSIONS.has(extByUrl) ? extByUrl : '')

    if (!finalExt || !AVATAR_ALLOWED_EXTENSIONS.has(finalExt)) {
      return {
        success: false,
        reason: 'unsupported_type',
        message:
          'Ba\u011flant\u0131dan ge\u00e7erli bir g\u00f6rsel al\u0131namad\u0131. PNG, JPG, WEBP veya GIF kullan\u0131n.',
      }
    }

    ensureAvatarDirExists()
    const fileName = `${Date.now()}-${crypto.randomUUID()}${finalExt}`
    const filePath = path.join(config.avatarUploadDir, fileName)
    await fs.promises.writeFile(filePath, fileBuffer)

    return {
      success: true,
      reason: 'ok',
      fileName,
      filePath,
      avatarUrl: buildAvatarPublicUrl(fileName),
      size: fileBuffer.length,
    }
  } catch {
    return {
      success: false,
      reason: 'fetch_failed',
      message:
        'Avatar ba\u011flant\u0131s\u0131na ula\u015f\u0131lamad\u0131. Ba\u011flant\u0131n\u0131n herkese a\u00e7\u0131k oldu\u011fundan emin olun.',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
