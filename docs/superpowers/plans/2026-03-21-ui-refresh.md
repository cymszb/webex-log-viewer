# UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a visual polish pass to `templates/index.html` — deeper dark palette, richer accents, sidebar search box, ⋯ overflow menu replacing inline delete button, and a centered modal overlay replacing the inline sidebar edit view.

**Architecture:** All changes are in `templates/index.html` only. `app.py` and `tests/` are not touched. The plan layers changes from the bottom up: global tokens → structural components (header, toolbar, stats bar) → sidebar list view → edit modal → JS wiring. Each task is self-contained; the app stays runnable after each commit.

**Tech Stack:** Vanilla JS, CSS custom properties, standard DOM APIs — no build step, no new dependencies.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `templates/index.html` | Modify (CSS section, lines 1–506) | Global tokens, scrollbar, all component styles |
| `templates/index.html` | Modify (HTML section, lines 509–775) | Header markup, toolbar label, sidebar search box, ⋯ button, modal overlay |
| `templates/index.html` | Modify (JS section, lines 776–2070) | `renderTopicRows`, `showEditView`→`openTopicModal`, `showListView`→`closeTopicModal`, search filter, ⋯ menu handler, modal keyboard/focus |

---

### Task 1: Add CSS custom property tokens and global scrollbar

**Files:**
- Modify: `templates/index.html:8-19` (Reset & base section)

- [ ] **Step 1: Open the file and locate the `/* Reset & base */` block (lines 8–19)**

The block ends before `/* ── Header */`. We will insert CSS variables and scrollbar rules here.

- [ ] **Step 2: Replace the Reset & base block with the new version**

Replace:
```css
    /* ── Reset & base ───────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f1117;
      color: #d4d8e1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
```

With:
```css
    /* ── Reset & base ───────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }

    :root {
      --bg-base:        #0a0d14;
      --bg-toolbar:     #0d1020;
      --bg-header:      #111827;
      --bg-sidebar:     #0e1018;
      --bg-elevated:    #111520;
      --bg-card:        #0e1220;
      --bg-card-active: #111828;
      --border-subtle:  #1a1f2e;
      --border-default: #1e2535;
      --border-input:   #1e2840;
      --border-active:  #2a5070;
      --text-primary:   #c8d0e8;
      --text-secondary: #6878a8;
      --text-muted:     #3a4468;
      --accent-blue:    #60a5fa;
      --accent-cyan:    #06b6d4;
    }

    /* Global thin dark scrollbar */
    * { scrollbar-width: thin; scrollbar-color: #1e2535 #0a0d14; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #0a0d14; }
    ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #2a3550; }

    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg-base);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
```

- [ ] **Step 3: Open the browser and verify** — app loads, dark background is `#0a0d14`, scrollbars in `#table-wrap` are thin and dark.

- [ ] **Step 4: Commit**

```bash
git add templates/index.html
git commit -m "style: add CSS custom property tokens and global thin dark scrollbar"
```

---

### Task 2: Restyle Header

**Files:**
- Modify: `templates/index.html:21-33` (Header CSS)
- Modify: `templates/index.html:511-515` (Header HTML)

- [ ] **Step 1: Replace the Header CSS block**

Replace:
```css
    /* ── Header ─────────────────────────────────────────────────────── */
    header {
      background: #1a1d27;
      border-bottom: 1px solid #2a2e3d;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    header h1 { font-size: 1.05rem; font-weight: 600; color: #e0e4f0; white-space: nowrap; }
    header h1 span { color: #5b9bd5; }
    .spacer { flex: 1; }
```

With:
```css
    /* ── Header ─────────────────────────────────────────────────────── */
    header {
      background: linear-gradient(135deg, #111827, #0f172a);
      border-bottom: 1px solid var(--border-default);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    .header-logo {
      width: 26px; height: 26px; border-radius: 6px;
      background: linear-gradient(135deg, #3b82f6, #06b6d4);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; flex-shrink: 0;
    }
    header h1 { font-size: 1.05rem; font-weight: 700; color: #f0f4ff; white-space: nowrap; }
    header h1 span {
      background: linear-gradient(90deg, #60a5fa, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .spacer { flex: 1; }
```

- [ ] **Step 2: Update the Header HTML**

Replace:
```html
<header>
  <h1>Webex <span>Log Viewer</span></h1>
  <div class="spacer"></div>
</header>
```

With:
```html
<header>
  <div class="header-logo">📋</div>
  <h1>Webex <span>Log Viewer</span></h1>
  <div class="spacer"></div>
</header>
```

- [ ] **Step 3: Verify in browser** — header shows gradient background, logo icon left of title, "Log Viewer" text has blue-to-green gradient.

- [ ] **Step 4: Commit**

```bash
git add templates/index.html
git commit -m "style: restyle header with gradient background, logo icon, and gradient title text"
```

---

### Task 3: Restyle Toolbar

**Files:**
- Modify: `templates/index.html:35-141` (Toolbar + button + input + level filter CSS)
- Modify: `templates/index.html:546-548` (Warn label text in HTML)

- [ ] **Step 1: Replace the Toolbar CSS block**

Replace:
```css
    /* ── Toolbar ─────────────────────────────────────────────────────── */
    #toolbar {
      background: #13161f;
      border-bottom: 1px solid #22253a;
      padding: 8px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      flex-shrink: 0;
    }
    .toolbar-group { display: flex; align-items: center; gap: 6px; }
    .toolbar-label { font-size: 0.72rem; color: #6b7190; text-transform: uppercase; letter-spacing: .05em; }
```

With:
```css
    /* ── Toolbar ─────────────────────────────────────────────────────── */
    #toolbar {
      background: var(--bg-toolbar);
      border-bottom: 1px solid #1a1f30;
      padding: 7px 18px;
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      gap: 10px;
      align-items: center;
      flex-shrink: 0;
    }
    .toolbar-group { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .toolbar-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; }
```

- [ ] **Step 2: Replace the global button styles**

Replace:
```css
    /* Buttons */
    button {
      cursor: pointer;
      border: 1px solid #2e3250;
      border-radius: 5px;
      font-size: 0.8rem;
      padding: 5px 12px;
      background: #1e2132;
      color: #b8bdd4;
      transition: background .15s, color .15s;
    }
    button:hover { background: #272b40; color: #e0e4f0; }
    button.primary { background: #1e3a5f; border-color: #2a5a90; color: #a8c8f0; }
    button.primary:hover { background: #1f4878; color: #c8dff8; }
    button.danger { background: #3a1e1e; border-color: #602a2a; color: #f09090; }
    button.danger:hover { background: #4a2020; }
```

With:
```css
    /* Buttons */
    button {
      cursor: pointer;
      border: 1px solid var(--border-input);
      border-radius: 6px;
      font-size: 0.8rem;
      padding: 5px 12px;
      background: var(--bg-elevated);
      color: var(--text-secondary);
      transition: background .15s, color .15s;
    }
    button:hover { background: #182030; color: var(--text-primary); }
    button.primary { background: linear-gradient(135deg, #1a3a5a, #153050); border-color: var(--border-active); color: var(--accent-blue); font-weight: 500; }
    button.primary:hover { background: linear-gradient(135deg, #1e4468, #173858); color: #80b8fc; }
    button.danger { background: #140e0e; border-color: #3a1818; color: #f87171; }
    button.danger:hover { background: #1e1010; }
```

- [ ] **Step 3: Replace the Upload panel button style (label acting as button)**

Replace:
```css
    #btn-upload-label {
      cursor: pointer;
      border: 1px solid #2a5a90;
      border-radius: 5px;
      font-size: 0.8rem;
      padding: 5px 12px;
      background: #1e3a5f;
      color: #a8c8f0;
      transition: background .15s;
      white-space: nowrap;
    }
    #btn-upload-label:hover { background: #1f4878; }
```

