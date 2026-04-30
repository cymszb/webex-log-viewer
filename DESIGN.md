# Webex Log Viewer — Design Document

## 1. Overview

Webex Log Viewer is a single-host web application for loading, filtering, and
visualizing Webex client diagnostic logs. It runs entirely on the local machine
with no external services or build pipeline required.

**Architecture style:** thin-server MVC

| Layer    | Technology |
|----------|-----------|
| Backend  | Python / Flask (data parsing and persistence only) |
| Frontend | Single-page application (vanilla JS, no framework, no build step) |
| Storage  | Two flat files: `current_log.txt` (log data), `topics.json` (config) |

---

## 2. Component Overview

```
┌─────────────────────────────────────────────┐
│               Browser (SPA)                 │
│  templates/index.html                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Log Table│  │  Sidebar │  │ Timeline  │ │
│  │ & Filters│  │  Topics/ │  │  Panel    │ │
│  │          │  │  Events  │  │ (Canvas)  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│       └─────────────┴──────────────┘        │
│                HTTP / REST                  │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│            Flask Backend (app.py)            │
│  GET /           → serve index.html          │
│  GET /api/logs   → parse & return log JSON   │
│  CRUD /api/topics                            │
│  CRUD /api/topics/<id>/events                │
│  CRUD /api/groups                            │
└───────────────────┬─────────────────────────┘
                    │
            ┌───────┴────────┐
            │  current_log.txt│  (read-only at runtime)
            │  topics.json    │  (read/write)
            └────────────────┘
```

---

## 3. Backend (`app.py`)

### 3.1 Log Parsing

The `LOG_PATTERN` regex parses each line into:

```
timestamp  level  [pid:tid][hint]source_file:line  Class::Method::message...
```

Fields extracted: `timestamp`, `level`, `pid`, `tid`, `hint`, `source_file`, `line_num`, `rest`

`rest` is then split on the first two `::` separators (using `indexOf`, not `split` with a limit)
to produce:
- `class_method` — e.g. `AppMonitor::ActiveListener`
- `message` — remainder, which may itself contain `::`

Lines that don't match the pattern are returned with `raw=True` so they are still displayed
(unstyled) rather than dropped.

### 3.2 REST API

