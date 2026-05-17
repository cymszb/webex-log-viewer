# Update Knowledge Hub Skill — Design Spec

## Overview

A Claude Code skill that scrapes articles from configured documentation/engineering blog sites, saves them as markdown files into the knowledge hub content directory, and syncs them to Vercel Blob.

## Architecture

```
.claude/skills/update-knowledge-hub/SKILL.md   ← thin skill, orchestrates scripts
knowledge-hub/scrape-config.json               ← user-editable source config
knowledge-hub/scripts/scrape.mjs               ← scraper script (new)
```

The skill reads the config, invokes the scraper, then runs `npm run sync-blob`. No changes to existing scripts (sync-blob.mjs, generate-manifest.mjs).

## Config Format (`scrape-config.json`)

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

| Field | Purpose |
|---|---|
| `name` | Human label, used in logs and CLI |
| `listUrl` | List page URL. Scraper finds article links here. |
| `listItem` | CSS selector for article links on the list page |
| `content` | CSS selector for the article body on individual article pages |
| `targetFolder` | Path under `public/content/` to write `.md` files |

For direct article URLs (no list page), `urls` replaces `listUrl`/`listItem`:
```json
{
  "name": "Specific Articles",
  "urls": ["https://example.com/article-1", "https://example.com/article-2"],
  "content": "main article",
  "targetFolder": "Some-Topic"
}
```

## Scraper Script (`scripts/scrape.mjs`)

### CLI

```
node scripts/scrape.mjs --source <name>     scrape one source
node scripts/scrape.mjs --source all        scrape all sources
node scripts/scrape.mjs --dry-run           show what would be scraped, no writes
```

### Flow (list mode)

1. Read config, find matching source by name
2. Fetch list page URL
3. Extract article links using `listItem` CSS selector
4. For each article URL:
   a. Derive filename slug from the URL path or page `<h1>`
   b. Check if file already exists in `public/content/<targetFolder>/`
   c. If exists → skip (already downloaded)
   d. If new → fetch page, extract `<h1>` as title, extract content using `content` selector, convert HTML to Markdown via turndown, write `.md` file
5. Report: X new articles added, Y skipped (already exist)

### Deduplication

The scraper checks for existing `.md` files by matching the URL-derived slug against filenames in the target folder. An article that's already downloaded is never re-fetched.

Files are never deleted or overwritten by the scraper.

### Dependencies

- `cheerio` — HTML parsing (jQuery-like API for Node)
- `turndown` — HTML to Markdown conversion

## Skill File (`SKILL.md`)

Thin orchestrator. Triggered by phrases like "update knowledge hub", "sync articles", "scrape engineering blogs".

1. Read config, show available sources
2. Ask user which source to scrape (or "all")
3. Run `node scripts/scrape.mjs --source <name>`
4. Run `npm run sync-blob`
5. Report results

## Content Flow

```
scrape.mjs
  → writes new .md files to public/content/<targetFolder>/
  → skips files that already exist

sync-blob.mjs (existing)
  → regenerates topics.json manifest
  → hash-compares .md files against .sync-state.json
  → uploads only new/changed files to Vercel Blob
```

## Image Handling

Turndown preserves `<img>` tags as `![alt](src)` with remote URLs. No local image download. Images remain hosted on the source site.
