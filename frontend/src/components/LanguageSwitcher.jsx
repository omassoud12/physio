import { useTranslation } from 'react-i18next'
import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from '../i18n/index.js'
import './LanguageSwitcher.css'

function LanguageSwitcher({ className = '', compact = false, inverse = false }) {
  const { i18n, t } = useTranslation('common')
  const activeLanguage = i18n.resolvedLanguage?.split('-')[0] || 'en'
  const classes = [
    'language-switcher',
    compact ? 'language-switcher--compact' : '',
    inverse ? 'language-switcher--inverse' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  function selectLanguage(language) {
    if (language === activeLanguage) return

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // The language still changes when browser storage is unavailable.
    }
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    void i18n.changeLanguage(language)
  }

  return (
    <div className={classes} role="group" aria-label={t('language.label')}>
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          className="language-switcher__option"
          type="button"
          key={language}
          onClick={() => selectLanguage(language)}
          aria-pressed={activeLanguage === language}
        >
          {t(`language.${language}`)}
        </button>
      ))}
    </div>
  )
}

export { LANGUAGE_STORAGE_KEY }
export default LanguageSwitcher
