import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceFormField, ServiceItem } from '../../core/models.types';
import { ServicesService } from '../../core/services.service';
import { mediaUrl } from '../../core/media-url.util';
import { FileUploadComponent } from '../../shared/file-upload.component';

interface FieldTypeOption {
  value: ServiceFormField['type'];
  label: string;
  hint: string;
}

interface QuickField {
  type: ServiceFormField['type'];
  label: string;
  width?: 'full' | 'half';
  rowGroup?: string;
  options?: string[];
  helpText?: string;
}

@Component({
  selector: 'app-service-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploadComponent],
  template: `
    <div class="builder">
      <div class="builder__head">
        <div>
          <h4>Step 3 — Booking form</h4>
          <p class="builder__hint">
            Clients will fill this form when they click your book button.
            Every question you add is required.
          </p>
        </div>
        <button type="button" class="btn btn--ghost btn--sm" (click)="applyTemplate('guidance')">Use guidance template</button>
      </div>

      <!-- Page appearance -->
      <div class="panel">
        <div class="panel__title">How the booking page looks</div>
        <div class="grid2">
          <div class="field">
            <label>Page title <span class="tip">Shown large at the top</span></label>
            <input [(ngModel)]="service.formTitle" name="formTitle" placeholder="e.g. Guidance Consultation" />
          </div>
          <div class="field">
            <label>Button text <span class="tip">Default: Submit — change if you like</span></label>
            <input [(ngModel)]="service.ctaLabel" name="ctaLabel" placeholder="Submit" />
          </div>
        </div>

        <div class="bg-upload">
          <app-file-upload
            name="bgImage"
            [(ngModel)]="service.backgroundImage"
            label="Upload background photo"
            hint="Choose a photo from your computer or phone"
          />
        </div>
      </div>

      <div class="layout">
        <!-- Field editor -->
        <div class="panel panel--grow">
          <div class="panel__title">Form questions</div>
          <p class="panel__sub">Tap a shortcut to add common questions, or pick a field type below.</p>

          <div class="quick-add">
            <span class="quick-add__label">Quick add:</span>
            <button type="button" *ngFor="let q of quickFields" (click)="addQuick(q)">{{ q.label }}</button>
          </div>

          <div class="add-row">
            <select [(ngModel)]="newFieldType" name="newType">
              <option *ngFor="let t of fieldTypes" [value]="t.value">{{ t.label }}</option>
            </select>
            <button type="button" class="btn btn--ghost btn--sm" (click)="addField()">+ Add question</button>
          </div>

          <p class="empty" *ngIf="!fields.length">No questions yet. Use quick add above to get started.</p>

          <div class="q-card" *ngFor="let f of fields; let i = index" [class.q-card--open]="expandedId === f.id">
            <button type="button" class="q-card__head" (click)="toggle(f.id)">
              <span class="q-card__num">{{ i + 1 }}</span>
              <span class="q-card__info">
                <strong>{{ f.label || 'Untitled question' }}</strong>
                <em>{{ fieldLabel(f.type) }} · {{ f.width === 'half' ? 'Half width' : 'Full width' }}</em>
              </span>
              <span class="q-card__req" *ngIf="f.type !== 'info'">Required</span>
            </button>

            <div class="q-card__body" *ngIf="expandedId === f.id">
              <div class="field">
                <label>Question label <span class="tip">What the client sees</span></label>
                <input [(ngModel)]="f.label" [name]="'lbl' + f.id" />
              </div>

              <div class="field">
                <label>Answer type</label>
                <select [(ngModel)]="f.type" [name]="'type' + f.id" (ngModelChange)="onTypeChange(f)">
                  <option *ngFor="let t of fieldTypes" [value]="t.value">{{ t.label }} — {{ t.hint }}</option>
                </select>
              </div>

              <div class="field" *ngIf="f.type !== 'info'">
                <label>Placeholder <span class="tip">Optional hint inside the field</span></label>
                <input [(ngModel)]="f.placeholder" [name]="'ph' + f.id" />
              </div>

              <div class="field" *ngIf="hasOptions(f.type)">
                <label>Choices <span class="tip">One option per line</span></label>
                <textarea rows="4" [ngModel]="optionsText(f)" (ngModelChange)="setOptions(f, $event)" [name]="'opt' + f.id"
                  placeholder="LIVE SESSION&#10;ONLINE SESSION"></textarea>
              </div>

              <div class="field" *ngIf="f.type === 'info' || f.type === 'radio' || f.type === 'dropdown'">
                <label>{{ f.type === 'info' ? 'Paragraph text' : 'Extra explanation' }}
                  <span class="tip">{{ f.type === 'info' ? 'Shown to client, no answer needed' : 'Shown under the question' }}</span>
                </label>
                <textarea rows="3" [(ngModel)]="f.helpText" [name]="'help' + f.id"></textarea>
              </div>

              <div class="q-card__layout" *ngIf="f.type !== 'info'">
                <label class="check">
                  <input type="checkbox" [checked]="f.width === 'half'" (change)="toggleHalf(f, i)" />
                  Place side-by-side with the next question
                </label>
                <p class="layout-hint" *ngIf="f.width === 'half'">Pairs with the next half-width question on the same row.</p>
              </div>

              <div class="q-card__foot">
                <button type="button" (click)="move(i, -1)" [disabled]="i === 0">Move up</button>
                <button type="button" (click)="move(i, 1)" [disabled]="i === fields.length - 1">Move down</button>
                <button type="button" class="danger" (click)="remove(i)">Delete question</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live preview -->
        <div class="panel panel--preview">
          <div class="panel__title">Preview</div>
          <p class="panel__sub">This is what clients will see.</p>
          <div class="preview">
            <div class="preview__bg" [style.background-image]="previewBg"></div>
            <div class="preview__shade"></div>
            <div class="preview__inner">
              <div class="preview__title">{{ service.formTitle || service.title || 'Booking form' }}</div>
              <div class="preview__fields">
                <ng-container *ngFor="let f of fields">
                  <p *ngIf="f.type === 'info'" class="preview__info">{{ f.helpText || 'Info text…' }}</p>
                  <div *ngIf="f.type !== 'info'" class="preview__field" [class.preview__field--half]="f.width === 'half'">
                    <label>{{ f.label || 'Question' }} *</label>
                    <div class="preview__line"></div>
                    <div *ngIf="f.type === 'radio'" class="preview__opts">
                      <span *ngFor="let o of f.options">{{ o }}</span>
                    </div>
                  </div>
                </ng-container>
              </div>
              <div class="preview__btn">{{ service.ctaLabel || 'Submit' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .builder { margin-top: 8px; }
    .builder__head {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
    }
    .builder h4 {
      font-size: 16px; font-weight: 300; letter-spacing: 0.08em;
      text-transform: uppercase; margin: 0 0 6px; color: var(--accent);
    }
    .builder__hint {
      font-size: 13px; color: var(--ink-soft); margin: 0;
      font-weight: 200; line-height: 1.6; max-width: 520px;
    }
    .panel {
      border: 1px solid var(--line);
      padding: 22px;
      margin-bottom: 18px;
    }
    .panel__title {
      font-size: 14px; font-weight: 300; letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .panel__sub {
      font-size: 12px; color: var(--ink-muted); margin: 0 0 16px;
      font-weight: 200; line-height: 1.5;
    }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .tip {
      display: block; font-size: 10px; letter-spacing: 0.08em;
      color: var(--ink-muted); font-weight: 200; margin-top: 4px;
      text-transform: none;
    }
    .bg-upload { margin-top: 16px; }
    .layout { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; }
    .panel--grow { margin-bottom: 0; }
    .quick-add {
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      margin-bottom: 14px;
    }
    .quick-add__label { font-size: 11px; color: var(--ink-muted); margin-right: 4px; }
    .quick-add button {
      background: var(--paper-pure); border: 1px solid var(--line);
      color: var(--ink-soft); padding: 7px 12px; font-size: 11px;
      cursor: pointer; transition: all 0.25s ease;
    }
    .quick-add button:hover { border-color: var(--accent); color: var(--ink); }
    .add-row { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
    .add-row select {
      flex: 1; min-width: 200px; padding: 10px 12px;
      background: transparent; border: 1px solid var(--line); color: var(--ink);
    }
    .btn--sm { padding: 10px 18px; font-size: 9px; }
    .empty {
      font-size: 13px; color: var(--ink-muted); padding: 20px;
      text-align: center; border: 1px dashed var(--line);
    }
    .q-card {
      border: 1px solid var(--line); margin-bottom: 10px;
      background: var(--paper-pure);
    }
    .q-card--open { border-color: var(--line-strong); }
    .q-card__head {
      width: 100%; display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; background: none; border: 0; cursor: pointer;
      text-align: left; color: inherit;
    }
    .q-card__num {
      width: 26px; height: 26px; border: 1px solid var(--line);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: var(--ink-muted); flex-shrink: 0;
    }
    .q-card__info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .q-card__info strong { font-size: 14px; font-weight: 300; }
    .q-card__info em { font-size: 11px; color: var(--ink-muted); font-style: normal; }
    .q-card__req {
      font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--accent); border: 1px solid var(--line); padding: 4px 8px;
    }
    .q-card__body { padding: 0 16px 16px; border-top: 1px solid var(--line); }
    .q-card__layout { margin-top: 8px; }
    .check {
      display: flex; gap: 8px; align-items: center;
      font-size: 13px; color: var(--ink-soft); cursor: pointer;
    }
    .layout-hint { font-size: 11px; color: var(--ink-muted); margin: 6px 0 0 24px; }
    .q-card__foot {
      display: flex; gap: 14px; margin-top: 16px; padding-top: 14px;
      border-top: 1px solid var(--line); flex-wrap: wrap;
    }
    .q-card__foot button {
      background: none; border: 0; cursor: pointer;
      font-size: 12px; color: var(--ink-soft);
    }
    .q-card__foot button:hover { color: var(--accent); }
    .q-card__foot .danger:hover { color: var(--error); }
    .panel--preview { position: sticky; top: 100px; align-self: start; }
    .preview {
      position: relative; min-height: 360px; overflow: hidden;
      border: 1px solid var(--line);
    }
    .preview__bg {
      position: absolute; inset: 0; background-size: cover; background-position: center;
    }
    .preview__shade {
      position: absolute; inset: 0; background: rgba(0,0,0,0.65);
    }
    .preview__inner {
      position: relative; z-index: 1; padding: 24px 20px; color: #fff;
    }
    .preview__title {
      text-align: center; font-size: 11px; letter-spacing: 0.22em;
      text-transform: uppercase; margin-bottom: 20px; font-weight: 300;
    }
    .preview__fields { display: flex; flex-wrap: wrap; gap: 14px; }
    .preview__field { width: 100%; }
    .preview__field--half { width: calc(50% - 7px); }
    .preview__field label {
      font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase;
      display: block; margin-bottom: 6px; opacity: 0.85;
    }
    .preview__line {
      height: 1px; background: rgba(255,255,255,0.45);
    }
    .preview__info {
      width: 100%; font-size: 9px; line-height: 1.5; opacity: 0.75;
      margin: 0; text-align: center;
    }
    .preview__opts { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .preview__opts span { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; }
    .preview__btn {
      margin: 22px auto 0; width: fit-content;
      font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase;
      border: 1px solid rgba(255,255,255,0.5); padding: 8px 16px;
    }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .panel--preview { position: static; }
    }
    @media (max-width: 600px) { .grid2 { grid-template-columns: 1fr; } }
  `],
})
export class ServiceFormBuilderComponent {
  @Input({ required: true }) service!: ServiceItem;

