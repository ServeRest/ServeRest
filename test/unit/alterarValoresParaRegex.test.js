const { expect } = require('chai')

const alterarValoresParaRegex = require('../../src/utils/alterarValoresParaRegex')

describe('alterarValoresParaRegex', () => {
  it('should convert specified fields to RegExp', () => {
    const queryString = {
      nome: 'test',
      password: 1234,
      descricao: 'description',
      other: 'field'
    }

    const result = alterarValoresParaRegex(queryString)

    expect(result.nome).to.be.instanceOf(RegExp)
    expect(result.password).to.be.instanceOf(RegExp)
    expect(result.descricao).to.be.instanceOf(RegExp)
    expect(result.other).to.not.be.instanceOf(RegExp)
    expect(result.other).to.equal('field')
  })

  it('should handle special regex characters', () => {
    const queryString = {
      nome: 'te.st',
      password: '12*34',
      descricao: 'des|cription'
    }

    const result = alterarValoresParaRegex(queryString)

    expect(result.nome.toString()).to.equal('/te\\.st/i')
    expect(result.password.toString()).to.equal('/12\\*34/i')
    expect(result.descricao.toString()).to.equal('/des\\|cription/i')
  })

  it('should keep zero and numeric text as filters', () => {
    const queryString = {
      _id: '0000000000000000',
      quantidade: 0,
      nome: '0'
    }

    const result = alterarValoresParaRegex(queryString)

    expect(result._id).to.equal('0000000000000000')
    expect(result.quantidade).to.equal(0)
    expect(result.nome.toString()).to.equal('/0/i')
  })

  it('should remove field without value', () => {
    const queryString = {
      nome: 'test',
      password: '',
      empty: ''
    }

    const result = alterarValoresParaRegex(queryString)

    expect(result).to.be.deep.equal({ nome: /test/i })
  })
})
