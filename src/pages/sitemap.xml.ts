import { getCollection } from 'astro:content';
import { isPublishedPageSlug, pageUrlPath } from '../lib/pages';
import { absoluteSiteUrl } from '../lib/site';

const staticPaths = [
  '/',
  '/committee',
  '/document',
  '/elders-history',
  '/fellowship',
  '/fellowship/kohhran-hmeichhia',
  '/fellowship/kpp',
  '/fellowship/ktp',
  '/fellowship/masihi-sangati',
  '/gallery',
  '/missionary-ministry',
  '/pastoral-history',
];

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
}[character] ?? character));

export async function GET() {
  const pages = await getCollection('pages');
  const contentPaths = pages
    .filter((page) => isPublishedPageSlug(page.slug))
    .map((page) => pageUrlPath(page.slug, page.data.path));
  const urls = [...new Set([...staticPaths, ...contentPaths])];
  const entries = urls
    .map((path) => `  <url><loc>${escapeXml(absoluteSiteUrl(path))}</loc></url>`)
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
