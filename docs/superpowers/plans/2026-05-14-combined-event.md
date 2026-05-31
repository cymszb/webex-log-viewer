# Combined Event Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `combined` event type that renders a Gantt span with labeled child dot events overlaid on the bar in the Topic Visualization timeline.

**Architecture:** All changes are in `index.html` (the single-file app) and `tests/specs/topics.spec.js`. The `combined` type is detected by the presence of a non-empty `child_events` array on an event object. Three areas of `index.html` are touched: CSS (badge style), the event modal form (child event UI), and the timeline rendering functions (`buildGanttRows` + `drawEventRow`). `static/api.js` requires no changes — `child_events` is stored/retrieved as part of the event body transparently.

**Tech Stack:** Vanilla JS, HTML Canvas (existing), localStorage via `static/api.js`, Playwright for tests.

---

## File Map

| File | Change |
|------|--------|
| `index.html` | (1) Add `.modal-event-badge.combined` CSS; (2) extract `getEventMode` helper; (3) update `renderModalEventsList` badge; (4) update `openModalEventForm` to render child event UI; (5) update `buildGanttRows` to handle `combined`; (6) update `drawEventRow` to overlay dots on combined bars |
| `tests/specs/topics.spec.js` | Add one new test: create combined event with two children, verify persistence |

---

## Background: Key Functions in `index.html`

- **Line ~1623** — `renderModalEventsList`: renders event list in modal; detects mode inline with `ev.value_regex ? 'metric' : ((ev.end_keywords||[]).length > 0 ? 'gantt' : 'dot')`
- **Line ~1647** — `openModalEventForm(topic, event)`: renders inline event edit form
- **Line ~1698** — `saveEv()` (inside `openModalEventForm`): reads form fields and calls `api.createEvent` or `api.updateEvent`
- **Line ~1796** — `buildGanttRows(allEvents, logs, minT, maxT, spanMs)`: builds per-event row data for timeline
- **Line ~1969** — `drawEventRow(canvas, ev, dpr)`: draws a single timeline row on a canvas
- **Line ~644** — `.modal-event-badge` CSS block with `.metric`, `.dot`, `.gantt` variants

---

### Task 1: CSS badge + type detection helper

**Files:**
- Modify: `index.html` (CSS block ~line 644, mode detection at ~line 1623)

This task adds the visual badge for `combined` and centralizes the mode detection so all three places use the same logic.

- [ ] **Step 1: Add `combined` badge CSS**

Find the CSS block (around line 644):
```css
.modal-event-badge.gantt  { background: #1a1228; border-color: #2a1a40; color: #a78bfa; }
```
Add immediately after it:
```css
.modal-event-badge.combined { background: #062020; border-color: #1a4040; color: #2dd4bf; }
```

- [ ] **Step 2: Extract `getEventMode` helper function**

Find the JS section (around line 1780, after the `// ── Timeline` comment). Add this helper function before `getAllEvents()`:

```js
function getEventMode(ev) {
  if (ev.child_events && ev.child_events.length > 0) return 'combined';
  if (ev.value_regex) return 'metric';
  if ((ev.end_keywords || []).length > 0) return 'gantt';
  return 'dot';
}
```

- [ ] **Step 3: Use `getEventMode` in `renderModalEventsList`**

Find (around line 1623):
```js
const mode = ev.value_regex ? 'metric' : ((ev.end_keywords||[]).length > 0 ? 'gantt' : 'dot');
```
Replace with:
```js
const mode = getEventMode(ev);
```

- [ ] **Step 4: Verify no regressions — run tests**

Start a local server (`python -m http.server 8099` or `npx serve . -l 8099`) then:
```bash
cd d:\Development\vercel\webex-log-viewer && npx playwright test
```
Expected: 20/20 tests pass.

- [ ] **Step 5: Commit**
```bash
git add index.html
git commit -m "feat: add getEventMode helper and combined badge CSS"
```

