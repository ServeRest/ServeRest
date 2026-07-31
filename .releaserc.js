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

// O conventional-changelog-writer entrega o commit dentro de um Proxy imutável e espera
// de volta apenas um patch, que ele mescla com o commit original. Por isso nada aqui é
// alterado no objeto recebido: tudo é derivado em cópias novas.
const customTransform = (commit, context) => {
  const issues = []

  let subject = commit.subject

  if (typeof subject === 'string') {
    let url = context.repository
      ? `${context.host}/${context.owner}/${context.repository}`
      : context.repoUrl
    if (url) {
      url = `${url}/issues/`
      // Issue URLs.
      subject = subject.replace(/#([0-9]+)/g, (_, issue) => {
        issues.push(issue)
        return `[#${issue}](${url}${issue})`
      })
    }
    if (context.host) {
      // User URLs.
      subject = subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
        if (username.includes('/')) {
          return `@${username}`
        }
        return `[@${username}](${context.host}/${username})`
      })
    }
  }

  return {
    notes: commit.notes.map(note => ({ ...note, title: 'BREAKING CHANGES' })),
    type: transformCommitType(commit.type),
    scope: commit.scope === '*' ? '' : commit.scope,
    shortHash: typeof commit.hash === 'string' ? commit.hash.substring(0, 7) : commit.shortHash,
    subject,
    // remove references that already appear in the subject
    references: commit.references
      .filter(reference => issues.indexOf(reference.issue) === -1)
      .map(reference => ({ ...reference }))
  }
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
        { type: 'docs', scope: 'homepage', release: 'patch' }
      ]
    }],
    ['@semantic-release/release-notes-generator', {
      writerOpts: {
        transform: customTransform
      }
    }],
    ['@semantic-release/changelog', {
      changelogTitle: '# Changelog',
      changelogFile: ".github/CHANGELOG.md"
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
    ['@codedependant/semantic-release-docker', {
      dockerProject: null,
      dockerImage: 'paulogoncalvesbh/serverest',
      dockerTags: [
        "{{#if prerelease.[0]}}{{prerelease.[0]}}{{else}}latest{{/if}}",
        "{{major}}-{{#if prerelease.[0]}}{{prerelease.[0]}}{{else}}latest{{/if}}",
        "{{major}}.{{minor}}-{{#if prerelease.[0]}}{{prerelease.[0]}}{{else}}latest{{/if}}",
        "{{version}}"
      ]
    }]
  ]
}
