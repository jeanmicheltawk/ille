// media.js — store file bytes in PostgreSQL; models reference /api/media/{id}.

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const MEDIA_REF_PREFIX = '/api/media/';

function newMediaId() {
  return `m_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function mediaRef(id) {
  return `${MEDIA_REF_PREFIX}${id}`;
}

function parseMediaRef(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const s = ref.trim();
  const direct = s.match(/(?:^|\/)api\/media\/(m_[^/?#]+)/);
  if (direct) return direct[1];
  return null;
}

/** Normalize a stored media reference (ID path, not file bytes). */
function normalizeMediaRef(ref) {
  if (ref == null) return null;
  if (typeof ref !== 'string') return ref;
  const s = ref.trim();
  if (!s) return null;
  if (s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('assets/')) return s;
  const id = parseMediaRef(s);
  if (id) return mediaRef(id);
  return s;
}

function normalizeMediaRefList(value) {
  if (value == null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map(normalizeMediaRef).filter(Boolean);
}

function guessMime(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

async function storeBuffer(queryFn, { buffer, filename, mimeType }) {
  const id = newMediaId();
  await queryFn(
    'INSERT INTO media_files (id, filename, mime_type, data) VALUES ($1, $2, $3, $4)',
    [id, filename || id, mimeType || 'application/octet-stream', buffer],
  );
  return mediaRef(id);
}

async function storeFile(queryFn, file) {
  if (!file?.buffer) throw new Error('No file data received');
  return storeBuffer(queryFn, {
    buffer: file.buffer,
    filename: file.originalname,
    mimeType: file.mimetype,
  });
}

async function fetchMedia(queryFn, id) {
  const { rows } = await queryFn(
    'SELECT id, mime_type, data FROM media_files WHERE id = $1',
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, mimeType: row.mime_type, data: row.data };
}

/** Collect the media IDs referenced by any mix of refs / arrays of refs. */
function collectMediaIds(...values) {
  const ids = new Set();
  const walk = (v) => {
    if (v == null) return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v === 'string' && v.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.forEach(walk);
      } catch {
        /* fall through */
      }
    }
    const id = parseMediaRef(String(v));
    if (id) ids.add(id);
  };
  values.forEach(walk);
  return [...ids];
}

/** True if the media ID is still referenced anywhere in the database. */
async function isMediaReferenced(queryFn, id) {
  const like = `%${id}%`;
  const { rows } = await queryFn(
    `SELECT 1 WHERE
       EXISTS (
         SELECT 1 FROM models WHERE
           "coverImage" LIKE $1 OR gallery::text LIKE $1 OR digitals::text LIKE $1
           OR "pdfUrl" LIKE $1 OR "introVideoUrl" LIKE $1 OR "catwalkVideoUrl" LIKE $1
       )
       OR EXISTS (SELECT 1 FROM service_items WHERE "backgroundImage" LIKE $1)
       OR EXISTS (
         SELECT 1 FROM applications WHERE
           "fullShotUrl" LIKE $1 OR "halfShotUrl" LIKE $1
           OR "closeupShotUrl" LIKE $1 OR "profileShotUrl" LIKE $1
       )`,
    [like],
  );
  return rows.length > 0;
}

/**
 * Delete the given media IDs, but only the ones no longer referenced anywhere.
 * Safe to call with candidates that might still be in use — those are skipped.
 * Returns the number of files actually removed.
 */
async function deleteUnreferencedMedia(queryFn, ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  let deleted = 0;
  for (const id of unique) {
    if (await isMediaReferenced(queryFn, id)) continue;
    const res = await queryFn('DELETE FROM media_files WHERE id = $1', [id]);
    deleted += res.rowCount || 0;
  }
  return deleted;
}

/** Import a legacy /uploads/... disk file into media_files. */
async function ingestLegacyUploadPath(queryFn, uploadsDir, ref) {
  if (!ref || typeof ref !== 'string' || !ref.includes('/uploads/')) return ref;
  const filename = path.basename(ref.replace(/^.*\/uploads\//, ''));
  if (!filename) return ref;
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return ref;
  const buffer = fs.readFileSync(filePath);
  return storeBuffer(queryFn, {
    buffer,
    filename,
    mimeType: guessMime(path.extname(filename)),
  });
}

async function migrateRefToDb(queryFn, uploadsDir, ref) {
  const normalized = normalizeMediaRef(ref);
  if (!normalized || parseMediaRef(normalized)) return normalized;
  if (normalized.includes('/uploads/')) {
    return ingestLegacyUploadPath(queryFn, uploadsDir, normalized);
  }
  return normalized;
}

async function migrateRefListToDb(queryFn, uploadsDir, value) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of list) {
    out.push(await migrateRefToDb(queryFn, uploadsDir, item));
  }
  return out.filter(Boolean);
}

module.exports = {
  mediaRef,
  parseMediaRef,
  normalizeMediaRef,
  normalizeMediaRefList,
  storeFile,
  storeBuffer,
  fetchMedia,
  collectMediaIds,
  isMediaReferenced,
  deleteUnreferencedMedia,
  migrateRefToDb,
  migrateRefListToDb,
};
