const localeByLanguage = {
  en: 'en-US',
  ar: 'ar-LB-u-ca-gregory',
}

export function localeFor(language = 'en') {
  return localeByLanguage[language?.split('-')[0]] || localeByLanguage.en
}

export function formatNumber(value, language, options) {
  return new Intl.NumberFormat(localeFor(language), options).format(value)
}

export function formatUtcDate(value, language, options = {}) {
  return new Intl.DateTimeFormat(localeFor(language), {
    timeZone: 'UTC',
    ...options,
  }).format(value instanceof Date ? value : new Date(value))
}

export function formatUtcDateKey(value, language, options = {}) {
  return formatUtcDate(`${value}T00:00:00.000Z`, language, options)
}
