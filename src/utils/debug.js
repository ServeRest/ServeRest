'use strict'

const getHour = require('./hour.js')
const { conf } = require('../conf.js')

module.exports = function printDebugInfoOnConsole (req) {
  if (!conf.debug) return

  const hour = `[${getHour()}]`
  console.log(`\nDEBUG REQUISIÇÃO ${hour}\n${req.method} ${req.hostname} ${req.originalUrl}`.magenta)

  console.log(`IP: ${req.ip}`.magenta)

  console.log('Header >>>'.magenta)
  console.log(req.headers)
  console.log('<<< Fim do header'.magenta)

  console.log('Corpo >>>'.magenta)
  console.log(req.body)
  console.log('<<< Fim do corpo'.magenta)
}
