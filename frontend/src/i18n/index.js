import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEn from './locales/en/common.json'
import dashboardEn from './locales/en/dashboard.json'
import homeEn from './locales/en/home.json'
import authEn from './locales/en/auth.json'
import connectionEn from './locales/en/connection.json'
import patientEn from './locales/en/patient.json'
import physiotherapistEn from './locales/en/physiotherapist.json'
import adminEn from './locales/en/admin.json'
import clinicalEn from './locales/en/clinical.json'

import commonAr from './locales/ar/common.json'
import dashboardAr from './locales/ar/dashboard.json'
import homeAr from './locales/ar/home.json'
import authAr from './locales/ar/auth.json'
import connectionAr from './locales/ar/connection.json'
import patientAr from './locales/ar/patient.json'
import physiotherapistAr from './locales/ar/physiotherapist.json'
import adminAr from './locales/ar/admin.json'
import clinicalAr from './locales/ar/clinical.json'

export const LANGUAGE_STORAGE_KEY = 'physiocare-language'
export const SUPPORTED_LANGUAGES = ['en', 'ar']

function normalizeLanguage(value) {
  const language = value?.toLowerCase().split('-')[0]
  return SUPPORTED_LANGUAGES.includes(language) ? language : null
}

function storedLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return null
  }
}

function initialLanguage() {
  return storedLanguage() || normalizeLanguage(navigator.language) || 'en'
}

const resources = {
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    home: homeEn,
    auth: authEn,
    connection: connectionEn,
    patient: patientEn,
    physiotherapist: physiotherapistEn,
    admin: adminEn,
    clinical: clinicalEn,
  },
  ar: {
    common: commonAr,
    dashboard: dashboardAr,
    home: homeAr,
    auth: authAr,
    connection: connectionAr,
    patient: patientAr,
    physiotherapist: physiotherapistAr,
    admin: adminAr,
    clinical: clinicalAr,
  },
}

function syncDocument(language) {
  const nextLanguage = normalizeLanguage(language) || 'en'
  document.documentElement.lang = nextLanguage
  document.documentElement.dir = nextLanguage === 'ar' ? 'rtl' : 'ltr'

  const title = i18n.t('meta.title', { lng: nextLanguage, ns: 'common' })
  const description = i18n.t('meta.description', {
    lng: nextLanguage,
    ns: 'common',
  })
  document.title = title
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', description)

  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  } catch {
    // Language switching remains available when storage is blocked.
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage(),
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    load: 'languageOnly',
    defaultNS: 'common',
    ns: [
      'common',
      'dashboard',
      'home',
      'auth',
      'connection',
      'patient',
      'physiotherapist',
      'admin',
      'clinical',
    ],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })

syncDocument(i18n.resolvedLanguage)
i18n.on('languageChanged', syncDocument)

export default i18n
