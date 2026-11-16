const { expect } = require('chai')
const { faker } = require('@faker-js/faker')

// Um usuário com nome de 70 mil caracteres põe a lista filtrada pelo e-mail dele acima dos 64 KB a partir
// dos quais a compressão entra, sem precisar cadastrar centenas de usuários. Fica fora do E2E, como os testes
// de compressão da página: lá ele gravaria 70 KB na base compartilhada do staging e da produção.
describe('Compressão das listas grandes', () => {
  const nome = 'x'.repeat(70000)
  const email = faker.internet.email()
  let id

  before(async () => {
    const { body } = await request.post('/usuarios').send({ nome, email, password: 'teste', administrador: 'true' }).expect(201)
    id = body._id
  })

  after(async () => {
    if (id) await request.del(`/usuarios/${id}`).expect(200)
  })

  function listar (acceptEncoding) {
    return request.get('/usuarios').query({ email }).set('Accept-Encoding', acceptEncoding)
  }

  it('sai em gzip a quem aceita gzip, com o mesmo JSON - @skipE2E', async () => {
    const { headers, body } = await listar('gzip').expect(200)
    expect(headers['content-encoding']).to.equal('gzip')
    expect(headers.vary).to.equal('Accept-Encoding')
    expect(body).to.deep.equal({ quantidade: 1, usuarios: [{ nome, email, password: 'teste', administrador: 'true', _id: id }] })
  })

  it('sai em gzip, e não em brotli, a quem aceita os dois, como navegador e Postman - @skipE2E', async () => {
    const { headers } = await listar('gzip, deflate, br').expect(200)
    expect(headers['content-encoding']).to.equal('gzip')
  })

  it('sai em gzip a quem prefere brotli com peso ou aceita qualquer uma - @skipE2E', async () => {
    for (const aceitas of ['br;q=1.0, gzip;q=0.5', '*']) {
      const { headers } = await listar(aceitas).expect(200)
      expect(headers['content-encoding'], aceitas).to.equal('gzip')
    }
  })

  it('sai em deflate a quem só aceita deflate - @skipE2E', async () => {
    const { headers } = await listar('deflate').expect(200)
    expect(headers['content-encoding']).to.equal('deflate')
  })

  it('sai sem compressão, com o tamanho, a quem só aceita brotli ou não aceita compressão - @skipE2E', async () => {
    for (const aceitas of ['br', 'identity']) {
      const { headers } = await listar(aceitas).expect(200)
      expect(headers, aceitas).to.not.have.property('content-encoding')
      expect(Number(headers['content-length']), aceitas).to.be.above(64 * 1024)
    }
  })
})
