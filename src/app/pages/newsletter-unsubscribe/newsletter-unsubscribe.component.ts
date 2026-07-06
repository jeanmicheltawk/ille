import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NewsletterService } from '../../core/newsletter.service';

@Component({
  selector: 'app-newsletter-unsubscribe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-head">
      <p class="eyebrow">Newsletter</p>
      <h1>Unsubscribe</h1>
    </div>

    <div class="container narrow">
      <div *ngIf="loading" class="notice">Processing…</div>
      <div *ngIf="done" class="notice notice--ok">
        <strong>{{ email }}</strong> has been unsubscribed. You will no longer receive updates from ille.
      </div>
      <div *ngIf="error" class="notice notice--err">{{ error }}</div>
    </div>
  `,
})
export class NewsletterUnsubscribeComponent implements OnInit {
  loading = true;
  done = false;
  error = '';
  email = '';

  constructor(
    private route: ActivatedRoute,
    private newsletter: NewsletterService,
  ) {}

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.error = 'Invalid unsubscribe link.';
      return;
    }
    try {
      const result = await this.newsletter.unsubscribe(token);
      this.email = result.email;
      this.done = true;
    } catch {
      this.error = 'This unsubscribe link is invalid or has already been used.';
    } finally {
      this.loading = false;
    }
  }
}
