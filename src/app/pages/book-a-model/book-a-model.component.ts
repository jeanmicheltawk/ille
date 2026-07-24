import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DynamicFormComponent } from '../../shared/dynamic-form.component';
import { SubmissionsService } from '../../core/submissions.service';
import { ModelsService } from '../../core/models.service';
import { SiteFormsService } from '../../core/site-forms.service';
import { Booking, Model, SiteFormConfig } from '../../core/models.types';

@Component({
  selector: 'app-book-a-model',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  template: `
    <div class="page-head">
      <p class="eyebrow">Bookings &amp; Scouting</p>
      <h1>Book a Model</h1>
    </div>

    <div class="container narrow">
      <p class="lead" *ngIf="selectedModel">
        Enquiry for <em>{{ selectedModel.name }}</em>.
      </p>

      <div *ngIf="done" class="notice notice--ok">
        Thank you — your booking enquiry has been sent. Our bookings team will respond shortly.
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
    .lead {
      color: var(--ink-soft);
      font-weight: 200;
      font-size: 18px;
      letter-spacing: 0.03em;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--line);
    }
    .lead em { color: var(--accent); font-style: normal; }
  `],
})
export class BookAModelComponent implements OnInit {
  formConfig: SiteFormConfig | null = null;
  booking: Booking = {};
  selectedModel: Model | null = null;
  busy = false;
  done = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private subs: SubmissionsService,
    private models: ModelsService,
    private forms: SiteFormsService,
  ) {}

  async ngOnInit() {
    this.formConfig = await this.forms.get('book-a-model');
    const modelId = this.route.snapshot.queryParamMap.get('model');
    if (modelId) {
      this.booking.modelId = modelId;
      this.selectedModel = await this.models.get(modelId);
    }
  }

  async submit(payload: { values: Record<string, string>; files: Record<string, File> }) {
    this.error = '';
    this.busy = true;
    try {
      await this.subs.submitBooking(this.booking, payload.values);
      this.done = true;
    } catch (e: any) {
      this.error = e?.message ?? 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
