/* istanbul ignore file */
'use strict'

const pt = require('../src/swagger/translations/pt-BR')
const en = require('../src/swagger/translations/en')
const es = require('../src/swagger/translations/es')
const { readFileSync } = require('fs')
const { resolve } = require('path')

const baseKeys = Object.keys(pt)
const languages = [
  { label: 'Português (Brasil)', map: pt, filePath: 'src/swagger/translations/pt-BR.js' },
  { label: 'English', map: en, filePath: 'src/swagger/translations/en.js' },
  { label: 'Español', map: es, filePath: 'src/swagger/translations/es.js' }
]
let failed = false

const getDuplicateKeys = (filePath) => {
  const fullPath = resolve(__dirname, '..', filePath)
  const content = readFileSync(fullPath, 'utf8')
  const keys = []
  const singleQuote = /'([^']+)'\s*:/g
  const doubleQuote = /"([^"]+)"\s*:/g
  let match = singleQuote.exec(content)
  while (match) {
    keys.push(match[1])
    match = singleQuote.exec(content)
  }
  match = doubleQuote.exec(content)
  while (match) {
    keys.push(match[1])
    match = doubleQuote.exec(content)
  }
  const seen = new Set()
  const duplicates = new Set()
  keys.forEach(key => {
    if (seen.has(key)) {
      duplicates.add(key)
    }
    seen.add(key)
  })
  return Array.from(duplicates).sort()
}

const check = (lang, map, filePath) => {
  const keys = Object.keys(map)
  const missing = baseKeys.filter(key => !keys.includes(key)).sort()
  const extra = keys.filter(key => !baseKeys.includes(key)).sort()
  const empty = keys.filter(key => !map[key]).sort()
  const duplicates = getDuplicateKeys(filePath)
  const hasIssues = missing.length + extra.length + empty.length + duplicates.length

  if (hasIssues) {
    failed = true
  }

  return { missing, extra, empty, duplicates, hasIssues, filePath }
}

console.log('Checking translations for ' + baseKeys.length + ' keys.')
console.log('Base language: Português (Brasil).\n')

const results = languages.reduce((acc, { label, map, filePath }) => {
  acc[label] = check(label, map, filePath)
  return acc
}, {})

Object.keys(results).forEach(lang => {
  const { missing, extra, empty, duplicates, filePath, hasIssues } = results[lang]
  if (hasIssues) {
    console.error(lang, { missing, extra, empty, duplicates, filePath })
  } else if (empty.length) {
    console.warn('[swagger-i18n] ' + lang + ' com valores vazios:', empty)
  }
})

const summary = Object.keys(results).map(lang => {
  const isBaseLanguage = lang === 'Português (Brasil)'
  return {
    language: lang,
    status: results[lang].hasIssues ? 'fail' : 'ok',
    missing: isBaseLanguage ? 'N/A' : results[lang].missing.length,
    extra: isBaseLanguage ? 'N/A' : results[lang].extra.length,
    empty: results[lang].empty.length,
    duplicates: results[lang].duplicates.length,
    'Total issues': results[lang].hasIssues
  }
})

console.table(summary)

if (failed) {
  console.error('\nTranslations failed for: ' + summary.filter(row => row.status === 'fail').map(row => row.language).join(', '))
  console.error('\nPlease fix the issues and run the script again.')
  process.exit(1)
}

console.log('\nTranslations ok for all languages.')
process.exit(0)
