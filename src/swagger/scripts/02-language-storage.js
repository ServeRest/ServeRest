const flagUrls = {
  'pt-BR': '/flags/flag_brazil.svg',
  en: '/flags/flag_uk.svg',
  es: '/flags/flag_peru.svg'
}

const supportedLanguages = [
  { code: 'pt-BR', label: 'Português do Brasil' },
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' }
]

function getPreferredLanguage () {
  return window.localStorage.getItem('swaggerLanguage') || 'pt-BR'
}

function setPreferredLanguage (code) {
  window.localStorage.setItem('swaggerLanguage', code)
}

function getLanguageFromQuery () {
  const url = new URL(window.location.href)
  return url.searchParams.get('lang') || ''
}

function getCurrentLanguageCode () {
  const queryLang = getLanguageFromQuery()
  const preferred = getPreferredLanguage()
  return supportedLanguages.some(l => l.code === queryLang)
    ? queryLang
    : (supportedLanguages.some(l => l.code === preferred) ? preferred : 'pt-BR')
}

function preloadFlags () {
  if (typeof document === 'undefined' || !document.head) return
  Object.values(flagUrls).forEach(href => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = href
    document.head.appendChild(link)
  })
}

function preloadSwaggerJson () {
  if (typeof document === 'undefined' || !document.head) return
  const code = getCurrentLanguageCode()
  const href = '/swagger.json?lang=' + encodeURIComponent(code)
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'fetch'
  link.href = href
  link.crossOrigin = ''
  document.head.appendChild(link)
}
