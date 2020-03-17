'use strict'

const bodyParser = require('body-parser')
const jsonServer = require('json-server')

const { autenticacao } = require('./authentication')
const { conf } = require('./conf')
const printDebugInfoOnConsole = require('./utils/debug')
const printStartServerMessage = require('./utils/consoleMessage.js')
const { overwriteDataFilesWithbackupFiles } = require('./utils/readWriteFiles.js')
const { login, registrar } = require('./routes/index')

const server = jsonServer.create()
const router = jsonServer.router('./data/db.json')

module.exports = function serverest () {
  server.use(bodyParser.urlencoded({ extended: true }))
  server.use(bodyParser.json())
  server.use(jsonServer.defaults())

  server.post('/auth/registrar', (req, res) => {
    printDebugInfoOnConsole(req)
    registrar(req, res)
  })

  server.post('/auth/login', (req, res) => {
    printDebugInfoOnConsole(req)
    login(req, res)
  })

  server.use(/^(?!\/auth).*$/, (req, res, next) => {
    printDebugInfoOnConsole(req)
    autenticacao(req, res)
    next()
  })

  server.use(router)

  server.listen(conf.porta, () => {
    overwriteDataFilesWithbackupFiles()
    printStartServerMessage()
  })
}
