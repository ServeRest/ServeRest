const { expect } = require('chai')
const { Joi } = require('express-validation')

const { filtrosDaLista } = require('../../src/utils/filtrosDaQuery')
const produtos = require('../../src/models/produtos-model')
const usuarios = require('../../src/models/usuarios-model')

// Roda só o primeiro passo de filtrosDaLista, a conversão.
function converter (schemaGet, query) {
  const req = { query }
  filtrosDaLista(schemaGet)[0](req, {}, () => {})
  return req
}

describe('filtrosDaQuery', () => {
  it('filtrosDaLista devolve conversão, validação e tirar o branco, nessa ordem', () => {
    expect(filtrosDaLista(produtos.schemaGet)).to.have.lengthOf(3)
  })

  it('converte só os campos que o schema de GET da rota declara como número', () => {
    const { query } = converter(produtos.schemaGet, { quantidade: '007', preco: '1e3', nome: '007', _id: '0000000000000000' })

    expect(query).to.deep.equal({ quantidade: 7, preco: 1000, nome: '007', _id: '0000000000000000' })
  })

  it('converte com Number, como a produção: hexadecimal, binário e espaços em volta', () => {
    const { query } = converter(produtos.schemaGet, { preco: '0x10', quantidade: '0b11' })

    expect(query).to.deep.equal({ preco: 16, quantidade: 3 })
    expect(converter(produtos.schemaGet, { preco: ' 5 ' }).query).to.deep.equal({ preco: 5 })
  })

  it('um filtro novo com Joi.number() é convertido sem lista à parte', () => {
    const schemaGet = { query: Joi.object({ nota: Joi.number(), nome: Joi.any() }) }

    expect(converter(schemaGet, { nota: '10', nome: '10' }).query).to.deep.equal({ nota: 10, nome: '10' })
  })

  it('não converte o email, que é texto no schema', () => {
    expect(converter(usuarios.schemaGet, { email: '123' }).query).to.deep.equal({ email: '123' })
  })

  it('não converte texto que não é número nem valor que não é texto', () => {
    const { query } = converter(produtos.schemaGet, { quantidade: 'abc', preco: ['1', '2'] })

    expect(query).to.deep.equal({ quantidade: 'abc', preco: ['1', '2'] })
  })
})