---

### Task 2: Playwright test for combined event (write failing test first)

**Files:**
- Modify: `tests/specs/topics.spec.js`

Write the test before implementing the UI so it fails for the right reason.

- [ ] **Step 1: Write the failing test**

In `tests/specs/topics.spec.js`, add this test inside the `'Topic CRUD'` describe block, after the existing `'Persists in localStorage'` test:

```js
  test('Create combined event with child events', async ({ page }) => {
    const frame = page.frameLocator('#tool-frame');

    // Navigate and clear state
    await page.goto('/shell.html');
    await frame.locator('#topic-list').waitFor();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await frame.locator('#topic-list').waitFor();

    // Create topic
    await frame.locator('#btn-new-topic').click();
    await frame.locator('#modal-name-input').waitFor({ state: 'visible' });
    await frame.locator('#modal-regex-input').fill('CallTest');
    await frame.locator('#modal-regex-feedback.valid').waitFor();
    await frame.locator('#modal-name-input').fill('Call Topic');
    await frame.locator('#btn-modal-save:not([disabled])').waitFor();
    await frame.locator('#btn-modal-save').click();

    // Open topic edit modal → add combined event
    const topicRow = frame.locator('.topic-row', { hasText: 'Call Topic' });
    await topicRow.locator('button.edit-btn').click();
    await frame.locator('#topic-modal-backdrop.open').waitFor();

    // Click + Add Event button (opens inline form)
    await frame.locator('#btn-modal-add-event').click();
    await frame.locator('#modal-event-inline-form').waitFor({ state: 'visible' });

    // Select "combined" type
    await frame.locator('.modal-event-type-btn[data-type="combined"]').click();
    await frame.locator('#modal-event-children-section').waitFor({ state: 'visible' });

    // Fill event name and keywords
    await frame.locator('#modal-event-name-input').fill('Meeting Span');
    await frame.locator('#modal-event-start-kw-input').fill('meeting start');
    await frame.locator('#modal-event-end-kw-input').fill('meeting end');

    // Add first child
    await frame.locator('#btn-add-child-event').click();
    await frame.locator('.child-name-input[data-idx="0"]').fill('Muted');
    await frame.locator('.child-kw-input[data-idx="0"]').fill('mute on');

    // Add second child
    await frame.locator('#btn-add-child-event').click();
    await frame.locator('.child-name-input[data-idx="1"]').fill('Screen share');
    await frame.locator('.child-kw-input[data-idx="1"]').fill('sharing started');

    // Save the event
    await frame.locator('#btn-modal-event-save').click();
    await frame.locator('#modal-event-inline-form').waitFor({ state: 'detached' });

    // Verify combined event appears in list with correct badge
    await expect(frame.locator('.modal-event-row .modal-event-badge.combined')).toBeVisible();
    await expect(frame.locator('.modal-event-name', { hasText: 'Meeting Span' })).toBeVisible();

    // Close modal and reopen to verify persistence
    await frame.locator('#btn-modal-close').click();
    await topicRow.locator('button.edit-btn').click();
    await frame.locator('#topic-modal-backdrop.open').waitFor();

    // Reopen the event form to verify child events persisted
    await frame.locator('.modal-event-row', { hasText: 'Meeting Span' }).locator('button.edit-btn').click();
    await frame.locator('#modal-event-inline-form').waitFor({ state: 'visible' });
    await expect(frame.locator('.child-name-input[data-idx="0"]')).toHaveValue('Muted');
    await expect(frame.locator('.child-kw-input[data-idx="0"]')).toHaveValue('mute on');
    await expect(frame.locator('.child-name-input[data-idx="1"]')).toHaveValue('Screen share');
    await expect(frame.locator('.child-kw-input[data-idx="1"]')).toHaveValue('sharing started');
  });
```

