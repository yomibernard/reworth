export type CreatePaymentInput = {
  amountKobo: number;
  currency: 'NGN';
  reference: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
};

export type PaymentResult = {
  paymentId: string;
  reference: string;
  status: 'pending' | 'success' | 'failed';
  checkoutUrl?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  verifyPayment(reference: string): Promise<PaymentResult>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
