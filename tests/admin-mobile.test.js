import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import postcss from 'postcss';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('mobile overrides are confined to responsive breakpoints',()=>{
 const root=postcss.parse(read('../public/admin/mobile.css'));
 for(const node of root.nodes){
  if(node.type==='comment')continue;
  if(node.type==='rule'){assert.match(node.selector,/\[hidden\]/);continue;}
  assert.equal(node.name,'media');assert.match(node.params,/max-width:/);
 }
 assert.match(read('../src/pages/admin.astro'),/href="\/admin\/mobile.css"/);
});
test('actual drawer handlers open, close, restore focus and reset on desktop resize',()=>{
 const source=read('../public/admin/app.js');
 const start=source.indexOf("const menu=root.querySelector('.mobile-menu')");
 const end=source.indexOf('window.__adminDrawerResize=()=>media.removeEventListener',start);
 assert.ok(start>=0&&end>start);
 const code=source.slice(start,source.indexOf(';',end)+1);
 let mobile=true,opened=false,focused='',resize;
 const el=name=>({hidden:true,attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){focused=name;}});
 const menu=el('menu'),backdrop=el('backdrop'),main=el('main'),close=el('close'),active=el('active');
 const side={classList:{toggle(_,v){opened=v;},contains(){return opened;}},querySelector(s){return s==='.admin-drawer-close'?close:active;},addEventListener(){}};
 const root={querySelector:s=>({'.mobile-menu':menu,'.side':side,'.admin-drawer-backdrop':backdrop,'.app > main':main})[s]};
 const window={matchMedia:()=>({get matches(){return mobile;},addEventListener(_,fn){resize=fn;},removeEventListener(){}})};
 runInNewContext(code,{root,window});
 menu.onclick();assert.equal(opened,true);assert.equal(main.inert,true);assert.equal(backdrop.hidden,false);assert.equal(menu.attrs['aria-expanded'],'true');assert.equal(focused,'active');
 close.onclick();assert.equal(opened,false);assert.equal(main.inert,false);assert.equal(focused,'menu');
 menu.onclick();backdrop.onclick();assert.equal(opened,false);
 menu.onclick();mobile=false;resize();assert.equal(opened,false);assert.equal(main.inert,false);assert.equal(backdrop.hidden,true);
});
