import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Central HTTP layer. Talks to the Node/Express backend.
 * `useApi` is true when environment.apiUrl is set; when it's empty the
 * data services fall back to in-memory mock data instead.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly useApi = !!environment.apiUrl;
  private base = environment.apiUrl;
  private static TOKEN_KEY = 'ille_token';

  constructor(private http: HttpClient) {}

  // ---- token ----
  get token(): string | null {
    return localStorage.getItem(ApiService.TOKEN_KEY);
  }
  setToken(t: string) {
    localStorage.setItem(ApiService.TOKEN_KEY, t);
  }
  clearToken() {
    localStorage.removeItem(ApiService.TOKEN_KEY);
  }
  private authHeaders(): HttpHeaders {
    return this.token
      ? new HttpHeaders({ Authorization: `Bearer ${this.token}` })
      : new HttpHeaders();
  }

  // ---- verbs ----
  get<T>(path: string): Promise<T> {
    return this.withRetry(() =>
      firstValueFrom(this.http.get<T>(this.base + path, { headers: this.authHeaders() })),
    );
  }
  post<T>(path: string, body: unknown): Promise<T> {
    return this.withRetry(() =>
      firstValueFrom(this.http.post<T>(this.base + path, body, { headers: this.authHeaders() })),
    );
  }
  put<T>(path: string, body: unknown): Promise<T> {
    return this.withRetry(() =>
      firstValueFrom(this.http.put<T>(this.base + path, body, { headers: this.authHeaders() })),
    );
  }
  delete<T>(path: string): Promise<T> {
    return this.withRetry(() =>
      firstValueFrom(this.http.delete<T>(this.base + path, { headers: this.authHeaders() })),
    );
  }
  // multipart upload (FormData sets its own Content-Type)
  upload<T>(path: string, form: FormData): Promise<T> {
    return this.withRetry(() =>
      firstValueFrom(this.http.post<T>(this.base + path, form, { headers: this.authHeaders() })),
    );
  }

  /**
   * The API runs on a host that can cold-start or briefly restart, returning
   * gateway errors (502/503/504) or network failures (status 0) with no CORS
   * headers. Those mean the request never reached app logic, so it's safe to
   * retry with backoff — this makes a sleeping server transparent to the user.
   */
  private async withRetry<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await run();
      } catch (e) {
        lastErr = e;
        if (!this.isTransient(e) || i === attempts - 1) throw e;
        await this.delay(Math.min(2000 * 2 ** i, 15000));
      }
    }
    throw lastErr;
  }

  private isTransient(e: unknown): boolean {
    if (!(e instanceof HttpErrorResponse)) return false;
    return e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
