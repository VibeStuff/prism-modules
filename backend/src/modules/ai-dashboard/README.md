# AI Dashboard Module

A dashboard with zero hardcoded content. Every widget, news box, title, and layout parameter is defined entirely by API calls. Designed for LLM agents (Claude Dispatch, scheduled tasks, or any automation) to push structured content to a live-updating web dashboard.

**URL:** `/ai-dashboard`
**Token env var:** `AI_DASHBOARD_TOKEN`

---

## LLM Agent Prompt

> Copy everything below this line and give it to any LLM agent that needs to control this dashboard.

---

You have access to the Prism AI Dashboard API. This dashboard displays widgets (stat cards, lists, markdown, charts, tables, progress bars, countdowns, key-value pairs, images, embeds, and raw HTML) and news boxes. You control **all** content — nothing is hardcoded. Every visual element is created, updated, or removed by your API calls. The dashboard auto-updates in real time via WebSocket when you push changes.

### Authentication

Every write request (POST, PUT, DELETE) requires this header:

```
Authorization: Bearer <AI_DASHBOARD_TOKEN>
```

The token value is provided in your environment. Read requests (GET) are public.

### Base URL

All endpoints are under `/ai-dashboard`. Example: `http://localhost:3000/ai-dashboard/api/push`

---

### Primary Endpoint: Bulk Push

**`POST /ai-dashboard/api/push`** — Define the entire dashboard in one call. This is your default endpoint.

```json
{
  "meta": {
    "title": "string — Dashboard heading (default: 'AI Dashboard')",
    "subtitle": "string | null — Subheading below title",
    "layoutCols": "integer 1–12 — Widget grid columns (default: 4)"
  },
  "widgets": [
    {
      "slug": "unique-id (lowercase, alphanumeric + hyphens, e.g. 'weather-today')",
      "type": "stat | list | markdown | chart | html | progress | table | image | countdown | kv | embed",
      "title": "Widget heading text",
      "content": { "...type-specific payload (see below)..." },
      "colSpan": "integer 1–12 — Grid columns to span (default: 1)",
      "rowSpan": "integer 1–6 — Grid rows to span (default: 1)",
      "order": "integer — Sort position, lower first (default: 0)",
      "visible": "boolean — Show/hide without deleting (default: true)",
      "icon": "string | null — Emoji/symbol shown next to widget title",
      "link": "string URL | null — Makes the entire widget card clickable",
      "style": {
        "bgColor": "CSS color — Card background",
        "bgGradient": "CSS gradient — Card background (overrides bgColor)",
        "headerColor": "CSS color — Widget title color",
        "textColor": "CSS color — Content text color",
        "borderColor": "CSS color — Card border color",
        "accentColor": "CSS color — Accent (progress bars, countdown numbers)",
        "opacity": "number 0–1 — Card opacity",
        "padding": "CSS padding value"
      }
    }
  ],
  "news": [
    {
      "title": "Headline text",
      "body": "Full content (markdown or HTML)",
      "bodyFormat": "markdown | html (default: markdown)",
      "category": "string — Category badge (e.g. 'Tech', 'Markets')",
      "priority": "integer — Higher = more prominent (default: 0)",
      "imageUrl": "string URL | null — Hero image at top of card",
      "linkUrl": "string URL | null — Makes card clickable",
      "pinned": "boolean — Pinned items always appear first (default: false)",
      "expiresAt": "ISO 8601 datetime | null — Auto-hide after this time"
    }
  ],
  "clearWidgets": "boolean — Delete ALL existing widgets before inserting (default: false)",
  "clearNews": "boolean — Delete ALL existing news before inserting (default: false)"
}
```

**All fields are optional.** Only include what you want to change. The operation is atomic (transaction).

**Key behaviors:**
- `widgets` are **upserted by slug** — same slug updates the existing widget, new slug creates one.
- `news` items are **always appended** (new entries created). Use `clearNews: true` to replace all.
- `meta` is **upserted** — creates if none exists, updates if it does.

---

### Widget Type Payloads

#### `stat` — Large number/KPI display

