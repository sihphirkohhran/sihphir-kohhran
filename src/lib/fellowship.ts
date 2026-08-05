export type FellowshipGroupPhoto = {
  year: number;
  photo: string;
};

export function resolveGroupPhotos(data: {
  group_photo?: string;
  group_photos?: FellowshipGroupPhoto[];
}): FellowshipGroupPhoto[] {
  const list = [...(data.group_photos ?? [])].filter((g) => g.photo);
  if (data.group_photo && !list.some((g) => g.photo === data.group_photo)) {
    list.push({ year: new Date().getFullYear(), photo: data.group_photo });
  }
  return list.sort((a, b) => b.year - a.year);
}

const contentId = (path: string) => path.split('/').pop()?.replace(/\.(md|json)$/i, '') ?? path;

export function resolveRelatedGalleryPhotos(entries: any[], paths: string[] = []) {
  const selected = new Set(paths.map(contentId));
  return entries.filter((entry) => selected.has(contentId(entry.id))).flatMap((entry) => {
    const photos = Array.isArray(entry.data.photos) ? entry.data.photos : [];
    const values = photos.length ? photos : [entry.data.photo].filter(Boolean);
    return values.map((photo: any) => ({
      src: typeof photo === 'string' ? photo : photo.src || photo.photo,
      caption: typeof photo === 'string' ? entry.data.caption : photo.caption || photo.alt || entry.data.caption,
    })).filter((photo: any) => photo.src);
  }).slice(0, 8);
}

export function resolveRelatedDocuments(entries: any[], paths: string[] = []) {
  const selected = new Set(paths.map(contentId));
  return entries.filter((entry) => selected.has(contentId(entry.id))).map((entry) => ({
    name: entry.data.name || entry.data.title || contentId(entry.id),
    url: entry.data.pdf_url || entry.data.file_url || entry.data.url || '',
    category: entry.data.category || 'Document',
  })).filter((document) => document.url);
}
