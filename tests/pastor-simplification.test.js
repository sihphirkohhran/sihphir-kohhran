import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const manager = read('public/admin/ministry-manager.js');
const profile = read('src/lib/ministry-profile.ts');
const detail = read('src/components/PastorDetail.astro');
const route = read('src/pages/bialtu-pastor/[id].astro');

test('Pastor editor is isolated and contains only requested editable fields', () => {
  assert.match(manager, /area==='pastors'\?pastorEditorMarkup\(\):existingEditorMarkup\(\)/);
  const editor = manager.split('const pastorEditorMarkup=()=>')[1].split('const editorMarkup=')[0];
  for (const key of ['name','date_of_birth','ordination_year','start_year','end_year','record_status','photo','biography']) assert.ok(editor.includes(key), key);
  for (const key of ['bible_verse','church_served','family_information','short_description','pastor_message','family_photo','gallery','education','phone','email','address']) assert.ok(!editor.includes("field('"+key+"'")&&!editor.includes("assetEditor('"+key+"'")&&!editor.includes("richEditor('"+key+"'"), key);
  assert.match(manager, /selected\.data\.designation='Pastor'/);
  assert.match(manager, /Start Year is required/);
  assert.match(manager, /Current Pastors must not have an End Year/);
});
test('Pastor CMS retains legacy data on save and warns about legacy fields', () => {
  assert.match(manager, /pastorLegacyFields/);
  assert.match(manager, /Review before any future migration/);
  assert.match(manager, /new FormData\(form\)\.forEach/);
  assert.match(manager, /Object\.entries\(record\.data\)/);
  assert.match(manager, /SihphirRichTextEditor\?\.sanitizeHtml/);
  assert.match(manager, /SihphirRichTextEditor\?\.bindPaste/);
  assert.match(manager, /Discard unsaved changes/);
});
test('Pastor public page is separate, minimal and mobile-responsive', () => {
  assert.match(route, /import PastorDetail/);
  assert.doesNotMatch(route, /MinistryDetail/);
  assert.match(detail, /Back to Pastor listing/);
  for (const label of ['Service Period','Date of Birth','Ordination Year','Status','Biography']) assert.ok(detail.includes(label), label);
  for (const label of ['Timeline','Related Profiles','Related Documents','Pastor’s Message','Family Information','Church Served']) assert.ok(!detail.includes(label), label);
  assert.match(detail, /@media\(max-width:760px\)/);
  assert.match(detail, /@media\(max-width:440px\)/);
  assert.match(profile, /kind === 'pastor' \? 'Pastor'/);
});
test('Pro Pastor and Missionary detail routes retain their shared component', () => {
  for (const path of ['src/pages/probationary-pastor/[id].astro','src/pages/missionary/[id].astro']) assert.match(read(path), /MinistryDetail/);
  assert.match(manager, /area==='elders'\?elderEditorMarkup\(\)/);
});
test('Pastor historical records and their slugs remain present', () => {
  const records = readdirSync(new URL('../src/content/pastoral/', import.meta.url)).filter(name => name.endsWith('.md'));
  assert.ok(records.length >= 16);
  assert.ok(records.includes('pastor-r-c-lalthavul.md'));
});
