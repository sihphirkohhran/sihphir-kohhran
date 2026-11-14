import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/components/QuickLinks.astro', import.meta.url), 'utf8');
const links = JSON.parse(readFileSync(new URL('../src/content/settings/quick-links.json', import.meta.url), 'utf8')).links;

test('Quick Links preserve CMS-provided labels, destinations, ordering and actions', () => {
  assert.deepEqual(links.map(({ label, href, action, order }) => ({ label, href, action, order })), [
    { label: 'Hun Ruatna', href: '/#notice-board', action: 'tab-weekly', order: 0 },
    { label: 'Thlabi Mawhphurtu', href: '/#notice-board', action: 'tab-monthly', order: 1 },
    { label: 'Notice Board', href: '/#notice-board', action: 'tab-notices', order: 2 },
  ]);
  assert.match(component, /\.filter\(\(link\) => link\.visible !== false && link\.enabled !== false\)/);
  assert.match(component, /\.sort\(\(a, b\) => \(a\.order \?\? 0\) - \(b\.order \?\? 0\)\)/);
  assert.match(component, /href=\{link\.href\}/);
  assert.match(component, /data-quick-action=\{link\.action \?\? ''\}/);
});

test('Quick Links render compact responsive full-card links with accessible focus', () => {
  assert.match(component, /<a[\s\S]*class="quick-link-card group flex h-full min-h-/);
  assert.match(component, /grid-cols-1 gap-2\.5 sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(component, /focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/);
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /group-hover:translate-x-0\.5/);
});

test('Quick Links retain CMS icon, description and new-tab options', () => {
  assert.match(component, /\{link\.icon \?/);
  assert.match(component, /\{link\.description &&/);
  assert.match(component, /link\.open_in_new_tab \|\| link\.new_tab \|\| link\.target === '_blank'/);
  assert.match(component, /rel=\{opensNewTab \? 'noopener noreferrer' : undefined\}/);
});
