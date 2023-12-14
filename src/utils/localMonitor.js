/* istanbul ignore file */

/*
O monitoramento está em arquivo apartado (localMonitor.js), e não no 'app.js',
para não ser afetado pelo teste de mutação.

Esse arquivo está marcado para ser ignorado no arquivo stryker.conf.js
*/

const moesif = require('moesif-nodejs')

const { version } = require('../../package.json')
const {
  aplicacaoExecutandoLocalmente,
  formaDeExecucao,
  ehAmbienteDeDesenvolvimento,
  ehAmbienteDeTestes
} = require('./ambiente')

module.exports = async app => {
  if (ehAmbienteDeDesenvolvimento || ehAmbienteDeTestes || !aplicacaoExecutandoLocalmente()) {
    return
  }
  const { porta, timeout, nodoc, nobearer, nosec } = require('../server').argv
  const urlsToSkip = [
    '/__messages__',
    '/favicon.ico',
    '/socket.io',
    '/swagger-ui.css',
    '/swagger-ui.css.map',
    '/swagger-ui-init.js',
    '/swagger-ui-standalone-preset.js',
    '/swagger-ui-standalone-preset.js.map',
    '/swagger-ui-bundle.js',
    '/swagger-ui-bundle.js.map'
  ]
  const moesifMiddleware = moesif({
    applicationId: process.env.MOESIF_APPLICATION_ID,
    identifyUser: (req, res) => { return formaDeExecucao() },
    identifyCompany: (req, res) => { return version },
    skip: (req, res) => {
      return urlsToSkip.includes(req.originalUrl)
    },
    getMetadata: (req, res) => {
      return {
        conf: {
          porta,
          timeout,
          nodoc,
          nobearer,
          nosec
        }
      }
    },
    noAutoHideSensitive: true
  })
  app.use(moesifMiddleware)
}
