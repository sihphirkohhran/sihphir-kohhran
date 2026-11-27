import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const component=readFileSync('src/components/YouTubeGallery.astro','utf8');
const homepage=readFileSync('src/pages/index.astro','utf8');

test('homepage video heading matches neighbouring gold-divider and container conventions',()=>{
 assert.match(component,/home \? "max-w-2xl" : "max-w-6xl"/);
 assert.match(component,/<div class="gold-divider"><h2>Kohhran Videos<\/h2><\/div>/);
 assert.match(component,/WATCH &amp; LISTEN/);
 assert.match(homepage,/visibility\.kohhran_videos === true && <YouTubeGallery home/);
 assert.match(homepage,/id="gallery"/);
});

test('homepage carousel preserves six-video limit, dedicated grid and lazy playback',()=>{
 assert.match(component,/home\?data\.videos\.slice\(0,6\):data\.videos/);
 assert.match(component,/home\?'yt-carousel':'yt-grid'/);
 assert.match(component,/createElement\('iframe'\)/);
 assert.match(component,/https:\/\/i\.ytimg\.com\/vi\//);
 assert.match(component,/aria-label='Play '/);
 assert.match(component,/loading='lazy'/);
 assert.match(component,/href="\/videos\/"/);
 assert.match(component,/Visit YouTube Channel/);
});

test('responsive sizing, hidden scrollbar and focus affordances are scoped to homepage',()=>{
 assert.match(component,/\.yt-carousel::-webkit-scrollbar\{display:none\}/);
 assert.match(component,/scrollbar-width:none/);
 assert.match(component,/scroll-snap-type:x mandatory/);
 assert.match(component,/\.yt-home \.yt-carousel :global\(article\)\{flex-basis:calc\(\(100% - 36px\)\/4\)/);
 assert.match(component,/@media\(max-width:900px\)/);
 assert.match(component,/@media\(max-width:720px\)/);
 assert.match(component,/@media\(max-width:600px\)/);
 assert.match(component,/\.yt-home \.yt-carousel :global\(article\)\{flex-basis:78%\}/);
 assert.match(component,/-webkit-line-clamp:2/);
 assert.match(component,/aspect-ratio:16\/9/);
 assert.match(component,/:focus-visible/);
 assert.match(component,/\.yt-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}/);
});

test('carousel buttons follow scroll boundaries and remain disabled without overflow',()=>{
 const match=component.match(/const updateNavigation=\(\)=>\{([\s\S]*?)\};/);
 assert.ok(match,'Navigation state updater must exist');
 const update=new Function('home','list','previous','next',match[1]);
 const previous={disabled:false},next={disabled:false},list={scrollLeft:0,scrollWidth:600,clientWidth:600};
 update(true,list,previous,next);
 assert.equal(previous.disabled,true);
 assert.equal(next.disabled,true);
 list.scrollWidth=1000;
 update(true,list,previous,next);
 assert.equal(previous.disabled,true);
 assert.equal(next.disabled,false);
 list.scrollLeft=200;
 update(true,list,previous,next);
 assert.equal(previous.disabled,false);
 assert.equal(next.disabled,false);
 list.scrollLeft=400;
 update(true,list,previous,next);
 assert.equal(previous.disabled,false);
 assert.equal(next.disabled,true);
 list.scrollLeft=0;previous.disabled=false;next.disabled=false;
 update(false,list,previous,next);
 assert.equal(previous.disabled,false,'Dedicated gallery should not run homepage navigation');
 assert.equal(next.disabled,false,'Dedicated gallery should not run homepage navigation');
 assert.match(component,/list\.addEventListener\('scroll',updateNavigation/);
 assert.match(component,/ResizeObserver\(updateNavigation\)/);
 assert.match(component,/requestAnimationFrame\(updateNavigation\)/);
});
