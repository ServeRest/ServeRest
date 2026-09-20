const chai = require('chai')

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

  it('Query string - Filtros de texto não devem aceitar emojis', async () => {
    const { body } = await request.get(rotaUsuarios).query({
      nome: '😇',
      email: '😅qa@teste.com',
      password: '🚧'
    }).expect(400)

    chai.assert.deepEqual(body, {
      nome: 'nome não deve conter emojis ou caracteres não textuais',
      email: 'email não deve conter emojis ou caracteres não textuais',
      password: 'password não deve conter emojis ou caracteres não textuais'
    })
  })

  it('Query string - Filtro numérico continua sendo aceito', async () => {
    const { body } = await request.get(rotaUsuarios).query({ nome: 123 }).expect(200)

    chai.assert.deepEqual(body, { quantidade: 0, usuarios: [] })
  })
})
