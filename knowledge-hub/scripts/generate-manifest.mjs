import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'public', 'content');
const OUT_DIR = join(__dirname, '..', 'public', 'data');
const OUT_FILE = join(OUT_DIR, 'topics.json');

function displayName(id) {
  return id.replace(/^\d+-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function parseMd(entryName) {
  const langMatch = entryName.match(/^(.+)\.(en|zh)\.md$/);
  if (langMatch) {
    return { slug: langMatch[1], lang: langMatch[2], isPlain: false };
  }
  if (entryName.endsWith('.md')) {
    return { slug: entryName, lang: 'en', isPlain: true };
  }
  return null;
}

async function scan(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const topics = [];
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'README.md') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await scan(full);
      const relPath = full.substring(CONTENT_DIR.length + 1).replace(/\\/g, '/');
      if (sub.files.length > 0 || sub.topics.length > 0) {
        topics.push({
          id: entry.name,
          name: displayName(entry.name),
          contentPath: relPath,
          files: sub.files,
          ...(sub.topics.length > 0 ? { children: sub.topics } : {})
        });
      }
      if (sub.topics.length === 0 && sub.files.length === 0) continue;
    } else {
      const parsed = parseMd(entry.name);
      if (parsed) {
        const existing = files.find(f => f.slug === parsed.slug && f.isPlain === parsed.isPlain);
        if (existing) {
          existing.languages.push(parsed.lang);
        } else {
          files.push({
            name: displayName(parsed.slug.replace(/\.md$/, '')),
            slug: parsed.slug,
            languages: [parsed.lang],
            isPlain: parsed.isPlain
          });
        }
      }
    }
  }

  files.sort((a, b) => a.name.localeCompare(b.name));
  topics.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  // Sort children recursively
  for (const t of topics) {
    if (t.children) t.children.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }

  return { topics, files };
}

async function main() {
  const { topics, files } = await scan(CONTENT_DIR);

  const manifest = { topics: [...topics] };

  if (files.length > 0) {
    manifest.topics.push({ id: 'root', name: 'Content', contentPath: '', files });
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Generated ${OUT_FILE} with ${manifest.topics.length} top-level topic(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
