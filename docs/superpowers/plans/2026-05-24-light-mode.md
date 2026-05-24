# Light Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light mode theme with a manual pill toggle in the top bar, persisting to localStorage.

**Architecture:** All colors become CSS custom properties with a dual palette (dark default + `[data-theme="light"]` override). A `useTheme` hook in `App.tsx` manages the `data-theme` attribute and localStorage. Every component's hardcoded `#` colors are replaced with `var(--color-*)` references.

**Tech Stack:** React, CSS custom properties, localStorage

---

### Task 1: Update index.css with dual palette

**Files:**
- Modify: `knowledge-hub/src/index.css`

- [ ] **Step 1: Replace the @theme block with the full dual palette**

Replace the current `@theme` block (lines 17-31) with the dual palette plus new supporting variables:

```css
@theme {
  --font-sans: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  /* ── Dark palette (default) ── */
  --color-bg-base: #0a0d14;
  --color-bg-surface: #11161e;
  --color-bg-sidebar: #0d1020;
  --color-bg-hover: #1a1d2e;
  --color-bg-active: #1a2a40;
  --color-border-subtle: #1e2240;
  --color-border-default: #1e2535;
  --color-text-primary: #d4d8e1;
  --color-text-secondary: #8090b8;
  --color-text-muted: #5a6080;
  --color-accent: #6c8cff;
  --color-accent-dim: #4a63cc;
  --color-accent-bg: rgba(108,140,255,0.08);
  --color-code-bg: #1e2535;
  --color-blockquote-border: #2a5070;
  --color-blockquote-bg: #0e1520;
  --color-topbar-bg: rgba(9,12,18,0.85);
}

[data-theme="light"] {
  --color-bg-base: #ffffff;
  --color-bg-surface: #f4f5f7;
  --color-bg-sidebar: #f8f9fb;
  --color-bg-hover: #edeff3;
  --color-bg-active: #e2e5f0;
  --color-border-subtle: #e8eaef;
  --color-border-default: #e2e5ea;
  --color-text-primary: #1a1d2e;
  --color-text-secondary: #5c637a;
  --color-text-muted: #8b95a5;
  --color-accent: #4a63cc;
  --color-accent-dim: #3a50a8;
  --color-accent-bg: rgba(74,99,204,0.08);
  --color-code-bg: #e8ecf0;
  --color-blockquote-border: #c8d6e5;
  --color-blockquote-bg: #f4f6f8;
  --color-topbar-bg: rgba(255,255,255,0.9);
}
```

- [ ] **Step 2: Add topbar CSS class after the body rule**

Add after `body { background: var(--color-bg-base); ... }` (around line 34):

```css
.topbar {
  background: var(--color-topbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border-default);
}
```

- [ ] **Step 3: Update prose colors to use variables**

Replace the current prose color block with variable-based colors. Update these selectors in `index.css`:

- `.prose h1 { ... color: #f0f4ff; ... }` → `color: var(--color-text-primary);`
- `.prose h2 { ... color: #d4d8e1; ... }` → `color: var(--color-text-primary);`
- `.prose h3 { ... color: #c8d0e8; ... }` → `color: var(--color-text-secondary);`
- `.prose p` → no color change needed (inherits body)
- `.prose strong { ... color: #a0b8d8; ... }` → `color: var(--color-accent);`
- `.prose blockquote { ... background: #0e1520; border-left: 3px solid #2a5070; ... }` → `background: var(--color-blockquote-bg); border-left-color: var(--color-blockquote-border);`
- `.prose code { ... background: #1e2535; ... }` → `background: var(--color-code-bg);`
- `.prose pre { ... background: #0e1520; border: 1px solid var(--color-border-default); ... }` → `background: var(--color-blockquote-bg);`
- Remove `color: var(--color-text-secondary);` from `.prose pre code`

- [ ] **Step 4: Build to verify**

```bash
cd knowledge-hub && npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add knowledge-hub/src/index.css && git commit -m "feat: add dual light/dark CSS palette and topbar class"
```

---

### Task 2: Add theme toggle to App.tsx

**Files:**
- Modify: `knowledge-hub/src/App.tsx`

- [ ] **Step 1: Add useTheme hook and toggle button**

Replace the entire file with:

```tsx
import { useState, useEffect } from 'react';
import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { WelcomePage } from './components/WelcomePage';

type View = 'welcome' | 'browse';
type Theme = 'dark' | 'light';

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'dark'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')];
}

export default function App() {
  const hub = useHubState();
  const [view, setView] = useState<View>('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div className="topbar" style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 2,
        flexShrink: 0,
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            padding: '9px 14px', borderRadius: 8, fontSize: 18, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: 'var(--color-text-secondary)', background: 'transparent', lineHeight: 1,
          }}
          aria-label="Open sidebar"
        >
          ☰
        </button>
        <button
          onClick={() => setView('welcome')}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: view === 'welcome' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            background: view === 'welcome' ? 'var(--color-bg-surface)' : 'transparent',
            boxShadow: view === 'welcome' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Welcome
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: '1px solid var(--color-border-default)',
            fontFamily: 'inherit', background: 'transparent',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: theme === 'dark' ? '#fcd34d' : '#f59e0b',
            boxShadow: theme === 'dark' ? '0 0 6px rgba(252,211,77,0.4)' : 'none',
          }} />
          {theme === 'dark' ? 'Light' : 'Dark'}
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
- Added `useEffect` import, `useTheme` hook
- Moved topbar inline style colors to the `.topbar` CSS class in `index.css` (only keep layout styles inline)
- All hardcoded colors in topbar replaced with `var(--color-*)`
- Pill toggle button added at right end

- [ ] **Step 2: Build to verify**

```bash
cd knowledge-hub && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add knowledge-hub/src/App.tsx && git commit -m "feat: add theme toggle with useTheme hook"
```

---

### Task 3: Migrate WelcomePage.css to CSS variables

**Files:**
- Modify: `knowledge-hub/src/components/WelcomePage.css`

- [ ] **Step 1: Replace all hardcoded colors**

Replace every hardcoded `#` color in `WelcomePage.css` with the corresponding variable:

