import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {scheduleIsPublic,schedulePublication,kolkataToday,scheduleMonth,selectWeekly,selectMonthly} from '../src/lib/schedule-publication.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('legacy status compatibility keeps historical records public but explicit false and draft private',()=>{
  for(const status of ['current','upcoming','archived','published',undefined]){
    assert.equal(scheduleIsPublic({status}),true,String(status));
    assert.equal(schedulePublication({status}),'published');
    assert.equal(scheduleIsPublic({status,published:false}),false);
    assert.equal(schedulePublication({status,published:false}),'draft');
  }
  assert.equal(scheduleIsPublic({status:'draft'}),false);
  assert.equal(scheduleIsPublic({status:'draft',published:true}),false);
});

test('weekly period selection covers current, nearest future, latest past and deterministic overlaps',()=>{
  const records=[
    {id:'a',week_start:'2026-11-01',week_end:'2026-11-07',status:'archived'},
    {id:'b',week_start:'2026-11-23',week_end:'2026-11-29',status:'published'},
    {id:'c',week_start:'2026-12-01',week_end:'2026-12-07',status:'upcoming'},
    {id:'hidden',week_start:'2026-11-25',week_end:'2026-11-27',status:'draft'},
    {id:'hidden2',week_start:'2026-11-22',week_end:'2026-11-30',published:false},
  ];
  assert.equal(selectWeekly(records,'2026-11-25').id,'b');
  assert.equal(selectWeekly(records,'2026-11-10').id,'b');
  assert.equal(selectWeekly(records,'2027-01-01').id,'c');
  assert.equal(selectWeekly(records,'2026-10-01').id,'a');
  assert.equal(selectWeekly([...records,{id:'z',week_start:'2026-11-23',week_end:'2026-11-29'}],'2026-11-25').id,'b');
});

test('monthly selection includes legacy month names, chronological fallback and private filtering',()=>{
  const records=[
    {id:'may',month:'May 2026',status:'archived'},
    {id:'nov',month:'2026-11',status:'published'},
    {id:'jan',month:'2027-01',status:'upcoming'},
    {id:'draft',month:'2026-12',status:'draft'},
  ];
  assert.equal(scheduleMonth('May 2026'),'2026-05');
  assert.equal(selectMonthly(records,'2026-11-23').id,'nov');
  assert.equal(selectMonthly(records,'2026-12-12').id,'jan');
  assert.equal(selectMonthly(records,'2027-03-12').id,'jan');
  assert.equal(selectMonthly(records,'2026-01-12').id,'may');
});

test('Kolkata date is evaluated at runtime and handles UTC midnight boundary',()=>{
  assert.equal(kolkataToday(new Date('2026-11-22T19:00:00Z')),'2026-11-23');
  assert.equal(kolkataToday(new Date('2026-11-22T17:00:00Z')),'2026-11-22');
});

test('CMS preserves legacy publication state until explicitly changed and new records are private',()=>{
  const context={window:{}};
  runInNewContext(read('../public/admin/schedule-manager.js'),context);
  const {applyStatus,publicationStatus,validStatuses,parse,serialize}=context.window.SihphirScheduleManager;
  assert.deepEqual([...validStatuses],['draft','published']);
  for(const status of ['current','upcoming','archived','published','draft',undefined]){
    const original={status};
    const expected=status==='draft'?'draft':'published';
    assert.equal(publicationStatus(original),expected);
    const record=parse('---\nweek_start: "2026-11-23"\ndays: []\n'+(status?'status: "'+status+'"\n':'')+'---\n','days');
    const before=serialize(record);
    if(publicationStatus(record.data)!==expected)applyStatus(record.data,expected);
    assert.equal(serialize(record),before,'unchanged status must not be rewritten');
    applyStatus(record.data,'draft');
    assert.equal(record.data.status,'draft');
    assert.equal(record.data.published,false);
    applyStatus(record.data,'published');
    assert.equal(record.data.status,'published');
    assert.equal(record.data.published,true);
  }
  assert.equal(publicationStatus({status:'current',published:false}),'draft');
  const manager=read('../public/admin/schedule-manager.js');
  assert.match(manager,/status:'draft'/);
  assert.match(manager,/record\.data\.published=false/);
  assert.doesNotMatch(manager,/id="schedule-archive"/);
  assert.match(manager,/id="schedule-delete"/);
  assert.match(manager,/expectedSha:sha/);
});

test('public archive and homepage use same legacy visibility, retain date pickers and omit notice card date',()=>{
  const home=read('../src/pages/index.astro');
  const archive=read('../src/pages/hun-ruatna/index.astro');
  const detail=read('../src/pages/hun-ruatna/[slug].astro');
  assert.match(home,/filter\(record => scheduleIsPublic\(record\)\)/);
  assert.match(archive,/filter\(\(schedule\) => scheduleIsPublic\(schedule\)\)/);
  assert.match(detail,/filter\(\(schedule\) => scheduleIsPublic\(schedule\)\)/);
  assert.match(home,/selectWeekly\(records\.map/);
  assert.match(home,/selectMonthly\(records\.map/);
  assert.match(home,/data-period="year"/);
  assert.match(home,/data-period="month"/);
  assert.match(home,/data-period="record"/);
  assert.doesNotMatch(home,/<span class="font-body text-xs text-navy\/70 tracking-wide">\{notice\.date\}<\/span>/);
  assert.match(home,/notice-accordion-toggle/);
  assert.match(home,/notice\.attachments\.map/);
  assert.match(home,/notice-accordion-show-more/);
  assert.match(home,/period:isoDate\(notice\.publishDate\)/);
});