- [ ] **Step 2: Run only the new test to confirm it fails**
```bash
cd d:\Development\vercel\webex-log-viewer && npx playwright test tests/specs/topics.spec.js --grep "combined event"
```
Expected: FAIL — `.modal-event-type-btn[data-type="combined"]` does not exist yet.

- [ ] **Step 3: Commit the failing test**
```bash
git add tests/specs/topics.spec.js
git commit -m "test: add failing combined event create and persist test"
```

---

### Task 3: Modal form — child event UI

**Files:**
- Modify: `index.html` (functions `openModalEventForm` and `saveEv` at ~line 1647–1727)

This task adds the "Combined" type selector option and the child events sub-section to the inline event edit form.

- [ ] **Step 1: Add event type selector to `openModalEventForm`**

In `openModalEventForm`, find where `form.innerHTML = \`` begins (around line 1656). The current form has fields for Name, Start keywords, End keywords, Value regex, Color, and Save/Cancel buttons. 

Replace the `form.innerHTML = \`` template with this updated version that adds a type selector row at the top and a placeholder for the child events section:

```js
  const currentMode = event ? getEventMode(event) : 'dot';
  form.innerHTML = `
    <input type="hidden" id="modal-event-edit-id" value="${event ? event.id : ''}" />
    <div style="margin-bottom:6px;">
      <span class="modal-field-label">Type</span>
      <div id="modal-event-type-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
        ${['dot','gantt','metric','combined'].map(t =>
          `<button type="button" class="modal-event-type-btn${currentMode===t?' active':''}" data-type="${t}"
            style="padding:3px 10px;border-radius:4px;font-size:11px;cursor:pointer;border:1px solid #2e3250;
            background:${currentMode===t?'#0e2040':'#0d1020'};color:${currentMode===t?'#60a5fa':'#5a6080'};"
          >${t}</button>`
        ).join('')}
      </div>
    </div>
    <div>
      <span class="modal-field-label">Name</span>
      <input type="text" id="modal-event-name-input" placeholder="Event name…" value="${event ? esc(event.name) : ''}" />
    </div>
    <div>
      <span class="modal-field-label">Start keywords (comma-separated)</span>
      <input type="text" id="modal-event-start-kw-input" placeholder="e.g. connect, login" value="${event ? esc((event.start_keywords||[]).join(', ')) : ''}" />
    </div>
    <div id="modal-event-end-kw-row">
      <span class="modal-field-label">End keywords (optional)</span>
      <input type="text" id="modal-event-end-kw-input" placeholder="e.g. disconnect" value="${event ? esc((event.end_keywords||[]).join(', ')) : ''}" />
    </div>
    <div id="modal-event-value-regex-row">
      <span class="modal-field-label">Value regex (optional — enables metric chart)</span>
      <input type="text" id="modal-event-value-regex-input" placeholder="e.g. CPU:([\\d.]+)" value="${event ? esc(event.value_regex||'') : ''}" />
    </div>
    <div>
      <span class="modal-field-label">Color</span>
      <div id="modal-event-color-palette" style="display:flex;flex-wrap:wrap;gap:5px;"></div>
    </div>
    <div id="modal-event-children-section" style="display:none;"></div>
    <div style="display:flex;gap:6px;margin-top:4px;">
      <button id="btn-modal-event-save" class="primary" style="flex:1;font-size:0.78rem;">Save</button>
      <button id="btn-modal-event-cancel" style="flex:1;font-size:0.78rem;">Cancel</button>
    </div>`;
```

- [ ] **Step 2: Add type selector wiring and `renderChildrenSection` function**

After `renderEvPalette()` is called (around line 1694), add:

