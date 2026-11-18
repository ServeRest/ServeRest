const { faker } = require('@faker-js/faker')

// Tetos de propósito. O carrinho multiplica preço por quantidade, e com os inteiros até 2^53 que o faker gera
// por padrão o precoTotal passava de Number.MAX_SAFE_INTEGER: o carrinho ficava no banco e o contrato de
// /carrinhos GET reprovava na execução seguinte. Com estes tetos um item soma no máximo 10^12, e um carrinho
// precisaria de mais de 9 mil itens para passar do limite. O preço vai até 1 bilhão para um filtro por preço
// quase não repetir valor num ambiente compartilhado. Os testes de carrinho compram quantidade -
// SOBRA_NO_ESTOQUE, por isso a quantidade sempre deixa ao menos 1 para comprar.
const SOBRA_NO_ESTOQUE = 10
const precoAleatorio = () => faker.number.int({ min: 1, max: 1000000000 })
const quantidadeAleatoria = () => faker.number.int({ min: SOBRA_NO_ESTOQUE + 1, max: 1000 })

async function cadastrarCarrinho ({
  idProduto,
  quantidade = 1,
  authorization
}) {
  const { body } = await request.post('/carrinhos').set('authorization', authorization).send({
    produtos: [{
      idProduto,
      quantidade
    }]
  }).expect(201)
  return {
    idProduto,
    quantidade,
    _id: body._id
  }
}

async function cadastrarProduto ({
  nome = faker.commerce.productName() + faker.number.int() + faker.number.int(),
  preco = precoAleatorio(),
  descricao = faker.lorem.words(),
  quantidade = quantidadeAleatoria(),
  authorization
} = {}) {
  const { body } = await request.post('/produtos').send({
    nome,
    preco,
    descricao,
    quantidade
  }).set('authorization', authorization).expect(201)
  return {
    nome,
    preco,
    descricao,
    quantidade,
    _id: body._id
  }
}

async function cadastrarUsuario ({
  nome = faker.person.firstName() + ' ' + faker.person.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  administrador = `${faker.helpers.arrayElement([true, false])}`
} = {}, cliente = request) {
  const { body } = await cliente.post('/usuarios').send({
    nome,
    email,
    password,
    administrador
  }).expect(201)
  return {
    nome,
    email,
    password,
    administrador,
    _id: body._id
  }
}

function dadosProduto () {
  return {
    nome: faker.commerce.productName() + faker.number.int() + faker.number.int(),
    preco: precoAleatorio(),
    descricao: faker.lorem.words(),
    quantidade: quantidadeAleatoria(),
    imagem: faker.lorem.words()
  }
}

async function login (email, password, cliente = request) {
  const { body } = await cliente.post('/login').send({
    email,
    password
  }).expect(200)
  return body
}

// Valores que o Number aceita e que viravam 0 (ou -0) antes da busca, que então descartava o filtro.
const VALORES_QUE_VIRAVAM_ZERO = ['0', '0000000000000000', '-0', '0.0']
// O valor em branco, como sai de um formulário vazio, não filtra em nenhum campo, como em produção.
const VALORES_EM_BRANCO = ['', ' ']

module.exports = {
  VALORES_EM_BRANCO,
  VALORES_QUE_VIRAVAM_ZERO,
  cadastrarCarrinho,
  cadastrarProduto,
  cadastrarUsuario,
  dadosProduto,
  login,
  precoAleatorio,
  quantidadeAleatoria,
  SOBRA_NO_ESTOQUE
}
