export type StartAuthJobInput = {
  jobId: string;
  listingId: string;
  orderId: string;
  mode?: string;
};

export type StartAuthJobResult = {
  partnerRef: string;
};

export type AuthPartnerCompletePayload = {
  partnerRef?: string;
  jobId?: string;
  passed: boolean;
  certificateId?: string;
  failReason?: string;
  evidence?: Record<string, unknown>;
};

export interface AuthenticationProvider {
  readonly name: string;
  start(input: StartAuthJobInput): Promise<StartAuthJobResult>;
}

export const AUTHENTICATION_PROVIDER = Symbol('AUTHENTICATION_PROVIDER');
