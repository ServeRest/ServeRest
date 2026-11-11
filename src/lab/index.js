'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const { version } = require('../../package.json')
const ptBr = require('../swagger/translations/pt-BR')
const en = require('../swagger/translations/en')
const es = require('../swagger/translations/es')

const LAB_ASSETS_DIR = join(__dirname, 'public')
const template = readFileSync(join(__dirname, 'page.html'), 'utf8')

function escapeHtml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Função de substituição em vez de string: um texto com "$&" precisa sair sem alteração.
function renderTemplate (source, values) {
  return source.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (placeholder, name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error(`Template do lab com marcador sem valor: ${placeholder}`)
    }
    return values[name]
  })
}

// O "<" vira < para que nenhum texto feche o elemento <script> que guarda o JSON.
function textsJson (translations) {
  const keys = Object.keys(translations)
    .filter(key => key.startsWith('lab.') || key.startsWith('ui.flow.') || key === 'ui.response')
  const texts = keys.reduce((output, key) => ({ ...output, [key]: translations[key] }), {})
  return JSON.stringify(texts).replace(/</g, '\\u003c')
}

function pageValues (language, translations) {
  const values = Object.keys(translations)
    .filter(key => key.startsWith('lab.'))
    .reduce((output, key) => ({ ...output, [key]: escapeHtml(translations[key]) }), {})
  return { ...values, lang: language, texts: textsJson(translations) }
}

const valuesByLanguage = {
  'pt-BR': pageValues('pt-BR', ptBr),
  en: pageValues('en', en),
  es: pageValues('es', es)
}

function renderLabPage (language, pageVersion) {
  return renderTemplate(template, { ...valuesByLanguage[language], version: escapeHtml(pageVersion) })
}

// Renderiza os três idiomas ao carregar: um texto faltando derruba o servidor e os testes, não o aluno.
Object.keys(valuesByLanguage).forEach(language => renderLabPage(language, version))

module.exports = {
  LAB_ASSETS_DIR,
  renderLabPage,
  renderTemplate
}
