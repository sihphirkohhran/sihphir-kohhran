/** Shared public content ownership and visibility rules. Owner is independent of category. */
export const CHURCH_OWNER = 'kohhran';
export function contentOwner(data: { owner?: string | null }): string {
  return typeof data.owner === 'string' && data.owner.trim() ? data.owner.trim() : CHURCH_OWNER;
}
export function ownedBy<T extends { data: { owner?: string | null; status?: string; published?: boolean } }>(
  entries: T[], owner: string,
): T[] {
  return entries.filter(entry =>
    contentOwner(entry.data) === owner &&
    entry.data.status !== 'archived' &&
    entry.data.published !== false,
  );
}
