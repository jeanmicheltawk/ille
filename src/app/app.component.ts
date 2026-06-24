import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/header.component';
import { FooterComponent } from './shared/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, CommonModule],
  template: `
    <app-header />
    <main class="main" [class.main--overlay]="isOverlay"><router-outlet /></main>
    <app-footer *ngIf="!isOverlay" />
  `,
  styles: [`
    .main { padding-top: 80px; min-height: 60vh; }
    .main.main--overlay { padding-top: 0; }
  `],
})
export class AppComponent {
  isOverlay = false;

  constructor(private router: Router) {
    const update = (url: string) => {
      const path = url.split('?')[0];
      this.isOverlay =
        path === '/' ||
        path === '' ||
        /^\/services\/[^/]+\/book/.test(path) ||
        /digitals$/.test(path);
    };
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => update(e.urlAfterRedirects));
    update(this.router.url);
  }
}
