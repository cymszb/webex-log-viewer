# Update Knowledge Hub Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a skill and scraper script that downloads articles from configured engineering blogs into the knowledge hub and syncs them to Vercel Blob.

**Architecture:** Three new files: a thin Claude Code skill (`.claude/skills/update-knowledge-hub/SKILL.md`) that orchestrates, a scraper script (`scripts/scrape.mjs`) that fetches pages and converts HTML to Markdown, and a config file (`scrape-config.json`) that defines sources. No changes to existing scripts.

**Tech Stack:** Node.js (fetch, cheerio, turndown), Claude Code skill system

---

### Task 1: Install dependencies and add npm script

**Files:**
- Modify: `knowledge-hub/package.json`

- [ ] **Step 1: Install cheerio and turndown**

```bash
cd knowledge-hub && npm install cheerio turndown
```
Expected: packages added to `node_modules` and `package.json`.

- [ ] **Step 2: Add `scrape` script to package.json**

Edit `knowledge-hub/package.json` — add `"scrape"` to the `scripts` block:

```json
"scripts": {
    "dev": "node scripts/generate-manifest.mjs && vite",
    "update": "node scripts/generate-manifest.mjs",
    "sync-blob": "node scripts/sync-blob.mjs",
    "sync-blob-force": "node scripts/sync-blob.mjs --force",
    "scrape": "node scripts/scrape.mjs",
    "watch": "node scripts/watch-content.mjs",
    "prebuild": "node scripts/generate-manifest.mjs",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
},
```

Insert `"scrape": "node scripts/scrape.mjs",` after the `sync-blob-force` line.

- [ ] **Step 3: Commit**

```bash
cd knowledge-hub && git add package.json package-lock.json && git commit -m "chore: add cheerio, turndown, and scrape script"
```

---

### Task 2: Create scrape-config.json

**Files:**
- Create: `knowledge-hub/scrape-config.json`

- [ ] **Step 1: Create the config file**

Write `knowledge-hub/scrape-config.json`:

```json
{
  "sources": [
    {
      "name": "Anthropic Engineering",
      "listUrl": "https://www.anthropic.com/engineering",
      "listItem": "article a",
      "content": "main article",
      "targetFolder": "AI-Engineering/Anthropic"
    },
    {
      "name": "OpenAI Engineering",
      "listUrl": "https://openai.com/news/engineering/",
      "listItem": "a[id][aria-label]",
      "content": "main article",
      "targetFolder": "AI-Engineering/OpenAI"
    }
  ]
}
```

- [ ] **Step 2: Verify the file was written**

```bash
cat knowledge-hub/scrape-config.json
```

- [ ] **Step 3: Commit**

```bash
git add knowledge-hub/scrape-config.json && git commit -m "feat: add scrape config with Anthropic and OpenAI sources"
```

---

### Task 3: Create the scraper script

**Files:**
- Create: `knowledge-hub/scripts/scrape.mjs`

- [ ] **Step 1: Write the scraper script**

Write `knowledge-hub/scripts/scrape.mjs`:

