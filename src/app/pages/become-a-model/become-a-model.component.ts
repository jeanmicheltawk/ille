import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubmissionsService, ShotKey } from '../../core/submissions.service';
import { ModelApplication } from '../../core/models.types';

@Component({
  selector: 'app-become-a-model',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head">
      <p class="eyebrow">Scouting</p>
      <h1>Become a Model</h1>
    </div>

    <div class="container narrow">
      <ul class="rules">
        <li>No make-up or hair products — we must see your natural beauty.</li>
        <li>Phone pictures are fine; use natural light.</li>
        <li>Submit natural, non-professional pictures only.</li>
        <li>Applications missing any requested info will not be reviewed.</li>
      </ul>

      <div *ngIf="done" class="notice notice--ok">
        Thank you — your application has been received. Our scouting team will be in touch.
      </div>
      <div *ngIf="error" class="notice notice--err">{{ error }}</div>

      <form *ngIf="!done" (ngSubmit)="submit()" #f="ngForm" class="form">
        <div class="two">
          <div class="field">
            <label>First Name <span class="req">*</span></label>
            <input name="firstName" [(ngModel)]="app.firstName" required />
          </div>
          <div class="field">
            <label>Last Name <span class="req">*</span></label>
            <input name="lastName" [(ngModel)]="app.lastName" required />
          </div>
        </div>

        <div class="two">
          <div class="field">
            <label>Date of Birth <span class="req">*</span></label>
            <input type="date" name="dob" [(ngModel)]="app.dateOfBirth" required />
          </div>
          <div class="field">
            <label>Height (cm) <span class="req">*</span></label>
            <input type="number" name="height" [(ngModel)]="app.height" required />
          </div>
        </div>

        <div class="two">
          <div class="field">
            <label>Email <span class="req">*</span></label>
            <input type="email" name="email" [(ngModel)]="app.email" required />
          </div>
          <div class="field">
            <label>Phone <span class="req">*</span></label>
            <input name="phone" [(ngModel)]="app.phone" required />
          </div>
        </div>

        <div class="field">
          <label>Instagram <span class="req">*</span></label>
          <input name="instagram" [(ngModel)]="app.instagram" required placeholder="@username" />
        </div>

        <div class="shots">
          <div class="shot-up" *ngFor="let s of shots">
            <label>{{ s.label }} <span class="req">*</span></label>
            <label class="shot-up__zone">
              <input type="file" accept="image/*" (change)="onFile($event, s.key)" />
              <figure class="shot-up__preview" *ngIf="previews[s.key]">
                <img [src]="previews[s.key]" alt="" />
              </figure>
              <span class="shot-up__hint" *ngIf="!picked[s.key]">Upload from your computer or phone</span>
              <span class="shot-up__state" *ngIf="picked[s.key]">✓ {{ picked[s.key] }}</span>
            </label>
          </div>
        </div>

        <button class="btn" type="submit" [disabled]="busy || f.invalid || !allShots">
          {{ busy ? 'Submitting…' : 'Submit Application' }}
        </button>
        <p class="hint" *ngIf="!allShots">All four photos are required.</p>
      </form>
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
    .form { padding-top: 8px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .shots {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 16px 0 36px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }
    .shot-up label {
      display: block;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 9px;
      font-weight: 300;
      color: var(--ink-muted);
      margin-bottom: 10px;
    }
    .shot-up__zone {
      position: relative;
      display: block;
      border: 1px dashed var(--line);
      padding: 20px;
      text-align: center;
      transition: border-color 0.4s ease;
      cursor: pointer;
      min-height: 120px;
    }
    .shot-up__zone:hover { border-color: var(--accent); }
    .shot-up input[type="file"] {
      position: absolute; inset: 0;
      opacity: 0; cursor: pointer; width: 100%; height: 100%;
    }
    .shot-up__preview {
      margin: 0 auto 10px;
      width: 72px;
      height: 96px;
      overflow: hidden;
      border: 1px solid var(--line);
    }
    .shot-up__preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .shot-up__hint {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      font-weight: 300;
    }
    .shot-up__state {
      font-size: 12px;
      color: var(--success);
      font-weight: 200;
    }
    .hint {
      font-size: 11px;
      color: var(--error);
      margin-top: 14px;
      letter-spacing: 0.06em;
      font-weight: 200;
    }
    @media (max-width: 600px) { .two, .shots { grid-template-columns: 1fr; } }
  `],
})
export class BecomeAModelComponent {
  app: ModelApplication = {
    firstName: '', lastName: '', dateOfBirth: '', email: '',
    phone: '', instagram: '', height: 0,
  };
  shots: { key: ShotKey; label: string }[] = [
    { key: 'fullShot', label: 'Full Shot' },
    { key: 'halfShot', label: 'Half Shot' },
    { key: 'closeupShot', label: 'Close-up Shot' },
    { key: 'profileShot', label: 'Profile Shot' },
  ];
  files: Partial<Record<ShotKey, File>> = {};
  picked: Partial<Record<ShotKey, string>> = {};
  previews: Partial<Record<ShotKey, string>> = {};
  busy = false;
  done = false;
  error = '';

  constructor(private subs: SubmissionsService) {}

  get allShots(): boolean {
    return this.shots.every((s) => !!this.files[s.key]);
  }

  onFile(event: Event, key: ShotKey) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.files[key] = file;
      this.picked[key] = file.name;
      this.previews[key] = URL.createObjectURL(file);
    }
  }

  async submit() {
    this.error = '';
    this.busy = true;
    try {
      await this.subs.submitApplication(this.app, this.files);
      this.done = true;
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
