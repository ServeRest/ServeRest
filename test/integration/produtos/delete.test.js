const chai = require('chai')

const rotaProdutos = '/produtos'
const utils = require('../utils')

describe(rotaProdutos + ' DELETE', () => {
  let authorizationAdministrador
  beforeEach(async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    authorizationAdministrador = authorization
  })

  it('Registro excluído com sucesso', async () => {
    const { _id } = await utils.cadastrarProduto({ authorization: authorizationAdministrador })

    const { body: bodyDel } = await request
      .del(`${rotaProdutos}/${_id}`)
      .set('authorization', authorizationAdministrador)
      .expect(200)
    const { body: bodyGet } = await request.get(rotaProdutos).query({ _id })

    chai.assert.deepEqual(bodyDel, { message: 'Registro excluído com sucesso' })
    chai.assert.deepEqual(bodyGet, { quantidade: 0, produtos: [] })
  })

  it('Nenhum registro excluído', async () => {
    const { body } = await request
      .del(`${rotaProdutos}/a`)
      .set('authorization', authorizationAdministrador)
      .expect(200)

    chai.assert.deepEqual(body, { message: 'Nenhum registro excluído' })
  })

  it('Produto faz parte de carrinho', async () => {
    const authorization = authorizationAdministrador
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization })
    const { _id: idCarrinho } = await utils.cadastrarCarrinho({ idProduto, authorization })

    const { body } = await request
      .del(`${rotaProdutos}/${idProduto}`)
      .set('authorization', authorizationAdministrador)
      .expect(400)

    chai.assert.deepEqual(body, {
      message: 'Não é permitido excluir produto que faz parte de carrinho',
      idCarrinhos: [idCarrinho]
    })
    const { body: bodyGet } = await request.get(rotaProdutos).query({ _id: idProduto })
    chai.assert.equal(bodyGet.quantidade, 1)
  })

  it('Token inválido', async () => {
    const { body } = await request
      .del(`${rotaProdutos}/a`)
      .set('authorization', 'a')
      .expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('Rota para administradores', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
    const { authorization } = await utils.login(email, password)
    const { body } = await request
      .del(`${rotaProdutos}/a`)
      .set('authorization', authorization)
      .expect(403)

    chai.assert.deepEqual(body, {
      message: 'Rota exclusiva para administradores'
    })
  })
})
