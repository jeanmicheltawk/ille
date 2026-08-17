import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CustomFormsService } from '../core/custom-forms.service';
import { CustomFormNav } from '../core/models.types';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="hdr" [class.hdr--overlay]="isOverlay" [class.is-open]="open" [class.is-scrolled]="scrolled">
      <!-- Blur lives here so it does not become a containing block for the fixed mobile nav -->
      <div class="hdr__glass" aria-hidden="true"></div>

      <div class="container hdr__row">
        <a routerLink="/" class="hdr__logo" aria-label="ille home" (click)="close()">
          <img src="assets/ille-logo.png" alt="ille" class="hdr__logo-img" />
        </a>

        <nav class="hdr__nav" [class.is-open]="open" [class.hdr__nav--overlay]="isOverlay">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="close()">Home</a>
          <a routerLink="/about" routerLinkActive="active" (click)="close()">About</a>
          <a routerLink="/models" routerLinkActive="active"
             [routerLinkActiveOptions]="{ paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }"
             (click)="close()">Models</a>
          <a routerLink="/services" routerLinkActive="active" (click)="close()">Services</a>
          <a routerLink="/become-a-model" routerLinkActive="active" (click)="close()">Become a Model</a>
          <a routerLink="/book" routerLinkActive="active" (click)="close()">Book</a>
          <a *ngFor="let form of menuForms" [routerLink]="'/forms/' + form.id" routerLinkActive="active" (click)="close()">{{ form.title }}</a>
        </nav>

        <button
          class="hdr__burger hdr__burger--three"
          (click)="toggle()"
          [class.is-open]="open"
          [attr.aria-expanded]="open"
          aria-label="Menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .hdr {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
      border-bottom: 1px solid transparent;
      transition: border-color 0.5s ease;
    }
    .hdr.is-scrolled { border-bottom-color: var(--line); }
    .hdr.hdr--overlay.is-scrolled { border-bottom-color: transparent; }
    .hdr.is-open { border-bottom-color: transparent; }

    .hdr__glass {
      position: absolute; inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: background 0.5s ease, opacity 0.5s ease;
      pointer-events: none;
      z-index: 0;
    }
    .hdr.hdr--overlay .hdr__glass {
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    .hdr.hdr--overlay.is-scrolled .hdr__glass {
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .hdr.is-open .hdr__glass {
      background: #000;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .hdr__row {
      position: relative;
      z-index: 2;
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
        z-index: 1;
        flex-direction: column; align-items: center; justify-content: center;
        gap: 0;
        background: #000;
        opacity: 0; pointer-events: none;
        transition: opacity 0.5s ease;
      }
      .hdr--overlay .hdr__nav.is-open { opacity: 1; pointer-events: auto; }
      .hdr--overlay .hdr__nav a {
        display: block;
        width: min(420px, 80vw);
        text-align: center;
        padding: 18px 0;
        font-size: 12px;
        letter-spacing: 0.32em;
        border-bottom: 1px solid var(--line);
      }
      .hdr--overlay .hdr__nav a:last-child { border-bottom: none; }
    }

    .hdr__burger {
      display: none;
      background: none; border: 0; cursor: pointer;
      padding: 10px; width: 40px; height: 40px;
      position: relative;
      z-index: 3;
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
        position: fixed;
        top: 80px; left: 0; right: 0; bottom: 0;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 0;
        margin: 0;
        padding: 8px 0 40px;
        background: #000;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.35s ease, visibility 0.35s ease;
      }
      .hdr__nav.is-open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .hdr__nav a {
        display: block;
        flex: 0 0 auto;
        padding: 20px 32px;
        font-size: 11px;
        font-weight: 300;
        letter-spacing: 0.3em;
        line-height: 1.4;
        border-bottom: 1px solid var(--line);
        color: var(--ink-soft);
        background: #000;
      }
      .hdr__nav a:last-child { border-bottom: none; }
      .hdr__nav a:hover,
      .hdr__nav a.active { color: var(--ink); }
      .hdr--overlay .hdr__nav a { color: rgba(255,255,255,0.7); }
      .hdr--overlay .hdr__nav a:hover,
      .hdr--overlay .hdr__nav a.active { color: #fff; }
    }
  `],
})
export class HeaderComponent implements OnInit, OnDestroy {
  open = false;
  scrolled = false;
  isOverlay = false;
  menuForms: CustomFormNav[] = [];

  private menuSub?: Subscription;
  private onScroll = () => {
    this.scrolled = window.scrollY > 20;
  };

  constructor(private router: Router, private customForms: CustomFormsService) {
    const update = (url: string) => {
      this.isOverlay = url === '/' || url === '' || /^\/services\/[^/]+\/book/.test(url);
      this.close();
    };
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => update(e.urlAfterRedirects));
    update(this.router.url);

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  ngOnInit() {
    this.menuSub = this.customForms.menuItems$.subscribe((items) => {
      this.menuForms = items;
    });
  }

  ngOnDestroy() {
    this.menuSub?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll);
      document.body.style.overflow = '';
    }
  }

  toggle() {
    this.open = !this.open;
    this.syncBodyScroll();
  }

  close() {
    this.open = false;
    this.syncBodyScroll();
  }

  private syncBodyScroll() {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = this.open ? 'hidden' : '';
  }
}