With:
```css
    #btn-upload-label {
      cursor: pointer;
      border: 1px solid var(--border-active);
      border-radius: 6px;
      font-size: 0.8rem;
      padding: 5px 12px;
      background: linear-gradient(135deg, #1a3a5a, #153050);
      color: var(--accent-blue);
      font-weight: 500;
      transition: background .15s;
      white-space: nowrap;
    }
    #btn-upload-label:hover { background: linear-gradient(135deg, #1e4468, #173858); }
```

- [ ] **Step 4: Replace text input styles**

Replace:
```css
    /* Text inputs */
    input[type="text"] {
      background: #1e2132;
      border: 1px solid #2e3250;
      border-radius: 5px;
      color: #d4d8e1;
      font-size: 0.8rem;
      padding: 5px 10px;
      outline: none;
      transition: border-color .15s;
    }
    input[type="text"]:focus { border-color: #5b9bd5; }
    input[type="text"]::placeholder { color: #4a4e68; }
```

With:
```css
    /* Text inputs */
    input[type="text"], input[type="search"] {
      background: var(--bg-elevated);
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.8rem;
      padding: 5px 10px;
      outline: none;
      transition: border-color .15s;
    }
    input[type="text"]:focus, input[type="search"]:focus { border-color: var(--border-active); }
    input[type="text"]::placeholder, input[type="search"]::placeholder { color: var(--text-muted); }
```

- [ ] **Step 5: Replace the Level filter CSS**

Replace:
```css
    /* Level filter checkboxes */
    #level-filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .level-cb { display: none; }
    .level-lbl {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid transparent;
      opacity: 0.45;
      transition: opacity .15s;
      user-select: none;
    }
    .level-cb:checked + .level-lbl { opacity: 1; }

    .lvl-debug  .level-lbl { background: #1e2535; border-color: #3a4560; color: #8899bb; }
    .lvl-info   .level-lbl { background: #0e2430; border-color: #1a5070; color: #5ab8e0; }
    .lvl-warn   .level-lbl { background: #2a2010; border-color: #6a5010; color: #e0a830; }
    .lvl-error  .level-lbl { background: #2e1010; border-color: #7a2020; color: #e05050; }
    .lvl-fatal  .level-lbl { background: #280e28; border-color: #6a1a6a; color: #d070d0; }
    .lvl-unknown .level-lbl { background: #22243a; border-color: #3a3c5a; color: #8890bb; }
```

With:
```css
    /* Level filter checkboxes */
    #level-filters { display: flex; gap: 6px; flex-wrap: nowrap; }
    .level-cb { display: none; }
    .level-lbl {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid transparent;
      opacity: 0.35;
      transition: opacity .15s;
      user-select: none;
      white-space: nowrap;
    }
    .level-cb:checked + .level-lbl { opacity: 1; }

    .lvl-debug   .level-lbl { background: #151c2e; border-color: #2a3a56; color: #7a90b8; }
    .lvl-info    .level-lbl { background: #0a1e30; border-color: #1a4a6a; color: #38bdf8; }
    .lvl-warn    .level-lbl { background: #1e1800; border-color: #5a4400; color: #fbbf24; }
    .lvl-error   .level-lbl { background: #1e0808; border-color: #6a1818; color: #f87171; }
    .lvl-fatal   .level-lbl { background: #180618; border-color: #5a1260; color: #e879f9; }
    .lvl-unknown .level-lbl { background: #141822; border-color: #2a3050; color: #6878a8; }
```

- [ ] **Step 6: Add the `#btn-toggle-timeline` restyling (find existing rule around line 500–505)**

Replace:
```css
    #btn-toggle-timeline {
      font-size: 0.78rem; padding: 5px 10px; background: #1a1d2e;
      border: 1px solid #2e3454; color: #7090b8;
    }
    #btn-toggle-timeline:hover { background: #1e2235; color: #a0b8d8; }
    #btn-toggle-timeline.active { background: #1a2a40; border-color: #5b9bd5; color: #5b9bd5; }
```

With:
```css
    #btn-toggle-timeline {
      font-size: 0.78rem; padding: 5px 10px;
      background: linear-gradient(135deg, #1e3a5f, #1a3050);
      border: 1px solid #2a5080; color: #7ab8e0; font-weight: 500;
    }
    #btn-toggle-timeline:hover { background: linear-gradient(135deg, #224268, #1d3858); color: #a0c8e8; }
    #btn-toggle-timeline.active { background: linear-gradient(135deg, #1e3a5f, #1a3050); border-color: var(--accent-blue); color: var(--accent-blue); }
```

- [ ] **Step 7: Rename the "Warn" display label in the HTML toolbar**

In the HTML (around line 547), change:
```html
      <label class="lvl-warn">
        <input type="checkbox" class="level-cb" value="Warn" checked /><span class="level-lbl">Warn</span>
      </label>
```
To:
```html
      <label class="lvl-warn">
        <input type="checkbox" class="level-cb" value="Warn" checked /><span class="level-lbl">Warning</span>
      </label>
```

- [ ] **Step 8: Verify in browser** — toolbar has correct background, level chips styled with new colors, unchecked chips are dim (opacity 0.35), checked chips are full brightness. "Warn" chip shows "Warning". Topic Viz button has gradient.

- [ ] **Step 9: Commit**

```bash
git add templates/index.html
git commit -m "style: restyle toolbar — new bg, button styles, level chip colors, Warning label rename"
```

---

### Task 4: Restyle Stats Bar

**Files:**
- Modify: `templates/index.html:142-161` (Stats bar CSS)
- Modify: `templates/index.html` (Stats bar HTML, find `#statsbar`)

- [ ] **Step 1: Find the stats bar HTML**

Search for `id="statsbar"` — it's in the HTML section (around line 596–618). Read the section to see the current structure.

- [ ] **Step 2: Replace the Stats bar CSS block**

Replace:
```css
    /* ── Stats bar ───────────────────────────────────────────────────── */
    #statsbar {
      background: #0f1117;
      border-bottom: 1px solid #1c1f2e;
      padding: 4px 16px;
      font-size: 0.73rem;
      color: #4e5474;
      display: flex;
      gap: 18px;
      align-items: center;
      flex-shrink: 0;
    }
    #statsbar .stat-val { color: #8890b8; }

    /* Error jump indicator */
    #jump-indicator {
      margin-left: auto;
      font-size: 0.73rem;
      color: #e05050;
    }
```

With:
```css
    /* ── Stats bar ───────────────────────────────────────────────────── */
    #statsbar {
      background: #08090f;
      border-bottom: 1px solid #12151e;
      padding: 4px 18px;
      font-size: 0.71rem;
      color: var(--text-muted);
      display: flex;
      gap: 16px;
      align-items: center;
      flex-shrink: 0;
    }
    .stat-pill {
      border-radius: 10px;
      padding: 1px 8px;
      font-weight: 500;
    }
    .stat-pill-total { color: #4a6090; background: var(--bg-card); border: 1px solid #1a2030; }
    .stat-pill-shown { color: #4a8060; background: #081810; border: 1px solid #0e3020; }
    .stat-lvl-debug  { color: #3a5080; }
    .stat-lvl-info   { color: #2a6080; }
    .stat-lvl-warn   { color: #6a5820; }
    .stat-lvl-error  { color: #7a3030; }
    .stat-topics-count { color: #2a4060; margin-left: auto; }

    /* Error jump indicator */
    #jump-indicator {
      font-size: 0.73rem;
      color: #e05050;
    }
```

- [ ] **Step 3: Read the stats bar HTML section** — find `id="statsbar"` to understand current element IDs.

- [ ] **Step 4: Replace the stats bar HTML** with the new styled version.

