'use strict'

// O connect-timeout responde 408 depois de 5 s, mas não interrompe a cadeia: quando o passo lento termina e chama
// next(), a requisição seguiria até o 405, que tentaria responder de novo. Em 2026-11-07 isso gerou
// um ERR_HTTP_HEADERS_SENT no log, e o alerta de erro disparou por uma requisição que já tinha recebido o 408.
module.exports = function pararSeExpirou (req, _res, next) {
  if (!req.timedout) next()
}
