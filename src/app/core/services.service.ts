import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { UploadService } from './upload.service';
import {
  ServiceFormField,
  ServiceItem,
  ServiceItemType,
  ServiceSubmission,
} from './models.types';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private mockSubmissions: ServiceSubmission[] = [];

  private mock: ServiceItem[] = [
    { id: 'heading-events', type: 'events_heading', title: 'Upcoming Events', sortOrder: 0, published: true },
    { id: 'model-camp', type: 'program', title: 'Model Camp', subtitle: 'model edition', badge: 'Soon', sortOrder: 1, published: true },
    { id: 'heading-services', type: 'services_heading', title: 'Discover our services', sortOrder: 2, published: true },
  ];

  constructor(private api: ApiService, private upload: UploadService) {}

  bookUrl(service: ServiceItem): string {
    return service.formEnabled ? `/services/${service.id}/book` : (service.ctaUrl || '/book');
  }

  async listPublished(): Promise<ServiceItem[]> {
    if (this.api.useApi) {
      return this.api.get<ServiceItem[]>('/services');
    }
    return this.mock
      .filter((s) => s.published)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async get(id: string): Promise<ServiceItem | null> {
    if (this.api.useApi) {
      try {
        return await this.api.get<ServiceItem>(`/services/${id}`);
      } catch {
        return null;
      }
    }
    return this.mock.find((s) => s.id === id) ?? null;
  }

  async listAll(): Promise<ServiceItem[]> {
    if (this.api.useApi) {
      return this.api.get<ServiceItem[]>('/admin/services');
    }
    return [...this.mock].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async create(item: ServiceItem): Promise<void> {
    const prepared = this.prepareForSave(item);
    if (this.api.useApi) {
      await this.api.post('/admin/services', prepared);
      return;
    }
    this.mock = [...this.mock, prepared];
  }

  async update(item: ServiceItem): Promise<void> {
    const prepared = this.prepareForSave(item);
    if (this.api.useApi) {
      await this.api.put(`/admin/services/${prepared.id}`, prepared);
      return;
    }
    this.mock = this.mock.map((s) => (s.id === prepared.id ? prepared : s));
  }

  async remove(id: string): Promise<void> {
    if (this.api.useApi) {
      await this.api.delete(`/admin/services/${id}`);
      return;
    }
    this.mock = this.mock.filter((s) => s.id !== id);
  }

  async submitBooking(serviceId: string, data: Record<string, string>): Promise<void> {
    if (this.api.useApi) {
      await this.api.post('/service-submissions', { serviceId, data });
      return;
    }
    const service = this.mock.find((s) => s.id === serviceId);
    this.mockSubmissions.unshift({
      serviceId,
      serviceTitle: service?.formTitle || service?.title || serviceId,
      data,
      createdAt: new Date().toISOString(),
    });
    console.log('[demo] service submission', { serviceId, data });
  }

  async listSubmissions(): Promise<ServiceSubmission[]> {
    if (this.api.useApi) {
      return this.api.get<ServiceSubmission[]>('/admin/service-submissions');
    }
    return [...this.mockSubmissions];
  }

  uploadImage(file: File): Promise<string> {
    return this.upload.uploadImage(file);
  }

  blank(type: ServiceItemType = 'offering'): ServiceItem {
    return {
      id: '',
      type,
      title: '',
      subtitle: '',
      badge: '',
      description: '',
      ctaLabel: 'Submit',
      ctaUrl: '',
      sortOrder: this.mock.length,
      published: true,
      formEnabled: true,
      formTitle: '',
      backgroundImage: '',
      formFields: [],
    };
  }

  blankField(sortOrder = 0): ServiceFormField {
    return {
      id: `field-${Date.now()}`,
      type: 'text',
      label: 'New Field',
      width: 'full',
      sortOrder,
      required: true,
    };
  }

  private prepareForSave(item: ServiceItem): ServiceItem {
    const copy = {
      ...item,
      formFields: [...(item.formFields || [])].sort((a, b) => a.sortOrder - b.sortOrder),
      ctaLabel: item.ctaLabel?.trim() || 'Submit',
    };
    if (copy.formEnabled && copy.id) {
      copy.ctaUrl = `/services/${copy.id}/book`;
    }
    return copy;
  }
}
