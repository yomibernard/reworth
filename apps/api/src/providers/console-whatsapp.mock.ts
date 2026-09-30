import type {
  SendWhatsAppInput,
  SendWhatsAppResult,
  WhatsAppProvider,
} from './whatsapp.provider';

/** Dev/mock WhatsApp OTP — logs to console instead of sending. */
export class ConsoleWhatsAppMock implements WhatsAppProvider {
  readonly name = 'console-whatsapp';

  async sendOtp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    const messageId = `wa_mock_${Date.now()}`;
    // eslint-disable-next-line no-console
    console.info(
      `[ConsoleWhatsAppMock] to=${input.to} code=${input.code} body=${input.body ?? ''} id=${messageId}`,
    );
    return { messageId, status: 'sent' };
  }
}
