# Overflow Menu Copy & Modal Dismiss Fix — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** `templates/index.html` only

---

## Overview

Two small fixes to the topic sidebar and modal:

1. **Move Copy Topic into the overflow menu** — removes the ⎘ button from the topic action row and adds it as a menu item in the `⋯` overflow menu.
2. **Fix modal dismissing on text selection** — replaces the `click` backdrop handler with a `mousedown`/`mouseup` pair so that dragging to select text inside the modal no longer closes it.

---

## Change 1: Move Copy Topic into the Overflow Menu

### Current State

`renderTopicRows()` renders four buttons in `.topic-actions`:
- Toggle (●/○)
- Edit (✏)
- Copy (⎘) — **to be removed from here**
- More (⋯)

`toggleTopicOverflowMenu()` builds a dynamic menu with one item:
```html
<button class="menu-item" data-id="${topicId}">🗑 Delete</button>
```

### HTML Change — `renderTopicRows()`

Remove `.copy-btn` from the `.topic-actions` template. The actions become:
```js
<button class="icon-btn toggle-btn${t.enabled?' active':''}" data-id="${t.id}" title="${t.enabled?'Disable':'Enable'}">${t.enabled?'&#x25CF;':'&#x25CB;'}</button>
<button class="icon-btn edit-btn" data-id="${t.id}" title="Edit">&#9998;</button>
<button class="icon-btn overflow-btn" data-id="${t.id}" title="More">&#x22EF;</button>
```

### JS Change — `toggleTopicOverflowMenu()`

Replace the `menu.innerHTML` assignment with:
```js
menu.innerHTML = `
  <button class="menu-item copy-menu-item" data-id="${topicId}">&#x2398; Copy</button>
  <button class="menu-item danger" data-id="${topicId}">&#128465; Delete</button>
`;
```

Wire both items. For Copy, `_modalOpenedBy` must be set to the overflow button (`btn`) **before** calling `copyTopic()` — this replaces the `_modalOpenedBy` assignment that previously happened inside `copyTopic()` via `querySelector('.copy-btn[...]')` (which will now return null). Also, `copyTopic()` must be updated to **not** set `_modalOpenedBy` internally (remove the `const btn = querySelector(...)` and `_modalOpenedBy = btn` lines from `copyTopic()`), since the caller now owns that responsibility.

```js
menu.querySelector('.copy-menu-item').addEventListener('click', e => {
  e.stopPropagation();
  const overflowBtn = btn;  // `btn` is the ⋯ button, in scope from toggleTopicOverflowMenu's parameter
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

### JS Change — `copyTopic()`

Remove the two lines that looked up the `.copy-btn` DOM element and set `_modalOpenedBy`, since focus-return is now the caller's responsibility:

```js
// DELETE these two lines from copyTopic():
const btn = document.querySelector(`.copy-btn[data-id="${CSS.escape(topicId)}"]`);
_modalOpenedBy = btn;
```

The function body becomes:
```js
function copyTopic(topicId) {
  const source = topicsState.find(t => t.id === topicId);
  if (!source) return;
  // _modalOpenedBy is set by the caller before invoking copyTopic()
  openTopicModal(source);
  editingTopicId = null;
  document.getElementById('modal-title').textContent = 'New Topic (Copy)';
  document.getElementById('btn-modal-add-event').style.display = 'none';
  renderModalEventsList(source, true);
}
```

### JS Change — `renderTopicList()`

Remove the `.copy-btn` wiring block:
```js
// DELETE this block:
list.querySelectorAll('.copy-btn').forEach(btn =>
  btn.addEventListener('click', () => copyTopic(btn.dataset.id)));
```

### CSS — base `.menu-item` and `.menu-item.danger`

The **existing** `.menu-item` rule currently uses `color: #f87171` (red) because the only menu item was Delete. Now that Copy is also a `.menu-item`, the base rule must be changed to a neutral colour so Copy does not appear red. The `.menu-item.danger` variant then applies red only to Delete.

Update the existing `.menu-item` rule (find by selector `.topic-overflow-menu .menu-item`):
```css
/* Change colour from #f87171 to a neutral text colour */
.topic-overflow-menu .menu-item { color: var(--text-primary); }
/* Keep neutral hover as-is (dark background) */
```

Add the danger variant (new rule, scoped to match the existing `.topic-overflow-menu` scope):
```css
.topic-overflow-menu .menu-item.danger { color: #f87171; }
.topic-overflow-menu .menu-item.danger:hover { background: #2a1010; color: #f87171; }
```

---

## Change 2: Fix Modal Dismissing on Text Selection

### Root Cause

The existing handler:
```js
document.getElementById('topic-modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('topic-modal-backdrop')) closeTopicModal();
});
```

A text-selection drag that *starts* inside the modal and *ends* on the backdrop causes the browser to synthesise a `click` event on the backdrop. The `e.target === backdrop` guard does not protect against this because the mouseup — and therefore the click — lands on the backdrop.

### Fix

Replace the `click` listener with a `mousedown`/`mouseup` pair. Add a module-level state variable (near the other `_modal*` globals):

```js
let _backdropMousedownOnBackdrop = false;
```

Reset this flag at the start of `openTopicModal()` to prevent a stale `true` value from a previous interaction closing a freshly-opened modal:

```js
function openTopicModal(topic) {
  _backdropMousedownOnBackdrop = false;  // ← add as first line
  …
}
```

Replace the `click` listener with:
```js
const backdrop = document.getElementById('topic-modal-backdrop');
backdrop.addEventListener('mousedown', e => {
  _backdropMousedownOnBackdrop = (e.target === backdrop);
});
backdrop.addEventListener('mouseup', e => {
  if (_backdropMousedownOnBackdrop && e.target === backdrop) closeTopicModal();
  _backdropMousedownOnBackdrop = false;
});
```

The modal closes only when both `mousedown` and `mouseup` occur on the backdrop itself. A drag that starts inside the modal will set `_backdropMousedownOnBackdrop = false` on mousedown, so even if mouseup lands on the backdrop, the modal is not closed. The flag is also reset in `openTopicModal()` so that a mousedown-then-Escape sequence (which leaves the flag `true`) cannot cause an immediate close the next time the modal opens.

---

## Out of Scope

- Adding keyboard shortcut to open the overflow menu.
- Animating the overflow menu.
- Any other modal dismissal paths (Escape key, × button, Save/Cancel buttons) — those are unaffected.
- Touch events — not relevant for this desktop dev tool.
