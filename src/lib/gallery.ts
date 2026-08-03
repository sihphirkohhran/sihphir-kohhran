import { getCollection } from 'astro:content';

/** Normalize gallery photo field(s) from CMS (single or multiple). */
export function getEntryPhotoUrls(data: {
  photo?: string;
  photos?: (string | { photo?: string; src?: string })[];
}): string[] {
  if (data.photos?.length) {
    return data.photos
      .map((p) => {
        if (typeof p === 'string') return p;
        return p.photo ?? p.src ?? '';
      })
      .filter(Boolean);
  }
  if (data.photo) return [data.photo];
  return [];
}

export type GalleryPhotoItem = {
  src: string;
  alt: string;
  caption: string;
  category: string;
  year: number;
  sortKey: string;
};

function entrySortKey(year: number, date?: string, id?: string): string {
  const datePart = date ? String(date).replace(/\D/g, '') : '';
  return `${year}-${datePart}-${id ?? ''}`;
}

/** All gallery images from CMS, newest entries first. */
export async function loadGalleryPhotos(): Promise<GalleryPhotoItem[]> {
  const entries = await getCollection('gallery');
  const photos: GalleryPhotoItem[] = [];

  for (const entry of entries) {
    const urls = getEntryPhotoUrls(entry.data);
    const sortKey = entrySortKey(entry.data.year, entry.data.date, entry.id);
    urls.forEach((src) => {
      photos.push({
        src,
        alt: entry.data.caption,
        caption: entry.data.caption,
        category: entry.data.category,
        year: entry.data.year,
        sortKey,
      });
    });
  }

  return photos.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

/**
 * Pick photos for the home page: prefer newest, spread across categories
 * so one category does not dominate the grid.
 */
export function pickHomeGalleryPhotos(
  photos: GalleryPhotoItem[],
  limit = 6,
): GalleryPhotoItem[] {
  if (!photos.length) return getFallbackGalleryPhotos(limit);

  const byCategory = new Map<string, GalleryPhotoItem[]>();
  for (const photo of photos) {
    const key = photo.category || 'Other';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(photo);
  }

  const categories = [...byCategory.keys()].sort((a, b) => {
    const aNewest = byCategory.get(a)![0].sortKey;
    const bNewest = byCategory.get(b)![0].sortKey;
    return bNewest.localeCompare(aNewest);
  });

  const picked: GalleryPhotoItem[] = [];
  const usedSrc = new Set<string>();
  let round = 0;

  while (picked.length < limit && round < 50) {
    for (const cat of categories) {
      const list = byCategory.get(cat)!;
      const photo = list[round];
      if (photo && !usedSrc.has(photo.src)) {
        picked.push(photo);
        usedSrc.add(photo.src);
        if (picked.length >= limit) break;
      }
    }
    round++;
  }

  for (const photo of photos) {
    if (picked.length >= limit) break;
    if (!usedSrc.has(photo.src)) {
      picked.push(photo);
      usedSrc.add(photo.src);
    }
  }

  return picked.slice(0, limit);
}

const FALLBACK_IMAGES = [
  { src: '/images/church.jpg', alt: 'Kohhran Biak In', caption: 'Kohhran Biak In' },
  { src: '/images/church2.jpg', alt: 'Kohhran', caption: 'Kohhran' },
  { src: '/images/biak-in-2.jpg', alt: 'Biak In', caption: 'Biak In' },
  { src: '/images/biak-in-chhung.jpg', alt: 'Biak In chhung', caption: 'Biak In chhung' },
  { src: '/images/kohhran-hall.jpg', alt: 'Kohhran Hall', caption: 'Kohhran Hall' },
  { src: '/images/pastor.jpg', alt: 'Pastor', caption: 'Pastor' },
];

export function getFallbackGalleryPhotos(limit = 6): GalleryPhotoItem[] {
  const year = new Date().getFullYear();
  return FALLBACK_IMAGES.slice(0, limit).map((img, i) => ({
    src: img.src,
    alt: img.alt,
    caption: img.caption,
    category: 'Gallery',
    year,
    sortKey: `${year}-${i}`,
  }));
}
