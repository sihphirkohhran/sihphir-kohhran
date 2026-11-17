import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/gallery.astro', import.meta.url), 'utf8');

test('full album action replaces the explanatory copy with the requested concise label', () => {
  assert.doesNotMatch(page, /More photographs are available in the complete online album\\./);
  assert.match(page, /<span>View Full Album<\\/span>/);
  assert.doesNotMatch(page, /View Complete Album/);
});

test('full album action is rendered only for albums with their CMS albumUrl', () => {
  assert.match(page, /\\{album\\.albumUrl && <div class="complete-album-action">/);
  assert.match(page, /albumUrl: data\\.album_url \\|\\| ''/);
  assert.doesNotMatch(page, /complete-album-action[^}]*href="#"|full-album-link[^}]*placeholder/i);
});

test('full album link preserves the CMS destination and safe external-tab attributes', () => {
  assert.match(page, /<a class="full-album-link" href=\\{album\\.albumUrl\\} target="_blank" rel="noopener noreferrer">/);
  assert.match(page, /<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">/);
});

test('full album action is centered, compact, navy, touch-friendly and keyboard-visible', () => {
  assert.match(page, /\\.complete-album-action\\{display:flex;justify-content:center;margin-top:22px\\}/);
  assert.match(page, /\\.full-album-link\\{display:inline-flex;min-height:44px;[^}]*padding:12px 22px;background:#142740;color:#fff;font-family:"Poppins",sans-serif;font-size:14px;font-weight:600/);
  assert.match(page, /\\.full-album-link:hover\\{[^}]*#b8953f/);
  assert.match(page, /\\.full-album-link:focus-visible\\{outline:3px solid #b8953f/);
  assert.match(page, /@media\\(max-width:560px\\)\\{\\.complete-album-action\\{margin-top:22px\\}\\.full-album-link\\{min-height:48px/);
  assert.doesNotMatch(page, /\\.complete-album\\{/);
});

test('album photo grid and lightbox controls remain unchanged', () => {
  assert.match(page, /<div class="photo-grid">\\{album\\.photos\\.map/);
  assert.match(page, /class="photo-card" data-photo data-album=\\{album\\.id\\} data-index=\\{index\\}/);
  assert.match(page, /id="photo-lightbox"/);
  assert.match(page, /data-lightbox-previous/);
  assert.match(page, /data-lightbox-next/);
  assert.match(page, /document\\.querySelectorAll<HTMLButtonElement>\\('\[data-photo\\]'\\)/);
  assert.match(page, /lightbox\\?\\.showModal\\(\\)/);
  assert.match(page, /download\\.href=item\\.dataset\\.src/);
});
