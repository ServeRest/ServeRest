/* istanbul ignore file */

const { RateLimiterMemory } = require('rate-limiter-flexible')

const { aplicacaoExecutandoLocalmente } = require('../utils/ambiente')

const rateLimiter = new RateLimiterMemory({
  points: 250, // requests
  duration: 2 // segundo por IP
})

// Irá retornar mensagem de erro se o teste de carga:
// 1. Estiver sendo executado em localhost sem o header 'monitor'.
// 2. Estiver sendo executado fora de localhost.
module.exports = async (req, res, next) => {
  const reqContainsHeaderMonitor = req.rawHeaders.includes('monitor')

  const messageLoadTest = 'Foi detectado comportamento equivalente a teste de carga'
  const messageAdjust = 'Leia a seção sobre teste de carga https://github.com/ServeRest/ServeRest#teste-de-carga e faça o ajuste necessário.'

  await rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      if (aplicacaoExecutandoLocalmente()) {
        if (!reqContainsHeaderMonitor) {
          return res.status(429).send({
            message: `${messageLoadTest} com ausência do header 'monitor'. ${messageAdjust}`
          })
        }
      } else {
        return res.status(429).send({
          message: `${messageLoadTest}. ${messageAdjust}`
        })
      }
      next()
    })
}
