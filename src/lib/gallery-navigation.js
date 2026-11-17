/**
 * Gallery card navigation is external only for albums with zero or one
 * unique actual photo source and a valid absolute HTTP(S) album URL.
 */
export function uniqueGalleryPhotos(photos = []) {
  const seen = new Set();
  return photos.filter((photo) => {
    const src = String(typeof photo === 'string' ? photo : photo?.src ?? photo?.photo ?? '').trim();
    if (!src || seen.has(src)) return false;
    seen.add(src);
    return true;
  });
}

export function isValidExternalAlbumUrl(value) {
  const candidate = String(value ?? '').trim();
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function shouldOpenExternalAlbum(photoCount, albumUrl) {
  return Number.isInteger(photoCount) && photoCount >= 0 && photoCount <= 1 && isValidExternalAlbumUrl(albumUrl);
}
