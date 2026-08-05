import { renderMarkdown } from './markdown';
import { resolveMediaUrl } from './ministry';
import type { MinistryProfile } from '../components/MinistryArchive.astro';

type MinistryKind = 'pastor' | 'elder' | 'missionary';

export function normalizeMinistryProfile(entry: any, kind: MinistryKind): MinistryProfile | null {
  const data = entry.data || {};
  if (data.published === false || data.archived === true || (kind === 'pastor' && data.role === 'pro-pastor' && data.enabled === false)) return null;
  const start = Number(data.start_year ?? data.sent_year ?? data.ordained_year ?? data.year ?? 0);
  const end = Number(data.end_year || 0);
  const designation = data.designation || (kind === 'pastor' ? (data.role === 'pro-pastor' ? 'Probationary Pastor' : 'Bialtu Pastor') : kind === 'elder' ? 'Kohhran Upa' : 'Missionary');
  const period = kind === 'elder' && data.ordination_date ? `Ordained ${data.ordination_date}` : end ? `${start}–${end}` : kind === 'elder' ? `Ordained ${data.ordained_year}` : `${start}–Present`;
  const status = String(data.status || '').toLowerCase();
  const current = kind === 'pastor' ? !end : kind === 'elder' ? (!status || status === 'active' || status === 'current') : status === 'active' || status === 'current' || status === 'on furlough';
  const gallery = (Array.isArray(data.gallery) ? data.gallery : []).map((photo: any) => typeof photo === 'string' ? { src: resolveMediaUrl(photo), caption: data.name } : { src: resolveMediaUrl(photo.src || photo.photo), caption: photo.caption || photo.alt || data.name }).filter((photo: any) => photo.src);
  if (kind === 'missionary' && data.family_photo && !gallery.some((photo: any) => photo.src === resolveMediaUrl(data.family_photo))) gallery.push({ src: resolveMediaUrl(data.family_photo), caption: `${data.name} family` });
  return { id: entry.id, name: data.name, photo: resolveMediaUrl(data.photo || data.cover_photo), designation, period, year: start, status: data.status || '', description: data.short_description || data.notes || '', biographyHtml: renderMarkdown(data.biography || entry.body || data.notes), featured: Boolean(data.featured), current, gallery, documents: (Array.isArray(data.documents) ? data.documents : []).map(resolveMediaUrl).filter(Boolean), bibleVerse: data.bible_verse || data.motto || '', messageHtml: renderMarkdown(data.pastor_message), missionField: data.mission_field || '' };
}
