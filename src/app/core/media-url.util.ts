import { environment } from '../../environments/environment';

const MEDIA_ID_RE = /(?:^|\/)api\/media\/(m_[A-Za-z0-9_]+)/;
const PUBLIC_ORIGIN = 'https://ille.co';

/** API origin without the /api suffix — used to resolve media paths in dev. */
export function apiOrigin(): string {
  const base = environment.apiUrl || '';
  if (!base || base.startsWith('/')) return '';
  return base.replace(/\/api\/?$/, '');
}

/** Turn a stored media reference into a browser-loadable URL. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('assets/')) {
    return path;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/api/media/') || path.startsWith('/uploads/')) {
    const origin = apiOrigin();
    return origin ? `${origin}${path}` : path;
  }
  return path;
}

export function mediaRefId(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = String(path).trim().match(MEDIA_ID_RE);
  return match ? match[1] : null;
}

export function isMediaRef(path: string | null | undefined): boolean {
  return !!mediaRefId(path);
}

/** Absolute URL that works in the current environment (localhost or production). */
export function absoluteMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  const resolved = mediaUrl(path);
  if (!resolved) return '';
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) return resolved;
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : PUBLIC_ORIGIN;
  return `${origin}${resolved.startsWith('/') ? resolved : `/${resolved}`}`;
}

/** Public label, e.g. ille.co/api/media/m_123 */
export function publicMediaLabel(path: string | null | undefined): string {
  const id = mediaRefId(path);
  if (id) return `ille.co/api/media/${id}`;
  return absoluteMediaUrl(path).replace(/^https?:\/\//, '');
}

export function mediaDownloadUrl(path: string | null | undefined): string {
  const href = absoluteMediaUrl(path);
  if (!href) return '';
  return href.includes('?') ? `${href}&download=1` : `${href}?download=1`;
}
