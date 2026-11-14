import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('homepage church history uses a responsive side-by-side heritage layout', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="history"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.ok(section, 'history section exists');
  assert.match(section, /max-w-4xl mx-auto/);
  assert.match(section, /grid grid-cols-1 md:grid-cols-2 items-center/);
  assert.match(section, /aspect-\[4\/3\]/);
  assert.match(section, /rounded-md overflow-hidden/);
  assert.match(section, /Established 1910/);
});

test('homepage church history preserves CMS text, image, visibility and read-more destination', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="history"[\s\S]*?<\/section>/)?.[0] ?? '';
  assert.match(section, /history\.enabled === false/);
  assert.match(section, /history\.building_photo \?\? '\/images\/church-building\.jpg'/);
  assert.match(section, /\{history\.short\}/);
  assert.match(section, /<Fragment set:html=\{historyFullHtml\} \/>/);
  assert.match(section, /data-destination=\{history\.destination \?\? ''\}/);
  assert.match(section, /history\.read_more_text \?\? 'Read More →'/);
  assert.match(section, /id="history-toggle"/);
});

test('homepage church history derives rendered full text from the CMS history.full field', () => {
  assert.match(home, /const historyFullHtml = renderMarkdown\(history\.full \?\? ''\);/);
});

test('expanded homepage history renders in a full-width reading area below the intro row', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="history"[\\s\\S]*?<\\/section>/)?.[0] ?? '';
  assert.match(section, /grid grid-cols-1 md:grid-cols-2 items-center/);
  assert.match(section, /id="history-full"[\\s\\S]*?max-w-3xl[\\s\\S]*?leading-8/);
  assert.ok(section.indexOf('id="history-full"') > section.indexOf('grid grid-cols-1 md:grid-cols-2'));
  assert.match(section, /<Fragment set:html=\\{historyFullHtml\\} \\/>/);
});

test('history toggle supports accessible expansion, collapse and existing destination navigation', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="history"[\\s\\S]*?<\\/section>/)?.[0] ?? '';
  assert.match(section, /aria-expanded="false"/);
  assert.match(section, /aria-controls="history-full"/);
  assert.match(section, /data-destination=\\{history.destination \\?\\? ''\\}/);
  assert.match(section, /data-collapse-label="Show Less"/);
  assert.match(home, /full\\?\.classList\.toggle\('hidden', !expanded\)/);
  assert.match(home, /btn\.setAttribute\('aria-expanded', String\(expanded\)\)/);
  assert.match(home, /btn\.dataset\.destination/);
  assert.match(home, /window\.location\.href = btn\.dataset\.destination/);
});
