/* eslint no-template-curly-in-string: 0 */
const { env } = process

// https://github.com/conventional-changelog/conventional-changelog/blob/master/packages/conventional-changelog-angular/writer-opts.js
const transformCommitType = type => {
  const commitTypeMapping = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance Improvements',
    revert: 'Reverts',
    docs: 'Documentation',
    style: 'Styles',
    refactor: 'Code Refactoring',
    test: 'Tests',
    build: 'Build System',
    ci: 'Continuous Integration',
    chore: 'Chores',
    default: 'Miscellaneous'
  }
  return commitTypeMapping[type] || commitTypeMapping.default
}

const customTransform = (commit, context) => {
  const issues = []

  commit.notes.forEach(note => {
    note.title = 'BREAKING CHANGES'
  })

  commit.type = transformCommitType(commit.type)

  if (commit.scope === '*') {
    commit.scope = ''
  }

  if (typeof commit.hash === 'string') {
    commit.shortHash = commit.hash.substring(0, 7)
  }

  if (typeof commit.subject === 'string') {
    let url = context.repository
      ? `${context.host}/${context.owner}/${context.repository}`
      : context.repoUrl
    if (url) {
      url = `${url}/issues/`
      // Issue URLs.
      commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
        issues.push(issue)
        return `[#${issue}](${url}${issue})`
      })
    }
    if (context.host) {
      // User URLs.
      commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
        if (username.includes('/')) {
          return `@${username}`
        }
        return `[@${username}](${context.host}/${username})`
      })
    }
  }

  // remove references that already appear in the subject
  commit.references = commit.references.filter(reference => {
    if (issues.indexOf(reference.issue) === -1) {
      return true
    }
    return false
  })

  return commit
}

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
        { type: 'docs', scope: 'readme', release: 'patch' },
        { type: 'docs', scope: 'serverest', release: 'patch' }
      ]
    }],
    ['@semantic-release/release-notes-generator', {
      writerOpts: {
        transform: customTransform
      }
    }],
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
    ['@semantic-release/exec', { prepareCmd: `docker build -t ${env.DOCKER_USERNAME}/serverest .` }],
    ['semantic-release-docker', {
      name: `${env.DOCKER_USERNAME}/serverest`
    }]
  ]
}
