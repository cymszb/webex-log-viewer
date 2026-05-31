# Extend Light Mode to Shell & Log Viewer — Design Spec

## Overview

Extend the light-mode theme (already implemented in knowledge-hub) to the shell page and log-viewer iframe content. Add a global theme toggle in the shell's nav rail that switches both shell and iframe content simultaneously via `postMessage`.

## Architecture

```
shell.html                          log-viewer (index.html in iframe)
─────────                          ─────────────────────────────────
CSS: [data-theme="light"] vars    CSS: [data-theme="light"] vars
JS: localStorage read/write        JS: localStorage read on load
JS: set data-theme on <html>      JS: listen for postMessage
JS: postMessage to iframe          JS: apply data-theme on message
Toggle: nav rail pill button       No toggle — controlled by shell
```

## Theme Toggle

- **Position:** nav rail, below tool buttons, above settings icon
- **Style:** pill-shaped, matches knowledge-hub toggle (border-radius: 20px, amber dot, fixed-width text)
- **Behavior:** same as knowledge-hub `useTheme` hook — reads localStorage, defaults to 'dark', sets data-theme, persists

## Shell Changes (shell.html)

### CSS: Add light palette override

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

### CSS: Update hardcoded colors

- `.nav-tooltip { background: #1a1d2e; }` → `background: var(--bg-hover);`

### JS snippet (inline `<script>` before `</body>`)

```javascript
(function() {
  const THEME_KEY = 'theme';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const iframe = document.getElementById('tool-frame');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'set-theme', theme }, '*');
    }
  }
  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    apply(next);
    updateToggleButton(next);
  }
  function updateToggleButton(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const dot = btn.querySelector('.dot');
    if (theme === 'dark') {
      if (dot) { dot.style.background = '#fcd34d'; dot.style.boxShadow = '0 0 6px rgba(252,211,77,0.4)'; }
      btn.childNodes[btn.childNodes.length - 1].textContent = 'Light';
    } else {
      if (dot) { dot.style.background = '#f59e0b'; dot.style.boxShadow = 'none'; }
      btn.childNodes[btn.childNodes.length - 1].textContent = 'Dark';
    }
  }
  // Init
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  apply(saved);
  document.getElementById('theme-toggle').addEventListener('click', toggle);
  updateToggleButton(saved);
  // Listen for messages from iframe (future: if iframe has its own toggle)
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'set-theme') {
      localStorage.setItem(THEME_KEY, e.data.theme);
      apply(e.data.theme);
      updateToggleButton(e.data.theme);
    }
  });
})();
```

### HTML: Add toggle button to nav rail

Insert before the settings nav item:

```html
<button id="theme-toggle" class="nav-item" style="width:auto;padding:0 8px;font-size:11px;margin-top:auto;gap:4px;border-radius:20px;border:1px solid var(--border);">
  <span class="dot" style="width:6px;height:6px;border-radius:50%;flex-shrink:0;"></span>
  <span>Light</span>
</button>
```

## Log-Viewer Changes (index.html)

### CSS: Add light palette override

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

### JS snippet (inline `<script>` before `</body>`)

```javascript
(function() {
  const THEME_KEY = 'theme';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  // Init from localStorage
  apply(localStorage.getItem(THEME_KEY) || 'dark');
  // Listen for shell messages
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'set-theme') {
      apply(e.data.theme);
    }
  });
})();
```

### Scrollbar: use variables

Change hardcoded scrollbar colors to use `var(--border-default)` and `var(--bg-base)`.

## Ordering

No ordering changes. Theme is purely visual, doesn't affect data.

## Upcoming Page (upcoming.html)

Same as log-viewer: add `[data-theme="light"]` overrides for its CSS variables and the same JS snippet for receiving postMessage.
