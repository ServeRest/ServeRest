/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutate: [
    'src/**/*.js',
    '!src/server.js',
    '!src/utils/logger.js',
    '!src/utils/ambiente.js'
  ],
  thresholds: {
    high: 90,
    low: 60
  },
  reporters: ['html', 'dashboard', 'clear-text', 'progress'],
  testRunner: 'command',
  commandRunner: {
    command: 'mocha --config test/integration/.mocharc.js'
  }
}
