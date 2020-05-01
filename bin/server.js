'use strict'

const colors = require('colors')
const debug = require('debug')('nodestr:server')
const http = require('http')
const open = require('open')

const app = require('../src/app')

const DEFAULT_PORT = 3000

const port = normalizePort(process.env.PORT)
app.set('port', port)

const server = http.createServer(app)

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

console.log(colors.blue.bold(`\nServeRest está em execução na porta ${port}`))
console.log(colors.cyan('Made with'), colors.red('♥'), colors.cyan('by'), colors.cyan.italic('npx paulogoncalves\n'))

open(`http://localhost:${port}/swagger`)

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
      console.error(bind, 'já está em uso.\nFeche o programa/serviço que está usando a porta ou crie a variável de ambiente PORT para executar o ServeRest em outra porta.\n')
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
