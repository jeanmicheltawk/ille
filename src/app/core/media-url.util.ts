import { environment } from '../../environments/environment';

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
