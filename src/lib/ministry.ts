/** Normalize CMS image paths to site-root URLs. */
export function resolveMediaUrl(src: string | undefined | null): string {
  if (!src?.trim()) return '';
  const s = src.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return s;
  return `/${s.replace(/^\.?\//, '')}`;
}

/** Years served (inclusive). When endYear is omitted, uses the current calendar year. */
export function yearsServed(startYear: number, endYear?: number | null): number {
  const end = endYear ?? new Date().getFullYear();
  if (!Number.isFinite(startYear) || !Number.isFinite(end) || end < startYear) return 0;
  return end - startYear + 1;
}

export function formatYearRange(startYear: number, endYear?: number | null): string {
  if (endYear && endYear >= startYear) return `${startYear} — ${endYear}`;
  return `${startYear} — Present`;
}

/** Compact range for labels, e.g. 2004–2010 */
export function formatServedYears(startYear: number, endYear?: number | null): string {
  if (endYear && endYear >= startYear) return `${startYear}–${endYear}`;
  return `${startYear}–Present`;
}

export const MISSIONARY_STATUSES = [
  'Active',
  'On furlough',
  'Retired',
  'Returned',
  'Deceased',
] as const;

export type MissionaryStatus = (typeof MISSIONARY_STATUSES)[number];
