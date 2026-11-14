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
  assert.ok(section.includes('id="history-full"'));
  assert.ok(section.includes('max-w-3xl'));
  assert.ok(section.includes('leading-8'));
  assert.ok(section.indexOf('id="history-full"') > section.indexOf('grid grid-cols-1 md:grid-cols-2'));
  assert.ok(section.includes('<Fragment set:html={historyFullHtml} />'));
});

test('history toggle supports accessible expansion, collapse and existing destination navigation', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="history"[\\s\\S]*?<\\/section>/)?.[0] ?? '';
  assert.ok(section.includes('aria-expanded="false"'));
  assert.ok(section.includes('aria-controls="history-full"'));
  assert.ok(section.includes("data-destination={history.destination ?? ''}"));
  assert.ok(section.includes('data-collapse-label="Show Less"'));
  assert.ok(home.includes("full?.classList.toggle('hidden', !expanded)"));
  assert.ok(home.includes("btn.setAttribute('aria-expanded', String(expanded))"));
  assert.ok(home.includes('btn.dataset.destination'));
  assert.ok(home.includes('window.location.href = btn.dataset.destination'));
});


test('expanded history includes a keyboard-accessible bottom Show Less control', () => {
  const section = home.match(/<section class="bg-cream py-8 px-4" id="history"[\\s\\S]*?<\\/section>/)?.[0] ?? '';
  assert.ok(section.includes('id="history-collapse-bottom"'));
  assert.ok(section.includes('Show Less ↑'));
  assert.ok(section.includes('aria-controls="history-full"'));
  assert.ok(section.includes('focus-visible:outline'));
  assert.ok(section.indexOf('id="history-collapse-bottom"') > section.indexOf('<Fragment set:html={historyFullHtml} />'));
});

test('either history control collapses the same content and bottom collapse respects reduced motion', () => {
  assert.ok(home.includes('function setHistoryExpanded(nextExpanded: boolean)'));
  assert.ok(home.includes("full?.classList.toggle('hidden', !expanded)"));
  assert.ok(home.includes("btn?.setAttribute('aria-expanded', String(expanded))"));
  assert.ok(home.includes("bottomCollapse?.setAttribute('aria-expanded', String(expanded))"));
  assert.ok(home.includes("bottomCollapse?.addEventListener('click'"));
  assert.ok(home.includes('setHistoryExpanded(false)'));
  assert.ok(home.includes("window.matchMedia('(prefers-reduced-motion: reduce)').matches"));
  assert.ok(home.includes("behavior: prefersReducedMotion ? 'auto' : 'smooth'"));
  assert.ok(home.includes("historyHeading?.scrollIntoView"));
  assert.ok(home.includes('btn.dataset.destination'));
  assert.ok(home.includes('window.location.href = btn.dataset.destination'));
});
