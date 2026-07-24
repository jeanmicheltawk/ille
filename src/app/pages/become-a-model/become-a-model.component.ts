import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicFormComponent } from '../../shared/dynamic-form.component';
import { SubmissionsService } from '../../core/submissions.service';
import { SiteFormsService } from '../../core/site-forms.service';
import { SiteFormConfig } from '../../core/models.types';

@Component({
  selector: 'app-become-a-model',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  template: `
    <div class="page-head">
      <p class="eyebrow">Scouting</p>
      <h1>Become a Model</h1>
    </div>

    <div class="container narrow">
      <ul class="rules" *ngIf="formConfig?.rules?.length">
        <li *ngFor="let rule of formConfig!.rules">{{ rule }}</li>
      </ul>

      <div *ngIf="done" class="notice notice--ok">
        Thank you — your application has been received. Our scouting team will be in touch.
      </div>
      <div *ngIf="error" class="notice notice--err">{{ error }}</div>

      <app-dynamic-form
        *ngIf="!done && formConfig"
        [fields]="formConfig.formFields"
        [submitLabel]="formConfig.submitLabel"
        [busy]="busy"
        (submitted)="submit($event)"
      />
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
  `],
})
export class BecomeAModelComponent implements OnInit {
  formConfig: SiteFormConfig | null = null;
  busy = false;
  done = false;
  error = '';

  constructor(
    private subs: SubmissionsService,
    private forms: SiteFormsService,
  ) {}

  async ngOnInit() {
    this.formConfig = await this.forms.get('become-a-model');
  }

  async submit(payload: { values: Record<string, string>; files: Record<string, File> }) {
    this.error = '';
    this.busy = true;
    try {
      await this.subs.submitApplication(payload.values, payload.files);
      this.done = true;
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
