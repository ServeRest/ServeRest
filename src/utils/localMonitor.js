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
  const moesifMiddleware = moesif({
    applicationId: process.env.MOESIF_APPLICATION_ID,
    identifyUser: (req, res) => { return formaDeExecucao() },
    identifyCompany: (req, res) => { return version },
    skip: (req, res) => {
      if (req.originalUrl === '/__messages__' ||
          req.originalUrl === '/favicon.ico' ||
          req.originalUrl === '/socket.io' ||
          req.originalUrl === '/swagger-ui.css' ||
          req.originalUrl === '/swagger-ui.css.map' ||
          req.originalUrl === '/swagger-ui-init.js' ||
          req.originalUrl === '/swagger-ui-standalone-preset.js' ||
          req.originalUrl === '/swagger-ui-standalone-preset.js.map' ||
          req.originalUrl === '/swagger-ui-bundle.js' ||
          req.originalUrl === '/swagger-ui-bundle.js.map') {
        return true
      }
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
