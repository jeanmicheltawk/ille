import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Booking, ModelApplication } from './models.types';

export type ShotKey = 'fullShot' | 'halfShot' | 'closeupShot' | 'profileShot';

/**
 * Public write flows: model applications (with 4 photos) and bookings.
 * Plus admin reads of both. Mock path just logs to the console.
 */
@Injectable({ providedIn: 'root' })
export class SubmissionsService {
  constructor(private api: ApiService) {}

  async submitApplication(app: ModelApplication, files: Partial<Record<ShotKey, File>>): Promise<void> {
    if (this.api.useApi) {
      const form = new FormData();
      form.append('firstName', app.firstName);
      form.append('lastName', app.lastName ?? '');
      form.append('dateOfBirth', app.dateOfBirth ?? '');
      form.append('email', app.email);
      form.append('phone', app.phone ?? '');
      form.append('instagram', app.instagram ?? '');
      form.append('height', String(app.height ?? ''));
      (['fullShot', 'halfShot', 'closeupShot', 'profileShot'] as ShotKey[]).forEach((k) => {
        const f = files[k];
        if (f) form.append(k, f, f.name);
      });
      await this.api.upload('/applications', form);
      return;
    }
    console.info('[mock] application received:', app, files);
    await this.delay(600);
  }

  async submitBooking(booking: Booking): Promise<void> {
    if (this.api.useApi) { await this.api.post('/bookings', booking); return; }
    console.info('[mock] booking received:', booking);
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
