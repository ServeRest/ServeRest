const { expect } = require('chai')
const { Joi } = require('express-validation')

const alterarValoresParaRegex = require('../../src/utils/alterarValoresParaRegex')
const estaEmBranco = require('../../src/utils/estaEmBranco')
const { converterFiltrosNumericos, tirarFiltrosEmBranco } = require('../../src/utils/filtrosDaQuery')
const produtos = require('../../src/models/produtos-model')

function converter (schemaGet, query, outrosCampos) {
  const req = { query }
  converterFiltrosNumericos(schemaGet, outrosCampos)(req, {}, () => {})
  return req
}

describe('filtrosDaQuery', () => {
  it('converte só os campos que o schema de GET da rota declara como número', () => {
    const { query } = converter(produtos.schemaGet, { quantidade: '007', preco: '1e3', nome: '007', _id: '0000000000000000' })

    expect(query).to.deep.equal({ quantidade: 7, preco: 1000, nome: '007', _id: '0000000000000000' })
  })

  it('um filtro novo com Joi.number() é convertido sem lista à parte', () => {
    const schemaGet = { query: Joi.object({ nota: Joi.number(), nome: Joi.any() }) }

    expect(converter(schemaGet, { nota: '10', nome: '10' }).query).to.deep.equal({ nota: 10, nome: '10' })
  })

  it('converte também os campos extras pedidos pela rota', () => {
    expect(converter(produtos.schemaGet, { email: '123' }, ['email']).query).to.deep.equal({ email: 123 })
  })

  it('não converte texto que não é número nem valor que não é texto', () => {
    const { query } = converter(produtos.schemaGet, { quantidade: 'abc', preco: ['1', '2'] })

    expect(query).to.deep.equal({ quantidade: 'abc', preco: ['1', '2'] })
  })

  it('o campo numérico em branco chega ao schema como 0 e sai da busca depois', () => {
    const req = converter(produtos.schemaGet, { quantidade: ' ', preco: '', descricao: 'a' })

    expect(req.query).to.deep.equal({ quantidade: 0, preco: 0, descricao: 'a' })
    expect(req.filtrosEmBranco).to.deep.equal(['preco', 'quantidade'])
    tirarFiltrosEmBranco(req, {}, () => {})
    expect(req.query).to.deep.equal({ descricao: 'a' })
  })

  it('o campo de texto em branco não filtra a busca', () => {
    expect(alterarValoresParaRegex({ nome: ' ', _id: '\t', descricao: '0' })).to.deep.equal({ descricao: /0/i })
  })

  it('estaEmBranco só aceita texto vazio ou com espaços', () => {
    expect(['', ' ', '\t\n'].map(estaEmBranco)).to.deep.equal([true, true, true])
    expect(['0', 'a', 0, undefined, ['']].map(estaEmBranco)).to.deep.equal([false, false, false, false, false])
  })
})
