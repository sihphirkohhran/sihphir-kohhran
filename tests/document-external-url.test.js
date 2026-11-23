import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const manager=read('public/admin/document-manager.js');
const page=read('src/pages/document.astro');
const schema=read('src/content/config.ts');
const cms=read('src/lib/cms.ts');
const urls=read('src/lib/documents-url.ts');

test('Document editor offers upload and external URL sources without removing upload controls',()=>{
  for(const value of ['Document Source','Upload Files','External Link','External Document URL','name="pdf_external"','id="document-source"','id="document-upload-section"','id="document-input"','data-file-replace','data-file-delete','document-preview','document-copy-link'])assert.ok(manager.includes(value),value);
  assert.match(manager,/const documentSource = data/);
  assert.match(schema,/document_source: z\.enum\(\['upload', 'external'\]\)/);
});

test('External links are validated and remain separate from uploaded file metadata',()=>{
  assert.match(manager,/const validExternalUrl = value/);
  assert.match(manager,/url\.protocol === 'https:' \|\| url\.protocol === 'http:'/);
  assert.match(manager,/selected\.data\.pdf_external=String\(values\.get\('pdf_external'\)\|\|''\)\.trim\(\)/);
  assert.match(manager,/selected\.data\.document_source=String\(values\.get\('document_source'\)\|\|'upload'\)/);
  assert.match(manager,/selected\.data\.files=selected\.files\.map/);
  assert.match(manager,/if\(selected\.files\.length\)selected\.data\.pdf_url=selected\.files\[0\]\.url/);
  assert.match(manager,/if\(selected\.data\.document_source==='external'&&!validExternalUrl\(selected\.data\.pdf_external\)\)/);
  assert.match(manager,/selected\.data\.pdf_external&&\!validExternalUrl/);
  assert.match(manager,/const legacy = data\.pdf_url && !\/\^https\?:/);
  assert.match(manager,/const normalizeFiles = data/);
  assert.match(manager,/selected\.files\.splice\(index,1\)/);
  assert.match(manager,/selected\.isNew/);
});

