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

  // Objeto na query, solto ou dentro de um array, chegava à busca do NeDB como operador: ?_id[$ne]=x devolvia
  // a lista inteira e ?_id[$where]=x respondia 500 com o stack. Nos campos com regex virava "[object Object]".
  ;[
    ['_id[$ne]=x', '_id'],
    ['_id[$exists]=true', '_id'],
    ['_id[$where]=x', '_id'],
    ['_id[$nin][]=a', '_id'],
    ['nome[$ne]=x', 'nome'],
    ['password[$regex]=.', 'password'],
    ['_id[0][$ne]=x', '_id'],
    ['nome[]=a&nome[][$ne]=x', 'nome']
  ].forEach(([query, campo]) => {
    it(`Query string - ${query} responde que ${campo} deve ser uma string`, async () => {
      const { body } = await request.get(rotaUsuarios).query(query).expect(400)

      chai.assert.deepEqual(body, { [campo]: `${campo} deve ser uma string` })
    })
  })

  // O parâmetro repetido chega como array e segue como em produção: 200, sem encontrar nada.
  ;['_id', 'nome', 'password'].forEach(campo => {
    it(`Query string - ${campo} repetido continua respondendo 200`, async () => {
      const valores = [faker.string.alphanumeric(16), faker.string.alphanumeric(16)]
      const { body } = await request.get(rotaUsuarios).query({ [campo]: valores }).expect(200)

      chai.assert.deepEqual(body, { quantidade: 0, usuarios: [] })
    })
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

    // Antes o 123, o vazio e o espaço viravam o número 0, e as três respostas diziam que email deve ser uma string.
    ;[
      ['123', 'email deve ser um email válido'],
      ['', 'email não pode ficar em branco'],
      [' ', 'email deve ser um email válido']
    ].forEach(([email, mensagem]) => {
      it(`Query string - email ${JSON.stringify(email)} responde que ${mensagem.replace('email ', '')}`, async () => {
        const { body } = await request.get(rotaUsuarios).query({ email }).expect(400)

        chai.assert.deepEqual(body, { email: mensagem })
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
