/* Painel "Fluxo da requisição": desenha o header X-ServeRest-Stages abaixo da resposta do "Try it out" */
// O ponto e vírgula inicial é obrigatório: os scripts desta pasta são concatenados e, sem ele, o
// navegador interpreta este bloco como uma chamada do resultado do script anterior.
;(function () {
  const texts = __FLOW_PANEL_TEXTS__
  const stagesHeader = 'x-serverest-stages'
  const slowMotionKey = 'serverestFlowSlowMotion'

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

    // Todo texto traduzível fica sozinho no seu nó: a tradução da página compara o nó inteiro.
    function label (key, className) {
      return h('span', { key, className }, text(key))
    }

    // Código desconhecido vai em <code>, que a tradução da página nunca altera.
    function codeOrLabel (key, raw, className) {
      return key ? label(key, className) : h('code', { key: 'raw-' + raw, className }, String(raw === undefined ? '' : raw))
    }

    function statusClass (item) {
      return 'serverest-flow-st-' + (item.statusKey ? item.st : 'unknown')
    }

    function textBlock (titleKey, bodyKey, className) {
      return h('div', { key: titleKey, className: 'serverest-flow-block ' + className },
        h('strong', { className: 'serverest-flow-block-title' }, text(titleKey)),
        h('p', { className: 'serverest-flow-block-text' }, text(bodyKey))
      )
    }

    function RuleRow (props) {
      const rule = props.rule
      return h('li', { className: 'serverest-flow-rule ' + statusClass(rule) },
        codeOrLabel(rule.statusKey, rule.st, 'serverest-flow-status'),
        codeOrLabel(rule.labelKey, rule.code, 'serverest-flow-name'),
        rule.item !== undefined
          ? h('span', { className: 'serverest-flow-item' },
            label('ui.flow.item_position', 'serverest-flow-item-label'),
            h('span', { className: 'serverest-flow-item-value' }, String(rule.item)))
          : null
      )
    }

    function StageRow (props) {
      const { stage, model, expanded, onToggle } = props
      const isFailed = model.failedStage === stage.name && stage.st === 'failed'
      const expandable = !!stage.descriptionKey || (isFailed && !!model.whyKey)
      const content = [
        codeOrLabel(stage.statusKey, stage.st, 'serverest-flow-status'),
        codeOrLabel(stage.labelKey, stage.name, 'serverest-flow-name'),
        stage.dur !== undefined ? h('span', { className: 'serverest-flow-dur' }, stage.dur.toFixed(2) + ' ms') : null
      ]
      const head = expandable
        ? h('button', { type: 'button', className: 'serverest-flow-row', 'aria-expanded': expanded ? 'true' : 'false', onClick: onToggle }, ...content)
        : h('div', { className: 'serverest-flow-row' }, ...content)
      const details = expandable && expanded
        ? h('div', { className: 'serverest-flow-details' },
          stage.descriptionKey ? textBlock('ui.flow.stage_description_title', stage.descriptionKey, 'serverest-flow-block-description') : null,
          isFailed && model.whyKey ? textBlock('ui.flow.why_title', model.whyKey, 'serverest-flow-block-why') : null,
          isFailed && model.howKey ? textBlock('ui.flow.how_title', model.howKey, 'serverest-flow-block-how') : null)
        : null
      const rules = stage.rules.length
        ? h('ol', { className: 'serverest-flow-rules' }, stage.rules.map(rule => h(RuleRow, { key: rule.name, rule })))
        : null
      return h('li', { className: 'serverest-flow-stage ' + statusClass(stage) + (isFailed ? ' serverest-flow-stage-failed' : '') }, head, details, rules)
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
      const executed = model.stages.filter(stage => stage.st !== 'not_run')
      const [revealed, setRevealed] = React.useState(animate ? 0 : executed.length)
      const [expanded, setExpanded] = React.useState(model.failedStage ? { [model.failedStage]: true } : {})
      const done = revealed >= executed.length

      React.useEffect(() => {
        if (done) return undefined
        if (!animate) {
          setRevealed(executed.length)
          return undefined
        }
        const timer = setTimeout(() => setRevealed(count => count + 1), stepDelay(executed[revealed]))
        return () => clearTimeout(timer)
      }, [revealed, animate, done])

      const visible = model.stages.filter(stage => {
        if (stage.st === 'not_run') return done
        return executed.indexOf(stage) <= revealed
      })
      const active = done ? null : executed[revealed]
      const listed = visible.filter(stage => stage !== active)

      const segments = visible.map(stage => h('span', {
        key: stage.name,
        className: 'serverest-flow-segment ' + statusClass(stage) + (stage === active ? ' serverest-flow-active' : ''),
        style: { flexGrow: stage.width }
      }, codeOrLabel(stage.labelKey, stage.name, 'serverest-flow-segment-label')))
      if (done) {
        segments.push(h('span', { key: 'response', className: 'serverest-flow-segment serverest-flow-segment-response' },
          label('ui.response', 'serverest-flow-segment-label'),
          model.statusCode !== null ? h('span', { className: 'serverest-flow-segment-code' }, String(model.statusCode)) : null))
      }

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
        h('div', { className: 'serverest-flow-bar' }, segments),
        done && model.summary === 'outside'
          ? h('p', { className: 'serverest-flow-outside' },
            label(model.whyKey, 'serverest-flow-outside-why'),
            label(model.howKey, 'serverest-flow-outside-how'))
          : null,
        h('ol', { className: 'serverest-flow-stages' }, listed.map(stage => h(StageRow, {
          key: stage.name,
          stage,
          model,
          expanded: !!expanded[stage.name],
          onToggle: () => setExpanded(current => Object.assign({}, current, { [stage.name]: !current[stage.name] }))
        })))
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
