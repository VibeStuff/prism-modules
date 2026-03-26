/* ═══════════════════════════════════════════════════════
   AI Dashboard — Frontend
═══════════════════════════════════════════════════════ */

const API = window.location.pathname.replace(/\/$/, '')

// ── Helpers ─────────────────────────────────────────────

function esc(s) {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function toast(msg, type = 'ok') {
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<span>${type === 'ok' ? '\u2713' : '\u2717'}</span> ${esc(msg)}`
  document.getElementById('toasts').append(el)
  setTimeout(() => el.remove(), 3200)
}

async function apiFetch(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

function timeAgo(dateStr) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ── State ───────────────────────────────────────────────

let activeCategory = null
const CHART_COLORS = ['#b8831a', '#4a6fa8', '#5a8a4a', '#a84040', '#8a5ab8', '#4a8a8a', '#b85a1a', '#1a8ab8']

// ── Data Loading ────────────────────────────────────────

async function loadMeta() {
  try {
    const meta = await apiFetch('GET', '/api/meta')
    document.getElementById('dispatch-title').textContent = meta.title || 'Dispatch'
    document.getElementById('dispatch-subtitle').textContent = meta.subtitle || ''
    document.title = (meta.title || 'Dispatch') + ' \u2014 Prism'
    if (meta.layoutCols) {
      document.documentElement.style.setProperty('--layout-cols', meta.layoutCols)
    }
  } catch (err) {
    console.error('Failed to load meta:', err)
  }
}

async function loadWidgets() {
  try {
    const widgets = await apiFetch('GET', '/api/widgets')
    renderWidgets(widgets)
  } catch (err) {
    console.error('Failed to load widgets:', err)
  }
}

async function loadNews() {
  try {
    const params = new URLSearchParams({ limit: '50' })
    if (activeCategory) params.set('category', activeCategory)
    const { items, total } = await apiFetch('GET', `/api/news?${params}`)
    renderNews(items)
    renderNewsFilters(items)
  } catch (err) {
    console.error('Failed to load news:', err)
  }
}

// ── Widget Rendering ────────────────────────────────────

function renderWidgets(widgets) {
  const grid = document.getElementById('widget-grid')
  if (!widgets.length) {
    grid.innerHTML = ''
    grid.style.display = 'none'
    return
  }
  grid.style.display = ''

  grid.innerHTML = widgets.map((w, i) => {
    const gridStyle = []
    if (w.colSpan > 1) gridStyle.push(`grid-column: span ${w.colSpan}`)
    if (w.rowSpan > 1) gridStyle.push(`grid-row: span ${w.rowSpan}`)
    gridStyle.push(`animation-delay:${i * 0.04}s`)

    // Per-widget custom styling
    const s = w.style || {}
    if (s.bgColor) gridStyle.push(`--w-bg: ${s.bgColor}`)
    if (s.bgGradient) gridStyle.push(`--w-bg: ${s.bgGradient}`)
    if (s.headerColor) gridStyle.push(`--w-header: ${s.headerColor}`)
    if (s.textColor) gridStyle.push(`--w-text: ${s.textColor}`)
    if (s.borderColor) gridStyle.push(`--w-border: ${s.borderColor}`)
    if (s.accentColor) gridStyle.push(`--w-accent: ${s.accentColor}`)
    if (s.opacity != null) gridStyle.push(`opacity: ${s.opacity}`)
    if (s.padding) gridStyle.push(`padding: ${s.padding}`)
    const hasCustom = s.bgColor || s.bgGradient || s.headerColor || s.textColor || s.borderColor || s.accentColor
    const cls = `widget-card${hasCustom ? ' widget-custom' : ''}`

    const icon = w.icon ? `<span class="widget-title-icon">${esc(w.icon)}</span>` : ''
    const titleHtml = `<div class="widget-title">${icon}${esc(w.title)}</div>`
    const inner = `${titleHtml}${renderWidgetContent(w)}`
    const body = w.link
      ? `<a href="${esc(w.link)}" target="_blank" rel="noopener" class="widget-link-wrap">${inner}</a>`
      : inner

    return `<div class="${cls}" style="${gridStyle.join(';')}">${body}</div>`
  }).join('')

  // Start any countdown timers
  startCountdowns()
}

function renderWidgetContent(w) {
  const c = w.content || {}
  switch (w.type) {
    case 'stat': return renderStatWidget(c)
    case 'list': return renderListWidget(c)
    case 'markdown': return renderMarkdownWidget(c)
    case 'html': return renderHtmlWidget(c)
    case 'chart': return renderChartWidget(c)
    case 'progress': return renderProgressWidget(c)
    case 'table': return renderTableWidget(c)
    case 'image': return renderImageWidget(c)
    case 'countdown': return renderCountdownWidget(c)
    case 'kv': return renderKvWidget(c)
    case 'embed': return renderEmbedWidget(c)
    default: return `<div class="widget-markdown"><p>Unknown widget type: ${esc(w.type)}</p></div>`
  }
}

function renderStatWidget(c) {
  const dir = c.changeDirection || 'neutral'
  const arrow = dir === 'up' ? '\u25B2' : dir === 'down' ? '\u25BC' : ''
  let html = `<div class="widget-stat-value">${c.icon ? `<span style="margin-right:6px">${esc(String(c.icon))}</span>` : ''}${esc(String(c.value ?? ''))}</div>`
  if (c.label) html += `<div class="widget-stat-label">${esc(c.label)}</div>`
  if (c.change) html += `<div class="widget-stat-change ${dir}">${arrow} ${esc(c.change)}</div>`
  return html
}

function renderListWidget(c) {
  const items = c.items || []
  if (!items.length) return '<div class="widget-list"><em style="color:var(--text-muted);font-size:0.8rem">No items</em></div>'
  return `<div class="widget-list">${items.map(item => {
    const icon = item.icon ? `<span class="widget-list-icon">${esc(item.icon)}</span>` : ''
    const text = item.link
      ? `<a href="${esc(item.link)}" target="_blank" rel="noopener">${esc(item.text)}</a>`
      : esc(item.text)
    return `<div class="widget-list-item">${icon}<span>${text}</span></div>`
  }).join('')}</div>`
}

function renderMarkdownWidget(c) {
  const raw = c.markdown || ''
  const html = typeof marked !== 'undefined' ? marked.parse(raw) : esc(raw)
  return `<div class="widget-markdown">${html}</div>`
}

function renderHtmlWidget(c) {
  const raw = c.html || ''
  const encoded = raw.replace(/"/g, '&quot;')
  return `<iframe class="widget-html-frame" sandbox="allow-scripts" srcdoc="${encoded}" loading="lazy"></iframe>`
}

function renderChartWidget(c) {
  const { chartType, labels, datasets } = c
  if (!labels || !datasets) return `<div class="widget-markdown"><p>Chart: missing data</p></div>`
  if (chartType === 'bar') return renderBarChart(labels, datasets)
  if (chartType === 'line') return renderLineChart(labels, datasets)
  if (chartType === 'pie' || chartType === 'doughnut') return renderPieChart(labels, datasets, chartType)
  return `<div class="widget-markdown"><p>Chart: ${esc(chartType || 'unknown')}</p></div>`
}

function renderBarChart(labels, datasets) {
  const allValues = datasets.flatMap(d => d.data || [])
  const maxVal = Math.max(...allValues, 1)

  let html = '<div class="widget-chart"><div class="chart-bar-group">'
  labels.forEach((label, i) => {
    html += '<div class="chart-bar-wrap">'
    datasets.forEach((ds, di) => {
      const val = (ds.data || [])[i] || 0
      const pct = Math.max(2, (val / maxVal) * 100)
      const color = ds.color || CHART_COLORS[di % CHART_COLORS.length]
      html += `<div class="chart-bar" style="height:${pct}%;background:${color}" title="${esc(ds.label || '')}: ${val}"></div>`
    })
    html += `<div class="chart-bar-label">${esc(label)}</div></div>`
  })
  html += '</div>'
  html += renderChartLegend(datasets)
  html += '</div>'
  return html
}

function renderLineChart(labels, datasets) {
  const W = 300, H = 140, PAD = 24
  const allValues = datasets.flatMap(d => d.data || [])
  const maxVal = Math.max(...allValues, 1)
  const minVal = Math.min(...allValues, 0)
  const range = maxVal - minVal || 1
  const stepX = (W - PAD * 2) / Math.max(labels.length - 1, 1)

  let svg = `<svg viewBox="0 0 ${W} ${H + 20}" class="chart-line-svg">`
  // Grid lines
  for (let i = 0; i <= 4; i++) {
    const y = PAD + ((H - PAD * 2) * i / 4)
    svg += `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="var(--border)" stroke-width="0.5"/>`
  }

  datasets.forEach((ds, di) => {
    const color = ds.color || CHART_COLORS[di % CHART_COLORS.length]
    const points = (ds.data || []).map((val, i) => {
      const x = PAD + i * stepX
      const y = H - PAD - ((val - minVal) / range) * (H - PAD * 2)
      return `${x},${y}`
    })
    // Area fill
    if (points.length > 1) {
      const first = PAD
      const last = PAD + (points.length - 1) * stepX
      svg += `<polygon points="${first},${H - PAD} ${points.join(' ')} ${last},${H - PAD}" fill="${color}" opacity="0.1"/>`
    }
    // Line
    svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    // Dots
    ;(ds.data || []).forEach((val, i) => {
      const x = PAD + i * stepX
      const y = H - PAD - ((val - minVal) / range) * (H - PAD * 2)
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="${color}"><title>${esc(ds.label || '')}: ${val}</title></circle>`
    })
  })

  // X-axis labels
  labels.forEach((label, i) => {
    const x = PAD + i * stepX
    svg += `<text x="${x}" y="${H + 10}" text-anchor="middle" fill="var(--text-muted)" font-size="8">${esc(label)}</text>`
  })

  svg += '</svg>'
  let html = `<div class="widget-chart">${svg}`
  html += renderChartLegend(datasets)
  html += '</div>'
  return html
}

