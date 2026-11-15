module.exports = {
  require: 'test/integration/utils/global.js',
  spec: ['test/integration/**/*.test.js'],
  color: true,
  exit: process.env.CI === 'true',
  // No E2E remoto um 429 é reenviado depois de uma janela inteira do rate limiter (30 s), até duas vezes
  // (test/integration/utils/limite-de-requisicoes.js); o timeout cobre as duas esperas, para a falha que
  // sobrar aparecer como 429 e não como timeout.
  timeout: ['e2e-staging', 'e2e-production'].includes(process.env.TEST_TYPE) ? 100000 : 30000
}
