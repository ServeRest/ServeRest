const axios = require('axios')

const RELEASES_URL = 'https://api.github.com/repos/ServeRest/ServeRest/releases/latest'
const REQUEST_TIMEOUT_MS = 4000

function normalizeVersion (version) {
  if (!version) return ''
  return version.toString().trim().replace(/^v/i, '')
}

async function fetchLatestRelease () {
  const response = await axios.get(RELEASES_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': 'ServeRest'
    }
  })

  const data = response && response.data ? response.data : {}
  if (!data.tag_name || !data.html_url) {
    return null
  }

  return {
    tag: data.tag_name,
    version: normalizeVersion(data.tag_name),
    url: data.html_url,
    publishedAt: data.published_at || null
  }
}

module.exports = {
  fetchLatestRelease,
  normalizeVersion
}
