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
  assert.doesNotMatch(backend,/deleteCheckedRecord[\s\S]*?for \(let attempt/);
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
