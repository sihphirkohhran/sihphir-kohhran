import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const adminPage = read('../src/pages/admin.astro');
const siteConfig = read('../src/lib/site.ts');
const galleryManager = read('../public/admin/gallery-manager.js');
const documentManager = read('../public/admin/document-manager.js');
const galleryStyles = read('../public/admin/gallery-manager.css');
const documentStyles = read('../public/admin/document-manager.css');

test('CMS exposes the configured production site origin before loading category managers', () => {
  assert.match(siteConfig, /SITE_ORIGIN\s*=\s*'https:\/\/sihphirpresbyteriankohhran\.org'/);
  assert.match(adminPage, /import \{ SITE_ORIGIN \} from '\.\.\/lib\/site'/);
  assert.match(adminPage, /window\.SIHPHIR_PUBLIC_SITE_ORIGIN = siteOrigin/);
  assert.ok(adminPage.indexOf('window.SIHPHIR_PUBLIC_SITE_ORIGIN = siteOrigin') < adminPage.indexOf('/admin/gallery-manager.js'));
});

test('category link URLs use the production origin and encode category names as one query value', () => {
  const origin = 'https://sihphirpresbyteriankohhran.org';
  const examples = [
    ['Year Book', 'Year%20Book'],
    ['Women & Children', 'Women%20%26%20Children'],
    ['KTP+Music', 'KTP%2BMusic'],
    ['Mizo / English', 'Mizo%20%2F%20English'],
  ];
  for (const [name, encoded] of examples) {
    const galleryUrl = new URL(`/gallery?category=${encodeURIComponent(name)}`, origin);
    const documentUrl = new URL(`/document?category=${encodeURIComponent(name)}`, origin);
    assert.equal(galleryUrl.origin, origin);
    assert.equal(documentUrl.origin, origin);
    assert.ok(galleryUrl.href.endsWith(`category=${encoded}`));
    assert.ok(documentUrl.href.endsWith(`category=${encoded}`));
    assert.equal(galleryUrl.searchParams.get('category'), name);
    assert.equal(documentUrl.searchParams.get('category'), name);
  }
});

test('Gallery manager renders a copy action for every category and handles it without changing reorder or delete actions', () => {
  assert.match(galleryManager, /data-category-copy="\$\{index\}"/);
  assert.match(galleryManager, /copyCategoryLink\(category\?\.name,'\/gallery',notification\)/);
  assert.match(galleryManager, /encodeURIComponent\(name\.trim\(\)\)/);
  assert.match(galleryManager, /notification\('Copied!'\)/);
  assert.match(galleryManager, /notification\('Could not copy link\. Check your browser clipboard permissions\.', 'error'\)/);
  assert.match(galleryManager, /data-category-up/);
  assert.match(galleryManager, /data-category-down/);
  assert.match(galleryManager, /data-category-delete/);
  assert.match(galleryManager, /draft\.push\(\{id:`category-\$\{Date\.now\(\)\}`,name:''\}\)/);
});

test('Document manager renders a copy action for every category and preserves category editing and deletion', () => {
  assert.match(documentManager, /data-category-copy="\$\{index\}"/);
  assert.match(documentManager, /copyCategoryLink\(category\?\.name,'\/document',notification\)/);
  assert.match(documentManager, /encodeURIComponent\(name\.trim\(\)\)/);
  assert.match(documentManager, /notification\('Copied!'\)/);
  assert.match(documentManager, /data-category-delete/);
  assert.match(documentManager, /draft\.push\(\{id:`category-\$\{Date\.now\(\)\}`,name:''\}\)/);
  assert.match(documentManager, /Save Categories/);
});

test('copy controls remain compact and fit the existing category manager rows', () => {
  assert.match(galleryStyles, /grid-template-columns:22px minmax\(0,1fr\) 66px 32px 32px 52px/);
  assert.match(galleryStyles, /#category-list \.category-copy-link/);
  assert.match(documentStyles, /grid-template-columns:minmax\(0,1fr\) 66px 55px/);
  assert.match(documentStyles, /#document-category-list \.category-copy-link/);
});
