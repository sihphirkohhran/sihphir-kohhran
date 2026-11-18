import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/committee.astro', import.meta.url), 'utf8');

test('committee listing cards preserve CMS group photos and image fallback behavior', () => {
  assert.match(page, /photo: resolveCommitteePhoto\(data\.group_photo\)/);
  assert.match(page, /src=\{committee\.photo \|\| defaultCommitteePhoto\}/);
  assert.match(page, /data-fallback=\{defaultCommitteePhoto\}/);
  assert.match(page, /object-fit:cover;object-position:center 35%/);
  assert.match(page, /height:190px;flex:0 0 190px/);
});

test('featured and archive cards preserve year, member count, committee name, and details link', () => {
  const cards = [...page.matchAll(/<a class="committee-card-link"[^>]*>[\s\S]*?<\/a>/g)].map(([card]) => card);
  assert.equal(cards.length, 2);
  for (const card of cards) {
    assert.match(card, /committee-meta/);
    assert.match(card, /\{committee\.year\}/);
    assert.match(card, /\{committee\.memberCount\} members/);
    assert.match(card, /<h3>\{committee\.name\}<\/h3>/);
    assert.doesNotMatch(card, /committee\.description|<p>/);
    assert.match(card, /View Details/);
    assert.match(card, /data-committee=\{committee\.committeeId\}/);
  }
});

test('entire card remains a semantic link to its existing inline details section', () => {
  const listing = page.slice(page.indexOf('{featured.length > 0'), page.indexOf('<section class="committee-empty"'));
  assert.equal((listing.match(/<a class="committee-card-link/g) || []).length, 2);
  assert.equal((listing.match(/href=\{\x60#committee-detail-\$\{committee\.id\}\x60\}/g) || []).length, 2);
  assert.equal((listing.match(/data-view-committee=\{committee\.id\}/g) || []).length, 2);
  assert.match(page, /querySelectorAll<HTMLAnchorElement>\('\[data-view-committee\]'\)/);
  assert.match(page, /event\.preventDefault\(\)/);
  assert.match(page, /history\.replaceState\(null,''/);
  assert.match(page, /committee-card-link:focus-visible\{outline:3px solid #b8953f/);
});

test('search, All Years, Committee dropdowns, dynamic options, and latest-year default are wired together', () => {
  assert.match(page, /id="committee-search"/);
  assert.match(page, /<option value="all" selected=\{defaultYear === 'all'\}>All Years<\/option>/);
  assert.match(page, /id="committee-type"/);
  assert.match(page, /All Committees/);
  assert.match(page, /getCommitteeOptions\(masterEntry\?\.data\.committees/);
  assert.match(page, /const defaultYear = getDefaultCommitteeYear\(years\)/);
  assert.match(page, /data-default-year=\{defaultYear\}/);
  assert.match(page, /data-committee=\{committee\.committeeId\}/);
  assert.match(page, /matchesCommitteeFilters\(/);
  assert.match(page, /\[search,year,committee\]/);
  assert.match(page, /id="committee-count"/);
  assert.match(page, /id="committee-empty"/);
});

test('Clear Filters restores the default year and All Committees without changing the detail year switcher', () => {
  assert.match(page, /resetCommitteeFilters\(year\?\.dataset\.defaultYear\|\|'all'\)/);
  assert.match(page, /year\.value=defaults\.year/);
  assert.match(page, /committee\.value=defaults\.committeeId/);
  assert.match(page, /search\.value=defaults\.query/);
  assert.match(page, /data-committee-year-switch/);
  assert.match(page, /detail\.dataset\.committeeId===current\?\.dataset\.committeeId/);
});

test('filter controls retain the compact responsive two-column desktop layout', () => {
  assert.match(page, /committee-filter-selects\{display:grid;grid-template-columns:repeat\(2,minmax\(165px,1fr\)\)/);
  assert.match(page, /@media\(max-width:560px\)\{[\s\S]*?committee-filter-selects\{grid-template-columns:1fr\}/);
});

test('committee card typography remains Poppins Bold with EB Garamond details indicators', () => {
  assert.match(page, /\.committee-card h3\{[^}]*font-family:'Poppins',sans-serif;[^}]*font-size:15\.5px;font-weight:700/);
  assert.match(page, /\.committee-card footer>span\{font-family:'EB Garamond',serif;[^}]*font-size:\.9rem/);
});
