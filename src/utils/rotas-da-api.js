'use strict'

// As rotas da API, numa lista só: o painel de etapas mede só elas, o orçamento de bytes do rate limiter conta só
// elas e os buscadores não as indexam.
module.exports = {
  ROTAS_DA_API: ['/login', '/usuarios', '/produtos', '/carrinhos']
}
