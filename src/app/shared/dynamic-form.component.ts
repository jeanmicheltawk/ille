import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceFormField } from '../core/models.types';
import { groupFormFields } from '../core/form-field.util';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="dyn-form" (ngSubmit)="onSubmit()" #f="ngForm">
      <ng-container *ngFor="let row of fieldRows">
        <div class="dyn-form__row" [class.dyn-form__row--half]="row.length > 1">
          <ng-container *ngFor="let field of row">
            <div *ngIf="field.type === 'info'" class="dyn-form__info">
              <p>{{ field.helpText }}</p>
            </div>

            <div *ngIf="field.type === 'file'" class="dyn-form__field dyn-form__field--file"
                 [class.dyn-form__field--half]="field.width === 'half'">
              <label>{{ field.label }} <span class="req" *ngIf="field.required">*</span></label>
              <div class="dyn-form__file-row">
                <figure class="dyn-form__file-example" *ngIf="fileExample(field.id)">
                  <img [src]="fileExample(field.id)" [alt]="'Example ' + field.label" />
                  <figcaption>Example</figcaption>
                </figure>
                <label class="dyn-form__file-zone">
                  <input type="file" accept="image/*" (change)="onFile($event, field.id)" />
                  <figure class="dyn-form__file-preview" *ngIf="filePreviews[field.id]">
                    <img [src]="filePreviews[field.id]" alt="" />
                  </figure>
                  <span class="dyn-form__file-hint" *ngIf="!files[field.id]">Upload from your computer or phone</span>
                  <span class="dyn-form__file-state" *ngIf="files[field.id]">✓ {{ files[field.id]?.name }}</span>
                </label>
              </div>
            </div>

            <div *ngIf="field.type !== 'info' && field.type !== 'file'" class="dyn-form__field"
                 [class.dyn-form__field--half]="field.width === 'half'">
              <label>
                {{ field.label }} <span class="req" *ngIf="field.required">*</span>
              </label>

              <input
                *ngIf="field.type === 'text'"
                [name]="field.id"
                [(ngModel)]="values[field.id]"
                [placeholder]="field.placeholder || ''"
                [required]="!!field.required"
              />

              <input
                *ngIf="field.type === 'email'"
                type="email"
                [name]="field.id"
                [(ngModel)]="values[field.id]"
                [required]="!!field.required"
              />

              <input
                *ngIf="field.type === 'number'"
                type="number"
                [name]="field.id"
                [(ngModel)]="values[field.id]"
                [required]="!!field.required"
              />

              <div *ngIf="field.type === 'phone'" class="dyn-form__phone">
                <select [(ngModel)]="values[field.id + '_code']" [name]="field.id + '_code'" [required]="!!field.required">
                  <option value="+961">🇱🇧 +961</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                </select>
                <input
                  type="tel"
                  [name]="field.id"
                  [(ngModel)]="values[field.id]"
                  placeholder="Phone number"
                  [required]="!!field.required"
                />
              </div>

              <textarea
                *ngIf="field.type === 'textarea'"
                [name]="field.id"
                rows="5"
                [(ngModel)]="values[field.id]"
                [placeholder]="field.placeholder || ''"
                [required]="!!field.required"
              ></textarea>

              <select *ngIf="field.type === 'dropdown'" [name]="field.id" [(ngModel)]="values[field.id]" [required]="!!field.required">
                <option value="">Select…</option>
                <option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</option>
              </select>

              <div *ngIf="field.type === 'radio'" class="dyn-form__radios">
                <p *ngIf="field.helpText" class="dyn-form__radio-help">{{ field.helpText }}</p>
                <label *ngFor="let opt of field.options" class="dyn-form__radio">
                  <input type="radio" [name]="field.id" [value]="opt" [(ngModel)]="values[field.id]" [required]="!!field.required" />
                  <span>{{ opt }}</span>
                </label>
              </div>

              <input *ngIf="field.type === 'date'" type="date" [name]="field.id" [(ngModel)]="values[field.id]" [required]="!!field.required" />
              <input *ngIf="field.type === 'time'" type="time" [name]="field.id" [(ngModel)]="values[field.id]" [required]="!!field.required" />
              <input *ngIf="field.type === 'datetime'" type="datetime-local" [name]="field.id" [(ngModel)]="values[field.id]" [required]="!!field.required" />
            </div>
          </ng-container>
        </div>
      </ng-container>

      <button class="btn" type="submit" [disabled]="busy || f.invalid || !filesValid">
        {{ busy ? 'Submitting…' : submitLabel }}
      </button>
      <p class="dyn-form__hint" *ngIf="!filesValid">Please upload all required photos.</p>
    </form>
  `,
  styles: [`
    .dyn-form { padding-top: 8px; }
    .dyn-form__row { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; }
    .dyn-form__row--half { grid-template-columns: 1fr 1fr; }
    .dyn-form__field { display: flex; flex-direction: column; gap: 8px; }
    .dyn-form__info {
      padding: 14px 0;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      margin-bottom: 8px;
    }
    .dyn-form__info p {
      margin: 0;
      font-size: 13px;
      color: var(--ink-soft);
      font-weight: 200;
      line-height: 1.65;
    }
    .dyn-form__phone { display: grid; grid-template-columns: 120px 1fr; gap: 10px; }
    .dyn-form__radios { display: flex; flex-direction: column; gap: 10px; }
    .dyn-form__radio { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .dyn-form__radio-help { margin: 0 0 8px; font-size: 12px; color: var(--ink-muted); }
    .dyn-form__file-row {
      display: flex;
      align-items: stretch;
      gap: 12px;
    }
    .dyn-form__file-example {
      flex: 0 0 92px;
      margin: 0;
      width: 92px;
    }
    .dyn-form__file-example img {
      width: 92px;
      height: 122px;
      object-fit: cover;
      object-position: top;
      display: block;
      border: 1px solid var(--line);
    }
    .dyn-form__file-example figcaption {
      margin-top: 6px;
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      text-align: center;
      font-weight: 300;
    }
    .dyn-form__file-zone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-width: 0;
      border: 1px dashed var(--line);
      padding: 20px;
      text-align: center;
      cursor: pointer;
      min-height: 148px;
      transition: border-color 0.4s ease;
    }
    .dyn-form__file-zone:hover { border-color: var(--accent); }
    .dyn-form__file-zone input[type="file"] {
      position: absolute; inset: 0;
      opacity: 0; cursor: pointer; width: 100%; height: 100%;
    }
    .dyn-form__file-preview {
      margin: 0 auto 10px;
      width: 72px; height: 96px;
      overflow: hidden;
      border: 1px solid var(--line);
    }
    .dyn-form__file-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .dyn-form__file-hint {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      font-weight: 300;
    }
    .dyn-form__file-state { font-size: 12px; color: var(--success); font-weight: 200; }
    .dyn-form__hint {
      font-size: 11px;
      color: var(--error);
      margin-top: 14px;
      letter-spacing: 0.06em;
      font-weight: 200;
    }
    .req { color: var(--error); }
    @media (max-width: 600px) {
      .dyn-form__row--half { grid-template-columns: 1fr; }
      .dyn-form__phone { grid-template-columns: 1fr; }
    }
  `],
})
export class DynamicFormComponent implements OnChanges {
  @Input({ required: true }) fields: ServiceFormField[] = [];
  @Input() fileExamples: Record<string, string> = {};
  @Input() submitLabel = 'Submit';
  @Input() busy = false;
  @Output() submitted = new EventEmitter<{ values: Record<string, string>; files: Record<string, File> }>();

  values: Record<string, string> = {};
  files: Record<string, File | undefined> = {};
  filePreviews: Record<string, string> = {};
  fieldRows: ServiceFormField[][] = [];

  ngOnChanges() {
    this.fieldRows = groupFormFields(this.fields || []);
    for (const field of this.fields || []) {
      if (field.type === 'phone' && !this.values[field.id + '_code']) {
        this.values[field.id + '_code'] = '+961';
      }
    }
  }

  get filesValid(): boolean {
    return (this.fields || [])
      .filter((f) => f.type === 'file' && f.required)
      .every((f) => !!this.files[f.id]);
  }

  fileExample(fieldId: string): string {
    return this.fileExamples?.[fieldId] || '';
  }

  onFile(event: Event, fieldId: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.files[fieldId] = file;
    this.filePreviews[fieldId] = URL.createObjectURL(file);
  }

  onSubmit() {
    const payload: Record<string, string> = { ...this.values };
    for (const field of this.fields || []) {
      if (field.type === 'phone') {
        payload[field.id] = `${this.values[field.id + '_code'] || ''} ${this.values[field.id] || ''}`.trim();
        delete payload[field.id + '_code'];
      }
    }
    const filePayload: Record<string, File> = {};
    for (const [key, file] of Object.entries(this.files)) {
      if (file) filePayload[key] = file;
    }
    this.submitted.emit({ values: payload, files: filePayload });
  }
}
