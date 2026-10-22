import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { UploadService } from '../core/upload.service';
import { mediaUrl } from '../core/media-url.util';
import { compressImage } from '../core/image-compress.util';

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
      <p class="file-upload__reorder-hint" *ngIf="canReorder">{{ reorderHint }}</p>
      <div class="file-upload__previews" *ngIf="previewItems.length">
        <figure
          class="file-upload__item"
          [class.file-upload__item--doc]="accept !== 'image'"
          [class.file-upload__item--dragging]="dragIndex === i"
          [class.file-upload__item--over]="overIndex === i && dragIndex !== i"
          *ngFor="let item of previewItems; let i = index"
          [attr.draggable]="canReorder ? true : null"
          (dragstart)="onDragStart(i, $event)"
          (dragover)="onDragOver(i, $event)"
          (drop)="onDrop(i, $event)"
          (dragend)="onDragEnd()"
        >
          <span class="file-upload__index" *ngIf="canReorder">{{ i + 1 }}</span>
          <img *ngIf="accept === 'image'" [src]="item.url" alt="" draggable="false" />
          <span *ngIf="accept === 'pdf' || accept === 'video'" class="file-upload__doc" [title]="item.name">
            {{ item.name }}
          </span>
          <div class="file-upload__moves" *ngIf="canReorder">
            <button type="button" (click)="move(i, -1)" [disabled]="i === 0" aria-label="Move earlier">‹</button>
            <button type="button" (click)="move(i, 1)" [disabled]="i === previewItems.length - 1" aria-label="Move later">›</button>
          </div>
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
      border: 1px solid var(--line);
      overflow: hidden;
    }
    .file-upload__item[draggable='true'] { cursor: grab; }
    .file-upload__item--dragging { opacity: 0.4; }
    .file-upload__item--over { outline: 2px solid var(--accent); outline-offset: -2px; }
    .file-upload__index {
      position: absolute;
      top: 4px;
      left: 4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 10px;
      line-height: 18px;
      text-align: center;
    }
    .file-upload__moves { display: flex; }
    .file-upload__moves button {
      flex: 1;
      height: 26px;
      border: 0;
      border-top: 1px solid var(--line);
      background: transparent;
      color: var(--ink-soft);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0;
    }
    .file-upload__moves button + button { border-left: 1px solid var(--line); }
    .file-upload__moves button:disabled { opacity: 0.3; cursor: default; }
    .file-upload__moves button:not(:disabled):hover { color: var(--ink); }
    .file-upload__reorder-hint {
      margin: 0;
      font-size: 11px;
      color: var(--ink-muted);
      font-weight: 200;
      letter-spacing: 0.04em;
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
      height: 110px;
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
    .file-upload--multi .file-upload__item { width: 96px; }
    .file-upload--multi .file-upload__item img { height: 120px; }
  `],
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() accept: FileUploadAccept = 'image';
  @Input() multiple = false;
  @Input() label = 'Upload from device';
  @Input() hint = 'Choose a file from your computer or phone';
  @Input() reorderHint = 'Drag to change the order shown on the site, or use the arrows.';

  uploading = false;
  error = '';
  uploadedCount = 0;
  totalCount = 0;
  currentFileName = '';
  dragIndex: number | null = null;
  overIndex: number | null = null;
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

  get canReorder(): boolean {
    return this.multiple && this.accept === 'image' && this.previewUrls.length > 1;
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

    const baseline = this.multiple
      ? (Array.isArray(this.value) ? [...this.value] : [])
      : '';
    const urls: string[] = [];
    const failures: string[] = [];

    // Upload one-by-one and keep successes even if a later file fails.
    // A single bad image/PDF/video must not wipe the whole batch from the form.
    for (const file of files) {
      this.currentFileName = file.name;
      try {
        const toSend = this.accept === 'image' ? await compressImage(file) : file;
        const url =
          this.accept === 'video'
            ? await this.uploadSvc.uploadVideo(toSend)
            : await this.uploadSvc.upload(toSend);
        this.labels.set(url, file.name);
        urls.push(url);
        if (this.multiple) {
          this.value = [...baseline, ...urls];
        } else {
          this.value = url;
        }
        this.onChange(this.value);
      } catch (e: unknown) {
        failures.push(file.name);
        const msg = this.uploadErrorMessage(e);
        this.error =
          files.length > 1
            ? `${failures.length} of ${files.length} failed (kept successful uploads). Last error: ${msg}`
            : msg;
      }
      this.uploadedCount++;
    }

    this.uploading = false;
    this.currentFileName = '';
  }

  /** Clear a previous upload error so save can proceed after the user fixes/removes files. */
  clearError() {
    this.error = '';
  }

  onDragStart(index: number, event: DragEvent) {
    const target = event.target as HTMLElement | null;
    if (!this.canReorder || target?.closest('button')) {
      event.preventDefault();
      return;
    }
    this.dragIndex = index;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(index: number, event: DragEvent) {
    if (!this.canReorder || this.dragIndex === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.overIndex = index;
  }

  onDrop(index: number, event: DragEvent) {
    event.preventDefault();
    const from = this.dragIndex;
    this.dragIndex = null;
    this.overIndex = null;
    if (from === null || from === index) return;
    this.moveTo(from, index);
  }

  onDragEnd() {
    this.dragIndex = null;
    this.overIndex = null;
  }

  move(index: number, delta: number) {
    this.moveTo(index, index + delta);
  }

  private moveTo(from: number, to: number) {
    const current = Array.isArray(this.value) ? [...this.value] : [];
    if (from < 0 || to < 0 || from >= current.length || to >= current.length || from === to) return;
    const [item] = current.splice(from, 1);
    current.splice(to, 0, item);
    this.value = current;
    this.onChange(this.value);
    this.onTouched();
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
    this.error = '';
    this.onChange(this.value);
    this.onTouched();
  }

  private uploadErrorMessage(e: unknown): string {
    if (e && typeof e === 'object') {
      const err = e as { error?: unknown; message?: string };
      if (err.error && typeof err.error === 'object') {
        const nested = (err.error as { error?: unknown; message?: unknown }).error
          ?? (err.error as { error?: unknown; message?: unknown }).message;
        if (typeof nested === 'string' && nested.trim()) return nested.trim();
      }
      if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
      if (typeof err.message === 'string' && err.message.trim()) return err.message.trim();
    }
    return 'Upload failed. Please try again.';
  }
}
