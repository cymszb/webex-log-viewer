# UI Refresh Design Spec
**Date:** 2026-03-21
**Branch:** ui-improvement
**Status:** Approved by user

---

## Overview

A visual polish pass on the Webex Log Viewer frontend. The goals are:

1. Make the app look more professional and modern (currently too plain)
2. Fix the topic sidebar — too many topics with no way to search, rows too small and fiddly
3. Move topic/event edit forms out of the cramped sidebar into a centered modal

The layout structure is **unchanged** — same header / toolbar / stats bar / table+sidebar / pagination arrangement. No new features. Pure visual and UX improvement. `app.py` is not touched.

**Approach:** Refined Polish + Modern Dark — deeper background palette, richer accent colors, improved component styling, consistent border radii and spacing.

---

## 1. Global Styles

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0a0d14` | Page background, table area |
| `--bg-toolbar` | `#0d1020` | Toolbar, pagination |
| `--bg-header` | `#111827` → `#0f172a` | Header gradient start/end |
| `--bg-sidebar` | `#0e1018` | Sidebar background |
| `--bg-elevated` | `#111520` | Inputs, dropdown backgrounds |
| `--bg-card` | `#0e1220` | Modal body, topic row inactive |
| `--bg-card-active` | `#111828` | Active topic row background |
| `--border-subtle` | `#1a1f2e` | Dividers, row borders |
| `--border-default` | `#1e2535` | Component borders |
| `--border-input` | `#1e2840` | Input/button borders |
| `--border-active` | `#2a5070` | Focused/active borders |
| `--text-primary` | `#c8d0e8` | Main text |
| `--text-secondary` | `#6878a8` | Dimmed text, labels |
| `--text-muted` | `#3a4468` | Very dim, placeholders |
| `--accent-blue` | `#60a5fa` | Primary accent, links |
| `--accent-cyan` | `#06b6d4` | Logo gradient end |

### Scrollbars (Global)

Applied to `:root` — affects every scrollable element in the app. Uses hardcoded hex values because CSS custom properties are not reliably resolved in scrollbar pseudo-element rules across all browsers.

```css
/* Firefox */
* { scrollbar-width: thin; scrollbar-color: #1e2535 #0a0d14; }

/* WebKit */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: #0a0d14; }
::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #2a3550; }
```

### Border Radius

All buttons, inputs, badges, and cards use `border-radius: 6px`. Smaller elements (level badges, topic mode badges) use `border-radius: 4px`. Pills use `border-radius: 10px`.

---

## 2. Header

**Background:** `linear-gradient(135deg, #111827, #0f172a)`
**Border bottom:** `1px solid #1e2535`

### Logo
- Small icon: 26×26px, `border-radius: 6px`, `background: linear-gradient(135deg, #3b82f6, #06b6d4)`, contains a 📋 emoji or SVG clipboard icon
- Title text: `font-size: 1.05rem`, `font-weight: 700`, `color: #f0f4ff`
- "Log Viewer" portion: gradient text `linear-gradient(90deg, #60a5fa, #34d399)` via `-webkit-background-clip: text`

The header contains only the logo/title and the spacer. The "Topic Viz" toggle button lives in the toolbar (see §3) — it is not moved to the header.

---

## 3. Toolbar

**Background:** `#0d1020`
**Border bottom:** `1px solid #1a1f30`
**Layout:** `flex-wrap: nowrap; overflow-x: auto` — single row, horizontal scroll when narrow, no wrapping. The inner `#level-filters` also becomes `flex-wrap: nowrap`. This is an intentional behaviour change (previously wrapped on narrow viewports); the app is primarily used on desktop where the toolbar fits comfortably.
**Padding:** `7px 18px`

### Groups (separated by 1px `#1e2535` vertical dividers, `height: 20px`)

**Group 1 — File Actions**
- Upload Log button: `background: linear-gradient(135deg, #1a3a5a, #153050)`, `border: 1px solid #2a5070`, `color: #60a5fa`, `font-weight: 500`
- Clear button: `background: #140e0e`, `border: 1px solid #3a1818`, `color: #f87171`

