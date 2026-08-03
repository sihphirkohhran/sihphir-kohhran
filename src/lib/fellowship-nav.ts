import { fellowshipMeta } from './fellowship-meta';
import type { NavItem } from './navigation';

/** Fellowship detail routes — auto-merged under the Fellowship nav parent at build time. */
export function getFellowshipNavItems(): NavItem[] {
  return Object.entries(fellowshipMeta).map(([slug, meta], index) => ({
    label: meta.name,
    href: `/fellowship/${slug}`,
    key: `fellowship-${slug}`,
    parent: 'fellowship',
    order: (index + 1) * 10,
    visible: true,
  }));
}
