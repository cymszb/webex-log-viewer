# Knowledge Hub Vercel Blob — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move knowledge hub content delivery from static bundling to Vercel Blob, eliminating the deploy cycle for content updates.

**Architecture:** Add a `VITE_BLOB_BASE_URL` env var. The React app fetches manifest and markdown from this URL in production, falling back to local `./content/` and `./data/` in dev. A sync script uploads `public/content/` and regenerated manifest to Vercel Blob using the CLI.

**Tech Stack:** Vercel Blob, Vercel CLI, Vite env vars

---

### Task 1: Add env-based content source config

**Files:**
- Create: `knowledge-hub/src/config.ts`
- Create: `knowledge-hub/.env.example`

- [ ] **Step 1: Create src/config.ts**

```typescript
// Blob base URL for production content fetching.
// VITE_ prefix ensures Vite inlines it at build time.
// Undefined in dev → falls back to local ./content/ and ./data/.
const BLOB_BASE = import.meta.env.VITE_BLOB_BASE_URL as string | undefined;

export function manifestUrl(): string {
  return BLOB_BASE ? `${BLOB_BASE}/topics.json` : './data/topics.json';
}

export function contentUrl(topicPath: string, fileName: string): string {
  return BLOB_BASE
    ? `${BLOB_BASE}/content/${topicPath}/${fileName}`
    : `./content/${topicPath}/${fileName}`;
}
```

- [ ] **Step 2: Create .env.example**

```
# Vercel Blob base URL for knowledge hub content (production only)
# Get this from: vercel blob list
VITE_BLOB_BASE_URL=
```

- [ ] **Step 3: Run build to verify TypeScript compiles**

```bash
cd knowledge-hub && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/src/config.ts knowledge-hub/.env.example
git commit -m "feat: add env-based content source config for Vercel Blob"
```

---

### Task 2: Update React app to fetch from Blob in production

**Files:**
- Modify: `knowledge-hub/src/hooks.ts` — manifest fetch
- Modify: `knowledge-hub/src/components/ContentArea.tsx` — content fetch

- [ ] **Step 1: Update hooks.ts manifest fetch**

In `knowledge-hub/src/hooks.ts`, change the manifest fetch line (currently `fetch('./data/topics.json')`) to use the config:

Replace:
```typescript
    fetch('./data/topics.json')
```
With:
```typescript
    fetch(manifestUrl())
```

Add the import at the top of hooks.ts:
```typescript
import { manifestUrl } from './config';
```

- [ ] **Step 2: Update ContentArea.tsx content fetch**

In `knowledge-hub/src/components/ContentArea.tsx`, change the filePath construction:

Replace the `filePath` line (currently:
```typescript
    const filePath = `./content/${currentTopic.contentPath}/${fileName}`;
```
):
```typescript
    const filePath = contentUrl(currentTopic.contentPath, fileName);
```

Add the import at the top of ContentArea.tsx:
```typescript
import { contentUrl } from '../config';
```

- [ ] **Step 3: Run build to verify TypeScript compiles**

```bash
cd knowledge-hub && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/src/hooks.ts knowledge-hub/src/components/ContentArea.tsx
git commit -m "feat: fetch knowledge hub content from Vercel Blob in production"
```

---

### Task 3: Create sync script for Vercel Blob

**Files:**
- Create: `knowledge-hub/scripts/sync-blob.sh`
- Modify: `knowledge-hub/package.json` — add sync script

- [ ] **Step 1: Create scripts/sync-blob.sh**

```bash
#!/bin/bash
# Sync knowledge-hub content to Vercel Blob.
# Prerequisites: vercel CLI installed and authenticated.
# Usage: npm run sync-blob

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTENT_DIR="$PROJECT_DIR/public/content"
DATA_DIR="$PROJECT_DIR/public/data"
BLOB_PREFIX="knowledge-hub"

echo "==> Regenerating manifest..."
node "$SCRIPT_DIR/generate-manifest.mjs"

echo "==> Uploading topics.json..."
vercel blob add "$BLOB_PREFIX/topics.json" "$DATA_DIR/topics.json"

echo "==> Uploading content files..."
find "$CONTENT_DIR" -type f -name "*.md" | while read -r file; do
  rel=$(node -e "console.log(require('path').relative('$PROJECT_DIR/public/content', '$file').replace(/\\\\/g,'/'))")
  echo "  $rel"
  vercel blob add "$BLOB_PREFIX/content/$rel" "$file"
done

echo "==> Sync complete. Content is live on Vercel Blob."
```

Make it executable on creation.

- [ ] **Step 2: Update package.json scripts**

Add the sync command:

```json
"scripts": {
  "dev": "node scripts/generate-manifest.mjs && vite",
  "update": "node scripts/generate-manifest.mjs",
  "sync-blob": "bash scripts/sync-blob.sh",
  "watch": "node scripts/watch-content.mjs",
  "prebuild": "node scripts/generate-manifest.mjs",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run"
},
```

- [ ] **Step 3: Test the sync script**

```bash
# On Windows (Git Bash):
cd knowledge-hub && bash scripts/sync-blob.sh
```

Expected: Manifest regenerated, all files uploaded to Vercel Blob without errors.

Note: Requires `vercel` CLI to be installed and linked to the project (`vercel link`).

- [ ] **Step 4: Commit**

```bash
git add knowledge-hub/scripts/sync-blob.sh knowledge-hub/package.json
git commit -m "feat: add Vercel Blob sync script"
```

---

### Task 4: Configure Vercel env var and deploy

- [ ] **Step 1: Get the Blob base URL**

```bash
vercel blob list
```

Note the store URL. The base URL for content will be:
`https://<store-id>.public.blob.vercel-storage.com`

- [ ] **Step 2: Set env var on Vercel**

```bash
vercel env add VITE_BLOB_BASE_URL
```

Value: `https://<store-id>.public.blob.vercel-storage.com/knowledge-hub`

Set for: `production`

- [ ] **Step 3: Rebuild and deploy**

```bash
cd knowledge-hub && npm run build
git add knowledge-hub/dist/ vercel.json
git commit -m "chore: rebuild with Vercel Blob env config"
git push
```

Vercel auto-deploys. The app now fetches content from Blob in production.

- [ ] **Step 4: Verify in production**

Open the deployed URL and check that the knowledge hub loads content. Open DevTools Network tab — requests should go to `*.public.blob.vercel-storage.com`.

---

### Task 5: Update Playwright tests

**Files:**
- Modify: `tests/specs/knowledge-hub.spec.js` — no changes needed if tests use local server

- [ ] **Step 1: Verify tests still pass with local content**

```bash
npx playwright test tests/specs/knowledge-hub.spec.js --reporter=list
```

Expected: Tests pass (dev server uses local files, no Blob involved).

- [ ] **Step 2: No changes needed**

The tests run against a local HTTP server which serves `public/content/` directly. Since the app falls back to local files when `VITE_BLOB_BASE_URL` is not set (dev/test mode), tests work without changes.

- [ ] **Step 3: Commit if any adjustments were needed**

```bash
# Only if changes were needed
git add tests/specs/knowledge-hub.spec.js
git commit -m "test: verify knowledge hub tests with blob config"
```
