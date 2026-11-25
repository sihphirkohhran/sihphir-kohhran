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

test('About Us uses wide content without changing history tab identity or hero',()=>{
 assert.match(page,/class="max-w-6xl mx-auto px-4 py-8"/);
 assert.match(page,/class="max-w-6xl mx-auto px-4"/);
 assert.match(page,/relative z-10 max-w-2xl mx-auto/);
 assert.match(page,/tab === 'history' \? 'About Us'/);
 assert.match(page,/<h2>About Us<\/h2>/);
 assert.match(page,/\.fellowship-about-copy\{width:100%;max-width:none;box-sizing:border-box;min-width:0;overflow-wrap:anywhere\}/);
 assert.doesNotMatch(page,/max-width:75ch/);
 assert.match(page,/class="fellowship-history-text font-body text-gray-700">\{history\}/);
 assert.match(page,/id="history-full" class="content-page-body fellowship-history-text font-body text-gray-700 hidden"/);
 assert.match(page,/\.fellowship-about-copy \.fellowship-history-text\{font-size:1rem;line-height:1\.75;margin-bottom:1rem\}/);
 assert.match(page,/@media\(max-width:640px\)\{\.fellowship-about-copy\{padding-inline:1rem\}/);
 assert.match(page,/fellowship-about-copy border-l-4 border-gold rounded-r bg-ivory/);
 assert.match(page,/\.fellowship-group-photo\{max-height:640px;width:100%;height:auto;object-fit:contain\}/);
 assert.match(page,/\.fellowship-group-photo\.hidden\{display:none\}/);
 assert.match(page,/data-fellowship-panel="history"/);
});
