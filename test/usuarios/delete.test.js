const chai = require('chai')
const faker = require('faker')

const rotaUsuarios = '/usuarios'
const utils = require('../utils')

describe(rotaUsuarios + ' DELETE', () => {
  it('Registro excluído com sucesso', async () => {
    const { body } = await request.post(rotaUsuarios).send({
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.random.boolean()}`
    }).expect(201)

    const { body: bodyDel } = await request.del(`${rotaUsuarios}/${body._id}`).expect(200)
    const { body: bodyGet } = await request.get(rotaUsuarios).query({ _id: body._id })

    chai.assert.deepEqual(bodyDel, { message: 'Registro excluído com sucesso' })
    chai.assert.deepEqual(bodyGet, { quantidade: 0, usuarios: [] })
  })

  it('Nenhum registro excluído', async () => {
    const { body } = await request.del(`${rotaUsuarios}/a`).expect(200)

    chai.assert.deepEqual(body, { message: 'Nenhum registro excluído' })
  })

  it('Usuário com carrinho cadastrado', async () => {
    const { email, password, _id: idUsuario } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization })
    const { _id: idCarrinho } = await utils.cadastrarCarrinho({ idProduto, authorization })

    const { body } = await request.del(`${rotaUsuarios}/${idUsuario}`).expect(400)
    const { body: bodyGet } = await request.get(rotaUsuarios).query({ _id: idUsuario })

    chai.assert.deepEqual(body, { message: 'Não é permitido excluir usuário com carrinho cadastrado', idCarrinho })
    chai.assert.equal(bodyGet.quantidade, 1)
  })
})
