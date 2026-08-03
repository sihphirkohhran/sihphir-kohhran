# Custom admin deployment

The `/admin` application uses its own login page and a signed, HttpOnly session cookie. No third-party identity or OAuth provider is used.

Set these Cloudflare Pages secrets:

- `GITHUB_TOKEN`: fine-grained token with Contents read/write access to this repository.
- `GITHUB_REPOSITORY`: `owner/repository`.
- `GITHUB_BRANCH`: optional; defaults to `main`.
- `ADMIN_USERNAME`: administrator username.
- `ADMIN_PASSWORD`: administrator password.
- `SESSION_SECRET`: a random secret of at least 32 characters used to sign session cookies.

Optional R2 media storage:

- Bind an R2 bucket as `MEDIA_BUCKET`.
- Set `R2_PUBLIC_URL` to its public custom-domain URL.

When no R2 binding is configured, uploads are committed to `public/images` or `public/documents` in GitHub. GitHub commits trigger the normal Cloudflare Pages deployment, retaining existing frontend URLs.
