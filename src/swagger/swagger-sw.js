/* global self, caches, fetch */
/* eslint-disable no-unused-vars */
const CACHE_NAME = 'serverest-docs-__VERSION__'

const CACHEABLE_PATH_CHECKS = [
  (path) => path === '/swagger.json',
  (path) => path.startsWith('/flags/'),
  (path) => path.startsWith('/images/'),
  (path) => path === '/favicon.ico',
  (path) => path.includes('swagger-ui'),
  (path) => path.endsWith('.js'),
  (path) => path.endsWith('.css')
]

function shouldCache (url) {
  try {
    const u = new URL(url)
    if (u.origin !== self.location.origin) return false
    if (u.pathname === '/' || u.pathname === '') return false
    return CACHEABLE_PATH_CHECKS.some((check) => check(u.pathname))
  } catch (_) {
    return false
  }
}

const PREFETCH_PATHS = [
  '/swagger.json',
  '/swagger.json?lang=pt-BR',
  '/swagger.json?lang=en',
  '/swagger.json?lang=es',
  '/favicon.ico',
  '/flags/flag_brazil.svg',
  '/flags/flag_peru.svg',
  '/flags/flag_uk.svg',
  '/images/serverest_logo.svg',
  '/swagger-ui.css',
  '/swagger-ui-init.js',
  '/swagger-ui-bundle.js',
  '/swagger-ui-standalone-preset.js'
]

function prefetchCriticalUrls (cache) {
  const origin = self.location.origin
  return Promise.all(
    PREFETCH_PATHS.map(path =>
      fetch(origin + path)
        .then(res => {
          if (res && res.status === 200) cache.put(origin + path, res)
        })
        .catch(() => {})
    )
  )
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(name => name.startsWith('serverest-docs-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() =>
      caches.open(CACHE_NAME).then(cache =>
        prefetchCriticalUrls(cache).then(() => self.clients.claim())
      )
    )
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!shouldCache(event.request.url)) return
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone())
          }
          return response
        })
      })
    )
  )
})
