import { renderSafeRichText } from './markdown';
import { resolveMediaUrl } from './ministry';

export type ElderProfile = {
  id: string; name: string; photo: string; dateOfBirth: string; birthYear: number;
  dateOfDeath: string; deathYear: number; deathPrecision: 'full_date' | 'year_only' | 'unknown';
  lifespan: string; ordinationYear: number; presbytery: string; current: boolean;
  biographyHtml: string; order: number;
};

const yearFrom = (value: unknown): number => {
  const match = String(value ?? '').trim().match(/^(\d{4})(?:-\d{2}-\d{2})?$/);
  return match ? Number(match[1]) : 0;
};

export function normalizeElderProfile(entry: any): ElderProfile | null {
  const data = entry.data || {};
  if (data.published === false || data.archived === true) return null;

  const dateOfBirth = String(data.date_of_birth || '').trim();
  const birthYear = yearFrom(dateOfBirth);
  const rawDeathDate = String(data.date_of_death || '').trim();
  const rawDeathYear = Number(data.date_of_death_year || 0);
  const requestedPrecision = data.date_of_death_precision;
  const deathPrecision: ElderProfile['deathPrecision'] =
    requestedPrecision === 'full_date' || requestedPrecision === 'year_only' || requestedPrecision === 'unknown'
      ? requestedPrecision
      : /^\d{4}-\d{2}-\d{2}$/.test(rawDeathDate)
        ? 'full_date'
        : /^\d{4}$/.test(rawDeathDate) || rawDeathYear > 0
          ? 'year_only'
          : 'unknown';

  const dateOfDeath = deathPrecision === 'full_date' && /^\d{4}-\d{2}-\d{2}$/.test(rawDeathDate) ? rawDeathDate : '';
  const deathYear = deathPrecision === 'full_date'
    ? yearFrom(dateOfDeath)
    : deathPrecision === 'year_only'
      ? (rawDeathYear || yearFrom(rawDeathDate))
      : 0;

  const ordinationYear = Number(
    data.ordained_year || data.legacy_ordained_year || data.ordination_year ||
    yearFrom(data.ordination_date) || data.start_year || data.year || 0
  );
  const status = String(data.status || '').toLowerCase();
  const hasDeathRecord = deathPrecision === 'full_date'
    ? Boolean(dateOfDeath)
    : deathPrecision === 'year_only' && deathYear > 0;
  const deceased = hasDeathRecord || /deceased|dead|passed away/.test(status);
  const current = !deceased && (data.record_status
    ? data.record_status === 'Current'
    : !/former|retired|transferred|inactive|archived/.test(status));

  const lifespan = birthYear > 0 && deathYear >= birthYear && deathYear > 0
    ? birthYear + '–' + deathYear
    : '';

  return {
    id: String(entry.id || '').replace(/\.(md|json)$/i, '').replace(/[^a-z0-9]+/gi, '-'),
    name: String(data.name || 'Unnamed elder'),
    photo: resolveMediaUrl(data.photo || data.profile_photo || data.profile_image || data.cover_photo) || '/images/profile-placeholder.svg',
    dateOfBirth, birthYear, dateOfDeath, deathYear, deathPrecision, lifespan,
    ordinationYear: Number.isFinite(ordinationYear) && ordinationYear > 0 ? ordinationYear : 0,
    presbytery: String(data.nemnghettu_presbytery || ''),
    current,
    biographyHtml: renderSafeRichText(data.biography || entry.body || data.notes),
    order: Number(data.display_order || 0),
  };
}
