import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { normalizeContentOwners, renderDisplayLocations, canSaveOwners, readDisplayLocations, loadContentOwners } from '../public/admin/content-owners.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const registry=[['kohhran','Kohhran'],['ktp','KTP'],['new-fellowship','New Fellowship']];
test('legacy, missing, explicit and duplicate destinations normalize consistently',()=>{
 assert.deepEqual(normalizeContentOwners({}),['kohhran']);
 assert.deepEqual(normalizeContentOwners({owner:'ktp'}),['ktp']);
 assert.deepEqual(normalizeContentOwners({owner:'kohhran'}),['kohhran']);
 assert.deepEqual(normalizeContentOwners({owner:'kpp',owners:['ktp','kohhran','ktp']}),['ktp','kohhran']);
 assert.deepEqual(normalizeContentOwners({owners:[]}),[]);
});
test('checkbox registry retains unavailable IDs and requires at least one selection',()=>{
 const html=renderDisplayLocations(registry,{owners:['ktp','retired']},String);
 assert.match(html,/Display In/);
 assert.match(html,/value="ktp" checked/);
 assert.match(html,/value="retired" checked/);
 assert.match(html,/retired \(fellowship unavailable\)/);
 assert.match(html,/value="new-fellowship"/);
 assert.equal(canSaveOwners(registry,[],['ktp']),false);
 assert.equal(canSaveOwners(registry,['retired','ktp'],['retired']),true);
 assert.equal(canSaveOwners(registry,['retired'],[]),false);
 assert.equal(canSaveOwners(registry,['new-fellowship'],[]),true);
 const form=new FormData();form.append('owners','ktp');form.append('owners','kohhran');form.append('owners','ktp');
 assert.deepEqual(readDisplayLocations(form),['ktp','kohhran']);
});
test('registry derives new Fellowship slugs dynamically',async()=>{
 const result=await loadContentOwners(async url=>url.includes('area=')?{items:[{path:'new.json'}]}:{content:JSON.stringify({slug:'new-fellowship',name:'New Fellowship'})});
 assert.deepEqual(result,[['kohhran','Kohhran'],['new-fellowship','New Fellowship']]);
});
for(const [file,parseName,serializeName] of [['gallery-manager.js','parseGallery','serializeGallery'],['document-manager.js','parse','serialize']]){
 test(file+' preserves destination arrays on save and reopen',()=>{
  const source=read('public/admin/'+file);
  const start=source.indexOf('  const unquote');
  const end=source.indexOf(file.startsWith('gallery')?'  const normalizePhotos':'  const extension',start);
  const context={};
  vm.runInNewContext(source.slice(start,end)+'\nthis.parseRecord='+parseName+';this.serializeRecord='+serializeName+';',context);
  for(const frontmatter of ['owner: ktp','owners: ["ktp","retired"]','owners: [ktp, retired]','owners:\n  - ktp\n  - retired']){
   const original=context.parseRecord('---\n'+frontmatter+'\n---\nbody');
   const owners=normalizeContentOwners(original.data);
   original.data.owners=owners;delete original.data.owner;
   const reopened=context.parseRecord(context.serializeRecord(original.data,original.body));
   assert.deepEqual(normalizeContentOwners(reopened.data),owners);
   assert.equal(reopened.body,'body');
  }
  assert.ok(source.includes('readDisplayLocations(values)'));
  assert.ok(source.includes('canSaveOwners(contentOwners,selected.data.owners,selected.originalOwners)'));
 });
}
