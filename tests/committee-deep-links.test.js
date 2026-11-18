import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  committeeArchiveIdMatches,
  getLatestPublishedCommitteeRecord,
  getCommitteeListingUrl,
  normalizeCommitteeArchiveId,
  resolveCommitteeDeepLink,
} from '../src/lib/committee-deep-links.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const page = read('../src/pages/committee.astro');
const manager = read('../public/admin/committee-manager.js');
const styles = read('../public/admin/committee-manager.css');
const origin = 'https://sihphirpresbyteriankohhran.org';
const records = [
  { archiveId: 'pes-2024.md', committeeId: 'pes', year: 2024, published: true, status: 'current', displayOrder: 0 },
  { archiveId: 'pes-2025.md', committeeId: 'pes', year: 2025, published: true, status: 'current', displayOrder: 0 },
  { archiveId: 'pes-2026.md', committeeId: 'pes', year: 2026, published: true, status: 'current', displayOrder: 0 },
  { archiveId: 'pes-draft-2027.md', committeeId: 'pes', year: 2027, published: false, status: 'current' },
  { archiveId: 'pes-old.md', committeeId: 'pes', year: 2023, published: true, status: 'archived' },
  { archiveId: 'archive-2025.md', committeeId: 'archive', year: 2025, published: true, status: 'current' },
];

test('Committee archive identifiers normalize Astro Markdown suffixes without changing stable path identity', () => {
  assert.equal(normalizeCommitteeArchiveId('pes-2025.md'), 'pes-2025');
  assert.equal(normalizeCommitteeArchiveId('nested/pes-2025.md'), 'nested/pes-2025');
  assert.equal(committeeArchiveIdMatches('pes-2025.md', 'pes-2025'), true);
  assert.equal(committeeArchiveIdMatches('pes-2025.md', 'pes-2025.md'), true);
  assert.equal(committeeArchiveIdMatches('pes-2025.md', 'pes-2024'), false);
});

test('permanent Committee links resolve the latest published non-archived yearly record', () => {
  assert.equal(getLatestPublishedCommitteeRecord(records, 'pes')?.archiveId, 'pes-2026.md');
  assert.equal(resolveCommitteeDeepLink(records, '?committee=pes')?.record.archiveId, 'pes-2026.md');
  assert.deepEqual(resolveCommitteeDeepLink(records, '?committee=archive'), { type: 'listing', committeeId: 'archive' });
});

test('archive links resolve the exact historical record and never follow a newer year', () => {
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-2024')?.record.year, 2024);
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-2025.md')?.record.year, 2025);
  assert.equal(resolveCommitteeDeepLink(records, '?archive=archive-2025')?.record.committeeId, 'archive');
});

test('invalid, deleted, unpublished, and archived targets return a graceful no-match result', () => {
  assert.equal(resolveCommitteeDeepLink(records, '?committee=missing'), null);
  assert.equal(resolveCommitteeDeepLink(records, '?archive=deleted-record'), null);
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-draft-2027'), null);
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-old'), null);
  assert.equal(getLatestPublishedCommitteeRecord(records, 'unlisted'), null);
});

