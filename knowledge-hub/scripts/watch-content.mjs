import { watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'public', 'content');
const UPDATE_CMD = 'node scripts/generate-manifest.mjs';

let timeout;

console.log(`Watching for changes in ${CONTENT_DIR}...`);
console.log('Manifest auto-regenerates on file add/remove. Ctrl+C to stop.');

watch(CONTENT_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename || !filename.endsWith('.md')) return;
  if (timeout) clearTimeout(timeout);
  // Debounce: multiple rapid changes = one rebuild
  timeout = setTimeout(() => {
    console.log(`\n[${new Date().toLocaleTimeString()}] Changed: ${filename}`);
    try {
      execSync(UPDATE_CMD, { cwd: join(__dirname, '..'), stdio: 'inherit' });
    } catch {
      console.error('Failed to regenerate manifest.');
    }
  }, 300);
});
