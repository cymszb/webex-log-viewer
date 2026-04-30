# Regex Search, Save as Topic & Copy Topic/Event — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Scope:** `templates/index.html` only

---

## Overview

Enhance the full-text search input with two new capabilities:

1. **Regex mode** — a toggle switches the search from plain substring matching to full JavaScript regex matching.
2. **Save as Topic** — when regex mode is active and the pattern is valid, a button inside the search box lets the user save the current pattern directly into a new topic via the existing topic modal.
3. **Copy Topic** — a copy button in the topic sidebar row opens the topic modal pre-filled with all the original topic's data (name, regex, color, events), ready to save as a new topic.
4. **Copy Event** — a copy button in the topic modal's event list immediately duplicates the event in-place with a new server-generated ID.

---

## UI Changes

### `.*` Toggle Button (`#btn-regex-toggle`)

- A small button labelled `.*` added to the left of the search input wrapper in the free-flow toolbar.
- Default state: inactive — grey border and text, matching existing inactive button style.
- Active state: blue border and text using `var(--accent-blue)` / `var(--border-active)`, background `#1a2f50`.
- Clicking toggles `regexSearchMode` boolean, updates wrapper CSS classes, and calls `applyFilters()`.

### Search Input Wrapper (`#search-input-wrap`)

- The existing bare `<input id="search-input">` is wrapped in a flex container `<div id="search-input-wrap">`.
- The wrapper takes the border/background styling (currently on the input itself); the inner `<input>` becomes borderless and transparent so the composite looks like a single input.
- Border colour driven by CSS classes on the wrapper:
  - Default: `var(--border-input)`
  - Regex mode, valid: `.regex-active` → `var(--border-active)` (blue)
  - Regex mode, invalid: `.regex-invalid` → `#ef4444` (red). `.regex-invalid` takes precedence over `.regex-active` via source order.
- `focus-within` blue border only applies when neither `.regex-active` nor `.regex-invalid` is present (plain mode), by scoping it: `#search-input-wrap:not(.regex-active):not(.regex-invalid):focus-within`.
- Input font:
  - Plain mode: default (sans-serif)
  - Regex mode (active or invalid): monospace, driven by `.regex-active` and `.regex-invalid` selectors
- Input text colour:
  - Plain mode: `var(--text-secondary)`
  - Regex mode, valid: `#93c5fd`
  - Regex mode, invalid: `#f87171`
- Width: `min-width: 200px` on the wrapper; the input inside uses `flex:1; min-width: 80px` so it never collapses when "Save as Topic" button is visible.

### Save as Topic Button (`#btn-save-as-topic`)

- A small text button with label `"Save as Topic"` inside `#search-input-wrap`, right-aligned.
- Green style: border `#10b981`, background `#0f2e1a`, colour `#34d399`.
- Visibility rules (all three must be true to show):
  1. `regexSearchMode === true`
  2. `#search-input` value is non-empty after trimming (empty string is excluded even though `new RegExp('')` is technically valid)
  3. The trimmed value compiles as a valid `RegExp` without throwing
- Hidden (not just disabled) in all other states — `display:none` / `display:''`.

---

## JavaScript Changes

### New State Variable

```js
let regexSearchMode = false;
```

### `updateSearchWrapState()`

New helper that manages all visual state on `#search-input-wrap`. Called whenever search input changes or regex mode is toggled. Keeps class management in one place.

```js
function updateSearchWrapState() {
  const wrap = document.getElementById('search-input-wrap');
  const val = document.getElementById('search-input').value.trim();

  if (!regexSearchMode) {
    wrap.classList.remove('regex-active', 'regex-invalid');
    document.getElementById('btn-save-as-topic').style.display = 'none';
    return;
  }

  // Regex mode — check validity
  let valid = false;
  if (val) {
    try { new RegExp(val); valid = true; } catch {}
  }

  wrap.classList.toggle('regex-active', valid);
  wrap.classList.toggle('regex-invalid', val.length > 0 && !valid);
  document.getElementById('btn-save-as-topic').style.display = (valid) ? '' : 'none';
}
```

Note: `new RegExp(val)` (no flags) is used here only for validity checking — the flag `'i'` is applied separately at filter time.

### Toggle Handler

```js
document.getElementById('btn-regex-toggle').addEventListener('click', () => {
  regexSearchMode = !regexSearchMode;
  document.getElementById('btn-regex-toggle').classList.toggle('active', regexSearchMode);
  updateSearchWrapState();
  applyFilters();
});
```

