import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/FellowshipGalleryArchive.astro',import.meta.url),'utf8');
test('Fellowship listing has fixed cards and out-of-flow cropped covers regardless of intrinsic image dimensions',()=>{
 const rule=selector=>source.split(selector+'{')[1].split('}')[0];
 const card=rule('.owner-album-card'),cover=rule('.owner-album-cover'),image=rule('.owner-album-cover img');
 assert.match(card,/box-sizing:border-box;width:100%;max-width:190px;min-width:0;height:210px/);
 assert.match(cover,/position:relative;width:100%;height:115px;min-height:115px;max-height:115px;overflow:hidden;flex-shrink:0/);
 assert.match(image,/position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center/);
 assert.doesNotMatch(cover,/aspect-ratio/);
 assert.match(rule('.owner-album-copy h3'),/-webkit-line-clamp:2;overflow:hidden/);
 assert.match(rule('.owner-album-grid'),/repeat\(auto-fill,minmax\(min\(100%,max\(150px,calc\(\(100% - 24px\)\/4\)\)\),1fr\)\)/);
 assert.match(rule('.owner-album-grid'),/gap:8px;.*max-width:784px/);
 assert.match(source,/\[hidden\]\{display:none!important\}/);
});
test('full album thumbnails and viewer retain their separate image rules',()=>{
 assert.match(source,/\.owner-photo-grid button\{aspect-ratio:4\/3;overflow:hidden/);
 assert.match(source,/\.owner-photo-grid img\{width:100%;height:100%;object-fit:cover\}/);
 assert.match(source,/\.owner-photo-dialog-body img\{max-height:75vh;width:100%;object-fit:contain\}/);
 assert.match(source,/photo.src=item.dataset.photoSrc/);
 assert.match(source,/download.href=item.dataset.photoSrc/);
});
test('compact album summary retains title, year, count and navigation while descriptions remain searchable and in details',()=>{
 const listing=source.slice(source.indexOf('class="owner-album-card"'),source.indexOf('</a>',source.indexOf('class="owner-album-card"')));
 const copy=listing.slice(listing.indexOf('class="owner-album-copy"'));
 assert.match(listing,/\{album.yearLabel\}/);
 assert.match(copy,/<h3>\{album.title\}<\/h3>/);
 assert.match(copy,/album.photos.length/);
 assert.match(copy,/View External Album.*View Album/);
 assert.doesNotMatch(copy,/album.description|album.category|album.featured/);
 assert.match(listing,/data-search=.*album.description/);
 assert.match(source,/class="owner-detail-heading"[^]*?\{album.description && <p>\{album.description\}<\/p>\}/);
 assert.match(source,/target=\{album.externalNavigation \? '_blank'/);
});
