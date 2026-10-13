# Deploying pjl.design (GitHub + Cloudflare Pages)

Cost: $0/month for hosting. Domain stays registered at GoDaddy; only DNS changes.

## 1. Put the code on GitHub (once)

1. On github.com create a **new empty private repo** (no README, no .gitignore, no license), e.g. `pjldesign-2026`.
2. In this folder:

   ```bash
   git remote add origin https://github.com/<your-username>/pjldesign-2026.git
   git push -u origin main
   ```

## 2. Create the Cloudflare Pages project (once)

Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick the repo.

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `NODE_VERSION` = `22` |

Every push to `main` now deploys automatically (about a minute). You get a free `*.pages.dev` preview URL to test on real devices.

## 3. Before pointing the real domain at it

- [ ] Click through the `*.pages.dev` site on your phone and tablet.
- [ ] Send a test message through the contact form.
- [ ] **Check where your email lives.** If `paul@pjl.design` (or any address at the domain) is hosted through GoDaddy or MODX Cloud, keep its MX records when DNS moves, or email will stop.
- [ ] Old links such as `/healthline.html` redirect to `/healthline` automatically (Cloudflare does this). `/duplicate-of-healthline-/-rvo-health` redirects to `/rvo-health` via `public/_redirects`.

## 4. Cutover

1. Add `www.pjl.design` (and `pjl.design`) as custom domains on the Pages project.
2. Point DNS as Cloudflare instructs (either move the nameservers to Cloudflare, or add the CNAME at GoDaddy). **Keep MX/TXT email records.**
3. Check the live site. Keep MODX Cloud running until you're happy, then cancel it.

## Notes

- Public URLs are clean (`/healthline`); the built files are `healthline.html`.
- `public/_headers` sets long caching for fonts and built assets, plus basic security headers.
- Content edits (Pages CMS, once connected to the repo) are commits, so each save redeploys.
- `private/` (the MODX database export) is git-ignored on purpose: it holds user accounts and password hashes.
