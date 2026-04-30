# Overflow Menu Copy & Modal Dismiss Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Copy Topic button into the `⋯` overflow menu, and fix the topic modal dismissing when the user drags to select text.

**Architecture:** All changes are in `templates/index.html` (single-file app). Two independent fixes: Task 1 restructures the overflow menu and simplifies `copyTopic()`; Task 2 replaces the backdrop `click` listener with a `mousedown`/`mouseup` pair and adds a module-level flag.

**Tech Stack:** Vanilla JS, CSS, no backend changes.

---

## File Map

| File | Changes |
|------|---------|
| `templates/index.html` | All changes — CSS update, HTML template change, JS: `renderTopicRows`, `renderTopicList`, `toggleTopicOverflowMenu`, `copyTopic`, `openTopicModal`, backdrop wiring |
| `tests/test_app.py` | No changes — all 27 existing server-side tests must still pass |

---

### Task 1: Move Copy Topic into the overflow menu

**Files:**
- Modify: `templates/index.html` (CSS ~line 489, HTML in `renderTopicRows` ~line 1492, JS in `renderTopicList` ~lines 1455–1456, JS in `toggleTopicOverflowMenu` ~lines 1531–1539, JS `copyTopic` ~lines 1498–1513)

- [ ] **Step 1: Update the CSS base `.menu-item` colour to neutral**

Find (lines 489–493):
```css
    .topic-overflow-menu .menu-item {
      font-size: 0.8rem; color: #f87171; padding: 6px 10px;
      border-radius: 4px; cursor: pointer; display: block;
      background: none; border: none; width: 100%; text-align: left;
    }
```
Change only the `color: #f87171` value to `color: var(--text-primary)`. Leave all other properties untouched:
```css
    .topic-overflow-menu .menu-item {
      font-size: 0.8rem; color: var(--text-primary); padding: 6px 10px;
      border-radius: 4px; cursor: pointer; display: block;
      background: none; border: none; width: 100%; text-align: left;
    }
```

Then, find the hover rule immediately after (line 494):
```css
    .topic-overflow-menu .menu-item:hover { background: #2a1010; }
```
Change the hover background to neutral (was dark red, intended only for Delete — now there are two items):
```css
    .topic-overflow-menu .menu-item:hover { background: #1e2840; }
```

Then, add the danger variant rules **after** that hover rule:
```css
    .topic-overflow-menu .menu-item.danger { color: #f87171; }
    .topic-overflow-menu .menu-item.danger:hover { background: #2a1010; color: #f87171; }
```

- [ ] **Step 2: Remove `.copy-btn` from `renderTopicRows()` template**

Find (line 1492):
```js
        <button class="icon-btn copy-btn" data-id="${t.id}" title="Copy topic">&#x2398;</button>
```
Delete this line entirely. The `.topic-actions` div now contains only three buttons: toggle-btn, edit-btn, overflow-btn.

- [ ] **Step 3: Remove `.copy-btn` wiring from `renderTopicList()`**

Find (lines 1455–1456):
```js
  list.querySelectorAll('.copy-btn').forEach(btn =>
    btn.addEventListener('click', () => copyTopic(btn.dataset.id)));
```
Delete these two lines entirely.

- [ ] **Step 4: Update `toggleTopicOverflowMenu()` — menu HTML and wiring**

Find the `menu.innerHTML` assignment (line 1531):
```js
  menu.innerHTML = `<button class="menu-item" data-id="${topicId}">🗑 Delete</button>`;
```
Replace with:
```js
  menu.innerHTML = `
    <button class="menu-item copy-menu-item" data-id="${topicId}">&#x2398; Copy</button>
    <button class="menu-item danger" data-id="${topicId}">&#128465; Delete</button>
  `;
```

Then find the wiring block (lines 1534–1539):
```js
  menu.querySelector('.menu-item').addEventListener('click', e => {
    e.stopPropagation();
    menu.remove();
    _activeOverflowMenu = null;
    deleteTopic(topicId);
  });
```
Replace with two separate wiring blocks:
```js
  menu.querySelector('.copy-menu-item').addEventListener('click', e => {
    e.stopPropagation();
    const overflowBtn = btn;  // btn is the ⋯ button, in scope from the function parameter
    menu.remove();
    _activeOverflowMenu = null;
    _modalOpenedBy = overflowBtn;
    copyTopic(topicId);
  });
  menu.querySelector('.menu-item.danger').addEventListener('click', e => {
    e.stopPropagation();
    menu.remove();
    _activeOverflowMenu = null;
    deleteTopic(topicId);
  });
```

- [ ] **Step 5: Simplify `copyTopic()` — remove internal `_modalOpenedBy` assignment**

