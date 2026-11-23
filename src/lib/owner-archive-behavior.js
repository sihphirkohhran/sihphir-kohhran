/** Shared interactive archive filters and sorting, operating on presentation metadata. */
export function archiveRecordMatches(record, { search = '', category = 'all', year = 'all' } = {}) {
  const term = String(search).trim().toLowerCase();
  return (!term || String(record.search || '').toLowerCase().includes(term))
    && (category === 'all' || record.category === category)
    && (year === 'all' || record.year === year);
}

export function compareArchiveAlbums(a, b, sort = 'newest') {
  if (sort === 'az' || sort === 'za') {
    const diff = String(a.title || '').localeCompare(String(b.title || ''));
    return sort === 'az' ? diff : -diff;
  }
  if (sort === 'photos') return Number(b.photoCount || 0) - Number(a.photoCount || 0);
  const ay = a.sortYear === '' || a.sortYear == null ? null : Number(a.sortYear);
  const by = b.sortYear === '' || b.sortYear == null ? null : Number(b.sortYear);
  // Unknown dates remain at the end even when sorting oldest first.
  if (ay === null || by === null) return ay === by ? 0 : ay === null ? 1 : -1;
  return sort === 'oldest' ? ay - by : by - ay;
}

export function compareArchiveDocuments(a, b, sort = 'newest') {
  if (sort === 'title') return String(a.sortTitle || '').localeCompare(String(b.sortTitle || ''));
  const diff = String(b.sortDate || '').localeCompare(String(a.sortDate || ''));
  return sort === 'oldest' ? -diff : diff;
}
