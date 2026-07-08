/**
 * Import WordPress Profiles into this app's admin API (Postgres + media_files).
 *
 * Prefers a local WP REST export file (the JSON you saved), then falls back to
 * fetching live from WP. Page scrape still fills measurements / IG / videos / PDFs
 * because those are not in the REST export.
 *
 * Usage (PowerShell):
 *   cd server
 *   npm start                          # terminal 1 — API must be running
 *
 *   # terminal 2 — dry run (no writes):
 *   $env:DRY_RUN="true"
 *   $env:WP_EXPORT_FILE="C:\Users\User\OneDrive\Desktop\test-db.txt"
 *   node scripts/import-wp-profiles.mjs
 *
 *   # real import:
 *   $env:DRY_RUN="false"
 *   $env:ADMIN_EMAIL="admin@ille.co"
 *   $env:ADMIN_PASSWORD="your-password"
 *   $env:WP_EXPORT_FILE="C:\Users\User\OneDrive\Desktop\test-db.txt"
 *   node scripts/import-wp-profiles.mjs
 *
 * Optional env:
 *   WP_EXPORT_FILE       path to saved wp/v2/profiles JSON (recommended)
 *   WP_BASE_URL          default https://ille.co (used if no export file / for page scrape)
 *   API_BASE             default http://localhost:3000/api
 *   LIMIT                import only first N profiles
 *   ONLY_SLUG            import a single slug (e.g. louay)
 *   SKIP_EXISTING        true = leave models that already exist untouched
 *   MAX_GALLERY          max gallery images per model (default 40)
 *   SCRAPE_PAGE          true (default) = fetch public profile HTML for stats/videos/pdf
 *   INCLUDE_DEVELOPMENT  true = also import Development-only profiles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WP_BASE = (process.env.WP_BASE_URL || 'https://ille.co').replace(/\/$/, '');
const WP_EXPORT_FILE = (process.env.WP_EXPORT_FILE || '').trim() || null;
const API_BASE = (process.env.API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');
const DRY_RUN = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
const SKIP_EXISTING = String(process.env.SKIP_EXISTING || 'false').toLowerCase() === 'true';
const SCRAPE_PAGE = String(process.env.SCRAPE_PAGE || 'true').toLowerCase() !== 'false';
const INCLUDE_DEVELOPMENT = String(process.env.INCLUDE_DEVELOPMENT || 'false').toLowerCase() === 'true';
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : null;
const ONLY_SLUG = (process.env.ONLY_SLUG || '').trim().toLowerCase() || null;
const MAX_GALLERY = Number(process.env.MAX_GALLERY || 40);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ille.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'illeadmin';

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;
const PDF_EXT = /\.pdf(\?|$)/i;
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

// WP profiles_category slug → our subcategory id (empty = main roster).
const CATEGORY_MAP = {
  'main-model': '',
  test: 'fresh-faces', // WP slug is "test", name is "Fresh Faces"
  'fresh-faces': 'fresh-faces',
  'middle-aged': 'middle-aged',
  talent: 'talent',
  development: 'development',
};

const CATEGORY_NAMES = {
  'fresh-faces': 'Fresh Faces',
  'middle-aged': 'Middle Aged',
  talent: 'Talent',
  development: 'Development',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html) {
  return decodeHtml(String(html || '').replace(/<[^>]+>/g, '')).trim();
}

function slugFromName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mediaKey(url) {
  try {
    const u = new URL(url);
    let p = u.pathname;
    p = p.replace(/^\/ille\.co/i, '');
    p = p.replace(/-\d+x\d+(?=\.(jpe?g|png|webp|gif|avif)$)/i, '');
    return p.toLowerCase();
  } catch {
    return url.split('?')[0].toLowerCase();
  }
}

function preferOriginal(url) {
  try {
    let u = decodeHtml(url).replace(/&amp;/g, '&');
    u = u.replace(/^https?:\/\/i\d\.wp\.com\/([^/?#]+)/i, 'https://$1');
    const parsed = new URL(u);
    if (/wp-content\/uploads/i.test(parsed.pathname)) {
      parsed.search = '';
      parsed.hash = '';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function isSiteChrome(url) {
  const key = mediaKey(url);
  return (
    /cropped-ille|favicon|logo|sprite|placeholder|gravatar|emoji|avatar/i.test(key) ||
    /\/plugins\//i.test(key) ||
    /\/themes\//i.test(key)
  );
}

function extractUrls(html) {
  const out = [];
  const src = String(html || '');
  for (const m of src.matchAll(/(?:href|src|data-src|data-lazy-src|content)=["']([^"']+)["']/gi)) {
    out.push(decodeHtml(m[1]));
  }
  for (const m of src.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    out.push(decodeHtml(m[0]));
  }
  return out;
}

function collectImages(urls) {
  const byKey = new Map();
  for (const raw of urls) {
    if (!raw || !/^https?:\/\//i.test(raw)) continue;
    if (VIDEO_EXT.test(raw) || PDF_EXT.test(raw)) continue;
    if (!IMG_EXT.test(raw) && !/wp-content\/uploads/i.test(raw)) continue;
    if (isSiteChrome(raw)) continue;
    const preferred = preferOriginal(raw);
    if (!IMG_EXT.test(preferred) && !/wp-content\/uploads/i.test(preferred)) continue;
    const key = mediaKey(preferred);
    if (!byKey.has(key)) byKey.set(key, preferred);
  }
  return [...byKey.values()];
}

function collectByExt(urls, extRe) {
  const byKey = new Map();
  for (const raw of urls) {
    if (!raw || !extRe.test(raw)) continue;
    const preferred = preferOriginal(raw);
    const key = mediaKey(preferred);
    if (!byKey.has(key)) byKey.set(key, preferred);
  }
  return [...byKey.values()];
}

function parseCmsmastersStats(html) {
  const stats = {};
  const re =
    /cmsmasters-widget-icon-list-item-text[^>]*>\s*(Height|Bust|Waist|Hips|Shoe|Hair|Eyes)\s*<\/span>[\s\S]*?cmsmasters-widget-icon-list-item-value[^>]*>\s*([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const label = m[1].toLowerCase();
    const value = decodeHtml(m[2]).trim();
    if (!value) continue;
    if (label === 'height') stats.height = value;
    else if (label === 'bust') stats.bust = value;
    else if (label === 'waist') stats.waist = value;
    else if (label === 'hips') stats.hips = value;
    else if (label === 'shoe') stats.shoeSize = value;
    else if (label === 'hair') stats.hair = value;
    else if (label === 'eyes') stats.eyes = value;
  }
  return stats;
}

function parseInstagram(html) {
  const handles = [];
  for (const m of String(html || '').matchAll(/instagram\.com\/([A-Za-z0-9._]+)/gi)) {
    const h = m[1].replace(/\/+$/, '');
    if (!h || /^(cmsmasters|instagram|p|reel|stories|explore|accounts)$/i.test(h)) continue;
    handles.push(h);
  }
  return [...new Set(handles)];
}

function toNumber(value) {
  if (value == null || value === '') return undefined;
  const n = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function mapBranchAndCategory(termSlugs) {
  const slugs = termSlugs.map((s) => s.toLowerCase());
  const branch = slugs.includes('men') && !slugs.includes('women')
    ? 'men'
    : slugs.includes('women')
      ? 'women'
      : slugs.includes('men')
        ? 'men'
        : 'women';

  let category = '';
  for (const slug of slugs) {
    if (slug === 'men' || slug === 'women') continue;
    if (slug in CATEGORY_MAP) {
      category = CATEGORY_MAP[slug];
      if (category) break;
    }
  }
  return { branch, category };
}

async function loadProfiles() {
  if (WP_EXPORT_FILE) {
    const abs = path.resolve(WP_EXPORT_FILE);
    if (!fs.existsSync(abs)) throw new Error(`WP_EXPORT_FILE not found: ${abs}`);
    const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (!Array.isArray(raw)) throw new Error('WP_EXPORT_FILE must be a JSON array of profiles');
    console.log(`Loaded ${raw.length} profiles from file: ${abs}`);
    return raw;
  }

  const first = await fetch(`${WP_BASE}/wp-json/wp/v2/profiles?per_page=100&page=1&_embed`);
  if (!first.ok) throw new Error(`WP profiles fetch failed: ${first.status}`);
  const totalPages = Number(first.headers.get('x-wp-totalpages') || 1);
  const all = await first.json();
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetch(`${WP_BASE}/wp-json/wp/v2/profiles?per_page=100&page=${page}&_embed`);
    if (!res.ok) throw new Error(`WP profiles page ${page} failed: ${res.status}`);
    all.push(...(await res.json()));
  }
  console.log(`Fetched ${all.length} profiles from ${WP_BASE}`);
  return all;
}

async function scrapeProfilePage(link) {
  try {
    const res = await fetch(link, {
      headers: { 'User-Agent': 'ille-import/1.0' },
      redirect: 'follow',
    });
    if (!res.ok) {
      console.warn(`  WARN: page scrape ${res.status} for ${link}`);
      return '';
    }
    return await res.text();
  } catch (err) {
    console.warn(`  WARN: page scrape failed for ${link}: ${err.message}`);
    return '';
  }
}

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error('Login response missing token');
  return data.token;
}

async function apiJson(method, pathName, token, body) {
  const res = await fetch(`${API_BASE}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${pathName} → ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

async function ensureCategories(token, neededIds) {
  const existing = await apiJson('GET', '/admin/categories', token);
  const have = new Set(existing.map((c) => c.id));
  let sortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), 0) + 1;
  for (const id of neededIds) {
    if (!id || have.has(id)) continue;
    const name = CATEGORY_NAMES[id] || id;
    if (DRY_RUN) {
      console.log(`  [dry-run] would create category ${id} (${name})`);
      continue;
    }
    await apiJson('POST', '/admin/categories', token, {
      id,
      name,
      sortOrder: sortOrder++,
      published: true,
    });
    have.add(id);
    console.log(`  Created category ${id}`);
  }
}

/** Prefer a Photon-resized copy for giant WP originals (keeps quality, avoids 50MB+ uploads). */
function downloadCandidates(url) {
  const original = preferOriginal(url);
  const out = [original];
  try {
    const u = new URL(original);
    if (/wp-content\/uploads/i.test(u.pathname) && IMG_EXT.test(u.pathname)) {
      const photon = `https://i0.wp.com/${u.hostname}${u.pathname}?fit=2500%2C2500&ssl=1`;
      out.unshift(photon); // try resized first
    }
  } catch {
    /* ignore */
  }
  return [...new Set(out)];
}

