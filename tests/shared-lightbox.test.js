import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {transform} from 'esbuild';
const layout=readFileSync(new URL('../src/layouts/BaseLayout.astro',import.meta.url),'utf8');
test('shared layout has no empty lightbox source and retains local image assets',()=>{
 assert.match(layout,/<div id="lightbox" hidden\b/);
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/#lightbox\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
 const image=layout.match(/<img id="lightbox-img"[^>]*>/)[0];
 assert.doesNotMatch(image,/\bsrc\s*=/);
 assert.doesNotMatch(layout.match(/<footer\b[\s\S]*?<\/footer>/)[0],/<img\b/);
 for(const path of ['pci-logo.png','images/profile-placeholder.svg'])assert.ok(existsSync(new URL('../public/'+path,import.meta.url)));
});
test('actual shared lightbox handlers reject empty sources and navigate valid slides',async()=>{
 const source=layout.slice(layout.indexOf('type LightboxSlide ='),layout.indexOf("    document.querySelectorAll('.notice-tab')"));
 const {code}=await transform(source,{loader:'ts'});
 const element=(attrs={})=>({attrs,events:{},style:{},offsetParent:{},open:false,
 getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
 toggleAttribute(k,v){if(v)this.attrs[k]='';else delete this.attrs[k];},
 closest(s){return s==='[data-lightbox-src]'?this:null;},addEventListener(k,fn){this.events[k]=fn;},
 classList:{add(){box.open=true;},remove(){box.open=false;},contains(){return box.open;}}});
 const box=element(),img=element(),caption=element(),prev=element(),next=element(),close=element();
 const a=element({'data-lightbox-src':'/images/a.jpg','data-lightbox-caption':'A'}),b=element({'data-lightbox-src':'/images/b.jpg','data-lightbox-alt':'B'}),empty=element({'data-lightbox-src':' '}),bad=element({'data-lightbox-src':'javascript:alert(1)'});
 box.hidden=true;
 let triggers=[empty,a,b,bad];
 const document={baseURI:'https://example.org/',body:{style:{}},events:{},querySelectorAll:()=>triggers,querySelector:()=>null,
 getElementById:id=>({'lightbox':box,'lightbox-img':img,'lightbox-caption':caption,'lightbox-prev':prev,'lightbox-next':next,'lightbox-close':close})[id],
 addEventListener(k,fn){this.events[k]=fn;}};
 runInNewContext(code,{document,URL});
 const click=el=>el.events.click({stopPropagation(){}});
 click(empty);click(bad);assert.equal(img.src,undefined);assert.equal(box.open,false);assert.equal(box.hidden,true);
 click(b);assert.equal(img.src,'/images/b.jpg');assert.equal(img.alt,'B');assert.equal(box.open,true);assert.equal(box.hidden,false);
 click(next);assert.equal(img.src,'/images/a.jpg');assert.equal(caption.textContent,'A');
 document.events.keydown({key:'ArrowLeft'});assert.equal(img.src,'/images/b.jpg');
 box.events.touchstart({changedTouches:[{clientX:100}]});box.events.touchend({changedTouches:[{clientX:20}]});assert.equal(img.src,'/images/a.jpg');
 document.events.keydown({key:'Escape'});assert.equal(box.open,false);assert.equal(box.hidden,true);assert.equal(document.body.style.overflow,'');
 click(next);assert.equal(img.src,'/images/a.jpg');
 triggers=[a];click(a);assert.ok('disabled' in prev.attrs);assert.ok('disabled' in next.attrs);
 click(prev);assert.equal(img.src,'/images/a.jpg');
 close.events.click();assert.equal(box.open,false);assert.equal(box.hidden,true);
});
