import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from './api.service';

/**
 * Admin auth. With the backend connected it calls /auth/login and stores a
 * JWT. Without a backend (mock mode) it accepts the demo password "illedemo".
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private mockLoggedIn = false;
  private static readonly DEMO_PASSWORD = 'illedemo';

  constructor(private api: ApiService) {}

  async signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (this.api.useApi) {
      try {
        const res = await this.api.post<{ token: string }>('/auth/login', { email, password });
        this.api.setToken(res.token);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.error?.error ?? 'Wrong email or password.' };
      }
    }
    if (password === AuthService.DEMO_PASSWORD) {
      this.mockLoggedIn = true;
      return { ok: true };
    }
    return { ok: false, error: 'Demo password is "illedemo" until the backend is connected.' };
  }

  async signOut(): Promise<void> {
    if (this.api.useApi) { this.api.clearToken(); return; }
    this.mockLoggedIn = false;
  }

  async isAuthed(): Promise<boolean> {
    if (this.api.useApi) return !!this.api.token;
    return this.mockLoggedIn;
  }
}

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (await auth.isAuthed()) return true;
  return router.createUrlTree(['/admin/login']);
};
