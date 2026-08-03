/**
 * During `npm run dev`, watches Archive Registry JSON and updates
 * public/admin/config.yml select options automatically.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const syncScript = path.join(__dirname, 'sync-category-registry.mjs');

const SETTINGS_SUFFIXES = [
  'src/content/settings/document-categories.json',
  'src/content/settings/gallery-categories.json',
];

function runSync() {
  spawn(process.execPath, [syncScript], { cwd: root, stdio: 'inherit' });
}

function isRegistryFile(file) {
  const norm = file.replace(/\\/g, '/');
  return SETTINGS_SUFFIXES.some((suffix) => norm.endsWith(suffix));
}

export function registrySyncPlugin() {
  let debounce;

  return {
    name: 'vite-plugin-registry-sync',
    configureServer(server) {
      runSync();

      const scheduleSync = (file) => {
        if (!isRegistryFile(file)) return;
        clearTimeout(debounce);
        debounce = setTimeout(runSync, 350);
      };

      server.watcher.on('change', scheduleSync);
      server.watcher.on('add', scheduleSync);

      server.middlewares.use('/__admin_sync_registry', (req, res, next) => {
        if (req.url !== '/__admin_sync_registry' && req.url !== '/__admin_sync_registry/') {
          return next();
        }
        runSync();
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: true,
            message: 'Category lists updated. Press F5 to refresh admin and see new options.',
          }),
        );
      });
    },
  };
}
