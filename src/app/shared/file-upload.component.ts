import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UploadService } from '../core/upload.service';

export type FileUploadAccept = 'image' | 'pdf';

/**
 * Device file picker with preview. Works on desktop and mobile —
 * the native chooser offers gallery, camera, or files as available.
 */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FileUploadComponent),
    multi: true,
  }],
  template: `
    <div class="file-upload" [class.file-upload--multi]="multiple">
      <div class="file-upload__previews" *ngIf="previewUrls.length">
        <figure class="file-upload__item" *ngFor="let url of previewUrls; let i = index">
          <img *ngIf="accept === 'image'" [src]="url" alt="" />
          <span *ngIf="accept === 'pdf'" class="file-upload__doc">PDF uploaded</span>
          <button type="button" class="file-upload__remove" (click)="remove(i)" aria-label="Remove">×</button>
        </figure>
      </div>

      <label class="file-upload__zone">
        <input
          type="file"
          [accept]="acceptAttr"
          [multiple]="multiple"
          (change)="onPick($event)"
        />
        <span class="file-upload__label">{{ label }}</span>
        <span class="file-upload__hint">{{ hint }}</span>
      </label>

      <p class="file-upload__status" *ngIf="uploading">Uploading…</p>
      <p class="file-upload__status file-upload__status--err" *ngIf="error">{{ error }}</p>
    </div>
  `,
  styles: [`
    .file-upload { display: flex; flex-direction: column; gap: 12px; }
    .file-upload__previews {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .file-upload__item {
      position: relative;
      margin: 0;
      width: 88px;
      height: 110px;
      border: 1px solid var(--line);
      overflow: hidden;
    }
    .file-upload__item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .file-upload__doc {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 8px;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
      color: var(--ink-muted);
    }
    .file-upload__remove {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border: none;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
    .file-upload__zone {
      display: block;
      position: relative;
      border: 1px dashed var(--line);
      padding: 22px 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.3s ease;
    }
    .file-upload__zone:hover { border-color: var(--accent); }
    .file-upload__zone input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }
    .file-upload__label {
      display: block;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink);
      font-weight: 300;
    }
    .file-upload__hint {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      color: var(--ink-muted);
      font-weight: 200;
      letter-spacing: 0.04em;
    }
    .file-upload__status {
      margin: 0;
      font-size: 12px;
      color: var(--ink-muted);
    }
    .file-upload__status--err { color: var(--error); }
    .file-upload--multi .file-upload__item { width: 72px; height: 90px; }
  `],
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() accept: FileUploadAccept = 'image';
  @Input() multiple = false;
  @Input() label = 'Upload from device';
  @Input() hint = 'Choose a file from your computer or phone';

  uploading = false;
  error = '';
  private value: string | string[] = '';
  private onChange: (v: string | string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private uploadSvc: UploadService) {}

  get acceptAttr(): string {
    return this.accept === 'pdf' ? 'application/pdf,.pdf' : 'image/*';
  }

  get previewUrls(): string[] {
    if (this.multiple) return Array.isArray(this.value) ? this.value : [];
    return typeof this.value === 'string' && this.value ? [this.value] : [];
  }

  writeValue(v: string | string[] | null): void {
    this.value = v ?? (this.multiple ? [] : '');
  }

  registerOnChange(fn: (v: string | string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  async onPick(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!files.length) return;

    this.error = '';
    this.uploading = true;
    this.onTouched();
    try {
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await this.uploadSvc.upload(file));
      }
      if (this.multiple) {
        const current = Array.isArray(this.value) ? this.value : [];
        this.value = [...current, ...urls];
      } else {
        this.value = urls[0];
      }
      this.onChange(this.value);
    } catch (e: unknown) {
      const err = e as { error?: { error?: string }; message?: string };
      this.error = err?.error?.error ?? err?.message ?? 'Upload failed. Please try again.';
    } finally {
      this.uploading = false;
    }
  }

  remove(index: number) {
    if (this.multiple) {
      const current = Array.isArray(this.value) ? [...this.value] : [];
      current.splice(index, 1);
      this.value = current;
    } else {
      this.value = '';
    }
    this.onChange(this.value);
    this.onTouched();
  }
}
