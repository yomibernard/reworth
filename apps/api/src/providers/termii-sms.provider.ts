import { Logger } from '@nestjs/common';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './sms.provider';

type TermiiSendResponse = {
  code?: string;
  message_id?: string;
  message_id_str?: string;
  message?: string;
};

/**
 * Termii SMS adapter — transactional OTP via DND route.
 * @see https://developers.termii.com/messaging-api
 */
export class TermiiSmsProvider implements SmsProvider {
  readonly name = 'termii-sms';
  private readonly logger = new Logger(TermiiSmsProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly senderId: string,
    private readonly baseUrl: string,
  ) {}

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/sms/send`;
    const to = input.to.replace(/^\+/, '');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        to,
        from: this.senderId,
        sms: input.body,
        type: 'plain',
        channel: 'dnd',
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as TermiiSendResponse;
    if (!res.ok || (payload.code && payload.code !== 'ok')) {
      this.logger.warn(
        `Termii SMS failed status=${res.status} message=${payload.message ?? 'unknown'}`,
      );
      return {
        messageId: payload.message_id_str ?? payload.message_id ?? `sms_fail_${Date.now()}`,
        status: 'failed',
      };
    }

    return {
      messageId:
        payload.message_id_str ??
        payload.message_id ??
        `sms_${Date.now()}`,
      status: 'sent',
    };
  }
}
