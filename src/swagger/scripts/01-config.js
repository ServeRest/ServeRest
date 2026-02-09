/* global __RELEASE_INFO__, __CURRENT_VERSION__, __FORCE_BANNER__, NodeFilter, MutationObserver, caches */
(function () {
  const releaseInfo = __RELEASE_INFO__
  const currentVersion = __CURRENT_VERSION__
  const forceBanner = __FORCE_BANNER__

  function normalizeVersion (version) {
    if (!version) return ''
    return version.toString().trim().replace(/^v/i, '')
  }
