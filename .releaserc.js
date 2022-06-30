
module.exports = {
  branches: [
    // https://github.com/semantic-release/semantic-release/blob/master/docs/usage/workflow-configuration.md#workflow-configuration
    { name: 'trunk', channel: 'latest' },
    { name: 'beta', channel: 'beta', prerelease: 'beta' }
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      releaseRules: [
        { scope: 'no-release', release: false },
        { scope: 'patch', release: 'patch' },
        { type: 'docs', scope: 'serverest', release: 'patch' }
      ]
    }],
    ['@semantic-release/release-notes-generator'],
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
      assets: 'dist/*.tgz',
      releasedLabels: [
        'released on @${nextRelease.channel}',
        'released on ${nextRelease.gitTag}'
      ]
    }],
    ['@semantic-release/exec', {
      prepareCmd: 'make build'
    }],
    ['semantic-release-docker', {
      name: 'paulogoncalvesbh/serverest'
    }]
  ]
}
