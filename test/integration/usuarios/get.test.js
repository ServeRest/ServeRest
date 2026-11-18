const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaUsuarios = '/usuarios'
const utils = require('../utils')

describe(rotaUsuarios + ' GET', () => {
  it('Query string - Busca por todos as chaves', async () => {
    const usuario = await utils.cadastrarUsuario()
    const { body } = await request.get(rotaUsuarios).query({
      nome: usuario.nome,
      email: usuario.email,
      password: usuario.password,
      administrador: usuario.administrador,
      _id: usuario._id
    }).expect(200)

    chai.assert.deepEqual(body, {
      quantidade: 1,
      usuarios: [
        {
          nome: usuario.nome,
          email: usuario.email,
          password: usuario.password,
          administrador: usuario.administrador,
          _id: usuario._id
        }
      ]
    })
  })

  it('Query string - Nenhum usuário encontrado', async () => {
    const { body } = await request.get(rotaUsuarios).query({ _id: 'a' }).expect(200)
    chai.assert.deepEqual(body, { quantidade: 0, usuarios: [] })
  })

  it('Query string - Chave inexistente', async () => {
    const { body } = await request.get(rotaUsuarios).query({ inexistente: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      inexistente: 'inexistente não é permitido'
    })
  })

  // O filtro que sumia devolvia a lista inteira de usuários, a resposta mais pesada da API. Os casos que procuram
  // texto somam outro filtro de valor único, para o E2E não baixar a lista do ambiente.
  describe('Filtro com valor que parece número', () => {
    utils.VALORES_QUE_VIRAVAM_ZERO.forEach(valor => {
      it(`Query string - _id ${JSON.stringify(valor)} não encontra usuário`, async () => {
        const { body } = await request.get(rotaUsuarios).query({ _id: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 0, usuarios: [] })
      })
    })

    it('Query string - password 0 só encontra senha que contém 0', async () => {
      const nome = `Filtro ${faker.string.alphanumeric(16)}`
      const comZero = await utils.cadastrarUsuario({ nome, password: 'senha0' })
      await utils.cadastrarUsuario({ nome, password: 'senha' })

      const { body } = await request.get(rotaUsuarios).query({ nome, password: '0' }).expect(200)

      chai.assert.deepEqual(body, { quantidade: 1, usuarios: [comZero] })
    })

    it('Query string - nome 007 procura o texto enviado, com o zero à esquerda', async () => {
      const password = faker.string.alphanumeric(24)
      const agente = await utils.cadastrarUsuario({ nome: 'Agente 007', password })
      await utils.cadastrarUsuario({ nome: 'Agente 7', password })

      const { body } = await request.get(rotaUsuarios).query({ nome: '007', password }).expect(200)

      chai.assert.deepEqual(body, { quantidade: 1, usuarios: [agente] })
    })

    // Como em produção: o branco do email vira 0, e o schema recusa número.
    utils.VALORES_EM_BRANCO.forEach(valor => {
      [
        ['email', 'email deve ser uma string']
      ].forEach(([campo, mensagem]) => {
        it(`Query string - ${campo} ${JSON.stringify(valor)} responde 400 como em produção`, async () => {
          const { body } = await request.get(rotaUsuarios).query({ [campo]: valor }).expect(400)

          chai.assert.deepEqual(body, { [campo]: mensagem })
        })
      })
    })

    // Comportamento de hoje, mantido: ?nome[]= chega como array com o branco e não filtra, como ?nome=.
    it('Query string - nome[]= em branco não filtra', async () => {
      const password = faker.string.alphanumeric(24)
      const usuario = await utils.cadastrarUsuario({ password })

      const { body } = await request.get(rotaUsuarios).query(`nome[]=&password=${password}`).expect(200)

      chai.assert.deepEqual(body, { quantidade: 1, usuarios: [usuario] })
    })

    utils.VALORES_EM_BRANCO.forEach(valor => {
      it(`Query string - valor ${JSON.stringify(valor)} não filtra`, async () => {
        const nome = `Filtro ${faker.string.alphanumeric(16)}`
        const usuario = await utils.cadastrarUsuario({ nome })

        const { body } = await request.get(rotaUsuarios).query({ nome, _id: valor, password: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 1, usuarios: [usuario] })
      })
    })
  })
})
