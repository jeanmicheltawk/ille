import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SubmissionsService } from '../../core/submissions.service';
import { ModelsService } from '../../core/models.service';
import { Booking, Model } from '../../core/models.types';

@Component({
  selector: 'app-book-a-model',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

      <form *ngIf="!done" (ngSubmit)="submit()" #f="ngForm" class="form">
        <div class="two">
          <div class="field">
            <label>Your Name <span class="req">*</span></label>
            <input name="clientName" [(ngModel)]="booking.clientName" required />
          </div>
          <div class="field">
            <label>Company / Brand</label>
            <input name="company" [(ngModel)]="booking.company" />
          </div>
        </div>

        <div class="two">
          <div class="field">
            <label>Email <span class="req">*</span></label>
            <input type="email" name="email" [(ngModel)]="booking.email" required />
          </div>
          <div class="field">
            <label>Phone <span class="req">*</span></label>
            <input name="phone" [(ngModel)]="booking.phone" required />
          </div>
        </div>

        <div class="two">
          <div class="field">
            <label>Job Type <span class="req">*</span></label>
            <select name="jobType" [(ngModel)]="booking.jobType" required>
              <option value="">Select…</option>
              <option>Editorial</option>
              <option>Campaign</option>
              <option>Runway / Show</option>
              <option>E-commerce</option>
              <option>Lookbook</option>
              <option>Event / Appearance</option>
            </select>
          </div>
          <div class="field">
            <label>Location <span class="req">*</span></label>
            <input name="location" [(ngModel)]="booking.location" required />
          </div>
        </div>

        <div class="two">
          <div class="field">
            <label>Dates <span class="req">*</span></label>
            <input name="dates" [(ngModel)]="booking.dates" required placeholder="e.g. 12–14 July" />
          </div>
          <div class="field">
            <label>Budget</label>
            <input name="budget" [(ngModel)]="booking.budget" placeholder="Optional" />
          </div>
        </div>

        <div class="field">
          <label>Details <span class="req">*</span></label>
          <textarea name="message" rows="5" [(ngModel)]="booking.message" required
            placeholder="Tell us about the project, usage, and which models you're interested in."></textarea>
        </div>

        <button class="btn" type="submit" [disabled]="busy || f.invalid">
          {{ busy ? 'Sending…' : 'Send Enquiry' }}
        </button>
      </form>
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
    .form { padding-top: 8px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 600px) { .two { grid-template-columns: 1fr; } }
  `],
})
export class BookAModelComponent implements OnInit {
  booking: Booking = {
    clientName: '', company: '', email: '', phone: '',
    jobType: '', dates: '', location: '', budget: '', message: '',
  };
  selectedModel: Model | null = null;
  busy = false;
  done = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private subs: SubmissionsService,
    private models: ModelsService,
  ) {}

  async ngOnInit() {
    const modelId = this.route.snapshot.queryParamMap.get('model');
    if (modelId) {
      this.booking.modelId = modelId;
      this.selectedModel = await this.models.get(modelId);
    }
  }

  async submit() {
    this.error = '';
    this.busy = true;
    try {
      await this.subs.submitBooking(this.booking);
      this.done = true;
    } catch (e: any) {
      this.error = e?.message ?? 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
