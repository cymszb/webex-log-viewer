import { readdir, writeFile, mkdir, readFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'public', 'content');
const OUT_DIR = join(__dirname, '..', 'public', 'data');
const OUT_FILE = join(OUT_DIR, 'topics.json');

function displayName(id) {
  return id.replace(/^\d+-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return { time: null, description: null };
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return { time: null, description: null };
  const yaml = content.slice(4, end);
  const time = (yaml.match(/^time:\s*(.+)$/m) || [])[1] || null;
  const descMatch = yaml.match(/^description:\s*\|\s*\n([\s\S]*?)(?:\n\S|$)/m);
  let desc = null;
  if (descMatch) {
    desc = descMatch[1].replace(/^  /gm, '').trim() || null;
  }
  return { time: time ? time.trim() : null, description: desc };
}

function extractFirstParagraph(content) {
  // Skip YAML frontmatter, # heading, and > Source lines, get first real paragraph
  const body = content.replace(/^---[\s\S]*?---\n/gm, '');
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('>')) continue;
    return trimmed;
  }
  return '';
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
          // Fill in time/description from this variant if parent lacks them
          if (!existing.time || !existing.description) {
            const fullPath = join(dir, entry.name);
            const content = await readFile(fullPath, 'utf8');
            const fm = parseFrontmatter(content);
            if (!existing.time) existing.time = fm.time || statSync(fullPath).mtime.toISOString().slice(0, 10);
            if (!existing.description) existing.description = fm.description || extractFirstParagraph(content);
          }
        } else {
          const fullPath = join(dir, entry.name);
          const content = await readFile(fullPath, 'utf8');
          const fm = parseFrontmatter(content);
          const time = fm.time || statSync(fullPath).mtime.toISOString().slice(0, 10);
          const description = fm.description || extractFirstParagraph(content);
          files.push({
            name: displayName(parsed.slug.replace(/\.md$/, '')),
            slug: parsed.slug,
            languages: [parsed.lang],
            isPlain: parsed.isPlain,
            time,
            description
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
