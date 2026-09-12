import type { SendSmsInput, SendSmsResult, SmsProvider } from './sms.provider';

/** Dev/mock SMS provider — logs to console instead of sending. */
export class ConsoleSmsMock implements SmsProvider {
  readonly name = 'console-sms';

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const messageId = `sms_mock_${Date.now()}`;
    // eslint-disable-next-line no-console
    console.info(`[ConsoleSmsMock] to=${input.to} body=${input.body} id=${messageId}`);
    return { messageId, status: 'sent' };
  }
}
