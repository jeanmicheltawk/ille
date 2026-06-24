import { UrlSegment } from '@angular/router';
import { Model } from './models.types';

export interface ModelStat {
  label: string;
  value: string | number;
}

const MODEL_STAT_FIELDS: { key: keyof Model; label: string }[] = [
  { key: 'height', label: 'Height' },
  { key: 'bust', label: 'Bust' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'shoeSize', label: 'Shoe' },
  { key: 'hair', label: 'Hair' },
  { key: 'eyes', label: 'Eyes' },
];

/** Build display stats from whichever measurement fields exist on the model. */
export function modelStats(model: Model): ModelStat[] {
  return MODEL_STAT_FIELDS.flatMap(({ key, label }) => {
    const value = model[key];
    if (value === null || value === undefined || value === '') return [];
    return [{ label, value: value as string | number }];
  });
}

/** First-name slug used in digitals URLs, e.g. "Carole Nahra" → "carole". */
export function digitalsNameSlug(name: string): string {
  return name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Public digitals path, e.g. "/caroledigitals". */
export function modelDigitalsPath(model: Pick<Model, 'name'>): string {
  return `/${digitalsNameSlug(model.name)}digitals`;
}

/** Extract name slug from a full path like "caroledigitals". */
export function parseDigitalsPath(path: string): string | null {
  if (!path.endsWith('digitals') || path.length <= 8) return null;
  return path.slice(0, -8);
}

/** Angular route matcher for /:name+digitals URLs. */
export function digitalsRouteMatcher(segments: UrlSegment[]) {
  if (
    segments.length === 1 &&
    segments[0].path.endsWith('digitals') &&
    segments[0].path.length > 8
  ) {
    return { consumed: segments, posParams: { digitalsPath: segments[0] } };
  }
  return null;
}
