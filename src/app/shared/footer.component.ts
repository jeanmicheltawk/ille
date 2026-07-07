import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NewsletterService } from '../core/newsletter.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  template: `
    <footer class="ftr">
      <div class="ftr__line"></div>
      <div class="container ftr__grid">
        <div class="ftr__brand">
          <img src="assets/ille-logo.png" alt="ille" class="ftr__logo" />
          <p class="ftr__addr">
            Model Management<br />
            Beirut · Lebanon
          </p>
        </div>

        <div class="ftr__contact-stack">
          <div class="ftr__col">
            <div class="ftr__h">Office &amp; Management</div>
            <a href="tel:+9613177655">+961 3 177 655</a>
            <a href="mailto:info@ille.co">info&#64;ille.co</a>
          </div>

          <div class="ftr__col">
            <div class="ftr__h">Bookings &amp; Scouting</div>
            <a href="tel:+96181177655">+961 81 177 655</a>
            <a href="mailto:bookings@ille.co">bookings&#64;ille.co</a>
          </div>
        </div>

        <div class="ftr__col">
          <div class="ftr__h">Explore</div>
          <a routerLink="/models">Models</a>
          <a routerLink="/services">Services</a>
          <a routerLink="/become-a-model">Become a Model</a>
          <a routerLink="/book">Book a Model</a>
        </div>

        <div class="ftr__col ftr__newsletter">
          <div class="ftr__newsletter-card">
            <div class="ftr__newsletter-glow" aria-hidden="true"></div>
            <div class="ftr__newsletter-inner">
              <div class="ftr__newsletter-badge">Newsletter</div>
              <h4 class="ftr__newsletter-title">Stay updated</h4>
              <p class="ftr__newsletter-desc">
                New faces on the roster, or workshops &amp; community events — pick what you want.
              </p>

              <form class="ftr__form" (ngSubmit)="subscribe()" *ngIf="!subscribed">
                <label class="ftr__email-wrap">
                  <span class="ftr__email-label">Your email</span>
                  <input
                    type="email"
                    name="email"
                    [(ngModel)]="email"
                    placeholder="name@example.com"
                    required
                    [disabled]="loading"
                  />
                </label>
                <div class="ftr__topic-actions">
                  <button type="button" class="ftr__topic-btn ftr__topic-btn--models"
                    [disabled]="loading || !email.trim()" (click)="subscribe('models')">
                    <span class="ftr__topic-btn__label">Ille Models</span>
                    <span class="ftr__topic-btn__hint">New talent</span>
                    <span class="ftr__topic-btn__state" *ngIf="loading && pendingTopic === 'models'">…</span>
                  </button>
                  <button type="button" class="ftr__topic-btn ftr__topic-btn--community"
                    [disabled]="loading || !email.trim()" (click)="subscribe('community')">
                    <span class="ftr__topic-btn__label">Join Community</span>
                    <span class="ftr__topic-btn__hint">Workshops &amp; events</span>
                    <span class="ftr__topic-btn__state" *ngIf="loading && pendingTopic === 'community'">…</span>
                  </button>
                </div>
              </form>

              <div class="ftr__newsletter-ok" *ngIf="subscribed">
                <span class="ftr__newsletter-ok__icon" aria-hidden="true">✓</span>
                {{ subscribedMessage }}
              </div>
              <p class="ftr__newsletter-err" *ngIf="error">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="container ftr__base">
        <span>© {{ year }} ille — All rights reserved</span>
        <a routerLink="/admin/login" class="ftr__admin">Client Login</a>
      </div>
    </footer>
  `,
  styles: [`
    .ftr {
      margin-top: 120px;
      padding: 0 0 36px;
      position: relative;
    }
    .ftr__line {
      width: 1px; height: 80px;
      background: var(--line);
      margin: 0 auto 60px;
    }
    .ftr__grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 0.85fr 1.9fr;
      gap: 40px;
      align-items: start;
    }
    .ftr__contact-stack {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .ftr__logo { height: 70px; width: auto; opacity: 0.9; margin-bottom: 16px; }
    .ftr__addr {
      color: var(--ink-muted);
      font-size: 13px;
      font-weight: 200;
      line-height: 1.8;
      margin: 0;
    }
    .ftr__col { display: flex; flex-direction: column; gap: 6px; }
    .ftr__col a {
      color: var(--ink-soft);
      font-size: 13px;
      font-weight: 200;
      line-height: 1.9;
      transition: color 0.4s ease;
    }
    .ftr__col a:hover { color: var(--accent); }
    .ftr__h {
      text-transform: uppercase;
      letter-spacing: 0.28em;
      font-size: 9px;
      font-weight: 300;
      color: var(--ink-muted);
      margin-bottom: 10px;
    }
    .ftr__newsletter {
      grid-column: span 1;
    }
    .ftr__newsletter-card {
      position: relative;
      border-radius: 2px;
      overflow: hidden;
    }
    .ftr__newsletter-glow {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(135deg, rgba(201, 184, 150, 0.22) 0%, transparent 42%),
        linear-gradient(315deg, rgba(201, 184, 150, 0.08) 0%, transparent 55%);
      pointer-events: none;
      animation: ftr-glow 6s ease-in-out infinite alternate;
    }
    @keyframes ftr-glow {
      from { opacity: 0.65; }
      to { opacity: 1; }
    }
    .ftr__newsletter-inner {
      position: relative;
      padding: 22px 20px 20px;
      border: 1px solid var(--line-strong);
      background:
        linear-gradient(160deg, rgba(201, 184, 150, 0.1) 0%, rgba(0, 0, 0, 0.4) 38%, rgba(0, 0, 0, 0.85) 100%);
      box-shadow:
        0 0 0 1px rgba(201, 184, 150, 0.06) inset,
        0 18px 40px rgba(0, 0, 0, 0.45);
    }
    .ftr__newsletter-badge {
      display: inline-block;
      margin-bottom: 12px;
      padding: 5px 10px;
      border: 1px solid rgba(201, 184, 150, 0.35);
      border-radius: 999px;
      font-size: 8px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--accent);
      background: rgba(201, 184, 150, 0.08);
    }
    .ftr__newsletter-title {
      margin: 0 0 8px;
      font-size: 22px;
      font-weight: 200;
      letter-spacing: 0.06em;
      color: var(--ink);
    }
    .ftr__newsletter-desc {
      margin: 0 0 18px;
      font-size: 12px;
      color: var(--ink-soft);
      font-weight: 200;
      line-height: 1.65;
    }
    .ftr__form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ftr__email-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ftr__email-label {
      font-size: 8px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--ink-muted);
    }
    .ftr__topic-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .ftr__form input {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--line-strong);
      color: var(--ink);
      padding: 12px 14px;
      font-size: 13px;
      font-weight: 300;
      font-family: inherit;
      transition: border-color 0.35s ease, box-shadow 0.35s ease, background 0.35s ease;
    }
    .ftr__form input::placeholder { color: var(--ink-muted); }
    .ftr__form input:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(0, 0, 0, 0.55);
      box-shadow: 0 0 0 3px rgba(201, 184, 150, 0.12);
    }
    .ftr__topic-btn {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-height: 64px;
      padding: 12px 12px 11px;
      border-radius: 2px;
      border: 1px solid var(--line-strong);
      background: rgba(0, 0, 0, 0.35);
      color: var(--ink);
      text-align: left;
      cursor: pointer;
      overflow: hidden;
      transition:
        transform 0.35s var(--ease),
        border-color 0.35s ease,
        box-shadow 0.35s ease,
        background 0.35s ease;
    }
    .ftr__topic-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.35s ease;
      pointer-events: none;
    }
    .ftr__topic-btn--models::before {
      background: linear-gradient(135deg, rgba(201, 184, 150, 0.22), transparent 70%);
    }
    .ftr__topic-btn--community::before {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 70%);
    }
    .ftr__topic-btn__label {
      position: relative;
      z-index: 1;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 400;
    }
    .ftr__topic-btn__hint {
      position: relative;
      z-index: 1;
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--ink-muted);
      font-weight: 200;
      line-height: 1.4;
      transition: color 0.35s ease;
    }
    .ftr__topic-btn__state {
      position: absolute;
      right: 10px;
      top: 10px;
      color: var(--accent);
      font-size: 14px;
    }
    .ftr__topic-btn--models:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: var(--accent);
      box-shadow: 0 10px 24px rgba(201, 184, 150, 0.14);
    }
    .ftr__topic-btn--community:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.35);
      box-shadow: 0 10px 24px rgba(255, 255, 255, 0.06);
    }
    .ftr__topic-btn:hover:not(:disabled)::before { opacity: 1; }
    .ftr__topic-btn:hover:not(:disabled) .ftr__topic-btn__hint { color: var(--ink-soft); }
    .ftr__topic-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .ftr__newsletter-ok {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
      color: var(--accent);
      margin: 0;
      font-weight: 300;
      line-height: 1.6;
      padding: 12px 14px;
      border: 1px solid rgba(201, 184, 150, 0.28);
      background: rgba(201, 184, 150, 0.08);
    }
    .ftr__newsletter-ok__icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 1px solid rgba(201, 184, 150, 0.45);
      font-size: 10px;
    }
    .ftr__newsletter-err {
      font-size: 12px;
      color: #c44;
      margin: 8px 0 0;
      font-weight: 300;
    }
    .ftr__base {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 64px;
      padding-top: 28px;
      border-top: 1px solid var(--line);
      font-size: 11px;
      letter-spacing: 0.14em;
      color: var(--ink-muted);
      font-weight: 200;
    }
    .ftr__admin {
      text-transform: uppercase;
      letter-spacing: 0.24em;
      font-size: 9px;
      transition: color 0.4s ease;
    }
    .ftr__admin:hover { color: var(--accent); }
    @media (max-width: 1020px) {
      .ftr__grid { grid-template-columns: 1fr 1fr; gap: 36px; }
      .ftr__brand { grid-column: 1 / -1; }
      .ftr__newsletter { grid-column: 1 / -1; }
      .ftr__newsletter-inner { padding: 24px 22px; }
      .ftr__contact-stack { gap: 28px; }
    }
    @media (max-width: 520px) {
      .ftr__grid { grid-template-columns: 1fr; }
      .ftr__base { flex-direction: column; gap: 16px; }
      .ftr__topic-actions { grid-template-columns: 1fr; }
      .ftr__topic-btn { min-height: 58px; }
    }
  `],
})
export class FooterComponent {
  year = new Date().getFullYear();
  email = '';
  loading = false;
  subscribed = false;
  subscribedMessage = '';
  error = '';
  pendingTopic: 'models' | 'community' | null = null;

  constructor(private newsletter: NewsletterService) {}

  async subscribe(topic: 'models' | 'community' = 'models') {
    const value = this.email.trim();
    if (!value) return;
    this.loading = true;
    this.pendingTopic = topic;
    this.error = '';
    try {
      await this.newsletter.subscribe(value, 'footer', topic);
      this.subscribed = true;
      this.subscribedMessage = topic === 'community'
        ? "You're subscribed to community updates. Thank you."
        : "You're subscribed to new Ille Models updates. Thank you.";
      this.email = '';
    } catch {
      this.error = 'Could not subscribe. Please try again.';
    } finally {
      this.loading = false;
      this.pendingTopic = null;
    }
  }
}
