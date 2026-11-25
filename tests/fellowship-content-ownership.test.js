import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { normalizeContentOwners, renderDisplayLocations } from '../public/admin/content-owners.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const gallery = read('public/admin/gallery-manager.js');
const documents = read('public/admin/document-manager.js');
const fellowship = read('public/admin/fellowship-manager.js');
const publicFellowship = read('src/components/FellowshipPage.astro');
const schema = read('src/content/config.ts');
const externalTests = read('tests/document-external-url.test.js');

function expression(source, start, end, context = {}) {
  const a = source.indexOf(start);
  assert.ok(a >= 0, 'missing ' + start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(b > a, 'missing end ' + end);
  return vm.runInNewContext(source.slice(a, b), context);
}
const owners = ['kohhran','ktp','kohhran-hmeichhia','kpp','masihi-sangati'];

test('Gallery and Document owner selectors use the shared CMS-derived registry', () => {
  for (const source of [gallery, documents]) {
    assert.match(source, /import\('\/admin\/content-owners\.js'\)/);
    assert.match(source, /loadContentOwners\(api\)/);
    assert.ok(source.includes('renderDisplayLocations(contentOwners, data, esc)'));
    assert.ok(source.includes('${displayLocations(data)}'));
    assert.ok(source.includes('selected.data.owners=readDisplayLocations(values)'));
    assert.ok(source.includes('selected.data.category=String(values.get(\'category\')||\'Other\')'));
    assert.ok(source.includes('canSaveOwners(contentOwners,selected.data.owners,selected.originalOwners)'));
    assert.ok(source.includes('originalOwners:') && source.includes('normalizeContentOwners(parsed.data)'));
  }
});

test('Gallery serializes owner independently of category and reopens it', () => {
  const source = gallery.slice(gallery.indexOf('const yaml ='), gallery.indexOf('const normalizePhotos ='));
  const run = vm.runInNewContext(source + '; ({serializeGallery,parseGallery})', {
    // parseGallery is declared earlier in the same manager; supply a real parser below
    parseGallery: content => {
      const data = Object.fromEntries(content.split('---')[1].trim().split('\n').map(line => {
        const i = line.indexOf(':'); return [line.slice(0,i),line.slice(i+1).trim()];
      }));
      return {data};
    }
  });
  const saved = run.serializeGallery({caption:'Work Camp',year:2026,owner:'ktp',category:'Work Camp'},'');
  const reopened = run.parseGallery(saved).data;
  assert.equal(reopened.owner,'ktp');
  assert.equal(reopened.category,'Work Camp');
  assert.match(saved,/owner: ktp/);
});

test('Document serializes owner independently of category and keeps source metadata', () => {
  const source = documents.slice(documents.indexOf('const yaml ='), documents.indexOf('const extension ='));
  const serialize = vm.runInNewContext(source + '; serialize');
  const saved = serialize({name:'Report',owner:'kpp',category:'Annual Report',document_source:'external',pdf_external:'https://example.org/report',files:[{url:'/documents/report.pdf'}]},'');
  assert.match(saved,/owner: kpp/);
  assert.match(saved,/category: Annual Report/);
  assert.match(saved,/document_source: external/);
  // The serializer quotes URLs containing a colon; parse the serialized value instead of asserting its presentation.
  const serializedUrl = saved.match(/^pdf_external:\s*(.+)$/m)?.[1];
  assert.ok(serializedUrl, 'serialized external URL is present');
  const restoredUrl = serializedUrl.startsWith('"') ? JSON.parse(serializedUrl) : serializedUrl;
  assert.equal(restoredUrl, 'https://example.org/report');
  assert.match(saved,/files: \[/);
});

test('Schema supplies legacy Kohhran default and validates dynamic slug IDs', () => {
  assert.equal((schema.match(/owner: z\.string\(\)\.regex\(\/\^\[a-z0-9\]/g)||[]).length,2);
  assert.ok(gallery.includes("owners:['kohhran']"));
  assert.ok(documents.includes("owners:['kohhran']"));
  assert.deepEqual(normalizeContentOwners({}),['kohhran']);
  assert.deepEqual(normalizeContentOwners({owner:'ktp'}),['ktp']);
  assert.deepEqual(normalizeContentOwners({owner:'kohhran',owners:['ktp']}),['ktp']);
  const html=renderDisplayLocations([['kohhran','Kohhran'],['new-fellowship','New Fellowship']],{owner:'retired'},String);
  assert.match(html,/type="checkbox" name="owners"/);
  assert.match(html,/value="retired" checked/);
  assert.match(html,/fellowship unavailable/);
  assert.match(html,/value="new-fellowship"/);
});

test('Fellowship legacy people are not edited or changed during sync', () => {
  const sync = fellowship.slice(fellowship.indexOf('const sync=form=>{'),fellowship.indexOf('const bind=()=>'));
  assert.doesNotMatch(sync,/office_bearers\.forEach|members\.forEach/);
  const people = {office_bearers:[{name:'Old bearer',role:'Secretary',display_order:7}],members:[{name:'Old member',role:'Legacy',display_order:9}]};
  const selected = {data:{...people,related_galleries:[],related_documents:[]}};
  const FormData = class { constructor(form){this.form=form;} get(key){return this.form[key]??null;} };
  const document = {querySelector:()=>({innerHTML:'<p>History</p>'})};
  const window = {};
  const fn = vm.runInNewContext(sync+'; sync',{selected,FormData,document,window,slug:value=>value.toLowerCase()});
  fn({fellowship_name:'KTP',category:'Fellowship',published:'on'});
  assert.deepEqual(JSON.parse(JSON.stringify(selected.data.office_bearers)),people.office_bearers);
  assert.deepEqual(JSON.parse(JSON.stringify(selected.data.members)),people.members);
  assert.doesNotMatch(fellowship,/<h3>Office Bearers<\/h3>|<h3>Members<\/h3>|data-add-person="|data-person-container="/);
  assert.doesNotMatch(publicFellowship,/<!-- Office Bearers -->|<!-- Committee Members -->/);
  assert.match(fellowship,/JSON\.stringify\(selected\.data,null,2\)/);
});

test('PR #49 external document source and related-document regressions remain covered', () => {
  assert.match(externalTests,/functional preferred source and fellowship related document resolution/);
  assert.match(externalTests,/functional public file selection respects explicit source through source switching/);
  assert.match(documents,/selected\.data\.document_source=String/);
  assert.match(documents,/selected\.data\.pdf_external=String/);
  assert.match(read('src/lib/fellowship.ts'),/resolvePreferredDocumentUrl\(entry\.data\)/);
});
