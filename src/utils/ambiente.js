/* istanbul ignore file */

function formaDeExecucao () {
  switch (process.env.USERNAME) {
    case 'root':
      return 'docker'
    case 'online':
      return 'serverest.dev'
    default:
      return 'npm'
  }
}

function urlDocumentacao () {
  switch (formaDeExecucao()) {
    case 'serverest.dev':
      return 'https://serverest.dev'
    default:
      return 'http://localhost:3000'
  }
}

module.exports = {
  formaDeExecucao,
  urlDocumentacao
}
