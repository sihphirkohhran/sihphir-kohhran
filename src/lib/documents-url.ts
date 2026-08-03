/** Sanitize uploaded document filenames for safe static URLs. */
export function sanitizeDocumentFilename(filename: string): string {
  const raw = filename.replace(/^.*[/\\]/, '').trim();
  if (!raw) return 'document.pdf';

  const extMatch = raw.match(/(\.[a-z0-9]{2,8})$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.pdf';
  const base = extMatch ? raw.slice(0, -ext.length) : raw;

  const slug = base
    .toLowerCase()
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'document'}${ext}`;
}

/** Normalize document paths from CMS file uploads for static hosting. */
export function normalizePdfUrl(url: string | undefined | null): string {
  if (!url?.trim()) return '';
  let value = url.trim().replace(/\\/g, '/');

  // Strip accidental Windows absolute paths
  if (/^[a-zA-Z]:/.test(value) || value.includes(':/Users/')) {
    const match = value.match(/(?:public\/)?documents\/[^?#\s]+/i);
    if (match) value = `/${match[0].replace(/^public\//, '')}`;
    else return '';
  }

  if (/^https?:\/\//i.test(value)) return value;

  // Fix paths saved relative to the content folder (CMS misconfiguration)
  value = value.replace(/^\/?src\/content\/documents\/[^/]+\/public\/documents\//, '/documents/');
  value = value.replace(/^\/?public\/documents\//, '/documents/');

  if (value.startsWith('/documents/')) {
    const parts = value.split('/');
    const file = parts.pop()!;
    parts.push(sanitizeDocumentFilename(decodeURIComponent(file)));
    return parts.join('/');
  }

  if (value.startsWith('/')) {
    const parts = value.split('/');
    const file = parts.pop()!;
    parts.push(sanitizeDocumentFilename(decodeURIComponent(file)));
    return parts.join('/');
  }

  if (value.startsWith('documents/')) {
    return normalizePdfUrl(`/${value}`);
  }

  return `/documents/${sanitizeDocumentFilename(value)}`;
}

/** Prefer uploaded file; fall back to external link (e.g. Google Drive). */
export function resolveDocumentUrl(
  fileUrl?: string | null,
  externalUrl?: string | null,
): string {
  const file = normalizePdfUrl(fileUrl);
  if (file) return file;
  const external = externalUrl?.trim() ?? '';
  if (/^https?:\/\//i.test(external)) return external;
  return normalizePdfUrl(external);
}
