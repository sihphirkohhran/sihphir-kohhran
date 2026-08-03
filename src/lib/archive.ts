/** Archive helpers — year/month parsing and filter utilities */

export function parseYearFromDate(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const m = String(dateStr).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseMonthFromDate(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const parts = String(dateStr).split(/[.\-/]/);
  if (parts.length >= 2) {
    const month = parseInt(parts[1], 10);
    if (month >= 1 && month <= 12) return month;
  }
  return null;
}

export function parseYearMonthFromId(id: string): { year: number | null; month: number | null } {
  const m = id.match(/^(\d{4})-(\d{2})/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
  return { year: null, month: null };
}

export function getUniqueYears(values: (number | null)[]): number[] {
  return [...new Set(values.filter((y): y is number => y != null))].sort((a, b) => b - a);
}

export function getUniqueMonthsForYear(
  items: { year: number | null; month: number | null }[],
  year: number,
): number[] {
  return [
    ...new Set(
      items
        .filter((i) => i.year === year && i.month != null)
        .map((i) => i.month as number),
    ),
  ].sort((a, b) => b - a);
}

export const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
