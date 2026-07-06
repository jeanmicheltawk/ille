import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModelsService } from '../../core/models.service';
import { SubmissionsService } from '../../core/submissions.service';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Booking, Model, ModelApplication, ModelCategory } from '../../core/models.types';
import { digitalsNameSlug } from '../../core/model.util';
import { isBranchCategory, subCategories } from '../../core/models-branch.util';
import {
  applicationToRecord,
  bookingToRecord,
  downloadAllFormsExcel,
  downloadAllFormsPdf,
  downloadFormExcel,
  downloadFormPdf,
  FormRecord,
} from '../../core/submission-export.util';
import { AdminServicesComponent } from './admin-services.component';
import { AdminCategoriesComponent } from './admin-categories.component';
import { AdminSubscribersComponent } from './admin-subscribers.component';
import { FileUploadComponent } from '../../shared/file-upload.component';
import { CategoriesService } from '../../core/categories.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminServicesComponent, AdminCategoriesComponent, AdminSubscribersComponent, FileUploadComponent],
  template: `
    <div class="container dash">
      <div class="dash__top">
        <div>
          <p class="eyebrow">Client Dashboard</p>
          <h1>Manage Agency</h1>
        </div>
        <button class="btn btn--ghost" (click)="logout()">Sign out</button>
      </div>

      <nav class="dash__tabs">
        <button [class.on]="tab==='models'" (click)="setTab('models')">Models ({{ models.length }})</button>
        <button [class.on]="tab==='categories'" (click)="setTab('categories')">Categories ({{ categories.length }})</button>
        <button [class.on]="tab==='apps'" (click)="setTab('apps')">Applications ({{ apps.length }})</button>
        <button [class.on]="tab==='bookings'" (click)="setTab('bookings')">Bookings ({{ bookings.length }})</button>
        <button [class.on]="tab==='subscribers'" (click)="setTab('subscribers')">Subscribers</button>
        <button [class.on]="tab==='services'" (click)="setTab('services')">Services</button>
      </nav>

      <!-- MODELS -->
      <section *ngIf="tab==='models'">
        <div class="models-head">
          <h3>Models ({{ models.length }})</h3>
          <button type="button" class="btn" (click)="openAddModel()">Add a model</button>
        </div>

        <table class="tbl">
          <thead><tr><th>Name</th><th>Division</th><th>Category</th><th>City</th><th>Out of town</th><th>Published</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let m of models">
              <td>{{ m.name }}</td>
              <td>{{ branchName(m.branch) }}</td>
              <td>{{ modelCategoryLabel(m) }}</td>
              <td>{{ m.city || '—' }}</td>
              <td>{{ m.outOfTown ? 'Yes' : '—' }}</td>
              <td>{{ m.published ? 'Yes' : 'Hidden' }}</td>
              <td class="row-actions">
                <button type="button" (click)="edit(m)">Edit</button>
                <button type="button" (click)="del(m)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- CATEGORIES -->
      <section *ngIf="tab==='categories'">
        <app-admin-categories />
      </section>

      <!-- APPLICATIONS -->
      <section *ngIf="tab==='apps'">
        <div class="forms-head">
          <div>
            <h3>Become a model applications ({{ apps.length }})</h3>
            <p class="muted" *ngIf="!configured">
              Applications appear here once the backend is connected.
            </p>
          </div>
          <div class="forms-head__actions" *ngIf="apps.length">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllAppsPdf()">Download all PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllAppsExcel()">Download all Excel</button>
          </div>
        </div>
        <p class="muted" *ngIf="configured && !apps.length">No applications yet.</p>
        <div class="form-card" *ngFor="let a of apps">
          <div class="form-card__head">
            <div>
              <strong>{{ a.firstName }} {{ a.lastName }}</strong>
              <span class="form-card__meta">{{ a.createdAt || 'Just now' }}</span>
            </div>
            <div class="form-card__actions">
              <button type="button" (click)="viewApp(a)">View</button>
              <button type="button" (click)="exportAppPdf(a)">PDF</button>
              <button type="button" (click)="exportAppExcel(a)">Excel</button>
            </div>
          </div>
          <dl class="form-card__data">
            <div><dt>Email</dt><dd>{{ a.email }}</dd></div>
            <div><dt>Phone</dt><dd>{{ a.phone }}</dd></div>
            <div><dt>Instagram</dt><dd>{{ a.instagram }}</dd></div>
            <div><dt>Height</dt><dd>{{ a.height }}</dd></div>
          </dl>
        </div>
      </section>

      <!-- BOOKINGS -->
      <section *ngIf="tab==='bookings'">
        <div class="forms-head">
          <div>
            <h3>Model booking enquiries ({{ bookings.length }})</h3>
            <p class="muted" *ngIf="!configured">
              Booking enquiries appear here once the backend is connected.
            </p>
          </div>
          <div class="forms-head__actions" *ngIf="bookings.length">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllBookingsPdf()">Download all PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllBookingsExcel()">Download all Excel</button>
          </div>
        </div>
        <p class="muted" *ngIf="configured && !bookings.length">No bookings yet.</p>
        <div class="form-card" *ngFor="let b of bookings">
          <div class="form-card__head">
            <div>
              <strong>{{ b.clientName }}</strong>
              <span class="form-card__meta">{{ b.createdAt || 'Just now' }}</span>
            </div>
            <div class="form-card__actions">
              <button type="button" (click)="viewBooking(b)">View</button>
              <button type="button" (click)="exportBookingPdf(b)">PDF</button>
              <button type="button" (click)="exportBookingExcel(b)">Excel</button>
            </div>
          </div>
          <dl class="form-card__data">
            <div><dt>Job</dt><dd>{{ b.jobType }}</dd></div>
            <div><dt>Dates</dt><dd>{{ b.dates }}</dd></div>
            <div><dt>Location</dt><dd>{{ b.location }}</dd></div>
            <div><dt>Email</dt><dd>{{ b.email }}</dd></div>
          </dl>
        </div>
      </section>

      <!-- SERVICES -->
      <section *ngIf="tab==='services'">
        <app-admin-services />
      </section>

      <!-- SUBSCRIBERS -->
      <section *ngIf="tab==='subscribers'">
        <app-admin-subscribers />
      </section>

      <div class="form-modal-backdrop" *ngIf="viewingForm" (click)="closeFormView()">
        <div class="form-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="form-modal__head">
            <div>
              <h4>{{ viewingForm.title }}</h4>
              <p>{{ viewingForm.submittedAt || 'Just now' }}</p>
            </div>
            <button type="button" class="form-modal__close" (click)="closeFormView()" aria-label="Close">×</button>
          </div>
          <dl class="form-modal__data">
            <div *ngFor="let entry of viewingForm.entries">
              <dt>{{ entry.label }}</dt>
              <dd>{{ entry.value }}</dd>
            </div>
          </dl>
          <div class="form-modal__actions">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportViewingPdf()">Download PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportViewingExcel()">Download Excel</button>
            <button type="button" class="btn btn--sm" (click)="closeFormView()">Close</button>
          </div>
        </div>
      </div>

      <div class="model-modal-backdrop" *ngIf="modelModalOpen" (click)="closeModelModal()">
        <form class="model-modal" role="dialog" aria-modal="true" (ngSubmit)="save()" (click)="$event.stopPropagation()">
          <div class="model-modal__head">
            <h3>{{ editing.id ? 'Edit model' : 'Add a model' }}</h3>
            <button type="button" class="model-modal__close" (click)="closeModelModal()" aria-label="Close">×</button>
          </div>

          <p class="section-label">Profile</p>
          <div class="grid3">
            <div class="field" [class.field--invalid]="fieldErrors['name']">
              <label>Name</label>
              <input name="name" [(ngModel)]="editing.name" required />
              <p class="field-error" *ngIf="fieldErrors['name']">{{ fieldErrors['name'] }}</p>
            </div>
            <div class="field" [class.field--invalid]="fieldErrors['branch']">
              <label>Division</label>
              <select name="branch" [(ngModel)]="editing.branch" required>
                <option value="women">Women</option>
                <option value="men">Men</option>
              </select>
              <p class="field-error" *ngIf="fieldErrors['branch']">{{ fieldErrors['branch'] }}</p>
            </div>
            <div class="field" [class.field--invalid]="fieldErrors['category']">
              <label>Category</label>
              <select name="category" [(ngModel)]="editing.category">
                <option value="">Main roster</option>
                <option *ngFor="let c of modelCategories" [value]="c.id">{{ c.name }}</option>
              </select>
              <p class="field-error" *ngIf="fieldErrors['category']">{{ fieldErrors['category'] }}</p>
            </div>
            <div class="field"><label>City</label><input name="city" [(ngModel)]="editing.city" /></div>
            <div class="field"><label>Height</label><input type="number" name="height" [(ngModel)]="editing.height" /></div>
            <div class="field"><label>Bust</label><input type="number" name="bust" [(ngModel)]="editing.bust" /></div>
            <div class="field"><label>Waist</label><input type="number" name="waist" [(ngModel)]="editing.waist" /></div>
            <div class="field"><label>Hips</label><input type="number" name="hips" [(ngModel)]="editing.hips" /></div>
            <div class="field"><label>Shoe</label><input type="number" name="shoeSize" [(ngModel)]="editing.shoeSize" /></div>
            <div class="field"><label>Hair</label><input name="hair" [(ngModel)]="editing.hair" /></div>
            <div class="field"><label>Eyes</label><input name="eyes" [(ngModel)]="editing.eyes" /></div>
            <div class="field"><label>Instagram</label><input name="ig" [(ngModel)]="editing.instagram" placeholder="@username" /></div>
          </div>

          <div class="field cover-field" [class.field--invalid]="fieldErrors['coverImage']">
            <label>Cover image (main profile photo)</label>
            <app-file-upload
              name="cover"
              [(ngModel)]="editing.coverImage"
              label="Upload cover photo"
              hint="Choose a photo from your computer or phone"
            />
            <p class="field-error" *ngIf="fieldErrors['coverImage']">{{ fieldErrors['coverImage'] }}</p>
          </div>

          <div class="field">
            <label>Profile gallery images</label>
            <p class="field-hint">Extra photos shown on the model profile page — separate from digitals.</p>
            <app-file-upload
              name="gallery"
              [(ngModel)]="editing.gallery"
              [multiple]="true"
              label="Upload gallery photos"
              hint="You can select multiple photos at once"
            />
          </div>

          <p class="section-label">Portfolio <span class="optional">(all optional)</span></p>
          <p class="hint">
            Each model can have their own digitals page, PDF composite, introduction video, and catwalk video.
            Leave blank to hide those links on the profile.
          </p>

          <div class="field">
            <label>Digitals images</label>
            <p class="field-hint" *ngIf="editing.name">
              Digitals page URL: <strong>/{{ digitalsSlug }}digitals</strong>
            </p>
            <app-file-upload
              name="digitals"
              [(ngModel)]="editing.digitals"
              [multiple]="true"
              label="Upload digitals"
              hint="Choose photos from your computer or phone"
            />
          </div>

          <div class="grid2">
            <div class="field">
              <label>PDF composite</label>
              <app-file-upload
                name="pdfUrl"
                [(ngModel)]="editing.pdfUrl"
                accept="pdf"
                label="Upload PDF"
                hint="Choose a PDF from your computer or phone"
              />
            </div>
            <div class="field">
              <label>Introduction video</label>
              <app-file-upload
                name="introVideo"
                [(ngModel)]="editing.introVideoUrl"
                accept="video"
                label="Upload introduction video"
                hint="MP4, MOV, or WebM — up to 100 MB"
              />
            </div>
            <div class="field">
              <label>Catwalk video</label>
              <app-file-upload
                name="catwalkVideo"
                [(ngModel)]="editing.catwalkVideoUrl"
                accept="video"
                label="Upload catwalk video"
                hint="MP4, MOV, or WebM — up to 100 MB"
              />
            </div>
          </div>

          <div class="checks">
            <label><input type="checkbox" name="oot" [(ngModel)]="editing.outOfTown" /> Out of town</label>
            <label><input type="checkbox" name="pub" [(ngModel)]="editing.published" /> Published (visible on site)</label>
          </div>

          <p class="form-error form-error--actions" *ngIf="formError">{{ formError }}</p>

          <div class="editor__actions">
            <button class="btn" type="submit">{{ editing.id ? 'Save changes' : 'Add model' }}</button>
            <button class="btn btn--ghost" type="button" (click)="closeModelModal()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .dash { padding: 40px 28px 60px; }
    .dash__top {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 36px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--line);
    }
    .dash__top h1 {
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 100;
      letter-spacing: 0.05em;
      margin-top: 8px;
    }
    .dash__tabs {
      display: flex; gap: 0;
      border-bottom: 1px solid var(--line);
      margin-bottom: 36px;
    }
    .dash__tabs button {
      background: none; border: 0;
      padding: 14px 22px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 10px;
      font-weight: 300;
      color: var(--ink-muted);
      border-bottom: 1px solid transparent;
      margin-bottom: -1px;
      transition: color 0.3s ease, border-color 0.3s ease;
    }
    .dash__tabs button.on { color: var(--accent); border-color: var(--accent); }
    .dash__tabs button:hover { color: var(--ink); }

    .models-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .models-head h3 {
      font-size: 18px;
      font-weight: 200;
      margin: 0;
    }

    .model-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0, 0, 0, 0.72);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 32px 24px;
      overflow-y: auto;
    }
    .model-modal {
      width: min(960px, 100%);
      background: var(--black-raised);
      border: 1px solid var(--line);
      padding: 32px;
      margin: auto 0;
    }
    .model-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .model-modal__head h3 {
      font-size: 22px;
      font-weight: 100;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .model-modal__close {
      background: none;
      border: 0;
      color: var(--ink-soft);
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }
    .model-modal__close:hover { color: var(--ink); }

    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 16px; }
    .section-label {
      margin: 28px 0 16px;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--ink-muted);
      font-weight: 300;
    }
    .section-label:first-of-type { margin-top: 0; }
    .optional { font-size: 10px; letter-spacing: 0.12em; opacity: 0.7; }
    .hint {
      font-size: 13px;
      font-weight: 200;
      color: var(--ink-muted);
      margin: -8px 0 20px;
      line-height: 1.6;
    }
    .field-hint {
      font-size: 12px;
      font-weight: 200;
      color: var(--ink-muted);
      margin: 0 0 10px;
      line-height: 1.5;
    }
    .field-hint strong { color: var(--ink-soft); font-weight: 300; }
    .cover-field { margin-top: 20px; }
    .checks {
      display: flex; gap: 32px;
      margin: 24px 0;
      font-size: 13px;
      font-weight: 200;
      color: var(--ink-soft);
    }
    .checks label { display: flex; gap: 8px; align-items: center; cursor: pointer; }
    .form-error--actions { margin: 0 0 16px; }
    .editor__actions { display: flex; gap: 14px; }

    .tbl { width: 100%; border-collapse: collapse; }
    .tbl th, .tbl td {
      text-align: left;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
      font-weight: 200;
    }
    .tbl th {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 9px;
      font-weight: 300;
      color: var(--ink-muted);
    }
    .row-actions button {
      background: none; border: 0; cursor: pointer;
      color: var(--ink-soft);
      margin-right: 16px;
      font-size: 12px;
      letter-spacing: 0.06em;
      transition: color 0.3s ease;
    }
    .row-actions button:hover { color: var(--accent); }
    .muted { color: var(--ink-muted); font-weight: 200; }
    .forms-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .forms-head h3 {
      font-size: 18px;
      font-weight: 200;
      margin: 0 0 8px;
    }
    .forms-head__actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn--sm { padding: 8px 14px; font-size: 9px; }
    .form-card {
      border: 1px solid var(--line);
      padding: 18px;
      margin-bottom: 12px;
    }
    .form-card__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }
    .form-card__head strong { display: block; font-size: 15px; font-weight: 300; }
    .form-card__meta {
      display: block;
      font-size: 11px;
      color: var(--ink-muted);
      margin-top: 4px;
    }
    .form-card__actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .form-card__actions button {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--ink-soft);
      font-size: 12px;
      letter-spacing: 0.06em;
    }
    .form-card__actions button:hover { color: var(--accent); }
    .form-card__data {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin: 0;
    }
    .form-card__data dt {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 4px;
    }
    .form-card__data dd { margin: 0; font-size: 13px; color: var(--ink-soft); }
    .form-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 200;
      background: rgba(0, 0, 0, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .form-modal {
      width: min(640px, 100%);
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      background: var(--black-raised);
      border: 1px solid var(--line);
      padding: 28px;
    }
    .form-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .form-modal__head h4 {
      margin: 0;
      font-size: 20px;
      font-weight: 200;
    }
    .form-modal__head p {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--ink-muted);
    }
    .form-modal__close {
      background: none;
      border: 0;
      color: var(--ink-soft);
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
    }
    .form-modal__data {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      margin: 0;
    }
    .form-modal__data dt {
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 6px;
    }
    .form-modal__data dd {
      margin: 0;
      font-size: 15px;
      color: var(--ink);
      font-weight: 300;
      word-break: break-word;
    }
    .form-modal__actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    @media (max-width: 760px) {
      .grid3, .grid2 { grid-template-columns: 1fr; }
      .tbl { display: block; overflow-x: auto; }
      .dash__tabs { flex-wrap: wrap; }
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  tab: 'models' | 'categories' | 'apps' | 'bookings' | 'subscribers' | 'services' = 'models';
  models: Model[] = [];
  categories: ModelCategory[] = [];
  apps: ModelApplication[] = [];
  bookings: Booking[] = [];
  editing: Model = this.blank();
  configured = false;
  viewingForm: FormRecord | null = null;
  modelModalOpen = false;
  formError = '';
  fieldErrors: Record<string, string> = {};

  constructor(
    private modelsSvc: ModelsService,
    private categoriesSvc: CategoriesService,
    private subs: SubmissionsService,
    private auth: AuthService,
    private router: Router,
    api: ApiService,
  ) {
    this.configured = api.useApi;
  }

  async ngOnInit() {
    await this.refresh();
    await this.refreshCategories();
    this.apps = await this.subs.listApplications();
    this.bookings = await this.subs.listBookings();
  }

  async setTab(tab: typeof this.tab) {
    this.tab = tab;
    if (tab === 'models' || tab === 'categories') {
      await this.refreshCategories();
    }
  }

  private async refreshCategories() {
    this.categories = await this.categoriesSvc.listAll();
  }

  categoryName(id: string): string {
    return this.categoriesSvc.nameFor(id, this.categories);
  }

  get modelCategories(): ModelCategory[] {
    return subCategories(this.categories);
  }

  branchName(branch: string): string {
    return branch === 'men' ? 'Men' : 'Women';
  }

  modelCategoryLabel(m: Model): string {
    if (!m.category || isBranchCategory(m.category)) return 'Main roster';
    return this.categoryName(m.category);
  }

  private blank(): Model {
    return {
      id: '', name: '', branch: 'women', category: '', outOfTown: false,
      published: true, coverImage: '',
      gallery: [], digitals: [],
    };
  }

  async refresh() {
    this.models = await this.modelsSvc.listAll();
  }

  async openAddModel() {
    await this.refreshCategories();
    this.clearFormErrors();
    this.resetEditor();
    this.modelModalOpen = true;
  }

  async edit(m: Model) {
    await this.refreshCategories();
    this.clearFormErrors();
    const branch = m.branch ?? (m.category === 'men' ? 'men' : 'women');
    const category = !m.category || m.category === 'men' || m.category === 'women' ? '' : m.category;
    this.editing = { ...m, branch, category, digitals: m.digitals || [], gallery: m.gallery || [] };
    this.modelModalOpen = true;
  }

  closeModelModal() {
    this.modelModalOpen = false;
    this.clearFormErrors();
    this.resetEditor();
  }

  resetEditor() {
    this.editing = this.blank();
  }

  private clearFormErrors() {
    this.formError = '';
    this.fieldErrors = {};
  }

  get digitalsSlug(): string {
    return this.editing.name ? digitalsNameSlug(this.editing.name) : '';
  }

  private validateModel(): boolean {
    this.fieldErrors = {};
    const missing: string[] = [];

    if (!this.editing.name?.trim()) {
      this.fieldErrors['name'] = 'Name is required.';
      missing.push('Name');
    }
    if (!this.editing.branch) {
      this.fieldErrors['branch'] = 'Division is required.';
      missing.push('Division');
    }
    if (!this.editing.coverImage) {
      this.fieldErrors['coverImage'] = 'Cover image is required.';
      missing.push('Cover image');
    }

    if (missing.length) {
      this.formError = `Please fill in the missing fields: ${missing.join(', ')}.`;
      return false;
    }

    this.formError = '';
    return true;
  }

  async save() {
    if (!this.validateModel()) return;
    this.editing.gallery = this.editing.gallery || [];
    this.editing.digitals = this.editing.digitals || [];
    if (!this.editing.category || isBranchCategory(this.editing.category)) {
      this.editing.category = '';
    }
    if (!this.editing.pdfUrl?.trim()) this.editing.pdfUrl = undefined;
    if (!this.editing.introVideoUrl?.trim()) this.editing.introVideoUrl = undefined;
    if (!this.editing.catwalkVideoUrl?.trim()) this.editing.catwalkVideoUrl = undefined;

    if (this.editing.id) {
      await this.modelsSvc.update(this.editing);
    } else {
      this.editing.id = this.categoriesSvc.slugFromName(this.editing.name);
      if (!this.editing.gallery?.length) this.editing.gallery = [];
      await this.modelsSvc.create(this.editing);
    }
    this.closeModelModal();
    await this.refresh();
  }

  async del(m: Model) {
    if (!confirm(`Delete ${m.name}?`)) return;
    await this.modelsSvc.remove(m.id);
    await this.refresh();
  }

  viewApp(app: ModelApplication) {
    this.viewingForm = applicationToRecord(app);
  }

  viewBooking(booking: Booking) {
    this.viewingForm = bookingToRecord(booking);
  }

  closeFormView() {
    this.viewingForm = null;
  }

  exportViewingPdf() {
    if (this.viewingForm) downloadFormPdf(this.viewingForm);
  }

  exportViewingExcel() {
    if (this.viewingForm) downloadFormExcel(this.viewingForm);
  }

  exportAppPdf(app: ModelApplication) {
    downloadFormPdf(applicationToRecord(app));
  }

  exportAppExcel(app: ModelApplication) {
    downloadFormExcel(applicationToRecord(app));
  }

  exportBookingPdf(booking: Booking) {
    downloadFormPdf(bookingToRecord(booking));
  }

  exportBookingExcel(booking: Booking) {
    downloadFormExcel(bookingToRecord(booking));
  }

  exportAllAppsPdf() {
    downloadAllFormsPdf(this.apps.map(applicationToRecord), 'model-applications-all');
  }

  exportAllAppsExcel() {
    downloadAllFormsExcel(this.apps.map(applicationToRecord), 'model-applications-all');
  }

  exportAllBookingsPdf() {
    downloadAllFormsPdf(this.bookings.map(bookingToRecord), 'model-bookings-all');
  }

  exportAllBookingsExcel() {
    downloadAllFormsExcel(this.bookings.map(bookingToRecord), 'model-bookings-all');
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/']);
  }

}