function renderPieChart(labels, datasets, type) {
  const data = (datasets[0] && datasets[0].data) || []
  const colors = data.map((_, i) => (datasets[0].colors && datasets[0].colors[i]) || CHART_COLORS[i % CHART_COLORS.length])
  const total = data.reduce((a, b) => a + b, 0) || 1
  const R = 60, CX = 80, CY = 70
  const innerR = type === 'doughnut' ? R * 0.55 : 0

  let svg = `<svg viewBox="0 0 160 140" class="chart-pie-svg">`
  let startAngle = -Math.PI / 2

  data.forEach((val, i) => {
    const sliceAngle = (val / total) * 2 * Math.PI
    const endAngle = startAngle + sliceAngle
    const largeArc = sliceAngle > Math.PI ? 1 : 0

    const x1 = CX + R * Math.cos(startAngle)
    const y1 = CY + R * Math.sin(startAngle)
    const x2 = CX + R * Math.cos(endAngle)
    const y2 = CY + R * Math.sin(endAngle)

    if (innerR > 0) {
      const ix1 = CX + innerR * Math.cos(startAngle)
      const iy1 = CY + innerR * Math.sin(startAngle)
      const ix2 = CX + innerR * Math.cos(endAngle)
      const iy2 = CY + innerR * Math.sin(endAngle)
      svg += `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z" fill="${colors[i]}"><title>${esc(labels[i] || '')}: ${val} (${Math.round(val / total * 100)}%)</title></path>`
    } else {
      svg += `<path d="M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${colors[i]}"><title>${esc(labels[i] || '')}: ${val} (${Math.round(val / total * 100)}%)</title></path>`
    }

    startAngle = endAngle
  })

  svg += '</svg>'

  let html = `<div class="widget-chart widget-chart-pie">${svg}<div class="chart-pie-legend">`
  labels.forEach((label, i) => {
    const pct = Math.round((data[i] || 0) / total * 100)
    html += `<div class="chart-legend-item"><div class="chart-legend-dot" style="background:${colors[i]}"></div><span>${esc(label)}</span><span class="chart-pie-pct">${pct}%</span></div>`
  })
  html += '</div></div>'
  return html
}

