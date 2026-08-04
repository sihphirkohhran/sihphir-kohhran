export const SITE_ORIGIN = 'https://sihphirpresbyteriankohhran.org';
export const SITE_NAME = 'Sihphir Presbyterian Kohhran';
export const DEFAULT_DESCRIPTION =
  'Sihphir Presbyterian Kohhran — Mizoram Presbyterian Kohhran, Presbyterian Church of India.';

export function absoluteSiteUrl(pathname = '/'): string {
  const path = pathname === '/' ? '/' : `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  return new URL(path, SITE_ORIGIN).toString();
}
