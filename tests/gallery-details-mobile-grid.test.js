import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');
const style = page.slice(page.indexOf('<style>'), page.indexOf('</style>'));

test('Gallery Details photo grid stays two columns on narrow mobile screens', () => {
  assert.ok(style.includes('.photo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}'));
  assert.ok(style.includes('@media(max-width:850px)'));
  assert.ok(style.includes('.album-grid,.photo-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'));
  assert.ok(style.includes('@media(max-width:560px)'));
  assert.ok(style.includes('.album-grid{grid-template-columns:1fr}.photo-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'));
  assert.ok(!style.includes('.album-grid,.photo-grid{grid-template-columns:1fr}'));
});

test('mobile thumbnails retain 4:3 cropping and listing cards remain single-column', () => {
  assert.ok(style.includes('.album-grid{grid-template-columns:1fr}'));
  assert.ok(style.includes('.photo-card{position:relative;aspect-ratio:4/3;overflow:hidden'));
  assert.ok(style.includes('.photo-card img{width:100%;height:100%;object-fit:cover'));
});

test('photo grid click targets and album lightbox features remain intact', () => {
  assert.ok(page.includes('<div class="photo-grid">{album.photos.map'));
  assert.ok(page.includes('class="photo-card" data-photo data-album={album.id} data-index={index}'));
  assert.ok(page.includes('id="photo-lightbox"'));
  assert.ok(page.includes('data-lightbox-previous'));
  assert.ok(page.includes('data-lightbox-next'));
  assert.ok(page.includes('id="lightbox-zoom"'));
  assert.ok(page.includes('id="lightbox-download"'));
  assert.ok(page.includes('class="photo-heading"'));
  assert.ok(page.includes('class="back-button" data-close-album'));
  assert.ok(page.includes('class="full-album-link"'));
});
