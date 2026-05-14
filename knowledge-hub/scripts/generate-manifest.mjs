import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'src', 'content');
const OUT_DIR = join(__dirname, '..', 'src', 'data');
const OUT_FILE = join(OUT_DIR, 'topics.json');

async function scan(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const files = await scan(full);
      if (files.length > 0) {
        result.push({
          id: entry.name,
          path: entry.name,
          files: files.sort((a, b) => a.name.localeCompare(b.name))
        });
      }
    } else if (entry.name.endsWith('.md')) {
      // Parse: some-name.en.md → { name: "Some Name", path: "...", lang: "en" }
      const match = entry.name.match(/^(.+)\.(en|zh)\.md$/);
      if (!match) continue;
      const [, slug, lang] = match;
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const existing = result.find(f => f.path === slug);
      if (existing) {
        existing.languages.push(lang);
      } else {
        result.push({
          name,
          path: slug,
          languages: [lang]
        });
      }
    }
  }

  return result;
}

async function main() {
  const topics = await scan(CONTENT_DIR);
  const dirTopics = topics.filter(t => t.files);
  const fileTopics = topics.filter(t => !t.files);
  const sorted = [...dirTopics, ...fileTopics];

  const manifest = [];
  for (const t of sorted) {
    if (t.files) {
      manifest.push({
        id: t.id,
        name: t.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        files: t.files.map(f => ({
          name: f.name,
          slug: f.path,
          languages: f.languages
        }))
      });
    } else {
      manifest.push({
        id: t.path,
        name: t.name,
        files: [{
          name: t.name,
          slug: t.path,
          languages: t.languages
        }]
      });
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Generated ${OUT_FILE} with ${manifest.length} topic(s).`);
}

main().catch(e => { console.error(e); process.exit(1); });
