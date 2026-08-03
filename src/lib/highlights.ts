export type HighlightItem = {
  enabled?: boolean;
  type?: string;
  title: string;
  description?: string;
  link: string;
  image?: string;
  style?: string;
};

/** Map CMS fields (title/link or legacy label/href) to component shape. */
export function normalizeHighlights(
  items: Record<string, unknown>[] | undefined,
): HighlightItem[] {
  if (!items?.length) return [];
  return items.map((item) => ({
    enabled: item.enabled as boolean | undefined,
    type: item.type as string | undefined,
    style: item.style as string | undefined,
    title: String(item.title ?? item.label ?? ''),
    description: item.description as string | undefined,
    link: String(item.link ?? item.href ?? '#'),
    image: (item.image as string) || undefined,
  }));
}
