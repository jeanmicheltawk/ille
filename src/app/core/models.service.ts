import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { UploadService } from './upload.service';
import { digitalsNameSlug, modelMatchesFilters, parseDigitalsPath } from './model.util';
import { Category, Model, ModelsBranch } from './models.types';

export interface ModelListFilters {
  branch?: ModelsBranch;
  category?: Category;
}

/**
 * Model reads/writes. Uses the backend API when configured, otherwise an
 * in-memory mock list so the frontend still runs standalone.
 */
@Injectable({ providedIn: 'root' })
export class ModelsService {
  constructor(private api: ApiService, private upload: UploadService) {}

  private mock: Model[] = [];

  async list(filters?: ModelListFilters): Promise<Model[]> {
    if (this.api.useApi) {
      const params = new URLSearchParams();
      if (filters?.branch) params.set('branch', filters.branch);
      if (filters?.category !== undefined) params.set('category', filters.category);
      const qs = params.toString();
      const rows = await this.api.get<Model[]>('/models' + (qs ? `?${qs}` : ''));
      return rows
        .filter((m) => modelMatchesFilters(m, filters))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return this.mock
      .filter((m) => modelMatchesFilters(m, filters))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<Model | null> {
    if (this.api.useApi) {
      try { return await this.api.get<Model>(`/models/${id}`); }
      catch { return null; }
    }
    return this.mock.find((m) => m.id === id) ?? null;
  }

  async getByDigitalsPath(path: string): Promise<Model | null> {
    const slug = parseDigitalsPath(path);
    if (!slug) return null;
    if (this.api.useApi) {
      try { return await this.api.get<Model>(`/models/digitals/${path}`); }
      catch { return null; }
    }
    return (
      this.mock.find((m) => m.published && digitalsNameSlug(m.name) === slug) ?? null
    );
  }

  async listAll(): Promise<Model[]> {
    if (this.api.useApi) return this.api.get<Model[]>('/admin/models');
    return [...this.mock].sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(model: Model): Promise<void> {
    if (this.api.useApi) { await this.api.post('/admin/models', model); return; }
    this.mock = [...this.mock, model];
  }

  async update(model: Model): Promise<void> {
    if (this.api.useApi) { await this.api.put(`/admin/models/${model.id}`, model); return; }
    this.mock = this.mock.map((m) => (m.id === model.id ? model : m));
  }

  async remove(id: string): Promise<void> {
    if (this.api.useApi) { await this.api.delete(`/admin/models/${id}`); return; }
    this.mock = this.mock.filter((m) => m.id !== id);
  }

  uploadFile(file: File): Promise<string> {
    return this.upload.upload(file);
  }
}
