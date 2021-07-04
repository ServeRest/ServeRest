const isCI = process.env.CI === 'true'

module.exports = {
  rootDir: '../../',
  verbose: false,
  bail: isCI,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
  coverageReporters: ['lcov', 'text-summary'],
  coverageDirectory: '<rootDir>/coverage/integration',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/integration/utils/global.js'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}
