# Plan: Playwright Automated Test Suite

**Date:** 2026-05-13  
**Goal:** Add a headless Playwright test suite covering the key user flows of the pure-static Webex Log Viewer.

## Background

The app is a single `index.html` + `static/api.js` served statically (no backend). All state lives in localStorage. Logs are parsed in-memory from file uploads via FileReader. The local dev server runs at `http://localhost:8099`.

## File Structure

```
webex-log-viewer/
  tests/
    fixtures/
      sample.log          # 10-line synthetic Webex log file
      topics-import.json  # minimal topics JSON for import test
    specs/
      smoke.spec.js       # page load, sidebar renders
      topics.spec.js      # create / edit / delete topic
      import-export.spec.js  # export + import round-trip
      log-upload.spec.js  # upload sample.log, verify rows + filtering
  playwright.config.js
  package.json            # devDependencies: @playwright/test only
```

## Tasks

---

### Task 1: Scaffold — package.json + playwright.config.js

Create `package.json` with only `@playwright/test` as a dev dependency. Create `playwright.config.js` configured for:
- `baseURL: 'http://localhost:8099'`
- Single project: Chromium
- `testDir: './tests/specs'`
- `headless: true`
- No retries (fail fast)

**Acceptance criteria:**
- `npx playwright test --list` outputs the spec files without error (after test files exist)
- No frameworks other than `@playwright/test` introduced

---

### Task 2: Test fixtures

Create two fixture files:

**`tests/fixtures/sample.log`** — 10 synthetic log lines in the exact Webex format the parser expects:
```
2024-01-15T10:00:00.000Z <INFO> [1234:0x5678][AppModule]main.cpp:42 AppController::init::Starting application
```
- 7 INFO lines, 2 ERROR lines, 1 WARNING line
- At least 2 lines should match the pattern `CoreFrameworkImpl` (matches default "Platform information" topic)
- Keep lines realistic but synthetic

**`tests/fixtures/topics-import.json`** — minimal valid topics JSON:
```json
{
  "groups": [],
  "topics": [
    {
      "id": "test-topic-1",
      "name": "Test Topic",
      "pattern": "TestPattern",
      "color": "#ff0000",
      "enabled": true,
      "events": []
    }
  ]
}
```

**Acceptance criteria:**
- `sample.log` parses correctly through `parseLine()` (all 10 lines produce valid objects — verified by reading api.js regex)
- `topics-import.json` passes the `Array.isArray(data.topics)` check in `api.js`

---

### Task 3: Smoke tests (`smoke.spec.js`)

Tests:
1. **Page loads** — navigate to `/`, title is "Webex Log Viewer", no console errors
2. **Sidebar visible** — `#topics-sidebar` is visible, topics list renders with items from seeded `topics.json`
3. **Toolbar present** — Upload Log button visible, Clear Log button disabled
4. **Drag handle present** — `#tl-drag-handle` is visible with text "Topic Visualization"

Setup: Before each test, call `localStorage.clear()` via `page.evaluate()` and reload so `topics.json` is re-seeded.

**Acceptance criteria:** All 4 tests pass headlessly.

---

### Task 4: Topic CRUD tests (`topics.spec.js`)

Tests:
1. **Create topic** — click "+ New Topic", fill name "My Test Topic" and pattern "TestRegex", save, verify topic appears in sidebar list
2. **Edit topic** — click edit (✎) on the created topic, change name to "Renamed Topic", save, verify updated name in list
3. **Delete topic** — click overflow (⋯) → Delete on the topic, confirm, verify it's gone from list
4. **Persists in localStorage** — after creating a topic, reload page, verify topic still appears

Setup: Before each test, `localStorage.clear()` + reload.

**Acceptance criteria:** All 4 tests pass headlessly.

---

### Task 5: Import/Export tests (`import-export.spec.js`)

Tests:
1. **Export** — click "⇓ Export" button, verify a download is triggered (intercept via `page.waitForEvent('download')`)
2. **Import round-trip** — use `page.setInputFiles()` to feed `topics-import.json` to `#import-topics-input`, verify "Test Topic" appears in sidebar
3. **Import persists** — after import + reload, "Test Topic" still in sidebar

Setup: Before each test, `localStorage.clear()` + reload.

**Acceptance criteria:** All 3 tests pass headlessly.

---

### Task 6: Log upload + filtering tests (`log-upload.spec.js`)

Tests:
1. **Upload log** — use `page.setInputFiles()` to upload `sample.log`, verify status shows "10 lines" (or similar count), log table shows rows
2. **Level filter** — after upload, click the "Error" badge to filter, verify only 2 rows shown
3. **Text search** — clear level filter, type "CoreFrameworkImpl" in search box, verify only matching rows shown
4. **Clear log** — click "✕ Clear Log", verify table is empty and button becomes disabled

Setup: Before each test, `localStorage.clear()` + reload.

**Acceptance criteria:** All 4 tests pass headlessly.

---

## Notes for implementer

- The local server must be running at `http://localhost:8099` — tests assume it's already up (no `webServer` config needed)
- Use `page.evaluate(() => localStorage.clear())` before each test then `page.reload()` — don't rely on `storageState`
- For topic operations, the modal may have focus/animation delays — use `waitFor` as needed
- The upload input is `#upload-input` (hidden, triggered by label click) — use `page.setInputFiles('#upload-input', path)` directly
- Level filter badges are toggle buttons — check the existing HTML for exact selectors before writing tests
- All tests are in `tests/specs/`, all fixtures in `tests/fixtures/`
- Run `npx playwright install chromium` as part of setup if needed
