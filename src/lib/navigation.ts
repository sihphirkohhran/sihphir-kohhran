export type NavItem = {
  label: string;
  href: string;
  key: string;
  visible?: boolean;
  order?: number;
  parent?: string;
  open_in_new_tab?: boolean;
  new_tab?: boolean;
  target?: string;
  openInNewTab?: boolean;
};

export type NavItemWithChildren = NavItem & {
  children: NavItem[];
};

/** Default menu — preserved when CMS navigation is empty */
export const DEFAULT_NAV: NavItem[] = [
  { label: 'Home', href: '/', key: 'home', visible: true, order: 0, parent: '' },
  { label: 'Committee', href: '/committee', key: 'committee', visible: true, order: 10, parent: '' },
  { label: 'Rawngbawltute', href: '/bialtu-pastor', key: 'rawngbawltu', visible: true, order: 15, parent: '' },
  { label: 'Bialtu Pastor', href: '/bialtu-pastor', key: 'bialtu-pastor', visible: true, order: 0, parent: 'rawngbawltu' },
  { label: 'Pro Pastor', href: '/probationary-pastor', key: 'pro-pastor', visible: true, order: 1, parent: 'rawngbawltu' },
  { label: 'Kohhran Upa', href: '/kohhran-upa', key: 'kohhran-upa', visible: true, order: 2, parent: 'rawngbawltu' },
  { label: 'Missionary', href: '/missionary', key: 'missionary', visible: true, order: 3, parent: 'rawngbawltu' },
  { label: 'Fellowship', href: '/fellowship', key: 'fellowship', visible: true, order: 20, parent: '' },
  { label: 'Gallery', href: '/gallery', key: 'gallery', visible: true, order: 30, parent: '' },
  { label: 'Document', href: '/document', key: 'document', visible: true, order: 40, parent: '' },
];

export function normalizeNavItems(items: NavItem[] | undefined): NavItem[] {
  if (!items?.length) return [...DEFAULT_NAV];
  return items.map((item, i) => ({
    ...item,
    key: (item.key || slugFromHref(item.href) || `nav-${i}`).trim(),
    order: item.order ?? i * 10,
    parent: normalizeParentKey(item.parent),
    visible: item.visible !== false,
    openInNewTab:
      item.openInNewTab ??
      item.open_in_new_tab ??
      item.new_tab ??
      item.target === '_blank',
  }));
}

export function slugFromHref(href: string): string {
  const path = href.replace(/\/$/, '') || '/';
  if (path === '/') return 'home';
  return path.replace(/^\//, '').replace(/\//g, '-');
}

function normalizeParentKey(parent?: string): string {
  return (parent ?? '').trim();
}

/** Map parent keys to existing menu keys (case-insensitive). */
function resolveParentKeys(items: NavItem[]): NavItem[] {
  const keys = new Map(items.map((i) => [i.key.toLowerCase(), i.key]));
  return items.map((item) => {
    const parent = normalizeParentKey(item.parent);
    if (!parent) return item;
    const resolved = keys.get(parent.toLowerCase());
    return resolved ? { ...item, parent: resolved } : item;
  });
}

export function buildNavTree(items: NavItem[]): NavItemWithChildren[] {
  const sorted = resolveParentKeys(
    [...items].filter((i) => i.visible !== false),
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const roots = sorted.filter((i) => !normalizeParentKey(i.parent));
  return roots.map((root) => ({
    ...root,
    children: sorted.filter(
      (c) => normalizeParentKey(c.parent) === root.key,
    ),
  }));
}

function normalizePath(path: string): string {
  return path.replace(/\/$/, '') || '/';
}

function pathMatches(href: string, currentPath: string): boolean {
  const link = normalizePath(href);
  const path = normalizePath(currentPath);
  if (path === link) return true;
  if (link !== '/' && path.startsWith(`${link}/`)) return true;
  return false;
}

/**
 * Active state for nav links and submenu parents.
 * Parents highlight when any child route is active.
 */
export function isNavActive(
  item: Pick<NavItem, 'href' | 'key'>,
  activePage: string,
  currentPath: string,
  children: NavItem[] = [],
): boolean {
  if (pathMatches(item.href, currentPath)) return true;

  if (children.some((child) => pathMatches(child.href, currentPath))) return true;

  if (activePage) {
    const itemKey = item.key || slugFromHref(item.href);
    if (activePage === itemKey) return true;
    if (children.some((c) => activePage === (c.key || slugFromHref(c.href)))) {
      return true;
    }
  }

  return false;
}

export function isNavChildActive(
  child: NavItem,
  activePage: string,
  currentPath: string,
): boolean {
  return isNavActive(child, activePage, currentPath);
}