async function download(url) {
  const candidates = downloadCandidates(url);
  let lastErr;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: { 'User-Agent': 'ille-import/1.0', Accept: '*/*' },
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`download ${res.status} ${candidate}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // Skip empty/tiny failures; if still huge (>75MB) try next candidate
      if (buf.length > 75 * 1024 * 1024 && candidates.length > 1 && candidate === candidates[0]) {
        lastErr = new Error(`still too large (${buf.length} bytes) ${candidate}`);
        continue;
      }
      const ct = res.headers.get('content-type') || 'application/octet-stream';
      let filename = path.basename(new URL(preferOriginal(url)).pathname) || 'file';
      filename = filename.split('?')[0] || 'file';
      return { buf, contentType: ct, filename };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`download failed ${url}`);
}

function uploadEndpointFor(filename, contentType) {
  if (VIDEO_EXT.test(filename) || contentType.startsWith('video/')) {
    return { path: '/admin/upload-video', field: 'video' };
  }
  if (PDF_EXT.test(filename) || contentType === 'application/pdf') {
    return { path: '/admin/upload-file', field: 'file' };
  }
  return { path: '/admin/upload', field: 'image' };
}

async function uploadBuffer(token, { buf, contentType, filename }) {
  if (DRY_RUN) return `dry-run://${filename}`;
  const { path: ep, field } = uploadEndpointFor(filename, contentType);
  const form = new FormData();
  form.append(field, new Blob([buf], { type: contentType }), filename);
  const res = await fetch(`${API_BASE}${ep}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upload ${filename} → ${res.status}: ${text}`);
  }
  const data = await res.json();
  if (!data.url) throw new Error(`upload ${filename}: missing url`);
  return data.url;
}

