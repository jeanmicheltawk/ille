import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    return firstValueFrom(this.http.get<T>(this.base + path, { headers: this.authHeaders() }));
  }
  post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.base + path, body, { headers: this.authHeaders() }));
  }
  put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.base + path, body, { headers: this.authHeaders() }));
  }
  delete<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.base + path, { headers: this.authHeaders() }));
  }
  // multipart upload (FormData sets its own Content-Type)
  upload<T>(path: string, form: FormData): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.base + path, form, { headers: this.authHeaders() }));
  }
}
