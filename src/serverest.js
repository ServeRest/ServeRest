'use strict'

const bodyParser = require('body-parser')
const jsonServer = require('json-server')

const { porta } = require('../conf.js')
const printStartServerMessage = require('./utils/consoleMessage.js')
const { overwriteDataFilesWithbackupFiles } = require('./utils/readWriteFiles.js')

const server = jsonServer.create()
const router = jsonServer.router('./data/db.json')

const { login, registrar } = require('./routes/index')
const { autenticacao } = require('./authentication')

module.exports = function serverest () {
  server.use(bodyParser.urlencoded({ extended: true }))
  server.use(bodyParser.json())
  server.use(jsonServer.defaults())

  server.post('/auth/registrar', (req, res) => {
    registrar(req, res)
  })

  server.post('/auth/login', (req, res) => {
    login(req, res)
  })

  server.use(/^(?!\/auth).*$/, (req, res, next) => {
    autenticacao(req, res)
    next()
  })

  server.use(router)

  server.listen(porta, () => {
    overwriteDataFilesWithbackupFiles()
    printStartServerMessage()
  })
}
