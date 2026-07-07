import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ModelsService } from '../../core/models.service';
import { Model } from '../../core/models.types';
import { modelStats, ModelStat } from '../../core/model.util';
import { modelsBackLink } from '../../core/models-branch.util';
import { ModelProfileLinksComponent } from './model-profile-links.component';
import { ImageLightboxComponent } from '../../shared/image-lightbox.component';
import { MediaUrlPipe } from '../../shared/media-url.pipe';

interface ProfilePerson {
  label: string | null;
  stats: ModelStat[];
  instagramHandle: string;
  instagramUrl: string;
}

@Component({
  selector: 'app-model-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ModelProfileLinksComponent, ImageLightboxComponent, MediaUrlPipe],
  template: `
    <div class="model-page" *ngIf="model">
      <div class="container profile">
        <div class="profile__info">
          <h1>{{ model.name }}</h1>

          <div class="people" [class.people--twins]="model.isTwin">
            <div class="person" *ngFor="let p of people">
              <h2 class="person__name" *ngIf="p.label">{{ p.label }}</h2>

              <dl class="stats" *ngIf="p.stats.length">
                <div *ngFor="let stat of p.stats">
                  <dt>{{ stat.label }}</dt>
                  <dd>{{ stat.value }}</dd>
                </div>
              </dl>

              <a
                *ngIf="p.instagramHandle"
                class="instagram"
                [href]="p.instagramUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.3 2.3.5.6.2 1 .5 1.5 1 .5.5.8.9 1 1.5.2.4.4 1.1.5 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.5 2.3-.2.6-.5 1-1 1.5-.5.5-.9.8-1.5 1-.4.2-1.1.4-2.3.5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.3-.5-.6-.2-1-.5-1.5-1-.5-.5-.8-.9-1-1.5-.2-.4-.4-1.1-.5-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.9.5-2.3.2-.6.5-1 1-1.5.5-.5.9-.8 1.5-1 .4-.2 1.1-.4 2.3-.5C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7 0.1 5.7.2 4.8.4 4 .7 3.2 1 2.5 1.4 1.8 2.1.4 2.8 0 3.5-.3 4.3-.6 5.1-.8 6-.9 7.3 0 8.6 0 9 0 12s0 3.4.1 4.7c.1 1.3.3 2.2.6 3 .3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.7.5 3 .6 1.3.1 1.7.1 4.7.1s3.4 0 4.7-.1c1.3-.1 2.2-.3 3-.6.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.7.6-3 .1-1.3.1-1.7.1-4.7s0-3.4-.1-4.7c-.1-1.3-.3-2.2-.6-3-.3-.8-.7-1.5-1.4-2.2-.7-.7-1.4-1.1-2.2-1.4-.8-.3-1.7-.5-3-.6C15.4 0 15 0 12 0z"/>
                  <path fill="currentColor" d="M12 5.8A6.2 6.2 0 1 0 18.2 12 6.2 6.2 0 0 0 12 5.8m0 10.2A4 4 0 1 1 16 12a4 4 0 0 1-4 4m6.4-11.5a1.4 1.4 0 1 1-1.4-1.4 1.4 1.4 0 0 1 1.4 1.4"/>
                </svg>
                {{ p.instagramHandle }}
              </a>
            </div>
          </div>

          <app-model-profile-links [model]="model" />
        </div>

        <div class="profile__image">
          <button type="button" class="image-btn" (click)="openLightbox(0)" aria-label="View cover image">
            <img [src]="model.coverImage | mediaUrl" [alt]="model.name" />
          </button>
        </div>
      </div>

      <div class="container profile-gallery" *ngIf="model.gallery?.length">
        <button
          type="button"
          class="image-btn"
          *ngFor="let src of model.gallery; let i = index"
          (click)="openLightbox(i + 1)"
          [attr.aria-label]="'View image ' + (i + 2)"
        >
          <img [src]="src | mediaUrl" [alt]="model.name" />
        </button>
      </div>
    </div>

    <app-image-lightbox
      *ngIf="lightboxIndex !== null"
      [images]="profileImages"
      [index]="lightboxIndex"
      [alt]="model?.name || 'Model photo'"
      (closed)="closeLightbox()"
    />

    <div class="model-page not-found" *ngIf="!model && !loading">
      <div class="container">
        <p>Model not found.</p>
        <a [routerLink]="modelsBack()" class="back">Back to models</a>
      </div>
    </div>
  `,
  styles: [`
    .model-page {
      background: #fff;
      color: #1a1a1a;
      min-height: 70vh;
      padding: 48px 0 80px;
    }
    .profile {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.15fr);
      gap: clamp(32px, 6vw, 80px);
      align-items: start;
    }
    .profile__info h1 {
      font-size: clamp(42px, 5vw, 64px);
      font-weight: 200;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1;
      margin: 0 0 32px;
    }
    .people--twins {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: clamp(24px, 4vw, 48px);
    }
    .person__name {
      font-size: 13px;
      font-weight: 400;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin: 0 0 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(26, 26, 26, 0.15);
    }
    .stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 0;
      max-width: 280px;
    }
    .stats > div {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: baseline;
      font-size: 15px;
      font-weight: 300;
    }
    .stats dt {
      margin: 0;
      font-weight: 300;
    }
    .stats dd {
      margin: 0;
      text-align: right;
    }
    .instagram {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-top: 28px;
      color: #1a1a1a;
      text-decoration: none;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .instagram:hover { opacity: 0.6; }
    .profile__image img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
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
    .image-btn:hover img {
      opacity: 0.92;
    }
    .image-btn img {
      transition: opacity 0.3s ease;
    }
    .profile-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 6px;
      margin-top: 48px;
      padding-bottom: 24px;
    }
    .profile-gallery .image-btn img {
      width: 100%;
      aspect-ratio: 2/3;
      object-fit: cover;
      display: block;
    }
    .not-found {
      text-align: center;
      padding: 120px 0;
    }
    .back {
      display: inline-block;
      margin-top: 24px;
      color: #1a1a1a;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 12px;
    }
    @media (max-width: 860px) {
      .profile { grid-template-columns: 1fr; }
      .profile__image { order: -1; }
      .people--twins { grid-template-columns: 1fr; }
    }
  `],
})
export class ModelDetailComponent implements OnInit, OnDestroy {
  model: Model | null = null;
  loading = true;
  people: ProfilePerson[] = [];
  lightboxIndex: number | null = null;

