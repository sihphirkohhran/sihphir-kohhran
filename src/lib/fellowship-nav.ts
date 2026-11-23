import { getCollection } from 'astro:content';
import { fellowshipMeta } from './fellowship-meta';
import { publishedFellowships } from './fellowship-records';
import type { NavItem } from './navigation';

/** Published Fellowship routes, merged under the existing Fellowship nav parent at build time. */
export function fellowshipNavItems(entries: Parameters<typeof publishedFellowships>[0]): NavItem[] {
  const known = Object.keys(fellowshipMeta);
  return publishedFellowships(entries)
    .map(({ slug, entry }) => {
      const meta = fellowshipMeta[slug as keyof typeof fellowshipMeta];
      return {
        label: meta?.name ?? entry.data.fellowship_name ?? slug.replace(/-/g, ' '),
        href: `/fellowship/${slug}`,
        key: `fellowship-${slug}`,
        parent: 'fellowship',
        order: meta ? (known.indexOf(slug) + 1) * 10 : (entry.data.display_order ?? entry.data.homepage_order ?? 999) + 100,
        visible: true,
      };
    }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.key.localeCompare(b.key));
}

export async function getFellowshipNavItems(): Promise<NavItem[]> {
  return fellowshipNavItems(await getCollection('fellowship'));
}
