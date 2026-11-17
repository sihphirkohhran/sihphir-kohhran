import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const galleryPage = read('../src/pages/gallery.astro');
const documentPage = read('../src/pages/document.astro');
const galleryManager = read('../public/admin/gallery-manager.js');
const documentManager = read('../public/admin/document-manager.js');
const schema = read('../src/content/config.ts');
const yearHelper = read('../src/lib/historical-year.ts');
const documentLib = read('../src/lib/documents.ts');

test('shared historical year model formats known, approximate and unspecified values', () => {
  assert.match(yearHelper, /type === 'unspecified' \|\| year == null/);
  assert.match(yearHelper, /type === 'approximate' \? `Circa \$\{year\}`/);
  assert.match(yearHelper, /Year Unspecified/);
  assert.match(yearHelper, /return hasNumericYear \? 'known' : 'unspecified'/);
});

test('content schemas accept optional historical year metadata without requiring migration', () => {
  assert.match(schema, /year: z\.number\(\)\.optional\(\),\s*yearType: z\.enum\(\['known', 'approximate', 'unspecified'\]\)\.optional\(\),\s*category: z\.string\(\)/);
  assert.match(schema, /year: z\.number\(\)\.optional\(\),\s*yearType: z\.enum\(\['known', 'approximate', 'unspecified'\]\)\.optional\(\),\s*month: z\.number\(\)\.optional\(\)/);
});

test('Gallery Manager exposes the same three year choices and only requires a year when specified', () => {
  for (const label of ['Known Year', 'Approximate Year', 'Year Unspecified']) {
    assert.ok(galleryManager.includes(label));
  }
  assert.match(galleryManager, /name="yearType"/);
  assert.match(galleryManager, /id="gallery-year-value-wrap"/);
  assert.match(galleryManager, /yearType!=='unspecified'.*Number\.isInteger/);
  assert.match(galleryManager, /yearType==='unspecified'\?delete selected\.data\.year/);
  assert.match(galleryManager, /==='approximate'.*Circa/);
  assert.match(galleryManager, /record\.data\.yearType = record\.data\.yearType \|\| \(record\.data\.year != null.*'known' : 'unspecified'/);
  assert.doesNotMatch(galleryManager, /const year=new Date\(\)\.getFullYear\(\)/);
});

test('Document Manager preserves explicit unspecified and legacy year inference', () => {
  for (const label of ['Known Year', 'Approximate Year', 'Year Unspecified']) {
    assert.ok(documentManager.includes(label));
  }
  assert.match(documentManager, /name="yearType"/);
  assert.match(documentManager, /id="document-year-value-wrap"/);
  assert.match(documentManager, /d\.yearType=d\.yearType\s*\|\|/);
  assert.match(documentManager, /d\.yearType==='unspecified'/);
  assert.match(documentManager, /d\.date\|\|''\)\.match/);
  assert.match(documentManager, /yearType==='unspecified'\?delete selected\.data\.year/);
  assert.doesNotMatch(documentManager, /year:new Date\(\)\.getFullYear\(\)/);
});

test('Gallery page filters numeric and unspecified albums, defaults to latest numeric year, and labels every view', () => {
  assert.match(galleryPage, /const latestYear = years\[0\]/);
  assert.match(galleryPage, /initialYearFilter = latestYear === undefined \? \(hasUnspecifiedYear \? 'unspecified' : 'all'\)/);
  assert.match(galleryPage, /value="unspecified".*Year Unspecified/);
  assert.match(galleryPage, /data-year=\{album\.yearFilterValue\}/);
  assert.match(galleryPage, /data-sort-year=\{album\.year \?\? ''\}/);
  assert.match(galleryPage, /album\.yearLabel/);
  assert.match(galleryPage, /ay===null\?1:-1/);
  assert.match(galleryPage, /selectedYear==='all'\|\|card\.dataset\.year===selectedYear/);
});

test('Documents page keeps All years as default and suppresses all fallback years for explicit unspecified records', () => {
  assert.match(documentPage, /const legacyYear = data\.year \?\? fromId\.year \?\? parseYearFromDate\(data\.date\) \?\? null/);
  assert.match(documentPage, /resolveHistoricalYearType\(legacyYear,[\s\S]*?\.yearType/);
  assert.match(documentPage, /yearType === 'unspecified' \? null : legacyYear/);
  assert.match(documentPage, /<option value="all">All years<\/option>/);
  assert.match(documentPage, /value="unspecified">Year Unspecified/);
  assert.match(documentPage, /data-year=\{document\.yearFilterValue\}/);
  assert.match(documentPage, /document\.yearLabel/);
});

test('shared document normalization preserves legacy fallback but explicit unspecified wins', () => {
  assert.match(documentLib, /const legacyYear = raw\.year \?\? fromId\.year \?\? parseYearFromDate\(raw\.date\) \?\? null/);
  assert.match(documentLib, /raw\.yearType \?\? \(legacyYear != null \? 'known' : 'unspecified'\)/);
  assert.match(documentLib, /yearType === 'unspecified' \? null : legacyYear/);
});
