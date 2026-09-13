/**
 * PII helpers for chat — never expose phone/email in message DTOs.
 */

const PHONE_RE =
  /(?:\+?234|0)?[\s\-.]?(?:\d[\s\-.]?){9,11}\d|\+\d{10,15}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Replace phone and email patterns with [redacted]. */
export function redactPhoneEmail(text: string): string {
  if (!text) return text;
  return text.replace(EMAIL_RE, '[redacted]').replace(PHONE_RE, '[redacted]');
}

export function assertNoPiiFields(dto: Record<string, unknown>): void {
  if ('phone' in dto || 'email' in dto) {
    throw new Error('Message DTO must not include phone or email fields');
  }
  const sender = dto.sender as Record<string, unknown> | undefined;
  if (sender && ('phone' in sender || 'email' in sender)) {
    throw new Error('Message DTO sender must not include phone or email');
  }
}
