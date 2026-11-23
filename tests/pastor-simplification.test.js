import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const manager = read('public/admin/ministry-manager.js');
const profile = read('src/lib/ministry-profile.ts');
const detail = read('src/components/PastorDetail.astro');
const route = read('src/pages/bialtu-pastor/[id].astro');

test('Pastor editor is isolated and contains only requested editable fields', () => {
  assert.match(manager, /simplePastorArea\(\)\?pastorEditorMarkup\(\):existingEditorMarkup\(\)/);
  const editor = manager.split('const pastorEditorMarkup=()=>')[1].split('const editorMarkup=')[0];
  for (const key of ['name','date_of_birth','ordination_year','start_year','end_year','record_status','photo','biography']) assert.ok(editor.includes(key), key);
  for (const key of ['bible_verse','church_served','family_information','short_description','pastor_message','family_photo','gallery','education','phone','email','address']) assert.ok(!editor.includes("field('"+key+"'")&&!editor.includes("assetEditor('"+key+"'")&&!editor.includes("richEditor('"+key+"'"), key);
  assert.match(manager, /selected\.data\.designation=simplePastorDesignation\(\)/);
  assert.match(manager, /Start Year is required/);
  assert.match(manager, /Current Pastors and Pro Pastors must not have an End Year/);
});
test('Pastor CMS retains legacy data on save and warns about legacy fields', () => {
  assert.match(manager, /pastorLegacyFields/);
  assert.match(manager, /Review before any future migration/);
  assert.match(manager, /new FormData\(form\)\.forEach/);
  assert.match(manager, /Object\.entries\(record\.data\)/);
  assert.match(manager, /SihphirRichTextEditor\?\.sanitizeHtml/);
  assert.match(manager, /SihphirRichTextEditor\?\.bindPaste/);
  assert.match(manager, /Discard unsaved changes/);
});
test('Pastor public page is separate, minimal and mobile-responsive', () => {
  assert.match(route, /import PastorDetail/);
  assert.doesNotMatch(route, /MinistryDetail/);
  assert.match(detail, /Back to Pastor listing/);
  for (const label of ['Service Period','Date of Birth','Ordination Year','Status','Biography']) assert.ok(detail.includes(label), label);
  for (const label of ['Timeline','Related Profiles','Related Documents','Pastor’s Message','Family Information','Church Served']) assert.ok(!detail.includes(label), label);
  assert.match(detail, /@media\(max-width:760px\)/);
  assert.match(detail, /@media\(max-width:440px\)/);
  assert.match(profile, /kind === 'pastor' \? 'Pastor'/);
});
test('Pro Pastor and Missionary detail routes retain their shared component', () => {
  for (const path of ['src/pages/missionary/[id].astro']) assert.match(read(path), /MinistryDetail/);
  assert.match(manager, /area==='elders'\?elderEditorMarkup\(\)/);
});
test('Pastor historical records and their slugs remain present', () => {
  const records = readdirSync(new URL('../src/content/pastoral/', import.meta.url)).filter(name => name.endsWith('.md'));
  assert.ok(records.length >= 16);
  assert.ok(records.includes('pastor-r-c-lalthavul.md'));
});

test('Pastor Published checkbox reflects Draft and Published records and stays in the minimal editor', () => {
  const editor = manager.split('const pastorEditorMarkup=()=>')[1].split('const editorMarkup=')[0];
  assert.match(editor, /\$\{checks\(\)\}/);
  assert.match(editor, /Uncheck to save as Draft/);
  const checkboxSource = manager.match(/const checks=\(\)=>`([^`]+)`;/)?.[1];
  assert.ok(checkboxSource, 'shared publication checkbox must exist');
  const checkbox = new Function('selected', 'return `' + checkboxSource + '`;');
  assert.match(checkbox({data:{published:false}}), /name="published"/);
  assert.doesNotMatch(checkbox({data:{published:false}}), /checked/);
  assert.match(checkbox({data:{published:true}}), /checked/);
  assert.match(checkbox({data:{}}), /checked/, 'legacy unspecified publication stays published');
});
test('Pastor publication toggle saves Draft → Published and Published → Draft without changing other fields', () => {
  const syncSource = manager.split('const sync=form=>{')[1].split('const bind=')[0];
  assert.ok(syncSource, 'CMS sync handler exists');
  const FormData = class {
    constructor(form) { this.form=form; }
    forEach(callback) { for(const [key,value] of Object.entries(this.form.fields)) callback(value,key); }
  };
  const run = (initialPublished,checked) => {
    const selected={data:{name:'Pastor Example',start_year:2020,published:initialPublished,notes:'Preserved legacy note',biography:'<p>Biography</p>'},body:'<p>Biography</p>'};
    const sync=new Function('selected','FormData','area','window','return form=>{' + syncSource);
    const form={fields:{name:'Pastor Example'},querySelectorAll(selector) {
      if(selector==='input[type=checkbox]')return [{name:'published',checked}];
      return [];
    }};
    sync(selected,FormData,'pastors',{SihphirRichTextEditor:{sanitizeHtml:value=>value}})(form);
    return selected.data;
  };
  const published=run(false,true);
  assert.equal(published.published,true);
  assert.equal(published.notes,'Preserved legacy note');
  assert.equal(published.start_year,2020);
  const draft=run(true,false);
  assert.equal(draft.published,false);
  assert.equal(draft.biography,'<p>Biography</p>');
  const unchangedDraft=run(false,false);
  assert.equal(unchangedDraft.published,false);
  const unchangedPublished=run(true,true);
  assert.equal(unchangedPublished.published,true);
});