async function mirrorUrl(token, url, cache) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  try {
    const file = await download(url);
    const local = await uploadBuffer(token, file);
    cache.set(url, local);
    return local;
  } catch (err) {
    console.warn(`  WARN: failed to mirror ${url}: ${err.message}`);
    cache.set(url, null);
    return null;
  }
}

function buildModelFromWp(profile, pageHtml) {
  const name = stripTags(profile.title?.rendered || profile.slug);
  const id = slugFromName(profile.slug || name);
  const terms = (profile._embedded?.['wp:term'] || []).flat();
  const termSlugs = terms.map((t) => t.slug);
  const { branch, category } = mapBranchAndCategory(termSlugs);

  const featured = profile._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  const contentHtml = profile.content?.rendered || '';
  const combinedHtml = `${contentHtml}\n${pageHtml || ''}`;
  const urls = extractUrls(combinedHtml);
  if (featured) urls.unshift(featured);

  const images = collectImages(urls);
  const videos = collectByExt(urls, VIDEO_EXT);
  const pdfs = collectByExt(urls, PDF_EXT);
  const stats = parseCmsmastersStats(pageHtml || combinedHtml);
  const igHandles = parseInstagram(pageHtml || combinedHtml);

  const coverSrc = featured ? preferOriginal(featured) : images[0] || null;
  const coverKey = coverSrc ? mediaKey(coverSrc) : null;
  const gallerySrcs = images
    .filter((u) => mediaKey(u) !== coverKey)
    .slice(0, MAX_GALLERY);

  const isTwin = /^twins?\b/i.test(name) || /twins/i.test(id);

  return {
    id,
    name,
    branch,
    category,
    published: profile.status === 'publish',
    outOfTown: /out\s*of\s*town/i.test(name),
    height: toNumber(stats.height),
    bust: toNumber(stats.bust),
    waist: toNumber(stats.waist),
    hips: toNumber(stats.hips),
    shoeSize: toNumber(stats.shoeSize),
    hair: stats.hair || undefined,
    eyes: stats.eyes || undefined,
    instagram: igHandles[0] || undefined,
    isTwin: isTwin || undefined,
    _sources: {
      cover: coverSrc,
      gallery: gallerySrcs,
      digitals: [],
      pdf: pdfs[0] || null,
      introVideo: videos[0] || null,
      catwalkVideo: videos[1] || null,
      termSlugs,
      videoCount: videos.length,
      pdfCount: pdfs.length,
      imageCount: images.length,
    },
  };
}

