import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import Brand from '../../components/Brand.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'
import api from '../../services/api.js'
import './SignIn.css'
import './Register.css'

function getRegisterErrorKey(error) {
  const status = error.response?.status
  const message = String(
    error.response?.data?.message || error.message || '',
  ).toLowerCase()

  if (!error.response) return 'register.errors.network'
  if (
    status === 409 ||
    message.includes('already exists') ||
    message.includes('already registered')
  ) {
    return 'register.errors.emailExists'
  }
  if (message.includes('profile') && message.includes('not be saved')) {
    return 'register.errors.profileNotSaved'
  }
  if (status === 400) return 'register.errors.invalidDetails'
  if (status >= 500) return 'register.errors.serviceUnavailable'
  return 'register.errors.default'
}

function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  })
  const [loading, setLoading] = useState(false)
  const [errorKey, setErrorKey] = useState('')
  const [success, setSuccess] = useState(false)

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function togglePassword(field) {
    setShowPassword((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorKey('')
    setSuccess(false)

    if (form.password !== form.confirmPassword) {
      setErrorKey('register.errors.passwordMismatch')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/signup', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      const { session, profile, requiresEmailConfirmation } = response.data.data

      if (requiresEmailConfirmation) {
        setSuccess(true)
        return
      }

      localStorage.setItem('supabase_session', JSON.stringify(session))
      localStorage.setItem('user_profile', JSON.stringify(profile))
      navigate('/patient/dashboard', { replace: true })
    } catch (requestError) {
      setErrorKey(getRegisterErrorKey(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signin-page register-page">
      <section
        className="signin-intro register-intro"
        aria-labelledby="register-intro-title"
      >
        <Brand fullName inverse />

        <div className="signin-intro__content">
          <p className="signin-eyebrow">{t('register.intro.eyebrow')}</p>
          <h1 id="register-intro-title">{t('register.intro.title')}</h1>
          <p>{t('register.intro.description')}</p>
        </div>

        <div className="signin-intro__note">
          <span aria-hidden="true">✓</span>
          <p>{t('register.intro.note')}</p>
        </div>
        <span className="signin-intro__orb" aria-hidden="true" />
      </section>

      <section className="signin-panel" aria-labelledby="register-title">
        <div className="signin-panel__toolbar">
          <Brand className="signin-panel__brand" fullName />
          <LanguageSwitcher compact />
        </div>

        <form
          className="signin-card register-card"
          onSubmit={handleSubmit}
          aria-busy={loading}
        >
          <div className="signin-card__heading">
            <h2 id="register-title">{t('register.title')}</h2>
            <p>{t('register.subtitle')}</p>
          </div>

          {errorKey && (
            <div className="signin-message signin-message--error" role="alert">
              <span className="signin-message__icon" aria-hidden="true">
                !
              </span>
              <p>{t(errorKey)}</p>
            </div>
          )}

          {success && (
            <div
              className="signin-message register-success"
              role="status"
              aria-live="polite"
            >
              <span className="signin-message__icon" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>{t('register.success.title')}</strong>
                <p>{t('register.success.description')}</p>
              </div>
            </div>
          )}

          {!success && (
            <>
              <div className="register-name-row">
                <label className="signin-field" htmlFor="register-first-name">
                  <span>{t('register.fields.firstName')}</span>
                  <input
                    id="register-first-name"
                    name="firstName"
                    value={form.firstName}
                    onChange={updateField}
                    autoComplete="given-name"
                    required
                    disabled={loading}
                  />
                </label>
                <label className="signin-field" htmlFor="register-last-name">
                  <span>{t('register.fields.lastName')}</span>
                  <input
                    id="register-last-name"
                    name="lastName"
                    value={form.lastName}
                    onChange={updateField}
                    autoComplete="family-name"
                    required
                    disabled={loading}
                  />
                </label>
              </div>

              <label className="signin-field" htmlFor="register-gender">
                <span>{t('common:gender.label')}</span>
                <select
                  id="register-gender"
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                  required
                  disabled={loading}
                >
                  <option value="">{t('common:gender.select')}</option>
                  <option value="female">{t('common:gender.female')}</option>
                  <option value="male">{t('common:gender.male')}</option>
                </select>
              </label>

              <label className="signin-field" htmlFor="register-email">
                <span>{t('common:fields.email')}</span>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </label>

              <div className="signin-field">
                <label htmlFor="register-password">
                  {t('common:fields.password')}
                </label>
                <div className="signin-password">
                  <input
                    id="register-password"
                    type={showPassword.password ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={updateField}
                    autoComplete="new-password"
                    minLength="8"
                    aria-describedby="register-password-hint"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('password')}
                    aria-label={t(
                      showPassword.password
                        ? 'register.fields.hidePassword'
                        : 'register.fields.showPassword',
                    )}
                    aria-pressed={showPassword.password}
                    disabled={loading}
                  >
                    {t(
                      showPassword.password
                        ? 'register.fields.hidePassword'
                        : 'register.fields.showPassword',
                    )}
                  </button>
                </div>
                <small className="signin-field__hint" id="register-password-hint">
                  {t('register.fields.passwordHint')}
                </small>
              </div>

              <div className="signin-field">
                <label htmlFor="register-confirm-password">
                  {t('register.fields.confirmPassword')}
                </label>
                <div className="signin-password">
                  <input
                    id="register-confirm-password"
                    type={showPassword.confirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateField}
                    autoComplete="new-password"
                    minLength="8"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('confirmPassword')}
                    aria-label={t(
                      showPassword.confirmPassword
                        ? 'register.fields.hidePassword'
                        : 'register.fields.showPassword',
                    )}
                    aria-pressed={showPassword.confirmPassword}
                    disabled={loading}
                  >
                    {t(
                      showPassword.confirmPassword
                        ? 'register.fields.hidePassword'
                        : 'register.fields.showPassword',
                    )}
                  </button>
                </div>
              </div>

              <button className="signin-submit" type="submit" disabled={loading}>
                {loading && (
                  <span className="signin-spinner" aria-hidden="true" />
                )}
                {t(loading ? 'register.submitting' : 'register.submit')}
              </button>
            </>
          )}

          <p className="signin-register">
            {t('register.signInPrompt')}{' '}
            <Link to="/signin">{t('register.signInAction')}</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

export default Register
