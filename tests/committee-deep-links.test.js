import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  committeeArchiveIdMatches,
  getLatestPublishedCommitteeRecord,
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
  assert.equal(resolveCommitteeDeepLink(records, '?committee=archive')?.record.archiveId, 'archive-2025.md');
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
  const closingTag = page.slice(page.indexOf('</script'), page.indexOf('</script') + 9);\n  assert.equal(closingTag, '</script>');
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
  assert.match(page, /history\.replaceState\(/);
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
