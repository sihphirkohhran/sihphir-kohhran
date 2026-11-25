import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const fixture = read('./fixtures/rich-text.html');
const committee = read('../public/admin/committee-manager.js');
const committeeCss = read('../public/admin/committee-manager.css');
const sharedCss = read('../public/admin/rich-text-editor.css');
const fellowship = read('../public/admin/fellowship-manager.js');
const pages = read('../public/admin/page-manager.js');
const home = read('../public/admin/app.js');
const ministry = read('../public/admin/ministry-manager.js');
const notice = read('../public/admin/notice-manager.js');
const helper = read('../public/admin/rich-text-editor.js');
const publicCommittee = read('../src/pages/committee.astro');
const sanitizer = read('../src/lib/markdown.ts');

test('rich-text fixture covers headings, paragraphs, inline marks, nested lists and safe links', () => {
  for (const tag of ['<h2>', '<p>', '<strong>', '<em>', '<ul>', '<ol>', '<li>', '<a href="https://']) {
    assert.ok(fixture.includes(tag), `fixture missing ${tag}`);
  }
  assert.match(fixture, /<ul>[\s\S]*<ul>[\s\S]*<\/ul>/);
  assert.match(fixture, /<ol>[\s\S]*1992[\s\S]*2002[\s\S]*2008/);
});

