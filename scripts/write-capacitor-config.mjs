import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_FILE = fileURLToPath(import.meta.url)
const SCRIPT_DIR = path.dirname(SCRIPT_FILE)
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..')
const CONFIG_PATH = path.resolve(PROJECT_ROOT, 'capacitor.config.json')

function fail(message) {
  console.error(`[capacitor-config] ${message}`)
  process.exit(1)
}

function normalizeMode(value) {
  const mode = String(value || '').trim().toLowerCase()
  if (!mode) return 'bundled'
  if (mode === 'bundled' || mode === 'live') return mode
  fail('Gecersiz mod. Kullanim: node scripts/write-capacitor-config.mjs [bundled|live] [url]')
}

function normalizeUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    fail(`Gecersiz URL: ${raw}`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    fail(`Desteklenmeyen protokol: ${parsed.protocol}`)
  }

  parsed.hash = ''
  parsed.search = ''
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'
  return parsed.toString().replace(/\/$/, '')
}

async function readConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    fail(`capacitor.config.json okunamadi: ${error.message}`)
  }
}

function buildNextConfig(current, mode, liveUrl) {
  const next = {
    ...current,
    appId: String(current?.appId || 'com.ticarnet.app'),
    appName: String(current?.appName || 'ticarnet'),
    webDir: String(current?.webDir || 'dist'),
  }

  if (mode === 'bundled') {
    delete next.server
    return next
  }

  if (!liveUrl) {
    fail('Live mod icin URL zorunlu. Ornek: CAP_SERVER_URL=https://play.ticarnet.com')
  }

  const parsed = new URL(liveUrl)
  next.server = {
    url: liveUrl,
    cleartext: parsed.protocol === 'http:',
  }

  return next
}

async function main() {
  const mode = normalizeMode(process.argv[2] || 'bundled')
  const explicitUrl = process.argv[3] || ''
  const envUrl = process.env.CAP_SERVER_URL || ''
  const liveUrl = normalizeUrl(explicitUrl || envUrl)

  const current = await readConfig()
  const next = buildNextConfig(current, mode, liveUrl)
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8')

  if (mode === 'bundled') {
    console.log('[capacitor-config] Mod: bundled (APK icine dist gomulur).')
    return
  }

  console.log(`[capacitor-config] Mod: live (${liveUrl}).`)
}

main().catch((error) => {
  fail(`Beklenmeyen hata: ${error.message}`)
})
