import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DynamicFormComponent } from '../../shared/dynamic-form.component';
import { CustomFormsService } from '../../core/custom-forms.service';
import { CustomForm } from '../../core/models.types';

@Component({
  selector: 'app-custom-form-page',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent, RouterLink],
  template: `
    <ng-container *ngIf="form">
      <div class="page-head">
        <p class="eyebrow">{{ form.showInMenu ? 'ille' : 'Form' }}</p>
        <h1>{{ form.title }}</h1>
      </div>

      <div class="container narrow">
        <ul class="rules" *ngIf="form.rules.length">
          <li *ngFor="let rule of form.rules">{{ rule }}</li>
        </ul>

        <div *ngIf="done" class="notice notice--ok">
          Thank you — your form has been received. Our team will be in touch.
        </div>
        <div *ngIf="error" class="notice notice--err">{{ error }}</div>

        <app-dynamic-form
          *ngIf="!done"
          [fields]="form.formFields"
          [submitLabel]="form.submitLabel"
          [busy]="busy"
          (submitted)="submit($event)"
        />
      </div>
    </ng-container>

    <div class="container missing" *ngIf="!form && !loading">
      <p>This form is not available.</p>
      <a routerLink="/" class="btn btn--ghost">Back home</a>
    </div>
  `,
  styles: [`
    .narrow { max-width: 720px; padding-bottom: 80px; }
    .rules {
      list-style: none; padding: 0; margin: 0 0 44px;
      border-top: 1px solid var(--line);
    }
    .rules li {
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
      font-weight: 200;
      color: var(--ink-soft);
      letter-spacing: 0.02em;
    }
    .missing {
      padding: 80px 28px;
      text-align: center;
      color: var(--ink-muted);
    }
    .missing .btn { margin-top: 24px; }
  `],
})
export class CustomFormPageComponent implements OnInit {
  form: CustomForm | null = null;
  loading = true;
  busy = false;
  done = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private customForms: CustomFormsService,
    private title: Title,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      void this.load(params.get('slug') || '');
    });
  }

  private async load(slug: string) {
    this.loading = true;
    this.done = false;
    this.error = '';
    this.form = slug ? await this.customForms.getPublished(slug) : null;
    this.loading = false;
    if (this.form) {
      this.title.setTitle(`${this.form.title} — ille`);
    } else {
      this.title.setTitle('ille');
    }
  }

  async submit(payload: { values: Record<string, string>; files: Record<string, File> }) {
    if (!this.form) return;
    this.error = '';
    this.busy = true;
    try {
      await this.customForms.submit(this.form.id, payload.values, payload.files);
      this.done = true;
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
