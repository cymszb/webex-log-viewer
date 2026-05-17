# Welcome Page for Knowledge Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a modern welcome/landing page to the knowledge hub with grouped article listing, tab-based navigation, and frontmatter-backed metadata (time, description).

**Architecture:** Four pipeline layers: scraper adds YAML frontmatter to `.md` files → manifest generator parses it into the manifest JSON → hooks expose typed data → WelcomePage component renders grouped articles with modern dark-theme UI.

**Tech Stack:** React, TypeScript, cheerio, turndown, Node.js fs/promises

---

### Task 1: Update scrape-config.json with time/desc selectors

**Files:**
- Modify: `knowledge-hub/scrape-config.json`

- [ ] **Step 1: Add timeSelector and descSelector fields**

Read the file and update to:

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
      "listUrl": "https://openai.com/news/engineering/",
      "listItem": "a[id][aria-label]",
      "content": "main article",
      "timeSelector": ".text-meta.text-primary-100",
      "descSelector": null,
      "targetFolder": "AI-Engineering/OpenAI"
    }
  ]
}
```

The time selectors use class-based selectors (not tag+class) because cheerio supports full CSS selector syntax and the simpler form is more readable.

- [ ] **Step 2: Commit**

```bash
git add knowledge-hub/scrape-config.json && git commit -m "feat: add timeSelector and descSelector to scrape config"
```

---

### Task 2: Update scraper to extract time/description and write frontmatter

**Files:**
- Modify: `knowledge-hub/scripts/scrape.mjs`

- [ ] **Step 1: Add helper functions for time and description extraction**

Insert after `resolveUrl` (after line 44):

```javascript
function extractTime($$, selector) {
  if (!selector) return new Date().toISOString().slice(0, 10);
  const text = $$(selector).first().text().trim();
  if (!text) return new Date().toISOString().slice(0, 10);
  // Strip prefix like "Published " that some sites use
  const cleaned = text.replace(/^(Published|Posted)\s+/i, '');
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function extractDescription($$, selector, contentEl) {
  if (selector) {
    const text = $$(selector).first().text().trim();
    if (text) return text;
  }
  // Fallback: first <p> inside the content element
  const firstP = contentEl.find('p').first().text().trim();
  return firstP || '';
}
```

- [ ] **Step 2: Update the article processing to extract metadata and write frontmatter**

Replace lines 149-159 (content extraction and file writing) with:

```javascript
        // Extract content
        const contentEl = $$(source.content);
        if (!contentEl.length) {
          console.log(`  Skipping: content selector "${source.content}" not found`);
          continue;
        }

        // Extract metadata
        const pubTime = extractTime($$, source.timeSelector);
        const description = extractDescription($$, source.descSelector, contentEl);

        const contentHtml = contentEl.html();
        const markdown = turndown.turndown(contentHtml);

        // Build file with frontmatter
        const escapeYaml = (s) => s.replace(/"/g, '\\"');
        const fileContent = [
          '---',
          `time: ${pubTime}`,
          `description: "${escapeYaml(description)}"`,
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
```

The `fileContent` construction replaces the old string template.

- [ ] **Step 3: Verify syntax**

```bash
cd knowledge-hub && node --check scripts/scrape.mjs
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/scripts/scrape.mjs && git commit -m "feat: extract time and description, write YAML frontmatter"
```

---

### Task 3: Update manifest generator to parse frontmatter

**Files:**
- Modify: `knowledge-hub/scripts/generate-manifest.mjs`

- [ ] **Step 1: Add import and frontmatter parser**

Add `import { readFile } from 'node:fs/promises';` to the existing imports at line 1, and `import { statSync } from 'node:fs';` after existing fs import. Then add a frontmatter parsing helper after the `displayName` function:

```javascript
function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return { time: null, description: null };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { time: null, description: null };
  const yaml = content.slice(4, end);
  const time = (yaml.match(/^time:\s*(.+)$/m) || [])[1] || null;
  const desc = (yaml.match(/^description:\s*"(.+)"$/m) || [])[1] || null;
  return { time: time ? time.trim() : null, description: desc ? desc.trim() : null };
}

function extractFirstParagraph(content) {
  // Skip YAML frontmatter, # heading, and > Source lines, get first real paragraph
  const body = content.replace(/^---[\s\S]*?---\n/gm, '');
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('>')) continue;
    return trimmed;
  }
  return '';
}
```

- [ ] **Step 2: Update file processing in scan() to include time and description**

Change the `files.push(...)` call inside `scan()` to include time and description. Replace the existing `files.push({...})` block (lines 53-58):

```javascript
          const fullPath = join(dir, entry.name);
          const content = await readFile(fullPath, 'utf8');
          const fm = parseFrontmatter(content);
          const time = fm.time || statSync(fullPath).mtime.toISOString().slice(0, 10);
          const description = fm.description || extractFirstParagraph(content);
          files.push({
            name: displayName(parsed.slug.replace(/\.md$/, '')),
            slug: parsed.slug,
            languages: [parsed.lang],
            isPlain: parsed.isPlain,
            time,
            description
          });
