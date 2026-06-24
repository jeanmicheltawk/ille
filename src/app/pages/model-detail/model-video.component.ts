import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModelsService } from '../../core/models.service';
import { Model } from '../../core/models.types';
import { videoEmbed } from '../../core/video.util';
import { ModelProfileLinksComponent } from './model-profile-links.component';

@Component({
  selector: 'app-model-video',
  standalone: true,
  imports: [CommonModule, RouterLink, ModelProfileLinksComponent],
  template: `
    <div class="model-page" *ngIf="model && embed">
      <div class="container layout">
        <aside class="layout__side">
          <a class="back" [routerLink]="['/model', model.id]">{{ model.name }}</a>
          <p class="video-label">{{ videoLabel }}</p>
          <app-model-profile-links [model]="model" />
        </aside>

        <div class="layout__player">
          <iframe
            *ngIf="embed.kind === 'youtube' || embed.kind === 'vimeo'"
            [src]="safeSrc"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            [title]="videoLabel"
          ></iframe>
          <video *ngIf="embed.kind === 'file'" [src]="embed.src" controls playsinline></video>
        </div>
      </div>
    </div>

    <div class="model-page not-found" *ngIf="!loading && (!model || !embed)">
      <div class="container">
        <p>{{ model ? 'Video not available.' : 'Model not found.' }}</p>
        <a [routerLink]="model ? ['/model', model.id] : ['/models']" class="back-link">Go back</a>
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
    .layout {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(320px, 1.5fr);
      gap: clamp(32px, 5vw, 72px);
      align-items: start;
    }
    .back {
      display: inline-block;
      font-size: clamp(28px, 4vw, 42px);
      font-weight: 200;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #1a1a1a;
      text-decoration: none;
    }
    .back:hover { opacity: 0.6; }
    .video-label {
      margin: 20px 0 0;
      font-size: 13px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 300;
    }
    .layout__player iframe,
    .layout__player video {
      width: 100%;
      aspect-ratio: 16/9;
      background: #111;
      display: block;
    }
    .not-found {
      text-align: center;
      padding: 120px 0;
    }
    .back-link {
      display: inline-block;
      margin-top: 24px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 12px;
      color: #1a1a1a;
    }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
    }
  `],
})
export class ModelVideoComponent implements OnInit {
  model: Model | null = null;
  loading = true;
  kind: 'intro' | 'catwalk' = 'intro';
  embed: ReturnType<typeof videoEmbed> = null;
  safeSrc: SafeResourceUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private models: ModelsService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.load();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.load());
  }

  private async load() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const urlPath = this.route.snapshot.url.map((s) => s.path).join('/');
    this.kind = urlPath.includes('catwalk') ? 'catwalk' : 'intro';
    this.loading = true;
    this.model = await this.models.get(id);
    const url = this.kind === 'intro' ? this.model?.introVideoUrl : this.model?.catwalkVideoUrl;
    this.embed = url ? videoEmbed(url) : null;
    this.safeSrc =
      this.embed && this.embed.kind !== 'file'
        ? this.sanitizer.bypassSecurityTrustResourceUrl(this.embed.src)
        : null;
    this.loading = false;
  }

  get videoLabel(): string {
    return this.kind === 'intro' ? 'Introduction Video' : 'Catwalk Video';
  }
}
