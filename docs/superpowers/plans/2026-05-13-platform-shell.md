# Platform Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive shell (`shell.html`) that wraps tools in an `<iframe>` with a left nav rail (desktop) and bottom nav bar (mobile portrait), driven by `tools.json`, with an `upcoming.html` placeholder for Knowledge Hub.

**Architecture:** `shell.html` is the new canonical entry point; it fetches `tools.json` and renders the nav + iframe. `index.html` (Log Viewer) and `upcoming.html` each guard against being loaded directly (top-level redirect to the shell). Routing uses query params (`?tool=<id>`) with `history.pushState` for back/forward support.

**Tech Stack:** Vanilla JS (ES modules not required — match existing `index.html` style), CSS media queries, no build step, Vercel static deployment.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `shell.html` | Create | Entry point: nav skeleton + iframe |
| `shell.js` | Create | Fetch tools.json, render nav, routing, SVG icon map |
| `tools.json` | Create | Tool registry |
| `upcoming.html` | Create | "Coming Soon" placeholder; reads `?name=` |
| `index.html` | Modify (3 lines) | Top-level redirect guard |
| `vercel.json` | Modify (1 line) | Remove catch-all rewrite |

---

### Task 1: tools.json and vercel.json

**Files:**
- Create: `tools.json`
- Modify: `vercel.json`

- [ ] **Step 1: Create `tools.json`**

```json
[
  { "id": "log-viewer",    "label": "Log Viewer",    "src": "index.html",                        "icon": "log"  },
  { "id": "knowledge-hub", "label": "Knowledge Hub", "src": "upcoming.html?name=Knowledge+Hub",  "icon": "book" }
]
```

- [ ] **Step 2: Update `vercel.json` — remove the catch-all rewrite**

