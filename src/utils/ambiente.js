/* istanbul ignore file */

const { conf } = require('./conf')

function formaDeExecucao () {
  if (process.env.ENVIRONMENT === 'docker' ||
      process.env.ENVIRONMENT === 'serverest.dev' ||
      process.env.ENVIRONMENT === 'staging.serverest.dev' ||
      process.env.ENVIRONMENT === 'agilizei' ||
      process.env.ENVIRONMENT === 'cesarschool' ||
      process.env.ENVIRONMENT === 'compassuol') {
    return process.env.ENVIRONMENT
  }
  return 'npm'
}

const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'
const ehAmbienteDeDesenvolvimento = process.env.NODE_ENV === 'serverest-development'

const aplicacaoExecutandoLocalmente = () => {
  return (formaDeExecucao() === 'npm' || formaDeExecucao() === 'docker')
}

function urlDocumentacao () {
  switch (formaDeExecucao()) {
    case 'serverest.dev':
      return 'https://serverest.dev'
    case 'staging.serverest.dev':
      return 'https://staging.serverest.dev'
    case 'agilizei':
      return 'https://agilizei.serverest.dev'
    case 'compassuol':
      return 'https://compassuol.serverest.dev'
    case 'cesarschool':
      return 'https://cesarschool.serverest.dev'
    default:
      return `http://localhost:${conf.porta}`
  }
}

module.exports = {
  aplicacaoExecutandoLocalmente,
  formaDeExecucao,
  urlDocumentacao,
  ehAmbienteDeDesenvolvimento,
  ehAmbienteDeTestes
}
