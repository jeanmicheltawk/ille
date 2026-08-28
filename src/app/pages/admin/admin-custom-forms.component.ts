import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CustomForm, CustomFormSubmission } from '../../core/models.types';
import { CustomFormsService } from '../../core/custom-forms.service';
import { displayTitleFromData } from '../../core/form-field.util';
import {
  customFormSubmissionToRecord,
  downloadAllFormsExcel,
  downloadAllFormsPdf,
  downloadFormExcel,
  downloadFormPdf,
  FormRecord,
} from '../../core/submission-export.util';
import { ToastService } from '../../shared/toast.service';
import { FormEntryValueComponent } from '../../shared/form-entry-value.component';
import { AdminSiteFormEditorComponent } from './admin-site-form-editor.component';

@Component({
  selector: 'app-admin-custom-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSiteFormEditorComponent, FormEntryValueComponent],
  template: `
    <div class="forms-admin">
      <nav class="dash__subtabs">
        <button type="button" [class.on]="subTab==='pages'" (click)="subTab='pages'">
          Form pages ({{ forms.length }})
        </button>
        <button type="button" [class.on]="subTab==='submissions'" (click)="subTab='submissions'">
          Submissions ({{ submissions.length }})
        </button>
      </nav>

      <ng-container *ngIf="subTab==='pages'">
        <div class="intro">
          <h2>Form pages</h2>
          <p>
            Create a new form with its own title, questions, and URL.
            Turn on <strong>Show in menu</strong> to add it to the site header, or leave it off and share the link privately.
          </p>
        </div>

        <div class="forms-admin__grid">
          <aside class="list-panel">
            <div class="list-panel__head">
              <span>All forms ({{ forms.length }})</span>
              <button type="button" class="btn btn--ghost btn--sm" (click)="startNew()">+ New</button>
            </div>
            <p class="list-empty" *ngIf="!forms.length">No custom forms yet.</p>
            <div class="list-item" *ngFor="let form of forms"
                 [class.list-item--active]="!isNew && savedId === form.id"
                 (click)="edit(form)">
              <div class="list-item__top">
                <span class="list-item__slug">/forms/{{ form.id }}</span>
                <span class="list-item__badge" *ngIf="form.showInMenu">Menu</span>
                <span class="list-item__badge list-item__badge--hide" *ngIf="!form.published">Hidden</span>
              </div>
              <strong>{{ form.title }}</strong>
            </div>
          </aside>

          <div class="editor-panel">
            <p class="action-feedback" *ngIf="actionMessage" [class.action-feedback--error]="actionKind === 'error'">
              {{ actionMessage }}
            </p>
            <form (ngSubmit)="save()">
              <div class="editor-panel__head">
                <h3>{{ isNew ? 'Create a form' : 'Edit: ' + editing.title }}</h3>
                <button type="button" class="btn btn--ghost btn--sm" *ngIf="!isNew" (click)="startNew()">Cancel</button>
              </div>

              <div class="grid2">
                <div class="field" [class.field--invalid]="fieldErrors['title']">
                  <label>Title <span class="tip">Page heading and menu label</span></label>
                  <input name="title" [(ngModel)]="editing.title" required placeholder="e.g. Workshop signup"
                         (ngModelChange)="onTitleChange()" />
                  <p class="field-error" *ngIf="fieldErrors['title']">{{ fieldErrors['title'] }}</p>
                </div>
                <div class="field" [class.field--invalid]="fieldErrors['id']">
                  <label>Page URL <span class="tip">Visitors open /forms/{{ editing.id || 'your-url' }}</span></label>
                  <input name="slug" [(ngModel)]="editing.id" required placeholder="e.g. workshop-signup"
                         (ngModelChange)="slugTouched = true" />
                  <p class="field-error" *ngIf="fieldErrors['id']">{{ fieldErrors['id'] }}</p>
                </div>
              </div>

              <div class="url-preview">
                <span>{{ pageUrl }}</span>
                <button type="button" class="link-btn" *ngIf="editing.id" (click)="copyUrl()">Copy link</button>
              </div>

              <label class="toggle">
                <input type="checkbox" name="menu" [(ngModel)]="editing.showInMenu" />
                <span>
                  <strong>Show in menu</strong>
                  <em>Adds this form to the header and footer. Turn off to keep a private URL only.</em>
                </span>
              </label>
              <label class="toggle">
                <input type="checkbox" name="pub" [(ngModel)]="editing.published" />
                <span>
                  <strong>Published</strong>
                  <em>Turn off to hide the page without deleting it.</em>
                </span>
              </label>

              <ng-container *ngFor="let tick of [editorTick]">
                <app-admin-site-form-editor
                  #formEditor
                  [boundConfig]="editing"
                  title="Form questions"
                  [showRules]="true"
                  [allowFile]="true"
                />
              </ng-container>

              <p class="form-error" *ngIf="error">{{ error }}</p>
              <div class="save-bar">
                <button class="btn" type="submit" [disabled]="saving">
                  {{ saving ? 'Saving…' : (isNew ? 'Create form' : 'Save changes') }}
                </button>
                <button class="btn btn--ghost" type="button" *ngIf="!isNew" (click)="remove()">Delete</button>
              </div>
            </form>
          </div>
        </div>
      </ng-container>

      <section class="subs" *ngIf="subTab==='submissions'">
        <div class="subs__head">
          <div>
            <h3>Form submissions ({{ submissions.length }})</h3>
            <p class="subs__hint">Answers from custom form pages appear here with the form title attached.</p>
          </div>
          <div class="subs__bulk" *ngIf="submissions.length">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllPdf()">Download all PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportAllExcel()">Download all Excel</button>
          </div>
        </div>
        <p class="muted" *ngIf="!submissions.length">No submissions yet.</p>
        <div class="sub-card" *ngFor="let sub of submissions">
          <div class="sub-card__head">
            <div>
              <strong>{{ submissionTitle(sub) }}</strong>
              <span class="sub-card__meta">{{ sub.formTitle }} · {{ sub.createdAt || 'Just now' }}</span>
            </div>
            <div class="sub-card__actions">
              <button type="button" (click)="viewSubmission(sub)">View</button>
              <button type="button" (click)="exportPdf(sub)">PDF</button>
              <button type="button" (click)="exportExcel(sub)">Excel</button>
            </div>
          </div>
        </div>
      </section>

      <div class="sub-modal-backdrop" *ngIf="viewing" (click)="closeView()">
        <div class="sub-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="sub-modal__head">
            <div>
              <h4>{{ viewing.title }}</h4>
              <p>{{ viewing.submittedAt || 'Just now' }}</p>
            </div>
            <button type="button" class="sub-modal__close" (click)="closeView()" aria-label="Close">×</button>
          </div>
          <dl class="sub-modal__data">
            <div *ngFor="let entry of viewing.entries">
              <dt>{{ entry.label }}</dt>
              <dd><app-form-entry-value [value]="entry.value" /></dd>
            </div>
          </dl>
          <div class="sub-modal__actions">
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportViewingPdf()">Download PDF</button>
            <button type="button" class="btn btn--ghost btn--sm" (click)="exportViewingExcel()">Download Excel</button>
            <button type="button" class="btn btn--sm" (click)="closeView()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .forms-admin { max-width: 1200px; }
    .dash__subtabs {
      display: flex; gap: 0; margin: 0 0 28px;
      border-bottom: 1px solid var(--line);
    }
    .dash__subtabs button {
      background: none; border: 0; padding: 10px 18px; cursor: pointer;
      text-transform: uppercase; letter-spacing: 0.14em; font-size: 10px;
      font-weight: 300; color: var(--ink-muted);
      border-bottom: 1px solid transparent; margin-bottom: -1px;
    }
    .dash__subtabs button.on { color: var(--ink); border-color: var(--ink-soft); }
    .intro { margin-bottom: 28px; }
    .intro h2 { font-size: 20px; font-weight: 200; margin: 0 0 8px; }
    .intro p { font-size: 14px; color: var(--ink-soft); margin: 0; font-weight: 200; line-height: 1.6; }
    .forms-admin__grid {
      display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start;
    }
    .list-panel {
      border: 1px solid var(--line); position: sticky; top: 100px;
      max-height: calc(100vh - 140px); overflow-y: auto;
    }
    .list-panel__head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px; border-bottom: 1px solid var(--line);
      font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted);
    }
    .list-empty { padding: 20px 16px; font-size: 13px; color: var(--ink-muted); margin: 0; }
    .list-item {
      padding: 14px 16px; border-bottom: 1px solid var(--line); cursor: pointer;
    }
    .list-item:hover { background: rgba(255,255,255,0.02); }
    .list-item--active { background: rgba(255,255,255,0.04); }
    .list-item__top { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
    .list-item__slug { font-size: 10px; letter-spacing: 0.1em; color: var(--ink-muted); }
    .list-item__badge {
      font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent);
    }
    .list-item__badge--hide { color: var(--ink-muted); }
    .list-item strong { display: block; font-size: 14px; font-weight: 300; }
    .editor-panel { border: 1px solid var(--line); padding: 24px; }
    .action-feedback {
      margin: 0 0 16px; border: 1px solid var(--line); padding: 12px 14px;
      font-size: 12px; color: var(--ink-soft);
    }
    .action-feedback--error {
      color: var(--error); border-color: rgba(255, 82, 82, 0.5);
    }
    .editor-panel__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--line);
    }
    .editor-panel__head h3 { margin: 0; font-size: 18px; font-weight: 200; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .tip {
      display: block; font-size: 11px; letter-spacing: 0.04em; text-transform: none;
      color: var(--ink-muted); margin-top: 4px; font-weight: 200;
    }
    .url-preview {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      margin: -8px 0 20px; font-size: 12px; color: var(--ink-muted); font-weight: 200;
    }
    .link-btn {
      background: none; border: 0; cursor: pointer; color: var(--accent);
      font-size: 12px; letter-spacing: 0.06em; font-family: inherit; padding: 0;
    }
    .toggle {
      display: flex; gap: 12px; align-items: flex-start; margin: 16px 0; cursor: pointer; font-size: 13px;
    }
    .toggle strong { display: block; font-weight: 300; margin-bottom: 4px; }
    .toggle em { display: block; font-size: 12px; font-style: normal; color: var(--ink-muted); font-weight: 200; }
    .save-bar {
      display: flex; gap: 12px; flex-wrap: wrap; padding-top: 20px; border-top: 1px solid var(--line);
    }
    .btn--sm { padding: 8px 14px; font-size: 9px; }
    .form-error { color: var(--error); font-size: 13px; margin: 0 0 16px; }
    .muted { color: var(--ink-muted); font-weight: 200; }
    .subs__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      margin-bottom: 24px; flex-wrap: wrap;
    }
    .subs__head h3 { font-size: 18px; font-weight: 200; margin: 0 0 8px; }
    .subs__hint { margin: 0; font-size: 13px; color: var(--ink-muted); font-weight: 200; }
    .subs__bulk { display: flex; gap: 8px; flex-wrap: wrap; }
    .sub-card { border: 1px solid var(--line); padding: 18px; margin-bottom: 12px; }
    .sub-card__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    }
    .sub-card__head strong { display: block; font-size: 15px; font-weight: 300; }
    .sub-card__meta { display: block; font-size: 11px; color: var(--ink-muted); margin-top: 4px; }
    .sub-card__actions { display: flex; gap: 12px; }
    .sub-card__actions button {
      background: none; border: 0; cursor: pointer; color: var(--ink-soft);
      font-size: 12px; letter-spacing: 0.06em; font-family: inherit;
    }
    .sub-card__actions button:hover { color: var(--accent); }
    .sub-modal-backdrop {
      position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.72);
      display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .sub-modal {
      width: min(640px, 100%); max-height: calc(100vh - 48px); overflow-y: auto;
      background: var(--black-raised); border: 1px solid var(--line); padding: 28px;
    }
    .sub-modal__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--line);
    }
    .sub-modal__head h4 { margin: 0; font-size: 20px; font-weight: 200; }
    .sub-modal__head p { margin: 6px 0 0; font-size: 12px; color: var(--ink-muted); }
    .sub-modal__close {
      background: none; border: 0; color: var(--ink-soft); font-size: 28px; cursor: pointer;
    }
    .sub-modal__data { display: grid; gap: 18px; margin: 0; }
    .sub-modal__data dt {
      font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 6px;
    }
    .sub-modal__data dd { margin: 0; font-size: 15px; color: var(--ink); font-weight: 300; word-break: break-word; }
    .sub-modal__actions {
      display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    @media (max-width: 860px) {
      .forms-admin__grid, .grid2 { grid-template-columns: 1fr; }
      .list-panel { position: static; max-height: none; }
    }
  `],
})
export class AdminCustomFormsComponent implements OnInit {
  @ViewChild('formEditor') editor?: AdminSiteFormEditorComponent;