```

Also update the existing file merging block (for multi-language files around line 50) — when adding languages to an existing file, preserve the first instance's time/description.

- [ ] **Step 3: Update file sorting to sort by name, then time (sidebar-friendly)**

Replace `files.sort((a, b) => a.name.localeCompare(b.name));` with:

```javascript
  files.sort((a, b) => a.name.localeCompare(b.name));
```

(Keep alphabetical — sidebar uses this for reference lookups. WelcomePage sorts by time itself.)

- [ ] **Step 3b: Update the multi-language merge block to preserve time/description**

Around the existing merge block (where `existing.languages.push(parsed.lang)` runs), also read the file for time/description if not yet set:

```javascript
        const existing = files.find(f => f.slug === parsed.slug && f.isPlain === parsed.isPlain);
        if (existing) {
          existing.languages.push(parsed.lang);
          // Fill in time/description from this variant if parent lacks them
          if (!existing.time || !existing.description) {
            const fullPath = join(dir, entry.name);
            const content = await readFile(fullPath, 'utf8');
            const fm = parseFrontmatter(content);
            if (!existing.time) existing.time = fm.time || statSync(fullPath).mtime.toISOString().slice(0, 10);
            if (!existing.description) existing.description = fm.description || extractFirstParagraph(content);
          }
        } else {

- [ ] **Step 4: Verify**

```bash
cd knowledge-hub && node scripts/generate-manifest.mjs
```
Expected: `Generated .../topics.json with <N> top-level topic(s).`

- [ ] **Step 5: Commit**

```bash
git add knowledge-hub/scripts/generate-manifest.mjs && git commit -m "feat: parse frontmatter in manifest generator with fallbacks"
```

---

### Task 4: Update hooks.ts types

**Files:**
- Modify: `knowledge-hub/src/hooks.ts`

- [ ] **Step 1: Add time and description to ManifestFile interface**

Replace the `ManifestFile` interface (line 4):

```typescript
export interface ManifestFile {
  name: string;
  slug: string;
  languages: string[];
  isPlain?: boolean;
  time?: string;
  description?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add knowledge-hub/src/hooks.ts && git commit -m "feat: add time and description to ManifestFile type"
```

---

### Task 5: Create WelcomePage component

**Files:**
- Create: `knowledge-hub/src/components/WelcomePage.tsx`
- Create: `knowledge-hub/src/components/WelcomePage.css`

- [ ] **Step 1: Create WelcomePage.css**

Write `knowledge-hub/src/components/WelcomePage.css`:

```css
.welcome-main {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 48px 56px 80px;
  max-width: 1000px; margin: 0 auto; width: 100%;
}

.welcome-hero { margin-bottom: 48px; }
.welcome-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 14px; border-radius: 20px;
  border: 1px solid rgba(108,140,255,0.25);
  background: rgba(108,140,255,0.06);
  font-size: 12px; font-weight: 500; color: #6c8cff;
  margin-bottom: 20px; letter-spacing: 0.02em;
}
.welcome-badge::before {
  content: ''; width: 6px; height: 6px;
  border-radius: 50%; background: #38bdf8;
  box-shadow: 0 0 8px rgba(56,189,248,0.5);
}
.welcome-hero h1 {
  font-size: 38px; font-weight: 700; color: #e6edf3;
  margin-bottom: 14px; letter-spacing: -0.02em; line-height: 1.15;
}
.welcome-hero h1 span {
  background: linear-gradient(135deg, #6c8cff, #a78bfa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.welcome-hero p {
  font-size: 15px; color: #8895aa; line-height: 1.7; max-width: 560px;
}

.welcome-stats { display: flex; gap: 16px; margin-bottom: 48px; }
.welcome-stat {
  flex: 1; max-width: 160px;
  padding: 18px 20px; border-radius: 12px;
  border: 1px solid #1e2633; background: #11161e;
  transition: border-color 0.2s;
}
.welcome-stat:hover { border-color: rgba(108,140,255,0.3); }
.welcome-stat-num { font-size: 26px; font-weight: 700; color: #e6edf3; letter-spacing: -0.02em; }
.welcome-stat-label { font-size: 12px; color: #5c6a80; margin-top: 3px; font-weight: 500; }

.welcome-topic { margin-bottom: 40px; }
.welcome-topic-header {
  display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px;
}
.welcome-topic-header h2 {
  font-size: 17px; font-weight: 600; color: #e6edf3; letter-spacing: -0.01em;
}
.welcome-topic-count { font-size: 12px; color: #5c6a80; font-weight: 500; }

.welcome-article-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
.welcome-article-card {
  display: flex; flex-direction: column; gap: 6px;
  text-decoration: none;
  padding: 16px 20px; border-radius: 10px;
  border: 1px solid transparent; background: #11161e;
  transition: all 0.2s ease;
}
.welcome-article-card:hover {
  border-color: #1e2633; background: #171d28;
  transform: translateX(2px);
}
.welcome-article-top { display: flex; align-items: center; gap: 10px; }
.welcome-article-path {
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; color: #6c8cff;
  padding: 3px 8px; border-radius: 5px;
  background: rgba(108,140,255,0.08); white-space: nowrap;
}
.welcome-article-name {
  font-size: 14px; font-weight: 550; color: #e6edf3;
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  letter-spacing: -0.01em;
}
.welcome-article-time {
  font-size: 11px; color: #5c6a80; white-space: nowrap; font-weight: 500;
}
.welcome-article-desc {
  font-size: 12.5px; color: #8895aa; line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}

.welcome-show-more {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 12px 0; margin-top: 4px;
  border: none; background: transparent; color: #8895aa;
  font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
  border-radius: 8px; transition: all 0.2s; letter-spacing: 0.01em;
}
.welcome-show-more:hover { color: #e6edf3; background: #11161e; }

/* ── Mobile: ≤768px ── */
@media (max-width: 768px) {
  .welcome-main { padding: 28px 20px 60px; }
  .welcome-hero { margin-bottom: 32px; }
  .welcome-hero h1 { font-size: 26px; }
  .welcome-hero p { font-size: 14px; }
  .welcome-stats { gap: 10px; margin-bottom: 32px; }
  .welcome-stat { padding: 14px 16px; }
  .welcome-stat-num { font-size: 22px; }
  .welcome-article-card { padding: 14px 16px; }
  .welcome-article-name {
    white-space: normal; overflow: visible; text-overflow: unset;
    font-size: 13px;
  }
}

/* ── Mobile: ≤480px ── */
@media (max-width: 480px) {
  .welcome-main { padding: 20px 14px 40px; }
  .welcome-hero h1 { font-size: 22px; }
  .welcome-stats { flex-wrap: wrap; }
  .welcome-stat { flex: 1 1 30%; max-width: none; }
  .welcome-article-top { flex-wrap: wrap; gap: 6px; }
  .welcome-article-time { font-size: 10px; }
  .welcome-article-desc { -webkit-line-clamp: 2; }
}
```

- [ ] **Step 2: Create WelcomePage.tsx**

Write `knowledge-hub/src/components/WelcomePage.tsx`:

```tsx
import { useState } from 'react';
import type { ManifestTopic, ManifestFile } from '../hooks';
import './WelcomePage.css';

interface WelcomePageProps {
  topics: ManifestTopic[];
  onNavigate: (topicId: string, fileSlug: string) => void;
}

function collectFiles(topic: ManifestTopic): ManifestFile[] {
  const files = [...(topic.files || [])];
  if (topic.children) {
    for (const child of topic.children) {
      files.push(...collectFiles(child));
    }
  }
  // Sort newest first for welcome page
  files.sort((a, b) => {
    if (a.time && b.time) return b.time.localeCompare(a.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
  return files;
}

function getSourceName(topic: ManifestTopic, file: ManifestFile): string {
  // file belongs to a child topic of 'topic' → child topic name is the source
  if (topic.children) {
    for (const child of topic.children) {
      if (child.files?.some(f => f.slug === file.slug)) {
        return child.name;
      }
    }
  }
  return topic.name;
}

function countSources(topic: ManifestTopic): number {
  if (!topic.children || topic.children.length === 0) return 0;
  return topic.children.filter(c => (c.files?.length || 0) > 0).length;
}

function formatDate(time?: string): string {
  if (!time) return '';
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function WelcomePage({ topics, onNavigate }: WelcomePageProps) {
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const totalArticles = topics.reduce((sum, t) => sum + collectFiles(t).length, 0);
  const totalSources = topics.reduce((sum, t) => sum + countSources(t), 0);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="welcome-main">
      <div className="welcome-hero">
        <div className="welcome-badge">Updated {today}</div>
        <h1>Knowledge <span>Hub</span></h1>
        <p>Curated engineering articles from the teams behind Claude and GPT — agent architectures, infrastructure at scale, and the craft of building with AI.</p>
      </div>

      <div className="welcome-stats">
        <div className="welcome-stat"><div className="welcome-stat-num">{topics.length}</div><div className="welcome-stat-label">Topics</div></div>
        <div className="welcome-stat"><div className="welcome-stat-num">{totalArticles}</div><div className="welcome-stat-label">Articles</div></div>
        <div className="welcome-stat"><div className="welcome-stat-num">{totalSources}</div><div className="welcome-stat-label">Sources</div></div>
      </div>

      {topics.map(topic => {
        const files = collectFiles(topic);
        const visible = visibleCounts[topic.id] || 5;
        const shown = files.slice(0, visible);
        const hasMore = files.length > visible;

        return (
          <div className="welcome-topic" key={topic.id}>
            <div className="welcome-topic-header">
              <h2>{topic.name}</h2>
              <span className="welcome-topic-count">{files.length} articles</span>
            </div>
            <div className="welcome-article-grid">
              {shown.map(file => (
                <a
                  className="welcome-article-card"
                  key={file.slug}
                  href={`#/${topic.id}/${file.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(topic.id, file.slug);
                  }}
                >
                  <div className="welcome-article-top">
                    <span className="welcome-article-path">{getSourceName(topic, file)}</span>
                    <span className="welcome-article-name">{file.name}</span>
                    <span className="welcome-article-time">{formatDate(file.time)}</span>
                  </div>
                  {file.description && (
                    <div className="welcome-article-desc">{file.description}</div>
                  )}
                </a>
              ))}
            </div>
            {hasMore && (
              <button
                className="welcome-show-more"
                onClick={() => setVisibleCounts(prev => ({ ...prev, [topic.id]: visible + 5 }))}
              >
                Show 5 more articles
              </button>
            )}
          </div>
        );
      })}
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd knowledge-hub && npx tsc --noEmit src/components/WelcomePage.tsx
```
Expected: no errors (may need `--skipLibCheck` for third-party types).

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/src/components/WelcomePage.tsx knowledge-hub/src/components/WelcomePage.css && git commit -m "feat: add WelcomePage component"
```

