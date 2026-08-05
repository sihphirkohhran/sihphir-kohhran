import { getEntry } from 'astro:content';

type TextMap = Record<string, string>;

/** Load interface text for one public module, retaining code defaults for legacy installs. */
export async function getPageSettings<T extends TextMap>(section: string, defaults: T): Promise<T> {
  const entry = await getEntry('settings', 'page-ui');
  const stored = (entry?.data as Record<string, unknown> | undefined)?.[section];
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults;
  return { ...defaults, ...(stored as Partial<T>) };
}
