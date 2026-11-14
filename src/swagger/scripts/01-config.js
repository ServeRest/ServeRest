/* global __CURRENT_VERSION__, NodeFilter, MutationObserver, caches */
(function () {
  const currentVersion = __CURRENT_VERSION__

  function normalizeVersion (version) {
    if (!version) return ''
    return version.toString().trim().replace(/^v/i, '')
  }
