import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
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
      grid-template-columns: 1.6fr 1fr 1fr 1fr;
      gap: 48px;
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
    @media (max-width: 860px) { .ftr__grid { grid-template-columns: 1fr 1fr; gap: 36px; } }
    @media (max-width: 520px) {
      .ftr__grid { grid-template-columns: 1fr; }
      .ftr__base { flex-direction: column; gap: 16px; }
    }
  `],
})
export class FooterComponent {
  year = new Date().getFullYear();
}
