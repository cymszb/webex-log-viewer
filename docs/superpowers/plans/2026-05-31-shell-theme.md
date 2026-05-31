# Extend Light Mode to Shell & Log Viewer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the knowledge-hub light mode to the shell, log-viewer, and upcoming pages with a global toggle.

**Architecture:** Each HTML page gets `[data-theme="light"]` CSS overrides and a small inline JS snippet. The shell page adds a theme toggle button in the nav rail and communicates theme changes to the iframe via `postMessage`. The iframe and upcoming pages listen for these messages.

**Tech Stack:** Vanilla HTML/CSS/JS (no frameworks)

---

### Task 1: Add light mode to shell.html

**Files:**
- Modify: `shell.html`

- [ ] **Step 1: Add light palette CSS**

After the existing `:root` block, add:

```css
[data-theme="light"] {
  --bg-base:    #f4f5f7;
  --bg-nav:     #ffffff;
  --bg-hover:   #edeff3;
  --bg-active:  #e2e5f0;
  --border:     #dde0e5;
  --text-muted: #8b95a5;
  --text-dim:   #5c637a;
  --text:       #1a1d2e;
  --accent:     #4a63cc;
}
```

- [ ] **Step 2: Update hardcoded tooltip color**

Find `.nav-tooltip { ... background: #1a1d2e; ... }` and change `background: #1a1d2e` to `background: var(--bg-hover)`.

- [ ] **Step 3: Add theme toggle button in nav rail**

Insert before the settings nav item (`.nav-settings`):

```html
<button id="theme-toggle" class="nav-item" style="width:auto;padding:0 10px;font-size:11px;margin-top:auto;gap:4px;border-radius:20px;border:1px solid var(--border);">
  <span class="dot" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;"></span>
  <span>Light</span>
</button>
```

- [ ] **Step 4: Add theme JS before `</body>`**

```html
<script>
(function() {
  var THEME_KEY = 'theme';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var iframe = document.getElementById('tool-frame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'set-theme', theme: theme }, '*');
    }
  }
  function toggle() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    apply(next);
    updateToggleButton(next);
  }
  function updateToggleButton(theme) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var dot = btn.querySelector('.dot');
    var label = btn.querySelector('span:last-child');
    if (theme === 'dark') {
      if (dot) { dot.style.background = '#fcd34d'; dot.style.boxShadow = '0 0 6px rgba(252,211,77,0.4)'; }
      if (label) label.textContent = 'Light';
    } else {
      if (dot) { dot.style.background = '#f59e0b'; dot.style.boxShadow = 'none'; }
      if (label) label.textContent = 'Dark';
    }
  }
  var saved = localStorage.getItem(THEME_KEY) || 'dark';
  apply(saved);
  updateToggleButton(saved);
  document.getElementById('theme-toggle').addEventListener('click', toggle);
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'set-theme') {
      localStorage.setItem(THEME_KEY, e.data.theme);
      apply(e.data.theme);
      updateToggleButton(e.data.theme);
    }
  });
})();
</script>
```

- [ ] **Step 5: Commit**

```bash
git add shell.html && git commit -m "feat: add light mode theme toggle to shell page"
```

---

### Task 2: Add light mode to index.html (log-viewer)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add light palette CSS**

After the existing `:root` block, add:

```css
[data-theme="light"] {
  --bg-base:        #f4f5f7;
  --bg-toolbar:     #ffffff;
  --bg-header:      #f8f9fb;
  --bg-sidebar:     #f8f9fb;
  --bg-elevated:    #ffffff;
  --bg-card:        #ffffff;
  --bg-card-active: #eef0f4;
  --border-subtle:  #e2e5ea;
  --border-default: #dde0e5;
  --border-input:   #d0d5e0;
  --border-active:  #4a63cc;
  --text-primary:   #1a1d2e;
  --text-secondary: #5c637a;
  --text-muted:     #8b95a5;
  --accent-blue:    #4a63cc;
  --accent-cyan:    #0891b2;
}
```

- [ ] **Step 2: Add theme JS before `</body>`**

```html
<script>
(function() {
  var THEME_KEY = 'theme';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  apply(localStorage.getItem(THEME_KEY) || 'dark');
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'set-theme') {
      apply(e.data.theme);
    }
  });
})();
</script>
```

- [ ] **Step 3: Variablize scrollbar colors**

Replace hardcoded scrollbar colors:
- `scrollbar-color: #1e2535 #0a0d14` → `scrollbar-color: var(--border-default) var(--bg-base)`
- `::-webkit-scrollbar-track { background: #0a0d14 }` → `background: var(--bg-base)`
- `::-webkit-scrollbar-thumb { background: #1e2535 }` → `background: var(--border-default)`
- `::-webkit-scrollbar-thumb:hover { background: #2a3550 }` → `background: var(--text-muted)`

- [ ] **Step 4: Commit**

```bash
git add index.html && git commit -m "feat: add light mode support to log viewer page"
```

---

### Task 3: Add light mode to upcoming.html

**Files:**
- Modify: `upcoming.html`

- [ ] **Step 1: Add light palette CSS + JS snippet**

Read the file, identify its CSS variables, add `[data-theme="light"]` overrides and the same postMessage listener JS as index.html.

- [ ] **Step 2: Commit**

```bash
git add upcoming.html && git commit -m "feat: add light mode support to upcoming page"
```

---

### Task 4: End-to-end verification

- [ ] **Step 1: Open shell.html in browser and verify dark mode**

Open `shell.html` in browser. Verify dark theme renders correctly. Toggle shows "Light" with amber dot.

- [ ] **Step 2: Click toggle — verify light mode on shell**

Shell nav rail, toolbar, and content should switch to light theme. Toggle now shows "Dark".

- [ ] **Step 3: Verify persistence**

Refresh the page. Light mode should persist. Check `localStorage.getItem('theme')` returns `'light'`.

- [ ] **Step 4: Verify iframe receives theme**

Load a log-viewer tool in the iframe. Verify it also switches to light mode when shell toggles.

- [ ] **Step 5: Verify knowledge hub**

Open knowledge hub in a separate tool tab. Verify its theme toggle works independently.
