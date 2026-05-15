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

# Load token from .env.local if present
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.local" | sed 's/"//g' | xargs)
fi

echo "==> Uploading topics.json..."
vercel blob put --access public "$DATA_DIR/topics.json" "knowledge-hub/topics.json"

echo "==> Uploading content files..."
find "$CONTENT_DIR" -type f -name "*.md" | while read -r file; do
  rel=$(node -e "const p=require('path');console.log(p.relative('$CONTENT_DIR'.replace(/\\\\/g,'/'),'$file'.replace(/\\\\/g,'/')).replace(/\\\\/g,'/'))")
  echo "  $rel"
  vercel blob put --access public --rw-token "$BLOB_READ_WRITE_TOKEN" "$file" "knowledge-hub/content/$rel"
done

echo ""
echo "==> Sync complete. Content is live on Vercel Blob."
echo "    Set VITE_BLOB_BASE_URL on Vercel: https://<blob-store>.public.blob.vercel-storage.com/knowledge-hub"
