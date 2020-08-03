/* eslint no-template-curly-in-string: 0 */

module.exports = {
  branches: [
    // https://github.com/semantic-release/semantic-release/blob/master/docs/usage/workflow-configuration.md#workflow-configuration
    {name: 'trunk', channel: 'latest'},
    {name: 'beta', channel: 'beta', prerelease: 'beta'}
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      releaseRules: [
        { type: 'docs', scope: 'readme', release: 'patch' },
        { scope: 'no-release', release: false }
      ]
    }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', {
      changelogTitle: '# Changelog'
    }],
    ['@semantic-release/npm', {
      tarballDir: 'dist'
    }],
    ['@semantic-release/git', {
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\nRelease automatically generated through continuous delivery.'
    }],
    ['@semantic-release/github', {
      assets: 'dist/*.tgz'
    }]
  ]
}
