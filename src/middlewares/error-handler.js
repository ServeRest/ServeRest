const { INTERNAL_ERROR } = require('../utils/constants')
const montarMensagemDeErroDeSchema = require('../utils/montarMensagemDeErroDeSchema')

function errorHandler (error, _req, res, _next) {
  const erroDeSchema = error.name === 'ValidationError'
  if (erroDeSchema) {
    return res.status(400).json(montarMensagemDeErroDeSchema(error))
  }
  /* istanbul ignore if */
  if (error.type === 'entity.parse.failed') {
    console.log('Erro 500')
    return res.status(500).json({
      message: 'Adicione aspas em todos os valores. Esse problema já está sendo investigado na issue https://github.com/PauloGoncalvesBH/ServeRest/issues/225'
    })
  }
  return res.status(500).json({ message: INTERNAL_ERROR, error })
}

module.exports = errorHandler
