/** Shared public visibility; the CMS and public archives use the same normalization. */
import { CHURCH_OWNER, normalizeContentOwners } from '../../public/admin/content-owners.js';
export { CHURCH_OWNER, normalizeContentOwners };
type Ownership = { owner?: string | null; owners?: string[] | null };
export function contentOwner(data: Ownership): string {
  return normalizeContentOwners(data)[0] ?? CHURCH_OWNER;
}
export function ownedBy<T extends { data: Ownership & { status?: string; published?: boolean } }>(
  entries: T[], owner: string,
): T[] {
  return entries.filter(entry =>
    normalizeContentOwners(entry.data).includes(owner) &&
    entry.data.status !== 'archived' &&
    entry.data.published !== false,
  );
}
