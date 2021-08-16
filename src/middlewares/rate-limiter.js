/* istanbul ignore file */

const { RateLimiterMemory } = require('rate-limiter-flexible')
const { formaDeExecucao } = require('../utils/ambiente')

const rateLimiter = new RateLimiterMemory({
  points: 50, // requests
  duration: 1 // second by IP
})

module.exports = (req, res, next) => {
  const ehAmbienteDeTestes = process.env.NODE_ENV === 'serverest-test'
  if (!ehAmbienteDeTestes) {
    rateLimiter.consume(req.ip)
      .then(() => next())
      .catch(() => {
        const ehAmbienteCompartilhado = ['serverest.dev', 'agilizei'].includes(formaDeExecucao())
        if (ehAmbienteCompartilhado) {
          return res.status(429).send({
            message: 'Para fazer teste de carga utilize o ambiente local com Docker ou NPM. Veja mais em https://github.com/Serverest/Serverest#teste-de-carga'
          })
        }
        req.headers.skiplog = true
        next()
      })
  } else {
    next()
  }
}