---

### Task 6: Modify App.tsx for tab-based navigation

**Files:**
- Modify: `knowledge-hub/src/App.tsx`

- [ ] **Step 1: Add view state and WelcomePage import**

Replace the entire file content:

```tsx
import { useState } from 'react';
import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { WelcomePage } from './components/WelcomePage';

type View = 'welcome' | 'browse';

export default function App() {
  const hub = useHubState();
  const [view, setView] = useState<View>('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 2,
        background: 'rgba(9,12,18,0.85)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2633',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setView('welcome')}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: view === 'welcome' ? '#e6edf3' : '#8895aa',
            background: view === 'welcome' ? '#11161e' : 'transparent',
            boxShadow: view === 'welcome' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Welcome
        </button>
        <button
          onClick={() => setView('browse')}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: view === 'browse' ? '#e6edf3' : '#8895aa',
            background: view === 'browse' ? '#11161e' : 'transparent',
            boxShadow: view === 'browse' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Browse
        </button>
      </div>

      {/* View content */}
      {view === 'welcome' ? (
        <WelcomePage topics={hub.topics} onNavigate={(tid, slug) => { hub.navigate(tid, slug); setView('browse'); }} />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div
            className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="sidebar-wrap">
            <Sidebar
              topics={hub.topics}
              expandedTopics={hub.expandedTopics}
              currentTopicId={hub.topicId}
              currentFileSlug={hub.fileSlug}
              onNavigate={(tid, slug) => { hub.navigate(tid, slug); setSidebarOpen(false); }}
              onToggleExpand={hub.toggleTopicExpand}
              onClose={() => setSidebarOpen(false)}
              sidebarOpen={sidebarOpen}
            />
          </div>
          <ContentArea
            currentTopic={hub.currentTopic}
            currentFile={hub.currentFile}
            lang={hub.lang}
            onSetLang={hub.setLang}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        </div>
      )}
    </div>
  );
}
```

