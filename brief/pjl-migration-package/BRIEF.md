# Project Brief: pjl.design Site Migration

## Goal
Move portfolio site off Modx (hosted via GoDaddy, ~$50/month) to a cheaper setup, with minimal rebuild effort, while staying focused on painting commissions.

## Current Setup
- CMS: Modx (PHP-based), hosted on GoDaddy
- Cost: ~$50/month combined — too high for a portfolio site, especially while between full-time work
- Domain: pjl.design (can stay registered wherever it is; only DNS needs to point to a new host)

## Key Finding (already confirmed by pulling the live site)
The site's custom scroll-triggered animations and logo transform are **not** baked into Modx. They live in two independent static files:
- `assets/js/site.js` (~450KB) — contains the scroll/transform/`requestAnimationFrame` logic (clustered in a few blocks)
- `assets/css/app.css` (~224KB) — site styling

Portfolio images are lazy-loaded (`data-src`) from Paul's own S3 bucket (`pjl-site-media.s3.amazonaws.com`) — not stored in Modx either.

**Implication:** Modx is only gluing together page templates + minimal text content. The hard, custom part (animations) can be lifted wholesale rather than rebuilt from scratch, as long as new HTML markup keeps the same hooks Paul's JS targets (`#logo-wrapper`, `#logo`, the `data-src` lazy-load pattern, etc.).

## No Automated Migration Tool Exists
Confirmed: there is no reliable automated Modx → any-other-CMS migration tool (the one third-party service that used to offer this, CMS2CMS, appears defunct). Modx's own official tools (Cloud Snapshots, Teleport) only move a site between Modx hosts — they don't convert to another platform. Manual page recreation is the standard path, and for a portfolio-sized site that's realistically a few hours of work, not a redesign — especially since the JS/CSS/images don't need touching.

## Destination Options Discussed (cheapest to most hands-off)
1. **Free static rebuild** — hand-build/export plain HTML pages that reference the existing `site.js`/`app.css`, host free on Netlify/Vercel/GitHub Pages, keep GoDaddy domain and just repoint DNS. ~$0/month. Best fit given Paul's own frontend skill set (Figma, Tailwind, Angular).
2. **Self-hosted WordPress** on cheap hosting — Hostinger (~$6/mo) or DreamHost (~$7/mo). Content/templates manually recreated; still a CMS to maintain.
3. **Designer-grade portfolio builder** — Pixpa (~$5.40/mo) or Format (~$10/mo); or Adobe Portfolio (free, only if already paying for Creative Cloud).

## Source Files Available (not just the compiled output)
Paul compiles the site locally via a terminal build process and has the actual **source SCSS and JavaScript** (pre-compilation/pre-bundling) on his own machine — not just the minified `site.js`/`app.css` pulled from the live site. He's open to granting a future session access to these local source files (via linking his computer in the Claude desktop app). Working from the real SCSS partials and unbundled JS modules will make mapping the animation/logo-transform logic far cleaner than reverse-engineering the compiled 450KB bundle — the next session should ask him to link his computer and point to the project's local source directory before starting the page-rebuild work.

## Next Step (in progress when this was paused)
Crawl all of pjl.design's pages, map exactly which markup/classes/data-attributes each animation block targets (ideally from the source SCSS/JS rather than the compiled bundle, per above), and produce clean static HTML files that plug directly into the existing styling/scripts — ready to deploy to free hosting.


## Additional Findings From Home-Page Snapshot (2026-10-03)
Saved in `live-snapshot-2026-10-03/` (pjl.html, site.js, app.css). Not yet verified beyond the home page.
- **Page count:** The home page links to 40 case-study pages, all flat `.html` URLs (see `page-inventory.txt`). One is a stray duplicate (`duplicate-of-healthline-/-rvo-health.html`), probably safe to drop, and its slash in the path is a likely redirect problem.
- **Page transitions:** Gallery links use `data-push="true"` and load into `#ajax-frame` (AJAX navigation with history push). The static rebuild must keep the same container IDs and each page must work as a full standalone HTML page, so direct links and refreshes still work.
- **Contact form:** Already independent of MODX. It posts to Formspree (`formspree.io/paul@pjl.design`) with Foundation's `data-abide` validation, so it carries over unchanged.
- **Framework hooks:** Foundation-style grid classes (`columns`, `medium-12`, `large-4`) plus IDs `#logo-wrapper`, `#logo`, `#intro`, `#work`, `#gallery-container`, `#slider-wrapper`, `#superslider`, `#contact-accordion`, `#footer`. Preserve these.
- **Media:** All gallery images load from `pjl-site-media.s3.amazonaws.com/galleries/...`. Nothing needs migrating. Only add redirects or keep the S3 bucket public and unchanged.
- **Loose end:** Absolute URLs (`https://www.pjl.design/...`) are baked into the markup, so the rebuild must either keep the domain pointed at the new host or rewrite them to relative paths.
- **Unknown until crawled:** How each case-study page's markup differs from the home page, and whether any pages use MODX snippets that output dynamic content.

## Suggested First Prompt for the New Project
"I'm migrating pjl.design off MODX/GoDaddy to free static hosting. Read BRIEF.md and page-inventory.txt, then link my computer so you can read my local SCSS/JS source. First, crawl all 40 pages from the live site, diff their markup against the home page, and list anything that differs. Don't rebuild anything until I approve the plan."

## Recommended Claude setup to continue this
- **Product:** Either works — Claude Code (if comfortable with a terminal/local dev setup; best for iteratively testing the rebuilt pages live in a browser alongside file edits and git) or Cowork again (lower-friction, no local setup, and this exact environment already proved capable of fetching/analyzing the live site via its built-in shell tools).
- **Model:** Default/current Sonnet model is well suited for this — it's a scoped, moderate-complexity static-site rebuild (a handful of pages, reusing existing JS/CSS), not a sprawling codebase. Given the cost-consciousness around this whole project, Sonnet is the efficient choice. Only reach for Opus if the animation code in `site.js` turns out to be unusually tangled to reverse-engineer and Sonnet gets stuck on it.
