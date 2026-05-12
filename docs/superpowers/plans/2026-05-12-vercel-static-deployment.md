# Vercel Static Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Webex Log Viewer from a Python/Flask app to a pure static frontend deployable on Vercel at zero cost.

**Architecture:** Delete `app.py` and the Flask server entirely. Move `templates/index.html` to the repo root as `index.html`. Add `static/api.js` — a localStorage adapter that mirrors the Flask API surface. Wire `index.html` to call `api.js` instead of `fetch('/api/...')`. Log parsing is ported from Python into JavaScript.

**Tech Stack:** Vanilla JavaScript, localStorage, FileReader API, Vercel static hosting.

**Spec:** `docs/superpowers/specs/2026-05-12-vercel-static-deployment-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `static/api.js` | localStorage adapter + parseLine() + export/import |
| Create | `vercel.json` | Vercel SPA routing config |
| Move+Edit | `templates/index.html` → `index.html` | Frontend — replace fetch calls, fix Jinja var, remove server-only code, add export/import buttons |
| Delete | `app.py` | Flask backend — no longer needed |
| Delete | `requirements.txt` | Python deps — no longer needed |
| Delete | `tests/test_app.py` | Backend tests — no longer needed |
| Keep | `topics.json` | Default team config — now served as static asset |

---

## Task 1: Create `static/api.js` — localStorage adapter + parseLine()

**Files:**
- Create: `static/api.js`

This is the core of the migration. All data operations that previously hit Flask endpoints now go through this module. Functions are exposed on a global `window.api` object so `index.html` can call them without a module bundler.

- [ ] **Step 1: Create `static/api.js`**

```js
// static/api.js
// localStorage-backed adapter replacing the Flask API.
// All async functions return the same data shapes as the Flask endpoints.

