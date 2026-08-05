import { renderMarkdown } from './markdown';
import { resolveMediaUrl } from './ministry';
export type MinistryProfile = { id:string; name:string; photo:string; familyPhoto:string; designation:string; period:string; year:number; startYear:number; endYear:number; ordinationYear:number; dateOfBirth:string; status:string; description:string; biographyHtml:string; featured:boolean; current:boolean; order:number; gallery:{src:string;caption:string}[]; documents:string[]; bibleVerse?:string; messageHtml?:string; missionField?:string; churchServed:string; education:string; familyInformation:string; phone:string; email:string; address:string; notes:string };

type MinistryKind = 'pastor' | 'pro' | 'probationary' | 'elder' | 'missionary';

export function normalizeMinistryProfile(entry: any, kind: MinistryKind): MinistryProfile | null {
  const data = entry.data || {};
  if (data.published === false || data.archived === true || (kind === 'probationary' && data.enabled === false)) return null;
  if (kind === 'pastor' && (data.role || 'pastor') !== 'pastor') return null;
  if (kind === 'probationary' && data.role !== 'pro-pastor') return null;
  const start = Number(data.start_year ?? data.sent_year ?? data.ordained_year ?? data.year ?? 0);
  const end = Number(data.end_year || 0);
  const designation = data.designation || (kind === 'pastor' ? 'Bialtu Pastor' : kind === 'pro' || kind === 'probationary' ? 'Pro Pastor' : kind === 'elder' ? 'Kohhran Upa' : 'Missionary');
  const period = kind === 'elder' && data.ordination_date ? `Ordained ${data.ordination_date}` : end ? `${start}–${end}` : kind === 'elder' ? `Ordained ${data.ordained_year}` : `${start}–Present`;
  const status = String(data.status || '').toLowerCase();
  const current = data.record_status ? data.record_status === 'Current' : kind === 'pastor' || kind === 'pro' || kind === 'probationary' ? !end : kind === 'elder' ? (!status || status === 'active' || status === 'current') : status === 'active' || status === 'current' || status === 'on furlough';
  const gallery = (Array.isArray(data.gallery) ? data.gallery : []).map((photo: any) => typeof photo === 'string' ? { src: resolveMediaUrl(photo), caption: data.name } : { src: resolveMediaUrl(photo.src || photo.photo), caption: photo.caption || photo.alt || data.name }).filter((photo: any) => photo.src);
  if (data.family_photo && !gallery.some((photo: any) => photo.src === resolveMediaUrl(data.family_photo))) gallery.push({ src: resolveMediaUrl(data.family_photo), caption: `${data.name} family` });
  const biographyHtml = renderMarkdown(data.biography || entry.body || data.notes) + (data.prayer_requests ? `<h3>Prayer Requests</h3>${renderMarkdown(data.prayer_requests)}` : '');
  return { id: entry.id.replace(/\.(md|json)$/i,'').replace(/[^a-z0-9]+/gi,'-'), name: data.name, photo: resolveMediaUrl(data.photo || data.cover_photo), familyPhoto: resolveMediaUrl(data.family_photo), designation, period, year: start, startYear:Number(data.start_year||start), endYear:end, ordinationYear:Number(data.ordination_year||data.ordained_year||0), dateOfBirth:data.date_of_birth||'', status: data.status || '', description: data.short_description || data.notes || '', biographyHtml, featured: false, current, order:Number(data.display_order||0), gallery, documents: (Array.isArray(data.documents) ? data.documents : []).map(resolveMediaUrl).filter(Boolean), bibleVerse: data.bible_verse || data.motto || '', messageHtml: renderMarkdown(data.pastor_message), missionField: data.mission_field || '', churchServed:data.church_served||'', education:data.education||'', familyInformation:data.family_information||'', phone:data.phone||data.contact||'', email:data.email||'', address:data.address||'', notes:data.notes||'' };
}
