/* global __RELEASE_INFO__, __CURRENT_VERSION__, __FORCE_BANNER__ */
(function () {
  const releaseInfo = __RELEASE_INFO__
  const currentVersion = __CURRENT_VERSION__
  const forceBanner = __FORCE_BANNER__

  function normalizeVersion (version) {
    if (!version) return ''
    return version.toString().trim().replace(/^v/i, '')
  }

  function renderReleaseToast () {
    const current = normalizeVersion(currentVersion)
    let latestVersion = normalizeVersion(releaseInfo && (releaseInfo.version || releaseInfo.tag))
    if (forceBanner) {
      latestVersion = normalizeVersion('999.999.999')
    }
    if (!latestVersion || (!current && !forceBanner)) return
    if (latestVersion === current && !forceBanner) return
    const root = document.querySelector('.swagger-ui')
    if (!root || document.querySelector('.release-toast')) return

    const toast = document.createElement('div')
    toast.className = 'release-toast'
    toast.setAttribute('aria-live', 'polite')

    const content = document.createElement('div')
    content.className = 'release-toast__content'

    const title = document.createElement('div')
    title.className = 'release-toast__title'
    const titleIcon = document.createElement('span')
    titleIcon.className = 'release-toast__title-icon'
    titleIcon.textContent = '⚡'
    const titleText = document.createElement('span')
    titleText.textContent = 'Nova release disponível'
    title.appendChild(titleIcon)
    title.appendChild(titleText)

    const meta = document.createElement('div')
    meta.className = 'release-toast__meta'
    meta.textContent = 'v' + latestVersion + ' (v' + current + ' instalada)'

    const link = document.createElement('a')
    link.className = 'release-toast__link'
    link.href = (releaseInfo && releaseInfo.url) ? releaseInfo.url : 'https://github.com/ServeRest/ServeRest/releases'
    link.textContent = 'Ver release'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'release-toast__close'
    close.setAttribute('aria-label', 'Fechar aviso de release')
    close.textContent = '×'
    close.addEventListener('click', function () {
      toast.remove()
    })

    content.appendChild(title)
    content.appendChild(meta)
    content.appendChild(link)
    toast.appendChild(content)
    toast.appendChild(close)
    root.appendChild(toast)
  }

  function observe () {
    const root = document.querySelector('.swagger-ui')
    if (!root) {
      setTimeout(observe, 500)
      return
    }
    setTimeout(renderReleaseToast, 2000)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe)
  } else {
    observe()
  }
})()