async function materializeMedia(token, draft) {
  const cache = new Map();
  const sources = draft._sources;
  const coverImage = (await mirrorUrl(token, sources.cover, cache)) || '';
  const gallery = [];
  for (const src of sources.gallery) {
    const url = await mirrorUrl(token, src, cache);
    if (url) gallery.push(url);
  }
  const digitals = [];
  for (const src of sources.digitals) {
    const url = await mirrorUrl(token, src, cache);
    if (url) digitals.push(url);
  }
  const pdfUrl = await mirrorUrl(token, sources.pdf, cache);
  const introVideoUrl = await mirrorUrl(token, sources.introVideo, cache);
  const catwalkVideoUrl = await mirrorUrl(token, sources.catwalkVideo, cache);

  const { _sources, ...rest } = draft;
  return {
    ...rest,
    coverImage,
    gallery,
    digitals,
    pdfUrl: pdfUrl || undefined,
    introVideoUrl: introVideoUrl || undefined,
    catwalkVideoUrl: catwalkVideoUrl || undefined,
  };
}

async function upsertModel(token, model, existingIds) {
  if (!model.coverImage && !DRY_RUN) {
    throw new Error(`Model ${model.id} has no cover image after mirror`);
  }
  if (DRY_RUN) {
    return existingIds.has(model.id) ? 'would-update' : 'would-create';
  }
  if (existingIds.has(model.id)) {
    await apiJson('PUT', `/admin/models/${model.id}`, token, model);
    return 'updated';
  }
  await apiJson('POST', '/admin/models', token, model);
  existingIds.add(model.id);
  return 'created';
}

