# Knowledge Hub — Vercel Blob Content Delivery

## 1. Summary

Replace static content bundling with Vercel Blob as the content backend. Markdown files
and the topics manifest are stored in Vercel Blob and fetched by the browser at runtime.
Content updates require only an upload to Blob — no rebuild, no deploy.

## 2. Architecture

```
┌──────────────────────┐              ┌──────────────────────┐
│   Vercel Deployment  │              │   Vercel Blob         │
│   (knowledge-hub/)   │              │   webex-log-viewer-   │
│                      │              │   blob                │
│   React App Shell    │   fetch()    │                       │
│   (HTML + JS + CSS)  │──────────────▶  topics.json          │
│                      │              │   content/            │
│   Only changes when  │              │     webtech/          │
│   app code changes   │              │       01-foundations/ │
└──────────────────────┘              │          how-web-works│
                                      └──────────────────────┘
```

The React app shell is deployed once and rarely changes.
Content lives in Vercel Blob, fetched directly by the browser at runtime.

## 3. Content Flow

### Development (existing, unchanged)
```
public/content/  →  npm run dev  →  localhost:5173
```
Local files served by Vite, no change to current workflow.

### Production (new)
```
public/content/  →  npm run sync-blob  →  Vercel Blob  →  Browser
```

### Update workflow
```
1. Edit markdown in public/content/
2. npm run sync-blob    (uploads changed files + regenerated manifest)
3. Done — live instantly
```

## 4. Implementation

### 4.1 Sync Script (`scripts/sync-blob.sh`)

Uses the `vercel` CLI to upload content. Steps:
1. Run `generate-manifest.mjs` to create fresh `topics.json`
2. Upload manifest: `vercel blob add knowledge-hub/topics.json public/data/topics.json`
3. For each `.md` file in `public/content/`, upload:
   `vercel blob add knowledge-hub/content/<topic>/<file>.md <local-path>`
4. Report uploaded files

### 4.2 React App Changes

The app needs the Blob base URL. Set as a Vite env var:
```
VITE_BLOB_BASE_URL=https://<store-id>.public.blob.vercel-storage.com/knowledge-hub
```

**hooks.ts**: Fetch manifest from `${BLOB_BASE}/topics.json` if env var is set, otherwise fall back to `./data/topics.json` (dev mode).

**ContentArea.tsx**: Fetch markdown from `${BLOB_BASE}/content/${topicPath}/${fileName}` if env var is set, otherwise fall back to `./content/${topicPath}/${fileName}` (dev mode).

### 4.3 Environment Config

- `VITE_BLOB_BASE_URL` — prefixed with `VITE_` so Vite inlines it at build time
- Set in Vercel project settings for production
- Set in `.env.local` for local development (optional — absence = local files)
- Local dev without env var continues to work with `public/content/`

## 5. BLOB Structure

```
knowledge-hub/
├── topics.json
└── content/
    └── webtech/
        ├── 01-foundations/
        │   ├── 01-how-the-web-works.md
        │   ├── 02-http-and-browsers.md
        │   └── ...
        ├── 02-frontend/
        │   └── ...
        └── ...
```

## 6. Dependencies

| Package | Purpose |
|---|---|
| `vercel` CLI | Upload content to Vercel Blob (`npm i -g vercel`) |

## 7. Scope

**In scope:**
- Sync script to upload content + manifest to Vercel Blob
- React app fetches from Blob in production, local files in dev
- Environment-based configuration (no code changes needed to switch)

**Out of scope:**
- Authentication/authorization (Blob is public-read)
- Automatic sync on git push (manual `npm run sync-blob` command)
- Blob lifecycle management (files live forever unless manually deleted)
