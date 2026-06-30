import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategoriesService } from '../../core/categories.service';
import { ModelCategory } from '../../core/models.types';
import { categoryNavLink, setModelsBranch } from '../../core/models-branch.util';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="hero__bg" [style.background-image]="'url(assets/home-bg.webp)'" aria-hidden="true"></div>
      <div class="hero__shade" aria-hidden="true"></div>

      <div class="hero__content">
        <nav class="hero__nav rise" style="animation-delay:.2s">
          <a routerLink="/models" class="hero__btn">Models</a>
          <a routerLink="/services" class="hero__btn">Services</a>
        </nav>

        <p class="hero__tag rise" style="animation-delay:.35s">
          Unveiling a new generation set to reshape and redefine modeling
        </p>

        <h1 class="hero__headline rise" style="animation-delay:.5s">
          Beauty is a statement
        </h1>

        <p class="hero__motto rise" style="animation-delay:.65s">
          Believe it. Feel it. Live it.
        </p>
      </div>

      <a href="#discover" class="hero__scroll rise" style="animation-delay:.9s" aria-label="Scroll to discover">
        <span class="hero__scroll-line"></span>
      </a>
    </section>

    <section id="discover" class="cats container">
      <a *ngFor="let c of categories; let i = index"
         [routerLink]="categoryNavLink(c)"
         class="cat rise"
         [style.animation-delay]="(i * 0.08) + 's'"
         (click)="onCategoryClick(c.id)">
        <span class="cat__label">{{ c.name }}</span>
      </a>
    </section>

    <section class="statement">
      <div class="statement__line"></div>
      <div class="container statement__inner">
        <p class="eyebrow rise">A new generation</p>
        <h2 class="rise" style="animation-delay:.15s">
          Set to reshape and redefine modeling.
        </h2>
        <div class="statement__actions rise" style="animation-delay:.3s">
          <a routerLink="/models" class="btn">View Models</a>
          <a routerLink="/become-a-model" class="btn btn--ghost">Become a Model</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero {
      position: relative;
      height: 100vh;
      min-height: 600px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      color: #fff;
    }

    .hero__bg {
      position: absolute; inset: 0;
      background-position: center center;
      background-size: cover;
      background-repeat: no-repeat;
      animation: heroZoom 20s var(--ease-slow) infinite alternate;
    }
    @keyframes heroZoom {
      from { transform: scale(1); }
      to   { transform: scale(1.06); }
    }

    .hero__shade {
      position: absolute; inset: 0;
      background:
        linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.5) 100%),
        radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.25) 100%);
      pointer-events: none;
    }

    .hero__content {
      position: relative; z-index: 2;
      text-align: center;
      padding: 0 32px;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    .hero__nav {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 48px;
    }
    .hero__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 148px;
      padding: 14px 32px;
      font-family: var(--body);
      font-size: 11px;
      font-weight: 300;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #fff;
      text-decoration: none;
      border: 1px solid rgba(255, 255, 255, 0.9);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: background 0.45s var(--ease), border-color 0.45s var(--ease), color 0.45s var(--ease);
    }
    .hero__btn:hover {
      background: #fff;
      border-color: #fff;
      color: #1a1a1a;
    }
    .hero__btn:focus-visible {
      outline: 1px solid var(--accent);
      outline-offset: 4px;
    }

    .hero__tag {
      font-family: var(--body);
      font-size: clamp(8px, 1.1vw, 11px);
      font-weight: 200;
      letter-spacing: 0.38em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.75);
      line-height: 1.8;
      max-width: 520px;
      margin: 0 0 28px;
    }

    .hero__headline {
      font-family: var(--body);
      font-size: clamp(28px, 5.5vw, 56px);
      font-weight: 400;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      line-height: 1.15;
      margin: 0 0 32px;
      white-space: nowrap;
    }

    .hero__motto {
      font-family: var(--body);
      font-size: clamp(8px, 1.1vw, 11px);
      font-weight: 200;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.7);
      margin: 0;
    }

    .hero__scroll {
      position: absolute;
      bottom: 36px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      opacity: 0.5;
      transition: opacity 0.4s ease;
    }
    .hero__scroll:hover { opacity: 1; }
    .hero__scroll-line {
      width: 1px;
      height: 48px;
      background: linear-gradient(to bottom, rgba(255,255,255,0.6), transparent);
      animation: scrollPulse 2s ease infinite;
    }
    @keyframes scrollPulse {
      0%, 100% { transform: scaleY(1); opacity: 0.6; }
      50% { transform: scaleY(0.7); opacity: 1; }
    }

    .cats {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px 32px;
      padding: 80px 28px 100px;
      border-bottom: 1px solid var(--line);
    }
    .cat {
      display: block;
      padding: 12px 0;
      font-size: clamp(18px, 2.5vw, 26px);
      font-weight: 200;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--ink-muted);
      transition: color 0.4s ease, letter-spacing 0.4s ease;
    }
    .cat:hover {
      color: var(--accent);
      letter-spacing: 0.3em;
    }
    .cat__label { display: block; }

    .statement {
      padding: 120px 0 60px;
      text-align: center;
    }
    .statement__line {
      width: 1px; height: 56px;
      background: var(--line);
      margin: 0 auto 44px;
    }
    .statement__inner h2 {
      font-size: clamp(26px, 4vw, 48px);
      font-weight: 100;
      letter-spacing: 0.05em;
      margin-top: 14px;
      max-width: 640px;
      margin-inline: auto;
      line-height: 1.25;
    }
    .statement__actions {
      display: flex;
      gap: 18px;
      justify-content: center;
      margin-top: 40px;
      flex-wrap: wrap;
    }

    @media (max-width: 760px) {
      .cats { gap: 8px 24px; padding: 60px 20px 80px; }
      .hero__headline { white-space: normal; }
      .hero__nav { margin-bottom: 36px; }
      .hero__btn { min-width: 132px; padding: 13px 24px; }
    }
    @media (max-width: 480px) {
      .hero__tag { letter-spacing: 0.28em; }
      .hero__motto { letter-spacing: 0.3em; }
      .hero__btn { width: 100%; max-width: 220px; }
    }
  `],
})
export class HomeComponent implements OnInit {
  categories: ModelCategory[] = [];
  readonly categoryNavLink = categoryNavLink;

  constructor(private categoriesSvc: CategoriesService) {}

  async ngOnInit() {
    this.categories = await this.categoriesSvc.listPublished();
  }

  onCategoryClick(id: string) {
    if (id === 'men' || id === 'women') {
      setModelsBranch(id);
    }
  }
}
