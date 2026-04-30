# Webex Log Viewer — User Guide

## Quick Start

```sh
# 1. Start the server
python3 app.py

# 2. Open in browser
open http://localhost:8098
```

3. Click **"Upload Log…"** in the toolbar and select a `.txt` Webex log file.

---

## Section 1 — Loading Logs

### Uploading a Log File
Click **"Upload Log…"** in the toolbar and select a `.txt` Webex log file from
your machine. A progress bar shows upload status. Once complete, the status
bar shows the total line count and the table fills with the first page of results.

The uploaded log is stored on the server for your browser session. If you close
and reopen the browser (same session cookie), the log is still available.
The server automatically deletes logs after 24 hours of inactivity (configurable
via `SESSION_TTL_H`).

### Clearing a Log
Click **"✕ Clear Log"** in the toolbar to remove the uploaded log from the
server and reset the table.

### File Requirements
- Format: `.txt` (case-insensitive)
- Maximum size: set by `MAX_UPLOAD_MB` (default 200 MB)

---

## Section 2 — The Log Table

| Column | Description |
|--------|-------------|
| `#` | Original line number in the file |
| Time | Timestamp (ISO 8601) |
| Lvl | Log level: Debug / Info / Warning / Error / Fatal |
| PID | Process ID |
| TID | Thread ID (decimal or hex) |
| Source | Source file name and line number |
| Class::Method  Message | `class_method` shown dimmed; message follows. Hover for full text tooltip. Search matches highlighted in yellow. |

