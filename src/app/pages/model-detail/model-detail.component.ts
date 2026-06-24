import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ModelsService } from '../../core/models.service';
import { Model } from '../../core/models.types';
import { modelStats, ModelStat } from '../../core/model.util';
import { modelsBackLink } from '../../core/models-branch.util';
import { ModelProfileLinksComponent } from './model-profile-links.component';

@Component({
  selector: 'app-model-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ModelProfileLinksComponent],
  template: `
    <div class="model-page" *ngIf="model">
      <div class="container profile">
        <div class="profile__info">
          <h1>{{ model.name }}</h1>

          <dl class="stats" *ngIf="stats.length">
            <div *ngFor="let stat of stats">
              <dt>{{ stat.label }}</dt>
              <dd>{{ stat.value }}</dd>
            </div>
          </dl>

          <a
            *ngIf="model.instagram"
            class="instagram"
            [href]="instagramUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.3 2.3.5.6.2 1 .5 1.5 1 .5.5.8.9 1 1.5.2.4.4 1.1.5 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.5 2.3-.2.6-.5 1-1 1.5-.5.5-.9.8-1.5 1-.4.2-1.1.4-2.3.5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.3-.5-.6-.2-1-.5-1.5-1-.5-.5-.8-.9-1-1.5-.2-.4-.4-1.1-.5-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.9.5-2.3.2-.6.5-1 1-1.5.5-.5.9-.8 1.5-1 .4-.2 1.1-.4 2.3-.5C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7 0.1 5.7.2 4.8.4 4 .7 3.2 1 2.5 1.4 1.8 2.1.4 2.8 0 3.5-.3 4.3-.6 5.1-.8 6-.9 7.3 0 8.6 0 9 0 12s0 3.4.1 4.7c.1 1.3.3 2.2.6 3 .3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.7.5 3 .6 1.3.1 1.7.1 4.7.1s3.4 0 4.7-.1c1.3-.1 2.2-.3 3-.6.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.7.6-3 .1-1.3.1-1.7.1-4.7s0-3.4-.1-4.7c-.1-1.3-.3-2.2-.6-3-.3-.8-.7-1.5-1.4-2.2-.7-.7-1.4-1.1-2.2-1.4-.8-.3-1.7-.5-3-.6C15.4 0 15 0 12 0z"/>
              <path fill="currentColor" d="M12 5.8A6.2 6.2 0 1 0 18.2 12 6.2 6.2 0 0 0 12 5.8m0 10.2A4 4 0 1 1 16 12a4 4 0 0 1-4 4m6.4-11.5a1.4 1.4 0 1 1-1.4-1.4 1.4 1.4 0 0 1 1.4 1.4"/>
            </svg>
            {{ instagramHandle }}
          </a>

          <app-model-profile-links [model]="model" />
        </div>

        <div class="profile__image">
          <img [src]="model.coverImage" [alt]="model.name" />
        </div>
      </div>

      <div class="container profile-gallery" *ngIf="model.gallery?.length">
        <img *ngFor="let src of model.gallery" [src]="src" [alt]="model.name" />
      </div>
    </div>

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
    .profile-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 6px;
      margin-top: 48px;
      padding-bottom: 24px;
    }
    .profile-gallery img {
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
    }
  `],
})
export class ModelDetailComponent implements OnInit {
  model: Model | null = null;
  loading = true;
  stats: ModelStat[] = [];

  constructor(private route: ActivatedRoute, private models: ModelsService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id')!;
      this.loading = true;
      this.model = await this.models.get(id);
      this.stats = this.model ? modelStats(this.model) : [];
      this.loading = false;
    });
  }

  get instagramHandle(): string {
    const ig = this.model?.instagram?.trim() || '';
    return ig.startsWith('@') ? ig.slice(1) : ig;
  }

  get instagramUrl(): string {
    const handle = this.instagramHandle;
    return handle ? `https://instagram.com/${handle}` : '#';
  }

  modelsBack(): string[] {
    return modelsBackLink(this.model?.branch ?? null);
  }
}
