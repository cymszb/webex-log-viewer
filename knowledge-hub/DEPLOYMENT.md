# Knowledge Hub — Deployment Guide

## Table of Contents

1. [How to Deploy to Vercel](#how-to-deploy-to-vercel)
2. [How to Manage Content with Vercel Blob](#how-to-manage-content-with-vercel-blob)
3. [Content Structure and Naming](#content-structure-and-naming)
4. [Syncing Content to Vercel Blob](#syncing-content-to-vercel-blob)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## How to Deploy to Vercel

### Initial Setup

1. **Push to GitHub** — the project is linked to Vercel via Git integration.

2. **Vercel auto-detects** the project as a static site (`framework: null`).

3. **Build configuration** is defined in `vercel.json` at the project root:

```json
{
  "framework": null,
  "installCommand": "cd knowledge-hub && npm install",
  "buildCommand": "cd knowledge-hub && npm run build",
  "outputDirectory": "."
}
```

- `outputDirectory: "."` — deploys the entire project root.
- The knowledge hub React app is built into `knowledge-hub/dist/`.
- All other files (`shell.html`, `index.html`, `static/`, etc.) are served as-is.

### Build Pipeline

When you push to `main`, Vercel runs:

```
1. cd knowledge-hub && npm install     → install React + Vite + dependencies
2. cd knowledge-hub && npm run build   → prebuild (manifest) + vite build
3. Deploy everything from project root → static site
```

The build typically takes ~30 seconds.

### PR Previews

Vercel creates a preview deployment for every PR. The preview URL lets you test changes before merging.

---

## How to Manage Content with Vercel Blob

### Why Blob?

Knowledge content (`.md` files) is stored in Vercel Blob, **not** in the git repo. Benefits:

- **Zero-deploy updates** — edit content, run `npm run sync-blob`, done.
- **Git stays lean** — no large content files in version control.
- **Instant propagation** — Blob files are live immediately.

### Architecture

```
┌──────────────────────┐         ┌──────────────────────────┐
│   Vercel Deployment  │         │   Vercel Blob (public)    │
│   (app shell only)   │         │   webex-knowledge-hub     │
│                      │         │                           │
│   knowledge-hub/     │ fetch   │   topics.json             │
│   dist/index.html    │─────────▶   content/                │
│   (JS + CSS)         │         │     Web-Dev/              │
│                      │         │       01-foundations/     │
└──────────────────────┘         │          how-web-works.md │
                                 └──────────────────────────┘
```

### Blob Store Details

| Property | Value |
|---|---|
| Store name | `webex-knowledge-hub` |
| Access | Public (readable by anyone) |
| Token env var | `BLOB_knowledge_READ_WRITE_TOKEN` |
| Public base URL | `https://<store-id>.public.blob.vercel-storage.com/put/knowledge-hub` |

The Blob store is **public-read, token-write**. The browser can fetch any file without authentication. Only the sync script has the write token.

---

## Content Structure and Naming

### Directory Layout

```
knowledge-hub/public/content/
  Web-Dev/                    ← container folder (becomes a parent topic)
    01-foundations/           ← topic folder (numeric prefix controls order)
      01-how-the-web-works.md   ← plain .md = English only
      overview.en.md            ← English version
      overview.zh.md            ← Chinese version
    02-frontend/
      01-html-semantics.md
      ...
```

### Naming Rules

| Pattern | Example | Behavior |
|---|---|---|
| `name.md` | `how-the-web-works.md` | English-only, file shown as-is |
| `name.en.md` | `overview.en.md` | English version |
| `name.zh.md` | `overview.zh.md` | Chinese version (language toggle) |
| `README.md` | — | Ignored (not shown in sidebar) |

### Topic Order

Folders are sorted by name with **numeric awareness**:
`01-foundations` → `02-frontend` → `03-javascript` → ...

Remove the numeric prefix for display: "Foundations", "Frontend", "Javascript".

### Nesting

- A folder with `.md` files → a **topic** (expandable, shows files).
- A folder with only subfolders → a **parent topic** (expandable, shows child topics).
- The sidebar renders nested topics with indentation.

---

## Syncing Content to Vercel Blob

### Prerequisites

1. **Vercel CLI** installed: `npm i -g vercel`
2. **Project linked**: `vercel link` (one-time)
3. **Token set** in `knowledge-hub/.env.local`:

```
BLOB_knowledge_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

Get the token from: **Vercel Dashboard → Settings → Environment Variables → BLOB_knowledge_READ_WRITE_TOKEN → Reveal**.

### Sync Command

```bash
cd knowledge-hub
npm run sync-blob
```

This runs `node scripts/sync-blob.mjs` which:

1. Regenerates `topics.json` manifest from `public/content/`
2. Uploads `topics.json` to Blob at `knowledge-hub/topics.json`
3. Uploads every `.md` file to Blob at `knowledge-hub/content/<relative-path>`
4. Prints the public URL for each uploaded file

Output:
```
==> Regenerating manifest...
Generated topics.json with 1 top-level topic(s).
==> Uploading topics.json...
  https://...public.blob.vercel-storage.com/put/knowledge-hub/topics.json
==> Uploading content files...
  Web-Dev/01-foundations/01-how-the-web-works.md -> https://.../put/knowledge-hub/content/Web-Dev/...
==> Sync complete!
```

### When to Sync

| Action | What to do |
|---|---|
| Edit an existing `.md` file | `npm run sync-blob` |
| Add a new `.md` file | `npm run sync-blob` |
| Remove a `.md` file | `npm run sync-blob` (old files remain on Blob, safe to ignore) |
| Rename a file | `npm run sync-blob` (old name stays, new name added) |
| Change folder structure | `npm run sync-blob` |

### Local Development

For local development, run the dev server:

```bash
cd knowledge-hub
npm run dev
```

This serves from `public/content/` locally with hot reload — no Blob needed.

When `VITE_BLOB_BASE_URL` is not set (local dev), the app fetches content from `./content/` (local files). When it IS set (production), it fetches from the Blob URL.

---

## Environment Variables

### On Vercel

| Variable | Value | Purpose |
|---|---|---|
| `VITE_BLOB_BASE_URL` | `https://<store>.public.blob.vercel-storage.com/put/knowledge-hub` | Blob read URL for production |
| `BLOB_knowledge_READ_WRITE_TOKEN` | `vercel_blob_rw_...` | Write token for syncing |

`VITE_` prefix ensures Vite inlines the value at build time.

### Local

Create `knowledge-hub/.env.local`:

```
BLOB_knowledge_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

This file is gitignored. Used by `npm run sync-blob` only.

---

## Troubleshooting

### "No Vercel Blob token found"

The sync script can't find the token. Make sure `BLOB_knowledge_READ_WRITE_TOKEN` is set in `knowledge-hub/.env.local`.

### "Cannot use public access on a private store"

The token is for a private blob store. Use the public store token (`BLOB_knowledge_READ_WRITE_TOKEN`), not the private store token (`BLOB_READ_WRITE_TOKEN`).

### Content not showing after deploy

1. Check `VITE_BLOB_BASE_URL` is set on Vercel
2. Verify the blob URL is accessible (paste `{VITE_BLOB_BASE_URL}/topics.json` in browser)
3. Re-deploy after setting the env var: push a commit or use `vercel --prod`

### Dev mode works but production doesn't

The production build might not have `VITE_BLOB_BASE_URL` inlined. Ensure the env var is set BEFORE the Vercel build runs. Check the Vercel deploy logs.

### Browser shows old content

Vercel Blob files are cached at the CDN level. Append `?v=<timestamp>` to force refresh, or wait for cache expiry (~5 minutes).
