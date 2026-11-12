const axios = require('axios')

const RELEASES_URL = 'https://api.github.com/repos/ServeRest/ServeRest/releases/latest'
const REQUEST_TIMEOUT_MS = 4000

function normalizeVersion (version) {
  if (!version) return ''
  return version.toString().trim().replace(/^v/i, '')
}

// SemVer 2.0.0, seção 11. O metadado de build (+...) casa mas não entra na comparação.
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
const NUMERIC = /^\d+$/

function parseSemVer (value) {
  if (typeof value !== 'string') return null
  const match = SEMVER.exec(normalizeVersion(value))
  if (!match) return null
  return { release: match.slice(1, 4), prerelease: match[4] ? match[4].split('.') : [] }
}

// BigInt, e não Number, para que identificadores longos não percam precisão na comparação.
function compareNumbers (a, b) {
  const x = BigInt(a)
  const y = BigInt(b)
  if (x === y) return 0
  return x < y ? -1 : 1
}

function compareIdentifiers (a, b) {
  const aNumeric = NUMERIC.test(a)
  const bNumeric = NUMERIC.test(b)
  if (aNumeric && bNumeric) return compareNumbers(a, b)
  if (aNumeric !== bNumeric) return aNumeric ? -1 : 1
  if (a === b) return 0
  return a < b ? -1 : 1
}

// Sem prerelease vem depois de qualquer prerelease da mesma versão; com os identificadores comuns
// iguais, quem tem mais identificadores vem depois.
function comparePrerelease (a, b) {
  if (!a.length || !b.length) return b.length - a.length
  const shared = Math.min(a.length, b.length)
  for (let index = 0; index < shared; index++) {
    const result = compareIdentifiers(a[index], b[index])
    if (result !== 0) return result
  }
  return a.length - b.length
}

// Diz se candidate vem depois de current. Valor fora do formato nunca é mais novo, nem serve de
// base para comparar, e a função nunca lança exceção.
function isNewerVersion (candidate, current) {
  const next = parseSemVer(candidate)
  const base = parseSemVer(current)
  if (!next || !base) return false
  for (let index = 0; index < 3; index++) {
    const result = compareNumbers(next.release[index], base.release[index])
    if (result !== 0) return result > 0
  }
  return comparePrerelease(next.prerelease, base.prerelease) > 0
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
  isNewerVersion,
  normalizeVersion
}
