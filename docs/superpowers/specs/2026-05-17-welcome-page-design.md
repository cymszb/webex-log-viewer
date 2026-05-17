# Welcome Page for Knowledge Hub — Design Spec

## Overview

Add a welcome/landing page to the knowledge hub app with a modern design, grouped article listing, and tab-based navigation between "Welcome" and "Browse" views.

## Architecture

```
src/
  App.tsx                    ← modified: tab state + view switching
  hooks.ts                   ← modified: ManifestFile gains time + description
  components/
    WelcomePage.tsx          ← new: welcome page component
    ContentArea.tsx          ← unchanged
    Sidebar.tsx              ← unchanged

knowledge-hub/
  scrape-config.json         ← modified: add timeSelector + descSelector
  scripts/
    scrape.mjs               ← modified: extract time + description, write frontmatter
    generate-manifest.mjs    ← modified: parse frontmatter for time + description
```

## UI Design

**Tab bar:** Fixed top bar with "Welcome" | "Browse" tabs. Frosted glass effect (backdrop-blur). Welcome is default when no article is selected.

**Welcome page layout:**
1. **Hero section** — badge ("Updated May 17, 2026"), title "Knowledge Hub" with gradient accent on "Hub", one-line description
2. **Stats row** — 3 cards: Topics count, Articles count, Sources count
3. **Article groups** — per root topic (e.g., "AI Engineering"), each showing:
   - Topic header with name + article count
   - Article cards: uppercase accent source badge (ANTHROPIC, OPENAI), article name, date, description (3 lines max)
   - Card hover: slight right slide + border glow
   - "Show more" button (initial 5, +5 per click)

## Data Layer

### Frontmatter

Articles get YAML frontmatter added by the scraper:

```markdown
---
time: 2024-12-19
description: What we learned working with dozens of teams building LLM agents.
---

# Building Effective Agents
```

### scrape-config.json — New Fields

```json
{
  "sources": [
    {
      "name": "Anthropic Engineering",
      "listUrl": "https://www.anthropic.com/engineering",
      "listItem": "article a",
      "content": "main article",
      "timeSelector": "p.body-2.HeroEngineering-module-scss-module__j1ivRa__date",
      "descSelector": "p.body-large-1.HeroEngineering-module-scss-module__j1ivRa__summary",
      "targetFolder": "AI-Engineering/Anthropic"
    },
    {
      "name": "OpenAI Engineering",
      "listUrl": "https://openai.com/news/engineering/",
      "listItem": "a[id][aria-label]",
      "content": "main article",
      "timeSelector": "p.text-meta.text-primary-100",
      "descSelector": null,
      "targetFolder": "AI-Engineering/OpenAI"
    }
  ]
}
```

| Field | Purpose |
|---|---|
| `timeSelector` | CSS selector for publication date. Falls back to current date. |
| `descSelector` | CSS selector for description. If `null`, uses first `<p>` in article content. |

### Scraper Changes

- Extract `time` from `timeSelector` text (e.g., `"Published Apr 08, 2026"` or `"May 13, 2026"` → `new Date()` → YYYY-MM-DD)
- Extract `description` from `descSelector` text, or first `<p>` from article body if null
- Write frontmatter at top of `.md` files: `---\ntime: ...\ndescription: ...\n---\n`
- Existing files are skipped (unchanged behavior)

### Manifest Generator Changes

- Read `.md` files, parse YAML frontmatter if present
- `ManifestFile` type gains: `time?: string`, `description?: string`
- Files sorted by `time` descending within each topic

### Type Changes (`hooks.ts`)

```typescript
export interface ManifestFile {
  name: string;
  slug: string;
  languages: string[];
  time?: string;
  description?: string;
}
```

## UI Component Details

### WelcomePage.tsx props

```typescript
interface WelcomePageProps {
  topics: ManifestTopic[];
  onNavigate: (topicId: string, fileSlug: string) => void;
}
```

### Pagination

Per-topic local state: `Record<string, number>` mapping topic ID → visible article count. Initial count 5. "Show more" increments by 5.

### Stats

Computed from `topics`:
- Topics: `topics.length`
- Articles: sum of all `.files.length` across all topics (recursively)
- Sources: count of unique direct-child topics (the immediate sub-folders under each root topic)

## Style

- Dark theme: `#090c12` background, `#11161e` card surfaces
- Accent: `#6c8cff` (blue-purple), gradient on "Hub": `#6c8cff` → `#a78bfa`
- Source badges: uppercase, accent color on tinted background
- Transitions: 0.2s ease on hover
- Backdrop blur on topbar
- Subtle radial gradient glows in background
