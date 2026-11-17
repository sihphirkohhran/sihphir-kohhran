export type HistoricalYearType = 'known' | 'approximate' | 'unspecified';

export function resolveHistoricalYearType(year: number | null | undefined, yearType?: HistoricalYearType | null): HistoricalYearType {
  if (yearType === 'unspecified') return 'unspecified';
  const hasNumericYear = year != null && Number.isFinite(Number(year));
  if (yearType === 'approximate' || yearType === 'known') return hasNumericYear ? yearType : 'unspecified';
  return hasNumericYear ? 'known' : 'unspecified';
}

export function formatHistoricalYear(year: number | null | undefined, yearType?: HistoricalYearType | null): string {
  const type = resolveHistoricalYearType(year, yearType);
  if (type === 'unspecified' || year == null || !Number.isFinite(Number(year))) return 'Year Unspecified';
  return type === 'approximate' ? `Circa ${year}` : String(year);
}

export function historicalYearFilterValue(year: number | null | undefined, yearType?: HistoricalYearType | null): string {
  return resolveHistoricalYearType(year, yearType) === 'unspecified' ? 'unspecified' : String(year);
}
