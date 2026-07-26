import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Brand from '../components/Brand.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import './Home.css'

const serviceKeys = ['pain', 'sports', 'surgery']
const highlightKeys = ['care', 'experience', 'satisfaction']
const approachKeys = ['assessment', 'plan', 'progress']

function Home() {
  const { i18n, t } = useTranslation('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const weekDays = t('hero.preview.weekDays', { returnObjects: true })
  const numberFormatter = new Intl.NumberFormat(i18n.resolvedLanguage, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  })
  const yearFormatter = new Intl.NumberFormat(i18n.resolvedLanguage, {
    useGrouping: false,
  })

  useEffect(() => {
    if (!menuOpen) return undefined

    function closeOnEscape(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <main className="home-page">
      <a className="skip-link" href="#home-content">
        {t('common:navigation.skipToContent')}
      </a>
      <header className="home-header">
        <Brand />

        <nav
          className={`home-nav${menuOpen ? ' is-open' : ''}`}
          id="home-navigation"
          aria-label={t('navigation.label')}
        >
          <a href="#services" onClick={closeMenu}>
            {t('navigation.services')}
          </a>
          <a href="#approach" onClick={closeMenu}>
            {t('navigation.approach')}
          </a>
          <Link to="/signin" onClick={closeMenu}>
            {t('navigation.signIn')}
          </Link>
          <Link
            className="home-button home-button--small"
            to="/register"
            onClick={closeMenu}
          >
            {t('navigation.getStarted')}
          </Link>
        </nav>

        <div className="home-header__controls">
          <LanguageSwitcher />
          <button
            className="home-menu-button"
            type="button"
            aria-label={t(
              menuOpen ? 'navigation.closeMenu' : 'navigation.openMenu',
            )}
            aria-controls="home-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </header>

      <section
        className="home-hero"
        id="home-content"
        aria-labelledby="home-hero-title"
      >
        <div className="home-hero__content">
          <p className="home-kicker">
            <span aria-hidden="true" />
            {t('hero.kicker')}
          </p>
          <h1 id="home-hero-title">
            {t('hero.titleLine1')}
            <br />
            <em>{t('hero.titleLine2')}</em>
          </h1>
          <p className="home-hero__description">{t('hero.description')}</p>
          <div className="home-hero__actions">
            <Link className="home-button" to="/register">
              {t('hero.primaryAction')}
              <span className="home-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <a className="home-text-link" href="#services">
              {t('hero.secondaryAction')}
            </a>
          </div>
          <div className="home-trust" aria-label={t('hero.highlightsLabel')}>
            {highlightKeys.map((highlight) => (
              <div key={highlight}>
                <strong>{t(`hero.highlights.${highlight}.value`)}</strong>
                <span>{t(`hero.highlights.${highlight}.label`)}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="home-hero__visual"
          aria-label={t('hero.preview.label')}
        >
          <div className="home-visual__glow" aria-hidden="true" />
          <div className="home-visual__card home-visual__card--main">
            <div className="home-visual__header">
              <span>{t('hero.preview.heading')}</span>
              <span className="home-status">
                <i aria-hidden="true" />
                {t('hero.preview.status')}
              </span>
            </div>
            <div className="home-progress">
              <div className="home-progress__ring">
                <strong>{t('hero.preview.progress')}</strong>
                <span>{t('hero.preview.complete')}</span>
              </div>
              <div className="home-progress__copy">
                <span>{t('hero.preview.focusLabel')}</span>
                <strong>{t('hero.preview.focus')}</strong>
                <p>{t('hero.preview.note')}</p>
              </div>
            </div>
            <div className="home-week">
              {Array.isArray(weekDays) &&
                weekDays.map((day, index) => {
                  const isComplete = index < 4
                  return (
                    <div
                      className={isComplete ? 'is-complete' : ''}
                      key={`${day}-${index}`}
                      aria-label={t(
                        isComplete
                          ? 'hero.preview.completedDay'
                          : 'hero.preview.upcomingDay',
                        { day },
                      )}
                    >
                      <span aria-hidden="true">{day}</span>
                      <i aria-hidden="true">
                        {isComplete ? '✓' : numberFormatter.format(5)}
                      </i>
                    </div>
                  )
                })}
            </div>
          </div>
          <div className="home-visual__card home-visual__card--appointment">
            <span className="home-appointment__icon" aria-hidden="true">
              +
            </span>
            <div>
              <small>{t('hero.preview.appointmentLabel')}</small>
              <strong>{t('hero.preview.appointment')}</strong>
            </div>
          </div>
          <div className="home-visual__badge">
            <strong>{t('hero.preview.rating')}</strong>
            <span aria-label={t('hero.preview.starsLabel')}>★★★★★</span>
            <small>{t('hero.preview.ratingLabel')}</small>
          </div>
        </div>
      </section>

      <section className="home-services" id="services">
        <div className="home-section-heading">
          <div>
            <p className="home-kicker">
              <span aria-hidden="true" />
              {t('services.kicker')}
            </p>
            <h2>{t('services.title')}</h2>
          </div>
          <p>{t('services.description')}</p>
        </div>
        <div className="home-service-grid">
          {serviceKeys.map((service, index) => (
            <article className="home-service-card" key={service}>
              <span>{numberFormatter.format(index + 1)}</span>
              <h3>{t(`services.items.${service}.title`)}</h3>
              <p>{t(`services.items.${service}.description`)}</p>
              <Link
                to="/register"
                aria-label={t('services.actionLabel', {
                  service: t(`services.items.${service}.title`),
                })}
              >
                {t('services.action')}
                <span className="home-arrow home-arrow--diagonal" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-approach" id="approach">
        <div className="home-approach__statement">
          <p className="home-kicker home-kicker--light">
            <span aria-hidden="true" />
            {t('approach.kicker')}
          </p>
          <h2>{t('approach.title')}</h2>
        </div>
        <ol className="home-steps">
          {approachKeys.map((step, index) => (
            <li key={step}>
              <span>{numberFormatter.format(index + 1)}</span>
              <div>
                <strong>{t(`approach.steps.${step}.title`)}</strong>
                <p>{t(`approach.steps.${step}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-title">
        <p className="home-kicker">
          <span aria-hidden="true" />
          {t('cta.kicker')}
        </p>
        <h2 id="home-cta-title">{t('cta.title')}</h2>
        <p>{t('cta.description')}</p>
        <Link className="home-button" to="/register">
          {t('cta.action')}
          <span className="home-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </section>

      <footer className="home-footer">
        <Brand />
        <p>{t('footer.tagline')}</p>
        <span>
          {t('footer.copyright', {
            year: yearFormatter.format(new Date().getFullYear()),
          })}
        </span>
      </footer>
    </main>
  )
}

export default Home
