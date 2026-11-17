'use strict'

const { log } = require('../utils/logger')

// Depois de 5 s o connect-timeout passa um erro ETIMEDOUT adiante, e o errorHandler responde 408. A cadeia não é
// interrompida, e o Express guarda a posição do errorHandler: quando o passo lento termina, a requisição continua
// dali. Em 2026-11-07 um next() atrasado chegou ao 405, que tentou responder de novo e registrou
// ERR_HTTP_HEADERS_SENT, o que disparou o alerta de erro. Estes dois ficam logo depois do errorHandler.

// Um next() atrasado para aqui.
function pararSeExpirou (req, _res, next) {
  if (!req.timedout) next()
}

// Um next(erro) atrasado, ou uma rota que tenta responder depois do 408, chega aqui. O cliente já recebeu a
// resposta, então o erro vai para o log sem o nível de erro, em vez de ir ao tratador final do Express.
function descartarErroDepoisDaResposta (error, _req, res, next) {
  if (!res.headersSent) return next(error)
  log({ message: `Erro depois da resposta enviada: ${error.message}` })
}

module.exports = { pararSeExpirou, descartarErroDepoisDaResposta }
