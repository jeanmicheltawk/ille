import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Booking, ModelApplication } from './models.types';

/**
 * Public write flows: model applications (with optional photos) and bookings.
 * Plus admin reads of both. Mock path just logs to the console.
 */
@Injectable({ providedIn: 'root' })
export class SubmissionsService {
  constructor(private api: ApiService) {}

  async submitApplication(
    values: Record<string, string>,
    files: Record<string, File> = {},
  ): Promise<void> {
    if (this.api.useApi) {
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) {
        if (value != null) form.append(key, value);
      }
      for (const [key, file] of Object.entries(files)) {
        form.append(key, file, file.name);
      }
      await this.api.upload('/applications', form);
      return;
    }
    console.info('[mock] application received:', values, files);
    await this.delay(600);
  }

  async submitBooking(booking: Booking, values?: Record<string, string>): Promise<void> {
    const payload = values || booking.data || {};
    const body = {
      modelId: booking.modelId,
      data: payload,
      ...payload,
    };
    if (this.api.useApi) {
      await this.api.post('/bookings', body);
      return;
    }
    console.info('[mock] booking received:', body);
    await this.delay(600);
  }

  async listApplications(): Promise<ModelApplication[]> {
    if (this.api.useApi) return this.api.get<ModelApplication[]>('/admin/applications');
    return [];
  }

  async listBookings(): Promise<Booking[]> {
    if (this.api.useApi) return this.api.get<Booking[]>('/admin/bookings');
    return [];
  }

  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
