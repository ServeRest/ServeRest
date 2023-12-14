const tracer = require('dd-trace')
const formats = require('dd-trace/ext/formats')
const { aplicacaoExecutandoLocalmente } = require('./ambiente')

function log ({ level = 'alert', message }) {
  const time = new Date().toISOString()
  const record = { time, level, message }
  console.log(record)
  /* istanbul ignore next */
  if (!aplicacaoExecutandoLocalmente()) {
    const span = tracer.scope().active()
    if (span) {
      tracer.inject(span.context(), formats.LOG, record)
    }
  }
}

module.exports = { log }
