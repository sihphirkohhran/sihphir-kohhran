import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isoDate, indianDate, monthKey, monthTitle } from '../src/lib/notice-periods.js';

const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('weekly ISO and legacy dates populate year/month/week keys and preserve statuses', () => {
  const records = [
    { id: 'current', status: 'current', week_start: '2026-11-23', week_end: '2026-11-29' },
    { id: 'archived', status: 'archived', week_start: '17.11.2025', week_end: '23.11.2025' },
    { id: 'draft', status: 'draft', week_start: '2024-11-04', week_end: '2024-11-10' },
  ];
  const eligible = records.filter(record => record.status !== 'draft');
  const weeklyBrowse = eligible.map(record => ({ ...record, period: isoDate(record.week_start), end: isoDate(record.week_end) })).filter(record => record.period);
  assert.deepEqual(weeklyBrowse.map(record => record.period), ['2026-11-23', '2025-11-17']);
  assert.deepEqual([...new Set(weeklyBrowse.map(record => record.period.slice(0, 4)))].sort().reverse(), ['2026', '2025']);
  assert.equal(weeklyBrowse[0].period.slice(0, 7), '2026-11');
  assert.equal(weeklyBrowse[0].end, '2026-11-29');
  assert.equal(indianDate(weeklyBrowse[0].period) + ' — ' + indianDate(weeklyBrowse[0].end), '23/11/2026 — 29/11/2026');
  assert.equal(weeklyBrowse.find(record => record.status === 'current')?.id, 'current');
  assert.equal(weeklyBrowse.some(record => record.status === 'archived'), true);
  assert.equal(weeklyBrowse.some(record => record.status === 'draft'), false);
});

test('monthly records populate year/month options and full English names', () => {
  const periods = ['2026-11', '2025-08', 'November 2024'].map(monthKey).filter(Boolean);
  assert.deepEqual(periods, ['2026-11', '2025-08', '2024-11']);
  assert.equal(monthTitle('2026-11'), 'November, 2026');
  assert.equal(monthTitle('November 2024'), 'November, 2024');
  assert.equal(monthKey('2026-13'), '');
});

test('published notices group by publication date, not draft date or filename', () => {
  const notices = [
    { published: true, publishDate: '2026-11-23' },
    { published: true, publishDate: '2026-11-05' },
    { published: false, publishDate: '2025-10-20' },
  ];
  const periods = notices.filter(notice => notice.published).map(notice => isoDate(notice.publishDate).slice(0, 7));
  assert.deepEqual(periods, ['2026-11', '2026-11']);
  assert.equal(isoDate('2026-02-30'), '');
  assert.equal(isoDate('2026-11-23'), '2026-11-23');
  assert.equal(isoDate('23/11/2026'), '2026-11-23');
});

test('homepage uses executable parsers and client formatter matches ISO dates', () => {
  assert.ok(home.includes("import { isoDate, indianDate, monthKey, monthTitle } from '../lib/notice-periods.js'"));
  for (const expression of ['isoDate(record.week_start)', 'monthKey(record.month)', 'isoDate(notice.publishDate)']) {
    assert.ok(home.includes(expression));
  }
  const line = home.split('\n').find(line => line.includes('const indian=(value:string)'));
  assert.ok(line);
  assert.ok(line.includes('/^\\d{4}-\\d{2}-\\d{2}$/'.replaceAll('\\\\', '\\')), 'client ISO formatter must match date digits');
  assert.ok(!line.includes('\\\\d'), 'client ISO formatter must not match literal backslashes');
});
