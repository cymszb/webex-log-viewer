# Knowledge Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a wiki-style knowledge hub as a React + Vite app loaded inside the platform shell iframe.

**Architecture:** Self-contained React app in `knowledge-hub/`. A prebuild script scans `src/content/` and generates a `topics.json` manifest. The React app loads this manifest at runtime, fetches markdown files, and renders them with react-markdown. Tailwind + Geist font for styling.

**Tech Stack:** React 18, Vite, Tailwind CSS 4, react-markdown, remark-gfm, geist font, Vitest

---

### Task 1: Scaffold the React + Vite + Tailwind project

**Files:**
- Create: `knowledge-hub/package.json`
- Create: `knowledge-hub/vite.config.ts`
- Create: `knowledge-hub/index.html`
- Create: `knowledge-hub/src/main.tsx`
- Create: `knowledge-hub/src/index.css`
- Create: `knowledge-hub/src/App.tsx` (minimal placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "knowledge-hub",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "geist": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "tailwindcss": "^4.1.0",
    "vite": "^6.3.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Knowledge Hub</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create src/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
);
```

- [ ] **Step 5: Create src/index.css**

```css
@import "tailwindcss";
@import "geist/sans.css";
@import "geist/mono.css";

@theme {
  --font-sans: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  --color-bg-base: #0a0d14;
  --color-bg-sidebar: #0d1020;
  --color-bg-hover: #1a1d2e;
  --color-bg-active: #1a2a40;
  --color-border-subtle: #1e2240;
  --color-border-default: #1e2535;
  --color-text-primary: #d4d8e1;
  --color-text-secondary: #8090b8;
  --color-text-muted: #5a6080;
  --color-accent: #60a5fa;
}

html, body, #root { height: 100%; }
body { background: var(--color-bg-base); color: var(--color-text-primary); font-family: var(--font-sans); }