```js
  // ── Type selector wiring ──────────────────────────────────────────────
  let selectedType = currentMode;

  function updateTypeUI() {
    document.querySelectorAll('.modal-event-type-btn').forEach(btn => {
      const active = btn.dataset.type === selectedType;
      btn.style.background = active ? '#0e2040' : '#0d1020';
      btn.style.color      = active ? '#60a5fa' : '#5a6080';
      btn.style.borderColor = active ? '#60a5fa' : '#2e3250';
    });
    // Show/hide fields based on type
    const endKwRow     = document.getElementById('modal-event-end-kw-row');
    const valueRxRow   = document.getElementById('modal-event-value-regex-row');
    const childSection = document.getElementById('modal-event-children-section');
    endKwRow.style.display     = selectedType === 'metric' ? 'none' : '';
    valueRxRow.style.display   = selectedType === 'metric' ? '' : 'none';
    childSection.style.display = selectedType === 'combined' ? '' : 'none';
    if (selectedType === 'combined') renderChildrenSection();
  }

  document.querySelectorAll('.modal-event-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      updateTypeUI();
    });
  });

  // ── Child events state and rendering ─────────────────────────────────
  let childEvents = (event && event.child_events) ? event.child_events.map(c => ({ ...c })) : [];

  function renderChildrenSection() {
    const section = document.getElementById('modal-event-children-section');
    if (!section) return;
    section.innerHTML = `
      <div style="border:1px solid #1a2a3a;border-radius:6px;background:#0b0f1c;overflow:hidden;margin-top:2px;">
        <div style="padding:6px 10px;font-size:10px;color:#3a6080;text-transform:uppercase;letter-spacing:.08em;background:#0d1525;border-bottom:1px solid #1a2a3a;display:flex;align-items:center;gap:8px;">
          <span style="flex:1">Child dot events</span>
          <button type="button" id="btn-add-child-event" style="font-size:10px;padding:2px 8px;background:#0e2535;border:1px solid #1a4060;color:#38bdf8;border-radius:3px;cursor:pointer;">+ Add child</button>
        </div>
        <div id="child-events-list">
          ${childEvents.map((c, i) => renderChildRow(c, i)).join('')}
        </div>
        ${childEvents.length === 0 ? '<div style="padding:8px 10px;font-size:11px;color:#3a4460;font-style:italic;">No child events yet.</div>' : ''}
      </div>
      <div style="font-size:10px;color:#3a4460;font-style:italic;margin-top:3px;">Each child matches log lines by keyword and appears as a labeled dot on the bar.</div>`;

    document.getElementById('btn-add-child-event').addEventListener('click', () => {
      childEvents.push({ id: 'cev-' + Date.now() + '-' + Math.floor(Math.random() * 10000), name: '', start_keywords: [], color: TOPIC_COLORS[childEvents.length % TOPIC_COLORS.length] });
      renderChildrenSection();
    });
    section.querySelectorAll('.btn-del-child').forEach(btn => {
      btn.addEventListener('click', () => {
        childEvents.splice(parseInt(btn.dataset.idx), 1);
        renderChildrenSection();
      });
    });
    section.querySelectorAll('.child-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        childEvents[parseInt(sw.dataset.idx)].color = sw.dataset.color;
        renderChildrenSection();
      });
    });
  }

  function renderChildRow(c, i) {
    const swatches = TOPIC_COLORS.map(col =>
      `<span class="child-color-swatch color-swatch${col===c.color?' selected':''}" data-color="${col}" data-idx="${i}" style="background:${col};width:14px;height:14px;border-radius:50%;display:inline-block;cursor:pointer;border:2px solid ${col===c.color?'#fff':'#2e3250'};"></span>`
    ).join('');
    return `
      <div class="child-event-row" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid #111828;">
        <span style="width:8px;height:8px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block;"></span>
        <input type="text" class="child-name-input modal-event-inline-form input" data-idx="${i}" placeholder="Name…" value="${esc(c.name)}"
          style="flex:1;padding:3px 6px;font-size:11px;background:#0d1020;border:1px solid #2e3250;border-radius:4px;color:#d4d8e1;" />
        <input type="text" class="child-kw-input modal-event-inline-form input" data-idx="${i}" placeholder="start keywords…" value="${esc((c.start_keywords||[]).join(', '))}"
          style="flex:1.4;padding:3px 6px;font-size:11px;background:#0d1020;border:1px solid #2e3250;border-radius:4px;color:#d4d8e1;" />
        <div style="display:flex;gap:3px;flex-wrap:wrap;max-width:80px;">${swatches}</div>
        <button type="button" class="btn-del-child" data-idx="${i}" style="font-size:11px;color:#3e4460;background:none;border:none;cursor:pointer;padding:0 3px;" title="Delete">✕</button>
      </div>`;
  }

  updateTypeUI();  // set initial visibility
```

