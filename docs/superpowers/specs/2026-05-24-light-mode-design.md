# Light Mode — Design Spec

## Overview

Add a light mode theme to the knowledge hub app with a manual toggle, persisted in localStorage. All hardcoded colors are migrated to CSS custom properties that switch based on a `data-theme` attribute on `<html>`.

## Architecture

```
index.css                    ← dual palette (dark default + [data-theme="light"] override)
src/components/*.tsx/.css    ← replace all hardcoded #colors with var(--color-*)
src/App.tsx                  ← theme toggle button + useTheme hook
```

No new files. No new dependencies.

## CSS Variable System

Dark palette is the default (no attribute needed). Light palette activates via `[data-theme="light"]`.

```css
@theme {
  --font-sans: 'Geist Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;

  /* Dark (default) */
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
}
```

## Theme Toggle

- **Position:** right end of the top bar (after Welcome + spacer + hamburger)
- **Style:** pill-shaped with dot indicator, text label ("Light" / "Dark"), 1px border
- **Behavior:** `useTheme()` hook reads `localStorage.getItem('theme')`, defaults to `'dark'`, sets `data-theme` attribute on `document.documentElement`, persists on change

```typescript
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')] as const;
}
```

## Component Migration

Every hardcoded color value that has a corresponding variable must be replaced:

| File | Before example | After |
|---|---|---|
| `App.tsx` | `color: '#e6edf3'` | `color: 'var(--color-text-primary)'` |
| `App.tsx` | `background: '#11161e'` | `background: 'var(--color-bg-surface)'` |
| `App.tsx` | `background: 'rgba(9,12,18,0.85)'` | Hard to variable-ize; use a CSS class `.topbar` in `index.css` |
| `ContentArea.tsx` | `color: '#5a6080'` | `color: 'var(--color-text-muted)'` |
| `Sidebar.tsx` | `background: '#111520'` | `background: 'var(--color-bg-sidebar)'` |
| `Sidebar.tsx` | `color: '#8090b8'` | `color: 'var(--color-text-secondary)'` |
| `LangToggle.tsx` | `'#5a6080'`, `'#3a4468'` | `var(--color-text-muted)`, `var(--color-text-muted)` (dimmer) |
| `WelcomePage.css` | all `#` hex colors | corresponding `var(--color-*)` |
| `index.css` | prose colors, blockquote bg, hr border | `var(--color-*)` |

### Special cases

- **`rgba(9,12,18,0.85)` in the top bar:** extract to a CSS class `.topbar` in `index.css` using `var(--color-bg-base)` with opacity handled via `color-mix()` or a semi-transparent fallback
- **Prose blockquote background `#0e1520`:** light mode equivalent → `var(--color-bg-surface)` with slight darkening
- **Prose code background `#1e2535`:** use `var(--color-border-default)` in dark, or a new `--color-code-bg` variable
- **LangToggle disabled state `#3a4468`:** replace with dimmer `var(--color-text-muted)` at lower opacity
- **WelcomePage.css accent tints `rgba(108,140,255,0.08)`:** the `rgba` value differs per theme since accent color changes. Extract as a new variable `--color-accent-bg` (tinted background using the accent color)

### New variables needed

```css
--color-accent-dim: #4a63cc;   /* LangToggle disabled uses muted accent */
--color-accent-bg: rgba(108,140,255,0.08);  /* dark */
--color-code-bg: #1e2535;      /* dark */
--color-blockquote-border: #2a5070; /* dark */
```

And their `[data-theme="light"]` counterparts.

## Ordering

- Sidebar: stays A-Z (unchanged)
- WelcomePage: stays newest-first (unchanged)

## Style

- Pill toggle: `border-radius: 20px`, `padding: 6px 10px`, `font-size: 12px`, `font-weight: 500`, dot indicator `width: 6px`, dot color `#fbbf24` (amber, same in both themes), `border: 1px solid var(--color-border-default)`
- Toggle hover: border + text color lighten/darken subtly