First, check `updateStats()` in the JS (around line 883) for all ID references it touches. In the current code, `updateStats()` references: `stat-total`, `stat-shown`, `stat-debug`, `stat-info`, `stat-warn`, `stat-error`, `stat-topics`, and `stat-topics-badge`. The `stat-topics-badge` reference is a conditional update (`if (badge) badge.textContent = ...`) so it is safe to omit — but you must verify this with a quick `grep` before proceeding:

```bash
grep -n "stat-topics-badge" templates/index.html
```

If the grep returns a JS reference with a null-guard (`if (badge)`), the element is optional and can be omitted from the new HTML. If it is referenced without a null-guard, you must include `<span id="stat-topics-badge">` in the replacement.

Find the `<div id="statsbar">` block in the HTML. It will look similar to:
```html
<div id="statsbar">
  <span>Total: <span id="stat-total" class="stat-val">0</span></span>
  <span>Shown: <span id="stat-shown" class="stat-val">0</span></span>
  ...
</div>
```

Replace with (preserve all JS-referenced `id` attributes):
```html
<div id="statsbar">
  <span>Total: <span id="stat-total" class="stat-pill stat-pill-total">0</span></span>
  <span>Shown: <span id="stat-shown" class="stat-pill stat-pill-shown">0</span></span>
  <span class="stat-lvl-debug">D: <span id="stat-debug">0</span></span>
  <span class="stat-lvl-info">I: <span id="stat-info">0</span></span>
  <span class="stat-lvl-warn">W: <span id="stat-warn">0</span></span>
  <span class="stat-lvl-error">E: <span id="stat-error">0</span></span>
  <span id="stat-topics" class="stat-topics-count">0 active</span>
  <span id="jump-indicator"></span>
</div>
```

- [ ] **Step 5: Verify in browser** — stats bar shows Total/Shown as pill badges. Level counts are colored inline text. "N active" is right-aligned.

- [ ] **Step 6: Commit**

```bash
git add templates/index.html
git commit -m "style: restyle stats bar with pill badges and inline colored level counts"
```

---

### Task 5: Restyle Topic Sidebar — list view CSS

**Files:**
- Modify: `templates/index.html:294-435` (Sidebar CSS — sidebar container, header, rows, groups, drag-drop)

- [ ] **Step 1: Replace the sidebar container CSS**

Replace:
```css
    /* ── Topics sidebar ──────────────────────────────────────────────── */
    #topics-sidebar {
      width: 260px;
      min-width: 260px;
      background: #13161f;
      border-left: 1px solid #22253a;
      display: flex;
```

With:
```css
    /* ── Topics sidebar ──────────────────────────────────────────────── */
    #topics-sidebar {
      width: 260px;
      min-width: 260px;
      background: var(--bg-sidebar);
      border-left: 1px solid var(--border-subtle);
      display: flex;
```

- [ ] **Step 2: Replace `.sidebar-header` CSS**

Replace:
```css
    .sidebar-header {
      display: flex; align-items: center;
      padding: 8px 10px; border-bottom: 1px solid #22253a;
      gap: 6px; flex-shrink: 0; background: #161924;
    }
    .sidebar-title { font-size: 0.8rem; font-weight: 600; color: #a0a8c8; flex: 1; }
    .topics-count { font-size: 0.7rem; color: #5a6080; }
```

With:
```css
    .sidebar-header {
      display: flex; align-items: center;
      padding: 8px 10px; border-bottom: 1px solid var(--border-subtle);
      gap: 6px; flex-shrink: 0; background: var(--bg-sidebar);
    }
    .sidebar-title { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); flex: 1; }
    .topics-count {
      font-size: 0.7rem; color: #4a7fa8;
      background: #0e2030; border: 1px solid #1a4060; border-radius: 10px;
      padding: 1px 7px;
    }
```

- [ ] **Step 3: Add sidebar search box CSS** (insert after `.topics-count` rule)

```css
    /* Sidebar search */
    #topic-search-input {
      width: 100%; background: var(--bg-elevated);
      border: 1px solid var(--border-input); border-radius: 6px;
      color: var(--text-primary); font-size: 0.78rem;
      padding: 5px 10px; outline: none; flex-shrink: 0;
    }
    #topic-search-input:focus { border-color: var(--border-active); }
    #topic-search-input::placeholder { color: var(--text-muted); }
    .sidebar-search-wrap {
      padding: 6px 8px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0;
    }
```

- [ ] **Step 4: Replace `.sidebar-content` CSS**

Replace:
```css
    .sidebar-content {
      flex: 1; overflow-y: auto; padding: 8px;
      display: flex; flex-direction: column; gap: 6px;
    }
```

With:
```css
    .sidebar-content {
      flex: 1; overflow-y: auto; padding: 8px;
      display: flex; flex-direction: column; gap: 6px;
    }
```

(Unchanged — keep as-is.)

- [ ] **Step 5: Replace `#btn-new-topic` CSS**

Replace:
```css
    #btn-new-topic {
      width: 100%; font-size: 0.78rem; padding: 6px;
      background: #1a2535; border-color: #2a4060; color: #5b9bd5;
    }
    #btn-new-topic:hover { background: #1e2e45; }
```

With:
```css
    #btn-new-topic {
      flex: 1; font-size: 0.78rem; padding: 6px;
      background: linear-gradient(135deg, #1a3a5a, #153050);
      border-color: var(--border-active); color: var(--accent-blue); font-weight: 500;
    }
    #btn-new-topic:hover { background: linear-gradient(135deg, #1e4468, #173858); }
```

- [ ] **Step 6: Replace `.topic-row` and related CSS**

Replace:
```css
    .topic-row {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 4px; border-radius: 5px;
      border: 1px solid #1e2238; background: #161924;
    }
    .topic-row:hover { background: #1c2030; }
    .topic-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .topic-info { flex: 1; min-width: 0; }
    .topic-name { font-size: 0.78rem; color: #c0c8e8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topic-pattern { font-size: 0.68rem; color: #4a5070; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topic-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .icon-btn {
      background: none; border: none; padding: 2px 4px;
      font-size: 0.85rem; color: #4a5070; cursor: pointer; border-radius: 3px;
    }
    .icon-btn:hover { background: #22263a; color: #a0a8c8; }
    .icon-btn.toggle-btn.active { color: #5b9bd5; }
```

With:
```css
    .topic-row {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 8px; border-radius: 6px;
      border: 1px solid #161820; background: var(--bg-sidebar);
      position: relative;
    }
    .topic-row:hover { background: var(--bg-card); }
    .topic-row.active-topic { background: var(--bg-card-active); border-color: #1e3050; }
    .topic-dot {
      width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
      /* glow applied inline via JS: box-shadow: 0 0 6px <color>55 */
    }
    .topic-info { flex: 1; min-width: 0; }
    .topic-name { font-size: 0.8rem; color: #4a5880; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topic-row.active-topic .topic-name { color: #c0cce8; font-weight: 500; }
    .topic-pattern { font-size: 0.68rem; color: var(--text-muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .topic-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .icon-btn {
      width: 22px; height: 22px; padding: 0;
      font-size: 0.8rem; color: var(--text-muted); cursor: pointer;
      border-radius: 4px; border: 1px solid var(--border-default);
      background: none; display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: #182030; color: var(--text-primary); }
    .icon-btn.toggle-btn.active { color: var(--accent-blue); }

    /* ⋯ overflow dropdown */
    .topic-overflow-menu {
      position: absolute; top: 100%; right: 0; z-index: 100;
      background: var(--bg-elevated); border: 1px solid #2a3050;
      border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      padding: 4px; min-width: 100px; margin-top: 2px;
    }
    .topic-overflow-menu .menu-item {
      font-size: 0.8rem; color: #f87171; padding: 6px 10px;
      border-radius: 4px; cursor: pointer; display: block;
      background: none; border: none; width: 100%; text-align: left;
    }
    .topic-overflow-menu .menu-item:hover { background: #2a1010; }
```

