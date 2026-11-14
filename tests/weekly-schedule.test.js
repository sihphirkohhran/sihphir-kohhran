import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/pages/index.astro');
const cms = read('../src/lib/cms.ts');
const schema = read('../src/content/config.ts');
const archive = read('../src/pages/hun-ruatna/index.astro');
const detail = read('../src/pages/hun-ruatna/[slug].astro');

test('homepage selects only a current weekly schedule and has an empty state', () => {
  assert.match(home, /getWeeklySchedules\(\)\)\.find\(\(schedule\) => schedule\.status === 'current'\)/);
  assert.match(home, /No current weekly schedule is available/);
  assert.match(home, /href="\/hun-ruatna"/);
  assert.doesNotMatch(home, /<div class="pagination mt-4">/);
});

test('weekly schedule ordering is deterministic for duplicate status/date records', () => {
  assert.match(cms, /weeklyStatusPriority\(a\.status\) - weeklyStatusPriority\(b\.status\)/);
  assert.match(cms, /weeklyStartTimestamp\(b\.week_start, b\.id\) - weeklyStartTimestamp\(a\.week_start, a\.id\)/);
  assert.match(cms, /dateDifference \|\| a\.id\.localeCompare\(b\.id\)/);
  assert.ok(cms.includes("replace(/\\.md$/, '')"));
});

test('archive contains archived records only and supports search and year filters', () => {
  assert.match(archive, /filter\(\(schedule\) => schedule\.status === 'archived'\)/);
  assert.match(archive, /id="schedule-search"/);
  assert.match(archive, /id="schedule-year"/);
  assert.match(archive, /schedules\.sort\(\(a, b\) => scheduleTimestamp\(b\) - scheduleTimestamp\(a\)/);
  assert.doesNotMatch(archive, /status === 'upcoming'/);
});

test('archived schedule detail exposes all structured duty fields', () => {
  assert.match(detail, /schedule\.status === 'archived'/);
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
  assert.match(home, /bg-white border border-gold\/20 border-l-2 border-l-gold/);
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
  assert.ok(detail.includes('.duty{min-width:0;'));
  assert.ok(detail.includes('.duty-label{') && detail.includes('overflow-wrap:anywhere'));
  assert.ok(detail.includes('.duty p{') && detail.includes('overflow-wrap:anywhere'));
});

test('all three Notice Board tabs remain present and manually activatable', () => {
  for (const tab of ['weekly', 'monthly', 'notices']) {
    assert.match(home, new RegExp(`data-target="${tab}"`));
    assert.match(home, new RegExp(`notice-${tab}`));
  }
  assert.match(home, /function activateNoticeTab\(target: string\)/);
});