Current content:
```json
{
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

New content (remove the `rewrites` array entirely, keep `framework: null`):
```json
{
  "framework": null
}
```

Rationale: all files are static assets served directly by Vercel. The old catch-all was for the SPA path routing pattern; this shell uses query params so no rewriting is needed.

- [ ] **Step 3: Verify locally that both files are valid JSON**

Open `tools.json` and `vercel.json` in a JSON validator or run:
```bash
node -e "require('./tools.json'); console.log('ok')"
node -e "require('./vercel.json'); console.log('ok')"
```

Expected: `ok` both times.

- [ ] **Step 4: Commit**

```bash
git add tools.json vercel.json
git commit -m "feat: add tools registry and fix vercel routing"
```

---

### Task 2: upcoming.html

**Files:**
- Create: `upcoming.html`

This is a self-contained static page. No external dependencies.

- [ ] **Step 1: Create `upcoming.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coming Soon</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0d14;
      color: #d4d8e1;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
    }
    h1 { font-size: 22px; font-weight: 600; color: #a0b8d8; }
    p  { font-size: 14px; color: #5a6080; }
  </style>
</head>
<body>
  <script>
    // Redirect to shell if loaded as top-level document (not inside iframe)
    if (window.self === window.top) {
      const params = new URLSearchParams(location.search);
      // Find the matching tool by label, fall back to first tool
      fetch('tools.json')
        .then(r => r.json())
        .then(tools => {
          const name = params.get('name') || '';
          const match = tools.find(t => t.label === name) || tools[0];
          location.replace('shell.html?tool=' + match.id);
        })
        .catch(() => location.replace('shell.html'));
    }
  </script>
  <h1 id="tool-name">Coming Soon</h1>
  <p>This tool is not yet available.</p>
  <script>
    const n = new URLSearchParams(location.search).get('name');
    if (n) document.getElementById('tool-name').textContent = n;
  </script>
</body>
</html>
```

- [ ] **Step 2: Open `upcoming.html` in a browser directly (as top-level)**

Navigate to `http://localhost:8099/upcoming.html?name=Knowledge+Hub`

Expected: redirects to `shell.html?tool=knowledge-hub` (shell doesn't exist yet, so you'll get a 404 — that's fine at this stage, the redirect logic is what matters).

- [ ] **Step 3: Commit**

```bash
git add upcoming.html
git commit -m "feat: add upcoming placeholder page"
```

---

### Task 3: shell.html and shell.js

**Files:**
- Create: `shell.html`
- Create: `shell.js`

This is the main task. `shell.html` provides the layout skeleton; `shell.js` does all the logic.

- [ ] **Step 1: Create `shell.js`**

```js
// shell.js — platform nav + routing

const ICONS = {
  log: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>`,
  book: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>`,
  settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>`
};

let tools = [];

function getActiveToolId() {
  const params = new URLSearchParams(location.search);
  const id = params.get('tool');
  if (id && tools.find(t => t.id === id)) return id;
  return tools[0]?.id || '';
}

function activateTool(id, pushState = true) {
  const tool = tools.find(t => t.id === id);
  if (!tool) return;

  // Update iframe
  document.getElementById('tool-frame').src = tool.src;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Update page title
  document.title = tool.label + ' — Webex Tools';

  if (pushState) {
    history.pushState({ tool: id }, '', '?tool=' + id);
  }
}

function renderNav(tools) {
  const rail = document.getElementById('nav-rail');
  const bar  = document.getElementById('nav-bar');

  const makeItem = (tool, includeLabel) => {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.id = tool.id;
    btn.setAttribute('aria-label', tool.label);
    btn.innerHTML = (ICONS[tool.icon] || '') +
      (includeLabel ? `<span class="nav-label">${tool.label}</span>` : '') +
      (!includeLabel ? `<span class="nav-tooltip">${tool.label}</span>` : '');
    btn.addEventListener('click', () => activateTool(tool.id));
    return btn;
  };

  tools.forEach(tool => {
    rail.appendChild(makeItem(tool, false));
    bar.appendChild(makeItem(tool, true));
  });

  // Settings placeholder (rail only)
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'nav-item nav-settings';
  settingsBtn.setAttribute('aria-label', 'Settings');
  settingsBtn.setAttribute('aria-disabled', 'true');
  settingsBtn.innerHTML = ICONS.settings + '<span class="nav-tooltip">Settings</span>';
  rail.appendChild(settingsBtn);
}

// Boot
fetch('tools.json')
  .then(r => r.json())
  .then(data => {
    tools = data;
    renderNav(tools);
    activateTool(getActiveToolId(), false);
  });

// Back/forward
window.addEventListener('popstate', e => {
  const id = (e.state && e.state.tool) || getActiveToolId();
  activateTool(id, false);
});
```

- [ ] **Step 2: Create `shell.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webex Tools</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-base:    #0a0d14;
      --bg-nav:     #0d1020;
      --bg-hover:   #1a1d2e;
      --bg-active:  #1a2a40;
      --border:     #1e2240;
      --text-muted: #5a6080;
      --text-dim:   #8090b8;
      --text:       #d4d8e1;
      --accent:     #60a5fa;
      --rail-width: 52px;
      --bar-height: 56px;
    }

    html, body { height: 100%; background: var(--bg-base); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* ── Layout ── */
    .shell { display: flex; height: 100%; }

    #tool-frame {
      flex: 1;
      border: none;
      background: var(--bg-base);
      min-width: 0;
    }

    /* ── Left rail (default) ── */
    #nav-rail {
      width: var(--rail-width);
      background: var(--bg-nav);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
      gap: 4px;
      flex-shrink: 0;
    }

    #nav-rail .nav-settings { margin-top: auto; }

    #nav-bar { display: none; }

    /* ── Nav items (shared) ── */
    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      border-radius: 8px;
      transition: background 0.15s, color 0.15s;
    }

    /* Rail item sizing */
    #nav-rail .nav-item { width: 40px; height: 40px; }

    .nav-item:hover  { background: var(--bg-hover); color: var(--text-dim); }
    .nav-item.active { background: var(--bg-active); color: var(--accent); }

    /* Rail active indicator — right edge */
    #nav-rail .nav-item.active::after {
      content: '';
      position: absolute;
      right: -1px; top: 8px; bottom: 8px;
      width: 3px;
      background: var(--accent);
      border-radius: 2px 0 0 2px;
    }

    /* Disabled settings button */
    .nav-item[aria-disabled="true"] { opacity: 0.4; cursor: default; pointer-events: none; }

    /* Tooltip (rail only) */
    .nav-tooltip {
      position: absolute;
      left: calc(var(--rail-width) + 4px);
      top: 50%; transform: translateY(-50%);
      background: #1a1d2e;
      color: var(--text);
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.1s;
      z-index: 200;
    }
    .nav-item:hover .nav-tooltip { opacity: 1; }

    /* ── Mobile portrait ── */
    @media (max-width: 600px) and (orientation: portrait) {
      .shell { flex-direction: column; }

      #nav-rail { display: none; }

      #nav-bar {
        display: flex;
        order: 2;               /* bar below iframe */
        height: var(--bar-height);
        background: var(--bg-nav);
        border-top: 1px solid var(--border);
        flex-shrink: 0;
      }

      #tool-frame { order: 1; height: calc(100% - var(--bar-height)); }

      /* Bar item sizing */
      #nav-bar .nav-item {
        flex: 1;
        flex-direction: column;
        height: 100%;
        gap: 3px;
        border-radius: 0;
        font-size: 10px;
        color: var(--text-muted);
      }

      #nav-bar .nav-label {
        font-size: 10px;
        line-height: 1;
      }

      /* Bar active indicator — top edge */
      #nav-bar .nav-item.active::before {
        content: '';
        position: absolute;
        top: 0; left: 8px; right: 8px;
        height: 3px;
        background: var(--accent);
        border-radius: 0 0 2px 2px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav id="nav-rail" aria-label="Tools"></nav>
    <iframe id="tool-frame" title="Tool" src=""></iframe>
    <nav id="nav-bar" aria-label="Tools"></nav>
  </div>
  <script src="shell.js"></script>
