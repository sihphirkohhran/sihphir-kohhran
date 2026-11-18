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

test('Committee Copy Links resolve to a filtered listing rather than opening the latest yearly detail', () => {
  assert.equal(getLatestPublishedCommitteeRecord(records, 'pes')?.archiveId, 'pes-2026.md');
  assert.deepEqual(resolveCommitteeDeepLink(records, '?committee=pes', ['pes', 'archive']), {
    type: 'committee', committeeId: 'pes',
  });
  assert.deepEqual(resolveCommitteeDeepLink(records, '?committee=archive', ['pes', 'archive']), {
    type: 'committee', committeeId: 'archive',
  });
  assert.equal(resolveCommitteeDeepLink(records, '?committee=missing', ['pes', 'archive']), null);
});

test('archive links resolve the exact historical record and take precedence over Committee filter parameters', () => {
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-2024')?.record.year, 2024);
  assert.equal(resolveCommitteeDeepLink(records, '?committee=archive&archive=pes-2024', ['pes', 'archive'])?.type, 'archive');
  assert.equal(resolveCommitteeDeepLink(records, '?committee=archive&archive=pes-2024', ['pes', 'archive'])?.record.year, 2024);
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

test('direct-entry Committee links select the listing filter and archive links still open one exact record', () => {
  assert.equal(resolveCommitteeDeepLink(records, '?committee=pes', ['pes'])?.type, 'committee');
  assert.equal(resolveCommitteeDeepLink(records, '?archive=pes-2024')?.record.year, 2024);
  assert.match(page, /syncFromLocation\(\);/);
  assert.match(page, /resolved\?\.type==='committee'/);
  assert.match(page, /year\.value='all'/);
  assert.match(page, /committee\.value=resolved\.committeeId/);
  assert.match(page, /search\.value=''/);
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
  assert.match(page, /resolveCommitteeDeepLink\(linkRecords,window\.location\.search,availableCommitteeIds\)/);
});
