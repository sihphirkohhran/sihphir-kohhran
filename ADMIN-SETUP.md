# Custom admin deployment

The `/admin` application is protected by Cloudflare Access. Create an Access application covering both `/admin/*` and `/api/admin/*`; Cloudflare performs authentication before either the UI or write API is reachable. The Pages Function also requires the `Cf-Access-Jwt-Assertion` header, so it does not expose the GitHub token if the Access route is bypassed.

Set these Cloudflare Pages secrets:

- `GITHUB_TOKEN`: fine-grained token with Contents read/write access to this repository.
- `GITHUB_REPOSITORY`: `owner/repository`.
- `GITHUB_BRANCH`: optional; defaults to `main`.

Optional R2 media storage:

- Bind an R2 bucket as `MEDIA_BUCKET`.
- Set `R2_PUBLIC_URL` to its public custom-domain URL.

When no R2 binding is configured, uploads are committed to `public/images` or `public/documents` in GitHub. GitHub commits trigger the normal Cloudflare Pages deployment, retaining existing frontend URLs.
