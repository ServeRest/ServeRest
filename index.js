#!/usr/bin/env node

'use strict'

const { conf } = require('./src/conf')

const argv = require('yargs')
  .default({
    porta: conf.porta,
    debug: conf.debug,
    timeout: conf.tokenTimeout
  })
  .boolean('debug')
  .number(['timeout', 'porta'])
  .alias('v', 'version')
  .alias('p', 'porta')
  .alias('d', 'debug')
  .alias('t', 'timeout')
  .alias('h', 'help')
  .describe('p', 'Porta utilizada pelo servidor (default: 3000)')
  .describe('d', 'Imprimir informações das requisições (default: false)')
  .describe('t', 'Timeout do token em milissegundos (default: 1000)')
  .example('$0 -p 3500', 'Servidor será inicializado na porta 3500')
  .example('$0 --debug')
  .example('$0 --porta 3500 -d -t 5')
  .help('h')
  .epilog('Precisa de ajuda?')
  .epilog('github.com/PauloGoncalvesBH/serverest/issues')
  .argv

const serverest = require('./src/serverest')

conf.porta = argv.porta
conf.debug = argv.debug
conf.tokenTimeout = argv.timeout

serverest()