  subTab: 'pages' | 'submissions' = 'pages';
  forms: CustomForm[] = [];
  submissions: CustomFormSubmission[] = [];
  editing: CustomForm = this.blank();
  isNew = true;
  savedId = '';
  slugTouched = false;
  editorTick = 0;
  saving = false;
  error = '';
  fieldErrors: Record<string, string> = {};
  actionMessage = '';
  actionKind: 'success' | 'error' = 'success';
  viewing: FormRecord | null = null;

  constructor(private customForms: CustomFormsService) {}

  private toast = inject(ToastService);

  async ngOnInit() {
    await this.refresh();
  }

  get pageUrl(): string {
    const slug = this.editing.id || 'your-url';
    return `/forms/${slug}`;
  }

  startNew() {
    this.editing = this.blank();
    this.isNew = true;
    this.savedId = '';
    this.slugTouched = false;
    this.error = '';
    this.fieldErrors = {};
    this.editorTick++;
  }

  edit(form: CustomForm) {
    this.editing = this.customForms.clone(form);
    this.isNew = false;
    this.savedId = form.id;
    this.slugTouched = true;
    this.error = '';
    this.fieldErrors = {};
    this.editorTick++;
  }

  onTitleChange() {
    if (this.isNew && !this.slugTouched) {
      this.editing.id = this.customForms.slugFromTitle(this.editing.title);
    }
  }

