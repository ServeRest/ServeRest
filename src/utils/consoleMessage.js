'use strict'

const fs = require('fs')
const { join } = require('path')

const colors = require('colors')
const { conf } = require('../conf')

const dirDbJson = join(__dirname, '../../data/db.json')

module.exports = function printStartServerMessage () {
  console.log(colors.blue.bold('\n=== ServeRest ===\n'))

  console.log(colors.yellow(`Configuração = {
  porta: ${conf.porta}
  token-timeout: ${conf.tokenTimeout}ms
  debug: ${conf.debug}
}`))

  const objectDb = JSON.parse(fs.readFileSync(dirDbJson, 'UTF-8'))

  console.log(colors.yellow.bold('\nEndpoints disponíveis que necessitam de autenticação:'))

  for (const endpoint in objectDb) {
    console.log(colors.gray(`  http://localhost:${conf.porta}/${endpoint}`))
  }
  console.log(colors.yellow.bold('\nEndpoints exclusivos de autenticação:'))
  console.log(colors.gray(`  http://localhost:${conf.porta}/auth/login`))
  console.log(colors.gray(`  http://localhost:${conf.porta}/auth/registrar\n`))

  console.log(colors.yellow('Dúvidas? npx serverest -h'))
  console.log(colors.cyan.italic('Made with'), colors.red.italic('♥ '), colors.cyan.italic('by: npx paulogoncalves\n'))
}
