import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('Main archives and homepage gallery source use shared Kohhran ownership rules', () => {
  assert.match(read('src/pages/gallery.astro'), /ownedBy\(await getCollection\('gallery'\), 'kohhran'\)/);
  assert.match(read('src/pages/document.astro'), /ownedBy\(await getCollection\('documents'\), 'kohhran'\)/);
  assert.match(read('src/lib/gallery.ts'), /ownedBy\(await getCollection\('gallery'\), 'kohhran'\)/);
});
test('Ownership helper defaults missing owners and rejects archived or unpublished records', () => {
  const source=read('src/lib/content-ownership.ts');
  assert.match(source,/CHURCH_OWNER = 'kohhran'/);
  assert.match(source,/entry\.data\.status !== 'archived'/);
  assert.match(source,/entry\.data\.published !== false/);
  assert.match(source,/contentOwner\(entry\.data\) === owner/);
});
