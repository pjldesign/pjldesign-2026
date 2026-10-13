// Reads private/modx-export.sql and writes content/projects/*.md + content/site.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseInserts } from './parse-sql.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const S3 = 'https://pjl-site-media.s3.amazonaws.com/galleries';
const CATEGORY = { 1: 'print', 2: 'digital', 3: 'brand' };
const ZOOM = { 0: 100, z150: 150, z200: 200 };
const TV = { 1: 'siteLink', 2: 'hasSiteLink', 3: 'hasBetaSiteLink', 4: 'video', 5: 'zoom', 6: 'category' };
// aliases that change on the new site; old URLs are redirected
const RENAME = { 'duplicate-of-healthline-/-rvo-health': 'rvo-health' };
const CASE_STUDY_TEMPLATES = new Set(['3', '6']);

const d = parseInserts(
  fs.readFileSync(path.join(root, 'private/modx-export.sql'), 'utf8'),
  new Set(['modx_site_content', 'modx_site_tmplvar_contentvalues', 'modx_moregallery_image', 'modx_site_htmlsnippets']),
);

const tvs = {};
for (const v of d.modx_site_tmplvar_contentvalues) (tvs[v.contentid] ||= {})[TV[v.tmplvarid]] = v.value;

const imagesFor = (resource) =>
  d.modx_moregallery_image
    .filter((i) => i.resource === String(resource) && i.active === '1')
    .sort((a, b) => a.sortorder - b.sortorder)
    .map((i) => `${S3}/${resource}/${i.file}`);

const url = (v) => (v && !/^https?:\/\/$/.test(v.trim()) ? v.trim() : null);
const yaml = (o) =>
  Object.entries(o).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n'); // JSON scalars are valid YAML

const outDir = path.join(root, 'content/projects');
if (fs.existsSync(outDir) && !process.argv.includes('--force')) {
  console.error('content/projects already exists. This import would overwrite any hand edits.\nRe-run with --force if that is what you want.');
  process.exit(1);
}
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const report = [];
for (const r of d.modx_site_content) {
  if (!CASE_STUDY_TEMPLATES.has(r.template)) continue;
  if (r.alias === 'case-study-page') continue; // template placeholder
  const t = tvs[r.id] || {};
  const [cover, ...images] = imagesFor(r.id);
  const slug = RENAME[r.alias] ?? r.alias;
  const orphan = r.parent !== '3'; // not under the Work gallery, so never listed
  const draft = r.published !== '1' || orphan;
  const fm = {
    title: r.pagetitle,
    tags: r.description ? r.description.split(',').map((s) => s.trim()).filter(Boolean) : [],
    categories: (t.category || '').split('||').filter(Boolean).map((c) => CATEGORY[c]),
    order: Number(r.menuindex),
    cover: cover ?? null,
    zoom: ZOOM[t.zoom ?? 0] ?? 100,
    images,
    video: url(t.video),
    siteLink: url(t.siteLink),
    siteLinkType: !url(t.siteLink) ? null : t.hasBetaSiteLink === '1' ? 'beta' : t.hasSiteLink === '1' ? 'visit' : null,
    draft,
    legacyUrl: `/${r.alias}.html`,
  };
  // MODX's editor littered the copy with &nbsp; which forces odd line breaks
  const body = (r.content || '').replace(/&nbsp;/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  fs.writeFileSync(path.join(outDir, `${slug}.md`), `---\n${yaml(fm)}\n---\n\n${body}\n`);
  report.push({ slug, draft, orphan, images: images.length, cats: fm.categories.join('+') });
}

// Home hero: the active images of the Work page (resource 3), plus the intro chunk
const introHtml = d.modx_site_htmlsnippets.find((c) => c.name === 'intro')?.snippet ?? '';
fs.writeFileSync(
  path.join(root, 'content/site.json'),
  JSON.stringify(
    {
      intro: introHtml.replace(/<[^>]+>/g, '').trim(),
      heroImages: imagesFor(3),
      phone: '+01 212.203.3566', // the old footer chunk had it hardcoded
    },
    null,
    2,
  ) + '\n',
);

console.table(report);
console.log(`${report.length} projects (${report.filter((p) => !p.draft).length} live, ${report.filter((p) => p.draft).length} draft)`);
