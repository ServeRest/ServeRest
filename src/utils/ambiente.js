/* istanbul ignore file */

const { conf } = require('./conf')

const environments = new Set([
  'docker',
  'serverest.dev',
  'staging.serverest.dev',
  'agilizei',
  'cesarschool',
  'compassuol'
])

function formaDeExecucao () {
  const env = process.env.ENVIRONMENT
  return environments.has(env) ? env : 'npm'
}

const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'
const ehAmbienteDeDesenvolvimento = process.env.NODE_ENV === 'serverest-development'

const aplicacaoExecutandoLocalmente = () => {
  const environment = formaDeExecucao()
  return environment === 'npm' || environment === 'docker'
}

const urlMapping = {
  'serverest.dev': 'https://serverest.dev',
  'staging.serverest.dev': 'https://staging.serverest.dev',
  agilizei: 'https://agilizei.serverest.dev',
  compassuol: 'https://compassuol.serverest.dev',
  cesarschool: 'https://cesarschool.serverest.dev'
}

function urlDocumentacao () {
  const environment = formaDeExecucao()
  return urlMapping[environment] || `http://localhost:${conf.porta}`
}

module.exports = {
  aplicacaoExecutandoLocalmente,
  formaDeExecucao,
  urlDocumentacao,
  ehAmbienteDeDesenvolvimento,
  ehAmbienteDeTestes
}
