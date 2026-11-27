import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const source=readFileSync('public/admin/document-manager.js','utf8');
const helpers=new Function(source.slice(source.indexOf('  const issuePeriod'),source.indexOf('  window.SihphirDocumentManager'))+'return {issuePeriod,isIssue,issueStatus};')();
test('publication workspace navigation and valid script',()=>{
 new Script(source);
 const app=readFileSync('public/admin/app.js','utf8');
 assert.ok(app.includes("['ktp-inleng','KTP Inleng','▤']"));
 assert.ok(app.includes("publication:area==='ktp-inleng'"));
 assert.match(source,/loadLibraryRecords\(api,'documents'/);
});
test('weekly publication identity, dates and status',()=>{
 const {issuePeriod,isIssue,issueStatus}=helpers;
 const record={path:'src/content/documents/other/issue.md',data:{category:'KTP Inleng',date:'2026-11-22',year:1985,month:2}};
 assert.equal(isIssue(record,'KTP Inleng'),true);
 assert.equal(isIssue({...record,data:{category:'Other'}},'KTP Inleng'),false);
 assert.deepEqual(issuePeriod(record.data),{year:2026,month:11,key:'2026-11-22',valid:true});
 assert.ok(issuePeriod(record.data).key>issuePeriod({date:'2026-11-15'}).key);
 assert.equal(issueStatus({published:false}),'Draft');
 assert.equal(issueStatus({published:true,status:'archived'}),'Archived');
 assert.equal(issueStatus({published:true}),'Published');
});
test('publication editor reuses saved paths and upload infrastructure',()=>{
 assert.match(source,/kind:'image'/);
 assert.match(source,/publication\?extension\(file.name\)==='pdf'/);
 assert.match(source,/if\(publication&&previous\)selected.files.splice/);
 assert.match(source,/while\(allRecords.some\(record=>record.path===path\)\)/);
 assert.match(source,/if\(!selected.path\)/);
 assert.match(source,/href="\/ktp-inleng\/"/);
 assert.match(source,/serialize\(selected.data,selected.body\)/);
 assert.match(source,/owners:publication\?\['ktp'\]/);
 assert.match(source,/id="issue-month"/);
 assert.match(source,/id="issue-sort"/);
});
