/* istanbul ignore file */

async function formaDeExecucao () {
  const nomeDoUsuario = await require('username')()
  switch (nomeDoUsuario) {
    case 'root':
      return 'docker'
    case 'no-username-3798':
      return 'serverest.dev'
    default:
      return 'npm'
  }
}

async function urlDocumentacao () {
  switch (await formaDeExecucao()) {
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
