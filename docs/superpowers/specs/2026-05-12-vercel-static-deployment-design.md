# Vercel Static Deployment Design

**Date:** 2026-05-12  
**Status:** Approved

## Overview

Convert the Webex Log Viewer from a Python/Flask server-rendered app to a pure static frontend deployable on Vercel at zero cost. All log parsing, filtering, and topic management moves entirely into the browser. A thin `api.js` localStorage adapter replaces the Flask API surface with minimal changes to `index.html`.

## Goals

- Deploy to Vercel with zero server cost
- Team members access the tool from any browser — no local install
- Default `topics.json` served as a static asset; auto-seeded into new users' localStorage on first visit
- Users can customize topics locally (localStorage auto-save) and export/import their config
- Log files parsed in-browser, held in memory (gone on refresh — intentional)
- All existing functionality preserved: filtering, search, pagination, timeline visualization

## Non-Goals

- React Native client (deferred — not in scope for this change)
- User authentication
- Server-side log storage
- Mandatory team-wide topic updates / version merging (can be added later)

## Architecture

### Before
```
Browser → Flask (app.py) → log.txt / topics.json (disk)
```

### After
```
Browser → api.js (localStorage adapter) → localStorage / topics.json (static asset)
```

### Files Deleted
- `app.py`
- `requirements.txt`
- `tests/test_app.py`
- `sessions/` directory

### Files Added
- `static/api.js` — localStorage adapter (~150 lines)
- `vercel.json` — Vercel routing config

### Files Changed
- `templates/index.html` → moved to `index.html` (root), ~15 `fetch('/api/...')` call sites replaced with `api.js` calls, Export/Import buttons added to toolbar
- `topics.json` — stays in repo root, now served as a static asset

### Final File Structure
```
webex-log-viewer/
├── index.html              ← moved from templates/index.html
├── static/
│   └── api.js              ← new localStorage adapter
├── topics.json             ← default team config (static asset)
├── vercel.json             ← routing config
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-12-vercel-static-deployment-design.md
```

## Component: `api.js`

A localStorage-backed adapter that mirrors the Flask API's data operations. All functions are async (return Promises) to keep call sites in `index.html` unchanged.

### Storage Keys
```
webex-log-viewer:topics     → full topics+groups JSON object (persisted)
webex-log-viewer:log        → not stored — log is in-memory only
```

### API Surface

| Flask endpoint | `api.js` function | Backed by |
|---|---|---|
| `GET /api/topics` | `getTopics()` | localStorage (seeded on first call) |
| `POST /api/topics` | `createTopic(topic)` | localStorage |
| `PUT /api/topics/:id` | `updateTopic(id, topic)` | localStorage |
| `DELETE /api/topics/:id` | `deleteTopic(id)` | localStorage |
| `POST /api/topics/:id/events` | `createEvent(topicId, event)` | localStorage |
| `PUT /api/topics/:id/events/:eid` | `updateEvent(topicId, eventId, event)` | localStorage |
| `DELETE /api/topics/:id/events/:eid` | `deleteEvent(topicId, eventId)` | localStorage |
| `GET /api/groups` | `getGroups()` | localStorage |
| `POST /api/groups` | `createGroup(group)` | localStorage |
| `PUT /api/groups/:id` | `updateGroup(id, group)` | localStorage |
| `DELETE /api/groups/:id` | `deleteGroup(id)` | localStorage |
| `POST /api/upload` | `loadLog(file)` | in-memory (`window._loadedLog`) |
| `GET /api/logs` | `getLogs()` | in-memory |
| *(new)* | `exportTopics()` | triggers file download |
| *(new)* | `importTopics(file)` | replaces localStorage from uploaded file |

### First-Visit Seeding

On first call to `getTopics()`, if no localStorage key exists, fetch `/topics.json` and store it:

```js
async function getTopics() {
  const KEY = 'webex-log-viewer:topics';
  if (!localStorage.getItem(KEY)) {
    const defaults = await fetch('/topics.json').then(r => r.json());
    localStorage.setItem(KEY, JSON.stringify(defaults));
  }
  return JSON.parse(localStorage.getItem(KEY));
}
```

All write operations (`createTopic`, `updateTopic`, etc.) read the full object, mutate it, and write it back atomically.

### Export / Import

- **Export:** `JSON.stringify` the localStorage value → trigger browser download as `topics.json`
- **Import:** Read uploaded file → validate JSON structure → overwrite localStorage key

## Component: `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Ensures all routes serve `index.html` (SPA-style routing, future-proof).

## Changes to `index.html`

1. **Move file:** `templates/index.html` → `index.html` (repo root)
2. **Add script tag:** `<script src="/static/api.js"></script>` in `<head>`
3. **Replace fetch calls:** ~15 call sites — all `fetch('/api/topics', ...)` etc. replaced with `await api.getTopics()`, `await api.createTopic(...)`, etc.
4. **Log upload:** Replace `POST /api/upload` fetch with `FileReader`-based parsing (the client-side `parseLine()` mirror already exists — just wire it up for the upload button, same as drag-and-drop)
5. **Export/Import buttons:** Add two small buttons to the toolbar — "Export Topics" and "Import Topics"
6. **Remove Flask-only code:** Remove session polling, server-side error handling paths

## Deployment Flow

1. Push to GitHub → Vercel auto-deploys (connected via Vercel GitHub integration)
2. New user visits URL → `index.html` loads → `api.js` seeds localStorage from `/topics.json` silently
3. User uploads log file → parsed in-browser → held in memory
4. User edits topics → localStorage updated automatically
5. User clicks Export → downloads `topics.json`
6. Team lead updates defaults → commits new `topics.json` → Vercel redeploys → new users get updated defaults; existing users keep their localStorage

## Data Flow

```
User opens app
  └─ api.js: localStorage empty?
       └─ yes: fetch /topics.json → store in localStorage
       └─ no: read from localStorage
  └─ render topics sidebar

User uploads log file
  └─ FileReader reads file
  └─ parseLine() parses each line → array of log objects
  └─ held in window._loadedLog
  └─ render log table

User edits a topic
  └─ api.updateTopic(id, data)
  └─ reads localStorage → mutates → writes back
  └─ re-renders sidebar
```

## Error Handling

- **`/topics.json` fetch fails on first visit:** Show empty topics state with a visible "Load defaults" button as fallback
- **localStorage unavailable** (private browsing, storage full): Catch `QuotaExceededError`, show a warning banner; app still works for log viewing, topic changes not persisted
- **Invalid import file:** Validate JSON structure before writing to localStorage; show error if invalid

## Testing

- Manual: open `index.html` directly (via `file://` or `python -m http.server`) — no build step needed
- Verify first-visit seeding: clear localStorage, reload, confirm topics appear
- Verify export/import round-trip
- Verify log upload and all filters work
- Vercel preview deployments: every PR gets a unique preview URL for QA

## Out of Scope

- Unit tests for `api.js` (no test framework set up for frontend; manual testing sufficient for this scope)
- Migration of existing users from Flask sessions (no existing deployed users)
- topics.json versioning / auto-merge of team defaults (can be added later as a follow-up)
