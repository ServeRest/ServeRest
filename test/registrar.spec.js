'use strict'

const { describe, it } = require('mocha')
const { expect } = require('chai')
const { emailAlreadyExist, emailIsValid, validarEmailESenha } = require('../src/routes/registrar')

describe('registrar.js', () => {
  describe('emailIsValid', () => {
    it('email completo .com.br', () => {
      expect(true).to.be.equal(emailIsValid('foo@bar.com.br'))
    })

    it('email completo .com', () => {
      expect(true).to.be.equal(emailIsValid('foo@bar.com'))
    })

    it('email com quantidade mínima de caracteres', () => {
      expect(true).to.be.equal(emailIsValid('a@b.c'))
    })

    it('email sem @ (arroba)', () => {
      expect(false).to.be.equal(emailIsValid('ab.c'))
    })

    it('email sem . (ponto)', () => {
      expect(false).to.be.equal(emailIsValid('a@bc'))
    })
  })

  describe('emailAlreadyExist', () => {
    it('email já existe', () => {
      expect(true).to.be.equal(emailAlreadyExist('paulo@email.com'))
    })

    it('email não existe', () => {
      expect(false).to.be.equal(emailAlreadyExist('foo@bar.com'))
    })
  })

  describe('validarEmailESenha', () => {
    it('email em branco', () => {
      const email = ''
      const password = 'foobar'
      expect('Email ou password em branco').to.be.equal(validarEmailESenha(email, password))
    })

    it('password em branco', () => {
      const email = 'foo@bar.com'
      const password = ''
      expect('Email ou password em branco').to.be.equal(validarEmailESenha(email, password))
    })

    it('email e password em branco', () => {
      const email = ''
      const password = ''
      expect('Email ou password em branco').to.be.equal(validarEmailESenha(email, password))
    })

    it('email inválido', () => {
      const email = 'foobar.com'
      const password = 'foo'
      expect('Email inválido').to.be.equal(validarEmailESenha(email, password))
    })

    it('email já cadastrado', () => {
      const email = 'paulo@email.com'
      const password = 'foo'
      expect('Email já cadastrado').to.be.equal(validarEmailESenha(email, password))
    })

    it('email não cadastrado', () => {
      const email = 'foo@email.com'
      const password = 'foo'
      expect(false).to.be.equal(validarEmailESenha(email, password))
    })
  })
})
