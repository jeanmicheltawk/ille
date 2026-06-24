import { ModelCategory, ModelsBranch } from './models.types';

export const MODELS_BRANCH_KEY = 'ille_models_branch';

export function setModelsBranch(branch: ModelsBranch): void {
  sessionStorage.setItem(MODELS_BRANCH_KEY, branch);
}

export function getModelsBranch(): ModelsBranch | null {
  const stored = sessionStorage.getItem(MODELS_BRANCH_KEY);
  return stored === 'men' || stored === 'women' ? stored : null;
}

export function isBranchTab(value: string | null | undefined): value is ModelsBranch {
  return value === 'men' || value === 'women';
}

export function isBranchCategory(id: string): boolean {
  return id === 'men' || id === 'women';
}

/** Navigation tabs that are sub-categories only (not men/women divisions). */
export function subCategories(categories: ModelCategory[]): ModelCategory[] {
  return categories.filter((c) => !isBranchCategory(c.id));
}

export function modelsDivisionLink(branch: ModelsBranch): string[] {
  return ['/models', branch];
}

export function modelsCategoryLink(branch: ModelsBranch, categoryId: string): string[] {
  return ['/models', branch, categoryId];
}

export function modelsBackLink(branch?: ModelsBranch | null): string[] {
  return branch ? modelsDivisionLink(branch) : ['/models'];
}

export function categoryNavLink(c: ModelCategory): string[] {
  if (isBranchCategory(c.id)) {
    return modelsDivisionLink(c.id as ModelsBranch);
  }
  return ['/models'];
}
