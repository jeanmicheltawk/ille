import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Model } from '../../core/models.types';
import { modelDigitalsPath } from '../../core/model.util';

@Component({
  selector: 'app-model-profile-links',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="profile-links" *ngIf="hasLinks">
      <a *ngIf="model.digitals?.length" [routerLink]="digitalsLink">Digitals</a>
      <a *ngIf="model.pdfUrl" [href]="model.pdfUrl" download target="_blank" rel="noopener noreferrer">
        Download PDF
      </a>
      <a *ngIf="model.introVideoUrl" [routerLink]="['/model', model.id, 'intro-video']">
        Introduction Video
      </a>
      <a *ngIf="model.catwalkVideoUrl" [routerLink]="['/model', model.id, 'catwalk-video']">
        Catwalk Video
      </a>
    </nav>
  `,
  styles: [`
    .profile-links {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 36px;
    }
    .profile-links a {
      font-size: 13px;
      font-weight: 300;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #1a1a1a;
      text-decoration: none;
      transition: opacity 0.25s ease;
    }
    .profile-links a:hover { opacity: 0.55; }
  `],
})
export class ModelProfileLinksComponent {
  @Input({ required: true }) model!: Model;

  get digitalsLink(): string {
    return modelDigitalsPath(this.model);
  }

  get hasLinks(): boolean {
    return !!(
      this.model.digitals?.length ||
      this.model.pdfUrl ||
      this.model.introVideoUrl ||
      this.model.catwalkVideoUrl
    );
  }
}
