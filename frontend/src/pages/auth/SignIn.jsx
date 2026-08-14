import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../../components/Brand.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'
import api, { testBackendConnection } from '../../services/api.js'
import useAuth from '../../auth/useAuth.js'
import './SignIn.css'

const dashboardByRole = {
  patient: '/patient/dashboard',
  physiotherapist: '/physiotherapist/dashboard',
  admin: '/admin/dashboard',
}

function getSignInErrorKey(error) {
  const status = error.response?.status
  const message = String(
    error.response?.data?.message || error.message || '',
  ).toLowerCase()

  if (!error.response) return 'signin.errors.network'
  if (message.includes('confirm') && message.includes('email')) {
    return 'signin.errors.emailNotConfirmed'
  }
  if (status === 401 || message.includes('invalid email or password')) {
    return 'signin.errors.invalidCredentials'
  }
  if (message.includes('not initialized') || message.includes('migration')) {
    return 'signin.errors.databaseNotReady'
  }
  if (status >= 500) return 'signin.errors.serviceUnavailable'
  return 'signin.errors.default'
}

function SignIn() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const { establishSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState('')
  const [databaseStatus, setDatabaseStatus] = useState('checking')

  const checkDatabase = useCallback(async () => {
    setDatabaseStatus('checking')

    try {
      const data = await testBackendConnection()
      setDatabaseStatus(
        data.database?.connected ? 'connected' : 'unavailable',
      )
    } catch {
      setDatabaseStatus('unavailable')
    }
  }, [])

  useEffect(() => {
    checkDatabase()
  }, [checkDatabase])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorKey('')
    setLoading(true)

    try {
      const response = await api.post('/auth/signin', {
        email: email.trim().toLowerCase(),
        password,
      })

      const { session, profile } = response.data.data
      const dashboard = dashboardByRole[profile.role]

      if (!dashboard) {
        setErrorKey('signin.errors.unsupportedRole')
        return
      }

      await establishSession(session, profile)
      navigate(dashboard, { replace: true })
    } catch (requestError) {
      setErrorKey(getSignInErrorKey(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signin-page">
      <section
        className="signin-intro"
        aria-labelledby="signin-intro-title"
      >
        <Brand fullName inverse />

        <div className="signin-intro__content">
          <p className="signin-eyebrow">{t('signin.intro.eyebrow')}</p>
          <h1 id="signin-intro-title">{t('signin.intro.title')}</h1>
          <p>{t('signin.intro.description')}</p>
        </div>

        <div className="signin-intro__note">
          <span aria-hidden="true">✓</span>
          <p>{t('signin.intro.note')}</p>
        </div>
        <span className="signin-intro__orb" aria-hidden="true" />
      </section>

      <section className="signin-panel" aria-labelledby="signin-title">
        <div className="signin-panel__toolbar">
          <Brand className="signin-panel__brand" fullName />
          <LanguageSwitcher compact />
        </div>

        <form
          className="signin-card"
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <div className="signin-card__heading">
            <h2 id="signin-title">{t('signin.title')}</h2>
            <p>{t('signin.subtitle')}</p>
          </div>

          <div
            className={`database-status database-status--${databaseStatus}`}
            role="status"
            aria-live="polite"
            aria-busy={databaseStatus === 'checking'}
          >
            <span className="database-status__indicator" aria-hidden="true" />
            <span>{t(`signin.database.${databaseStatus}`)}</span>
            {databaseStatus === 'unavailable' && (
              <button type="button" onClick={checkDatabase}>
                {t('common:actions.retry')}
              </button>
            )}
          </div>

          {errorKey && (
            <div className="signin-message signin-message--error" role="alert">
              <span className="signin-message__icon" aria-hidden="true">
                !
              </span>
              <p>{t(errorKey)}</p>
            </div>
          )}

          <label className="signin-field" htmlFor="signin-email">
            <span>{t('common:fields.email')}</span>
            <input
              id="signin-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('signin.fields.emailPlaceholder')}
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <div className="signin-field">
            <label htmlFor="signin-password">
              {t('common:fields.password')}
            </label>
            <div className="signin-password">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('signin.fields.passwordPlaceholder')}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={t(
                  showPassword
                    ? 'signin.fields.hidePassword'
                    : 'signin.fields.showPassword',
                )}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {t(
                  showPassword
                    ? 'signin.fields.hidePassword'
                    : 'signin.fields.showPassword',
                )}
              </button>
            </div>
          </div>

          <div className="signin-options">
            <Link to="/forgot-password">{t('signin.forgotPassword')}</Link>
          </div>

          <button className="signin-submit" type="submit" disabled={loading}>
            {loading && <span className="signin-spinner" aria-hidden="true" />}
            {t(loading ? 'signin.submitting' : 'signin.submit')}
          </button>

          <p className="signin-register">
            {t('signin.registerPrompt')}{' '}
            <Link to="/register">{t('signin.registerAction')}</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default SignIn
