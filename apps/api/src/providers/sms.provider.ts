export type SendSmsInput = {
  to: string;
  body: string;
  idempotencyKey?: string;
};

export type SendSmsResult = {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
};

export interface SmsProvider {
  readonly name: string;
  send(input: SendSmsInput): Promise<SendSmsResult>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
