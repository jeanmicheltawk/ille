import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../core/services.service';
import { ServiceItem, ServiceItemType, ServiceSubmission } from '../../core/models.types';
import {
  downloadAllServiceSubmissionsExcel,
  downloadAllServiceSubmissionsPdf,
  downloadFormExcel,
  downloadFormPdf,
  serviceSubmissionToRecord,
  SubmissionEntry,
} from '../../core/submission-export.util';
import { ServiceFormBuilderComponent } from './service-form-builder.component';
import { ToastService } from '../../shared/toast.service';

interface TypeOption {
  value: ServiceItemType;
  title: string;
  desc: string;
  example: string;
}

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule, ServiceFormBuilderComponent],
  template: `
    <div class="svc-admin">
      <!-- Intro -->
      <div class="intro">
        <h2>Services page</h2>
        <p>Manage what appears on the <strong>/services</strong> page — events, programs, offerings, and booking forms.</p>
      </div>

      <div class="svc-admin__grid">
        <!-- List -->
        <aside class="list-panel">
          <div class="list-panel__head">
            <span>All items ({{ items.length }})</span>
            <button type="button" class="btn btn--ghost btn--sm" (click)="startNew()">+ New</button>
          </div>

          <div class="list-item" *ngFor="let s of items"
               [class.list-item--active]="editing.id === s.id"
               (click)="edit(s)">
            <div class="list-item__top">
              <span class="list-item__type">{{ typeName(s.type) }}</span>
              <span class="list-item__badge" *ngIf="s.formEnabled">Bookable</span>
              <span class="list-item__badge list-item__badge--hide" *ngIf="!s.published">Hidden</span>
            </div>
            <strong>{{ s.title }}</strong>
            <em *ngIf="s.subtitle">{{ s.subtitle }}</em>
          </div>
        </aside>

        <!-- Editor -->
        <div class="editor-panel">
          <p class="action-feedback" *ngIf="actionMessage" [class.action-feedback--error]="actionKind === 'error'">
            {{ actionMessage }}
          </p>
          <form (ngSubmit)="save()">
            <div class="editor-panel__head">
              <h3>{{ editing.id ? 'Edit: ' + editing.title : 'Create new item' }}</h3>
              <button type="button" class="btn btn--ghost btn--sm" *ngIf="editing.id" (click)="startNew()">Cancel</button>
            </div>

            <!-- Steps -->
            <div class="steps">
              <button type="button" [class.on]="step === 1" (click)="step = 1">1. What is it?</button>
              <button type="button" [class.on]="step === 2" (click)="step = 2">2. Show on website</button>
              <button type="button" [class.on]="step === 3" (click)="step = 3" [disabled]="!canHaveForm" [title]="canHaveForm ? '' : 'Not available for section headings'">
                3. Booking form
              </button>
            </div>

            <!-- Step 1 -->
            <div class="step-body" *ngIf="step === 1">
              <p class="step-help">Choose what kind of content this is. Each type appears differently on the services page.</p>
              <div class="type-grid">
                <button type="button" class="type-card" *ngFor="let t of typeOptions"
                        [class.type-card--on]="editing.type === t.value"
                        (click)="pickType(t.value)">
                  <strong>{{ t.title }}</strong>
                  <span>{{ t.desc }}</span>
                  <em>e.g. {{ t.example }}</em>
                </button>
              </div>
              <div class="field" style="margin-top:20px" [class.field--invalid]="fieldErrors['title']">
                <label>Main title <span class="tip">Required — the name clients see</span></label>
                <input name="title" [(ngModel)]="editing.title" required placeholder="e.g. Model Camp" />
                <p class="field-error" *ngIf="fieldErrors['title']">{{ fieldErrors['title'] }}</p>
              </div>
            </div>

            <!-- Step 2 -->
            <div class="step-body" *ngIf="step === 2">
              <p class="step-help">Control how this item looks on the public services page.</p>
              <div class="grid2">
                <div class="field" *ngIf="showSubtitle">
                  <label>Subtitle <span class="tip">Smaller text under the title</span></label>
                  <input name="subtitle" [(ngModel)]="editing.subtitle" placeholder="e.g. model edition" />
                </div>
                <div class="field" *ngIf="showBadge">
                  <label>Status badge <span class="tip">e.g. Soon, Sold out</span></label>
                  <input name="badge" [(ngModel)]="editing.badge" placeholder="Soon" />
                </div>
                <div class="field" *ngIf="showDescription">
                  <label>Description</label>
                  <textarea name="desc" rows="3" [(ngModel)]="editing.description"></textarea>
                </div>
                <div class="field">
                  <label>Display order <span class="tip">Lower numbers appear first</span></label>
                  <input type="number" name="sort" [(ngModel)]="editing.sortOrder" />
                </div>
                <div class="field" *ngIf="showCta">
                  <label>Button text <span class="tip">Only if no booking form</span></label>
                  <input name="ctaLabel" [(ngModel)]="editing.ctaLabel" placeholder="Submit" [disabled]="!!editing.formEnabled" />
                </div>
                <div class="field" *ngIf="showCta && !editing.formEnabled">
                  <label>Link URL</label>
                  <input name="ctaUrl" [(ngModel)]="editing.ctaUrl" placeholder="/book" />
                </div>
              </div>
              <label class="toggle">
                <input type="checkbox" name="pub" [(ngModel)]="editing.published" />
                <span>
                  <strong>Visible on website</strong>
                  <em>Turn off to hide without deleting</em>
                </span>
              </label>
              <label class="toggle" *ngIf="canHaveForm">
                <input type="checkbox" name="form" [(ngModel)]="editing.formEnabled" (ngModelChange)="onFormToggle()" />
                <span>
                  <strong>Let clients book this service</strong>
                  <em>Opens a custom booking form — configure in step 3</em>
                </span>
              </label>
            </div>

            <!-- Step 3 -->
            <div class="step-body" *ngIf="step === 3">
              <p class="step-help" *ngIf="!editing.formEnabled">
                Turn on <strong>"Let clients book this service"</strong> in step 2 first.
              </p>
              <p class="form-error" *ngIf="fieldErrors['formTitle']">{{ fieldErrors['formTitle'] }}</p>
              <p class="form-error" *ngIf="fieldErrors['formFields']">{{ fieldErrors['formFields'] }}</p>
              <app-service-form-builder *ngIf="editing.formEnabled" [service]="editing" />
            </div>

            <p class="form-error" *ngIf="error">{{ error }}</p>

            <div class="save-bar">
              <button class="btn" type="submit" *ngIf="editing.id || step === lastStep">
                {{ editing.id ? 'Save changes' : 'Create item' }}
              </button>
              <button class="btn btn--ghost" type="button" *ngIf="editing.id" (click)="remove()">Delete</button>
              <span class="save-hint" *ngIf="editing.formEnabled && editing.id">
                Booking page: /services/{{ editing.id }}/book
              </span>
            </div>
          </form>
        </div>
      </div>

      <!-- Submissions -->
      <section class="subs">
        <div class="subs__head">
          <div>
            <h3>Client bookings ({{ submissions.length }})</h3>
            <p class="subs__hint">When someone submits a service booking form, it appears here with the service name attached.</p>
          </div>
          <div class="subs__bulk" *ngIf="submissions.length">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllPdf()">Download all PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllExcel()">Download all Excel</button>
          </div>
        </div>
        <p class="muted" *ngIf="!submissions.length">No bookings yet.</p>
        <div class="sub-card" *ngFor="let sub of submissions">
          <div class="sub-card__head">
            <div>
              <strong>{{ sub.serviceTitle }}</strong>
              <span class="sub-card__meta">{{ sub.createdAt || 'Just now' }}</span>
            </div>
            <div class="sub-card__actions">
              <button type="button" class="btn btn--ghost btn--sm" (click)="viewSubmission(sub)">View</button>
              <button type="button" class="btn btn--ghost btn--sm" (click)="exportPdf(sub)">PDF</button>
              <button type="button" class="btn btn--ghost btn--sm" (click)="exportExcel(sub)">Excel</button>
            </div>
          </div>
          <dl class="sub-card__data sub-card__data--preview">
            <div *ngFor="let entry of submissionEntries(sub) | slice:0:4">
              <dt>{{ entry.label }}</dt>
              <dd>{{ entry.value }}</dd>
            </div>
          </dl>
          <p class="sub-card__more" *ngIf="submissionEntries(sub).length > 4">
            +{{ submissionEntries(sub).length - 4 }} more fields — <button type="button" class="link-btn" (click)="viewSubmission(sub)">View all</button>
          </p>
        </div>
      </section>

      <div class="sub-modal-backdrop" *ngIf="viewing" (click)="closeView()">
        <div class="sub-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="sub-modal__head">
            <div>
              <h4>{{ viewing.serviceTitle }}</h4>
              <p>{{ viewing.createdAt || 'Just now' }}</p>
            </div>
            <button type="button" class="sub-modal__close" (click)="closeView()" aria-label="Close">×</button>
          </div>
          <dl class="sub-modal__data">
            <div *ngFor="let entry of submissionEntries(viewing)">
              <dt>{{ entry.label }}</dt>
              <dd>{{ entry.value }}</dd>
            </div>
          </dl>
          <div class="sub-modal__actions">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportPdf(viewing)">Download PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportExcel(viewing)">Download Excel</button>
            <button type="button" class="btn btn--sm" (click)="closeView()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .svc-admin { max-width: 1200px; }
    .intro { margin-bottom: 28px; }
    .intro h2 { font-size: 20px; font-weight: 200; margin: 0 0 8px; }
    .intro p { font-size: 14px; color: var(--ink-soft); margin: 0; font-weight: 200; line-height: 1.6; }
    .svc-admin__grid {
      display: grid; grid-template-columns: 280px 1fr; gap: 20px;
      align-items: start;
    }
    .list-panel {
      border: 1px solid var(--line); position: sticky; top: 100px;
      max-height: calc(100vh - 140px); overflow-y: auto;
    }
    .list-panel__head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-bottom: 1px solid var(--line);
      font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--ink-muted);
    }
    .btn--sm { padding: 8px 14px; font-size: 9px; }
    .list-item {
      padding: 14px 16px; border-bottom: 1px solid var(--line);
      cursor: pointer; transition: background 0.2s ease;
    }
    .list-item:hover { background: var(--paper-pure); }
    .list-item--active { background: var(--paper-pure); border-left: 2px solid var(--accent); }
    .list-item__top { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
    .list-item__type {
      font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--ink-muted);
    }
    .list-item__badge {
      font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--accent); border: 1px solid var(--line); padding: 2px 6px;
    }
    .list-item__badge--hide { color: var(--error); }
    .list-item strong { display: block; font-size: 14px; font-weight: 300; }
    .list-item em { font-size: 12px; color: var(--ink-muted); font-style: normal; }
    .editor-panel { border: 1px solid var(--line); padding: 24px; }
    .action-feedback {
      margin: 0 0 16px;
      border: 1px solid var(--line);
      padding: 12px 14px;
      font-size: 12px;
      color: var(--ink-soft);
      background: rgba(255, 255, 255, 0.02);
    }
    .action-feedback--error {
      color: var(--error);
      border-color: rgba(255, 82, 82, 0.5);
      background: rgba(255, 82, 82, 0.08);
    }
    .editor-panel__head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px;
    }
    .editor-panel h3 { font-size: 18px; font-weight: 200; margin: 0; }
    .steps {
      display: flex; gap: 0; border-bottom: 1px solid var(--line); margin-bottom: 24px;
    }
    .steps button {
      flex: 1; background: none; border: 0; padding: 12px 10px;
      font-size: 11px; letter-spacing: 0.06em; color: var(--ink-muted);
      cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px;
    }
    .steps button.on { color: var(--accent); border-color: var(--accent); }
    .steps button:disabled { opacity: 0.35; cursor: not-allowed; }
    .step-help {
      font-size: 13px; color: var(--ink-soft); margin: 0 0 18px;
      font-weight: 200; line-height: 1.6;
    }
    .type-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
    }
    .type-card {
      text-align: left; padding: 14px; border: 1px solid var(--line);
      background: transparent; cursor: pointer; color: inherit;
      transition: border-color 0.25s ease;
    }
    .type-card--on { border-color: var(--accent); background: var(--paper-pure); }
    .type-card strong { display: block; font-size: 13px; font-weight: 300; margin-bottom: 4px; }
    .type-card span { display: block; font-size: 12px; color: var(--ink-soft); line-height: 1.5; }
    .type-card em { display: block; font-size: 10px; color: var(--ink-muted); margin-top: 6px; font-style: normal; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .tip {
      display: block; font-size: 10px; color: var(--ink-muted);
      font-weight: 200; margin-top: 4px; text-transform: none; letter-spacing: 0;
    }
    .toggle {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 14px 0; border-top: 1px solid var(--line);
      margin-top: 8px; cursor: pointer;
    }
    .toggle strong { display: block; font-size: 14px; font-weight: 300; }
    .toggle em { display: block; font-size: 12px; color: var(--ink-muted); font-style: normal; margin-top: 2px; }
    .save-bar {
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
      margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line);
    }
    .save-hint { font-size: 11px; color: var(--ink-muted); }
    .subs { margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--line); }
    .subs__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .subs h3 { font-size: 18px; font-weight: 200; margin: 0 0 8px; }
    .subs__hint { font-size: 13px; color: var(--ink-muted); margin: 0; font-weight: 200; }
    .subs__bulk { display: flex; gap: 8px; flex-wrap: wrap; }
    .sub-card {
      border: 1px solid var(--line); padding: 18px; margin-bottom: 12px;
    }
    .sub-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }
    .sub-card__head strong { display: block; font-size: 15px; font-weight: 300; }
    .sub-card__meta {
      display: block;
      font-size: 11px;
      color: var(--ink-muted);
      margin-top: 4px;
    }
    .sub-card__actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .sub-card__data {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px; margin: 0;
    }
    .sub-card__data dt {
      font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--ink-muted); margin-bottom: 4px;
    }
    .sub-card__data dd { margin: 0; font-size: 13px; color: var(--ink-soft); }
    .sub-card__more {
      margin: 12px 0 0;
      font-size: 12px;
      color: var(--ink-muted);
      font-weight: 200;
    }
    .link-btn {
      background: none;
      border: 0;
      padding: 0;
      color: var(--accent);
      cursor: pointer;
      font: inherit;
      text-decoration: underline;
    }
    .sub-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0, 0, 0, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .sub-modal {
      width: min(640px, 100%);
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      background: var(--black-raised);
      border: 1px solid var(--line);
      padding: 28px;
    }
    .sub-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .sub-modal__head h4 {
      margin: 0;
      font-size: 20px;
      font-weight: 200;
      letter-spacing: 0.04em;
    }
    .sub-modal__head p {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--ink-muted);
    }
    .sub-modal__close {
      background: none;
      border: 0;
      color: var(--ink-soft);
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }
    .sub-modal__close:hover { color: var(--ink); }
    .sub-modal__data {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      margin: 0;
    }
    .sub-modal__data dt {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 6px;
    }
    .sub-modal__data dd {
      margin: 0;
      font-size: 15px;
      color: var(--ink);
      font-weight: 300;
      word-break: break-word;
    }
    .sub-modal__actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    .muted { color: var(--ink-muted); font-size: 13px; }
    @media (max-width: 900px) {
      .svc-admin__grid { grid-template-columns: 1fr; }
      .list-panel { position: static; max-height: none; }
      .type-grid, .grid2 { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminServicesComponent implements OnInit {
  items: ServiceItem[] = [];
  submissions: ServiceSubmission[] = [];
  editing: ServiceItem = this.blank();
  viewing: ServiceSubmission | null = null;
  step = 1;
  error = '';
  fieldErrors: Record<string, string> = {};
  actionMessage = '';
  actionKind: 'success' | 'error' = 'success';

  typeOptions: TypeOption[] = [
    { value: 'events_heading', title: 'Section heading', desc: 'A title that groups content, like "Upcoming Events".', example: 'Upcoming Events' },
    { value: 'event', title: 'Event', desc: 'A single upcoming event card.', example: 'Summer showcase' },
    { value: 'program', title: 'Program', desc: 'A featured program with optional status badge.', example: 'Model Camp' },
    { value: 'promo', title: 'Book / promo link', desc: 'A call-to-action clients can click or book.', example: 'Book consultation' },
    { value: 'services_heading', title: 'Section heading', desc: 'A title for the services list.', example: 'Discover our services' },
    { value: 'offering', title: 'Service line item', desc: 'One service in the list (Posing, Catwalk…).', example: 'Posing' },
  ];

  constructor(private services: ServicesService) {}

  async ngOnInit() {
    await this.reload();
  }

  get canHaveForm(): boolean {
    return !['events_heading', 'services_heading'].includes(this.editing.type);
  }

  get lastStep(): number {
    return this.canHaveForm ? 3 : 2;
  }

  get showSubtitle(): boolean {
    return ['program', 'event', 'promo'].includes(this.editing.type);
  }

  get showBadge(): boolean {
    return ['program', 'event'].includes(this.editing.type);
  }

  get showDescription(): boolean {
    return this.editing.type === 'event';
  }

  get showCta(): boolean {
    return ['promo', 'offering'].includes(this.editing.type);
  }

  typeName(type: ServiceItemType): string {
    return this.typeOptions.find((t) => t.value === type)?.title ?? type;
  }

  blank(): ServiceItem {
    return this.services.blank('offering');
  }

  startNew() {
    this.editing = this.blank();
    this.step = 1;
    this.error = '';
    this.fieldErrors = {};
  }

  edit(s: ServiceItem) {
    this.editing = { ...s, formFields: Array.isArray(s.formFields) ? [...s.formFields] : [] };
    this.step = 1;
    this.error = '';
    this.fieldErrors = {};
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pickType(type: ServiceItemType) {
    this.editing.type = type;
    if (!this.canHaveForm) this.editing.formEnabled = false;
  }

  onFormToggle() {
    if (this.editing.formEnabled) {
      this.step = 3;
      if (!this.editing.formTitle) this.editing.formTitle = this.editing.title;
      if (!this.editing.ctaLabel) this.editing.ctaLabel = 'Submit';
    }
  }

  private validate(): boolean {
    this.fieldErrors = {};
    this.error = '';
    const missing: string[] = [];

    if (!this.editing.title?.trim()) {
      this.fieldErrors['title'] = 'Main title is required.';
      missing.push('Main title');
      this.step = 1;
    }

    if (this.editing.formEnabled) {
      if (!this.editing.formTitle?.trim()) {
        this.fieldErrors['formTitle'] = 'Booking page title is required.';
        missing.push('Booking page title');
        this.step = 3;
      }

      const fields = this.editing.formFields || [];
      if (!fields.length) {
        this.fieldErrors['formFields'] = 'Add at least one question to the booking form.';
        missing.push('Form questions');
        this.step = 3;
      } else {
        const unlabeled = fields.filter((f) => f.type !== 'info' && !f.label?.trim());
        if (unlabeled.length) {
          this.fieldErrors['formFields'] = 'Every question needs a label.';
          missing.push('Question labels');
          this.step = 3;
        }
      }
    }

    if (missing.length) {
      this.error = `Please fill in the missing fields: ${missing.join(', ')}.`;
      return false;
    }

    return true;
  }

  async save() {
    if (!this.validate()) return;
    const isNew = !this.editing.id;
    const actionLabel = isNew ? 'create this service item' : 'save changes to this service item';
    if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;
    try {
      if (this.editing.id) {
        await this.services.update(this.editing);
      } else {
        this.editing.id = this.slug(this.editing.title);
        await this.services.create(this.editing);
      }
      await this.reload();
      if (isNew) {
        this.startNew();
      } else {
        const saved = this.items.find((i) => i.id === this.editing.id);
        if (saved) this.editing = { ...saved, formFields: Array.isArray(saved.formFields) ? [...saved.formFields] : [] };
      }
      this.setActionMessage(isNew ? 'Service item created successfully.' : 'Service item updated successfully.');
    } catch (err: unknown) {
      const detail = this.getErrorMessage(err);
      this.setActionMessage(`Could not ${isNew ? 'create' : 'update'} service item. ${detail}`, 'error');
    }
  }

  async remove() {
    if (!this.editing.id || !confirm(`Are you sure you want to delete "${this.editing.title}"?`)) return;
    try {
      await this.services.remove(this.editing.id);
      this.startNew();
      await this.reload();
      this.setActionMessage('Service item deleted successfully.');
    } catch (err: unknown) {
      this.setActionMessage(`Could not delete service item. ${this.getErrorMessage(err)}`, 'error');
    }
  }

  async reload() {
    this.items = await this.services.listAll();
    this.submissions = await this.services.listSubmissions();
  }

  submissionEntries(sub: ServiceSubmission): SubmissionEntry[] {
    const service = this.items.find((i) => i.id === sub.serviceId);
    const fields = Array.isArray(service?.formFields) ? service.formFields : [];
    return Object.entries(sub.data).map(([key, value]) => {
      const field = fields.find((f) => f.id === key);
      const label = field?.label || key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ');
      return { label: label.trim(), value };
    });
  }

  viewSubmission(sub: ServiceSubmission) {
    this.viewing = sub;
  }

  closeView() {
    this.viewing = null;
  }

  exportPdf(sub: ServiceSubmission) {
    downloadFormPdf(serviceSubmissionToRecord(sub, this.submissionEntries(sub)));
  }

  exportExcel(sub: ServiceSubmission) {
    downloadFormExcel(serviceSubmissionToRecord(sub, this.submissionEntries(sub)));
  }

  exportAllPdf() {
    downloadAllServiceSubmissionsPdf(this.submissions, (sub) => this.submissionEntries(sub));
  }

  exportAllExcel() {
    downloadAllServiceSubmissionsExcel(this.submissions, (sub) => this.submissionEntries(sub));
  }

  private slug(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      + '-' + Math.random().toString(36).slice(2, 6);
  }

  private toast = inject(ToastService);

  private setActionMessage(message: string, kind: 'success' | 'error' = 'success') {
    this.actionMessage = message;
    this.actionKind = kind;
    this.toast.show(message, kind);
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const payload = err.error;
      if (typeof payload === 'string' && payload.trim()) return payload.trim();
      if (payload && typeof payload === 'object') {
        const msg = (payload as { error?: unknown; message?: unknown }).error
          ?? (payload as { error?: unknown; message?: unknown }).message;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      }
      if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    }
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return 'Please try again.';
  }
}