async function main() {
  console.log('=== WP Profiles → ille import ===');
  console.log(`WP: ${WP_BASE}`);
  console.log(`Export file: ${WP_EXPORT_FILE || '(none — will fetch live)'}`);
  console.log(`API: ${API_BASE}`);
  console.log(`DRY_RUN=${DRY_RUN} SCRAPE_PAGE=${SCRAPE_PAGE} SKIP_EXISTING=${SKIP_EXISTING}`);
  if (ONLY_SLUG) console.log(`ONLY_SLUG=${ONLY_SLUG}`);
  if (LIMIT) console.log(`LIMIT=${LIMIT}`);

  let profiles = await loadProfiles();

  if (ONLY_SLUG) {
    profiles = profiles.filter((p) => (p.slug || '').toLowerCase() === ONLY_SLUG);
  }
  if (!INCLUDE_DEVELOPMENT) {
    profiles = profiles.filter((p) => {
      const terms = (p._embedded?.['wp:term'] || []).flat().map((t) => t.slug);
      if (!terms.includes('development')) return true;
      const others = terms.filter((s) => !['development', 'men', 'women'].includes(s));
      return others.length > 0;
    });
  }
  if (LIMIT) profiles = profiles.slice(0, LIMIT);

  let token = null;
  let existingIds = new Set();
  try {
    token = await login();
    console.log('Authenticated with admin API');
    const existing = await apiJson('GET', '/admin/models', token);
    existingIds = new Set(existing.map((m) => m.id));
    console.log(`Existing models: ${existingIds.size}`);
  } catch (err) {
    if (!DRY_RUN) throw err;
    console.warn(`WARN: admin API unavailable (${err.message}); continuing dry-run without upsert checks`);
  }

  const neededCategories = new Set();
  const drafts = [];

  for (const profile of profiles) {
    const link = profile.link || `${WP_BASE}/profiles/${profile.slug}/`;
    let pageHtml = '';
    if (SCRAPE_PAGE) {
      process.stdout.write(`Scraping ${profile.slug}... `);
      pageHtml = await scrapeProfilePage(link);
      console.log(pageHtml ? `${pageHtml.length} bytes` : 'empty');
      await sleep(150);
    }
    const draft = buildModelFromWp(profile, pageHtml);
    if (draft.category) neededCategories.add(draft.category);
    drafts.push(draft);
  }

  if (token) {
    await ensureCategories(token, neededCategories);
  } else if (neededCategories.size) {
    console.log(`[dry-run] categories needed: ${[...neededCategories].join(', ')}`);
  }

  const summary = { created: 0, updated: 0, skipped: 0, errors: 0, wouldCreate: 0, wouldUpdate: 0 };

  for (const draft of drafts) {
    console.log(`\n— ${draft.name} (${draft.id}) [${draft.branch}/${draft.category || 'main'}]`);
    console.log(
      `  media src: images=${draft._sources.imageCount} gallery=${draft._sources.gallery.length}` +
        ` videos=${draft._sources.videoCount} pdfs=${draft._sources.pdfCount}` +
        ` cover=${draft._sources.cover ? 'yes' : 'NO'}` +
        ` h=${draft.height ?? '-'} ig=${draft.instagram ?? '-'}`,
    );

    if (SKIP_EXISTING && existingIds.has(draft.id)) {
      console.log('  skip: already exists');
      summary.skipped++;
      continue;
    }

    try {
      const model = await materializeMedia(token, draft);
      if (!model.coverImage && !DRY_RUN) {
        throw new Error('no cover image');
      }
      const action = await upsertModel(token, model, existingIds);
      console.log(`  ${action}`);
      if (action === 'created') summary.created++;
      else if (action === 'updated') summary.updated++;
      else if (action === 'would-create') summary.wouldCreate++;
      else if (action === 'would-update') summary.wouldUpdate++;
    } catch (err) {
      summary.errors++;
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log('\n=== Done ===');
  console.log(summary);
  if (DRY_RUN) {
    console.log('\nThis was a dry run. Set DRY_RUN=false to write models + media.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
