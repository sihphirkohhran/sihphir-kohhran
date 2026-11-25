import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Publish the entire admin JS graph under one content-derived directory.
// Old HTML can never resolve a new dependency at its old versioned URL.
export async function versionAdminAssets(directory) {
  const source = join(directory, 'admin');
  const names = (await readdir(source)).filter(name => name.endsWith('.js')).sort();
  const files = await Promise.all(names.map(async name => [name, await readFile(join(source, name))]));
  const hash = createHash('sha256');
  for (const [name, bytes] of files) hash.update(name+'\0').update(bytes).update('\0');
  const version = hash.digest('hex').slice(0, 24);
  const target = join(source, 'assets', version);
  await mkdir(target, { recursive: true });
  for (const [name, bytes] of files) await writeFile(join(target, name), bytes);
  let page;
  for (const candidate of [join(source, 'index.html'), join(directory, 'admin.html')]) {
    try { await readFile(candidate); page = candidate; break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!page) throw new Error('Admin HTML not found in build output');
  const html = await readFile(page, 'utf8');
  const rewritten = html.replace(/(src=["'])\/admin\/([^/"'?]+\.js)(?:\?[^"']*)?(["'])/g,
    (_, start, name, end) => {
      if (!names.includes(name)) throw new Error('Missing admin script: '+name);
      return start+'/admin/assets/'+version+'/'+name+end;
    });
  if (rewritten === html) throw new Error('No admin scripts versioned');
  const references = [...rewritten.matchAll(/<script\b[^>]*\bsrc=["'](\/admin\/[^"']+)["']/g)].map(match => match[1]);
  if (!references.length) throw new Error('No admin entry scripts found');
  for (const reference of references) {
    const prefix = '/admin/assets/'+version+'/';
    if (!reference.startsWith(prefix)) throw new Error('Unversioned admin entry: '+reference);
    await readFile(join(target, reference.slice(prefix.length)));
  }
  for (const [name, bytes] of files) {
    const code = bytes.toString('utf8');
    if (/\bimport\s*\(\s*['"]\/admin\//.test(code)) throw new Error('Unversioned admin import: '+name);
    for (const match of code.matchAll(/\bimport\s*\(\s*['"]\.\/([^'"]+)['"]/g)) await readFile(join(target, match[1]));
  }
  await writeFile(page, rewritten);
  console.log('Verified admin asset version '+version+': '+references.length+' entry scripts, '+files.length+' JavaScript files');
  return version;
}

export default function adminAssets() {
  return { name: 'admin-assets', hooks: {
    'astro:build:done': async ({ dir }) => { await versionAdminAssets(fileURLToPath(dir)); }
  }};
}
