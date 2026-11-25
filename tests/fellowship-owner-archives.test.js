import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { transformSync } from 'esbuild';
import { archiveRecordMatches, compareArchiveAlbums, compareArchiveDocuments } from '../src/lib/owner-archive-behavior.js';
import { shouldOpenExternalAlbum, uniqueGalleryPhotos } from '../src/lib/gallery-navigation.js';
import { contentEntryIdMatches } from '../src/lib/content-deep-links.js';

const base = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, base), 'utf8');
const cache=new Map();
function loadSource(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module={exports:{}};cache.set(file,module);
  const source=read(file);
  const code=transformSync(source,{loader:file.endsWith('.ts')?'ts':'js',format:'cjs',target:'es2020'}).code;
  const context={module,exports:module.exports,URL,Date,Set,Map,
    require(specifier) {
      if (!specifier.startsWith('.')) throw Error('Unexpected import '+specifier);
      const stem=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier));
      const found=[stem,stem+'.ts',stem+'.js'].find(candidate=>existsSync(new URL(candidate,base)));
      if(!found)throw Error('Unknown module '+specifier);
      return loadSource(found);
    }};
  vm.runInNewContext(code,context,{filename:file});
  return module.exports;
}

const {ownedBy,contentOwner}=loadSource('src/lib/content-ownership.ts');
const {buildOwnerAlbums,buildOwnerDocuments}=loadSource('src/lib/owner-archives.ts');

const galleryRecords=[
  {id:'other/church.md',data:{caption:'Church Album',owner:'kohhran',category:'Events',year:2026,photos:[{src:'/church.jpg'}]}},
  {id:'other/old.md',data:{caption:'Legacy Church Album',category:'History',year:1995,photos:[{src:'/old.jpg'}]}},
  {id:'other/ktp-camp.md',data:{caption:'KTP Camp',owner:'ktp',category:'Work Camp',year:2026,yearType:'approximate',photo:'/ktp-cover.jpg',photos:[{src:'/first.jpg',caption:'First'},{src:'/second.jpg',caption:'Second'}],album_url:'https://example.org/photos'}},
  {id:'other/ktp-link.md',data:{caption:'KTP External',owner:'ktp',category:'Events',yearType:'unspecified',photo:'/single.jpg',album_url:'https://example.org/album'}},
  {id:'other/ktp-repeat.md',data:{caption:'KTP Repeat',owner:'ktp',category:'Events',photo:'/one.jpg',photos:[{src:'/one.jpg'},{src:'/one.jpg'}]}},
  {id:'other/kpp.md',data:{caption:'KPP Album',owner:'kpp',category:'Events',year:2026,photo:'/kpp.jpg'}},
  {id:'other/hidden.md',data:{caption:'Hidden',owner:'ktp',status:'archived',category:'Events'}},
  {id:'other/unpublished.md',data:{caption:'Not Published',owner:'ktp',published:false,category:'Events'}},
];

test('owner filtering is functional, preserves missing-owner Kohhran and ignores visibility exclusions',()=>{
  assert.equal(contentOwner({}),'kohhran');
  assert.equal(contentOwner({owner:'ktp'}),'ktp');
  assert.deepEqual(JSON.parse(JSON.stringify(ownedBy(galleryRecords,'kohhran').map(x=>x.id))),['other/church.md','other/old.md']);
  assert.equal(ownedBy(galleryRecords,'ktp').length,3);
  assert.equal(ownedBy(galleryRecords,'kpp').length,1);
  assert.equal(ownedBy(galleryRecords,'new-fellowship').length,0);
});

test('Fellowship albums preserve complete ordered photo sets, featured fallback, years and external navigation',()=>{
  const ktp=buildOwnerAlbums(galleryRecords,'ktp');
  assert.equal(ktp.length,3);
  const camp=ktp.find(x=>x.id==='other/ktp-camp');
  assert.ok(camp);
  assert.deepEqual(JSON.parse(JSON.stringify(camp.photos.map(p=>p.src))),['/ktp-cover.jpg','/first.jpg','/second.jpg']);
  assert.equal(camp.externalNavigation,false,'multiple internal photos open local detail');
  assert.equal(camp.yearLabel,'Circa 2026');
  assert.equal(camp.yearFilterValue,'2026');
  const external=ktp.find(x=>x.id==='other/ktp-link');
  assert.ok(external.externalNavigation,'single photo with valid album URL opens external');
  assert.equal(external.yearLabel,'Year Unspecified');
  assert.equal(external.yearFilterValue,'unspecified');
  assert.equal(ktp.find(x=>x.id==='other/ktp-repeat').photos.length,1,'duplicate featured photo removed');
  assert.equal(buildOwnerAlbums(galleryRecords,'kohhran').length,2);
  assert.equal(buildOwnerAlbums(galleryRecords,'kpp').length,1);
  assert.equal(shouldOpenExternalAlbum(0,'https://example.org/album'),true);
  assert.equal(shouldOpenExternalAlbum(2,'https://example.org/album'),false);
  assert.equal(uniqueGalleryPhotos([{src:'/a'},{src:'/a'},{src:'/b'}]).length,2);
});

