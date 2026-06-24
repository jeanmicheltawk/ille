export const MODELS_BRANCH_KEY = 'ille_models_branch';

export type ModelsBranch = 'men' | 'women';

export function setModelsBranch(branch: ModelsBranch): void {
  sessionStorage.setItem(MODELS_BRANCH_KEY, branch);
}

export function getModelsBranch(): ModelsBranch | null {
  const stored = sessionStorage.getItem(MODELS_BRANCH_KEY);
  return stored === 'men' || stored === 'women' ? stored : null;
}

export function resolveModelsBranch(category: string | null | undefined): ModelsBranch | null {
  if (category === 'men' || category === 'women') return category;
  return getModelsBranch();
}

export function modelsBackLink(): string[] {
  const branch = getModelsBranch();
  return branch ? ['/models', branch] : ['/models'];
}
