import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ServiceFormField, SiteFormConfig, SiteFormId } from '../../core/models.types';
import { SiteFormsService } from '../../core/site-forms.service';
import { ToastService } from '../../shared/toast.service';

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
  placeholder?: string;
  required?: boolean;
}

@Component({
  selector: 'app-admin-site-form-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="editor">
      <div class="editor__intro">
        <div>
          <h4>{{ title }}</h4>
          <p>
            Change what visitors see on the public form.
            Tap a field to edit it, or use <strong>Quick add</strong> for common questions.
          </p>
        </div>
        <div class="editor__actions" *ngIf="persist">
          <button type="button" class="btn btn--ghost btn--sm" (click)="resetDefaults()" [disabled]="saving">
            Reset to default
          </button>
          <button type="button" class="btn btn--sm" (click)="save()" [disabled]="saving">
            {{ saving ? 'Saving…' : 'Save form' }}
          </button>
        </div>
      </div>

      <ol class="howto" *ngIf="persist">
        <li>Add or edit questions below</li>
        <li>Click <strong>Save form</strong></li>
        <li>The live website updates immediately</li>
      </ol>

      <p class="notice notice--ok" *ngIf="message">{{ message }}</p>
      <p class="notice notice--err" *ngIf="error">{{ error }}</p>

      <div class="field" *ngIf="showRules">
        <label>Intro rules <span class="tip">One rule per line — shown above the form</span></label>
        <textarea [(ngModel)]="rulesText" name="rules" rows="4"
          placeholder="e.g. Phone pictures are fine; use natural light."
          (ngModelChange)="syncRules()"></textarea>
      </div>

      <div class="field">
        <label>Submit button text</label>
        <input [(ngModel)]="config.submitLabel" name="submitLabel" placeholder="Submit" />
      </div>

      <div class="panel">
        <div class="panel__title">Form questions ({{ fields.length }})</div>

        <div class="quick-add">
          <span class="quick-add__label">Quick add:</span>
          <button type="button" *ngFor="let q of quickFields" (click)="addQuick(q)">+ {{ q.label }}</button>
        </div>

        <div class="add-row">
          <select [(ngModel)]="newFieldType" name="newType">
            <option *ngFor="let t of availableTypes" [value]="t.value">{{ t.label }} — {{ t.hint }}</option>
          </select>
          <button type="button" class="btn btn--ghost btn--sm" (click)="addField()">+ Add custom field</button>
        </div>

        <p class="empty" *ngIf="!fields.length">No questions yet. Use Quick add above to get started.</p>

        <div class="q-card" *ngFor="let f of fields; let i = index" [class.q-card--open]="expandedId === f.id">
          <button type="button" class="q-card__head" (click)="toggle(f.id)">
            <span class="q-card__num">{{ i + 1 }}</span>
            <span class="q-card__info">
              <strong>{{ f.label || 'Untitled question' }}</strong>
              <em>{{ fieldLabel(f.type) }} · {{ f.required && f.type !== 'info' ? 'Required' : (f.type === 'info' ? 'Info only' : 'Optional') }}</em>
            </span>
            <span class="q-card__chev">{{ expandedId === f.id ? '−' : '+' }}</span>
          </button>

          <div class="q-card__body" *ngIf="expandedId === f.id">
            <div class="field">
              <label>Question label <span class="tip">What the visitor sees</span></label>
              <input [(ngModel)]="f.label" [name]="'lbl' + f.id" />
            </div>

            <div class="field">
              <label>Answer type</label>
              <select [(ngModel)]="f.type" [name]="'type' + f.id" (ngModelChange)="onTypeChange(f)">
                <option *ngFor="let t of availableTypes" [value]="t.value">{{ t.label }} — {{ t.hint }}</option>
              </select>
            </div>

            <div class="field" *ngIf="f.type !== 'info' && f.type !== 'file'">
              <label>Placeholder <span class="tip">Optional hint inside the box</span></label>
              <input [(ngModel)]="f.placeholder" [name]="'ph' + f.id" />
            </div>

            <div class="field" *ngIf="hasOptions(f.type)">
              <label>Choices <span class="tip">One option per line</span></label>
              <textarea rows="4" [ngModel]="optionsText(f)" (ngModelChange)="setOptions(f, $event)" [name]="'opt' + f.id"
                placeholder="Option 1&#10;Option 2"></textarea>
            </div>

            <div class="field" *ngIf="f.type === 'info'">
              <label>Paragraph text</label>
              <textarea rows="3" [(ngModel)]="f.helpText" [name]="'help' + f.id"></textarea>
            </div>

            <label class="check" *ngIf="f.type !== 'info'">
              <input type="checkbox" [(ngModel)]="f.required" [name]="'req' + f.id" />
              Required (visitor must fill this in)
            </label>

            <label class="check" *ngIf="f.type !== 'info'">
              <input type="checkbox" [checked]="f.width === 'half'" (change)="toggleHalf(f, i)" [name]="'half' + f.id" />
              Place side-by-side with the next question
            </label>

            <div class="q-card__foot">
              <button type="button" (click)="move(i, -1)" [disabled]="i === 0">↑ Move up</button>
              <button type="button" (click)="move(i, 1)" [disabled]="i === fields.length - 1">↓ Move down</button>
              <button type="button" class="danger" (click)="remove(i)">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div class="editor__footer" *ngIf="persist">
        <button type="button" class="btn" (click)="save()" [disabled]="saving">
          {{ saving ? 'Saving…' : 'Save form' }}
        </button>
        <span class="editor__footer-hint">Changes go live after you save.</span>
      </div>
    </div>
  `,
  styles: [`
    .editor {
      border: 1px solid var(--line);
      padding: 22px;
      margin-bottom: 32px;
      background: rgba(255, 255, 255, 0.015);
    }
    .editor__intro {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .editor h4 {
      margin: 0 0 8px;
      font-size: 17px;
      font-weight: 300;
      letter-spacing: 0.04em;
    }
    .editor__intro p {
      margin: 0;
      max-width: 520px;
      font-size: 13px;
      color: var(--ink-soft);
      font-weight: 200;
      line-height: 1.6;
    }
    .editor__actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .howto {
      margin: 0 0 20px;
      padding: 12px 14px 12px 32px;
      border: 1px solid var(--line);
      background: rgba(201, 184, 150, 0.06);
      font-size: 12px;
      color: var(--ink-soft);
      font-weight: 200;
      line-height: 1.7;
    }
    .howto strong { color: var(--accent); font-weight: 400; }
    .notice {
      margin: 0 0 16px;
      padding: 10px 12px;
      font-size: 12px;
      border: 1px solid var(--line);
    }
    .notice--ok { color: var(--accent); }
    .notice--err { color: var(--error); border-color: rgba(255, 82, 82, 0.4); }
    .tip {
      display: block;
      font-size: 10px;
      color: var(--ink-muted);
      font-weight: 200;
      margin-top: 4px;
      text-transform: none;
      letter-spacing: 0;
    }
    .panel { margin-top: 8px; }
    .panel__title {
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 14px;
    }
    .quick-add {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 14px;
    }
    .quick-add__label {
      font-size: 11px;
      color: var(--ink-muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .quick-add button {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink-soft);
      padding: 8px 12px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: border-color 0.25s ease, color 0.25s ease;
    }
    .quick-add button:hover { border-color: var(--accent); color: var(--ink); }
    .add-row {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .add-row select {
      min-width: 220px;
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink);
      padding: 10px 12px;
      font-family: inherit;
    }
    .empty {
      padding: 28px;
      text-align: center;
      border: 1px dashed var(--line);
      color: var(--ink-muted);
      font-size: 13px;
      margin-bottom: 12px;
    }
    .q-card {
      border: 1px solid var(--line);
      margin-bottom: 10px;
    }
    .q-card--open { border-color: var(--line-strong); }
    .q-card__head {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: none;
      border: 0;
      cursor: pointer;
      color: inherit;
      text-align: left;
      font-family: inherit;
    }
    .q-card__num {
      width: 26px; height: 26px;
      border: 1px solid var(--line);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .q-card__info { flex: 1; min-width: 0; }
    .q-card__info strong { display: block; font-size: 14px; font-weight: 300; }
    .q-card__info em {
      display: block;
      font-size: 11px;
      color: var(--ink-muted);
      font-style: normal;
      margin-top: 2px;
    }
    .q-card__chev {
      color: var(--ink-muted);
      font-size: 18px;
      line-height: 1;
    }
    .q-card__body { padding: 0 16px 16px; border-top: 1px solid var(--line); }
    .check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 13px;
      cursor: pointer;
      color: var(--ink-soft);
    }
    .q-card__foot {
      display: flex;
      gap: 14px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      flex-wrap: wrap;
    }
    .q-card__foot button {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--ink-soft);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0;
      font-family: inherit;
    }
    .q-card__foot button:hover { color: var(--accent); }
    .q-card__foot button:disabled { opacity: 0.35; cursor: not-allowed; }
    .q-card__foot .danger { color: var(--error); }
    .editor__footer {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--line);
    }
    .editor__footer-hint {
      font-size: 12px;
      color: var(--ink-muted);
      font-weight: 200;
    }
  `],
})
export class AdminSiteFormEditorComponent implements OnInit {
  @Input() formId?: SiteFormId;
  @Input() title = 'Form questions';
  @Input() showRules = false;
  @Input() allowFile = false;
  /** When set, the editor mutates this object in place and does not persist on its own. */
  @Input() boundConfig: Pick<SiteFormConfig, 'rules' | 'submitLabel' | 'formFields'> | null = null;
  @Output() saved = new EventEmitter<SiteFormConfig>();

  config: SiteFormConfig = { id: 'become-a-model', rules: [], submitLabel: 'Submit', formFields: [] };
  rulesText = '';
  saving = false;
  message = '';
  error = '';
  newFieldType: ServiceFormField['type'] = 'text';
  expandedId: string | null = null;

  private allTypes: FieldTypeOption[] = [
    { value: 'text', label: 'Short text', hint: 'name, city, Instagram…' },
    { value: 'email', label: 'Email', hint: 'email address' },
    { value: 'phone', label: 'Phone', hint: 'phone with country code' },
    { value: 'number', label: 'Number', hint: 'height, age…' },
    { value: 'textarea', label: 'Long text', hint: 'notes / details' },
    { value: 'dropdown', label: 'Dropdown', hint: 'pick one from a list' },
    { value: 'radio', label: 'Choices', hint: 'pick one, shown as options' },
    { value: 'date', label: 'Date', hint: 'calendar picker' },
    { value: 'time', label: 'Time', hint: 'time picker' },
    { value: 'datetime', label: 'Date & time', hint: 'calendar + time' },
    { value: 'file', label: 'Photo upload', hint: 'image from phone/computer' },
    { value: 'info', label: 'Info paragraph', hint: 'text only, no answer' },
  ];

  quickFields: QuickField[] = [];

  constructor(private forms: SiteFormsService) {}

  private toast = inject(ToastService);

  get persist(): boolean {
    return !this.boundConfig;
  }

  async ngOnInit() {
    this.quickFields = this.allowFile
      ? [
          { type: 'text', label: 'First name', width: 'half', rowGroup: 'name' },
          { type: 'text', label: 'Last name', width: 'half', rowGroup: 'name' },
          { type: 'email', label: 'Email' },
          { type: 'phone', label: 'Phone' },
          { type: 'text', label: 'Instagram', placeholder: '@username' },
          { type: 'number', label: 'Height (cm)' },
          { type: 'date', label: 'Date of birth' },
          { type: 'file', label: 'Photo upload', width: 'half' },
          { type: 'textarea', label: 'Notes' },
        ]
      : [
          { type: 'text', label: 'Your name', width: 'half', rowGroup: 'row1' },
          { type: 'text', label: 'Company', width: 'half', rowGroup: 'row1' },
          { type: 'email', label: 'Email' },
          { type: 'phone', label: 'Phone' },
          {
            type: 'dropdown',
            label: 'Job type',
            options: ['Editorial', 'Campaign', 'Runway / Show', 'E-commerce', 'Lookbook', 'Event / Appearance'],
          },
          { type: 'text', label: 'Location' },
          { type: 'text', label: 'Dates', placeholder: 'e.g. 12–14 July' },
          { type: 'textarea', label: 'Details' },
        ];
    if (this.boundConfig) {
      this.config = this.boundConfig as SiteFormConfig;
      this.rulesText = (this.config.rules || []).join('\n');
      return;
    }
    await this.load();
  }

  /** Copy intro rules back onto the bound config before the parent saves. */
  flushToBound() {
    if (!this.boundConfig) return;
    this.syncRules();
    this.boundConfig.submitLabel = this.config.submitLabel;
    this.boundConfig.formFields = this.fields;
  }

  syncRules() {
    if (!this.boundConfig) return;
    this.boundConfig.rules = this.rulesText.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  get fields(): ServiceFormField[] {
    if (!this.config.formFields) this.config.formFields = [];
    return this.config.formFields.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get availableTypes(): FieldTypeOption[] {
    return this.allowFile ? this.allTypes : this.allTypes.filter((t) => t.value !== 'file');
  }

  async load() {
    if (!this.formId) return;
    this.config = await this.forms.get(this.formId);
    this.rulesText = (this.config.rules || []).join('\n');
  }

  fieldLabel(type: ServiceFormField['type']): string {
    return this.allTypes.find((t) => t.value === type)?.label ?? type;
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
    if (f.type === 'info') f.required = false;
    if (f.type === 'file') {
      f.required = true;
      f.width = f.width || 'half';
    }
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
    const field = this.forms.blankField(this.fields.length);
    field.type = q.type;
    field.label = q.label;
    field.width = q.width || 'full';
    field.rowGroup = q.rowGroup;
    field.options = q.options;
    field.placeholder = q.placeholder;
    field.required = q.required ?? q.type !== 'info';
    this.onTypeChange(field);
    this.config.formFields = [...this.fields, field];
    this.expandedId = field.id;
    this.message = '';
  }

  addField() {
    const field = this.forms.blankField(this.fields.length);
    field.type = this.newFieldType;
    field.label = this.fieldLabel(this.newFieldType);
    this.onTypeChange(field);
    this.config.formFields = [...this.fields, field];
    this.expandedId = field.id;
    this.message = '';
  }

  remove(index: number) {
    const label = this.fields[index]?.label || 'this field';
    if (!confirm(`Remove "${label}" from the form?`)) return;
    const next = [...this.fields];
    next.splice(index, 1);
    next.forEach((f, i) => (f.sortOrder = i));
    this.config.formFields = next;
  }

  move(index: number, dir: number) {
    const next = [...this.fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((f, i) => (f.sortOrder = i));
    this.config.formFields = next;
  }

  async save() {
    if (this.boundConfig) {
      this.flushToBound();
      this.saved.emit(this.config);
      return;
    }
    if (!this.formId) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.config.rules = this.rulesText.split('\n').map((line) => line.trim()).filter(Boolean);
    try {
      await this.forms.save(this.config);
      this.message = 'Form saved — the live website now uses these questions.';
      alert('Done');
      this.saved.emit(this.config);
    } catch (err: unknown) {
      this.error = this.getErrorMessage(err);
      this.toast.error(this.error);
      alert(`Error: ${this.error}`);
    } finally {
      this.saving = false;
    }
  }

  resetDefaults() {
    if (!this.formId) return;
    if (!confirm('Reset this form to the original default questions? Your custom changes will be lost.')) return;
    this.config = this.forms.default(this.formId);
    this.rulesText = (this.config.rules || []).join('\n');
    this.message = '';
    this.error = '';
    this.expandedId = null;
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
      if (err.status === 0) return 'Could not reach the server. Check your connection and try again.';
      if (err.status === 401) return 'Session expired. Please sign in again.';
      if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    }
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return 'Could not save form. Please try again.';
  }
}
