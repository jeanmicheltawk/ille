import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ServicesService } from '../../core/services.service';
import { ServiceItem } from '../../core/models.types';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-head">
      <p class="eyebrow">ille</p>
      <h1>Services</h1>
    </div>

    <div class="container page" *ngIf="!loading">
      <section class="block" *ngIf="eventsHeading || events.length || programs.length || promosBefore.length">
        <h2 class="block__title" *ngIf="eventsHeading">{{ eventsHeading.title }}</h2>

        <div class="events">
          <article class="event-card" *ngFor="let e of events">
            <h3>{{ e.title }}</h3>
            <p *ngIf="e.subtitle" class="event-card__sub">{{ e.subtitle }}</p>
            <p *ngIf="e.description" class="event-card__desc">{{ e.description }}</p>
            <span *ngIf="e.badge" class="event-card__badge">{{ e.badge }}</span>
          </article>

          <article class="program-card" *ngFor="let p of programs">
            <div class="program-card__main">
              <h3>{{ p.title }}</h3>
              <p *ngIf="p.subtitle" class="program-card__sub">{{ p.subtitle }}</p>
            </div>
            <span *ngIf="p.badge" class="program-card__badge">{{ p.badge }}</span>
          </article>

          <a
            *ngFor="let p of promosBefore"
            [routerLink]="bookUrl(p)"
            class="inline-cta"
          >{{ p.title }}</a>
        </div>
      </section>

      <section class="block" *ngIf="servicesHeading || offerings.length">
        <h2 class="block__title" *ngIf="servicesHeading">{{ servicesHeading.title }}</h2>

        <ul class="offerings" *ngIf="offerings.length">
          <li *ngFor="let o of offerings; let i = index" class="offering rise" [style.animation-delay]="(i * 0.06) + 's'">
            <a *ngIf="o.formEnabled" [routerLink]="bookUrl(o)" class="offering__link">
              <span class="offering__line"></span>
              <span class="offering__text">{{ o.title }}</span>
            </a>
            <ng-container *ngIf="!o.formEnabled">
              <span class="offering__line"></span>
              <span class="offering__text">{{ o.title }}</span>
            </ng-container>
          </li>
        </ul>
      </section>

      <section class="block block--cta" *ngIf="consultationCta">
        <a [routerLink]="bookUrl(consultationCta)" class="btn">
          {{ consultationCta.ctaLabel || 'Submit' }}
        </a>
      </section>
    </div>

    <div class="container" *ngIf="loading">
      <p class="muted">Loading services…</p>
    </div>
  `,
  styles: [`
    .page { max-width: 760px; padding-bottom: 100px; }
    .block { margin-bottom: 72px; }
    .block__title {
      font-family: var(--body);
      font-size: clamp(10px, 1.2vw, 11px);
      font-weight: 300;
      letter-spacing: 0.42em;
      text-transform: uppercase;
      color: var(--ink-muted);
      text-align: center;
      margin-bottom: 40px;
    }
    .events {
      display: flex; flex-direction: column; align-items: center;
      gap: 28px; text-align: center;
    }
    .event-card, .program-card {
      width: 100%; border: 1px solid var(--line); padding: 32px 28px;
    }
    .event-card h3, .program-card h3 {
      font-family: var(--body);
      font-size: clamp(22px, 3.5vw, 32px);
      font-weight: 200; letter-spacing: 0.12em;
      text-transform: uppercase; margin: 0;
    }
    .event-card__sub, .program-card__sub {
      font-size: 14px; font-weight: 200; letter-spacing: 0.08em;
      color: var(--ink-soft); margin: 8px 0 0; text-transform: lowercase;
    }
    .event-card__desc {
      font-size: 14px; font-weight: 200; color: var(--ink-muted);
      margin: 14px 0 0; line-height: 1.7;
    }
    .event-card__badge, .program-card__badge {
      display: inline-block; margin-top: 18px;
      font-size: 9px; font-weight: 300; letter-spacing: 0.36em;
      text-transform: uppercase; color: var(--accent);
      border: 1px solid var(--line-strong); padding: 6px 14px;
    }
    .program-card {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
    }
    .inline-cta {
      font-size: 11px; font-weight: 300; letter-spacing: 0.28em;
      text-transform: uppercase; color: var(--ink-soft);
      border-bottom: 1px solid var(--line); padding-bottom: 4px;
      transition: color 0.4s ease, border-color 0.4s ease;
    }
    .inline-cta:hover { color: var(--accent); border-color: var(--accent); }
    .offerings {
      list-style: none; padding: 0; margin: 0;
      border-top: 1px solid var(--line);
    }
    .offering { padding: 0; border-bottom: 1px solid var(--line); }
    .offering__link {
      display: flex; align-items: center; gap: 20px;
      padding: 22px 0; transition: padding-left 0.4s var(--ease);
    }
    .offering__link:hover { padding-left: 8px; }
    .offering:not(:has(.offering__link)) {
      display: flex; align-items: center; gap: 20px; padding: 22px 0;
    }
    .offering__line {
      width: 24px; height: 1px; background: var(--accent);
      flex-shrink: 0; transition: width 0.4s var(--ease);
    }
    .offering__link:hover .offering__line { width: 40px; }
    .offering__text {
      font-family: var(--body);
      font-size: clamp(18px, 2.5vw, 24px);
      font-weight: 200; letter-spacing: 0.1em; text-transform: capitalize;
    }
    .offering__link:hover .offering__text { color: var(--accent); }
    .block--cta { text-align: center; padding-top: 20px; }
    .muted {
      color: var(--ink-muted); padding: 40px 0 80px;
      font-weight: 200; text-align: center;
    }
  `],
})
export class ServicesComponent implements OnInit {
  loading = true;
  eventsHeading: ServiceItem | null = null;
  servicesHeading: ServiceItem | null = null;
  events: ServiceItem[] = [];
  programs: ServiceItem[] = [];
  promosBefore: ServiceItem[] = [];
  offerings: ServiceItem[] = [];
  consultationCta: ServiceItem | null = null;

  constructor(private services: ServicesService) {}

  bookUrl(service: ServiceItem): string {
    return this.services.bookUrl(service);
  }

  async ngOnInit() {
    const items = await this.services.listPublished();
    this.eventsHeading = items.find((s) => s.type === 'events_heading') ?? null;
    this.servicesHeading = items.find((s) => s.type === 'services_heading') ?? null;
    this.events = items.filter((s) => s.type === 'event');
    this.programs = items.filter((s) => s.type === 'program');
    this.offerings = items.filter((s) => s.type === 'offering');
    const promos = items.filter((s) => s.type === 'promo');
    this.promosBefore = promos.slice(0, -1);
    this.consultationCta = promos.at(-1) ?? null;
    this.loading = false;
  }
}
