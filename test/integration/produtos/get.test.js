const chai = require('chai')
const { faker } = require('@faker-js/faker')

const rotaProdutos = '/produtos'
const utils = require('../utils')

describe(rotaProdutos + ' GET', () => {
  it('Query string - Busca por todos as chaves', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    const produto = await utils.cadastrarProduto({ authorization })

    const { body } = await request.get(rotaProdutos).query(produto)

    chai.assert.deepEqual(body, {
      quantidade: 1,
      produtos: [
        produto
      ]
    })
  })

  // A query chega como texto, e os filtros numéricos são convertidos antes do schema e da busca no banco.
  it('Query string - preco chega como número e encontra o produto cadastrado', async () => {
    const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
    const { authorization } = await utils.login(email, password)
    const produto = await utils.cadastrarProduto({ authorization })

    const { body } = await request.get(rotaProdutos).query({ preco: produto.preco }).expect(200)

    chai.assert.deepInclude(body.produtos, produto)
  })

  it('Query string - Nenhum produto encontrado', async () => {
    const { body } = await request.get(rotaProdutos).query({ _id: 'a' }).expect(200)
    chai.assert.deepEqual(body, { quantidade: 0, produtos: [] })
  })

  it('Query string - Chave inexistente', async () => {
    const { body } = await request.get(rotaProdutos).query({ inexistente: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      inexistente: 'inexistente não é permitido'
    })
  })

  it('Query string - preco e quantidade devem ser número', async () => {
    const { body } = await request.get(rotaProdutos).query({ preco: 'a', quantidade: 'a' }).expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um número',
      quantidade: 'quantidade deve ser um número'
    })
  })

  it('Query string - preco e quantidade devem ser inteiro', async () => {
    const { body } = await request.get(rotaProdutos).query({ preco: 0.1, quantidade: 0.1 }).expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um inteiro',
      quantidade: 'quantidade deve ser um inteiro'
    })
  })

  it('Query string - preco deve ser positivo e quantidade deve ser maior que 0', async () => {
    const { body } = await request.get(rotaProdutos).query({ preco: 0, quantidade: -1 }).expect(400)

    chai.assert.deepEqual(body, {
      preco: 'preco deve ser um número positivo',
      quantidade: 'quantidade deve ser maior ou igual a 0'
    })
  })

  // Os casos que procuram valor de produto somam outro filtro de valor único, para o E2E não baixar a lista do
  // ambiente.
  describe('Filtro com valor que parece número', () => {
    let authorization
    before(async () => {
      const { email, password } = await utils.cadastrarUsuario({ administrador: 'true' })
      authorization = (await utils.login(email, password)).authorization
    })

    utils.VALORES_QUE_VIRAVAM_ZERO.forEach(valor => {
      it(`Query string - _id ${JSON.stringify(valor)} não encontra produto`, async () => {
        const { body } = await request.get(rotaProdutos).query({ _id: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 0, produtos: [] })
      })

      it(`Query string - quantidade ${JSON.stringify(valor)} só encontra produto sem estoque`, async () => {
        const descricao = faker.string.alphanumeric(24)
        const semEstoque = await utils.cadastrarProduto({ authorization, descricao, quantidade: 0 })
        await utils.cadastrarProduto({ authorization, descricao, quantidade: 5 })

        const { body } = await request.get(rotaProdutos).query({ descricao, quantidade: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 1, produtos: [semEstoque] })
      })

      // imagem é comparada inteira, sem regex.
      it(`Query string - imagem ${JSON.stringify(valor)} só encontra a imagem igual`, async () => {
        const descricao = faker.string.alphanumeric(24)
        const comImagem = { ...utils.dadosProduto(), descricao, imagem: valor }
        const { body: cadastro } = await request.post(rotaProdutos).set('authorization', authorization)
          .send(comImagem).expect(201)
        await request.post(rotaProdutos).set('authorization', authorization)
          .send({ ...utils.dadosProduto(), descricao, imagem: 'foto.png' }).expect(201)

        const { body } = await request.get(rotaProdutos).query({ descricao, imagem: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 1, produtos: [{ ...comImagem, _id: cadastro._id }] })
      })
    })

    it('Query string - descricao 0 só encontra descrição que contém 0', async () => {
      const nome = `Filtro ${faker.string.alphanumeric(16)}`
      const comZero = await utils.cadastrarProduto({ authorization, nome: `${nome} A`, descricao: 'Lote 0' })
      await utils.cadastrarProduto({ authorization, nome: `${nome} B`, descricao: 'Lote' })

      const { body } = await request.get(rotaProdutos).query({ nome, descricao: '0' }).expect(200)

      chai.assert.deepEqual(body, { quantidade: 1, produtos: [comZero] })
    })

    // Como em produção: o branco vira 0 para o schema, que recusa o 0 nestes campos.
    utils.VALORES_EM_BRANCO.forEach(valor => {
      [
        ['preco', 'preco deve ser um número positivo']
      ].forEach(([campo, mensagem]) => {
        it(`Query string - ${campo} ${JSON.stringify(valor)} responde 400 como em produção`, async () => {
          const { body } = await request.get(rotaProdutos).query({ [campo]: valor }).expect(400)

          chai.assert.deepEqual(body, { [campo]: mensagem })
        })
      })
    })

    // Pendente de decisão: em produção ?quantidade= em branco devolve a lista inteira, e assim continua.
    utils.VALORES_EM_BRANCO.forEach(valor => {
      it(`Query string - quantidade ${JSON.stringify(valor)} não filtra, como em produção`, async () => {
        const descricao = faker.string.alphanumeric(24)
        const produto = await utils.cadastrarProduto({ authorization, descricao, quantidade: 5 })

        const { body } = await request.get(rotaProdutos).query({ descricao, quantidade: valor }).expect(200)

        chai.assert.deepEqual(body, { quantidade: 1, produtos: [produto] })
      })
    })
  })
})
