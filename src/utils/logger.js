const { aplicacaoExecutandoLocalmente } = require('./ambiente')
/* istanbul ignore next */
const tracer = aplicacaoExecutandoLocalmente() ? null : require('dd-trace')
/* istanbul ignore next */
const formats = tracer ? require('dd-trace/ext/formats') : null

function log ({ level = 'alert', message }) {
  const time = new Date().toISOString()
  const record = { time, level, message }
  console.log(record)
  /* istanbul ignore next */
  if (tracer) {
    const span = tracer.scope().active()
    if (span) {
      tracer.inject(span.context(), formats.LOG, record)
    }
  }
}

module.exports = { log }