Find the full `copyTopic()` function (lines 1498–1513):
```js
function copyTopic(topicId) {
  const source = topicsState.find(t => t.id === topicId);
  if (!source) return;
  const btn = document.querySelector(`.copy-btn[data-id="${CSS.escape(topicId)}"]`);
  _modalOpenedBy = btn;
  openTopicModal(source);
  // Switch to "new topic" mode — openTopicModal sets editingTopicId = source.id,
  // we immediately override it to null so Save will POST rather than PUT.
  // The 50ms setTimeout inside openTopicModal only fires focus, not editingTopicId.
  editingTopicId = null;
  document.getElementById('modal-title').textContent = 'New Topic (Copy)';
  document.getElementById('btn-modal-add-event').style.display = 'none';
  // Re-render event list in read-only mode (edit/delete/copy buttons hidden)
  // because editingTopicId is now null — buttons would fail with null topicId.
  renderModalEventsList(source, true);
}
```
Replace with (removes the querySelector and `_modalOpenedBy = btn` lines; caller sets `_modalOpenedBy` before calling `copyTopic`):
```js
function copyTopic(topicId) {
  const source = topicsState.find(t => t.id === topicId);
  if (!source) return;
  // _modalOpenedBy is set by the caller before invoking copyTopic()
  openTopicModal(source);
  // Switch to "new topic" mode — openTopicModal sets editingTopicId = source.id,
  // we immediately override it to null so Save will POST rather than PUT.
  // The 50ms setTimeout inside openTopicModal only fires focus, not editingTopicId.
  editingTopicId = null;
  document.getElementById('modal-title').textContent = 'New Topic (Copy)';
  document.getElementById('btn-modal-add-event').style.display = 'none';
  // Re-render event list in read-only mode (edit/delete/copy buttons hidden)
  // because editingTopicId is now null — buttons would fail with null topicId.
  renderModalEventsList(source, true);
}
```

- [ ] **Step 6: Run tests**

```bash
cd D:\Development\WebexApp_Log_Viewer
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 7: Commit**

```bash
git add templates/index.html
git commit -m "feat: move copy topic into overflow menu"
```

---

### Task 2: Fix modal dismissing on text selection

**Files:**
- Modify: `templates/index.html` (~line 1515 for new variable, ~line 1554 for `openTopicModal` first line, ~lines 2382–2384 for backdrop handler)

- [ ] **Step 1: Add `_backdropMousedownOnBackdrop` state variable**

Find the two adjacent module-level declarations (lines 1515–1516):
```js
let _activeOverflowMenu = null;
let _modalOpenedBy = null;
```
Add the new variable immediately after:
```js
let _activeOverflowMenu = null;
let _modalOpenedBy = null;
let _backdropMousedownOnBackdrop = false;
```

- [ ] **Step 2: Reset the flag at the start of `openTopicModal()`**

Find the `openTopicModal` function signature and its first body line (lines 1553–1554):
```js
function openTopicModal(topic = null) {
  editingTopicId = topic ? topic.id : null;
```
Insert the reset as the very first line of the function body:
```js
function openTopicModal(topic = null) {
  _backdropMousedownOnBackdrop = false;
  editingTopicId = topic ? topic.id : null;
```

- [ ] **Step 3: Replace the backdrop `click` handler with `mousedown`/`mouseup`**

Find (lines 2382–2384):
```js
  document.getElementById('topic-modal-backdrop').addEventListener('click', e => {
    if (e.target === document.getElementById('topic-modal-backdrop')) closeTopicModal();
  });
```
Replace with:
```js
  const _bd = document.getElementById('topic-modal-backdrop');
  _bd.addEventListener('mousedown', e => {
    _backdropMousedownOnBackdrop = (e.target === _bd);
  });
  _bd.addEventListener('mouseup', e => {
    if (_backdropMousedownOnBackdrop && e.target === _bd) closeTopicModal();
    _backdropMousedownOnBackdrop = false;
  });
```

- [ ] **Step 4: Run tests**

```bash
cd D:\Development\WebexApp_Log_Viewer
python -m pytest tests/test_app.py -v
```
Expected: 27 passed.

- [ ] **Step 5: Commit**

```bash
git add templates/index.html
git commit -m "fix: prevent modal closing when selecting text inside dialog"
```

---

## Final Verification

- [ ] Run full test suite: `python -m pytest tests/test_app.py -v` — 27 passed
- [ ] Load app, open the `⋯` menu on a topic — verify Copy and Delete items appear; Copy is neutral-coloured, Delete is red
- [ ] Click Copy from the overflow menu — modal opens titled "New Topic (Copy)", event list is read-only, saving creates a new topic
- [ ] Click Delete from the overflow menu — existing delete confirmation flow works as before
- [ ] Open the topic modal, click-drag to select text in any field — modal stays open
- [ ] Click the backdrop (dark area outside the modal) — modal closes
