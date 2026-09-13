export type DeliveryQuoteInput = {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

export type DeliveryQuoteResult = {
  feeKobo: number;
  distanceKm: number;
  provider: string;
};

export type CreateShipmentInput = {
  orderId: string;
  quoteKobo: number;
  distanceKm?: number;
  toLat: number;
  toLng: number;
  fromLat: number;
  fromLng: number;
};

export type CreateShipmentResult = {
  providerRef: string;
  status: 'ASSIGNED';
  etaFrom?: Date;
  etaTo?: Date;
};

export type UpdateShipmentStatusInput = {
  providerRef: string;
  status:
    | 'ASSIGNED'
    | 'PICKED_UP'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FAILED';
  failureReason?: string;
};

export interface DeliveryProvider {
  readonly name: string;
  quote(input: DeliveryQuoteInput): Promise<DeliveryQuoteResult>;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  updateStatus(input: UpdateShipmentStatusInput): Promise<void>;
}

export const DELIVERY_PROVIDER = Symbol('DELIVERY_PROVIDER');

/**
 * ₦1,500 base + ₦150/km (ceil), in kobo.
 * feeKobo = 150_000 + 15_000 * ceil(km)
 */
export function computeDeliveryFeeKobo(distanceKm: number): number {
  const km = Math.max(0, distanceKm);
  const ceilKm = Math.ceil(km);
  return 150_000 + 15_000 * ceilKm;
}
