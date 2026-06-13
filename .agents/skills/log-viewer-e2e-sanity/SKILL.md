---
name: log-viewer-e2e-sanity
description: Use when validating Webex Log Viewer changes with Playwright E2E sanity tests, especially before claiming a Log Viewer UI, upload, filter, topic, timeline, or shell change is complete.
---

# Log Viewer E2E Sanity

Run the Log Viewer Playwright sanity suite in local Chrome, visibly, slowly, and one case at a time. This is the final confidence check after changing Log Viewer behavior.

## Default Command

From the repository root:

```bash
env -u NO_COLOR npm run test:headed:slow -- --reporter=line
```

This uses the project script:

```bash
SLOWMO=250 playwright test --headed --workers=1
```

## Workflow

1. Confirm dependencies exist with `test -d node_modules && test -x node_modules/.bin/playwright`.
2. Run `env -u NO_COLOR npm run test:headed:slow -- --reporter=line`.
3. Watch the line reporter until the process exits.
4. Treat only a final line like `25 passed (...)` as success.
5. If any test fails, report the failing spec name and first useful error. Do not say the change is complete until the failing case is fixed and rerun.

## Scope Rules

- Test only the Log Viewer tool.
- Do not add Knowledge Hub coverage to this sanity run.
- Keep the run visible and serial unless the user asks for a faster hidden run.
- Use local Chrome through Playwright's `channel: 'chrome'` project setting.
- Let Playwright manage the local static server from `playwright.config.js`; do not start another server unless debugging a server startup problem.

## Useful Variants

| Need | Command |
| --- | --- |
| List included tests | `env -u NO_COLOR npm test -- --list` |
| Fast headless confirmation | `env -u NO_COLOR npm test -- --reporter=line` |
| One visible slow spec | `env -u NO_COLOR npm run test:headed:slow -- tests/specs/<file>.spec.js --reporter=line` |

## Common Mistakes

- Stopping when the browser closes before reading the final Playwright result.
- Running the hidden parallel suite when the user asked to see cases one by one.
- Claiming success after a partial spec run when the change needs the full sanity suite.
- Including `tests/specs/knowledge-hub.spec.js`; the Log Viewer sanity scope excludes it.
