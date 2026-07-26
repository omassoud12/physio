import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Brand from '../../components/Brand.jsx'
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx'

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem('user_profile') || '{}')
  } catch {
    return {}
  }
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M15.5 8.5 19 12m0 0-3.5 3.5M19 12H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

export default function DashboardLayout({ title, subtitle, role, children }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const navigate = useNavigate()
  const profile = readProfile()
  const firstName = profile.first_name || ''
  const lastName = profile.last_name || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toLocaleUpperCase() || 'PC'

  function signOut() {
    localStorage.removeItem('supabase_session')
    localStorage.removeItem('user_profile')
    navigate('/signin', { replace: true })
  }

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#dashboard-content">
        {t('common:navigation.skipToContent')}
      </a>

      <header
        className="dashboard-header"
        aria-label={t('layout.headerLabel')}
      >
        <div className="dashboard-header__inner">
          <Brand />

          <div className="dashboard-header__tools">
            <LanguageSwitcher compact />
            <div
              className="dashboard-user"
              aria-label={t('layout.accountMenu')}
            >
              <div className="avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="dashboard-user__identity">
                <strong>{fullName || profile.email}</strong>
                <small className="ltr-value">{profile.email}</small>
              </div>
              <button
                className="button button--quiet dashboard-signout"
                type="button"
                onClick={signOut}
                aria-label={t('common:actions.signOut')}
              >
                <SignOutIcon />
                <span>{t('common:actions.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main" id="dashboard-content">
        <section className="dashboard-title">
          <div>
            <p className="eyebrow">{t('layout.portal', { role })}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </section>
        {children}
      </main>
    </div>
  )
}

export function Notice({ value, error = false }) {
  if (!value) return null

  return (
    <div
      className={`notice ${error ? 'notice--error' : ''}`}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      <span>{value}</span>
    </div>
  )
}
