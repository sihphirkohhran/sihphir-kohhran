import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveFooter,safeFooterLink,socialUrl} from '../src/lib/footer-settings.js';
const layout=readFileSync('src/layouts/BaseLayout.astro','utf8');
const admin=readFileSync('public/admin/site-settings-manager.js','utf8');
test('footer defaults use existing routes and no unconfigured emblem or socials',()=>{
 const f=resolveFooter({facebook_url:'https://facebook.com',youtube_url:'https://www.youtube.com/@SihphirPresbyterianKohhran'});
 assert.equal(f.name,'Sihphir Kohhran');assert.equal(f.emblem,'');assert.equal(f.socials.length,1);
 assert.deepEqual(f.groups.flatMap(g=>g.links.map(l=>l.url)),['/','/gallery/','/document/','/#contact','/bialtu-pastor/','/committee/','/fellowship/','/statistics/']);
});
test('legacy and saved footer settings survive round trip and preserve order',()=>{
 const legacy={footer_heading:'Legacy',footer_description:'First · Second'};
 assert.equal(resolveFooter({},legacy).name,'Legacy');assert.equal(resolveFooter({},legacy).affiliation2,'Second');
 const data={footer:{name:'New',emblem:'/images/emblem.png',groups:[{heading:'Links',links:[{label:'B',url:'/gallery/'},{label:'A',url:'/',enabled:false},{label:'C',url:'/document/'}]}],socials:{youtube_url:false}},youtube_url:'https://youtube.com/@church'};
 const f=resolveFooter(JSON.parse(JSON.stringify(data)),legacy);
 assert.equal(f.name,'New');assert.equal(f.emblem,'/images/emblem.png');assert.deepEqual(f.groups[0].links.map(l=>l.label),['B','C']);assert.equal(f.socials.length,0);
 data.footer.emblem='';assert.equal(resolveFooter(data).emblem,'');
});
test('unsafe and placeholder links are rejected',()=>{
 for(const url of ['javascript:alert(1)','//evil.test','http://example.com','https://user@example.com'])assert.equal(safeFooterLink(url),'');
 assert.equal(socialUrl('https://instagram.com/'),'');assert.equal(socialUrl('https://youtube.com'),'');
});
test('global footer layout and CMS wiring',()=>{
 const footer=layout.slice(layout.indexOf('<footer'),layout.indexOf('</footer>'));
 assert.ok(footer.indexOf('footer.affiliation1')<footer.indexOf('footer.name'));
 assert.ok(footer.includes('new Date().getFullYear()'));assert.ok(!footer.includes('footer-secretary'));assert.ok(!footer.includes('All rights reserved'));
 assert.ok(layout.includes('repeat(3,minmax(0,1fr))'));assert.ok(layout.includes('@media(max-width:480px)'));
 for(const token of ['Footer Settings','footer-emblem-upload','footer-emblem-remove','links.splice','data-footer-social','kind:\'image\'','JSON.stringify(data,null,2)'])assert.ok(admin.includes(token),token);
});

test('public contact address is authoritative and structured fields remain available',async()=>{
 const {transform}=await import('esbuild');
 const {code}=await transform(readFileSync('src/lib/contact.ts','utf8'),{loader:'ts',format:'esm'});
 const {normalizeContact}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const general=JSON.parse(readFileSync('src/content/settings/general.json','utf8'));
 assert.equal(normalizeContact(general).address,'Sihphir, Mizoram');
 assert.equal(resolveFooter(general).location,'Sihphir, Mizoram');
 const structured={village_town:'Sihphir',district:'Aizawl',state:'Mizoram',country:'India',pin_code:'796001'};
 assert.equal(normalizeContact({...structured,address:'  Sihphir, Mizoram  '}).address,'Sihphir, Mizoram');
 for(const address of [undefined,'','  '])assert.equal(normalizeContact({...structured,address}).address,'Sihphir, Aizawl, Mizoram, 796001, India');
 assert.equal(normalizeContact({}).address,'Sihphir, Mizoram, India');
 const normalized=normalizeContact(general);
 for(const key of ['village_town','district','state','country','secretary_name'])assert.equal(normalized[key],general[key]);
 assert.equal(normalized.phone,general.phone_number);
 assert.equal(normalized.email,general.email);
 assert.ok(layout.includes('class="footer-heading">SOCIAL MEDIA</h2>'));
 assert.ok(!layout.includes('>FOLLOW US</h2>'));
});
