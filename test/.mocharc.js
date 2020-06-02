module.exports = {
  reporter: 'list',
  require: 'test/utils/global.js',
  retries: 1,
  spec: ["test/**/*.test.js"],
  timeout: 2000
}