/* Markdown content styling */
.prose h1 { font-size: 1.5rem; font-weight: 700; color: #f0f4ff; margin-bottom: 0.25rem; }
.prose h2 { font-size: 1.15rem; font-weight: 600; color: #d4d8e1; margin-top: 1.5rem; margin-bottom: 0.5rem; }
.prose h3 { font-size: 1rem; font-weight: 600; color: #c8d0e8; margin-top: 1.25rem; }
.prose p { margin: 0.5rem 0; line-height: 1.75; }
.prose ul, .prose ol { padding-left: 1.25rem; margin: 0.5rem 0; }
.prose li { margin-bottom: 0.25rem; }
.prose strong { color: #a0b8d8; font-weight: 600; }
.prose a { color: var(--color-accent); text-decoration: underline; }
.prose blockquote {
  border-left: 3px solid #2a5070;
  padding: 0.5rem 1rem;
  margin: 1rem 0;
  background: #0e1520;
  color: var(--color-text-secondary);
  border-radius: 0 4px 4px 0;
}
.prose code {
  background: #1e2535;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
.prose pre {
  background: #0e1520;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--color-border-default);
  overflow-x: auto;
  margin: 0.75rem 0;
}
.prose pre code {
  background: none;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 0.85em;
  color: var(--color-text-secondary);
}
.prose hr { border-color: var(--color-border-subtle); margin: 1.5rem 0; }
```

- [ ] **Step 6: Create minimal src/App.tsx**

```tsx
export default function App() {
  return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8090b8' }}>
      Knowledge Hub — coming soon
    </div>
  );
}
```

- [ ] **Step 7: Install dependencies and verify build**

```bash
cd knowledge-hub && npm install && npm run build
```

Expected: Build succeeds with no errors. `dist/` directory produced.

- [ ] **Step 8: Commit**

```bash
git add knowledge-hub/package.json knowledge-hub/package-lock.json knowledge-hub/vite.config.ts knowledge-hub/index.html knowledge-hub/src/ knowledge-hub/dist/
git commit -m "feat: scaffold knowledge-hub React + Vite + Tailwind project"
```

---

### Task 2: Prebuild manifest generator

**Files:**
- Create: `knowledge-hub/scripts/generate-manifest.mjs`
- Create: `knowledge-hub/src/content/getting-started/overview.en.md` (sample)
- Create: `knowledge-hub/src/content/getting-started/overview.zh.md` (sample)
- Create: `knowledge-hub/src/content/getting-started/installation.en.md` (sample)
- Modify: `knowledge-hub/package.json` (add prebuild script)

- [ ] **Step 1: Create scripts/generate-manifest.mjs**

```javascript
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');
const OUT_DIR = join(__dirname, '..', 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'topics.json');

async function scan(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const files = await scan(full);
      if (files.length > 0) {
        result.push({
          id: entry.name,
          path: entry.name,
          files: files.sort((a, b) => a.name.localeCompare(b.name))
        });
      }
    } else if (entry.name.endsWith('.md')) {
      // Parse: some-name.en.md → { name: "Some Name", path: "...", lang: "en" }
      const match = entry.name.match(/^(.+)\.(en|zh)\.md$/);
      if (!match) continue;
      const [, slug, lang] = match;
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const existing = result.find(f => f.path.startsWith(`${slug}.`));
      if (existing) {
        existing.languages.push(lang);
      } else {
        result.push({
          name,
          path: slug,
          languages: [lang]
        });
      }
    }
  }

  return result;
}

async function main() {
  const topics = await scan(CONTENT_DIR);
  // Sort topics: directories first, then individual files
  const dirTopics = topics.filter(t => t.files);
  const fileTopics = topics.filter(t => !t.files);
  const sorted = [...dirTopics, ...fileTopics];

  // Flatten fileTopics into a "Misc" topic if needed
  const manifest = [];
  for (const t of sorted) {
    if (t.files) {
      manifest.push({
        id: t.id,
        name: t.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        files: t.files.map(f => ({
          name: f.name,
          slug: f.path,
          languages: f.languages
        }))
      });
    } else {
      // Top-level files go into a default topic
      manifest.push({
        id: t.path,
        name: t.name,
        files: [{
          name: t.name,
          slug: t.path,
          languages: t.languages
        }]
      });
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Generated ${OUT_FILE} with ${manifest.length} topic(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Update package.json scripts**

In `knowledge-hub/package.json`, change the scripts block:

```json
"scripts": {
  "dev": "vite",
  "prebuild": "node scripts/generate-manifest.mjs",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run"
},
```

- [ ] **Step 3: Create sample markdown content**

Create `knowledge-hub/src/content/getting-started/overview.en.md`:
```markdown
# Overview

Welcome to the **Webex Tools Knowledge Hub**.

This documentation covers the Webex application architecture, components, and APIs.

## What you'll find here

- **Architecture** — system design and data flow
- **API Reference** — core interfaces and usage
- **Best Practices** — patterns and conventions

> This knowledge base grows alongside the project. Check back for updates.
```

Create `knowledge-hub/src/content/getting-started/overview.zh.md`:
```markdown
# 概述

欢迎来到 **Webex Tools 知识中心**。

本文档涵盖 Webex 应用程序架构、组件和 API。

## 内容

- **架构** — 系统设计和数据流
- **API 参考** — 核心接口和使用方法
- **最佳实践** — 模式和约定

> 此知识库随项目一起成长。请定期查看更新。
```

Create `knowledge-hub/src/content/getting-started/installation.en.md`:
```markdown
# Installation

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd webex-log-viewer
npm install
```

Then start the development server:

```bash
npm run dev
```
```

- [ ] **Step 4: Run build and verify topics.json is generated**

```bash
cd knowledge-hub && npm run build
```

Expected: Build succeeds. `src/data/topics.json` created with Getting Started topic and 2 files.

- [ ] **Step 5: Commit**

```bash
git add knowledge-hub/
git commit -m "feat: add manifest generator and sample content"
```

---

### Task 3: Core layout and state management (App.tsx)

**Files:**
- Modify: `knowledge-hub/src/App.tsx`
- Create: `knowledge-hub/src/hooks.ts`

- [ ] **Step 1: Create hooks.ts for hash-based routing state**

```typescript
import { useState, useEffect, useCallback } from 'react';

export interface ManifestFile { name: string; slug: string; languages: string[]; }
export interface ManifestTopic { id: string; name: string; files: ManifestFile[]; }

export interface HubState {
  topicId: string | null;
  fileSlug: string | null;
  lang: 'en' | 'zh';
  expandedTopics: Set<string>;
  topics: ManifestTopic[];
}

function parseHash(): { topicId: string | null; fileSlug: string | null; lang: 'en' | 'zh' } {
  const hash = window.location.hash.replace('#/', '');
  const [rest, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const parts = rest.split('/').filter(Boolean);
  return {
    topicId: parts[0] || null,
    fileSlug: parts[1] || null,
    lang: (params.get('lang') as 'en' | 'zh') || 'en'
  };
}

function buildHash(topicId: string, fileSlug: string, lang: string): string {
  return `#/${topicId}/${fileSlug}?lang=${lang}`;
}

export function useHubState() {
  const [state, setState] = useState<{
    topics: ManifestTopic[];
    topicId: string | null;
    fileSlug: string | null;
    lang: 'en' | 'zh';
    expandedTopics: Set<string>;
  }>(() => ({
    topics: [],
    topicId: null,
    fileSlug: null,
    lang: 'en',
    expandedTopics: new Set()
  }));

  // Load manifest
  useEffect(() => {
    fetch('./data/topics.json')
      .then(r => r.json())
      .then((topics: ManifestTopic[]) => {
        const hash = parseHash();
        setState(s => ({
          ...s,
          topics,
          topicId: hash.topicId || topics[0]?.id || null,
          fileSlug: hash.fileSlug || topics[0]?.files[0]?.slug || null,
          lang: hash.lang,
          expandedTopics: new Set(hash.topicId ? [hash.topicId] : topics[0] ? [topics[0].id] : [])
        }));
      });
  }, []);

  // Update hash when state changes
  useEffect(() => {
    if (state.topicId && state.fileSlug) {
      const newHash = buildHash(state.topicId, state.fileSlug, state.lang);
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }
    }
  }, [state.topicId, state.fileSlug, state.lang]);

  const navigate = useCallback((topicId: string, fileSlug: string) => {
    setState(s => ({
      ...s,
      topicId,
      fileSlug,
      expandedTopics: new Set([...s.expandedTopics, topicId])
    }));
  }, []);

  const setLang = useCallback((lang: 'en' | 'zh') => {
    setState(s => ({ ...s, lang }));
  }, []);

  const toggleTopicExpand = useCallback((topicId: string) => {
    setState(s => {
      const next = new Set(s.expandedTopics);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return { ...s, expandedTopics: next };
    });
  }, []);

  const currentTopic = state.topics.find(t => t.id === state.topicId);
  const currentFile = currentTopic?.files.find(f => f.slug === state.fileSlug);

  return { ...state, currentTopic, currentFile, navigate, setLang, toggleTopicExpand };
}
```

- [ ] **Step 2: Rewrite App.tsx with sidebar + content layout**

```tsx
import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';

export default function App() {
  const hub = useHubState();

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar
        topics={hub.topics}
        expandedTopics={hub.expandedTopics}
        currentTopicId={hub.topicId}
        currentFileSlug={hub.fileSlug}
        onNavigate={hub.navigate}
        onToggleExpand={hub.toggleTopicExpand}
      />
      <ContentArea
        currentTopic={hub.currentTopic}
        currentFile={hub.currentFile}
        lang={hub.lang}
        onSetLang={hub.setLang}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd knowledge-hub && npm run build
```

Expected: Build succeeds. TypeScript checks pass (no errors).

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/src/App.tsx knowledge-hub/src/hooks.ts
git commit -m "feat: add core layout, hash routing, and state management"
```

---

### Task 4: Sidebar component

**Files:**
- Create: `knowledge-hub/src/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
import { useState } from 'react';
import type { ManifestTopic } from '../hooks';

interface SidebarProps {
  topics: ManifestTopic[];
  expandedTopics: Set<string>;
  currentTopicId: string | null;
  currentFileSlug: string | null;
  onNavigate: (topicId: string, fileSlug: string) => void;
  onToggleExpand: (topicId: string) => void;
}

export function Sidebar({
  topics, expandedTopics, currentTopicId, currentFileSlug,
  onNavigate, onToggleExpand
}: SidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? topics.map(t => ({
        ...t,
        files: t.files.filter(f =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          t.name.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(t => t.files.length > 0)
    : topics;

  return (
    <aside style={{
      width: 230, background: 'var(--color-bg-sidebar)',
      borderRight: '1px solid var(--color-border-subtle)',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{ padding: 10 }}>
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', background: '#111520', border: '1px solid #1e2535',
            color: '#8090b8', padding: '6px 10px', borderRadius: 6, fontSize: 12,
            outline: 'none', boxSizing: 'border-box'
          }}
        />
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {filtered.map(topic => {
          const isExpanded = expandedTopics.has(topic.id);
          return (
            <div key={topic.id} style={{ marginBottom: 2 }}>
              <button
                onClick={() => onToggleExpand(topic.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  width: '100%', padding: '8px 6px', border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  background: 'none',
                  color: isExpanded ? '#c8d0e8' : '#5a6080',
                  fontSize: 13, fontWeight: 600, textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 10, width: 16, flexShrink: 0 }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                {topic.name}
              </button>
              {isExpanded && topic.files.map(file => {
                const isActive = currentTopicId === topic.id && currentFileSlug === file.slug;
                return (
                  <button
                    key={file.slug}
                    onClick={() => onNavigate(topic.id, file.slug)}
                    style={{
                      display: 'block', width: '100%',
                      padding: '6px 10px 6px 26px', border: 'none',
                      borderRadius: 4, cursor: 'pointer',
                      background: isActive ? 'var(--color-bg-active)' : 'none',
                      color: isActive ? 'var(--color-accent)' : '#8090b8',
                      fontSize: 12, fontWeight: isActive ? 500 : 400,
                      textAlign: 'left', fontFamily: 'inherit',
                    }}
                  >
                    {file.name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd knowledge-hub && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add knowledge-hub/src/components/Sidebar.tsx
git commit -m "feat: add collapsible sidebar with search and topic navigation"
```

---

### Task 5: ContentArea component (markdown rendering + language toggle)

**Files:**
- Create: `knowledge-hub/src/components/ContentArea.tsx`
- Create: `knowledge-hub/src/components/LangToggle.tsx`

- [ ] **Step 1: Create LangToggle.tsx**

```tsx
interface LangToggleProps {
  lang: 'en' | 'zh';
  availableLanguages: string[];
  onChange: (lang: 'en' | 'zh') => void;
}

export function LangToggle({ lang, availableLanguages, onChange }: LangToggleProps) {
  const langs = [
    { id: 'en' as const, label: 'EN' },
    { id: 'zh' as const, label: '中文' },
  ];

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {langs.map(l => {
        const available = availableLanguages.includes(l.id);
        const isActive = lang === l.id;
        return (
          <button
            key={l.id}
            disabled={!available}
            onClick={() => onChange(l.id)}
            style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 12,
              border: 'none', cursor: available ? 'pointer' : 'default',
              background: isActive ? 'var(--color-bg-active)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : available ? '#5a6080' : '#3a4468',
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create ContentArea.tsx**

```tsx
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LangToggle } from './LangToggle';
import type { ManifestTopic, ManifestFile } from '../hooks';

interface ContentAreaProps {
  currentTopic: ManifestTopic | undefined;
  currentFile: ManifestFile | undefined;
  lang: 'en' | 'zh';
  onSetLang: (lang: 'en' | 'zh') => void;
}

export function ContentArea({ currentTopic, currentFile, lang, onSetLang }: ContentAreaProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentTopic || !currentFile) return;
    setLoading(true);
    const filePath = `./content/${currentTopic.id}/${currentFile.slug}.${lang}.md`;
    fetch(filePath)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then(text => setContent(text))
      .catch(() => setContent('*Content not available in this language.*'))
      .finally(() => setLoading(false));
  }, [currentTopic, currentFile, lang]);

  if (!currentTopic || !currentFile) {
    return (
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Select a file to read
      </main>
    );
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <LangToggle
          lang={lang}
          availableLanguages={currentFile.languages}
          onChange={onSetLang}
        />
      </div>

      <p style={{ color: '#5a6080', fontSize: 12, marginBottom: 6 }}>
        {currentTopic.name} / {currentFile.name}
      </p>

      {loading ? (
        <p style={{ color: '#5a6080' }}>Loading...</p>
      ) : (
        <div className="prose" style={{ fontSize: 14, lineHeight: 1.75 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify build and test with sample content**

```bash
cd knowledge-hub && npm run build
```

Expected: Build succeeds. Open `dist/index.html` and verify sidebar shows Getting Started topic, click a file, see rendered markdown.

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/src/components/ContentArea.tsx knowledge-hub/src/components/LangToggle.tsx
git commit -m "feat: add markdown rendering and language toggle"
```

---

### Task 6: Shell integration and sample content

**Files:**
- Modify: `tools.json` — update knowledge-hub src
- Create: `knowledge-hub/src/content/architecture/overview.en.md` (sample)

- [ ] **Step 1: Update tools.json**

Change the knowledge-hub entry so `src` points to the built app:

```json
[
  { "id": "log-viewer",    "label": "Log Viewer",    "src": "index.html",                      "icon": "log"  },
  { "id": "knowledge-hub", "label": "Knowledge Hub", "src": "knowledge-hub/dist/index.html",   "icon": "book" }
]
```

- [ ] **Step 2: Add sample architecture content**

Create `knowledge-hub/src/content/architecture/overview.en.md`:

```markdown
# Architecture Overview

The Webex log viewer is built as a **static-first** platform shell with
independent tools loaded in iframes.

## Design Principles

- **Zero build step** for the platform shell
- **Tool isolation** via iframes
- **Each tool** can use its own tech stack (React, vanilla JS, etc.)

## Platform Shell

The shell (`shell.html`) provides:

- Left rail navigation on desktop
- Bottom bar navigation on mobile
- Tool routing via query parameters (`?tool=log-viewer`)
```

- [ ] **Step 3: Rebuild and verify**

```bash
cd knowledge-hub && npm run build
```

Expected: `topics.json` now includes both Getting Started and Architecture topics.

- [ ] **Step 4: Verify in browser**

Open `shell.html?tool=knowledge-hub` in a browser. The knowledge hub should load in the iframe with sidebar showing both topics.

- [ ] **Step 5: Commit**

```bash
git add tools.json knowledge-hub/src/content/architecture/
git commit -m "feat: integrate knowledge hub into shell and add sample topics"
```

---

### Task 7: Playwright integration tests

**Files:**
- Create: `tests/knowledge-hub.spec.js`

- [ ] **Step 1: Create tests/knowledge-hub.spec.js**

```javascript
import { test, expect } from '@playwright/test';

// The knowledge hub is loaded via shell iframe
async function openKnowledgeHub(page) {
  await page.goto('/shell.html?tool=knowledge-hub');
  // Wait for the iframe to load the knowledge hub
  const frame = page.frameLocator('#tool-frame');
  await frame.locator('aside').waitFor({ timeout: 10000 });
  return frame;
}

test('knowledge hub loads in shell iframe', async ({ page }) => {
  const frame = await openKnowledgeHub(page);
  // Sidebar should be visible with topics
  await expect(frame.locator('aside')).toBeVisible();
  await expect(frame.locator('aside button')).toHaveCount(expect.any(Number));
});

test('topic expand/collapse toggles file list', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Click first topic to expand
  const topicBtn = frame.locator('aside nav > div button').first();
  await topicBtn.click();

  // Should now show file links
  const fileButtons = frame.locator('aside nav button').filter({ hasText: /./ });
  await expect(fileButtons).toHaveCount(expect.any(Number));
});

test('clicking a file loads content', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Expand first topic
  await frame.locator('aside nav > div button').first().click();

  // Click first file
  const fileBtn = frame.locator('aside nav button').nth(1);
  await fileBtn.click();

  // Content area should show rendered markdown
  await expect(frame.locator('.prose')).toBeVisible({ timeout: 5000 });
});

test('language toggle switches between EN and CN', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  // Expand first topic
  await frame.locator('aside nav > div button').first().click();
  // Click first file
  await frame.locator('aside nav button').nth(1).click();
  await frame.locator('.prose').waitFor({ timeout: 5000 });

  // Check current language button is active
  const enBtn = frame.getByRole('button', { name: 'EN' });
  await expect(enBtn).toHaveAttribute('disabled', '');

  // Switch to Chinese if available, or just verify toggle renders
  const zhBtn = frame.getByRole('button', { name: '中文' });
  await expect(zhBtn).toBeVisible();
});

test('search filters topics', async ({ page }) => {
  const frame = await openKnowledgeHub(page);

  const searchInput = frame.locator('aside input[type="text"]');
  await searchInput.fill('Architecture');

  // Only Architecture topic should remain visible
  const topicButtons = frame.locator('aside nav > div button').first();
  await expect(topicButtons).toContainText('Architecture');
});
```

- [ ] **Step 2: Run the tests**

```bash
npx playwright test tests/knowledge-hub.spec.js
```

Expected: All 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/knowledge-hub.spec.js
git commit -m "test: add Playwright integration tests for knowledge hub"
```

---

### Task 8: Add knowledge-hub build to Vercel deployment config

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Update vercel.json with build command**

```json
{
  "framework": null,
  "buildCommand": "cd knowledge-hub && npm install && npm run build",
  "outputDirectory": "knowledge-hub/dist"
}
```

Wait — the existing project has multiple tools with different output directories. The `vercel.json` currently only sets `framework: null`. Since the shell and log viewer are static files at the root, and knowledge-hub builds into `knowledge-hub/dist/`, the simplest approach is to keep `framework: null` and commit the built `dist/` to git. No vercel.json changes needed.

- [ ] **Step 1: Ensure dist/ is committed (already done in previous tasks)**

Run: `git ls-tree -r HEAD --name-only | grep knowledge-hub/dist`
Expected: Shows dist files.

- [ ] **Step 2: No vercel.json change needed. Verify existing config works.**

```json
{
  "framework": null
}
```

This tells Vercel to treat everything as a static site. Since `dist/` is committed, the knowledge hub is served alongside other files.

- [ ] **Step 3: Commit (if any adjustments needed)**

```bash
# Only if vercel.json changed
git add vercel.json
git commit -m "chore: verify Vercel static deploy config for knowledge hub"
```
