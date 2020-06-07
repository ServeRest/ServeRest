/* eslint no-template-curly-in-string: 0 */

module.exports = {
  plugins: [
    ['@semantic-release/commit-analyzer', {
      releaseRules: [
        { type: 'docs', scope: 'readme', release: 'patch' },
        { type: 'docs', scope: 'api-doc', release: 'patch' },
        { subject: 'no-release', release: false }
      ],
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES']
      }
    }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', {
      changelogTitle: 'Changelog'
    }],
    ['@semantic-release/npm', {
      tarballDir: 'dist'
    }],
    ['@semantic-release/git', {
      message: 'chore(release): ${nextRelease.version}'
    }],
    ['@semantic-release/github', {
      assets: 'dist/*.tgz'
    }]
  ]
}
