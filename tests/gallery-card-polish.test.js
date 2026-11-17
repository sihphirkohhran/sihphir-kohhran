import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('featured and archive album titles use Poppins Bold at 18px and wrap naturally', () => {
  assert.equal(page.split('<h3 class="album-title" style="font-family:\'Poppins\',sans-serif;font-size:18px;font-weight:700').length - 1, 2);
  assert.match(page, /font-family:'Poppins',sans-serif;font-size:18px;font-weight:700/);
  assert.match(page, /overflow-wrap:anywhere/);
});

test('View Album remains a 15px EB Garamond SemiBold visual indicator with close spacing', () => {
  assert.equal(page.split('<span class="album-action" aria-hidden="true">View Album <span>→</span></span>').length - 1, 2);
  assert.match(page, /font-family:'EB Garamond',serif;font-size:15px;font-weight:600/);
  assert.match(page, /margin-top:12px/);
  assert.doesNotMatch(page, /margin-top:auto/);
  assert.doesNotMatch(page, /min-height:3\.5em/);
  assert.match(page, /gallery-card-link:hover \.album-action/);
});

test('featured and archive cards are full-card semantic links to their existing internal details', () => {
  assert.ok(page.includes('<a class="featured-album reveal gallery-card-link" href={`#album-${album.id}`} data-open-album={album.id} data-album-card'));
  assert.ok(page.includes('<a class={`album-card gallery-card-link reveal reveal-delay-${index % 3 + 1}`} href={`#album-${album.id}`} data-open-album={album.id} data-album-card'));
  assert.equal(page.split('data-open-album={album.id}').length - 1, 2);
  assert.match(page, /querySelectorAll<HTMLAnchorElement>\('\[data-open-album\]'\)/);
  assert.match(page, /event\.preventDefault\(\)/);
  assert.match(page, /#album-\$\{button\.dataset\.openAlbum\}/);
  assert.match(page, /scrollIntoView\(\{behavior:'smooth',block:'start'\}\)/);
  assert.doesNotMatch(page, /<article[^>]*data-album-card/);
  assert.match(page, /gallery-card-link:focus-visible\{outline:3px solid #b8953f/);
  assert.ok(page.includes('<div class="featured-cover"><img'));
  assert.ok(page.includes('<div class="album-cover"><img'));
});

test('legacy label handling cannot overwrite album card markup', () => {
  assert.match(page, /querySelectorAll\('\[data-close-album\]'\)\.forEach\(button=>button\.textContent=/);
  assert.doesNotMatch(page, /querySelectorAll[^;]*data-open-album[^;]*textContent/);
  assert.doesNotMatch(page, /data-open-album[^;]*\.innerHTML\s*=/);
  assert.doesNotMatch(page, /data-open-album[^;]*\.textContent\s*=/);
});

test('CMS album fields, covers, descriptions, badges and photo counts remain intact', () => {
  assert.match(page, /getCollection\('gallery'\)/);
  assert.match(page, /title: data\.caption/);
  assert.match(page, /description: data\.description \|\| ''/);
  assert.match(page, /year: data\.year/);
  assert.match(page, /category: data\.category/);
  assert.match(page, /cover: featuredPhoto \|\| photos\[0\]\?\.src \|\| galleryPlaceholder/);
  assert.match(page, /album\.photos\.length/);
  assert.match(page, /<span>\{album\.year\}<\/span>/);
  assert.match(page, /<span>\{album\.category\}<\/span>/);
  assert.match(page, /Photographs preserved in the church archive\./);
});

test('search, year/category filters, sorting and photo totals remain functional', () => {
  assert.match(page, /const search=.*gallery-search/);
  assert.match(page, /selectedYear==='all'\|\|card\.dataset\.year===selectedYear/);
  assert.match(page, /selectedCategory==='all'\|\|card\.dataset\.category===selectedCategory/);
  assert.match(page, /sort\?\.value==='az'\|\|sort\?\.value==='za'/);
  assert.match(page, /sort\?\.value==='photos'/);
  assert.match(page, /sort\?\.value==='oldest'/);
  assert.match(page, /photosTotal\+=Number\(card\.dataset\.photos\|\|0\)/);
  assert.match(page, /data-album-grid/);
});


test('archive cards use compact cover, body padding and vertical spacing without changing typography', () => {
  assert.ok(page.includes('.album-cover{position:relative;width:100%;height:190px'));
  assert.ok(page.includes('.album-body{display:flex;flex:1;flex-direction:column;padding:14px}'));
  assert.ok(page.includes('.album-body small{margin-top:7px'));
  assert.ok(page.includes('.album-body .album-action{margin-top:8px}'));
  assert.ok(page.includes('@media(max-width:560px){.gallery-toolbar{padding:13px}.filter-row{display:grid;grid-template-columns:1fr 1fr}.filter-row label:last-child{grid-column:1/-1}.gallery-section{margin-top:32px}.section-heading,.photo-heading{display:block}.section-heading p,.photo-heading p{margin-top:6px;text-align:left}.featured-copy{padding:22px}.album-grid,.photo-grid{grid-template-columns:1fr}.album-cover{height:190px}'));
  assert.match(page, /font-family:'Poppins',sans-serif;font-size:18px;font-weight:700/);
  assert.match(page, /font-family:'EB Garamond',serif;font-size:15px;font-weight:600/);
  assert.match(page, /object-fit:cover/);
  assert.doesNotMatch(page, /\.album-body\{[^}]*min-height/);
  assert.doesNotMatch(page, /\.album-body[^}]*margin-top:auto/);
});

test('Year filter remains dynamically populated and defaults to the latest available album year', () => {
  assert.ok(page.includes('const years = Array.from(new Set(albums.map((album) => album.year))).sort((a, b) => b - a);'));
  assert.ok(page.includes('const latestYear = years[0];'));
  assert.ok(page.includes('const initialAlbums = latestYear === undefined ? albums : albums.filter((album) => album.year === latestYear);'));
  assert.ok(page.includes('<option value="all">All years</option>{years.map((year) => <option value={year} selected={year === latestYear}>{year}</option>)}'));
  assert.match(page, /selectedYear==='all'\|\|card\.dataset\.year===selectedYear/);
  assert.doesNotMatch(page, /<option value="all" selected/);
});

test('search, Category, Sort and Clear Filters retain their existing behavior', () => {
  assert.ok(page.includes("[search,year,category].forEach(control=>control?.addEventListener(control===search?'input':'change',applyFilters))"));
  assert.ok(page.includes("sort?.addEventListener('change',applyFilters)"));
  assert.ok(page.includes("if(search)search.value='';if(year)year.value='all';if(category)category.value='all';if(sort)sort.value='newest';applyFilters();search?.focus()"));
  assert.match(page, /selectedCategory==='all'\|\|card\.dataset\.category===selectedCategory/);
  assert.match(page, /sort\?\.value==='az'\|\|sort\?\.value==='za'/);
  assert.match(page, /sort\?\.value==='photos'/);
  assert.match(page, /sort\?\.value==='oldest'/);
  assert.match(page, /photosTotal\+=Number\(card\.dataset\.photos\|\|0\)/);
});
