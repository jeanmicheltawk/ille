import { UrlSegment } from '@angular/router';
import { Model, ModelsBranch } from './models.types';

export interface ModelStat {
  label: string;
  value: string | number;
}

const MODEL_STAT_FIELDS: { key: keyof Model; twinKey: keyof Model; label: string }[] = [
  { key: 'height', twinKey: 'height2', label: 'Height' },
  { key: 'bust', twinKey: 'bust2', label: 'Bust' },
  { key: 'waist', twinKey: 'waist2', label: 'Waist' },
  { key: 'hips', twinKey: 'hips2', label: 'Hips' },
  { key: 'shoeSize', twinKey: 'shoeSize2', label: 'Shoe' },
  { key: 'hair', twinKey: 'hair2', label: 'Hair' },
  { key: 'eyes', twinKey: 'eyes2', label: 'Eyes' },
];

/**
 * Build display stats from whichever measurement fields exist on the model.
 * Pass `which = 2` to read the second twin's measurement fields.
 */
export function modelStats(model: Model, which: 1 | 2 = 1): ModelStat[] {
  return MODEL_STAT_FIELDS.flatMap(({ key, twinKey, label }) => {
    const value = model[which === 2 ? twinKey : key];
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

export function normalizeModelCategory(model: Pick<Model, 'category'>): string {
  const category = model.category ?? '';
  return category === 'men' || category === 'women' ? '' : category;
}

export function normalizeModelBranch(model: Pick<Model, 'branch' | 'category'>): ModelsBranch {
  if (model.branch === 'men' || model.branch === 'women') return model.branch;
  if (model.category === 'men') return 'men';
  if (model.category === 'women') return 'women';
  return 'women';
}

export function modelMatchesFilters(
  model: Model,
  filters?: { branch?: ModelsBranch; category?: string },
): boolean {
  if (!model.published) return false;
  if (!filters) return true;

  const branch = normalizeModelBranch(model);
  const category = normalizeModelCategory(model);

  if (filters.branch && branch !== filters.branch) return false;
  if (filters.category !== undefined && category !== filters.category) return false;
  return true;
}