  constructor(private route: ActivatedRoute, private models: ModelsService) {}

  get profileImages(): string[] {
    if (!this.model) return [];
    return [this.model.coverImage, ...(this.model.gallery || [])];
  }

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
      const id = params.get('id')!;
      this.loading = true;
      this.model = await this.models.get(id);
      this.people = this.model ? this.buildPeople(this.model) : [];
      this.loading = false;
    });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
  }

  private buildPeople(model: Model): ProfilePerson[] {
    if (model.isTwin) {
      return [
        this.makePerson(model.twinName1?.trim() || 'Twin 1', modelStats(model, 1), model.instagram),
        this.makePerson(model.twinName2?.trim() || 'Twin 2', modelStats(model, 2), model.instagram2),
      ];
    }
    return [this.makePerson(null, modelStats(model, 1), model.instagram)];
  }

  private makePerson(label: string | null, stats: ModelStat[], instagram?: string): ProfilePerson {
    const raw = instagram?.trim() || '';
    const handle = raw.startsWith('@') ? raw.slice(1) : raw;
    return {
      label,
      stats,
      instagramHandle: handle,
      instagramUrl: handle ? `https://instagram.com/${handle}` : '#',
    };
  }

  modelsBack(): string[] {
    return modelsBackLink(this.model?.branch ?? null);
  }
}
