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
test('all distinct eligible albums with stable newest-first ordering',()=>{
 const entries=Array.from({length:12},(_,i)=>entry(i));
 entries.push(entry(20,{published:false}),entry(21,{status:'archived'}),entry(22,{owners:['ktp']}),entry(11));
 const selected=selectHomeAlbums(entries);
 assert.equal(selected.length,12);assert.equal(new Set(selected.map(a=>a.id)).size,12);
 assert.deepEqual(selected.slice(0,3).map(a=>a.year),[2011,2010,2009]);
 assert.deepEqual(selectHomeAlbums([...entries].reverse()),selected);
 assert.ok(selected.every(a=>a.year<=2011));
 assert.equal(selectHomeAlbums([]).length,0);
 assert.equal(selectHomeAlbums([entry(1),entry(2)]).length,2);
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
 assert.match(home,/selectHomeAlbums\(await getCollection\('gallery'\)\)/);
 assert.match(home,/<HomeGalleryCarousel albums=\{galleryAlbums\}/);
 assert.match(component,/max-w-5xl mx-auto/);
 assert.match(component,/flex:0 0 calc\(\(100% - 36px\)\/4\)/);
 assert.match(component,/@media\(max-width:720px\)\{.home-album\{flex-basis:calc\(\(100% - 12px\)\/2\)/);
 assert.match(component,/@media\(max-width:600px\)\{\.home-album\{flex-basis:43.5%;aspect-ratio:3\/4\}\.album-nav\{display:block\}\.album-nav button\{display:none\}/);
 assert.match(component,/scroll-snap-type:x mandatory/);assert.match(component,/scrollbar-width:none/);
 assert.match(component,/aspect-ratio:4\/5/);assert.match(component,/View Full Gallery/);
 assert.match(component,/href=\{album.href\}/);assert.match(component,/target=\{album.external\?'_blank'/);
 const code=component.split('const update=()=>{')[1].split('\n')[0].slice(0,-2);
 const button=()=>({setAttribute(k,v){this[k]=v;}});const prev=button(),next=button(),track={scrollLeft:0,scrollWidth:900,clientWidth:300};
 const update=new Function('prev','next','track',code);
 update(prev,next,track);assert.equal(prev.disabled,true);assert.equal(next.disabled,false);
 assert.equal(prev.tabIndex,-1);assert.equal(next.tabIndex,0);assert.equal(prev['aria-hidden'],'true');
 track.scrollLeft=300;update(prev,next,track);assert.equal(prev.disabled,false);assert.equal(next.disabled,false);
 track.scrollLeft=600;update(prev,next,track);assert.equal(prev.disabled,false);assert.equal(next.disabled,true);
 track.scrollLeft=0;track.scrollWidth=300;update(prev,next,track);assert.equal(next.disabled,true);
 assert.match(component,/scrollTo/);assert.match(component,/ResizeObserver/);
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
 assert.match(component,/data-album-prev[\s\S]*data-album-track[\s\S]*data-album-next[\s\S]*<div class="album-actions">[\s\S]*class="album-link" href="\/gallery"/);
 assert.match(component,/\.album-nav button\{display:none\}\.album-actions\{justify-content:flex-end\}/);
 assert.match(video,/\.yt-home \.yt-home-nav\{display:block\}\.yt-home-nav > button\{display:none\}\.yt-home-actions\{justify-content:flex-end\}/);
 for(const rule of ["font-family:'Poppins',sans-serif;font-size:.71rem;font-weight:600;min-height:44px;text-decoration:none","color:var(--navy);border-bottom:1px solid rgba(15,31,61,.35)","border-bottom-color:var(--navy)"]){
  assert.ok(component.includes(rule));assert.ok(video.includes(rule));
 }
});

test('portrait covers fill the card without distortion and titles overlay the photograph',()=>{
 assert.match(component,/\.album-cover\{position:absolute;inset:0/);
 assert.match(component,/object-fit:cover;object-position:50% 40%/);
 assert.match(component,/rgba\(15,31,61,.96\) 0%/);
 assert.match(component,/transparent 65%/);
 assert.match(component,/\.album-body h3\{position:relative;color:white;font:700 1rem\/1.4 Poppins/);
});

test('large archives remain complete, stable and cover-only',()=>{
 const entries=Array.from({length:1000},(_,i)=>entry(i,{year:1900+i%125}));
 const albums=selectHomeAlbums(entries);
 assert.equal(albums.length,1000);
 assert.deepEqual(albums,selectHomeAlbums([...entries].reverse()));
 assert.ok(albums.every((a,i)=>!i||a.year<=albums[i-1].year));
 assert.match(component,/loading="lazy" decoding="async"/);
 assert.equal((component.match(/<img /g)||[]).length,1);
});
test('hover is pointer-gated and reduced motion preserves focus',()=>{
 assert.match(component,/@media\(hover:hover\) and \(pointer:fine\)/);
 assert.match(component,/transform:translateY\(-3px\)/);
 assert.match(component,/transform:scale\(1.04\)/);
 assert.match(component,/@media\(prefers-reduced-motion:reduce\)[^\n]*transform:none/);
 assert.match(component,/\.home-album:focus-visible/);
 assert.match(component,/@media\(max-width:900px\)\{.home-album\{flex-basis:calc\(\(100% - 24px\)\/3\)/);
});
test('arrow movement reaches a partially filled final group without skipping cards',()=>{
 const code=component.split('const move=(direction:number)=>{')[1].split('\n };')[0].replace('querySelector<HTMLElement>','querySelector');
 const move=new Function('direction','track','getComputedStyle','matchMedia',code);
 const track={clientWidth:1024,scrollWidth:1766,scrollLeft:0,querySelector:()=>({offsetWidth:245}),scrollTo({left}){this.scrollLeft=left;}};
 move(1,track,()=>({columnGap:'12px'}),()=>({matches:true}));
 assert.equal(track.scrollLeft,742);
 move(-1,track,()=>({columnGap:'12px'}),()=>({matches:true}));
 assert.equal(track.scrollLeft,0);
});

test('side navigation reserves space only when needed and keeps mobile track visible',()=>{
 assert.match(component,/grid-template-columns:40px minmax\(0,1fr\) 40px;align-items:center;gap:8px/);
 assert.match(component,/@media\(min-width:1140px\)[^\n]*grid-template-columns:minmax\(0,1fr\)[^\n]*right:calc\(100% \+ 8px\)[^\n]*left:calc\(100% \+ 8px\)/);
 assert.match(component,/top:50%;transform:translateY\(-50%\)/);
 assert.match(component,/@media\(max-width:600px\)[^\n]*aspect-ratio:3\/4[^\n]*\.album-nav button\{display:none\}/);
 const actions=component.split('<div class="album-actions">')[1].split('</div>')[0];
 assert.doesNotMatch(actions,/data-album-(prev|next)/);
 assert.match(actions,/View Full Gallery/);
 assert.match(component,/\.album-nav button:focus-visible/);
});

test('compact mobile cards retain a third-card preview and readable titles',()=>{
 assert.match(component,/@media\(max-width:600px\)[^\n]*flex-basis:43\.5%;aspect-ratio:3\/4[^\n]*font-size:\.78rem;font-weight:600/);
 assert.match(component,/@media\(max-width:340px\)[^\n]*flex-basis:44%[^\n]*font-size:\.75rem/);
 for(const viewport of [320,360,390,430]){
  const width=viewport-32,card=width*(viewport<=340?.44:.435),peek=width-2*card-24;
  assert.ok(peek>0&&peek<card);
  assert.ok(card*4/3<width*.78*6/5);
 }
});

test('hidden side controls retain their slots and are not keyboard targets',()=>{
 assert.match(component,/disabled\{visibility:hidden;pointer-events:none\}/);
 assert.match(component,/aria-hidden="true" tabindex="-1"/);
 assert.match(component,/MutationObserver/);
 assert.match(component,/grid-template-columns:40px minmax\(0,1fr\) 40px/);
});
