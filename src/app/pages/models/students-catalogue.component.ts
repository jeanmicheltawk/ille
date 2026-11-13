import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelsService } from '../../core/models.service';
import { modelStats, ModelStat } from '../../core/model.util';
import { STUDENTS_CATEGORY_ID, STUDENTS_CATEGORY_NAME } from '../../core/models-branch.util';
import { Model } from '../../core/models.types';
import { MediaUrlPipe } from '../../shared/media-url.pipe';

@Component({
  selector: 'app-students-catalogue',
  standalone: true,
  imports: [CommonModule, MediaUrlPipe],
  template: `
    <div class="page-head">
      <p class="eyebrow">ille</p>
      <h1>{{ heading }}</h1>
    </div>

    <div class="container toolbar">
      <div class="tabs">
        <span class="tabs__label">{{ heading }}</span>
      </div>
      <label class="oot">
        <input type="checkbox" [checked]="onlyInTown" (change)="toggleInTown()" />
        <span class="oot__box"></span>
        In town only
      </label>
    </div>

    <div class="container">
      <div *ngIf="loading" class="muted">Loading students…</div>

      <div class="grid" *ngIf="!loading">
        <button *ngFor="let m of visible; let i = index"
           type="button"
           class="card rise"
           [class.card--stats]="statsOpenId === m.id"
           [style.animation-delay]="(i * 0.06) + 's'"
           (click)="onCardClick(m)">
          <div class="card__img" [style.background-image]="'url(' + (m.coverImage | mediaUrl: 640) + ')'">
            <span *ngIf="m.outOfTown" class="card__badge">Out of town</span>
            <ng-container *ngIf="cardStatGroups(m) as groups">
              <div class="card__stats" *ngIf="groups.length">
                <div class="card__stat-groups" [class.card__stat-groups--twins]="groups.length > 1">
                  <div class="card__stat-group" *ngFor="let g of groups">
                    <span class="card__stat-twin" *ngIf="g.label">{{ g.label }}</span>
                    <div *ngFor="let stat of g.stats" class="card__stat">
                      <span class="card__stat-label">{{ stat.label }}</span>
                      <span class="card__stat-value">{{ stat.value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
          <div class="card__meta">
            <span class="card__name">{{ m.name }}</span>
            <span class="card__branch">{{ m.branch === 'men' ? 'Men' : 'Women' }}</span>
            <span class="card__sub" *ngIf="m.city || m.height">
              <ng-container *ngIf="m.city">{{ m.city }}</ng-container>
              <ng-container *ngIf="m.city && m.height"> · </ng-container>
              <ng-container *ngIf="m.height">{{ m.height }}cm</ng-container>
            </span>
          </div>
        </button>
      </div>

      <p *ngIf="!loading && visible.length === 0" class="muted">No students match this filter.</p>
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
    .tabs__label {
      text-transform: uppercase;
      letter-spacing: 0.22em;
      font-size: 10px;
      font-weight: 300;
      color: var(--accent);
      padding: 8px 0;
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
      width: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      background: var(--black);
      overflow: hidden;
      text-align: left;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .card:focus-visible {
      outline: 1px solid var(--accent);
      outline-offset: 2px;
    }
    .card__img {
      position: relative;
      aspect-ratio: 3/5;
      background-size: cover;
      background-position: center top;
      filter: grayscale(0.25) brightness(0.8);
      transition: filter 0.8s var(--ease), transform 0.8s var(--ease-slow);
    }
    .card:hover .card__img,
    .card--stats .card__img {
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
    .card:hover .card__stats,
    .card--stats .card__stats {
      opacity: 1;
      transform: translateY(0);
    }
    .card__stat-groups {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card__stat-groups--twins {
      flex-direction: row;
      gap: 12px;
    }
    .card__stat-groups--twins .card__stat-group {
      flex: 1 1 0;
      min-width: 0;
    }
    .card__stat-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .card__stat-twin {
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--ink);
      font-weight: 400;
      padding-bottom: 4px;
      margin-bottom: 2px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.22);
    }
    .card__stat-groups--twins .card__stat {
      gap: 6px;
      font-size: 9px;
      letter-spacing: 0.1em;
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
    .card:hover .card__name,
    .card--stats .card__name { color: var(--accent); }
    .card__branch {
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--ink-soft);
      font-weight: 300;
    }
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
  `],
})
export class StudentsCatalogueComponent implements OnInit {
  all: Model[] = [];
  visible: Model[] = [];
  onlyInTown = false;
  loading = true;
  statsOpenId: string | null = null;
  readonly heading = STUDENTS_CATEGORY_NAME;

  constructor(private models: ModelsService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading = true;
    this.all = await this.models.list({ category: STUDENTS_CATEGORY_ID });
    this.applyFilter();
    this.loading = false;
  }

  toggleInTown() {
    this.onlyInTown = !this.onlyInTown;
    this.applyFilter();
  }

  /** Click only toggles measurements — students never open a model profile page. */
  onCardClick(m: Model) {
    if (!this.cardStatGroups(m).length) return;
    this.statsOpenId = this.statsOpenId === m.id ? null : m.id;
  }

  private applyFilter() {
    this.visible = this.onlyInTown ? this.all.filter((m) => !m.outOfTown) : this.all;
  }

  cardStatGroups(m: Model): { label: string | null; stats: ModelStat[] }[] {
    if (m.isTwin) {
      return [
        { label: m.twinName1?.trim() || 'Twin 1', stats: modelStats(m, 1) },
        { label: m.twinName2?.trim() || 'Twin 2', stats: modelStats(m, 2) },
      ].filter((g) => g.stats.length);
    }
    const stats = modelStats(m, 1);
    return stats.length ? [{ label: null, stats }] : [];
  }
}