**Group 2 — Level Filters**
- Label: `font-size: 0.68rem`, `color: #3a4468`, uppercase
- Level toggle chips — full display names kept. The underlying checkbox `value` attributes and JS filter logic (`"Warn"`) are **not changed**. Only the visible `<label>` text changes from `"Warn"` → `"Warning"`. CSS class names (`.lvl-warn`, `.badge-Warn`) remain unchanged.
- **Checked (active) state:** `opacity: 1`, colors per table below
- **Unchecked (inactive) state:** `opacity: 0.35`, same background/border/text colors as checked — the dim is achieved purely by opacity, consistent with the existing pattern

| Level | Display label | Background | Border | Text |
|-------|--------------|-----------|--------|------|
| Debug | Debug | `#151c2e` | `#2a3a56` | `#7a90b8` |
| Info | Info | `#0a1e30` | `#1a4a6a` | `#38bdf8` |
| Warn (value) | Warning (label) | `#1e1800` | `#5a4400` | `#fbbf24` |
| Error | Error | `#1e0808` | `#6a1818` | `#f87171` |
| Fatal | Fatal | `#180618` | `#5a1260` | `#e879f9` |

**Group 3 — Search & Filters**
- Search, PID, TID, Source inputs: `background: #111520`, `border: 1px solid #1e2840`, `border-radius: 6px`
- Search input has a 🔍 icon prefix inside the input box

**Group 4 — Navigation & Timeline**
- ← Err, Err →, Clear buttons: `background: #111520`, `border: 1px solid #1e2840`, `color: #4a5890`
- Topic Viz toggle button (existing `#btn-toggle-timeline`): `background: linear-gradient(135deg, #1e3a5f, #1a3050)`, `border: 1px solid #2a5080`, `color: #7ab8e0`, `font-weight: 500` — restyled in place, not moved

---

## 4. Stats Bar

**Background:** `#08090f`
**Border bottom:** `1px solid #12151e`
**Padding:** `4px 18px`
**Font size:** `0.71rem`

- **Total** and **Shown** values: pill badges — `border-radius: 10px`, colored background/border
  - Total pill: `color: #4a6090`, `background: #0e1220`, `border: 1px solid #1a2030`
  - Shown pill: `color: #4a8060`, `background: #081810`, `border: 1px solid #0e3020`
- Level counts: plain colored text inline, no badges. The stats bar currently renders `"Warn"` as the label — this is **not renamed** here (unlike the toolbar chip). The existing stats bar JS code and label text are left unchanged. **Fatal is intentionally omitted** from the stats bar, consistent with the existing behaviour. Colors per level:
  - Debug: `color: #3a5080`
  - Info: `color: #2a6080`
  - Warn: `color: #6a5820`
  - Error: `color: #7a3030`
- "N topics active" right-aligned, `color: #2a4060`

---

## 5. Topic Sidebar

**Width:** 260px (unchanged — `min-width: 260px` preserved)
**Background:** `#0e1018`
**Border left:** `1px solid #1a1f2e`

### Header
- Title: `font-size: 0.85rem`, `font-weight: 600`, `color: #c8d0e8`
- Active count: pill badge — `color: #4a7fa8`, `background: #0e2030`, `border: 1px solid #1a4060`, `border-radius: 10px`

### Search Box (new)
- Full-width input inside the sidebar, immediately below the header section
- Icon prefix (🔍) + placeholder "Search topics…"
- `background: #111520`, `border: 1px solid #1e2840`, `border-radius: 6px`, `padding: 5px 10px`
- Filters the rendered topic list client-side as user types (JS: filter `topicsState` by `name.toLowerCase().includes(query)` before rendering). No API call.

### Action Buttons
- "+ New Topic": `background: linear-gradient(135deg, #1a3a5a, #153050)`, `border: 1px solid #2a5070`, `color: #60a5fa`, `font-weight: 500`, `flex: 1`
- "+ Group": `background: #111520`, `border: 1px solid #1e2840`, `color: #4a5890`

