import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoriesService } from '../../core/categories.service';
import { ModelCategory } from '../../core/models.types';
import { setModelsBranch } from '../../core/models-branch.util';

const FALLBACK_WOMEN: ModelCategory = { id: 'women', name: 'Women', sortOrder: 0, published: true };
const FALLBACK_MEN: ModelCategory = { id: 'men', name: 'Men', sortOrder: 2, published: true };

@Component({
  selector: 'app-models-picker',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="picker">
      <div class="picker__bg" style="background-image: url('assets/category-bg.webp')" aria-hidden="true"></div>

      <nav class="picker__choices" aria-label="Choose a division">
        <a class="picker__choice"
           [routerLink]="['/models', women.id]"
           (click)="pick(women.id)">
          {{ women.name }}
        </a>
        <a class="picker__choice"
           [routerLink]="['/models', men.id]"
           (click)="pick(men.id)">
          {{ men.name }}
        </a>
      </nav>
    </section>
  `,
  styles: [`
    .picker {
      position: relative;
      min-height: calc(100vh - 72px);
      overflow: hidden;
      background: var(--black);
    }
    .picker__bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: 38% center;
      background-repeat: no-repeat;
    }
    .picker__choices {
      position: relative;
      z-index: 1;
      min-height: calc(100vh - 72px);
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 10vh 0 10vh clamp(28px, 8vw, 80px);
      gap: clamp(48px, 18vh, 140px);
    }
    .picker__choice {
      display: block;
      width: fit-content;
      font-size: clamp(22px, 5vw, 34px);
      font-weight: 200;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #fff;
      text-decoration: none;
      cursor: pointer;
      transition: letter-spacing 0.45s var(--ease), opacity 0.45s ease;
    }
    .picker__choice:hover {
      letter-spacing: 0.38em;
      opacity: 0.88;
    }
    .picker__choice:focus-visible {
      outline: 1px solid var(--accent);
      outline-offset: 8px;
    }
    @media (max-width: 760px) {
      .picker__bg {
        background-position: 22% center;
      }
      .picker__choices {
        gap: clamp(40px, 14vh, 100px);
        padding-left: clamp(24px, 10vw, 48px);
      }
    }
  `],
})
export class ModelsPickerComponent implements OnInit {
  women = FALLBACK_WOMEN;
  men = FALLBACK_MEN;

  constructor(private categoriesSvc: CategoriesService) {}

  async ngOnInit() {
    try {
      const all = await this.categoriesSvc.listPublished();
      this.women = all.find((c) => c.id === 'women') ?? FALLBACK_WOMEN;
      this.men = all.find((c) => c.id === 'men') ?? FALLBACK_MEN;
    } catch {
      // Keep fallbacks when API is unavailable
    }
  }

  pick(id: string) {
    if (id === 'men' || id === 'women') {
      setModelsBranch(id);
    }
  }
}