test('External-only and legacy URLs are represented on public Documents page',()=>{
  assert.match(page,/const externalUrl = data\.pdf_external/);
  assert.match(page,/const displayedFiles = source === 'external'/);
  assert.match(page,/filename: 'Open Document'/);
  assert.match(page,/type: 'external'/);
  assert.match(page,/fileCount: displayedFiles\.length/);
  assert.match(page,/if \(files\.length === 1 && files\[0\]\?\.url\)/);
  assert.match(page,/window\.open\(files\[0\]\.url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(page,/resolveContentDeepLink\(window\.location\.search, 'document'\)/);
  assert.match(page,/resolveCategoryFromSearch/);
  assert.doesNotMatch(page,/download\.download/);
});

test('Homepage resolves active external or upload source and retains legacy fallback',()=>{
  assert.match(urls,/export function resolvePreferredDocumentUrl/);
  assert.match(urls,/data\.document_source === 'external'/);
  assert.match(urls,/data\.document_source === 'upload'/);
  assert.match(urls,/return resolveDocumentUrl\(uploaded, external\)/);
  assert.equal((cms.match(/pdf_url: resolvePreferredDocumentUrl\(e\.data\)/g)||[]).length,2);
  const fellowshipPage = read('src/components/FellowshipPage.astro');
  assert.match(fellowshipPage,/id="fellowship-panel-documents"/);
  assert.match(fellowshipPage,/Fellowship documents will be available here soon\./);
  assert.doesNotMatch(fellowshipPage,/href=\{document\.url\}/);
  assert.doesNotMatch(fellowshipPage,/relatedDocuments\.map/);
});

test('CMS Preview and Copy Document Link remain available for external-only records',()=>{
  assert.match(manager,/documentSource\(selected\.data\)==='external'\?\[\{url:externalUrl\(selected\.data\),filename:'Open Document'/);
  assert.match(manager,/file\.external\?'External link'/);
  assert.match(manager,/url\.searchParams\.set\('document',identifier\)/);
  assert.match(manager,/new URL\('\/document',origin\)/);
  assert.match(manager,/const preview=\(\)=>/);
});

test('CMS sync preserves external-only records, legacy attachments and source switching',()=>{
  const source=manager.split('const sync=form=>{')[1].split('const bindEditor=')[0];
  assert.ok(source,'sync implementation found');
  const FormData=class {
    constructor(form){this.form=form}
    get(key){return Object.hasOwn(this.form,key)?this.form[key]:null}
  };
  const run=(data,files,sourceValue,externalValue)=>{
    const selected={data:{...data},files:files.map(file=>({...file}))};
    const sync=new Function('selected','FormData','return form=>{'+source);
    sync(selected,FormData)({
      name:'External Archive',yearType:'unspecified',category:'Other',description:'',
      display_order:'0',published:'on',document_source:sourceValue,pdf_external:externalValue
    });
    return selected.data;
  };
  const drive='https://drive.google.com/file/d/abc/view';
  const only=run({pdf_url:'',pdf_external:drive},[],'external',drive);
  assert.equal(only.pdf_external,drive);
  assert.equal(only.document_source,'external');
  assert.deepEqual(only.files,[]);
  const legacyFile={url:'/documents/archive.pdf',filename:'archive.pdf',size:123};
  const switched=run({pdf_url:legacyFile.url,pdf_external:drive},[legacyFile],'external',drive);
  assert.equal(switched.pdf_url,legacyFile.url);
  assert.deepEqual(switched.files,[{...legacyFile,uploaded_at:undefined,modified_at:undefined,type:undefined}]);
  const back=run(switched,switched.files,'upload',drive);
  assert.equal(back.pdf_external,drive);
  assert.equal(back.pdf_url,legacyFile.url);
  assert.equal(back.document_source,'upload');
  const legacyRemote=run({pdf_url:drive},[],'external',drive);
  assert.equal(legacyRemote.pdf_url,drive);
  assert.equal(legacyRemote.pdf_external,drive);
});

test('functional preferred source and fellowship related document resolution',()=>{
  const preferredSource=urls.slice(urls.indexOf('export function resolvePreferredDocumentUrl('));
  const preferredBody=preferredSource.slice(preferredSource.indexOf('{',preferredSource.indexOf('): string'))+1,preferredSource.lastIndexOf('}'));
  const normalizePdfUrl=url=>url||'';
  const resolveDocumentUrl=(file,external)=>file||external||'';
  const resolvePreferredDocumentUrl=new Function('normalizePdfUrl','resolveDocumentUrl','return data=>{'+preferredBody+'}')(normalizePdfUrl,resolveDocumentUrl);
  const fellowship=read('src/lib/fellowship.ts');
  const relatedSource=fellowship.slice(fellowship.indexOf('export function resolveRelatedDocuments('));
  const relatedBody=relatedSource.slice(relatedSource.indexOf('{')+1,relatedSource.lastIndexOf('}'));
  const contentId=path=>path.split('/').pop().replace(/\\.(md|json)$/i,'');
  const resolveRelatedDocuments=new Function('resolvePreferredDocumentUrl','contentId','return (entries,paths=[])=>{'+relatedBody+'}')(resolvePreferredDocumentUrl,contentId);
  const drive='https://drive.google.com/file/d/123/view';
  const uploaded='/documents/annual-report.pdf';
  const cases=[
    [{document_source:'external',pdf_external:drive},drive],
    [{document_source:'upload',pdf_url:uploaded},uploaded],
    [{document_source:'external',pdf_external:drive,pdf_url:uploaded,files:[{url:uploaded}]},drive],
    [{document_source:'upload',pdf_external:drive,pdf_url:uploaded,files:[{url:uploaded}]},uploaded],
    [{document_source:'upload',pdf_external:drive},''],
    [{document_source:'external',pdf_url:uploaded},''],
    [{pdf_external:drive},drive],
    [{pdf_url:uploaded},uploaded],
    [{file_url:uploaded},''],
  ];
  for(const [data,expected] of cases){
    assert.equal(resolvePreferredDocumentUrl(data),expected,JSON.stringify(data));
    const result=resolveRelatedDocuments([{id:'other/report.md',data:{name:'Report',category:'Other',...data}}],['other/report.md']);
    assert.equal(result[0]?.url||'',expected||(!data.document_source?data.file_url||'':''),JSON.stringify(data));
  }
  assert.equal(resolveRelatedDocuments([{id:'other/report.md',data:{document_source:'upload',pdf_external:drive}}],['other/report.md']).length,0);
});

test('functional public file selection respects explicit source through source switching',()=>{
  const source=page.match(/const displayedFiles = ([^;]+);/);
  assert.ok(source,'public displayedFiles expression exists');
  const select=new Function('source','externalLink','normalizedFiles','data','return '+source[1]);
  const external='https://example.org/document';
  const uploaded={url:'/documents/report.pdf',filename:'report.pdf'};
  const state={document_source:'external'};
  const show=files=>select(state.document_source,external,files,state).map(file=>file.url);
  assert.deepEqual(show([]),[external]);
  state.document_source='upload';
  assert.deepEqual(show([]),[],'upload without attachments must not fall back to external');
  assert.deepEqual(show([uploaded]),[uploaded.url]);
  state.document_source='external';
  assert.deepEqual(show([uploaded]),[external],'switch back keeps external active');
  state.document_source='upload';
  assert.deepEqual(show([uploaded]),[uploaded.url],'switching back retains attachment');
  delete state.document_source;
  assert.deepEqual(show([]),[external],'legacy source-less record may fall back to external');
});
