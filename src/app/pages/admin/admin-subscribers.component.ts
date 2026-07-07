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
          <div class="topic-toggle" role="tablist" aria-label="Subscriber topic filter">
            <button type="button" class="topic-toggle__btn" [class.is-active]="topicFilter === 'all'"
              (click)="setTopicFilter('all')">
              <span>All</span>
              <em>{{ countLabel('all') }}</em>
            </button>
            <button type="button" class="topic-toggle__btn" [class.is-active]="topicFilter === 'models'"
              (click)="setTopicFilter('models')">
              <span>Ille Models</span>
              <em>{{ countLabel('models') }}</em>
            </button>
            <button type="button" class="topic-toggle__btn" [class.is-active]="topicFilter === 'community'"
              (click)="setTopicFilter('community')">
              <span>Community</span>
              <em>{{ countLabel('community') }}</em>
            </button>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" *ngIf="subscribers.length" (click)="exportCsv()">
            Export CSV
          </button>
        </div>
      </div>

      <div class="broadcast" *ngIf="subscribers.length">
        <p class="section-label">
          Send message to {{ topicFilter === 'all' ? 'all subscribers' : topicLabel(topicFilter) + ' subscribers' }}
        </p>
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
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .topic-toggle {
      display: inline-flex;
      border: 1px solid var(--line);
      background: transparent;
      overflow: hidden;
      border-radius: 999px;
      padding: 2px;
    }
    .topic-toggle__btn {
      background: transparent;
      border: 0;
      color: var(--ink);
      min-width: 128px;
      padding: 8px 12px;
      font-family: inherit;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-color 0.25s ease, color 0.25s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 999px;
    }
    .topic-toggle__btn:hover { color: var(--accent); }
    .topic-toggle__btn em {
      font-style: normal;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 7px;
      line-height: 1;
      font-size: 9px;
      letter-spacing: 0.08em;
      color: var(--ink-muted);
      transition: border-color 0.25s ease, color 0.25s ease;
    }
    .topic-toggle__btn.is-active {
      background: rgba(255, 255, 255, 0.08);
      color: var(--accent);
    }
    .topic-toggle__btn.is-active em {
      color: var(--accent);
      border-color: rgba(255, 255, 255, 0.28);
    }
    .broadcast {
      margin-bottom: 36px;
      padding: 24px;
      border: 1px solid var(--line);
    }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      table-layout: fixed;
    }
    .tbl th, .tbl td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: middle;
      font-size: 13px;
      font-weight: 300;
      color: var(--ink-soft);
    }
    .tbl th {
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-muted);
      font-weight: 400;
    }
    .tbl td:first-child {
      color: var(--ink);
      word-break: break-word;
    }
    .tbl tr:last-child td { border-bottom: 0; }
    .row-actions {
      width: 110px;
      text-align: right;
    }
    .row-actions button {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--ink-soft);
      padding: 7px 10px;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.25s ease, border-color 0.25s ease;
    }
    .row-actions button:hover {
      color: #e46d6d;
      border-color: #e46d6d;
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
    @media (max-width: 960px) {
      .sub-admin__head { flex-direction: column; }
      .sub-admin__head-actions { width: 100%; justify-content: space-between; }
      .topic-toggle { width: 100%; }
      .topic-toggle__btn { min-width: 0; flex: 1; }
    }
    @media (max-width: 640px) {
      .sub-admin__head-actions { gap: 12px; }
      .topic-toggle { width: 100%; display: grid; grid-template-columns: 1fr; border-radius: 14px; }
      .topic-toggle__btn { border-radius: 10px; justify-content: space-between; }
      .tbl {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
      .tbl th, .tbl td { font-size: 12px; }
    }
  `],
})
export class AdminSubscribersComponent implements OnInit {
  allSubscribers: EmailSubscriber[] = [];
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
    this.allSubscribers = await this.newsletter.listSubscribers();
    this.applyFilter();
  }

  async setTopicFilter(filter: 'all' | SubscriberTopic) {
    if (this.topicFilter === filter) return;
    this.topicFilter = filter;
    this.applyFilter();
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
    if (topic === 'all') return 'All';
    return 'Ille Models';
  }

  countLabel(topic: 'all' | SubscriberTopic) {
    if (topic === 'all') return String(this.allSubscribers.length);
    return String(this.allSubscribers.filter((s) => (s.topic || 'models') === topic).length);
  }

  private applyFilter() {
    if (this.topicFilter === 'all') {
      this.subscribers = [...this.allSubscribers];
      return;
    }
    this.subscribers = this.allSubscribers.filter((s) => (s.topic || 'models') === this.topicFilter);
  }
}