test('CMS Committee and archive Copy Link controls use permanent production URLs and saved stable identifiers', () => {
  const committeeUrl = new URL('/committee', origin);
  committeeUrl.searchParams.set('committee', 'pes / board');
  const archiveUrl = new URL('/committee', origin);
  archiveUrl.searchParams.set('archive', 'pes-2025');
  assert.equal(committeeUrl.origin, origin);
  assert.equal(committeeUrl.searchParams.get('committee'), 'pes / board');
  assert.equal(archiveUrl.searchParams.get('archive'), 'pes-2025');
  assert.match(manager, /data-master-copy=/);
  assert.match(manager, /id="committee-copy-archive-link"/);
  assert.match(manager, /selected\.path\.startsWith\(ROOT\)/);
  assert.match(manager, /url\.searchParams\.set\('committee'/);
  assert.match(manager, /url\.searchParams\.set\('archive'/);
  assert.match(manager, /window\.SIHPHIR_PUBLIC_SITE_ORIGIN/);
  assert.match(manager, /notification\('Copied!'\)/);
  assert.match(manager, /Could not copy link\. Check your browser clipboard permissions/);
  assert.match(manager, /selected\.isNew\|\|!selected\.path\?'disabled'/);
});

test('Committee page script closing tag is well formed', () => {
  const closingTag = page.slice(page.indexOf('</script'), page.indexOf('</script') + 9);
  assert.equal(closingTag, '</script>');
  assert.equal(page.includes('</script>>'), false);
});

test('CMS Committee Copy Link is enabled only for persisted master records', () => {
  assert.ok(manager.includes('savedMasterIds=new Set(masters.map(item=>item.id).filter(Boolean))'));
  assert.ok(manager.includes("savedMasterIds.has(item.id)?'':'disabled title=\"Save the Committee List before copying a link.\"'"));
  assert.ok(manager.includes('Save the Committee List before copying this link.'));
  assert.ok(manager.includes('savedMasterIds=new Set(cleaned.map(item=>item.id).filter(Boolean))'));
  assert.ok(manager.includes('if(!savedMasterIds.has(item.id))return notification'));
  const successfulSave = manager.indexOf("await api('/api/admin/content'");
  const enableAfterSave = manager.indexOf('savedMasterIds=new Set(cleaned.map(item=>item.id).filter(Boolean))');
  assert.ok(successfulSave >= 0 && enableAfterSave > successfulSave);
});

test('public page exposes normalized stable archive IDs and resolves direct links on load and history navigation', () => {
  assert.match(page, /normalizeCommitteeArchiveId\(entry\.id\)/);
  assert.match(page, /data-archive-id=\{committee\.archiveId\}/);
  assert.match(page, /resolveCommitteeDeepLink\(/);
  assert.match(page, /window\.addEventListener\('popstate'/);
  assert.match(page, /history\.pushState\(/);
  assert.match(page, /history\.pushState\(\{committeeListing:true\}/);
  assert.match(page, /data-close-committee/);
  assert.match(page, /data-committee-year-switch/);
  assert.match(page, /committee-link-fallback/);
});

test('Committee deep links preserve combined filters, reset defaults, and year switching', () => {
  assert.match(page, /matchesCommitteeFilters\(/);
  assert.match(page, /resetCommitteeFilters\(year\?\.dataset\.defaultYear\|\|'all'\)/);
  assert.match(page, /data-default-year=\{defaultYear\}/);
  assert.match(page, /data-committee-year-switch/);
  assert.match(styles, /committee-master-rows article\{[^}]*grid-template-columns:minmax\(0,1fr\) 130px auto auto/);
});


test('Back to Committees URL clears both detail parameters and legacy hashes while preserving unrelated query state', () => {
  const url = getCommitteeListingUrl('https://sihphirpresbyteriankohhran.org/committee?committee=pes&archive=pes-2025&year=2025#committee-detail-pes-2025');
  assert.equal(url.pathname, '/committee');
  assert.equal(url.searchParams.has('committee'), false);
  assert.equal(url.searchParams.has('archive'), false);
  assert.equal(url.searchParams.get('year'), '2025');
  assert.equal(url.hash, '');
});

test('direct-entry Committee and archive links remain resolvable independently of Back to Committees', () => {
  assert.equal(resolveCommitteeDeepLink(records, '?committee=pes')?.record.year, 2026);
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-2024')?.record.year, 2024);
  assert.match(page, /syncFromLocation\(\);/);
});

test('archive year switching pushes the selected historical detail as a distinct browser history state', () => {
  assert.match(page, /data-committee-year-switch[^]*?openDetail\(target,\{push:true\}\)/);
});

test('Back to Committees always pushes the clean listing state instead of calling history.back', () => {
  const handler = page.match(/document\.querySelectorAll<HTMLButtonElement>\('\[data-close-committee\]'\)[^\n]+/)?.[0] ?? '';
  assert.match(handler, /getCommitteeListingUrl\(window\.location\.href\)/);
  assert.match(handler, /history\.pushState\(\{committeeListing:true\}/);
  assert.match(handler, /showListing\(\)/);
  assert.doesNotMatch(handler, /history\.back\(\)/);
});

test('browser Back and Forward continue to restore previously visited Committee states from the URL', () => {
  assert.match(page, /window\.addEventListener\('popstate',syncFromLocation\)/);
  assert.match(page, /history\.pushState\(\{committeeDetail:true\}/);
  assert.match(page, /function syncFromLocation\(\)/);
  assert.match(page, /resolveCommitteeDeepLink\(linkRecords,window\.location\.search\)/);
});


test('archive Committee selector deep link opens the listing, not the latest archive detail', () => {
  const result = resolveCommitteeDeepLink(records, '?committee=archive');
  assert.deepEqual(result, { type: 'listing', committeeId: 'archive' });
  assert.equal(resolveCommitteeDeepLink(records, '?archive=archive-2025')?.record.archiveId, 'archive-2025.md');
  assert.match(page, /archiveListingRequested = Astro\.url\.searchParams\.get\('committee'\) === 'archive'/);
  assert.match(page, /listingDefaultYear = archiveListingRequested \? 'all' : defaultYear/);
  assert.match(page, /selected=\{committee\.id === requestedCommitteeId\}/);
  assert.match(page, /resolved\?\.type==='listing'/);
});

test('archive listing renders every eligible yearly record dynamically in newest-first order', () => {
  const yearlyArchives = [
    { archiveId: 'archive-2022.md', committeeId: 'archive', year: 2022, published: true, status: 'current' },
    { archiveId: 'archive-2023.md', committeeId: 'archive', year: 2023, published: true, status: 'current' },
    { archiveId: 'archive-2024.md', committeeId: 'archive', year: 2024, published: true, status: 'current' },
    { archiveId: 'archive-2025.md', committeeId: 'archive', year: 2025, published: true, status: 'current' },
    { archiveId: 'archive-2026.md', committeeId: 'archive', year: 2026, published: true, status: 'current' },
    { archiveId: 'archive-draft-2027.md', committeeId: 'archive', year: 2027, published: false, status: 'current' },
    { archiveId: 'archive-retired-2021.md', committeeId: 'archive', year: 2021, published: true, status: 'archived' },
  ];
  const eligible = yearlyArchives.filter(record => record.published !== false && record.status !== 'archived')
    .sort((a, b) => b.year - a.year);
  assert.deepEqual(eligible.map(record => record.year), [2026, 2025, 2024, 2023, 2022]);
  assert.match(page, /\.filter\(\(entry\) => entry\.data\.status !== 'archived' && entry\.data\.published !== false\)/);
  assert.match(page, /\.sort\(\(a, b\) => b\.data\.year - a\.data\.year/);
  assert.match(page, /archive\.map\(\(committee, index\)/);
  assert.doesNotMatch(page, /slice\(0,\s*\d+\)/);
});

test('archive listing direct load and refresh restore Archives & Documentation with All Years', () => {
  assert.match(page, /Astro\.url\.searchParams\.get\('committee'\) === 'archive'/);
  assert.match(page, /if\(committee\)committee\.value=resolved\.committeeId;if\(year\)year\.value='all';showListing\(\)/);
  assert.match(page, /syncFromLocation\(\);/);
  assert.match(page, /window\.addEventListener\('popstate',syncFromLocation\)/);
});

test('archive listing selection composes with search and year filters and preserves the existing filter implementation', () => {
  assert.match(page, /matchesCommitteeFilters\(/);
  assert.match(page, /const filters=\{query:search\?\.value\.trim\(\)\.toLowerCase\(\)\|\|'',year:year\?\.value\|\|'all',committeeId:committee\?\.value\|\|'all'\}/);
  assert.match(page, /document\.querySelectorAll<HTMLElement>\('\[data-committee-card\]'\)/);
  assert.match(page, /resetCommitteeFilters\(year\?\.dataset\.defaultYear\|\|'all'\)/);
});

test('archive detail deep links remain exact and browser Back/Forward restores listing and detail states', () => {
  assert.equal(resolveCommitteeDeepLink(records, '?archive=archive-2025')?.record.archiveId, 'archive-2025.md');
  assert.equal(resolveCommitteeDeepLink(records, '?committee=archive')?.type, 'listing');
  assert.match(page, /url\.searchParams\.set\(param,value\)/);
  assert.match(page, /window\.addEventListener\('popstate',syncFromLocation\)/);
  assert.match(page, /function syncFromLocation\(\)/);
});
