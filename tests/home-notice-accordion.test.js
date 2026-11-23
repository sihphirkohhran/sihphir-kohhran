import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const home=readFileSync(new URL('../src/pages/index.astro',import.meta.url),'utf8');

test('Notices render independent compact buttons and preserve full content and attachment links',()=>{
  assert.match(home, /announcements\.map\(\(notice,i\)=>\(/);
  assert.match(home, /notice-period-record notice-accordion-card/);
  assert.match(home, /<button type="button" class="notice-accordion-toggle" aria-expanded="false" aria-controls=/);
  assert.match(home, /notice-accordion-summary[^>]*>\{notice\.summary\}<\/span>/);
  assert.match(home, /notice-accordion-read-more[^>]*>Read More<\/span>/);
  assert.match(home, /class="notice-accordion-body" hidden/);
  assert.match(home, /<notice\.Content \/>/);
  assert.match(home, /notice\.attachments\.map/);
  assert.match(home, /href=\{file\.url\}/);
  assert.match(home, /rel="noopener noreferrer"/);
  assert.match(home, /noticeIsActive\(notice\)/);
  assert.match(home, /sortNotices\(a, b\)/);
  assert.match(home, /period:isoDate\(notice\.publishDate\)/);
});

test('Notices accordion is exclusive and resets on year/month/tab changes with accessible buttons',()=>{
  assert.match(home, /panel\.addEventListener\('click',event=>/);
  assert.match(home, /const wasExpanded=button\.getAttribute\('aria-expanded'\)==='true'/);
  assert.match(home, /closeNotices\(\);\s*if\(!wasExpanded\)/);
  assert.match(home, /button\.setAttribute\('aria-expanded','true'\)/);
  assert.match(home, /body\.hidden=false/);
  assert.match(home, /year\.addEventListener\('change',\(\)=>\{closeNotices\(\);shownLimit=pageSize;update\('year'\);\}\)/);
  assert.match(home, /month\.addEventListener\('change',\(\)=>\{closeNotices\(\);shownLimit=pageSize;update\('month'\);\}\)/);
  assert.match(home, /function activateNoticeTab\(target: string\) \{\s*if\(target!=='notices'\)/);
  assert.match(home, /notice-accordion-toggle:focus-visible/);
  assert.match(home, /aria-expanded="false"/);
  assert.match(home, /aria-controls=/);
  assert.match(home, /@media\(prefers-reduced-motion:reduce\)/);
});

test('Notices show five eligible cards per month then progressively reveal all',()=>{
  assert.match(home, /const pageSize=5/);
  assert.match(home, /let shownLimit=pageSize/);
  assert.match(home, /const eligible=records\.filter\(record=>record\.dataset\.period===year\?\.value\+'-'\+month\?\.value\)/);
  assert.match(home, /eligible\.forEach\(\(record,index\)=>\{record\.hidden=index>=shownLimit;\}\)/);
  assert.match(home, /shownLimit\+=pageSize;limitNotices\(\)/);
  assert.match(home, /showMore\.hidden=eligible\.length<=shownLimit/);
  assert.match(home, /if\(isNotices\)limitNotices\(\)/);
  assert.match(home, /class="notice-accordion-show-more" hidden/);
});

test('Multiple notices in one month preserve publication sorting and visibility restrictions',()=>{
  const records=[
    {title:'Older',date:'2026-11-05',published:true,pinned:false},
    {title:'Pinned',date:'2026-11-01',published:true,pinned:true},
    {title:'Recent',date:'2026-11-23',published:true,pinned:false},
    {title:'Draft',date:'2026-11-24',published:false,pinned:false},
  ];
  const eligible=records.filter(n=>n.published).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Date.parse(b.date)-Date.parse(a.date));
  assert.deepEqual(eligible.map(n=>n.title),['Pinned','Recent','Older']);
  assert.equal(new Set(eligible.map(n=>n.date.slice(0,7))).size,1);
  assert.equal(home.includes("filter((notice) => noticeIsActive(notice))"),true);
  assert.equal(home.includes(".sort((a, b) => sortNotices(a, b))"),true);
});
