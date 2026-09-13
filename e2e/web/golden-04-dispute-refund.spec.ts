/**
 * Golden 04 — open dispute → evidence → admin resolve refund (admin API).
 */
import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO,
  authHeaders,
  jsonOrThrow,
  login,
  skipUnlessApiUp,
} from './helpers';

test.describe('golden-04 dispute refund', () => {
  test('dispute → evidence → admin FULL_REFUND', async ({ request }) => {
    await skipUnlessApiUp(request);

    const seller = await login(
      request,
      DEMO.seller.email,
      DEMO.seller.password,
    );
    const buyer = await login(
      request,
      DEMO.buyer.email,
      DEMO.buyer.password,
    );
    const admin = await login(
      request,
      DEMO.admin.email,
      DEMO.admin.password,
    );
    const sellerHeaders = authHeaders(seller.accessToken);
    const buyerHeaders = authHeaders(buyer.accessToken);
    const adminHeaders = authHeaders(admin.accessToken);

    const catsRes = await request.get(`${API_BASE}/categories`, {
      headers: sellerHeaders,
    });
    const cats = await jsonOrThrow<{ id: string; slug: string }[]>(
      catsRes,
      'categories',
    );
    const cat = cats.find((c) => c.slug === 'phones-tablets') ?? cats[0];

    const createRes = await request.post(`${API_BASE}/listings`, {
      headers: sellerHeaders,
      data: {
        title: `E2E Dispute Phone ${Date.now()}`,
        description: 'Phone case for golden-04 dispute path.',
        categoryId: cat!.id,
        condition: 'GOOD',
        priceKobo: 12_000_00,
        community: 'Lekki',
      },
    });
    const draft = await jsonOrThrow<{ id: string }>(createRes, 'create');
    const pubRes = await request.post(
      `${API_BASE}/listings/${draft.id}/publish`,
      { headers: sellerHeaders },
    );
    const listing = await jsonOrThrow<{ id: string; status: string }>(
      pubRes,
      'publish',
    );
    test.skip(
      listing.status !== 'LIVE',
      `listing not LIVE (${listing.status})`,
    );

    const orderRes = await request.post(`${API_BASE}/orders`, {
      headers: buyerHeaders,
      data: {
        listingId: listing.id,
        fulfilmentMethod: 'PICKUP',
        buyNow: true,
      },
    });
    const order = await jsonOrThrow<{ id: string }>(orderRes, 'order');

    const payRes = await request.post(`${API_BASE}/payments/initiate`, {
      headers: buyerHeaders,
      data: {
        orderId: order.id,
        idempotencyKey: `e2e-dispute-pay-${order.id}`,
      },
    });
    const payment = await jsonOrThrow<{ reference: string }>(
      payRes,
      'payment',
    );

    const hookRes = await request.post(`${API_BASE}/webhooks/mock-psp`, {
      data: { reference: payment.reference, event: 'charge.success' },
    });
    expect(hookRes.ok(), await hookRes.text()).toBeTruthy();

    const handRes = await request.post(
      `${API_BASE}/orders/${order.id}/handed-over`,
      { headers: sellerHeaders },
    );
    expect(handRes.ok(), await handRes.text()).toBeTruthy();

    // Disputes only after RECEIVED or COMPLETED
    const confirmRes = await request.post(
      `${API_BASE}/orders/${order.id}/confirm-receipt`,
      { headers: buyerHeaders },
    );
    expect(confirmRes.ok(), await confirmRes.text()).toBeTruthy();

    const disputeRes = await request.post(
      `${API_BASE}/orders/${order.id}/disputes`,
      {
        headers: buyerHeaders,
        data: {
          reason: 'MATERIALLY_DIFFERENT',
          detail: 'Item condition differs from listing photos — golden-04',
        },
      },
    );
    const dispute = await jsonOrThrow<{ id: string; status: string }>(
      disputeRes,
      'open dispute',
    );
    expect(dispute.id).toBeTruthy();

    const evidenceRes = await request.post(
      `${API_BASE}/disputes/${dispute.id}/evidence`,
      {
        headers: buyerHeaders,
        data: {
          text: 'Photo evidence note: scratch on back, not disclosed.',
        },
      },
    );
    expect(evidenceRes.ok(), await evidenceRes.text()).toBeTruthy();

    const resolveRes = await request.post(
      `${API_BASE}/admin/disputes/${dispute.id}/resolution`,
      {
        headers: adminHeaders,
        data: {
          resolution: 'FULL_REFUND',
          note: 'UAT golden-04 full refund',
        },
      },
    );
    expect(resolveRes.ok(), await resolveRes.text()).toBeTruthy();
  });
});
