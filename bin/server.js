#!/usr/bin/env node

'use strict'

const colors = require('colors')
const debug = require('debug')('nodestr:server')
const http = require('http')
const open = require('open')

const app = require('../src/app')
const { conf } = require('../src/utils/conf')

const argv = require('yargs')
  .default({
    porta: conf.porta,
    timeout: conf.tokenTimeout
  })
  .boolean('nodoc')
  .number(['timeout', 'porta'])
  .alias('p', 'porta')
  .alias('t', 'timeout')
  .alias('n', 'nodoc')
  .alias('h', 'help')
  .alias('v', 'version')
  .describe('p', 'Porta que será utilizada (default: 3000)')
  .describe('t', 'Timeout do token em milissegundos (default: 1000)')
  .describe('n', 'Desabilitar o início automático do swagger')
  .example('npx serverest -p 3500', 'Em execução na porta 3500')
  .example('npx serverest --nodoc -t 20000', 'Swagger não abrirá e token terá 20 segundos de timeout')
  .help('h')
  .epilog('As rotas disponíveis estão listadas no swagger.')
  .epilog('Precisa de ajuda?')
  .epilog('Abra uma issue em github.com/PauloGoncalvesBH/serverest')
  .argv

conf.tokenTimeout = argv.timeout
const DEFAULT_PORT = 3000

const port = normalizePort(argv.porta)
conf.porta = port
app.set('port', port)

const server = http.createServer(app)

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

console.log(colors.white.bold(`\nServeRest está em execução na porta ${port}`))
console.log(colors.cyan.bold('Feito com'), colors.red.bold('♥'), colors.cyan.bold('para todos os QAs'))
console.log(colors.yellow.bold('Dúvidas?'), colors.white.bold('npx serverest -h\n'))

if (!argv.nodoc) {
  open(`http://localhost:${port}/swagger`)
}

function normalizePort (val) {
  const port = parseInt(val, 10)

  const isNumber = !isNaN(port)
  const isInPortRange = port > -1 && port < 65536
  if (isNumber && isInPortRange) {
    return port
  }

  return DEFAULT_PORT
}

function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Porta ' + port

  switch (error.code) {
    case 'EACCESS':
      console.error(bind, 'requires elevated privileges')
      process.exit(1)

    case 'EADDRINUSE':
      console.error(bind, `já está em uso.
Feche o programa/serviço que está usando a porta ${port} ou execute o ServeRest em outra porta.
Execute 'npx serverest -h' para saber como executar em outra porta.`)
      process.exit(1)

    default:
      throw error
  }
}

function onListening () {
  const addr = server.address()
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port

  debug('Listening on ' + bind)
}
