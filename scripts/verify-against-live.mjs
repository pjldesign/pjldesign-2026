// Compares generated content/projects/*.md with the live pjl.design pages.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'content/projects');
const BASE = 'https://www.pjl.design';

const projects = fs.readdirSync(dir).map((f) => {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8');
  const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const data = Object.fromEntries(fm.split('\n').map((l) => { const i = l.indexOf(': '); return [l.slice(0, i), JSON.parse(l.slice(i + 2))]; }));
  return { slug: f.replace(/\.md$/, ''), ...data, body: body.trim() };
});
const live = projects.filter((p) => !p.draft);
const get = async (p) => (await fetch(BASE + encodeURI(p), { redirect: 'follow' })).text();
const imgs = (html, cls) => [...html.matchAll(new RegExp(`<img class="${cls}" src="([^"]+)"`, 'g'))].map((m) => m[1]);
const squash = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s+/g, ' ').trim();

let problems = 0;
const bad = (slug, msg) => { problems++; console.log(`✗ ${slug}: ${msg}`); };

for (const p of live) {
  const html = await get(p.legacyUrl);
  const got = imgs(html, 'case-study-image');
  if (JSON.stringify(got) !== JSON.stringify(p.images)) bad(p.slug, `images differ (live ${got.length}, ours ${p.images.length})`);
  const title = html.match(/<h2 class="project-header">([^<]+)<\/h2>/)?.[1]?.trim();
  if (title !== p.title.replace(/&/g, '&amp;') && title !== p.title) bad(p.slug, `title "${title}" vs "${p.title}"`);
  const copy = squash(html.match(/<ul class="project-summary clearfix">([\s\S]*?)<\/ul>/)?.[1] ?? '');
  if (!squash(p.body) || !copy.startsWith(squash(p.body).slice(0, 60))) bad(p.slug, 'summary text differs');
  const vid = html.match(/<iframe src='([^']+)'/)?.[1] ?? null;
  if (vid !== p.video) bad(p.slug, `video ${vid} vs ${p.video}`);
}

// Category pages: same projects in the same order as the live cards
for (const cat of ['print', 'digital', 'brand']) {
  const html = await get(`/${cat}-work.html`);
  const liveOrder = [...html.matchAll(/<a href="https:\/\/www\.pjl\.design\/([^"]+?)\.html" data-push/g)].map((m) => decodeURIComponent(m[1]));
  const ours = live.filter((p) => p.categories.includes(cat)).sort((a, b) => a.order - b.order).map((p) => p.legacyUrl.slice(1, -5));
  if (JSON.stringify(liveOrder) !== JSON.stringify(ours)) {
    bad(`${cat}-work`, `order/membership differs\n   live: ${liveOrder.join(', ')}\n   ours: ${ours.join(', ')}`);
  }
}
console.log(problems ? `\n${problems} problem(s)` : `\nAll ${live.length} pages and 3 category pages match the live site.`);
