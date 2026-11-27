import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/pages/index.astro');
const cms = read('../src/lib/cms.ts');
const schema = read('../src/content/config.ts');
const archive = read('../src/pages/hun-ruatna/index.astro');
const detail = read('../src/pages/hun-ruatna/[slug].astro');

test('homepage selects current eligible weekly record with a historical fallback',()=>{
  assert.match(home,/selectWeekly\(records\.map/);
  assert.match(home,/scheduleIsPublic\(record\)/);
  assert.match(home,/No publicly available weekly schedules/);
  assert.doesNotMatch(home,/Week of:/);
  assert.doesNotMatch(home,/href="\/hun-ruatna"/);
  assert.doesNotMatch(home,/<div class="pagination mt-4">/);
});

test('weekly schedule ordering is deterministic for duplicate status/date records', () => {
  assert.doesNotMatch(cms, /weeklyStatusPriority/);
  assert.match(cms, /weeklyStartTimestamp\(b\.week_start, b\.id\) - weeklyStartTimestamp\(a\.week_start, a\.id\)/);
  assert.match(cms, /dateDifference \|\| a\.id\.localeCompare\(b\.id\)/);
  assert.ok(cms.includes("replace(/\\.md$/, '')"));
});

test('archive contains all public records and supports search and year filters', () => {
  assert.match(archive, /filter\(\(schedule\) => scheduleIsPublic\(schedule\)\)/);
  assert.match(archive, /id="schedule-search"/);
  assert.match(archive, /id="schedule-year"/);
  assert.match(archive, /schedules\.sort\(\(a, b\) => scheduleTimestamp\(b\) - scheduleTimestamp\(a\)/);
  assert.doesNotMatch(archive, /status === 'upcoming'/);
});

test('archived schedule detail exposes all structured duty fields', () => {
  assert.match(detail, /scheduleIsPublic\(schedule\)/);
  for (const field of ['time', 'role', 'title', 'name', 'person_responsible', 'speaker', 'bible_text', 'notes']) {
    assert.ok(detail.includes(`duty.${field}`), `detail page missing ${field}`);
  }
  for (const field of ['time', 'title', 'person_responsible', 'speaker', 'bible_text', 'notes']) {
    assert.ok(schema.includes(`${field}: z.string().optional()`), `schema missing ${field}`);
  }
});

test('homepage monthly and weekly duty rows use wrapping two-column layouts', () => {
  assert.match(home, /grid-cols-\[minmax\(0,0\.35fr\)_minmax\(0,0\.65fr\)\]/);
  assert.match(home, /break-words/);
  assert.match(home, /notice-programme-board/);
  assert.doesNotMatch(home, /<div class="bg-navy border border-gold\/15 rounded overflow-hidden">/);
});

test('archive filtering hides flex cards and combines search with year', () => {
  assert.ok(archive.includes('card.dataset.search?.includes(search.value.toLowerCase())'));
  assert.ok(archive.includes('card.dataset.year === year.value'));
  assert.ok(archive.includes('cards.forEach((card) => { card.hidden = !matches.includes(card); });'));
  assert.ok(archive.includes('.schedule-card[hidden],.empty[hidden]{display:none!important}'));
  assert.ok(archive.includes('empty.hidden = matches.length > 0'));
  assert.ok(archive.includes('count.textContent = `${matches.length}'));
  assert.ok(archive.includes('matches.length === 1 ?'));
});

test('archive detail wraps long duty labels and values without widening cards', () => {
  assert.ok(detail.includes('.day-card{background:#fff;border:1px solid rgba(184,149,63,.2);border-left:3px solid #b8953f;padding:1rem 1.15rem;min-width:0;max-width:100%;box-sizing:border-box}'));
  assert.ok(detail.includes('.duty{min-width:0;border-bottom:1px solid rgba(15,31,61,.08);padding-bottom:.5rem;overflow-wrap:anywhere}'));
  assert.ok(detail.includes('.duty-label{font-size:.75rem;color:#7a6a4c;font-weight:600;overflow-wrap:anywhere}'));
  assert.ok(detail.includes('.duty p{font-size:.9rem;line-height:1.5;color:#26344b;margin:.15rem 0;overflow-wrap:anywhere}'));
});

test('all three Notice Board tabs remain present and manually activatable', () => {
  for (const tab of ['weekly', 'monthly', 'notices']) {
    assert.match(home, new RegExp(`data-target="${tab}"`));
    assert.match(home, new RegExp(`notice-${tab}`));
  }
  assert.match(home, /function activateNoticeTab\(target: string\)/);
});

test('all Notice Board tabs provide cascading, dynamically populated historical selectors',()=>{
  for(const tab of ['weekly','monthly','notices']){
    assert.match(home,new RegExp('data-notice-controls="'+tab+'"'));
    assert.match(home,new RegExp('id="notice-'+tab+'"'));
  }
  assert.match(home,/data-period="year"/);
  assert.match(home,/data-period="month"/);
  assert.match(home,/data-period="record"/);
  assert.match(home,/new Set\(records\.map/);
  assert.match(home,/availableMonths/);
  assert.match(home,/week\.value/);
  assert.match(home,/record\.hidden/);
  assert.match(home,/record\.dataset\.recordId/);
  assert.match(home,/sort\(\(a,b\)=>\(b\.dataset\.weekStart/);
  assert.match(home,/isoDate\(record\.week_start\)/);
  assert.match(home,/indianDate\(record\.week_start\)/);
  assert.match(home,/monthTitle\(record\.period\)/);
  assert.match(home,/noticeIsActive\(notice\)/);
  assert.match(home,/announcementEntries\.map\(notice=>/);
  assert.match(home,/notice\.publishDate/);
  assert.doesNotMatch(home,/View All Notices/);
  assert.doesNotMatch(home,/View All →/);
  assert.match(home,/\.notice-duty-label\{font-size:inherit;font-weight:600;color:#172941/);
  assert.match(home,/@media\(max-width:480px\)/);
});

test('unified programme and roster preserve dynamic sections, duties and legacy values',()=>{
  assert.match(home,/\(record.days\?\?\[\]\).map/);
  assert.match(home,/\(record.sections\?\?\[\]\).map/);
  assert.match(home,/\(day.duties\?\?\[\]\).map/);
  assert.match(home,/\(section.duties\?\?\[\]\).map/);
  assert.match(home,/<h3 class="notice-programme-heading">\{day.day\}<\/h3>/);
  assert.match(home,/<h3 class="notice-programme-heading">\{section.title\}<\/h3>/);
  assert.match(home,/duty.role\|\|duty.title/);
  assert.match(home,/duty.name\|\|duty.person_responsible/);
  for(const field of ['time','speaker','bible_text','notes']) assert.ok(home.includes('duty.'+field+' &&'));
  assert.match(home,/@media\(max-width:390px\)[^\n]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(home,/notice-board-tabs\{display:flex;overflow-x:auto/);
  assert.match(home,/notice-programme-section \+ .notice-programme-section\{margin-top:14px\}/);
  assert.match(home,/notice-programme-section\{background:white;border:1px solid rgba\(15,31,61,\.14\);border-radius:8px;overflow:hidden;min-width:0\}/);
  assert.match(home,/notice-programme-board\{min-width:0\}/);
  assert.match(home,/notice-programme-heading\{[^}]*background:var\(--cream\)[^}]*border-left:2px solid var\(--gold\)/);
  for(const target of ['weekly','monthly','notices']) assert.ok(home.includes("'tab-"+target+"': '"+target+"'"));
});

test('notice duty columns adapt and blank roles give details the full row',()=>{
  assert.match(home,/notice-programme-row\{grid-template-columns:minmax\(0,35fr\) minmax\(0,65fr\);gap:12px/);
  assert.match(home,/@media\(max-width:600px\)[^\n]*grid-template-columns:minmax\(0,40fr\) minmax\(0,60fr\)/);
  assert.match(home,/notice-duty-label\[hidden\] \+ \*\{grid-column:1\/-1\}/);
  assert.ok(home.includes("hidden={!String(duty.role||duty.title||'').trim()}"));
  assert.ok(home.includes("hidden={!String(duty.role||'').trim()}"));
  assert.match(home,/@media\(max-width:600px\)[^\n]*label:last-child:nth-child\(3\)\{grid-column:1\/-1\}/);
  assert.match(home,/notice-period-controls\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1.2fr\) minmax\(0,2fr\)/);
});
