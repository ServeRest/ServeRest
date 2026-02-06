const { RateLimiterMemory } = require('rate-limiter-flexible')

const {
  aplicacaoExecutandoLocalmente,
  ehAmbienteDeTestes
} = require('../utils/ambiente')
const { LOAD_TEST_DETECTED } = require('../utils/constants')

const rateLimiter = new RateLimiterMemory({
  points: 600, // requests
  duration: 30 // segundo por IP
})

module.exports = async (req, res, next) => {
  if (aplicacaoExecutandoLocalmente() || ehAmbienteDeTestes) {
    return next()
  }

  await rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      return res.status(429).send({
        message: LOAD_TEST_DETECTED
      })
    })
}
