import { getCollection } from 'astro:content';
import { isPublishedPageSlug, pageUrlPath } from '../lib/pages';
import { absoluteSiteUrl } from '../lib/site';
import { normalizeNotice } from '../lib/notices';

const staticPaths = [
  '/',
  '/committee',
  '/bialtu-pastor',
  '/document',
  '/elders-history',
  '/fellowship',
  '/fellowship/kohhran-hmeichhia',
  '/fellowship/kpp',
  '/fellowship/ktp',
  '/fellowship/masihi-sangati',
  '/gallery',
  '/missionary-ministry',
  '/missionary',
  '/notices',
  '/pastoral-history',
  '/probationary-pastor',
  '/kohhran-upa',
];

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
}[character] ?? character));

export async function GET() {
  const [pages, notices] = await Promise.all([getCollection('pages'), getCollection('notices')]);
  const contentPaths = pages
    .filter((page) => isPublishedPageSlug(page.slug))
    .map((page) => pageUrlPath(page.slug, page.data.path));
  const noticePaths = notices
    .filter((notice) => notice.id.startsWith('announcements/'))
    .map(normalizeNotice)
    .filter((notice) => notice.published)
    .map((notice) => `/notices/${notice.slug}`);
  const urls = [...new Set([...staticPaths, ...contentPaths, ...noticePaths])];
  const entries = urls
    .map((path) => `  <url><loc>${escapeXml(absoluteSiteUrl(path))}</loc></url>`)
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
