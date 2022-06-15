const chai = require('chai')
const faker = require('faker')
const sandbox = require('sinon').createSandbox()

const rotaUsuarios = '/usuarios'
const carrinhosService = require('../../../src/services/carrinhos-service.js')

describe(rotaUsuarios + ' DELETE', () => {
  afterEach(() => sandbox.restore())

  it('Registro excluído com sucesso', async () => {
    const { body } = await request.post(rotaUsuarios).send({
      nome: faker.name.firstName() + ' ' + faker.name.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      administrador: `${faker.datatype.boolean()}`
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

  it('Usuário com carrinho cadastrado - @skipE2E', async () => {
    const idUsuario = 'jSlx8zTdhRcoMS64'
    const idCarrinho = 'IU1c72V7iMKAxqt9'

    sandbox.stub(carrinhosService, 'getAll').returns([{
      produtos: [{
        idProduto: 'duYhYQtodnlMCAEr',
        quantidade: 1,
        precoUnitario: 17632
      }],
      precoTotal: 17632,
      quantidadeTotal: 1,
      idUsuario,
      _id: idCarrinho
    }])

    const { body } = await request.del(`${rotaUsuarios}/${idUsuario}`).expect(400)

    sandbox.assert.calledOnce(carrinhosService.getAll)
    chai.assert.deepEqual(body, { message: 'Não é permitido excluir usuário com carrinho cadastrado', idCarrinho })
  })
})
