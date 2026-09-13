export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  meta?: Record<string, unknown>;
};

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
