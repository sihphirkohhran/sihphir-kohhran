import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('full album action removes explanatory copy and uses the requested label', () => {
  assert.ok(!page.includes('More photographs are available in the complete online album.'));
  assert.ok(page.includes('<span>View Full Album</span>'));
  assert.ok(!page.includes('View Complete Album'));
});

test('full album action is conditional on the existing CMS albumUrl field', () => {
  assert.ok(page.includes('{album.albumUrl && <div class="complete-album-action">'));
  assert.ok(page.includes("albumUrl: data.album_url || ''"));
  assert.ok(!page.includes('href="#"'));
  assert.ok(!page.includes('complete-album'));
});

test('full album link preserves the CMS URL and safe new-tab behavior', () => {
  assert.ok(page.includes('<a class="full-album-link" href={album.albumUrl} target="_blank" rel="noopener noreferrer">'));
  assert.ok(page.includes('<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">'));
});

test('full album action has centered compact navy styling and visible focus treatment', () => {
  assert.ok(page.includes('.complete-album-action{display:flex;justify-content:center;margin-top:22px}'));
  assert.ok(page.includes('.full-album-link{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:9px;border:1px solid #142740;border-radius:8px;padding:12px 22px;background:#142740;color:#fff;font-family:"Poppins",sans-serif;font-size:14px;font-weight:600'));
  assert.ok(page.includes('.full-album-link:hover{border-color:#b8953f'));
  assert.ok(page.includes('.full-album-link:focus-visible{outline:3px solid #b8953f'));
  assert.ok(page.includes('@media(max-width:560px){.complete-album-action{margin-top:22px}.full-album-link{min-height:48px'));
  assert.ok(!page.includes('.complete-album{'));
});

test('album photo grid, lightbox navigation and downloads remain intact', () => {
  assert.ok(page.includes('<div class="photo-grid">{album.photos.map'));
  assert.ok(page.includes('class="photo-card" data-photo data-album={album.id} data-index={index}'));
  assert.ok(page.includes('id="photo-lightbox"'));
  assert.ok(page.includes('data-lightbox-previous'));
  assert.ok(page.includes('data-lightbox-next'));
  assert.ok(page.includes("document.querySelectorAll<HTMLButtonElement>('[data-photo]')"));
  assert.ok(page.includes('lightbox?.showModal()'));
  assert.ok(page.includes('download.href=item.dataset.src'));
});
