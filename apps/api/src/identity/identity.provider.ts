export type IdentityVerifyInput = {
  method: 'NIN' | 'BVN' | 'GOV_ID';
  /** Mock only — never a real government ID in production path. */
  mockReference?: string;
  mockOutcome?: 'success' | 'failure';
};

export type IdentityVerifyResult = {
  success: boolean;
  /** Opaque provider reference — not the raw ID. */
  providerRef: string;
  /** Hashable material for identifierHash (never raw NIN/BVN). */
  referenceForHash: string;
  rejectionReason?: string;
};

export interface IdentityProvider {
  readonly name: string;
  verify(input: IdentityVerifyInput): Promise<IdentityVerifyResult>;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
