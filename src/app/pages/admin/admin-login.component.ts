import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container login">
      <p class="eyebrow">Client Area</p>
      <h1>Dashboard Login</h1>

      <div *ngIf="!connected" class="notice">
        Demo mode — backend isn't connected. Use password <strong>illedemo</strong>
        (any email) to preview the dashboard.
      </div>
      <div *ngIf="connected" class="notice">
        Default login: <strong>admin&#64;ille.co</strong> / <strong>illeadmin</strong>
        (change it in the server's .env).
      </div>
      <div *ngIf="error" class="notice notice--err">{{ error }}</div>

      <form (ngSubmit)="login()" #f="ngForm">
        <div class="field">
          <label>Email</label>
          <input type="email" name="email" [(ngModel)]="email" />
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" name="password" [(ngModel)]="password" required />
        </div>
        <button class="btn" type="submit" [disabled]="busy">{{ busy ? 'Signing in…' : 'Sign In' }}</button>
      </form>
    </div>
  `,
  styles: [`
    .login {
      max-width: 400px;
      padding: 60px 28px 80px;
      margin: 0 auto;
    }
    .login h1 {
      font-size: clamp(32px, 5vw, 44px);
      font-weight: 100;
      letter-spacing: 0.06em;
      margin: 10px 0 36px;
    }
  `],
})
export class AdminLoginComponent {
  email = '';
  password = '';
  busy = false;
  error = '';
  connected: boolean;

  constructor(private auth: AuthService, private router: Router, api: ApiService) {
    this.connected = api.useApi;
  }

  async login() {
    this.error = '';
    this.busy = true;
    const res = await this.auth.signIn(this.email, this.password);
    this.busy = false;
    if (res.ok) this.router.navigate(['/admin']);
    else this.error = res.error ?? 'Login failed.';
  }
}
