import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCommitteeArchiveId, resolveCommitteeDeepLink } from '../src/lib/committee-deep-links.js';
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

const read = filename => readFileSync(new URL('../' + filename, import.meta.url), 'utf8');
const cmsSource = read('public/admin/committee-manager.js');
const archiveComponent = read('src/components/FellowshipCommitteeArchive.astro');
const publicCommittee = read('src/pages/committee.astro');
const savedMasters = JSON.parse(read('src/content/settings/committees.json')).committees;

test('Central Committee List saves and reloads optional stable Fellowship associations without altering IDs', () => {
  assert.ok(cmsSource.includes('data-master-fellowship="${index}"'),'Fellowship selector is per Committee List item');
  assert.ok(cmsSource.includes('masters[Number(index)].fellowship_slug=event.target.value'),'selection is saved on the master item');
  assert.ok(cmsSource.includes('JSON.stringify({committees:cleaned},null,2)'),'master list persists association metadata in committees.json');
  assert.ok(cmsSource.includes('loadMasters()'),'manager reloads saved master entries');
  assert.ok(cmsSource.includes('...item,display_order:item.display_order??index'),'master loading preserves existing metadata');
  assert.ok(cmsSource.includes('({...item,name:item.name.trim()})'),'renames preserve IDs and association metadata');
  assert.ok(cmsSource.includes('Kohhran / None'),'explicit unassociated choice exists');
  const ids = savedMasters.map(item => item.id);
  assert.deepEqual(ids.slice(0,5),['kohhran','hmeichhia','ktp','kpp','masihi']);
  const current = savedMasters.find(item=>item.id==='hmeichhia');
  assert.equal(associatedFellowship(current),'kohhran-hmeichhia','historic ID fallback is retained');
  const withAssociation = JSON.parse(JSON.stringify({committees:[{...current,name:'Renamed',fellowship_slug:'new-fellowship'}]})).committees[0];
  assert.equal(withAssociation.id,current.id);
  assert.equal(associatedFellowship(withAssociation),'new-fellowship');
  const withNone = JSON.parse(JSON.stringify({committees:[{...current,fellowship_slug:''}]})).committees[0];
  assert.equal(associatedFellowship(withNone),'','explicit None overrides historic association after reload');
});

test('unavailable Fellowship registry and orphaned associations never silently clear saved selections',()=>{
  assert.ok(cmsSource.includes("if(active&&!options.has(active))options.set(active,active+' (unavailable)')"));
  assert.ok(cmsSource.includes("catch{notification('Fellowship options unavailable; existing associations are preserved."));
  assert.ok(cmsSource.includes('loadContentOwners(api)'));
  assert.ok(cmsSource.includes('loadFellowships()'));
  const unavailable = {id:'committee-new',name:'Special',fellowship_slug:'retired-fellowship'};
  assert.equal(associatedFellowship(JSON.parse(JSON.stringify(unavailable))),'retired-fellowship');
  assert.equal(associatedFellowship({id:'general-new',name:'KTP Youth Committee'}),'','names are not used for association');
});

test('Fellowship archive links resolve exactly to the same historical Central Committee archive ID',()=>{
  assert.ok(archiveComponent.includes('normalizeCommitteeArchiveId(entry.id)'));
  assert.ok(archiveComponent.includes('encodeURIComponent(normalizeCommitteeArchiveId(entry.id))'));
  assert.ok(publicCommittee.includes('archiveId: normalizeCommitteeArchiveId(entry.id)'));
  const identifier = 'hmeichhia/2021-committee.md';
  const canonical = normalizeCommitteeArchiveId(identifier);
  const entries=[{archiveId:'hmeichhia/2026-committee',committeeId:'hmeichhia',year:2026,published:true},
                 {archiveId:canonical,committeeId:'hmeichhia',year:2021,published:true}];
  const result=resolveCommitteeDeepLink(entries,'?archive='+encodeURIComponent(canonical));
  assert.equal(result?.type,'archive');
  assert.equal(result?.record.year,2021);
  assert.equal(resolveCommitteeDeepLink(entries,'?archive=unknown'),null);
});

test('Fellowship archive display uses central data, historical year picker and safe member photography',()=>{
  assert.ok(archiveComponent.includes("await getCollection('committee')"));
  assert.ok(archiveComponent.includes("await getEntry('settings','committees')") || archiveComponent.includes("getEntry('settings','committees')"));
  assert.ok(archiveComponent.includes('data-fellowship-committee-year'));
  assert.ok(archiveComponent.includes('data-fellowship-committee-archive'));
  assert.ok(archiveComponent.includes("archive.hidden=archive.dataset.fellowshipCommitteeArchive!==picker.value"));
  assert.ok(archiveComponent.includes("'/images/profile-placeholder.svg'"));
  assert.ok(archiveComponent.includes('renderSafeRichText'));
  assert.ok(!archiveComponent.includes('member.phone'));
  assert.ok(!archiveComponent.includes('member.email'));
  assert.ok(!archiveComponent.includes('member.address'));
  assert.ok(publicCommittee.includes('resolveCommitteeDeepLink'),'main archive deep links remain intact');
});

test('historical archives default to latest eligible published, not the current calendar year',()=>{
  const records=[entry('ktp',2010),entry('ktp',2020),entry('ktp',2021,{status:'archived'}),entry('ktp',2022,{published:false}),entry('ktp',2015)];
  assert.deepEqual(fellowshipCommitteeArchives(masters,records,'ktp')[0].archives.map(x=>x.data.year),[2020,2015,2010]);
  assert.deepEqual(fellowshipCommitteeArchives(masters,[entry('masihi',1994)],'masihi-sangati')[0].archives.map(x=>x.data.year),[1994]);
});
