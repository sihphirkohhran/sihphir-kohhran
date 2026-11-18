import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const manager = readFileSync(new URL('../public/admin/committee-manager.js', import.meta.url), 'utf8');

function validateYear(value) {
  const window = {};
  vm.runInNewContext(manager, { window });
  return window.SihphirCommitteeManager.validateYear(value);
}

test('Committee Archive Editor uses a manually editable four-digit numeric year input', () => {
  assert.match(manager, /<label><span>Year<\/span><input name="year" type="number" inputmode="numeric" min="1000" max="9999" step="1" value="\$\{esc\(data\.year\?\?''\)\}" placeholder="e\.g\. 2026" required><\/label>/);
  assert.doesNotMatch(manager, /<select name="year"/);
  assert.doesNotMatch(manager, /yearOptions/);
});

test('year input accepts historical and future four-digit years', () => {
  for (const year of ['1985', '1995', '2026', '2035']) {
    assert.equal(validateYear(year), null, year);
  }
});

test('year validation rejects blank, non-numeric, decimal, and non-four-digit input', () => {
  for (const year of ['', '   ', 'abcd', '2026.5', '20a6', '999', '10000']) {
    assert.ok(validateYear(year), JSON.stringify(year));
  }
});

test('year validation rejects out-of-range four-digit years', () => {
  assert.ok(validateYear('0001'));
  assert.ok(validateYear('0999'));
  assert.ok(validateYear('9999') === null);
});

test('invalid year is rejected before sync and save, with a clear notification and focus', () => {
  assert.match(manager, /const yearError=window\.SihphirCommitteeManager\.validateYear\(yearInput\?\.value\);if\(yearError\)\{notification\(yearError,'error'\);yearInput\?\.focus\(\);return;\}sync\(event\.currentTarget\);/);
});

test('duplicate Committee and Year prevention and existing archive paths remain unchanged', () => {
  assert.match(manager, /record!==selected&&record\.path!==selected\.path&&record\.data\.committee_id===selected\.data\.committee_id&&Number\(record\.data\.year\)===selected\.data\.year/);
  assert.match(manager, /if\(!selected\.path\)selected\.path=\`\$\{ROOT\}\$\{selected\.data\.committee_id\}-\$\{selected\.data\.year\}\.md\`/);
  assert.match(manager, /selected=records\.find\(record=>record\.path===selected\.path\)/);
});

test('Archive List Year filter continues to derive options from saved archive records', () => {
  assert.match(manager, /const years=\[\.\.\.new Set\(records\.map\(record=>record\.data\.year\)\)\]/);
  assert.match(manager, /<select id="committee-filter-year"><option value="all">All Years<\/option>\$\{years\.map\(year=>/);
  assert.match(manager, /yearFilter==='all'\|\|String\(record\.data\.year\)===yearFilter/);
});

test('new archives still default to the current calendar year and existing records prepopulate their saved year', () => {
  assert.match(manager, /year:new Date\(\)\.getFullYear\(\)/);
  assert.match(manager, /value="\$\{esc\(data\.year\?\?''\)\}"/);
  assert.match(manager, /data\.year=Number\(values\.get\('year'\)\)/);
});
