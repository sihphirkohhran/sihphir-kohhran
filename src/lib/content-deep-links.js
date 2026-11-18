export function normalizeContentEntryId(identifier) {
  return String(identifier ?? '').trim().replace(/\\.md$/i, '');
}

export function contentEntryIdMatches(entryId, requestedId) {
  const requested = normalizeContentEntryId(requestedId);
  return Boolean(requested) && normalizeContentEntryId(entryId) === requested;
}

export function buildContentDeepLink(origin, pathname, parameter, identifier) {
  const id = String(identifier ?? '').trim();
  if (!id) return null;
  const url = new URL(pathname, origin);
  url.searchParams.set(parameter, id);
  return url.toString();
}

export function resolveContentDeepLink(search, parameter) {
  const value = new URLSearchParams(search).get(parameter);
  return value && value.trim() ? value : null;
}
