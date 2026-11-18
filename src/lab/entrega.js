'use strict'

const { createHash } = require('crypto')
const { existsSync, readdirSync, readFileSync } = require('fs')
const { extname, join, sep } = require('path')
const zlib = require('zlib')

const { version } = require('../../package.json')
const { aplicacaoExecutandoLocalmente } = require('../utils/ambiente')
const { brotli } = require('../utils/brotli')
const { log } = require('../utils/logger')

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
// sempre que é aceito. disponiveis limita a escolha às codificações que existem para a resposta.
function codificacaoAceita (req, disponiveis = ['br', 'gzip']) {
  return disponiveis.find(codificacao => req.acceptsEncodings(codificacao)) || 'identity'
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

const EXTENSOES = { br: '.br', gzip: '.gz' }

// Entrega o .br ou o .gz que o build gravou na pasta dos pré-comprimidos, fora da que o
// express.static serve, a quem aceita; o send cuida de ETag, Last-Modified, 304, Range e HEAD. Um
// arquivo sem nenhum pré-comprimido (fora da imagem do Cloud Run) segue para o express.static
// exatamente como antes; um que sumiu ou não pôde ser lido depois de o servidor subir também segue
// para lá.
function servirPrecomprimidos (pasta, arquivos) {
  const prontos = new Map(arquivos
    .map(arquivo => [arquivo, Object.keys(EXTENSOES).filter(c => existsSync(join(pasta, arquivo + EXTENSOES[c])))])
    .filter(([, codificacoes]) => codificacoes.length > 0)
    .map(([arquivo, codificacoes]) => ['/' + arquivo, { arquivo, codificacoes, tipo: extname(arquivo) }]))
  return (req, res, next) => {
    const pronto = prontos.get(req.path)
    if (!pronto || !['GET', 'HEAD'].includes(req.method)) return next()
    res.vary('Accept-Encoding')
    const codificacao = codificacaoAceita(req, pronto.codificacoes)
    if (codificacao === 'identity') return next()
    res.set('Content-Encoding', codificacao)
    res.type(pronto.tipo)
    res.sendFile(pronto.arquivo + EXTENSOES[codificacao], { root: pasta, maxAge: 0 }, erro => {
      // Como o res.sendFile do Express sem callback: quem desistiu no meio não é erro do servidor.
      if (!erro || erro.code === 'ECONNABORTED' || erro.syscall === 'write') return
      // Um erro de leitura depois dos headers (EIO no meio do arquivo): a resposta já começou e não
      // tem conserto. Mexer nos headers lançaria ERR_HTTP_HEADERS_SENT dentro do evento do stream, uma
      // exceção não capturada que derruba a instância. Fecha a conexão, como o finalhandler do Express,
      // para o navegador ver o corpo cortado como falha e não guardar metade do arquivo.
      if (res.headersSent) {
        log({ level: 'warn', message: `Swagger UI pré-comprimido cortado em ${req.path}: ${erro.code} (${erro.message})` })
        return res.destroy()
      }
      res.removeHeader('Content-Encoding')
      res.removeHeader('Content-Type')
      // 412 e 416 respondidos como o send faria, com o Content-Range dele, sem corpo.
      if (erro.status === 412 || erro.status === 416) return res.status(erro.status).set(erro.headers || {}).end()
      // Qualquer outro erro antes dos headers (o arquivo sumiu, a pasta virou arquivo, falha de disco)
      // segue para o express.static, que serve o arquivo sem compressão, como antes deste middleware.
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