```javascript
// Scrape articles from configured sites into the knowledge hub.
// Usage: node scripts/scrape.mjs --source <name|all> [--dry-run]

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const CONFIG_PATH = join(PROJECT_DIR, 'scrape-config.json');
const CONTENT_DIR = join(PROJECT_DIR, 'public', 'content');

function parseArgs() {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  return {
    source: sourceIdx !== -1 ? args[sourceIdx + 1] : null,
    dryRun: args.includes('--dry-run'),
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-+/g, '-');
}

async function existingSlugs(dir) {
  if (!existsSync(dir)) return new Set();
  const files = await readdir(dir);
  return new Set(files.filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')));
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

async function main() {
  const { source: sourceName, dryRun } = parseArgs();

  if (!sourceName) {
    console.error('Usage: node scripts/scrape.mjs --source <name|all> [--dry-run]');
    process.exit(1);
  }

  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  const sources = sourceName === 'all'
    ? config.sources
    : config.sources.filter(s => s.name === sourceName);

  if (sources.length === 0) {
    console.error(`No source found matching "${sourceName}"`);
    process.exit(1);
  }

  const turndown = new TurndownService();
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const source of sources) {
    console.log(`\n==> ${source.name}`);

    // Collect article URLs
    const links = [];

    if (source.listUrl) {
      console.log(`  Fetching list: ${source.listUrl}`);
      const res = await fetch(source.listUrl);
      const html = await res.text();
      const $ = cheerio.load(html);

      $(source.listItem).each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const url = resolveUrl(href, source.listUrl);
          if (url) links.push(url);
        }
      });
      console.log(`  Found ${links.length} article links`);
    } else if (source.urls) {
      links.push(...source.urls);
    }

    // Deduplicate
    const uniqueLinks = [...new Set(links)];

    // Process each article
    const targetDir = join(CONTENT_DIR, source.targetFolder);
    const existing = await existingSlugs(targetDir);
    let added = 0;
    let skipped = 0;

    for (const url of uniqueLinks) {
      // Derive preliminary slug from URL path
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
        const articleRes = await fetch(url);
        if (!articleRes.ok) {
          console.log(`  Skipping: HTTP ${articleRes.status}`);
          continue;
        }

        const articleHtml = await articleRes.text();
        const $$ = cheerio.load(articleHtml);

        // Extract title from <h1>
        const title = $$('h1').first().text().trim();
        if (!title) {
          console.log(`  Skipping: no <h1> found`);
          continue;
        }

        const fileSlug = slugify(title) || urlSlug;

        // Check if already downloaded
        if (existing.has(fileSlug)) {
          console.log(`  Skipping: ${fileSlug}.md already exists`);
          skipped++;
          continue;
        }

        // Extract content
        const contentEl = $$(source.content);
        if (!contentEl.length) {
          console.log(`  Skipping: content selector "${source.content}" not found`);
          continue;
        }

        const contentHtml = contentEl.html();
        const markdown = turndown.turndown(contentHtml);

        const fileContent = `# ${title}\n\n> Source: <${url}>\n\n${markdown}\n`;

        await mkdir(targetDir, { recursive: true });
        const filePath = join(targetDir, `${fileSlug}.md`);
        await writeFile(filePath, fileContent);
        console.log(`  Added: ${fileSlug}.md`);
        existing.add(fileSlug);
        added++;
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }

    console.log(`  ${source.name}: ${added} new, ${skipped} skipped`);
    totalAdded += added;
    totalSkipped += skipped;
  }

  console.log(`\n==> Done: ${totalAdded} added, ${totalSkipped} skipped`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2: Verify syntax**

```bash
cd knowledge-hub && node --check scripts/scrape.mjs
```
Expected: no output (syntax OK).

- [ ] **Step 3: Dry-run test with Anthropic source**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "Anthropic Engineering" --dry-run
```
Expected: lists articles that would be downloaded, no files written.

- [ ] **Step 4: Dry-run test with all sources**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source all --dry-run
```
Expected: lists articles from both sources.

- [ ] **Step 5: Commit**

```bash
git add knowledge-hub/scripts/scrape.mjs && git commit -m "feat: add scraper script for knowledge hub"
```

---

### Task 4: Create the skill file

**Files:**
- Create: `.claude/skills/update-knowledge-hub/SKILL.md`

- [ ] **Step 1: Create skill directory and file**

```bash
mkdir -p .claude/skills/update-knowledge-hub
```

- [ ] **Step 2: Write the skill file**

Write `.claude/skills/update-knowledge-hub/SKILL.md`:

```markdown
---
name: update-knowledge-hub
description: Scrape articles from configured engineering blogs and sync them to the knowledge hub. Use when the user asks to update the knowledge hub, sync articles, scrape content, or refresh the knowledge base.
---

# Update Knowledge Hub

Scrape articles from configured sites and sync to Vercel Blob.

## Steps

1. Read `knowledge-hub/scrape-config.json` to show available sources
2. Ask which source to scrape (or "all")
3. Run `cd knowledge-hub && node scripts/scrape.mjs --source "<name>"`
4. If new articles were added, run `cd knowledge-hub && npm run sync-blob`
5. Report: X articles added, Y skipped, Z uploaded to Blob
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/update-knowledge-hub/SKILL.md && git commit -m "feat: add update-knowledge-hub skill"
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Run scraper for real (Anthropic source only)**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "Anthropic Engineering"
```
Expected: downloads new articles to `public/content/AI-Engineering/Anthropic/`, skips any already present.

- [ ] **Step 2: Run scraper again — verify idempotent**

```bash
cd knowledge-hub && node scripts/scrape.mjs --source "Anthropic Engineering"
```
Expected: 0 new, all skipped (already downloaded).

- [ ] **Step 3: Run sync-blob**

```bash
cd knowledge-hub && npm run sync-blob
```
Expected: uploads new files to Vercel Blob.

- [ ] **Step 4: Verify content files exist with correct format**

```bash
ls -la knowledge-hub/public/content/AI-Engineering/Anthropic/
head -5 knowledge-hub/public/content/AI-Engineering/Anthropic/*.md | head -20
```
Expected: `.md` files with `# Title` heading and `> Source:` line.
