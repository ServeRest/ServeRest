#!/usr/bin/env node

'use strict'

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })

const colors = require('colors')
const debug = require('debug')('nodestr:server')
const fs = require('fs')
const http = require('http')
const util = require('util')
const open = require('open').default

const { version } = require('../package.json')
const { formaDeExecucao, urlDocumentacao, aplicacaoExecutandoLocalmente } = require('./utils/ambiente')
const { conf } = require('./utils/conf')
const getRandomFinancialContributor = require('./utils/getRandomFinancialContributor')
const { log } = require('./utils/logger')

const DEFAULT_PORT = 3000

// Erros fora do ciclo de uma requisição encerram o processo sem deixar registro da causa,
// o que no Cloud Run aparece apenas como um container reiniciando sem explicação.
/* istanbul ignore next */
process.on('uncaughtException', valor => {
  // Node permite lançar qualquer valor, não só Error. Sem esta normalização, um throw de
  // string ou null faria o próprio handler lançar ao acessar .code, perdendo o registro
  // da causa, que é justamente o que estes handlers existem para garantir.
  const erro = valor instanceof Error ? valor : new Error(util.inspect(valor))

  // Responder a uma requisição já encerrada é inofensivo: a resposta chegou ao cliente e o
  // processo segue íntegro. Derrubar o servidor por isso custaria uma indisponibilidade
  // inteira para corrigir nada.
  if (erro.code === 'ERR_HTTP_HEADERS_SENT') {
    log({ level: 'error', message: `Tentativa de responder requisição já encerrada: ${erro.message}` })
    return
  }

  encerrar(`Exceção não capturada: ${erro.message}. Stack: ${erro.stack}`)
})

/* istanbul ignore next */
process.on('unhandledRejection', motivo => {
  encerrar(`Promise rejeitada sem tratamento: ${motivo instanceof Error ? motivo.stack : util.inspect(motivo)}`)
})

// Sai de imediato em vez de drenar as conexões abertas. Com max-instances 1 no Cloud Run
// não existe outra instância para atender quem chegar durante a drenagem, então esperar
// só adiaria a subida do container substituto e prolongaria a indisponibilidade.
/* istanbul ignore next */
function encerrar (mensagem) {
  // console.log é assíncrono quando stdout é um pipe, caso do Cloud Run, e process.exit
  // não drena writes pendentes. A escrita síncrona no stderr garante que a causa fique
  // registrada mesmo que o log estruturado seja truncado pelo encerramento.
  fs.writeSync(2, `${mensagem}\n`)
  log({ level: 'error', message: mensagem })
  process.exit(1)
}

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv))
  .default({
    porta: conf.porta,
    timeout: conf.tokenTimeout,
    nodoc: false,
    nobearer: false,
    nosec: false
  })
  .boolean(['nobearer', 'nodoc', 'nosec'])
  .number(['timeout', 'porta'])
  .alias('p', 'porta')
  .alias('t', 'timeout')
  .alias('d', 'nodoc')
  .alias('b', 'nobearer')
  .alias('s', 'nosec')
  .alias('h', 'help')
  .alias('v', 'version')
  .usage('Ajuda do ServeRest')
  .usage('\nModo de uso:')
  .usage('npx serverest <Option>')
  .usage('docker run -p 3000:3000 paulogoncalvesbh/serverest <Option>')
  .describe('p', 'Porta que será utilizada (default: 3000)')
  .describe('t', 'Timeout da autenticação em segundos (default: 600)')
  .describe('d', 'Desabilitar o início automático da documentação')
  .describe('b', 'Não retornar "Bearer" no authorization de /login')
  .describe('s', 'Desabilitar os headers de segurança na resposta')
  .example('npx serverest', 'Utilizar porta e timeout padrão')
  .example('npx serverest --nodoc', 'Documentação não abrirá')
  .example('npx serverest --timeout 3600', 'Token de autenticação terá 1h de duração')
  .example('npx serverest --porta 3500', 'Será iniciado na porta 3500')
  .example('npx serverest -s -p 4200 -t 120 -b', 'É possível combinar as opções')
  .help('h')
  .epilog('Acesse serverest.dev para ver as rotas disponíveis')
  .epilog('Precisa de ajuda?')
  .epilog('Abra uma issue em github.com/ServeRest/ServeRest/issues')
  .argv

module.exports = { argv }

conf.tokenTimeout = argv.timeout
conf.semHeaderDeSeguranca = argv.nosec
conf.semBearer = argv.nobearer

const app = require('./app')

const port = normalizePort(argv.porta)
conf.porta = port
app.set('port', port)

const server = http.createServer(app)

server.listen(port, async () => {
  console.log(colors.green.bold(`\nServeRest v${version} está em execução`))
  if (aplicacaoExecutandoLocalmente()) {
    console.log(colors.white.bold('Teste o funcionamento acessando'), colors.yellow.bold(`http://localhost:${port}/usuarios`), colors.white.bold('no navegador\n'))
    console.log(colors.white.bold('Quer saber as rotas disponíveis e como utilizá-las? Acesse'), colors.yellow.bold(`http://localhost:${port}`))
    if (formaDeExecucao() === 'npm') {
      console.log(colors.white.bold('Quer alterar porta de execução, timeout do token, etc? Execute'), colors.yellow.bold('npx serverest --help'))
    } else if (formaDeExecucao() === 'docker') {
      console.log(colors.white.bold('Quer alterar porta de execução, timeout do token, etc? Execute'), colors.yellow.bold('docker run -p 3000:3000 paulogoncalvesbh/serverest --help'))
    }
    console.log(colors.white.bold('Para outras dúvidas acesse'), colors.yellow.bold('github.com/ServeRest/ServeRest\n'))
    console.log(colors.cyan.bold('Feito com'), colors.red.bold('♥'), colors.cyan.bold('para todos os QAs e apoiado por'), colors.red.bold(await getRandomFinancialContributor()), '\n')
  }
})
server.on('error', onError)
server.on('listening', onListening)

if (!argv.nodoc) {
  open(urlDocumentacao()).catch(() => {})
}

function normalizePort (val) {
  const port = parseInt(val, 10)

  const isNumber = !isNaN(port)
  const isInPortRange = port > -1 && port < 65536
  if (isNumber && isInPortRange) {
    return port
  }

  return DEFAULT_PORT
}

function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Porta ' + port

  switch (error.code) {
    case 'EACCESS':
      console.error(colors.red.bold(bind, 'requires elevated privileges'))
      process.exit(1)

    /* eslint-disable-next-line no-fallthrough */
    case 'EADDRINUSE':
      console.error(colors.red.bold(bind, `já está em uso.
Feche o programa/serviço que está usando a porta ${port} ou execute o ServeRest em outra porta.
Execute 'npx serverest -h' para saber como executar em outra porta.\n`))
      process.exit(1)

    /* eslint-disable-next-line no-fallthrough */
    default:
      throw error
  }
}

function onListening () {
  const addr = server.address()
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port

  debug('Listening on ' + bind)
}
