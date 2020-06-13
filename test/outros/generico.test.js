const chai = require('chai')

describe('GENERICO', () => {
  it('Mensagem de rota inexistente', async () => {
    const rotaInexistente = '/api-doc'
    const { body } = await request.get(rotaInexistente).expect(405)

    const message = `Não é possível realizar GET em ${rotaInexistente}. Acesse https://serverest.js.org para ver as rotas disponíveis e como utilizá-las.`
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
    const { body } = await request
      .get('/favicon.ico')
      .expect(200)

    chai.assert.deepEqual(body, {})
  })
})
