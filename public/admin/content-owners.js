/* Shared owner registry for the centralized Gallery and Document managers.
 * Fellowship JSON is the source of truth; orphaned owner IDs remain editable.
 */
export const CHURCH_OWNER = 'kohhran';
export const validOwnerId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export async function loadContentOwners(api) {
  const owners = new Map([[CHURCH_OWNER, 'Kohhran']]);
  const listing = await api('/api/admin/content?area=fellowship');
  for (const item of listing.items || []) {
    try {
      const file = await api('/api/admin/content?path=' + encodeURIComponent(item.path));
      const data = JSON.parse(file.content);
      // Use the stored slug, not the display name. Legacy files fall back to their filename.
      const id = String(data.slug || item.path.split('/').pop().replace(/\\.json$/i, '').replace(/-\\d{4}$/, '')).trim();
      if (!validOwnerId(id) || id === CHURCH_OWNER) continue;
      owners.set(id, String(data.fellowship_name || data.name || id).trim() || id);
    } catch {
      // A malformed historical record must not prevent editing other content.
    }
  }
  return [...owners];
}

export function renderOwnerOptions(owners, value, esc) {
  const active = value || CHURCH_OWNER;
  const options = new Map(owners);
  if (!options.has(CHURCH_OWNER)) options.set(CHURCH_OWNER, 'Kohhran');
  if (validOwnerId(active) && !options.has(active)) options.set(active, active + ' (fellowship unavailable)');
  return [...options].map(([id,label]) => `<option value="${esc(id)}" ${active === id ? 'selected' : ''}>${esc(label)}</option>`).join('');
}

export const canSaveOwner = (owners, value, previousValue) =>
  validOwnerId(value) && (owners.some(([id]) => id === value) || value === previousValue);
