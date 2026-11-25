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
  assert.match(manager,/sha=response\.sha;selected=path;savedIdentity=/);
  assert.match(manager,/await refresh\(\)/);
  assert.match(manager,/const parsed=parse\(saved\.content,config\.key\)/);
  assert.match(manager,/record=parsed;selected=path;sha=saved\.sha/);
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

test('schedule selection, new/duplicate and navigation warn before discarding changes',async()=>{
  const manager=await read('../public/admin/schedule-manager.js');
  const app=await read('../public/admin/app.js');
  assert.match(manager,/const confirmDiscard=\(\)=>!dirty\|\|confirm/);
  assert.match(manager,/window\.addEventListener\('beforeunload',beforeUnload\)/);
  assert.match(manager,/window\.__sihphirScheduleCleanup=/);
  assert.match(manager,/if\(!confirmDiscard\(\)\)return/);
  assert.doesNotMatch(manager,/id="schedule-archive"/);
  assert.match(manager,/status:'draft'/);
  assert.match(manager,/selected=null;sha=null;savedIdentity=null;dirty=true/);
  assert.match(manager,/selected=null;sha=null;savedIdentity=null;record=fresh\(\)/);
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
  assert.match(backend,/new TextDecoder\(\)\.decode\(Uint8Array\.from\(atob/);
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
  assert.match(manager,/method:'DELETE'/);
  assert.match(manager,/expectedSha/);
  assert.match(manager,/notice-permanent-delete/);
  assert.match(manager,/notice-save-state/);
  assert.match(manager,/notice-search/);
  assert.match(manager,/notice-filter/);
  assert.match(manager,/applyPublication\(data,values\.get\('published'\)==='on'\)/);
  for(const control of ['notice-save-draft','notice-publish','notice-delete'])assert.ok(manager.includes(control));
  assert.match(manager,/Update Published Notice/);
  assert.match(manager,/requestSubmit\(\)/);
  assert.match(manager,/Missing or malformed notice frontmatter/);
  assert.match(manager,/Unsupported notice frontmatter/);
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
  const oldMonthly='---\nmonth: "May 2026"\nsections:\n  - title: "Inkhawm Hruaitu"\n    duties:\n      - role: "Thla chawhma"\n        name: "Pu Inkhawmhruaitu1"\n  - title: "Section 2"\n    duties:\n      - role: "Role 2"\n        name: "Person 2"\n  - title: "Section 3"\n    duties:\n      - role: "Role 3"\n        name: "Person 3"\n  - title: "Section 4"\n    duties:\n      - role: "Role 4"\n        name: "Person 4"\n  - title: "Section 5"\n    duties:\n      - role: "Role 5"\n        name: "Person 5"\n---\n';
  const parsedMonthly=manager.parse(oldMonthly,'sections');
  assert.equal(parsedMonthly.data.month,'May 2026');
  assert.equal(parsedMonthly.data.sections.length,5);
  assert.equal(parsedMonthly.data.sections[0].duties[0].name,'Pu Inkhawmhruaitu1');
  assert.equal(parsedMonthly.data.sections[0].duties[0].role,'Thla chawhma');
  const savedMonthly=manager.parse(manager.serialize(parsedMonthly),'sections');
  assert.equal(savedMonthly.data.sections[4].duties.length,1);
  assert.equal(savedMonthly.data.sections[4].duties[0].name,'Person 5');

  const weekly='---\nweek_start: "2026-11-11"\nstatus: "archived"\ndays: '+JSON.stringify([{day:'Nilaini',duties:[{role:'Tantu',name:'Pu R. Lalthanmawia'}]}])+'\n---\n';
  const parsedWeekly=manager.parse(weekly,'days');
  assert.ok(['current','published','draft','upcoming','archived'].includes(parsedWeekly.data.status));
  assert.equal(parsedWeekly.data.days[0].duties[0].name,'Pu R. Lalthanmawia');
  const savedWeekly=manager.parse(manager.serialize(parsedWeekly),'days');
  assert.equal(savedWeekly.data.days[0].duties[0].name,'Pu R. Lalthanmawia');
  assert.throws(()=>manager.parse('---\nmonth: "2026-11"\nsections:\n  - unexpected: "bad"\n---\n','sections'),/Unsupported legacy roster YAML/);
});

test('weekly and monthly published/draft/archived statuses survive name-only save and reload',async()=>{
  const context={window:{}};
  runInNewContext(await read('../public/admin/schedule-manager.js'),context);
  const {parse,serialize,validStatuses,applyStatus}=context.window.SihphirScheduleManager;
  assert.deepEqual(Array.from(validStatuses),['draft','published']);
  for(const key of ['days','sections']){
    for(const status of ['published','draft','archived','current','upcoming']){
      const identity=key==='days'?'week_start: "2026-11-11"':'month: "May 2026"';
      const section=key==='days'?{day:'Nilaini',duties:[{role:'Tantu',name:'Old name'}]}:{title:'Inkhawm Hruaitu',duties:[{role:'Thla chawhma',name:'Old name'}]};
      const source='---\n'+identity+'\nstatus: "'+status+'"\n'+key+': '+JSON.stringify([section])+'\n---\nHistorical body remains\n';
      const record=parse(source,key);
      record.data[key][0].duties[0].name='Updated name';
      const saved=parse(serialize(record),key);
      assert.equal(saved.data.status,status,key+' '+status);
      assert.equal(saved.data[key][0].duties[0].name,'Updated name');
      assert.equal(saved.body,'Historical body remains\n');
      // Legacy status is preserved on content-only edits; explicit publication changes are canonical.
      const reloaded=parse(serialize(saved),key);
      assert.equal(reloaded.data.status,status);
      applyStatus(reloaded.data,'draft');
      assert.equal(reloaded.data.status,'draft');
      assert.equal(reloaded.data.published,false);
      applyStatus(reloaded.data,'published');
      assert.equal(reloaded.data.status,'published');
      assert.equal(reloaded.data.published,true);
    }
  }
  const legacy=parse('---\nmonth: "May 2026"\nsections: [{"title":"Duties","duties":[]}]\n---\n','sections');
  assert.equal(Object.hasOwn(legacy.data,'status'),false);
  assert.equal(Object.hasOwn(parse(serialize(legacy),'sections').data,'status'),false);
  assert.throws(()=>applyStatus(legacy.data,'unexpected'),/Unsupported schedule status/);
});

test('notices retain archived/draft/published states on edit; only explicit changes affect visibility',async()=>{
  const context={window:{}};
  runInNewContext(await read('../public/admin/notice-manager.js'),context);
  const {applyPublication}=context.window.SihphirNoticeManager;
  for(const status of ['published','draft','archived']){
    const original={title:'Existing notice',status,published:status==='published',pinned:false};
    const edited={...original,title:'Edited name'};
    applyPublication(edited,original.published);
    assert.equal(edited.status,status);
    assert.equal(edited.published,original.published);
    const reopened=JSON.parse(JSON.stringify(edited));
    applyPublication(reopened,reopened.published);
    assert.equal(reopened.status,status);
  }
  const archived={status:'archived',published:false};
  applyPublication(archived,true);
  assert.equal(archived.status,'published');
  applyPublication(archived,false);
  assert.equal(archived.status,'draft');
  const unusualArchived={status:'archived',published:true};
  applyPublication(unusualArchived,true);
  assert.equal(unusualArchived.status,'archived');
});

test('monthly picker converts historical labels and preserves existing identity',async()=>{
  const context={window:{}};
  runInNewContext(await read('../public/admin/schedule-manager.js'),context);
  const {monthValue,monthLabel,parse,serialize}=context.window.SihphirScheduleManager;
  assert.equal(monthValue('May 2026'),'2026-05');
  assert.equal(monthValue('2026-11'),'2026-11');
  assert.equal(monthLabel('2026-11'),'November 2026');
  assert.equal(monthValue('2026-13'),'');
  const original='---\nmonth: "May 2026"\nsections: [{"title":"Duty","duties":[{"name":"Original","role":"Leader"}]}]\n---\n';
  const record=parse(original,'sections');
  const before=record.data.month;
  record.data.sections[0].duties[0].name='Corrected name';
  assert.equal(parse(serialize(record),'sections').data.month,before);
  const manager=await read('../public/admin/schedule-manager.js');
  assert.match(manager,/type="month" required/);
  assert.match(manager,/schedule-month-fallback/);
  assert.match(manager,/data-month-part="month"/);
  assert.match(manager,/data-month-part="year"/);
  assert.match(manager,/String\(identity\)!==savedIdentity/);
  assert.match(manager,/expectedSha:sha/);
});

test('schedule editor uses accessible compact rows and reliable persistence feedback',async()=>{
  const manager=await read('../public/admin/schedule-manager.js');
  const page=await read('../src/pages/admin.astro');
  assert.match(manager,/schedule-monthly-row/);
  assert.match(manager,/schedule-weekly-row/);
  assert.match(manager,/aria-label="Duplicate duty row/);
  assert.match(manager,/aria-label="Remove duty row/);
  assert.match(manager,/schedule-remove-section/);
  assert.match(manager,/role="status" aria-live="polite"/);
  assert.match(manager,/setSaveState\('saving'\)/);
  assert.match(manager,/setSaveState\('saved'\);draw\(\);notification/);
  assert.match(manager,/setSaveState\('error'\)/);
  assert.match(manager,/busy=false;setSaveState\('saved'\)/);
  assert.match(page,/\.schedule-monthly-row\{grid-template-columns:minmax\(0,1\.65fr\) minmax\(0,1fr\) 86px\}/);
  assert.match(page,/@media\(max-width:550px\)\{#schedule-form \.schedule-monthly-row/);
  assert.match(page,/\.schedule-icon-button svg/);
  assert.match(page,/\.schedule-field input/);
});

test('weekly duty editor renders three fields and preserves hidden legacy data through actual edit and save handlers',async()=>{
 const source=await read('../public/admin/schedule-manager.js');
 const original={role:'Prayer',name:'Original',time:'10:00',speaker:'Speaker',bible_text:'John 1',notes:'Old',custom:{keep:true}};
 const path='src/content/notices/weekly/2026-11-23.md';
 let saved='---\nweek_start: "2026-11-23"\nstatus: "published"\ndays: '+JSON.stringify([{day:'Sunday',duties:[original]}])+'\n---\nHistory\n';
 let writes=0;
 const elements=new Map();
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{dataset:{},events:{},addEventListener(n,fn){this.events[n]=fn;},querySelector:element});return elements.get(selector);};
 const form=element('#schedule-form');
 const host={innerHTML:'',querySelector:element,querySelectorAll:()=>[]};
 const window={addEventListener(){},removeEventListener(){}};
 const context={window,document:{querySelector:()=>host},confirm:()=>true,FormData:class{get(k){return {week_start:'2026-11-23',week_end:'',status:'published'}[k]??null;}}};
 runInNewContext(source,context);
 const manager=window.SihphirScheduleManager;
 const api=async(url,options)=>{
  if(options?.method==='PUT'){saved=JSON.parse(options.body).content;writes++;return {};}
  if(url.includes('?area='))return {items:[{path,label:'2026-11-23.md'}]};
  return {content:saved,sha:'sha'};
 };
 await manager.mount({area:'hun-ruatna',api,esc:v=>String(v??''),notification:(message,type)=>{assert.notEqual(type,'error',message);}});
 const fields=()=>[...host.innerHTML.matchAll(/data-field="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(fields(),['title','person_responsible','notes']);
 for(const label of ['Programme / Role','Name / Person Responsible','Notes (Optional)'])assert.ok(host.innerHTML.includes(label));
 assert.match(host.innerHTML,/data-field="title" value="Prayer"/);
 assert.match(host.innerHTML,/data-field="person_responsible" value="Original"/);
 const edit=(field,value)=>form.events.input({target:{dataset:{duty:'0:0',field},value}});
 edit('title','Updated programme');edit('person_responsible','Updated person');edit('notes','');
 const click=dataset=>form.events.click({target:{closest:()=>({dataset})}});
 click({duplicateDuty:'0:0'});assert.equal(fields().length,6);
 click({addDuty:'0'});assert.equal(fields().length,9);
 click({removeDuty:'0:1'});assert.equal(fields().length,6);
 await form.onsubmit({preventDefault(){}});
 assert.equal(writes,1);
 const record=manager.parse(saved,'days');
 const [edited,fresh]=record.data.days[0].duties;
 assert.deepEqual(JSON.parse(JSON.stringify(edited)),{...original,title:'Updated programme',role:'Updated programme',person_responsible:'Updated person',name:'Updated person',notes:''});
 assert.deepEqual(JSON.parse(JSON.stringify(fresh)),{role:'',name:''});
 assert.equal(record.body,'History\n');
 assert.deepEqual(fields(),['title','person_responsible','notes','title','person_responsible','notes']);
 assert.match(source,/\['title','person_responsible','notes'\]:\['name','role'\]/);
});
test('weekly layout stacks independently of monthly layout',async()=>{
 const page=await read('../src/pages/admin.astro');
 assert.match(page,/\.schedule-weekly-row\{grid-template-columns:minmax\(0,1\.2fr\) minmax\(0,1\.2fr\) minmax\(0,1fr\) 86px\}/);
 assert.match(page,/@media\(max-width:800px\)\{#schedule-form \.schedule-weekly-row\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(page,/\.schedule-weekly-row \.schedule-field input\{height:44px;font-size:16px\}/);
});
