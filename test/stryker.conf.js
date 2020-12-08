/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutate: [
    'src/**/*.js',
    '!src/server.js',
    '!src/monitor.js',
    '!src/utils/ambiente.js'
  ],
  thresholds: {
    high: 90,
    low: 80,
    break: 75
  },
  reporters: ['html', 'dashboard', 'clear-text', 'progress'],
  testRunner: 'command',
  commandRunner: {
    command: 'mocha --config test/.mocharc.js'
  }
}
