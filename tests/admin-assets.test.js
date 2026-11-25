import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { versionAdminAssets } from '../scripts/admin-assets.mjs';

test('shared module change versions every admin entry and keeps dependencies together', async () => {
 const root=await mkdtemp(join(tmpdir(),'admin-assets-'));
 try {
  const admin=join(root,'admin'); await mkdir(admin);
  const html='<script src="/admin/gallery-manager.js"></script><script src="/admin/document-manager.js?v=old"></script><script src="/admin/app.js"></script>';
  await writeFile(join(admin,'index.html'),html);
  for(const name of ['gallery-manager.js','document-manager.js','app.js']) await writeFile(join(admin,name),"import('./content-owners.js')");
  await writeFile(join(admin,'content-owners.js'),'export const old=1;');
  const first=await versionAdminAssets(root);
  const firstHtml=await readFile(join(admin,'index.html'),'utf8');
  assert.equal(firstHtml.split('/admin/assets/'+first+'/').length,4);
  await writeFile(join(admin,'index.html'),html);
  assert.equal(await versionAdminAssets(root),first);
  await writeFile(join(admin,'index.html'),html);
  await writeFile(join(admin,'content-owners.js'),'export const normalizeContentOwners=()=>[];');
  const second=await versionAdminAssets(root);
  assert.notEqual(first,second);
  assert.equal((await readFile(join(admin,'index.html'),'utf8')).split('/admin/assets/'+second+'/').length,4);
  assert.match(await readFile(join(admin,'assets',second,'content-owners.js'),'utf8'),/normalizeContentOwners/);
  assert.match(await readFile(join(admin,'assets',first,'content-owners.js'),'utf8'),/old=1/);
  for(const name of ['gallery-manager.js','document-manager.js','committee-manager.js']){
   const source=await readFile(new URL('../public/admin/'+name,import.meta.url),'utf8');
   assert.ok(source.includes("import('./content-owners.js')"));
  }
 } finally { await rm(root,{recursive:true,force:true}); }
});
