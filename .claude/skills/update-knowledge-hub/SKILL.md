---
name: update-knowledge-hub
description: Scrape articles from configured engineering blogs and sync them to the knowledge hub. Use when the user asks to update the knowledge hub, sync articles, scrape content, or refresh the knowledge base.
---

# Update Knowledge Hub

Scrape articles from configured sites and sync to Vercel Blob.

## Steps

1. Read `knowledge-hub/scrape-config.json` to show available sources
2. Ask which source to scrape (or "all")
3. Run `cd knowledge-hub && node scripts/scrape.mjs --source "<name>"`
   - If the script fails (network error, missing config), report the error and stop
4. If new articles were added, run `cd knowledge-hub && npm run sync-blob`
   - Requires `BLOB_knowledge_READ_WRITE_TOKEN` in `.env.local`
5. Report: X articles added, Y skipped, Z uploaded to Blob
