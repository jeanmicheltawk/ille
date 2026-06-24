import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="hero__bg" [style.background-image]="'url(assets/home-bg.webp)'" aria-hidden="true"></div>
      <div class="hero__shade" aria-hidden="true"></div>

      <div class="hero__content">
        <nav class="hero__nav rise" style="animation-delay:.2s">
          <a routerLink="/models" class="hero__link">Models</a>
          <span class="hero__nav-gap"></span>
          <a routerLink="/services" class="hero__link">Services</a>
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

    <section id="discover" class="cats">
      <a routerLink="/models/women" class="cat rise">
        <div class="cat__img" style="background-image:url('https://picsum.photos/seed/women-cat/640/960')"></div>
        <div class="cat__overlay"></div>
        <span class="cat__label">Women</span>
      </a>
      <a routerLink="/models/new-faces" class="cat rise" style="animation-delay:.1s">
        <div class="cat__img" style="background-image:url('https://picsum.photos/seed/newfaces-cat/640/960')"></div>
        <div class="cat__overlay"></div>
        <span class="cat__label">New Faces</span>
      </a>
      <a routerLink="/models/men" class="cat rise" style="animation-delay:.2s">
        <div class="cat__img" style="background-image:url('https://picsum.photos/seed/men-cat/640/960')"></div>
        <div class="cat__overlay"></div>
        <span class="cat__label">Men</span>
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
      gap: 0;
      margin-bottom: 48px;
    }
    .hero__nav-gap {
      width: 80px;
    }
    .hero__link {
      font-family: var(--body);
      font-size: clamp(15px, 2.2vw, 20px);
      font-weight: 300;
      letter-spacing: 0.14em;
      text-transform: capitalize;
      color: #fff;
      transition: opacity 0.4s ease, letter-spacing 0.4s ease;
    }
    .hero__link:hover {
      opacity: 0.7;
      letter-spacing: 0.2em;
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
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      background: var(--line);
    }
    .cat {
      position: relative;
      overflow: hidden;
      display: block;
      background: var(--black);
      min-height: 65vh;
    }
    .cat__img {
      position: absolute; inset: 0;
      background-size: cover;
      background-position: center top;
      filter: grayscale(0.4) brightness(0.7);
      transform: scale(1);
      transition: transform 1.2s var(--ease-slow), filter 1s var(--ease);
    }
    .cat:hover .cat__img {
      transform: scale(1.04);
      filter: grayscale(0.1) brightness(0.85);
    }
    .cat__overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%);
      transition: background 0.6s ease;
    }
    .cat:hover .cat__overlay {
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 65%);
    }
    .cat__label {
      position: absolute;
      left: 32px; bottom: 36px;
      font-family: var(--body);
      font-size: clamp(20px, 2.5vw, 30px);
      font-weight: 200;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #fff;
      z-index: 2;
      transition: letter-spacing 0.6s var(--ease);
    }
    .cat:hover .cat__label { letter-spacing: 0.28em; }

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
      .cats { grid-template-columns: 1fr; }
      .cat { min-height: 50vh; }
      .hero__nav-gap { width: 48px; }
      .hero__headline { white-space: normal; }
      .hero__nav { margin-bottom: 36px; }
    }
    @media (max-width: 480px) {
      .hero__nav-gap { width: 32px; }
      .hero__tag { letter-spacing: 0.28em; }
      .hero__motto { letter-spacing: 0.3em; }
    }
  `],
})
export class HomeComponent {}
