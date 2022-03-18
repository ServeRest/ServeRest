const joi = require('@hapi/joi')

const rotaProdutos = '/produtos'
const schema = require('./schema')
const utils = require('../utils')

describe(rotaProdutos + ' CONTRATO - @smokeE2E', () => {
  it('GET', async () => {
    const { body } = await request.get(rotaProdutos).expect(200)

    joi.assert(body, schema.get)
  })

  it('POST', async () => {
    const { authorization } = await utils.login('fulano@qa.com', 'teste')

    const { body } = await request
      .post(rotaProdutos)
      .set('authorization', authorization)
      .send({})
      .expect(400)

    joi.assert(body, schema.post)
  })

  it('PUT', async () => {
    const { authorization } = await utils.login('fulano@qa.com', 'teste')
    const { body } = await request
      .put(`${rotaProdutos}/123123`)
      .set('authorization', authorization)
      .send({})
      .expect(400)

    joi.assert(body, schema.put)
  })
})
