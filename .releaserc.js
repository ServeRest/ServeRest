/* eslint no-template-curly-in-string: 0 */

module.exports = {
  branches: [
    // https://github.com/semantic-release/semantic-release/blob/master/docs/usage/workflow-configuration.md#workflow-configuration
    { name: 'trunk', channel: 'latest' },
    { name: 'beta', channel: 'beta', prerelease: 'beta' }
  ],
  plugins: [
    ['@semantic-release/exec', {
      prepareCmd: 'docker build -t eliasreis54/ServeRest .'
    }],
    ['semantic-release-docker', {
      name: 'eliasreis54/ServeRest'
    }]
  ]
}
