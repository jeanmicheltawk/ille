import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="hdr" [class.is-scrolled]="scrolled" [class.hdr--overlay]="isOverlay">
      <div class="container hdr__row">
        <a routerLink="/" class="hdr__logo" aria-label="ille home">
          <img src="assets/ille-logo.png" alt="ille" class="hdr__logo-img" />
        </a>

        <nav class="hdr__nav" [class.is-open]="open" [class.hdr__nav--overlay]="isOverlay">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="close()">Home</a>
          <a routerLink="/about" routerLinkActive="active" (click)="close()">About</a>
          <a routerLink="/models" routerLinkActive="active" (click)="close()">Models</a>
          <a routerLink="/services" routerLinkActive="active" (click)="close()">Services</a>
          <a routerLink="/become-a-model" routerLinkActive="active" (click)="close()">Become a Model</a>
          <a routerLink="/book" routerLinkActive="active" (click)="close()">Book</a>
        </nav>

        <button
          class="hdr__burger hdr__burger--three"
          (click)="open = !open"
          [class.is-open]="open"
          aria-label="Menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .hdr {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid transparent;
      transition: background 0.5s ease, border-color 0.5s ease;
    }
    .hdr.is-scrolled { border-bottom-color: var(--line); }
    .hdr.hdr--overlay {
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border-bottom-color: transparent;
    }
    .hdr.hdr--overlay.is-scrolled {
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }

    .hdr__row {
      display: flex; align-items: center; justify-content: space-between;
      height: 80px;
    }

    .hdr__logo {
      display: flex; align-items: center;
      transition: opacity 0.4s ease;
    }
    .hdr__logo:hover { opacity: 0.85; }
    .hdr__logo-img {
      height: 110px;
      width: auto;
      display: block;
    }
    .hdr--overlay .hdr__logo-img {
      height: 110px;
    }

    .hdr__nav { display: flex; gap: 40px; }
    .hdr__nav a {
      text-transform: uppercase;
      letter-spacing: 0.24em;
      font-size: 10px;
      font-weight: 300;
      color: var(--ink-soft);
      padding-bottom: 4px;
      border-bottom: 1px solid transparent;
      transition: color 0.4s ease, border-color 0.4s ease;
    }
    .hdr__nav a:hover,
    .hdr__nav a.active {
      color: var(--ink);
      border-color: var(--accent);
    }
    .hdr--overlay .hdr__nav a { color: rgba(255,255,255,0.65); }
    .hdr--overlay .hdr__nav a:hover,
    .hdr--overlay .hdr__nav a.active { color: #fff; border-color: rgba(255,255,255,0.5); }

    @media (min-width: 861px) {
      .hdr--overlay .hdr__nav {
        position: fixed; top: 80px; left: 0; right: 0; bottom: 0;
        flex-direction: column; align-items: center; justify-content: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.92);
        backdrop-filter: blur(24px);
        opacity: 0; pointer-events: none;
        transition: opacity 0.5s ease;
      }
      .hdr--overlay .hdr__nav.is-open { opacity: 1; pointer-events: auto; }
      .hdr--overlay .hdr__nav a {
        padding: 14px 0;
        font-size: 12px;
        letter-spacing: 0.32em;
        border-bottom: none;
      }
    }

    .hdr__burger {
      display: none;
      background: none; border: 0; cursor: pointer;
      padding: 10px; width: 40px; height: 40px;
      position: relative;
    }
    .hdr--overlay .hdr__burger { display: block; }
    .hdr__burger span {
      display: block; width: 22px; height: 1px;
      background: var(--ink);
      position: absolute; left: 9px;
      transition: transform 0.4s ease, opacity 0.3s ease, top 0.4s ease;
    }
    .hdr--overlay .hdr__burger span { background: #fff; }
    .hdr__burger span:first-child { top: 13px; }
    .hdr__burger span:nth-child(2) { top: 19px; }
    .hdr__burger span:nth-child(3) { top: 25px; }

    .hdr__burger.is-open span:first-child { top: 19px; transform: rotate(45deg); }
    .hdr__burger.is-open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    .hdr__burger.is-open span:nth-child(3) { top: 19px; transform: rotate(-45deg); }

    @media (max-width: 860px) {
      .hdr__burger { display: block; }
      .hdr__nav {
        position: fixed; top: 80px; left: 0; right: 0; bottom: 0;
        flex-direction: column; gap: 0;
        background: rgba(0, 0, 0, 0.96);
        backdrop-filter: blur(24px);
        padding: 20px 0;
        opacity: 0; pointer-events: none;
        transition: opacity 0.4s ease;
      }
      .hdr__nav.is-open { opacity: 1; pointer-events: auto; }
      .hdr__nav a {
        padding: 22px 32px;
        font-size: 11px;
        letter-spacing: 0.3em;
        border-bottom: 1px solid var(--line);
        color: var(--ink-soft);
      }
      .hdr__nav a:hover,
      .hdr__nav a.active { color: var(--ink); }
    }
  `],
})
export class HeaderComponent {
  open = false;
  scrolled = false;
  isOverlay = false;

  constructor(private router: Router) {
    const update = (url: string) => {
      this.isOverlay = url === '/' || url === '' || /^\/services\/[^/]+\/book/.test(url);
      this.open = false;
    };
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => update(e.urlAfterRedirects));
    update(this.router.url);

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.scrolled = window.scrollY > 20;
      }, { passive: true });
    }
  }

  close() { this.open = false; }
}