### Topic Navigation Buttons
The existing `#btn-prev-topic` ("↑ Prev Match") and `#btn-next-topic` ("↓ Next Match") buttons and `#topic-nav-indicator` remain in place below the action buttons. Restyled to match the new theme:
- Buttons: `background: #111520`, `border: 1px solid #1e2840`, `color: #4a5890`, `font-size: 0.72rem`
- Nav indicator: `color: #2a3458`, `font-size: 0.7rem`

### Topic Rows
- **Padding:** `7px 8px` (up from `4px 6px`)
- **Border radius:** `6px`
- **Color dot:** 10×10px circle, `box-shadow: 0 0 6px <topicColor>55` (glow effect)
- **Active row:** `background: #111828`, `border: 1px solid #1e3050`
- **Inactive row:** `background: #0e1018`, `border: 1px solid #161820`
- **Topic name:** `font-size: 0.8rem`; active: `color: #c0cce8`, `font-weight: 500`; inactive: `color: #4a5880`
- **Action buttons:** 22×22px, `border-radius: 4px`, `border: 1px solid #1e2535`
  - Enable/disable toggle: filled circle (●) in `#60a5fa` when active, empty circle (○) when inactive
  - Edit (✎): opens topic edit modal
  - ⋯ overflow button: clicking it toggles a small absolutely-positioned dropdown `<div>` containing a single "Delete" item. The topic row itself has `position: relative` so the dropdown is anchored to it (`position: absolute; top: 100%; right: 0`). The dropdown is dismissed by clicking elsewhere (document `click` listener). This replaces the inline 🗑 button, reducing row clutter.
    - Dropdown container: `background: #111520`, `border: 1px solid #2a3050`, `border-radius: 6px`, `box-shadow: 0 8px 24px rgba(0,0,0,0.5)`, `padding: 4px`, `min-width: 100px`, `z-index: 100`
    - "Delete" item: `font-size: 0.8rem`, `color: #f87171`, `padding: 6px 10px`, `border-radius: 4px`; hover: `background: #2a1010`

### Group Headers
- Group label: `font-size: 0.67rem`, `color: #2a3458`, uppercase, `letter-spacing: 0.1em`
- Collapse/expand, rename, delete group buttons remain; restyled to 22×22px matching new theme

### Sidebar Topic List
- `overflow-y: auto` with global thin dark scrollbar

---

## 6. Topic / Event Edit Modal

Replaces the current inline edit view inside the sidebar. The sidebar's `#topic-edit-view` div and associated `showEditView` / `showListView` JS functions are removed. All editing now happens in a modal overlay.

### Trigger
- Clicking ✎ on any topic row opens the modal in edit mode
- Clicking "+ New Topic" opens the modal in create mode

### Overlay
- New `#topic-modal` div added to the HTML, initially `display: none`
- Full-screen dimmed backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); z-index: 1000`
- Clicking the backdrop (but not the modal box itself) closes the modal — same as Cancel

### Modal Container
- `max-width: 520px`, centered via `display: flex; align-items: center; justify-content: center` on the backdrop
- `background: #111520`, `border: 1px solid #2a3050`, `border-radius: 10px`
- `box-shadow: 0 24px 60px rgba(0,0,0,0.7)`
- `max-height: 90vh; overflow-y: auto` (scrollable if content is tall)

### Modal Header
- Title: "Edit Topic" or "New Topic", `font-size: 0.95rem`, `font-weight: 600`, `color: #c8d0e8`
- ✕ close button top-right: 28×28px, `border: 1px solid #2a3050`, `border-radius: 6px`
- `background: #0e1220`, `border-bottom: 1px solid #1e2535`

### Modal Body Fields
All field labels: `font-size: 0.72rem`, uppercase, `letter-spacing: 0.08em`, `color: #4a5890`
All inputs: `background: #0e1220`, `border: 1px solid #2a3050`, `border-radius: 6px`, `padding: 8px 12px`, `color: #c8d0e8`, `font-size: 0.85rem`

1. **Name** — text input
2. **Regex Pattern** — text input with `font-family: monospace`; inline validation feedback below:
   - Valid: `color: #34d399` "✓ Valid regex"
   - Invalid: `color: #f87171` "✗ Invalid: [error message]"
