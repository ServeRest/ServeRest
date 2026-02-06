module.exports = {
  require: 'test/integration/utils/global.js',
  spec: ['test/integration/**/*.test.js'],
  color: true,
  exit: process.env.CI === 'true',
  timeout: 30000
}
