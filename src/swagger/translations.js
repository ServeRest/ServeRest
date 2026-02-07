/* istanbul ignore file */
'use strict'

const ptBr = require('./translations/pt-BR')
const en = require('./translations/en')
const es = require('./translations/es')

const swaggerTranslations = { 'pt-BR': ptBr, en, es }

function localizeSwaggerDocument (swaggerDocument, language) {
  const translations = swaggerTranslations[language] || swaggerTranslations['pt-BR']
  const clone = JSON.parse(JSON.stringify(swaggerDocument))

  const translateValue = value => translations[value] || value

  const walk = value => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (typeof value !== 'object') return
    Object.keys(value).forEach(key => {
      const current = value[key]
      if ((key === 'summary' || key === 'description') && typeof current === 'string') {
        value[key] = translateValue(current)
        return
      }
      walk(current)
    })
  }

  walk(clone)
  return clone
}

module.exports = {
  localizeSwaggerDocument
}
