// Scrape articles from configured sites into the knowledge hub.
// Usage: node scripts/scrape.mjs --source <name|all> [--dry-run]

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(__dirname, '..');
const CONFIG_PATH = join(PROJECT_DIR, 'scrape-config.json');
const CONTENT_DIR = join(PROJECT_DIR, 'public', 'content');

function parseArgs() {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  return {
    source: sourceIdx !== -1 ? args[sourceIdx + 1] : null,
    dryRun: args.includes('--dry-run'),
  };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-+/g, '-');
}

async function existingSlugs(dir) {
  if (!existsSync(dir)) return new Set();
  const files = await readdir(dir);
  return new Set(files.filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')));
}

function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function extractTime($$, selector) {
  if (!selector) return new Date().toISOString().slice(0, 10);
  const text = $$(selector).first().text().trim();
  if (!text) return new Date().toISOString().slice(0, 10);
  // Strip prefix like "Published " that some sites use
  const cleaned = text.replace(/^(Published|Posted)\s+/i, '');
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function extractDescription($$, selector, contentEl) {
  if (selector) {
    const text = $$(selector).first().text().trim();
    if (text) return text;
  }
  // Fallback: first <p> inside the content element
  const firstP = contentEl.find('p').first().text().trim();
  return firstP || '';
}

async function main() {
  const { source: sourceName, dryRun } = parseArgs();

  if (!sourceName) {
    console.error('Usage: node scripts/scrape.mjs --source <name|all> [--dry-run]');
    process.exit(1);
  }

  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  const sources = sourceName === 'all'
    ? config.sources
    : config.sources.filter(s => s.name === sourceName);

  if (sources.length === 0) {
    console.error(`No source found matching "${sourceName}"`);
    process.exit(1);
  }

  const turndown = new TurndownService();
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const source of sources) {
    console.log(`\n==> ${source.name}`);

    // Collect article URLs
    const links = [];

    if (source.listUrl) {
      console.log(`  Fetching list: ${source.listUrl}`);
      const res = await fetch(source.listUrl, {
        headers: { 'User-Agent': 'KnowledgeHubScraper/1.0' },
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      $(source.listItem).each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          const url = resolveUrl(href, source.listUrl);
          if (url) links.push(url);
        }
      });
      console.log(`  Found ${links.length} article links`);
    } else if (source.urls) {
      links.push(...source.urls);
    }

    // Deduplicate
    const uniqueLinks = [...new Set(links)];

    // Process each article
    const targetDir = join(CONTENT_DIR, source.targetFolder);
    const existing = await existingSlugs(targetDir);
    let added = 0;
    let skipped = 0;

    for (const url of uniqueLinks) {
      // Derive preliminary slug from URL path
      const pathname = new URL(url).pathname;
      const urlSlug = pathname.split('/').filter(Boolean).pop() || 'index';

      if (dryRun) {
        if (existing.has(urlSlug)) {
          console.log(`  [skip] ${urlSlug} (already exists)`);
          skipped++;
        } else {
          console.log(`  [new]  ${url}`);
          added++;
        }
        continue;
      }

      try {
        console.log(`  Fetching: ${url}`);
        const articleRes = await fetch(url, {
          headers: { 'User-Agent': 'KnowledgeHubScraper/1.0' },
        });
        if (!articleRes.ok) {
          console.log(`  Skipping: HTTP ${articleRes.status}`);
          continue;
        }

        const articleHtml = await articleRes.text();
        const $$ = cheerio.load(articleHtml);

        // Extract title from <h1>
        const title = $$('h1').first().text().trim();
        if (!title) {
          console.log(`  Skipping: no <h1> found`);
          continue;
        }

        const fileSlug = slugify(title) || urlSlug;

        // Check if already downloaded
        if (existing.has(fileSlug)) {
          console.log(`  Skipping: ${fileSlug}.md already exists`);
          skipped++;
          continue;
        }

        // Extract content
        const contentEl = $$(source.content);
        if (!contentEl.length) {
          console.log(`  Skipping: content selector "${source.content}" not found`);
          continue;
        }

        // Extract metadata
        const pubTime = extractTime($$, source.timeSelector);
        const description = extractDescription($$, source.descSelector, contentEl);

        const contentHtml = contentEl.html();
        const markdown = turndown.turndown(contentHtml);

        // Build file with frontmatter
        const escapeYaml = (s) => s.replace(/"/g, '\\"');
        const fileContent = [
          '---',
          `time: ${pubTime}`,
          `description: "${escapeYaml(description)}"`,
          '---',
          '',
          `# ${title}`,
          '',
          `> Source: <${url}>`,
          '',
          markdown,
        ].join('\n') + '\n';

        await mkdir(targetDir, { recursive: true });
        const filePath = join(targetDir, `${fileSlug}.md`);
        await writeFile(filePath, fileContent);
        console.log(`  Added: ${fileSlug}.md`);
        existing.add(fileSlug);
        added++;
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }

    console.log(`  ${source.name}: ${added} new, ${skipped} skipped`);
    totalAdded += added;
    totalSkipped += skipped;
  }

  console.log(`\n==> Done: ${totalAdded} added, ${totalSkipped} skipped`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
