import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  assert.match(committee, /selected\.body=document\.querySelector\('#committee-rich-editor'\)\.innerHTML/);
  assert.match(committee, /selected\.body\?\?''/);
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
  assert.match(ministry, /contenteditable="true" data-rich=/);
});

test('Committee public output uses the existing safe rich-text sanitizer', () => {
  assert.match(publicCommittee, /renderSafeRichText\(body\)/);
  for (const tag of ["'ul'", "'ol'", "'li'", "'a'"]) assert.ok(sanitizer.includes(tag));
  assert.match(sanitizer, /https\?:|mailto:/);
  assert.match(sanitizer, /renderSafeRichText/);
});
