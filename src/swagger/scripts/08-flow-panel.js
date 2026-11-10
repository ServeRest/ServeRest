/* Painel "Fluxo da requisição": desenha o header X-ServeRest-Stages abaixo da resposta do "Try it out" */
// O ponto e vírgula inicial é obrigatório: os scripts desta pasta são concatenados e, sem ele, o
// navegador interpreta este bloco como uma chamada do resultado do script anterior.
;(function () {
  const texts = __FLOW_PANEL_TEXTS__
  const stagesHeader = 'x-serverest-stages'
  const slowMotionKey = 'serverestFlowSlowMotion'

  // Com tempos reais uma etapa lenta ocuparia quase toda a barra e esconderia as demais. A raiz
  // quadrada mantém a etapa mais lenta como a mais larga, mas suaviza a diferença; etapas sem
  // duração recebem a largura de uma etapa rápida típica (0,2 ms).
  function segmentGrow (stage) {
    return Math.sqrt(typeof stage.dur === 'number' && stage.dur > 0 ? stage.dur : 0.2)
  }

  // Em pt-BR e es o separador decimal é a vírgula; a página guarda o idioma na URL e no localStorage.
  function formatDuration (dur) {
    let language = ''
    try {
      language = new URL(window.location.href).searchParams.get('lang') || window.localStorage.getItem('swaggerLanguage') || ''
    } catch (_) {}
    const text = dur.toFixed(2)
    return language === 'en' ? text : text.replace('.', ',')
  }

  function knownKey (key) {
    return Object.prototype.hasOwnProperty.call(texts, key) ? key : null
  }

  function text (key) {
    return knownKey(key) ? texts[key] : ''
  }

  function parseEntry (piece) {
    const [name, ...params] = piece.split(';').map(part => part.trim())
    const entry = {}
    params.filter(Boolean).forEach(param => {
      const separator = param.indexOf('=')
      const key = separator === -1 ? param : param.slice(0, separator)
      entry[key] = separator === -1 ? '' : param.slice(separator + 1)
    })
    entry.name = name
    if (entry.dur !== undefined) {
      const dur = Number(entry.dur)
      entry.dur = entry.dur === '' || Number.isNaN(dur) ? undefined : dur
    }
    return entry
  }

  function parseStages (headerValue) {
    if (typeof headerValue !== 'string') return []
    return headerValue.split(',')
      .map(piece => piece.trim())
      .filter(Boolean)
      .map(parseEntry)
      .filter(entry => entry.name)
  }

  function extraParams (entry) {
    return Object.keys(entry)
      .filter(key => !['name', 'st', 'dur'].includes(key))
      .reduce((params, key) => Object.assign(params, { [key]: entry[key] }), {})
  }

  function buildStage (entry) {
    return {
      name: entry.name,
      st: entry.st,
      dur: entry.dur,
      params: extraParams(entry),
      labelKey: knownKey('ui.flow.stage_label.' + entry.name),
      descriptionKey: knownKey('ui.flow.stage_description.' + entry.name),
      statusKey: knownKey('ui.flow.status.' + entry.st),
      width: 0,
      rules: []
    }
  }

  function buildRule (entry, code) {
    return {
      name: entry.name,
      code,
      st: entry.st,
      item: entry.item,
      params: extraParams(entry),
      labelKey: knownKey('ui.flow.rule_label.' + code),
      statusKey: knownKey('ui.flow.status.' + entry.st)
    }
  }

  function failureKeys (stage, rule, status) {
    // 408 marca como failed a etapa em execução no timeout, e 500 ou mais é erro inesperado: a etapa não explica a falha.
    if (status === 408) return { whyKey: 'ui.flow.why.status.timeout', howKey: 'ui.flow.how.status.timeout' }
    if (status >= 500) return { whyKey: 'ui.flow.why.status.unexpected_error', howKey: 'ui.flow.how.status.unexpected_error' }
    if (rule) {
      const why = knownKey('ui.flow.why.rule.' + rule.code)
      const how = knownKey('ui.flow.how.rule.' + rule.code)
      if (why && how) return { whyKey: why, howKey: how }
    }
    if (stage.name === 'auth' && stage.params.reason) {
      const why = knownKey('ui.flow.why.auth.' + stage.params.reason)
      const how = knownKey('ui.flow.how.auth.' + stage.params.reason)
      if (why && how) return { whyKey: why, howKey: how }
    }
    return {
      whyKey: knownKey('ui.flow.why.stage.' + stage.name),
      howKey: knownKey('ui.flow.how.stage.' + stage.name)
    }
  }

  function buildFlowModel (entries, statusCode) {
    if (!Array.isArray(entries) || entries.length === 0) return null
    const stages = []
    entries.forEach(entry => {
      const separator = entry.name.indexOf('.')
      const owner = separator > 0 ? entry.name.slice(0, separator) : null
      const parent = owner ? stages.filter(stage => stage.name === owner).pop() : null
      if (parent) {
        parent.rules.push(buildRule(entry, entry.name.slice(separator + 1)))
      } else {
        stages.push(buildStage(entry))
      }
    })
    const totalDur = stages.reduce((total, stage) => total + (stage.dur || 0), 0)
    stages.forEach(stage => {
      stage.width = totalDur > 0 ? (stage.dur || 0) / totalDur : 0
    })
    const status = Number(statusCode)
    const failedStage = stages.find(stage => stage.st === 'failed') || null
    const failedRule = failedStage ? failedStage.rules.find(rule => rule.st === 'failed') || null : null
    let summary = 'completed'
    let keys = { whyKey: null, howKey: null }
    if (failedStage) {
      summary = 'stopped'
      keys = failureKeys(failedStage, failedRule, status)
    } else if (status >= 400) {
      summary = 'outside'
      keys = { whyKey: 'ui.flow.why.outside', howKey: 'ui.flow.how.outside' }
    }
    return {
      statusCode: Number.isNaN(status) ? null : status,
      summary,
      failedStage: failedStage ? failedStage.name : null,
      failedRule: failedRule ? failedRule.code : null,
      whyKey: keys.whyKey,
      howKey: keys.howKey,
      stages
    }
  }

  function stepDelay (stage) {
    if (stage.dur === undefined) return 420
    return Math.min(1700, Math.max(420, stage.dur * 480))
  }

  function prefersReducedMotion () {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    } catch (e) {
      return false
    }
  }

  function readSlowMotion () {
    try {
      return window.localStorage.getItem(slowMotionKey) !== 'false'
    } catch (e) {
      return true
    }
  }

  function saveSlowMotion (enabled) {
    try {
      window.localStorage.setItem(slowMotionKey, enabled ? 'true' : 'false')
    } catch (e) {}
  }

  function readResponse (response) {
    try {
      const headers = response && response.get('headers')
      const map = headers && headers.toJS ? headers.toJS() : {}
      const name = Object.keys(map).find(key => key.toLowerCase() === stagesHeader)
      if (!name || map[name] === undefined || map[name] === null) return null
      return { header: String(map[name]), status: response.get('status') }
    } catch (e) {
      return null
    }
  }

  function createComponents (React) {
    const h = React.createElement

    class FlowBoundary extends React.Component {
      constructor (props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError () {
        return { failed: true }
      }

      componentDidCatch () {}

      render () {
        return this.state.failed ? null : this.props.children
      }
    }

    const responseDelay = 300

    // Todo texto traduzível fica sozinho no seu nó: a tradução da página compara o nó inteiro.
    function label (key, className) {
      return h('span', { key, className }, text(key))
    }

    // Código desconhecido vai em <code>, que a tradução da página nunca altera.
    function codeOrLabel (key, raw, className) {
      return key ? label(key, className) : h('code', { key: 'raw-' + raw, className }, String(raw === undefined ? '' : raw))
    }

    // Marcas e textos que mudam com o estado levam o estado na key: o React troca o nó em vez de editá-lo.
    function mark (state, symbol) {
      return h('span', { key: 'mark-' + state, className: 'serverest-flow-mark', 'aria-hidden': 'true' }, symbol)
    }

    function spinner () {
      return h('span', { key: 'mark-running', className: 'serverest-flow-mark serverest-flow-spinner', 'aria-hidden': 'true' })
    }

    function srStatus (item, state) {
      return h('span', { key: 'sr-' + state, className: 'serverest-flow-sr-only' }, codeOrLabel(item.statusKey, item.st))
    }

    function textBlock (titleKey, bodyKey, className) {
      return h('div', { key: titleKey, className: 'serverest-flow-block ' + className },
        h('strong', { className: 'serverest-flow-block-title' }, text(titleKey)),
        h('p', { className: 'serverest-flow-block-text' }, text(bodyKey))
      )
    }

    function ran (stage) {
      return stage.st === 'ok' || stage.st === 'failed'
    }

    function finalState (stage) {
      if (stage.st === 'ok') return 'ok'
      if (stage.st === 'failed') return 'fail'
      if (stage.st === 'skipped') return 'skip'
      return 'not_run'
    }

    function nextActive (stages, from) {
      let index = from
      while (index < stages.length && !ran(stages[index])) index++
      return index
    }

    function stateAt (stages, index, active) {
      if (index > active) return 'pending'
      if (index === active) return 'running'
      return index < stages.length ? finalState(stages[index]) : 'done'
    }

    function delayAt (stages, index) {
      return index < stages.length ? stepDelay(stages[index]) : responseDelay
    }

    function fill (state, delay) {
      if (state === 'running') {
        return h('span', { key: 'fill-running', className: 'serverest-flow-fill serverest-flow-fill-running', style: { animationDuration: delay + 'ms' } })
      }
      if (state === 'ok' || state === 'fail' || state === 'done') {
        return h('span', { key: 'fill-full', className: 'serverest-flow-fill serverest-flow-fill-full' })
      }
      return null
    }

    function segment (stage, state, delay) {
      const skipped = state === 'skip' || state === 'not_run'
      return h('span', {
        key: stage.name,
        className: 'serverest-flow-seg' + (stage.st === 'failed' ? ' serverest-flow-seg-fail' : '') + (skipped ? ' serverest-flow-seg-skip' : ''),
        style: { flexGrow: segmentGrow(stage) }
      }, fill(state, delay))
    }

    function rightColumn (stage, state) {
      if (state === 'pending') return label('ui.flow.pending', 'serverest-flow-right')
      if (state === 'running') return label('ui.flow.running', 'serverest-flow-right')
      if (state === 'skip' || state === 'not_run') {
        // O status já é lido pelo elemento oculto; aqui ele é só visual.
        return h('span', { key: 'right-' + state, className: 'serverest-flow-right', 'aria-hidden': 'true' }, codeOrLabel(stage.statusKey, stage.st))
      }
      if (stage.dur === undefined) return h('span', { key: 'dur-none', className: 'serverest-flow-right' })
      return h('span', { key: 'dur-' + stage.dur, className: 'serverest-flow-right serverest-flow-dur' }, formatDuration(stage.dur) + ' ms')
    }

    function stageMark (state) {
      if (state === 'running') return spinner()
      if (state === 'ok') return mark(state, '✓')
      if (state === 'fail') return mark(state, '✗')
      return mark(state, '○')
    }

    function RuleRow (props) {
      const rule = props.rule
      const state = rule.st === 'ok' ? 'ok' : rule.st === 'failed' ? 'fail' : 'skip'
      return h('li', { className: 'serverest-flow-rule serverest-flow-rule-' + state },
        stageMark(state),
        srStatus(rule, state),
        h('span', { key: 'body', className: 'serverest-flow-rule-body' },
          codeOrLabel(rule.labelKey, rule.code, 'serverest-flow-rule-name'),
          rule.item !== undefined
            ? h('span', { key: 'item', className: 'serverest-flow-item' },
              label('ui.flow.item_position', 'serverest-flow-item-label'),
              h('span', { className: 'serverest-flow-item-value' }, String(rule.item)))
            : null)
      )
    }

    function StageRow (props) {
      const { stage, model, state, expanded, onToggle } = props
      const isFailed = model.failedStage === stage.name && stage.st === 'failed'
      const expandable = !!stage.descriptionKey || stage.rules.length > 0 || (isFailed && !!model.whyKey)
      const finished = state !== 'pending' && state !== 'running'
      const content = [
        stageMark(state),
        finished ? srStatus(stage, state) : null,
        codeOrLabel(stage.labelKey, stage.name, 'serverest-flow-name'),
        rightColumn(stage, state),
        expandable ? h('span', { key: 'caret', className: 'serverest-flow-caret', 'aria-hidden': 'true' }, '▶') : null
      ]
      const head = expandable
        ? h('button', { type: 'button', className: 'serverest-flow-row', 'aria-expanded': expanded ? 'true' : 'false', onClick: onToggle }, content)
        : h('div', { className: 'serverest-flow-row' }, content)
      const details = expandable && expanded
        ? h('div', { className: 'serverest-flow-details' },
          stage.descriptionKey ? h('p', { key: 'description', className: 'serverest-flow-description' }, text(stage.descriptionKey)) : null,
          stage.rules.length ? h('ul', { key: 'rules', className: 'serverest-flow-rules' }, stage.rules.map(rule => h(RuleRow, { key: rule.name, rule }))) : null,
          isFailed && model.whyKey ? textBlock('ui.flow.why_title', model.whyKey, 'serverest-flow-why') : null,
          isFailed && model.howKey ? textBlock('ui.flow.how_title', model.howKey, 'serverest-flow-how') : null)
        : null
      return h('li', { className: 'serverest-flow-stage serverest-flow-' + state }, head, details)
    }

    function ResponseRow (props) {
      const { statusCode, state } = props
      let right = label('ui.flow.pending', 'serverest-flow-right')
      if (state === 'running') right = label('ui.flow.running', 'serverest-flow-right')
      if (state === 'done') {
        right = statusCode !== null
          ? h('span', { key: 'code-' + statusCode, className: 'serverest-flow-right serverest-flow-dur' }, String(statusCode))
          : h('span', { key: 'code-none', className: 'serverest-flow-right' })
      }
      return h('li', { className: 'serverest-flow-stage serverest-flow-response serverest-flow-' + state },
        h('div', { className: 'serverest-flow-row' },
          state === 'running' ? spinner() : mark(state, state === 'done' ? '→' : '○'),
          label('ui.response', 'serverest-flow-name'),
          right))
    }

    function Summary (props) {
      const model = props.model
      if (model.summary === 'stopped') {
        const stage = model.stages.find(item => item.name === model.failedStage)
        return h('p', { key: 'stopped-' + stage.name, className: 'serverest-flow-summary' },
          label('ui.flow.stopped_at', 'serverest-flow-summary-label'),
          codeOrLabel(stage.labelKey, stage.name, 'serverest-flow-summary-stage'))
      }
      const key = model.summary === 'outside' ? 'ui.flow.outside' : 'ui.flow.completed'
      return h('p', { key, className: 'serverest-flow-summary' }, label(key, 'serverest-flow-summary-label'))
    }

    function FlowPanel (props) {
      const { model, animate, showControls, slowMotion, onToggleSlowMotion, onReplay } = props
      const stages = model.stages
      const end = stages.length + 1
      const [active, setActive] = React.useState(animate ? nextActive(stages, 0) : end)
      const [expanded, setExpanded] = React.useState(model.failedStage && !animate ? { [model.failedStage]: true } : {})
      const done = active >= end

      React.useEffect(() => {
        if (done) return undefined
        if (!animate) {
          setActive(end)
          return undefined
        }
        const timer = setTimeout(() => setActive(nextActive(stages, active + 1)), delayAt(stages, active))
        return () => clearTimeout(timer)
      }, [active, animate, done])

      React.useEffect(() => {
        const failed = model.failedStage
        if (done && failed) setExpanded(current => current[failed] ? current : Object.assign({}, current, { [failed]: true }))
      }, [done])

      const responseState = stateAt(stages, stages.length, active)
      const segments = stages.map((stage, index) => segment(stage, stateAt(stages, index, active), delayAt(stages, index)))
      segments.push(h('span', { key: 'response', className: 'serverest-flow-seg serverest-flow-seg-response' }, fill(responseState, responseDelay)))

      const controls = showControls
        ? h('div', { className: 'serverest-flow-controls' },
          h('label', { className: 'serverest-flow-slow-motion' },
            h('input', { type: 'checkbox', checked: slowMotion, onChange: onToggleSlowMotion }),
            label('ui.flow.slow_motion', 'serverest-flow-slow-motion-label')),
          h('button', { type: 'button', className: 'serverest-flow-replay', onClick: onReplay }, text('ui.flow.replay')))
        : null

      return h('section', { className: 'serverest-flow' },
        h('div', { className: 'serverest-flow-header' },
          h('h4', { className: 'serverest-flow-title' }, text('ui.flow.title')),
          done ? h(Summary, { key: 'summary-' + model.summary, model }) : null,
          controls),
        h('div', { className: 'serverest-flow-bar', 'aria-hidden': 'true' }, segments),
        done && model.summary === 'outside'
          ? h('p', { className: 'serverest-flow-outside' },
            label(model.whyKey, 'serverest-flow-outside-why'),
            label(model.howKey, 'serverest-flow-outside-how'))
          : null,
        h('ol', { className: 'serverest-flow-stages' },
          stages.map((stage, index) => h(StageRow, {
            key: stage.name,
            stage,
            model,
            state: stateAt(stages, index, active),
            expanded: !!expanded[stage.name],
            onToggle: () => setExpanded(current => Object.assign({}, current, { [stage.name]: !current[stage.name] }))
          })),
          h(ResponseRow, { key: 'response', statusCode: model.statusCode, state: responseState }))
      )
    }

    function FlowRoot (props) {
      const [run, setRun] = React.useState(0)
      const [slowMotion, setSlowMotion] = React.useState(readSlowMotion)
      const { header, status } = props
      const model = buildFlowModel(parseStages(header), status)
      if (!model) return null
      const reduced = prefersReducedMotion()
      return h(FlowPanel, {
        // Remontar a cada resposta ou repetição evita que o React edite um nó já traduzido.
        key: header + '|' + status + '|' + run,
        model,
        animate: slowMotion && !reduced,
        showControls: !reduced,
        slowMotion,
        onToggleSlowMotion: event => {
          const enabled = !!event.target.checked
          saveSlowMotion(enabled)
          setSlowMotion(enabled)
        },
        onReplay: () => setRun(count => count + 1)
      })
    }

    return { FlowBoundary, FlowRoot }
  }

  function serverestFlowPanelPlugin (system) {
    const React = system && system.React
    if (!React || !React.Component || !React.useState) return {}
    const { FlowBoundary, FlowRoot } = createComponents(React)
    const h = React.createElement
    return {
      wrapComponents: {
        liveResponse: Original => function ServerestLiveResponse (props) {
          const data = readResponse(props.response)
          const panel = data
            ? h(FlowBoundary, { key: data.header + '|' + data.status }, h(FlowRoot, { header: data.header, status: data.status }))
            : null
          return h(React.Fragment, null, h(Original, props), panel)
        }
      }
    }
  }

  serverestFlowPanelPlugin.parseStages = parseStages
  serverestFlowPanelPlugin.buildFlowModel = buildFlowModel
  window.serverestFlowPanelPlugin = serverestFlowPanelPlugin
})()
