import test from 'node:test';
import assert from 'node:assert/strict';
import { associatedFellowship, fellowshipCommitteeArchives, committeeDirectory } from '../src/lib/fellowship-committees.js';
const masters=[{id:'ktp',name:'KTP'},{id:'hmeichhia'},{id:'kpp'},{id:'masihi'},{id:'finance'},{id:'new',fellowship_slug:'custom'},{id:'another',fellowship_slug:'custom'},{id:'none',fellowship_slug:''}];
const entry=(id,year,extra={})=>({id:id+'-'+year,data:{committee_id:id,year,...extra}});
test('stable legacy and explicit associations',()=>{
 assert.deepEqual(masters.map(associatedFellowship),['ktp','kohhran-hmeichhia','kpp','masihi-sangati','','custom','custom','']);
 assert.equal(associatedFellowship({id:'ktp',fellowship_slug:''}),'');
 assert.equal(associatedFellowship({id:'ktp-extra',name:'KTP'}),'');
});
test('multiple committees, historical years, visibility and duplicate prevention',()=>{
 const records=[entry('new',2020),entry('new',2024),entry('new',2024),entry('new',2026,{published:false}),entry('new',2027,{status:'archived'}),entry('another',2018),entry('finance',2025)];
 const groups=fellowshipCommitteeArchives(masters,records,'custom');
 assert.equal(groups.length,2);
 assert.deepEqual(groups[0].archives.map(x=>x.data.year),[2024,2020]);
 assert.equal(groups[1].archives[0].data.year,2018);
 assert.deepEqual(fellowshipCommitteeArchives(masters,records,'ktp'),[]);
});
test('directory preserves ordering and legacy leaders without contact details',()=>{
 const result=committeeDirectory({chairman:'Chair',secretary:'Sec',members:[{name:'B',display_order:2},{name:'A',display_order:1,phone:'private'},{name:'Sec',role:'Secretary'}]});
 assert.deepEqual(result.officeBearers.map(x=>x.name),['Chair','Sec']);
 assert.deepEqual(result.members.map(x=>x.name),['A','B']);
 assert.equal(result.members[0].photo,'');
 assert.equal('phone' in result.members[0],false);
});
