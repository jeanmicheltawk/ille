import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { UploadService } from './upload.service';
import {
  ServiceFormField,
  ServiceItem,
  ServiceItemType,
  ServiceSubmission,
} from './models.types';

const GUIDANCE_FIELDS: ServiceFormField[] = [
  { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
  { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
  { id: 'email', type: 'email', label: 'Email', width: 'full', sortOrder: 2, required: true },
  { id: 'phone', type: 'phone', label: 'Phone Number', width: 'full', sortOrder: 3, required: true },
  {
    id: 'session-info',
    type: 'info',
    label: '',
    helpText:
      'Advanced guidance consultation is more complex to improve the skills you already have. It is recommended for people who already know posing and want to take their skills to the next level.',
    width: 'full',
    sortOrder: 4,
    required: false,
  },
  {
    id: 'session',
    type: 'radio',
    label: 'Select Session',
    options: ['LIVE SESSION', 'ONLINE SESSION'],
    width: 'full',
    sortOrder: 5,
    required: true,
  },
  { id: 'instagram', type: 'text', label: 'Instagram', placeholder: '@username', width: 'full', sortOrder: 6, required: true },
];

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private mockSubmissions: ServiceSubmission[] = [];

  private mock: ServiceItem[] = [
    { id: 'heading-events', type: 'events_heading', title: 'Upcoming Events', sortOrder: 0, published: true },
    { id: 'model-camp', type: 'program', title: 'Model Camp', subtitle: 'model edition', badge: 'Soon', sortOrder: 1, published: true },
    {
      id: 'one-on-one',
      type: 'promo',
      title: 'Book your one on one session',
      formEnabled: true,
      formTitle: 'One on One Session',
      backgroundImage: 'https://picsum.photos/seed/oneonone/1920/1080',
      formFields: [
        { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
        { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
        { id: 'email', type: 'email', label: 'Email', width: 'full', sortOrder: 2, required: true },
        { id: 'phone', type: 'phone', label: 'Phone Number', width: 'full', sortOrder: 3, required: true },
        { id: 'preferredDate', type: 'date', label: 'Preferred Date', width: 'half', rowGroup: 'schedule', sortOrder: 4, required: true },
        { id: 'preferredTime', type: 'time', label: 'Preferred Time', width: 'half', rowGroup: 'schedule', sortOrder: 5, required: true },
        { id: 'notes', type: 'textarea', label: 'Notes', width: 'full', sortOrder: 6, required: true },
      ],
      ctaLabel: 'Submit',
      sortOrder: 2,
      published: true,
    },
    { id: 'heading-services', type: 'services_heading', title: 'Discover our services', sortOrder: 3, published: true },
    { id: 'posing', type: 'offering', title: 'Posing', sortOrder: 4, published: true },
    { id: 'catwalk', type: 'offering', title: 'Catwalk', sortOrder: 5, published: true },
    { id: 'facial-expressions', type: 'offering', title: 'Facial Expressions', sortOrder: 6, published: true },
    { id: 'body-movement', type: 'offering', title: 'Body Movement', sortOrder: 7, published: true },
    { id: 'flexibility-posture', type: 'offering', title: 'Flexibility and Posture', sortOrder: 8, published: true },
    {
      id: 'guidance-consultation',
      type: 'promo',
      title: 'Book Your Guidance Consultation',
      formEnabled: true,
      formTitle: 'Guidance Consultation',
      backgroundImage: 'https://picsum.photos/seed/guidance/1920/1080',
      formFields: GUIDANCE_FIELDS,
      ctaLabel: 'Submit',
      sortOrder: 9,
      published: true,
    },
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
