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
  assert.match(helper, /window\.SihphirRichTextEditor=\{safeUrl,sanitizeHtml,bindPaste,field,mount,read\}/);
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

test('PES school data remains untouched and contains existing HTML content', () => {
  const data = JSON.parse(schoolData);
  assert.equal(data.information.establishment_year, '2014');
  assert.ok(data.history.includes('<h2>'));
  assert.ok(data.history.includes('<a href='));
  assert.equal(data.vision_mission, 'Test');
  assert.equal(data.management.members[0].name, 'Test');
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
