'use strict'

const getHour = require('./hour.js')
const { debug } = require('../../conf.js')

const {
  imprimirHeaderDaRequisicao,
  imprimirCorpoDaRequisicao,
  imprimirHoraDaRequisicao,
  imprimirIpQueEfetuouARequisicao
} = debug

module.exports = function printDebugInfoOnConsole (req) {
  if (imprimirCorpoDaRequisicao || imprimirHeaderDaRequisicao) {
    const hour = imprimirHoraDaRequisicao ? `[${getHour()}]` : ''
    console.log(`\nDEBUG REQUISIÇÃO ${hour}\n${req.method} ${req.hostname} ${req.originalUrl}`.magenta)

    if (imprimirIpQueEfetuouARequisicao) console.log(`IP: ${req.ip}`.magenta)

    if (imprimirHeaderDaRequisicao) {
      console.log('Header >>>'.magenta)
      console.log(req.headers)
      console.log('<<< Fim do header'.magenta)
    }

    if (imprimirCorpoDaRequisicao) {
      console.log('Corpo >>>'.magenta)
      console.log(req.body)
      console.log('<<< Fim do corpo'.magenta)
    }
  }
}
