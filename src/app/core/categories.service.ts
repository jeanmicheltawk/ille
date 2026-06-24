import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ModelCategory } from './models.types';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private mock: ModelCategory[] = [
    { id: 'women', name: 'Women', sortOrder: 0, published: true },
    { id: 'new-faces', name: 'New Faces', sortOrder: 1, published: true },
    { id: 'men', name: 'Men', sortOrder: 2, published: true },
  ];

  constructor(private api: ApiService) {}

  async listPublished(): Promise<ModelCategory[]> {
    if (this.api.useApi) {
      return this.api.get<ModelCategory[]>('/categories');
    }
    return this.mock
      .filter((c) => c.published)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  async listAll(): Promise<ModelCategory[]> {
    if (this.api.useApi) {
      return this.api.get<ModelCategory[]>('/admin/categories');
    }
    return [...this.mock].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  async create(category: ModelCategory): Promise<void> {
    if (this.api.useApi) {
      await this.api.post('/admin/categories', category);
      return;
    }
    this.mock = [...this.mock, category];
  }

  async update(category: ModelCategory): Promise<void> {
    if (this.api.useApi) {
      await this.api.put(`/admin/categories/${category.id}`, category);
      return;
    }
    this.mock = this.mock.map((c) => (c.id === category.id ? category : c));
  }

  async remove(id: string): Promise<void> {
    if (this.api.useApi) {
      await this.api.delete(`/admin/categories/${id}`);
      return;
    }
    this.mock = this.mock.filter((c) => c.id !== id);
  }

  blank(): ModelCategory {
    return {
      id: '',
      name: '',
      sortOrder: this.mock.length,
      published: true,
    };
  }

  slugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  nameFor(id: string, categories?: ModelCategory[]): string {
    const list = categories ?? this.mock;
    return list.find((c) => c.id === id)?.name ?? id;
  }
}
