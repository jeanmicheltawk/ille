import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

/** Uploads files to the backend (or blob URLs in mock mode). */
@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private api: ApiService) {}

  async upload(file: File): Promise<string> {
    if (!this.api.useApi) return URL.createObjectURL(file);
    const form = new FormData();
    form.append('file', file);
    const res = await this.api.upload<{ url: string }>('/admin/upload-file', form);
    return res.url;
  }

  async uploadImage(file: File): Promise<string> {
    if (!this.api.useApi) return URL.createObjectURL(file);
    const form = new FormData();
    form.append('image', file);
    const res = await this.api.upload<{ url: string }>('/admin/upload', form);
    return res.url;
  }
}