Row colors: each row is highlighted in the color of the first matching enabled
Topic (see [Section 4](#section-4--topics)). Rows matching no topic are uncolored.

---

## Section 3 — Filtering

All filters work together — a row is shown only if it passes **every** active filter.

### 3.1 Level Checkboxes
Toggle **Debug / Info / Warning / Error / Fatal** independently in the toolbar.

### 3.2 Full-Text Search
Filters rows that contain the typed string anywhere in: timestamp, level, PID,
TID, source file, line number, class::method, message, or the joined
`class::method::message` string.

**Examples:**
```
onCpuSnapshot                         → any line mentioning that function
AppMonitor::ActiveListener            → lines with this in class_method
network::HttpRequestManager::send     → cross-boundary :: search works correctly
```

### 3.3 PID / TID Filters
Substring match (case-insensitive). Enter a partial hex value for TID —
e.g. `3588` matches tid `0x3588`.

### 3.4 Source Filter
Substring match against `source_file` + `class_method`.
Example: `ActiveListener` matches `ActiveListener.cpp`.

### 3.5 Error Navigation
**← Err** / **Err →** jump between lines with level `Error` or `Fatal`,
scrolling the table to that line automatically.

### 3.6 Clear All
The **"Clear"** button resets the log table and all filters.

---

## Section 4 — Topics

Topics are named regex filters. When at least one topic is enabled, the log
table shows only lines that match at least one enabled topic's pattern.
Matching rows are highlighted in the topic's color.

### 4.1 Enabling / Disabling Topics
Click the eye icon (👁) on a topic row to toggle it on or off.
The row turns bright when enabled, dim when disabled.

### 4.2 Creating a Topic
Click **"+ New Topic"** at the top of the sidebar and fill in:

| Field | Description |
|-------|-------------|
| Name | Display label (any text) |
| Pattern | A JavaScript-compatible regular expression. Green = valid, red = invalid. |
| Color | Pick from the color palette |

### 4.3 Editing a Topic
Click the pencil icon (✎) on a topic row to open the edit form.
Change name, pattern, or color, then click **"Save"**. Click **"Cancel"** to discard.

### 4.4 Deleting a Topic
Click the trash icon (🗑) on a topic row. This also deletes all events belonging
to that topic.

### 4.5 Topic Groups
Topics can be organized into named groups.

- Click **"+ New Group"** to create a group.
- **Drag** a topic row and drop it onto a group header to move it.
- Click the group **checkbox** to enable/disable all member topics at once.
- Click the group **name** to collapse/expand the group.
- **Double-click** (or click the pencil) on a group name to rename it inline.
- Click the group **trash icon** to delete it (topics become ungrouped).

### 4.6 Topic Navigation
**← Topic** / **Topic →** jump between rows matching any enabled topic's regex
(independent of the topic filter — useful for scanning without hiding other rows).

---

## Section 5 — Events

Events are sub-items of a topic used to mark specific lifecycle points or
extract numeric metrics for the Timeline visualization.

### 5.1 Opening the Events Editor
Click the pencil icon on a topic → scroll to **"Events in this topic"**
at the bottom of the edit form.

### 5.2 Event Fields

| Field | Description |
|-------|-------------|
| Name | Display label shown in the timeline row |
| Start keywords | Comma-separated substrings. A log line matches if it contains any of these (case-sensitive). |
| End keywords | Optional. Enables **Gantt mode**: start keyword opens a span; end keyword closes it. |
| Value regex | Optional regex with one capture group extracting a numeric value. Enables **Metric mode**. Overrides Gantt mode. |
| Color | Per-event color for timeline rendering |

### 5.3 Event Modes

| Mode | Condition | Timeline appearance |
|------|-----------|---------------------|
| **Dot** | No end keywords, no value regex | Colored dot at each matching line |
| **Gantt** | End keywords provided | Horizontal bar from start to end; dashed right edge if never closed |
| **Metric** | Value regex provided | Auto-scaled line chart; dotted min/max reference lines |

### 5.4 Creating / Editing / Deleting Events

- Click **"+ Add Event"** inside the topic edit form.
- Fill in fields and click **"Save"** (or press `Enter` in any text field).
- Click the pencil icon on an event row to edit it.
- Click the trash icon to delete it (no undo).
- Events with a value regex show a blue **"metric"** badge in the list.

---

## Section 6 — Topic Visualization (Timeline)

### 6.1 Opening the Timeline
Click the **"Topic Viz"** button in the toolbar. The panel slides up from the
bottom of the page. Click again (or the **×** in the panel header) to close.

### 6.2 What You See
- A shared **time axis** at the top spanning the full log time range.
- One **row per event** in every enabled topic.
- Row labels show the event name; hover the label for the full keyword tooltip.

### 6.3 Resizing the Panel
Drag the thin handle at the **very top edge** of the panel up or down.
Canvases redraw automatically when released.

### 6.4 Hovering
| Row type | Tooltip shows |
|----------|--------------|
| Dot | Matching log line's timestamp |
| Gantt | Start timestamp → end timestamp |
| Metric | Numeric value and timestamp |

### 6.5 Clicking
Click any dot, Gantt bar, or metric line point to **jump to that log line**
in the table. If the line is currently filtered out, an alert explains why.

### 6.6 CPU Monitoring Example
The built-in **"CPU Monitoring"** topic includes four metric events:

| Event | Tracks |
|-------|--------|
| Main CPU | `TelephonyTelemetryManager::onCpuSnapshot` — Main CPU % |
| Media CPU | Same keyword, Media process CPU % |
| Host CPU | Same keyword, Host CPU % |
| Turbo Factor | Same keyword, Turbo scaling factor |

Enable the topic, load the log, and open the Timeline to see four
synchronized line charts.

---

## Section 7 — Pagination

- **Default:** 500 rows per page.
- **Change** via the **"Rows/page"** dropdown: 100 / 200 / 500 / 1000 / 2000.
- **Navigate:** First | ← Prev | `[page]` / total | Next → | Last
- Type a page number in the input box and press `Enter` or click **"Go"**.

---

## Section 8 — Keyboard Shortcuts

| Context | Key | Action |
|---------|-----|--------|
| Event form text field | `Enter` | Save the event |
| Event form text field | `Escape` | Cancel / close the form |
| Topic edit regex field | `Enter` | Save the topic (if regex valid and name filled) |
| Topic edit regex field | `Escape` | Cancel |
| New-group input | `Enter` | Confirm group creation |
| New-group input | `Escape` | Cancel |

---

## Section 9 — Tips

**Filter for a specific thread:**
Type the TID in the TID filter box — e.g. `3588` or `0x3588`.

**See only errors:**
Uncheck Debug, Info, and Warning in the level checkboxes.

**Visualize a new metric:**
1. Create (or edit) a topic whose pattern matches the relevant log lines.
2. Add an event with the keyword that uniquely identifies those lines as **Start keywords**.
3. Set **Value regex** to capture the number, e.g. `Process cpu = ([\d.]+)`
4. Enable the topic and open **Topic Visualization**.

**Cross-boundary search:**
Searching for `ClassName::methodName::detail` works even when the parser stores
`class_method` and `message` as separate fields.

**Transfer your configuration:**
`topics.json` is plain JSON — copy it between machines to transfer your entire
topic / event setup.
