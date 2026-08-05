import type { CollectionEntry } from 'astro:content';

type FellowshipEntry = CollectionEntry<'fellowship'>;

export function fellowshipRecords(entries: FellowshipEntry[], slug: string) {
  return entries
    .filter((entry) => (entry.data.slug ?? entry.id.replace(/-\d{4}$/, '')) === slug)
    .filter((entry) => entry.data.published !== false)
    .filter((entry) => entry.data.status !== 'archived')
    .sort((a, b) => {
      const current = Number(b.data.status === 'current') - Number(a.data.status === 'current');
      return current || (b.data.year ?? 0) - (a.data.year ?? 0);
    });
}

export function currentFellowshipRecord(entries: FellowshipEntry[], slug: string) {
  return fellowshipRecords(entries, slug)[0];
}