  newFieldType: ServiceFormField['type'] = 'text';
  expandedId: string | null = null;

  fieldTypes: FieldTypeOption[] = [
    { value: 'text', label: 'Short text', hint: 'single line answer' },
    { value: 'email', label: 'Email', hint: 'email address' },
    { value: 'phone', label: 'Phone', hint: 'phone with country code' },
    { value: 'textarea', label: 'Long text', hint: 'multi-line answer' },
    { value: 'dropdown', label: 'Dropdown', hint: 'pick one option' },
    { value: 'radio', label: 'Choices', hint: 'pick one, shown as buttons' },
    { value: 'date', label: 'Date', hint: 'calendar picker' },
    { value: 'time', label: 'Time', hint: 'time picker' },
    { value: 'datetime', label: 'Date & time', hint: 'calendar + time' },
    { value: 'info', label: 'Info paragraph', hint: 'text only, no answer' },
  ];

  quickFields: QuickField[] = [
    { type: 'text', label: 'First name', width: 'half', rowGroup: 'name' },
    { type: 'text', label: 'Last name', width: 'half', rowGroup: 'name' },
    { type: 'email', label: 'Email' },
    { type: 'phone', label: 'Phone' },
    { type: 'text', label: 'Instagram', placeholder: '@username' } as QuickField,
    { type: 'date', label: 'Preferred date', width: 'half', rowGroup: 'schedule' },
    { type: 'time', label: 'Preferred time', width: 'half', rowGroup: 'schedule' },
    { type: 'radio', label: 'Select session', options: ['LIVE SESSION', 'ONLINE SESSION'] },
    { type: 'textarea', label: 'Notes' },
    { type: 'info', label: 'Info paragraph', helpText: 'Add your explanation here…' },
  ];