(function () {
  const TOPICS_KEY = 'webex-log-viewer:topics';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function readStore() {
    try {
      const raw = localStorage.getItem(TOPICS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function writeStore(data) {
    try {
      localStorage.setItem(TOPICS_KEY, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showStorageWarning();
      }
      throw e;
    }
  }

  function showStorageWarning() {
    const existing = document.getElementById('storage-warning-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'storage-warning-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#7f1d1d;color:#fca5a5;padding:8px 16px;text-align:center;z-index:9999;font-size:13px;';
    banner.textContent = '⚠ Storage is full. Topic changes cannot be saved. Export your topics to avoid losing them.';
    document.body.prepend(banner);
  }

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Seeding ───────────────────────────────────────────────────────────────

  async function seedIfEmpty() {
    if (readStore() !== null) return;
    try {
      const defaults = await fetch('/topics.json').then(r => r.json());
      writeStore(defaults);
    } catch {
      // fetch failed (e.g. file://) — start with empty state, show fallback button
      writeStore({ groups: [], topics: [] });
      showLoadDefaultsButton();
    }
  }

  function showLoadDefaultsButton() {
    const btn = document.getElementById('btn-load-defaults');
    if (btn) btn.style.display = '';
  }

  // ── Topics ────────────────────────────────────────────────────────────────

  async function getTopics() {
    await seedIfEmpty();
    const data = readStore();
    return {
      groups: data.groups || [],
      topics: data.topics || [],
    };
  }

  async function createTopic(topic) {
    const data = readStore();
    const newTopic = { ...topic, id: generateId(), events: topic.events || [] };
    data.topics.push(newTopic);
    writeStore(data);
    return newTopic;
  }

  async function updateTopic(id, topic) {
    const data = readStore();
    const idx = data.topics.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Topic not found: ' + id);
    data.topics[idx] = { ...data.topics[idx], ...topic };
    writeStore(data);
    return data.topics[idx];
  }

  async function deleteTopic(id) {
    const data = readStore();
    data.topics = data.topics.filter(t => t.id !== id);
    writeStore(data);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async function createEvent(topicId, event) {
    const data = readStore();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('Topic not found: ' + topicId);
    if (!topic.events) topic.events = [];
    const newEvent = { ...event, id: generateId() };
    topic.events.push(newEvent);
    writeStore(data);
    return newEvent;
  }

  async function updateEvent(topicId, eventId, event) {
    const data = readStore();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('Topic not found: ' + topicId);
    const idx = (topic.events || []).findIndex(e => e.id === eventId);
    if (idx === -1) throw new Error('Event not found: ' + eventId);
    topic.events[idx] = { ...topic.events[idx], ...event };
    writeStore(data);
    return topic.events[idx];
  }

  async function deleteEvent(topicId, eventId) {
    const data = readStore();
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic) throw new Error('Topic not found: ' + topicId);
    topic.events = (topic.events || []).filter(e => e.id !== eventId);
    writeStore(data);
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  async function createGroup(group) {
    const data = readStore();
    const newGroup = { ...group, id: generateId() };
    if (!data.groups) data.groups = [];
    data.groups.push(newGroup);
    writeStore(data);
    return newGroup;
  }

  async function updateGroup(id, group) {
    const data = readStore();
    const idx = (data.groups || []).findIndex(g => g.id === id);
    if (idx === -1) throw new Error('Group not found: ' + id);
    data.groups[idx] = { ...data.groups[idx], ...group };
    writeStore(data);
    return data.groups[idx];
  }

  async function deleteGroup(id) {
    const data = readStore();
    data.groups = (data.groups || []).filter(g => g.id !== id);
    writeStore(data);
  }

  // ── Log (in-memory) ───────────────────────────────────────────────────────

  // Ported from app.py parse_line() (lines 192-239)
  const LOG_PATTERN = /^(\S+)\s+<(\w+)>\s+\[(\d+):(0x[\da-fA-F]+|\d+)\]\[[^\]]*\]([^\s:]+):(\d+)\s+(.*)/;

  function parseLine(raw, index) {
    const m = LOG_PATTERN.exec(raw);
    if (!m) {
      return {
        index,
        timestamp: '',
        level: 'UNKNOWN',
        pid: '',
        tid: '',
        source_file: '',
        line_num: '',
        class_method: '',
        message: raw.trim(),
        raw: true,
      };
    }
    const [, timestamp, level, pid, tid, source_file, line_num, rest] = m;
    const parts = rest.split('::', 2);
    let class_method, message;
    const fullParts = rest.split('::');
    if (fullParts.length >= 3) {
      class_method = fullParts[0] + '::' + fullParts[1];
      message = fullParts.slice(2).join('::');
    } else if (fullParts.length === 2) {
      class_method = fullParts[0] + '::' + fullParts[1];
      message = '';
    } else {
      class_method = '';
      message = rest;
    }
    return {
      index,
      timestamp,
      level,
      pid,
      tid,
      source_file,
      line_num,
      class_method,
      message: message.trim(),
      raw: false,
    };
  }

  let _loadedLogs = [];

  async function loadLog(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target.result;
        const lines = text.split('\n');
        _loadedLogs = lines
          .filter(l => l.trim().length > 0)
          .map((l, i) => parseLine(l, i));
        resolve({ lines: _loadedLogs.length });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async function getLogs() {
    return { logs: _loadedLogs };
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function exportTopics() {
    const data = readStore() || { groups: [], topics: [] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topics.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importTopics(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data.topics)) throw new Error('Invalid topics.json: missing topics array');
          writeStore(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // ── Expose on window ──────────────────────────────────────────────────────

  window.api = {
    getTopics,
    createTopic,
    updateTopic,
    deleteTopic,
    createEvent,
    updateEvent,
    deleteEvent,
    createGroup,
    updateGroup,
    deleteGroup,
    loadLog,
    getLogs,
    exportTopics,
    importTopics,
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add static/api.js
git commit -m "feat: add api.js localStorage adapter with parseLine() port"
```

---

## Task 2: Create `vercel.json`

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add vercel.json for static SPA routing"
```

---

## Task 3: Move `index.html` and fix Jinja variable + add `api.js` script tag

**Files:**
- Move: `templates/index.html` → `index.html`
- Modify: `index.html` line 723

- [ ] **Step 1: Move the file**

```bash
cp templates/index.html index.html
```

- [ ] **Step 2: Fix the Jinja template variable**

In `index.html` line 723, replace:
```html
  <script>window.MAX_UPLOAD_MB = {{ max_upload_mb }};</script>
```
With:
```html
  <script>window.MAX_UPLOAD_MB = 200;</script>
```

- [ ] **Step 3: Add `api.js` script tag**

In `index.html`, add the script tag immediately after the line you just edited (still inside `<head>`, before `</head>`):
```html
  <script src="/static/api.js"></script>
```

- [ ] **Step 4: Verify the file opens in a browser**

```bash
cd /d/Development/vercel/webex-log-viewer
python -m http.server 8099
```

Open `http://localhost:8099` — the page should load without JS errors in the console. Topics sidebar will be empty (fetch calls still point at Flask). Close the server.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: move index.html to root, fix Jinja var, add api.js script tag"
```

---

## Task 4: Replace `loadTopics()` fetch with `api.getTopics()`

**Files:**
- Modify: `index.html` lines 1379–1395

This is the most important wiring — it connects the topic sidebar to localStorage.

- [ ] **Step 1: Replace `loadTopics()` in `index.html`**

Find this block (lines 1379–1395):
```js
async function loadTopics() {
  try {
    const res = await fetch('/api/topics');
    const data = await res.json();
    if (Array.isArray(data)) {
      topicsState = data;
      groupsState = [];
    } else {
      topicsState = data.topics || [];
      groupsState = data.groups || [];
    }
  } catch { topicsState = []; groupsState = []; }
  renderTopicList();
  updateStats();
  applyFilters();
  if (document.getElementById('timeline-panel').style.display !== 'none') renderTimeline();
}
```

Replace with:
```js
async function loadTopics() {
  try {
    const data = await api.getTopics();
    topicsState = data.topics || [];
    groupsState = data.groups || [];
  } catch { topicsState = []; groupsState = []; }
  renderTopicList();
  updateStats();
  applyFilters();
  if (document.getElementById('timeline-panel').style.display !== 'none') renderTimeline();
}
```

- [ ] **Step 2: Verify in browser**

```bash
python -m http.server 8099
```

Open `http://localhost:8099`. Topics should load from localStorage (first visit fetches `/topics.json` which will fail in `file://` but succeed over HTTP). Open DevTools → Application → Local Storage — you should see the `webex-log-viewer:topics` key populated.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: wire loadTopics() to api.getTopics()"
```

---

## Task 5: Replace all topic/group write fetch calls

**Files:**
- Modify: `index.html` — lines 1635–1637, 1739–1741, 1762–1763, 1781–1787, 1796–1797, 1803–1808, 2206–2208, 2216–2219, 2234–2236, 2252–2253, 2272–2274, 2296–2298

Replace each `fetch('/api/...')` write call with the corresponding `api.*` call. Work through them one by one:

- [ ] **Step 1: Replace topic save (create/update) — around line 1635**

Find:
```js
    const url = editingTopicId ? '/api/topics/' + editingTopicId : '/api/topics';
    const method = editingTopicId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
```
Replace with:
```js
    if (editingTopicId) {
      await api.updateTopic(editingTopicId, body);
    } else {
      await api.createTopic(body);
    }
```

- [ ] **Step 2: Replace event save (create/update) — around line 1739**

Find:
```js
    const url = eid ? `/api/topics/${editingTopicId}/events/${eid}` : `/api/topics/${editingTopicId}/events`;
    const method = eid ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
```
Replace with:
```js
    if (eid) {
      await api.updateEvent(editingTopicId, eid, body);
    } else {
      await api.createEvent(editingTopicId, body);
    }
```

- [ ] **Step 3: Replace event delete — around line 1762**

Find:
```js
  await fetch(`/api/topics/${topicId}/events/${eventId}`, { method: 'DELETE' });
```
Replace with:
```js
  await api.deleteEvent(topicId, eventId);
```

- [ ] **Step 4: Replace event toggle (inline PUT) — around line 1781**

Find:
```js
    const res = await fetch(`/api/topics/${topicId}/events`, {
```
This is a `POST` to create an event inline. Replace the entire fetch block with:
```js
    await api.createEvent(topicId, body);
```
(Keep the `body` variable construction above it; only replace the fetch call itself.)

- [ ] **Step 5: Replace topic delete — around line 1796**

Find:
```js
  await fetch('/api/topics/' + id, { method: 'DELETE' });
```
Replace with:
```js
  await api.deleteTopic(id);
```

- [ ] **Step 6: Replace topic toggle enabled — around line 1803**

Find:
```js
  await fetch('/api/topics/' + id, {
```
This is a PUT to toggle enabled. Replace the fetch block with:
```js
  await api.updateTopic(id, { enabled: !topic.enabled });
```
(Remove the method/headers/body lines that follow.)

- [ ] **Step 7: Replace group rename — around line 2206**

Find:
```js
  await fetch('/api/groups/' + gid, { method: 'PUT', headers: {'Content-Type':'application/json'},
```
Replace the fetch block with:
```js
  await api.updateGroup(gid, { name: newName });
```

- [ ] **Step 8: Replace topic group assignment — around line 2216**

Find:
```js
    fetch('/api/topics/' + t.id, { method: 'PUT', headers: {'Content-Type':'application/json'},
```
This may be inside a `.forEach` or `map`. Replace with:
```js
    await api.updateTopic(t.id, { group_id: gid });
```
If the surrounding function is not `async`, make it `async`.

- [ ] **Step 9: Replace group collapse toggle — around line 2234**

Find:
```js
      await fetch('/api/groups/' + gid, { method: 'PUT', headers: {'Content-Type':'application/json'},
```
Replace the fetch block with:
```js
      await api.updateGroup(gid, { collapsed: !group.collapsed });
```

- [ ] **Step 10: Replace group delete — around line 2252**

Find:
```js
  await fetch('/api/groups/' + gid, { method: 'DELETE' });
```
Replace with:
```js
  await api.deleteGroup(gid);
```

- [ ] **Step 11: Replace topic drag-drop reorder — around line 2272**

Find:
```js
  fetch('/api/topics/' + draggedTopicId, { method: 'PUT',
```
Replace the fetch block (and `.then(() => loadTopics())`) with:
```js
  await api.updateTopic(draggedTopicId, { group_id: targetGroupId, order: newOrder });
  await loadTopics();
```
(Adjust `targetGroupId` / `newOrder` to match the existing variable names in context.)

- [ ] **Step 12: Replace group create — around line 2296**

Find:
```js
  const res = await fetch('/api/groups', { method: 'POST',
```
Replace the fetch block with:
```js
  await api.createGroup({ name: 'New Group', collapsed: false });
  await loadTopics();
```
(Remove the `if (res.ok)` guard — `api.createGroup` throws on error.)

- [ ] **Step 13: Verify in browser — all topic/group operations work**

```bash
python -m http.server 8099
```

Open `http://localhost:8099`. Test:
- Create a topic → it appears in the sidebar
- Edit a topic → changes persist after reload
- Delete a topic → it disappears
- Create a group, drag a topic into it → persists after reload
- Delete a group → it disappears

- [ ] **Step 14: Commit**

```bash
git add index.html
git commit -m "feat: replace all topic/group fetch calls with api.js calls"
```

---

## Task 6: Replace log upload flow

**Files:**
- Modify: `index.html` lines 991–1035 (`uploadFile` function)

The current `uploadFile()` uses XHR to POST to `/api/upload`, then calls `loadLogsFromServer()`. Replace with `FileReader` + `api.loadLog()`.

- [ ] **Step 1: Replace `uploadFile()` in `index.html`**

Find the entire `uploadFile(file)` function (lines 991–1035) and replace it with:

```js
async function uploadFile(file) {
  const maxMb = window.MAX_UPLOAD_MB || 200;
  if (file.size > maxMb * 1024 * 1024) {
    setUploadStatus('File too large. Maximum is ' + maxMb + ' MB.', 'error');
    return;
  }
  setProgressVisible(true);
  setProgress(0, '0%');
  setUploadStatus('Parsing…');
  setClearLogEnabled(false);

  try {
    // Show fake progress while FileReader works (no real progress events for readAsText)
    setProgress(50, '50%');
    const result = await api.loadLog(file);
    setProgress(100, '100%');
    setProgressVisible(false);
    const data = await api.getLogs();
    allLogs = data.logs;
    applyFilters();
    setUploadStatus('✓ ' + allLogs.length.toLocaleString() + ' lines loaded', 'success');
    setClearLogEnabled(true);
  } catch (e) {
    setProgressVisible(false);
    setUploadStatus('Failed to parse log. Please try again.', 'error');
  }
}
```

- [ ] **Step 2: Remove `loadLogsFromServer()` function and its startup call**

a) Delete the entire `loadLogsFromServer()` function (lines 967–989).

b) In the `DOMContentLoaded` block near the bottom, find and remove this line:
```js
  loadLogsFromServer();
```
(Keep `loadTopics()` and `renderPage(1)` — only remove `loadLogsFromServer()`.)

- [ ] **Step 3: Fix the clear log button handler — remove server call**

Find (line 1271–1277):
```js
document.getElementById('btn-clear-log').addEventListener('click', async () => {
  await fetch('/api/session/log', { method: 'DELETE' });
  allLogs = [];
  applyFilters();
  setUploadStatus('No log loaded');
  setClearLogEnabled(false);
});
```
Replace with:
```js
document.getElementById('btn-clear-log').addEventListener('click', () => {
  allLogs = [];
  applyFilters();
  setUploadStatus('No log loaded');
  setClearLogEnabled(false);
});
```

- [ ] **Step 4: Verify log upload works end-to-end**

```bash
python -m http.server 8099
```

Open `http://localhost:8099`. Upload a `.txt` Webex log file:
- Progress bar should animate
- Log table should populate with parsed rows
- Level filters, search, PID/TID filters should all work
- "Clear Log" button should clear the table

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: replace XHR upload with FileReader + api.loadLog()"
```

---

## Task 7: Add Export/Import Topics buttons to toolbar

**Files:**
- Modify: `index.html` toolbar section (around line 747)

- [ ] **Step 1: Add Export and Import buttons to the toolbar HTML**

Find the clear log button (line 747):
```html
  <button id="btn-clear-log" disabled title="Clear the loaded log">&#10005; Clear Log</button>
```

Add two buttons immediately after it:
```html
  <button id="btn-clear-log" disabled title="Clear the loaded log">&#10005; Clear Log</button>
  <button id="btn-export-topics" title="Export topics to topics.json">&#8659; Export Topics</button>
  <label id="btn-import-topics-label" title="Import topics from topics.json">
    &#8657; Import Topics
    <input type="file" id="import-topics-input" accept=".json" style="display:none" />
  </label>
```

- [ ] **Step 2: Wire the Export button in JS**

In `index.html`, find the section where other toolbar buttons are wired (around the `btn-clear-log` listener). Add:

```js
document.getElementById('btn-export-topics').addEventListener('click', () => {
  api.exportTopics();
});

document.getElementById('import-topics-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await api.importTopics(file);
    await loadTopics();
    setUploadStatus('Topics imported successfully.', 'success');
  } catch (err) {
    alert('Failed to import topics: ' + err.message);
  }
  e.target.value = '';
});
```

- [ ] **Step 3: Verify export/import round-trip**

```bash
python -m http.server 8099
```

1. Open `http://localhost:8099`
2. Create a test topic
3. Click "Export Topics" → confirm `topics.json` downloads
4. Delete the test topic
5. Click "Import Topics" → select the downloaded file
6. Confirm the test topic reappears

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add Export/Import Topics buttons to toolbar"
```

---

## Task 8: Add "Load defaults" fallback button

**Files:**
- Modify: `index.html` toolbar or sidebar

This handles the edge case where `/topics.json` fails to load on first visit (e.g., running via `file://`).

- [ ] **Step 1: Add the hidden button to the HTML**

In `index.html`, find the topics sidebar empty state div. Add a hidden "Load defaults" button near the Import button in the toolbar:

```html
  <button id="btn-load-defaults" style="display:none" title="Load default team topics">&#8635; Load Defaults</button>
```
Place it after the `btn-import-topics-label`.

- [ ] **Step 2: Wire the button in JS**

```js
document.getElementById('btn-load-defaults').addEventListener('click', async () => {
  try {
    const defaults = await fetch('/topics.json').then(r => r.json());
    localStorage.setItem('webex-log-viewer:topics', JSON.stringify(defaults));
    await loadTopics();
    document.getElementById('btn-load-defaults').style.display = 'none';
  } catch {
    alert('Could not load defaults. Make sure you are accessing the app over HTTP (not file://).');
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add Load Defaults fallback button for offline/file:// access"
```

---

## Task 9: Delete backend files

**Files:**
- Delete: `app.py`, `requirements.txt`, `tests/test_app.py`, `templates/` directory

- [ ] **Step 1: Delete backend files**

```bash
git rm app.py requirements.txt
git rm -r tests/ templates/
```

- [ ] **Step 2: Verify nothing is broken**

```bash
python -m http.server 8099
```

Open `http://localhost:8099` — app should still load perfectly. Confirm no 404s in DevTools console for `api.js` or `topics.json`.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove Flask backend, requirements, and backend tests"
```

---

## Task 10: Full manual verification

- [ ] **Step 1: Verify first-visit seeding**

Open DevTools → Application → Local Storage. Delete the `webex-log-viewer:topics` key. Reload the page. Confirm the key reappears with the default topics from `topics.json`.

- [ ] **Step 2: Verify all log functionality**

Upload a real Webex `.txt` log file. Verify:
- Log lines appear in the table
- Level filters (Debug/Info/Warn/Error/Fatal) toggle correctly
- Text search works
- PID/TID/Source filters work
- Pagination works
- Timeline panel renders

- [ ] **Step 3: Verify all topic/group operations**

- Create topic, edit topic, delete topic
- Create group, move topic into group, rename group, delete group
- Add event to topic, edit event, delete event
- Drag-reorder topics

- [ ] **Step 4: Verify export/import**

Export → delete topics → import → confirm restored.

- [ ] **Step 5: Verify localStorage persistence**

Edit a topic. Refresh the page. Confirm the edit persists.

- [ ] **Step 6: Commit verification note**

```bash
git add .
git commit -m "chore: full manual verification complete — ready for Vercel deploy"
```

---

## Task 11: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Connect to Vercel**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import the `webex-log-viewer` GitHub repository
4. Framework Preset: **Other** (it's a static site)
5. Root Directory: `/` (default)
6. No build command needed — leave blank
7. Output Directory: leave blank (Vercel serves from root)
8. Click **Deploy**

- [ ] **Step 3: Verify the deployment**

Open the Vercel URL. Repeat the manual verification checks from Task 10 in the live environment.

- [ ] **Step 4: Share the URL with your team** 🎉

---

## Rollback

If anything goes wrong, the Flask app is still fully functional from git history. To restore:

```bash
git checkout HEAD~N -- app.py requirements.txt templates/ tests/
```
