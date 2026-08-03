# Sihphir Presbyterian Kohhran website

## Deploying

Deploy the static Astro output to Cloudflare Pages with `npm run build` as the build command and `dist` as the output directory.

## Custom admin

The site administration interface is at `/admin`. Protect both `/admin/*` and `/api/admin/*` with a Cloudflare Access application. Configure the required GitHub repository secrets and optional R2 binding as documented in [ADMIN-SETUP.md](./ADMIN-SETUP.md).

Content changes are committed to GitHub, which triggers the normal Cloudflare Pages build. The public site continues to use the existing content folders and URLs.
