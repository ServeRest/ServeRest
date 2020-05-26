const faker = require('faker')

async function login (email, password) {
  const { body } = await request.post('/login').send({
    email,
    password
  })
  return body
}

async function cadastrarCarrinho (authorization) {
  const { body: bodyProdutos } = await request.get('/produtos')
  const { body } = await request.post('/carrinhos').set('authorization', authorization).send({
    produtos: [{
      idProduto: bodyProdutos.produtos[0]._id,
      quantidade: 1
    }]
  }).expect(201)
  return body
}

async function cadastrarUsuario (
  nome = faker.name.firstName() + ' ' + faker.name.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  administrador = `${faker.random.boolean()}`
) {
  const { body } = await request.post('/usuarios').send({
    nome,
    email,
    password,
    administrador
  })
  return {
    nome,
    email,
    password,
    administrador,
    _id: body._id
  }
}

async function excluirUsuario (id) {
  const { body } = await request.del('/usuarios/' + id).expect(200)
  return body
}

module.exports = {
  cadastrarCarrinho,
  cadastrarUsuario,
  excluirUsuario,
  login
}
