export type SchedulePickupInput = {
  fulfilmentId: string;
  slotStartAt: Date;
  slotEndAt: Date;
  addressLine?: string;
};

export type FulfilmentTransitionResult = {
  fulfilmentId: string;
  status: string;
  at: Date;
};

/**
 * Platform ops fulfilment adapter (Instant Buy + managed pickup).
 */
export interface FulfilmentService {
  readonly name: string;
  schedulePickup(input: SchedulePickupInput): Promise<FulfilmentTransitionResult>;
  markPickedUp(fulfilmentId: string): Promise<FulfilmentTransitionResult>;
  markDelivered(fulfilmentId: string): Promise<FulfilmentTransitionResult>;
  checkSla(now?: Date): Promise<{ breached: string[] }>;
}

export const FULFILMENT_SERVICE = Symbol('FULFILMENT_SERVICE');