test('Committee editor preserves empty content and serializes semantic editor HTML', () => {
  assert.match(committee, /id="committee-rich-editor" contenteditable="true"/);
  assert.match(committee, /sanitizeHtml\(richEditor\.innerHTML,\{media:false\}\)/);
  assert.match(committee, /selected\.body\|\|\(selected\.isNew\?''/);
  assert.match(committeeCss, /\.committee-rich article ul[\s\S]*list-style-type:disc/);
  assert.match(committeeCss, /\.committee-rich article ol[\s\S]*list-style-type:decimal/);
});

test('Committee toolbar prevents focus theft and rejects unsafe link schemes', () => {
  assert.match(committee, /richToolbar\.addEventListener\('mousedown',[\s\S]*preventDefault\(\)/);
  assert.match(committee, /SihphirRichTextEditor\?\.safeUrl/);
});

test('active editors have scoped visible list markers', () => {
  for (const selector of ['.committee-rich article', '#fellowship-history', '#page-rich', '#notice-rich', '.home-rich-editor', '.ministry-rich article']) {
    assert.ok(sharedCss.includes(selector), `missing style scope ${selector}`);
  }
  assert.match(sharedCss, /list-style-type:disc/);
  assert.match(sharedCss, /list-style-type:decimal/);
  assert.match(fellowship, /contenteditable="true"/);
  assert.match(pages, /id="page-rich" contenteditable="true"/);
  assert.match(home, /data-home-rich data-target=/);
  assert.match(notice, /id="notice-rich" contenteditable="true"/);
  for (const source of [committee, fellowship, pages, notice, ministry]) assert.match(source, /bindPaste\(/);
  assert.match(home, /sanitizeHtml\(html/);
  assert.match(helper, /const sanitizeHtml/);
  assert.match(helper, /www.youtube-nocookie.com/);
  assert.match(helper, /script,style,meta,link,object,embed,svg,math/);
  assert.match(ministry, /contenteditable="true" data-rich=/);
});

test('Committee public output uses the existing safe rich-text sanitizer', () => {
  assert.match(publicCommittee, /renderSafeRichText\(body\)/);
  for (const tag of ["'ul'", "'ol'", "'li'", "'a'"]) assert.ok(sanitizer.includes(tag));
  assert.match(sanitizer, /https\?:|mailto:/);
  assert.match(sanitizer, /renderSafeRichText/);
});

const schoolManager = read('../public/admin/school-manager.js');
const schoolData = read('../src/content/settings/school.json');

test('shared rich-text editor exposes the PES field and mount API', () => {
  assert.ok(helper.includes("const field=({key,label,value=''})=>"));
  assert.match(helper, /const mount=\(host,onChange=\(\)=>\{\}\)=>/);
  assert.match(helper, /const read=host=>Object\.fromEntries/);
  assert.match(helper, /data-rich-editor/);
  assert.match(helper, /data-rich-command/);
  assert.match(helper, /window\.SihphirRichTextEditor=\{safeUrl,sanitizeHtml,bindPaste,field,mount,read,bindAlignment\}/);
  assert.match(schoolManager, /rich\.field\(/);
  assert.match(schoolManager, /rich\.mount\(/);
});

test('PES CMS renders all nine editing sections and keeps rich HTML fields', () => {
  for (const heading of ['School Page Settings','School Information','History & Vision / Mission','Management Committee','Headmaster / Principal','Teachers','Gallery','Contact']) {
    assert.ok(schoolManager.includes(heading), `missing PES section ${heading}`);
  }
  assert.match(schoolManager, /data\.history/);
  assert.match(schoolManager, /data\.vision_mission/);
  assert.match(schoolManager, /data\[key\]=value/);
  assert.match(schoolManager, /JSON\.stringify\(data,null,2\)/);
});

test('PES school data preserves authentic history while clearing public test content', () => {
  const data = JSON.parse(schoolData);
  assert.equal(data.information.establishment_year, '2014');
  assert.ok(data.history.includes('<h2>'));
  assert.ok(data.history.includes('<a href='));
  assert.equal(data.vision_mission, '');
  assert.equal(data.management.members[0].name, '');
  assert.equal(data.information.contact_number, '');
  assert.equal(data.contact.phone, '');
  assert.ok(data.gallery.every(photo => !/test/i.test(`${photo.caption} ${photo.category}`)));
  assert.ok(data.teachers.every(teacher => !teacher.biography));
});

test('PES loading failures show a recoverable Admin Panel error instead of a blank workspace', () => {
  const app = read('../public/admin/app.js');
  assert.match(app, /Presbyterian English School editor could not load/);
  assert.match(app, /school-retry/);
  assert.match(app, /role="alert"/);
});

test('PES rich-text field mounts, emits edits, and reads existing HTML back', () => {
  const window = {};
  runInNewContext(helper, { window, URL, DOMParser: class {} });
  const rich = window.SihphirRichTextEditor;
  const markup = rich.field({ key: 'history', label: 'History', value: '<p><strong>Existing history</strong></p>' });
  assert.ok(markup.includes('contenteditable="true"'));
  assert.ok(markup.includes('<p><strong>Existing history</strong></p>'));
  assert.ok(markup.includes('data-rich-command="insertOrderedList"'));

  const listeners = {};
  const toolbarListeners = {};
  const toolbar = { addEventListener: (name, callback) => { toolbarListeners[name] = callback; } };
  const editor = {
    dataset: { richKey: 'history' },
    innerHTML: '<p><strong>Existing history</strong></p>',
    parentElement: { querySelector: () => toolbar },
    addEventListener: (name, callback) => { listeners[name] = callback; },
    focus() {},
  };
  const host = { querySelectorAll: () => [editor] };
  let changed = null;
  assert.equal(rich.mount(host, (key, value) => { changed = [key, value]; }), 1);
  editor.innerHTML = '<h2>Updated history</h2><ol><li>One</li></ol>';
  listeners.input();
  assert.deepEqual(changed, ['history', editor.innerHTML]);
  assert.deepEqual(JSON.parse(JSON.stringify(rich.read(host))), { history: editor.innerHTML });
  assert.ok(toolbarListeners.mousedown);
  assert.ok(toolbarListeners.click);
});

test('PES save handler reads rich HTML and verifies the content after reloading', () => {
  assert.match(schoolManager, /Object\.assign\(data,rich\.read\(host\)\)/);
  assert.match(schoolManager, /await save\(\);const verification=await api\('\/api\/admin\/content\?path='/);
  assert.match(schoolManager, /JSON\.stringify\(reloaded\)!==JSON\.stringify\(data\)/);
});

test('alignment controls preserve an editor range and dispatch all four native commands',()=>{
 const window={},calls=[],listeners={},toolbarListeners={};
 const node={},range={commonAncestorContainer:node,cloneRange(){return this;}};
 const selection={rangeCount:1,anchorNode:node,focusNode:node,getRangeAt:()=>range,removeAllRanges(){calls.push('clear');},addRange(r){assert.equal(r,range);calls.push('restore');}};
 const editor={ownerDocument:{getSelection:()=>selection,execCommand(cmd){calls.push(cmd);}},contains:n=>n===node,addEventListener:(name,fn)=>listeners[name]=fn,focus(){calls.push('focus');},dispatchEvent:e=>calls.push(e.type)};
 const toolbar={querySelector:()=>null,insertAdjacentHTML:(_,html)=>{toolbar.html=html;},addEventListener:(name,fn)=>toolbarListeners[name]=fn};
 runInNewContext(helper,{window,URL,Event:class{constructor(type){this.type=type;}}});
 window.SihphirRichTextEditor.bindAlignment(editor,toolbar);
 for(const [command,label] of [['justifyLeft','Align Left'],['justifyCenter','Align Center'],['justifyRight','Align Right'],['justifyFull','Justify']]){
  assert.ok(toolbar.html.includes('data-rich-align="'+command+'"'));
  assert.ok(toolbar.html.includes('aria-label="'+label+'"'));
  const event={target:{closest:()=>({dataset:{richAlign:command}})},preventDefault(){calls.push('prevent');}};
  toolbarListeners.mousedown(event);
  selection.anchorNode=null;selection.focusNode=null;
  toolbarListeners.click(event);
  assert.deepEqual(calls.splice(0),['prevent','focus','clear','restore',command,'input']);
  selection.anchorNode=node;selection.focusNode=node;
 }
});
test('alignment sanitizer retains only canonical alignment and strips unrelated attributes',()=>{
 const window={};
 let nodes=[];
 class Parser{parseFromString(){return {querySelectorAll:()=>[],body:{querySelectorAll:()=>nodes,get innerHTML(){return nodes.map(n=>'<'+n.tagName.toLowerCase()+[...n.attrs].map(([k,v])=>' '+k+'="'+v+'"').join('')+'>Text</'+n.tagName.toLowerCase()+'>').join('');}}};}}
 const node=(tag,attrs)=>({tagName:tag,attrs:new Map(Object.entries(attrs)),get attributes(){return [...this.attrs].map(([name,value])=>({name,value}));},getAttribute(k){return this.attrs.get(k)||null;},setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},hasAttribute(k){return this.attrs.has(k);}});
 runInNewContext(helper,{window,URL,DOMParser:Parser});
 const rich=window.SihphirRichTextEditor;
 for(const value of ['left','center','right','justify']){
  nodes=[node('P',{style:'color:red; text-align: '+value+'; background:url(javascript:evil)',onclick:'evil()'})];
  const saved=rich.sanitizeHtml('<p>Text</p>');
  assert.equal(saved,'<p style="text-align: '+value+';">Text</p>');
  assert.equal(JSON.parse(JSON.stringify({full_history:saved})).full_history,saved);
  assert.ok(rich.field({key:'history',label:'History',value:saved}).includes(saved));
 }
 nodes=[node('H2',{align:'CENTER'}),node('P',{style:'text-align:expression(evil);color:red'}),node('STRONG',{style:'text-align:right'})];
 assert.equal(rich.sanitizeHtml(''),'<h2 style="text-align: center;">Text</h2><p>Text</p><strong>Text</strong>');
 let paste,inserted;
 nodes=[node('P',{style:'text-align:justify;color:red'})];
 const editor={addEventListener:(name,fn)=>{if(name==='paste')paste=fn;}};
 runInNewContext(helper,{window,URL,DOMParser:Parser,document:{execCommand:(cmd,_,html)=>{assert.equal(cmd,'insertHTML');inserted=html;}}});
 window.SihphirRichTextEditor.bindPaste(editor);
 paste({clipboardData:{getData:()=>'<p>Text</p>'},preventDefault(){}});
 assert.equal(inserted,'<p style="text-align: justify;">Text</p>');
});
test('Fellowship alignment uses shared paste and save sanitizer and public HTML rendering',()=>{
 assert.match(fellowship,/bindPaste\(form.querySelector\('#fellowship-history'\),\{media:true\}\)/);
 assert.match(fellowship,/sanitizeHtml\(historyEditor\?\.innerHTML/);
 assert.match(fellowship,/data\.full_history\|\|''/);
 assert.match(read('../src/lib/cms.ts'),/function fellowshipHistoryToHtml[^]*?return renderMarkdown\(text\)/);
 assert.match(read('../src/components/FellowshipPage.astro'),/set:html=\{historyFull\}/);
 assert.match(sharedCss,/\[data-rich-align\]:focus-visible/);
});
