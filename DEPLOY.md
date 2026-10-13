# Deploying pjl.design (GitHub + Cloudflare Pages)

Cost: $0/month for hosting. The domain stays registered at GoDaddy; only the `www` record changes.

## Set up (done 2026-10-13)

- Code: private GitHub repo `pjldesign/pjldesign-2026`, branch `main`.
- Hosting: Cloudflare Pages project `pjldesign-2026` at `https://pjldesign-2026.pages.dev`.

| Cloudflare setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |

Every push to `main` deploys automatically (about a minute).

## Going live on pjl.design and shutting down MODX

See **[CUTOVER.md](CUTOVER.md)**. It covers the DNS switch, checks, rollback, and the safe order for
retiring the MODX site.

## Notes

- Public URLs are clean (`/healthline`); the built files are `healthline.html`. Cloudflare redirects
  old `/healthline.html` links to `/healthline` automatically.
- `public/_redirects` sends the old duplicate page to `/rvo-health`.
- `public/_headers` sets long caching for fonts and built assets, plus basic security headers.
- Content edits made in the browser editor (Pages CMS, once connected) are commits, so each save redeploys.
  Pull before working locally so your computer and GitHub don't drift apart.
- `private/` (the MODX database export) is git-ignored on purpose: it holds user accounts and password hashes.
