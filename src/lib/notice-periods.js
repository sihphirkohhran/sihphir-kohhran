// Timezone-safe date and month parsing shared by the homepage Notice Board and tests.
export function isoDate(value) {
  const raw = String(value ?? '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const legacy = raw.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  const y = Number(iso?.[1] ?? legacy?.[3]);
  const m = Number(iso?.[2] ?? legacy?.[2]);
  const d = Number(iso?.[3] ?? legacy?.[1]);
  if (!y || !m || !d || m > 12) return '';
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d
    ? String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    : '';
}
export function indianDate(value) {
  const date = isoDate(value);
  return date ? date.slice(8, 10) + '/' + date.slice(5, 7) + '/' + date.slice(0, 4) : String(value ?? '');
}
export function monthKey(value) {
  const raw = String(value ?? '').trim();
  if (/^(\d{4})-(0[1-9]|1[0-2])$/.test(raw)) return raw;
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const legacy = raw.match(/^([A-Za-z]+)\s+(\d{4})$/);
  const index = legacy ? names.findIndex(name => name.toLowerCase() === legacy[1].toLowerCase()) : -1;
  return index >= 0 ? legacy[2] + '-' + String(index + 1).padStart(2, '0') : '';
}
export function monthTitle(value) {
  const key = monthKey(value);
  if (!key) return value;
  return new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' }).format(new Date(key + '-01T00:00:00Z')) + ', ' + key.slice(0, 4);
}
