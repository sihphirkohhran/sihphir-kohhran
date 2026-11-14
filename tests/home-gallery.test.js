import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/pages/index.astro');
const gallery = read('../src/lib/gallery.ts');
const css = read('../src/styles/global.css');

test('homepage gallery uses real CMS photos only and never duplicates image sources', () => {
  assert.match(home, /Math\.min\(6, positiveCount\(home\.galleryCount, 6\)\)/);
  assert.match(home, /const gallerySeen = new Set<string>\(\)/);
  assert.match(home, /gallerySeen\.has\(photo\.src\)/);
  assert.match(home, /gallerySource\.length > 0\s*\?\s*pickHomeGalleryPhotos\(gallerySource, galleryCount\)\s*:\s*\[\]/);
  assert.match(home, /galleryPhotos\.length > 0/);
  assert.doesNotMatch(home, /getFallbackGalleryPhotos/);
});

test('homepage gallery preserves CMS alt text, captions and album destinations', () => {
  assert.match(gallery, /alt: photoAlt\.trim\(\) \|\| data\.caption/);
  assert.match(gallery, /caption: photoCaption\.trim\(\) \|\| data\.caption/);
  assert.match(gallery, /albumUrl: data\.album_url/);
  assert.match(gallery, /if \(data\.photo && !rawPhotos\.some/);
  assert.match(home, /href=\{photo\.albumUrl\}/);
  assert.match(home, /data-lightbox-caption=\{photo\.caption\}/);
  assert.match(home, /alt=\{photo\.alt\}/);
});

test('homepage gallery has a compact responsive landscape grid and accessible navigation', () => {
  assert.match(css, /\.home-gallery-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 767px\)\s*\{\s*\.home-gallery-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 480px\)\s*\{\s*\.home-gallery-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /aspect-ratio:\s*4 \/ 3/);
  assert.match(css, /object-fit:\s*cover/);
  assert.match(css, /\.home-gallery-photo:focus-visible/);
  assert.match(home, /loading="lazy"/);
  assert.match(home, /decoding="async"/);
  assert.match(home, /href="\/gallery"/);
  assert.match(home, /View Full Gallery →/);
  assert.match(home, /No gallery photographs are available yet/);
});