```json
{
  "slug": "active-users",
  "type": "stat",
  "title": "Active Users",
  "content": {
    "value": "1,247",
    "label": "Currently online",
    "change": "+12%",
    "changeDirection": "up",
    "icon": "👥"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | string or number | **yes** | Main displayed value (rendered large). |
| `label` | string | no | Description below the value. |
| `change` | string | no | Change indicator (e.g. "+12%", "-3"). |
| `changeDirection` | `"up"` / `"down"` / `"neutral"` | no | Colors: green/red/muted. |
| `icon` | string | no | Emoji or symbol before the value. |

#### `list` — Vertical item list

```json
{
  "slug": "tasks",
  "type": "list",
  "title": "Today's Tasks",
  "content": {
    "items": [
      { "text": "Review PR #142", "icon": "🔍", "link": "https://github.com/..." },
      { "text": "Deploy staging", "icon": "🚀" }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | array | **yes** | List items. |
| `items[].text` | string | **yes** | Display text. |
| `items[].icon` | string | no | Emoji/symbol prefix. |
| `items[].link` | string (URL) | no | Makes item a clickable link. |

#### `markdown` — Rich text content

```json
{
  "slug": "summary",
  "type": "markdown",
  "title": "Daily Summary",
  "content": {
    "markdown": "## Updates\n\n- **Build pipeline** fixed\n- New release tagged\n\n> Next milestone: Friday"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `markdown` | string | **yes** | GitHub-flavored Markdown. Supports headings, bold, links, code, lists, blockquotes. |

#### `html` — Raw HTML (sandboxed)

```json
{
  "slug": "banner",
  "type": "html",
  "title": "Announcement",
  "content": {
    "html": "<div style='padding:20px;background:#667eea;color:#fff;border-radius:12px;text-align:center'><h2>v3.0 Launched!</h2></div>"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `html` | string | **yes** | Raw HTML rendered in a sandboxed iframe. |

#### `chart` — Bar, line, pie, or doughnut chart

```json
{
  "slug": "deploys",
  "type": "chart",
  "title": "Weekly Deploys",
  "content": {
    "chartType": "bar",
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "datasets": [
      { "label": "Production", "data": [3, 5, 2, 8, 4], "color": "#5a8a4a" },
      { "label": "Staging", "data": [7, 4, 6, 3, 9], "color": "#4a6fa8" }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chartType` | `"bar"` / `"line"` / `"pie"` / `"doughnut"` | **yes** | Chart type. |
| `labels` | string[] | **yes** | X-axis labels (or slice labels for pie/doughnut). |
| `datasets` | array | **yes** | Data series. |
| `datasets[].label` | string | **yes** | Legend label. |
| `datasets[].data` | number[] | **yes** | Values (length must match labels). |
| `datasets[].color` | string | no | CSS color (for bar/line datasets). |
| `datasets[].colors` | string[] | no | Per-slice colors (for pie/doughnut only). |

**Line chart** renders SVG with area fills, dots, and multi-dataset support.
**Pie/doughnut** renders SVG with percentage legend. Doughnut has a hollow center.

#### `progress` — Progress bars

```json
{
  "slug": "build-progress",
  "type": "progress",
  "title": "Build Status",
  "content": {
    "bars": [
      { "label": "Frontend", "value": 87, "max": 100, "color": "#5a8a4a" },
      { "label": "Backend", "value": 42, "max": 100, "color": "#4a6fa8" },
      { "label": "Tests", "value": 156, "max": 200 }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bars` | array | **yes** | Progress bars to display. |
| `bars[].value` | number | **yes** | Current value. |
| `bars[].max` | number | no | Maximum value (default: 100). |
| `bars[].label` | string | no | Label shown above the bar. |
| `bars[].color` | string | no | Bar fill color. |

Shorthand: omit `bars` and provide `value`, `max`, `label` directly for a single bar.

#### `table` — Data table

```json
{
  "slug": "top-errors",
  "type": "table",
  "title": "Top Errors (24h)",
  "content": {
    "headers": ["Error", "Count", "Last Seen"],
    "rows": [
      ["TypeError: null ref", 142, "2 min ago"],
      ["NetworkError: timeout", 87, "5 min ago"],
      ["SyntaxError: JSON", 23, "1h ago"]
    ],
    "striped": true
  },
  "colSpan": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headers` | string[] | no | Column headers (sticky on scroll). |
| `rows` | array[] | **yes** | Row data. Each row is an array of cell values. |
| `striped` | boolean | no | Alternating row shading (default: true). |

#### `image` — Image display

```json
{
  "slug": "daily-graph",
  "type": "image",
  "title": "System Load",
  "content": {
    "url": "https://example.com/graph.png",
    "alt": "System load graph",
    "caption": "Last 24 hours",
    "fit": "contain"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` / `src` | string | **yes** | Image URL. |
| `alt` | string | no | Alt text. |
| `caption` | string | no | Caption below the image. |
| `fit` | string | no | CSS `object-fit` value (default: `"cover"`). |

#### `countdown` — Live countdown timer

```json
{
  "slug": "launch-timer",
  "type": "countdown",
  "title": "Product Launch",
  "content": {
    "target": "2026-04-01T00:00:00Z",
    "label": "Time until launch",
    "expired": "Launched!"
  },
  "colSpan": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string (ISO 8601) | **yes** | Countdown target datetime. |
| `label` | string | no | Description above the timer. |
| `expired` | string | no | Text shown when countdown reaches zero. |

The timer updates every second with days, hours, minutes, and seconds.

#### `kv` — Key-value pairs

```json
{
  "slug": "server-info",
  "type": "kv",
  "title": "Server Status",
  "content": {
    "pairs": [
      { "key": "Region", "value": "us-east-1", "icon": "🌎" },
      { "key": "Uptime", "value": "14d 7h 32m", "icon": "⏱️" },
      { "key": "Version", "value": "v3.2.1", "icon": "📦", "link": "https://github.com/..." },
      { "key": "CPU", "value": "23%", "icon": "💻" }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pairs` | array | **yes** | Key-value entries. |
| `pairs[].key` | string | **yes** | Left-side label. |
| `pairs[].value` | string/number | **yes** | Right-side value. |
| `pairs[].icon` | string | no | Emoji/symbol prefix for the key. |
| `pairs[].link` | string (URL) | no | Makes the value a clickable link. |

#### `embed` — External URL iframe

```json
{
  "slug": "grafana",
  "type": "embed",
  "title": "Metrics",
  "content": {
    "url": "https://grafana.example.com/d/abc?orgId=1&kiosk",
    "height": 300
  },
  "colSpan": 4
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | **yes** | URL to embed. |
| `height` | number | no | Iframe height in pixels (default: 200). |

Sandboxed with `allow-scripts allow-same-origin`.

---

### Widget Customization

Every widget supports optional `style`, `icon`, `link`, and `visible` fields:

```json
{
  "slug": "revenue",
  "type": "stat",
  "title": "Revenue",
  "icon": "💰",
  "link": "https://stripe.com/dashboard",
  "style": {
    "bgColor": "#1a1a2e",
    "textColor": "#e0e0e0",
    "headerColor": "#a0a0a0",
    "accentColor": "#00d4aa",
    "borderColor": "#333"
  },
  "content": { "value": "$142K", "change": "+8%", "changeDirection": "up" }
}
```

- **`visible: false`** hides a widget without deleting it. The GET endpoint filters hidden widgets by default; pass `?all=true` to include them.
- **`icon`** shows an emoji/symbol next to the widget title.
- **`link`** makes the entire widget card a clickable link.
- **`style`** applies per-widget custom colors and appearance.

---

### News Items

News items are announcement cards below the widgets. They support markdown body content, category filtering, hero images, clickable links, pinning, and auto-expiration.

**Sort order:** Pinned first, then priority descending, then newest first.

**Expired items** (where `expiresAt` is in the past) are automatically hidden.

---

### Individual CRUD Endpoints

For granular control beyond bulk push:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/ai-dashboard/api/news?limit=50&offset=0&category=Tech` | Public | List news items. |
| `POST` | `/ai-dashboard/api/news` | Token | Create one news item. |
| `PUT` | `/ai-dashboard/api/news/:id` | Token | Partial update by ID. |
| `DELETE` | `/ai-dashboard/api/news/:id` | Token | Delete by ID. |
| `GET` | `/ai-dashboard/api/widgets?all=true` | Public | List widgets (hidden filtered by default; `?all=true` includes hidden). |
| `POST` | `/ai-dashboard/api/widgets` | Token | Upsert one widget by slug. |
| `DELETE` | `/ai-dashboard/api/widgets/:id` | Token | Delete by database ID. |
| `GET` | `/ai-dashboard/api/meta` | Public | Get dashboard metadata. |
| `PUT` | `/ai-dashboard/api/meta` | Token | Upsert metadata. |

---

### Common Patterns

**Full refresh (replace everything):**
```json
{ "clearWidgets": true, "clearNews": true, "meta": {...}, "widgets": [...], "news": [...] }
```

**Update one widget without touching others:**
```json
POST /ai-dashboard/api/widgets
{ "slug": "server-status", "type": "stat", "title": "Uptime", "content": { "value": "99.99%" } }
```

**Time-limited announcement:**
```json
POST /ai-dashboard/api/news
{ "title": "Maintenance Tonight", "body": "11 PM–1 AM EST", "pinned": true, "expiresAt": "2026-03-25T06:00:00Z" }
```

---

### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Validation failed — check `details` field. |
| 401 | Missing or invalid Bearer token. |
| 404 | Resource not found (wrong ID). |
| 503 | `AI_DASHBOARD_TOKEN` not configured on the server. |

### Slug Rules

- Lowercase alphanumeric + hyphens only
- Must start with a letter or number
- Pattern: `^[a-z0-9][a-z0-9-]*$`
- Examples: `weather`, `sp500`, `todays-tasks`, `politics-brief`
