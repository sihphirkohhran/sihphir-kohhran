import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/document.astro', import.meta.url), 'utf8');

test('featured and archive cards share compact file icons instead of embedded previews', () => {
  assert.doesNotMatch(page, /<iframe|document-preview|<img src=\{document\.url\}/);

  // Astro's class is a template expression, not a static HTML class attribute.
  const dynamicFileIconClasses = page.match(/class=\{`file-icon file-\$\{document\.extension\}`\}/g) || [];
  assert.equal(dynamicFileIconClasses.length, 2, 'both card types must use the extension-specific file-icon class');

  const documentIconStructures = page.match(/<svg viewBox="0 0 20 22" aria-hidden="true">[\s\S]*?<\/svg><span>\{iconLabel\(document\.extension\)\}<\/span>/g) || [];
  assert.equal(documentIconStructures.length, 2, 'featured and archive cards must share the SVG document glyph and file-type label');
  assert.match(page, /document\.fileCount === 1 \? 'file' : 'files'/);
});

test('document cards expose the existing primary URL through View Document and Download', () => {
  assert.equal((page.match(/>View Document<\/a>/g) || []).length, 2);
  assert.equal((page.match(/class="download-link">Download<\/a>/g) || []).length, 2);
  assert.doesNotMatch(page, />Preview<|>Open ↗</);

  // View Document opens the primary URL in a new tab; Download keeps the
  // native download hint. Browsers may ignore that hint for cross-origin URLs.
  assert.equal((page.match(/href=\{document\.url\} target="_blank" rel="noopener noreferrer" class="view-link"/g) || []).length, 2);
  assert.equal((page.match(/href=\{document\.url\} download class="download-link"/g) || []).length, 2);
  assert.match(page, /const primary = normalizedFiles\[0\]/);
  assert.match(page, /url: primary\?\.url \|\| ''/);
  assert.doesNotMatch(page, /multiple-file|file-selector|document-dialog/i);
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
