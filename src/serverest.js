'use strict'

const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const { join } = require('path')

const { autenticacao } = require('./authentication')
const { conf } = require('./conf')
const printDebugInfoOnConsole = require('./utils/debug')
const printStartServerMessage = require('./utils/consoleMessage.js')
const { overwriteDataFilesWithbackupFiles } = require('./utils/readWriteFiles.js')
const { login, registrar } = require('./routes/index')

const dirDbJson = join(__dirname, '../data/db.json')

const server = jsonServer.create()
const router = jsonServer.router(dirDbJson)

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
