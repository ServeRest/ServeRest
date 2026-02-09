const lastLanguageKey = 'swaggerLastLanguage'

function renderLanguageSwitcher (parent) {
  if (document.querySelector('.lang-switcher')) return
  const root = parent || document.querySelector('.swagger-ui')
  if (!root) return
  const currentLang = getPreferredLanguage()
  root.setAttribute('data-docs-lang', currentLang)
  const wrapper = document.createElement('div')
  wrapper.className = 'lang-switcher'
  wrapper.setAttribute('aria-label', 'Seleção de idioma')
  let glowTimeoutId = null
  supportedLanguages.forEach(language => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lang-switcher__button'
    button.setAttribute('data-lang', language.code)
    button.setAttribute('aria-label', language.label)
    button.setAttribute('title', language.label)
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
      root.setAttribute('data-docs-lang', language.code)
      if (glowTimeoutId) clearTimeout(glowTimeoutId)
      wrapper.classList.remove('lang-switcher--glow')
      wrapper.removeAttribute('data-glow-lang')
      wrapper.offsetHeight
      wrapper.classList.add('lang-switcher--glow')
      wrapper.setAttribute('data-glow-lang', language.code)
      glowTimeoutId = setTimeout(() => {
        glowTimeoutId = null
        wrapper.classList.remove('lang-switcher--glow')
        wrapper.removeAttribute('data-glow-lang')
      }, 1000)
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
      setTimeout(() => applyTranslations(language.code), 100)
      updateReleaseToastLanguage(language.code)
    })
    wrapper.appendChild(button)
  })
  root.appendChild(wrapper)
}