- [ ] **Step 3: Update `saveEv` to persist `child_events`**

In `saveEv` (around line 1698), find:
```js
    const body = { name, start_keywords, end_keywords, value_regex, color: evColor };
```
Replace with:
```js
    // Read child events from live state if type is combined
    if (selectedType === 'combined') {
      // Sync name/kw inputs into childEvents array before saving
      document.querySelectorAll('.child-name-input').forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        if (childEvents[idx]) childEvents[idx].name = inp.value.trim();
      });
      document.querySelectorAll('.child-kw-input').forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        if (childEvents[idx]) childEvents[idx].start_keywords = inp.value.trim().split(',').map(k => k.trim()).filter(Boolean);
      });
    }
    const validChildren = childEvents.filter(c => c.name);
    const body = {
      name,
      start_keywords,
      end_keywords,   // always stored; spec says combined ignores it, but storing is harmless
      value_regex:   selectedType === 'metric'   ? value_regex  : '',
      color: evColor,
      ...(selectedType === 'combined' && validChildren.length > 0 ? { child_events: validChildren } : {})
    };
```

- [ ] **Step 4: Run tests**
```bash
npx playwright test
```
Expected: 20/20 pass. The new UI doesn't break existing tests since it only adds new fields.

- [ ] **Step 5: Manual smoke check**

Open `http://localhost:8099/shell.html`, load the Log Viewer, open a topic, add an event, select "Combined" type. Verify:
- Child events sub-section appears
- "+ Add child" adds a row
- ✕ removes a row
- Saving stores `child_events` in localStorage (check DevTools → Application → Local Storage)

- [ ] **Step 6: Commit**
```bash
git add index.html
git commit -m "feat: add combined event type UI to modal form"
```

---

### Task 4: Timeline rendering — combined mode

**Files:**
- Modify: `index.html` (functions `buildGanttRows` ~line 1796, `drawEventRow` ~line 1969)

This task makes the timeline draw Gantt bars with labeled child dots for `combined` events.

- [ ] **Step 1: Update `buildGanttRows` to handle `combined`**

In `buildGanttRows`, find the loop `for (const ev of allEvents)` (around line 1798). The current logic checks `vr` (value_regex) first. Add a `combined` branch **before** the `vr` check:

```js
    // ── Combined mode: gantt spans + child dot hits ──────────────────
    if (ev.child_events && ev.child_events.length > 0) {
      // Build spans (same as gantt)
      const sk = (ev.start_keywords || []).map(k => k.toLowerCase());
      const ek = (ev.end_keywords   || []).map(k => k.toLowerCase());
      const spans = [];
      let openSpan = null;
      for (let i = 0; i < logs.length; i++) {
        const l = logs[i];
        if (l.raw || !l.timestamp) continue;
        const t = Date.parse(l.timestamp);
        if (isNaN(t)) continue;
        const haystack = (l.message + ' ' + (l.class_method||'') + ' ' + (l.source_file||'')).toLowerCase();
        const xFrac = (t - minT) / spanMs;
        if (!openSpan && sk.some(k => k && haystack.includes(k))) {
          openSpan = { startFrac: xFrac, startLogIdx: i };
        } else if (openSpan && ek.some(k => k && haystack.includes(k))) {
          spans.push({ ...openSpan, endFrac: xFrac, endLogIdx: i });
          openSpan = null;
        }
      }
      if (openSpan) spans.push({ ...openSpan, endFrac: null, endLogIdx: null });

      // Build child hits (scan all log lines per child)
      const childHits = {};
      for (const child of ev.child_events) {
        const csk = (child.start_keywords || []).map(k => k.toLowerCase());
        const hits = [];
        for (let i = 0; i < logs.length; i++) {
          const l = logs[i];
          if (l.raw || !l.timestamp) continue;
          const t = Date.parse(l.timestamp);
          if (isNaN(t)) continue;
          const haystack = (l.message + ' ' + (l.class_method||'') + ' ' + (l.source_file||'')).toLowerCase();
          const xFrac = (t - minT) / spanMs;
          if (csk.some(k => k && haystack.includes(k))) hits.push({ xFrac, logIdx: i });
        }
        childHits[child.id] = hits;
      }
      rows[ev.id] = { mode: 'combined', spans, childHits };
      continue;
    }
```

