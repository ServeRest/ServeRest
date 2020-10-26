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
    applicationId: 'eyJhcHAiOiIxNTA6MTU1MCIsInZlciI6IjIuMCIsIm9yZyI6IjQ5MToxMTIxIiwiaWF0IjoxNTk4OTE4NDAwfQ.e0E6Qhz1o1Jjs5prulHDYEBlv0juruWs_btjq2mong8',
    identifyUser: (req, res) => { return formaDeExecucao() },
    identifyCompany: (req, res) => { return version }
  })
  app.use(moesifMiddleware)
}
