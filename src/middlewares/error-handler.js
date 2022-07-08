const { INTERNAL_ERROR, TIMEOUT } = require('../utils/constants')
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
      message: 'Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225'
    })
  }
  /* istanbul ignore if */
  if (error.code === 'ETIMEDOUT') {
    return res.status(408).json({ message: TIMEOUT })
  }
  return res.status(500).json({ message: INTERNAL_ERROR, error })
}

module.exports = errorHandler
