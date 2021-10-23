/* istanbul ignore file */

const { RateLimiterMemory } = require('rate-limiter-flexible')

const rateLimiter = new RateLimiterMemory({
  points: 150, // requests
  duration: 1 // segundo por IP
})

// Adicionar header 'monitor: false' quando atingir o limite definido para não enviar informações para o moesif.
module.exports = async (req, res, next) => {
  await rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      req.headers.monitor = false
      next()
    })
}
