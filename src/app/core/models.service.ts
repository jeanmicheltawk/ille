import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { UploadService } from './upload.service';
import { digitalsNameSlug, parseDigitalsPath } from './model.util';
import { Category, Model } from './models.types';

/**
 * Model reads/writes. Uses the backend API when configured, otherwise an
 * in-memory mock list so the frontend still runs standalone.
 */
@Injectable({ providedIn: 'root' })
export class ModelsService {
  constructor(private api: ApiService, private upload: UploadService) {}

  private mock: Model[] = [
    this.m('amara-okafor', 'Amara Okafor', 'women', { height: 178, city: 'Beirut', outOfTown: false }),
    this.m('lia-fontaine', 'Lia Fontaine', 'women', { height: 176, city: 'Paris', outOfTown: true }),
    this.m('noor-haddad', 'Noor Haddad', 'women', { height: 174, city: 'Beirut', outOfTown: false }),
    this.m('sofia-marchetti', 'Sofia Marchetti', 'women', { height: 180, city: 'Milan', outOfTown: true }),
    this.m('karim-saliba', 'Karim Saliba', 'men', { height: 187, city: 'Beirut', outOfTown: false }),
    this.m('luca-romano', 'Luca Romano', 'men', { height: 189, city: 'Rome', outOfTown: true }),
    this.m('jad-khoury', 'Jad Khoury', 'men', { height: 185, city: 'Beirut', outOfTown: false }),
    this.m('elif-demir', 'Elif Demir', 'new-faces', { height: 177, city: 'Istanbul', outOfTown: true }),
    this.m('maya-rizk', 'Maya Rizk', 'new-faces', { height: 175, city: 'Beirut', outOfTown: false }),
  ];

  private m(id: string, name: string, category: Category, extra: Partial<Model>): Model {
    return {
      id, name, category,
      coverImage: `https://picsum.photos/seed/${id}/640/880`,
      gallery: [
        `https://picsum.photos/seed/${id}-g1/640/960`,
        `https://picsum.photos/seed/${id}-g2/640/960`,
        `https://picsum.photos/seed/${id}-g3/640/960`,
        `https://picsum.photos/seed/${id}-g4/640/960`,
      ],
      digitals: [
        `https://picsum.photos/seed/${id}-d1/640/960`,
        `https://picsum.photos/seed/${id}-d2/640/960`,
        `https://picsum.photos/seed/${id}-d3/640/960`,
        `https://picsum.photos/seed/${id}-d4/640/960`,
      ],
      outOfTown: false, published: true,
      bust: 84, waist: 61, hips: 89, shoeSize: 40, hair: 'Brown', eyes: 'Brown',
      ...extra,
    };
  }

  async list(category?: Category): Promise<Model[]> {
    if (this.api.useApi) {
      return this.api.get<Model[]>('/models' + (category ? `?category=${category}` : ''));
    }
    return this.mock
      .filter((m) => m.published && (!category || m.category === category))
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
