import {
  parseMonthFromDate,
  parseYearFromDate,
  parseYearMonthFromId,
} from './archive';

export type DocumentItem = {
  id: string;
  name: string;
  url: string;
  date: string;
  year: number | null;
  month: number | null;
  pinned: boolean;
  featured: boolean;
  isNew: boolean;
  sortKey: string;
};

export type DocumentCategory = {
  id: string;
  name: string;
  badge: string;
  items: DocumentItem[];
  hasYearFilter: boolean;
  hasMonthFilter: boolean;
};

export type DocSortOrder = 'newest' | 'oldest';

export function normalizeCategoryMatch(
  docCategory: string | undefined,
  cat: { id: string; name: string },
): boolean {
  if (!docCategory) return false;
  const norm = docCategory.trim().toLowerCase();
  return norm === cat.name.trim().toLowerCase() || norm === cat.id.trim().toLowerCase();
}

export function buildSortKey(date: string | undefined, id: string): string {
  if (date) return date;
  return id;
}

export function toDocumentItem(
  raw: {
    id: string;
    name: string;
    pdf_url: string;
    date?: string;
    year?: number | null;
    month?: number | null;
    pinned?: boolean;
    featured?: boolean;
    is_new?: boolean;
  },
  idPrefix = '',
): DocumentItem {
  const id = idPrefix ? raw.id.replace(new RegExp(`^${idPrefix}`), '') : raw.id;
  const fromId = parseYearMonthFromId(id);
  const year =
    raw.year ??
    fromId.year ??
    parseYearFromDate(raw.date) ??
    null;
  const month = raw.month ?? fromId.month ?? parseMonthFromDate(raw.date) ?? null;

  return {
    id,
    name: String(raw.name),
    url: String(raw.pdf_url),
    date: String(raw.date ?? ''),
    year,
    month,
    pinned: Boolean(raw.pinned),
    featured: Boolean(raw.featured),
    isNew: Boolean(raw.is_new),
    sortKey: buildSortKey(raw.date, id),
  };
}

export function sortDocumentItems(items: DocumentItem[], order: DocSortOrder): DocumentItem[] {
  const pinned = items.filter((i) => i.pinned);
  const rest = items.filter((i) => !i.pinned);
  const cmp = (a: DocumentItem, b: DocumentItem) => {
    const diff = b.sortKey.localeCompare(a.sortKey);
    return order === 'newest' ? diff : -diff;
  };
  return [...pinned.sort(cmp), ...rest.sort(cmp)];
}

/** Mark the newest non-pinned item in each category as "latest" for badge display */
export function markLatestInCategory(items: DocumentItem[]): Set<string> {
  const latest = new Set<string>();
  if (!items.length) return latest;
  const sorted = sortDocumentItems(items, 'newest');
  const candidate = sorted.find((i) => !i.pinned) ?? sorted[0];
  if (candidate) latest.add(candidate.id);
  return latest;
}

export function categoryHasMonthData(items: DocumentItem[]): boolean {
  return items.some((i) => i.month != null);
}

export function categoryHasYearData(items: DocumentItem[]): boolean {
  return items.some((i) => i.year != null);
}

export type HomeDocumentSection = {
  id: string;
  category: string;
  badge: string;
  items: { name: string; url: string; date: string }[];
  totalCount: number;
  archiveLink: string;
  latestSortKey: string;
};

const HOME_PREVIEW_LIMIT = 3;

/** Home page: KTP Inleng first, then other categories by latest upload (newest 3 each). */
export function buildHomeDocumentSections(
  ktpRaw: {
    id: string;
    name: string;
    pdf_url: string;
    date?: string;
    year?: number | null;
    month?: number | null;
    pinned?: boolean;
  }[],
  otherRaw: {
    id: string;
    name: string;
    pdf_url: string;
    date?: string;
    year?: number | null;
    month?: number | null;
    pinned?: boolean;
    category?: string;
  }[],
  registry: { id: string; name: string; badge?: string }[],
  previewLimit = HOME_PREVIEW_LIMIT,
): HomeDocumentSection[] {
  const ktpItems = sortDocumentItems(
    ktpRaw.map((d) =>
      toDocumentItem({
        id: d.id,
        name: d.name,
        pdf_url: d.pdf_url,
        date: d.date,
        year: d.year,
        month: d.month,
        pinned: d.pinned,
      }),
    ),
    'newest',
  );

  const ktpSection: HomeDocumentSection = {
    id: 'ktp-inleng',
    category: 'KTP Inleng',
    badge: 'Weekly · Archived',
    items: ktpItems.slice(0, previewLimit).map((d) => ({
      name: d.name,
      url: d.url,
      date: d.date,
    })),
    totalCount: ktpItems.length,
    archiveLink: '/document#cat-ktp-inleng',
    latestSortKey: ktpItems[0]?.sortKey ?? '',
  };

  const otherSections = registry
    .map((cat) => {
      const all = sortDocumentItems(
        otherRaw
          .filter((d) => normalizeCategoryMatch(d.category, cat))
          .map((d) =>
            toDocumentItem({
              id: d.id,
              name: d.name,
              pdf_url: d.pdf_url,
              date: d.date,
              year: d.year,
              month: d.month,
              pinned: d.pinned,
            }),
          ),
        'newest',
      );

      return {
        id: cat.id,
        category: cat.name,
        badge: cat.badge ?? 'Archive',
        items: all.slice(0, previewLimit).map((d) => ({
          name: d.name,
          url: d.url,
          date: d.date,
        })),
        totalCount: all.length,
        archiveLink: `/document#cat-${cat.id}`,
        latestSortKey: all[0]?.sortKey ?? '',
      };
    })
    .filter((s) => s.totalCount > 0)
    .sort((a, b) => b.latestSortKey.localeCompare(a.latestSortKey));

  return [ktpSection, ...otherSections];
}
