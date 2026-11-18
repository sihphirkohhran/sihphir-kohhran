import { normalizeContentEntryId } from './content-deep-links.js';

export function normalizeCommitteeArchiveId(identifier) {
  return normalizeContentEntryId(identifier);
}

export function committeeArchiveIdMatches(entryId, requestedId) {
  const requested = normalizeCommitteeArchiveId(requestedId);
  return Boolean(requested) && normalizeCommitteeArchiveId(entryId) === requested;
}

export function getLatestPublishedCommitteeRecord(records = [], committeeId) {
  const id = String(committeeId ?? '').trim();
  if (!id) return null;
  return records
    .filter(record => String(record.committeeId ?? record.committee_id ?? '') === id
      && record.status !== 'archived'
      && record.published !== false)
    .slice()
    .sort((a, b) => Number(b.year) - Number(a.year)
      || Number(a.displayOrder ?? a.display_order ?? 999) - Number(b.displayOrder ?? b.display_order ?? 999))[0] ?? null;
}

export function resolveCommitteeDeepLink(records = [], search = '') {
  const params = new URLSearchParams(search);
  const archiveId = params.get('archive');
  if (archiveId?.trim()) {
    const record = records.find(item => committeeArchiveIdMatches(item.archiveId ?? item.id ?? '', archiveId)
      && item.status !== 'archived' && item.published !== false);
    return record ? { type: 'archive', record } : null;
  }
  const committeeId = params.get('committee');
  if (committeeId?.trim()) {
    if (committeeId === 'archive') return { type: 'listing', committeeId: 'archive' };
    const record = getLatestPublishedCommitteeRecord(records, committeeId);
    return record ? { type: 'committee', record } : null;
  }
  return null;
}

/**
 * Build the canonical Committee listing URL from the current location.
 * Preserve unrelated query parameters, but remove detail selectors and legacy hashes.
 */
export function getCommitteeListingUrl(currentUrl) {
  const url = new URL(currentUrl, 'https://sihphirpresbyteriankohhran.org');
  url.searchParams.delete('committee');
  url.searchParams.delete('archive');
  url.hash = '';
  return url;
}
