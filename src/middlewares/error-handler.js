const { INTERNAL_ERROR, TIMEOUT } = require('../utils/constants')
const montarMensagemDeErroDeSchema = require('../utils/montarMensagemDeErroDeSchema')
const { log } = require('../utils/logger')
const { version } = require('../../package.json')

function errorHandler (error, _req, res, _next) {
  const erroDeSchema = error.name === 'ValidationError'
  if (erroDeSchema) {
    return res.status(400).json(montarMensagemDeErroDeSchema(error))
  }
  // https://github.com/expressjs/body-parser#errors
  if (error.type === 'entity.parse.failed') {
    log({ message: 'Entity parse error, user sending request without proper quotation marks.' })
    return res.status(400).json({
      message: 'Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225'
    })
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large' })
  }
  if (error.type === 'charset.unsupported') {
    return res.status(415).json({ message: 'Unsupported charset', charset: error.charset })
  }
  /* istanbul ignore if */
  if (error.code === 'ETIMEDOUT') {
    return res.status(408).json({ message: TIMEOUT })
  }

  log({ level: 'error', message: error?.type || error })

  if (error?.type) {
    return res.status(500).json({ message: INTERNAL_ERROR, error: error.type, version })
  }
  return res.status(500).json({ message: INTERNAL_ERROR, version, error: { message: error.message, stack: error.stack } })
}

module.exports = errorHandler
