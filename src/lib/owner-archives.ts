import type { CollectionEntry } from 'astro:content';
import { uniqueGalleryPhotos, shouldOpenExternalAlbum } from './gallery-navigation';
import { formatHistoricalYear, historicalYearFilterValue, resolveHistoricalYearType } from './historical-year';
import { normalizeContentEntryId } from './content-deep-links';
import { resolveDocumentUrl, resolvePreferredDocumentUrl } from './documents-url';
import { parseMonthFromDate, parseYearFromDate, parseYearMonthFromId } from './archive';
import { ownedBy } from './content-ownership';

type GalleryEntry = CollectionEntry<'gallery'>;
type DocumentEntry = CollectionEntry<'documents'>;

const photoSource = (photo: any): string => String(typeof photo === 'string' ? photo : photo?.src ?? photo?.photo ?? '').trim();

export function buildOwnerAlbums(entries: GalleryEntry[], owner: string) {
  return ownedBy(entries, owner).map(entry => {
    const data = entry.data;
    const raw: any[] = data.photos?.length ? data.photos : data.photo ? [data.photo] : [];
    const photos = uniqueGalleryPhotos(raw.map(photo => typeof photo === 'string'
      ? { src: photoSource(photo), alt: data.caption, caption: data.caption }
      : { src: photoSource(photo), alt: photo.alt || data.caption, caption: photo.caption || data.caption })
      .filter(photo => photo.src));
    const featuredPhoto = photoSource(data.photo);
    if (featuredPhoto && !photos.some(photo => photo.src === featuredPhoto)) {
      photos.unshift({ src: featuredPhoto, alt: data.caption, caption: data.caption });
    }
    const yearType = resolveHistoricalYearType(data.year, data.yearType);
    const year = yearType === 'unspecified' ? null : (data.year ?? null);
    const albumUrl = String(data.album_url || '').trim();
    return {
      id: normalizeContentEntryId(entry.id), title: data.caption,
      description: data.description || '', category: data.category || 'Other',
      year, yearType, yearLabel: formatHistoricalYear(year, yearType),
      yearFilterValue: historicalYearFilterValue(year, yearType),
      date: data.date || '', featured: Boolean((data as typeof data & {featured?: boolean}).featured),
      order: data.display_order ?? Number.MAX_SAFE_INTEGER,
      cover: featuredPhoto || photos[0]?.src || '/images/profile-placeholder.svg',
      photos, albumUrl, externalNavigation: shouldOpenExternalAlbum(photos.length, albumUrl),
    };
  }).sort((a,b) => (b.year ?? -Infinity) - (a.year ?? -Infinity) || a.order - b.order || a.title.localeCompare(b.title));
}

function filenameFromUrl(value: string): string {
  try {
    const pathname = /^https?:/i.test(value) ? new URL(value).pathname : value;
    return decodeURIComponent(pathname.split('/').pop() || 'Document');
  } catch { return value.split('/').pop() || 'Document'; }
}
const extension = (value: string) => value.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || 'file';

function sortDocumentDate(value: string | undefined, year: number | null, month: number | null, id: string): string {
  const text = String(value || '').trim();
  const dayFirst = text.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2].padStart(2,'0')}-${dayFirst[1].padStart(2,'0')}`;
  const parsed = Date.parse(text);
  if (text && !Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return `${String(year ?? 0).padStart(4,'0')}-${String(month ?? 0).padStart(2,'0')}-${id}`;
}

export function buildOwnerDocuments(entries: DocumentEntry[], owner: string) {
  return ownedBy(entries, owner).map(entry => {
    const data = entry.data;
    const preferred = resolvePreferredDocumentUrl(data);
    if (!preferred) return null;
    const stored = Array.isArray(data.files) ? data.files : [];
    const uploaded = stored.map(file => ({
      url: resolveDocumentUrl(file.url), filename: file.filename || filenameFromUrl(file.url),
      size: file.size ?? null,
      type: /^[a-z0-9]{2,8}$/i.test(file.type || '') ? String(file.type).toLowerCase() : extension(file.filename || file.url),
      uploadedAt: file.uploaded_at || '', modifiedAt: file.modified_at || '',
    })).filter(file => file.url);
    const legacyUpload = data.pdf_url && !/^https?:\/\//i.test(data.pdf_url) ? resolveDocumentUrl(data.pdf_url) : '';
    if (legacyUpload && !uploaded.some(file => file.url === legacyUpload)) {
      uploaded.unshift({ url: legacyUpload, filename: filenameFromUrl(legacyUpload), size: null, type: extension(legacyUpload), uploadedAt: '', modifiedAt: '' });
    }
    // Respect the selected source. An explicit upload never falls back to stale external metadata.
    const useExternal = data.document_source === 'external'
      || (!data.document_source && !uploaded.length);
    const files = useExternal
      ? [{ url: preferred, filename: 'Open Document', size: null, type: 'external', uploadedAt: '', modifiedAt: '' }]
      : uploaded.filter(file => file.url);
    if (!files.length) return null;
    const fromId = parseYearMonthFromId(entry.id);
    const historicalYear = data.year ?? fromId.year ?? parseYearFromDate(data.date) ?? null;
    const yearType = resolveHistoricalYearType(historicalYear, data.yearType);
    const year = yearType === 'unspecified' ? null : historicalYear;
    const month = data.month ?? fromId.month ?? parseMonthFromDate(data.date) ?? null;
    const sortDate = sortDocumentDate(files[0]?.uploadedAt || files[0]?.modifiedAt || data.date, year, month, entry.id);
    return {
      id: normalizeContentEntryId(entry.id), title: data.name,
      description: String(data.description || entry.body || '').replace(/<[^>]*>/g,'').trim(),
      category: String(data.category || 'Other'), year, yearType,
      yearLabel: formatHistoricalYear(year, yearType),
      yearFilterValue: historicalYearFilterValue(year, yearType),
      date: data.date || '', sortDate,
      featured: Boolean(data.featured), pinned: Boolean(data.pinned),
      files, fileCount: files.length, url: preferred,
      extension: files[0].type === 'external' ? 'file' : extension(files[0].filename),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a,b) => b.sortDate.localeCompare(a.sortDate));
}
