import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const recordsSource = read('src/lib/fellowship-records.ts');
const navSource = read('src/lib/fellowship-nav.ts');
const listing = read('src/pages/fellowship/index.astro');
const layout = read('src/layouts/BaseLayout.astro');

function evaluatePublishedSelection(entries) {
  const first = recordsSource.indexOf('export function fellowshipRecords(');
  const last = recordsSource.indexOf('/** One published record per stable slug');
  const source = recordsSource.slice(first, last) + recordsSource.slice(last)
    .replace('entries: FellowshipEntry[]', 'entries')
    .replace('(item): item is { slug: string; entry: FellowshipEntry }', '(item)');
  const js = source
    .replaceAll('entries: FellowshipEntry[]', 'entries')
    .replace('slug: string', 'slug')
    .replace(/: FellowshipEntry\b/g, '')
    .replaceAll('export function', 'function');
  return vm.runInNewContext(js + '; publishedFellowships(entries)', { entries });
}

const fixtures = [
  {id:'ktp-2025',data:{slug:'ktp',fellowship_name:'KTP old',year:2025,published:true,status:'current'}},
  {id:'ktp-2026',data:{slug:'ktp',fellowship_name:'KTP current',year:2026,published:true,status:'current'}},
  {id:'new-fellowship',data:{slug:'new-fellowship',fellowship_name:'New Fellowship',published:true}},
  {id:'unpublished',data:{slug:'unpublished',fellowship_name:'Hidden',published:false}},
  {id:'archived',data:{slug:'archived',fellowship_name:'Archived',status:'archived'}},
];

test('Published Fellowship selection deduplicates historical records and excludes unpublished and archived', () => {
  const selected = evaluatePublishedSelection(fixtures);
  assert.deepEqual(Array.from(selected, x=>x.slug),['ktp','new-fellowship']);
  assert.equal(selected[0].entry.data.fellowship_name,'KTP current');
});

test('Fellowship listing and global dropdown use exactly the same publication selector', () => {
  assert.match(listing,/publishedFellowships\(fellowshipEntries\)/);
  assert.match(navSource,/publishedFellowships\(entries\)/);
  assert.match(navSource,/await getCollection\('fellowship'\)/);
  assert.match(navSource,/href: \`\/fellowship\/\$\{slug\}\`/);
  assert.match(navSource,/key: \`fellowship-\$\{slug\}\`/);
  assert.match(navSource,/parent: 'fellowship'/);
  assert.match(navSource,/meta\?\.name/);
  assert.match(layout,/await Promise\.all\(\[getPagesForNav\(\), getFellowshipNavItems\(\)\]\)/);
  assert.match(layout,/mergeNavWithPages\(normalizeNavItems\(managedNavItems\)/);
  assert.match(layout,/\.\.\.fellowshipNavItems/);
});

test('Existing four routes and mobile navigation behavior are unchanged', () => {
  for (const slug of ['ktp','kpp','kohhran-hmeichhia','masihi-sangati']) {
    assert.match(read('src/pages/fellowship/' + slug + '.astro'),/currentFellowshipRecord/);
  }
  assert.match(layout,/const toggle = document\.getElementById\('nav-toggle'\)/);
  assert.match(layout,/navLinks\?\.classList\.toggle\('open'\)/);
  assert.match(read('src/lib/pages.ts'),/Manual entries win on same key/);
});
