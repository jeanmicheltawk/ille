import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ServicesService } from '../../core/services.service';
import { ServiceFormField, ServiceItem } from '../../core/models.types';

@Component({
  selector: 'app-service-book',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="book" *ngIf="service">
      <div class="book__bg" [style.background-image]="bgStyle" aria-hidden="true"></div>
      <div class="book__shade" aria-hidden="true"></div>

      <div class="book__inner">
        <h1 class="book__title">{{ service.formTitle || service.title }}</h1>

        <div *ngIf="done" class="book__done">
          <p>Thank you — your request has been received. Our team will be in touch shortly.</p>
          <a routerLink="/services" class="btn btn--ghost">Back to services</a>
        </div>

        <div *ngIf="error" class="book__err">{{ error }}</div>

        <form *ngIf="!done" class="book__form" (ngSubmit)="submit()" #f="ngForm">
          <ng-container *ngFor="let row of fieldRows">
            <div class="book__row" [class.book__row--half]="row.length > 1">
              <ng-container *ngFor="let field of row">
                <div *ngIf="field.type === 'info'" class="book__info">
                  <p>{{ field.helpText }}</p>
                </div>

                <div *ngIf="field.type !== 'info'" class="book__field" [class.book__field--half]="field.width === 'half'">
                  <label>
                    {{ field.label }} <span class="req">*</span>
                  </label>

                  <input
                    *ngIf="isInput(field, 'text')"
                    [name]="field.id"
                    [(ngModel)]="values[field.id]"
                    [placeholder]="field.placeholder || ''"
                    required
                  />

                  <input
                    *ngIf="field.type === 'email'"
                    type="email"
                    [name]="field.id"
                    [(ngModel)]="values[field.id]"
                    required
                  />

                  <div *ngIf="field.type === 'phone'" class="book__phone">
                    <select [(ngModel)]="values[field.id + '_code']" [name]="field.id + '_code'" required>
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
                      required
                    />
                  </div>

                  <textarea
                    *ngIf="field.type === 'textarea'"
                    [name]="field.id"
                    rows="4"
                    [(ngModel)]="values[field.id]"
                    required
                  ></textarea>

                  <select *ngIf="field.type === 'dropdown'" [name]="field.id" [(ngModel)]="values[field.id]" required>
                    <option value="">Select…</option>
                    <option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</option>
                  </select>

                  <div *ngIf="field.type === 'radio'" class="book__radios">
                    <p *ngIf="field.helpText" class="book__radio-help">{{ field.helpText }}</p>
                    <label *ngFor="let opt of field.options" class="book__radio">
                      <input type="radio" [name]="field.id" [value]="opt" [(ngModel)]="values[field.id]" required />
                      <span>{{ opt }}</span>
                    </label>
                  </div>

                  <input *ngIf="field.type === 'date'" type="date" [name]="field.id" [(ngModel)]="values[field.id]" required />
                  <input *ngIf="field.type === 'time'" type="time" [name]="field.id" [(ngModel)]="values[field.id]" required />
                  <input *ngIf="field.type === 'datetime'" type="datetime-local" [name]="field.id" [(ngModel)]="values[field.id]" required />
                </div>
              </ng-container>
            </div>
          </ng-container>

          <button class="btn book__submit" type="submit" [disabled]="busy || f.invalid">
            {{ busy ? 'Sending…' : (service.ctaLabel || 'Submit') }}
          </button>
        </form>
      </div>
    </section>

    <div class="book__missing" *ngIf="!service && !loading">
      <p>Service not found.</p>
      <a routerLink="/services" class="btn btn--ghost">Back to services</a>
    </div>
  `,
  styles: [`
    .book {
      position: relative;
      min-height: 100vh;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 100px 24px 60px;
    }
    .book__bg {
      position: fixed; inset: 0;
      background-size: cover;
      background-position: center;
      z-index: 0;
    }
    .book__shade {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.62);
      z-index: 1;
    }
    .book__inner {
      position: relative; z-index: 2;
      width: 100%; max-width: 560px;
    }
    .book__title {
      font-family: var(--body);
      font-size: clamp(22px, 4vw, 34px);
      font-weight: 300;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      text-align: center;
      margin: 0 0 40px;
    }
    .book__form { display: flex; flex-direction: column; gap: 22px; }
    .book__row { display: flex; flex-direction: column; gap: 22px; }
    .book__row--half {
      flex-direction: row;
      gap: 28px;
    }
    .book__field { flex: 1; }
    .book__field label {
      display: block;
      font-size: 10px;
      font-weight: 300;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.85);
      margin-bottom: 10px;
    }
    .book__field input,
    .book__field select,
    .book__field textarea {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.45);
      color: #fff;
      font-family: var(--body);
      font-size: 15px;
      font-weight: 200;
      padding: 10px 0;
    }
    .book__field input:focus,
    .book__field select:focus,
    .book__field textarea:focus {
      outline: none;
      border-bottom-color: #fff;
    }
    .book__field select option { background: #111; color: #fff; }
    .book__phone {
      display: flex; gap: 12px; align-items: flex-end;
    }
    .book__phone select {
      width: 110px; flex-shrink: 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.45);
      color: #fff;
      padding: 10px 0;
    }
    .book__phone input { flex: 1; }
    .book__info p {
      font-size: 12px;
      font-weight: 200;
      line-height: 1.7;
      color: rgba(255,255,255,0.72);
      margin: 0;
      text-align: center;
    }
    .book__radios { display: flex; flex-direction: column; gap: 12px; }
    .book__radio-help {
      font-size: 12px;
      font-weight: 200;
      line-height: 1.7;
      color: rgba(255,255,255,0.72);
      margin: 0 0 8px;
    }
    .book__radio {
      display: flex; align-items: center; gap: 10px;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .book__radio input { width: auto; accent-color: #fff; }
    .book__submit { align-self: center; margin-top: 16px; }
    .book__done, .book__missing {
      text-align: center;
      font-weight: 200;
      line-height: 1.7;
    }
    .book__err {
      color: #f0a0a0;
      font-size: 14px;
      text-align: center;
      margin-bottom: 16px;
    }
    .req { color: rgba(255,180,180,0.9); }
    @media (max-width: 600px) {
      .book__row--half { flex-direction: column; gap: 22px; }
    }
  `],
})
export class ServiceBookComponent implements OnInit {
  service: ServiceItem | null = null;
  loading = true;
  busy = false;
  done = false;
  error = '';
  values: Record<string, string> = {};
  fieldRows: ServiceFormField[][] = [];

  constructor(private route: ActivatedRoute, private services: ServicesService) {}

  get bgStyle(): string {
    const url = this.service?.backgroundImage || 'assets/home-bg.webp';
    return `url(${url})`;
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service = await this.services.get(id);
    if (this.service?.formFields) {
      this.fieldRows = this.groupFields(this.service.formFields);
      for (const row of this.fieldRows) {
        for (const f of row) {
          if (f.type === 'phone') this.values[f.id + '_code'] = '+961';
        }
      }
    }
    this.loading = false;
  }

  isInput(field: ServiceFormField, kind: string): boolean {
    return kind === 'text' && field.type === 'text';
  }

  groupFields(fields: ServiceFormField[]): ServiceFormField[][] {
    const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
    const rows: ServiceFormField[][] = [];
    const used = new Set<string>();

    for (const field of sorted) {
      if (used.has(field.id)) continue;
      if (field.width === 'half' && field.rowGroup) {
        const partner = sorted.find(
          (f) => f.id !== field.id && f.rowGroup === field.rowGroup && f.width === 'half' && !used.has(f.id),
        );
        if (partner) {
          rows.push([field, partner].sort((a, b) => a.sortOrder - b.sortOrder));
          used.add(field.id);
          used.add(partner.id);
          continue;
        }
      }
      rows.push([field]);
      used.add(field.id);
    }
    return rows;
  }

  async submit() {
    if (!this.service) return;
    this.error = '';
    this.busy = true;
    const payload: Record<string, string> = { ...this.values };
    for (const field of this.service.formFields || []) {
      if (field.type === 'phone') {
        payload[field.id] = `${this.values[field.id + '_code'] || ''} ${this.values[field.id] || ''}`.trim();
        delete payload[field.id + '_code'];
      }
    }
    try {
      await this.services.submitBooking(this.service.id, payload);
      this.done = true;
    } catch (e: any) {
      this.error = e?.error?.error ?? e?.message ?? 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }
}