Key changes:
- Import `WelcomePage` and add `View` type
- Add `view` state defaulting to `'welcome'`
- Wrap existing layout in `flexDirection: 'column'` container
- Add tab bar at top
- Conditionally render WelcomePage or existing sidebar+content
- `onNavigate` from WelcomePage switches to `'browse'` view after navigating

- [ ] **Step 2: Verify the app builds**

```bash
cd knowledge-hub && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add knowledge-hub/src/App.tsx && git commit -m "feat: add tab-based welcome/browse navigation"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Regenerate manifest with updated generator**

```bash
cd knowledge-hub && node scripts/generate-manifest.mjs
```
Expected: generates topics.json with `time` and `description` fields on each file entry.

- [ ] **Step 2: Verify topics.json contains time and description**

```bash
cd knowledge-hub && head -50 public/data/topics.json
```
Expected: file entries have `"time"` and `"description"` fields.

- [ ] **Step 3: Start dev server and verify welcome page renders**

```bash
cd knowledge-hub && npm run dev
```

Open the app. Verify:
- Welcome page loads by default with hero, stats, and grouped article list
- Article cards show source badge, name, date, description
- Clicking an article navigates to Browse view
- "Show more" button expands article list
- "Browse" tab shows sidebar+content as before
- "Welcome" tab returns to welcome page

- [ ] **Step 4: Full build succeeds**

```bash
cd knowledge-hub && npm run build
```
Expected: builds without errors.
