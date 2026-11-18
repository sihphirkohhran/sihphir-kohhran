export function normalizeContentEntryId(identifier: string): string;
export function contentEntryIdMatches(entryId: string, requestedId: string): boolean;
export function buildContentDeepLink(origin: string, pathname: string, parameter: string, identifier: string): string | null;
export function resolveContentDeepLink(search: string, parameter: string): string | null;
