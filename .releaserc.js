/* eslint no-template-curly-in-string: 0 */
const { env } = process

module.exports = {
  branches: [
    // https://github.com/semantic-release/semantic-release/blob/master/docs/usage/workflow-configuration.md#workflow-configuration
    { name: 'trunk', channel: 'latest' },
    { name: 'beta', channel: 'beta', prerelease: 'beta' }
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      releaseRules: [
        { type: 'docs', scope: 'readme', release: 'patch' },
        { scope: 'no-release', release: false }
      ]
    }],
    ['@semantic-release/exec', { prepareCmd: `docker build -t ${env.DOCKER_USERNAME}/serverest .` }],
    ['semantic-release-docker', {
      name: `${env.DOCKER_USERNAME}/serverest`
    }]
  ]
}
