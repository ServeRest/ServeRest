'use strict'

const express = require('express')
const helmet = require('helmet')
const logger = require('morgan')
const queryParser = require('express-query-int')
const timeout = require('connect-timeout')

const { conf } = require('./utils/conf')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())

if (conf.utilizarHeaderDeSeguranca) {
  app.use(helmet())
}

app.use(logger('dev'))

app.use('/login', require('./routes/login-route'))
app.use('/usuarios', require('./routes/usuarios-route'))
app.use('/produtos', require('./routes/produtos-route'))
app.use('/carrinhos', require('./routes/carrinhos-route'))

app.use((error, req, res, next) => {
  const ocorreuErroNaValidacaoDoSchema = error.name === 'ValidationError'
  if (ocorreuErroNaValidacaoDoSchema) { return res.status(400).json({ error }) }
  return res.status(500).json({ error })
})

app.use((req, res) => {
  res.status(405).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse https://serverest.js.org para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app
