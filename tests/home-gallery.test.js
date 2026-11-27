import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {contentEntryIdMatches,resolveContentDeepLink} from '../src/lib/content-deep-links.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const home=read('src/pages/index.astro'),component=read('src/components/HomeGalleryCarousel.astro'),gallery=read('src/pages/gallery.astro'),layout=read('src/layouts/BaseLayout.astro');
const bundle=await build({entryPoints:['src/lib/home-gallery-albums.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {selectHomeAlbums}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const entry=(i,data={})=>({id:'archive/album-'+i+'.md',data:{caption:'Album '+i,category:'Church',year:2000+i,photo:'/photo-'+i+'.jpg',...data}});
test('six distinct eligible albums with stable recent and historical selection',()=>{
 const entries=Array.from({length:12},(_,i)=>entry(i));
 entries.push(entry(20,{published:false}),entry(21,{status:'archived'}),entry(22,{owners:['ktp']}),entry(11));
 const selected=selectHomeAlbums(entries);
 assert.equal(selected.length,6);assert.equal(new Set(selected.map(a=>a.id)).size,6);
 assert.deepEqual(selected.slice(0,3).map(a=>a.year),[2011,2010,2009]);
 assert.deepEqual(selectHomeAlbums([...entries].reverse()),selected);
 assert.ok(selected.every(a=>a.year<=2011));
 assert.equal(selectHomeAlbums([],6).length,0);
 assert.equal(selectHomeAlbums([entry(1),entry(2)]).length,2);
 assert.equal(selectHomeAlbums(entries,2).length,2);
 assert.equal(selectHomeAlbums(entries,6,'missing').length,0);
 assert.equal(selectHomeAlbums(entries,6,'','oldest')[0].year,2000);
 assert.equal(selectHomeAlbums([entry(1,{owners:['ktp','kohhran']})]).length,1);
});
test('CMS cover precedence and existing external navigation rules',()=>{
 const external='https://photos.google.com/share/example';
 const [a]=selectHomeAlbums([entry(1,{photo:'/cover.jpg',photos:[{src:'/other.jpg'}],album_url:external})]);
 assert.equal(a.cover,'/cover.jpg');assert.equal(a.coverFallback,'/other.jpg');assert.equal(a.external,false);
 assert.equal(a.href,'/gallery?album=archive%2Falbum-1');
 assert.ok(contentEntryIdMatches('archive/album-1.md',resolveContentDeepLink(new URL(a.href,'https://example.org').search,'album')));
 const [b]=selectHomeAlbums([entry(2,{photo:'',photos:[{src:'/first.jpg'}],album_url:external})]);
 assert.equal(b.cover,'/first.jpg');assert.equal(b.href,external);assert.equal(b.external,true);
 assert.equal(selectHomeAlbums([entry(3,{photo:'',album_url:external})])[0].external,true);
 assert.equal(selectHomeAlbums([entry(4,{album_url:'javascript:alert(1)'})])[0].external,false);
});
test('homepage carousel retains CMS settings and responsive native navigation',()=>{
 assert.match(home,/selectHomeAlbums\(await getCollection\('gallery'\), Math.min\(6, positiveCount\(home.galleryCount, 6\)\)/);
 assert.match(home,/<HomeGalleryCarousel albums=\{galleryAlbums\}/);
 assert.match(component,/max-w-5xl mx-auto/);
 assert.match(component,/flex:0 0 calc\(\(100% - 24px\)\/3\)/);
 assert.match(component,/@media\(max-width:900px\)\{.home-album\{flex-basis:calc\(\(100% - 12px\)\/2\)/);
 assert.match(component,/@media\(max-width:600px\)\{.home-album\{flex-basis:78%\}.album-nav\{display:none\}/);
 assert.match(component,/scroll-snap-type:x mandatory/);assert.match(component,/scrollbar-width:none/);
 assert.match(component,/aspect-ratio:4\/5/);assert.match(component,/View Full Gallery/);
 assert.match(component,/href=\{album.href\}/);assert.match(component,/target=\{album.external\?'_blank'/);
 const code=component.match(/const update=\(\)=>\{([^}]+)\}/)[1];
 const prev={},next={},track={scrollLeft:0,scrollWidth:900,clientWidth:300};
 const update=new Function('prev','next','track',code);
 update(prev,next,track);assert.equal(prev.disabled,true);assert.equal(next.disabled,false);
 track.scrollLeft=600;update(prev,next,track);assert.equal(prev.disabled,false);assert.equal(next.disabled,true);
 track.scrollLeft=0;track.scrollWidth=300;update(prev,next,track);assert.equal(next.disabled,true);
 assert.match(component,/scrollBy/);assert.match(component,/ResizeObserver/);
});
test('dedicated gallery direct links, browser history and existing lightbox remain intact',()=>{
 assert.match(gallery,/contentEntryIdMatches/);assert.match(gallery,/addEventListener\('popstate'/);
 assert.match(gallery,/history.back\(\)/);assert.match(gallery,/data-photo/);
 assert.match(layout,/data-lightbox-alt/);assert.match(layout,/stepLightbox\(-1\)/);
});

test('portrait editorial title-only cards and matching homepage action links',()=>{
 const video=read('src/components/YouTubeGallery.astro');
 assert.match(component,/<div class="album-body"><h3>\{album.title\}<\/h3><\/div>/);
 assert.doesNotMatch(component,/\{album.category\}/);
 assert.match(component,/object-fit:cover/);
 assert.match(component,/\.album-body\{position:absolute;inset:0;display:flex;align-items:flex-end;padding:16px 14px;background:linear-gradient/);
 assert.match(component,/-webkit-line-clamp:2;overflow:hidden;max-height:2.8em/);
 assert.match(component,/<div class="album-actions">[\s\S]*data-album-prev[\s\S]*data-album-next[\s\S]*class="album-link" href="\/gallery"/);
 assert.match(component,/\.album-nav\{display:none\}\.album-actions\{justify-content:flex-end\}/);
 assert.match(video,/\.yt-home \.yt-home-nav\{display:none\}\.yt-home-actions\{justify-content:flex-end\}/);
 for(const rule of ["font-family:'Poppins',sans-serif;font-size:.71rem;font-weight:600;min-height:44px;text-decoration:none","color:var(--navy);border-bottom:1px solid rgba(15,31,61,.35)","border-bottom-color:var(--navy)"]){
  assert.ok(component.includes(rule));assert.ok(video.includes(rule));
 }
});

test('portrait covers fill the card without distortion and titles overlay the photograph',()=>{
 assert.match(component,/\.album-cover\{position:absolute;inset:0/);
 assert.match(component,/object-fit:cover;object-position:50% 40%/);
 assert.match(component,/rgba\(15,31,61,.96\) 0%/);
 assert.match(component,/transparent 65%/);
 assert.match(component,/\.album-body h3\{color:white;font:700 1rem\/1.4 Poppins/);
});
