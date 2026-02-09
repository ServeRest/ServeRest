const releaseToastTranslations = {
  'pt-BR': {
    title: 'Nova release disponível',
    link: 'Ver release',
    closeLabel: 'Fechar aviso de release',
    meta: (latest, current) => 'v' + latest + ' (v' + current + ' instalada)'
  },
  en: {
    title: 'New release available',
    link: 'View release',
    closeLabel: 'Close release notice',
    meta: (latest, current) => 'v' + latest + ' (v' + current + ' installed)'
  },
  es: {
    title: 'Nueva versión disponible',
    link: 'Ver versión',
    closeLabel: 'Cerrar aviso de versión',
    meta: (latest, current) => 'v' + latest + ' (v' + current + ' instalada)'
  }
}

function getReleaseToastTranslation (language) {
  return releaseToastTranslations[language] || releaseToastTranslations['pt-BR']
}

function renderReleaseToast (releaseDataOverride) {
  const info = releaseDataOverride !== undefined ? releaseDataOverride : releaseInfo
  const current = normalizeVersion(currentVersion)
  let latestVersion = normalizeVersion(info && (info.version || info.tag))
  if (forceBanner) {
    latestVersion = normalizeVersion('999.999.999')
  }
  if (!latestVersion || (!current && !forceBanner)) return
  if (latestVersion === current && !forceBanner) return
  if (document.querySelector('.release-toast')) return
  const root = document.querySelector('.swagger-ui') || document.body

  const toast = document.createElement('div')
  toast.className = 'release-toast'
  toast.setAttribute('aria-live', 'polite')
  toast.dataset.latestVersion = latestVersion
  toast.dataset.currentVersion = current

  const content = document.createElement('div')
  content.className = 'release-toast__content'

  const title = document.createElement('div')
  title.className = 'release-toast__title'
  const titleIcon = document.createElement('span')
  titleIcon.className = 'release-toast__title-icon'
  titleIcon.textContent = '⚡'
  const translation = getReleaseToastTranslation(getPreferredLanguage())
  const titleText = document.createElement('span')
  titleText.textContent = translation.title
  title.appendChild(titleIcon)
  title.appendChild(titleText)

  const meta = document.createElement('div')
  meta.className = 'release-toast__meta'
  meta.textContent = translation.meta(latestVersion, current)

  const link = document.createElement('a')
  link.className = 'release-toast__link'
  link.href = (info && info.url) ? info.url : 'https://github.com/ServeRest/ServeRest/releases'
  link.textContent = translation.link
  link.target = '_blank'
  link.rel = 'noopener noreferrer'

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'release-toast__close'
  close.setAttribute('aria-label', translation.closeLabel)
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

function updateReleaseToastLanguage (language) {
  const toast = document.querySelector('.release-toast')
  if (!toast) return
  const translation = getReleaseToastTranslation(language)
  const latestVersion = toast.dataset.latestVersion || ''
  const current = toast.dataset.currentVersion || ''
  const title = toast.querySelector('.release-toast__title span:last-child')
  const meta = toast.querySelector('.release-toast__meta')
  const link = toast.querySelector('.release-toast__link')
  const close = toast.querySelector('.release-toast__close')
  if (title) title.textContent = translation.title
  if (meta) meta.textContent = translation.meta(latestVersion, current)
  if (link) link.textContent = translation.link
  if (close) close.setAttribute('aria-label', translation.closeLabel)
}

const RELEASE_CACHE_KEY = 'serverest_github_release'
const RELEASE_CACHE_TTL_MS = 10 * 60 * 1000

function getCachedRelease (requireFresh) {
  try {
    const raw = window.localStorage.getItem(RELEASE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.data) return null
    if (requireFresh && (!parsed.cachedAt || (Date.now() - parsed.cachedAt) > RELEASE_CACHE_TTL_MS)) return null
    return parsed.data
  } catch (_) {
    return null
  }
}

function runReleaseCheck () {
  renderReleaseToast()
  const cached = getCachedRelease(true)
  if (cached && cached.tag_name && cached.html_url) {
    renderReleaseToast({
      tag: cached.tag_name,
      version: normalizeVersion(cached.tag_name),
      url: cached.html_url
    })
    return
  }
  fetch('https://api.github.com/repos/ServeRest/ServeRest/releases/latest', {
    headers: { Accept: 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      if (data.tag_name && data.html_url) {
        try {
          window.localStorage.setItem(RELEASE_CACHE_KEY, JSON.stringify({
            data: { tag_name: data.tag_name, html_url: data.html_url },
            cachedAt: Date.now()
          }))
        } catch (_) {}
        renderReleaseToast({
          tag: data.tag_name,
          version: normalizeVersion(data.tag_name),
          url: data.html_url
        })
      }
    })
    .catch(() => {
      const stale = getCachedRelease(false)
      if (stale && stale.tag_name && stale.html_url) {
        renderReleaseToast({
          tag: stale.tag_name,
          version: normalizeVersion(stale.tag_name),
          url: stale.html_url
        })
      }
    })
}
