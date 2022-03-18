const chai = require('chai')
const joi = require('@hapi/joi')

const { version } = require('../../../package.json')

describe('GENERICO', () => {
  it('Mensagem de rota inexistente', async () => {
    const rotaInexistente = '/api-doc'
    const { body } = await request.get(rotaInexistente).expect(405)

    const URL = (process.env.TEST_TYPE === 'e2e-staging') ? 'https://staging.serverest.dev' : 'http://localhost:3000'

    const message = `Não é possível realizar GET em ${rotaInexistente}. Acesse ${URL} para ver as rotas disponíveis e como utilizá-las.`
    chai.assert.deepEqual(body, { message })
  })

  it('Token com número inválido', async () => {
    const { body } = await request
      .del('/produtos/a')
      .set('authorization', 'Bearer asdasd')
      .expect(401)

    chai.assert.deepEqual(body, {
      message: 'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
    })
  })

  it('/favicon.ico', async () => {
    await request.get('/favicon.ico').expect(200)
  })

  it('Validar presença de headers de segurança - @skipE2E', async () => {
    const rotas = ['/produtos', '/usuarios', '/carrinhos']
    const rotaAleatoria = rotas[Math.floor(Math.random() * rotas.length)]
    const { headers } = await request.get(rotaAleatoria).expect(200)

    chai.assert.include(headers, {
      'access-control-allow-origin': '*',
      'x-dns-prefetch-control': 'off',
      'x-frame-options': 'SAMEORIGIN',
      'strict-transport-security': 'max-age=15552000; includeSubDomains',
      'x-download-options': 'noopen',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'content-type': 'application/json; charset=utf-8'
    })

    joi.assert(headers, joi.object().keys({
      'access-control-allow-origin': joi.any(),
      'x-dns-prefetch-control': joi.any(),
      'x-frame-options': joi.any(),
      'strict-transport-security': joi.any(),
      'x-download-options': joi.any(),
      'x-content-type-options': joi.any(),
      'x-xss-protection': joi.any(),
      'content-type': joi.any(),
      'content-length': joi.any(),
      etag: joi.any(),
      date: joi.any(),
      connection: joi.any()
    }).required())
  })

  it('/version', async () => {
    const { body } = await request
      .get('/version')
      .expect(200)

    chai.assert.deepEqual(body, { version })
  })
})
