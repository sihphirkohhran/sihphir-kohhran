import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const cms=read('public/admin/ministry-manager.js');
const profile=read('src/lib/ministry-profile.ts');
const detail=read('src/components/PastorDetail.astro');
const route=read('src/pages/probationary-pastor/[id].astro');
const index=read('src/pages/probationary-pastor/index.astro');
const editor=cms.split('const pastorEditorMarkup=()=>')[1].split('const editorMarkup=')[0];

test('Pro Pastor reuses minimal editor and retains its dedicated CMS collection',()=>{
  assert.match(cms,/simplePastorArea=\(\)=>area==='pastors'\|\|area==='probationary-pastors'/);
  assert.match(cms,/apiArea:'pro-pastors',root:'src\/content\/pro-pastoral\//);
  assert.match(cms,/simplePastorArea\(\)\?pastorEditorMarkup\(\):existingEditorMarkup\(\)/);
  for(const key of ['name','date_of_birth','ordination_year','start_year','end_year','record_status','photo','biography','checks()'])assert.ok(editor.includes(key),key);
  for(const key of ['bible_verse','church_served','family_information','notes','short_description','family_photo','gallery','pastor_message','education','phone','email','address'])assert.ok(!editor.includes("field('"+key+"'")&&!editor.includes("assetEditor('"+key+"'")&&!editor.includes("richEditor('"+key+"'"),key);
  assert.match(cms,/simplePastorDesignation=\(\)=>area==='pastors'\?'Pastor':'Pro Pastor'/);
  assert.match(cms,/selected\.data\.designation=simplePastorDesignation\(\)/);
  assert.match(cms,/pastorLegacyFields\(\)\.length/);
  assert.match(cms,/safeEditorHtml\(selected\.data\.biography\|\|selected\.body\|\|''\)/);
  assert.match(cms,/SihphirRichTextEditor\?\.sanitizeHtml/);
  assert.match(cms,/SihphirRichTextEditor\?\.bindPaste/);
});

test('Pro Pastor status and publication changes preserve legacy fields and biography',()=>{
  assert.match(cms,/if\(simplePastorArea\(\)\)\{/);
  assert.match(cms,/Start Year is required/);
  assert.match(cms,/End Year must not precede Start Year/);
  assert.match(cms,/Current Pastors and Pro Pastors must not have an End Year/);
  const source=cms.split('const sync=form=>{')[1].split('const bind=')[0];
  const FormData=class{constructor(form){this.form=form}forEach(callback){for(const [key,value]of Object.entries(this.form.fields))callback(value,key)}};
  const sync=new Function('selected','FormData','area','window','return form=>{'+source);
  const run=(initial,checked)=>{
    const selected={data:{name:'Existing Pro Pastor',published:initial,start_year:2020,record_status:'Former',end_year:2022,notes:'Legacy notes retained',biography:'<p>Existing biography</p>',designation:'.'},body:'<p>Existing biography</p>'};
    const form={fields:{name:'Existing Pro Pastor'},querySelectorAll(selector){return selector==='input[type=checkbox]'?[{name:'published',checked}]:[]}};
    sync(selected,FormData,'probationary-pastors',{SihphirRichTextEditor:{sanitizeHtml:value=>value}})(form);
    return selected.data;
  };
  for(const [before,after] of [[false,true],[true,false],[true,true],[false,false]]){
    const data=run(before,after);assert.equal(data.published,after);assert.equal(data.biography,'<p>Existing biography</p>');assert.equal(data.notes,'Legacy notes retained');assert.equal(data.end_year,2022);
  }
  assert.match(editor,/selected\.data\.record_status\|\|\(!selected\.data\.end_year\?'Current':'Former'\)/);
  assert.match(cms,/Discard unsaved changes/);
  assert.match(cms,/const upload=async/);
  assert.match(cms,/const remove=async/);
  assert.match(cms,/const preview=\(\)=>/);
});

test('Pro Pastor dedicated and legacy sources retain duplicate resolution and Pastor isolation',()=>{
  for(const page of [route,index]){
    assert.match(page,/getCollection\('proPastoral'\)/);
    assert.match(page,/getCollection\('pastoral'\)/);
    assert.match(page,/normalizeMinistryProfile\(entry,'pro'\)/);
    assert.match(page,/normalizeMinistryProfile\(entry,'probationary'\)/);
    assert.match(page,/!dedicated\.some\(item=>item\.id===profile\?\.id\)/);
  }
  assert.match(profile,/if \(kind === 'pastor' && \(data\.role \|\| 'pastor'\) !== 'pastor'\) return null/);
  assert.match(profile,/if \(kind === 'probationary' && data\.role !== 'pro-pastor'\) return null/);
  assert.match(profile,/data\.published === false/);
  assert.match(profile,/kind === 'pro' \|\| kind === 'probationary' \? 'Pro Pastor'/);
  assert.match(read('src/pages/bialtu-pastor/[id].astro'),/PastorDetail profile=\{profile\}/);
  assert.match(read('src/pages/missionary/[id].astro'),/MinistryDetail/);
});

test('Pro Pastor detail uses Pastor layout with explicit variant and responsive biography',()=>{
  assert.match(route,/<PastorDetail profile=\{profile\} variant="pro-pastor"\/>/);
  assert.match(detail,/variant\?: 'pastor' \| 'pro-pastor'/);
  assert.match(detail,/\/probationary-pastor/);
  assert.match(detail,/Back to \{listingLabel\} listing/);
  for(const label of ['Service Period','Date of Birth','Ordination Year','Status','Biography'])assert.ok(detail.includes(label),label);
  assert.match(detail,/@media\(max-width:760px\)/);
  assert.match(detail,/@media\(max-width:440px\)/);
  assert.doesNotMatch(route,/MinistryDetail/);
});
