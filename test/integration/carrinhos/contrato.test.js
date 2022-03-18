const joi = require('@hapi/joi')

const rotaCarrinhos = '/carrinhos'
const schema = require('./schema')
const utils = require('../utils')

describe(rotaCarrinhos + ' CONTRATO - @smokeE2E', () => {
  it('GET', async () => {
    const { body } = await request.get(rotaCarrinhos).expect(200)

    joi.assert(body, schema.get)
  })

  it('POST - Body em branco', async () => {
    const { authorization } = await utils.login('fulano@qa.com', 'teste')

    const { body } = await request
      .post(rotaCarrinhos)
      .set('authorization', authorization)
      .send({})
      .expect(400)

    joi.assert(body, schema.postSemBody)
  })

  it('POST - Body sem produtos', async () => {
    const { authorization } = await utils.login('fulano@qa.com', 'teste')

    const { body } = await request
      .post(rotaCarrinhos)
      .set('authorization', authorization)
      .send({ produtos: [{}] })
      .expect(400)

    joi.assert(body, schema.postSemProdutos)
  })
})
