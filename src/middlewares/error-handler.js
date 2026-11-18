const { INTERNAL_ERROR, TIMEOUT } = require('../utils/constants')
const montarMensagemDeErroDeSchema = require('../utils/montarMensagemDeErroDeSchema')
const { log } = require('../utils/logger')
const { version } = require('../../package.json')
const { IpDeniedError } = require('express-ipfilter')

// O body-parser marca com expose e um status 4xx o erro que é culpa de quem enviou (header Content-Encoding sem
// suporte, corpo comprimido que não descomprime, parâmetros demais). Sem esta regra, cada tipo novo caía no 500
// que pede para abrir issue, e o aluno procurava um bug no servidor em vez de corrigir o envio.
function ehErroDoCliente (error) {
  return error.expose === true && error.statusCode >= 400 && error.statusCode < 500
}

// Os headers já saíram, então não há como responder de novo. Chega aqui o erro de um passo que termina depois do 408
// do timeout, que é esperado, e o de uma resposta que falha no meio ou que é enviada duas vezes, que é bug. Como o
// Express fazia, a conexão da resposta incompleta é fechada, para o cliente não ficar esperando o resto; a da
// resposta que já terminou, como o 408, continua aberta.
function registrarErroDepoisDaResposta (error, req, res) {
  log({
    level: req.timedout ? 'warn' : 'error',
    message: `Erro depois da resposta enviada: ${req.method} ${req.originalUrl}, timedout: ${Boolean(req.timedout)}, ` +
      `${error.code || error.name}: ${error.message}, Stack: ${error.stack}`
  })
  if (!res.writableEnded) req.socket.destroy()
}

function errorHandler (error, req, res, _next) {
  if (res.headersSent) return registrarErroDepoisDaResposta(error, req, res)
  const erroDeSchema = error.name === 'ValidationError'
  if (erroDeSchema) {
    return res.status(400).json(montarMensagemDeErroDeSchema(error))
  }
  if (error.name === 'URIError') {
    log({ message: `URI decode error: ${error.message}` })
    return res.status(400).json({
      message: 'Parâmetro de URL inválido. Verifique os caracteres especiais e tente novamente.'
    })
  }
  // https://github.com/expressjs/body-parser#errors
  if (error.type === 'entity.parse.failed') {
    log({ message: 'Entity parse error, user sending request without proper quotation marks.' })
    return res.status(400).json({
      message: 'Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225'
    })
  }
  if (error.type === 'entity.too.large' || error.type === 'parameters.too.many') {
    log({ message: `Payload too large: ${error.type}` })
    return res.status(413).json({ message: 'Payload too large' })
  }
  if (error.type === 'charset.unsupported') {
    return res.status(415).json({ message: 'Unsupported charset', charset: error.charset })
  }
  if (error.type === 'encoding.unsupported') {
    log({ message: `Unsupported content encoding: ${error.encoding}` })
    return res.status(415).json({ message: 'Unsupported content encoding', encoding: error.encoding })
  }
  // O zlib não dá tipo ao erro: o corpo dito comprimido pelo Content-Encoding não descomprime (Z_DATA_ERROR) ou
  // chegou cortado (Z_BUF_ERROR).
  if (ehErroDoCliente(error) && /^Z_/.test(error.code)) {
    log({ message: `Invalid compressed body: ${error.message}` })
    return res.status(400).json({
      message: 'Corpo comprimido inválido. Envie o corpo de acordo com o header Content-Encoding ou remova o header.'
    })
  }
  if (error.code === 'ETIMEDOUT') {
    return res.status(408).json({ message: TIMEOUT })
  }
  /* istanbul ignore if */
  if (error instanceof IpDeniedError) {
    return res.status(429).json({ message: 'IP bloqueado por excesso de requisições. Alternativas: Envie mensagem para o autor do projeto para desbloqueio (https://linkedin.com/in/paulo-goncalves) ou faça doação financeira ao projeto (https://github.com/ServeRest/ServeRest?tab=readme-ov-file#doadores).' })
  }
  if (ehErroDoCliente(error)) {
    log({ message: `Client error ${error.statusCode}: ${error.type || error.message}` })
    return res.status(error.statusCode).json({
      message: 'Não foi possível ler a requisição. Confira o corpo e os headers enviados.',
      error: error.type
    })
  }
  log({
    level: 'error',
    message: `Error: ${error?.type || JSON.stringify(error)}, Stack: ${error.stack || 'No stack available'}, Request body: ${JSON.stringify(req.body)}`
  })

  if (error?.type) {
    return res.status(500).json({ message: INTERNAL_ERROR, error: error.type, version })
  }
  /* istanbul ignore next */
  return res.status(500).json({ message: INTERNAL_ERROR, version, error: { message: error.message || 'No message available', stack: error.stack || 'No stack available' } })
}

module.exports = errorHandler
