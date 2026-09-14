import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider } from './email.provider';

/**
 * Resend HTTP adapter — EMAIL_PROVIDER=resend + RESEND_API_KEY.
 * Falls back to log-only if key missing or HTTP fails (dev-safe).
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY missing; logging email instead');
      this.logger.log(
        { to: message.to, subject: message.subject },
        'email:resend-fallback',
      );
      return;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(message.text)}</pre>`,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
      }
      this.logger.log({ to: message.to, subject: message.subject }, 'email:resend');
    } catch (err) {
      this.logger.warn(
        `Resend send failed (${(err as Error).message}); logging instead`,
      );
      this.logger.log(
        { to: message.to, subject: message.subject, text: message.text },
        'email:resend-fallback',
      );
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