3. **Color** — color swatch picker (same swatches as current, larger hit targets)
4. **Group** — `<select>` dropdown: `background: #0e1220`, `border: 1px solid #2a3050`, `border-radius: 6px`, `color: #8090b8`, `padding: 8px 12px`, `font-size: 0.85rem`

### Events Section (within modal)
- Separator line (`border-top: 1px solid #1e2535`) + "Events (N)" label (`font-size: 0.72rem`, uppercase, `color: #4a5890`) + "+ Add Event" button (secondary style: `background: #0e1220`, `border: 1px solid #2a3050`, `color: #60a5fa`, `font-size: 0.75rem`)
- Each event row: `display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: #0e1220; border-radius: 6px; border: 1px solid #1a2030`
  - Color dot: 8×8px circle
  - Name: `font-size: 0.8rem`, `color: #8090b8`, `flex: 1`
  - Mode badge (`border-radius: 4px`, `font-size: 0.68rem`, `padding: 1px 6px`):
    - `metric`: `background: #0e2030`, `border: 1px solid #1a4060`, `color: #38bdf8`
    - `dot`: `background: #1a1e2e`, `border: 1px solid #2a3050`, `color: #6878a8`
    - `gantt`: `background: #1a1228`, `border: 1px solid #2a1a40`, `color: #a78bfa`
  - ✎ edit and 🗑 delete buttons: 22×22px, matching modal button style
- Clicking ✎ on an event expands an inline event edit form below that row. The inline form uses the same field styles as §6 Modal Body Fields (same input background, border, label style). Fields: Name, Start keywords, End keywords, Value regex, Color swatch.
- Clicking "+ Add Event" appends a new inline event form at the bottom of the events list

### Modal Footer
- `background: #0e1220`, `border-top: 1px solid #1e2535`, `padding: 12px 18px`
- Cancel button: `background: #111520`, `border: 1px solid #2a3050`, `color: #6878a8`
- Save button: `background: linear-gradient(135deg, #1a3a5a, #153050)`, `border: 1px solid #2a5070`, `color: #60a5fa`, `font-weight: 500`

### Keyboard & Focus
- On modal open: focus the Name input
- On modal close: return focus to the ✎ button or "+ New Topic" button that triggered it
- `Escape` closes the modal (Cancel)
- `Enter` in the regex field saves if valid and name is filled — applies in both **create** and **edit** modes
- Tab is **not** trapped — standard browser tab order applies within the modal

---

## 7. Log Table

**No changes.** Same columns, same density, same font sizes, same row colors. The global scrollbar style update applies automatically via `::-webkit-scrollbar` on `#table-wrap`.

---

## 8. Pagination Bar

Minor style updates only — buttons and select updated to match new border/background tokens (`#111520` background, `#1e2840` border). No structural changes.

---

## 9. What Is NOT Changing

- Layout structure (header / toolbar / stats / table+sidebar / pagination)
- All existing functionality (filtering, topic matching, timeline, drag-and-drop, navigation)
- Log table columns, widths, and row rendering
- Underlying data values: `"Warn"` stays as the filter value; only its display label changes to `"Warning"`
- CSS class names: `.lvl-warn`, `.badge-Warn` etc. remain unchanged
- `app.py` — not touched

---

## Implementation Notes

- All changes are in `templates/index.html` only
- The existing `#topic-edit-view` div and `showEditView` / `showListView` JS functions are removed and replaced by `openTopicModal(topic)` / `closeTopicModal()` functions
- A new `#topic-modal` overlay div is added at the bottom of `<body>` (above `</body>`)
- Sidebar search box: add an `<input id="topic-search-input">` in the sidebar; wire an `input` event listener that calls `renderTopicList()` filtered by search text
- The `⋯` overflow menu uses an absolutely-positioned `<div>` toggled by JS click, dismissed by a document-level click listener — consistent with existing JS patterns in the file
- Global scrollbar CSS is placed in the `/* Reset & base */` section at the top of `<style>`
- CSS custom properties (`--bg-base` etc.) are defined on `:root` and used throughout the new CSS rules
