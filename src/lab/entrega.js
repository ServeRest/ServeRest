'use strict'

const { createHash } = require('crypto')
const { existsSync, readdirSync, readFileSync } = require('fs')
const { extname, join, sep } = require('path')
const zlib = require('zlib')

const { version } = require('../../package.json')
const { aplicacaoExecutandoLocalmente } = require('../utils/ambiente')
const { brotli } = require('../utils/brotli')

const UM_ANO = 'public, max-age=31536000, immutable'
const UMA_SEMANA = 'public, max-age=604800'
// O mesmo Cache-Control do express.static, que servia estes textos antes.
const SEM_CACHE_LONGO = 'public, max-age=0'
const TEXTOS = ['.js', '.css', '.svg']

// Uma resposta da página montada uma vez: o corpo nas três codificações e o ETag. Nenhuma requisição
// comprime nada. O ETag é fraco porque vale para as três codificações do mesmo conteúdo.
function prepararResposta (conteudo, tipo) {
  const identity = Buffer.from(conteudo)
  return {
    tipo,
    etag: `W/"${createHash('sha1').update(identity).digest('base64url')}"`,
    // Qualidade 9: a 11 gastava dez vezes mais CPU ao montar para só 8% a menos de bytes, num
    // container que já vive no teto de CPU e de memória.
    corpos: { br: brotli(identity, 9), gzip: zlib.gzipSync(identity, { level: 9 }), identity }
  }
}

// O Express escolheria pela ordem do Accept-Encoding, e o Chrome manda gzip antes de br; aqui o br vence
// sempre que é aceito.
function codificacaoAceita (req) {
  if (req.acceptsEncodings('br')) return 'br'
  if (req.acceptsEncodings('gzip')) return 'gzip'
  return 'identity'
}

// Com o ETag no header, o res.send do Express responde 304 sem corpo quando o pedido traz o mesmo
// If-None-Match (req.fresh); o 304 vai sem Content-Encoding, porque não tem corpo. O Content-Length é o do
// corpo escolhido, que o res.send põe.
function enviarResposta (req, res, pronta) {
  const codificacao = codificacaoAceita(req)
  res.vary('Accept-Encoding')
  res.set('ETag', pronta.etag)
  res.type(pronta.tipo)
  if (codificacao !== 'identity' && !req.fresh) res.set('Content-Encoding', codificacao)
  res.send(pronta.corpos[codificacao])
}

// Fora do localhost os arquivos da página ficam no cache do navegador: com o v da versão deste servidor na URL
// o conteúdo só muda com a versão e vale por um ano; sem v, ou com o v de outra versão, vale semVersao, a
// semana de fontes, imagens e bandeiras. O v precisa ser o deste servidor: durante um deploy, um pedido com o v
// novo pode cair na revisão antiga, e o arquivo velho ficaria um ano guardado com o endereço do novo. No
// localhost fica o cache de hoje (undefined): uma rodada local repete a versão da anterior, e o navegador
// guardaria o arquivo velho.
function cacheForaDoLocalhost (req, semVersao) {
  if (aplicacaoExecutandoLocalmente()) return undefined
  return req.query.v === version ? UM_ANO : semVersao
}

// Para o setHeaders do express.static, que só roda quando um arquivo é servido: a resposta 405 de um
// arquivo que não existe não fica no cache. Ali só passam fontes, imagens, bandeiras e o ícone.
function cacheNoStatic (res) {
  const valor = cacheForaDoLocalhost(res.req, UMA_SEMANA)
  if (valor) res.setHeader('Cache-Control', valor)
}

// Os textos de uma pasta (.js, .css e .svg), lidos e comprimidos ao carregar, pelo caminho na URL.
function textosDaPasta (pasta) {
  return new Map(readdirSync(pasta, { recursive: true })
    .filter(arquivo => TEXTOS.includes(extname(arquivo)))
    .map(arquivo => ['/' + arquivo.split(sep).join('/'), prepararResposta(readFileSync(join(pasta, arquivo)), extname(arquivo))]))
}

// Serve os textos já comprimidos. Fontes e imagens seguem para o express.static e saem sem compressão: os
// formatos delas já são comprimidos.
function servirTextos (textos) {
  return (req, res, next) => {
    const pronta = textos.get(req.path)
    if (!pronta || !['GET', 'HEAD'].includes(req.method)) return next()
    res.set('Cache-Control', cacheForaDoLocalhost(req, req.path.startsWith('/img/') ? UMA_SEMANA : undefined) || SEM_CACHE_LONGO)
    enviarResposta(req, res, pronta)
  }
}

// Entrega o .br ou o .gz que o build gravou na pasta dos pré-comprimidos, fora da que o
// express.static serve, a quem aceita; o send cuida de ETag, Last-Modified, 304, Range e HEAD, e
// os erros dele (412, 416) seguem como ele os dá. Sem o arquivo pré-comprimido (fora da imagem do
// Cloud Run, ou apagado depois de o servidor subir), o pedido segue para o express.static como antes.
function servirPrecomprimidos (pasta, arquivos) {
  const prontos = new Map(arquivos.map(arquivo => [
    '/' + arquivo,
    {
      tipo: extname(arquivo),
      br: existsSync(join(pasta, arquivo + '.br')) && arquivo + '.br',
      gzip: existsSync(join(pasta, arquivo + '.gz')) && arquivo + '.gz'
    }
  ]))
  return (req, res, next) => {
    const pronto = prontos.get(req.path)
    if (!pronto || !['GET', 'HEAD'].includes(req.method)) return next()
    res.vary('Accept-Encoding')
    const codificacao = codificacaoAceita(req)
    if (!pronto[codificacao]) return next()
    res.set('Content-Encoding', codificacao)
    res.type(pronto.tipo)
    res.sendFile(pronto[codificacao], { root: pasta, maxAge: 0 }, erro => {
      if (!erro || res.headersSent) return
      res.removeHeader('Content-Encoding')
      if (erro.code !== 'ENOENT') return next(erro)
      res.removeHeader('Content-Type')
      next()
    })
  }
}

module.exports = {
  cacheForaDoLocalhost,
  cacheNoStatic,
  enviarResposta,
  prepararResposta,
  servirPrecomprimidos,
  servirTextos,
  textosDaPasta
}
