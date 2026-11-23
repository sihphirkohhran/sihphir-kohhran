import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manager=read('public/admin/document-manager.js');
const page=read('src/pages/document.astro');
const schema=read('src/content/config.ts');
const cms=read('src/lib/cms.ts');
const urls=read('src/lib/documents-url.ts');

test('Document editor offers upload and external URL sources without removing upload controls',()=>{
  for(const value of ['Document Source','Upload Files','External Link','External Document URL','name="pdf_external"','id="document-source"','id="document-upload-section"','id="document-input"','data-file-replace','data-file-delete','document-preview','document-copy-link'])assert.ok(manager.includes(value),value);
  assert.match(manager,/document_source: z\.enum\(\['upload', 'external'\]\)/.test(schema)?/documentSource=/:/documentSource=/);
  assert.match(schema,/document_source: z\.enum\(\['upload', 'external'\]\)/);
});

test('External links are validated and remain separate from uploaded file metadata',()=>{
  assert.match(manager,/const validExternalUrl = value/);
  assert.match(manager,/url\.protocol === 'https:' \|\| url\.protocol === 'http:'/);
  assert.match(manager,/selected\.data\.pdf_external=String\(values\.get\('pdf_external'\)\|\|''\)\.trim\(\)/);
  assert.match(manager,/selected\.data\.document_source=String\(values\.get\('document_source'\)\|\|'upload'\)/);
  assert.match(manager,/selected\.data\.files=selected\.files\.map/);
  assert.match(manager,/if\(selected\.files\.length\)selected\.data\.pdf_url=selected\.files\[0\]\.url/);
  assert.match(manager,/if\(selected\.data\.document_source==='external'&&!validExternalUrl\(selected\.data\.pdf_external\)\)/);
  assert.match(manager,/selected\.data\.pdf_external&&\!validExternalUrl/);
  assert.match(manager,/const legacy = data\.pdf_url && !\/\^https\?:/);
  assert.match(manager,/const normalizeFiles = data/);
  assert.match(manager,/selected\.files\.splice\(index,1\)/);
  assert.match(manager,/selected\.isNew/);
});

test('External-only and legacy URLs are represented on public Documents page',()=>{
  assert.match(page,/const externalUrl = data\.pdf_external/);
  assert.match(page,/const displayedFiles = source === 'external'/);
  assert.match(page,/filename: 'Open Document'/);
  assert.match(page,/type: 'external'/);
  assert.match(page,/fileCount: displayedFiles\.length/);
  assert.match(page,/if \(files\.length === 1 && files\[0\]\?\.url\)/);
  assert.match(page,/window\.open\(files\[0\]\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(page,/resolveContentDeepLink\(window\.location\.search, 'document'\)/);
  assert.match(page,/resolveCategoryFromSearch/);
  assert.doesNotMatch(page,/download\.download/);
});

test('Homepage resolves active external or upload source and retains legacy fallback',()=>{
  assert.match(urls,/export function resolvePreferredDocumentUrl/);
  assert.match(urls,/data\.document_source === 'external'/);
  assert.match(urls,/data\.document_source === 'upload'/);
  assert.match(urls,/return resolveDocumentUrl\(uploaded, external\)/);
  assert.equal((cms.match(/pdf_url: resolvePreferredDocumentUrl\(e\.data\)/g)||[]).length,2);
  assert.match(read('src/components/FellowshipPage.astro'),/href=\{document\.url\}/);
});

test('CMS Preview and Copy Document Link remain available for external-only records',()=>{
  assert.match(manager,/documentSource\(selected\.data\)==='external'\?\[\{url:externalUrl\(selected\.data\),filename:'Open Document'/);
  assert.match(manager,/file\.external\?'External link'/);
  assert.match(manager,/url\.searchParams\.set\('document',identifier\)/);
  assert.match(manager,/new URL\('\/document',origin\)/);
  assert.match(manager,/const preview=\(\)=>/);
});
