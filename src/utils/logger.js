const tracer = require('dd-trace')
const formats = require('dd-trace/ext/formats')

function log ({ level = 'alert', message }) {
  const span = tracer.scope().active()
  const time = new Date().toISOString()
  const record = { time, level, message }
  /* istanbul ignore next */
  if (span) {
    tracer.inject(span.context(), formats.LOG, record)
  }
  console.log(record)
}

module.exports = { log }
