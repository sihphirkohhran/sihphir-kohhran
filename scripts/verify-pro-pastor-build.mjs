import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseFragment} from 'parse5';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const records=[
 ['pro-pastor-lalhmingmawia','Pro. Pastor Lalhmingmawia'],
 ['pro-pastor-rosiamliana-tochhawng','Pro. Pastor Rosiamliana Tochhawng'],
 ['pro-pastor-r-vanlalngena','Pro. Pastor R. Vanlalngena'],
 ['pro-pastor-lalduhsaka','Pro. Pastor Lalduhsaka']
];
function* walk(node){yield node;for(const child of node.childNodes??[])yield* walk(child);}
const attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value;
const text=node=>[...walk(node)].filter(n=>n.nodeName==='#text').map(n=>n.value).join(' ');
const archive=parseFragment(read('probationary-pastor/index.html'));
const cards=[...walk(archive)].filter(n=>n.attrs?.some(a=>a.name==='data-profile'));
for(const [id,name] of records){
 const card=cards.find(n=>[...walk(n)].some(a=>attr(a,'href')==='/probationary-pastor/'+id));
 assert.ok(card,'Missing archive card: '+id);
 assert.ok(text(card).includes(name),'Missing archive name: '+name);
 assert.equal(attr(card,'hidden'),undefined);
 const detail=parseFragment(read('probationary-pastor/'+id+'/index.html'));
 assert.ok([...walk(detail)].some(n=>n.tagName==='h1'&&text(n).includes(name)),'Missing detail heading: '+name);
}
console.log('Verified all four published Pro Pastor archive cards and generated detail pages.');

// Verify the section is omitted when the generated archive has no current profiles.
const sections=[...walk(archive)].filter(n=>n.tagName==='section');
const hasClass=(n,c)=>(attr(n,'class')||'').split(/\s+/).includes(c);
const current=sections.filter(n=>hasClass(n,'current-section'));
const former=sections.find(n=>hasClass(n,'former-section'));
assert.ok(former,'Former archive must remain present');
if(current.length){
 assert.equal(current.length,1);
 assert.ok([...walk(current[0])].some(n=>attr(n,'data-profile')!==undefined),'Current section must contain profiles');
}else{
 const siblings=former.parentNode.childNodes.filter(n=>n.tagName);
 assert.ok(hasClass(siblings[siblings.indexOf(former)-1],'archive-toolbar'),'Former archive must directly follow toolbar');
}
assert.ok(!text(archive).includes('The former archive remains available below.'));
console.log('Verified Pro Pastor Current section has no empty placeholder.');