function renderChartLegend(datasets) {
  if (datasets.length <= 1) return ''
  let html = '<div class="chart-legend">'
  datasets.forEach((ds, di) => {
    const color = ds.color || CHART_COLORS[di % CHART_COLORS.length]
    html += `<div class="chart-legend-item"><div class="chart-legend-dot" style="background:${color}"></div>${esc(ds.label || '')}</div>`
  })
  html += '</div>'
  return html
}

// ── New Widget Types ───────────────────────────────────

function renderProgressWidget(c) {
  const bars = c.bars || [{ value: c.value || 0, max: c.max || 100, label: c.label || '' }]
  return `<div class="widget-progress">${bars.map(bar => {
    const pct = Math.min(100, Math.max(0, (bar.value / (bar.max || 100)) * 100))
    const color = bar.color || 'var(--w-accent, var(--amber))'
    return `<div class="progress-item">
      ${bar.label ? `<div class="progress-label"><span>${esc(bar.label)}</span><span class="progress-pct">${Math.round(pct)}%</span></div>` : ''}
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`
  }).join('')}</div>`
}

function renderTableWidget(c) {
  const headers = c.headers || []
  const rows = c.rows || []
  const striped = c.striped !== false
  let html = `<div class="widget-table-wrap"><table class="widget-table${striped ? ' striped' : ''}">`
  if (headers.length) {
    html += '<thead><tr>' + headers.map(h => `<th>${esc(String(h))}</th>`).join('') + '</tr></thead>'
  }
  html += '<tbody>'
  rows.forEach(row => {
    const cells = Array.isArray(row) ? row : (row.cells || [])
    html += '<tr>' + cells.map(cell => `<td>${esc(String(cell))}</td>`).join('') + '</tr>'
  })
  html += '</tbody></table></div>'
  return html
}

