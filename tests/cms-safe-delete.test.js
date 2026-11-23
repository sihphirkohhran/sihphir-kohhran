import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const backend=read('../functions/api/admin/[[path]].ts');
const schedules=read('../public/admin/schedule-manager.js');
const notices=read('../public/admin/notice-manager.js');
const dialog=read('../public/admin/confirm-record-delete.js');
const page=read('../src/pages/admin.astro');

test('backend restricts SHA-checked deletion to exact weekly monthly and announcement Markdown paths',()=>{
  const match=backend.match(/const deletableRecordPath = \(path: string\) =>\s*([\s\S]*?);\s*\n/);
  assert.ok(match,'path validator exists');
  const check=new Function('path','return '+match[1].replaceAll('path: string',''));
  for(const path of ['src/content/notices/weekly/2026-11-23.md','src/content/notices/monthly/2026-11.md','src/content/notices/announcements/2026-11-23-meeting.md']){
    assert.equal(check(path),true,path);
  }
  for(const path of ['src/content/notices/weekly/../../settings/hero.json','src/content/notices/weekly/a.json','src/content/notices/announcements/../../pages/x.md','src/content/notices/monthly//bad.md','public/images/a.jpg','src/content/pages/test.md']){
    assert.equal(check(path),false,path);
  }
  assert.match(backend,/if \(!\(await getSession\(request, env\)\)\) return json\(\{ error: 'Authentication is required\.' \}, 401\)/);
  assert.match(backend,/typeof expectedSha !== 'string'/);
  assert.match(backend,/currentSha !== expectedSha/);
  assert.match(backend,/throw new GitHubError\(409, 'This record has changed or was deleted/);
  assert.match(backend,/method: 'DELETE'/);
  assert.match(backend,/sha: expectedSha, branch/);
  assert.doesNotMatch(backend.slice(backend.indexOf('async function deleteCheckedRecord'),backend.indexOf('async function readBase64File')),/for \(let attempt/);
});

test('schedule deletion uses saved SHA and only offers Delete for existing records',()=>{
  assert.match(schedules,/selected&&sha\?'<button type="button" id="schedule-delete"/);
  assert.match(schedules,/const path=selected,expectedSha=sha/);
  assert.match(schedules,/Week '\+String\(record\.data\.week_start/);
  assert.match(schedules,/Month '\+monthLabel\(record\.data\.month\)/);
  assert.match(schedules,/SihphirConfirmRecordDelete/);
  assert.match(schedules,/if\(!confirmed\)return/);
  assert.match(schedules,/selected!==path\|\|sha!==expectedSha/);
  assert.match(schedules,/method:'DELETE'/);
  assert.match(schedules,/JSON\.stringify\(\{path,expectedSha\}\)/);
  assert.match(schedules,/selected=null;sha=null;savedIdentity=null;record=null;dirty=false/);
  assert.match(schedules,/await refresh\(\)/);
  assert.doesNotMatch(schedules,/method:'DELETE'[\s\S]{0,100}public\/images/);
});

test('notice deletion is distinct from unpublish and retains record on failure or cancel',()=>{
  assert.match(notices,/id="notice-delete">Unpublish/);
  assert.match(notices,/id="notice-permanent-delete"/);
  assert.match(notices,/selected\.path&&selected\.sha/);
  assert.match(notices,/if\(deleting\|\|uploads\|\|!selected\?\.path\|\|!selected\.sha\)return/);
  assert.match(notices,/const target=selected,path=target\.path,expectedSha=target\.sha/);
  assert.match(notices,/description:'Notice: '\+title/);
  assert.match(notices,/if\(!confirmed\)return/);
  assert.match(notices,/selected!==target\|\|selected\.path!==path\|\|selected\.sha!==expectedSha/);
  assert.match(notices,/method:'DELETE'/);
  assert.match(notices,/records=records\.filter\(record=>record\.path!==path\)/);
  assert.match(notices,/try\{await load\(\);\}/);
  assert.match(notices,/catch\(error\)\{notification\('Delete failed: '/);
  assert.match(notices,/const remove=async\(\)=>\{if\(deleting\|\|!selected\)return/);
});

test('confirmation requires explicit action, cancellation, and never removes media',()=>{
  assert.match(dialog,/new Promise\(resolve=>/);
  assert.match(dialog,/document\.createElement\('dialog'\)/);
  assert.match(dialog,/dialog\.showModal\(\)/);
  assert.match(dialog,/cancel\.textContent='Cancel'/);
  assert.match(dialog,/remove\.textContent='Delete permanently'/);
  assert.match(dialog,/cancel\.addEventListener\('click',\(\)=>finish\(false\)\)/);
  assert.match(dialog,/remove\.addEventListener\('click',\(\)=>finish\(true\)\)/);
  assert.match(dialog,/dialog\.addEventListener\('cancel'/);
  assert.match(dialog,/Attached media files are not deleted/);
  assert.match(page,/\/admin\/confirm-record-delete\.js/);
  assert.match(page,/cms-record-delete-dialog/);
});

test('confirmation dialog resolves false on Cancel and true only on explicit delete',async()=>{
  let dialog,buttons=[];
  const element=tag=>({
    tag,children:[],listeners:{},style:{},append(...items){this.children.push(...items)},
    addEventListener(type,fn){this.listeners[type]=fn},close(){this.closed=true},
    remove(){this.removed=true},showModal(){this.open=true},focus(){this.focused=true},
    set textContent(value){this.text=value},get textContent(){return this.text},
  });
  const document={createElement(tag){const e=element(tag);if(tag==='dialog')dialog=e;if(tag==='button')buttons.push(e);return e},body:{append(){}}};
  const context={window:{},document,Promise};
  runInNewContext(dialogSource(),context);
  const cancelled=context.window.SihphirConfirmRecordDelete({title:'Delete Week?',description:'2026-11-23 — 2026-11-29'});
  assert.equal(dialog.open,true);
  buttons[0].listeners.click();
  assert.equal(await cancelled,false);
  assert.equal(dialog.removed,true);
  buttons=[];
  const confirmed=context.window.SihphirConfirmRecordDelete({title:'Delete Notice?',description:'Meeting'});
  buttons[1].listeners.click();
  assert.equal(await confirmed,true);
  assert.equal(dialog.removed,true);
});
function dialogSource(){return dialog;}

test('checked DELETE submits the exact SHA for all three record types and rejects stale records',async()=>{
  const begin=backend.indexOf('async function deleteCheckedRecord(');
  const end=backend.indexOf('async function readBase64File(',begin);
  assert.ok(begin>=0&&end>begin);
  const fn=backend.slice(begin,end)
    .replace('env: Env','env')
    .replace('path: string','path')
    .replace('expectedSha: string','expectedSha');
  const submitted=[];
  const make=(current)=>new Function('configuration','latestFileSha','github','GitHubError',
    fn+';return deleteCheckedRecord;')(
      ()=>({branch:'main'}),
      async()=>current,
      async(_env,url,init)=>{submitted.push({url,method:init.method,payload:JSON.parse(init.body)});return {ok:true};},
      class GitHubError extends Error{constructor(status,message){super(message);this.status=status;}}
    );
  const sha='a'.repeat(40);
  for(const path of [
    'src/content/notices/weekly/2026-11-23.md',
    'src/content/notices/monthly/2026-11.md',
    'src/content/notices/announcements/2026-11-23-meeting.md',
  ])await make(sha)({},path,sha);
  assert.equal(submitted.length,3);
  for(const item of submitted){
    assert.equal(item.method,'DELETE');
    assert.equal(item.payload.sha,sha);
    assert.equal(item.payload.branch,'main');
    assert.match(item.url,/^\/contents\/src\/content\/notices\//);
  }
  await assert.rejects(make('b'.repeat(40))({},'src/content/notices/weekly/2026-11-23.md',sha),error=>error.status===409);
  assert.equal(submitted.length,3,'SHA conflict must not invoke GitHub DELETE');
});


test('actual DELETE endpoint returns 401, 400, 409, 200, and 500 with correct JSON messages',async()=>{
  // Execute the real handler body, removing only TypeScript annotations so Node 20 can run it.
  const source=backend.slice(backend.indexOf('export const onRequestDelete ='))
    .replace('export const onRequestDelete = async ({ request, env }: Context) =>','return async ({ request, env }) =>')
    .replace('as { path?: string; expectedSha?: string }','');
  assert.ok(source.startsWith('return async ({ request, env }) =>'));
  assert.ok(source.includes('error instanceof GitHubError ? error.status : 500'));
  const validator=backend.match(/const deletableRecordPath = \(path: string\) =>\s*([\s\S]*?);\s*\n/);
  assert.ok(validator);
  const deletableRecordPath=new Function('path','return '+validator[1]);
  const validPath='src/content/notices/weekly/2026-11-23.md';
  const sha='a'.repeat(40);
  class GitHubError extends Error{constructor(status,message){super(message);this.status=status;}}
  let checkedDeletes=0,otherDeletes=0;
  const getHandler=({authorized=true,conflict=false,unexpected=false}={})=>
    new Function('getSession','json','allowedPath','deletableRecordPath','deleteCheckedRecord','removeFile','GitHubError',source)(
      async()=>authorized,
      (body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}}),
      path=>typeof path==='string'&&!path.includes('..')&&path.startsWith('src/content/'),
      deletableRecordPath,
      async()=>{checkedDeletes++;if(conflict)throw new GitHubError(409,'This record has changed since it was opened. Reload before deleting.');if(unexpected)throw new Error('Unexpected repository failure.');},
      async()=>{otherDeletes++;},
      GitHubError
    );
  const request=(body)=>({request:{json:async()=>body},env:{}});
  const unauthorized=await getHandler({authorized:false})(request({path:validPath,expectedSha:sha}));
  assert.equal(unauthorized.status,401);
  assert.match((await unauthorized.json()).error,/Authentication is required/);
  const invalid=await getHandler()(request({path:'src/content/notices/weekly/../../settings/hero.json',expectedSha:sha}));
  assert.equal(invalid.status,400);
  const missingSha=await getHandler()(request({path:validPath}));
  assert.equal(missingSha.status,400);
  const conflict=await getHandler({conflict:true})(request({path:validPath,expectedSha:sha}));
  assert.equal(conflict.status,409);
  assert.match((await conflict.json()).error,/changed since it was opened/);
  const unexpected=await getHandler({unexpected:true})(request({path:validPath,expectedSha:sha}));
  assert.equal(unexpected.status,500);
  const success=await getHandler()(request({path:validPath,expectedSha:sha}));
  assert.equal(success.status,200);
  assert.deepEqual(await success.json(),{ok:true,path:validPath});
  const unrelated=await getHandler()(request({path:'src/content/gallery/example.md'}));
  assert.equal(unrelated.status,200);
  assert.equal(otherDeletes,1,'existing unrelated CMS deletion remains supported');
  assert.equal(checkedDeletes,3,'invalid and unauthenticated requests must never call checked deletion');
});

test('unsaved changes require a separate warning before the irreversible confirmation',()=>{
  assert.match(schedules,/if\(busy\|\|!selected\|\|!sha\|\|!record\)return;\s*\/\/[^\n]*\n\s*if\(!confirmDiscard\(\)\)return;/);
  assert.match(notices,/if\(deleting\|\|uploads\|\|!selected\?\.path\|\|!selected\.sha\)return;\s*\/\/[^\n]*\n\s*if\(!confirmDiscard\(\)\)return;/);
  assert.match(schedules,/catch\(error\)\{notification\('Delete failed: '\+error\.message,'error'\);\}/);
  assert.match(notices,/catch\(error\)\{notification\('Delete failed: '\+error\.message,'error'\);\}/);
  assert.match(schedules,/finally\{busy=false;if\(deleted\)draw\(\);else deleteButton\.disabled=false;\}/);
  assert.match(notices,/finally\{deleting=false;if\(redraw\)draw\(\);else if\(button\)button\.disabled=false;\}/);
});
