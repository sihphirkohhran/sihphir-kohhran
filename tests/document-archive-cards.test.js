import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/document.astro', import.meta.url), 'utf8');

test('document archive cards use compact file labels instead of embedded previews', () => {
  assert.doesNotMatch(page, /<iframe|document-preview|<img src=\{document\.url\}/);
  assert.match(page, /class="file-icon file-\$\{document\.extension\}"/);
  assert.match(page, /document\.fileCount === 1 \? 'file' : 'files'/);
});

test('document cards expose one view action and one download action', () => {
  assert.equal((page.match(/>View Document<\/a>/g) || []).length, 2);
  assert.equal((page.match(/class="download-link">Download<\/a>/g) || []).length, 2);
  assert.doesNotMatch(page, />Preview<|>Open ↗</);
  assert.match(page, /href=\{document\.url\} target="_blank" rel="noopener noreferrer" class="view-link"/);
  assert.match(page, /href=\{document\.url\} download class="download-link"/);
});

test('document archive retains filters, sorting and featured grouping', () => {
  for (const value of ['#document-search', '#document-category', '#document-year', '#document-sort', 'featured-grid', 'document-grid', 'data-year={document.yearFilterValue}', 'data-date={document.sortDate}']) {
    assert.ok(page.includes(value), `missing preserved archive behavior: ${value}`);
  }
  assert.match(page, /sort\?\.value === 'oldest'/);
  assert.match(page, /sort\?\.value === 'title'/);
});

test('document page keeps historical-year labels and publication visibility rules', () => {
  assert.match(page, /formatHistoricalYear\(year, yearType\)/);
  assert.match(page, /entry\.data\.status !== 'archived' && entry\.data\.published !== false/);
});