| From | To |
|---|---|
| `color: #6c8cff` | `color: var(--color-accent)` |
| `background: rgba(108,140,255,0.06)` | `background: var(--color-accent-bg)` |
| `background: rgba(108,140,255,0.08)` | `background: var(--color-accent-bg)` |
| `border: 1px solid rgba(108,140,255,0.25)` | `border: 1px solid var(--color-accent)` + lower opacity via `color-mix` or keep as is with `var(--color-accent)` at 25% |
| `color: #38bdf8` | `color: #38bdf8` (dot indicator, keep) |
| `background: #38bdf8` | keep (dot indicator) |
| `color: #e6edf3` | `color: var(--color-text-primary)` |
| `color: #8895aa` | `color: var(--color-text-secondary)` |
| `color: #5c6a80` | `color: var(--color-text-muted)` |
| `background: #11161e` | `background: var(--color-bg-surface)` |
| `border: 1px solid #1e2633` | `border: 1px solid var(--color-border-default)` |
| `background: #171d28` (hover) | `background: var(--color-bg-hover)` |
| `border-color: #1e2633` (hover) | `border-color: var(--color-border-default)` |

Be precise — the entire file should have zero `#` hex values remaining after this step.

- [ ] **Step 2: Build**

```bash
cd knowledge-hub && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add knowledge-hub/src/components/WelcomePage.css && git commit -m "feat: migrate WelcomePage to CSS variables"
```

---

### Task 4: Migrate inline styles in Sidebar, ContentArea, LangToggle

**Files:**
- Modify: `knowledge-hub/src/components/Sidebar.tsx`
- Modify: `knowledge-hub/src/components/ContentArea.tsx`
- Modify: `knowledge-hub/src/components/LangToggle.tsx`

- [ ] **Step 1: Migrate Sidebar.tsx**

Replace these hardcoded colors with `var(--color-*)`:

- `background: '#111520'` → `background: 'var(--color-bg-surface)'` (line 127)
- `border: '1px solid #1e2535'` → `border: '1px solid var(--color-border-default)'` (line 127)
- `color: '#8090b8'` → `color: 'var(--color-text-secondary)'` (line 128)
- `color: '#5a6080'` → `color: 'var(--color-text-muted)'` (line 136)
- `background: 'var(--color-bg-sidebar)'` — already using variable, keep (line 105)
- `color: isExpanded ? '#c8d0e8' : '#5a6080'` → `color: isExpanded ? 'var(--color-text-primary)' : 'var(--color-text-muted)'` (line 49)

- [ ] **Step 2: Migrate ContentArea.tsx**

Replace:
- `color: '#5a6080'` in breadcrumb → `color: 'var(--color-text-muted)'` (line 69)
- `color: '#5a6080'` in publish date → `color: 'var(--color-text-muted)'` (line 49)
- `color: '#5a6080'` in Loading → `color: 'var(--color-text-muted)'` (line 74)
- `color: '#5a6080'` in empty state → `color: 'var(--color-text-muted)'` (line 41)

- [ ] **Step 3: Migrate LangToggle.tsx**

Replace:
- `'#5a6080'` → `'var(--color-text-muted)'` (available, not active, line 27)
- `'#3a4468'` → `'var(--color-accent-dim)'` (disabled, line 27)

- [ ] **Step 4: Build**

```bash
cd knowledge-hub && npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add knowledge-hub/src/components/Sidebar.tsx knowledge-hub/src/components/ContentArea.tsx knowledge-hub/src/components/LangToggle.tsx && git commit -m "feat: migrate Sidebar, ContentArea, LangToggle to CSS variables"
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Build and start dev server**

```bash
cd knowledge-hub && npm run build && npx vite --port 5173 &
```
Expected: clean build.

- [ ] **Step 2: Verify dark mode (default)**

Open `http://localhost:5173`. Verify:
- Welcome page renders with dark theme (current look unchanged)
- Pill toggle shows "Light" with amber dot on dark background
- Navigate to an article → article view uses dark theme
- Open sidebar → sidebar uses dark theme

- [ ] **Step 3: Verify light mode**

Click the "Light" toggle. Verify:
- Entire UI switches to light theme
- Toggle now shows "Dark" with amber/brown dot
- Welcome page: white bg, dark text, cards visible
- Article view: white bg, dark text, code blocks light, blockquotes light
- Sidebar: light bg, dark text
- LangToggle colors adjust

- [ ] **Step 4: Verify persistence**

Refresh the page. Verify:
- Light mode persists (doesn't revert to dark)
- `localStorage.getItem('theme')` returns `'light'`

- [ ] **Step 5: Toggle back to dark**

Click "Dark" toggle. Verify:
- Dark theme restores
- `localStorage.getItem('theme')` returns `'dark'`

- [ ] **Step 6: Verify mobile**

Resize to 375px width. Verify:
- Toggle pill visible and functional
- Light/dark switching works on mobile layout
- Welcome page, article view, sidebar all render correctly in both themes
