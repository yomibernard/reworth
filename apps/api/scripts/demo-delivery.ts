/**
 * Demo: walk a funded DELIVERY order ASSIGNED → … → DELIVERED.
 *
 * Usage (from repo root):
 *   pnpm --filter @reworth/api demo:delivery
 *
 * Requires DATABASE_URL and a migrated DB. Creates sample users/listing/order
 * if none exist, funds it, then advances shipment statuses via DeliveryService.
 */
import { NestFactory } from '@nestjs/core';
import { FulfilmentMethod, OrderStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { DeliveryService } from '../src/delivery/delivery.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { computeDeliveryFeeKobo } from '../src/providers/delivery.provider';
import { haversineKm } from '../src/providers/search.provider';
import { computeOrderTotalKobo, computeProtectionFeeKobo } from '../src/orders/order-fees';

const STATUSES = [
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

async function ensureFundedDeliveryOrder(prisma: PrismaService) {
  const existing = await prisma.order.findFirst({
    where: {
      fulfilmentMethod: FulfilmentMethod.DELIVERY,
      status: { in: [OrderStatus.FUNDED, OrderStatus.HANDED_OVER] },
      deliveryShipment: { isNot: null },
    },
    include: { deliveryShipment: true },
  });
  if (existing?.deliveryShipment) {
    return existing;
  }

  const seller =
    (await prisma.user.findFirst({ where: { email: 'demo-seller@reworth.local' } })) ??
    (await prisma.user.create({
      data: {
        email: 'demo-seller@reworth.local',
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: 'Demo Seller',
            preferredCommunity: 'Lekki Ph1',
          },
        },
      },
    }));

  const buyer =
    (await prisma.user.findFirst({ where: { email: 'demo-buyer@reworth.local' } })) ??
    (await prisma.user.create({
      data: {
        email: 'demo-buyer@reworth.local',
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: 'Demo Buyer',
            preferredCommunity: 'VI',
          },
        },
      },
    }));

  const category = await prisma.category.findFirst({
    where: { parentId: null },
  });

  const listing = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      title: 'Demo Sofa — Phase 6 delivery',
      description: 'Seeded for demo:delivery',
      categoryId: category?.id,
      priceKobo: 50_000_00,
      status: 'RESERVED',
      community: 'Lekki Ph1',
      geoLat: 6.45,
      geoLng: 3.47,
      addressPrivate: '12 Admiralty Way, Lekki Phase 1',
      fulfilmentDelivery: true,
      publishedAt: new Date(),
    },
  });

  const toLat = 6.43;
  const toLng = 3.43;
  const distanceKm = haversineKm(
    listing.geoLat!,
    listing.geoLng!,
    toLat,
    toLng,
  );
  const deliveryFeeKobo = computeDeliveryFeeKobo(distanceKm);
  const amountKobo = listing.priceKobo;
  const protectionFeeKobo = computeProtectionFeeKobo(amountKobo);
  const totalKobo = computeOrderTotalKobo({
    amountKobo,
    protectionFeeKobo,
    deliveryFeeKobo,
  });

  const order = await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      amountKobo,
      protectionFeeKobo,
      deliveryFeeKobo,
      totalKobo,
      fulfilmentMethod: FulfilmentMethod.DELIVERY,
      status: OrderStatus.FUNDED,
      fundedAt: new Date(),
      autoReleaseAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      deliveryShipment: {
        create: {
          provider: 'mock-delivery',
          providerRef: `demo_${Date.now()}`,
          quoteKobo: deliveryFeeKobo,
          distanceKm,
          status: 'QUOTED',
          events: {
            create: {
              status: 'QUOTED',
              payload: { toLat, toLng, demo: true },
            },
          },
        },
      },
    },
    include: { deliveryShipment: true },
  });

  // eslint-disable-next-line no-console
  console.info(`[demo:delivery] Created funded order ${order.id}`);
  return order;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const delivery = app.get(DeliveryService);

  const order = await ensureFundedDeliveryOrder(prisma);
  // eslint-disable-next-line no-console
  console.info(`[demo:delivery] Walking statuses for order ${order.id}`);

  for (const status of STATUSES) {
    const updated = await delivery.applyStatus({
      orderId: order.id,
      status,
      providerRef: order.deliveryShipment?.providerRef ?? `demo_${order.id}`,
    });
    // eslint-disable-next-line no-console
    console.info(`  → ${updated.status}`);
  }

  const shipment = await prisma.deliveryShipment.findUnique({
    where: { orderId: order.id },
    include: { events: true },
  });
  // eslint-disable-next-line no-console
  console.info(
    `[demo:delivery] Done. Final status=${shipment?.status}, events=${shipment?.events.length}`,
  );

  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
