import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;
export const categories = ['print', 'digital', 'brand'] as const;
export type Category = (typeof categories)[number];

/** Published projects in gallery order. */
export async function liveProjects(): Promise<Project[]> {
  const all = await getCollection('projects', ({ data }) => !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** Clean URL (/healthline). Old /healthline.html links are redirected by the host. */
export const projectUrl = (p: Project) => `/${p.id}`;

/**
 * Every other project that shares a category (Print / Digital / Brand) with `project`,
 * shuffled. The page shows the first few and a script re-shuffles on each visit;
 * the build-time order is the no-JavaScript fallback.
 */
export function relatedPool(project: Project, all: Project[]): Project[] {
  const pool = all.filter(
    (p) => p.id !== project.id && p.data.categories.some((c) => project.data.categories.includes(c)),
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export const RELATED_COUNT = 3;
