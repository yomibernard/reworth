import type {
  CreatePaymentInput,
  PaymentProvider,
  PaymentResult,
} from './payment.provider';

/** Mock payment service provider for local development. */
export class MockPsp implements PaymentProvider {
  readonly name = 'mock-psp';
  private readonly store = new Map<string, PaymentResult>();

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const paymentId = `pay_mock_${Date.now()}`;
    const result: PaymentResult = {
      paymentId,
      reference: input.reference,
      status: 'pending',
      checkoutUrl: `https://mock-psp.local/checkout/${input.reference}`,
    };
    this.store.set(input.reference, result);
    return result;
  }

  async verifyPayment(reference: string): Promise<PaymentResult> {
    const existing = this.store.get(reference);
    if (!existing) {
      return {
        paymentId: 'unknown',
        reference,
        status: 'failed',
      };
    }
    const success: PaymentResult = { ...existing, status: 'success' };
    this.store.set(reference, success);
    return success;
  }
}
