export function getCommitteeOptions(masterCommittees = [], publicRecords = []) {
  const availableIds = new Set(publicRecords.map((record) => String(record.committeeId ?? record.committee_id ?? '')).filter(Boolean));
  return masterCommittees
    .filter((committee) => availableIds.has(String(committee.id)))
    .slice()
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
    .map(({ id, name }) => ({ id: String(id), name }));
}

export function getDefaultCommitteeYear(years = []) {
  if (!years.length) return 'all';
  return String([...years].sort((a, b) => Number(b) - Number(a))[0]);
}

export function matchesCommitteeFilters(record, filters = {}) {
  const query = String(filters.query ?? '').trim().toLowerCase();
  const year = String(filters.year ?? 'all');
  const committeeId = String(filters.committeeId ?? 'all');
  return (!query || String(record.name ?? '').toLowerCase().includes(query))
    && (year === 'all' || String(record.year ?? '') === year)
    && (committeeId === 'all' || String(record.committeeId ?? '') === committeeId);
}

export function getFilteredCommitteeRecords(records = [], filters = {}) {
  return records.filter((record) => matchesCommitteeFilters(record, filters));
}

export function resetCommitteeFilters(defaultYear = 'all') {
  return { query: '', year: String(defaultYear || 'all'), committeeId: 'all' };
}
