import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/FellowshipGalleryArchive.astro',import.meta.url),'utf8');
test('Fellowship listing matches Main Gallery proportions without intrinsic image expansion',()=>{
 const rule=selector=>source.split(selector+'{')[1].split('}')[0];
 const main=readFileSync(new URL('../src/pages/gallery.astro',import.meta.url),'utf8');
 assert.match(rule('.owner-album-card'),/width:100%;max-width:380px;min-width:0/);
 assert.doesNotMatch(rule('.owner-album-card'),/height:210px|max-width:190px/);
 assert.match(rule('.owner-album-cover'),/height:220px;min-height:220px;max-height:220px;overflow:hidden;flex-shrink:0/);
 assert.match(rule('.owner-album-cover img'),/position:absolute;inset:0;width:100%;height:100%;object-fit:cover/);
 assert.match(rule('.owner-album-grid'),/repeat\(3,minmax\(0,1fr\)\);gap:18px/);
 assert.match(source,/@media\(max-width:850px\)\{\.owner-album-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(source,/@media\(max-width:560px\)\{\.owner-album-grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(rule('.owner-album-copy'),/padding:12px 14px/);
 assert.match(rule('.owner-album-copy h3'),/18px\/1.4 Poppins/);
 assert.match(main,/\.album-cover\{[^}]*height:220px/);
 assert.match(main,/\.album-body\{[^}]*padding:12px 14px/);
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
