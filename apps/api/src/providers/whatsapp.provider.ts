export type SendWhatsAppInput = {
  to: string;
  /** Numeric OTP only for WhatsApp token channel (4–6 digits). */
  code: string;
  body?: string;
  idempotencyKey?: string;
};

export type SendWhatsAppResult = {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
};

export interface WhatsAppProvider {
  readonly name: string;
  sendOtp(input: SendWhatsAppInput): Promise<SendWhatsAppResult>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
