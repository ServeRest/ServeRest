module.exports = {
  e2e: {
    setupNodeEvents (on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/integration/**/*.cy.{js,jsx,ts,tsx}', // Adiciona o caminho para os testes
    screenshotsFolder: 'cypress/screenshots', // Adiciona a pasta para screenshots
    video: true // Opcional: Habilita gravação de vídeos dos testes
  }
}
