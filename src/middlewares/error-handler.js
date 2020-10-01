const { INTERNAL_ERROR } = require('../utils/constants')
const montarMensagemDeErroDeSchema = require('../utils/montarMensagemDeErroDeSchema')

function errorHandler (error, _req, res, _next) {
  const erroDeSchema = error.name === 'ValidationError'
  /* istanbul ignore else */
  if (erroDeSchema) {
    return res.status(400).json(montarMensagemDeErroDeSchema(error))
  } else if (error instanceof SyntaxError && error.status === 400) {
    return res.sendStatus(400)
  } else {
    console.error(error)
    return res.status(500).json({ message: INTERNAL_ERROR, error })
  }
}

module.exports = errorHandler