### `applyFilters()` — search section

The existing line that reads the search value:
```js
const search = document.getElementById('search-input').value.trim().toLowerCase();
```
Must be changed to preserve the original case when in regex mode:
```js
const rawSearch = document.getElementById('search-input').value.trim();
const search = regexSearchMode ? rawSearch : rawSearch.toLowerCase();
```

The invalid-regex early-exit must be hoisted **above** the `allLogs.filter()` call. The overall structure becomes:

```js
function applyFilters() {
  const levels    = getActivelevels();
  const rawSearch = document.getElementById('search-input').value.trim();
  const search    = regexSearchMode ? rawSearch : rawSearch.toLowerCase();
  const pidFilter = document.getElementById('pid-input').value.trim().toLowerCase();
  const tidFilter = document.getElementById('tid-input').value.trim().toLowerCase();
  const srcFilter = document.getElementById('source-input').value.trim().toLowerCase();
  const compiledTopics = getCompiledTopics();

  // Pre-compile regex (hoisted above filter loop)
  // updateSearchWrapState() is NOT called here — visual state is managed by
  // the input event listener and toggle handler, keeping applyFilters() pure.
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

  filteredLogs = allLogs.filter(l => {
    if (!levels.has(l.level)) return false;
    if (pidFilter && !l.pid.toLowerCase().includes(pidFilter)) return false;
    if (tidFilter && !l.tid.toLowerCase().includes(tidFilter)) return false;
    if (srcFilter) {
      const haystack = (l.source_file + ' ' + l.class_method).toLowerCase();
      if (!haystack.includes(srcFilter)) return false;
    }
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
    if (compiledTopics.length > 0) {
      if (getRowTopics(l, compiledTopics).length === 0) return false;
    }
    return true;
  });

  errorJumpIdx = -1;
  topicJumpIdx = -1;
  currentPage = 1;
  updateStats();
  renderPage(1);
}
```

### `highlight()` — regex-aware highlighting

In regex mode the function must match against the **original unescaped string** (to avoid `\w+` matching inside HTML entities like `&amp;`), then reconstruct the escaped output with `<mark>` tags at the correct positions.

The existing function is fully replaced. Both plain and regex modes now match against the **original unescaped string** and reconstruct the escaped output with `<mark>` tags at the correct positions — avoiding the problem of `esc()` transforming characters before the regex runs.

```js
function highlight(str, term) {
  if (!term) return esc(str);
  let re;
  if (regexSearchMode) {
    try { re = new RegExp(term, 'gi'); } catch { return esc(str); }
  } else {
    re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  }
  // Match against original string, build escaped output with marks at correct positions
  let result = '';
  let lastIndex = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    result += esc(str.slice(lastIndex, m.index));
    result += '<mark>' + esc(m[0]) + '</mark>';
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) { re.lastIndex++; } // guard against zero-length matches
  }
  result += esc(str.slice(lastIndex));
  return result;
}
```

Note: `highlight()` receives `term` as the raw search value (not lowercased) — `renderPage()` already passes `document.getElementById('search-input').value.trim()` directly.

### `search-input` event listener — replace line 1188

The existing line 1188:
```js
document.getElementById('search-input').addEventListener('input', debouncedFilter);
```
Must be **deleted** and replaced with:
```js
document.getElementById('search-input').addEventListener('input', () => {
  updateSearchWrapState();  // immediate — visual feedback without debounce delay
  debouncedFilter();
});
```
This is a replacement, not an addition — the original line must be removed to avoid `debouncedFilter` firing twice per keystroke.

### Save as Topic click handler

`openTopicModal(null)` does not set `_modalOpenedBy` internally — the caller is responsible (consistent with how `btn-new-topic` wires it). So the order is correct: set `_modalOpenedBy` first, then call `openTopicModal`.

```js
document.getElementById('btn-save-as-topic').addEventListener('click', () => {
  const pattern = document.getElementById('search-input').value.trim();
  _modalOpenedBy = document.getElementById('btn-save-as-topic');
  openTopicModal(null);
  document.getElementById('modal-regex-input').value = pattern;
  validateModalRegex();
});
```

`openTopicModal(null)` focuses `#modal-name-input` — no additional focus call needed.

---

## HTML Changes

### Before (existing):
```html
<input type="text" id="search-input" placeholder="Full-text search…" style="width:200px;" />
```

