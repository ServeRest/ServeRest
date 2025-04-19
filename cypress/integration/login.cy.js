/* global cy */

describe('Testes de Login na ServeRest', () => {
  const baseUrl = 'https://front.serverest.dev/login'

  // Cenário 1: Login válido
  it('Deve logar com sucesso', () => {
    cy.visit(baseUrl) // Navegar para a página de login
    cy.get('input[name=email]').type('fulano@qa.com') // Digitar email válido
    cy.get('input[name=password]').type('teste') // Digitar senha válida
    cy.get('button[type=submit]').click() // Clicar no botão de login

    // Validar redirecionamento para a URL esperada
    cy.url().should('include', '/admin/home') // Verifica se a URL contém '/admin/home'
  })

  // Cenário 2: Login com e-mail não registrado
  it('Exibe erro para email não registrado', () => {
    cy.visit(baseUrl)
    cy.get('input[name=email]').type('naoexiste@qa.com')
    cy.get('input[name=password]').type('teste')
    cy.get('button[type=submit]').click()
    cy.contains('Email e/ou senha inválidos').should('be.visible') // Validação
  })

  // Cenário 3: Login com e-mail válido e senha inválida
  it('Exibe erro para senha inválida', () => {
    cy.visit(baseUrl)
    cy.get('input[name=email]').type('fulano@qa.com')
    cy.get('input[name=password]').type('senhaerrada')
    cy.get('button[type=submit]').click()
    cy.contains('Email e/ou senha inválidos').should('be.visible') // Validação
  })

  // Cenário 4: Login com todos os campos em branco
  it('Exibe erro para campos em branco', () => {
    cy.visit(baseUrl) // Navegar para a página de login
    cy.get('button[type=submit]').click() // Clicar no botão de login sem preencher os campos

    // Validar mensagens de erro exibidas
    cy.get('.form > :nth-child(3)').should('contain', 'Email é obrigatório') // Mensagem correta para o email
    cy.get(':nth-child(4) > :nth-child(2)').should('contain', 'Password é obrigatório') // Mensagem correta para a senha
  })

  // Cenário 5: Login com senha em branco
  it('Exibe erro para senha em branco', () => {
    cy.visit(baseUrl) // Navegar para a página de login
    cy.get('input[name=email]').type('fulano@qa.com') // Digitar email válido
    cy.get('button[type=submit]').click() // Clicar no botão de login sem preencher a senha

    // Validar mensagem de erro exibida para senha em branco
    cy.get('.alert > :nth-child(2)').should('contain', 'Password é obrigatório') // Mensagem correta
  })

  // Cenário 6: Acessar página de cadastro pelo botão "Cadastre-se"
  it('Redireciona para página de cadastro', () => {
    cy.visit(baseUrl) // Navegar para a página de login

    // Clicar no botão "Cadastre-se" usando o data-testid correto
    cy.get('[data-testid="cadastrar"]').click()

    // Validar redirecionamento para a URL de cadastro
    cy.url().should('include', '/cadastrarusuarios')

    // Validar presença dos campos e elementos na página de cadastro
    cy.get('[data-testid="nome"]').should('exist') // Campo "Nome"
    cy.get('[data-testid="email"]').should('exist') // Campo "Email"
    cy.get('[data-testid="password"]').should('exist') // Campo "Senha"
    cy.get('.form-check-label').should('contain', 'Cadastrar como administrador?') // Texto de checkbox
    cy.get('[data-testid="cadastrar"]').should('exist') // Botão "Cadastrar"
  })
})
