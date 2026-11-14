import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('homepage statistics dashboard link is compact, centered and keyboard accessible', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="statistics"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.ok(section, 'statistics section exists');
  assert.ok(section.includes('<div class="flex justify-center">'));
  assert.match(section, /href=\{lookerUrl\}/);
  assert.match(section, /target=\{statsSettings\.looker_new_tab === false \? undefined : '_blank'\}/);
  assert.ok(section.includes('rel="noopener"'));
  assert.match(section, /inline-flex items-center justify-center gap-2 rounded bg-navy px-4 py-2\.5 font-body text-sm font-semibold tracking-wide text-gold-pale/);
  assert.match(section, /hover:bg-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/);
  assert.match(section, /statsSettings\.dashboard_text \?\? 'Detailed Dashboard — Looker Studio →'/);
  assert.match(section, /grid grid-cols-3 gap-3 mb-4/);
});
