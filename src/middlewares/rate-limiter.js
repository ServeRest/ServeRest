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

// Orçamento de bytes por cliente nas rotas da API. O limite de requisições não segura um laço
// lento e pesado: em 4/11/2026 um script fez de 2 a 3 requisições por segundo e, como a lista
// de usuários crescia a cada volta, baixou cerca de 31 GiB em três horas e derrubou o container
// duas vezes por falta de memória. Nos 30 dias anteriores nenhum cliente passou de 90 MiB numa
// hora, contando também os arquivos do Swagger. O orçamento conta só a API, porque o peso das
// turmas atrás de um mesmo IP vem desses arquivos.
const BYTES_POR_HORA = 250 * 1024 * 1024
// Sem distinguir maiúsculas, como as rotas do Express: /Usuarios chega à mesma lista.
const ROTAS_DA_API = /^\/(login|usuarios|produtos|carrinhos)(\/|$)/i

function criarOrcamentoDeBytes ({ bytes = BYTES_POR_HORA, segundos = 3600 } = {}) {
  const contador = new RateLimiterMemory({ points: bytes, duration: segundos })
  return {
    async esgotado (chave) {
      const consumo = await contador.get(chave)
      return consumo !== null && consumo.consumedPoints >= bytes
    },
    registrar (chave, tamanho) {
      if (tamanho > 0) contador.penalty(chave, tamanho)
    }
  }
}

function criarLimitador ({ global = limiteGlobal, porIp = limitePorIp, orcamento = criarOrcamentoDeBytes() } = {}) {
  // Devolve true se a requisição pode seguir. O orçamento só é lido antes e somado no fim da
  // resposta, quando o tamanho é conhecido; a resposta que passa do limite ainda sai, e as
  // seguintes recebem 429 até a janela daquele cliente acabar.
  return async function permitir (req, res) {
    // Um HEAD tem Content-Length mas não manda corpo, então não conta.
    const daApi = req.method !== 'HEAD' && ROTAS_DA_API.test(req.path)
    try {
      // O orçamento vem antes de tudo porque só lê: um cliente sem orçamento não gasta a cota
      // de requisições de ninguém. O global vem antes do por IP de propósito. Avaliar os dois em
      // paralelo faria a requisição consumir a cota individual mesmo quando o bloqueio viesse do
      // limite agregado, o que penalizaria clientes inocentes durante congestionamento e, pior,
      // criaria uma chave por endereço no mapa mesmo para requisições já rejeitadas.
      if (daApi && await orcamento.esgotado(req.ip)) return false
      await global.consume('global')
      await porIp.consume(req.ip)
    } catch (_) {
      return false
    }
    // O close vem sempre, também quando o cliente desiste no meio; aí o corpo inteiro já foi montado
    // e parte dele saiu, então conta o tamanho todo.
    if (daApi) {
      res.on('close', () => orcamento.registrar(req.ip, Number(res.getHeader('Content-Length')) || 0))
    }
    return true
  }
}

const permitir = criarLimitador()

module.exports = async (req, res, next) => {
  if (aplicacaoExecutandoLocalmente() || ehAmbienteDeTestes) {
    res.locals.etapas?.ignorar()
    return next()
  }

  if (await permitir(req, res)) return next()
  return res.status(429).send({
    message: LOAD_TEST_DETECTED
  })
}

module.exports.criarLimitador = criarLimitador
module.exports.criarOrcamentoDeBytes = criarOrcamentoDeBytes
