'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const customCss = readFileSync(join(__dirname, 'custom-css.css'), 'utf8')
const customJsTemplate = readFileSync(join(__dirname, 'custom-js.js'), 'utf8')

function buildCustomJsStr (releaseInfo, currentVersion, forceBanner) {
  const replacements = {
    __RELEASE_INFO__: JSON.stringify(releaseInfo),
    __CURRENT_VERSION__: JSON.stringify(currentVersion),
    __FORCE_BANNER__: JSON.stringify(forceBanner)
  }

  const customJsStr = Object.keys(replacements).reduce((output, key) => {
    return output.split(key).join(replacements[key])
  }, customJsTemplate)
  return customJsStr
}

module.exports = {
  buildCustomJsStr,
  customCss
}