const documentRecords=[
  {id:'other/church-doc.md',body:'',data:{name:'Church Report',category:'Annual',pdf_url:'/documents/church.pdf'}},
  {id:'other/uploaded.md',body:'',data:{owner:'ktp',name:'KTP Files',category:'Minutes',year:2026,files:[{url:'/documents/first.pdf',filename:'first.pdf',type:'application/pdf'},{url:'/documents/second.docx',filename:'second.docx'}],document_source:'upload',pdf_external:'https://drive.google.com/old'}},
  {id:'other/external.md',body:'',data:{owner:'ktp',name:'Remote Report',category:'Minutes',year:1980,yearType:'approximate',document_source:'external',pdf_external:'https://drive.google.com/new',files:[{url:'/documents/unused.pdf'}]}},
  {id:'other/no-upload.md',body:'',data:{owner:'ktp',name:'No Upload',category:'Minutes',document_source:'upload',pdf_external:'https://drive.google.com/stale'}},
  {id:'other/legacy-external.md',body:'',data:{owner:'ktp',name:'Legacy Link',category:'Old',pdf_url:'https://example.org/legacy',yearType:'unspecified'}},
  {id:'other/unpublished.md',body:'',data:{owner:'ktp',name:'Private',published:false,pdf_url:'/documents/private.pdf'}},
  {id:'other/archived.md',body:'',data:{owner:'ktp',name:'Archive',status:'archived',pdf_url:'/documents/archive.pdf'}},
  {id:'other/kpp.md',body:'',data:{owner:'kpp',name:'KPP',pdf_url:'/documents/kpp.pdf'}},
];

test('Fellowship documents retain uploaded attachments, respect external selection and legacy fallback',()=>{
  const docs=buildOwnerDocuments(documentRecords,'ktp');
  assert.equal(docs.length,3);
  const uploaded=docs.find(x=>x.id==='other/uploaded');
  assert.deepEqual(JSON.parse(JSON.stringify(uploaded.files.map(x=>x.url))),['/documents/first.pdf','/documents/second.docx']);
  assert.equal(uploaded.fileCount,2);
  assert.equal(uploaded.files[0].type,'pdf','MIME type should normalize to PDF preview type');
  assert.equal(uploaded.url,'/documents/first.pdf');
  const external=docs.find(x=>x.id==='other/external');
  assert.equal(external.fileCount,1);
  assert.equal(external.files[0].url,'https://drive.google.com/new');
  assert.equal(external.files[0].type,'external');
  assert.equal(external.yearLabel,'Circa 1980');
  const legacy=docs.find(x=>x.id==='other/legacy-external');
  assert.equal(legacy.url,'https://example.org/legacy');
  assert.equal(legacy.yearLabel,'Year Unspecified');
  assert.ok(!docs.some(x=>x.title==='No Upload'),'stale external URL never activates explicit upload record');
  assert.equal(buildOwnerDocuments(documentRecords,'kohhran').length,1);
  assert.equal(buildOwnerDocuments(documentRecords,'kpp').length,1);
});

