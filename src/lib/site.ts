import { z } from 'astro/zod';
import raw from '../../content/site.json';

// Site-wide settings, edited in the CMS ("Site settings"). Validated at build time,
// so a bad value fails the build with a clear message instead of breaking the page.
const schema = z.object({
  /** the line shown on the orange opening screen */
  intro: z.string().min(1),
  /** home slider images, in order */
  heroImages: z.array(z.string().min(1)).min(1),
  /** footer phone number; leave empty to hide it */
  phone: z.string().default(''),
  /** the "page not found" screen */
  notFoundTitle: z.string().min(1).default('Page not found'),
  notFoundText: z.string().default('That page doesn’t exist, or it has moved.'),
  notFoundLink: z.string().default('Back to the work!'),
  /** the underlined words inside that phrase; the link runs from them to the end of the phrase (must appear in it; empty = whole phrase is the link, no underline) */
  notFoundLinkUnderline: z.string().default('the work'),
});

export const site = schema.parse(raw);
