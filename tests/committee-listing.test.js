import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/committee.astro', import.meta.url), 'utf8');

test('committee listing cards preserve CMS group photos and image fallback behavior', () => {
  assert.match(page, /photo: resolveCommitteePhoto\(data\.group_photo\)/);
  assert.match(page, /src=\{committee\.photo \|\| defaultCommitteePhoto\}/);
  assert.match(page, /data-fallback=\{defaultCommitteePhoto\}/);
  assert.match(page, /object-fit:contain/);
  assert.match(page, /height:190px;flex:0 0 190px/);
});

test('featured and archive cards show year, member count, and committee name without excerpts', () => {
  const cards = [...page.matchAll(/<a class="committee-card-link"[^>]*>[\\s\\S]*?<\\/a>/g)].map(([card]) => card);
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.match(card, /committee-meta/);
    assert.match(card, /\\{committee\\.year\\}/);
    assert.match(card, /\\{committee\\.memberCount\\} members/);
    assert.match(card, /<h3>\\{committee\\.name\\}<\\/h3>/);
    assert.doesNotMatch(card, /committee\\.description|<p>/);
    assert.doesNotMatch(card, /View Committee member list|View Committee/);
    assert.match(card, /View Details/);
  }
});

test('each entire card is a semantic link to its existing inline details section', () => {
  const listing = page.slice(page.indexOf('{featured.length > 0'), page.indexOf('<section class="committee-empty"'));
  assert.equal((listing.match(/<a class="committee-card-link/g) || []).length, 2);
  assert.equal((listing.match(/href=\{\x60#committee-detail-\$\{committee\.id\}\x60\}/g) || []).length, 2);
  assert.equal((listing.match(/data-view-committee=\{committee\.id\}/g) || []).length, 2);
  assert.match(page, /querySelectorAll<HTMLAnchorElement>\('\[data-view-committee\]'\)/);
  assert.match(page, /event\.preventDefault\(\)/);
  assert.match(page, /history\.replaceState\(null,''/);
  assert.match(page, /committee-card-link:focus-visible\{outline:3px solid #b8953f/);
  assert.match(page, /aria-label=\{\x60View \$\{committee\.name\} details\x60\}/);
});

test('committee search, year filtering, counts, and detail rendering remain in place', () => {
  assert.match(page, /const search=.*committee-search/);
  assert.match(page, /card\.dataset\.year===yr/);
  assert.match(page, /card\.dataset\.name/);
  assert.match(page, /id="committee-count"/);
  assert.match(page, /data-committee-detail/);
  assert.match(page, /set:html=\{committee\.descriptionHtml\}/);
  assert.match(page, /data-committee-year-switch/);
});
