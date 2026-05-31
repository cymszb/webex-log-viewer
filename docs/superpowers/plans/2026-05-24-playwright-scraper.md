# Playwright-Based Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add headless browser support to the scraper so it can fetch articles from JS-rendered sites (OpenAI, Claude).

**Architecture:** The existing `scrape.mjs` gains a Playwright code path that launches a headless Chromium browser for sources with `type: "playwright"`. The static `fetch()` + cheerio path is unchanged. Same output format, same downstream pipeline.

**Tech Stack:** Node.js, playwright-core, cheerio, turndown

---

### Task 1: Install playwright-core and browser

**Files:**
- Modify: `knowledge-hub/package.json`

- [ ] **Step 1: Install playwright-core**

```bash
cd knowledge-hub && npm install playwright-core
```

- [ ] **Step 2: Install Chromium browser**

```bash
cd knowledge-hub && npx playwright install chromium
```

- [ ] **Step 3: Commit**

```bash
git add knowledge-hub/package.json knowledge-hub/package-lock.json && git commit -m "chore: add playwright-core for headless browser scraping"
```

---

### Task 2: Update scrape-config.json

**Files:**
- Modify: `knowledge-hub/scrape-config.json`

- [ ] **Step 1: Add OpenAI Engineering and Claude Tutorials sources**

Write `knowledge-hub/scrape-config.json`:

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

- [ ] **Step 2: Commit**

```bash
git add knowledge-hub/scrape-config.json && git commit -m "feat: add OpenAI and Claude Tutorials as Playwright sources"
```

---

### Task 3: Add Playwright scraping logic to scrape.mjs

**Files:**
- Modify: `knowledge-hub/scripts/scrape.mjs`

- [ ] **Step 1: Add Playwright import**

Add at the top of the file, after the existing imports:

```javascript
import { chromium } from 'playwright-core';
```

- [ ] **Step 2: Add Playwright-specific helper functions**

Insert after the existing helper functions (after `resolveUrl`):

```javascript
function isPlaywrightSource(source) {
  return source.type === 'playwright';
}

async function scrapePlaywrightSource(source, existing, targetDir, dryRun) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'KnowledgeHubScraper/1.0',
  });
  let added = 0;
  let skipped = 0;

  try {
    // 1. Open list page and extract article links
    const page = await context.newPage();
    console.log(`  Fetching list (Playwright): ${source.listUrl}`);
    await page.goto(source.listUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const links = await page.$$eval(source.listItem, els =>
      els.map(el => el.href).filter(href => href)
    );
    console.log(`  Found ${links.length} article links`);
    await page.close();

    // Deduplicate
    const uniqueLinks = [...new Set(links)];

    // 2. Process each article
    const turndown = new TurndownService();

    for (const url of uniqueLinks) {
      const pathname = new URL(url).pathname;
      const urlSlug = pathname.split('/').filter(Boolean).pop() || 'index';

      if (dryRun) {
        if (existing.has(urlSlug)) {
          console.log(`  [skip] ${urlSlug} (already exists)`);
          skipped++;
        } else {
          console.log(`  [new]  ${url}`);
          added++;
        }
        continue;
      }

      try {
        console.log(`  Fetching: ${url}`);
        const articlePage = await context.newPage();
        await articlePage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Extract title from <h1>
        const title = await articlePage.$eval('h1', el => el.textContent.trim()).catch(() => null);
        if (!title) {
          console.log(`  Skipping: no <h1> found`);
          await articlePage.close();
          continue;
        }

        const fileSlug = slugify(title) || urlSlug;
        if (existing.has(fileSlug)) {
          console.log(`  Skipping: ${fileSlug}.md already exists`);
          await articlePage.close();
          skipped++;
          continue;
        }

        // Extract content
        const contentEl = await articlePage.$(source.content);
        if (!contentEl) {
          console.log(`  Skipping: content selector "${source.content}" not found`);
          await articlePage.close();
          continue;
        }
        const contentHtml = await contentEl.innerHTML();

        // Extract time
        let pubTime = new Date().toISOString().slice(0, 10);
        if (source.timeSelector) {
          const timeText = await articlePage.$eval(source.timeSelector, el => el.textContent.trim()).catch(() => null);
          if (timeText) {
            const cleaned = timeText.replace(/^(Published|Posted)\s+/i, '');
            const parsed = new Date(cleaned);
            if (!isNaN(parsed.getTime())) pubTime = parsed.toISOString().slice(0, 10);
          }
        }

        // Extract description
        let description = '';
        if (source.descSelector) {
          description = await articlePage.$eval(source.descSelector, el => el.textContent.trim()).catch(() => '');
        }
        if (!description) {
          // Fallback: first <p> in content, skip if it matches time text
          const timeText = source.timeSelector
            ? await articlePage.$eval(source.timeSelector, el => el.textContent.trim()).catch(() => '')
            : '';
          description = await articlePage.$$eval('p', (els, skipText) => {
            for (const el of els) {
              const t = el.textContent.trim();
              if (t && t !== skipText) return t;
            }
            return '';
          }, timeText).catch(() => '');
        }

        const markdown = turndown.turndown(contentHtml);

        const fileContent = [
          '---',
          `time: ${pubTime}`,
          'description: |',
          `  ${description}`,
          '---',
          '',
          `# ${title}`,
          '',
          `> Source: <${url}>`,
          '',
          markdown,
        ].join('\n') + '\n';

        await mkdir(targetDir, { recursive: true });
        const filePath = join(targetDir, `${fileSlug}.md`);
        await writeFile(filePath, fileContent);
        console.log(`  Added: ${fileSlug}.md (${pubTime})`);
        existing.add(fileSlug);
        await articlePage.close();
        added++;
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  return { added, skipped };
}
```

- [ ] **Step 3: Update main() to route Playwright sources**

In the `main()` function, inside the `for (const source of sources)` loop, update the source processing to check for Playwright type. Replace the current article processing from `// Collect article URLs` through the end of the source loop with a conditional dispatch.