  constructor(private services: ServicesService) {}

  get fields(): ServiceFormField[] {
    if (!this.service.formFields) this.service.formFields = [];
    return this.service.formFields.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get previewBg(): string {
    const url = mediaUrl(this.service.backgroundImage) || 'assets/home-bg.webp';
    return `url(${url})`;
  }

  fieldLabel(type: ServiceFormField['type']): string {
    return this.fieldTypes.find((t) => t.value === type)?.label ?? type;
  }

  hasOptions(type: ServiceFormField['type']): boolean {
    return type === 'dropdown' || type === 'radio';
  }

  optionsText(f: ServiceFormField): string {
    return (f.options || []).join('\n');
  }

  setOptions(f: ServiceFormField, text: string) {
    f.options = text.split('\n').map((s) => s.trim()).filter(Boolean);
  }

  toggle(id: string) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  onTypeChange(f: ServiceFormField) {
    f.required = f.type !== 'info';
    if (this.hasOptions(f.type) && !f.options?.length) {
      f.options = ['Option 1', 'Option 2'];
    }
  }

  toggleHalf(f: ServiceFormField, index: number) {
    if (f.width === 'half') {
      f.width = 'full';
      f.rowGroup = undefined;
      return;
    }
    f.width = 'half';
    f.rowGroup = f.rowGroup || `row-${index}`;
    const next = this.fields[index + 1];
    if (next && next.width !== 'half') {
      next.width = 'half';
      next.rowGroup = f.rowGroup;
    }
  }

  addQuick(q: QuickField) {
    const field = this.services.blankField(this.fields.length);
    field.type = q.type;
    field.label = q.label;
    field.width = q.width || 'full';
    field.rowGroup = q.rowGroup;
    field.options = q.options;
    field.helpText = q.helpText;
    field.placeholder = (q as any).placeholder;
    field.required = q.type !== 'info';
    this.service.formFields = [...this.fields, field];
    this.expandedId = field.id;
  }

  addField() {
    const field = this.services.blankField(this.fields.length);
    field.type = this.newFieldType;
    field.label = this.fieldLabel(this.newFieldType);
    field.required = this.newFieldType !== 'info';
    if (this.hasOptions(field.type)) field.options = ['Option 1', 'Option 2'];
    this.service.formFields = [...this.fields, field];
    this.expandedId = field.id;
  }

  applyTemplate(kind: 'guidance') {
    if (kind === 'guidance') {
      this.service.formTitle = this.service.formTitle || 'Guidance Consultation';
      this.service.ctaLabel = this.service.ctaLabel || 'Submit';
      this.service.formFields = [
        { id: 'firstName', type: 'text', label: 'First Name', width: 'half', rowGroup: 'name', sortOrder: 0, required: true },
        { id: 'lastName', type: 'text', label: 'Last Name', width: 'half', rowGroup: 'name', sortOrder: 1, required: true },
        { id: 'email', type: 'email', label: 'Email', width: 'full', sortOrder: 2, required: true },
        { id: 'phone', type: 'phone', label: 'Phone Number', width: 'full', sortOrder: 3, required: true },
        {
          id: 'session-info', type: 'info', label: '', width: 'full', sortOrder: 4, required: false,
          helpText: 'Advanced guidance consultation is more complex to improve the skills you already have. It is recommended for people who already know posing and want to take their skills to the next level.',
        },
        { id: 'session', type: 'radio', label: 'Select Session', options: ['LIVE SESSION', 'ONLINE SESSION'], width: 'full', sortOrder: 5, required: true },
        { id: 'instagram', type: 'text', label: 'Instagram', placeholder: '@username', width: 'full', sortOrder: 6, required: true },
      ];
      this.expandedId = null;
    }
  }

  remove(index: number) {
    const next = [...this.fields];
    next.splice(index, 1);
    next.forEach((f, i) => (f.sortOrder = i));
    this.service.formFields = next;
  }

  move(index: number, dir: number) {
    const next = [...this.fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((f, i) => (f.sortOrder = i));
    this.service.formFields = next;
  }
}
