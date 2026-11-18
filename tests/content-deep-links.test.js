import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildContentDeepLink, contentEntryIdMatches, normalizeContentEntryId, resolveContentDeepLink } from '../src/lib/content-deep-links.js';
import { resolveCategoryFromSearch } from '../src/lib/category-query.js';
import { shouldOpenExternalAlbum } from '../src/lib/gallery-navigation.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const galleryPage = read('../src/pages/gallery.astro');
const documentPage = read('../src/pages/document.astro');
const galleryManager = read('../public/admin/gallery-manager.js');
const documentManager = read('../public/admin/document-manager.js');
const galleryCss = read('../public/admin/gallery-manager.css');
const documentCss = read('../public/admin/document-manager.css');
const productionOrigin = 'https://sihphirpresbyteriankohhran.org';


test('Astro 4 Markdown collection IDs normalize to CMS path identifiers for real saved records', () => {
  const savedDocumentPath = 'src/content/documents/other/year-book-2025.md';
  const savedGalleryPath = 'src/content/gallery/tumkau-ni-2026-2026.md';
  const astroDocumentEntryId = 'other/year-book-2025.md';
  const astroGalleryEntryId = 'tumkau-ni-2026-2026.md';
  assert.equal(existsSync(new URL('../src/content/documents/other/year-book-2025.md', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/content/gallery/tumkau-ni-2026-2026.md', import.meta.url)), true);
  const cmsDocumentIdentifier = savedDocumentPath.replace('src/content/documents/', '').replace(/\.md$/i, '');
  const cmsGalleryIdentifier = savedGalleryPath.replace('src/content/gallery/', '').replace(/\.md$/i, '');

  assert.equal(normalizeContentEntryId(astroDocumentEntryId), cmsDocumentIdentifier);
  assert.equal(normalizeContentEntryId(astroGalleryEntryId), cmsGalleryIdentifier);
  assert.equal(contentEntryIdMatches(astroDocumentEntryId, 'other/year-book-2025'), true);
  assert.equal(contentEntryIdMatches(astroDocumentEntryId, 'other/year-book-2025.md'), true);
  assert.equal(contentEntryIdMatches(astroGalleryEntryId, 'tumkau-ni-2026-2026'), true);
  assert.equal(contentEntryIdMatches(astroGalleryEntryId, 'tumkau-ni-2026-2026.md'), true);
  assert.equal(contentEntryIdMatches(astroDocumentEntryId, 'other/not-the-year-book'), false);
  assert.equal(contentEntryIdMatches(astroGalleryEntryId, ''), false);
});

test('deep-link helpers create absolute production URLs with stable encoded identifiers', () => {
  assert.equal(buildContentDeepLink(productionOrigin, '/gallery', 'album', 'good-friday-2025'), productionOrigin + '/gallery?album=good-friday-2025');
  assert.equal(buildContentDeepLink(productionOrigin, '/document', 'document', 'other/year-book 2025'), productionOrigin + '/document?document=other%2Fyear-book+2025');
  assert.equal(buildContentDeepLink(productionOrigin, '/gallery', 'album', ''), null);
  assert.equal(resolveContentDeepLink('?album=good-friday-2025', 'album'), 'good-friday-2025');
  assert.equal(resolveContentDeepLink('?document=other%2Fyear-book', 'document'), 'other/year-book');
  assert.equal(resolveContentDeepLink('?document=', 'document'), null);
  assert.equal(resolveContentDeepLink('', 'document'), null);
});

test('Gallery direct links resolve by the collection entry ID and retain legacy album fragments', () => {
  assert.ok(galleryPage.includes('contentId: normalizeContentEntryId(entry.id)'));
  assert.ok(galleryPage.includes('data-album-key={album.contentId}'));
  assert.ok(galleryPage.includes("new URLSearchParams(window.location.search).get('album')"));
  assert.ok(galleryPage.includes("const findAlbumDetail = (key: string) => albumDetails.find(detail => contentEntryIdMatches(detail.dataset.albumKey || '', key));"));
  assert.ok(galleryPage.includes("import { contentEntryIdMatches } from '../lib/content-deep-links';"));
  assert.ok(galleryPage.includes("window.location.hash.startsWith('#album-')"));
  assert.ok(galleryPage.includes("history.pushState({ galleryAlbum: true }"));
  assert.ok(galleryPage.includes("window.addEventListener('popstate'"));
  assert.ok(galleryPage.includes('history.back()'));
  assert.ok(galleryPage.includes("url.searchParams.delete('album')"));
  assert.ok(galleryPage.includes('Back to Gallery'));
});

test('Gallery internal album click handler passes its declared anchor trigger (no undefined card identifier)', () => {
  const handlerStart = galleryPage.indexOf("document.querySelectorAll<HTMLAnchorElement>('[data-open-album]')");
  const handlerEnd = galleryPage.indexOf("document.querySelectorAll<HTMLButtonElement>('[data-close-album]')", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'internal album click handler should be present');
  const handler = galleryPage.slice(handlerStart, handlerEnd);
  assert.match(handler, /openAlbumDetail\(detail,\s*'smooth',\s*button\)/);
  assert.doesNotMatch(handler, /\bcard\b/, 'handler must not reference an undeclared card variable');
});

test('Gallery preserves external Google Photos and Drive navigation for zero-or-one unique photo albums', () => {
  assert.equal(shouldOpenExternalAlbum(0, 'https://drive.google.com/drive/folders/example'), true);
  assert.equal(shouldOpenExternalAlbum(1, 'https://photos.google.com/share/example'), true);
  assert.equal(shouldOpenExternalAlbum(2, 'https://drive.google.com/drive/folders/example'), false);
  assert.equal(shouldOpenExternalAlbum(1, 'javascript:alert(1)'), false);
  assert.match(galleryPage, /externalNavigation: shouldOpenExternalAlbum\(photos\.length, data\.album_url\)/);
  assert.ok(galleryPage.includes('href={album.externalNavigation ? album.albumUrl'));
  assert.match(galleryManager, /uniqueSources\.size<=1&&validExternal/);
  assert.ok(galleryManager.includes('copyAbsoluteLink(externalUrl,notification)'));
});

test('Document rows expose stable IDs and direct one-file links follow original file behavior', () => {
  assert.equal((documentPage.match(/data-document-id=\{document\.id\}/g) || []).length, 2);
  assert.ok(documentPage.includes("resolveContentDeepLink(window.location.search, 'document')"));
  assert.ok(documentPage.includes("contentEntryIdMatches(item.dataset.documentId || '', requestedId)"));
  assert.ok(documentPage.includes("import { contentEntryIdMatches, resolveContentDeepLink } from '../lib/content-deep-links';"));
  assert.ok(documentPage.includes('if (options.fromUrl) window.location.replace(files[0].url)'));
  assert.ok(documentPage.includes("window.open(files[0].url, '_blank', 'noopener,noreferrer')"));
});

test('Document direct multi-file links open the existing accessible file dialog and support history navigation', () => {
  assert.match(documentPage, /if \(files\.length < 2 \|\| !dialog/);
  assert.ok(documentPage.includes('dialog.showModal()'));
  assert.ok(documentPage.includes('closeDialog?.focus()'));
  assert.ok(documentPage.includes("dialog?.addEventListener('close'"));
  assert.ok(documentPage.includes('history.pushState({ documentDialog: true }'));
  assert.ok(documentPage.includes('if (hasDocumentLink && history.state?.documentDialog) {\n      history.back();'));
  assert.ok(documentPage.includes("window.addEventListener('popstate'"));
  assert.ok(documentPage.includes("contentEntryIdMatches(item.dataset.documentId || '', requestedId)"));
  assert.ok(documentPage.includes('clearDocumentDeepLink()'));
  assert.ok(documentPage.includes('lastFocusedRow?.focus()'));
  assert.ok(documentPage.includes('if (hasDocumentLink && history.state?.documentDialog) {\n      history.back();'));

});

test('invalid or deleted content identifiers are removed without breaking the listing', () => {
  assert.match(galleryPage, /if \(requestedId \|\| legacyId\)/);
  assert.ok(galleryPage.includes("url.searchParams.delete('album')"));
  assert.ok(documentPage.includes("if (!row) { clearDocumentDeepLink(); return; }"));
  assert.ok(documentPage.includes("if (!row) { clearDocumentDeepLink(); if (dialog?.open) dialog.close(); return; }"));
  assert.equal(resolveContentDeepLink('?album=missing-id', 'album'), 'missing-id');
  assert.equal(resolveContentDeepLink('?document=deleted-id', 'document'), 'deleted-id');
});

test('CMS Copy Album Link uses saved path identity, production origin, clipboard feedback, and disables unsaved items', () => {
  assert.ok(galleryManager.includes('id="gallery-copy-link"'));
  assert.match(galleryManager, /gallery-copy-link[^\\n]+disabled/);
  assert.ok(galleryManager.includes('selected.path.startsWith(GALLERY_ROOT)'));
  assert.ok(galleryManager.includes("url.searchParams.set('album',identifier)"));
  assert.ok(galleryManager.includes('window.SIHPHIR_PUBLIC_SITE_ORIGIN'));
  assert.ok(galleryManager.includes("notification('Copied!')"));
  assert.ok(galleryManager.includes('Could not copy link. Check your browser clipboard permissions.'));
});

test('CMS Copy Document Link uses the saved collection ID and production origin', () => {
  assert.ok(documentManager.includes('id="document-copy-link"'));
  assert.match(documentManager, /document-copy-link[^\\n]+disabled/);
  assert.ok(documentManager.includes("selected.path.startsWith('src/content/documents/')"));
  assert.ok(documentManager.includes("url.searchParams.set('document',identifier)"));
  assert.ok(documentManager.includes('window.SIHPHIR_PUBLIC_SITE_ORIGIN'));
  assert.ok(documentManager.includes("notification('Copied!')"));
  assert.ok(documentManager.includes('Could not copy link. Check your browser clipboard permissions.'));
});

test('existing category copy links and URL category filtering remain present', () => {
  assert.ok(galleryManager.includes("copyCategoryLink(category?.name,'/gallery',notification)"));
  assert.ok(documentManager.includes("copyCategoryLink(category?.name,'/document',notification)"));
  assert.equal(resolveCategoryFromSearch('?category=Good%20Friday', ['Good Friday']), 'Good Friday');
  assert.equal(resolveCategoryFromSearch('?category=missing', ['Good Friday']), null);
});

test('editor copy controls retain responsive CMS layouts on desktop and mobile', () => {
  assert.ok(galleryCss.includes('@media(max-width:800px)'));
  assert.ok(galleryCss.includes('.gallery-editor-actions'));
  assert.ok(documentCss.includes('@media(max-width:800px)'));
  assert.ok(documentCss.includes('.document-editor-actions'));
  assert.ok(galleryManager.includes('Copy Album Link'));
  assert.ok(documentManager.includes('Copy Document Link'));
});
