/**
 * Watches Archive Registry JSON and re-syncs to public/admin/registry/
 * so category dropdowns update while npm run dev is running.
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const syncScript = path.join(__dirname, 'sync-category-registry.mjs');

const watchPaths = [
  path.join(root, 'src', 'content', 'settings', 'document-categories.json'),
  path.join(root, 'src', 'content', 'settings', 'gallery-categories.json'),
];

function runSync() {
  const child = spawn(process.execPath, [syncScript], { stdio: 'inherit', cwd: root });
  child.on('error', (err) => console.error('[watch:registry]', err));
}

runSync();

for (const file of watchPaths) {
  if (!fs.existsSync(file)) continue;
  fs.watch(file, { persistent: true }, () => {
    console.log('[watch:registry] Registry changed, syncing…');
    runSync();
  });
}

console.log('[watch:registry] Watching Archive Registry category files…');
