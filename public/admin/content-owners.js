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
      const id = String(data.slug || item.path.split('/').pop().replace(/\.json$/i, '').replace(/-\d{4}$/, '')).trim();
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

/** Explicit arrays are authoritative, including an empty array (no visibility). */
export function normalizeContentOwners(data = {}) {
  const values = Array.isArray(data.owners) ? data.owners : [data.owner || CHURCH_OWNER];
  return [...new Set(values.map(value=>typeof value==='string'?value.trim():value).filter(validOwnerId))];
}
export function renderDisplayLocations(registry, data, esc) {
  const active = normalizeContentOwners(data);
  const options = new Map([[CHURCH_OWNER,'Kohhran'],...registry]);
  for (const id of active) if (!options.has(id)) options.set(id,id+' (fellowship unavailable)');
  return '<fieldset class="display-locations" style="min-width:0;border:1px solid #ded8c8;border-radius:6px;padding:10px"><legend>Display In</legend><div style="display:flex;flex-wrap:wrap;gap:8px 16px">'+[...options].map(([id,label])=>`<label style="display:flex;align-items:center;gap:6px"><input style="width:auto" type="checkbox" name="owners" value="${esc(id)}" ${active.includes(id)?'checked':''}><span>${esc(label)}</span></label>`).join('')+'</div><small>Select at least one destination.</small></fieldset>';
}
export function canSaveOwners(registry, values, previousValues = []) {
  return Array.isArray(values) && values.length>0 && values.every(id=>validOwnerId(id)&&(registry.some(([known])=>known===id)||previousValues.includes(id)));
}
export function readDisplayLocations(formData) {
  return [...new Set(formData.getAll('owners').map(String))];
}

/** Load libraries with bounded concurrency and safe, stage-specific diagnostics. */
export async function loadLibraryRecords(api, area, parseRecord, buildRecord) {
  let listing;
  try { listing = await api('/api/admin/content?area='+area); }
  catch { throw Error('Library listing request failed. Check your session and connection, then reload.'); }
  if (!Array.isArray(listing?.items)) throw Error('Library listing returned an invalid response. Reload and try again.');
  const records=[], failures=[];
  const items=listing.items;
  for(let offset=0;offset<items.length;offset+=4){
    const batch=await Promise.all(items.slice(offset,offset+4).map(async item=>{
      let stage='content fetch';
      try {
        if(typeof item?.path!=='string'||!item.path)throw Error();
        const file=await api('/api/admin/content?path='+encodeURIComponent(item.path));
        if(typeof file?.content!=='string')throw Error();
        stage='record parsing';
        const parsed=parseRecord(file.content);
        stage='record normalization';
        return {record:buildRecord(item,parsed)};
      } catch { return {stage}; }
    }));
    for(const result of batch)if(result.record)records.push(result.record);else failures.push(result.stage);
  }
  const warning=failures.length ? 'Loaded '+records.length+' of '+items.length+' records. '+failures.length+' failed ('+[...new Set(failures)].join(', ')+'). Reload before creating new records.' : '';
  return {records,warning,listed:items.length,failed:failures.length};
}