### After:
```html
<button id="btn-regex-toggle" title="Toggle regex search">.*</button>
<div id="search-input-wrap">
  <input type="text" id="search-input" placeholder="Full-text search…" />
  <button id="btn-save-as-topic" style="display:none">Save as Topic</button>
</div>
```

The `style="width:200px;"` is removed from the input; width is controlled by the wrapper.

---

## CSS Changes

### `#btn-regex-toggle`
```css
/* Inherits base button style (border, background, color, border-radius, font-size, padding)
   from the global `button` selector already defined in the stylesheet. */
#btn-regex-toggle { font-family: monospace; font-weight: 700; padding: 3px 7px; }
#btn-regex-toggle.active { background: #1a2f50; border-color: var(--border-active); color: var(--accent-blue); }
```

### `#search-input-wrap`
```css
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
/* Plain mode focus — scoped to avoid conflicting with regex state colours */
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
  outline: none;  /* suppresses native focus ring — wrapper handles focus styling */
}
#search-input-wrap.regex-active  #search-input { font-family: monospace; color: #93c5fd; }
#search-input-wrap.regex-invalid #search-input { font-family: monospace; color: #f87171; }
```

### `#btn-save-as-topic`
```css
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

---

## Clear Filters

`clearFilters()` clears `#search-input` value first, then resets regex mode state. The order matters: `updateSearchWrapState()` reads the input value, so the input must be cleared before the call.

```js
// In clearFilters() — input clear happens before updateSearchWrapState():
document.getElementById('search-input').value = '';  // clear first
regexSearchMode = false;
document.getElementById('btn-regex-toggle').classList.remove('active');
updateSearchWrapState();  // reads empty input → removes both classes, hides button
// existing applyFilters() call follows (already present in clearFilters)
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Invalid regex typed | `updateSearchWrapState` (called by input listener immediately) adds `.regex-invalid` (red border), hides "Save as Topic"; debounced `applyFilters` returns early with `filteredLogs = []` → 0 rows |
| User corrects invalid regex | `updateSearchWrapState` switches to `.regex-active` (blue border), shows "Save as Topic"; `applyFilters` runs normally |
| Valid regex, no matches | Normal 0-results empty state — no red border |
| User clears input while in regex mode | `updateSearchWrapState` removes both classes (no border colour), hides "Save as Topic" |
| User saves topic then edits modal | Existing modal validation handles all further checks |
| Toggling regex mode off with text in input | `updateSearchWrapState` removes regex classes; `applyFilters` reverts to plain substring match |

---

## Out of Scope

- Regex mode for PID / TID / File+Class filter inputs — plain substring only, unchanged.
- Persisting regex mode across page reloads.
- Case-sensitive regex option.
- bfcache handling — not a concern for a locally-run dev tool.
- Keyboard shortcut to activate regex mode.
- `aria-hidden` / `tabindex` on `#btn-save-as-topic` — accessibility is out of scope for this dev tool.

---

## Feature 3: Copy Topic

### UI

A copy button is added to each topic row in the sidebar, alongside the existing edit (✏) and overflow (⋯) buttons:

```html
<!-- Inside .topic-actions, after .edit-btn -->
<button class="icon-btn copy-btn" data-id="${t.id}" title="Copy topic">&#x2398;</button>
```

Symbol `⎘` (U+2398, HELM SYMBOL) is used as a compact copy icon consistent with the existing icon-btn style.

### Behaviour

Clicking the copy button on a topic:
1. Finds the source topic in `topicsState` by `data-id`. Topic IDs are string UUIDs (`str(uuid.uuid4())` server-side), so `===` comparison against `dataset.id` is safe.
2. Sets `_modalOpenedBy = btn` (the copy button).
3. Calls `openTopicModal(sourceTopic)` — this pre-fills all fields (name, regex, color, group) and sets `editingTopicId = sourceTopic.id` internally.
4. After `openTopicModal` returns (synchronously), sets `editingTopicId = null` — switches the modal to "new topic" mode so Save calls `POST /api/topics` rather than `PUT`. The 50ms `setTimeout` inside `openTopicModal` only fires focus — it does not affect `editingTopicId`, so this assignment is safe.
5. Updates `#modal-title` (confirmed element id at line 2157) to `'New Topic (Copy)'`.
6. The existing `saveTopicModal()` is unchanged.

