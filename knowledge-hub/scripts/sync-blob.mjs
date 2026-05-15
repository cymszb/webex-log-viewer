// Sync knowledge-hub content to Vercel Blob using the REST API.
// Usage: node scripts/sync-blob.mjs
// Requires BLOB_READ_WRITE_TOKEN in environment or .env.local.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const CONTENT_DIR = join(PROJECT_DIR, 'public', 'content');
const DATA_DIR = join(PROJECT_DIR, 'public', 'data');
const BLOB_PREFIX = 'knowledge-hub';

// Get token from env or .env.local
function getToken() {
  // Use the public blob store token
  if (process.env.BLOB_knowledge_READ_WRITE_TOKEN) return process.env.BLOB_knowledge_READ_WRITE_TOKEN;
  const envPath = join(PROJECT_DIR, '.env.local');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/BLOB_knowledge_READ_WRITE_TOKEN="([^"]+)"/);
    if (match) return match[1];
  }
  throw new Error('BLOB_knowledge_READ_WRITE_TOKEN not found');
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'README.md') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.name.endsWith('.md')) {
      yield full;
    }
  }
}

async function uploadToBlob(token, pathname, filePath) {
  const body = await readFile(filePath);
  const url = `https://blob.vercel-storage.com/put/${pathname}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-version': '1',
      'x-add-random-suffix': '0',
      'x-access': 'public',
      'content-type': pathname.endsWith('.json') ? 'application/json' : 'text/markdown',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed for ${pathname}: ${response.status} ${text}`);
  }

  const result = await response.json();
  return result.url;
}

async function main() {
  // Regenerate manifest
  console.log('==> Regenerating manifest...');
  execSync('node scripts/generate-manifest.mjs', { cwd: PROJECT_DIR, stdio: 'inherit' });

  const token = getToken();
  console.log('==> Uploading topics.json...');
  const manifestUrl = await uploadToBlob(token, `${BLOB_PREFIX}/topics.json`, join(DATA_DIR, 'topics.json'));
  console.log(`  ${manifestUrl}`);

  console.log('==> Uploading content files...');
  for await (const filePath of walk(CONTENT_DIR)) {
    const rel = relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
    const url = await uploadToBlob(token, `${BLOB_PREFIX}/content/${rel}`, filePath);
    console.log(`  ${rel} -> ${url}`);
  }

  console.log('');
  console.log('==> Sync complete!');
  console.log(`    Set VITE_BLOB_BASE_URL on Vercel: ${manifestUrl.replace(/\/knowledge-hub\/topics\.json$/, '/knowledge-hub')}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