- [ ] **Step 7: Replace group-related CSS** (group header, group name, group actions)

Replace:
```css
    .group-header {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 4px 4px 2px; border-radius: 4px;
      cursor: default; user-select: none;
      border-top: 1px solid #22253a; margin-top: 4px;
    }
    .group-header:first-child { border-top: none; margin-top: 0; }
    .group-collapse-btn {
      background: none; border: none; color: #5a6080;
      font-size: 0.7rem; padding: 0 2px; cursor: pointer; line-height: 1; flex-shrink: 0;
    }
    .group-collapse-btn:hover { color: #a0a8c8; }
    .group-name-span { font-size: 0.75rem; font-weight: 600; color: #7080a8; flex: 1;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .group-name-input {
      font-size: 0.75rem; font-weight: 600; color: #c0c8e8;
      background: #1e2132; border: 1px solid #5b9bd5; border-radius: 3px;
      padding: 1px 5px; flex: 1; outline: none;
    }
    .group-actions { display: flex; gap: 1px; flex-shrink: 0; }
    .group-topics { padding-left: 10px; display: flex; flex-direction: column; gap: 4px; }
    .group-topics.collapsed-body { display: none; }
```

With:
```css
    .group-header {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 4px 4px 2px; border-radius: 4px;
      cursor: default; user-select: none;
      border-top: 1px solid var(--border-subtle); margin-top: 4px;
    }
    .group-header:first-child { border-top: none; margin-top: 0; }
    .group-collapse-btn {
      background: none; border: none; color: var(--text-secondary);
      font-size: 0.7rem; padding: 0 2px; cursor: pointer; line-height: 1; flex-shrink: 0;
    }
    .group-collapse-btn:hover { color: var(--text-primary); }
    .group-name-span { font-size: 0.67rem; font-weight: 600; color: #2a3458; flex: 1;
      text-transform: uppercase; letter-spacing: 0.1em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .group-name-input {
      font-size: 0.75rem; font-weight: 600; color: var(--text-primary);
      background: var(--bg-elevated); border: 1px solid var(--border-active); border-radius: 4px;
      padding: 1px 5px; flex: 1; outline: none;
    }
    .group-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .group-topics { padding-left: 10px; display: flex; flex-direction: column; gap: 4px; }
    .group-topics.collapsed-body { display: none; }
```

- [ ] **Step 8: Restyle `.sidebar-nav-btns`**

Replace:
```css
    .sidebar-nav-btns { display: flex; gap: 4px; margin-bottom: 4px; }
    .sidebar-nav-btns button { flex: 1; font-size: 0.72rem; padding: 4px 4px; }
```

With:
```css
    .sidebar-nav-btns { display: flex; gap: 4px; margin-bottom: 4px; }
    .sidebar-nav-btns button {
      flex: 1; font-size: 0.72rem; padding: 4px 4px;
      background: var(--bg-elevated); border: 1px solid var(--border-input); color: var(--text-secondary);
    }
    #topic-nav-indicator { color: #2a3458; font-size: 0.7rem; }
```

