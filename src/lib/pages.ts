import { getCollection } from 'astro:content';
import type { NavItem } from './navigation';

const PAGE_SLUG_EXCLUDE = new Set(['archive-readme', '.gitkeep']);

export function isPublishedPageSlug(slug: string): boolean {
  return !slug.startsWith('_') && !PAGE_SLUG_EXCLUDE.has(slug);
}

export function isPublicPage(page: { slug: string; data: { status?: string; published?: boolean } }): boolean {
  return isPublishedPageSlug(page.slug) && page.data.status !== 'draft' && page.data.published !== false;
}

export function pageUrlPath(slug: string, customPath?: string): string {
  const trimmed = customPath?.trim();
  const path = trimmed ? trimmed : `/p/${slug}`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.replace(/\/+$/, '') || '/';
}

/** CMS pages with show_in_nav — merged into site navigation at build time */
export async function getPagesForNav(): Promise<NavItem[]> {
  const pages = await getCollection('pages');
  return pages
    .filter((p) => isPublicPage(p) && p.data.show_in_nav)
    .map((p) => ({
      label: p.data.nav_label || p.data.title,
      href: pageUrlPath(p.slug, p.data.path),
      key: (p.data.nav_key || p.slug).trim(),
      order: p.data.nav_order ?? 100,
      parent: (p.data.nav_parent ?? '').trim(),
      visible: true,
    }));
}

/** Merge manual nav with auto-generated links (CMS pages + fellowship routes). Manual entries win on same key. */
export function mergeNavWithPages(navItems: NavItem[], autoItems: NavItem[]): NavItem[] {
  const byKey = new Map<string, NavItem>();
  const byHref = new Map<string, NavItem>();

  for (const item of navItems) {
    byKey.set(item.key, item);
    byHref.set(item.href, item);
  }

  for (const auto of autoItems) {
    const existing = byKey.get(auto.key) ?? byHref.get(auto.href);
    if (existing) {
      byKey.set(auto.key, {
        ...existing,
        label: existing.label || auto.label,
        href: existing.href || auto.href,
        parent: existing.parent || auto.parent,
        order: existing.order ?? auto.order,
      });
    } else {
      byKey.set(auto.key, auto);
      byHref.set(auto.href, auto);
    }
  }

  return [...byKey.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
