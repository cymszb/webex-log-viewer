# Regex Search, Save as Topic & Copy Topic/Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add regex mode to the full-text search input, a "Save as Topic" button, a "Copy" button on topic rows, and a "Copy" button on event rows inside the topic modal.

**Architecture:** All changes are in `templates/index.html` (single-file app). Four independent features are implemented in sequence: CSS → HTML → JS for each feature, with the `highlight()` function refactored first since it affects rendering across all search modes.

**Tech Stack:** Vanilla JS, CSS custom properties, Flask backend (no backend changes needed).

---

## File Map

| File | Changes |
|------|---------|
| `templates/index.html` | All changes — CSS additions, HTML restructuring of search input, JS: new state variable, new functions, modified functions |
| `tests/test_app.py` | No changes needed — all existing 27 server-side tests must still pass |

---

### Task 1: Refactor `highlight()` to match against original string

The existing `highlight()` function (line 1057) escapes `str` before matching, which causes incorrect results when the term contains characters that `esc()` transforms. This task fixes it for both plain and regex modes, and is a prerequisite for Task 3.

**Files:**
- Modify: `templates/index.html` (lines 1057–1065)

- [ ] **Step 1: Read and understand the existing function**

Read lines 1057–1065 of `templates/index.html`. Current implementation:
```js
function highlight(str, term) {
  if (!term) return esc(str);
  const escaped = esc(str);
  const termEsc = esc(term);
  if (!termEsc) return escaped;
  // Simple case-insensitive replace
  const re = new RegExp(termEsc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return escaped.replace(re, m => '<mark>' + m + '</mark>');
}
```

- [ ] **Step 2: Replace with position-based implementation**

Replace the entire function body with:
```js
function highlight(str, term) {
  if (!term) return esc(str);
  let re;
  if (regexSearchMode) {
    try { re = new RegExp(term, 'gi'); } catch { return esc(str); }
  } else {
    re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  }
  // Match against original string; build escaped output with <mark> at correct positions
  let result = '';
  let lastIndex = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    result += esc(str.slice(lastIndex, m.index));
    result += '<mark>' + esc(m[0]) + '</mark>';
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) { re.lastIndex++; } // guard zero-length matches
  }
  result += esc(str.slice(lastIndex));
  return result;
}
```

Note: `regexSearchMode` is declared in Task 2. For now the function references it as a global — it will be `false` (default) until Task 3 wires it up. Plain-mode behaviour is unchanged.

- [ ] **Step 3: Add state variable placeholder**

Immediately before the `highlight` function, add:
```js
let regexSearchMode = false;
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd D:\Development\WebexApp_Log_Viewer
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 5: Manual smoke test**

Start the server (`python app.py`), load a log file, type something in the full-text search box. Confirm matches are still highlighted in the log table.

- [ ] **Step 6: Commit**

```bash
git add templates/index.html
git commit -m "refactor: highlight() matches against original string, guards zero-length regex"
```

---

### Task 2: Add CSS for regex search widget

Add all CSS needed for the new search input wrapper and buttons. No HTML or JS changes yet.

**Files:**
- Modify: `templates/index.html` (CSS section, after existing toolbar/input CSS around line 145–160)

- [ ] **Step 1: Locate insertion point**

Find the line:
```css
input[type="text"]:focus, input[type="search"]:focus { border-color: var(--border-active); }
```
(around line 155). New CSS goes after the existing input CSS block.

- [ ] **Step 2: Add CSS**

Insert after the existing input focus rule:
```css
/* ── Regex search widget ────────────────────────────────────────── */
/* Inherits base button style from global `button` selector */
#btn-regex-toggle { font-family: monospace; font-weight: 700; padding: 3px 7px; }
#btn-regex-toggle.active { background: #1a2f50; border-color: var(--border-active); color: var(--accent-blue); }

