import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UploadService } from '../core/upload.service';
import { mediaUrl } from '../core/media-url.util';

export type FileUploadAccept = 'image' | 'pdf' | 'video';

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
      <div class="file-upload__previews" *ngIf="previewItems.length">
        <figure
          class="file-upload__item"
          [class.file-upload__item--doc]="accept !== 'image'"
          *ngFor="let item of previewItems; let i = index"
        >
          <img *ngIf="accept === 'image'" [src]="item.url" alt="" />
          <span *ngIf="accept === 'pdf' || accept === 'video'" class="file-upload__doc" [title]="item.name">
            {{ item.name }}
          </span>
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

      <div class="file-upload__progress" *ngIf="uploading">
        <div class="file-upload__progress-head">
          <span class="file-upload__spinner" aria-hidden="true"></span>
          <span *ngIf="totalCount > 1">Uploading {{ uploadedCount }} of {{ totalCount }} files… ({{ totalCount - uploadedCount }} remaining)</span>
          <span *ngIf="totalCount <= 1">Uploading…</span>
        </div>
        <div class="file-upload__bar" *ngIf="totalCount > 1">
          <div class="file-upload__bar-fill" [style.width.%]="progressPercent"></div>
        </div>
        <p class="file-upload__current" *ngIf="currentFileName">{{ currentFileName }}</p>
      </div>
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
    .file-upload__item--doc {
      width: auto;
      min-width: 120px;
      max-width: 220px;
      height: auto;
      min-height: 56px;
    }
    .file-upload__item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .file-upload__doc {
      display: block;
      padding: 28px 12px 12px;
      font-size: 11px;
      letter-spacing: 0.02em;
      text-align: center;
      color: var(--ink-soft);
      word-break: break-word;
      line-height: 1.4;
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
    .file-upload__progress { display: flex; flex-direction: column; gap: 8px; }
    .file-upload__progress-head {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--ink);
      font-weight: 300;
    }
    .file-upload__spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--line);
      border-top-color: var(--accent);
      border-radius: 50%;
      flex: none;
      animation: file-upload-spin 0.7s linear infinite;
    }
    @keyframes file-upload-spin { to { transform: rotate(360deg); } }
    .file-upload__bar {
      width: 100%;
      height: 6px;
      background: var(--line);
      border-radius: 999px;
      overflow: hidden;
    }
    .file-upload__bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 999px;
      transition: width 0.25s ease;
    }
    .file-upload__current {
      margin: 0;
      font-size: 11px;
      color: var(--ink-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
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
  uploadedCount = 0;
  totalCount = 0;
  currentFileName = '';
  private value: string | string[] = '';
  private labels = new Map<string, string>();
  private onChange: (v: string | string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private uploadSvc: UploadService) {}

  get progressPercent(): number {
    if (!this.totalCount) return 0;
    return Math.round((this.uploadedCount / this.totalCount) * 100);
  }

  get acceptAttr(): string {
    if (this.accept === 'pdf') return 'application/pdf,.pdf';
    if (this.accept === 'video') return 'video/*,.mp4,.mov,.webm';
    return 'image/*';
  }

  get previewUrls(): string[] {
    if (this.multiple) return Array.isArray(this.value) ? this.value : [];
    return typeof this.value === 'string' && this.value ? [this.value] : [];
  }

  get previewItems(): { url: string; name: string }[] {
    return this.previewUrls.map((url) => ({
      url: mediaUrl(url),
      name: this.labels.get(url) ?? this.nameFromUrl(url),
    }));
  }

  private nameFromUrl(url: string): string {
    try {
      const segment = decodeURIComponent(url.split('/').pop() || '');
      const withoutTimestamp = segment.replace(/^\d+-/, '');
      return withoutTimestamp || segment || 'Uploaded file';
    } catch {
      return 'Uploaded file';
    }
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
    this.uploadedCount = 0;
    this.totalCount = files.length;
    this.currentFileName = '';
    this.onTouched();
    try {
      const urls: string[] = [];
      for (const file of files) {
        this.currentFileName = file.name;
        const url =
          this.accept === 'video'
            ? await this.uploadSvc.uploadVideo(file)
            : await this.uploadSvc.upload(file);
        this.labels.set(url, file.name);
        urls.push(url);
        this.uploadedCount++;
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
      this.currentFileName = '';
    }
  }

  remove(index: number) {
    const urls = this.previewUrls;
    const removed = urls[index];
    if (removed) this.labels.delete(removed);

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
