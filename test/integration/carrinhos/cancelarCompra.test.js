const chai = require('chai')
const faker = require('faker')

const rotaCarrinhos = '/carrinhos'
const rotaCancelarCompra = `${rotaCarrinhos}/cancelar-compra`
const utils = require('../utils')

describe(rotaCancelarCompra + ' DELETE', () => {
  it('Registro excluído com sucesso. Estoque reabastecido', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    const quantidade = faker.datatype.number()
    const { _id: idProduto } = await utils.cadastrarProduto({ authorization, quantidade })

    await request.post(rotaCarrinhos).set('authorization', authorization).send({
      produtos: [{
        idProduto,
        quantidade: quantidade - 10
      }]
    }).expect(201)

    const { body: bodyDel } = await request.del(rotaCancelarCompra).set('authorization', authorization).expect(200)
    const { body: bodyProduto } = await request.get('/produtos').query({ _id: idProduto }).expect(200)

    chai.assert.deepEqual(bodyDel, { message: 'Registro excluído com sucesso. Estoque dos produtos reabastecido' })
    chai.assert.equal(bodyProduto.produtos[0].quantidade, quantidade)
  })

  it('Não foi encontrado carrinho para esse usuário', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
    const { authorization } = await utils.login(email, password)
    const { body } = await request
      .del(rotaCancelarCompra)
      .set('authorization', authorization)
      .expect(200)

    chai.assert.deepEqual(body, { message: 'Não foi encontrado carrinho para esse usuário' })
  })

  it('Token ausente', async () => {
    const { body } = await request
      .del(rotaCancelarCompra)
      .expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('Token inválido - Apenas Bearer', async () => {
    const { body } = await request
      .del(rotaCancelarCompra)
      .set('authorization', 'Bearer')
      .expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('Token inválido - Sem Bearer', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'false' })
    const { authorization } = await utils.login(email, password)
    const { body } = await request
      .del(rotaCancelarCompra)
      .set('authorization', authorization.split(' ')[1])
      .expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('Token inválido - Usuário excluído', async () => {
    const { email, password, _id } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    await request.del(`/usuarios/${_id}`).expect(200)

    const { body } = await request
      .del(rotaCancelarCompra)
      .set('authorization', authorization)
      .expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })
})