#search-input-wrap {
  display: flex;
  align-items: center;
  min-width: 200px;
  border: 1px solid var(--border-input);
  border-radius: 6px;
  background: var(--bg-elevated);
  padding: 0;
  transition: border-color .15s;
}
#search-input-wrap:not(.regex-active):not(.regex-invalid):focus-within {
  border-color: var(--border-active);
}
#search-input-wrap.regex-active  { border-color: var(--border-active); }
#search-input-wrap.regex-invalid { border-color: #ef4444; }
#search-input-wrap #search-input {
  flex: 1;
  min-width: 80px;
  border: none;
  background: transparent;
  padding: 5px 8px;
  color: var(--text-secondary);
  outline: none;
}
#search-input-wrap.regex-active  #search-input { font-family: monospace; color: #93c5fd; }
#search-input-wrap.regex-invalid #search-input { font-family: monospace; color: #f87171; }

#btn-save-as-topic {
  font-size: 0.68rem;
  padding: 2px 8px;
  margin-right: 4px;
  border-radius: 4px;
  border: 1px solid #10b981;
  background: #0f2e1a;
  color: #34d399;
  white-space: nowrap;
  flex-shrink: 0;
}
#btn-save-as-topic:hover { background: #133d22; }
```

- [ ] **Step 3: Run tests**

```bash
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 4: Commit**

```bash
git add templates/index.html
git commit -m "style: add CSS for regex search toggle, input wrapper and save-as-topic button"
```

---

### Task 3: Wire up regex search toggle and filtering

Replace the bare `<input id="search-input">` with a composite wrapper, add the `.*` toggle button, update `applyFilters()` to handle regex mode, and wire all events.

**Files:**
- Modify: `templates/index.html` (HTML ~line 727, JS ~lines 1011–1055, ~line 1185–1188)

- [ ] **Step 1: Replace HTML**

Find (around line 725–728):
```html
  <!-- Search -->
  <span class="toolbar-label">Search</span>
  <input type="text" id="search-input" placeholder="Full-text search…" style="width:200px;" />
```

Replace with:
```html
  <!-- Search -->
  <span class="toolbar-label">Search</span>
  <button id="btn-regex-toggle" title="Toggle regex search">.*</button>
  <div id="search-input-wrap">
    <input type="text" id="search-input" placeholder="Full-text search…" />
    <button id="btn-save-as-topic" style="display:none">Save as Topic</button>
  </div>
```

- [ ] **Step 2: Add `updateSearchWrapState()` helper**

Immediately after the `let regexSearchMode = false;` line added in Task 1, add:

```js
function updateSearchWrapState() {
  const wrap = document.getElementById('search-input-wrap');
  const val = document.getElementById('search-input').value.trim();
  if (!regexSearchMode) {
    wrap.classList.remove('regex-active', 'regex-invalid');
    document.getElementById('btn-save-as-topic').style.display = 'none';
    return;
  }
  let valid = false;
  if (val) {
    try { new RegExp(val); valid = true; } catch {}
  }
  wrap.classList.toggle('regex-active', valid);
  wrap.classList.toggle('regex-invalid', val.length > 0 && !valid);
  document.getElementById('btn-save-as-topic').style.display = valid ? '' : 'none';
}
```

- [ ] **Step 3: Update `applyFilters()` — search value reading**

Find (around line 1013):
```js
  const search    = document.getElementById('search-input').value.trim().toLowerCase();
```
Replace with:
```js
  const rawSearch = document.getElementById('search-input').value.trim();
  const search    = regexSearchMode ? rawSearch : rawSearch.toLowerCase();
```

- [ ] **Step 4: Update `applyFilters()` — hoist regex compile and update filter block**

Find the existing search filter block inside the `allLogs.filter` callback (around lines 1027–1033):
```js
    if (search) {
      const haystack = [l.timestamp, l.level, l.pid, l.tid,
                        l.source_file, l.line_num, l.class_method, l.message,
                        l.class_method + '::' + l.message]
                        .join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
```

