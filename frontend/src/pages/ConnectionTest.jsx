import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Brand from '../components/Brand.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import heroImg from '../assets/hero.png'
import { testBackendConnection } from '../services/api.js'
import '../App.css'

function ConnectionTest() {
  const { t } = useTranslation('connection')
  const [status, setStatus] = useState('loading')

  const checkConnection = useCallback(async () => {
    setStatus('loading')

    try {
      await testBackendConnection()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return (
    <main className="connection-page">
      <header className="connection-header">
        <Brand fullName />
        <LanguageSwitcher compact />
      </header>

      <section className="connection-card" aria-labelledby="connection-title">
        <div className="connection-card__visual">
          <span className="connection-card__halo" aria-hidden="true" />
          <img
            src={heroImg}
            className="clinic-image"
            alt={t('imageAlt')}
          />
        </div>

        <div className="connection-card__content">
          <p className="connection-eyebrow">{t('eyebrow')}</p>
          <h1 id="connection-title">{t('title')}</h1>
          <p className="connection-description">{t('description')}</p>

          <div
            className={`connection connection--${status}`}
            role={status === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            aria-busy={status === 'loading'}
          >
            <span className="connection__indicator" aria-hidden="true" />
            <div>
              <strong>{t(`status.${status}.title`)}</strong>
              <span>{t(`status.${status}.description`)}</span>
            </div>
          </div>

          <button
            type="button"
            className="connection-button"
            onClick={checkConnection}
            disabled={status === 'loading'}
          >
            {status === 'loading' && (
              <span className="connection-button__spinner" aria-hidden="true" />
            )}
            {t(status === 'loading' ? 'button.checking' : 'button.test')}
          </button>
          <p className="connection-hint">{t('hint')}</p>
        </div>
      </section>
    </main>
  )
}

export default ConnectionTest
