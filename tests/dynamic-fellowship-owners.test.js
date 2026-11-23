import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadContentOwners, renderOwnerOptions, canSaveOwner } from '../public/admin/content-owners.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const records = [
  {path:'src/content/fellowship/ktp.json',data:{slug:'ktp',fellowship_name:'Kristian Thalai Pawl (KTP)'}},
  {path:'src/content/fellowship/kohhran-hmeichhia.json',data:{slug:'kohhran-hmeichhia',fellowship_name:'Kohhran Hmeichhia'}},
  {path:'src/content/fellowship/kpp.json',data:{slug:'kpp',fellowship_name:'Kohhran Pavalai Pawl (KPP)'}},
  {path:'src/content/fellowship/masihi-sangati.json',data:{slug:'masihi-sangati',fellowship_name:'Masihi Sangati'}},
  {path:'src/content/fellowship/new-fellowship.json',data:{slug:'new-fellowship',fellowship_name:'New Fellowship',published:true}},
  {path:'src/content/fellowship/unpublished.json',data:{slug:'unpublished',fellowship_name:'Unpublished Fellowship',published:false}},
];
const apiFor = entries => async url => {
  if (url === '/api/admin/content?area=fellowship') return {items:entries.map(({path})=>({path}))};
  const path = new URLSearchParams(url.split('?')[1]).get('path');
  const entry = entries.find(item=>item.path===path);
  if (!entry) throw Error('Missing ' + path);
  return {content:JSON.stringify(entry.data)};
};

test('Church and existing owners plus newly saved fellowship are loaded from CMS', async () => {
  const owners = await loadContentOwners(apiFor(records));
  assert.deepEqual(owners.map(([id])=>id),['kohhran','ktp','kohhran-hmeichhia','kpp','masihi-sangati','new-fellowship','unpublished']);
  const html = renderOwnerOptions(owners,'new-fellowship',x=>x);
  assert.match(html,/value="new-fellowship" selected>New Fellowship/);
  assert.equal((html.match(/ selected/g)||[]).length,1);
  assert.ok(canSaveOwner(owners,'new-fellowship','kohhran'));
  assert.match(renderOwnerOptions(owners,undefined,x=>x),/value="kohhran" selected/);
});

test('Renaming changes label but retains saved slug ownership', async () => {
  const renamed=records.map(entry=>({...entry,data:{...entry.data}}));
  renamed[4].data.fellowship_name='Renamed Fellowship';
  const owners=await loadContentOwners(apiFor(renamed));
  assert.match(renderOwnerOptions(owners,'new-fellowship',x=>x),/value="new-fellowship" selected>Renamed Fellowship/);
  assert.match(read('public/admin/fellowship-manager.js'),/data\.slug=data\.slug\|\|slug\(data\.fellowship_name\)/);
});

test('Unpublished owners remain selectable and deleted owners retain fallback labels', async () => {
  const owners=await loadContentOwners(apiFor(records));
  assert.ok(canSaveOwner(owners,'unpublished','kohhran'));
  const deleted=await loadContentOwners(apiFor(records.filter(r=>r.data.slug!=='new-fellowship')));
  const html=renderOwnerOptions(deleted,'new-fellowship',x=>x);
  assert.match(html,/value="new-fellowship" selected>new-fellowship \(fellowship unavailable\)/);
  assert.ok(canSaveOwner(deleted,'new-fellowship','new-fellowship'));
  assert.ok(!canSaveOwner(deleted,'arbitrary-owner','kohhran'));
});

test('Legacy owner and categories remain independent; invalid fellowship IDs excluded', async () => {
  const owners=await loadContentOwners(apiFor([...records,{path:'src/content/fellowship/invalid.json',data:{slug:'Not Valid!',fellowship_name:'Invalid'}}]));
  assert.ok(!owners.some(([id])=>id==='Not Valid!'));
  assert.match(read('public/admin/gallery-manager.js'),/selected\.data\.category=String\(values\.get\('category'\)/);
  assert.match(read('public/admin/document-manager.js'),/selected\.data\.category=String\(values\.get\('category'\)/);
  const schema=read('src/content/config.ts');
  assert.equal((schema.match(/owner: z\.string\(\)\.regex\(/g)||[]).length,2);
  assert.equal((schema.match(/\.optional\(\)\.default\('kohhran'\)/g)||[]).length,2);
});

test('Fellowship listing and routes remain CMS-driven with established metadata styling', () => {
  const listing=read('src/pages/fellowship/index.astro');
  const route=read('src/pages/fellowship/[slug].astro');
  assert.match(listing,/publishedFellowships\(fellowshipEntries\)/);
  assert.match(read('src/lib/fellowship-nav.ts'),/publishedFellowships\(entries\)/);
  assert.match(listing,/meta\?\.accentColor/);
  assert.match(route,/getStaticPaths/);
  assert.match(route,/\.filter\(\(\{ slug \}\) => !known\.has\(slug\)\)/);
});
