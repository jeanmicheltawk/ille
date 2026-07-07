import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsletterService, SubscriberTopic } from '../../core/newsletter.service';
import { EmailSubscriber } from '../../core/models.types';

@Component({
  selector: 'app-admin-subscribers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sub-admin">
      <div class="sub-admin__head">
        <div>
          <h3>Email subscribers ({{ subscribers.length }})</h3>
          <p class="muted" *ngIf="!emailConfigured">
            SMTP is not configured — subscribers are saved but emails won't be sent until you set
            <code>SMTP_*</code> env vars on the server.
          </p>
          <p class="muted" *ngIf="emailConfigured">
            New published models trigger an automatic email for Ille Models subscribers.
            Use the filter and form below to send custom messages to each list.
          </p>
        </div>
        <div class="sub-admin__head-actions">
          <select [(ngModel)]="topicFilter" name="topicFilter" (ngModelChange)="onTopicChange()">
            <option value="all">All subscribers</option>
            <option value="models">Ille Models</option>
            <option value="community">Community</option>
          </select>
          <button type="button" class="btn btn--ghost btn--sm" *ngIf="subscribers.length" (click)="exportCsv()">
            Export CSV
          </button>
        </div>
      </div>

      <div class="broadcast" *ngIf="subscribers.length">
        <p class="section-label">Send message to all subscribers</p>
        <div class="field">
          <label>Subject</label>
          <input [(ngModel)]="subject" name="subject" placeholder="e.g. Upcoming casting call" />
        </div>
        <div class="field">
          <label>Message</label>
          <textarea [(ngModel)]="message" name="message" rows="6"
            placeholder="Write your message to subscribers…"></textarea>
        </div>
        <div class="broadcast__actions">
          <button type="button" class="btn" [disabled]="sending || !subject.trim() || !message.trim()"
            (click)="send()">
            {{ sending ? 'Sending…' : 'Send to ' + subscribers.length + ' subscriber' + (subscribers.length === 1 ? '' : 's') }}
          </button>
        </div>
        <div *ngIf="sendResult" class="notice notice--ok">
          Sent to {{ sendResult.sent }} subscriber{{ sendResult.sent === 1 ? '' : 's' }}
          <span *ngIf="sendResult.skipped"> ({{ sendResult.skipped }} skipped — SMTP not configured)</span>.
        </div>
        <div *ngIf="sendError" class="notice notice--err">{{ sendError }}</div>
      </div>

      <div *ngIf="listNotice" class="notice notice--ok">{{ listNotice }}</div>
      <div *ngIf="listError" class="notice notice--err">{{ listError }}</div>

      <p class="muted" *ngIf="!subscribers.length">No subscribers yet. Visitors can sign up from the site footer.</p>

      <table class="tbl" *ngIf="subscribers.length">
        <thead>
          <tr><th>Email</th><th>Topic</th><th>Source</th><th>Subscribed</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let s of subscribers">
            <td>{{ s.email }}</td>
            <td>{{ topicLabel(s.topic) }}</td>
            <td>{{ s.source || '—' }}</td>
            <td>{{ s.subscribedAt || '—' }}</td>
            <td class="row-actions">
              <button type="button" (click)="remove(s)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .sub-admin__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 28px;
    }
    .sub-admin__head h3 { margin: 0 0 8px; font-weight: 300; }
    .sub-admin__head-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sub-admin__head-actions select {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink);
      padding: 6px 10px;
      font-family: inherit;
    }
    .broadcast {
      margin-bottom: 36px;
      padding: 24px;
      border: 1px solid var(--line);
    }
    .broadcast__actions { margin-top: 16px; }
    .section-label {
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 9px;
      color: var(--ink-muted);
      margin: 0 0 16px;
    }
    .field { margin-bottom: 14px; }
    .field label {
      display: block;
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 6px;
    }
    .field input, .field textarea {
      width: 100%;
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink);
      padding: 10px 12px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 300;
    }
    .field textarea { resize: vertical; min-height: 120px; }
    code { font-size: 12px; color: var(--ink-soft); }
  `],
})
export class AdminSubscribersComponent implements OnInit {
  subscribers: EmailSubscriber[] = [];
  topicFilter: 'all' | SubscriberTopic = 'all';
  emailConfigured = false;
  subject = '';
  message = '';
  sending = false;
  sendResult: { sent: number; skipped: number } | null = null;
  sendError = '';
  listNotice = '';
  listError = '';

  constructor(private newsletter: NewsletterService) {}

  async ngOnInit() {
    await this.refresh();
    const status = await this.newsletter.emailStatus();
    this.emailConfigured = status.configured;
  }

  async refresh() {
    this.subscribers = await this.newsletter.listSubscribers(
      this.topicFilter === 'all' ? undefined : this.topicFilter,
    );
  }

  async onTopicChange() {
    await this.refresh();
  }

  async remove(s: EmailSubscriber) {
    if (!s.id || !confirm(`Remove ${s.email} from the list?`)) return;
    this.listNotice = '';
    this.listError = '';
    try {
      await this.newsletter.removeSubscriber(s.id);
      await this.refresh();
      this.listNotice = 'Subscriber removed successfully.';
    } catch (err: unknown) {
      this.listError = err instanceof Error ? err.message : 'Failed to remove subscriber.';
    }
  }

  async send() {
    if (!this.subject.trim() || !this.message.trim()) return;
    if (!confirm(`Send this message to ${this.subscribers.length} subscriber(s)?`)) return;
    this.sending = true;
    this.sendError = '';
    this.sendResult = null;
    try {
      const topic = this.topicFilter === 'all' ? undefined : this.topicFilter;
      const result = await this.newsletter.sendBroadcast(this.subject.trim(), this.message.trim(), topic);
      this.sendResult = result;
      this.subject = '';
      this.message = '';
    } catch (err: unknown) {
      this.sendError = err instanceof Error ? err.message : 'Failed to send newsletter';
    } finally {
      this.sending = false;
    }
  }

  exportCsv() {
    const header = 'email,topic,source,subscribedAt\n';
    const rows = this.subscribers.map((s) =>
      `"${s.email}","${s.topic || ''}","${s.source || ''}","${s.subscribedAt || ''}"`,
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ille-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  topicLabel(topic?: string) {
    if (topic === 'community') return 'Community';
    return 'Ille Models';
  }
}
