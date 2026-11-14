import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/pages/index.astro');
const gallery = read('../src/lib/gallery.ts');
const css = read('../src/styles/global.css');
const layout = read('../src/layouts/BaseLayout.astro');
const fullGallery = read('../src/pages/gallery.astro');

test('homepage gallery uses real CMS photos only and never duplicates image sources', () => {
  assert.match(home, /Math\.min\(6, positiveCount\(home\.galleryCount, 6\)\)/);
  assert.match(home, /const gallerySeen = new Set<string>\(\)/);
  assert.match(home, /gallerySeen\.has\(photo\.src\)/);
  assert.match(home, /gallerySource\.length > 0\s*\?\s*pickHomeGalleryPhotos\(gallerySource, galleryCount\)\s*:\s*\[\]/);
  assert.match(home, /galleryPhotos\.length > 0/);
  assert.doesNotMatch(home, /getFallbackGalleryPhotos/);
});

test('homepage gallery photos all open the shared lightbox with CMS captions and alt text', () => {
  assert.match(gallery, /alt: photoAlt\.trim\(\) \|\| data\.caption/);
  assert.match(gallery, /caption: photoCaption\.trim\(\) \|\| data\.caption/);
  assert.match(gallery, /albumUrl: data\.album_url/);
  assert.match(home, /data-lightbox-src=\{photo\.src\}/);
  assert.match(home, /data-lightbox-caption=\{photo\.caption\}/);
  assert.match(home, /data-lightbox-alt=\{photo\.alt\}/);
  assert.match(home, /aria-label=\{\`View \$\{photo\.alt\}\`\}/);
  assert.doesNotMatch(home, /href=\{photo\.albumUrl\}/);
  assert.match(layout, /alt: string/);
  assert.match(layout, /data-lightbox-alt/);
  assert.match(layout, /lbImg\.alt = slide\.alt/);
  assert.match(layout, /stepLightbox\(-1\)/);
  assert.match(layout, /stepLightbox\(1\)/);
  assert.match(layout, /touchstart/);
  assert.match(layout, /e\.key === 'Escape'/);
});

test('homepage gallery stays three columns on desktop and two columns at tablet and narrow mobile widths', () => {
  assert.match(css, /\.home-gallery-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 767px\)\s*\{\s*\.home-gallery-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(css, /@media \(max-width: 480px\)\s*\{\s*\.home-gallery-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /aspect-ratio:\s*4 \/ 3/);
  assert.match(css, /object-fit:\s*cover/);
  assert.match(css, /border-radius:\s*5px/);
  assert.match(css, /\.home-gallery-photo:focus-visible/);
  assert.match(home, /loading="lazy"/);
  assert.match(home, /decoding="async"/);
  assert.match(home, /href="\/gallery"/);
  assert.match(home, /View Full Gallery →/);
  assert.match(home, /No gallery photographs are available yet/);
});

test('full Gallery page retains album destinations and its own photo viewer', () => {
  assert.match(fullGallery, /albumUrl: data\.album_url/);
  assert.match(fullGallery, /href=\{album\.albumUrl\}/);
  assert.match(fullGallery, /data-photo/);
  assert.match(fullGallery, /data-lightbox-previous|data-lightbox-next/);
});
