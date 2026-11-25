import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/components/FellowshipPage.astro');
const route = read('src/pages/fellowship/[slug].astro');
test('Four tab labels, panels and default History state', () => {
  for (const tab of ['history','committee','gallery','documents']) {
    assert.ok(page.includes('fellowship-panel-' + tab));
    assert.ok(page.includes('data-fellowship-panel="' + tab + '"'));
  }
  assert.ok(page.includes('role="tablist"'));
  assert.ok(page.includes('role="tabpanel"'));
  assert.ok(page.includes("aria-selected={index === 0 ? 'true' : 'false'}"));
  for (const tab of ['committee','gallery','documents']) assert.ok(page.includes('data-fellowship-panel="' + tab + '" hidden'));
});
test('Deep links, back-forward, invalid fallback, keyboard and responsive focus', () => {
  for (const text of ["params.get('tab')","validTabs.has(value) ? value : 'history'","window.history.pushState","window.addEventListener('popstate'","selectTab(tabFromUrl())","focus-visible","max-width:390px"]) assert.ok(page.includes(text),text);
  assert.ok(page.includes("updateHistory && tabFromUrl() !== selected"), "reselecting active tab must not push duplicate history");
  assert.ok(page.includes("button.tabIndex = active ? 0 : -1"), "roving tabindex remains synchronized");
  for (const key of ['ArrowRight','ArrowLeft','Home','End']) assert.ok(page.includes("event.key === '" + key + "'"));
});
test('History, rich text, group photos, year selection and lightbox preserved', () => {
  for (const text of ['set:html={historyFull}','id="history-btn"','Read More','Read Less','groupPhotos.map','id="fellowship-year-select"','data-fellowship-year','data-lightbox-src','id="fellowship-lightbox"']) assert.ok(page.includes(text),text);
  assert.ok(read('src/pages/fellowship/kohhran-hmeichhia.astro').includes('resolveGroupPhotos'));
});
test('KTP scoped variant and established routes', () => {
  assert.ok(read('src/pages/fellowship/ktp.astro').includes('variant="ktp"'));
  for (const text of ["variant = 'default'","variant === 'ktp'","#29B9F2","#173B53"]) assert.ok(page.includes(text),text);
  for (const slug of ['kpp','kohhran-hmeichhia','masihi-sangati']) assert.ok(!read('src/pages/fellowship/' + slug + '.astro').includes('variant="ktp"'));
  assert.ok(route.includes('getStaticPaths'));
  assert.ok(route.includes('<FellowshipPage'));
});
test('Legacy references retained without related-gallery preview or people sections', () => {
  assert.ok(!page.includes('relatedPhotos.map'));
  assert.ok(!page.includes('relatedDocuments.map'));
  assert.ok(route.includes('data.related_galleries'));
  assert.ok(route.includes('data.related_documents'));
  assert.ok(page.includes("import FellowshipCommitteeArchive from './FellowshipCommitteeArchive.astro';"));
  const panel = page.slice(page.indexOf('id="fellowship-panel-committee"'),page.indexOf('id="fellowship-panel-gallery"'));
  assert.ok(panel.includes('<FellowshipCommitteeArchive fellowshipSlug={ownerSlug} />'));
  assert.ok(!panel.includes('centralized Committee system'));
  assert.ok(!page.includes('Committee information will be available through'));
});
