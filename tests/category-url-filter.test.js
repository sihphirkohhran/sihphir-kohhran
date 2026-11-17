import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCategoryFromSearch } from '../src/lib/category-query.js';

const documentPage = readFileSync(new URL('../src/pages/document.astro', import.meta.url), 'utf8');
const galleryPage = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('category query resolves encoded names, spaces and special characters by exact match', () => {
  const categories = ['Year Book', 'KTP', 'Women & Children', 'KTP+Music', 'Mizo / English'];
  assert.equal(resolveCategoryFromSearch('?category=Year%20Book', categories), 'Year Book');
  assert.equal(resolveCategoryFromSearch('?category=KTP', categories), 'KTP');
  assert.equal(resolveCategoryFromSearch('?category=Women%20%26%20Children', categories), 'Women & Children');
  assert.equal(resolveCategoryFromSearch('?category=KTP%2BMusic', categories), 'KTP+Music');
  assert.equal(resolveCategoryFromSearch('?category=Mizo+%2F+English', categories), 'Mizo / English');
});

test('missing, empty, malformed or unknown category values safely resolve to no selection', () => {
  const categories = ['Year Book', 'KTP'];
  assert.equal(resolveCategoryFromSearch('', categories), null);
  assert.equal(resolveCategoryFromSearch('?year=2025', categories), null);
  assert.equal(resolveCategoryFromSearch('?category=', categories), null);
  assert.equal(resolveCategoryFromSearch('?category=Unknown', categories), null);
  assert.equal(resolveCategoryFromSearch('?category=ktp', categories), null);
  assert.equal(resolveCategoryFromSearch('?category=%E0%A4%A', categories), null);
});

test('document archive applies only a valid query category before its existing initial filter pass', () => {
  assert.match(documentPage, /resolveCategoryFromSearch\(window\.location\.search/);
  assert.match(documentPage, /Array\.from\(category\.options[\s\S]*?filter\(\(value\) => value !== 'all'\)/);
  assert.match(documentPage, /if \(requestedCategory && category\) category\.value = requestedCategory/);
  assert.match(documentPage, /applyFilters\(\);\s*<\/script>/);
  assert.match(documentPage, /selectedCategory === 'all' \|\| row\.dataset\.category === selectedCategory/);
  assert.match(documentPage, /if \(category\) category\.value = 'all'/);
});

test('gallery applies a valid category and switches year to All Years', () => {
  assert.match(galleryPage, /resolveCategoryFromSearch\(window\.location\.search/);
  assert.match(galleryPage, /if\(requestedCategory&&category&&year\)\{category\.value=requestedCategory;year\.value='all';\}/);
  assert.match(galleryPage, /selectedYear==='all'\|\|card\.dataset\.year===selectedYear/);
  assert.match(galleryPage, /if\(year\)year\.value='all'/);
});

test('gallery retains latest numeric year as its default without a valid category query', () => {
  assert.match(galleryPage, /const latestYear = years\[0\]/);
  assert.match(galleryPage, /const initialYearFilter = latestYear === undefined \? \(hasUnspecifiedYear \? 'unspecified' : 'all'\) : String\(latestYear\)/);
  assert.match(galleryPage, /selected=\{String\(year\) === initialYearFilter\}/);
  assert.match(galleryPage, /applyFilters\(\);\s*<\/script>/);
});

test('gallery search, sort, album navigation, external links and lightbox handlers remain present', () => {
  for (const pattern of [
    /\[search,year,category\]\.forEach/,
    /sort\?\.addEventListener\('change',applyFilters\)/,
    /sort\.value==='photos'/,
    /data-open-album/,
    /target=\{album\.externalNavigation \? '_blank' : undefined\}/,
    /data-photo/,
    /lightbox\?\.showModal\(\)/,
    /data-lightbox-next/
  ]) assert.match(galleryPage, pattern);
});