**Events in copy modal:** `renderModalEventsList(sourceTopic)` is called internally by `openTopicModal`, rendering the source events. Because `editingTopicId` is then set to `null`, the event edit/delete buttons would operate against a null topicId if clicked. To prevent this, `renderModalEventsList` is extended with an optional `readOnly` boolean parameter. When `readOnly = true`, event rows are rendered without edit and delete buttons (display only). `copyTopic` calls `renderModalEventsList(sourceTopic, true)` after opening the modal to replace the wired version with a read-only one.

**Events are not copied to the new topic** — `saveTopicModal` only posts `name`, `pattern`, `color`, `group_id`. User adds events to the copy manually. See Out of Scope.

### JavaScript

New function `copyTopic(topicId)`:

```js
function copyTopic(topicId) {
  const source = topicsState.find(t => t.id === topicId);
  if (!source) return;
  const btn = document.querySelector(`.copy-btn[data-id="${topicId}"]`);
  _modalOpenedBy = btn;
  openTopicModal(source);
  // Switch to "new topic" mode after openTopicModal pre-fills fields
  editingTopicId = null;
  document.getElementById('modal-title').textContent = 'New Topic (Copy)';
  // Re-render events in read-only mode (no edit/delete buttons) since editingTopicId is now null
  renderModalEventsList(source, true);
}
```

Wire in `renderTopicList()` alongside existing `.edit-btn` and `.overflow-btn` wiring:

```js
list.querySelectorAll('.copy-btn').forEach(btn =>
  btn.addEventListener('click', () => copyTopic(btn.dataset.id)));
```

### `renderTopicRows()` — HTML change

Add `.copy-btn` after `.edit-btn` in the `topic-actions` div:

```js
// existing:
<button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">&#9998;</button>
// add after:
<button class="icon-btn copy-btn" data-id="${t.id}" title="Copy topic">&#x2398;</button>
```

No new CSS needed — `.copy-btn` inherits `.icon-btn` styles already defined.

---

## Feature 4: Copy Event

### UI

A copy button is added to each event row inside the topic modal, alongside the existing edit (✏) and delete (🗑) buttons:

```html
<!-- Inside .modal-event-row, after .modal-ev-edit-btn -->
<button class="icon-btn modal-ev-copy-btn" data-eid="${ev.id}" title="Copy event">&#x2398;</button>
```

### Behaviour

Clicking copy on an event:
1. Finds the source event in the current topic's events list by `data-eid`. Event IDs are string UUIDs, so `===` comparison against `dataset.eid` is safe.
2. Calls `POST /api/topics/<editingTopicId>/events` with all the source event's fields (`name`, `start_keywords` as comma-joined string, `end_keywords` as comma-joined string, `value_regex`, `color`) — the server assigns a new UUID. The API defaults `color` to `#4db6e8` if falsy, so a null/undefined color is safe.
3. On success, calls `await loadTopics()` to refresh `topicsState`, then re-renders the event list via `renderModalEventsList(updatedTopic)` — the duplicate appears at the bottom.
4. On failure, shows `alert('Error copying event: ' + message)`.

### JavaScript

New async function `copyModalEvent(topicId, eventId)`:

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
    // Do NOT reassign editingTopicId here — it is already correct for the current modal session
    if (updated) renderModalEventsList(updated);
  } catch (e) { alert('Network error: ' + e.message); }
}
```

Wire in `renderModalEventsList()` alongside existing `.modal-ev-edit-btn` and `.modal-ev-del-btn` wiring:

```js
container.querySelectorAll('.modal-ev-copy-btn').forEach(btn =>
  btn.addEventListener('click', () => copyModalEvent(editingTopicId, btn.dataset.eid)));
```

### `renderModalEventsList()` — `readOnly` parameter

Add an optional second parameter `readOnly = false`. When `true`, render event rows without edit, delete, or copy buttons:

```js
function renderModalEventsList(topic, readOnly = false) {
  ...
  container.innerHTML = events.map(ev => {
    ...
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
  }).join('');

  if (!readOnly) {
    // wire edit, copy, delete buttons as before
  }
}
```

---

## Out of Scope

- Regex mode for PID / TID / File+Class filter inputs — plain substring only, unchanged.
- Persisting regex mode across page reloads.
- Case-sensitive regex option.
- bfcache handling — not a concern for a locally-run dev tool.
- Keyboard shortcut to activate regex mode.
- `aria-hidden` / `tabindex` on `#btn-save-as-topic` — accessibility is out of scope for this dev tool.
- Copying events when copying a topic — new topic is created without events; user adds them manually.
