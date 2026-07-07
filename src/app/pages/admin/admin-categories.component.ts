import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriesService } from '../../core/categories.service';
import { ModelCategory } from '../../core/models.types';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cat-admin">
      <div class="intro">
        <h2>Model categories</h2>
        <p>
          Manage divisions (Women, Men) and sub-categories (New Faces, etc.) shown on the
          <strong>/models</strong> page. Each model belongs to one division and optionally one sub-category.
        </p>
      </div>

      <div class="cat-admin__grid">
        <aside class="list-panel">
          <div class="list-panel__head">
            <span>All categories ({{ categories.length }})</span>
            <button type="button" class="btn btn--ghost btn--sm" (click)="startNew()">+ New</button>
          </div>

          <div class="list-item" *ngFor="let c of categories"
               [class.list-item--active]="editing.id === c.id"
               (click)="edit(c)">
            <div class="list-item__top">
              <span class="list-item__slug">/{{ c.id }}</span>
              <span class="list-item__badge list-item__badge--hide" *ngIf="!c.published">Hidden</span>
            </div>
            <strong>{{ c.name }}</strong>
          </div>
        </aside>

        <div class="editor-panel">
          <p class="action-feedback" *ngIf="actionMessage" [class.action-feedback--error]="actionKind === 'error'">
            {{ actionMessage }}
          </p>
          <form (ngSubmit)="save()">
            <div class="editor-panel__head">
              <h3>{{ editing.id && !isNew ? 'Edit: ' + editing.name : 'Create category' }}</h3>
              <button type="button" class="btn btn--ghost btn--sm" *ngIf="editing.id" (click)="startNew()">Cancel</button>
            </div>

            <p class="form-error" *ngIf="error">{{ error }}</p>

            <div class="field" [class.field--invalid]="fieldErrors['name']">
              <label>Name <span class="tip">Shown in navigation and filters</span></label>
              <input name="name" [(ngModel)]="editing.name" required placeholder="e.g. Women" (ngModelChange)="onNameChange()" />
              <p class="field-error" *ngIf="fieldErrors['name']">{{ fieldErrors['name'] }}</p>
            </div>

            <div class="field" [class.field--invalid]="fieldErrors['slug']">
              <label>URL slug <span class="tip">Used in links: /models/men/{{ editing.id || 'slug' }} or /models/women/{{ editing.id || 'slug' }}</span></label>
              <input name="slug" [(ngModel)]="editing.id" required placeholder="e.g. women"
                     [readonly]="!isNew && !!editing.id" (ngModelChange)="slugTouched = true" />
              <p class="field-error" *ngIf="fieldErrors['slug']">{{ fieldErrors['slug'] }}</p>
            </div>

            <div class="field">
              <label>Display order <span class="tip">Lower numbers appear first</span></label>
              <input type="number" name="sort" [(ngModel)]="editing.sortOrder" />
            </div>

            <label class="toggle">
              <input type="checkbox" name="pub" [(ngModel)]="editing.published" />
              <span>
                <strong>Visible on website</strong>
                <em>Turn off to hide from navigation without deleting</em>
              </span>
            </label>

            <div class="save-bar">
              <button class="btn" type="submit">
                {{ isNew ? 'Create category' : 'Save changes' }}
              </button>
              <button class="btn btn--ghost" type="button" *ngIf="editing.id && !isNew" (click)="remove()">Delete</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cat-admin__grid {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 28px;
      align-items: start;
    }
    .intro { margin-bottom: 28px; }
    .intro h2 {
      font-size: 22px;
      font-weight: 100;
      letter-spacing: 0.04em;
      margin: 0 0 10px;
    }
    .intro p {
      margin: 0;
      font-size: 14px;
      font-weight: 200;
      color: var(--ink-muted);
      line-height: 1.6;
    }
    .list-panel {
      border: 1px solid var(--line);
      background: var(--black-raised);
    }
    .list-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
    }
    .list-item {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .list-item:hover { background: rgba(255,255,255,0.02); }
    .list-item--active { background: rgba(255,255,255,0.04); }
    .list-item__top {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }
    .list-item__slug {
      font-size: 10px;
      letter-spacing: 0.1em;
      color: var(--ink-muted);
      text-transform: lowercase;
    }
    .list-item__badge {
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .list-item__badge--hide { color: var(--ink-muted); }
    .list-item strong {
      display: block;
      font-size: 14px;
      font-weight: 300;
    }
    .editor-panel {
      border: 1px solid var(--line);
      background: var(--black-raised);
      padding: 24px;
    }
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
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--line);
    }
    .editor-panel__head h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 200;
    }
    .field { margin-bottom: 20px; }
    .field label {
      display: block;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 8px;
    }
    .tip {
      display: block;
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: none;
      color: var(--ink-muted);
      opacity: 0.85;
      margin-top: 4px;
      font-weight: 200;
    }
    .toggle {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin: 24px 0;
      cursor: pointer;
      font-size: 13px;
    }
    .toggle strong { display: block; font-weight: 300; margin-bottom: 4px; }
    .toggle em {
      display: block;
      font-size: 12px;
      font-style: normal;
      color: var(--ink-muted);
      font-weight: 200;
    }
    .save-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 20px;
      border-top: 1px solid var(--line);
    }
    .btn--sm { padding: 8px 14px; font-size: 9px; }
    .error {
      margin: 16px 0 0;
      color: #e88;
      font-size: 13px;
      font-weight: 200;
    }
    @media (max-width: 860px) {
      .cat-admin__grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminCategoriesComponent implements OnInit {
  categories: ModelCategory[] = [];
  editing: ModelCategory = this.blank();
  isNew = true;
  error = '';
  fieldErrors: Record<string, string> = {};
  slugTouched = false;
  actionMessage = '';
  actionKind: 'success' | 'error' = 'success';

  constructor(private categoriesSvc: CategoriesService) {}

  async ngOnInit() {
    await this.refresh();
    if (this.categories.length) this.edit(this.categories[0]);
    else this.startNew();
  }

  blank(): ModelCategory {
    return this.categoriesSvc.blank();
  }

  async refresh() {
    this.categories = await this.categoriesSvc.listAll();
  }

  startNew() {
    this.editing = this.blank();
    this.isNew = true;
    this.error = '';
    this.fieldErrors = {};
    this.slugTouched = false;
  }

  edit(c: ModelCategory) {
    this.editing = { ...c };
    this.isNew = false;
    this.error = '';
    this.fieldErrors = {};
    this.slugTouched = true;
  }

  onNameChange() {
    if (!this.slugTouched && this.isNew) {
      this.editing.id = this.categoriesSvc.slugFromName(this.editing.name);
    }
  }

  private validate(): boolean {
    this.fieldErrors = {};
    const missing: string[] = [];

    if (!this.editing.name?.trim()) {
      this.fieldErrors['name'] = 'Name is required.';
      missing.push('Name');
    }
    if (!this.editing.id?.trim()) {
      this.fieldErrors['slug'] = 'URL slug is required.';
      missing.push('URL slug');
    }

    if (missing.length) {
      this.error = `Please fill in the missing fields: ${missing.join(', ')}.`;
      return false;
    }

    return true;
  }

  async save() {
    this.error = '';
    if (!this.validate()) return;
    const wasNew = this.isNew;
    const actionLabel = this.isNew ? 'create this category' : 'save changes to this category';
    if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;

    const id = this.categoriesSvc.slugFromName(this.editing.id || this.editing.name);
    if (!id) {
      this.fieldErrors['slug'] = 'Please enter a valid URL slug.';
      this.error = 'Please enter a valid name and slug.';
      return;
    }

    const payload: ModelCategory = { ...this.editing, id };

    try {
      if (this.isNew) {
        if (this.categories.some((c) => c.id === id)) {
          this.error = 'A category with this slug already exists.';
          return;
        }
        await this.categoriesSvc.create(payload);
      } else {
        await this.categoriesSvc.update(payload);
      }
      await this.refresh();
      const saved = this.categories.find((c) => c.id === id);
      if (saved) this.edit(saved);
      this.isNew = false;
      this.setActionMessage(wasNew ? 'Category created successfully.' : 'Category updated successfully.');
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Could not save category.';
      this.setActionMessage(this.error, 'error');
    }
  }

  async remove() {
    if (!this.editing.id || !confirm(`Delete category "${this.editing.name}"?`)) return;
    this.error = '';
    try {
      await this.categoriesSvc.remove(this.editing.id);
      await this.refresh();
      if (this.categories.length) this.edit(this.categories[0]);
      else this.startNew();
      this.setActionMessage('Category deleted successfully.');
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Could not delete — models may still use this category.';
      this.setActionMessage(this.error, 'error');
    }
  }

  private setActionMessage(message: string, kind: 'success' | 'error' = 'success') {
    this.actionMessage = message;
    this.actionKind = kind;
  }
}
