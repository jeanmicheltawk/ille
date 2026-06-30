import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="lightbox"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="alt || 'Image preview'"
      (click)="close()"
    >
      <button
        type="button"
        class="lightbox__close"
        aria-label="Close"
        (click)="close(); $event.stopPropagation()"
      >
        ×
      </button>

      <button
        type="button"
        *ngIf="canPrev"
        class="lightbox__nav lightbox__nav--prev"
        aria-label="Previous image"
        (click)="prev($event)"
      >
        ‹
      </button>

      <figure class="lightbox__frame" (click)="$event.stopPropagation()">
        <img [src]="images[activeIndex]" [alt]="alt" />
        <figcaption *ngIf="images.length > 1" class="lightbox__count">
          {{ activeIndex + 1 }} / {{ images.length }}
        </figcaption>
      </figure>

      <button
        type="button"
        *ngIf="canNext"
        class="lightbox__nav lightbox__nav--next"
        aria-label="Next image"
        (click)="next($event)"
      >
        ›
      </button>
    </div>
  `,
  styles: [`
    .lightbox {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.92);
      animation: lightboxIn 0.25s var(--ease);
    }
    @keyframes lightboxIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .lightbox__frame {
      margin: 0;
      max-width: min(96vw, 1100px);
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .lightbox__frame img {
      max-width: 100%;
      max-height: calc(92vh - 32px);
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    }
    .lightbox__count {
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.65);
      font-weight: 300;
    }
    .lightbox__close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(0, 0, 0, 0.35);
      color: #fff;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      transition: border-color 0.3s ease, background 0.3s ease;
    }
    .lightbox__close:hover {
      border-color: #fff;
      background: rgba(255, 255, 255, 0.12);
    }
    .lightbox__nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 56px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(0, 0, 0, 0.35);
      color: #fff;
      font-size: 32px;
      line-height: 1;
      cursor: pointer;
      transition: border-color 0.3s ease, background 0.3s ease;
    }
    .lightbox__nav:hover {
      border-color: #fff;
      background: rgba(255, 255, 255, 0.12);
    }
    .lightbox__nav--prev { left: 16px; }
    .lightbox__nav--next { right: 16px; }

    @media (max-width: 640px) {
      .lightbox { padding: 12px; }
      .lightbox__nav { display: none; }
      .lightbox__close { top: 12px; right: 12px; }
    }
  `],
})
export class ImageLightboxComponent {
  @Input({ required: true }) images!: string[];
  @Input() alt = '';
  @Output() closed = new EventEmitter<void>();

  activeIndex = 0;

  @Input() set index(value: number) {
    this.activeIndex = value;
  }

  get canPrev(): boolean {
    return this.images.length > 1 && this.activeIndex > 0;
  }

  get canNext(): boolean {
    return this.images.length > 1 && this.activeIndex < this.images.length - 1;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') this.close();
    if (event.key === 'ArrowLeft' && this.canPrev) this.prev();
    if (event.key === 'ArrowRight' && this.canNext) this.next();
  }

  close() {
    this.closed.emit();
  }

  prev(event?: Event) {
    event?.stopPropagation();
    if (this.canPrev) this.activeIndex -= 1;
  }

  next(event?: Event) {
    event?.stopPropagation();
    if (this.canNext) this.activeIndex += 1;
  }
}
