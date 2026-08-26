const { RateLimiterMemory } = require('rate-limiter-flexible')

const {
  aplicacaoExecutandoLocalmente,
  ehAmbienteDeTestes
} = require('../utils/ambiente')
const { LOAD_TEST_DETECTED } = require('../utils/constants')

// Limite por cliente. Depende do 'trust proxy' definido no app.js: sem ele req.ip resolve
// para o endereço do proxy do Cloud Run e este limite passaria a valer para todos somados.
const limitePorIp = new RateLimiterMemory({
  points: 300, // requests
  duration: 30 // segundos, por IP
})

// Limite agregado do container. Existe porque o limite por IP, sozinho, não impõe teto ao
// total: bastariam vários clientes simultâneos para saturar a instância, que roda com
// 256 MiB e max-instances 1. Fica acima do limite por IP para que um único cliente abusivo
// seja barrado pelo próprio limite antes de consumir a cota que protege os demais.
const limiteGlobal = new RateLimiterMemory({
  points: 900, // requests
  duration: 30 // segundos, somando todos os clientes
})

module.exports = async (req, res, next) => {
  if (aplicacaoExecutandoLocalmente() || ehAmbienteDeTestes) {
    return next()
  }

  try {
    // O global vem primeiro de propósito. Avaliar os dois em paralelo faria a requisição
    // consumir a cota individual mesmo quando o bloqueio viesse do limite agregado, o que
    // penalizaria clientes inocentes durante congestionamento e, pior, criaria uma chave
    // por endereço no mapa mesmo para requisições já rejeitadas.
    await limiteGlobal.consume('global')
    await limitePorIp.consume(req.ip)
    return next()
  } catch (_) {
    return res.status(429).send({
      message: LOAD_TEST_DETECTED
    })
  }
}
