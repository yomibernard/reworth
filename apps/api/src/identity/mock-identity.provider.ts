import { randomUUID } from 'crypto';
import type {
  IdentityProvider,
  IdentityVerifyInput,
  IdentityVerifyResult,
} from './identity.provider';

/** Deterministic mock licensed-provider adapter. Never accepts/stores raw IDs. */
export class MockIdentityProvider implements IdentityProvider {
  readonly name = 'mock-identity';

  async verify(input: IdentityVerifyInput): Promise<IdentityVerifyResult> {
    const outcome = input.mockOutcome ?? 'success';
    const providerRef = `mock_${input.method.toLowerCase()}_${randomUUID()}`;
    // Opaque mock reference only — callers must hash this, never store raw gov IDs.
    const referenceForHash =
      input.mockReference?.startsWith('mock_') || !input.mockReference
        ? providerRef
        : `mock_ref_${input.method}_${randomUUID()}`;

    if (outcome === 'failure') {
      return {
        success: false,
        providerRef,
        referenceForHash,
        rejectionReason: 'Mock provider rejected identity check',
      };
    }

    return {
      success: true,
      providerRef,
      referenceForHash,
    };
  }
}
