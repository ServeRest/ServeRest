/* istanbul ignore file */

/*
O monitoramento está em arquivo apartado (monitor.js), e não no 'app.js',
para não ser afetado pelo teste de mutação.

Esse arquivo está marcado para ser ignorado no arquivo stryker.conf.js
*/

const moesif = require('moesif-express')
const os = require('os')

const moesifMiddleware = moesif({
  applicationId: 'eyJhcHAiOiIxNTA6MTU1MCIsInZlciI6IjIuMCIsIm9yZyI6IjQ5MToxMTIxIiwiaWF0IjoxNTk4OTE4NDAwfQ.e0E6Qhz1o1Jjs5prulHDYEBlv0juruWs_btjq2mong8',
  identifyUser: (req, res) => { return os.userInfo().username }
})

module.exports = app => {
  const ehAmbienteDeDesenvolvimento = process.env.NODE_ENV === 'serverest-developmenat'
  const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'

  if (!ehAmbienteDeDesenvolvimento && !ehAmbienteDeTestes) {
    app.use(moesifMiddleware)
  }
}
