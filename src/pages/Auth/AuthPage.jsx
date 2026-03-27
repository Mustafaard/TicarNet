import { useEffect, useMemo, useState } from 'react'
import AuthInput from '../../components/auth/AuthInput.jsx'
import AuthPasswordField from '../../components/auth/AuthPasswordField.jsx'
import AuthButton from '../../components/auth/AuthButton.jsx'
import {
  consumeAuthNotice,
  getApiHealth,
  hasRegisteredUsers,
  loginUser,
  refreshPublicIpCache,
  requestRegisterCode,
  requestPasswordReset,
  resetPasswordWithToken,
  validateResetToken,
} from '../../services/auth.js'
import './AuthPage.css'

const AUTH_MODE = {
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
  RESET: 'reset',
}

const initialLoginForm = {
  identifier: '',
  password: '',
}

const initialRegisterForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const initialForgotForm = {
  email: '',
}

const initialResetForm = {
  newPassword: '',
  confirmPassword: '',
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REGISTER_FLOW_DRAFT_KEY = 'ticarnet_register_flow_draft'
const REGISTER_FORM_DRAFT_TTL_MS = 30 * 60 * 1000
const TUTORIAL_PENDING_KEY = 'ticarnet_tutorial_pending'
const USERNAME_MAX_LENGTH = 15

function clearResetFlowParamsFromUrl() {
  const url = new URL(window.location.href)
  ;['resetToken', 'oobCode', 'mode', 'apiKey', 'lang', 'continueUrl'].forEach((paramName) => {
    url.searchParams.delete(paramName)
  })
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function hasRegisterDraftValue(form) {
  if (!form || typeof form !== 'object') return false
  return Boolean(
    String(form.username || '').trim() ||
      String(form.email || '').trim() ||
      String(form.password || '').trim() ||
      String(form.confirmPassword || '').trim(),
  )
}

function clearRegisterFlowDraft() {
  try {
    localStorage.removeItem(REGISTER_FLOW_DRAFT_KEY)
  } catch {
    // ignore storage errors
  }
}

function saveRegisterFlowDraft(payload) {
  try {
    localStorage.setItem(
      REGISTER_FLOW_DRAFT_KEY,
      JSON.stringify({
        ...payload,
        savedAt: Date.now(),
      }),
    )
  } catch {
    // ignore storage errors
  }
}

function readRegisterFlowDraft() {
  try {
    const raw = localStorage.getItem(REGISTER_FLOW_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const savedAt = Number(parsed?.savedAt || 0)
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > REGISTER_FORM_DRAFT_TTL_MS) {
      clearRegisterFlowDraft()
      return null
    }
    return parsed
  } catch {
    clearRegisterFlowDraft()
    return null
  }
}

function getInitialRegisterFlowState({ resetTokenFromUrl, initialMode }) {
  const persistedAuthNotice = consumeAuthNotice()
  const fallback = {
    mode: resetTokenFromUrl ? AUTH_MODE.RESET : initialMode,
    registerForm: initialRegisterForm,
    notice: resetTokenFromUrl
      ? 'Şifre sıfırlama bağlantısı algılandı, doğrulanıyor...'
      : persistedAuthNotice,
  }

  if (resetTokenFromUrl) return fallback

  const draft = readRegisterFlowDraft()
  if (!draft) return fallback

  const safeForm = {
    username: String(draft?.registerForm?.username || '').slice(0, USERNAME_MAX_LENGTH),
    email: String(draft?.registerForm?.email || '').slice(0, 80),
    password: String(draft?.registerForm?.password || '').slice(0, 120),
    confirmPassword: String(draft?.registerForm?.confirmPassword || '').slice(0, 120),
  }
  if (hasRegisterDraftValue(safeForm)) {
    return {
      ...fallback,
      mode: AUTH_MODE.REGISTER,
      registerForm: safeForm,
      notice: 'Yeni hesap oluşturmak için bilgilerinizi girin.',
    }
  }

  return fallback
}

function AuthPage({ initialMode = AUTH_MODE.REGISTER, onAuthSuccess }) {
  const resetTokenFromUrl = useMemo(
    () => {
      const params = new URLSearchParams(window.location.search)
      return params.get('resetToken') || params.get('oobCode') || ''
    },
    [],
  )
  const initialRegisterFlowState = useMemo(
    () => getInitialRegisterFlowState({ resetTokenFromUrl, initialMode }),
    [initialMode, resetTokenFromUrl],
  )

  const [mode, setMode] = useState(initialRegisterFlowState.mode)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [registerForm, setRegisterForm] = useState(initialRegisterFlowState.registerForm)
  const [forgotForm, setForgotForm] = useState(initialForgotForm)
  const [resetForm, setResetForm] = useState(initialResetForm)
  const [resetToken, setResetToken] = useState(resetTokenFromUrl)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(initialRegisterFlowState.notice)
  const [gateway, setGateway] = useState({
    online: false,
    pingMs: 0,
    checked: false,
  })
  const [logoLoadError, setLogoLoadError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dismissedFeedbackKey, setDismissedFeedbackKey] = useState('')
  const firstFieldError = useMemo(() => {
    for (const [fieldName, fieldError] of Object.entries(errors)) {
      if (fieldName === 'global') continue
      if (typeof fieldError === 'string' && fieldError.trim().length > 0) {
        return fieldError.trim()
      }
    }
    return ''
  }, [errors])
  const floatingFeedback = errors.global || firstFieldError || notice
  const hasErrorFeedback = Boolean(errors.global || firstFieldError)
  const feedbackKey = floatingFeedback
    ? `${hasErrorFeedback ? 'error' : 'notice'}:${mode}:${floatingFeedback}`
    : ''
  const isFeedbackVisible = Boolean(floatingFeedback) && dismissedFeedbackKey !== feedbackKey

  const pageTitle = useMemo(() => {
    if (mode === AUTH_MODE.LOGIN) return 'Giriş Yap'
    if (mode === AUTH_MODE.REGISTER) return 'Kayıt Ol'
    if (mode === AUTH_MODE.FORGOT) return 'Şifremi Unuttum'
    return 'Yeni Şifre Oluştur'
  }, [mode])

  useEffect(() => {
    refreshPublicIpCache()
  }, [])

  useEffect(() => {
    let alive = true

    const checkGateway = async () => {
      const result = await getApiHealth()
      if (!alive) return
      setGateway({
        online: result.online === true,
        pingMs: Number.isFinite(result.pingMs) ? result.pingMs : 0,
        checked: true,
      })
    }

    void checkGateway()
    const intervalId = window.setInterval(() => void checkGateway(), 20000)

    return () => {
      alive = false
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!resetToken) return

    ;(async () => {
      const result = await validateResetToken(resetToken)
      if (!result.success) {
        setErrors(result.errors || { global: 'Sıfırlama bağlantısı geçersiz.' })
        setNotice('')
        return
      }

      setErrors({})
      setNotice('Bağlantı doğrulandı. Şimdi yeni şifrenizi belirleyebilirsiniz.')
    })()
  }, [resetToken])

  useEffect(() => {
    if (!feedbackKey) return

    const timeoutMs = hasErrorFeedback ? 8500 : 5200
    const timeoutId = window.setTimeout(() => {
      setDismissedFeedbackKey(feedbackKey)
    }, timeoutMs)

    return () => clearTimeout(timeoutId)
  }, [feedbackKey, hasErrorFeedback])

  useEffect(() => {
    if (resetTokenFromUrl) return

    if (!hasRegisterDraftValue(registerForm)) {
      clearRegisterFlowDraft()
      return
    }

    saveRegisterFlowDraft({
      registerForm,
    })
  }, [registerForm, resetTokenFromUrl])

  const switchMode = (nextMode) => {
    if (isSubmitting) return

    setMode(nextMode)
    setErrors({})
    setNotice('')
    setDismissedFeedbackKey('')
  }

  const clearFieldError = (fieldName) => {
    if (errors[fieldName] || errors.global) {
      setDismissedFeedbackKey('')
      setErrors((prev) => ({
        ...prev,
        [fieldName]: '',
        global: '',
      }))
    }
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target

    setLoginForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    clearFieldError(name)
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target

    let nextValue = value

    if (name === 'email') {
      const raw = value.replace(/\s+/g, '').toLowerCase()
      // E-posta alanında sadece geçerli e-posta karakterlerine izin ver.
      if (!/^[a-z0-9._%+-]*@?[a-z0-9.-]*$/.test(raw)) {
        return
      }
      nextValue = raw
    } else if (name === 'username') {
      // Kullanıcı adı: harf + boşluk, en fazla 15 karakter.
      const raw = value.replace(/[^A-Za-z ]/g, '').slice(0, USERNAME_MAX_LENGTH)
      if (!raw) {
        nextValue = ''
      } else {
        nextValue = `${raw[0].toUpperCase()}${raw.slice(1)}`
      }
    }

    setRegisterForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
    clearFieldError(name)
  }

  const handleForgotChange = (event) => {
    const { name, value } = event.target
    const sanitized = value.replace(/\s+/g, '').toLowerCase()
    if (!/^[a-z0-9._%+-]*@?[a-z0-9.-]*$/.test(sanitized)) {
      return
    }

    setForgotForm((prev) => ({
      ...prev,
      [name]: sanitized,
    }))
    clearFieldError(name)
  }

  const handleResetChange = (event) => {
    const { name, value } = event.target
    setResetForm((prev) => ({
      ...prev,
      [name]: value,
    }))
    clearFieldError(name)
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setDismissedFeedbackKey('')
    setIsSubmitting(true)

    const result = await loginUser(loginForm)
    setIsSubmitting(false)

    if (!result.success) {
      setErrors(result.errors || {})

      if (result.reason === 'account_not_found') {
        const safeIdentifier = String(loginForm.identifier || '').trim().toLowerCase()

        setLoginForm((prev) => ({
          ...prev,
          password: '',
        }))

        if (emailRegex.test(safeIdentifier)) {
          setRegisterForm((prev) => ({
            ...prev,
            email: String(prev.email || '').trim() || safeIdentifier,
          }))
          setForgotForm((prev) => ({ ...prev, email: safeIdentifier }))
        }

        setErrors({
          global: 'Bu bilgilerle eşleşen bir hesap bulunamadı. Kayıt ekranına yönlendirildiniz.',
        })
        setNotice('Henüz hesabınız yoksa Kayıt Ol formunu doldurarak yeni hesap oluşturabilirsiniz.')
        setMode(AUTH_MODE.REGISTER)
        return
      }

      if (result.reason === 'invalid_credentials') {
        const safeIdentifier = String(loginForm.identifier || '').trim().toLowerCase()
        let registeredUsersExist = true
        try {
          registeredUsersExist = await hasRegisteredUsers()
        } catch {
          registeredUsersExist = true
        }

        setLoginForm((prev) => ({
          ...prev,
          password: '',
        }))

        if (!registeredUsersExist) {
          setErrors({
            global: 'Sistemde kayıtlı hesap bulunmadı. Kayıt ekranına yönlendirildiniz.',
          })
          setMode(AUTH_MODE.REGISTER)
          return
        }

        if (emailRegex.test(safeIdentifier)) {
          setForgotForm((prev) => ({ ...prev, email: safeIdentifier }))
        }
        setErrors({
          global: 'Şifreyi yanlış girdiniz. Şifremi Unuttum ekranına yönlendirildiniz.',
        })
        setNotice('Kayıtlı e-posta adresinizle şifrenizi sıfırlayıp tekrar giriş yapabilirsiniz.')
        setMode(AUTH_MODE.FORGOT)
      }

      return
    }

    setErrors({})
    setNotice('')
    clearRegisterFlowDraft()
    onAuthSuccess(result.user)
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setDismissedFeedbackKey('')
    setIsSubmitting(true)
    const result = await requestRegisterCode(registerForm)
    setIsSubmitting(false)

    if (!result.success) {
      setErrors(result.errors || {})
      if (result.reason === 'email_exists' || result.reason === 'username_exists') {
        const safeLoginIdentifier = String(
          result.reason === 'email_exists' ? registerForm.email : registerForm.username,
        )
          .trim()
          .toLowerCase()
        if (safeLoginIdentifier) {
          setLoginForm((prev) => ({ ...prev, identifier: safeLoginIdentifier, password: '' }))
        }
        if (result.reason === 'email_exists') {
          const safeEmailForLogin = String(registerForm.email || '').trim().toLowerCase()
          if (safeEmailForLogin) {
            setForgotForm((prev) => ({ ...prev, email: safeEmailForLogin }))
          }
        }
        setErrors({
          global:
            result.reason === 'email_exists'
              ? 'Bu hesap zaten kayıtlı. Giriş ekranına yönlendirildiniz.'
              : 'Bu kullanıcı adı zaten kayıtlı. Giriş ekranına yönlendirildiniz.',
        })
        setNotice(
          'Hesabınız varsa giriş yapabilirsiniz. Şifrenizi unuttuysanız Şifremi Unuttum seçeneğini kullanın.',
        )
        setMode(AUTH_MODE.LOGIN)
        return
      }
      if (result.reason === 'limit_reached') {
        setNotice('Bu cihaz veya IP için hesap limiti doldu. Farklı bir cihaz ya da ağ ile tekrar deneyin.')
      }
      return
    }

    setErrors({})
    setNotice(result.message || 'Kayıt tamamlandı. Oyuna giriş yapılıyor.')
    clearRegisterFlowDraft()
    try {
      localStorage.setItem(TUTORIAL_PENDING_KEY, '1')
      localStorage.removeItem('ticarnet_tutorial_completed')
      localStorage.setItem('ticarnet_tutorial_step', '0')
      localStorage.removeItem('ticarnet_tutorial_tasks')
      localStorage.setItem('ticarnet_live_narrator_welcome', '1')
    } catch {
      // ignore storage errors
    }
    onAuthSuccess(result.user)
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    setDismissedFeedbackKey('')
    setIsSubmitting(true)

    const result = await requestPasswordReset(forgotForm)
    setIsSubmitting(false)

    if (!result.success) {
      if (result.reason === 'not_found') {
        const safeEmail = String(forgotForm.email || '').trim().toLowerCase()
        if (safeEmail) {
          setRegisterForm((prev) => ({
            ...prev,
            email: String(prev.email || '').trim() || safeEmail,
          }))
        }
        setErrors({
          global: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Kayıt ekranına yönlendirildiniz.',
        })
        setNotice('Hesabınız yoksa Kayıt Ol ekranından yeni hesap oluşturabilirsiniz.')
        setMode(AUTH_MODE.REGISTER)
        return
      }
      setErrors(result.errors || {})
      return
    }

    setErrors({})
    setNotice(
      result.message ||
        'Şifre sıfırlama bağlantısı gönderildi. Bağlantı 3 dakika geçerlidir. Gelen kutunuzu ve spam klasörünü kontrol edin.',
    )
  }

  const handleResetSubmit = async (event) => {
    event.preventDefault()
    setDismissedFeedbackKey('')
    const safeToken = String(resetToken || '').trim()
    if (!safeToken) {
      setErrors({ global: 'E-postadaki şifre yenileme bağlantısı geçersiz veya eksik.' })
      return
    }
    setIsSubmitting(true)

    const result = await resetPasswordWithToken({
      token: safeToken,
      newPassword: resetForm.newPassword,
      confirmPassword: resetForm.confirmPassword,
    })
    setIsSubmitting(false)

    if (!result.success) {
      setErrors(result.errors || {})
      return
    }

    clearResetFlowParamsFromUrl()
    setResetToken('')
    setResetForm(initialResetForm)
    setErrors({})
    setNotice('Şifreniz yenilendi. Artık yeni şifrenizle giriş yapabilirsiniz.')
    setMode(AUTH_MODE.LOGIN)
  }

  return (
    <main className="auth-page-wrap">
      <div
        className="auth-bg"
        aria-hidden
      />
      <div
        className="relative z-10 flex min-h-screen min-h-dvh flex-col items-center justify-start sm:justify-center p-4 sm:p-6 w-full box-border"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <section className="w-full max-w-[min(100%,26rem)] flex flex-col items-center gap-5">
          {/* Hoş geldin başlığı */}
          <h1 className="auth-welcome-title text-center text-[26px] sm:text-3xl md:text-[34px] leading-tight px-4">
            TicarNet Online'a Hoş Geldiniz
          </h1>

          {/* Form alanı */}
          <section className="auth-card w-full px-4 py-5 sm:px-5 sm:py-6 space-y-5">
            {/* Logo + brand */}
            <div className="flex flex-col items-center gap-3">
              {logoLoadError ? (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-black text-3xl shadow-lg">
                  TN
                </div>
              ) : (
                <img
                  src="/splash/logo.webp"
                  alt="TicarNet"
                  className="w-24 h-24 rounded-2xl object-contain border border-amber-400/45 bg-slate-900/70 shadow-[0_12px_28px_rgba(0,0,0,0.7)]"
                  onError={() => setLogoLoadError(true)}
                />
              )}
              <p className="text-xs sm:text-sm text-slate-200/85 text-center tracking-wide">
                Güvenli Ticaret Ağı
              </p>
            </div>

            <h2 className="text-center font-display font-bold text-lg sm:text-xl text-slate-100 mt-2">
              {pageTitle}
            </h2>
            {/* Alt açıklama metni sade tutuldu. */}

            {/* Sunucu durumu */}
            <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-200/80">
              <span
                className={`inline-flex h-1.5 w-1.5 rounded-full ${
                  gateway.online ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span>
                {gateway.checked
                  ? gateway.online
                    ? 'Sunucu: Aktif'
                    : 'Sunucu: Çevrimdışı'
                  : 'Sunucu durumu kontrol ediliyor'}
              </span>
              {gateway.checked && gateway.pingMs ? (
                <span className="text-slate-300/80">• {gateway.pingMs} ms</span>
              ) : null}
            </div>

          {mode === AUTH_MODE.LOGIN ? (
            <form onSubmit={handleLoginSubmit} noValidate className="flex flex-col gap-4">
            <div className="space-y-4">
              <AuthInput
                id="identifier"
                name="identifier"
                label="E-posta veya kullanıcı adı"
                value={loginForm.identifier}
                onChange={handleLoginChange}
                placeholder="E-posta veya kullanıcı adınızı girin"
                error={errors.identifier}
                autoComplete="username"
              />
              <AuthPasswordField
                id="login-password"
                name="password"
                label="Şifre"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="Şifrenizi girin"
                error={errors.password}
                autoComplete="current-password"
              />
              </div>
              <button
                type="button"
                onClick={() => {
                  const safeIdentifier = String(loginForm.identifier || '').trim().toLowerCase()
                  if (emailRegex.test(safeIdentifier)) {
                    setForgotForm((prev) => ({ ...prev, email: safeIdentifier }))
                  }
                  switchMode(AUTH_MODE.FORGOT)
                }}
                className="auth-link-accent text-sm font-semibold text-right -mt-0.5 mb-1 touch-manipulation"
              >
                Şifremi Unuttum
              </button>
              <AuthButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </AuthButton>
            </form>
          ) : null}

          {mode === AUTH_MODE.REGISTER ? (
            <form onSubmit={handleRegisterSubmit} noValidate className="flex flex-col gap-4">
              <div className="space-y-4">
              <AuthInput
                id="register-username"
                name="username"
                label="Kullanıcı Adı"
                value={registerForm.username}
                onChange={handleRegisterChange}
                placeholder="Kullanıcı adınızı yazın"
                error={errors.username}
                autoComplete="username"
                maxLength={USERNAME_MAX_LENGTH}
              />
              <AuthInput
                id="register-email"
                name="email"
                type="email"
                label="E-posta"
                value={registerForm.email}
                onChange={handleRegisterChange}
                placeholder="E-posta adresinizi girin"
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={80}
              />
              <AuthPasswordField
                id="register-password"
                name="password"
                label="Şifre"
                value={registerForm.password}
                onChange={handleRegisterChange}
                placeholder="Şifrenizi girin"
                error={errors.password}
                autoComplete="new-password"
              />
              <AuthPasswordField
                id="register-confirm-password"
                name="confirmPassword"
                label="Şifreyi tekrar gir"
                value={registerForm.confirmPassword}
                onChange={handleRegisterChange}
                placeholder="Şifrenizi tekrar girin"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
              </div>
              <AuthButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Kayıt oluşturuluyor...' : 'Kayıt Ol'}
              </AuthButton>
            </form>
          ) : null}

          {mode === AUTH_MODE.RESET ? (
            <form onSubmit={handleResetSubmit} noValidate className="flex flex-col gap-4">
              <p className="text-sm text-slate-400">
                E-postadaki şifre yenileme bağlantısından açıldınız. Yeni şifrenizi girin.
              </p>
              <AuthPasswordField
                id="reset-password"
                name="newPassword"
                label="Yeni Şifre"
                value={resetForm.newPassword}
                onChange={handleResetChange}
                placeholder="Yeni şifre"
                error={errors.newPassword}
                autoComplete="new-password"
              />
              <AuthPasswordField
                id="reset-confirm-password"
                name="confirmPassword"
                label="Yeni Şifre (Tekrar)"
                value={resetForm.confirmPassword}
                onChange={handleResetChange}
                placeholder="Yeni şifreyi tekrar girin"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />
              <p className="text-[11px] sm:text-xs text-slate-300/85 -mt-1 mb-1">
                Şifre 8-64 karakter olmalı; en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.
              </p>
              <AuthButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Güncelleniyor...' : 'Yeni Şifreyi Kaydet'}
              </AuthButton>
              <AuthButton type="button" variant="secondary" onClick={() => {
                  clearResetFlowParamsFromUrl()
                setResetToken('')
                setMode(AUTH_MODE.LOGIN)
                setErrors({})
              }}>
                Giriş ekranına dön
              </AuthButton>
            </form>
          ) : null}
          </section>

          {/* Alt yönlendirme bağlantıları */}
          {mode === AUTH_MODE.LOGIN ? (
            <p className="text-center mt-6 text-sm text-slate-400">
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={() => switchMode(AUTH_MODE.REGISTER)}
                className="auth-link-accent font-semibold touch-manipulation bg-transparent border-none cursor-pointer"
              >
                Kayıt Ol
              </button>
            </p>
          ) : null}
          {mode === AUTH_MODE.REGISTER ? (
            <p className="text-center mt-6 text-sm text-slate-400">
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => switchMode(AUTH_MODE.LOGIN)}
                className="auth-link-accent font-semibold touch-manipulation bg-transparent border-none cursor-pointer"
              >
                Giriş Yap
              </button>
            </p>
          ) : null}
        </section>
      </div>

      {/* Şifremi Unuttum modalı */}
      {mode === AUTH_MODE.FORGOT ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto px-4 py-[max(1rem,env(safe-area-inset-top))] sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Pencereyi kapat"
            onClick={() => {
              if (!isSubmitting) {
                switchMode(AUTH_MODE.LOGIN)
              }
            }}
          />
          <section className="relative z-50 my-auto w-full max-w-md max-h-[min(38rem,calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] overflow-y-auto rounded-2xl border border-amber-700/50 bg-slate-950/90 px-5 py-5 sm:px-6 sm:py-6 shadow-[0_24px_50px_rgba(0,0,0,0.7)]">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-50 text-center mb-1">
              Şifremi Unuttum
            </h2>
            <p className="text-sm text-slate-300 text-center mb-4">
              Hesabınız için kayıtlı e-posta adresini yazın. Şifre yenileme bağlantısını size göndereceğiz.
            </p>
            <form onSubmit={handleForgotSubmit} noValidate className="flex flex-col gap-4">
              <AuthInput
                id="forgot-email-modal"
                name="email"
                type="email"
                label="E-posta"
                value={forgotForm.email}
                onChange={handleForgotChange}
                placeholder="E-posta adresinizi girin"
                error={errors.email}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={80}
              />
              <AuthButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Gönderiliyor...' : 'Şifre Yenile'}
              </AuthButton>
              <AuthButton
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!isSubmitting) {
                    switchMode(AUTH_MODE.LOGIN)
                  }
                }}
              >
                Giriş Ekranına Dön
              </AuthButton>
            </form>
          </section>
        </div>
      ) : null}

      {isFeedbackVisible ? (
        <aside
          className={`fixed left-1/2 -translate-x-1/2 w-[min(380px,calc(100vw-1.5rem))] rounded-xl border p-3 flex items-center justify-between gap-3 shadow-xl z-50 ${
            hasErrorFeedback
              ? 'border-red-500/40 bg-red-950/90 text-red-200'
              : 'border-emerald-800/40 bg-emerald-950/80 text-emerald-100'
          }`}
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          role={hasErrorFeedback ? 'alert' : 'status'}
          aria-live={hasErrorFeedback ? 'assertive' : 'polite'}
        >
          <span className="text-sm font-medium flex-1">{floatingFeedback}</span>
          <button
            type="button"
            onClick={() => setDismissedFeedbackKey(feedbackKey)}
            className="shrink-0 min-h-[36px] px-3 rounded-lg border border-amber-700/50 bg-amber-500/10 text-amber-200 text-xs font-bold hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="Kapat"
          >
            Kapat
          </button>
        </aside>
      ) : null}
    </main>
  )
}

export default AuthPage
