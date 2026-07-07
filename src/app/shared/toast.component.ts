import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <div
        *ngFor="let t of toast.toasts(); trackBy: trackById"
        class="toast"
        [class.toast--success]="t.kind === 'success'"
        [class.toast--error]="t.kind === 'error'"
        [class.toast--info]="t.kind === 'info'"
        role="status"
      >
        <span class="toast__icon" aria-hidden="true">
          <ng-container [ngSwitch]="t.kind">
            <svg *ngSwitchCase="'success'" viewBox="0 0 24 24" width="20" height="20">
              <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg *ngSwitchCase="'error'" viewBox="0 0 24 24" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg *ngSwitchDefault viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 8h.01M11 12h1v4h1" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          </ng-container>
        </span>
        <span class="toast__message">{{ t.message }}</span>
        <button type="button" class="toast__close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <span class="toast__bar"></span>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      max-width: 380px;
      padding: 14px 16px;
      overflow: hidden;
      color: #fff;
      background: #1c1c1e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      pointer-events: auto;
      animation: toast-in 0.42s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast--success { border-left: 3px solid #34c759; }
    .toast--error { border-left: 3px solid #ff453a; }
    .toast--info { border-left: 3px solid #0a84ff; }

    .toast__icon {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border-radius: 50%;
    }
    .toast--success .toast__icon { color: #34c759; background: rgba(52, 199, 89, 0.14); }
    .toast--error .toast__icon { color: #ff453a; background: rgba(255, 69, 58, 0.14); }
    .toast--info .toast__icon { color: #0a84ff; background: rgba(10, 132, 255, 0.14); }

    .toast__message {
      flex: 1;
      font-size: 0.92rem;
      line-height: 1.35;
      letter-spacing: 0.01em;
    }

    .toast__close {
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
      padding: 0;
      color: rgba(255, 255, 255, 0.55);
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: color 0.15s ease, background 0.15s ease;
    }
    .toast__close:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }

    .toast__bar {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      width: 100%;
      transform-origin: left;
      animation: toast-bar 3.5s linear forwards;
    }
    .toast--success .toast__bar { background: #34c759; }
    .toast--error .toast__bar { background: #ff453a; animation-duration: 5s; }
    .toast--info .toast__bar { background: #0a84ff; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(24px) scale(0.96); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }

    @keyframes toast-bar {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }

    @media (max-width: 560px) {
      .toast-stack { top: 12px; right: 12px; left: 12px; }
      .toast { min-width: 0; max-width: none; width: 100%; }
    }
  `],
})
export class ToastComponent {
  readonly toast = inject(ToastService);

  trackById(_: number, t: { id: number }): number {
    return t.id;
  }
}
