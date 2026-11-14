import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('featured and archive album titles use Poppins Bold at 18px and wrap naturally', () => {
  assert.equal((page.match(/<h3 class="album-title" style="[^"]*">\\{album\\.title\\}<\\/h3>/g) || []).length, 2);
  assert.match(page, /font-family:'Poppins',sans-serif;font-size:18px;font-weight:700/);
  assert.match(page, /overflow-wrap:anywhere/);
});

test('View Album remains a 15px EB Garamond SemiBold visual indicator with close spacing', () => {
  assert.equal((page.match(/<span class="album-action" aria-hidden="true">View Album <span>→<\\/span><\\/span>/g) || []).length, 2);
  assert.match(page, /\.featured-copy \.album-action,\.album-body \.album-action\\{[^}]*font-family:'EB Garamond',serif;font-size:15px;font-weight:600/);
  assert.match(page, /margin-top:12px/);
  assert.doesNotMatch(page, /margin-top:auto/);
  assert.doesNotMatch(page, /min-height:3\\.5em/);
  assert.match(page, /gallery-card-link:hover \.album-action/);
});

test('featured and archive cards are full-card semantic links to their existing internal details', () => {
  assert.match(page, /<a class="featured-album reveal gallery-card-link" href=\\{\x60#album-\\$\\{album\\.id\\}\\x60\\} data-open-album=\\{album\\.id\\} data-album-card/);
  assert.match(page, /<a class=\\{\x60album-card gallery-card-link reveal reveal-delay-\\$\\{index % 3 \\+ 1\\}\\x60\\} href=\\{\x60#album-\\$\\{album\\.id\\}\\x60\\} data-open-album=\\{album\\.id\\} data-album-card/);
  assert.equal((page.match(/data-open-album=\\{album\\.id\\}/g) || []).length, 2);
  assert.match(page, /querySelectorAll<HTMLAnchorElement>\\('\[data-open-album\]'\\)/);
  assert.match(page, /event\\.preventDefault\\(\\)/);
  assert.match(page, /#album-\\$\\{button\\.dataset\\.openAlbum\\}/);
  assert.match(page, /scrollIntoView\\(\\{behavior:'smooth',block:'start'\\}\\)/);
  assert.doesNotMatch(page, /<article[^>]*data-album-card/);
  assert.doesNotMatch(page, /<a[^>]*data-open-album[^>]*>[\\s\\S]*?<a\\b/);
  assert.match(page, /gallery-card-link:focus-visible\\{outline:3px solid #b8953f/);
  assert.match(page, /<div class="featured-cover"><img/);
  assert.match(page, /<div class="album-cover"><img/);
});

test('legacy label handling cannot overwrite album card markup', () => {
  assert.match(page, /querySelectorAll\\('\[data-close-album\\]'\\)\\.forEach\\(button=>button\\.textContent=/);
  assert.doesNotMatch(page, /querySelectorAll[^;]*data-open-album[^;]*textContent/);
  assert.doesNotMatch(page, /data-open-album[^;]*\\.innerHTML\\s*=/);
  assert.doesNotMatch(page, /data-open-album[^;]*\\.textContent\\s*=/);
});

test('CMS album fields, covers, descriptions, badges and photo counts remain intact', () => {
  assert.match(page, /getCollection\\('gallery'\\)/);
  assert.match(page, /title: data\\.caption/);
  assert.match(page, /description: data\\.description \\|\\| ''/);
  assert.match(page, /year: data\\.year/);
  assert.match(page, /category: data\\.category/);
  assert.match(page, /cover: featuredPhoto \\|\\| photos\\[0\\]\\?\\.src \\|\\| galleryPlaceholder/);
  assert.match(page, /album\\.photos\\.length/);
  assert.match(page, /<span>\\{album\\.year\\}<\\/span>/);
  assert.match(page, /<span>\\{album\\.category\\}<\\/span>/);
  assert.match(page, /Photographs preserved in the church archive\\./);
});

test('search, year/category filters, sorting and photo totals remain functional', () => {
  assert.match(page, /const search=.*gallery-search/);
  assert.match(page, /selectedYear==='all'\\|\\|card\\.dataset\\.year===selectedYear/);
  assert.match(page, /selectedCategory==='all'\\|\\|card\\.dataset\\.category===selectedCategory/);
  assert.match(page, /sort\\?\\.value==='az'\\|\\|sort\\?\\.value==='za'/);
  assert.match(page, /sort\\?\\.value==='photos'/);
  assert.match(page, /sort\\?\\.value==='oldest'/);
  assert.match(page, /photosTotal\\+=Number\\(card\\.dataset\\.photos\\|\\|0\\)/);
  assert.match(page, /data-album-grid/);
});
