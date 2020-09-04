/**
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
module.exports = {
  mutate: [
    'src/**/*.js',
    '!src/server.js'
  ],
  thresholds: {
    high: 90,
    low: 80,
    break: 75
  },
  packageManager: 'npm',
  reporters: ['html', 'dashboard', 'clear-text', 'progress'],
  timeoutMS: 8000,
  testRunner: 'command',
  commandRunner: {
    command: 'cross-env NODE_ENV=serverest-test mocha --config test/.mocharc.js'
  },
  mochaOptions: {
    config: './test/.mocharc.js'
  }
}
