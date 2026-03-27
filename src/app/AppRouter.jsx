import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import SplashPage from '../pages/Splash/SplashPage.jsx'
import {
  getLastKnownUser,
  getStoredUser,
  hasRegisteredUsers,
  logoutUser,
} from '../services/auth.js'
import { bootstrapNativePush, unregisterNativePush } from '../services/mobilePush.js'

const AuthPage = lazy(() => import('../pages/Auth/AuthPage.jsx'))
const HomePage = lazy(() => import('../pages/Home/HomePage.jsx'))
const AdminPage = lazy(() => import('../pages/Admin/AdminPage.jsx'))

const APP_PAGE = {
  SPLASH: 'splash',
  AUTH: 'auth',
  HOME: 'home',
}

let heavyScreensPrewarmed = false

function PageLoader() {
  return <SplashPage onComplete={() => {}} />
}

function canPrewarmHeavyScreens() {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform()) return false
  const nav = window.navigator || {}

  if (nav?.connection?.saveData) return false

  const deviceMemory = Number(nav.deviceMemory || 0)
  if (Number.isFinite(deviceMemory) && deviceMemory > 0 && deviceMemory <= 4) {
    return false
  }

  const hardwareConcurrency = Number(nav.hardwareConcurrency || 0)
  if (Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0 && hardwareConcurrency <= 4) {
    return false
  }

  return true
}

function prewarmHeavyScreens() {
  if (typeof window === 'undefined') return
  if (heavyScreensPrewarmed) return
  if (!canPrewarmHeavyScreens()) return

  heavyScreensPrewarmed = true
  const run = () => {
    void import('../pages/Home/HomePage.jsx')
    void import('../pages/Admin/AdminPage.jsx')
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 2500 })
    return
  }

  window.setTimeout(run, 900)
}

function normalizeLogoutNotice(value) {
  if (typeof value === 'string') {
    const text = value.trim()
    return text === '[object Object]' ? '' : text
  }

  if (value && typeof value === 'object') {
    if ('nativeEvent' in value) {
      return ''
    }

    const candidates = [value.global, value.message, value.notice, value.error]
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim() && candidate.trim() !== '[object Object]') {
        return candidate.trim()
      }
    }
  }

  return ''
}

function AppRouter() {
  const [page, setPage] = useState(APP_PAGE.SPLASH)
  const [initialAuthMode, setInitialAuthMode] = useState('register')
  const [user, setUser] = useState(null)

  const isAdminRoute =
    typeof window !== 'undefined' &&
    String(window.location.pathname || '').toLowerCase().startsWith('/admin')

  const handleSplashComplete = useCallback(() => {
    void (async () => {
      try {
        const resetTokenInUrl =
          typeof window !== 'undefined' &&
          Boolean(new URLSearchParams(window.location.search).get('resetToken'))

        if (resetTokenInUrl) {
          logoutUser()
          setUser(null)
          setInitialAuthMode('login')
          setPage(APP_PAGE.AUTH)
          prewarmHeavyScreens()
          return
        }

        const activeUser = await getStoredUser()
        if (activeUser) {
          setUser(activeUser)
          setPage(APP_PAGE.HOME)
          prewarmHeavyScreens()
          return
        }

        const hasUsers = await hasRegisteredUsers()
        setInitialAuthMode(hasUsers ? 'login' : 'register')
        setPage(APP_PAGE.AUTH)
        prewarmHeavyScreens()
      } catch (error) {
        console.error('[APP] Baslangic oturumu hazirlanamadi:', error)
        logoutUser()
        setUser(null)
        setInitialAuthMode('login')
        setPage(APP_PAGE.AUTH)
        prewarmHeavyScreens()
      }
    })()
  }, [])

  const handleAuthSuccess = useCallback((authenticatedUser) => {
    setUser(authenticatedUser)
    setPage(APP_PAGE.HOME)
  }, [])

  const handleLogout = useCallback((noticeMessage = '') => {
    void unregisterNativePush()
    logoutUser({ notice: normalizeLogoutNotice(noticeMessage) })
    setUser(null)
    setInitialAuthMode('login')
    setPage(APP_PAGE.AUTH)
  }, [])

  useEffect(() => {
    if (page !== APP_PAGE.HOME || !user) return
    void bootstrapNativePush()
  }, [page, user])

  if (page === APP_PAGE.SPLASH) {
    return <SplashPage onComplete={handleSplashComplete} />
  }

  if (page === APP_PAGE.HOME) {
    const currentRole = String(user?.role || '').trim().toLowerCase()
    const canOpenAdminPanel = currentRole === 'admin' || currentRole === 'moderator'
    if (isAdminRoute && canOpenAdminPanel) {
      return (
        <Suspense fallback={<PageLoader />}>
          <AdminPage user={user || getLastKnownUser()} onLogout={handleLogout} />
        </Suspense>
      )
    }

    return (
      <Suspense fallback={<PageLoader />}>
        <HomePage user={user || getLastKnownUser()} onLogout={handleLogout} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AuthPage initialMode={initialAuthMode} onAuthSuccess={handleAuthSuccess} />
    </Suspense>
  )
}

export default AppRouter
