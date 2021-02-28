/* istanbul ignore file */

/*
O monitoramento está em arquivo apartado (monitor.js), e não no 'app.js',
para não ser afetado pelo teste de mutação.

Esse arquivo está marcado para ser ignorado no arquivo stryker.conf.js
*/

const moesif = require('moesif-nodejs')

const { version } = require('../package.json')
const { formaDeExecucao } = require('./utils/ambiente')

const ehAmbienteDeDesenvolvimento = process.env.NODE_ENV === 'serverest-development'
const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'

module.exports = async app => {
  if (ehAmbienteDeDesenvolvimento || ehAmbienteDeTestes) {
    return
  }
  const moesifMiddleware = moesif({
    identifyUser: (req, res) => { return formaDeExecucao() },
    identifyCompany: (req, res) => { return version },
    skip: (req, res) => {
      if (req.path === '/favicon.ico' || req.path === '/version' || (formaDeExecucao() === 'serverest.dev' && req.path === '/') || req.headers.monitor) {
        return true
      }
    }
  })
  app.use(moesifMiddleware)
}
