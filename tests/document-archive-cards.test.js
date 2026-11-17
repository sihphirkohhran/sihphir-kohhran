import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../src/pages/document.astro', import.meta.url), 'utf8');

test('featured and archive documents render compact full-width list rows', () => {
  assert.match(page, /class="document-list featured-list" id="featured-grid"/);
  assert.match(page, /class="document-list" id="document-grid"/);
  assert.equal((page.match(/class="document-row" data-document-row data-document-open/g) || []).length, 2);
  assert.match(page, /<span class="document-row-title">\{document\.title\}<\/span>/);
  assert.match(page, /document-row-meta[\s\S]*?\{document\.category\}[\s\S]*?\{document\.yearLabel\}[\s\S]*?document\.fileCount/);
  assert.doesNotMatch(page, /class="document-grid"|document-card|document-badges|document-actions/);
  assert.match(page, /\.document-list\{display:flex;flex-direction:column/);
  assert.match(page, /\.document-row:focus-visible/);
  assert.match(page, /@media\(max-width:560px\)/);
});

test('single-file rows open their sole existing URL in a new tab', () => {
  assert.match(page, /if \(files\.length === 1 && files\[0\]\?\.url\)/);
  assert.match(page, /window\.open\(files\[0\]\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(page, /data-files=\{JSON\.stringify\(document\.files\)\}/);
});

test('multiple-file dialog renders every normalized attachment with its own URL and actions', () => {
  assert.match(page, /files: normalizedFiles\.map/);
  assert.match(page, /if \(files\.length < 2 \|\| !dialog/);
  assert.match(page, /files\.forEach\(\(file\) =>/);
  assert.match(page, /open\.href = file\.url/);
  assert.match(page, /download\.href = file\.url/);
  assert.match(page, /download\.download = file\.filename/);
  assert.match(page, /filename\.textContent = file\.filename/);
  assert.match(page, /type\.textContent = fileType\(file\) \+ ' file'/);
  assert.match(page, /dialogTitle\.textContent = row\.dataset\.title/);
});

test('file-selection dialog supports Escape, close, keyboard access and focus restoration', () => {
  assert.match(page, /<dialog class="document-dialog" id="document-dialog" aria-labelledby="document-dialog-title">/);
  assert.match(page, /dialog\.showModal\(\)/);
  assert.match(page, /closeDialog\?\.addEventListener\('click', \(\) => dialog\?\.close\(\)\)/);
  assert.match(page, /dialog\?\.addEventListener\('close', \(\) => lastFocusedRow\?\.focus\(\)\)/);
  assert.match(page, /closeDialog\?\.focus\(\)/);
  assert.match(page, /target = '_blank'/);
  assert.match(page, /rel = 'noopener noreferrer'/);
});

test('document archive retains search, filters, sorting and featured grouping', () => {
  for (const value of ['#document-search', '#document-category', '#document-year', '#document-sort', 'featured-grid', 'document-grid', 'data-year={document.yearFilterValue}', 'data-date={document.sortDate}']) assert.ok(page.includes(value), 'missing preserved behavior: ' + value);
  assert.match(page, /sort\?\.value === 'oldest'/);
  assert.match(page, /sort\?\.value === 'title'/);
  assert.match(page, /row\.hidden = !matches/);
});

test('historical-year labels and published/archive visibility rules remain intact', () => {
  assert.match(page, /formatHistoricalYear\(year, yearType\)/);
  assert.match(page, /entry\.data\.status !== 'archived' && entry\.data\.published !== false/);
  assert.match(page, /historicalYearFilterValue\(year, yearType\)/);
});

test('2025 Rawngbawltu List retains both source attachments and their actual filenames', () => {
  const source = readFileSync(new URL('../src/content/documents/other/2025-rawngbawltu-list.md', import.meta.url), 'utf8');
  const filesLine = source.match(/^files:\s*(\[.*\])\s*$/m);
  assert.ok(filesLine, 'expected the existing normalized files frontmatter collection');
  const files = JSON.parse(filesLine[1]);
  assert.equal(files.length, 2);
  assert.deepEqual(files.map((file) => file.filename), ['SS Rawngbawltu 2025.pdf', '2025 Rawngbawltute.pdf']);
  assert.deepEqual(files.map((file) => file.url), [
    '/documents/1794409442115-ss-rawngbawltu-2025.pdf',
    '/documents/1794409442031-2025-rawngbawltute.pdf',
  ]);
  assert.match(page, /data-files=\{JSON\.stringify\(document\.files\)\}/);
});
