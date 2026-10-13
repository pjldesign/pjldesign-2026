import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/projects' }),
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.enum(['print', 'digital', 'brand'])).default([]),
    order: z.number(),
    cover: z.string().nullable(),
    // card thumbnail zoom in percent: 100 = none, any value up to 300 (was a fixed 0/150/200 preset)
    zoom: z.number().min(100).max(300).default(100),
    images: z.array(z.string()).default([]),
    // Vimeo player URL (https://player.vimeo.com/video/...) shown above the case study
    video: z.string().nullable().default(null),
    siteLink: z.string().nullable().default(null),
    // which button the site link renders as; null = no button
    siteLinkType: z.enum(['visit', 'beta']).nullable().default(null),
    draft: z.boolean().default(false),
    legacyUrl: z.string().optional(),
  }),
});

export const collections = { projects };
