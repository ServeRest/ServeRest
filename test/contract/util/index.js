const dateOneMonthAgo = () => {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toISOString()
}

const currentGitHash = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString()
  .trim()

const currentGitBranch = require('child_process')
  .execSync('git branch --show-current')
  .toString()
  .trim()

const isDefaultBranch = currentGitBranch === 'trunk'

module.exports = {
  dateOneMonthAgo,
  currentGitBranch,
  currentGitHash,
  isDefaultBranch
}
