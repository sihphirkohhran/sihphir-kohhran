/**
 * Syncs Archive Registry categories to:
 * 1. public/admin/registry/*.json (for reference)
 * 2. public/admin/config.yml select options (Decap CMS — no custom React widget)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'admin', 'registry');
const configPath = path.join(root, 'public', 'admin', 'config.yml');

const registries = [
  {
    type: 'document',
    src: path.join(root, 'src', 'content', 'settings', 'document-categories.json'),
    dest: path.join(outDir, 'document-categories.json'),
    begin: '# >>> DOCUMENT_CATEGORY_SELECT >>>',
    end: '# <<< DOCUMENT_CATEGORY_SELECT <<<',
    hint: 'From Archive Registry → Document Categories. After adding categories, save registry, then press F5 on admin (auto-syncs when npm run dev is running).',
  },
  {
    type: 'gallery',
    src: path.join(root, 'src', 'content', 'settings', 'gallery-categories.json'),
    dest: path.join(outDir, 'gallery-categories.json'),
    begin: '# >>> GALLERY_CATEGORY_SELECT >>>',
    end: '# <<< GALLERY_CATEGORY_SELECT <<<',
    hint: 'From Archive Registry → Gallery Categories. After adding categories, save registry, then press F5 on admin (auto-syncs when npm run dev is running).',
  },
];

function loadCategoryNames(src) {
  if (!fs.existsSync(src)) return [];
  const data = JSON.parse(fs.readFileSync(src, 'utf8'));
  return (data.categories || [])
    .map((c) => c?.name)
    .filter(Boolean);
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function buildSelectField(names, hint) {
  const options =
    names.length > 0
      ? `options: [${names.map((n) => yamlString(n)).join(', ')}]`
      : 'options: []';
  return [
    '      - label: "Category"',
    '        name: "category"',
    '        widget: "select"',
    `        ${options}`,
    `        hint: "${hint}"`,
  ].join('\n');
}

function patchConfigMarkers(configText, begin, end, fieldYaml) {
  const start = configText.indexOf(begin);
  const stop = configText.indexOf(end);
  if (start === -1 || stop === -1 || stop < start) {
    throw new Error(`Markers not found in config.yml: ${begin}`);
  }
  const before = configText.slice(0, start + begin.length);
  const after = configText.slice(stop);
  return `${before}\n${fieldYaml}\n      ${after}`;
}

fs.mkdirSync(outDir, { recursive: true });

let configText = fs.readFileSync(configPath, 'utf8');

for (const reg of registries) {
  if (fs.existsSync(reg.src)) {
    fs.copyFileSync(reg.src, reg.dest);
    console.log(`[sync:registry] ${path.relative(root, reg.src)} → ${path.relative(root, reg.dest)}`);
  } else {
    console.warn(`[sync:registry] Missing ${reg.src}`);
  }

  const names = loadCategoryNames(reg.src);
  const fieldYaml = buildSelectField(names, reg.hint);
  configText = patchConfigMarkers(configText, reg.begin, reg.end, fieldYaml);
  console.log(`[sync:registry] ${reg.type} categories (${names.length}): ${names.join(', ') || '(none)'}`);
}

fs.writeFileSync(configPath, configText, 'utf8');
console.log(`[sync:registry] Updated ${path.relative(root, configPath)}`);
