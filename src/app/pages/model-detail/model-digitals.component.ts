import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ModelsService } from '../../core/models.service';
import { Model } from '../../core/models.types';
import { modelStats, ModelStat } from '../../core/model.util';
import { modelsBackLink } from '../../core/models-branch.util';
import { ImageLightboxComponent } from '../../shared/image-lightbox.component';
import { MediaUrlPipe } from '../../shared/media-url.pipe';

@Component({
  selector: 'app-model-digitals',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageLightboxComponent, MediaUrlPipe],
  template: `
    <div class="model-page" *ngIf="model">
      <div class="digitals-wrap">
        <header class="digitals-header">
          <a class="name" [routerLink]="['/model', model.id]">{{ model.name }}</a>
        </header>

        <p class="stats-bar" *ngIf="stats.length">
          <span class="stat" *ngFor="let stat of stats">
            <span class="label">{{ stat.label }}</span> {{ stat.value }}
          </span>
        </p>

        <div class="gallery" *ngIf="model.digitals?.length">
          <button
            type="button"
            class="image-btn"
            *ngFor="let src of model.digitals; let i = index"
            (click)="openLightbox(i)"
            [attr.aria-label]="'View digital ' + (i + 1)"
          >
            <img [src]="src | mediaUrl" [alt]="model.name + ' digital'" />
          </button>
        </div>

        <footer class="digitals-brand" *ngIf="model.digitals?.length">
          <img src="assets/ille-logo-black.png" alt="ille" class="digitals-brand__logo" />
        </footer>
      </div>
    </div>

    <app-image-lightbox
      *ngIf="lightboxIndex !== null && model"
      [images]="model.digitals || []"
      [index]="lightboxIndex"
      [alt]="model.name + ' digital'"
      (closed)="closeLightbox()"
    />

    <div class="model-page not-found" *ngIf="!model && !loading">
      <div class="digitals-wrap">
        <p>Digitals not found.</p>
        <a [routerLink]="modelsBack()" class="back">Back to models</a>
      </div>
    </div>
  `,
  styles: [`
    .model-page {
      background: #fff;
      color: #1a1a1a;
      min-height: 100vh;
      padding: 108px 0 80px;
    }
    .digitals-wrap {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
      padding: 0 32px;
    }
    .digitals-header {
      text-align: center;
      margin-bottom: 22px;
    }
    .name {
      display: inline-block;
      font-family: var(--display);
      font-size: clamp(32px, 4.5vw, 46px);
      font-weight: 200;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1a1a1a;
      text-decoration: none;
      line-height: 1.1;
    }
    .name:hover { opacity: 0.55; }

    .stats-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 6px 28px;
      margin: 0 0 36px;
      padding: 0;
      font-size: 11px;
      font-weight: 300;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #555;
      text-align: center;
      line-height: 1.6;
    }
    .stat { white-space: nowrap; }
    .stat .label { color: #888; }

    .gallery {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .image-btn {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      cursor: zoom-in;
      overflow: hidden;
    }
    .gallery .image-btn img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }

    .digitals-brand {
      display: flex;
      justify-content: center;
      margin-top: clamp(72px, 12vw, 120px);
      padding-bottom: 8px;
    }
    .digitals-brand__logo {
      height: clamp(120px, 6vw, 64px);
      width: auto;
      display: block;
    }

    .not-found {
      text-align: center;
      padding: 120px 0;
    }
    .back {
      display: inline-block;
      margin-top: 24px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 12px;
      color: #1a1a1a;
    }

    @media (max-width: 520px) {
      .digitals-wrap { padding: 0 20px; }
      .gallery { gap: 6px; }
      .stats-bar { gap: 6px 18px; font-size: 10px; }
    }
  `],
})
export class ModelDigitalsComponent implements OnInit, OnDestroy {
  model: Model | null = null;
  loading = true;
  stats: ModelStat[] = [];
  lightboxIndex: number | null = null;

  constructor(private route: ActivatedRoute, private models: ModelsService) {}

  openLightbox(index: number) {
    this.lightboxIndex = index;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxIndex = null;
    document.body.style.overflow = '';
  }


  ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      const path = params.get('digitalsPath')!;
      this.loading = true;
      this.model = await this.models.getByDigitalsPath(path);
      this.stats = this.model ? modelStats(this.model) : [];
      this.loading = false;
    });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  modelsBack(): string[] {
    return modelsBackLink(this.model?.branch ?? null);
  }
}