This block must be replaced — but first, add the regex pre-compile block **above** the `filteredLogs = allLogs.filter(...)` call. Find the line:
```js
  const compiledTopics = getCompiledTopics();
```
After that line, insert:
```js
  // Pre-compile search regex (hoisted above filter loop — invalid regex exits early)
  let searchRx = null;
  if (regexSearchMode && search) {
    try {
      searchRx = new RegExp(search, 'i');
    } catch {
      filteredLogs = [];
      errorJumpIdx = -1; topicJumpIdx = -1; currentPage = 1;
      updateStats(); renderPage(1);
      return;
    }
  }
```

Then replace the search filter block inside `allLogs.filter`:
```js
    if (search) {
      const haystack = [l.timestamp, l.level, l.pid, l.tid,
                        l.source_file, l.line_num, l.class_method, l.message,
                        l.class_method + '::' + l.message].join(' ');
      if (regexSearchMode) {
        if (!searchRx.test(haystack)) return false;
      } else {
        if (!haystack.toLowerCase().includes(search)) return false;
      }
    }
```

- [ ] **Step 5: Update the `search-input` event listener**

Find (around line 1188):
```js
document.getElementById('search-input').addEventListener('input', debouncedFilter);
```
Replace with (this is a replacement — delete the old line):
```js
document.getElementById('search-input').addEventListener('input', () => {
  updateSearchWrapState();
  debouncedFilter();
});
```

- [ ] **Step 6: Add toggle button and save-as-topic wiring**

In the modal wiring `<script>` block (at the bottom of the file, after the modal HTML), add:
```js
// Regex toggle
document.getElementById('btn-regex-toggle').addEventListener('click', () => {
  regexSearchMode = !regexSearchMode;
  document.getElementById('btn-regex-toggle').classList.toggle('active', regexSearchMode);
  updateSearchWrapState();
  applyFilters();
});

// Save as Topic
document.getElementById('btn-save-as-topic').addEventListener('click', () => {
  const pattern = document.getElementById('search-input').value.trim();
  _modalOpenedBy = document.getElementById('btn-save-as-topic');
  openTopicModal(null);
  document.getElementById('modal-regex-input').value = pattern;
  validateModalRegex();
});
```

- [ ] **Step 7: Update the Clear Filters handler**

Find (around line 1198–1205):
```js
document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  document.getElementById('pid-input').value = '';
  document.getElementById('tid-input').value = '';
  document.getElementById('source-input').value = '';
  document.querySelectorAll('.level-cb').forEach(cb => { cb.checked = true; });
  applyFilters();
});
```
Replace with:
```js
document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('search-input').value = '';  // clear before updateSearchWrapState reads it
  regexSearchMode = false;
  document.getElementById('btn-regex-toggle').classList.remove('active');
  updateSearchWrapState();
  document.getElementById('pid-input').value = '';
  document.getElementById('tid-input').value = '';
  document.getElementById('source-input').value = '';
  document.querySelectorAll('.level-cb').forEach(cb => { cb.checked = true; });
  applyFilters();
});
```

- [ ] **Step 8: Run tests**

