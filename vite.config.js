import { createLogger, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const viteLogger = createLogger()

function shouldSuppressProxyMessage(message) {
  const text = String(message || '').toLowerCase()
  if (!text) return false
  if (text.includes('ws proxy error') || text.includes('ws proxy socket error')) return true
  if (text.includes('http proxy error: /api/')) return true
  if (text.includes('econnrefused 127.0.0.1:8787')) return true
  if (text.includes('http proxy error: /api/health')) return true
  if (text.includes('econnaborted /api/')) return true
  return false
}

function isExpectedProxyDisconnectError(code) {
  const safeCode = String(code || '').trim().toUpperCase()
  return (
    safeCode === 'ECONNRESET' ||
    safeCode === 'ECONNREFUSED' ||
    safeCode === 'EPIPE' ||
    safeCode === 'ETIMEDOUT' ||
    safeCode === 'ECONNABORTED' ||
    safeCode === 'ERR_CANCELED' ||
    safeCode === 'ERR_STREAM_PREMATURE_CLOSE'
  )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        generatorOpts: {
          compact: true,
        },
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('\\react\\') || id.includes('/react/')) {
              return 'vendor-react'
            }
            if (id.includes('@capacitor')) {
              return 'vendor-capacitor'
            }
            return 'vendor'
          }
          if (id.includes('/pages/Home/views/')) return 'home-views'
          if (id.includes('/pages/Home/modals/')) return 'home-modals'
          if (id.includes('/pages/Home/hooks/')) return 'home-hooks'
        },
      },
    },
  },
  customLogger: {
    ...viteLogger,
    error(message, options) {
      if (shouldSuppressProxyMessage(message)) return
      viteLogger.error(message, options)
    },
  },
  server: {
    watch: {
      ignored: ['**/android/**', '**/dist/**', '**/server/data/**', '**/.run-dev*.log'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.removeAllListeners('error')
          proxy.on('error', (error, req) => {
            const code = String(error?.code || '')
            if (isExpectedProxyDisconnectError(code)) return
            let safePath = ''
            try {
              const rawUrl = String(req?.url || '').trim()
              safePath = rawUrl ? ` ${rawUrl.split('?')[0]}` : ''
            } catch {
              safePath = ''
            }
            console.error(`[vite-proxy] ${code || 'ERR'}${safePath}`)
          })
        },
      },
    },
  },
})