- [ ] **Step 9: Verify in browser** — sidebar has correct background, topic rows are taller with rounded corners, group labels are smaller uppercase. No ⋯ button yet (that's Task 6).

- [ ] **Step 10: Commit**

```bash
git add templates/index.html
git commit -m "style: restyle topic sidebar list view CSS — new palette, taller rows, overflow menu styles"
```

---

### Task 6: Update Sidebar HTML — search box, action buttons row, ⋯ menu

**Files:**
- Modify: `templates/index.html` (Sidebar HTML section, around lines 620–690)

- [ ] **Step 1: Read the sidebar HTML** (lines 620–685) to see the exact current structure.

- [ ] **Step 2: Add sidebar search box below the sidebar header**

Find the sidebar list view section. It starts with `<div id="topic-list-view"`. Inside it find the `.sidebar-header` div. After the `.sidebar-header` div (and before the `.sidebar-content` div), insert:

```html
        <div class="sidebar-search-wrap">
          <input type="text" id="topic-search-input" placeholder="🔍 Search topics…" />
        </div>
```

- [ ] **Step 3: Convert the action buttons to a flex row**

Find the `#btn-new-topic` button. Currently it's a full-width button inside `.sidebar-content`. Wrap it together with `#btn-new-group` in a flex row:

Replace the existing action buttons section (look for `btn-new-topic` and `btn-new-group`):
```html
        <button id="btn-new-topic">+ New Topic</button>
        <button id="btn-new-group">+ Group</button>
```

With:
```html
        <div style="display:flex;gap:6px;flex-shrink:0;padding:0 0 4px 0;">
          <button id="btn-new-topic">+ New Topic</button>
          <button id="btn-new-group" style="background:var(--bg-elevated);border-color:var(--border-input);color:var(--text-secondary);">+ Group</button>
        </div>
```

> **Note:** Read the actual HTML carefully — the button structure might be inside `.sidebar-content` or between the search div and the list. Adjust the wrapping to match what you find.

- [ ] **Step 4: Update `renderTopicRows` JS to add ⋯ button and glow dot, and remove inline delete button**

Find `function renderTopicRows(topics, groupId)` around line 1273. Replace:

```js
function renderTopicRows(topics, groupId) {
  return topics.map(t => `
    <div class="topic-row" draggable="true" data-id="${t.id}" data-group-id="${groupId||''}">
      <span class="topic-dot" style="background:${t.color}"></span>
      <div class="topic-info">
        <div class="topic-name">${esc(t.name)}</div>
        <div class="topic-pattern">${esc(t.pattern.length > 26 ? t.pattern.slice(0, 26) + '\u2026' : t.pattern)}</div>
      </div>
      <div class="topic-actions">
        <button class="icon-btn toggle-btn${t.enabled?' active':''}" data-id="${t.id}" title="${t.enabled?'Disable':'Enable'}">${t.enabled?'&#x25CF;':'&#x25CB;'}</button>
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">&#9998;</button>
        <button class="icon-btn delete-btn" data-id="${t.id}" title="Delete">&#128465;</button>
      </div>
    </div>`).join('');
}
```

With:

```js
function renderTopicRows(topics, groupId) {
  return topics.map(t => `
    <div class="topic-row${t.enabled?' active-topic':''}" draggable="true" data-id="${t.id}" data-group-id="${groupId||''}">
      <span class="topic-dot" style="background:${t.color};box-shadow:0 0 6px ${t.color}55"></span>
      <div class="topic-info">
        <div class="topic-name">${esc(t.name)}</div>
        <div class="topic-pattern">${esc(t.pattern.length > 26 ? t.pattern.slice(0, 26) + '\u2026' : t.pattern)}</div>
      </div>
      <div class="topic-actions">
        <button class="icon-btn toggle-btn${t.enabled?' active':''}" data-id="${t.id}" title="${t.enabled?'Disable':'Enable'}">${t.enabled?'&#x25CF;':'&#x25CB;'}</button>
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">&#9998;</button>
        <button class="icon-btn overflow-btn" data-id="${t.id}" title="More">&#x22EF;</button>
      </div>
    </div>`).join('');
}
```

- [ ] **Step 5: Update `renderTopicList` JS to wire ⋯ button and remove old `.delete-btn` wiring**

Find the block in `renderTopicList` that wires topic-level buttons (around line 1244):

```js
  // Wire topic-level buttons
  list.querySelectorAll('.toggle-btn').forEach(btn =>
    btn.addEventListener('click', () => toggleTopic(btn.dataset.id)));
  list.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => showEditView(topicsState.find(t => t.id === btn.dataset.id))));
  list.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteTopic(btn.dataset.id)));
```

Replace with:

```js
  // Wire topic-level buttons
  list.querySelectorAll('.toggle-btn').forEach(btn =>
    btn.addEventListener('click', () => toggleTopic(btn.dataset.id)));
  list.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      _modalOpenedBy = btn;
      openTopicModal(topicsState.find(t => t.id === btn.dataset.id));
    }));
  list.querySelectorAll('.overflow-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); toggleTopicOverflowMenu(btn); }));
```

> **Note:** `openTopicModal` will be defined in Task 7. Keep this reference — it will not error until Task 7 is done only if `renderTopicList` is called without the modal existing; since the modal is added in Task 7 before wiring is called, this is fine.

- [ ] **Step 6: Add `toggleTopicOverflowMenu` JS function**

After `function renderTopicRows(...)`, add:

```js
let _activeOverflowMenu = null;

function toggleTopicOverflowMenu(btn) {
  // Close any existing menu
  if (_activeOverflowMenu) {
    _activeOverflowMenu.remove();
    _activeOverflowMenu = null;
    return;
  }
  const topicId = btn.dataset.id;
  const row = btn.closest('.topic-row');
  const menu = document.createElement('div');
  menu.className = 'topic-overflow-menu';
  menu.innerHTML = `<button class="menu-item" data-id="${topicId}">🗑 Delete</button>`;
  row.appendChild(menu);
  _activeOverflowMenu = menu;
  menu.querySelector('.menu-item').addEventListener('click', e => {
    e.stopPropagation();
    menu.remove();
    _activeOverflowMenu = null;
    deleteTopic(topicId);
  });
}

// Dismiss overflow menu on outside click
document.addEventListener('click', () => {
  if (_activeOverflowMenu) {
    _activeOverflowMenu.remove();
    _activeOverflowMenu = null;
  }
});
```

- [ ] **Step 7: Wire sidebar search input** — add after the existing topic event wiring section (around line 1972):

```js
document.getElementById('topic-search-input').addEventListener('input', () => {
  renderTopicList();
});
```

- [ ] **Step 8: Update `renderTopicList` to filter by search text**

In `renderTopicList`, find the line that filters ungrouped topics:
```js
  const ungrouped = topicsState.filter(t => !t.group_id);
```

Replace it with:
```js
  const searchQuery = (document.getElementById('topic-search-input')?.value || '').toLowerCase().trim();
  const visibleTopics = searchQuery
    ? topicsState.filter(t => t.name.toLowerCase().includes(searchQuery))
    : topicsState;
  const ungrouped = visibleTopics.filter(t => !t.group_id);
```

And update the group member filter below it:
```js
    const members = topicsState.filter(t => t.group_id === g.id);
```
→
```js
    const members = visibleTopics.filter(t => t.group_id === g.id);
```

- [ ] **Step 9: Verify in browser** — sidebar has search box, topic rows have ⋯ button, clicking ⋯ shows "🗑 Delete" dropdown, clicking elsewhere closes it. Typing in search box filters the topic list. Active topics have `.active-topic` class with brighter name text.

- [ ] **Step 10: Commit**

```bash
git add templates/index.html
git commit -m "feat: sidebar search box, ⋯ overflow menu replacing delete button, glow dot, active row highlight"
```

---

### Task 7: Add Topic Edit Modal

**Files:**
- Modify: `templates/index.html` (HTML — add modal overlay before `</body>`)
- Modify: `templates/index.html` (JS — add modal CSS, `openTopicModal`/`closeTopicModal` replacing `showEditView`/`showListView`)

This is the largest task. Proceed methodically.

#### 7a: Add modal CSS

- [ ] **Step 1: Add modal CSS** — insert after the existing events editor CSS (after `.event-form-actions` rules, before `/* ── Timeline panel ──`):

```css
    /* ── Topic Edit Modal ──────────────────────────────────────────── */
    #topic-modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(2px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #topic-modal-backdrop.open { display: flex; }
    #topic-modal {
      background: var(--bg-elevated);
      border: 1px solid #2a3050;
      border-radius: 10px;
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 60px rgba(0,0,0,0.7);
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex; align-items: center;
      padding: 14px 18px; border-bottom: 1px solid var(--border-default);
      background: var(--bg-card); flex-shrink: 0;
    }
    #modal-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); flex: 1; }
    #btn-modal-close {
      width: 28px; height: 28px; padding: 0;
      background: none; border: 1px solid #2a3050; border-radius: 6px;
      color: var(--text-secondary); font-size: 1rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    #btn-modal-close:hover { background: #182030; color: var(--text-primary); }
    .modal-body {
      padding: 18px; display: flex; flex-direction: column; gap: 14px; flex: 1;
    }
    .modal-field-label {
      font-size: 0.72rem; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: 0.08em;
      display: block; margin-bottom: 5px;
    }
    .modal-input {
      width: 100%; background: var(--bg-card);
      border: 1px solid #2a3050; border-radius: 6px;
      padding: 8px 12px; color: var(--text-primary); font-size: 0.85rem;
      outline: none; transition: border-color .15s;
    }
    .modal-input:focus { border-color: var(--border-active); }
    .modal-input::placeholder { color: var(--text-muted); }
    #modal-regex-input { font-family: monospace; }
    .modal-regex-feedback { font-size: 0.72rem; margin-top: 4px; min-height: 1.2em; }
    .modal-regex-feedback.valid  { color: #34d399; }
    .modal-regex-feedback.invalid { color: #f87171; }
    #modal-group-select {
      width: 100%; background: var(--bg-card);
      border: 1px solid #2a3050; border-radius: 6px;
      color: #8090b8; padding: 8px 12px; font-size: 0.85rem;
      outline: none; appearance: none; cursor: pointer;
    }
    #modal-group-select:focus { border-color: var(--border-active); }
    .modal-events-section { border-top: 1px solid var(--border-default); padding-top: 14px; }
    .modal-events-header { display: flex; align-items: center; margin-bottom: 10px; }
    #modal-events-label { font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; flex: 1; }
    #btn-modal-add-event {
      font-size: 0.75rem; padding: 4px 10px;
      background: var(--bg-card); border: 1px solid #2a3050;
      border-radius: 5px; color: var(--accent-blue);
    }
    .modal-event-row {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; background: var(--bg-card);
      border-radius: 6px; border: 1px solid #1a2030; margin-bottom: 4px;
    }
    .modal-event-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .modal-event-name { flex: 1; font-size: 0.8rem; color: #8090b8; }
    .modal-event-badge {
      font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; border: 1px solid;
    }
    .modal-event-badge.metric { background: #0e2030; border-color: #1a4060; color: #38bdf8; }
    .modal-event-badge.dot    { background: #1a1e2e; border-color: #2a3050; color: #6878a8; }
    .modal-event-badge.gantt  { background: #1a1228; border-color: #2a1a40; color: #a78bfa; }
    .modal-event-inline-form {
      background: #0e1220; border: 1px solid #2a3050; border-radius: 6px;
      padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 6px;
    }
    .modal-event-inline-form input {
      width: 100%; background: var(--bg-card);
      border: 1px solid #2a3050; border-radius: 5px;
      color: var(--text-primary); font-size: 0.8rem; padding: 6px 10px;
      outline: none; box-sizing: border-box;
    }
    .modal-event-inline-form input:focus { border-color: var(--border-active); }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 18px; border-top: 1px solid var(--border-default);
      background: var(--bg-card); flex-shrink: 0;
    }
    #btn-modal-cancel {
      font-size: 0.82rem; padding: 7px 16px;
      background: var(--bg-elevated); border: 1px solid #2a3050;
      border-radius: 6px; color: #6878a8;
    }
    #btn-modal-save {
      font-size: 0.82rem; padding: 7px 16px;
      background: linear-gradient(135deg, #1a3a5a, #153050);
      border: 1px solid var(--border-active); border-radius: 6px;
      color: var(--accent-blue); font-weight: 500;
    }
    #btn-modal-save:disabled { opacity: 0.4; cursor: default; }
```

- [ ] **Step 2: Commit CSS only**

```bash
git add templates/index.html
git commit -m "style: add topic edit modal CSS"
```

#### 7b: Add modal HTML

- [ ] **Step 3: Add modal HTML** — insert just before `</body>`:

```html
<!-- ── Topic Edit Modal ───────────────────────────────────────────────────── -->
<div id="topic-modal-backdrop">
  <div id="topic-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

    <div class="modal-header">
      <span id="modal-title">Edit Topic</span>
      <button id="btn-modal-close" title="Close">&#x2715;</button>
    </div>

    <div class="modal-body">
      <!-- Name -->
      <div>
        <label class="modal-field-label" for="modal-name-input">Name</label>
        <input type="text" id="modal-name-input" class="modal-input" placeholder="e.g. Performance" />
      </div>

      <!-- Regex -->
      <div>
        <label class="modal-field-label" for="modal-regex-input">Regex Pattern</label>
        <input type="text" id="modal-regex-input" class="modal-input" placeholder="e.g. PERFORMANCE|latency" />
        <div id="modal-regex-feedback" class="modal-regex-feedback"></div>
      </div>

      <!-- Color -->
      <div>
        <span class="modal-field-label">Color</span>
        <div id="modal-color-palette" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
      </div>

      <!-- Group -->
      <div>
        <label class="modal-field-label" for="modal-group-select">Group</label>
        <select id="modal-group-select">
          <option value="">&#8212; Ungrouped &#8212;</option>
        </select>
      </div>

      <!-- Events -->
      <div class="modal-events-section">
        <div class="modal-events-header">
          <span id="modal-events-label">Events</span>
          <button id="btn-modal-add-event">+ Add Event</button>
        </div>
        <div id="modal-events-list"></div>
      </div>
    </div>

    <div class="modal-footer">
      <button id="btn-modal-cancel">Cancel</button>
      <button id="btn-modal-save" disabled>Save</button>
    </div>

  </div>
</div>
```

- [ ] **Step 4: Commit HTML**

```bash
git add templates/index.html
git commit -m "feat: add topic edit modal HTML overlay"
```

#### 7c: Add modal JS — open/close/save

- [ ] **Step 5: Add `openTopicModal`, `closeTopicModal`, and related JS functions**

Add a new section after `function showListView()` (around line 1293). The existing `showEditView` and `showListView` will be kept temporarily for backward compat, but `openTopicModal`/`closeTopicModal` will replace their role.

Insert the following block:

```js
// ── Topic Edit Modal ─────────────────────────────────────────────────────
let modalSelectedColor = TOPIC_COLORS[0];
let _modalOpenedBy = null;  // button that opened the modal (for focus restore)

function openTopicModal(topic = null) {
  editingTopicId = topic ? topic.id : null;
  document.getElementById('modal-title').textContent = topic ? 'Edit Topic' : 'New Topic';
  document.getElementById('modal-name-input').value = topic ? topic.name : '';
  document.getElementById('modal-regex-input').value = topic ? topic.pattern : '';
  modalSelectedColor = topic ? topic.color : TOPIC_COLORS[0];

  // Populate group select
  const sel = document.getElementById('modal-group-select');
  sel.innerHTML = '<option value="">\u2014 Ungrouped \u2014</option>' +
    groupsState.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
  sel.value = topic ? (topic.group_id || '') : '';

  renderModalColorPalette();
  validateModalRegex();
  renderModalEventsList(topic);

  // Show backdrop
  document.getElementById('topic-modal-backdrop').classList.add('open');
  // Focus name input
  setTimeout(() => document.getElementById('modal-name-input').focus(), 50);
}

function closeTopicModal() {
  document.getElementById('topic-modal-backdrop').classList.remove('open');
  editingTopicId = null;
  if (_modalOpenedBy) { _modalOpenedBy.focus(); _modalOpenedBy = null; }
}

function renderModalColorPalette() {
  const palette = document.getElementById('modal-color-palette');
  if (!palette) return;
  palette.innerHTML = TOPIC_COLORS.map((c, i) =>
    `<span class="color-swatch${c === modalSelectedColor ? ' selected' : ''}" style="background:${c}" data-color="${c}" title="${c}"></span>`
  ).join('');
  palette.querySelectorAll('.color-swatch').forEach(s =>
    s.addEventListener('click', () => { modalSelectedColor = s.dataset.color; renderModalColorPalette(); }));
}

function validateModalRegex() {
  const pattern = document.getElementById('modal-regex-input').value.trim();
  const feedback = document.getElementById('modal-regex-feedback');
  const saveBtn = document.getElementById('btn-modal-save');
  const name = document.getElementById('modal-name-input').value.trim();
  if (!pattern) {
    feedback.textContent = '';
    feedback.className = 'modal-regex-feedback';
    saveBtn.disabled = true;
    return;
  }
  try {
    const re = new RegExp(pattern, 'i');
    const matchCount = allLogs.filter(l =>
      re.test(l.message + ' ' + l.class_method + ' ' + l.source_file)).length;
    feedback.textContent = '\u2713 matches ' + matchCount.toLocaleString() + ' rows';
    feedback.className = 'modal-regex-feedback valid';
    saveBtn.disabled = !name;
  } catch (e) {
    feedback.textContent = '\u2717 Invalid: ' + e.message;
    feedback.className = 'modal-regex-feedback invalid';
    saveBtn.disabled = true;
  }
}

async function saveTopicModal() {
  const name = document.getElementById('modal-name-input').value.trim();
  const pattern = document.getElementById('modal-regex-input').value.trim();
  const group_id = document.getElementById('modal-group-select').value || null;
  const body = { name, pattern, color: modalSelectedColor, group_id };
  try {
    const url = editingTopicId ? '/api/topics/' + editingTopicId : '/api/topics';
    const method = editingTopicId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json(); alert('Error: ' + (d.error || 'Unknown')); return; }
    closeTopicModal();
    await loadTopics();
  } catch (e) { alert('Network error: ' + e.message); }
}
```

- [ ] **Step 6: Add modal event list rendering**

Add after `saveTopicModal`:

```js
function renderModalEventsList(topic) {
  const container = document.getElementById('modal-events-list');
  const events = (topic && topic.events) || [];
  const label = document.getElementById('modal-events-label');
  label.textContent = 'Events' + (events.length ? ' (' + events.length + ')' : '');

  if (events.length === 0) {
    container.innerHTML = '<div style="font-size:0.72rem;color:var(--text-muted);padding:4px 0;">No events yet.</div>';
    return;
  }
  container.innerHTML = events.map(ev => {
    const mode = ev.value_regex ? 'metric' : ((ev.end_keywords||[]).length > 0 ? 'gantt' : 'dot');
    return `
    <div class="modal-event-row" data-eid="${ev.id}">
      <span class="modal-event-dot" style="background:${ev.color}"></span>
      <span class="modal-event-name">${esc(ev.name)}</span>
      <span class="modal-event-badge ${mode}">${mode}</span>
      <button class="icon-btn modal-ev-edit-btn" data-eid="${ev.id}" title="Edit">&#9998;</button>
      <button class="icon-btn modal-ev-del-btn" data-eid="${ev.id}" title="Delete">&#128465;</button>
    </div>`;
  }).join('');

  container.querySelectorAll('.modal-ev-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openModalEventForm(topic, topic.events.find(e => e.id === btn.dataset.eid))));
  container.querySelectorAll('.modal-ev-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteModalEvent(editingTopicId, btn.dataset.eid)));
}

function openModalEventForm(topic, event = null) {
  // Remove any existing inline form
  const existing = document.getElementById('modal-event-inline-form');
  if (existing) existing.remove();

  const container = document.getElementById('modal-events-list');
  const form = document.createElement('div');
  form.id = 'modal-event-inline-form';
  form.className = 'modal-event-inline-form';
  form.innerHTML = `
    <input type="hidden" id="modal-event-edit-id" value="${event ? event.id : ''}" />
    <div>
      <span class="modal-field-label">Name</span>
      <input type="text" id="modal-event-name-input" placeholder="Event name…" value="${event ? esc(event.name) : ''}" />
    </div>
    <div>
      <span class="modal-field-label">Start keywords (comma-separated)</span>
      <input type="text" id="modal-event-start-kw-input" placeholder="e.g. connect, login" value="${event ? esc((event.start_keywords||[]).join(', ')) : ''}" />
    </div>
    <div>
      <span class="modal-field-label">End keywords (optional)</span>
      <input type="text" id="modal-event-end-kw-input" placeholder="e.g. disconnect" value="${event ? esc((event.end_keywords||[]).join(', ')) : ''}" />
    </div>
    <div>
      <span class="modal-field-label">Value regex (optional — enables metric chart)</span>
      <input type="text" id="modal-event-value-regex-input" placeholder="e.g. CPU:([\d.]+)" value="${event ? esc(event.value_regex||'') : ''}" />
    </div>
    <div>
      <span class="modal-field-label">Color</span>
      <div id="modal-event-color-palette" style="display:flex;flex-wrap:wrap;gap:5px;"></div>
    </div>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <button id="btn-modal-event-save" class="primary" style="flex:1;font-size:0.78rem;">Save</button>
      <button id="btn-modal-event-cancel" style="flex:1;font-size:0.78rem;">Cancel</button>
    </div>`;
  container.appendChild(form);

  // Color palette
  let evColor = event ? event.color : TOPIC_COLORS[0];
  function renderEvPalette() {
    const p = document.getElementById('modal-event-color-palette');
    if (!p) return;
    p.innerHTML = TOPIC_COLORS.map(c =>
      `<span class="color-swatch${c===evColor?' selected':''}" style="background:${c}" data-color="${c}"></span>`).join('');
    p.querySelectorAll('.color-swatch').forEach(sw =>
      sw.addEventListener('click', () => { evColor = sw.dataset.color; renderEvPalette(); }));
  }
  renderEvPalette();

  document.getElementById('modal-event-name-input').focus();

  const saveEv = async () => {
    if (!editingTopicId) return;
    const eid = document.getElementById('modal-event-edit-id').value;
    const name = document.getElementById('modal-event-name-input').value.trim();
    const start_keywords = document.getElementById('modal-event-start-kw-input').value.trim();
    const end_keywords   = document.getElementById('modal-event-end-kw-input').value.trim();
    const value_regex    = document.getElementById('modal-event-value-regex-input').value.trim();
    if (!name) return;
    const body = { name, start_keywords, end_keywords, value_regex, color: evColor };
    const url = eid ? `/api/topics/${editingTopicId}/events/${eid}` : `/api/topics/${editingTopicId}/events`;
    const method = eid ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json(); alert('Error: ' + (d.error||'Unknown')); return; }
    form.remove();
    await loadTopics();
    // Re-open modal for same topic
    const updated = topicsState.find(t => t.id === editingTopicId);
    if (updated) { editingTopicId = updated.id; renderModalEventsList(updated); }
  };

  document.getElementById('btn-modal-event-save').addEventListener('click', saveEv);
  document.getElementById('btn-modal-event-cancel').addEventListener('click', () => form.remove());
  ['modal-event-name-input','modal-event-start-kw-input','modal-event-end-kw-input','modal-event-value-regex-input'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') saveEv();
      if (e.key === 'Escape') form.remove();
    });
  });
}

async function deleteModalEvent(topicId, eventId) {
  if (!confirm('Delete this event?')) return;
  await fetch(`/api/topics/${topicId}/events/${eventId}`, { method: 'DELETE' });
  await loadTopics();
  const updated = topicsState.find(t => t.id === topicId);
  if (updated) { editingTopicId = updated.id; renderModalEventsList(updated); }
}
```

- [ ] **Step 7: Wire modal event listeners** (add after the existing `// Topics event wiring` section):

```js
// Modal wiring
document.getElementById('btn-modal-close').addEventListener('click', closeTopicModal);
document.getElementById('btn-modal-cancel').addEventListener('click', closeTopicModal);
document.getElementById('btn-modal-save').addEventListener('click', saveTopicModal);
document.getElementById('btn-modal-add-event').addEventListener('click', () => {
  const topic = topicsState.find(t => t.id === editingTopicId);
  openModalEventForm(topic, null);
});
document.getElementById('topic-modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('topic-modal-backdrop')) closeTopicModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('topic-modal-backdrop').classList.contains('open')) {
    closeTopicModal();
  }
});
// Regex validation wiring
const debouncedModalValidate = debounce(validateModalRegex, 300);
document.getElementById('modal-regex-input').addEventListener('input', debouncedModalValidate);
document.getElementById('modal-name-input').addEventListener('input', () => {
  const name = document.getElementById('modal-name-input').value.trim();
  const feedback = document.getElementById('modal-regex-feedback');
  const saveBtn = document.getElementById('btn-modal-save');
  if (feedback.classList.contains('valid')) saveBtn.disabled = !name;
});
// Enter in regex field saves if valid
document.getElementById('modal-regex-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const saveBtn = document.getElementById('btn-modal-save');
    if (!saveBtn.disabled) saveTopicModal();
  }
});
```

- [ ] **Step 8: Update `btn-new-topic` to call `openTopicModal` instead of `showEditView`**

Find:
```js
document.getElementById('btn-new-topic').addEventListener('click', () => showEditView(null));
```

Replace:
```js
document.getElementById('btn-new-topic').addEventListener('click', () => {
  _modalOpenedBy = document.getElementById('btn-new-topic');
  openTopicModal(null);
});
```

- [ ] **Step 9: Verify in browser** — clicking "+ New Topic" opens modal overlay with backdrop blur. Regex validation updates live. Clicking backdrop closes. Escape closes. Save creates topic. Edit (✎) on a topic opens modal in edit mode. Delete via ⋯ menu still works. Events section in modal shows existing events; "+ Add Event" opens inline form.

- [ ] **Step 10: Commit**

```bash
git add templates/index.html
git commit -m "feat: topic edit modal — replaces inline sidebar edit view with centered overlay"
```

---

### Task 8: Remove old sidebar edit view and clean up dead code

**Files:**
- Modify: `templates/index.html` (HTML — remove `#topic-edit-view` block; JS — remove wiring for old edit view)

- [ ] **Step 1: Remove the `#topic-edit-view` HTML div** (lines 684–730 approximately):

```html
    <!-- Edit View -->
    <div id="topic-edit-view" style="display:none">
      ...
    </div>
```

Delete this entire block.

- [ ] **Step 2: Remove orphaned JS event wiring** for old edit view buttons. Find and remove:

```js
document.getElementById('btn-back-topics').addEventListener('click', showListView);
document.getElementById('btn-cancel-topic').addEventListener('click', showListView);
document.getElementById('btn-save-topic').addEventListener('click', saveTopic);
```

Also remove the wiring for the inline event form that was inside the sidebar:
```js
document.getElementById('btn-add-event').addEventListener('click', () => {
```
and related `btn-save-event`, `btn-cancel-event`, `event-name-input`, `event-start-kw-input`, `event-end-kw-input`, `event-value-regex-input` keydown listeners.

- [ ] **Step 3: Remove or keep `showEditView`, `showListView`, `saveTopic`, `renderColorPalette`, `validateRegex`, `renderEventsList`, `renderEventColorPalette`, `openEventForm`, `saveEvent`, `deleteEvent`**

These functions are used only by the old inline edit view. They can be removed. However, be careful: verify none are called from other places (e.g., timeline code). Do a search for each function name before deleting.

Safe to remove after confirming no other callers:
- `showEditView` — replaced by `openTopicModal`
- `showListView` — replaced by `closeTopicModal`
- `saveTopic` — replaced by `saveTopicModal`
- `renderColorPalette` — replaced by `renderModalColorPalette`
- `validateRegex` — replaced by `validateModalRegex`
- `renderEventsList` — replaced by `renderModalEventsList`
- `renderEventColorPalette` — replaced by inline palette in `openModalEventForm`
- `openEventForm` — replaced by `openModalEventForm`
- `saveEvent` — inlined in `openModalEventForm`
- `deleteEvent` — replaced by `deleteModalEvent`

Also remove the CSS rules that only applied to the old sidebar edit view. **Before deleting each CSS class, run a grep to verify it has no other uses (especially in the timeline panel or JS)**:

```bash
# Run each of these before removing the corresponding CSS rule:
grep -n "field-label" templates/index.html
grep -n "topic-name-input\|topic-regex-input" templates/index.html
grep -n "regex-feedback" templates/index.html
grep -n "topic-color-palette" templates/index.html
grep -n "edit-actions" templates/index.html
grep -n "btn-back-topics" templates/index.html
grep -n "events-section" templates/index.html
grep -n "event-row" templates/index.html
grep -n "event-dot" templates/index.html
grep -n "event-name-lbl\|event-kw-lbl" templates/index.html
grep -n "event-inline-form" templates/index.html
grep -n "event-field-label\|event-field-hint" templates/index.html
grep -n "event-metric-badge" templates/index.html
grep -n "event-form-actions" templates/index.html
grep -n "event-color-palette" templates/index.html
```

Only remove a CSS rule if the grep shows zero remaining HTML usages (other than in the CSS definition itself). For each class, if the grep returns only the CSS definition line and no HTML usages — safe to delete. If the grep shows remaining HTML usages, keep the rule.

Classes confirmed safe to remove (sidebar-only):
- `.field-label`
- `#topic-name-input, #topic-regex-input` (the old sidebar inputs — different from `#modal-name-input`, `#modal-regex-input`)
- `.regex-feedback`
- `#topic-color-palette`
- `.color-swatch` — **keep** this one, it's reused by the modal color pickers
- `.edit-actions`
- `#btn-back-topics`
- `.events-section` (the sidebar one — distinct from `.modal-events-section`)
- `.event-row`, `.event-dot`, `.event-name-lbl`, `.event-kw-lbl` (sidebar versions — distinct from `.modal-event-row` etc.)
- `.event-inline-form` (sidebar version — distinct from `.modal-event-inline-form`)
- `.event-field-label`, `.event-field-hint`
- `.event-metric-badge` (the sidebar version — distinct from `.modal-event-badge`)
- `.event-form-actions`
- `.event-color-palette`

> **Caution:** `.tl-metric-row` is used by the timeline, not the sidebar — **do not remove it**.

- [ ] **Step 4: Verify in browser** — app works exactly as before but old inline edit view is gone. Modal still works. No JS errors in console.

- [ ] **Step 5: Commit**

```bash
git add templates/index.html
git commit -m "refactor: remove old inline sidebar edit view and dead code after modal migration"
```

---

### Task 9: Restyle Pagination Bar

**Files:**
- Modify: `templates/index.html:249-274` (Pagination CSS)

- [ ] **Step 1: Replace the pagination CSS block**

Replace:
```css
    /* ── Pagination ──────────────────────────────────────────────────── */
    #pagination {
      background: #13161f;
      border-top: 1px solid #1c1f2e;
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: #5a6080;
      flex-shrink: 0;
    }
    #pagination button { padding: 4px 10px; font-size: 0.75rem; }
    #pagination button:disabled { opacity: 0.3; cursor: default; }
    #page-info { min-width: 100px; text-align: center; color: #7a82a8; }
    .page-jump { display: flex; align-items: center; gap: 4px; }
    .page-jump input { width: 52px; padding: 4px 6px; }
    #per-page-sel {
      background: #1e2132;
      border: 1px solid #2e3250;
      border-radius: 5px;
      color: #b8bdd4;
      font-size: 0.78rem;
      padding: 4px 6px;
      cursor: pointer;
    }
```

With:
```css
    /* ── Pagination ──────────────────────────────────────────────────── */
    #pagination {
      background: var(--bg-toolbar);
      border-top: 1px solid var(--border-subtle);
      padding: 6px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      color: var(--text-secondary);
      flex-shrink: 0;
    }
    #pagination button { padding: 4px 10px; font-size: 0.75rem; }
    #pagination button:disabled { opacity: 0.3; cursor: default; }
    #page-info { min-width: 100px; text-align: center; color: var(--text-secondary); }
    .page-jump { display: flex; align-items: center; gap: 4px; }
    .page-jump input { width: 52px; padding: 4px 6px; }
    #per-page-sel {
      background: var(--bg-elevated);
      border: 1px solid var(--border-input);
      border-radius: 6px;
      color: var(--text-primary);
      font-size: 0.78rem;
      padding: 4px 6px;
      cursor: pointer;
    }
```

- [ ] **Step 2: Verify in browser** — pagination bar matches toolbar style.

- [ ] **Step 3: Commit**

```bash
git add templates/index.html
git commit -m "style: update pagination bar to match new dark theme tokens"
```

---

### Task 10: Final verification and polish pass

- [ ] **Step 1: Run the app and load a real Webex log file**

```bash
python app.py
```

Open `http://localhost:5001` in the browser.

- [ ] **Step 2: Verify visual checklist**

- [ ] Header: gradient bg, logo icon, gradient "Log Viewer" text
- [ ] Toolbar: single row (no wrapping), level chips with correct colors, "Warning" label, unchecked chips dim at opacity 0.35, Topic Viz button gradient style
- [ ] Stats bar: Total/Shown as pills, level counts colored inline text
- [ ] Sidebar: search box filters topics, topic rows taller, active topics highlighted, color dots glow, ⋯ shows delete dropdown
- [ ] Modal: opens on Edit and New Topic, backdrop blur, Escape/Cancel close, Save works, Events section works
- [ ] Global scrollbars: thin 4px dark scrollbars everywhere
- [ ] Pagination: matches toolbar style
- [ ] Log table: **unchanged**
- [ ] No JavaScript console errors

- [ ] **Step 3: Test critical functionality**

- [ ] Upload a log file → logs display correctly
- [ ] Level filter chips toggle → filtering works
- [ ] Search input filters rows
- [ ] Create a new topic via modal → appears in sidebar
- [ ] Edit a topic via modal → changes saved
- [ ] Delete a topic via ⋯ menu → topic removed
- [ ] Topic search box → filters list correctly
- [ ] Timeline / Topic Viz toggle → works as before
- [ ] Pagination works

- [ ] **Step 4: Fix any issues found, commit fixes**

```bash
git add templates/index.html
git commit -m "fix: polish pass adjustments after full verification"
```

---

## Summary

| Task | What it does | Files changed |
|------|-------------|---------------|
| 1 | CSS tokens + global scrollbar | index.html CSS |
| 2 | Header restyle | index.html CSS + HTML |
| 3 | Toolbar restyle + Warning label | index.html CSS + HTML |
| 4 | Stats bar restyle | index.html CSS + HTML |
| 5 | Sidebar list view CSS | index.html CSS |
| 6 | Sidebar search + ⋯ menu HTML/JS | index.html HTML + JS |
| 7 | Topic edit modal (CSS + HTML + JS) | index.html CSS + HTML + JS |
| 8 | Remove old inline edit view | index.html HTML + JS + CSS |
| 9 | Pagination restyle | index.html CSS |
| 10 | Final verification | — |
