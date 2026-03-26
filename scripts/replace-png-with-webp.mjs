import fs from 'node:fs/promises'
import path from 'node:path'

const PROJECT_ROOT = process.cwd()
const PUBLIC_ROOT = path.resolve(PROJECT_ROOT, 'public')

const TARGET_DIRS = [
  path.resolve(PROJECT_ROOT, 'src'),
  path.resolve(PROJECT_ROOT, 'docs'),
]

const TARGET_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.md'])

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function collectFiles(dirPath, out = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      await collectFiles(fullPath, out)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!TARGET_EXTENSIONS.has(ext)) continue
    out.push(fullPath)
  }
  return out
}

function resolvePublicPngPath(rawPath) {
  const normalized = String(rawPath || '').trim()
  if (!normalized.startsWith('/')) return ''
  if (!normalized.toLowerCase().endsWith('.png')) return ''
  return path.resolve(PUBLIC_ROOT, `.${normalized}`)
}

async function replaceInFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  const regex = /\/[A-Za-z0-9_\-./]+\.png\b/g
  const matches = [...raw.matchAll(regex)]
  if (matches.length === 0) return { filePath, updated: false, count: 0 }

  let next = raw
  let count = 0

  for (const match of matches) {
    const pngPath = match[0]
    const webpPath = pngPath.replace(/\.png$/i, '.webp')
    const publicPng = resolvePublicPngPath(pngPath)
    if (!publicPng) continue
    const publicWebp = publicPng.replace(/\.png$/i, '.webp')
    if (!(await exists(publicWebp))) continue
    if (next.includes(webpPath)) {
      continue
    }
    next = next.split(pngPath).join(webpPath)
    count += 1
  }

  if (count === 0 || next === raw) {
    return { filePath, updated: false, count: 0 }
  }

  await fs.writeFile(filePath, next, 'utf8')
  return { filePath, updated: true, count }
}

async function main() {
  let totalUpdatedFiles = 0
  let totalReplacements = 0

  const allFiles = []
  for (const dirPath of TARGET_DIRS) {
    if (await exists(dirPath)) {
      await collectFiles(dirPath, allFiles)
    }
  }

  for (const filePath of allFiles) {
    const result = await replaceInFile(filePath)
    if (!result.updated) continue
    totalUpdatedFiles += 1
    totalReplacements += result.count
  }

  console.log(
    `[webp-replace] tamamlandi. dosya=${totalUpdatedFiles}, degisim=${totalReplacements}`,
  )
}

main().catch((error) => {
  console.error('[webp-replace] hata:', error)
  process.exit(1)
})
