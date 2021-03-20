/* istanbul ignore file */

const { conf } = require('./conf')

function formaDeExecucao () {
  if (process.env.USERNAME === 'docker' ||
      process.env.USERNAME === 'serverest.dev' ||
      process.env.USERNAME === 'agilizei') {
    return process.env.USERNAME
  }
  return 'npm'
}

function urlDocumentacao () {
  switch (formaDeExecucao()) {
    case 'serverest.dev':
      return 'https://serverest.dev'
    case 'agilizei':
      return 'https://serverest-api.agilizei.com/'
    default:
      return `http://localhost:${conf.porta}`
  }
}

module.exports = {
  formaDeExecucao,
  urlDocumentacao
}
