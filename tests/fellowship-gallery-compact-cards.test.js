import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/components/FellowshipGalleryArchive.astro',import.meta.url),'utf8');
test('Fellowship album listing uses container-responsive tracks capped at three columns',()=>{
 assert.match(source,/\.owner-album-grid\{display:grid;grid-template-columns:repeat\(auto-fill,minmax\(min\(100%,260px\),1fr\)\)/);
 assert.match(source,/max-width:calc\(780px \+ 1\.7rem\)/);
 assert.match(source,/@media\(max-width:480px\)\{\.owner-album-grid\{justify-items:center\}/);
 assert.doesNotMatch(source,/\.owner-album-grid\{grid-template-columns:repeat\([23],/);
 assert.match(source,/\.owner-album-card\{[^}]*width:100%;max-width:260px;min-width:0/);
 assert.match(source,/\.owner-album-cover\{[^}]*aspect-ratio:4\/3/);
 assert.match(source,/\.owner-album-cover img\{[^}]*object-fit:cover/);
 assert.match(source,/\[hidden\]\{display:none!important\}/);
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
