import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ServiceFormField, SiteFormConfig, SiteFormId } from './models.types';

const DEFAULT_BECOME_A_MODEL: SiteFormConfig = {
  id: 'become-a-model',
  rules: [
    'No make-up or hair products — we must see your natural beauty.',
    'Phone pictures are fine; use natural light.',
    'Submit natural, non-professional pictures only.',
    'Applications missing any requested info will not be reviewed.',
  ],
  submitLabel: 'Submit Application',
  formFields: [
    { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
    { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
    { id: 'dateOfBirth', type: 'date', label: 'Date of Birth', width: 'half', rowGroup: 'dob-h', sortOrder: 2, required: true },
    { id: 'height', type: 'number', label: 'Height (cm)', width: 'half', rowGroup: 'dob-h', sortOrder: 3, required: true },
    { id: 'email', type: 'email', label: 'Email', width: 'half', rowGroup: 'contact', sortOrder: 4, required: true },
    { id: 'phone', type: 'phone', label: 'Phone', width: 'half', rowGroup: 'contact', sortOrder: 5, required: true },
    { id: 'instagram', type: 'text', label: 'Instagram', placeholder: '@username', width: 'full', sortOrder: 6, required: true },
    { id: 'fullShot', type: 'file', label: 'Full Shot', width: 'half', rowGroup: 'shots1', sortOrder: 7, required: true },
    { id: 'halfShot', type: 'file', label: 'Half Shot', width: 'half', rowGroup: 'shots1', sortOrder: 8, required: true },
    { id: 'closeupShot', type: 'file', label: 'Close-up Shot', width: 'half', rowGroup: 'shots2', sortOrder: 9, required: true },
    { id: 'profileShot', type: 'file', label: 'Profile Shot', width: 'half', rowGroup: 'shots2', sortOrder: 10, required: true },
  ],
};

const DEFAULT_BOOK_A_MODEL: SiteFormConfig = {
  id: 'book-a-model',
  rules: [],
  submitLabel: 'Send Enquiry',
  formFields: [
    { id: 'clientName', type: 'text', label: 'Your Name', width: 'half', rowGroup: 'row1', sortOrder: 0, required: true },
    { id: 'company', type: 'text', label: 'Company / Brand', width: 'half', rowGroup: 'row1', sortOrder: 1, required: false },
    { id: 'email', type: 'email', label: 'Email', width: 'half', rowGroup: 'row2', sortOrder: 2, required: true },
    { id: 'phone', type: 'phone', label: 'Phone', width: 'half', rowGroup: 'row2', sortOrder: 3, required: true },
    {
      id: 'jobType',
      type: 'dropdown',
      label: 'Job Type',
      width: 'half',
      rowGroup: 'row3',
      sortOrder: 4,
      required: true,
      options: ['Editorial', 'Campaign', 'Runway / Show', 'E-commerce', 'Lookbook', 'Event / Appearance'],
    },
    { id: 'location', type: 'text', label: 'Location', width: 'half', rowGroup: 'row3', sortOrder: 5, required: true },
    { id: 'dates', type: 'text', label: 'Dates', placeholder: 'e.g. 12–14 July', width: 'half', rowGroup: 'row4', sortOrder: 6, required: true },
    { id: 'budget', type: 'text', label: 'Budget', placeholder: 'Optional', width: 'half', rowGroup: 'row4', sortOrder: 7, required: false },
    {
      id: 'message',
      type: 'textarea',
      label: 'Details',
      placeholder: "Tell us about the project, usage, and which models you're interested in.",
      width: 'full',
      sortOrder: 8,
      required: true,
    },
  ],
};

const DEFAULTS: Record<SiteFormId, SiteFormConfig> = {
  'become-a-model': DEFAULT_BECOME_A_MODEL,
  'book-a-model': DEFAULT_BOOK_A_MODEL,
};

@Injectable({ providedIn: 'root' })
export class SiteFormsService {
  private mock: Record<SiteFormId, SiteFormConfig> = {
    'become-a-model': this.clone(DEFAULT_BECOME_A_MODEL),
    'book-a-model': this.clone(DEFAULT_BOOK_A_MODEL),
  };

  constructor(private api: ApiService) {}

  default(id: SiteFormId): SiteFormConfig {
    return this.clone(DEFAULTS[id]);
  }

  async get(id: SiteFormId): Promise<SiteFormConfig> {
    if (this.api.useApi) {
      try {
        return await this.api.get<SiteFormConfig>(`/forms/${id}`);
      } catch {
        return this.default(id);
      }
    }
    return this.clone(this.mock[id]);
  }

  async save(config: SiteFormConfig): Promise<void> {
    const prepared = this.prepare(config);
    if (this.api.useApi) {
      await this.api.put(`/admin/forms/${prepared.id}`, prepared);
      return;
    }
    this.mock[prepared.id as SiteFormId] = prepared;
  }

  blankField(sortOrder = 0): ServiceFormField {
    return {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'text',
      label: 'New question',
      width: 'full',
      sortOrder,
      required: true,
    };
  }

  private prepare(config: SiteFormConfig): SiteFormConfig {
    return {
      ...config,
      rules: [...(config.rules || [])],
      formFields: [...(config.formFields || [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((field, index) => ({ ...field, sortOrder: index })),
    };
  }

  private clone(config: SiteFormConfig): SiteFormConfig {
    return {
      ...config,
      rules: [...config.rules],
      formFields: config.formFields.map((field) => ({
        ...field,
        options: field.options ? [...field.options] : undefined,
      })),
    };
  }
}