  async copyUrl() {
    const url = `${window.location.origin}${this.customForms.pageUrl(this.editing.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      this.setActionMessage('Link copied.');
    } catch {
      this.setActionMessage('Could not copy link.', 'error');
    }
  }

  async save() {
    this.editor?.flushToBound();
    this.fieldErrors = {};
    this.error = '';
    if (!this.editing.title?.trim()) {
      this.fieldErrors['title'] = 'Title is required.';
    }
    const slug = this.customForms.slugFromTitle(this.editing.id || this.editing.title);
    if (!slug || slug.length < 2) {
      this.fieldErrors['id'] = 'Choose a URL of at least 2 characters.';
    }
    if (Object.keys(this.fieldErrors).length) {
      this.error = 'Please fill in the missing fields.';
      return;
    }
    this.editing.id = slug;
    this.saving = true;
    try {
      if (this.isNew) {
        this.editing.sortOrder = this.forms.length;
        await this.customForms.create(this.editing);
        this.setActionMessage('Form created. The page is live at ' + this.customForms.pageUrl(this.editing) + '.');
      } else {
        await this.customForms.update(this.savedId, this.editing);
        this.setActionMessage('Form saved.');
      }
      await this.refresh();
      this.edit(this.forms.find((form) => form.id === this.editing.id) || this.editing);
    } catch (err: unknown) {
      this.error = this.getErrorMessage(err);
      this.setActionMessage(this.error, 'error');
    } finally {
      this.saving = false;
    }
  }

  async remove() {
    if (this.isNew || !this.savedId) return;
    if (!confirm(`Delete "${this.editing.title}"? Submissions for this form will also be removed.`)) return;
    try {
      await this.customForms.remove(this.savedId);
      this.setActionMessage('Form deleted.');
      await this.refresh();
      this.startNew();
    } catch (err: unknown) {
      this.setActionMessage(this.getErrorMessage(err), 'error');
    }
  }

  submissionTitle(sub: CustomFormSubmission): string {
    return displayTitleFromData(sub.data, sub.formTitle);
  }

  viewSubmission(sub: CustomFormSubmission) {
    this.viewing = this.toRecord(sub);
  }

  closeView() {
    this.viewing = null;
  }

  exportPdf(sub: CustomFormSubmission) {
    downloadFormPdf(this.toRecord(sub));
  }

  exportExcel(sub: CustomFormSubmission) {
    downloadFormExcel(this.toRecord(sub));
  }

  exportViewingPdf() {
    if (this.viewing) downloadFormPdf(this.viewing);
  }

  exportViewingExcel() {
    if (this.viewing) downloadFormExcel(this.viewing);
  }

  exportAllPdf() {
    downloadAllFormsPdf(this.submissions.map((sub) => this.toRecord(sub)), 'custom-forms-all');
  }

  exportAllExcel() {
    downloadAllFormsExcel(this.submissions.map((sub) => this.toRecord(sub)), 'custom-forms-all');
  }

  private toRecord(sub: CustomFormSubmission): FormRecord {
    const form = this.forms.find((item) => item.id === sub.formId);
    return customFormSubmissionToRecord(sub, form?.formFields);
  }

  private blank(): CustomForm {
    return this.customForms.blank(this.forms.length);
  }

  private async refresh() {
    this.forms = await this.customForms.listAll();
    this.submissions = await this.customForms.listSubmissions();
  }

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
      if (err.status === 0) return 'Could not reach the server. Check your connection and try again.';
      if (err.status === 401) return 'Session expired. Please sign in again.';
    }
    if (err instanceof Error && err.message.trim()) return err.message.trim();
    return 'Could not save form. Please try again.';
  }
}