test('Filter and sorting semantics preserve historical years, category and term matching',()=>{
  const a={search:'KTP Work Camp circa 1980',category:'Work Camp',year:'1980',sortYear:'1980',title:'ktp camp',photoCount:'3'};
  const b={search:'KTP Other Year Unspecified',category:'Other',year:'unspecified',sortYear:'',title:'other',photoCount:'1'};
  assert.ok(archiveRecordMatches(a,{search:'camp',category:'Work Camp',year:'1980'}));
  assert.ok(!archiveRecordMatches(a,{search:'missing',category:'Work Camp',year:'1980'}));
  assert.ok(!archiveRecordMatches(a,{search:'',category:'Other',year:'1980'}));
  assert.ok(archiveRecordMatches(b,{year:'unspecified'}));
  assert.ok(compareArchiveAlbums(a,b,'newest')<0);
  assert.ok(compareArchiveAlbums(a,b,'oldest')<0);
  assert.ok(compareArchiveAlbums(a,b,'photos')<0);
  const da={sortDate:'2026-11-01',sortTitle:'a'},db={sortDate:'2024-01-01',sortTitle:'z'};
  assert.ok(compareArchiveDocuments(da,db,'newest')<0);
  assert.ok(compareArchiveDocuments(da,db,'oldest')>0);
  assert.ok(compareArchiveDocuments(da,db,'title')<0);
});

test('Owner-scoped deep links compare full content IDs and never open another owners record',()=>{
  const ownIds=buildOwnerAlbums(galleryRecords,'ktp').map(x=>x.id);
  assert.ok(ownIds.some(id=>contentEntryIdMatches(id,'other/ktp-camp.md')));
  assert.ok(!ownIds.some(id=>contentEntryIdMatches(id,'other/church.md')));
  assert.match(read('src/components/FellowshipGalleryArchive.astro'),/searchParams\.set\('album',id\)/);
  assert.match(read('src/components/FellowshipDocumentArchive.astro'),/searchParams\.set\('document',id\)/);
  assert.match(read('src/components/FellowshipPage.astro'),/window\.dispatchEvent\(new Event\('fellowship:location'\)\)/);
  assert.match(read('src/pages/fellowship/[slug].astro'),/publishedFellowships/);
});

test('KTP accent remains scoped and all Fellowship archive controls retain accessible focus',()=>{
  const shared=read('src/components/FellowshipPage.astro');
  const gallery=read('src/components/FellowshipGalleryArchive.astro');
  const docs=read('src/components/FellowshipDocumentArchive.astro');
  assert.match(shared,/style=\{isKtp \? '--owner-focus:#29B9F2'/);
  assert.match(gallery,/outline:3px solid var\(--owner-focus,#b8953f\)/);
  assert.match(docs,/outline:3px solid var\(--owner-focus,#b8953f\)/);
  assert.match(read('src/pages/fellowship/ktp.astro'),/variant="ktp"/);
  assert.doesNotMatch(read('src/pages/fellowship/kpp.astro'),/variant="ktp"/);
});

test('one shared record appears once per selected destination in both archive builders',()=>{
 const owners=['kohhran','ktp','new-fellowship','ktp'];
 const album={id:'shared.md',data:{caption:'Shared',owners,owner:'kpp',photo:'/shared.jpg'}};
 const doc={id:'shared.md',body:'',data:{name:'Shared',owners,owner:'kpp',pdf_url:'/shared.pdf'}};
 for(const owner of ['kohhran','ktp','new-fellowship']){
  assert.equal(buildOwnerAlbums([album],owner).length,1);
  assert.equal(buildOwnerDocuments([doc],owner).length,1);
 }
 assert.equal(buildOwnerAlbums([album],'kpp').length,0);
 assert.equal(buildOwnerDocuments([doc],'kpp').length,0);
});

test('editing display destinations removes only the deselected location and retains the original record',()=>{
 const album={id:'shared.md',data:{caption:'Shared',owner:'kohhran',owners:['kohhran','ktp','retired'],photo:'/shared.jpg'}};
 const doc={id:'shared.md',body:'',data:{name:'Shared',owner:'kohhran',owners:['kohhran','ktp','retired'],document_source:'external',pdf_external:'https://example.org/report',files:[{url:'/original.pdf'}]}};
 for(const [record,builder] of [[album,buildOwnerAlbums],[doc,buildOwnerDocuments]]){
  const records=[record];
  const original=builder(records,'ktp')[0];
  assert.equal(builder(records,'kohhran').length,1);
  record.data.owners=['ktp','retired'];
  assert.equal(builder(records,'kohhran').length,0,'schema legacy default cannot override explicit array');
  assert.equal(builder(records,'ktp').length,1);
  assert.equal(builder(records,'retired').length,1);
  assert.equal(builder(records,'ktp')[0].id,original.id);
  assert.equal(records.length,1);
 }
 assert.equal(buildOwnerDocuments([doc],'ktp')[0].url,'https://example.org/report');
 doc.data.document_source='upload';
 assert.equal(buildOwnerDocuments([doc],'ktp')[0].url,'/original.pdf');
});