- [ ] **Step 2: Update `drawEventRow` to draw combined bars with dots**

In `drawEventRow`, after the `if (rowData.mode === 'metric')` block returns, and before the `// Subtle baseline` line, add a `combined` branch. Find the section around line 2010:

```js
  if (rowData.mode === 'combined') {
    const { spans, childHits } = rowData;
    const barH = 12;
    const barY = (H - barH) / 2;
    const capW = 3;

    // Draw gantt bars (same style as gantt mode)
    for (const span of spans) {
      const x1 = Math.round(span.startFrac * W);
      const x2 = span.endFrac !== null ? Math.round(span.endFrac * W) : W;
      const barW = Math.max(capW * 2 + 1, x2 - x1);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = ev.color;
      ctx.fillRect(x1, barY, barW, barH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ev.color;
      ctx.fillRect(x1, barY, capW, barH);
      if (span.endFrac !== null) {
        ctx.fillRect(x1 + barW - capW, barY, capW, barH);
      } else {
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = ev.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1 + barW, barY); ctx.lineTo(x1 + barW, barY + barH); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1;
      }
    }

    // Draw child dots with mini labels
    const dotR = 5;
    const labelY = barY - 3;  // just above the bar
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    for (const child of (ev.child_events || [])) {
      const hits = childHits[child.id] || [];
      for (const h of hits) {
        const cx = Math.round(h.xFrac * W);
        // Dot
        ctx.fillStyle = child.color;
        ctx.beginPath();
        ctx.arc(cx, H / 2, dotR, 0, Math.PI * 2);
        ctx.fill();
        // Border ring for contrast
        ctx.strokeStyle = '#090c17';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, H / 2, dotR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        // Label above dot
        ctx.fillStyle = '#8090b8';
        ctx.fillText(child.name, cx, labelY);
      }
    }
    return;
  }
```

- [ ] **Step 3: Run tests**
```bash
cd d:\Development\vercel\webex-log-viewer && npx playwright test
```
Expected: 20/20 pass (new test from Task 2 now passes too).

- [ ] **Step 4: Manual visual check**

Using the app with a log file that has keywords matching a combined event:
- Topic Visualization panel should show a bar with colored dots and mini labels above them

- [ ] **Step 5: Commit**
```bash
git add index.html
git commit -m "feat: render combined event bars with child dots in timeline"
```

---

### Task 5: Verify full suite and push

- [ ] **Step 1: Run full test suite**
```bash
cd d:\Development\vercel\webex-log-viewer && npx playwright test
```
Expected: 21/21 tests pass.

- [ ] **Step 2: Manual end-to-end check**

1. Open `http://localhost:8099/shell.html`
2. Open any topic, add a Combined event with 2 child events, save
3. Verify badge shows `combined` in teal
4. Reopen topic — child events still there with names and keywords intact
5. Open Topic Visualization panel — with a log loaded that matches keywords, verify bar appears with dots and labels above them

