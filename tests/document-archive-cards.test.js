import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../src/pages/document.astro', import.meta.url), 'utf8');

test('featured and archive documents render compact full-width list rows', () => {
  assert.match(page, /class="document-list featured-list" id="featured-grid"/);
  assert.match(page, /class="document-list" id="document-grid"/);
  assert.equal((page.match(/class="document-row" data-document-row data-document-open/g) || []).length, 2);
  assert.match(page, /document-row-title/);
  assert.match(page, /document-row-meta[\s\S]*?document\.fileCount/);
  assert.match(page, /\.document-list\{display:flex;flex-direction:column/);
  assert.match(page, /\.document-row:focus-visible/);
  assert.match(page, /@media\(max-width:560px\)/);
});

test('single-file rows still open their original URL directly in a new tab', () => {
  assert.match(page, /if \(files\.length === 1 && files\[0\]\?\.url\)/);
  assert.match(page, /window\.open\(files\[0\]\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(page, /data-files=\{JSON\.stringify\(document\.files\)\}/);
});

test('multi-file dialog creates one full-row semantic link per attachment and no action buttons', () => {
  assert.match(page, /files\.forEach\(\(file\) =>/);
  assert.match(page, /link\.href = file\.url/);
  assert.match(page, /link\.target = '_blank'/);
  assert.match(page, /link\.rel = 'noopener noreferrer'/);
  assert.match(page, /link\.append\(icon, details, arrow\)/);
  assert.match(page, /item\.append\(link\)/);
  assert.match(page, /link\.setAttribute\('aria-label'/);
  assert.doesNotMatch(page, /download\.download|textContent = 'Open'|textContent = 'Download'/);
  assert.match(page, /dialogTitle\.textContent = row\.dataset\.title/);
});

test('recognized final extensions are removed only from the visible filename', () => {
  assert.match(page, /function displayFilename\(filename: string\)/);
  assert.match(page, /fileTypeDetails\[fileExtension\(filename\)\] \? filename\.replace/);
  assert.match(page, /filename\.textContent = displayFilename\(filenameText\)/);
  assert.match(page, /filenameText/);
  assert.match(page, /link\.setAttribute\('aria-label', 'Open ' \+ filenameText/);
  assert.doesNotMatch(page, /download\.download/);
  for (const extension of ['pdf','xlsx','xls','csv','docx','doc','pptx','ppt','zip','jpg','jpeg','png','gif','webp','avif','svg']) {
    assert.ok(page.includes(extension + ': { label:'), 'missing mapping for ' + extension);
  }
  for (const label of ['PDF Document','Excel Spreadsheet','CSV File','Word Document','PowerPoint Presentation','ZIP Archive','Image']) {
    assert.ok(page.includes("label: '" + label + "'"));
  }
});

test('file icons have muted type-specific colors and a neutral fallback', () => {
  for (const color of ['pdf','spreadsheet','word','powerpoint','zip','image']) assert.ok(page.includes('document-file-icon-' + color));
  assert.match(page, /label: 'File', icon: 'file', color: 'other'/);
  assert.match(page, /document-file-icon svg/);
});

test('2025 Rawngbawltu List retains both original filenames, URLs and order', () => {
  const source = readFileSync(new URL('../src/content/documents/other/2025-rawngbawltu-list.md', import.meta.url), 'utf8');
  const filesLine = source.match(/^files:\s*(\[.*\])\s*$/m);
  assert.ok(filesLine);
  const files = JSON.parse(filesLine[1]);
  assert.equal(files.length, 2);
  assert.deepEqual(files.map((file) => file.filename), ['SS Rawngbawltu 2025.pdf', '2025 Rawngbawltute.pdf']);
  assert.deepEqual(files.map((file) => file.url), [
    '/documents/1794409442115-ss-rawngbawltu-2025.pdf',
    '/documents/1794409442031-2025-rawngbawltute.pdf',
  ]);
  assert.match(page, /link\.href = file\.url/);
  assert.match(page, /filenameText/);
});

test('dialog links are styled with Astro-compatible global selectors', () => {
  for (const selector of ['.document-file-item','.document-file-link','.document-file-icon','.document-file-details','.document-file-name','.document-file-type','.document-file-arrow']) {
    assert.ok(page.includes('.document-dialog :global(' + selector + ')'), 'missing global selector for ' + selector);
  }
  assert.match(page, /document-dialog :global\(\.document-file-link\)\{[^}]*min-height:64px/);
  assert.match(page, /document-dialog :global\(\.document-file-name\)\{[^}]*overflow-wrap:anywhere/);
});

test('dialog preserves navy/gold/cream design, dynamic count and accessible close control', () => {
  assert.match(page, /\.document-dialog-header\{[^}]*background:#172941/);
  assert.match(page, /\.document-dialog-header h2\{[^}]*color:#fff/);
  assert.match(page, /\.document-dialog-eyebrow\{[^}]*color:#ddc782/);
  assert.match(page, /background:#fffdf8/);
  assert.match(page, /id="document-dialog-close" aria-label="Close file selection"/);
  assert.match(page, /attachedFileCount \+ ' attached file'/);
});

test('dialog scrolls only its file list and retains Escape, Close and focus restoration', () => {
  assert.match(page, /<dialog class="document-dialog" id="document-dialog" aria-labelledby="document-dialog-title">/);
  assert.match(page, /dialog\.showModal\(\)/);
  assert.match(page, /closeDialog\?\.addEventListener\('click', \(\) => dialog\?\.close\(\)\)/);
  assert.match(page, /dialog\?\.addEventListener\('close', \(\) => lastFocusedRow\?\.focus\(\)\)/);
  assert.match(page, /closeDialog\?\.focus\(\)/);
  assert.match(page, /\.document-dialog-header\{[^}]*flex:none/);
  assert.match(page, /\.document-file-list\{[^}]*overflow-y:auto/);
  assert.match(page, /\.document-file-list\{[^}]*min-height:0/);
});

test('mobile dialog rows remain readable and filenames wrap without horizontal overflow', () => {
  assert.match(page, /@media\(max-width:560px\)[\s\S]*?\.document-dialog\{width:calc\(100vw - 20px\);max-height:78vh\}/);
  assert.match(page, /document-dialog :global\(\.document-file-name\)\{[^}]*overflow-wrap:anywhere/);
  assert.match(page, /document-dialog :global\(\.document-file-link\)\{min-height:62px/);
});

test('document archive retains search, filters, sorting and featured grouping', () => {
  for (const value of ['#document-search','#document-category','#document-year','#document-sort','featured-grid','document-grid','data-year={document.yearFilterValue}','data-date={document.sortDate}']) assert.ok(page.includes(value), 'missing preserved behavior: ' + value);
  assert.match(page, /sort\?\.value === 'oldest'/);
  assert.match(page, /sort\?\.value === 'title'/);
  assert.match(page, /row\.hidden = !matches/);
});

test('historical-year labels and published/archive visibility rules remain intact', () => {
  assert.match(page, /formatHistoricalYear\(year, yearType\)/);
  assert.match(page, /entry\.data\.status !== 'archived' && entry\.data\.published !== false/);
  assert.match(page, /historicalYearFilterValue\(year, yearType\)/);
});