function renderImageWidget(c) {
  const src = c.url || c.src || ''
  const alt = c.alt || ''
  const caption = c.caption || ''
  const fit = c.fit || 'cover'
  let html = `<div class="widget-image">`
  if (src) html += `<img src="${esc(src)}" alt="${esc(alt)}" style="object-fit:${esc(fit)}" loading="lazy" onerror="this.style.display='none'" />`
  if (caption) html += `<div class="widget-image-caption">${esc(caption)}</div>`
  html += '</div>'
  return html
}

function renderCountdownWidget(c) {
  const target = c.target || ''
  const label = c.label || ''
  const id = 'cd-' + Math.random().toString(36).slice(2, 8)
  return `<div class="widget-countdown" data-target="${esc(target)}" id="${id}">
    ${label ? `<div class="countdown-label">${esc(label)}</div>` : ''}
    <div class="countdown-display">
      <div class="countdown-unit"><span class="countdown-num" data-unit="days">--</span><span class="countdown-txt">days</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="countdown-num" data-unit="hours">--</span><span class="countdown-txt">hrs</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="countdown-num" data-unit="minutes">--</span><span class="countdown-txt">min</span></div>
      <div class="countdown-sep">:</div>
      <div class="countdown-unit"><span class="countdown-num" data-unit="seconds">--</span><span class="countdown-txt">sec</span></div>
    </div>
    ${c.expired ? `<div class="countdown-expired">${esc(c.expired)}</div>` : ''}
  </div>`
}

