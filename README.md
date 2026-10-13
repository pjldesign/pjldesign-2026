# pjl.design

Static portfolio site: Astro + Tailwind. Content lives in `content/projects/*.md`; one file per case study.

```
npm run dev       # preview at http://localhost:4321
npm run build     # static site into dist/
```

## Adding a case study

Create `content/projects/my-project.md` (the filename becomes the URL: `/my-project.html`):

```md
---
title: "My Project"
tags: ["Identity", "Print Design"]   # shown on card hover
categories: ["print", "brand"]       # which Print/Digital/Brand pages it appears on
order: 1                             # grid position, lower = earlier
cover: "https://pjl-site-media.s3.amazonaws.com/galleries/..."   # card thumbnail
zoom: 150                            # optional thumbnail zoom %, 100 (default) to 300
images: ["https://...", "https://..."]   # case study images, in order
video: "https://player.vimeo.com/video/123456"   # optional, shown above the title
siteLink: "https://example.com"      # optional
siteLinkType: "visit"                # "visit" or "beta"; no button if omitted
draft: false                         # true hides it everywhere
---

Summary text goes here.
```

Everything except `title`, `order` and `cover` is optional. The schema is in `src/content.config.ts`
and a bad value fails the build with a clear message. The browser editor
(Pages CMS) reads `.pages.yml`, which mirrors the same fields.

"Related" projects are picked at random from the ones that share a category.

## Site settings

`content/site.json` holds the site-wide pieces you edit, also available as "Site settings" in the browser editor:

- `intro`: the big line on the orange opening screen
- `heroImages`: the home slider images, in order (paste image URLs)
- `phone`: the footer phone number (empty hides it)

A bad value fails the build with a clear message (schema in `src/lib/site.ts`).

The Print / Digital / Brand menu and the "Related" heading are fixed on purpose. The email address and
the contact form endpoint live in `src/config.ts`.

## Contact form

Set `CONTACT_ENDPOINT` in `src/config.ts` (a Formspree form URL).

## One-time MODX import

`npm run content -- --force` rebuilds `content/` from `private/modx-export.sql`, and `npm run verify` checks it
against the live site. Re-running it **overwrites** `content/projects` and `content/site.json`, so only use it
before you start editing content by hand.
