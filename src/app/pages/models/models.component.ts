import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ModelsService } from '../../core/models.service';
import { CategoriesService } from '../../core/categories.service';
import { modelStats } from '../../core/model.util';
import { Model, ModelCategory, ModelsBranch } from '../../core/models.types';
import {
  isBranchCategory,
  isBranchTab,
  modelsCategoryLink,
  modelsDivisionLink,
  setModelsBranch,
} from '../../core/models-branch.util';

@Component({
  selector: 'app-models',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-head">
      <p class="eyebrow">ille</p>
      <h1>{{ heading }}</h1>
    </div>

    <div class="container toolbar">
      <div class="tabs">
        <ng-container *ngFor="let c of tabCategories; let first = first">
          <span class="tabs__sep" *ngIf="!first"></span>
          <a [routerLink]="tabLink(c)" [class.on]="isTabActive(c)">{{ c.name }}</a>
        </ng-container>
      </div>
      <label class="oot">
        <input type="checkbox" [checked]="onlyOutOfTown" (change)="toggleOutOfTown()" />
        <span class="oot__box"></span>
        Out of town only
      </label>
    </div>

    <div class="container">
      <div *ngIf="loading" class="muted">Loading models…</div>

      <div class="grid" *ngIf="!loading">
        <a *ngFor="let m of visible; let i = index" [routerLink]="['/model', m.id]"
           class="card rise" [style.animation-delay]="(i * 0.06) + 's'">
          <div class="card__img" [style.background-image]="'url(' + m.coverImage + ')'">
            <span *ngIf="m.outOfTown" class="card__badge">Out of town</span>
            <ng-container *ngIf="modelStats(m) as stats">
              <div class="card__stats" *ngIf="stats.length">
                <div *ngFor="let stat of stats" class="card__stat">
                  <span class="card__stat-label">{{ stat.label }}</span>
                  <span class="card__stat-value">{{ stat.value }}</span>
                </div>
              </div>
            </ng-container>
          </div>
          <div class="card__meta">
            <span class="card__name">{{ m.name }}</span>
            <span class="card__sub">{{ m.city }}<span *ngIf="m.height"> · {{ m.height }}cm</span></span>
          </div>
        </a>
      </div>

      <p *ngIf="!loading && visible.length === 0" class="muted">No models match this filter.</p>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 20px;
      margin-bottom: 48px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }
    .tabs { display: flex; align-items: center; gap: 0; }
    .tabs a {
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 10px;
      font-weight: 300;
      color: var(--ink-muted);
      padding: 8px 0;
      transition: color 0.4s ease;
    }
    .tabs a.on { color: var(--accent); }
    .tabs a:hover { color: var(--ink); }
    .tabs__sep {
      width: 1px; height: 12px;
      background: var(--line);
      margin: 0 20px;
    }

    .oot {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--ink-muted);
      display: flex; align-items: center; gap: 10px;
      cursor: pointer;
      font-weight: 300;
    }
    .oot input { display: none; }
    .oot__box {
      width: 14px; height: 14px;
      border: 1px solid var(--line-strong);
      display: inline-block;
      transition: background 0.3s ease, border-color 0.3s ease;
    }
    .oot input:checked + .oot__box {
      background: var(--accent);
      border-color: var(--accent);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3px;
      margin-bottom: 80px;
    }
    .card {
      display: block;
      background: var(--black);
      overflow: hidden;
    }
    .card__img {
      position: relative;
      aspect-ratio: 3/5;
      background-size: cover;
      background-position: center top;
      filter: grayscale(0.25) brightness(0.8);
      transition: filter 0.8s var(--ease), transform 0.8s var(--ease-slow);
    }
    .card:hover .card__img {
      filter: grayscale(0) brightness(0.95);
      transform: scale(1.02);
    }
    .card__badge {
      position: absolute; top: 14px; left: 14px;
      border: 1px solid var(--line-strong);
      color: var(--ink-soft);
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      padding: 5px 10px;
      font-weight: 300;
      backdrop-filter: blur(8px);
      background: rgba(0,0,0,0.5);
      z-index: 2;
    }
    .card__stats {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 6px;
      padding: 18px 14px;
      background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 55%, transparent 100%);
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.45s var(--ease), transform 0.45s var(--ease);
      pointer-events: none;
      z-index: 1;
    }
    .card:hover .card__stats {
      opacity: 1;
      transform: translateY(0);
    }
    .card__stat {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: baseline;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 300;
      color: var(--ink-soft);
    }
    .card__stat-value {
      color: var(--ink);
      font-variant-numeric: tabular-nums;
    }
    .card__meta {
      padding: 16px 14px 20px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .card__name {
      font-family: var(--display);
      font-size: 20px;
      font-weight: 100;
      letter-spacing: 0.06em;
      transition: color 0.4s ease;
    }
    .card:hover .card__name { color: var(--accent); }
    .card__sub {
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--ink-muted);
      font-weight: 300;
    }
    .muted {
      color: var(--ink-muted);
      padding: 40px 0 80px;
      font-weight: 200;
      letter-spacing: 0.06em;
    }
    @media (max-width: 980px) { .grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 680px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px) { .tabs__sep { margin: 0 12px; } }
  `],
})
export class ModelsComponent implements OnInit {
  readonly modelStats = modelStats;

  all: Model[] = [];
  visible: Model[] = [];
  categories: ModelCategory[] = [];
  branch: ModelsBranch | null = null;
  subCategory = '';
  onlyOutOfTown = false;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private models: ModelsService,
    private categoriesSvc: CategoriesService,
  ) {}

  async ngOnInit() {
    this.categories = await this.categoriesSvc.listPublished();
    this.route.paramMap.subscribe(async (params) => {
      const branchParam = params.get('branch');
      if (!isBranchTab(branchParam)) {
        this.router.navigate(['/models'], { replaceUrl: true });
        return;
      }

      this.branch = branchParam;
      this.subCategory = params.get('category') ?? '';
      setModelsBranch(branchParam);
      await this.load();
    });
  }

  get tabCategories(): ModelCategory[] {
    if (this.branch === 'men') {
      return this.categories.filter((c) => c.id !== 'women');
    }
    if (this.branch === 'women') {
      return this.categories.filter((c) => c.id !== 'men');
    }
    return this.categories;
  }

  tabLink(c: ModelCategory): string[] {
    if (!this.branch) return ['/models'];
    if (isBranchCategory(c.id)) {
      return modelsDivisionLink(c.id as ModelsBranch);
    }
    return modelsCategoryLink(this.branch, c.id);
  }

  isTabActive(c: ModelCategory): boolean {
    if (isBranchCategory(c.id)) {
      return !this.subCategory && this.branch === c.id;
    }
    return this.subCategory === c.id;
  }

  get heading(): string {
    if (!this.subCategory) {
      return this.branch === 'men' ? 'Men' : 'Women';
    }
    return this.categoriesSvc.nameFor(this.subCategory, this.categories);
  }

  async load() {
    if (!this.branch) return;

    this.loading = true;
    const filters = this.subCategory
      ? { branch: this.branch, category: this.subCategory }
      : { branch: this.branch };

    this.all = await this.models.list(filters);
    this.applyFilter();
    this.loading = false;
  }

  toggleOutOfTown() {
    this.onlyOutOfTown = !this.onlyOutOfTown;
    this.applyFilter();
  }

  private applyFilter() {
    this.visible = this.onlyOutOfTown ? this.all.filter((m) => m.outOfTown) : this.all;
  }
}
