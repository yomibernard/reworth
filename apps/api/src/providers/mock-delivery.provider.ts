import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  computeDeliveryFeeKobo,
  DEFAULT_DELIVERY_RATES,
  type CreateShipmentInput,
  type CreateShipmentResult,
  type DeliveryProvider,
  type DeliveryQuoteInput,
  type DeliveryQuoteResult,
  type UpdateShipmentStatusInput,
} from './delivery.provider';
import { haversineKm } from './search.provider';
import { RegionConfigService } from '../region/region-config.service';

@Injectable()
export class MockDeliveryProvider implements DeliveryProvider {
  readonly name = 'mock-delivery';
  private readonly logger = new Logger(MockDeliveryProvider.name);
  private readonly shipments = new Map<
    string,
    { orderId: string; status: string }
  >();

  constructor(
    @Optional() private readonly regions?: RegionConfigService,
  ) {}

  async quote(input: DeliveryQuoteInput): Promise<DeliveryQuoteResult> {
    const distanceKm = haversineKm(
      input.fromLat,
      input.fromLng,
      input.toLat,
      input.toLng,
    );
    const rates = this.regions
      ? this.regions.getDeliveryRates(input.city)
      : DEFAULT_DELIVERY_RATES;
    const feeKobo = computeDeliveryFeeKobo(distanceKm, rates);
    return {
      feeKobo,
      distanceKm: Math.round(distanceKm * 100) / 100,
      provider: this.name,
    };
  }

  async createShipment(
    input: CreateShipmentInput,
  ): Promise<CreateShipmentResult> {
    const providerRef = `mock_del_${input.orderId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;
    const etaFrom = new Date(Date.now() + 45 * 60 * 1000);
    const etaTo = new Date(Date.now() + 3 * 60 * 60 * 1000);
    this.shipments.set(providerRef, {
      orderId: input.orderId,
      status: 'ASSIGNED',
    });
    this.logger.log({
      event: 'shipment.created',
      providerRef,
      orderId: input.orderId,
      quoteKobo: input.quoteKobo,
    });
    return { providerRef, status: 'ASSIGNED', etaFrom, etaTo };
  }

  async updateStatus(input: UpdateShipmentStatusInput): Promise<void> {
    const row = this.shipments.get(input.providerRef);
    if (row) {
      row.status = input.status;
    } else {
      this.shipments.set(input.providerRef, {
        orderId: 'unknown',
        status: input.status,
      });
    }
    this.logger.log({
      event: 'shipment.status',
      ...input,
    });
  }
}
