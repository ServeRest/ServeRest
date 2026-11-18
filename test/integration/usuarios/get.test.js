const chai = require('chai')

const rotaUsuarios = '/usuarios'
const utils = require('../utils')

// Valores que o Number aceita e que viravam 0 (ou -0) antes da busca, que então descartava o filtro.
const VALORES_QUE_VIRAVAM_ZERO = ['0', '0000000000000000', '-0', '0.0', ' ']

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

  // O filtro que sumia devolvia a lista inteira de usuários, a resposta mais pesada da API.
  describe('Filtro com valor que parece número', () => {
    VALORES_QUE_VIRAVAM_ZERO.forEach(valor => {
      it(`Query string - _id ${JSON.stringify(valor)} não encontra usuário`, async () => {
        const { body } = await request.get(rotaUsuarios).query({ _id: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 0, usuarios: [] })
      })
    })

    it('Query string - password 0 só encontra senha que contém 0', async () => {
      const usuario = await utils.cadastrarUsuario({ password: `senha0${Date.now()}` })

      const { body } = await request.get(rotaUsuarios).query({ password: '0' }).expect(200)

      chai.assert.deepInclude(body.usuarios, usuario)
      body.usuarios.forEach(({ password }) => chai.assert.include(password, '0'))
    })

    it('Query string - nome 007 procura o texto enviado, com o zero à esquerda', async () => {
      const sufixo = Date.now()
      const agente = await utils.cadastrarUsuario({ nome: `Agente 007 ${sufixo}` })
      await utils.cadastrarUsuario({ nome: `Agente 7 ${sufixo}` })

      const { body } = await request.get(rotaUsuarios).query({ nome: '007' }).expect(200)

      chai.assert.deepInclude(body.usuarios, agente)
      body.usuarios.forEach(({ nome }) => chai.assert.include(nome, '007'))
    })

    // Comportamento mantido: ?nome= sem valor, como sai de um formulário em branco, não filtra.
    it('Query string - valor vazio não filtra - @skipE2E', async () => {
      const { body: semFiltro } = await request.get(rotaUsuarios).expect(200)

      const { body } = await request.get(rotaUsuarios).query({ _id: '', nome: '', password: '' }).expect(200)

      chai.assert.deepEqual(body, semFiltro)
    })
  })
})
