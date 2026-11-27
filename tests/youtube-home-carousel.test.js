import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const component=readFileSync('src/components/YouTubeGallery.astro','utf8');
const homepage=readFileSync('src/pages/index.astro','utf8');

test('homepage video heading matches neighbouring gold-divider and container conventions',()=>{
 assert.match(component,/home \? "max-w-5xl" : "max-w-6xl"/);
 assert.match(component,/<div class="gold-divider"><h2>Kohhran Videos<\/h2><\/div>/);
 const heading=component.split('{home ? (')[1].split(') : (')[0];
 assert.doesNotMatch(heading,/WATCH &amp; LISTEN/);
 assert.doesNotMatch(component,/>Latest videos</);
 assert.match(component,/\) : \(\s*<>\s*<p class="yt-eyebrow">WATCH &amp; LISTEN/);
 assert.match(homepage,/visibility\.kohhran_videos === true && <YouTubeGallery home/);
 assert.match(homepage,/id="gallery"/);
});

test('homepage carousel preserves six-video limit, dedicated grid and lazy playback',()=>{
 assert.match(component,/home\?data\.videos\.slice\(0,6\):data\.videos/);
 assert.match(component,/home\?'yt-carousel':'yt-grid'/);
 assert.match(component,/createElement\('iframe'\)/);
 assert.match(component,/https:\/\/i\.ytimg\.com\/vi\//);
 assert.match(component,/setAttribute\('aria-label','Play '\+video\.title\)/);
 assert.match(component,/loading='lazy'/);
 assert.match(component,/href="\/videos\/"/);
 assert.match(component,/Visit YouTube Channel/);
});

test('responsive sizing, hidden scrollbar and focus affordances are scoped to homepage',()=>{
 assert.match(component,/\.yt-carousel::-webkit-scrollbar\{display:none\}/);
 assert.match(component,/scrollbar-width:none/);
 assert.match(component,/scroll-snap-type:x mandatory/);
 assert.match(component,/\.yt-home \.yt-carousel :global\(article\)\{flex-basis:calc\(\(100% - 24px\)\/3\)/);
 assert.match(component,/@media\(max-width:900px\)/);
 assert.match(component,/@media\(max-width:900px\)[^\n]*\.yt-home \.yt-carousel :global\(article\)\{flex-basis:calc\(\(100% - 12px\)\/2\)/);
 assert.match(component,/@media\(max-width:600px\)\{\.yt-home \.yt-home-nav\{display:none\}/);
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

test('homepage cards use unified Gallery and Committee conventions without changing archive markup',()=>{
 const code=component.match(/if\(home\)\{card.className='yt-home-card';[\s\S]*?else\{card.append\(button,title\);\}/)[0];
 const node=()=>({children:[],append(...children){this.children.push(...children)}});
 for(const home of [true,false]){
 const card=node(),button=node(),title=node();
 new Function('home','card','button','title','document',code)(home,card,button,title,{createElement:node});
 assert.equal(card.children[0],button);
 if(home){assert.equal(card.className,'yt-home-card');assert.equal(card.children[1].className,'yt-card-body');assert.equal(card.children[1].children[0],title);}
 else{assert.equal(card.children[1],title);assert.equal(card.className,undefined);}
 }
 assert.match(component,/\.yt-home \.yt-carousel :global\(\.yt-home-card\)\{[^}]*border:1px solid rgba\(18,35,59,\.1\);border-radius:8px;background:white/);
 assert.match(component,/\.yt-home \.yt-carousel :global\(\.yt-card-body\)\{flex:1;padding:9px 10px 10px/);
 assert.match(component,/\.yt-home-card:focus-within/);
 assert.match(component,/font-weight:700;margin:0;display:-webkit-box/);
});
