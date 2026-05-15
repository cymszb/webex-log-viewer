// Sync knowledge-hub content to Vercel Blob using the REST API.
// Only uploads files that have changed since the last sync (hash-based).
// Usage: node scripts/sync-blob.mjs
// Requires BLOB_knowledge_READ_WRITE_TOKEN in environment or .env.local.

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const CONTENT_DIR = join(PROJECT_DIR, 'public', 'content');
const DATA_DIR = join(PROJECT_DIR, 'public', 'data');
const STATE_FILE = join(PROJECT_DIR, '.sync-state.json');
const BLOB_PREFIX = 'knowledge-hub';

function getToken() {
  if (process.env.BLOB_knowledge_READ_WRITE_TOKEN) return process.env.BLOB_knowledge_READ_WRITE_TOKEN;
  const envPath = join(PROJECT_DIR, '.env.local');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/BLOB_knowledge_READ_WRITE_TOKEN="([^"]+)"/);
    if (match) return match[1];
  }
  throw new Error('BLOB_knowledge_READ_WRITE_TOKEN not found');
}

function loadState() {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  }
  return {};
}

function saveState(state) {
  writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

function hashBuffer(buf) {
  return createHash('sha256').update(buf).digest('hex');
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

  return (await response.json()).url;
}

async function main() {
  const forceMode = process.argv.includes('--force');

  // Regenerate manifest
  console.log('==> Regenerating manifest...');
  execSync('node scripts/generate-manifest.mjs', { cwd: PROJECT_DIR, stdio: 'inherit' });

  const token = getToken();
  const prevState = loadState();
  const newState = {};
  let uploaded = 0;
  let skipped = 0;

  // Upload topics.json (always, it's regenerated)
  console.log('==> Uploading topics.json...');
  const manifestUrl = await uploadToBlob(token, `${BLOB_PREFIX}/topics.json`, join(DATA_DIR, 'topics.json'));
  console.log(`  ${manifestUrl}`);

  // Upload changed content files only
  console.log(forceMode ? '==> Force-uploading all content files...' : '==> Uploading changed content files...');
  for await (const filePath of walk(CONTENT_DIR)) {
    const rel = relative(CONTENT_DIR, filePath).replace(/\\/g, '/');
    const buf = await readFile(filePath);
    const hash = hashBuffer(buf);
    newState[rel] = hash;

    if (!forceMode && prevState[rel] === hash) {
      skipped++;
      continue;
    }

    const url = await uploadToBlob(token, `${BLOB_PREFIX}/content/${rel}`, filePath);
    console.log(`  ${rel} -> ${url}`);
    uploaded++;
  }

  saveState(newState);

  console.log('');
  console.log(`==> Sync complete! ${uploaded} uploaded, ${skipped} skipped.`);
  if (forceMode) console.log('    (--force used)');
}

main().catch(e => { console.error(e.message); process.exit(1); });