Find the section starting with `// Collect article URLs` (around line 72) and wrap it:

At the point where the code reads `const links = [];` and `if (source.listUrl) {`, add before it:

```javascript
    // Use Playwright for browser-rendered sources
    if (isPlaywrightSource(source)) {
      const result = await scrapePlaywrightSource(source, existing, targetDir, dryRun);
      added = result.added;
      skipped = result.skipped;
    } else {
```

Then add a closing `}` before the per-source summary `console.log(...)` line. The existing static code goes inside the `else` block.

The full structure becomes:

```javascript
    let added = 0;
    let skipped = 0;

    if (isPlaywrightSource(source)) {
      const result = await scrapePlaywrightSource(source, existing, targetDir, dryRun);
      added = result.added;
      skipped = result.skipped;
    } else {
      // --- existing static scraping code (unchanged) ---
      const links = [];
      if (source.listUrl) {
        // ... all existing code ...
      }
      // ... rest of existing article processing ...
    }

    console.log(`  ${source.name}: ${added} new, ${skipped} skipped`);
    totalAdded += added;
    totalSkipped += skipped;
```

- [ ] **Step 4: Verify syntax**

```bash
cd knowledge-hub && node --check scripts/scrape.mjs
```
Expected: no output.

- [ ] **Step 5: Dry-run test with OpenAI**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "OpenAI Engineering" --dry-run
```
Expected: finds article links from OpenAI engineering page.

- [ ] **Step 6: Dry-run test with Claude Tutorials**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "Claude Tutorials" --dry-run
```
Expected: finds tutorial links from Claude tutorials page.

- [ ] **Step 7: Commit**

```bash
git add knowledge-hub/scripts/scrape.mjs && git commit -m "feat: add Playwright headless browser scraping support"
```

---

### Task 4: End-to-end verification

- [ ] **Step 1: Scrape OpenAI Engineering for real**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "OpenAI Engineering"
```
Expected: downloads new articles to `public/content/AI-Engineering/OpenAI/`.

- [ ] **Step 2: Scrape Claude Tutorials for real**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "Claude Tutorials"
```
Expected: downloads new articles to `public/content/AI-Engineering/Claude-Tutorials/`.

- [ ] **Step 3: Verify idempotent — run again**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "OpenAI Engineering"
cd knowledge-hub && node scripts/scrape.mjs --source "Claude Tutorials"
```
Expected: 0 new, all skipped (already downloaded).

- [ ] **Step 4: Verify file format**

```bash
head -10 knowledge-hub/public/content/AI-Engineering/OpenAI/*.md | head -20
```
Expected: YAML frontmatter with `time` and `description`, followed by `# Title` and `> Source:`.

- [ ] **Step 5: Regenerate manifest and verify it picks up new topics**

```bash
cd knowledge-hub && node scripts/generate-manifest.mjs
```
Expected: generates topics.json with OpenAI and Claude-Tutorials topics.

- [ ] **Step 6: Sync to Blob and verify app**

```bash
cd knowledge-hub && npm run sync-blob
```
Expected: new articles uploaded to Vercel Blob. Verify they appear in the deployed app's welcome page.
