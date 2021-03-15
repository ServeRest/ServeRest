/* istanbul ignore file */

function formaDeExecucao () {
  switch (process.env.USERNAME) {
    case 'docker':
      return 'docker'
    case 'serverest.dev':
      return 'serverest.dev'
    case 'agilizei':
      return 'agilizei'
    default:
      return 'npm'
  }
}

function urlDocumentacao () {
  switch (formaDeExecucao()) {
    case 'serverest.dev':
      return 'https://serverest.dev'
    case 'agilizei':
      return 'https://serverest-api.agilizei.com/'
    default:
      return 'http://localhost:3000'
  }
}

module.exports = {
  formaDeExecucao,
  urlDocumentacao
}
