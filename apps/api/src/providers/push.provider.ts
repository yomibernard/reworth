export type PushMessage = {
  userId: string;
  title: string;
  body: string;
  deepLink?: string;
  tokens: string[];
  meta?: Record<string, unknown>;
};

export interface PushProvider {
  readonly name: string;
  send(message: PushMessage): Promise<void>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
