import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {loadLibraryRecords,normalizeContentOwners} from '../public/admin/content-owners.js';
for(const [area,manager,parser,end] of [['gallery','gallery-manager.js','parseGallery','  window.SihphirGalleryManager'],['documents','document-manager.js','parse','  window.SihphirDocumentManager']]){
 test(area+' actual manager loading pipeline retains legacy and multi-location records and reports failures',async()=>{
  const source=readFileSync(new URL('../public/admin/'+manager,import.meta.url),'utf8');
  const start=source.indexOf('  const unquote'),stop=source.indexOf(end,start);
  const loader=source.slice(source.indexOf('const loaded=await loadLibraryRecords'),source.indexOf('records=loaded.records'));
  const paths=['legacy.md','multi.md','default.md','broken.md'];
  const contents=['owner: ktp','owners: ["kohhran","retired"]',''];
  const api=async url=>{if(url.includes('area='))return {items:paths.map(path=>({path}))};const i=paths.indexOf(decodeURIComponent(url.split('path=')[1]));if(i===3)throw Error('secret');return {content:'---\n'+(area==='gallery'?'caption: Album\nphoto: /photo.jpg':'name: Report\npdf_url: /report.pdf')+'\n'+contents[i]+'\n---\nbody'};};
  const context={api,loadLibraryRecords,normalizeContentOwners,URL,Set,Map};
  const run=vm.runInNewContext(source.slice(start,stop)+'\n(async()=>{'+loader+'return loaded;})',context);
  const result=await run();
  assert.equal(result.records.length,3);
  assert.equal(result.failed,1);
  assert.match(result.warning,/Loaded 3 of 4/);
  assert.doesNotMatch(result.warning,/secret/);
  assert.equal(JSON.stringify(result.records.map(r=>r.originalOwners)),JSON.stringify([['ktp'],['kohhran','retired'],['kohhran']]));
 });
}
test('listing failure, invalid response, empty library and total record failure are distinct',async()=>{
 const parse=x=>x,build=(item,x)=>({path:item.path,x});
 await assert.rejects(loadLibraryRecords(async()=>{throw Error('secret')},'gallery',parse,build),/listing request failed/);
 await assert.rejects(loadLibraryRecords(async()=>({}),'documents',parse,build),/invalid response/);
 const empty=await loadLibraryRecords(async()=>({items:[]}),'gallery',parse,build);
 assert.equal(empty.warning,'');
 const failed=await loadLibraryRecords(async url=>url.includes('area=')?{items:[{path:'a.md'}]}:{},'documents',parse,build);
 assert.equal(failed.records.length,0);assert.match(failed.warning,/Loaded 0 of 1/);
});
