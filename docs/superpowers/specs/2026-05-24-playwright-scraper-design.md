# Playwright-Based Scraper — Design Spec

## Overview

Add headless browser support to the knowledge hub scraper so it can fetch articles from JS-rendered sites that are inaccessible to `fetch()`. Integrate via a `type` field on each source in the existing config.

## Architecture

```
scrape-config.json           scrape.mjs
─────────────────           ─────────
type: "static" (default) →  fetch() + cheerio + turndown  (unchanged)
type: "playwright"        →  playwright-core browser + cheerio + turndown  (new)
```

Same downstream pipeline: `.md` files → `generate-manifest.mjs` → `sync-blob.mjs`.

**One file modified:** `scrape.mjs`
**One dependency added:** `playwright-core` (browser installed separately)
**Config updated:** `scrape-config.json` — OpenAI re-added + Claude Tutorials added

## Config Format

```json
{
  "sources": [
    {
      "name": "Anthropic Engineering",
      "listUrl": "https://www.anthropic.com/engineering",
      "listItem": "article a",
      "content": "main article",
      "timeSelector": ".HeroEngineering-module-scss-module__j1ivRa__date",
      "descSelector": ".HeroEngineering-module-scss-module__j1ivRa__summary",
      "targetFolder": "AI-Engineering/Anthropic"
    },
    {
      "name": "OpenAI Engineering",
      "type": "playwright",
      "listUrl": "https://openai.com/news/engineering/",
      "listItem": "a[aria-label][href*=\"/index/\"]",
      "content": "article",
      "timeSelector": ".text-meta.text-primary-100",
      "descSelector": null,
      "targetFolder": "AI-Engineering/OpenAI"
    },
    {
      "name": "Claude Tutorials",
      "type": "playwright",
      "listUrl": "https://claude.com/resources/tutorials/",
      "listItem": "a[href*=\"/tutorials/\"]",
      "content": "[class*=\"prose\"]",
      "timeSelector": null,
      "descSelector": null,
      "targetFolder": "AI-Engineering/Claude-Tutorials"
    }
  ]
}
```

| Field | Purpose |
|---|---|
| `type` | `"playwright"` uses headless browser; absent or `"static"` uses `fetch()` |
| All other fields | Same meaning as before. Selectors evaluated in browser DOM for Playwright sources |

## Scraper Changes

### Playwright flow (per source with `type: "playwright"`)

1. Launch headless Chromium via `playwright-core`
2. Navigate to `listUrl`, wait for `networkidle`
3. Extract article links: `page.$$eval(listItem, els => els.map(e => e.href))`
4. For each article URL:
   a. Check if already downloaded (same slug check as current)
   b. Navigate to article URL, wait for `networkidle`
   c. Extract `<h1>` title via `page.$eval('h1', ...)`
   d. Extract content HTML via `page.$eval(content, el => el.innerHTML)`
   e. Extract time via `page.$eval(timeSelector, el => el.textContent)` if set
   f. Extract description via `page.$eval(descSelector, ...)` if set, else first non-date `<p>`
   g. Convert HTML to Markdown via turndown
   h. Write `.md` file with frontmatter
5. Close browser
6. Report: X new, Y skipped

### Browser lifecycle

- One browser instance per scrape run (not per article)
- Browser launched with `chromium.launch({ headless: true })`
- `playwright-core` requires a system-installed Chromium or `npx playwright install chromium`

### Existing static flow

Unchanged. Sources without `type: "playwright"` continue using `fetch()` + cheerio.

### Time extraction from aria-label

For OpenAI: the list page's `aria-label` contains the date (e.g., `"...May 13, 2026"`). But we extract time from the article page, not the list page. The `timeSelector: ".text-meta.text-primary-100"` on the article page handles this.

### Description fallback for OpenAI

The first `<p>` inside the article is the date (it matches the time element). When `descSelector` is null, the scraper skips paragraphs whose text matches the `timeSelector` element text, then takes the first remaining `<p>`.

## Dependencies

```bash
npm install playwright-core
npx playwright install chromium
```

## Ordering

- Welcome page: files sorted by `time` descending (existing behavior)
- Sidebar: files sorted by `time` descending (existing behavior)
