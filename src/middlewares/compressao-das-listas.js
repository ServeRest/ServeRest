'use strict'

// Fica na versão 1.7, que só conhece gzip e deflate. A 1.8 passa a responder em brotli a navegadores e
// Postman, e o brotli gastou mais CPU e memória que o gzip num container de 256 MiB, para quase o mesmo
// ganho. A página inicial usa brotli porque comprime seus textos uma vez ao subir; aqui é a cada pedido.
const compression = require('compression')

// As listas de /usuarios, /produtos e /carrinhos crescem com o uso e não têm paginação. Em 4/11/2026 um laço
// de cadastro e listagem baixou cerca de 31 GiB em três horas, mais que um mês inteiro de saída de dados.
const LIMITE = 64 * 1024

// Abaixo do limite a resposta nem entra na compressão: assim ela também não ganha o Vary que o compression
// põe em tudo o que considera, e sai com os mesmos headers de antes.
function soListasGrandes (req, res) {
  return Number(res.getHeader('Content-Length')) >= LIMITE && compression.filter(req, res)
}

module.exports = compression({ filter: soListasGrandes, level: 1 })
