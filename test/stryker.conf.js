/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutate: [
    'src/middlewares/rate-limiter.js'
  ],
  thresholds: {
    high: 90,
    low: 60
  },
  reporters: ['html', 'dashboard', 'clear-text', 'progress'],
  dashboard: {
    project: 'github.com/ServeRest/ServeRest',
    version: process.env.BRANCH,
    baseUrl: 'dashboard.stryker-mutator.io/reports',
    reportType: 'full',
    module: undefined
  },
  testRunner: 'command',
  commandRunner: {
    command: 'mocha --config test/integration/.mocharc.js'
  }
}
