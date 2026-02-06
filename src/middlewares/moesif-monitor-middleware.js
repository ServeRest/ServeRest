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
} = require('../utils/ambiente')

function moesifMiddleware (req, res, next) {
  if (ehAmbienteDeDesenvolvimento || ehAmbienteDeTestes || !aplicacaoExecutandoLocalmente() || !process.env.MOESIF_APPLICATION_ID) {
    return next()
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

  const options = {
    applicationId: process.env.MOESIF_APPLICATION_ID,
    logbody: true,
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
  }

  try {
    moesif(options)
  } catch (error) {}
  return next()
}

module.exports = moesifMiddleware
