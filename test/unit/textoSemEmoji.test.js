const { expect } = require('chai')

const { email, filtroDeTexto, texto } = require('../../src/utils/textoSemEmoji')

const tipoDoErro = resultado => resultado.error && resultado.error.details[0].type

describe('textoSemEmoji', () => {
  describe('texto', () => {
    const schema = texto()

    it('should accept letters, digits and punctuation from any language', () => {
      const valores = [
        'QA Tester',
        'José Ação',
        "O'Conner",
        'teste!@#1',
        'Mouse - 2 unid_',
        'e\u0301 decomposto' // acento combinante, a forma decomposta de 'é'
      ]

      valores.forEach(valor => expect(tipoDoErro(schema.validate(valor)), valor).to.equal(undefined))
    })

    it('should reject emoji and other non textual characters', () => {
      const valores = [
        '😇QA Tester',
        '🚧teste1',
        '1️⃣', // emoji de tecla, formado por marca envolvente
        '🇧🇷', // emoji de bandeira, formado por indicadores regionais
        'a‍b', // zero width joiner
        '★ estrela',
        'linha\nquebrada'
      ]

      valores.forEach(valor => expect(tipoDoErro(schema.validate(valor)), valor).to.equal('string.emoji'))
    })

    it('should keep reporting the original error of non string values', () => {
      expect(tipoDoErro(schema.validate(1))).to.equal('string.base')
      expect(tipoDoErro(schema.validate(''))).to.equal('string.empty')
    })
  })

  describe('filtroDeTexto', () => {
    const schema = filtroDeTexto()

    it('should accept the number that express-query-int builds from a numeric filter', () => {
      expect(tipoDoErro(schema.validate(123))).to.equal(undefined)
    })

    it('should reject emoji', () => {
      expect(tipoDoErro(schema.validate('😇'))).to.equal('string.emoji')
    })
  })

  describe('email', () => {
    const schema = email()

    it('should accept a valid email', () => {
      expect(tipoDoErro(schema.validate('qa@teste.com'))).to.equal(undefined)
    })

    it('should reject emoji even when the format is valid', () => {
      expect(tipoDoErro(schema.validate('😅qa@teste.com'))).to.equal('string.emoji')
    })

    it('should keep reporting an invalid format', () => {
      expect(tipoDoErro(schema.validate('a'))).to.equal('string.email')
    })
  })
})
