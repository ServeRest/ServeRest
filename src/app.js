'use strict'

const timeout = require('connect-timeout')
const express = require('express')
const logger = require('morgan')
const queryParser = require('express-query-int')
const swaggerUi = require('swagger-ui-express')

const swaggerDocument = require('./swagger.json')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(queryParser())
app.use(timeout())
app.disable('x-powered-by')
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.use(logger('dev'))

app.use('/login', require('./routes/login-route'))
app.use('/usuarios', require('./routes/usuarios-route'))
app.use('/produtos', require('./routes/produtos-route'))
// app.use('/carrinhos',  require('./routes/turmas-route'))

app.use((error, req, res, next) => {
  const ocorreuErroNaValidacaoDoSchema = error.name === 'ValidationError'
  if (ocorreuErroNaValidacaoDoSchema) { return res.status(400).json({ error }) }
  return res.status(500).json({ error })
})

app.use((req, res, next) => {
  res.status(404).send({
    message: `Não é possível realizar ${req.method} em ${req.url}. Acesse /swagger para ver as rotas disponíveis e como utilizá-las.`
  })
})

module.exports = app
