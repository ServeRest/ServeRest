const lastLanguageKey = 'swaggerLastLanguage'

function renderLanguageSwitcher (parent) {
  if (document.querySelector('.lang-switcher')) return
  const root = parent || document.querySelector('.swagger-ui')
  if (!root) return
  const wrapper = document.createElement('div')
  wrapper.className = 'lang-switcher'
  wrapper.setAttribute('aria-label', 'Seleção de idioma')
  const currentLang = getPreferredLanguage()
  supportedLanguages.forEach(language => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lang-switcher__button'
    button.setAttribute('data-lang', language.code)
    button.setAttribute('aria-label', language.label)
    const flagUrl = flagUrls[language.code]
    if (flagUrl) {
      const img = document.createElement('img')
      img.className = 'lang-switcher__flag'
      img.src = flagUrl
      img.alt = ''
      img.width = 20
      img.height = 14
      button.appendChild(img)
    } else {
      button.textContent = language.code
    }
    if (language.code === currentLang) {
      button.classList.add('is-active')
    }
    button.addEventListener('click', () => {
      if (language.code === getPreferredLanguage()) return
      const previousLanguage = getPreferredLanguage()
      window.sessionStorage.setItem(lastLanguageKey, previousLanguage)
      setPreferredLanguage(language.code)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', language.code)
      window.history.replaceState({}, '', url.toString())
      wrapper.querySelectorAll('.lang-switcher__button').forEach(el => {
        el.classList.toggle('is-active', el.getAttribute('data-lang') === language.code)
      })
      resetTranslationCache()
      const shouldRefresh = setRefreshFlagFromState(language.code)
      updateSwaggerSpec(language.code, shouldRefresh)
      applyTranslations(language.code)
      updateReleaseToastLanguage(language.code)
    })
    wrapper.appendChild(button)
  })
  root.appendChild(wrapper)
}
