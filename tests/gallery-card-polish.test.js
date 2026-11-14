import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('album titles use Poppins Bold at 18px and wrap naturally', () => {
  assert.equal((page.match(/<h3 class="album-title">\{album\.title\}<\/h3>/g) || []).length, 2);
  assert.match(page, /\.featured-copy \.album-title,\.album-body \.album-title\{[^}]*font-family:'Poppins',sans-serif;[^}]*font-size:18px;font-weight:700/);
  assert.match(page, /overflow-wrap:anywhere/);
});

test('featured and archive actions are accessible View Album links in 13px EB Garamond SemiBold', () => {
  assert.equal((page.match(/class="album-action" href=\{\x60#album-\$\{album\.id\}\x60\} data-open-album=\{album\.id\}>View Album <span aria-hidden="true">→<\/span><\/a>/g) || []).length, 2);
  assert.match(page, /\.featured-copy \.album-action,\.album-body \.album-action\{[^}]*font-family:'EB Garamond',serif;[^}]*font-size:13px;font-weight:600/);
  assert.match(page, /\.album-action:focus-visible\{outline:3px solid #b8953f/);
  assert.match(page, /min-height:44px/);
  assert.doesNotMatch(page, /<button[^>]*data-open-album=\{album\.id\}>Open Gallery/);
});

test('only the album action opens the existing internal detail view', () => {
  assert.match(page, /href=\{\x60#album-\$\{album\.id\}\x60\}/);
  assert.match(page, /querySelectorAll<HTMLAnchorElement>/);
  assert.match(page, /event\.preventDefault\(\)/);
  assert.match(page, /#album-\$\{button\.dataset\.openAlbum\}/);
  assert.match(page, /<div class="album-cover"><img/);
  assert.doesNotMatch(page, /<button[^>]*class="album-cover"[^>]*data-open-album/);
  assert.match(page, /<article class=\{\x60album-card/);
  assert.doesNotMatch(page, /<article class=[^>]*data-open-album/);
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
