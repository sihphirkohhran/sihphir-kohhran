import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('weekly and monthly CMS mount dedicated selectable record editors',async()=>{
  const app=await read('../public/admin/app.js');
  const page=await read('../src/pages/admin.astro');
  const manager=await read('../public/admin/schedule-manager.js');
  assert.match(page,/src="\/admin\/schedule-manager\.js"/);
  assert.match(app,/SihphirScheduleManager\.mount\(\{area,api,esc,notification\}\)/);
  assert.match(manager,/querySelectorAll\('\[data-schedule\]'\)/);
  assert.match(manager,/load\(button\.dataset\.schedule\)/);
  assert.match(manager,/await api\('\/api\/admin\/content\?path='\+encodeURIComponent\(path\)\)/);
  assert.match(manager,/sha=response\.sha;selected=path;dirty=false/);
  assert.match(manager,/await refresh\(\)/);
  assert.match(manager,/record=parse\(saved\.content,config\.key\);sha=saved\.sha;draw\(\)/);
});

test('schedule parser refuses unsafe legacy formats instead of wiping fields',async()=>{
  const manager=await read('../public/admin/schedule-manager.js');
  assert.match(manager,/Missing or malformed Markdown frontmatter/);
  assert.match(manager,/Unsupported YAML structure/);
  assert.match(manager,/Unsupported multiline field/);
  assert.match(manager,/Missing or invalid '\+key\+' array/);
  assert.match(manager,/const \{data,body\}=record/);
  assert.match(manager,/Object\.entries\(data\)\.map/);
  assert.match(manager,/record\.data\[config\.key\]/);
  assert.match(manager,/const duty=record\.data\[config\.key\]\[i\]\.duties\[j\]/);
  assert.match(manager,/duty\[target\.dataset\.field\]=target\.value/);
  assert.match(manager,/duty\.role=target\.value/);
  assert.match(manager,/duty\.name=target\.value/);
});

test('schedule selection, new/duplicate/archive and navigation warn before discarding changes',async()=>{
  const manager=await read('../public/admin/schedule-manager.js');
  const app=await read('../public/admin/app.js');
  assert.match(manager,/const confirmDiscard=\(\)=>!dirty\|\|confirm/);
  assert.match(manager,/window\.addEventListener\('beforeunload',beforeUnload\)/);
  assert.match(manager,/window\.__sihphirScheduleCleanup=/);
  assert.match(manager,/if\(!confirmDiscard\(\)\)return/);
  assert.match(manager,/record\.data\.status=record\.data\.status==='archived'\?'upcoming':'archived'/);
  assert.match(manager,/selected=null;sha=null;dirty=true/);
  assert.match(manager,/selected=null;sha=null;record=fresh\(\)/);
  assert.match(manager,/if\(!selected&&files\.some\(f=>f\.path===path\)\)/);
  assert.match(app,/__sihphirScheduleCleanup\?\.\(\)===false/);
});

test('authenticated admin API prevents stale overwrites and duplicate creation for opted-in editors',async()=>{
  const backend=await read('../functions/api/admin/[[path]].ts');
  assert.match(backend,/if \(\(actualSha \|\| null\) !== expectedSha\)/);
  assert.match(backend,/throw new GitHubError\(409,/);
  assert.match(backend,/sha: actualSha/);
  assert.match(backend,/expectedSha !== undefined \? await writeCheckedFile/);
  assert.match(backend,/if \(!\(await getSession\(request, env\)\)\)/);
  assert.match(backend,/notices: \['src\/content\/notices\/announcements\/'\]/);
});

test('Notices editor keeps published records editable, saves drafts safely and preserves notice URLs',async()=>{
  const manager=await read('../public/admin/notice-manager.js');
  const app=await read('../public/admin/app.js');
  assert.match(app,/SihphirNoticeManager\.mount/);
  assert.match(manager,/const confirmDiscard=\(\)=>!dirty\|\|confirm/);
  assert.match(manager,/window\.__sihphirNoticeCleanup=/);
  assert.match(manager,/data\.published\?\?=!?\['draft','archived'\]/);
  assert.match(manager,/published:false,status:'draft'/);
  assert.match(manager,/if\(!selected\.path\)data\.slug=slug\(data\.title\)/);
  assert.match(manager,/expectedSha:selected\.sha\?\?null/);
  assert.match(manager,/selected\.path=path;selected\.sha=result\.sha/);
  assert.match(manager,/const path=selected\.path\|\|/);
  assert.match(manager,/selected\.data\.published=false/);
  assert.doesNotMatch(manager,/method:'DELETE'/);
  assert.match(manager,/notice-save-state/);
  assert.match(manager,/notice-search/);
  assert.match(manager,/notice-filter/);
});

test('public notices exclude drafts and expired entries while retaining stable links',async()=>{
  const normalize=await read('../src/lib/notices.ts');
  const archive=await read('../src/pages/notices/index.astro');
  assert.match(normalize,/data\.published!==false&&data\.status!=='draft'&&data\.status!=='archived'/);
  assert.match(normalize,/noticeIsActive/);
  assert.match(archive,/\.filter\(\(notice\) => notice\.published\)/);
  assert.match(archive,/href: \`\/notices\/\$\{notice\.slug\}\`/);
});

test('legacy monthly YAML and modern weekly JSON reopen without losing names, roles or dates',async()=>{
  const source=await read('../public/admin/schedule-manager.js');
  const context={window:{}};runInNewContext(source,context);
  const manager=context.window.SihphirScheduleManager;
  const oldMonthly=await read('../src/content/notices/monthly/2026-05.md');
  const parsedMonthly=manager.parse(oldMonthly,'sections');
  assert.equal(parsedMonthly.data.month,'May 2026');
  assert.equal(parsedMonthly.data.sections.length,5);
  assert.equal(parsedMonthly.data.sections[0].duties[0].name,'Pu Inkhawmhruaitu1');
  assert.equal(parsedMonthly.data.sections[0].duties[0].role,'Thla chawhma');
  const savedMonthly=manager.parse(manager.serialize(parsedMonthly),'sections');
  assert.equal(savedMonthly.data.sections[4].duties.length,6);
  assert.equal(savedMonthly.data.sections[4].duties[5].name,'Tv. Thawhlawmkhawntu6');

  const weekly=await read('../src/content/notices/weekly/2026-11-11.md');
  const parsedWeekly=manager.parse(weekly,'days');
  assert.equal(parsedWeekly.data.status,'current');
  assert.equal(parsedWeekly.data.days[0].duties[0].name,'Pu R. Lalthanmawia');
  const savedWeekly=manager.parse(manager.serialize(parsedWeekly),'days');
  assert.equal(savedWeekly.data.days[0].duties[0].name,'Pu R. Lalthanmawia');
  assert.throws(()=>manager.parse('---\nmonth: "2026-11"\nsections:\n  - unexpected: "bad"\n---\n','sections'),/Unsupported legacy roster YAML/);
});
