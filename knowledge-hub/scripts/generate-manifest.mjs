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
  // Language-tagged: name.en.md or name.zh.md
  const langMatch = entryName.match(/^(.+)\.(en|zh)\.md$/);
  if (langMatch) {
    return { slug: langMatch[1], lang: langMatch[2], isPlain: false };
  }
  // Plain .md (no language suffix)
  if (entryName.endsWith('.md')) {
    const slug = entryName;  // include .md so ContentArea fetches as-is
    return { slug, lang: 'en', isPlain: true };
  }
  return null;
}

async function scanTopics(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const topics = [];
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'README.md') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await scanTopics(full);
      // Build relative path from content root
      const relPath = full.substring(CONTENT_DIR.length + 1).replace(/\\/g, '/');
      if (sub.files.length > 0) {
        topics.push({ id: entry.name, name: displayName(entry.name), contentPath: relPath, files: sub.files });
      }
      topics.push(...sub.topics.map(t => ({ ...t, contentPath: t.contentPath || relPath })));
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
  topics.sort((a, b) => a.name.localeCompare(b.name));

  return { topics, files };
}

async function main() {
  const { topics, files } = await scanTopics(CONTENT_DIR);

  const manifest = [...topics];

  // Files directly in content root become a default topic
  if (files.length > 0) {
    manifest.push({ id: 'root', name: 'Content', files });
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Generated ${OUT_FILE} with ${manifest.length} topic(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
