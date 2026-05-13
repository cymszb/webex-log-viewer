# Platform Shell Design

**Date:** 2026-05-13  
**Status:** Approved

## Overview

Transform the Webex Log Viewer from a single-page tool into a multi-tool platform. A thin shell (`shell.html`) hosts tools in a full-viewport `<iframe>`. Navigation is driven by a `tools.json` registry. The existing `index.html` (Log Viewer) is unchanged except for a redirect added at the top.

## Architecture

```
shell.html          Entry point. Renders nav + iframe.
shell.js            Reads tools.json, renders nav, handles routing.
tools.json          Registry: [{id, label, src, icon}]
index.html          Log Viewer — loaded in iframe. Adds redirect to shell.
upcoming.html       "Coming Soon" placeholder, accepts ?name= query param.
```

URL routing: `shell.html?tool=log-viewer` (query param). Default tool is the first entry in `tools.json`. Browser Back/Forward work via `history.pushState` + `popstate`.

## tools.json

```json
[
  { "id": "log-viewer",      "label": "Log Viewer",     "src": "index.html",    "icon": "log" },
  { "id": "knowledge-hub",   "label": "Knowledge Hub",  "src": "upcoming.html?name=Knowledge+Hub", "icon": "book" }
]
```

Adding a new tool = one JSON entry + one HTML file (or reuse `upcoming.html?name=...`). No code changes to the shell.

## Canonical Entry Point

`shell.html` is the canonical entry point. Direct navigation to `index.html` should redirect to `shell.html?tool=log-viewer`. Implementation: add a small inline `<script>` at the top of `index.html` that detects when the page is loaded as the top-level document (not inside an iframe) and redirects:

```js
if (window.self === window.top) {
  location.replace('shell.html?tool=log-viewer');
}
```

## shell.js Bootstrap & Routing

On load, `shell.js`:
1. Fetches `tools.json`
2. Reads `location.search` for `?tool=<id>`. If absent or unrecognised, defaults to `tools[0]`
3. Renders nav items
4. Sets `<iframe src>` to the matched tool's `src`
5. Listens for `popstate` to handle Back/Forward

On nav item click:
1. `history.pushState({tool: id}, '', '?tool=' + id)`
2. Update iframe `src` and active nav state

`popstate` handler: reads `event.state.tool` (or falls back to parsing `location.search`) and switches to that tool.

## Responsive Navigation

### Desktop / Landscape (default styles)
- Fixed left rail, 52px wide
- SVG icon per tool, centered, with tooltip on hover (tool label, appears to the right)
- Active tool: 3px right-edge indicator in `var(--accent-blue)`
- Bottom of rail: Settings icon (placeholder `<button aria-disabled="true">`)

### Mobile Portrait (media query)
```css
@media (max-width: 600px) and (orientation: portrait) { /* bottom nav */ }
```
- Fixed bottom bar, 56px tall
- Each tool: SVG icon + label text, stacked vertically
- Items are equal-width flex children (`flex: 1`)
- Touch target: full item height × equal width (naturally ≥ 48px)
- Active tool: 3px top-edge indicator in `var(--accent-blue)`

## SVG Icons

Icons are inlined in `shell.js` as a small map of id → SVG string. Three icons needed at launch:

- `log` — document/file icon
- `book` — open book icon
- `settings` — gear icon

SVGs are simple single-path icons (24×24 viewBox, `currentColor` fill/stroke) authored inline — no external icon library, no sprite sheet.

## iframe

```html
<iframe id="tool-frame" src="" title="Tool"></iframe>
```

- Fills remaining viewport after the nav rail/bar (CSS `flex: 1` / `height: calc(100% - 56px)` on mobile)
- No `sandbox` or `allow` attributes — same-origin tools don't need restrictions
- `src` is set programmatically by `shell.js`

## upcoming.html

Static HTML + minimal inline JS. Reads `?name=` query param to display the tool name. Includes the same iframe-guard redirect as `index.html` so direct navigation returns to the shell. Dark background matching shell theme. Centered content:

```
<Tool Name>
Coming Soon
```

This way a single file serves all placeholder tools.

## Vercel Routing

The existing catch-all rewrite (`"src": "/(.*)", "dest": "/index.html"`) conflicts with multiple HTML entry points. Since the shell uses query params (not path segments), no SPA rewriting is needed at all — all files are served as static assets by Vercel natively.

**Action:** Remove the catch-all rewrite from `vercel.json` entirely. Keep any other existing rules.

## Files Changed

| File | Change |
|------|--------|
| `shell.html` | New — platform entry point |
| `shell.js` | New — nav rendering, routing, icon map |
| `tools.json` | New — tool registry |
| `upcoming.html` | New — placeholder page (reads `?name=`) |
| `index.html` | Minimal change — top-level redirect guard |
| `vercel.json` | Remove catch-all rewrite |

## shell.html head

```html
<title>Webex Tools</title>
<link rel="icon" href="favicon.ico">
```

## Out of Scope

- Knowledge Hub implementation (separate session)
- Settings page functionality (icon is present, disabled)
- Authentication
- Cross-frame messaging