let countdownInterval = null
function startCountdowns() {
  if (countdownInterval) clearInterval(countdownInterval)
  function tick() {
    document.querySelectorAll('.widget-countdown').forEach(el => {
      const target = new Date(el.dataset.target).getTime()
      const now = Date.now()
      const diff = target - now
      if (diff <= 0) {
        el.querySelectorAll('.countdown-num').forEach(n => n.textContent = '0')
        const expired = el.querySelector('.countdown-expired')
        if (expired) expired.style.display = ''
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      el.querySelector('[data-unit="days"]').textContent = String(d)
      el.querySelector('[data-unit="hours"]').textContent = String(h).padStart(2, '0')
      el.querySelector('[data-unit="minutes"]').textContent = String(m).padStart(2, '0')
      el.querySelector('[data-unit="seconds"]').textContent = String(s).padStart(2, '0')
    })
  }
  tick()
  countdownInterval = setInterval(tick, 1000)
}

function renderKvWidget(c) {
  const pairs = c.pairs || []
  return `<div class="widget-kv">${pairs.map(p => {
    const val = p.link
      ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(String(p.value))}</a>`
      : esc(String(p.value))
    return `<div class="kv-row">
      <span class="kv-key">${p.icon ? `<span class="kv-icon">${esc(p.icon)}</span>` : ''}${esc(String(p.key))}</span>
      <span class="kv-value">${val}</span>
    </div>`
  }).join('')}</div>`
}

function renderEmbedWidget(c) {
  const src = c.url || ''
  const height = c.height || 200
  if (!src) return '<div class="widget-markdown"><p>Embed: no URL</p></div>'
  return `<iframe class="widget-embed-frame" src="${esc(src)}" style="height:${parseInt(height)}px" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>`
}

// ── News Rendering ──────────────────────────────────────

function renderNews(items) {
  const grid = document.getElementById('news-grid')
  const empty = document.getElementById('news-empty')

  if (!items.length) {
    grid.innerHTML = ''
    grid.style.display = 'none'
    empty.style.display = ''
    return
  }
  empty.style.display = 'none'
  grid.style.display = ''

  grid.innerHTML = items.map((item, i) => {
    const img = item.imageUrl
      ? `<img class="news-card-image" src="${esc(item.imageUrl)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : ''
    const cat = item.category ? `<span class="news-category">${esc(item.category)}</span>` : ''
    const pin = item.pinned ? '<span class="news-pin" title="Pinned">\uD83D\uDCCC</span>' : ''
    const body = item.bodyFormat === 'html'
      ? item.body
      : (typeof marked !== 'undefined' ? marked.parse(item.body) : esc(item.body))
    // Truncate rendered body for card display
    const excerpt = truncateHtml(body, 200)
    const tag = item.linkUrl ? 'a' : 'div'
    const href = item.linkUrl ? ` href="${esc(item.linkUrl)}" target="_blank" rel="noopener"` : ''

    return `<${tag} class="news-card" style="animation-delay:${i * 0.04}s"${href}>
      ${img}
      <div class="news-card-body">
        <div class="news-card-meta">${cat}${pin}</div>
        <div class="news-card-title">${esc(item.title)}</div>
        <div class="news-card-excerpt">${excerpt}</div>
        <div class="news-card-footer">${timeAgo(item.createdAt)}</div>
      </div>
    </${tag}>`
  }).join('')
}

function truncateHtml(html, maxLen) {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = tmp.textContent || ''
  if (text.length <= maxLen) return html
  // Simple truncation: get text, truncate, wrap in <p>
  return `<p>${esc(text.slice(0, maxLen))}…</p>`
}

function renderNewsFilters(items) {
  // Only render if we haven't filtered yet — gather all categories from unfiltered data
  if (activeCategory) return
  const filters = document.getElementById('news-filters')
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]
  if (!categories.length) {
    filters.innerHTML = ''
    return
  }

  filters.innerHTML = `<button class="news-filter active" onclick="filterNews(null)">All</button>` +
    categories.map(cat =>
      `<button class="news-filter" onclick="filterNews('${esc(cat)}')">${esc(cat)}</button>`
    ).join('')
}

// Exposed globally for onclick
window.filterNews = function (cat) {
  activeCategory = cat
  // Update active state
  document.querySelectorAll('.news-filter').forEach(btn => {
    btn.classList.toggle('active', cat ? btn.textContent === cat : btn.textContent === 'All')
  })
  loadNews()
}

// ── Socket.io ───────────────────────────────────────────

function initSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.io not loaded, real-time updates disabled')
    setStatus('disconnected', 'No real-time')
    return
  }

  const socket = io()
  socket.on('connect', () => {
    socket.emit('join-room', 'ai-dashboard:viewers')
    setStatus('connected', 'Live')
  })

  socket.on('disconnect', () => {
    setStatus('disconnected', 'Disconnected')
  })

  socket.on('ai-dashboard:update', ({ type }) => {
    if (type === 'full' || type === 'widgets') loadWidgets()
    if (type === 'full' || type === 'news') {
      activeCategory = null
      loadNews()
    }
    if (type === 'full' || type === 'meta') loadMeta()
    toast('Content updated', 'ok')
  })
}

function setStatus(state, text) {
  const dot = document.getElementById('status-dot')
  const txt = document.getElementById('status-text')
  dot.className = `status-dot ${state}`
  txt.textContent = text
}

// ── Init ────────────────────────────────────────────────

async function init() {
  await Promise.all([loadMeta(), loadWidgets(), loadNews()])
  initSocket()
}

init()
