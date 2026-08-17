import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { CustomForm, CustomFormNav, CustomFormSubmission, ServiceFormField } from './models.types';

@Injectable({ providedIn: 'root' })
export class CustomFormsService {
  private mock: CustomForm[] = [];
  private mockSubmissions: CustomFormSubmission[] = [];
  private menuSubject = new BehaviorSubject<CustomFormNav[]>([]);
  readonly menuItems$ = this.menuSubject.asObservable();

  constructor(private api: ApiService) {
    void this.refreshNav();
  }

  pageUrl(form: Pick<CustomForm, 'id'> | string): string {
    const id = typeof form === 'string' ? form : form.id;
    return `/forms/${id}`;
  }

  slugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 64);
  }

  blank(sortOrder = 0): CustomForm {
    return {
      id: '',
      title: '',
      showInMenu: true,
      published: true,
      sortOrder,
      rules: [],
      submitLabel: 'Submit',
      formFields: [],
    };
  }

  clone(form: CustomForm): CustomForm {
    return {
      ...form,
      rules: [...(form.rules || [])],
      formFields: (form.formFields || []).map((field) => ({
        ...field,
        options: field.options ? [...field.options] : undefined,
      })),
    };
  }

  async refreshNav(): Promise<void> {
    const items = await this.listPublishedNav();
    this.menuSubject.next(items.filter((item) => item.showInMenu));
  }

  async listPublishedNav(): Promise<CustomFormNav[]> {
    if (this.api.useApi) {
      try {
        return await this.api.get<CustomFormNav[]>('/custom-forms');
      } catch {
        return [];
      }
    }
    return this.mock
      .filter((form) => form.published)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map(({ id, title, showInMenu }) => ({ id, title, showInMenu }));
  }

  async getPublished(id: string): Promise<CustomForm | null> {
    if (this.api.useApi) {
      try {
        return await this.api.get<CustomForm>(`/custom-forms/${id}`);
      } catch {
        return null;
      }
    }
    return this.mock.find((form) => form.id === id && form.published) ?? null;
  }

  async listAll(): Promise<CustomForm[]> {
    if (this.api.useApi) {
      return this.api.get<CustomForm[]>('/admin/custom-forms');
    }
    return this.mock
      .map((form) => this.clone(form))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }

  async create(form: CustomForm): Promise<void> {
    const prepared = this.prepare(form);
    if (this.api.useApi) {
      await this.api.post('/admin/custom-forms', prepared);
      await this.refreshNav();
      return;
    }
    this.mock = [...this.mock, prepared];
    await this.refreshNav();
  }

  async update(previousId: string, form: CustomForm): Promise<void> {
    const prepared = this.prepare(form);
    if (this.api.useApi) {
      await this.api.put(`/admin/custom-forms/${previousId}`, prepared);
      await this.refreshNav();
      return;
    }
    this.mock = this.mock.map((item) => (item.id === previousId ? prepared : item));
    this.mockSubmissions = this.mockSubmissions.map((sub) =>
      sub.formId === previousId ? { ...sub, formId: prepared.id, formTitle: prepared.title } : sub,
    );
    await this.refreshNav();
  }

  async remove(id: string): Promise<void> {
    if (this.api.useApi) {
      await this.api.delete(`/admin/custom-forms/${id}`);
      await this.refreshNav();
      return;
    }
    this.mock = this.mock.filter((form) => form.id !== id);
    this.mockSubmissions = this.mockSubmissions.filter((sub) => sub.formId !== id);
    await this.refreshNav();
  }

  async submit(
    formId: string,
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
      await this.api.upload(`/custom-forms/${formId}/submit`, form);
      return;
    }
    const page = this.mock.find((item) => item.id === formId);
    this.mockSubmissions = [
      {
        id: Date.now(),
        formId,
        formTitle: page?.title || formId,
        data: { ...values },
        createdAt: new Date().toISOString(),
      },
      ...this.mockSubmissions,
    ];
  }

  async listSubmissions(): Promise<CustomFormSubmission[]> {
    if (this.api.useApi) {
      return this.api.get<CustomFormSubmission[]>('/admin/custom-form-submissions');
    }
    return [...this.mockSubmissions];
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

  private prepare(form: CustomForm): CustomForm {
    return {
      ...form,
      id: this.slugFromTitle(form.id || form.title),
      title: form.title.trim(),
      rules: [...(form.rules || [])],
      formFields: [...(form.formFields || [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((field, index) => ({ ...field, sortOrder: index })),
      submitLabel: (form.submitLabel || 'Submit').trim() || 'Submit',
    };
  }
}
