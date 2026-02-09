'use strict'

const { readFileSync, readdirSync } = require('fs')
const { join } = require('path')

const STYLES_DIR = join(__dirname, 'styles')
const SCRIPTS_DIR = join(__dirname, 'scripts')
const TRANSLATIONS_DIR = join(__dirname, 'translations')

const STYLE_FILES = ['topbar.css', 'language-switcher.css', 'release-toast.css']

function loadCustomCss () {
  return STYLE_FILES
    .map(file => readFileSync(join(STYLES_DIR, file), 'utf8'))
    .join('\n')
}

function loadCustomJsTemplate () {
  const files = readdirSync(SCRIPTS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort()
  return files
    .map(file => readFileSync(join(SCRIPTS_DIR, file), 'utf8'))
    .join('\n')
}

function buildUiLabelTranslations () {
  const ptBr = require(join(TRANSLATIONS_DIR, 'pt-BR.js'))
  const en = require(join(TRANSLATIONS_DIR, 'en.js'))
  const es = require(join(TRANSLATIONS_DIR, 'es.js'))
  const uiKeys = Object.keys(ptBr).filter(k => k.startsWith('ui.')).sort()
  const summaryKeys = Object.keys(ptBr).filter(k => k.endsWith('.summary')).sort()
  const keys = [...uiKeys, ...summaryKeys]
  const entries = keys.map(key => {
    const pt = JSON.stringify(ptBr[key] || '')
    const enVal = JSON.stringify(en[key] || '')
    const esVal = JSON.stringify(es[key] || '')
    return `  { 'pt-BR': ${pt}, en: ${enVal}, es: ${esVal} }`
  })
  return entries.join(',\n')
}

const customCss = loadCustomCss()
const customJsTemplate = loadCustomJsTemplate()

function buildCustomJsStr (releaseInfo, currentVersion, forceBanner) {
  const replacements = {
    __RELEASE_INFO__: JSON.stringify(releaseInfo),
    __CURRENT_VERSION__: JSON.stringify(currentVersion),
    __FORCE_BANNER__: JSON.stringify(forceBanner),
    __UI_LABEL_TRANSLATIONS__: buildUiLabelTranslations()
  }
  return Object.keys(replacements).reduce(
    (output, key) => output.split(key).join(replacements[key]),
    customJsTemplate
  )
}

module.exports = {
  buildCustomJsStr,
  customCss
}
