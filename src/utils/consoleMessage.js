'use strict'

const fs = require('fs')

const colors = require('colors')
const { porta, zoeira } = require('../../conf.js')

module.exports = function printStartServerMessage () {
  console.log(
    colors.cyan('Servidor REST para estudo de testes de API.\nDúvidas? Acesse: https://github.com/PauloGoncalvesBH/rest-server')
  )

  if (zoeira) console.log(colors.yellow('\n✧*｡٩(ˊᗜˋ*)و✧*｡ BORA ESTUDAR (╯°□°）╯︵ ┻━┻'))

  const objectDb = JSON.parse(fs.readFileSync('./data/db.json', 'UTF-8'))

  console.log(colors.gray('\nEndpoints disponíveis que necessitam de autenticação:'))

  for (const endpoint in objectDb) {
    console.log(colors.gray(`  http://localhost:${porta}/${endpoint}`))
  }
  console.log(colors.gray('\nEndpoints exclusivos de autenticação:'))
  console.log(colors.gray(`  http://localhost:${porta}/auth/login`))
  console.log(colors.gray(`  http://localhost:${porta}/auth/registrar\n`))
  console.log(colors.green(`O servidor está de pé e em execução na porta ${porta}!`))
}