All responses are JSON. Errors return `{"error": "..."}` with an HTTP 4xx code.

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/api/logs` | Returns `{"logs": [...], "total": N}` |
| `GET`  | `/api/topics` | Returns `{groups:[...], topics:[...]}` |
| `POST` | `/api/topics` | Create topic |
| `PUT`  | `/api/topics/<id>` | Update topic fields |
| `DELETE` | `/api/topics/<id>` | Delete topic and its events |
| `POST` | `/api/topics/<id>/events` | Create event on a topic |
| `PUT`  | `/api/topics/<id>/events/<eid>` | Update event |
| `DELETE` | `/api/topics/<id>/events/<eid>` | Delete event |
| `POST` | `/api/groups` | Create group |
| `PUT`  | `/api/groups/<id>` | Update group (name, collapsed) |
| `DELETE` | `/api/groups/<id>` | Delete group (topics become ungrouped) |

Each log object shape:
```json
{
  "index": 0,
  "timestamp": "...",
  "level": "Info",
  "pid": "1234",
  "tid": "0x3588",
  "source_file": "AppMonitor.cpp",
  "line_num": "42",
  "class_method": "AppMonitor::ActiveListener",
  "message": "...",
  "raw": false
}
```

### 3.3 Data Persistence (`topics.json`)

```json
{
  "groups": [ {"id": "...", "name": "...", "collapsed": false} ],
  "topics": [
    {
      "id": "...", "name": "...", "pattern": "...", "color": "#...",
      "enabled": true, "group_id": null,
      "events": [
        {
          "id": "...", "name": "...",
          "start_keywords": ["keyword1"],
          "end_keywords": [],
          "value_regex": "",
          "color": "#..."
        }
      ]
    }
  ]
}
```

**Migration logic in `load_data()`:**
- Old bare-array format → wrapped with `groups: []` automatically
- Legacy flat `keywords` field on events → renamed to `start_keywords`; `end_keywords` defaults to `[]`
- Missing `value_regex` field → defaults to `""`

---

## 4. Frontend (`templates/index.html`)

A single HTML file (~2000 lines). No external JS libraries. No build step.

### 4.1 State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `allLogs` | `[]` | All parsed log objects (server load or drag-drop) |
| `filteredLogs` | `[]` | Subset after all filters applied |
| `currentPage` | `int` | Active pagination page |
| `perPage` | `int` | Rows per page (default 500) |
| `topicsState` | `[]` | Topic objects from `/api/topics` |
| `groupsState` | `[]` | Group objects from `/api/topics` |
| `editingTopicId` | `string` | ID of topic open in the edit form (`null` if list view) |
| `tlState` | `{}` | Timeline state: `{minT, maxT, rows:{evId: rowData}}` |
| `draggedTopicId` | `string` | Topic being dragged in the sidebar |

### 4.2 Log Loading

Two paths both populate `allLogs` and call `applyFilters()`:

- **Server load** — `fetch /api/logs`, assign result to `allLogs`
- **Drag & drop** — `FileReader` reads the dropped file as text; `parseLine()`
  (client-side mirror of the Python parser) produces the same object shape as the server.

`parseLine()` uses two `indexOf('::')` calls (not `split` with a limit) to correctly
preserve message content that itself contains `::`.

### 4.3 Filtering (`applyFilters`)

Filters are applied in order; a log line is kept only if it passes **all**:

1. Level checkboxes
2. PID filter (substring, case-insensitive)
3. TID filter (substring, case-insensitive)
4. Source filter (against `source_file` + `class_method`)
5. Full-text search — haystack includes all fields plus the synthetic
   `class_method + '::' + message` string to allow cross-boundary `::` searches
6. Topic filter — if any topic is enabled, keep only lines matching at least
   one enabled topic's regex

### 4.4 Rendering

`renderPage(page)` renders the current page of `filteredLogs` into `<tbody>`.
Each row is color-coded by the first matching enabled topic.
`class_method` is shown as a dim prefix; the search term is highlighted in yellow.

Pagination: 500 rows/page by default. First / Prev / Next / Last + jump-to-page.  
Error navigation: **Prev Error / Next Error** buttons jump through lines where
level is `Error` or `Fatal`.

### 4.5 Topics Sidebar

- **List view** — all groups and ungrouped topics shown as colored rows.
  Click eye icon to toggle enabled; pencil icon to open the edit form.
  Topics can be dragged between groups.
- **Edit view** — name, pattern (regex with live validation), color picker,
  and the events editor.

Groups: collapsible, inline-renameable, deletable, creatable.  
Clicking a group's checkbox toggles all member topics at once.

### 4.6 Events Editor

Each topic has a list of events used for the timeline. An event has:

| Field | Description |
|-------|-------------|
| `name` | Display label |
| `start_keywords` | Comma-separated. A line matches if it contains any of these. |
| `end_keywords` | Comma-separated (optional). Enables **Gantt mode**. |
| `value_regex` | Optional regex; capture group 1 = numeric value. Enables **Metric mode**. |
| `color` | Per-event color from the shared palette. |

### 4.7 Topic Visualization (Timeline Panel)

Opened via the **"Topic Viz"** button. Resizable via a drag handle at the top edge.

`buildGanttRows()` scans `allLogs` once per `renderTimeline()` call and produces
per-event row data in one of three modes:

#### Dot mode *(no end_keywords, no value_regex)*
```
rows[evId] = { mode: 'dots', hits: [{xFrac, logIdx}] }
```
Renders a filled circle at each matching log line's x position.

#### Gantt mode *(end_keywords present, no value_regex)*
```
rows[evId] = { mode: 'gantt', spans: [{startFrac, endFrac, ...}] }
```
Renders a semi-transparent bar from start to end.
Solid left cap; dashed right edge for unclosed spans.

#### Metric mode *(value_regex present)*
```
rows[evId] = { mode: 'metric', points: [{xFrac, value, logIdx}], min, max }
```
Renders a connected line chart. Per-row Y normalization (min/max with 10% padding).
Dotted reference lines at local min and max.

Each event row has its own `<canvas>` element. The shared time axis sits at the top.
All canvases are DPR-aware (retina support). A `ResizeObserver` triggers a redraw
when the panel width changes.

**Interaction:**
- Hover → tooltip with timestamp (dot/gantt) or value + timestamp (metric)
- Click → jumps to the log line; scrolls the log table to that row

---

## 5. Data Flow Summary

```
User loads log
     │
     ▼
allLogs populated (server JSON or client parseLine)
     │
     ▼
applyFilters() → filteredLogs
     │
     ▼
renderPage()   → DOM table rows
     │
     ├── (timeline open?)
     ▼
buildGanttRows() scans allLogs
     │
     ▼
drawAxis() + drawEventRow() per event → canvas pixels
```

---

## 6. Known Limitations

- Log file is read entirely into memory; very large files (> 500 MB) may be slow.
- No authentication; intended for local single-user use only.
- `topics.json` is a flat file; concurrent multi-user writes are not safe.
- Background Flask process on macOS may be suspended by the OS after the terminal
  session goes idle. Restart with:
  ```sh
  kill -9 $(lsof -ti:8080); python3 app.py > /tmp/flask.log 2>&1 & disown
  ```
