import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { EmailSubscriber } from './models.types';

export interface NewsletterSendResult {
  ok: boolean;
  sent: number;
  skipped: number;
  total: number;
}

export interface EmailStatus {
  configured: boolean;
  siteUrl: string;
}

export type SubscriberTopic = 'models' | 'community';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private mockSubscribers: EmailSubscriber[] = [];

  constructor(private api: ApiService) {}

  async subscribe(email: string, source = 'footer', topic: SubscriberTopic = 'models'): Promise<void> {
    if (this.api.useApi) {
      await this.api.post('/newsletter/subscribe', { email, source, topic });
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!this.mockSubscribers.some((s) => s.email === normalized && s.topic === topic)) {
      this.mockSubscribers.push({
        email: normalized,
        topic,
        source,
        active: true,
        subscribedAt: new Date().toISOString(),
      });
    }
    console.info('[mock] subscribed:', normalized);
    await this.delay(400);
  }

  async unsubscribe(token: string): Promise<{ email: string }> {
    if (this.api.useApi) {
      return this.api.post<{ ok: boolean; email: string }>('/newsletter/unsubscribe', { token });
    }
    console.info('[mock] unsubscribed with token:', token);
    await this.delay(400);
    return { email: 'demo@example.com' };
  }

  async listSubscribers(topic?: SubscriberTopic): Promise<EmailSubscriber[]> {
    if (this.api.useApi) {
      const query = topic ? `?topic=${encodeURIComponent(topic)}` : '';
      return this.api.get<EmailSubscriber[]>(`/admin/subscribers${query}`);
    }
    return [...this.mockSubscribers];
  }

  async removeSubscriber(id: number): Promise<void> {
    if (this.api.useApi) {
      await this.api.delete(`/admin/subscribers/${id}`);
      return;
    }
    this.mockSubscribers = this.mockSubscribers.filter((s) => s.id !== id);
  }

  async sendBroadcast(
    subject: string,
    message: string,
    topic?: SubscriberTopic,
  ): Promise<NewsletterSendResult> {
    if (this.api.useApi) {
      return this.api.post<NewsletterSendResult>('/admin/newsletter/send', { subject, message, topic });
    }
    console.info('[mock] broadcast:', subject, message);
    await this.delay(600);
    return { ok: true, sent: 0, skipped: this.mockSubscribers.length, total: this.mockSubscribers.length };
  }

  async emailStatus(): Promise<EmailStatus> {
    if (this.api.useApi) return this.api.get<EmailStatus>('/admin/email-status');
    return { configured: false, siteUrl: 'http://localhost:4200' };
  }

  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
