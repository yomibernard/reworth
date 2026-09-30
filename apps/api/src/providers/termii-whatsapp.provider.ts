import { Logger } from '@nestjs/common';
import type {
  SendWhatsAppInput,
  SendWhatsAppResult,
  WhatsAppProvider,
} from './whatsapp.provider';

type TermiiSendResponse = {
  code?: string;
  message_id?: string;
  message_id_str?: string;
  message?: string;
};

/**
 * Termii WhatsApp OTP token adapter.
 * Requires WhatsApp OTP product enabled on the Termii account.
 * @see https://developers.termii.com/send-whatsapp-token
 */
export class TermiiWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'termii-whatsapp';
  private readonly logger = new Logger(TermiiWhatsAppProvider.name);

  constructor(
    private readonly apiKey: string,
    /** WhatsApp device / sender name on Termii dashboard */
    private readonly deviceId: string,
    private readonly baseUrl: string,
  ) {}

  async sendOtp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/api/sms/send`;
    const to = input.to.replace(/^\+/, '');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        to,
        from: this.deviceId,
        sms: input.code,
        type: 'plain',
        channel: 'whatsapp_otp',
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as TermiiSendResponse;
    if (!res.ok || (payload.code && payload.code !== 'ok')) {
      this.logger.warn(
        `Termii WhatsApp OTP failed status=${res.status} message=${payload.message ?? 'unknown'}`,
      );
      return {
        messageId:
          payload.message_id_str ??
          payload.message_id ??
          `wa_fail_${Date.now()}`,
        status: 'failed',
      };
    }

    return {
      messageId:
        payload.message_id_str ??
        payload.message_id ??
        `wa_${Date.now()}`,
      status: 'sent',
    };
  }
}
