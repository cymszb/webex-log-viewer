# Knowledge Hub — Design Spec

## 1. Summary

A wiki-style documentation viewer integrated into the Webex Tools platform shell.
Users browse markdown documentation organized by topic, with collapsible sidebar
navigation, rendered content, and English/Chinese language switching.

## 2. Architecture

The knowledge hub is a self-contained React + Vite app in `knowledge-hub/`,
built independently and loaded via the platform iframe in `shell.html`.

```
knowledge-hub/
├── package.json              ← react, react-dom, vite, tailwindcss, react-markdown
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx              ← React entry
│   ├── App.tsx               ← sidebar + content layout
│   ├── components/
│   │   ├── Sidebar.tsx       ← search, topic list, expand/collapse
│   │   ├── ContentArea.tsx   ← markdown render, breadcrumb, language toggle
│   │   └── LangToggle.tsx    ← EN / 中文 button pair
│   ├── data/
│   │   └── topics.json       ← generated manifest (topic names, files, languages)
│   └── content/              ← markdown files (user-authored)
│       ├── getting-started/
│       │   ├── overview.en.md
│       │   ├── overview.zh.md
│       │   └── installation.en.md
│       └── architecture/
│           ├── overview.en.md
│           ├── components.en.md
│           └── components.zh.md
└── dist/                     ← Vite build output (deployed to Vercel)
```

The build process:
1. `npm run build` runs a `prebuild` script that scans `src/content/`
2. Generates `src/data/topics.json` — a manifest of all topics, files, and available languages
3. Vite bundles the React app to `dist/`

For Vercel deployment: either commit `dist/` to git (static deploy without build step)
or configure Vercel with a build command: `cd knowledge-hub && npm install && npm run build`.

## 3. Data Model

### topics.json (generated manifest)

```json
[
  {
    "id": "getting-started",
    "name": "Getting Started",
    "files": [
      {"name": "Overview", "path": "getting-started/overview", "languages": ["en", "zh"]},
      {"name": "Installation", "path": "getting-started/installation", "languages": ["en"]}
    ]
  }
]
```

### File naming convention

- `topic-folder/file-name.en.md` — English version
- `topic-folder/file-name.zh.md` — Chinese version
- Files with only `.en.md` are English-only (no Chinese available)

### Content structure

One folder per topic. Each topic contains one or more markdown files.
Topics are listed in the sidebar in folder order.
Files within a topic are listed alphabetically.

## 4. UI Layout

```
┌──────────────────────────────────────────────────────┐
│  Platform Shell (shell.html)                         │
│  ┌─ nav rail ─┬───────────────────────────────────┐ │
│  │ Log Viewer │  Knowledge Hub                    │ │
│  │            │                                   │ │
│  │ Knowledge  │  ┌── Sidebar ──┬─ Content ──────┐ │ │
│  │ Hub ●      │  │ 🔍 Search   │ Breadcrumb      │ │ │
│  │            │  │            │                 │ │ │
│  │            │  │ ▼ Getting   │ # Title         │ │ │
│  │            │  │   Started   │                 │ │ │
│  │            │  │   Overview  │ Rendered        │ │ │
│  │            │  │   Install   │ Markdown        │ │ │
│  │            │  │            │ Content         │ │ │
│  │            │  │ ▼ Archit…   │                 │ │ │
│  │            │  │   Overview  │                 │ │ │
│  │            │  │   Compon…   │                 │ │ │
│  │            │  │   DataFlow  │                 │ │ │
│  │            │  │            │                 │ │ │
│  │            │  │ ▶ API Ref   │                 │ │ │
│  └────────────┴──┴────────────┴─────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Sidebar

- **Search bar** at the top — filters the topic/file list as you type
- **Topic sections** — collapsible (▼/▶ chevron). Click topic name toggles expand/collapse.
- **File links** — shown under expanded topics. Active file is highlighted.
- **Scroll** — sidebar scrolls independently from content.

### Content Area

- **Language toggle** (EN / 中文) in the top-right corner. Switches between language versions of the current file. If no translation exists, the button is dimmed.
- **Breadcrumb** — `Topic Name / File Name` above the title.
- **Rendered markdown** — headings, paragraphs, lists, code blocks, blockquotes, links, bold/italic.
- **Fonts** — Geist Sans for body, Geist Mono for code blocks.

### Responsive

- At narrow widths (<600px), the sidebar collapses into a top-level hamburger menu or slides in as an overlay.
- Content area fills the full width.
- Font sizes scale down slightly.

## 5. Behavior

### Language switching

- Each file knows which languages are available (from `topics.json`).
- Toggling EN/中文 reloads the content for the current file in the selected language.
- Language preference is NOT persisted — defaults to English on page load.
- If only one language version exists, the toggle still shows both but the unavailable option is dimmed.

### Topic expand/collapse

- Clicking a topic header toggles its expanded state.
- Multiple topics can be expanded simultaneously.
- Collapsing a topic does not change the currently displayed file.
- Expanded state is NOT persisted — all topics start collapsed on page load.

### Search

- Typing in the search bar filters the sidebar list to matching topic names and file names.
- Case-insensitive substring match.
- Empty search shows all topics collapsed.
- Selecting a file from search results expands its parent topic.

### Routing

- URL hash reflects current state: `#/architecture/components?lang=en`
- Opening a file or toggling language updates the hash.
- Page load with a hash restores the correct file and language.
- The hash is the single source of truth for navigation state.

## 6. Integration

### Shell integration

In `tools.json`:
```json
{ "id": "knowledge-hub", "label": "Knowledge Hub", "src": "knowledge-hub/dist/index.html", "icon": "book" }
```

The `upcoming.html` placeholder is removed or repurposed.

### Build integration

- `npm run build` in `knowledge-hub/` runs prebuild + vite build
- The root `package.json` may optionally add a script: `"build:knowledge-hub": "cd knowledge-hub && npm run build"`
- For Vercel deployment, the `dist/` directory is checked into git or built during Vercel deploy with a custom build command

## 7. Dependencies

| Package | Purpose |
|---|---|
| react + react-dom | UI framework |
| react-markdown | Markdown to React component rendering |
| remark-gfm | GitHub-flavored markdown (tables, strikethrough, task lists) |
| vite | Build tool |
| @tailwindcss/vite | Tailwind CSS Vite plugin |
| tailwindcss | Utility-first CSS |
| geist | Geist Sans + Geist Mono font (from Vercel) |

## 8. Scope

**In scope:**
- React app scaffold with Vite + Tailwind + Geist
- Collapsible topic sidebar with search
- Markdown rendering with code blocks, blockquotes, lists
- EN/中文 language toggle
- URL hash-based routing
- Integration with platform shell via tools.json
- Prebuild script to generate topics.json manifest

**Out of scope:**
- SSG / server-side rendering (static client-side only)
- Authentication or access control
- Content editing UI (content authored via IDE, committed to repo)
- Search across file contents (sidebar search filters topic/file names only)
- Table of contents within a file (future enhancement)
- Dark/light theme toggle (dark only, matching platform)
