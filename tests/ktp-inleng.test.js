import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const result=await build({entryPoints:['src/lib/ktp-inleng.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {buildIssues,matchesIssue}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const entry=(id,data={})=>({id,data:{name:id,category:'KTP Inleng',published:true,pdf_url:'/documents/'+id+'.pdf',...data}});
test('weekly archive uses dates, combined filters, ownership and selected source',()=>{
 const issues=buildIssues([entry('first',{date:'2026-11-01'}),entry('second',{date:'2026-11-08',owners:['ktp','kohhran']}),entry('older',{date:'2025-11-20'}),entry('oct',{date:'2026-10-31'}),entry('draft',{published:false}),entry('archived',{status:'archived'}),entry('other',{category:'Other'}),entry('private',{owners:['kpp']}),entry('unknown'),entry('external',{date:'2026-09-01',document_source:'external',pdf_external:'https://example.org/issue'}),entry('upload',{document_source:'upload',pdf_url:'',pdf_external:'https://example.org/old'}),entry('partial',{year:2024,month:11})]);
 assert.equal(issues[0].id,'second');
 assert.deepEqual(issues.filter(i=>matchesIssue(i,'','2026','11')).map(i=>i.id),['second','first']);
 assert.equal(issues.filter(i=>matchesIssue(i,'','all','11')).length,4);
 assert.equal(issues.filter(i=>matchesIssue(i,'','2026','all')).length,4);
 assert.equal(issues.length,8);
 assert.equal(issues.find(i=>i.id==='external').url,'https://example.org/issue');
 assert.equal(issues.find(i=>i.id==='upload').url,'');
 assert.equal(issues.find(i=>i.id==='unknown').label,'Publication date unavailable');
 assert.equal(issues.find(i=>i.id==='unknown').cover,'');
 assert.equal(issues.find(i=>i.id==='partial').label,'November 2024');
 assert.equal(issues.filter(i=>matchesIssue(i,'SECOND','all','all')).length,1);
});
test('archive and CMS reuse existing document metadata and direct links',()=>{
 const page=readFileSync('src/pages/ktp-inleng.astro','utf8');
 const cms=readFileSync('public/admin/document-manager.js','utf8');
 for(const field of ['date','month','cover_image'])assert.ok(cms.includes('name="'+field+'"'));
 assert.match(page,/getCollection\('documents'\)/);
 assert.match(page,/href=\{i.url\}/);
 assert.doesNotMatch(page,/<iframe/);
});

test('exact publication date overrides conflicting historical year and month without mutating records',()=>{
 const original=entry('conflict',{date:'2026-11-22',year:1985,month:2,yearType:'approximate'});
 const snapshot=JSON.stringify(original);
 const issues=buildIssues([original,entry('earlier',{date:'2026-11-15'}),entry('invalid',{date:'2026-02-30',year:2024,month:3})]);
 assert.equal(issues[0].id,'conflict');
 assert.equal(issues[0].year,2026);
 assert.equal(issues[0].month,11);
 assert.equal(matchesIssue(issues[0],'','1985','2'),false);
 assert.equal(matchesIssue(issues[0],'','2026','11'),true);
 assert.equal(issues[2].label,'March 2024');
 assert.equal(JSON.stringify(original),snapshot);
});
