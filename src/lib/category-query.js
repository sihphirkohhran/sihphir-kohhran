/**
 * Resolve a category query against the category values rendered by the CMS-backed
 * filter. URLSearchParams performs standards-based decoding and safely tolerates
 * malformed percent-encoding; exact matching prevents accidental partial matches.
 */
export function resolveCategoryFromSearch(search, categories) {
  const requestedCategory = new URLSearchParams(search).get('category');
  if (!requestedCategory) return null;
  return categories.includes(requestedCategory) ? requestedCategory : null;
}
