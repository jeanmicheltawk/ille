import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  absoluteMediaUrl,
  isMediaRef,
  mediaDownloadUrl,
  publicMediaLabel,
} from '../core/media-url.util';

@Component({
  selector: 'app-form-entry-value',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="isMedia; else plain">
      <div class="media-val">
        <a
          class="media-val__thumb"
          [href]="href"
          target="_blank"
          rel="noopener noreferrer"
          title="Open image in a new tab"
        >
          <img *ngIf="showThumb" [src]="href" alt="" (error)="showThumb = false" />
        </a>
        <div class="media-val__side">
          <a
            class="media-val__link"
            [href]="href"
            target="_blank"
            rel="noopener noreferrer"
          >{{ label }}</a>
          <a class="media-val__dl" [href]="downloadHref" download>Download</a>
        </div>
      </div>
    </ng-container>
    <ng-template #plain>{{ value || '—' }}</ng-template>
  `,
  styles: [`
    .media-val {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .media-val__thumb {
      flex: 0 0 72px;
      width: 72px;
      height: 72px;
      border: 1px solid var(--line);
      background: var(--black);
      overflow: hidden;
      display: block;
    }
    .media-val__thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .media-val__side {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    .media-val__link {
      color: var(--accent, #c9a96e);
      font-size: 13px;
      font-weight: 300;
      word-break: break-all;
      line-height: 1.4;
    }
    .media-val__link:hover { text-decoration: underline; }
    .media-val__dl {
      display: inline-block;
      padding: 6px 12px;
      border: 1px solid var(--line);
      color: var(--ink-soft);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-decoration: none;
    }
    .media-val__dl:hover { color: var(--accent, #c9a96e); border-color: var(--accent, #c9a96e); }
  `],
})
export class FormEntryValueComponent implements OnChanges {
  @Input() value = '';
  showThumb = true;

  ngOnChanges(): void {
    this.showThumb = true;
  }

  get isMedia(): boolean {
    return isMediaRef(this.value);
  }

  get href(): string {
    return absoluteMediaUrl(this.value);
  }

  get label(): string {
    return publicMediaLabel(this.value);
  }

  get downloadHref(): string {
    return mediaDownloadUrl(this.value);
  }
}