```bash
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 9: Manual test — plain mode unchanged**

Start server, load a log. Type plain text in search box — matches highlight as before, `.*` button stays grey.

- [ ] **Step 10: Manual test — regex mode**

Click `.*` — button turns blue, input turns monospace. Type `(error|warn)` — matches highlight. Type `[invalid` — input border turns red, 0 rows shown. Correct the pattern — results return.

- [ ] **Step 11: Manual test — Save as Topic**

In regex mode with a valid pattern, click "Save as Topic" inside the input box. Topic modal opens with pattern pre-filled in regex field, name empty, cursor in name field. Type a name and save — topic appears in sidebar.

- [ ] **Step 12: Manual test — Clear Filters**

With regex mode active and a pattern typed, click "✕ Clear Filters". Regex mode turns off, input clears, `.*` button goes grey.

- [ ] **Step 13: Commit**

```bash
git add templates/index.html
git commit -m "feat: add regex mode toggle and save-as-topic to search input"
```

---

### Task 4: Add Copy Topic button to sidebar rows

Add a ⎘ copy button to each topic row and implement `copyTopic()`.

**Files:**
- Modify: `templates/index.html` (JS `renderTopicRows` ~line 1376, JS `renderTopicList` wiring ~line 1345, new `copyTopic` function)

- [ ] **Step 1: Add copy button to `renderTopicRows()`**

Find (around line 1385–1387):
```js
        <button class="icon-btn toggle-btn${t.enabled?' active':''}" data-id="${t.id}" title="${t.enabled?'Disable':'Enable'}">${t.enabled?'&#x25CF;':'&#x25CB;'}</button>
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">&#9998;</button>
        <button class="icon-btn overflow-btn" data-id="${t.id}" title="More">&#x22EF;</button>
```
Replace with:
```js
        <button class="icon-btn toggle-btn${t.enabled?' active':''}" data-id="${t.id}" title="${t.enabled?'Disable':'Enable'}">${t.enabled?'&#x25CF;':'&#x25CB;'}</button>
        <button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">&#9998;</button>
        <button class="icon-btn copy-btn" data-id="${t.id}" title="Copy topic">&#x2398;</button>
        <button class="icon-btn overflow-btn" data-id="${t.id}" title="More">&#x22EF;</button>
```

- [ ] **Step 2: Wire `.copy-btn` in `renderTopicList()`**

Find the wiring block inside `renderTopicList()` (around line 1365–1374):
```js
  list.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      _modalOpenedBy = btn;
      openTopicModal(topicsState.find(t => t.id === btn.dataset.id));
    }));
  list.querySelectorAll('.overflow-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); toggleTopicOverflowMenu(btn); }));
```
Add after the `.edit-btn` wiring (before `.overflow-btn`):
```js
  list.querySelectorAll('.copy-btn').forEach(btn =>
    btn.addEventListener('click', () => copyTopic(btn.dataset.id)));
```

- [ ] **Step 3: Add `copyTopic()` function**

After `renderTopicRows()` function (around line 1390), add:
```js
function copyTopic(topicId) {
  const source = topicsState.find(t => t.id === topicId);
  if (!source) return;
  const btn = document.querySelector(`.copy-btn[data-id="${topicId}"]`);
  _modalOpenedBy = btn;
  openTopicModal(source);
  // Switch to "new topic" mode — openTopicModal sets editingTopicId = source.id,
  // we immediately override it to null so Save will POST rather than PUT.
  // The 50ms setTimeout inside openTopicModal only fires focus, not editingTopicId.
  editingTopicId = null;
  document.getElementById('modal-title').textContent = 'New Topic (Copy)';
  // Re-render event list in read-only mode (edit/delete/copy buttons hidden)
  // because editingTopicId is now null — buttons would fail with null topicId.
  renderModalEventsList(source, true);
}
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 5: Manual test**

Load the app. Click ⎘ on any topic with events. Modal opens titled "New Topic (Copy)" with name, pattern, color pre-filled. Event list shows events but with no edit/delete/copy buttons. Change the name. Click Save. New topic appears in sidebar with the same pattern and color. Original topic is unchanged.

- [ ] **Step 6: Commit**

```bash
git add templates/index.html
git commit -m "feat: add copy button to topic sidebar rows"
```

---

### Task 5: Add Copy Event button and extend `renderModalEventsList()`

Add a ⎘ copy button to each event row in the topic modal and implement `copyModalEvent()`.

**Files:**
- Modify: `templates/index.html` (`renderModalEventsList` ~line 1509, new `copyModalEvent` function)

- [ ] **Step 1: Add `readOnly` parameter to `renderModalEventsList()`**

Find the function signature (line 1509):
```js
function renderModalEventsList(topic) {
```
Replace with:
```js
function renderModalEventsList(topic, readOnly = false) {
```

- [ ] **Step 2: Add copy button to event row HTML and guard with `readOnly`**

Find the event row template inside `renderModalEventsList` (around lines 1521–1528):
```js
    return `
    <div class="modal-event-row" data-eid="${ev.id}">
      <span class="modal-event-dot" style="background:${ev.color}"></span>
      <span class="modal-event-name">${esc(ev.name)}</span>
      <span class="modal-event-badge ${mode}">${mode}</span>
      <button class="icon-btn modal-ev-edit-btn" data-eid="${ev.id}" title="Edit">&#9998;</button>
      <button class="icon-btn modal-ev-del-btn" data-eid="${ev.id}" title="Delete">&#128465;</button>
    </div>`;
```
Replace with:
```js
    return `
    <div class="modal-event-row" data-eid="${ev.id}">
      <span class="modal-event-dot" style="background:${ev.color}"></span>
      <span class="modal-event-name">${esc(ev.name)}</span>
      <span class="modal-event-badge ${mode}">${mode}</span>
      ${readOnly ? '' : `
        <button class="icon-btn modal-ev-edit-btn" data-eid="${ev.id}" title="Edit">&#9998;</button>
        <button class="icon-btn modal-ev-copy-btn" data-eid="${ev.id}" title="Copy event">&#x2398;</button>
        <button class="icon-btn modal-ev-del-btn" data-eid="${ev.id}" title="Delete">&#128465;</button>
      `}
    </div>`;
```

- [ ] **Step 3: Guard event button wiring with `readOnly` check**

Find the wiring block at the end of `renderModalEventsList` (around lines 1531–1534):
```js
  container.querySelectorAll('.modal-ev-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openModalEventForm(topic, topic.events.find(e => e.id === btn.dataset.eid))));
  container.querySelectorAll('.modal-ev-del-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteModalEvent(editingTopicId, btn.dataset.eid)));
```
Replace with:
```js
  if (!readOnly) {
    container.querySelectorAll('.modal-ev-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openModalEventForm(topic, topic.events.find(e => e.id === btn.dataset.eid))));
    container.querySelectorAll('.modal-ev-copy-btn').forEach(btn =>
      btn.addEventListener('click', () => copyModalEvent(editingTopicId, btn.dataset.eid)));
    container.querySelectorAll('.modal-ev-del-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteModalEvent(editingTopicId, btn.dataset.eid)));
  }
```

- [ ] **Step 4: Add `copyModalEvent()` function**

After `deleteModalEvent()` function (around line 1626), add:
```js
async function copyModalEvent(topicId, eventId) {
  const topic = topicsState.find(t => t.id === topicId);
  if (!topic) return;
  const ev = (topic.events || []).find(e => e.id === eventId);
  if (!ev) return;
  try {
    const body = {
      name:           ev.name,
      start_keywords: (ev.start_keywords || []).join(', '),
      end_keywords:   (ev.end_keywords   || []).join(', '),
      value_regex:    ev.value_regex || '',
      color:          ev.color || ''
    };
    const res = await fetch(`/api/topics/${topicId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const d = await res.json(); alert('Error copying event: ' + (d.error || 'Unknown')); return; }
    await loadTopics();
    const updated = topicsState.find(t => t.id === topicId);
    // Do NOT reassign editingTopicId — it is already correct for this modal session
    if (updated) renderModalEventsList(updated);
  } catch (e) { alert('Network error: ' + e.message); }
}
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 6: Manual test — copy event**

Open a topic with events. Click ⎘ on an event. The duplicate appears at the bottom of the event list with the same name, mode, and color. Original event is unchanged.

- [ ] **Step 7: Manual test — copy topic shows read-only events**

Click ⎘ on a topic with events. Modal opens in copy mode. Event list shows events with no action buttons — dot, name, and badge only.

- [ ] **Step 8: Manual test — normal edit still works**

Open a topic for normal edit (click ✏). Events show edit, copy, and delete buttons as usual. Click ⎘ on an event — it duplicates. Click ✏ on an event — inline form opens. Click 🗑 on an event — it deletes.

- [ ] **Step 9: Commit**

```bash
git add templates/index.html
git commit -m "feat: add copy button to modal event rows, readOnly mode for renderModalEventsList"
```

---

## Final Verification

- [ ] Run full test suite: `python -m pytest tests/test_app.py -v` — 27 passed
- [ ] Load app, exercise all four features end-to-end
- [ ] Confirm no console errors in browser DevTools
