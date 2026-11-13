import { renderSafeRichText } from './markdown';
import { resolveMediaUrl } from './ministry';

export type ElderProfile = {
  id: string; name: string; photo: string; dateOfBirth: string; birthYear: number; birthPrecision: 'full_date' | 'year_only' | 'unknown';
  dateOfDeath: string; deathYear: number; deathPrecision: 'full_date' | 'year_only' | 'unknown';
  lifespan: string; ordinationYear: number; presbytery: string; current: boolean;
  biographyHtml: string; searchText: string; order: number;
};

const yearFrom = (value: unknown): number => {
  const match = String(value ?? '').trim().match(/^(\d{4})(?:-\d{2}-\d{2})?$/);
  return match ? Number(match[1]) : 0;
};

export function normalizeElderProfile(entry: any): ElderProfile | null {
  const data = entry.data || {};
  if (data.published === false || data.archived === true) return null;

  const rawBirthDate = String(data.date_of_birth || '').trim();
  const rawBirthYear = Number(data.date_of_birth_year || 0);
  const requestedBirthPrecision = data.date_of_birth_precision;
  const birthPrecision: ElderProfile['birthPrecision'] =
    requestedBirthPrecision === 'full_date' || requestedBirthPrecision === 'year_only' || requestedBirthPrecision === 'unknown'
      ? requestedBirthPrecision
      : /^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate)
        ? 'full_date'
        : /^\d{4}$/.test(rawBirthDate) || rawBirthYear > 0
          ? 'year_only'
          : 'unknown';
  const dateOfBirth = birthPrecision === 'full_date' && /^\d{4}-\d{2}-\d{2}$/.test(rawBirthDate) ? rawBirthDate : '';
  const birthYear = birthPrecision === 'full_date'
    ? yearFrom(dateOfBirth)
    : birthPrecision === 'year_only'
      ? (rawBirthYear || yearFrom(rawBirthDate))
      : 0;
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
    yearFrom(data.ordination_date) || 0
  );
  const status = String(data.status || '').toLowerCase();
  const hasDeathRecord = deathPrecision === 'full_date'
    ? Boolean(dateOfDeath)
    : deathPrecision === 'year_only' && deathYear > 0;
  const deceased = hasDeathRecord || /deceased|dead|passed away/.test(status);
  const current = !deceased && (data.record_status
    ? data.record_status === 'Current'
    : !/former|retired|transferred|inactive|archived/.test(status));

  const lifespan = birthYear > 0 && deathYear > 0 && deathYear >= birthYear
    ? birthYear + '–' + deathYear
    : birthYear > 0 && deathYear === 0
      ? birthYear + '–'
      : birthYear === 0 && deathYear > 0
        ? '–' + deathYear
        : '';

  const searchText = [data.name, data.designation, data.short_description, data.notes, data.nemnghettu_presbytery, data.biography, entry.body]
    .filter(Boolean).join(' ').toLowerCase();
  const biographySource = data.biography !== undefined ? data.biography : entry.body || data.notes;

  return {
    id: String(entry.id || '').replace(/\.(md|json)$/i, '').replace(/[^a-z0-9]+/gi, '-'),
    name: String(data.name || 'Unnamed elder'),
    photo: resolveMediaUrl(data.photo || data.profile_photo || data.profile_image || data.cover_photo) || '/images/profile-placeholder.svg',
    dateOfBirth, birthYear, birthPrecision, dateOfDeath, deathYear, deathPrecision, lifespan,
    ordinationYear: Number.isFinite(ordinationYear) && ordinationYear > 0 ? ordinationYear : 0,
    presbytery: String(data.nemnghettu_presbytery || ''),
    current,
    biographyHtml: renderSafeRichText(biographySource),
    searchText,
    order: Number(data.display_order || 0),
  };
}
