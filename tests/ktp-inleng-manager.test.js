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
 assert.ok(source.includes("owners:['kohhran'],...(publication?{owners:['ktp']}: {})"));
 assert.match(source,/id="issue-month"/);
 assert.match(source,/id="issue-sort"/);
});

test('actual CMS sync and codec round trip preserves identity and schema-compatible transitions',()=>{
 const codec=new Function(source.slice(source.indexOf('  const unquote ='),source.indexOf('  const extension ='))+'return {parse,serialize};')();
 const selected={path:'src/content/documents/other/weekly.md',data:{name:'Weekly',year:1985,month:2,date:'2026-11-22',custom:'keep',owners:['ktp'],cover_image:'/images/old.jpg'},body:'Historical body',files:[{url:'/documents/old.pdf',filename:'old.pdf',custom:'retain'}]};
 const FormData=class{constructor(form){this.form=form}get(key){return this.form[key]??null}};
 const sync=new Function('selected','FormData','readDisplayLocations','return form=>{'+source.split('const sync=form=>{')[1].split('const bindEditor=')[0])(selected,FormData,()=>['ktp']);
 for(const state of ['Draft','Published','Archived','Published']){
  sync({name:'Weekly',yearType:'known',year:'1985',category:'KTP Inleng',date:'2026-11-22',month:'2',cover_image:'/images/old.jpg',issue_status:state,document_source:'upload'});
  const reopened=codec.parse(codec.serialize(selected.data,selected.body));
  assert.equal(reopened.data.status,state==='Archived'?'archived':'current');
  assert.equal(reopened.data.published,state==='Published');
  assert.equal(helpers.issueStatus(reopened.data),state);
  assert.equal(reopened.data.custom,'keep');
  assert.equal(reopened.data.year,1985);
  assert.equal(reopened.data.files[0].custom,'retain');
  assert.deepEqual(reopened.data.owners,['ktp']);
  assert.equal(reopened.body,'Historical body');
  assert.equal(selected.path,'src/content/documents/other/weekly.md');
  selected.data=reopened.data;
 }
 sync({name:'Weekly edited',yearType:'known',year:'1985',category:'KTP Inleng',published:'on',document_source:'upload'});
 assert.equal(selected.data.status,'current');
 assert.equal(selected.data.cover_image,'/images/old.jpg');
 assert.equal(selected.data.pdf_url,'/documents/old.pdf');
});