</body>
</html>
```

- [ ] **Step 3: Serve the project locally and open `shell.html`**

```bash
python -m http.server 8099
```

Open: `http://localhost:8099/shell.html`

Expected:
- Left nav rail visible with Log Viewer and Knowledge Hub icons
- Log Viewer loads in the iframe (the existing app)
- Clicking Knowledge Hub shows `upcoming.html?name=Knowledge+Hub` in the iframe

- [ ] **Step 4: Test mobile portrait layout**

In browser DevTools, toggle device emulation to a portrait phone (e.g. 390×844).

Expected:
- Left rail is gone
- Bottom nav bar appears with icon + label for each tool
- Active item has blue top-edge indicator
- Tapping each item switches the iframe content

- [ ] **Step 5: Test back/forward navigation**

Click Log Viewer → click Knowledge Hub → press browser Back.

Expected: returns to Log Viewer (URL changes to `?tool=log-viewer`, iframe switches).

- [ ] **Step 6: Commit**

```bash
git add shell.html shell.js
git commit -m "feat: add platform shell with responsive nav"
```

---

### Task 4: index.html top-level redirect guard

**Files:**
- Modify: `index.html` (add ~5 lines near top of `<head>`)

- [ ] **Step 1: Add the redirect guard to `index.html`**

Find the opening `<head>` tag and add this as the very first `<script>` inside it (before any other scripts or stylesheets):

```html
<script>
  // Redirect to shell if opened as top-level page (not inside iframe)
  if (window.self === window.top) {
    location.replace('shell.html?tool=log-viewer');
  }
</script>
```

- [ ] **Step 2: Verify redirect works**

Open `http://localhost:8099/index.html` directly.

Expected: immediately redirects to `http://localhost:8099/shell.html?tool=log-viewer`.

- [ ] **Step 3: Verify Log Viewer still works inside the shell**

Open `http://localhost:8099/shell.html` (or `?tool=log-viewer`).

Expected: Log Viewer loads normally in the iframe — no redirect loop.

- [ ] **Step 4: Run the Playwright test suite**

```bash
npx playwright test
```

Expected: all 15 tests pass. The tests use `http://localhost:8099` (which now redirects to `shell.html`). This will likely break some tests because they expect `index.html` to load directly.

If tests fail due to the redirect, update `playwright.config.js` `baseURL` to point directly to `index.html`:

```js
use: { baseURL: 'http://localhost:8099/index.html' }
```

Re-run tests. Expected: all 15 tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.html playwright.config.js   # include playwright.config.js only if changed
git commit -m "feat: redirect index.html to shell when opened directly"
```

---

### Task 5: Smoke test for the shell

**Files:**
- Modify: `tests/specs/smoke.spec.js` (add shell tests)
- Optionally: Create `tests/specs/shell.spec.js` (preferred — keeps concerns separate)

Add a new spec file for shell-specific smoke tests.

- [ ] **Step 1: Create `tests/specs/shell.spec.js`**

```js
const { test, expect } = require('@playwright/test');

test.describe('Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shell.html');
  });

  test('loads shell with nav rail', async ({ page }) => {
    await expect(page.locator('#nav-rail')).toBeVisible();
    await expect(page.locator('#tool-frame')).toBeVisible();
  });

  test('Log Viewer is the default active tool', async ({ page }) => {
    const active = page.locator('#nav-rail .nav-item.active');
    await expect(active).toHaveAttribute('aria-label', 'Log Viewer');
  });

  test('switching to Knowledge Hub loads upcoming page', async ({ page }) => {
    await page.locator('#nav-rail .nav-item[aria-label="Knowledge Hub"]').click();
    const frame = page.frameLocator('#tool-frame');
    await expect(frame.locator('#tool-name')).toHaveText('Knowledge Hub');
  });

  test('URL updates when switching tools', async ({ page }) => {
    await page.locator('#nav-rail .nav-item[aria-label="Knowledge Hub"]').click();
    await expect(page).toHaveURL(/tool=knowledge-hub/);
  });

  test('index.html redirects to shell', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveURL(/shell\.html\?tool=log-viewer/);
  });
});
```

- [ ] **Step 2: Run shell tests**

```bash
npx playwright test tests/specs/shell.spec.js
```

Expected: all 5 tests pass.

- [ ] **Step 3: Run full test suite**

```bash
npx playwright test
```

Expected: all tests pass (15 original + 5 new shell tests = 20 total).

- [ ] **Step 4: Commit**

```bash
git add tests/specs/shell.spec.js
git commit -m "test: add shell smoke tests"
```

---

### Task 6: Final check and push

- [ ] **Step 1: Run full test suite one final time**

```bash
npx playwright test
```

Expected: all tests pass.

- [ ] **Step 2: Open shell in browser and do a manual check**

- Desktop: left rail shows, tooltips appear on hover, both tools switch correctly
- DevTools mobile portrait: bottom bar shows, labels visible, active indicator on top

- [ ] **Step 3: Push to remote**

```bash
git push
```

Expected: Vercel auto-deploys. Open the deployed URL and verify `shell.html` loads as the entry point.
