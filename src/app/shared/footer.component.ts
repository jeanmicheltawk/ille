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

        <div class="ftr__col">
          <div class="ftr__h">Explore</div>
          <a routerLink="/models">Models</a>
          <a routerLink="/services">Services</a>
          <a routerLink="/become-a-model">Become a Model</a>
          <a routerLink="/book">Book a Model</a>
        </div>

        <div class="ftr__col ftr__newsletter">
          <div class="ftr__h">Stay updated</div>
          <p class="ftr__newsletter-desc">Choose your updates: new models or community news.</p>
          <form class="ftr__form" (ngSubmit)="subscribe()" *ngIf="!subscribed">
            <input
              type="email"
              name="email"
              [(ngModel)]="email"
              placeholder="Your email"
              required
              [disabled]="loading"
            />
            <div class="ftr__topic-actions">
              <button type="button" [disabled]="loading || !email.trim()" (click)="subscribe('models')">
                {{ loading && pendingTopic === 'models' ? '…' : 'Ille Models' }}
              </button>
              <button type="button" [disabled]="loading || !email.trim()" (click)="subscribe('community')">
                {{ loading && pendingTopic === 'community' ? '…' : 'Join Community' }}
              </button>
            </div>
          </form>
          <p class="ftr__newsletter-ok" *ngIf="subscribed">{{ subscribedMessage }}</p>
          <p class="ftr__newsletter-err" *ngIf="error">{{ error }}</p>
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
      grid-template-columns: 1.4fr 1fr 1fr 1fr 1.2fr;
      gap: 40px;
    }
    .ftr__logo { height: 36px; width: auto; opacity: 0.9; margin-bottom: 16px; }
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
    .ftr__newsletter-desc {
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--ink-muted);
      font-weight: 200;
      line-height: 1.6;
    }
    .ftr__form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ftr__topic-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .ftr__form input {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink);
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 200;
      font-family: inherit;
    }
    .ftr__form button {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink-soft);
      padding: 10px 12px;
      font-size: 9px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.4s ease, border-color 0.4s ease;
    }
    .ftr__form button:hover:not(:disabled) {
      color: var(--accent);
      border-color: var(--accent);
    }
    .ftr__form button:disabled { opacity: 0.5; cursor: not-allowed; }
    .ftr__newsletter-ok {
      font-size: 12px;
      color: var(--accent);
      margin: 0;
      font-weight: 300;
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
    @media (max-width: 1020px) { .ftr__grid { grid-template-columns: 1fr 1fr; gap: 36px; } }
    @media (max-width: 520px) {
      .ftr__grid { grid-template-columns: 1fr; }
      .ftr__base { flex-direction: column; gap: 16px; }
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
