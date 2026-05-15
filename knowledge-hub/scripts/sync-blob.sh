#!/bin/bash
# Sync knowledge-hub content to Vercel Blob.
# Prerequisites: vercel CLI installed and authenticated.
# Usage: bash scripts/sync-blob.sh

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
  rel=$(node -e "const p=require('path');console.log(p.relative('$CONTENT_DIR'.replace(/\\\\/g,'/'),'$file'.replace(/\\\\/g,'/')).replace(/\\\\/g,'/'))")
  echo "  $rel"
  vercel blob add "$BLOB_PREFIX/content/$rel" "$file"
done

echo ""
echo "==> Sync complete. Content is live on Vercel Blob."
echo "    Set VITE_BLOB_BASE_URL on Vercel: https://<blob-store>.public.blob.vercel-storage.com/knowledge-hub"
