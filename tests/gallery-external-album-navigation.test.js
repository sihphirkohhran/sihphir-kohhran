import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isValidExternalAlbumUrl, shouldOpenExternalAlbum, uniqueGalleryPhotos } from '../src/lib/gallery-navigation.js';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('one unique photo with a valid external album URL opens externally', () => {
  assert.equal(shouldOpenExternalAlbum(1, 'https://photos.google.com/share/example'), true);
  assert.equal(shouldOpenExternalAlbum(1, 'https://drive.google.com/drive/folders/example'), true);
});

test('one unique photo without an external URL stays in Album Details', () => {
  assert.equal(shouldOpenExternalAlbum(1, ''), false);
});

test('multiple unique photos stay in Album Details even with an external URL', () => {
  assert.equal(shouldOpenExternalAlbum(2, 'https://photos.google.com/share/example'), false);
  assert.equal(shouldOpenExternalAlbum(5, 'https://drive.google.com/drive/folders/example'), false);
});

test('zero photos with a valid external URL opens externally', () => {
  assert.equal(shouldOpenExternalAlbum(0, 'https://drive.google.com/drive/folders/example'), true);
});

test('zero photos without an external URL retain safe internal details navigation', () => {
  assert.equal(shouldOpenExternalAlbum(0, ''), false);
  assert.match(page, /href=\{album\.externalNavigation \? album\.albumUrl : `#album-\$\{album\.id\}`\}/);
});

test('featured and album photo references are de-duplicated by trimmed source without changing order', () => {
  const input = [
    { src: '/uploads/featured.jpg', caption: 'Featured first' },
    { src: ' /uploads/second.jpg ' },
    { src: '/uploads/featured.jpg', caption: 'Duplicate featured reference' },
    { src: '/uploads/third.jpg' },
    { src: '/uploads/second.jpg' },
  ];
  const result = uniqueGalleryPhotos(input);
  assert.deepEqual(result.map((photo) => photo.src), ['/uploads/featured.jpg', '/uploads/second.jpg', '/uploads/third.jpg']);
  assert.equal(result[0].caption, 'Featured first');
  assert.match(page, /uniqueGalleryPhotos\(raw\.map/);
  assert.match(page, /if \(featuredPhoto && !photos\.some\(\(photo\) => photo\.src === featuredPhoto\)\) photos\.unshift/);
});

test('external album URLs must be absolute HTTP or HTTPS URLs', () => {
  assert.equal(isValidExternalAlbumUrl('https://photos.google.com/share/example'), true);
  assert.equal(isValidExternalAlbumUrl('http://example.com/album'), true);
  assert.equal(isValidExternalAlbumUrl('/relative/album'), false);
  assert.equal(isValidExternalAlbumUrl('javascript:alert(1)'), false);
  assert.equal(isValidExternalAlbumUrl('not a URL'), false);
});

test('both featured and archive cards become safe external links without internal click handlers', () => {
  assert.equal(page.split('href={album.externalNavigation ? album.albumUrl : `#album-${album.id}`}').length - 1, 2);
  assert.equal(page.split("target={album.externalNavigation ? '_blank' : undefined}").length - 1, 2);
  assert.equal(page.split("rel={album.externalNavigation ? 'noopener noreferrer' : undefined}").length - 1, 2);
  assert.equal(page.split('data-open-album={!album.externalNavigation ? album.id : undefined}').length - 1, 2);
  assert.equal(page.split('View External Album ↗').length - 1, 2);
  assert.match(page, /querySelectorAll<HTMLAnchorElement>\('\[data-open-album\]'\)/);
  assert.match(page, /gallery-card-link:focus-visible\{outline:3px solid #b8953f/);
});

test('internal Album Details and lightbox navigation remain intact', () => {
  assert.match(page, /#album-\$\{button\.dataset\.openAlbum\}/);
  assert.match(page, /data-close-album/);
  assert.match(page, /data-photo/);
  assert.match(page, /data-lightbox-previous/);
  assert.match(page, /data-lightbox-next/);
  assert.match(page, /lightbox\?\.showModal\(\)/);
  assert.match(page, /View Full Album/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
});
