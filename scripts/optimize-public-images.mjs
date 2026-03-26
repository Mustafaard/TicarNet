import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const PROJECT_ROOT = process.cwd()
const PUBLIC_ROOT = path.resolve(PROJECT_ROOT, 'public')
const MIN_OPTIMIZE_BYTES = 120 * 1024
const REWRITE_GAIN_RATIO = 0.97
const WEBP_CREATE_GAIN_RATIO = 0.97
const WEBP_QUALITY = Number(process.env.IMAGE_WEBP_QUALITY || 72)
const PNG_QUALITY = Number(process.env.IMAGE_PNG_QUALITY || 78)
const JPG_QUALITY = Number(process.env.IMAGE_JPG_QUALITY || 78)

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

function getProfile(filePath) {
  const safe = filePath.replace(/\\/g, '/').toLowerCase()

  if (safe.includes('/backgrounds/') || safe.includes('/splash/')) {
    return { maxWidth: 1920 }
  }
  if (safe.includes('/vehicles/')) {
    return { maxWidth: 960 }
  }
  if (safe.includes('/icons/') || safe.includes('/tutorial/')) {
    return { maxWidth: 640 }
  }
  return { maxWidth: 1280 }
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function listImageFiles(dirPath, out = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      await listImageFiles(fullPath, out)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) continue
    out.push(fullPath)
  }
  return out
}

function buildSharpPipeline(sourceBuffer, sourcePath, maxWidth) {
  const instance = sharp(sourceBuffer, { failOnError: false, animated: false }).rotate()
  return instance.resize({
    width: maxWidth,
    fit: 'inside',
    withoutEnlargement: true,
    fastShrinkOnLoad: true,
  })
}

async function rewriteIfSmaller(targetPath, nextBuffer) {
  const before = await fs.readFile(targetPath)
  const oldSize = before.length
  const nextSize = nextBuffer.length
  if (nextSize >= Math.floor(oldSize * REWRITE_GAIN_RATIO)) {
    return { rewritten: false, oldSize, nextSize }
  }
  await fs.writeFile(targetPath, nextBuffer)
  return { rewritten: true, oldSize, nextSize }
}

async function createWebpSiblingIfUseful(targetPath, pipeline, sourceSize) {
  const ext = path.extname(targetPath).toLowerCase()
  if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
    return { created: false, savedBytes: 0, outputPath: '' }
  }

  const webpPath = targetPath.replace(/\.(png|jpe?g)$/i, '.webp')
  if (await exists(webpPath)) {
    return { created: false, savedBytes: 0, outputPath: '' }
  }

  const webpBuffer = await pipeline.webp({
    quality: WEBP_QUALITY,
    effort: 6,
    smartSubsample: true,
  }).toBuffer()

  if (webpBuffer.length >= Math.floor(sourceSize * WEBP_CREATE_GAIN_RATIO)) {
    return { created: false, savedBytes: 0, outputPath: '' }
  }

  await fs.writeFile(webpPath, webpBuffer)
  return {
    created: true,
    savedBytes: sourceSize - webpBuffer.length,
    outputPath: webpPath,
  }
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const stat = await fs.stat(filePath)
  if (stat.size < MIN_OPTIMIZE_BYTES) {
    return {
      filePath,
      skipped: true,
      reason: 'small',
      savedBytes: 0,
      createdWebp: false,
    }
  }

  const source = await fs.readFile(filePath)
  const profile = getProfile(filePath)
  const pipeline = buildSharpPipeline(source, filePath, profile.maxWidth)

  let optimizedBuffer = null
  if (ext === '.png') {
    optimizedBuffer = await pipeline.png({
      quality: PNG_QUALITY,
      compressionLevel: 9,
      palette: true,
      effort: 10,
    }).toBuffer()
  } else if (ext === '.jpg' || ext === '.jpeg') {
    optimizedBuffer = await pipeline.jpeg({
      quality: JPG_QUALITY,
      mozjpeg: true,
      progressive: true,
      optimizeScans: true,
    }).toBuffer()
  } else if (ext === '.webp') {
    optimizedBuffer = await pipeline.webp({
      quality: WEBP_QUALITY,
      effort: 6,
      smartSubsample: true,
    }).toBuffer()
  } else {
    return {
      filePath,
      skipped: true,
      reason: 'unsupported_ext',
      savedBytes: 0,
      createdWebp: false,
    }
  }

  const rewrite = await rewriteIfSmaller(filePath, optimizedBuffer)
  const webpResult = await createWebpSiblingIfUseful(
    filePath,
    buildSharpPipeline(source, filePath, profile.maxWidth),
    rewrite.rewritten ? rewrite.nextSize : rewrite.oldSize,
  )

  return {
    filePath,
    skipped: false,
    reason: '',
    rewritten: rewrite.rewritten,
    savedBytes: rewrite.rewritten ? rewrite.oldSize - rewrite.nextSize : 0,
    createdWebp: webpResult.created,
    webpPath: webpResult.outputPath,
    webpSavedBytes: webpResult.savedBytes,
  }
}

function formatBytes(bytes) {
  const safe = Math.max(0, Number(bytes) || 0)
  if (safe < 1024) return `${safe} B`
  const kb = safe / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

async function main() {
  if (!(await exists(PUBLIC_ROOT))) {
    console.log('[image-opt] public/ dizini bulunamadi, atlandi.')
    return
  }

  const files = await listImageFiles(PUBLIC_ROOT)
  let processed = 0
  let rewritten = 0
  let createdWebp = 0
  let totalSavedBytes = 0

  for (const filePath of files) {
    const result = await optimizeImage(filePath)
    if (result.skipped) continue
    processed += 1
    if (result.rewritten) {
      rewritten += 1
      totalSavedBytes += result.savedBytes
    }
    if (result.createdWebp) {
      createdWebp += 1
      totalSavedBytes += result.webpSavedBytes
    }
  }

  console.log(
    `[image-opt] tamamlandi. islenen=${processed}, yeniden-yazilan=${rewritten}, yeni-webp=${createdWebp}, kazanim=${formatBytes(totalSavedBytes)}`,
  )
}

main().catch((error) => {
  console.error('[image-opt] hata:', error)
  process.exit(1)
})
