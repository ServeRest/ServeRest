/* istanbul ignore file */

/*
O monitoramento está em arquivo apartado (logger.js), e não no 'app.js',
para não ser afetado pelo teste de mutação.

Esse arquivo está marcado para ser ignorado no arquivo stryker.conf.js
*/

const moesif = require('moesif-nodejs')

const { version } = require('../../package.json')
const { formaDeExecucao } = require('./ambiente')

const ehAmbienteDeDesenvolvimento = process.env.NODE_ENV === 'serverest-development'
const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'

module.exports = async app => {
  if (ehAmbienteDeDesenvolvimento || ehAmbienteDeTestes) {
    return
  }
  const { porta, timeout, nodoc, nobearer, nosec } = require('../server').argv
  const moesifMiddleware = moesif({
    applicationId: 'eyJhcHAiOiIxNTA6MTU1MCIsInZlciI6IjIuMCIsIm9yZyI6IjQ5MToxMTIxIiwiaWF0IjoxNTk4OTE4NDAwfQ.e0E6Qhz1o1Jjs5prulHDYEBlv0juruWs_btjq2mong8',
    identifyUser: (req, res) => { return formaDeExecucao() },
    identifyCompany: (req, res) => { return version },
    skip: (req, res) => {
      if (req.originalUrl === '/__messages__' ||
          req.originalUrl === '/favicon.ico' ||
          req.originalUrl === '/socket.io' ||
          req.originalUrl === '/version' ||
          req.originalUrl === '/swagger-ui.css' ||
          req.originalUrl === '/swagger-ui.css.map' ||
          req.originalUrl === '/swagger-ui-init.js' ||
          req.originalUrl === '/swagger-ui-standalone-preset.js' ||
          req.originalUrl === '/swagger-ui-standalone-preset.js.map' ||
          req.originalUrl === '/swagger-ui-bundle.js' ||
          req.originalUrl === '/swagger-ui-bundle.js.map' ||
          req.headers.monitor ||
          (formaDeExecucao() === 'serverest.dev' && req.originalUrl === '/') ||
          (formaDeExecucao() === 'staging.serverest.dev' && req.originalUrl === '/') ||
          (formaDeExecucao() === 'agilizei' && req.originalUrl === '/')) {
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
